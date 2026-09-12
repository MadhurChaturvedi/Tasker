'use client'

import { useEffect, useState, useCallback } from 'react'
import { Task, Priority } from '@/types'

interface AddTaskModalProps {
  onClose: () => void
  onSave: (task: Omit<Task, 'id' | 'user_id' | 'is_completed' | 'notification_sent' | 'created_at'>) => Promise<void>
  editTask?: Task | null
}

const PRIORITY_OPTIONS: { value: Priority; label: string; emoji: string }[] = [
  { value: 'low', label: 'Low', emoji: '🟢' },
  { value: 'medium', label: 'Medium', emoji: '🟡' },
  { value: 'high', label: 'High', emoji: '🔴' },
]

const REMINDER_OPTIONS = [
  { value: 5, label: '5 minutes before' },
  { value: 10, label: '10 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 45, label: '45 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 120, label: '2 hours before' },
  { value: 360, label: '6 hours before' },
  { value: 720, label: '12 hours before' },
  { value: 1440, label: '1 day before' },
]

export default function AddTaskModal({ onClose, onSave, editTask }: AddTaskModalProps) {
  const [title, setTitle] = useState(editTask?.title ?? '')
  const [description, setDescription] = useState(editTask?.description ?? '')
  const [deadline, setDeadline] = useState(
    editTask?.deadline
      ? new Date(editTask.deadline).toISOString().slice(0, 16)
      : ''
  )
  const [priority, setPriority] = useState<Priority>(editTask?.priority ?? 'medium')
  const [reminderMinutes, setReminderMinutes] = useState(editTask?.reminder_minutes_before ?? 60)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('Please enter a task title.')
      return
    }
    if (!deadline) {
      setError('Please select a deadline.')
      return
    }

    const selectedDate = new Date(deadline)
    if (selectedDate <= new Date()) {
      setError('Deadline must be in the future.')
      return
    }

    setLoading(true)
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        deadline: new Date(deadline).toISOString(),
        priority,
        reminder_minutes_before: reminderMinutes,
      })
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // Get min date (now) for deadline picker
  const minDate = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)

  return (
    <div className="modal-overlay" onClick={handleBackdropClick} id="task-modal-overlay">
      <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <h2 className="modal-title" id="modal-title">
            {editTask ? '✏️ Edit Task' : '✨ New Task'}
          </h2>
          <button
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            aria-label="Close modal"
            id="modal-close-btn"
          >
            ✕
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit} id="task-form">
          <div className="form-group">
            <label htmlFor="task-title" className="form-label">Task Title *</label>
            <input
              id="task-title"
              type="text"
              className="form-input"
              placeholder="e.g., Submit project report"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="task-description" className="form-label">Description (optional)</label>
            <textarea
              id="task-description"
              className="form-textarea"
              placeholder="Add some details about this task…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="form-group">
            <label htmlFor="task-deadline" className="form-label">Deadline *</label>
            <input
              id="task-deadline"
              type="datetime-local"
              className="form-input"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={minDate}
              required
              style={{ colorScheme: 'dark' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Priority</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPriority(opt.value)}
                  id={`priority-${opt.value}`}
                  style={{
                    flex: 1,
                    padding: '0.6rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${priority === opt.value ? 'var(--color-border-focus)' : 'var(--color-border)'}`,
                    background: priority === opt.value ? 'rgba(99,102,241,0.12)' : 'transparent',
                    color: 'var(--color-text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="task-reminder" className="form-label">� Email Reminder</label>
            <select
              id="task-reminder"
              className="form-select"
              value={reminderMinutes}
              onChange={(e) => setReminderMinutes(Number(e.target.value))}
            >
              {REMINDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              You&apos;ll receive an email reminder before the deadline.
            </p>
          </div>

          {error && <p className="form-error">⚠️ {error}</p>}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} id="task-cancel-btn">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} id="task-save-btn">
              {loading ? 'Saving…' : editTask ? 'Update Task' : 'Create Task ✨'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
