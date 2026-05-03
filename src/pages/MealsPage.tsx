import { useState } from 'react'
import { Plus, Pencil, Trash2, Clock, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useMeals } from '@/store'
import { MealDialog } from '@/components/MealDialog'
import type { Meal } from '@/types'
import { formatCost } from '@/lib/grocery'

export function MealsPage() {
  const [meals, setMeals] = useMeals()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Meal | null>(null)

  function handleSave(meal: Meal) {
    if (editing) {
      setMeals(prev => prev.map(m => m.id === meal.id ? meal : m))
    } else {
      setMeals(prev => [...prev, meal])
    }
    setEditing(null)
    setOpen(false)
  }

  function handleDelete(id: string) {
    setMeals(prev => prev.filter(m => m.id !== id))
  }

  function openEdit(meal: Meal) {
    setEditing(meal)
    setOpen(true)
  }

  function mealCost(meal: Meal) {
    return meal.ingredients.reduce((sum, i) => sum + i.estimatedCost, 0)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Meals</h1>
        <Button onClick={() => { setEditing(null); setOpen(true) }}>
          <Plus className="w-4 h-4 mr-2" /> Add Meal
        </Button>
      </div>

      {meals.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-2">🍳</p>
          <p className="mb-4">No meals yet.</p>
          <Button variant="outline" onClick={() => setOpen(true)}>Add your first meal</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {meals.map(meal => (
            <Card key={meal.id} className="hover:shadow-md hover:shadow-primary/10 transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{meal.name}</CardTitle>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(meal)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(meal.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    {formatCost(mealCost(meal) / meal.servings)}/serving
                  </span>
                  {meal.prepTimeMinutes && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {meal.prepTimeMinutes}m
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-2">
                  {meal.ingredients.length} ingredients · {meal.servings} servings · {formatCost(mealCost(meal))} total
                </p>
                {meal.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {meal.tags.map((tag, i) => {
                      const colors = [
                        'bg-orange-100 text-orange-700 border-orange-200',
                        'bg-teal-100 text-teal-700 border-teal-200',
                        'bg-violet-100 text-violet-700 border-violet-200',
                        'bg-amber-100 text-amber-700 border-amber-200',
                        'bg-sky-100 text-sky-700 border-sky-200',
                      ]
                      return (
                        <Badge key={tag} variant="outline" className={`text-xs ${colors[i % colors.length]}`}>{tag}</Badge>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <MealDialog
        open={open}
        meal={editing}
        onSave={handleSave}
        onClose={() => { setOpen(false); setEditing(null) }}
      />
    </div>
  )
}
