import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { API_BASE } from '../config'
import { clearPermissionsCache } from '../usePermissions'
import { useStore } from '../store'

export default function AcceptInvite() {
  const location = useLocation()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'accepting' | 'mismatch'>('loading')
  const [info, setInfo] = useState<{ orgName: string; roleLabel: string; email: string } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const token = new URLSearchParams(location.search).get('token') || ''

  useEffect(() => {
    if (!token) { setStatus('error'); setErrorMsg('No invite token provided.'); return }

    const run = async () => {
      let data: any
      try {
        const res = await fetch(`${API_BASE}/api/org/invites/${token}/info`)
        if (!res.ok) {
          console.error('Invite info failed:', res.status, await res.text())
          setStatus('error')
          setErrorMsg(`Server error (${res.status}). Please try again later.`)
          return
        }
        data = await res.json()
      } catch (err) {
        console.error('Invite info network error:', err, 'API_BASE =', API_BASE)
        setStatus('error')
        setErrorMsg('Could not reach the server.')
        return
      }

      if (!data.valid) {
        setStatus('error')
        setErrorMsg(data.error || 'This invite is no longer valid.')
        return
      }
      setInfo({ orgName: data.orgName, roleLabel: data.roleLabel, email: data.email })

      // App.tsx's sign-out only clears datapro_logged_in, so a leftover
      // datapro_token must not count as "signed in" on its own.
      const loggedIn = !!localStorage.getItem('datapro_logged_in')
      const existingToken = loggedIn ? localStorage.getItem('datapro_token') : null
      const existingEmail = loggedIn ? localStorage.getItem('datapro_email') : null

      if (existingToken && existingEmail?.toLowerCase() === data.email.toLowerCase()) {
        // Signed in as the invited person: accept right away.
        acceptInvite(existingToken, data.orgName, data.roleLabel)
      } else if (existingToken) {
        // Signed in, but as someone else (e.g. the team owner testing in the same browser).
        // The backend only accepts an invite for the exact email it was sent to.
        setStatus('mismatch')
      } else {
        // Not signed in: App.tsx opens the register modal with this email prefilled and
        // accepts the pending invite right after sign-in / sign-up.
        setStatus('ready')
        localStorage.setItem('datapro_pending_invite', token)
        localStorage.setItem('datapro_invite_email', data.email)
        navigate('/', { replace: true })
      }
    }
    run()
  }, [token])

  const acceptInvite = async (authToken: string, orgName: string, roleLabel: string) => {
    setStatus('accepting')
    let res: Response
    try {
      res = await fetch(`${API_BASE}/api/org/invites/${token}/accept`, {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: `Bearer ${authToken}` },
      })
    } catch (err) {
      console.error('Invite accept network error:', err, 'API_BASE =', API_BASE)
      setStatus('error')
      setErrorMsg('Could not reach the server.')
      return
    }

    // 401 comes back with an empty body, so read the status BEFORE parsing JSON.
    if (res.status === 401) {
      console.error('Invite accept: 401 (stored login token rejected by backend)')
      localStorage.removeItem('datapro_logged_in')
      localStorage.removeItem('datapro_token')
      localStorage.setItem('datapro_pending_invite', token)
      window.location.assign('/')
      return
    }

    let data: any = null
    try {
      data = await res.json()
    } catch {
      console.error('Invite accept: non-JSON response', res.status)
      setStatus('error')
      setErrorMsg(`Server error (${res.status}). Please try again later.`)
      return
    }

    if (!res.ok || data?.error) {
      setStatus('error')
      setErrorMsg(data?.error || 'Could not accept invite.')
      return
    }

    // Same hand-off App.tsx uses after a sign-in accept: it shows the welcome banner,
    // refreshes the plan, and reloads permissions for the new team.
    localStorage.removeItem('datapro_pending_invite')
    localStorage.setItem('datapro_invite_joined', '1')
    localStorage.setItem('datapro_invite_joined_org', data?.orgName || orgName || '')
    localStorage.setItem('datapro_invite_joined_role', data?.roleLabel || roleLabel || '')
    clearPermissionsCache()
    useStore.getState().loadSourcesFromBackend()
    navigate('/', { replace: true })
  }

  const signOutAndContinue = () => {
    const authToken = localStorage.getItem('datapro_token')
    if (authToken) {
      // Free the session slot, same as the app's own sign-out.
      fetch(`${import.meta.env.VITE_AUTH_URL}/api/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      }).catch(() => {})
    }
    localStorage.setItem('datapro_pending_invite', token)
    if (info?.email) localStorage.setItem('datapro_invite_email', info.email)
    localStorage.removeItem('datapro_logged_in')
    localStorage.removeItem('datapro_plan')
    localStorage.removeItem('datapro_token')
    localStorage.removeItem('datapro_email')
    window.location.assign('/')
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
        {status === 'mismatch' && info && (
          <>
            <p style={{ marginBottom: '12px' }}>
              This invite to join <strong style={{ color: '#a78bfa' }}>{info.orgName}</strong> as a{' '}
              <strong>{info.roleLabel}</strong> was sent to <strong>{info.email}</strong>, but you're signed in with a different account.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '16px' }}>
              Sign out, then sign in or sign up with {info.email} to join.
            </p>
            <button
              onClick={signOutAndContinue}
              style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
            >
              Sign out and continue
            </button>
          </>
        )}
        {status === 'ready' && info && (
          <p>You're invited to join <strong style={{ color: '#a78bfa' }}>{info.orgName}</strong> as a <strong>{info.roleLabel}</strong>. Redirecting to sign in…</p>
        )}
      </div>
    </div>
  )
}
