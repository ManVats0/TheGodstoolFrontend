import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { API_BASE } from '../config'
import { signInUrl } from '../hosts'
import { trim, dropEmpty, dedupe, numbers, dates } from './PdfTables'
import type { Grid } from './PdfTables'

// The free try: one small PDF or CSV, no account. The server reads it, counts what is wrong and returns the first
// 20 rows. The cleaning shown here happens in the browser on those 20 rows only. Nothing is stored.

type Prob = { label: string; count: number }
type Ok = { ok: true; kind: 'pdf' | 'csv'; totalRows: number; cols: number; rows: string[][]; shown: number; problems: { total: number; items: Prob[] }; triesLeft: number; pages?: number; pagesRead?: number; otherTables?: number }
type Fail = { ok: false; code?: string; error: string }

const card: CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 20 }
const muted = 'rgba(255,255,255,0.6)'
const grad = 'linear-gradient(135deg,#7c3aed,#a78bfa)'

const track = (name: string, params?: Record<string, unknown>) => {
  try { (window as any).gtag?.('event', name, params || {}) } catch { /* tracking must never break the page */ }
}

function cleanAll(g: Grid): { grid: Grid; notes: string[] } {
  const notes: string[] = []
  let grid = g
  for (const step of [trim, dropEmpty, dedupe, numbers]) {
    const r = step(grid); grid = r.grid
    if (!/^No /.test(r.note)) notes.push(r.note)
  }
  const d = dates(grid, true); grid = d.grid
  if (!/^No /.test(d.note)) notes.push(d.note)
  return { grid, notes }
}

function Table({ rows, label }: { rows: string[][]; label: string }) {
  const head = rows[0] || []
  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', fontWeight: 700, fontSize: '0.88rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{label}</div>
      <div style={{ maxHeight: 340, overflow: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '0.78rem', minWidth: '100%' }}>
          <thead><tr style={{ position: 'sticky', top: 0, background: '#15102a', textAlign: 'left', color: muted }}>
            {head.map((h, j) => <th key={j} style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{h || `Column ${j + 1}`}</th>)}
          </tr></thead>
          <tbody>
            {rows.slice(1).map((r, i) => (
              <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {r.map((c, j) => <td key={j} style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>{c}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function TryFree() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [res, setRes] = useState<Ok | null>(null)
  const [name, setName] = useState('')
  const [drag, setDrag] = useState(false)
  const [segment, setSegment] = useState('')

  const run = async (f: File) => {
    if (!/\.(pdf|csv|tsv|txt)$/i.test(f.name) && f.type !== 'application/pdf') { setError('The free try reads PDF and CSV files.'); return }
    if (f.size > 5 * 1024 * 1024) { setError('The free try takes files up to 5 MB. Create a free account to use larger files.'); return }
    setBusy(true); setError(''); setRes(null); setName(f.name)
    track('try_file_selected', { kind: /\.pdf$/i.test(f.name) ? 'pdf' : 'csv' })
    try {
      const fd = new FormData(); fd.append('file', f)
      const r = await fetch(`${API_BASE}/api/public/try`, { method: 'POST', body: fd, credentials: 'omit' })
      const j: Ok | Fail = await r.json().catch(() => ({ ok: false, error: `Something went wrong (${r.status}).` }))
      if (!j.ok) { setError(j.error || `Something went wrong (${r.status}).`); track('try_failed', { code: (j as Fail).code || r.status }); return }
      setRes(j); track('try_result', { kind: j.kind, problems: j.problems.total, rows: j.totalRows })
    } catch { setError('Could not reach the server. Check your connection and try again.') }
    finally { setBusy(false) }
  }

  const cleaned = res ? cleanAll(res.rows) : null
  const pickSegment = (s: string) => { setSegment(s); track('try_segment', { segment: s }) }
  const signUp = () => { track('try_signup_click', { problems: res?.problems.total ?? 0, segment: segment || 'unanswered' }); window.location.assign(signInUrl({ register: true, after: '/pdf' })) }

  return (
    <div style={{ minHeight: '100vh', background: '#07050f', color: 'white', fontFamily: 'Inter, sans-serif', padding: '28px 20px 70px' }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <a href="/" style={{ color: '#c4b5fd', textDecoration: 'none', fontWeight: 700 }}>The God&rsquo;s Tool</a>
        <div style={{ marginTop: 18 }}>
          <span style={{ display: 'inline-block', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.4)', color: '#6ee7b7', borderRadius: 999, padding: '4px 14px', fontSize: '0.8rem', fontWeight: 700 }}>
            No sign-up. No login. No card.
          </span>
        </div>
        <h1 style={{ fontSize: 'clamp(1.6rem,4vw,2.3rem)', fontWeight: 800, margin: '12px 0 8px' }}>Try it free on one file</h1>
        <p style={{ color: muted, lineHeight: 1.6, maxWidth: 680, margin: '0 0 20px' }}>
          Drop a PDF with a table in it, or a CSV. You do not need an account. We show you what we found wrong and the first 20 rows cleaned.
        </p>

        <div
          onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) run(f) }}
          onClick={() => fileRef.current?.click()}
          style={{ ...card, borderStyle: 'dashed', borderColor: drag ? '#a78bfa' : 'rgba(255,255,255,0.22)', textAlign: 'center', cursor: 'pointer', padding: res ? 14 : 40 }}
        >
          <input ref={fileRef} type="file" accept="application/pdf,.pdf,.csv,.tsv,.txt,text/csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) run(f); e.target.value = '' }} />
          {busy ? <div style={{ color: '#c4b5fd', fontWeight: 600 }}>Reading {name}…</div> : (
            <div>
              <div style={{ fontWeight: 700 }}>{res ? `Read ${name}. Drop another file to try again` : 'Drop a PDF or CSV here, or click to choose'}</div>
              {!res && <div style={{ color: muted, fontSize: '0.84rem', marginTop: 6 }}>Up to 5 MB and the first 10 PDF pages. 5 tries an hour. Not stored. PDFs are read without AI.</div>}
            </div>
          )}
        </div>

        {error && <div style={{ ...card, marginTop: 14, borderColor: 'rgba(248,113,113,0.45)', background: 'rgba(248,113,113,0.08)', color: '#fecaca', lineHeight: 1.5 }}>{error}</div>}

        {res && cleaned && (
          <>
            <div style={{ ...card, marginTop: 16 }}>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: res.problems.total > 0 ? '#fbbf24' : '#34d399' }}>
                {res.problems.total > 0
                  ? `We found ${res.problems.total.toLocaleString()} thing${res.problems.total === 1 ? '' : 's'} to fix in ${res.totalRows.toLocaleString()} rows`
                  : `We found nothing obviously wrong in ${res.totalRows.toLocaleString()} rows`}
              </div>
              <div style={{ color: muted, fontSize: '0.86rem', marginTop: 4 }}>
                {res.totalRows.toLocaleString()} rows, {res.cols} columns{res.kind === 'pdf' && res.pages ? `, read from ${res.pagesRead} of ${res.pages} pages` : ''}.
                {res.otherTables ? ` The PDF has ${res.otherTables} more table${res.otherTables === 1 ? '' : 's'}; the free try shows the first.` : ''}
              </div>
              {res.problems.items.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {res.problems.items.map(p => (
                    <span key={p.label} style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: '#fde68a', borderRadius: 999, padding: '4px 12px', fontSize: '0.8rem', fontWeight: 600 }}>
                      {p.label}: {p.count.toLocaleString()}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: 14, marginTop: 14 }}>
              <Table rows={res.rows} label={`Before (first ${res.shown} rows)`} />
              <Table rows={cleaned.grid} label="After a one-click clean (same rows)" />
            </div>
            <div style={{ color: muted, fontSize: '0.82rem', marginTop: 8, lineHeight: 1.5 }}>
              {cleaned.notes.length ? `On these rows: ${cleaned.notes.join(' ')}` : 'Nothing on these rows needed changing.'}
              {' '}Dates were read day first. The clean is only applied to the rows shown here.
            </div>

            <div style={{ ...card, marginTop: 18 }}>
              <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>What is this file for? <span style={{ color: muted, fontWeight: 400 }}>(optional, helps us make the tool better for you)</span></div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {['Finance or accounting', 'Sales or marketing', 'Operations', 'Research or study', 'Something else'].map(s => (
                  <button key={s} onClick={() => pickSegment(s)} aria-pressed={segment === s}
                    style={{ background: segment === s ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.06)', border: `1px solid ${segment === s ? '#a78bfa' : 'rgba(255,255,255,0.18)'}`, color: 'white', borderRadius: 999, padding: '6px 14px', cursor: 'pointer', fontSize: '0.84rem', fontWeight: 600 }}>{s}</button>
                ))}
              </div>
              <div style={{ color: muted, fontSize: '0.78rem', marginTop: 8 }}>Your answer is counted anonymously. We do not ask who you are, and the file is not stored.</div>
            </div>

            <div style={{ ...card, marginTop: 18, borderColor: 'rgba(167,139,250,0.45)', background: 'rgba(124,58,237,0.1)' }}>
              <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>Clean all {res.totalRows.toLocaleString()} rows and download the result</div>
              <p style={{ color: muted, lineHeight: 1.6, margin: '6px 0 14px', fontSize: '0.92rem' }}>
                Create an account and the whole file is cleaned the same way. Then you can describe fixes in plain English, save the steps and run them again on the next file.
              </p>
              <button onClick={signUp} style={{ background: grad, border: 'none', color: 'white', borderRadius: 12, padding: '12px 22px', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>
                Start the 14-day trial
              </button>
              <span style={{ color: muted, fontSize: '0.8rem', marginLeft: 12 }}>No card needed. The free plan stays after the trial.</span>
              <div style={{ marginTop: 10, fontSize: '0.82rem' }}><a href="/pricing" style={{ color: '#c4b5fd' }}>See plans and credits</a></div>
            </div>
          </>
        )}

        <div style={{ ...card, marginTop: 22 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>What the free try cannot do</div>
          <div style={{ color: muted, fontSize: '0.86rem', lineHeight: 1.65 }}>
            It shows only the first 20 rows and the first table of a PDF, and it cannot read scanned pages or photos. Table reading is a best effort, so check it against your file.
            The counts above are simple checks, not a full analysis. The file is read on our server and is not stored. The clean on this page runs in your browser.
          </div>
        </div>
      </div>
    </div>
  )
}
