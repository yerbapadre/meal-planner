'use client'
import { useState, useRef, useEffect } from 'react'
import { ShoppingCart, ExternalLink, RefreshCw, Trash2, Pencil, Check, X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useMeals, usePlan } from '@/store'
import { generateGroceryList, formatCost } from '@/lib/grocery'
import type { GroceryItem } from '@/types'

export function GroceryPage() {
  const [meals] = useMeals()
  const [plan] = usePlan()
  const [items, setItems] = useState<GroceryItem[]>(() => generateGroceryList(plan, meals))
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newQty, setNewQty] = useState('')
  const [newUnit, setNewUnit] = useState('')
  const addNameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (adding) addNameRef.current?.focus()
  }, [adding])

  function regenerate() {
    setItems(generateGroceryList(plan, meals))
  }

  function toggleItem(index: number) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, checked: !item.checked } : item))
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  function updateItem(index: number, patch: Partial<GroceryItem>) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, ...patch } : item))
  }

  function addItem() {
    const name = newName.trim()
    if (!name) return
    const qty = parseFloat(newQty) || 1
    setItems(prev => [...prev, {
      name,
      quantity: qty,
      unit: newUnit.trim() || 'item',
      estimatedCost: 0,
      checked: false,
      mealNames: [],
    }])
    setNewName('')
    setNewQty('')
    setNewUnit('')
    setAdding(false)
  }

  const totalCost = items.reduce((sum, item) => sum + item.estimatedCost, 0)
  const unchecked = items.filter(i => !i.checked)
  const checked = items.filter(i => i.checked)

  function openInstacart() {
    const list = unchecked
      .map(i => `${Math.ceil(i.quantity)} ${i.unit} ${i.name}`)
      .join('%0A')
    window.open(`https://www.instacart.com/store?list=${list}`, '_blank')
  }

  if (plan.length === 0) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center py-16 text-muted-foreground">
        <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-primary/40" />
        <p>Plan your meals for the week first, then come here to generate a grocery list.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold font-heading">Grocery List</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {items.length} items · estimated {formatCost(totalCost)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={regenerate}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
          <Button size="sm" onClick={openInstacart} disabled={unchecked.length === 0}>
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Order via Instacart
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {unchecked.map((item) => {
          const index = items.indexOf(item)
          return (
            <GroceryRow
              key={item.name + item.unit + index}
              item={item}
              onToggle={() => toggleItem(index)}
              onRemove={() => removeItem(index)}
              onUpdate={(patch) => updateItem(index, patch)}
            />
          )
        })}
      </div>

      {checked.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">In cart</p>
          <div className="flex flex-col gap-1.5 opacity-50">
            {checked.map((item) => {
              const index = items.indexOf(item)
              return (
                <GroceryRow
                  key={item.name + item.unit + index + '-checked'}
                  item={item}
                  onToggle={() => toggleItem(index)}
                  onRemove={() => removeItem(index)}
                  onUpdate={(patch) => updateItem(index, patch)}
                />
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-4">
        {adding ? (
          <Card>
            <CardContent className="p-3 flex items-center gap-2">
              <Input
                ref={addNameRef}
                placeholder="Item name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="h-7 text-sm flex-1"
                onKeyDown={e => { if (e.key === 'Enter') addItem(); if (e.key === 'Escape') setAdding(false) }}
              />
              <Input
                placeholder="Qty"
                value={newQty}
                onChange={e => setNewQty(e.target.value)}
                className="h-7 text-sm w-16"
                type="number"
                min="0"
              />
              <Input
                placeholder="Unit"
                value={newUnit}
                onChange={e => setNewUnit(e.target.value)}
                className="h-7 text-sm w-20"
              />
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={addItem}>
                <Check className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setAdding(false)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Button variant="ghost" size="sm" className="text-muted-foreground w-full justify-start" onClick={() => setAdding(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add item
          </Button>
        )}
      </div>
    </div>
  )
}

function GroceryRow({
  item,
  onToggle,
  onRemove,
  onUpdate,
}: {
  item: GroceryItem
  onToggle: () => void
  onRemove: () => void
  onUpdate: (patch: Partial<GroceryItem>) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(item.name)
  const [editQty, setEditQty] = useState(String(item.quantity))
  const [editUnit, setEditUnit] = useState(item.unit)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) nameRef.current?.focus()
  }, [editing])

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation()
    setEditName(item.name)
    setEditQty(String(item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(1)))
    setEditUnit(item.unit)
    setEditing(true)
  }

  function saveEdit(e: React.MouseEvent) {
    e.stopPropagation()
    onUpdate({ name: editName.trim() || item.name, quantity: parseFloat(editQty) || item.quantity, unit: editUnit.trim() || item.unit })
    setEditing(false)
  }

  function cancelEdit(e: React.MouseEvent) {
    e.stopPropagation()
    setEditing(false)
  }

  if (editing) {
    return (
      <Card>
        <CardContent className="p-3 flex items-center gap-2">
          <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${item.checked ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`} />
          <Input
            ref={nameRef}
            value={editName}
            onChange={e => setEditName(e.target.value)}
            className="h-7 text-sm flex-1"
            onKeyDown={e => { if (e.key === 'Escape') setEditing(false) }}
          />
          <Input
            value={editQty}
            onChange={e => setEditQty(e.target.value)}
            className="h-7 text-sm w-16"
            type="number"
            min="0"
          />
          <Input
            value={editUnit}
            onChange={e => setEditUnit(e.target.value)}
            className="h-7 text-sm w-20"
          />
          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={saveEdit}>
            <Check className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={cancelEdit}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className="cursor-pointer hover:bg-muted/50 transition-colors group"
      onClick={onToggle}
    >
      <CardContent className="p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${item.checked ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
            {item.checked && <span className="text-primary-foreground text-[10px] font-bold">✓</span>}
          </div>
          <div className="min-w-0">
            <span className={`text-sm font-medium ${item.checked ? 'line-through text-muted-foreground' : ''}`}>
              {item.name}
            </span>
            <span className="text-xs text-muted-foreground ml-2">
              {item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(1)} {item.unit}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex gap-1">
            {item.mealNames.slice(0, 2).map(name => (
              <Badge key={name} variant="secondary" className="text-xs py-0">{name}</Badge>
            ))}
            {item.mealNames.length > 2 && (
              <Badge variant="secondary" className="text-xs py-0">+{item.mealNames.length - 2}</Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">{formatCost(item.estimatedCost)}</span>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={startEdit}
            >
              <Pencil className="w-3 h-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={e => { e.stopPropagation(); onRemove() }}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
