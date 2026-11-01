import { useCallback, useEffect, useState } from 'react'
import { API_BASE } from './config'

const headers = (): Record<string, string> => {
  const t = localStorage.getItem('datapro_token') || ''
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

// Whether this workspace lets the AI see sample rows. Private (false) is the default.
export function useAiShare() {
  const [shared, setShared] = useState(false)
  const [allowed, setAllowed] = useState(true)
  const [canChange, setCanChange] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    fetch(`${API_BASE}/api/org`, { credentials: 'include', headers: headers() })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!live || !d || d.error) return
        setShared(!!d.settings?.aiShareSamples)
        setAllowed(d.settings?.aiSharingAllowed !== false)
        setCanChange(!!d.permissions?.['org.manageMembers'])
      })
      .catch(() => {})
    return () => { live = false }
  }, [])

  const change = useCallback(async (next: boolean) => {
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/org/settings`, {
        method: 'PUT', credentials: 'include', headers: headers(), body: JSON.stringify({ aiShareSamples: next }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error || 'Could not save that choice.'); return }
      setShared(next)
    } catch { setError('Could not save that choice.') }
  }, [])

  return { shared, allowed, canChange, error, change }
}

export function AiShareSwitch({ shared, allowed, canChange, error, change }: ReturnType<typeof useAiShare>) {
  if (!allowed) return null
  return (
    <div className="px-5 pb-2 flex-shrink-0" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
      <label className="flex items-start gap-2" style={{ cursor: canChange ? 'pointer' : 'default' }}>
        <input type="checkbox" checked={shared} disabled={!canChange} onChange={e => change(e.target.checked)} style={{ marginTop: 2 }} />
        <span>
          <b style={{ color: 'rgba(255,255,255,0.75)' }}>{shared ? 'Sharing a few sample rows with the AI' : 'Private mode: the AI never sees your rows'}</b>
          {' '}{shared
            ? 'for better results on value-based fixes like typos. Untick to go back to private mode.'
            : canChange ? 'Tick to share a few sample rows for better results on value-based fixes like typos.' : 'An admin can switch on sample sharing for better results.'}
          {error && <span style={{ color: '#f87171' }}> {error}</span>}
        </span>
      </label>
    </div>
  )
}
