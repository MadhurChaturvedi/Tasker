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
  const [whatsapp, setWhatsapp] = useState('')
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
      setWhatsapp(data.whatsapp_number ?? '')
    } else {
      // Create a profile record if it doesn't exist
      setFullName(user.user_metadata?.full_name ?? '')
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

    // Validate WhatsApp number: must start with +, country code, then digits
    const cleaned = whatsapp.replace(/\s/g, '')
    if (cleaned && !/^\+\d{7,15}$/.test(cleaned)) {
      setError('Please enter a valid WhatsApp number with country code (e.g. +919876543210)')
      setSaving(false)
      return
    }

    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: fullName.trim(),
        whatsapp_number: cleaned || null,
        updated_at: new Date().toISOString(),
      })

    if (upsertError) {
      if (isMissingProfileTableError(upsertError)) {
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
          <p className="page-subtitle">Manage your account & WhatsApp notifications</p>
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

          {/* WhatsApp Settings */}
          <div className="glass-card profile-section">
            <h2 className="profile-section-title">
              <span className="icon">💬</span>
              WhatsApp Reminders
            </h2>

            <div className="form-group">
              <label htmlFor="profile-whatsapp" className="form-label">WhatsApp Number</label>
              <input
                id="profile-whatsapp"
                type="tel"
                className="form-input"
                placeholder="+919876543210"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                Enter with country code. Example: +91 for India.
              </p>
            </div>

            {whatsapp && (
              <div className="whatsapp-preview">
                📱 You will receive a WhatsApp message like:<br /><br />
                <strong style={{ color: 'var(--color-text-primary)' }}>
                  &quot;⚡ Tasker Reminder: Your task &ldquo;[Task Name]&rdquo; is due in [X] hour(s). Don&apos;t forget to complete it on time!&quot;
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
          💡 How WhatsApp Reminders Work
        </h3>
        <ul style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.7, paddingLeft: '1rem' }}>
          <li>Set your WhatsApp number above (with country code).</li>
          <li>When creating a task, choose how far in advance to be reminded.</li>
          <li>Our system checks every few minutes and sends a WhatsApp message at the right time.</li>
          <li>You only receive one reminder per task (no spam!).</li>
          <li>Reminders use Twilio — make sure your number can receive WhatsApp messages.</li>
        </ul>
      </div>
    </>
  )
}
