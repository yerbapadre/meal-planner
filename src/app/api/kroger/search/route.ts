import { NextRequest, NextResponse } from 'next/server'

const CLIENT_ID = process.env.KROGER_CLIENT_ID!
const CLIENT_SECRET = process.env.KROGER_CLIENT_SECRET!

let cachedToken: string | null = null
let tokenExpiry = 0

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken

  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
  const res = await fetch('https://api.kroger.com/v1/connect/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=product.compact',
  })

  if (!res.ok) throw new Error('Kroger auth failed')
  const data = await res.json()
  cachedToken = data.access_token
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000
  return cachedToken!
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const term = searchParams.get('term')
  const locationId = searchParams.get('locationId')

  if (!term) return NextResponse.json({ error: 'term required' }, { status: 400 })

  try {
    const token = await getToken()
    const params = new URLSearchParams({ 'filter.term': term, 'filter.limit': '8' })
    if (locationId) params.set('filter.locationId', locationId)

    const krogerRes = await fetch(`https://api.kroger.com/v1/products?${params}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })

    if (!krogerRes.ok) throw new Error('Kroger search failed')
    const data = await krogerRes.json()

    const products = (data.data ?? []).map((p: any) => {
      const item = p.items?.[0]
      return {
        productId: p.productId,
        description: p.description,
        price: item?.price?.regular ?? item?.price?.promo ?? null,
        unit: item?.size ?? null,
        imageUrl: p.images?.[0]?.sizes?.find((s: any) => s.size === 'thumbnail')?.url ?? null,
      }
    })

    return NextResponse.json(products)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
