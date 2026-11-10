import { lazy, Suspense, useState } from 'react'
import type { CSSProperties } from 'react'
import PdfTables from './PdfTables'

// One page, two readers: any PDF table (default) and the bank statement reader that also proves every row.
const PdfStatements = lazy(() => import('./PdfStatements'))

export default function PdfToData() {
  const [tab, setTab] = useState<'any' | 'bank'>(() => {
    try { return sessionStorage.getItem('gt_pdf_tab') === 'bank' ? 'bank' : 'any' } catch { return 'any' }
  })
  const pick = (t: 'any' | 'bank') => { setTab(t); try { sessionStorage.setItem('gt_pdf_tab', t) } catch { /* ignore */ } }
  const tabStyle = (on: boolean): CSSProperties => ({
    background: on ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)', border: `1px solid ${on ? '#a78bfa' : 'rgba(255,255,255,0.14)'}`,
    color: 'white', borderRadius: 10, padding: '8px 16px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
  })
  return (
    <div style={{ padding: '28px 24px 60px', maxWidth: 1400, margin: '0 auto', fontFamily: 'Inter, sans-serif', color: 'white' }}>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>PDF to data</h1>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '14px 0 16px' }}>
        <button style={tabStyle(tab === 'any')} onClick={() => pick('any')}>Any PDF table</button>
        <button style={tabStyle(tab === 'bank')} onClick={() => pick('bank')}>Bank statement (every row checked)</button>
      </div>
      {tab === 'any' ? <PdfTables /> : (
        <Suspense fallback={<div style={{ color: 'rgba(255,255,255,0.55)' }}>Loading…</div>}>
          <PdfStatements embedded />
        </Suspense>
      )}
    </div>
  )
}
