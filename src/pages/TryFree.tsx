import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { API_BASE } from '../config'
import { signInUrl } from '../hosts'
import tryContent from '../home/try-content.json'
import { trim, dropEmpty, dedupe, numbers, dates } from './PdfTables'
import type { Grid } from './PdfTables'

// The free try: one small PDF or CSV, no account. The server reads it, counts what is wrong and returns the first
// 20 rows. The cleaning shown here happens in the browser on those 20 rows only. Nothing is stored.

type Prob = { label: string; count: number }
type Ok = {
  ok: true
  kind: 'pdf' | 'csv'
  totalRows: number
  cols: number
  rows: string[][]
  shown: number
  problems: { total: number; items: Prob[] }
  triesLeft: number
  pages?: number
  pagesRead?: number
  otherTables?: number
}
type Fail = { ok: false; code?: string; error: string }

const card: CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 16,
  padding: 20,
}
const muted = 'rgba(255,255,255,0.6)'
const grad = 'linear-gradient(135deg,#7c3aed,#a78bfa)'

const track = (name: string, params?: Record<string, unknown>) => {
  try {
    ;(window as any).gtag?.('event', name, params || {})
  } catch {
    /* tracking must never break the page */
  }
}

function cleanAll(g: Grid): { grid: Grid; notes: string[] } {
  const notes: string[] = []
  let grid = g
  for (const step of [trim, dropEmpty, dedupe, numbers]) {
    const r = step(grid)
    grid = r.grid
    if (!/^No /.test(r.note)) notes.push(r.note)
  }
  const d = dates(grid, true)
  grid = d.grid
  if (!/^No /.test(d.note)) notes.push(d.note)
  return { grid, notes }
}

function Table({ rows, label }: { rows: string[][]; label: string }) {
  const head = rows[0] || []
  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          padding: '10px 14px',
          fontWeight: 700,
          fontSize: '0.88rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {label}
      </div>
      <div style={{ maxHeight: 340, overflow: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '0.78rem', minWidth: '100%' }}>
          <thead>
            <tr style={{ position: 'sticky', top: 0, background: '#15102a', textAlign: 'left', color: muted }}>
              {head.map((h, j) => (
                <th key={j} style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                  {h || `Column ${j + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(1).map((r, i) => (
              <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {r.map((c, j) => (
                  <td key={j} style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                    {c}
                  </td>
                ))}
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
    if (!/\.(pdf|csv|tsv|txt)$/i.test(f.name) && f.type !== 'application/pdf') {
      setError('The free try reads PDF and CSV files.')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('The free try takes files up to 5 MB. Create a free account to use larger files.')
      return
    }
    setBusy(true)
    setError('')
    setRes(null)
    setName(f.name)
    track('try_file_selected', { kind: /\.pdf$/i.test(f.name) ? 'pdf' : 'csv' })
    try {
      const fd = new FormData()
      fd.append('file', f)
      const r = await fetch(`${API_BASE}/api/public/try`, { method: 'POST', body: fd, credentials: 'omit' })
      const j: Ok | Fail = await r.json().catch(() => ({ ok: false, error: `Something went wrong (${r.status}).` }))
      if (!j.ok) {
        setError(j.error || `Something went wrong (${r.status}).`)
        track('try_failed', { code: (j as Fail).code || r.status })
        return
      }
      setRes(j)
      track('try_result', { kind: j.kind, problems: j.problems.total, rows: j.totalRows })
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  const cleaned = res ? cleanAll(res.rows) : null
  const useSample = async () => {
    track('try_sample_click')
    setError('')
    try {
      const r = await fetch('/sample-orders.pdf')
      if (!r.ok) throw new Error('missing')
      run(new File([await r.blob()], 'sample-orders.pdf', { type: 'application/pdf' }))
    } catch {
      setError('Could not load the sample file. Please try your own file, or reload the page.')
    }
  }
  const pickSegment = (s: string) => {
    setSegment(s)
    track('try_segment', { segment: s })
  }
  const signUp = () => {
    track('try_signup_click', { problems: res?.problems.total ?? 0, segment: segment || 'unanswered' })
    window.location.assign(signInUrl({ register: true, after: '/pdf' }))
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#07050f',
        color: 'white',
        fontFamily: 'Inter, sans-serif',
        padding: '28px 20px 70px',
      }}
    >
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <a href="/" style={{ color: '#c4b5fd', textDecoration: 'none', fontWeight: 700 }}>
          The God&rsquo;s Tool
        </a>
        <div style={{ marginTop: 18 }}>
          <span
            style={{
              display: 'inline-block',
              background: 'rgba(52,211,153,0.12)',
              border: '1px solid rgba(52,211,153,0.4)',
              color: '#6ee7b7',
              borderRadius: 999,
              padding: '4px 14px',
              fontSize: '0.8rem',
              fontWeight: 700,
            }}
          >
            {tryContent.badge}
          </span>
        </div>
        <h1 style={{ fontSize: 'clamp(1.6rem,4vw,2.3rem)', fontWeight: 800, margin: '12px 0 8px' }}>{tryContent.h1}</h1>
        <p style={{ color: muted, lineHeight: 1.6, maxWidth: 720, margin: '0 0 20px' }}>{tryContent.answer}</p>

        <div
          onDragOver={e => {
            e.preventDefault()
            setDrag(true)
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => {
            e.preventDefault()
            setDrag(false)
            const f = e.dataTransfer.files?.[0]
            if (f) run(f)
          }}
          onClick={() => fileRef.current?.click()}
          style={{
            ...card,
            borderStyle: 'dashed',
            borderColor: drag ? '#a78bfa' : 'rgba(255,255,255,0.22)',
            textAlign: 'center',
            cursor: 'pointer',
            padding: res ? 14 : 40,
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf,.csv,.tsv,.txt,text/csv"
            style={{ display: 'none' }}
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) run(f)
              e.target.value = ''
            }}
          />
          {busy ? (
            <div style={{ color: '#c4b5fd', fontWeight: 600 }}>Reading {name}…</div>
          ) : (
            <div>
              <div style={{ fontWeight: 700 }}>
                {res ? `Read ${name}. Drop another file to try again` : 'Drop a PDF or CSV here, or click to choose'}
              </div>
              {!res && (
                <div style={{ color: muted, fontSize: '0.84rem', marginTop: 6 }}>
                  Up to 5 MB and the first 10 PDF pages. 5 tries an hour. Not stored. PDFs are read without AI.
                </div>
              )}
            </div>
          )}
        </div>

        {!res && !busy && (
          <p style={{ color: muted, fontSize: '0.9rem', margin: '12px 0 0', textAlign: 'center' }}>
            No file handy?{' '}
            <button
              onClick={useSample}
              style={{
                background: 'none',
                border: 'none',
                color: '#c4b5fd',
                fontWeight: 700,
                textDecoration: 'underline',
                cursor: 'pointer',
                font: 'inherit',
                padding: 0,
              }}
            >
              Try it on a sample PDF
            </button>{' '}
            (made-up orders with a few problems in it), or{' '}
            <a
              href="/sample-orders.pdf"
              download
              onClick={() => track('try_sample_download')}
              style={{ color: '#c4b5fd' }}
            >
              download the sample
            </a>
            .
          </p>
        )}

        {error && (
          <div
            style={{
              ...card,
              marginTop: 14,
              borderColor: 'rgba(248,113,113,0.45)',
              background: 'rgba(248,113,113,0.08)',
              color: '#fecaca',
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        {res && cleaned && (
          <>
            <div style={{ ...card, marginTop: 16 }}>
              <div
                style={{ fontWeight: 800, fontSize: '1.1rem', color: res.problems.total > 0 ? '#fbbf24' : '#34d399' }}
              >
                {res.problems.total > 0
                  ? `We found ${res.problems.total.toLocaleString()} thing${res.problems.total === 1 ? '' : 's'} to fix in ${res.totalRows.toLocaleString()} rows`
                  : `We found nothing obviously wrong in ${res.totalRows.toLocaleString()} rows`}
              </div>
              <div style={{ color: muted, fontSize: '0.86rem', marginTop: 4 }}>
                {res.totalRows.toLocaleString()} rows, {res.cols} columns
                {res.kind === 'pdf' && res.pages ? `, read from ${res.pagesRead} of ${res.pages} pages` : ''}.
                {res.otherTables
                  ? ` The PDF has ${res.otherTables} more table${res.otherTables === 1 ? '' : 's'}; the free try shows the first.`
                  : ''}
              </div>
              {res.problems.items.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {res.problems.items.map(p => (
                    <span
                      key={p.label}
                      style={{
                        background: 'rgba(251,191,36,0.1)',
                        border: '1px solid rgba(251,191,36,0.3)',
                        color: '#fde68a',
                        borderRadius: 999,
                        padding: '4px 12px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}
                    >
                      {p.label}: {p.count.toLocaleString()}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {res.totalRows > res.shown && (
              <div
                style={{
                  ...card,
                  marginTop: 16,
                  padding: '12px 16px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 12,
                  borderColor: 'rgba(167,139,250,0.4)',
                }}
              >
                <span style={{ flex: '1 1 260px', fontSize: '0.9rem' }}>
                  Showing {res.shown.toLocaleString()} of {res.totalRows.toLocaleString()} rows. Create an account to
                  clean all of them.
                </span>
                <button
                  onClick={signUp}
                  style={{
                    background: grad,
                    border: 'none',
                    color: 'white',
                    borderRadius: 10,
                    padding: '9px 16px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.86rem',
                  }}
                >
                  Start the 14-day trial
                </button>
              </div>
            )}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))',
                gap: 14,
                marginTop: 14,
              }}
            >
              <Table rows={res.rows} label={`Before (first ${res.shown} rows)`} />
              <Table rows={cleaned.grid} label="After a one-click clean (same rows)" />
            </div>
            <div style={{ color: muted, fontSize: '0.82rem', marginTop: 8, lineHeight: 1.5 }}>
              {cleaned.notes.length
                ? `On these rows: ${cleaned.notes.join(' ')}`
                : 'Nothing on these rows needed changing.'}{' '}
              Dates were read day first. The clean is only applied to the rows shown here.
            </div>

            <div style={{ ...card, marginTop: 18 }}>
              <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                What is this file for?{' '}
                <span style={{ color: muted, fontWeight: 400 }}>(optional, helps us make the tool better for you)</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {[
                  'Finance or accounting',
                  'Sales or marketing',
                  'Operations',
                  'Research or study',
                  'Something else',
                ].map(s => (
                  <button
                    key={s}
                    onClick={() => pickSegment(s)}
                    aria-pressed={segment === s}
                    style={{
                      background: segment === s ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${segment === s ? '#a78bfa' : 'rgba(255,255,255,0.18)'}`,
                      color: 'white',
                      borderRadius: 999,
                      padding: '6px 14px',
                      cursor: 'pointer',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div style={{ color: muted, fontSize: '0.78rem', marginTop: 8 }}>
                Your answer is counted anonymously. We do not ask who you are, and the file is not stored.
              </div>
            </div>

            <div
              style={{
                ...card,
                marginTop: 18,
                borderColor: 'rgba(167,139,250,0.45)',
                background: 'rgba(124,58,237,0.1)',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>
                Clean all {res.totalRows.toLocaleString()} rows and download the result
              </div>
              <p style={{ color: muted, lineHeight: 1.6, margin: '6px 0 14px', fontSize: '0.92rem' }}>
                Create an account and the whole file is cleaned the same way. Then you can describe fixes in plain
                English, save the steps and run them again on the next file.
              </p>
              <button
                onClick={signUp}
                style={{
                  background: grad,
                  border: 'none',
                  color: 'white',
                  borderRadius: 12,
                  padding: '12px 22px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                }}
              >
                Start the 14-day trial
              </button>
              <span style={{ color: muted, fontSize: '0.8rem', marginLeft: 12 }}>
                No card needed. The free plan stays after the trial.
              </span>
              <div style={{ marginTop: 12 }}>
                <a
                  href="/pricing"
                  onClick={() => track('try_pricing_click')}
                  style={{
                    display: 'inline-block',
                    border: '1px solid rgba(167,139,250,0.6)',
                    color: '#e9d5ff',
                    borderRadius: 12,
                    padding: '10px 18px',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    textDecoration: 'none',
                  }}
                >
                  See plans and credits
                </a>
              </div>
            </div>
          </>
        )}

        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 12px' }}>{tryContent.how.h2}</h2>
          <ol style={{ margin: 0, paddingLeft: 20, color: muted, lineHeight: 1.65, fontSize: '0.92rem' }}>
            {tryContent.how.items.map(i => (
              <li key={i.title} style={{ marginBottom: 8 }}>
                <strong style={{ color: 'white' }}>{i.title}.</strong> {i.body}
              </li>
            ))}
          </ol>
        </section>

        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 6px' }}>{tryContent.account.h2}</h2>
          <p style={{ color: muted, lineHeight: 1.6, margin: '0 0 14px', maxWidth: 720 }}>{tryContent.account.intro}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 12 }}>
            {tryContent.account.tiers.map(t => (
              <div key={t.name} style={card}>
                <div style={{ fontWeight: 800 }}>{t.name}</div>
                <div style={{ color: '#c4b5fd', fontSize: '0.8rem', margin: '2px 0 10px' }}>{t.tag}</div>
                <ul style={{ margin: 0, paddingLeft: 18, color: muted, fontSize: '0.86rem', lineHeight: 1.6 }}>
                  {t.items.map(i => (
                    <li key={i} style={{ marginBottom: 4 }}>
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p style={{ color: muted, fontSize: '0.82rem', lineHeight: 1.6, margin: '12px 0' }}>
            {tryContent.account.note}
          </p>
          <button
            onClick={signUp}
            style={{
              background: grad,
              border: 'none',
              color: 'white',
              borderRadius: 12,
              padding: '12px 22px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {tryContent.account.cta}
          </button>
          <span style={{ color: muted, fontSize: '0.82rem', marginLeft: 12 }}>{tryContent.account.ctaNote}</span>
        </section>

        <section style={{ ...card, marginTop: 24 }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 6px' }}>{tryContent.limits.h2}</h2>
          <p style={{ color: muted, fontSize: '0.88rem', lineHeight: 1.65, margin: 0 }}>{tryContent.limits.body}</p>
        </section>

        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 12px' }}>{tryContent.faq.h2}</h2>
          {tryContent.faq.items.map(f => (
            <details key={f.q} style={{ ...card, padding: '12px 16px', marginBottom: 8 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: '0.93rem' }}>{f.q}</summary>
              <p style={{ color: muted, fontSize: '0.88rem', lineHeight: 1.65, margin: '8px 0 0' }}>{f.a}</p>
            </details>
          ))}
        </section>

        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 8px' }}>Keep reading</h2>
          <ul style={{ margin: 0, paddingLeft: 20, color: muted, lineHeight: 1.8, fontSize: '0.9rem' }}>
            {tryContent.related.map(r => (
              <li key={r.href}>
                <a href={r.href} style={{ color: '#c4b5fd' }}>
                  {r.title}
                </a>
                : {r.desc}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
