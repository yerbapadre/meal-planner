export interface KrogerProduct {
  productId: string
  description: string
  price: number | null
  unit: string | null
  imageUrl: string | null
}

export async function searchKroger(term: string, locationId?: string): Promise<KrogerProduct[]> {
  if (!term.trim()) return []

  const params = new URLSearchParams({ term })
  if (locationId) params.set('locationId', locationId)

  const res = await fetch(`/api/kroger/search?${params}`)
  if (!res.ok) throw new Error('Kroger search failed')
  return res.json()
}
