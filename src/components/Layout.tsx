'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UtensilsCrossed, CalendarDays, ShoppingBasket } from 'lucide-react'

const nav = [
  { to: '/', label: 'Plan', icon: CalendarDays },
  { to: '/meals', label: 'Meals', icon: UtensilsCrossed },
  { to: '/grocery', label: 'Grocery', icon: ShoppingBasket },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-lg font-heading bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">Meal Planner</span>
          <nav className="flex gap-1">
            {nav.map(({ to, label, icon: Icon }) => {
              const isActive = to === '/' ? pathname === '/' : pathname.startsWith(to)
              return (
                <Link
                  key={to}
                  href={to}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
