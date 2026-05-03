import type { Metadata } from 'next'
import '../index.css'
import { Layout } from '@/components/Layout'
import { Toaster } from '@/components/ui/sonner'

export const metadata: Metadata = {
  title: 'Meal Planner',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Layout>{children}</Layout>
        <Toaster />
      </body>
    </html>
  )
}
