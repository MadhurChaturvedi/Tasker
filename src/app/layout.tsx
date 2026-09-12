import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    template: '%s | Tasker',
    default: 'Tasker — Smart Task Management with WhatsApp Reminders',
  },
  description: 'Manage your tasks, set deadlines, and never miss an important event with automated WhatsApp reminders delivered right to your phone.',
  keywords: ['task management', 'whatsapp reminders', 'productivity', 'deadline tracker'],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
