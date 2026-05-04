import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const SYSTEM_PROMPT = `You parse recipe descriptions into structured JSON.
Return ONLY a valid JSON object with these exact fields:
- name: string
- servings: number (default 2 if not mentioned)
- prepTimeMinutes: number | null
- caloriesPerServing: number | null (estimate based on ingredients if not stated; round to nearest 10)
- ingredients: Array<{ name: string, quantity: number, unit: string, estimatedCost: number }>
  - unit must be one of: g, kg, oz, lb, cup, tbsp, tsp, ml, L, piece, slice, can, box, bunch, clove
  - estimatedCost: always 0
- notes: string (cooking steps/tips if mentioned, otherwise empty string)
- tags: string[] (infer relevant tags like "vegetarian", "quick", "italian", "gluten-free", etc.)

Return only raw JSON — no markdown, no code blocks, no explanation.`

// --- JSON-LD extraction (no Claude needed) ---

function parseDuration(iso: string | undefined): number | undefined {
  if (!iso) return undefined
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (!m) return undefined
  const mins = (parseInt(m[1] ?? '0') * 60) + parseInt(m[2] ?? '0')
  return mins || undefined
}

function parseServings(val: any): number {
  if (!val) return 2
  if (typeof val === 'number') return val
  const arr = Array.isArray(val) ? val : [val]
  const m = String(arr[0]).match(/\d+/)
  return m ? parseInt(m[0]) : 2
}

function parseFraction(s: string): number {
  s = s.trim()
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixed) return parseInt(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3])
  const frac = s.match(/^(\d+)\/(\d+)$/)
  if (frac) return parseInt(frac[1]) / parseInt(frac[2])
  return parseFloat(s) || 1
}

const UNIT_MAP: Record<string, string> = {
  cup: 'cup', cups: 'cup',
  tablespoon: 'tbsp', tablespoons: 'tbsp', tbsp: 'tbsp', tbsps: 'tbsp', tbs: 'tbsp',
  teaspoon: 'tsp', teaspoons: 'tsp', tsp: 'tsp', tsps: 'tsp',
  pound: 'lb', pounds: 'lb', lb: 'lb', lbs: 'lb',
  ounce: 'oz', ounces: 'oz', oz: 'oz',
  gram: 'g', grams: 'g', g: 'g',
  kilogram: 'kg', kilograms: 'kg', kg: 'kg',
  milliliter: 'ml', milliliters: 'ml', ml: 'ml',
  liter: 'L', liters: 'L', l: 'L',
  can: 'can', cans: 'can',
  slice: 'slice', slices: 'slice',
  bunch: 'bunch', bunches: 'bunch',
  clove: 'clove', cloves: 'clove',
}
const UNIT_PATTERN = new RegExp(`^(${Object.keys(UNIT_MAP).join('|')})\\.?(?=\\s|$)`, 'i')

function parseIngredient(raw: string) {
  let s = raw
    .replace(/½/g, '1/2').replace(/¼/g, '1/4').replace(/¾/g, '3/4')
    .replace(/⅓/g, '1/3').replace(/⅔/g, '2/3').replace(/⅛/g, '1/8')
    .trim()

  const qtyMatch = s.match(/^([\d\s\/]+)/)
  const quantity = qtyMatch ? parseFraction(qtyMatch[1]) : 1
  s = qtyMatch ? s.slice(qtyMatch[0].length).trim() : s

  const unitMatch = s.match(UNIT_PATTERN)
  const unit = unitMatch ? (UNIT_MAP[unitMatch[1].toLowerCase()] ?? 'piece') : 'piece'
  const name = unitMatch ? s.slice(unitMatch[0].length).trim() : s

  // Strip trailing notes like ", divided" or "(optional)"
  const cleanName = name.replace(/\s*,.*$/, '').replace(/\s*\(.*?\)/g, '').trim()

  return { name: cleanName || raw, quantity: isNaN(quantity) ? 1 : quantity, unit, estimatedCost: 0 }
}

function extractJsonLd(html: string): any | null {
  const matches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  for (const match of matches) {
    try {
      const data = JSON.parse(match[1])
      // Handle @graph arrays and direct objects
      const candidates: any[] = Array.isArray(data)
        ? data
        : data['@graph']
          ? data['@graph']
          : [data]
      const recipe = candidates.find((c: any) =>
        c['@type'] === 'Recipe' || (Array.isArray(c['@type']) && c['@type'].includes('Recipe'))
      )
      if (recipe) return recipe
    } catch {
      // malformed JSON-LD, skip
    }
  }
  return null
}

function jsonLdToMeal(recipe: any) {
  const ingredients = (recipe.recipeIngredient ?? []).map(parseIngredient)

  const rawTags = [
    ...(recipe.keywords ? String(recipe.keywords).split(/[,\n]/) : []),
    ...(Array.isArray(recipe.recipeCategory) ? recipe.recipeCategory : recipe.recipeCategory ? [recipe.recipeCategory] : []),
    ...(Array.isArray(recipe.recipeCuisine) ? recipe.recipeCuisine : recipe.recipeCuisine ? [recipe.recipeCuisine] : []),
  ]
  const tags = [...new Set(rawTags.map(t => t.trim().toLowerCase()).filter(Boolean))]

  const instructions = Array.isArray(recipe.recipeInstructions)
    ? recipe.recipeInstructions
        .map((s: any) => (typeof s === 'string' ? s : s.text ?? ''))
        .join('\n')
    : String(recipe.recipeInstructions ?? '')

  const caloriesRaw = recipe.nutrition?.calories
  const caloriesPerServing = caloriesRaw
    ? parseInt(String(caloriesRaw).match(/\d+/)?.[0] ?? '') || null
    : null

  return {
    name: recipe.name ?? 'Untitled Recipe',
    servings: parseServings(recipe.recipeYield),
    prepTimeMinutes: parseDuration(recipe.totalTime ?? recipe.prepTime),
    caloriesPerServing,
    ingredients,
    notes: instructions.slice(0, 1000),
    tags,
  }
}

// --- Fallback: fetch page text for Claude ---

async function fetchPage(url: string): Promise<{ html: string; text: string }> {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; recipe-parser/1.0)' } })
  if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status}`)
  const html = await res.text()
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 12000)
  return { html, text }
}

// --- Handler ---

export async function POST(req: NextRequest) {
  const { description, url } = await req.json()

  // URL mode
  if (url?.trim()) {
    let html: string, text: string
    try {
      ;({ html, text } = await fetchPage(url.trim()))
    } catch (err: any) {
      return NextResponse.json({ error: `Could not fetch URL: ${err.message}` }, { status: 400 })
    }

    // Try JSON-LD first — no AI call needed
    const recipe = extractJsonLd(html)
    if (recipe) {
      return NextResponse.json(jsonLdToMeal(recipe))
    }

    // Fall back to Claude with the stripped page text
    try {
      const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: text }],
      })
      const raw = (message.content[0] as { text: string }).text.trim()
        .replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
      return NextResponse.json(JSON.parse(raw))
    } catch (err: any) {
      return NextResponse.json({ error: err.message ?? 'Parse failed' }, { status: 500 })
    }
  }

  // Text description mode
  if (description?.trim()) {
    try {
      const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: description.trim() }],
      })
      const raw = (message.content[0] as { text: string }).text.trim()
        .replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
      return NextResponse.json(JSON.parse(raw))
    } catch (err: any) {
      return NextResponse.json({ error: err.message ?? 'Parse failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'description or url required' }, { status: 400 })
}
