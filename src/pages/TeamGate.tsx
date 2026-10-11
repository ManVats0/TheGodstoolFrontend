import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { API_BASE } from '../config'
import TeamSettings from './TeamSettings'

type TeamStatus = {
  emailVerified: boolean
  joined: boolean
  orgName: string
  roleLabel: string
  canManage: boolean
  pendingTeam?: boolean
}

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('datapro_token') || ''
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function call(path: string, method: 'GET' | 'POST', body?: any) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({} as any))
  return { ok: res.ok, status: res.status, data }
}

const btn = 'px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40'
const btnStyle = { background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="p-8 max-w-xl mx-auto">
      <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(124,58,237,0.25)' }}>
        {children}
      </div>
    </div>
  )
}

export default function TeamGate() {
  const [status, setStatus] = useState<TeamStatus | null>(null)
  const [loadError, setLoadError] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [joinedInfo, setJoinedInfo] = useState<{ orgName: string; roleLabel: string } | null>(null)
  const joiningRef = useRef(false)

  const loadStatus = async () => {
    try {
      const r = await call('/api/team/status', 'GET')
      if (!r.ok) { setLoadError(r.data?.error || `Server error (${r.status})`); return }
      setLoadError('')
      setStatus(r.data)
    } catch {
      setLoadError('Could not reach the server.')
    }
  }

  useEffect(() => { loadStatus() }, [])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  // Verified + an owner approved this email -> join automatically.
  useEffect(() => {
    if (!status || status.canManage || joiningRef.current || joinedInfo) return
    if (status.emailVerified && status.pendingTeam && !status.joined) {
      joiningRef.current = true
      call('/api/team/join', 'POST').then(r => {
        if (r.ok) {
          setMsg('')
          setJoinedInfo({ orgName: r.data.orgName, roleLabel: r.data.roleLabel })
          // let the person read the message, then App reloads permissions/plan/connections
          setTimeout(() => window.dispatchEvent(new Event('datapro:team-joined')), 1500)
        } else {
          setMsg(r.data?.error || 'Could not join the team.')
        }
      })
    }
  }, [status, joinedInfo])

  const sendCode = async () => {
    setBusy(true)
    setMsg('')
    try {
      const r = await call('/api/team/otp/send', 'POST')
      if (r.ok) {
        if (r.data?.alreadyVerified) { await loadStatus(); return }
        setCodeSent(true)
        setCooldown(60)
      } else {
        setMsg(r.data?.error || 'Could not send the code.')
        if (r.status === 429) { setCodeSent(true); setCooldown(60) }
      }
    } catch {
      setMsg('Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  const verifyCode = async () => {
    setBusy(true)
    setMsg('')
    try {
      const r = await call('/api/team/otp/verify', 'POST', { code: code.trim() })
      if (r.ok) { setCode(''); await loadStatus() }
      else setMsg(r.data?.error || 'Could not verify the code.')
    } catch {
      setMsg('Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  if (loadError) return (
    <Card>
      <p className="text-white font-bold mb-1">Couldn't load your team status</p>
      <p className="text-sm mb-4" style={{ color: '#f87171' }}>{loadError}</p>
      <button className={btn} style={btnStyle} onClick={loadStatus}>Retry</button>
    </Card>
  )
  if (!status) return <Card><p style={{ color: 'rgba(255,255,255,0.4)' }}>Loading…</p></Card>
  if (status.canManage) return <TeamSettings />

  if (!status.emailVerified) return (
    <Card>
      <h2 className="text-xl font-bold text-white mb-2">Verify your email</h2>
      <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.45)' }}>
        We'll send a 6-digit code to the email you signed up with. Verifying it lets you join a team that approved this email.
      </p>
      {!codeSent ? (
        <button className={btn} style={btnStyle} disabled={busy} onClick={sendCode}>{busy ? 'Sending…' : 'Send code'}</button>
      ) : (
        <div className="space-y-3">
          <input
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            inputMode="numeric"
            maxLength={6}
            className="w-44 text-center text-xl tracking-widest text-white rounded-xl px-4 py-2.5 outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(124,58,237,0.35)' }}
          />
          <div className="flex gap-3 justify-center">
            <button className={btn} style={btnStyle} disabled={busy || code.length !== 6} onClick={verifyCode}>{busy ? 'Verifying…' : 'Verify'}</button>
            <button
              disabled={busy || cooldown > 0}
              onClick={sendCode}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
        </div>
      )}
      {msg && <p className="text-sm mt-4" style={{ color: '#f87171' }}>{msg}</p>}
    </Card>
  )

  if (joinedInfo) return (
    <Card>
      <p className="text-lg font-bold" style={{ color: '#4ade80' }}>You joined {joinedInfo.orgName} as {joinedInfo.roleLabel}</p>
      <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Loading your team's data sources…</p>
    </Card>
  )

  if (status.pendingTeam && !status.joined) return (
    <Card>
      {msg ? (
        <>
          <p className="text-sm mb-4" style={{ color: '#f87171' }}>{msg}</p>
          <button className={btn} style={btnStyle} onClick={() => { joiningRef.current = false; setMsg(''); loadStatus() }}>Try again</button>
        </>
      ) : (
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>Joining your team…</p>
      )}
    </Card>
  )

  if (status.joined) return (
    <Card>
      <p className="text-lg font-bold text-white">You're in {status.orgName} as {status.roleLabel}</p>
    </Card>
  )

  return (
    <Card>
      <p className="text-white font-bold mb-1">No team has added this email yet.</p>
      <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>Ask your team owner to add this email in Team, then check again.</p>
      <button className={btn} style={btnStyle} onClick={loadStatus}>Check again</button>
    </Card>
  )
}
