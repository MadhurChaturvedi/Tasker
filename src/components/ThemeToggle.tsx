'use client'

import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('tasker-theme') as 'dark' | 'light' | null
    const preferredTheme = savedTheme ?? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    setTheme(preferredTheme)
    document.documentElement.setAttribute('data-theme', preferredTheme)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem('tasker-theme', theme)
  }, [theme])

  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm theme-toggle"
      onClick={() => setTheme(nextTheme)}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
    >
      <span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span>
      <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
    </button>
  )
}
