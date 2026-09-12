'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Profile } from '@/types'

function isMissingProfileTableError(error: { message?: string; code?: string } | null) {
  if (!error) return false
  const message = error.message ?? ''
  return error.code === '42P01' || /public\.profiles|Could not find the table/i.test(message)
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const supabaseRef = useRef<SupabaseClient | null>(null)
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  const fetchProfile = useCallback(async () => {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      if (isMissingProfileTableError(error)) {
        setError('Supabase profile table is missing. Run the SQL from supabase-schema.sql in your Supabase SQL editor, then refresh this page.')
      } else {
        setError(error.message)
      }
    } else if (data) {
      setProfile(data as Profile)
      setFullName(data.full_name ?? '')
      setEmail(data.email ?? user.email ?? '')
    } else {
      // Create a profile record if it doesn't exist
      setFullName(user.user_metadata?.full_name ?? '')
      setEmail(user.email ?? '')
    }
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)

    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const trimmedName = fullName.trim()
    const trimmedEmail = email.trim()

    const baseProfile = {
      id: user.id,
      full_name: trimmedName || null,
      updated_at: new Date().toISOString(),
    }

    const profilePayload = trimmedEmail
      ? { ...baseProfile, email: trimmedEmail }
      : baseProfile

    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert(profilePayload)

    if (upsertError) {
      const missingEmailColumn = upsertError.code === '42703' || /email.*does not exist|Could not find the column/i.test(upsertError.message)

      if (missingEmailColumn) {
        const { error: fallbackError } = await supabase
          .from('profiles')
          .upsert(baseProfile)

        if (fallbackError) {
          setError(fallbackError.message)
        } else {
          setSaved(true)
          setTimeout(() => setSaved(false), 3000)
        }
      } else if (isMissingProfileTableError(upsertError)) {
        setError('Supabase profile table is missing. Run the SQL from supabase-schema.sql in your Supabase SQL editor, then refresh this page.')
      } else {
        setError(upsertError.message)
      }
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Profile</h1>
          </div>
        </div>
        <div className="profile-grid">
          {[1, 2].map((i) => (
            <div key={i} className="glass-card profile-section">
              <div className="skeleton" style={{ height: '200px', borderRadius: 'var(--radius-md)' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Your Profile</h1>
          <p className="page-subtitle">Manage your account & email notifications</p>
        </div>
      </div>

      <form onSubmit={handleSave} id="profile-form">
        <div className="profile-grid">
          {/* Account Info */}
          <div className="glass-card profile-section">
            <h2 className="profile-section-title">
              <span className="icon">👤</span>
              Account Info
            </h2>

            <div className="form-group">
              <label htmlFor="profile-name" className="form-label">Full Name</label>
              <input
                id="profile-name"
                type="text"
                className="form-input"
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          </div>

          {/* Email Settings */}
          <div className="glass-card profile-section">
            <h2 className="profile-section-title">
              <span className="icon">📧</span>
              Email Reminders
            </h2>

            <div className="form-group">
              <label htmlFor="profile-email" className="form-label">Email Address</label>
              <input
                id="profile-email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                We will send reminders to this email address.
              </p>
            </div>

            {email && (
              <div className="whatsapp-preview">
                📬 You will receive an email like:<br /><br />
                <strong style={{ color: 'var(--color-text-primary)' }}>
                  &quot;Tasker Reminder: Your task &ldquo;[Task Name]&rdquo; is due in [X] hour(s). Don&apos;t forget to complete it on time!&quot;
                </strong>
              </div>
            )}
          </div>
        </div>

        {error && <p className="form-error" style={{ marginTop: '1rem' }}>⚠️ {error}</p>}

        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
            id="profile-save-btn"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          {saved && (
            <span style={{ color: 'var(--color-success)', fontSize: '0.9rem', fontWeight: 500 }}>
              ✅ Profile saved!
            </span>
          )}
        </div>
      </form>

      {/* Info Box */}
      <div
        className="glass-card"
        style={{
          marginTop: '2rem',
          padding: '1.25rem',
          maxWidth: '600px',
          borderColor: 'rgba(99,102,241,0.2)',
          background: 'rgba(99,102,241,0.05)',
        }}
      >
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-accent-primary)' }}>
          💡 How Email Reminders Work
        </h3>
        <ul style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.7, paddingLeft: '1rem' }}>
          <li>Set your email address above.</li>
          <li>When creating a task, choose how far in advance to be reminded.</li>
          <li>Our system checks every few minutes and sends an email at the right time.</li>
          <li>You only receive one reminder per task (no spam!).</li>
          <li>Make sure your email is valid and can receive messages.</li>
        </ul>
      </div>
    </>
  )
}
