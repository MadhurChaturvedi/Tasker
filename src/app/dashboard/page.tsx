'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Task, Priority } from '@/types'
import TaskCard from '@/components/TaskCard'
import AddTaskModal from '@/components/AddTaskModal'

type FilterType = 'all' | 'active' | 'completed' | 'overdue'

function Toast({ message, type, onDismiss }: { message: string; type: 'success' | 'error'; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div className={`toast toast-${type}`}>
      {type === 'success' ? '✅' : '❌'} {message}
    </div>
  )
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const supabaseRef = useRef<SupabaseClient | null>(null)
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
  }

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('deadline', { ascending: true })

    if (!error && data) setTasks(data as Task[])
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  async function handleSaveTask(
    taskData: Omit<Task, 'id' | 'user_id' | 'is_completed' | 'notification_sent' | 'created_at'>
  ) {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    if (editTask) {
      // Update existing task
      const { error } = await supabase
        .from('tasks')
        .update({ ...taskData, notification_sent: false })
        .eq('id', editTask.id)

      if (error) throw error
      showToast('Task updated!')
    } else {
      // Create new task
      const { error } = await supabase
        .from('tasks')
        .insert([{
          ...taskData,
          user_id: user.id,
          is_completed: false,
          notification_sent: false,
        }])

      if (error) throw error
      showToast('Task created! 🎉')
    }

    setEditTask(null)
    await fetchTasks()
  }

  async function handleToggle(id: string, is_completed: boolean) {
    const supabase = getSupabase()
    const { error } = await supabase
      .from('tasks')
      .update({ is_completed })
      .eq('id', id)

    if (!error) {
      setTasks((prev) => prev.map((t) => t.id === id ? { ...t, is_completed } : t))
      showToast(is_completed ? '✅ Task completed!' : 'Task marked active')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this task?')) return
    const supabase = getSupabase()
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (!error) {
      setTasks((prev) => prev.filter((t) => t.id !== id))
      showToast('Task deleted.')
    }
  }

  function handleEdit(task: Task) {
    setEditTask(task)
    setShowModal(true)
  }

  function handleOpenNew() {
    setEditTask(null)
    setShowModal(true)
  }

  const now = new Date()
  const filtered = tasks.filter((t) => {
    if (filter === 'active') return !t.is_completed && new Date(t.deadline) > now
    if (filter === 'completed') return t.is_completed
    if (filter === 'overdue') return !t.is_completed && new Date(t.deadline) <= now
    return true
  })

  // Stats
  const total = tasks.length
  const completed = tasks.filter((t) => t.is_completed).length
  const overdue = tasks.filter((t) => !t.is_completed && new Date(t.deadline) <= now).length
  const active = tasks.filter((t) => !t.is_completed && new Date(t.deadline) > now).length

  const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 }
  const sortedFiltered = [...filtered].sort((a, b) => {
    if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  })

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <AddTaskModal
          onClose={() => { setShowModal(false); setEditTask(null) }}
          onSave={handleSaveTask}
          editTask={editTask}
        />
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">My Tasks</h1>
          <p className="page-subtitle">Stay on top of your deadlines</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenNew} id="add-task-btn">
          + New Task
        </button>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card glass-card">
          <p className="stat-label">Total</p>
          <p className="stat-value accent">{total}</p>
        </div>
        <div className="stat-card glass-card">
          <p className="stat-label">Active</p>
          <p className="stat-value" style={{ color: 'var(--color-info)' }}>{active}</p>
        </div>
        <div className="stat-card glass-card">
          <p className="stat-label">Completed</p>
          <p className="stat-value" style={{ color: 'var(--color-success)' }}>{completed}</p>
        </div>
        <div className="stat-card glass-card">
          <p className="stat-label">Overdue</p>
          <p className="stat-value" style={{ color: overdue > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
            {overdue}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        {(['all', 'active', 'overdue', 'completed'] as FilterType[]).map((f) => (
          <button
            key={f}
            className={`filter-chip ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
            id={`filter-${f}`}
          >
            {f === 'all' ? '📋 All' : f === 'active' ? '⚡ Active' : f === 'overdue' ? '🔥 Overdue' : '✅ Completed'}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          {filtered.length} task{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="tasks-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card" style={{ height: '100px', borderRadius: 'var(--radius-lg)' }}>
              <div className="skeleton" style={{ height: '100%', borderRadius: 'var(--radius-lg)' }} />
            </div>
          ))}
        </div>
      ) : sortedFiltered.length === 0 ? (
        <div className="glass-card">
          <div className="empty-state">
            <div className="empty-icon">
              {filter === 'completed' ? '🎉' : filter === 'overdue' ? '🎊' : '📋'}
            </div>
            <p className="empty-title">
              {filter === 'all' ? 'No tasks yet' : `No ${filter} tasks`}
            </p>
            <p className="empty-desc">
              {filter === 'all'
                ? 'Create your first task to get started!'
                : filter === 'completed'
                ? 'Complete some tasks to see them here.'
                : filter === 'overdue'
                ? 'Great job keeping up with deadlines! 🎉'
                : 'All tasks are completed or overdue.'}
            </p>
            {filter === 'all' && (
              <button className="btn btn-primary btn-sm" onClick={handleOpenNew} id="empty-add-btn">
                + Create Task
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="tasks-grid">
          {sortedFiltered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={handleToggle}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </>
  )
}
