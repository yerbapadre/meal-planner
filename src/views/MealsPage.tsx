'use client'
import { useState, useMemo } from 'react'
import { Plus, Clock, DollarSign, ChefHat, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useMeals } from '@/store'
import { MealDialog } from '@/components/MealDialog'
import { MealViewDialog } from '@/components/MealViewDialog'
import { RecipeChat } from '@/components/RecipeChat'
import type { Meal } from '@/types'
import { formatCost } from '@/lib/grocery'
import { toast } from 'sonner'
import { groupTags, TAG_COLORS } from '@/lib/tags'

export function MealsPage() {
  const [meals, setMeals] = useMeals()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Meal | null>(null)
  const [viewing, setViewing] = useState<Meal | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set())

  function handleSave(meal: Meal) {
    setMeals(prev => {
      const exists = prev.some(m => m.id === meal.id)
      toast.success(exists ? `${meal.name} updated` : `${meal.name} added`)
      return exists ? prev.map(m => m.id === meal.id ? meal : m) : [...prev, meal]
    })
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

  function handleParsed(parsed: Omit<Meal, 'id'>) {
    setChatOpen(false)
    setEditing({ ...parsed, id: crypto.randomUUID() })
    setOpen(true)
  }

  function mealCost(meal: Meal) {
    return meal.ingredients.reduce((sum, i) => sum + i.estimatedCost, 0)
  }

  function toggleTag(tag: string) {
    setActiveTags(prev => {
      const next = new Set(prev)
      next.has(tag) ? next.delete(tag) : next.add(tag)
      return next
    })
  }

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    meals.forEach(m => m.tags.forEach(t => tags.add(t)))
    return [...tags].sort()
  }, [meals])

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    meals.forEach(m => m.tags.forEach(t => { counts[t] = (counts[t] ?? 0) + 1 }))
    return counts
  }, [meals])

  const tagGroups = useMemo(() => groupTags(allTags), [allTags])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return meals.filter(meal => {
      if (activeTags.size > 0 && ![...activeTags].every(t => meal.tags.includes(t))) return false
      if (!q) return true
      return (
        meal.name.toLowerCase().includes(q) ||
        meal.ingredients.some(i => i.name.toLowerCase().includes(q))
      )
    })
  }, [meals, search, activeTags])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold font-heading">Meals</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setChatOpen(true)}>
            <ChefHat className="w-4 h-4 mr-2" /> Describe
          </Button>
          <Button onClick={() => { setEditing(null); setOpen(true) }}>
            <Plus className="w-4 h-4 mr-2" /> Add Meal
          </Button>
        </div>
      </div>

      {meals.length > 0 && (
        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search meals or ingredients…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {allTags.length > 0 && (
            <div className="space-y-1.5">
              {tagGroups.map(group => (
                <div key={group.label} className="flex items-center gap-1.5 flex-wrap">
                  {tagGroups.length > 1 && (
                    <span className="text-xs text-muted-foreground shrink-0 w-[52px] truncate">{group.label}</span>
                  )}
                  {group.tags.map(tag => {
                    const active = activeTags.has(tag)
                    const color = TAG_COLORS[allTags.indexOf(tag) % TAG_COLORS.length]
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border transition-all ${color} ${
                          active ? 'ring-2 ring-offset-1 ring-current font-medium opacity-100' : 'opacity-60 hover:opacity-80'
                        }`}
                      >
                        {tag}
                        <span className="opacity-60 text-[10px]">{tagCounts[tag]}</span>
                      </button>
                    )
                  })}
                </div>
              ))}
              {activeTags.size > 0 && (
                <button
                  onClick={() => setActiveTags(new Set())}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  clear
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {meals.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-2">🍳</p>
          <p className="mb-4">No meals yet.</p>
          <Button variant="outline" onClick={() => setOpen(true)}>Add your first meal</Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="mb-2">No meals match your filters.</p>
          <button
            onClick={() => { setSearch(''); setActiveTags(new Set()) }}
            className="text-sm underline underline-offset-2 hover:text-foreground"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map(meal => {
            const cost = mealCost(meal)
            return (
              <Card
                key={meal.id}
                className="hover:shadow-md hover:shadow-primary/10 transition-shadow cursor-pointer"
                onClick={() => setViewing(meal)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{meal.name}</CardTitle>
                  <div className="flex gap-3 text-sm text-muted-foreground">
                    {cost > 0 && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        {formatCost(cost / meal.servings)}/serving
                      </span>
                    )}
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
                    {meal.ingredients.length} ingredients · {meal.servings} servings
                  </p>
                  {meal.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {meal.tags.map(tag => {
                        const color = TAG_COLORS[allTags.indexOf(tag) % TAG_COLORS.length]
                        return (
                          <Badge
                            key={tag}
                            variant="outline"
                            className={`text-xs cursor-pointer ${color} ${activeTags.has(tag) ? 'ring-2 ring-offset-1 ring-current' : ''}`}
                            onClick={e => { e.stopPropagation(); toggleTag(tag) }}
                          >
                            {tag}
                          </Badge>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <MealViewDialog
        open={!!viewing}
        meal={viewing}
        allTags={allTags}
        onEdit={() => { openEdit(viewing!); setViewing(null) }}
        onClose={() => setViewing(null)}
      />

      <MealDialog
        open={open}
        meal={editing}
        existingTags={allTags}
        onSave={handleSave}
        onDelete={editing ? () => handleDelete(editing.id) : undefined}
        onClose={() => { setOpen(false); setEditing(null) }}
      />

      <RecipeChat
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        onParsed={handleParsed}
      />
    </div>
  )
}
