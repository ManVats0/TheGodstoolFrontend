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
  const priv = !shared || !allowed
  const editable = canChange && allowed
  return (
    <div className="px-5 pb-2 flex-shrink-0" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
      <label className="flex items-start gap-2" style={{ cursor: editable ? 'pointer' : 'default' }}>
        <input type="checkbox" checked={priv} disabled={!editable} onChange={e => change(!e.target.checked)} style={{ marginTop: 2 }} />
        <span>
          <b style={{ color: priv ? '#86efac' : 'rgba(255,255,255,0.75)' }}>
            {priv ? 'Private mode is on (recommended): the AI sees your instruction and column names, not your rows.' : 'Private mode is off: a few sample rows are shared with the AI.'}
          </b>
          {' '}
          {!allowed ? 'Sample sharing is not available on this service.'
            : priv ? (canChange ? 'Untick only if you want better results on value-based fixes like typos.' : 'An admin can turn it off for better results on value-based fixes.')
            : (canChange ? 'Tick the box to go back to private mode.' : 'An admin can turn private mode back on.')}
          {error && <span style={{ color: '#f87171' }}> {error}</span>}
        </span>
      </label>
    </div>
  )
}
