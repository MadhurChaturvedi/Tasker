import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Tasker — Smart Task Management with Email Reminders',
  description: 'Manage your tasks, set deadlines, and receive automatic email reminders before they are due.',
}

const features = [
  {
    icon: '✅',
    title: 'Smart Task Management',
    desc: 'Create, organize, and track tasks with priorities and deadlines. Stay on top of everything that matters.',
  },
  {
    icon: '📧',
    title: 'Email Reminders',
    desc: 'Get automated email notifications before your deadlines. Never miss an important task.',
  },
  {
    icon: '⏰',
    title: 'Deadline Tracking',
    desc: 'Visual countdown timers and real-time status updates so you always know where you stand.',
  },
  {
    icon: '🔒',
    title: 'Secure & Private',
    desc: 'Your tasks and data are secured with industry-standard authentication and row-level security.',
  },
]

export default function HomePage() {
  return (
    <div className="page-wrapper">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-inner">
          <span className="navbar-logo">⚡ Tasker</span>
          <div className="navbar-actions">
            <Link href="/login" className="btn btn-ghost">
              Sign In
            </Link>
            <Link href="/signup" className="btn btn-primary">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div style={{ maxWidth: '700px' }}>
          <div className="hero-badge">
            <span>🚀</span>
            <span>Email-powered task reminders</span>
          </div>
          <h1 className="hero-title">
            Never miss a{' '}
            <span className="gradient-text">deadline</span>{' '}
            again.
          </h1>
          <p className="hero-description">
            Tasker is the smart way to manage your tasks. Set deadlines, assign priorities, and let email reminders arrive automatically when it matters most.
          </p>
          <div className="hero-cta">
            <Link href="/signup" className="btn btn-primary btn-lg pulse-glow" id="hero-cta-signup">
              Start for Free →
            </Link>
            <Link href="/login" className="btn btn-secondary btn-lg" id="hero-cta-login">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <div style={{ paddingBottom: '4rem', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, marginBottom: '0.75rem' }}>
            Everything you need to stay{' '}
            <span className="gradient-text">productive</span>
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem' }}>
            Built for people who mean business with their deadlines.
          </p>
        </div>
        <div className="features-grid">
          {features.map((f) => (
            <div key={f.title} className="feature-card glass-card">
              <div className="feature-icon">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
