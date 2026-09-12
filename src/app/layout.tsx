import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    template: '%s | Tasker',
    default: 'Tasker — Smart Task Management with Email Reminders',
  },
  description: 'Manage your tasks, set deadlines, and never miss an important event with automated email reminders delivered right to your inbox.',
  keywords: ['task management', 'email reminders', 'productivity', 'deadline tracker'],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
      </body>
    </html>
  )
}
