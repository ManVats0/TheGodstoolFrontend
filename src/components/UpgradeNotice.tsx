import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// Friendly "this is part of a paid plan" prompt + the free-plan row-limit note. Mounted once at the top of the app.
type Upgrade = { message: string; feature?: string }
type RowLimit = { rowLimit: number; totalRows: number }

export default function UpgradeNotice() {
  const navigate = useNavigate()
  const [upgrade, setUpgrade] = useState<Upgrade | null>(null)
  const [rows, setRows] = useState<RowLimit | null>(null)
  const lastRows = useRef(0)

  useEffect(() => {
    const onUpgrade = (e: Event) => {
      const d = (e as CustomEvent).detail || {}
      setUpgrade({ message: String(d.message || 'This is part of the paid plans.'), feature: d.feature })
    }
    const onRows = (e: Event) => {
      const d = (e as CustomEvent).detail || {}
      const now = Date.now()
      if (now - lastRows.current < 20000) return   // preview calls fire often; do not nag
      lastRows.current = now
      setRows({ rowLimit: Number(d.rowLimit) || 0, totalRows: Number(d.totalRows) || 0 })
    }
    window.addEventListener('datapro:upgrade-required', onUpgrade)
    window.addEventListener('datapro:row-limit', onRows)
    return () => {
      window.removeEventListener('datapro:upgrade-required', onUpgrade)
      window.removeEventListener('datapro:row-limit', onRows)
    }
  }, [])

  useEffect(() => {
    if (!rows) return
    const t = setTimeout(() => setRows(null), 12000)
    return () => clearTimeout(t)
  }, [rows])

  const goPricing = () => { setUpgrade(null); setRows(null); navigate('/pricing') }

  return (
    <>
      {upgrade && (
        <div role="dialog" aria-modal="true" onClick={() => setUpgrade(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ maxWidth: 420, width: '100%', background: '#0f0b1f', border: '1px solid rgba(124,58,237,0.4)', borderRadius: 16, padding: 24, color: 'white', fontFamily: "'Inter', -apple-system, sans-serif" }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 8 }}>Unlock this with a paid plan</div>
            <div style={{ fontSize: '0.9rem', lineHeight: 1.5, color: 'rgba(255,255,255,0.7)', marginBottom: 20 }}>{upgrade.message}</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setUpgrade(null)}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', borderRadius: 10, padding: '9px 16px', cursor: 'pointer' }}>Not now</button>
              <button onClick={goPricing}
                style={{ background: 'linear-gradient(135deg,#7c3aed,#a78bfa)', border: 'none', color: 'white', borderRadius: 10, padding: '9px 18px', fontWeight: 700, cursor: 'pointer' }}>See plans</button>
            </div>
          </div>
        </div>
      )}
      {rows && !upgrade && (
        <div style={{ position: 'fixed', left: 16, right: 16, bottom: 16, zIndex: 99999, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ pointerEvents: 'auto', maxWidth: 560, background: '#0f0b1f', border: '1px solid rgba(124,58,237,0.4)', borderRadius: 12, padding: '12px 16px', color: 'white', fontSize: '0.85rem', display: 'flex', gap: 12, alignItems: 'center', fontFamily: "'Inter', -apple-system, sans-serif" }}>
            <span style={{ flex: 1 }}>
              Free plan cleans the first {rows.rowLimit.toLocaleString()} rows of each file
              {rows.totalRows ? ` (this one has ${rows.totalRows.toLocaleString()})` : ''}. Upgrade to clean every row.
            </span>
            <button onClick={goPricing} style={{ background: 'linear-gradient(135deg,#7c3aed,#a78bfa)', border: 'none', color: 'white', borderRadius: 8, padding: '7px 12px', fontWeight: 700, cursor: 'pointer' }}>See plans</button>
            <button aria-label="Dismiss" onClick={() => setRows(null)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1rem' }}>×</button>
          </div>
        </div>
      )}
    </>
  )
}
