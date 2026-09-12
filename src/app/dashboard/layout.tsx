import type { Metadata } from 'next'
import AppNavbar from '@/components/AppNavbar'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-wrapper">
      <AppNavbar />
      <div className="main-content">
        {children}
      </div>
    </div>
  )
}
