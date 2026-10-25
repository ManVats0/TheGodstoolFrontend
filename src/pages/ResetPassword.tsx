import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const handleReset = async () => {
    if (!password || !confirm) { setError('Please fill both fields.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    try {
      const res = await fetch(`${import.meta.env.VITE_AUTH_URL || 'http://localhost:4000'}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Reset failed'); return }
      setMsg('Password reset! Redirecting to login...')
      setTimeout(() => navigate('/'), 2000)
    } catch {
      setError('Cannot connect to server.')
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#05080f' }}>
      <div style={{ width: '100%', maxWidth: '400px', margin: '0 16px', background: 'rgba(10,15,28,0.85)', border: '1px solid rgba(99,179,237,0.15)', borderRadius: '12px', padding: '36px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.4rem', fontWeight: 700, color: '#e2e8f0', textAlign: 'center' }}>Reset Password</div>
        <div style={{ color: '#94a3b8', fontSize: '0.82rem', fontFamily: 'monospace', textAlign: 'center' }}>Enter your new password below.</div>
        <input type="password" placeholder="New password" value={password} onChange={e => setPassword(e.target.value)}
          style={{ width: '100%', padding: '13px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(99,179,237,0.18)', borderRadius: '6px', color: '#e2e8f0', fontSize: '0.95rem', fontFamily: 'Georgia,serif', boxSizing: 'border-box', outline: 'none' }} />
        <input type="password" placeholder="Confirm new password" value={confirm} onChange={e => setConfirm(e.target.value)}
          style={{ width: '100%', padding: '13px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(99,179,237,0.18)', borderRadius: '6px', color: '#e2e8f0', fontSize: '0.95rem', fontFamily: 'Georgia,serif', boxSizing: 'border-box', outline: 'none' }} />
        {error && <div style={{ color: '#fca5a5', fontSize: '0.82rem', fontFamily: 'monospace' }}>⚠ {error}</div>}
        {msg && <div style={{ color: '#86efac', fontSize: '0.82rem', fontFamily: 'monospace' }}>✓ {msg}</div>}
        <button onClick={handleReset}
          style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', border: 'none', borderRadius: '6px', color: 'white', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'Georgia,serif' }}>
          Reset Password
        </button>
      </div>
    </div>
  )
}