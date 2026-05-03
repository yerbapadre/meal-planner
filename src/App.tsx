import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { Layout } from '@/components/Layout'
import { PlanPage } from '@/pages/PlanPage'
import { MealsPage } from '@/pages/MealsPage'
import { GroceryPage } from '@/pages/GroceryPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<PlanPage />} />
          <Route path="meals" element={<MealsPage />} />
          <Route path="grocery" element={<GroceryPage />} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}
