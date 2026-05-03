import { useState } from 'react'
import { ShoppingCart, ExternalLink, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useMeals, usePlan } from '@/store'
import { generateGroceryList, formatCost } from '@/lib/grocery'
import type { GroceryItem } from '@/types'

export function GroceryPage() {
  const [meals] = useMeals()
  const [plan] = usePlan()
  const [items, setItems] = useState<GroceryItem[]>(() => generateGroceryList(plan, meals))

  function regenerate() {
    setItems(generateGroceryList(plan, meals))
  }

  function toggleItem(index: number) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, checked: !item.checked } : item))
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
      <div className="p-6 max-w-2xl mx-auto text-center py-16 text-muted-foreground">
        <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>Plan your meals for the week first, then come here to generate a grocery list.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Grocery List</h1>
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
        {unchecked.map((item) => (
          <GroceryRow
            key={item.name + item.unit}
            item={item}
            onToggle={() => toggleItem(items.indexOf(item))}
          />
        ))}
      </div>

      {checked.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">In cart</p>
          <div className="flex flex-col gap-1.5 opacity-50">
            {checked.map((item) => (
              <GroceryRow
                key={item.name + item.unit + '-checked'}
                item={item}
                onToggle={() => toggleItem(items.indexOf(item))}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function GroceryRow({ item, onToggle }: { item: GroceryItem; onToggle: () => void }) {
  return (
    <Card
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onToggle}
    >
      <CardContent className="p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${item.checked ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
            {item.checked && <span className="text-primary-foreground text-[10px] font-bold">✓</span>}
          </div>
          <div>
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
        </div>
      </CardContent>
    </Card>
  )
}
