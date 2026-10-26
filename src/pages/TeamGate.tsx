import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { API_BASE } from '../config'
import TeamSettings from './TeamSettings'

type Workspace = { orgId: string; name: string; personal: boolean; roleKey: string; roleLabel: string; active: boolean }
type Invite = { id: string; orgName: string; roleLabel: string; invitedBy: string }
type TeamStatus = {
  emailVerified: boolean
  joined: boolean
  orgName: string
  roleLabel: string
  canManage: boolean
  activeIsPersonal?: boolean
  workspaces?: Workspace[]
  pendingInvites?: Invite[]
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

const btn = 'px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40'
const btnStyle = { background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }
const ghost = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: 'rgba(255,255,255,0.7)',
}

function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(124,58,237,0.25)' }}>
      {title && <h2 className="text-base font-bold text-white mb-3">{title}</h2>}
      {children}
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

  // Reload this page's data whenever the workspace changes (sidebar switcher fires the same event).
  useEffect(() => {
    const onChange = () => { loadStatus() }
    window.addEventListener('datapro:team-joined', onChange)
    return () => window.removeEventListener('datapro:team-joined', onChange)
  }, [])

  const sendCode = async () => {
    setBusy(true); setMsg('')
    try {
      const r = await call('/api/team/otp/send', 'POST')
      if (r.ok) {
        if (r.data?.alreadyVerified) { await loadStatus(); return }
        setCodeSent(true); setCooldown(60)
      } else {
        setMsg(r.data?.error || 'Could not send the code.')
        if (r.status === 429) { setCodeSent(true); setCooldown(60) }
      }
    } catch { setMsg('Could not reach the server.') } finally { setBusy(false) }
  }

  const verifyCode = async () => {
    setBusy(true); setMsg('')
    try {
      const r = await call('/api/team/otp/verify', 'POST', { code: code.trim() })
      if (r.ok) { setCode(''); await loadStatus() }
      else setMsg(r.data?.error || 'Could not verify the code.')
    } catch { setMsg('Could not reach the server.') } finally { setBusy(false) }
  }

  const accept = async (inv: Invite) => {
    setBusy(true); setMsg('')
    try {
      const r = await call(`/api/team/invites/${inv.id}/accept`, 'POST')
      if (r.ok) {
        setJoinedInfo({ orgName: r.data.orgName, roleLabel: r.data.roleLabel })
        // App reloads permissions, plan and the team's data sources, then opens Sources.
        setTimeout(() => window.dispatchEvent(new Event('datapro:team-joined')), 1200)
      } else {
        setMsg(r.data?.error || 'Could not join the team.')
        await loadStatus()
      }
    } catch { setMsg('Could not reach the server.') } finally { setBusy(false) }
  }

  const decline = async (inv: Invite) => {
    setBusy(true); setMsg('')
    try {
      const r = await call(`/api/team/invites/${inv.id}/decline`, 'POST')
      if (!r.ok) setMsg(r.data?.error || 'Could not decline.')
      await loadStatus()
    } catch { setMsg('Could not reach the server.') } finally { setBusy(false) }
  }

  const switchTo = async (w: Workspace) => {
    setBusy(true); setMsg('')
    try {
      const r = await call('/api/workspaces/switch', 'POST', { orgId: w.orgId })
      if (r.ok) window.dispatchEvent(new Event('datapro:team-joined'))
      else setMsg(r.data?.error || 'Could not switch workspace.')
    } catch { setMsg('Could not reach the server.') } finally { setBusy(false) }
  }

  const leave = async (w: Workspace) => {
    if (!window.confirm(`Leave ${w.name}? You will lose access to its data sources and pipelines.`)) return
    setBusy(true); setMsg('')
    try {
      const r = await call(`/api/workspaces/${w.orgId}/leave`, 'POST')
      if (r.ok) { window.dispatchEvent(new Event('datapro:team-joined')) }
      else setMsg(r.data?.error || 'Could not leave the team.')
    } catch { setMsg('Could not reach the server.') } finally { setBusy(false) }
  }

  if (loadError) return (
    <div className="p-8 max-w-xl mx-auto"><Card>
      <p className="text-white font-bold mb-1">Couldn't load your team status</p>
      <p className="text-sm mb-4" style={{ color: '#f87171' }}>{loadError}</p>
      <button className={btn} style={btnStyle} onClick={loadStatus}>Retry</button>
    </Card></div>
  )
  if (!status) return <div className="p-8 max-w-xl mx-auto"><Card><p style={{ color: 'rgba(255,255,255,0.4)' }}>Loading…</p></Card></div>

  if (joinedInfo) return (
    <div className="p-8 max-w-xl mx-auto"><Card>
      <p className="text-lg font-bold" style={{ color: '#4ade80' }}>You joined {joinedInfo.orgName} as {joinedInfo.roleLabel}</p>
      <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Loading your team's data sources…</p>
    </Card></div>
  )

  const workspaces = status.workspaces || []
  const invites = status.pendingInvites || []

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Team & workspaces</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
          You are working in <b className="text-white">{status.activeIsPersonal ? 'your own workspace' : status.orgName}</b> as{' '}
          <b style={{ color: '#a78bfa' }}>{status.roleLabel}</b>. You can belong to several workspaces and switch between them at any time.
        </p>
      </div>

      {msg && <p className="text-sm" style={{ color: '#f87171' }}>{msg}</p>}

      {/* Invitations (or the step needed to see them) */}
      {!status.emailVerified ? (
        <Card title="Joining a team?">
          <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
            If a team owner added your email, verify it to see the invitation. We'll send a 6-digit code to the email you signed up with.
          </p>
          {!codeSent ? (
            <button className={btn} style={btnStyle} disabled={busy} onClick={sendCode}>{busy ? 'Sending…' : 'Send code'}</button>
          ) : (
            <div className="space-y-3">
              <input
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456" inputMode="numeric" maxLength={6}
                className="w-44 text-center text-xl tracking-widest text-white rounded-xl px-4 py-2.5 outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(124,58,237,0.35)' }}
              />
              <div className="flex gap-3">
                <button className={btn} style={btnStyle} disabled={busy || code.length !== 6} onClick={verifyCode}>{busy ? 'Verifying…' : 'Verify'}</button>
                <button disabled={busy || cooldown > 0} onClick={sendCode} className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-40" style={ghost}>
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                </button>
              </div>
            </div>
          )}
        </Card>
      ) : invites.length > 0 ? (
        <Card title={`You have ${invites.length} invitation${invites.length > 1 ? 's' : ''}`}>
          <div className="space-y-3">
            {invites.map(inv => (
              <div key={inv.id} className="flex items-center justify-between gap-3 rounded-xl p-4" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.3)' }}>
                <div className="min-w-0">
                  <p className="text-white font-bold truncate">{inv.orgName}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Join as <b style={{ color: '#a78bfa' }}>{inv.roleLabel}</b>{inv.invitedBy ? ` · invited by ${inv.invitedBy}` : ''}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button className={btn} style={btnStyle} disabled={busy} onClick={() => accept(inv)}>Accept</button>
                  <button className="px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-40" style={ghost} disabled={busy} onClick={() => decline(inv)}>Decline</button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.35)' }}>Your own workspace stays available after you join.</p>
        </Card>
      ) : null}

      {/* Where the person belongs */}
      {workspaces.length > 0 && (
        <Card title="Your workspaces">
          <div className="space-y-2">
            {workspaces.map(w => (
              <div key={w.orgId} className="flex items-center justify-between gap-3 rounded-xl px-4 py-3" style={{ background: w.active ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${w.active ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{w.personal ? 'My workspace' : w.name}</p>
                  <p className="text-xs" style={{ color: '#a78bfa' }}>{w.roleLabel}{w.active ? ' · current' : ''}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {!w.active && <button className="px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-40" style={btnStyle} disabled={busy} onClick={() => switchTo(w)}>Switch</button>}
                  {!w.personal && w.roleKey !== 'owner' && <button className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40" style={ghost} disabled={busy} onClick={() => leave(w)}>Leave</button>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Managing the workspace you are currently in */}
      {status.canManage ? (
        <div className="-mx-8"><TeamSettings /></div>
      ) : (
        <Card>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Your role in <b className="text-white">{status.orgName}</b> is <b style={{ color: '#a78bfa' }}>{status.roleLabel}</b>. Ask a team admin if you need a different level of access.
          </p>
        </Card>
      )}
    </div>
  )
}
