import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const PLAN_LABELS: Record<string, string> = {
  lite: 'Lite', starter: 'Starter', pro: 'Pro', team: 'Team', enterprise: 'Enterprise'
}

export default function Contact() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [honeypot, setHoneypot] = useState('')

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  // Prefill from a logged-in user landing here via a "Contact Sales" link
  useEffect(() => {
    const intent = searchParams.get('intent')
    const planParam = searchParams.get('plan')
    const billingParam = searchParams.get('billing')
    const storedEmail = localStorage.getItem('datapro_email')
    const token = localStorage.getItem('datapro_token')

    const planLabel = planParam ? (PLAN_LABELS[planParam] || planParam) : ''
    const prefillMessage =
      intent === 'sales' && planLabel
        ? `Hi, I'm interested in the ${planLabel} plan${billingParam ? ` (${billingParam} billing)` : ''}. I'd love to get set up with something powerful for my data pipeline — please share the next steps.`
        : ''

    setForm(prev => ({
      ...prev,
      email: storedEmail || prev.email,
      message: prefillMessage || prev.message,
    }))

    if (token) {
      fetch(`${import.meta.env.VITE_AUTH_URL}/api/plan`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.name) {
            setForm(prev => ({ ...prev, name: data.name }))
          }
        })
        .catch(() => { /* silently ignore — form still usable blank */ })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async () => {
    if (honeypot) return // bot caught
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setErrorMsg('Please fill in all fields.')
      setStatus('error')
      return
    }
    if (!isValidEmail(form.email)) {
      setErrorMsg('Please enter a valid email address.')
      setStatus('error')
      return
    }

    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Something went wrong. Please try again.')
        setStatus('error')
        return
      }
      setStatus('sent')
      setForm({ name: '', email: '', message: '' })
    } catch {
      setErrorMsg('Cannot connect to server. Please try emailing us directly.')
      setStatus('error')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#05030f', color: 'white', fontFamily: 'Georgia, serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes checkPop { 0%{transform:scale(0)} 60%{transform:scale(1.15)} 100%{transform:scale(1)} }
        .contact-input {
          width: 100%; padding: 14px 16px; background: rgba(255,255,255,0.04);
          border: 1px solid rgba(167,139,250,0.18); border-radius: 8px; color: #e2e8f0;
          font-size: 0.95rem; font-family: Georgia, serif; box-sizing: border-box; outline: none;
          transition: border-color 0.2s;
        }
        .contact-input::placeholder { color: rgba(148,163,184,0.45); }
        .contact-input:focus { border-color: rgba(167,139,250,0.55); }
        .contact-textarea { resize: vertical; min-height: 130px; font-family: Georgia, serif; }
        .contact-submit {
          width: 100%; padding: 15px; background: linear-gradient(135deg, #7c3aed, #4f46e5);
          border: none; border-radius: 8px; color: white; font-weight: 700; font-size: 0.95rem;
          letter-spacing: 0.06em; cursor: pointer; font-family: Georgia, serif; transition: opacity 0.2s;
        }
        .contact-submit:hover { opacity: 0.88; }
        .contact-submit:disabled { opacity: 0.55; cursor: not-allowed; }
      `}</style>

      <div style={{ position: 'absolute', top: '15%', left: '10%', width: '280px', height: '280px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '15%', right: '10%', width: '220px', height: '220px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,70,229,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: '480px', animation: 'fadeUp 0.6s ease both' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#7c3aed', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '14px' }}>Get In Touch</div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 900, margin: '0 0 12px', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #e9d5ff, #a78bfa, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Let's talk data.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.92rem', maxWidth: '380px', margin: '0 auto', lineHeight: 1.7 }}>
            Got a question, a custom connector request, or just want to say hi? We typically reply within 24 hours.
          </p>
        </div>

        {status === 'sent' ? (
          <div style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: '14px', padding: '40px 28px', textAlign: 'center', animation: 'fadeUp 0.4s ease both' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', animation: 'checkPop 0.4s ease both' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#e2e8f0', marginBottom: '8px' }}>Message sent</div>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', fontFamily: 'monospace' }}>We'll get back to you shortly.</p>
            <button onClick={() => setStatus('idle')} style={{ marginTop: '20px', background: 'transparent', border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa', padding: '8px 20px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'monospace' }}>
              Send another
            </button>
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(167,139,250,0.12)', borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Honeypot — hidden from real users, bots will fill it */}
            <input
              type="text" value={honeypot} onChange={(e) => setHoneypot(e.target.value)}
              style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
              tabIndex={-1} autoComplete="off"
            />

            <input
              className="contact-input" placeholder="Full Name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="contact-input" type="email" placeholder="Email Address" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <textarea
              className="contact-input contact-textarea" placeholder="Your message..." value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
            <div style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)' }}>
              {form.message.length} characters
            </div>

            {status === 'error' && (
              <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: '6px', padding: '10px 14px', color: '#fca5a5', fontSize: '0.82rem', fontFamily: 'monospace' }}>
                ⚠ {errorMsg}
              </div>
            )}

            <button onClick={handleSubmit} disabled={status === 'loading'} className="contact-submit">
              {status === 'loading' ? 'Sending...' : 'Send Message'}
            </button>

            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', fontFamily: 'monospace', margin: 0 }}>
              Or email us directly at{' '}
              <a href="mailto:support@thegodstool.com" style={{ color: '#a78bfa', textDecoration: 'none' }}>
                support@thegodstool.com
              </a>
            </p>
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', fontFamily: 'monospace', margin: '8px 0 0' }}>
              Phone/WhatsApp:{' '}
              <a href="tel:+919138133002" style={{ color: '#a78bfa', textDecoration: 'none' }}>
                +91 91381 33002
              </a>
            </p>
          </div>
        )}

        <button
          onClick={() => navigate('/')}
          style={{ display: 'block', margin: '28px auto 0', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'monospace' }}
        >
          ← Back to app
        </button>
      </div>
    </div>
  )
}
