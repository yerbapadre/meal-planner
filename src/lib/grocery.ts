import type { Meal, PlannedMeal, GroceryItem } from '../types'

export function generateGroceryList(plan: PlannedMeal[], meals: Meal[]): GroceryItem[] {
  const map = new Map<string, GroceryItem>()

  for (const planned of plan) {
    const meal = meals.find(m => m.id === planned.mealId)
    if (!meal) continue

    const servingRatio = planned.servings / meal.servings

    for (const ing of meal.ingredients) {
      // Deduplicate by kroger product when linked, otherwise by name+unit
      const key = ing.krogerProductId ?? `${ing.name.toLowerCase().trim()}__${ing.unit}`
      const existing = map.get(key)

      if (existing) {
        existing.quantity += ing.quantity * servingRatio
        // Kroger-linked items: price is already set to full unit price — don't accumulate
        if (!ing.krogerProductId) {
          existing.estimatedCost += ing.estimatedCost * servingRatio
        }
        if (!existing.mealNames.includes(meal.name)) {
          existing.mealNames.push(meal.name)
        }
      } else {
        map.set(key, {
          name: ing.name,
          quantity: ing.quantity * servingRatio,
          unit: ing.unit,
          // Grocery list uses full Kroger unit price; fall back to proportional estimatedCost
          estimatedCost: ing.krogerProductPrice ?? ing.estimatedCost * servingRatio,
          checked: false,
          mealNames: [meal.name],
          krogerProductId: ing.krogerProductId,
          krogerProductDescription: ing.krogerProductDescription,
          krogerProductPrice: ing.krogerProductPrice,
        })
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
}

export function buildInstacartUrl(items: GroceryItem[]): string {
  const list = items.map(i => `${Math.ceil(i.quantity)} ${i.unit} ${i.name}`).join('\n')
  return `https://www.instacart.com/store?utm_source=grocery-list&list=${encodeURIComponent(list)}`
}

export function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`
}
