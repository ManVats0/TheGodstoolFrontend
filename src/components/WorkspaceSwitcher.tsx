import { useEffect, useState } from 'react'
import { API_BASE } from '../config'

type Workspace = { orgId: string; name: string; personal: boolean; roleKey: string; roleLabel: string; active: boolean }

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('datapro_token') || ''
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Lets a person who belongs to more than one workspace (their own + invited teams) choose which one they
// are working in. Renders nothing for people who only have their own workspace.
export default function WorkspaceSwitcher() {
  const [items, setItems] = useState<Workspace[]>([])
  const [busy, setBusy] = useState(false)

  const load = async () => {
    if (!localStorage.getItem('datapro_token')) return
    try {
      const res = await fetch(`${API_BASE}/api/workspaces`, { credentials: 'include', headers: authHeaders() })
      if (!res.ok) { setItems([]); return }
      const data = await res.json()
      setItems(Array.isArray(data.workspaces) ? data.workspaces : [])
    } catch {
      setItems([])
    }
  }

  useEffect(() => {
    load()
    const reload = () => { load() }
    window.addEventListener('datapro:team-joined', reload)
    window.addEventListener('focus', reload)
    return () => {
      window.removeEventListener('datapro:team-joined', reload)
      window.removeEventListener('focus', reload)
    }
  }, [])

  if (items.length < 2) return null
  const active = items.find(w => w.active) || items[0]

  const onChange = async (orgId: string) => {
    if (orgId === active.orgId || busy) return
    setBusy(true)
    try {
      const res = await fetch(`${API_BASE}/api/workspaces/switch`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ orgId }),
      })
      if (res.ok) {
        // Same event TeamGate fires after a join: reloads permissions, plan and this workspace's data sources.
        window.dispatchEvent(new Event('datapro:team-joined'))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="px-3 pb-2">
      <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Workspace</p>
      <select
        value={active.orgId}
        disabled={busy}
        onChange={e => onChange(e.target.value)}
        aria-label="Switch workspace"
        className="w-full text-xs rounded-lg px-2 py-2 outline-none disabled:opacity-50"
        style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.35)', color: 'white' }}
      >
        {items.map(w => (
          <option key={w.orgId} value={w.orgId} style={{ background: '#0d0a1a' }}>
            {w.personal ? 'My workspace' : w.name} · {w.roleLabel}
          </option>
        ))}
      </select>
    </div>
  )
}
