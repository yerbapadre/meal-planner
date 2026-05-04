'use client'
import { useState, useMemo } from 'react'
import { Plus, Clock, DollarSign, Search, X, SlidersHorizontal } from 'lucide-react'
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
import { FILTER_GROUPS, TIME_OPTIONS, TAG_COLORS, type TimeFilter } from '@/lib/tags'

export function MealsPage() {
  const [meals, setMeals] = useMeals()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Meal | null>(null)
  const [viewing, setViewing] = useState<Meal | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set())
  const [timeFilter, setTimeFilter] = useState<TimeFilter | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

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

  function handleManual() {
    setChatOpen(false)
    setEditing(null)
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

  const activeFilterCount = activeTags.size + (timeFilter ? 1 : 0)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return meals.filter(meal => {
      // Text search
      if (q && !meal.name.toLowerCase().includes(q) && !meal.ingredients.some(i => i.name.toLowerCase().includes(q))) return false

      // Structured tag filters — each group is AND'd together, within a group uses group logic
      const mealTagSet = new Set(meal.tags.map(t => t.toLowerCase()))
      for (const group of FILTER_GROUPS) {
        const selected = group.tags.filter(t => activeTags.has(t))
        if (!selected.length) continue
        if (group.logic === 'or' && !selected.some(t => mealTagSet.has(t))) return false
        if (group.logic === 'and' && !selected.every(t => mealTagSet.has(t))) return false
      }

      // Time filter (derived from prepTimeMinutes, not tags)
      if (timeFilter) {
        const prep = meal.prepTimeMinutes ?? null
        if (timeFilter === 'quick'  && (!prep || prep > 20))           return false
        if (timeFilter === 'medium' && (!prep || prep <= 20 || prep > 45)) return false
        if (timeFilter === 'slow'   && (!prep || prep <= 45))          return false
      }

      return true
    })
  }, [meals, search, activeTags, timeFilter])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold font-heading">Meals</h1>
        <Button onClick={() => setChatOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Meal
        </Button>
      </div>

      {meals.length > 0 && (
        <div className="mb-4 space-y-2">
          {/* Search + filter toggle */}
          <div className="flex gap-2">
            <div className="relative flex-1">
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
            <button
              onClick={() => setFiltersOpen(v => !v)}
              className={`flex items-center gap-1.5 px-3 rounded-md border text-sm font-medium transition-colors ${
                filtersOpen || activeFilterCount > 0
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filter
              {activeFilterCount > 0 && (
                <span className="text-[10px] font-bold bg-white/20 rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Active filter chips — always visible when something is selected */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {[...activeTags].map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border font-medium bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                >
                  {tag} <X className="w-2.5 h-2.5" />
                </button>
              ))}
              {timeFilter && (
                <button
                  onClick={() => setTimeFilter(null)}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border font-medium bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                >
                  {TIME_OPTIONS.find(t => t.id === timeFilter)?.label} <X className="w-2.5 h-2.5" />
                </button>
              )}
              <button
                onClick={() => { setActiveTags(new Set()); setTimeFilter(null) }}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 ml-1"
              >
                clear all
              </button>
            </div>
          )}

          {/* Collapsible filter panel */}
          {filtersOpen && (
            <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
              {FILTER_GROUPS.map(group => (
                <div key={group.label} className="flex gap-3">
                  <span className="text-xs text-muted-foreground shrink-0 w-20 pt-0.5">{group.label}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {group.tags.map(tag => {
                      const active = activeTags.has(tag)
                      return (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={`px-2.5 py-0.5 rounded-full text-xs border transition-colors capitalize ${
                            active
                              ? 'bg-primary text-primary-foreground border-primary font-medium'
                              : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                          }`}
                        >
                          {tag}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* Time filter */}
              <div className="flex gap-3">
                <span className="text-xs text-muted-foreground shrink-0 w-20 pt-0.5">Time</span>
                <div className="flex flex-wrap gap-1.5">
                  {TIME_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setTimeFilter(prev => prev === opt.id ? null : opt.id)}
                      className={`px-2.5 py-0.5 rounded-full text-xs border transition-colors ${
                        timeFilter === opt.id
                          ? 'bg-primary text-primary-foreground border-primary font-medium'
                          : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                      }`}
                    >
                      {opt.label} <span className="opacity-60">{opt.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {meals.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-2">🍳</p>
          <p className="mb-4">No meals yet.</p>
          <Button variant="outline" onClick={() => setChatOpen(true)}>Add your first meal</Button>
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
                      {meal.tags.slice(0, 3).map(tag => {
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
                      {meal.tags.length > 3 && (
                        <span className="text-xs text-muted-foreground self-center">+{meal.tags.length - 3}</span>
                      )}
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
        onManual={handleManual}
      />
    </div>
  )
}
