import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const SYSTEM_PROMPT = `You parse recipe descriptions into structured JSON.
Return ONLY a valid JSON object with these exact fields:
- name: string
- servings: number (default 2 if not mentioned)
- prepTimeMinutes: number | null
- ingredients: Array<{ name: string, quantity: number, unit: string, estimatedCost: number }>
  - unit must be one of: g, kg, oz, lb, cup, tbsp, tsp, ml, L, piece, slice, can, box, bunch, clove
  - estimatedCost: always 0
- notes: string (cooking steps/tips if mentioned, otherwise empty string)
- tags: string[] (infer relevant tags like "vegetarian", "quick", "italian", "gluten-free", etc.)

Return only raw JSON — no markdown, no code blocks, no explanation.`

export async function POST(req: NextRequest) {
  const { description } = await req.json()
  if (!description?.trim()) {
    return NextResponse.json({ error: 'description required' }, { status: 400 })
  }

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: description }],
    })

    const text = (message.content[0] as { text: string }).text.trim()
    const jsonText = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const meal = JSON.parse(jsonText)
    return NextResponse.json(meal)
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Parse failed' }, { status: 500 })
  }
}
