import { useState, useMemo } from 'react'
import { Plus, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useMeals, usePlan } from '@/store'
import type { PlannedMeal } from '@/types'
import { formatCost } from '@/lib/grocery'
import { cn } from '@/lib/utils'

type CalendarView = 'daily' | 'weekly' | 'monthly'

const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function getWeekDates(ref: Date): string[] {
  const d = new Date(ref)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(d)
    dd.setDate(d.getDate() + i)
    return toDateStr(dd)
  })
}

function getMonthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startPad = first.getDay() === 0 ? 6 : first.getDay() - 1
  const grid: (string | null)[] = Array(startPad).fill(null)
  for (let d = 1; d <= daysInMonth; d++) grid.push(toDateStr(new Date(year, month, d)))
  while (grid.length % 7 !== 0) grid.push(null)
  return grid
}

export function PlanPage() {
  const [meals] = useMeals()
  const [plan, setPlan] = usePlan()
  const [view, setView] = useState<CalendarView>('weekly')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [addingDay, setAddingDay] = useState<string | null>(null)
  const [focusedDate, setFocusedDate] = useState<string | null>(null)
  const [selectedMeal, setSelectedMeal] = useState('')
  const [servings, setServings] = useState('2')

  const today = toDateStr(new Date())
  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate])
  const monthGrid = useMemo(
    () => getMonthGrid(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate]
  )

  function navigate(dir: -1 | 1) {
    setCurrentDate(prev => {
      const d = new Date(prev)
      if (view === 'daily') d.setDate(d.getDate() + dir)
      else if (view === 'weekly') d.setDate(d.getDate() + dir * 7)
      else d.setMonth(d.getMonth() + dir)
      return d
    })
    setAddingDay(null)
    setFocusedDate(null)
  }

  const periodLabel = useMemo(() => {
    if (view === 'daily') {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
    }
    if (view === 'weekly') {
      const s = new Date(weekDates[0])
      const e = new Date(weekDates[6])
      return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    }
    return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
  }, [view, currentDate, weekDates])

  function getMealsForDay(date: string) {
    return plan.filter(p => p.date === date)
  }

  function getDayCost(date: string) {
    return getMealsForDay(date).reduce((sum, p) => {
      const meal = meals.find(m => m.id === p.mealId)
      if (!meal) return sum
      const cost = meal.ingredients.reduce((s, i) => s + i.estimatedCost, 0)
      return sum + (cost / meal.servings) * p.servings
    }, 0)
  }

  function addToPlan() {
    if (!selectedMeal || !addingDay) return
    const meal = meals.find(m => m.id === selectedMeal)
    if (!meal) return
    const planned: PlannedMeal = {
      id: crypto.randomUUID(),
      mealId: selectedMeal,
      date: addingDay,
      servings: parseInt(servings) || meal.servings,
    }
    setPlan(prev => [...prev, planned])
    setAddingDay(null)
    setSelectedMeal('')
    setServings('2')
  }

  function removeFromPlan(id: string) {
    setPlan(prev => prev.filter(p => p.id !== id))
  }

  function startAdding(date: string) {
    setAddingDay(date)
    setSelectedMeal('')
    setServings('2')
  }

  function switchView(v: CalendarView) {
    setView(v)
    setAddingDay(null)
    setFocusedDate(null)
  }

  // --- Shared sub-renders ---

  function renderAddForm() {
    return (
      <div className="flex flex-col gap-2">
        <Select value={selectedMeal} onValueChange={v => setSelectedMeal(v ?? '')}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder={meals.length === 0 ? 'No meals yet — add from Meals tab' : 'Select meal…'} />
          </SelectTrigger>
          <SelectContent>
            {meals.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">No meals yet</div>
            ) : (
              meals.map(m => (
                <SelectItem key={m.id} value={m.id} className="text-xs">{m.name}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Select value={servings} onValueChange={v => setServings(v ?? '2')}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Servings" />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5, 6, 8].map(n => (
              <SelectItem key={n} value={String(n)} className="text-xs">
                {n} serving{n !== 1 ? 's' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          <Button size="sm" className="h-6 text-xs flex-1" onClick={addToPlan} disabled={!selectedMeal}>
            Add
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setAddingDay(null)}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  function renderMealCard(p: PlannedMeal) {
    const meal = meals.find(m => m.id === p.mealId)
    if (!meal) return null
    return (
      <Card key={p.id} className="group relative">
        <CardContent className="p-2">
          <p className="text-xs font-medium leading-tight pr-4">{meal.name}</p>
          <p className="text-xs text-muted-foreground">{p.servings} serving{p.servings !== 1 ? 's' : ''}</p>
          <button
            onClick={() => removeFromPlan(p.id)}
            className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          >
            <X className="w-3 h-3" />
          </button>
        </CardContent>
      </Card>
    )
  }

  // --- Daily View ---

  function renderDailyView() {
    const date = toDateStr(currentDate)
    const dayMeals = getMealsForDay(date)
    const dayCost = getDayCost(date)

    return (
      <div className="max-w-lg mx-auto flex flex-col gap-3">
        <Card>
          <CardContent className="p-4 flex flex-col gap-2">
            {dayMeals.length === 0 && addingDay !== date && (
              <p className="text-sm text-muted-foreground text-center py-4">No meals planned.</p>
            )}
            {dayMeals.map(p => renderMealCard(p))}
            {addingDay === date
              ? renderAddForm()
              : (
                <Button variant="outline" className="w-full mt-1" onClick={() => startAdding(date)}>
                  <Plus className="w-4 h-4 mr-2" /> Add Meal
                </Button>
              )
            }
          </CardContent>
        </Card>
        {dayCost > 0 && (
          <p className="text-sm text-muted-foreground text-center">
            Day total: <span className="font-medium text-foreground">{formatCost(dayCost)}</span>
          </p>
        )}
      </div>
    )
  }

  // --- Weekly View ---

  function renderWeeklyView() {
    const weekTotal = weekDates.reduce((sum, d) => sum + getDayCost(d), 0)

    return (
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-7">
          {DAYS_SHORT.map((day, i) => {
            const date = weekDates[i]
            const dayMeals = getMealsForDay(date)
            const isAdding = addingDay === date
            const isToday = date === today

            return (
              <div key={day} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    'text-xs font-medium uppercase tracking-wide',
                    isToday ? 'text-primary' : 'text-muted-foreground'
                  )}>
                    {day}
                  </span>
                  {dayMeals.length > 0 && (
                    <span className="text-xs text-muted-foreground">{formatCost(getDayCost(date))}</span>
                  )}
                </div>

                {dayMeals.map(p => renderMealCard(p))}

                {isAdding ? (
                  <Card>
                    <CardContent className="p-2">{renderAddForm()}</CardContent>
                  </Card>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs border border-dashed w-full"
                    onClick={() => startAdding(date)}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add
                  </Button>
                )}
              </div>
            )
          })}
        </div>
        {weekTotal > 0 && (
          <p className="text-sm text-muted-foreground text-right">
            Week total: <span className="font-medium text-foreground">{formatCost(weekTotal)}</span>
          </p>
        )}
      </div>
    )
  }

  // --- Monthly View ---

  function renderMonthlyView() {
    const focusedMeals = focusedDate ? getMealsForDay(focusedDate) : []
    const focusedCost = focusedDate ? getDayCost(focusedDate) : 0

    return (
      <div className="flex flex-col gap-4">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7">
          {DAYS_SHORT.map(d => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wide py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Date grid */}
        <div className="grid grid-cols-7 gap-1">
          {monthGrid.map((date, idx) => {
            if (!date) return <div key={idx} />
            const dayMeals = getMealsForDay(date)
            const dayNum = parseInt(date.slice(8))
            const isToday = date === today
            const isFocused = date === focusedDate

            return (
              <button
                key={date}
                onClick={() => {
                  setFocusedDate(date === focusedDate ? null : date)
                  setAddingDay(null)
                }}
                className={cn(
                  'relative rounded-lg border p-1.5 text-left transition-colors min-h-[64px] flex flex-col gap-1',
                  isFocused
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent hover:border-border hover:bg-muted/40'
                )}
              >
                <span className={cn(
                  'text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full shrink-0',
                  isToday && 'bg-primary text-primary-foreground'
                )}>
                  {dayNum}
                </span>
                <div className="flex flex-col gap-0.5 w-full overflow-hidden">
                  {dayMeals.slice(0, 2).map(p => {
                    const meal = meals.find(m => m.id === p.mealId)
                    if (!meal) return null
                    return (
                      <span
                        key={p.id}
                        className="text-[10px] leading-tight bg-primary/10 text-primary rounded px-1 truncate block"
                      >
                        {meal.name}
                      </span>
                    )
                  })}
                  {dayMeals.length > 2 && (
                    <span className="text-[10px] text-muted-foreground">+{dayMeals.length - 2} more</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Focused day panel */}
        {focusedDate && (
          <Card>
            <CardContent className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">
                  {new Date(focusedDate + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric',
                  })}
                </h3>
                <div className="flex items-center gap-3">
                  {focusedCost > 0 && (
                    <span className="text-xs text-muted-foreground">{formatCost(focusedCost)}</span>
                  )}
                  <button
                    onClick={() => setFocusedDate(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {focusedMeals.length === 0 && addingDay !== focusedDate && (
                <p className="text-sm text-muted-foreground">No meals planned.</p>
              )}
              {focusedMeals.map(p => renderMealCard(p))}
              {addingDay === focusedDate
                ? renderAddForm()
                : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => startAdding(focusedDate)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Meal
                  </Button>
                )
              }
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Meal Plan</h1>
          {/* View toggle */}
          <div className="flex rounded-lg border overflow-hidden text-sm">
            {(['daily', 'weekly', 'monthly'] as CalendarView[]).map(v => (
              <button
                key={v}
                onClick={() => switchView(v)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                  view === v ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation bar */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-center min-w-[220px]">{periodLabel}</span>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-8 ml-1" onClick={() => { setCurrentDate(new Date()); setAddingDay(null); setFocusedDate(null) }}>
            Today
          </Button>
        </div>
      </div>

      {/* View content */}
      {view === 'daily' && renderDailyView()}
      {view === 'weekly' && renderWeeklyView()}
      {view === 'monthly' && renderMonthlyView()}
    </div>
  )
}
