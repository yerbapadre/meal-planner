'use client'
import { useState, useEffect } from 'react'
import type { Meal, PlannedMeal } from './types'
import { supabase } from './lib/supabase'

type Updater<T> = T | ((prev: T) => T)

function resolve<T>(updater: Updater<T>, prev: T): T {
  return typeof updater === 'function' ? (updater as (prev: T) => T)(prev) : updater
}

function mealToRow(m: Meal) {
  return { id: m.id, name: m.name, servings: m.servings, prep_time_minutes: m.prepTimeMinutes ?? null, ingredients: m.ingredients, notes: m.notes ?? null, tags: m.tags }
}

function rowToMeal(r: Record<string, unknown>): Meal {
  return { id: r.id as string, name: r.name as string, servings: r.servings as number, prepTimeMinutes: r.prep_time_minutes as number | undefined, ingredients: r.ingredients as Meal['ingredients'], notes: r.notes as string | undefined, tags: r.tags as string[] }
}

function planToRow(p: PlannedMeal) {
  return { id: p.id, meal_id: p.mealId, date: p.date, servings: p.servings }
}

function rowToPlan(r: Record<string, unknown>): PlannedMeal {
  return { id: r.id as string, mealId: r.meal_id as string, date: r.date as string, servings: r.servings as number }
}

export function useMeals() {
  const [meals, setMeals] = useState<Meal[]>(() => {
    try {
      const stored = localStorage.getItem('meals')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    supabase.from('meals').select('*').then(({ data }) => {
      if (data && data.length > 0) {
        const mapped = data.map(rowToMeal)
        setMeals(mapped)
        localStorage.setItem('meals', JSON.stringify(mapped))
      }
    })
  }, [])

  async function saveMeals(updater: Updater<Meal[]>) {
    setMeals(prev => {
      const next = resolve(updater, prev)
      localStorage.setItem('meals', JSON.stringify(next))
      const nextIds = new Set(next.map(m => m.id))
      const deletedIds = prev.filter(m => !nextIds.has(m.id)).map(m => m.id)
      if (next.length > 0) {
        supabase.from('meals').upsert(next.map(mealToRow)).then(({ error }) => {
          if (error) console.error('Failed to sync meals:', error)
        })
      }
      if (deletedIds.length > 0) {
        supabase.from('meals').delete().in('id', deletedIds).then(({ error }) => {
          if (error) console.error('Failed to delete meals:', error)
        })
      }
      return next
    })
  }

  return [meals, saveMeals] as const
}

export function usePlan() {
  const [plan, setPlan] = useState<PlannedMeal[]>(() => {
    try {
      const stored = localStorage.getItem('plan')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    supabase.from('planned_meals').select('*').then(({ data }) => {
      if (data && data.length > 0) {
        const mapped = data.map(rowToPlan)
        setPlan(mapped)
        localStorage.setItem('plan', JSON.stringify(mapped))
      }
    })
  }, [])

  async function savePlan(updater: Updater<PlannedMeal[]>) {
    setPlan(prev => {
      const next = resolve(updater, prev)
      localStorage.setItem('plan', JSON.stringify(next))
      supabase.from('planned_meals').upsert(next.map(planToRow)).then(({ error }) => {
        if (error) console.error('Failed to sync plan:', error)
      })
      return next
    })
  }

  return [plan, savePlan] as const
}
