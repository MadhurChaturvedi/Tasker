export type Priority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  user_id: string
  title: string
  description: string | null
  deadline: string  // ISO string
  priority: Priority
  is_completed: boolean
  reminder_minutes_before: number
  notification_sent: boolean
  created_at: string
}

export interface Profile {
  id: string
  full_name: string | null
  whatsapp_number: string | null
  updated_at: string | null
}
