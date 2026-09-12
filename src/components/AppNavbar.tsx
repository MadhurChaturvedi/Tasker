'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import ThemeToggle from '@/components/ThemeToggle'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/profile', label: 'Profile & Email', icon: '👤' },
]

export default function AppNavbar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link href="/dashboard" className="navbar-logo">
          ⚡ Tasker
        </Link>
        <div className="navbar-actions">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`btn btn-ghost btn-sm ${pathname === item.href ? 'sidebar-link active' : ''}`}
              style={{ gap: '0.4rem' }}
            >
              <span>{item.icon}</span>
              <span style={{ display: 'none' }}>{item.label}</span>
            </Link>
          ))}
          <ThemeToggle />
          <button
            onClick={handleSignOut}
            className="btn btn-secondary btn-sm"
            id="signout-btn"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  )
}
