'use client'
import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Meal, Ingredient } from '@/types'
import { searchKroger, type KrogerProduct } from '@/lib/kroger'

const UNITS = ['g', 'kg', 'oz', 'lb', 'cup', 'tbsp', 'tsp', 'ml', 'L', 'piece', 'slice', 'can', 'box', 'bunch', 'clove']

function emptyIngredient(): Ingredient {
  return { id: crypto.randomUUID(), name: '', quantity: 1, unit: 'piece', estimatedCost: 0 }
}

function emptyMeal(): Meal {
  return {
    id: crypto.randomUUID(),
    name: '',
    servings: 2,
    prepTimeMinutes: undefined,
    ingredients: [emptyIngredient()],
    notes: '',
    tags: [],
  }
}

interface Props {
  open: boolean
  meal: Meal | null
  onSave: (meal: Meal) => void
  onClose: () => void
}

export function MealDialog({ open, meal, onSave, onClose }: Props) {
  const [form, setForm] = useState<Meal>(emptyMeal)
  const [tagInput, setTagInput] = useState('')
  const [suggestions, setSuggestions] = useState<Record<string, KrogerProduct[]>>({})
  const [activeSuggestion, setActiveSuggestion] = useState<string | null>(null)
  const searchTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    setForm(meal ? { ...meal, ingredients: meal.ingredients.map(i => ({ ...i })) } : emptyMeal())
    setTagInput('')
    setSuggestions({})
    setActiveSuggestion(null)
  }, [meal, open])

  function handleIngredientNameChange(id: string, value: string) {
    updateIngredient(id, 'name', value)
    clearTimeout(searchTimers.current[id])
    if (value.length < 2) {
      setSuggestions(prev => ({ ...prev, [id]: [] }))
      return
    }
    searchTimers.current[id] = setTimeout(async () => {
      try {
        const results = await searchKroger(value)
        setSuggestions(prev => ({ ...prev, [id]: results }))
        setActiveSuggestion(id)
      } catch {
        // silently fail — user can still type manually
      }
    }, 400)
  }

  function selectSuggestion(id: string, product: KrogerProduct) {
    setForm(prev => ({
      ...prev,
      ingredients: prev.ingredients.map(i =>
        i.id === id
          ? { ...i, name: product.description, estimatedCost: product.price ?? i.estimatedCost }
          : i
      ),
    }))
    setSuggestions(prev => ({ ...prev, [id]: [] }))
    setActiveSuggestion(null)
  }

  function setField<K extends keyof Meal>(key: K, value: Meal[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function updateIngredient(id: string, field: keyof Ingredient, value: string | number) {
    setForm(prev => ({
      ...prev,
      ingredients: prev.ingredients.map(i => i.id === id ? { ...i, [field]: value } : i),
    }))
  }

  function addIngredient() {
    setForm(prev => ({ ...prev, ingredients: [...prev.ingredients, emptyIngredient()] }))
  }

  function removeIngredient(id: string) {
    setForm(prev => ({ ...prev, ingredients: prev.ingredients.filter(i => i.id !== id) }))
  }

  function addTag(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const tag = tagInput.trim().toLowerCase()
      if (tag && !form.tags.includes(tag)) {
        setField('tags', [...form.tags, tag])
      }
      setTagInput('')
    }
  }

  function removeTag(tag: string) {
    setField('tags', form.tags.filter(t => t !== tag))
  }

  function handleSave() {
    if (!form.name.trim()) return
    onSave({ ...form, name: form.name.trim() })
  }

  const totalCost = form.ingredients.reduce((sum, i) => sum + (Number(i.estimatedCost) || 0), 0)
  const costPerServing = form.servings > 0 ? totalCost / form.servings : 0

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{meal ? 'Edit Meal' : 'Add Meal'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label>Name</Label>
              <Input
                placeholder="e.g. Lentil soup"
                value={form.name}
                onChange={e => setField('name', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Servings</Label>
              <Input
                type="number"
                min={1}
                value={form.servings}
                onChange={e => setField('servings', parseInt(e.target.value) || 1)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Prep time (minutes) <span className="text-muted-foreground font-normal">optional</span></Label>
            <Input
              type="number"
              min={0}
              placeholder="30"
              value={form.prepTimeMinutes ?? ''}
              onChange={e => setField('prepTimeMinutes', e.target.value ? parseInt(e.target.value) : undefined)}
              className="mt-1 w-32"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Ingredients</Label>
              <span className="text-xs text-muted-foreground">
                Total: ${totalCost.toFixed(2)} · ${costPerServing.toFixed(2)}/serving
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {form.ingredients.map(ing => (
                <div key={ing.id} className="grid grid-cols-[1fr_100px_100px_80px_28px] gap-2 items-center">
                  <div className="relative">
                    <Input
                      placeholder="Ingredient name"
                      value={ing.name}
                      onChange={e => handleIngredientNameChange(ing.id, e.target.value)}
                      onFocus={() => suggestions[ing.id]?.length && setActiveSuggestion(ing.id)}
                      onBlur={() => setTimeout(() => setActiveSuggestion(null), 150)}
                      className="text-sm"
                    />
                    {activeSuggestion === ing.id && suggestions[ing.id]?.length > 0 && (
                      <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                        {suggestions[ing.id].map(product => (
                          <li
                            key={product.productId}
                            className="flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-accent"
                            onMouseDown={() => selectSuggestion(ing.id, product)}
                          >
                            <span className="truncate mr-2">{product.description}</span>
                            <span className="text-muted-foreground shrink-0">
                              {product.price != null ? `$${product.price.toFixed(2)}` : '—'}
                              {product.unit ? ` / ${product.unit}` : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <Input
                    type="number"
                    min={0}
                    step="0.1"
                    placeholder="Qty"
                    value={ing.quantity}
                    onChange={e => updateIngredient(ing.id, 'quantity', parseFloat(e.target.value) || 0)}
                    className="text-sm"
                  />
                  <select
                    value={ing.unit}
                    onChange={e => updateIngredient(ing.id, 'unit', e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      value={ing.estimatedCost || ''}
                      onChange={e => updateIngredient(ing.id, 'estimatedCost', parseFloat(e.target.value) || 0)}
                      className="text-sm pl-5"
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeIngredient(ing.id)}
                    disabled={form.ingredients.length === 1}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-fit" onClick={addIngredient}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add ingredient
              </Button>
            </div>
          </div>

          <div>
            <Label>Tags <span className="text-muted-foreground font-normal">optional — press Enter to add</span></Label>
            <div className="mt-1 flex flex-wrap gap-1.5 p-2 border rounded-md min-h-[38px]">
              {form.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground text-xs px-2 py-0.5 rounded-full cursor-pointer hover:bg-destructive/20"
                  onClick={() => removeTag(tag)}
                >
                  {tag} ×
                </span>
              ))}
              <input
                className="flex-1 min-w-[100px] bg-transparent text-sm outline-none"
                placeholder="e.g. quick, vegetarian…"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={addTag}
              />
            </div>
          </div>

          <div>
            <Label>Notes <span className="text-muted-foreground font-normal">optional</span></Label>
            <Textarea
              placeholder="Instructions, tips, substitutions…"
              value={form.notes}
              onChange={e => setField('notes', e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.name.trim()}>
            {meal ? 'Save changes' : 'Add meal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
