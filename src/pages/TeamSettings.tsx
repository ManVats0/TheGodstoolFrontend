import { useState, useEffect } from 'react'
import { API_BASE } from '../config'

type OrgMember = {
  userId: string
  roleKey: string
  status: string
  invitedAt?: string
  joinedAt?: string
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Organization Owner',
  admin: 'Admin',
  steward: 'Data Steward',
  editor: 'Editor',
  viewer: 'Viewer',
}

const ROLE_OPTIONS = ['admin', 'steward', 'editor', 'viewer']

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('datapro_token') || ''
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export default function TeamSettings() {
  const [org, setOrg] = useState<any>(null)
  const [myRole, setMyRole] = useState('')
  const [permissions, setPermissions] = useState<Record<string, boolean>>({})
  const [members, setMembers] = useState<OrgMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('editor')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [orgRes, membersRes] = await Promise.all([
        fetch(`${API_BASE}/api/org`, { credentials: 'include', headers: authHeaders() }),
        fetch(`${API_BASE}/api/org/members`, { credentials: 'include', headers: authHeaders() }),
      ])
      if (orgRes.status === 401 || membersRes.status === 401) {
        setError('Sign in to view your team.')
        return
      }
      const orgData = await orgRes.json()
      const membersData = await membersRes.json()
      if (orgData?.error) { setError(orgData.error); return }
      setOrg(orgData.org)
      setMyRole(orgData.role)
      setPermissions(orgData.permissions || {})
      setMembers(Array.isArray(membersData) ? membersData : [])
    } catch {
      setError('Could not reach the server.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const canManage = !!permissions['org.manageMembers']

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviteBusy(true)
    setInviteMsg('')
    try {
      // Step 1: resolve email -> userId via the auth service.
      // NOTE: assumes the Express auth service is reachable at the same
      // API_BASE as the Python backend. If your auth service runs on a
      // different host/port in this deployment, change AUTH_API_BASE below.
      const AUTH_API_BASE = API_BASE
      const lookupRes = await fetch(
        `${AUTH_API_BASE}/api/users/lookup-by-email?email=${encodeURIComponent(inviteEmail.trim())}`,
        { credentials: 'include', headers: authHeaders() }
      )
      const lookupData = await lookupRes.json()
      if (!lookupRes.ok || !lookupData.userId) {
        setInviteMsg(lookupData.error || 'No account found with that email.')
        return
      }

      // Step 2: invite that userId into the org with the chosen role.
      const inviteRes = await fetch(`${API_BASE}/api/org/members/invite`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ userId: lookupData.userId, roleKey: inviteRole }),
      })
      const inviteData = await inviteRes.json()
      if (!inviteRes.ok || inviteData.error) {
        setInviteMsg(inviteData.error || 'Could not add member.')
        return
      }
      setInviteMsg(`Added ${inviteEmail.trim()} as ${ROLE_LABELS[inviteRole]}.`)
      setInviteEmail('')
      await load()
    } catch {
      setInviteMsg('Could not reach the server.')
    } finally {
      setInviteBusy(false)
    }
  }

  const handleRoleChange = async (member: OrgMember, newRole: string) => {
    try {
      await fetch(`${API_BASE}/api/org/members/${member.userId}/role`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ roleKey: newRole }),
      })
      await load()
    } catch {
      // best-effort; load() re-syncs state either way
    }
  }

  const handleRemove = async (member: OrgMember) => {
    if (!window.confirm(`Remove this member from the organization?`)) return
    try {
      await fetch(`${API_BASE}/api/org/members/${member.userId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: authHeaders(),
      })
      await load()
    } catch {
      // best-effort
    }
  }

  if (loading) {
    return <div className="p-8 max-w-4xl mx-auto"><p style={{ color: 'rgba(255,255,255,0.4)' }}>Loading team…</p></div>
  }
  if (error) {
    return <div className="p-8 max-w-4xl mx-auto"><p style={{ color: '#f87171' }}>{error}</p></div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Team</h1>
        <p className="text-white/40">
          {org?.name} · you are <span style={{ color: '#a78bfa' }}>{ROLE_LABELS[myRole] || myRole}</span>
        </p>
      </div>

      {canManage && (
        <div className="mb-6 p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(124,58,237,0.25)' }}>
          <p className="text-sm font-bold text-white mb-3">Invite someone</p>
          <div className="flex gap-2 flex-wrap">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="their-email@company.com"
              className="flex-1 min-w-[220px] text-sm text-white rounded-xl px-4 py-2.5 outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              className="text-sm text-white rounded-xl px-3 py-2.5 outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {ROLE_OPTIONS.map(r => (
                <option key={r} value={r} style={{ background: '#0d0a1a' }}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
            <button
              onClick={handleInvite}
              disabled={inviteBusy || !inviteEmail.trim()}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
            >
              {inviteBusy ? 'Adding…' : 'Add to team'}
            </button>
          </div>
          {inviteMsg && <p className="text-xs mt-2" style={{ color: inviteMsg.startsWith('Added') ? '#4ade80' : '#f87171' }}>{inviteMsg}</p>}
        </div>
      )}

      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="font-bold text-white">Members ({members.length})</p>
        </div>
        <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          {members.map(m => (
            <div key={m.userId} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="text-sm text-white font-mono">{m.userId}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{m.status}</p>
              </div>
              <div className="flex items-center gap-2">
                {canManage && m.roleKey !== 'owner' ? (
                  <select
                    value={m.roleKey}
                    onChange={e => handleRoleChange(m, e.target.value)}
                    className="text-xs text-white rounded-lg px-2 py-1.5 outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    {ROLE_OPTIONS.map(r => (
                      <option key={r} value={r} style={{ background: '#0d0a1a' }}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa' }}>
                    {ROLE_LABELS[m.roleKey] || m.roleKey}
                  </span>
                )}
                {canManage && m.roleKey !== 'owner' && (
                  <button
                    onClick={() => handleRemove(m)}
                    className="text-xs px-2.5 py-1.5 rounded-lg"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
