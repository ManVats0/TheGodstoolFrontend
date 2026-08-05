import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Feedback() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', feedback: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const handleBack = () => {
    navigate('/')
  }

  const handleSubmit = async () => {
    if (honeypot) return
    if (!form.email.trim() || !form.feedback.trim()) {
      setErrorMsg('Email and feedback are required.')
      setStatus('error')
      return
    }
    if (!isValidEmail(form.email)) {
      setErrorMsg('Please enter a valid email address.')
      setStatus('error')
      return
    }
    if (file && file.size > 8 * 1024 * 1024) {
      setErrorMsg('Attachment must be under 8MB.')
      setStatus('error')
      return
    }

    setStatus('loading')
    setErrorMsg('')
    try {
      const formData = new FormData()
      formData.append('name', form.name)
      formData.append('email', form.email)
      formData.append('feedback', form.feedback)
      if (file) formData.append('attachment', file)

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/feedback`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Something went wrong.')
        setStatus('error')
        return
      }
      setStatus('sent')
      setForm({ name: '', email: '', feedback: '' })
      setFile(null)
    } catch {
      setErrorMsg('Cannot connect to server.')
      setStatus('error')
    }
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: '520px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0 0 8px', color: 'white' }}>Feedback/Support</h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem', margin: 0 }}>
          Help us improve. Your feedback goes directly to the team.
        </p>
      </div>

      {status === 'sent' ? (
        <div style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: '12px', padding: '28px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>✓</div>
          <div style={{ fontWeight: 700, color: 'white', marginBottom: '6px' }}>Thank you</div>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', margin: 0 }}>We appreciate your feedback.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input
            type="text" placeholder="Your name (optional)" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(167,139,250,0.18)', borderRadius: '8px', color: '#e2e8f0', fontFamily: 'Georgia, serif', outline: 'none' }}
          />
          <input
            type="email" placeholder="Email address" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(167,139,250,0.18)', borderRadius: '8px', color: '#e2e8f0', fontFamily: 'Georgia, serif', outline: 'none' }}
          />
          <textarea
            placeholder="Your feedback..." value={form.feedback}
            onChange={(e) => setForm({ ...form, feedback: e.target.value })}
            style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(167,139,250,0.18)', borderRadius: '8px', color: '#e2e8f0', fontFamily: 'Georgia, serif', outline: 'none', minHeight: '100px', resize: 'vertical' }}
          />

          <input
            type="file"
            accept=".png,.jpg,.jpeg,.pdf,.csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(167,139,250,0.18)', borderRadius: '8px', color: '#94a3b8', fontFamily: 'Georgia, serif', fontSize: '0.85rem' }}
          />

          <input
            type="text" value={honeypot} onChange={(e) => setHoneypot(e.target.value)}
            style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
            tabIndex={-1}
          />

          {status === 'error' && (
            <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: '6px', padding: '10px 12px', color: '#fca5a5', fontSize: '0.82rem', fontFamily: 'monospace' }}>
              ⚠ {errorMsg}
            </div>
          )}

          <button
            onClick={handleSubmit} disabled={status === 'loading'}
            style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: status === 'loading' ? 'not-allowed' : 'pointer', fontFamily: 'Georgia, serif', opacity: status === 'loading' ? 0.6 : 1 }}
          >
            {status === 'loading' ? 'Sending...' : 'Send Feedback'}
          </button>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '24px' }}>
        <button
          onClick={handleBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem',
            fontFamily: 'monospace', letterSpacing: '0.02em',
            padding: '6px 10px', transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
        >
          ← Back to app
        </button>
      </div>
    </div>
  )
}
