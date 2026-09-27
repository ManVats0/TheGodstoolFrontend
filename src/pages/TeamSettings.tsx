import { useState, useEffect } from 'react'
import { API_BASE } from '../config'

type OrgMember = {
  userId: string
  roleKey: string
  status: string
  invitedAt?: string
  joinedAt?: string
}

type OrgInvite = {
  id: string
  email: string
  roleKey: string
  status: string
  invitedAt: string
  expiresAt: string
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
  const [invites, setInvites] = useState<OrgInvite[]>([])
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
      const [orgRes, membersRes, invitesRes] = await Promise.all([
        fetch(`${API_BASE}/api/org`, { credentials: 'include', headers: authHeaders() }),
        fetch(`${API_BASE}/api/org/members`, { credentials: 'include', headers: authHeaders() }),
        fetch(`${API_BASE}/api/org/invites`, { credentials: 'include', headers: authHeaders() }),
      ])
      if (orgRes.status === 401 || membersRes.status === 401) {
        setError('Sign in to view your team.')
        return
      }
      if (!orgRes.ok || !membersRes.ok) {
        setError('Could not load team data from the server.')
        return
      }
      const orgData = await orgRes.json()
      const membersData = await membersRes.json()
      const invitesData = invitesRes.ok ? await invitesRes.json() : []
      if (orgData?.error) { setError(orgData.error); return }
      setOrg(orgData.org)
      setMyRole(orgData.role)
      setPermissions(orgData.permissions || {})
      setMembers(Array.isArray(membersData) ? membersData : [])
      setInvites(Array.isArray(invitesData) ? invitesData : [])
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
      const res = await fetch(`${API_BASE}/api/org/invites`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ email: inviteEmail.trim(), roleKey: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setInviteMsg(data.error || 'Could not send invite.')
        return
      }
      if (data.addedImmediately) {
        setInviteMsg(`Added ${inviteEmail.trim()} as ${ROLE_LABELS[inviteRole]}.`)
      } else {
        setInviteMsg(`Invite sent to ${inviteEmail.trim()}.`)
      }
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
    } catch {}
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
    } catch {}
  }

  const handleRevokeInvite = async (invite: OrgInvite) => {
    try {
      await fetch(`${API_BASE}/api/org/invites/${invite.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: authHeaders(),
      })
      await load()
    } catch {}
  }

  const handleResendInvite = async (invite: OrgInvite) => {
    try {
      await fetch(`${API_BASE}/api/org/invites`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ email: invite.email, roleKey: invite.roleKey }),
      })
      await load()
    } catch {}
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
              {inviteBusy ? 'Sending…' : 'Add to team'}
            </button>
          </div>
          {inviteMsg && <p className="text-xs mt-2" style={{ color: inviteMsg.startsWith('Added') || inviteMsg.startsWith('Invite sent') ? '#4ade80' : '#f87171' }}>{inviteMsg}</p>}
        </div>
      )}

      <div className="rounded-2xl overflow-hidden mb-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
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

      {canManage && invites.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="font-bold text-white">Pending Invites ({invites.length})</p>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            {invites.map(inv => (
              <div key={inv.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm text-white">{inv.email}</p>
                  <p className="text-xs" style={{ color: inv.status === 'expired' ? '#f87171' : 'rgba(255,255,255,0.35)' }}>
                    {ROLE_LABELS[inv.roleKey] || inv.roleKey} · {inv.status === 'expired' ? 'expired' : `expires ${new Date(inv.expiresAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleResendInvite(inv)}
                    className="text-xs px-2.5 py-1.5 rounded-lg"
                    style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)', color: '#a78bfa' }}
                  >
                    Resend
                  </button>
                  <button
                    onClick={() => handleRevokeInvite(inv)}
                    className="text-xs px-2.5 py-1.5 rounded-lg"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
