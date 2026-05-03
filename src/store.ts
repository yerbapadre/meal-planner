import { useState, useEffect } from 'react'
import type { Meal, PlannedMeal } from './types'
import { supabase } from './lib/supabase'

type Updater<T> = T | ((prev: T) => T)

function resolve<T>(updater: Updater<T>, prev: T): T {
  return typeof updater === 'function' ? (updater as (prev: T) => T)(prev) : updater
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
        setMeals(data)
        localStorage.setItem('meals', JSON.stringify(data))
      }
    })
  }, [])

  async function saveMeals(updater: Updater<Meal[]>) {
    setMeals(prev => {
      const next = resolve(updater, prev)
      localStorage.setItem('meals', JSON.stringify(next))
      supabase.from('meals').upsert(next).then(({ error }) => {
        if (error) console.error('Failed to sync meals:', error)
      })
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
        setPlan(data)
        localStorage.setItem('plan', JSON.stringify(data))
      }
    })
  }, [])

  async function savePlan(updater: Updater<PlannedMeal[]>) {
    setPlan(prev => {
      const next = resolve(updater, prev)
      localStorage.setItem('plan', JSON.stringify(next))
      supabase.from('planned_meals').upsert(next).then(({ error }) => {
        if (error) console.error('Failed to sync plan:', error)
      })
      return next
    })
  }

  return [plan, savePlan] as const
}
