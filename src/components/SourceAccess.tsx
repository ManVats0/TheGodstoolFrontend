import { useEffect, useState } from 'react'
import { API_BASE } from '../config'

type Member = { userId: string; email: string; roleKey: string; status: string }
type Access = { mode: 'workspace' | 'restricted'; userIds: string[] } | undefined

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('datapro_token') || ''
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const ROLE: Record<string, string> = { owner: 'Owner', admin: 'Admin', steward: 'Data Steward', editor: 'Editor', viewer: 'Viewer' }

// Owner / Admin: choose who can use ONE data source. Everyone else's role still limits what they can do with it.
export default function SourceAccess({ connectionId, current, onSaved }: { connectionId: string; current: Access; onSaved: () => void }) {
  const [mode, setMode] = useState<'workspace' | 'restricted'>(current?.mode || 'workspace')
  const [picked, setPicked] = useState<string[]>(current?.userIds || [])
  const [members, setMembers] = useState<Member[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { setMode(current?.mode || 'workspace'); setPicked(current?.userIds || []) }, [current?.mode, (current?.userIds || []).join(',')])

  useEffect(() => {
    let live = true
    fetch(`${API_BASE}/api/org/members`, { credentials: 'include', headers: authHeaders() })
      .then(r => (r.ok ? r.json() : []))
      .then(d => { if (live && Array.isArray(d)) setMembers(d.filter((m: Member) => m.status === 'active')) })
      .catch(() => {})
    return () => { live = false }
  }, [])

  // Owners and Admins always keep access, so they are not offered as choices.
  const choices = members.filter(m => m.roleKey !== 'owner' && m.roleKey !== 'admin')

  const toggle = (id: string) => setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]))

  const save = async () => {
    setBusy(true); setMsg('')
    try {
      const res = await fetch(`${API_BASE}/api/connections/${connectionId}/access`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ mode, userIds: mode === 'restricted' ? picked : [] }),
      })
      const data = await res.json().catch(() => ({} as any))
      if (res.ok) { setMsg('Saved.'); onSaved() } else { setMsg(data?.error || `Could not save (${res.status}).`) }
    } catch { setMsg('Could not reach the server.') } finally { setBusy(false) }
  }

  const radio = (value: 'workspace' | 'restricted', title: string, sub: string) => (
    <label className="flex items-start gap-2 cursor-pointer">
      <input type="radio" name={`access-${connectionId}`} checked={mode === value} onChange={() => setMode(value)} className="mt-1" />
      <span>
        <span className="text-xs font-semibold text-white block">{title}</span>
        <span className="text-xs block" style={{ color: 'rgba(255,255,255,0.4)' }}>{sub}</span>
      </span>
    </label>
  )

  return (
    <div className="space-y-2 pb-3 mb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Who can use this source</p>
      {radio('workspace', 'Everyone in this workspace', 'Each person can do what their role allows.')}
      {radio('restricted', 'Only selected people', 'Owners, Admins and whoever added it always keep access.')}
      {mode === 'restricted' && (
        <div className="rounded-xl p-2 space-y-1 max-h-40 overflow-y-auto" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {choices.length === 0 && <p className="text-xs px-1" style={{ color: 'rgba(255,255,255,0.4)' }}>No other members yet.</p>}
          {choices.map(m => (
            <label key={m.userId} className="flex items-center gap-2 px-1 py-1 cursor-pointer">
              <input type="checkbox" checked={picked.includes(m.userId)} onChange={() => toggle(m.userId)} />
              <span className="text-xs text-white truncate">{m.email}</span>
              <span className="text-[10px]" style={{ color: '#a78bfa' }}>{ROLE[m.roleKey] || m.roleKey}</span>
            </label>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={busy} className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white disabled:opacity-40"
          style={{ background: 'rgba(124,58,237,0.25)', border: '1px solid rgba(124,58,237,0.35)' }}>
          {busy ? 'Saving…' : 'Save access'}
        </button>
        {msg && <span className="text-xs" style={{ color: msg === 'Saved.' ? '#4ade80' : '#f87171' }}>{msg}</span>}
      </div>
    </div>
  )
}
