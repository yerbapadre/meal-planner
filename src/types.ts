export interface Ingredient {
  id: string
  name: string
  quantity: number
  unit: string
  estimatedCost: number
}

export interface Meal {
  id: string
  name: string
  servings: number
  prepTimeMinutes?: number
  ingredients: Ingredient[]
  notes?: string
  tags: string[]
}

export interface PlannedMeal {
  id: string
  mealId: string
  date: string // YYYY-MM-DD
  servings: number
}

export interface GroceryItem {
  name: string
  quantity: number
  unit: string
  estimatedCost: number
  checked: boolean
  mealNames: string[]
}

export type Day = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'
