import type { Metadata } from 'next'
import AppNavbar from '@/components/AppNavbar'

export const metadata: Metadata = {
  title: 'Profile & WhatsApp',
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-wrapper">
      <AppNavbar />
      <div className="main-content">
        {children}
      </div>
    </div>
  )
}
