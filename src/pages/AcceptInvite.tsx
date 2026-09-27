import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { API_BASE } from '../config'

export default function AcceptInvite() {
  const location = useLocation()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'accepting'>('loading')
  const [info, setInfo] = useState<{ orgName: string; roleLabel: string; email: string } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const token = new URLSearchParams(location.search).get('token') || ''

  useEffect(() => {
    if (!token) { setStatus('error'); setErrorMsg('No invite token provided.'); return }

    fetch(`${API_BASE}/api/org/invites/${token}/info`)
      .then(res => res.json())
      .then(data => {
        if (!data.valid) {
          setStatus('error')
          setErrorMsg(data.error || 'This invite is no longer valid.')
          return
        }
        setInfo({ orgName: data.orgName, roleLabel: data.roleLabel, email: data.email })
        setStatus('ready')

        const existingToken = localStorage.getItem('datapro_token')
        const existingEmail = localStorage.getItem('datapro_email')
        if (existingToken && existingEmail?.toLowerCase() === data.email.toLowerCase()) {
          acceptInvite(existingToken)
        } else {
          localStorage.setItem('datapro_pending_invite', token)
          navigate('/', { replace: true })
        }
      })
      .catch(() => { setStatus('error'); setErrorMsg('Could not reach the server.') })
  }, [token])

  const acceptInvite = async (authToken: string) => {
    setStatus('accepting')
    try {
      const res = await fetch(`${API_BASE}/api/org/invites/${token}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setStatus('error')
        setErrorMsg(data.error || 'Could not accept invite.')
        return
      }
      localStorage.removeItem('datapro_pending_invite')
      navigate('/team', { replace: true })
    } catch {
      setStatus('error')
      setErrorMsg('Could not reach the server.')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#05030f', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', -apple-system, sans-serif", padding: '24px' }}>
      <div style={{ maxWidth: '420px', textAlign: 'center' }}>
        {status === 'loading' && <p>Checking invite…</p>}
        {status === 'accepting' && <p>Joining team…</p>}
        {status === 'error' && (
          <>
            <p style={{ color: '#f87171', marginBottom: '12px' }}>{errorMsg}</p>
            <a href="/" style={{ color: '#a78bfa' }}>Go to The God's Tool</a>
          </>
        )}
        {status === 'ready' && info && (
          <p>You're invited to join <strong style={{ color: '#a78bfa' }}>{info.orgName}</strong> as a <strong>{info.roleLabel}</strong>. Redirecting to sign in…</p>
        )}
      </div>
    </div>
  )
}
