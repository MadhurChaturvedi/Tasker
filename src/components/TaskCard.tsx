'use client'

import { Task } from '@/types'
import { useCallback, useEffect, useState } from 'react'

interface TaskCardProps {
  task: Task
  onToggle: (id: string, completed: boolean) => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
}

function useCountdown(deadline: string) {
  const getRemaining = useCallback(() => {
    const diff = new Date(deadline).getTime() - Date.now()
    return diff
  }, [deadline])

  const [remaining, setRemaining] = useState(getRemaining)

  useEffect(() => {
    const timer = setInterval(() => setRemaining(getRemaining()), 60_000)
    return () => clearInterval(timer)
  }, [getRemaining])

  return remaining
}

function formatCountdown(ms: number) {
  if (ms < 0) return { text: 'Overdue', status: 'overdue' as const }

  const minutes = Math.floor(ms / 60_000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return { text: `${days}d ${hours % 24}h left`, status: (days < 1 ? 'soon' : 'normal') as 'normal' | 'soon' | 'overdue' }
  if (hours > 0) return { text: `${hours}h ${minutes % 60}m left`, status: (hours < 3 ? 'soon' : 'normal') as 'normal' | 'soon' | 'overdue' }
  return { text: `${minutes}m left`, status: 'soon' as const }
}

function formatDeadline(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function TaskCard({ task, onToggle, onEdit, onDelete }: TaskCardProps) {
  const remaining = useCountdown(task.deadline)
  const countdown = formatCountdown(remaining)

  const priorityClass = `priority-${task.priority}`
  const badgeClass = `badge-${task.priority}`

  return (
    <div
      className={`task-card glass-card ${priorityClass} ${task.is_completed ? 'completed' : ''}`}
      id={`task-${task.id}`}
    >
      <div className="task-header">
        <div className="task-left">
          {/* Checkbox */}
          <button
            className={`task-checkbox ${task.is_completed ? 'checked' : ''}`}
            onClick={() => onToggle(task.id, !task.is_completed)}
            aria-label={task.is_completed ? 'Mark as incomplete' : 'Mark as complete'}
            id={`task-toggle-${task.id}`}
            title={task.is_completed ? 'Mark incomplete' : 'Mark complete'}
          />
          <div>
            <p className="task-title">{task.title}</p>
            {task.description && (
              <p className="task-description">{task.description}</p>
            )}
          </div>
        </div>
        <div className="task-actions">
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => onEdit(task)}
            aria-label="Edit task"
            id={`task-edit-${task.id}`}
            title="Edit"
          >
            ✏️
          </button>
          <button
            className="btn btn-danger btn-icon"
            onClick={() => onDelete(task.id)}
            aria-label="Delete task"
            id={`task-delete-${task.id}`}
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="task-footer">
        <span className={`task-badge ${badgeClass}`}>
          {task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢'}
          {task.priority}
        </span>

        {!task.is_completed && (
          <span className={`task-deadline ${countdown.status}`}>
            ⏰ {formatDeadline(task.deadline)} — {countdown.text}
          </span>
        )}

        {task.is_completed && (
          <span className="task-deadline">
            ✅ Completed
          </span>
        )}

        {!task.notification_sent && !task.is_completed && (
          <span className="task-reminder-badge">
            💬 Reminder set {task.reminder_minutes_before >= 60
              ? `${task.reminder_minutes_before / 60}h`
              : `${task.reminder_minutes_before}m`} before
          </span>
        )}

        {task.notification_sent && (
          <span
            style={{
              fontSize: '0.72rem',
              color: 'var(--color-success)',
              background: 'var(--color-success-bg)',
              padding: '0.15rem 0.5rem',
              borderRadius: 'var(--radius-full)',
              border: '1px solid rgba(34,197,94,0.2)',
            }}
          >
            ✅ Email sent
          </span>
        )}
      </div>
    </div>
  )
}
