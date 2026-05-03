/**
 * audit-kroger.mjs
 *
 * For every ingredient in every meal that doesn't yet have a Kroger product linked,
 * searches the Kroger API and assigns the cheapest product found.
 *
 * estimatedCost is set to the full unit price by default.
 * You can manually lower it in the app for ingredients you only partially use.
 *
 * Usage:
 *   node scripts/audit-kroger.mjs           # live run (writes to Supabase)
 *   node scripts/audit-kroger.mjs --dry-run  # preview only, no writes
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// --- Load .env manually (no dotenv dependency needed) ---
const envPath = resolve(__dirname, '../.env')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
    })
)

const KROGER_CLIENT_ID = env.KROGER_CLIENT_ID
const KROGER_CLIENT_SECRET = env.KROGER_CLIENT_SECRET
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const LOCATION_ID = '70600119' // Smith's Marketplace - Lehi, UT

const DRY_RUN = process.argv.includes('--dry-run')
if (DRY_RUN) console.log('🔍 Dry run — no changes will be written\n')

// --- Kroger auth ---
async function getKrogerToken() {
  const credentials = Buffer.from(`${KROGER_CLIENT_ID}:${KROGER_CLIENT_SECRET}`).toString('base64')
  const res = await fetch('https://api.kroger.com/v1/connect/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=product.compact',
  })
  if (!res.ok) throw new Error(`Kroger auth failed: ${res.status}`)
  const data = await res.json()
  return data.access_token
}

// Kroger search terms over ~60 chars or with special chars cause 400s.
// Trim to the first 5 words and strip non-alphanumeric to be safe.
function cleanSearchTerm(term) {
  return term
    .replace(/[®™°]/g, '')
    .replace(/\s*\(.*?\)/g, '')  // remove parenthetical notes like "(6-inch)"
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .join(' ')
}

// --- Kroger search: returns cheapest product with a price ---
async function findCheapestProduct(token, term) {
  const cleaned = cleanSearchTerm(term)
  const params = new URLSearchParams({
    'filter.term': cleaned,
    'filter.limit': '10',
    'filter.locationId': LOCATION_ID,
  })
  const res = await fetch(`https://api.kroger.com/v1/products?${params}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  if (!res.ok) {
    console.warn(`  ⚠ Kroger search failed for "${term}": ${res.status}`)
    return null
  }
  const data = await res.json()
  const products = (data.data ?? [])
    .map(p => {
      const item = p.items?.[0]
      const price = item?.price?.regular ?? item?.price?.promo ?? null
      return {
        productId: p.productId,
        description: p.description,
        price,
        unit: item?.size ?? null,
      }
    })
    .filter(p => p.price != null)
    .sort((a, b) => a.price - b.price)

  return products[0] ?? null
}

// --- Supabase helpers ---
function supabaseHeaders() {
  return {
    'Content-Type': 'application/json',
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  }
}

async function fetchAllMeals() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/meals?select=*`, {
    headers: supabaseHeaders(),
  })
  if (!res.ok) throw new Error(`Supabase fetch failed: ${res.status}`)
  return res.json()
}

async function updateMeal(id, ingredients) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/meals?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...supabaseHeaders(), Prefer: 'return=minimal' },
    body: JSON.stringify({ ingredients }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Supabase update failed for meal ${id}: ${res.status} ${body}`)
  }
}

// --- Main ---
async function main() {
  console.log('Fetching Kroger token...')
  const token = await getKrogerToken()
  console.log('Fetching meals from Supabase...')
  const meals = await fetchAllMeals()
  console.log(`Found ${meals.length} meals\n`)

  let linked = 0
  let skipped = 0
  let failed = 0

  for (const meal of meals) {
    const ingredients = meal.ingredients ?? []
    const needsWork = ingredients.filter(i => !i.krogerProductId && i.name?.trim())

    if (needsWork.length === 0) {
      console.log(`✓ ${meal.name} — all ingredients already linked`)
      continue
    }

    console.log(`\n📋 ${meal.name} (${needsWork.length} unlinked ingredients)`)

    let changed = false
    const updated = [...ingredients]

    for (const ing of needsWork) {
      // Small delay to avoid hammering the API
      await new Promise(r => setTimeout(r, 250))

      const product = await findCheapestProduct(token, ing.name)

      if (!product) {
        console.log(`  ✗ "${ing.name}" — no results`)
        failed++
        continue
      }

      console.log(`  ✓ "${ing.name}" → ${product.description} ($${product.price.toFixed(2)}${product.unit ? ' / ' + product.unit : ''})`)

      const idx = updated.findIndex(i => i.id === ing.id)
      if (idx !== -1) {
        updated[idx] = {
          ...updated[idx],
          krogerProductId: product.productId,
          krogerProductDescription: product.description,
          krogerProductPrice: product.price,
          estimatedCost: product.price,
        }
        changed = true
        linked++
      }
    }

    if (changed && !DRY_RUN) {
      await updateMeal(meal.id, updated)
    }
  }

  console.log(`\n--- Summary ---`)
  console.log(`Linked:  ${linked}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Failed:  ${failed}`)
  if (DRY_RUN) console.log('\n(Dry run — nothing was written)')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
