'use client'
import { Clock, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import type { Meal } from '@/types'
import { formatCost } from '@/lib/grocery'
import { TAG_COLORS } from '@/lib/tags'

interface Props {
  open: boolean
  meal: Meal | null
  allTags: string[]
  onEdit: () => void
  onClose: () => void
}

export function MealViewDialog({ open, meal, allTags, onEdit, onClose }: Props) {
  if (!meal) return null

  const totalCost = meal.ingredients.reduce((sum, i) => sum + i.estimatedCost, 0)
  const costPerServing = meal.servings > 0 ? totalCost / meal.servings : 0
  const hasCost = totalCost > 0

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl pr-6">{meal.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {meal.prepTimeMinutes && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {meal.prepTimeMinutes}m prep
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              {meal.servings} serving{meal.servings !== 1 ? 's' : ''}
            </span>
            {hasCost && (
              <span className="text-foreground font-medium">
                {formatCost(costPerServing)}/serving · {formatCost(totalCost)} total
              </span>
            )}
          </div>

          {meal.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {meal.tags.map(tag => {
                const color = TAG_COLORS[allTags.indexOf(tag) % TAG_COLORS.length]
                return (
                  <Badge key={tag} variant="outline" className={`text-xs ${color}`}>
                    {tag}
                  </Badge>
                )
              })}
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium mb-2">
              Ingredients
              <span className="text-muted-foreground font-normal ml-1.5">({meal.ingredients.length})</span>
            </h3>
            <div className="rounded-md border divide-y">
              {meal.ingredients.map(ing => (
                <div key={ing.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>{ing.name || <span className="text-muted-foreground italic">unnamed</span>}</span>
                  <span className="text-muted-foreground shrink-0 ml-4">
                    {ing.quantity} {ing.unit}
                    {ing.estimatedCost > 0 && (
                      <span className="ml-3 text-foreground">{formatCost(ing.estimatedCost)}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {meal.notes && (
            <div>
              <h3 className="text-sm font-medium mb-1.5">Notes</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{meal.notes}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={onEdit}>Edit meal</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
