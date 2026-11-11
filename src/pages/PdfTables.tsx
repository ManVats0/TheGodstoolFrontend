import { useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../config'

// Any text-based PDF -> a plain table -> a few one-click cleanups -> download.
// The server reads the PDF's own text (no AI, nothing stored). Every cleanup is done here in the browser and
// says exactly what it changed, so nothing is altered quietly.

type Tbl = { id: number; pages: [number, number]; rows: string[][]; nRows: number; nCols: number; cut: boolean }
type Ok = { ok: true; tables: Tbl[]; pages: number; truncatedPages: boolean; moreTables: number }

const card: CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20 }
const muted = 'rgba(255,255,255,0.55)'
const grad = 'linear-gradient(135deg,#7c3aed,#a78bfa)'
const GREEN = '#34d399'
const btn: CSSProperties = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.16)', color: 'white', borderRadius: 10, padding: '8px 14px', fontWeight: 600, cursor: 'pointer', fontSize: '0.86rem' }

type Grid = string[][]
type Result = { grid: Grid; note: string }

// ── cleanups: each takes the table (first row = header) and says what it did ────────────────────────────────────
const isEmptyRow = (r: string[]) => r.every(c => c.trim() === '')

const trim = (g: Grid): Result => {
  let n = 0
  const out = g.map(r => r.map(c => { const t = c.replace(/\s+/g, ' ').trim(); if (t !== c) n++; return t }))
  return { grid: out, note: n ? `Trimmed extra spaces in ${n} cells.` : 'No extra spaces found.' }
}
const dropEmpty = (g: Grid): Result => {
  const rows = g.filter((r, i) => i === 0 || !isEmptyRow(r))
  const keep = (g[0] || []).map((_, j) => rows.some((r, i) => i === 0 ? true : (r[j] ?? '').trim() !== ''))
  const out = rows.map(r => r.filter((_, j) => keep[j]))
  const dr = g.length - rows.length, dc = keep.filter(k => !k).length
  return { grid: out, note: dr || dc ? `Removed ${dr} empty row(s) and ${dc} empty column(s).` : 'No empty rows or columns found.' }
}
const dedupe = (g: Grid): Result => {
  const seen = new Set<string>(); const out: Grid = []
  g.forEach((r, i) => { const k = JSON.stringify(r.map(c => c.trim().toLowerCase())); if (i === 0 || !seen.has(k)) { seen.add(k); out.push(r) } })
  const n = g.length - out.length
  return { grid: out, note: n ? `Removed ${n} duplicate row(s). Rows must match in every column.` : 'No duplicate rows found.' }
}
const toNumber = (s: string): string | null => {
  let t = s.trim()
  if (!t) return null
  let neg = false
  if (/^\(.*\)$/.test(t)) { neg = true; t = t.slice(1, -1) }
  if (/-$/.test(t)) { neg = true; t = t.slice(0, -1) }
  t = t.replace(/^[₹$€£]\s*|\s*(INR|USD|EUR|GBP|Rs\.?)\s*$/gi, '').replace(/^(INR|USD|EUR|GBP|Rs\.?)\s*/i, '')
  if (t.startsWith('-')) { neg = !neg; t = t.slice(1) }
  // Only forms that are clearly a number are changed. Phone numbers, codes and ids are left alone.
  if (/^\d{1,3}(,\d{2,3})+(\.\d+)?$/.test(t)) t = t.replace(/,/g, '')          // 1,234.50 and 12,34,567.00
  else if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.')   // 1.234,50
  else if (/^\d+(\.\d+)?$/.test(t)) { /* plain already; only the wrapper (sign, currency, brackets) is removed */ }
  else return null
  return (neg ? '-' : '') + t
}
const numbers = (g: Grid): Result => {
  let n = 0
  const out = g.map((r, i) => i === 0 ? r : r.map(c => { const v = toNumber(c); if (v != null && v !== c) { n++; return v } return c }))
  return { grid: out, note: n ? `Turned ${n} cells into plain numbers (removed thousands commas and currency signs; (5) became -5). Phone numbers and codes are left alone.` : 'No text numbers needed changing.' }
}
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const iso = (y: number, m: number, d: number) => (m >= 1 && m <= 12 && d >= 1 && d <= 31 ? `${y < 100 ? 2000 + y : y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null)
const toDate = (s: string, dayFirst: boolean): { v: string | null; ambiguous: boolean } => {
  const t = s.trim()
  let m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (m) return { v: iso(+m[1], +m[2], +m[3]), ambiguous: false }
  m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/)
  if (m) {
    const a = +m[1], b = +m[2], y = +m[3]
    if (a > 12) return { v: iso(y, b, a), ambiguous: false }
    if (b > 12) return { v: iso(y, a, b), ambiguous: false }
    return { v: dayFirst ? iso(y, b, a) : iso(y, a, b), ambiguous: a !== b }
  }
  m = t.match(/^(\d{1,2})[ -]([A-Za-z]{3,9})[ -,]*(\d{2}|\d{4})$/)
  if (m) { const mi = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()); if (mi >= 0) return { v: iso(+m[3], mi + 1, +m[1]), ambiguous: false } }
  return { v: null, ambiguous: false }
}
const dates = (g: Grid, dayFirst: boolean): Result & { ambiguous: number } => {
  let n = 0, amb = 0
  const out = g.map((r, i) => i === 0 ? r : r.map(c => { const d = toDate(c, dayFirst); if (d.v && d.v !== c) { n++; if (d.ambiguous) amb++; return d.v } return c }))
  return { grid: out, ambiguous: amb, note: n ? `Rewrote ${n} dates as YYYY-MM-DD${amb ? ` (${amb} could be read either way and were read as ${dayFirst ? 'day first' : 'month first'})` : ''}.` : 'No dates needed changing.' }
}
const joinWrapped = (g: Grid): Result => {
  // a row whose first column is empty but has text elsewhere is usually the wrapped second line of the row above
  const out: Grid = []; let n = 0
  g.forEach((r, i) => {
    if (i > 0 && out.length > 1 && (r[0] ?? '').trim() === '' && r.some(c => c.trim() !== '')) {
      const prev = out[out.length - 1]
      r.forEach((c, j) => { if (c.trim()) prev[j] = `${prev[j] ?? ''} ${c}`.trim() })
      n++
    } else out.push([...r])
  })
  return { grid: out, note: n ? `Joined ${n} wrapped line(s) into the row above.` : 'No wrapped lines found.' }
}

function csvOf(g: Grid): string {
  const q = (v: string) => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
  return g.map(r => r.map(q).join(',')).join('\n')
}

export default function PdfTables() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [res, setRes] = useState<Ok | null>(null)
  const [tid, setTid] = useState(1)
  const [grid, setGrid] = useState<Grid>([])
  const [orig, setOrig] = useState<Grid>([])
  const [log, setLog] = useState<string[]>([])
  const [dayFirst, setDayFirst] = useState(true)
  const [header, setHeader] = useState(true)
  const [saving, setSaving] = useState(false)
  const [drag, setDrag] = useState(false)

  const load = (t: Tbl) => { setTid(t.id); setGrid(t.rows.map(r => [...r])); setOrig(t.rows.map(r => [...r])); setLog([]) }

  const run = async (f: File) => {
    setBusy(true); setError(''); setRes(null)
    try {
      const fd = new FormData(); fd.append('file', f)
      const r = await fetch(`${API_BASE}/api/pdf/tables`, { method: 'POST', credentials: 'include', body: fd })
      const j = await r.json().catch(() => ({} as any))
      if (r.status === 402) { setError('PDF to data is part of the paid plans.'); return }
      if (!r.ok || j.ok === false) { setError(j.error || `Something went wrong (${r.status}).`); return }
      const ok = j as Ok; setRes(ok); load(ok.tables[0]); setHeader(true)
    } catch { setError('Could not reach the server. Check your connection and try again.') }
    finally { setBusy(false) }
  }
  const pick = (f: File | null | undefined) => {
    if (!f) return
    if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') { setError('Please choose a PDF file.'); return }
    setFile(f); run(f)
  }

  const apply = (fn: (g: Grid) => Result) => { const r = fn(grid); setGrid(r.grid); setLog(l => [r.note, ...l].slice(0, 8)) }
  const applyDates = () => { const r = dates(grid, dayFirst); setGrid(r.grid); setLog(l => [r.note, ...l].slice(0, 8)) }
  const reset = () => { setGrid(orig.map(r => [...r])); setLog([]) }
  const edit = (i: number, j: number, v: string) => setGrid(g => g.map((r, a) => a === i ? r.map((c, b) => b === j ? v : c) : r))
  const removeRow = (i: number) => { setGrid(g => g.filter((_, a) => a !== i)); setLog(l => ['Removed 1 row.', ...l].slice(0, 8)) }

  const cols = grid[0]?.length || 0
  const head = header ? grid[0] : Array.from({ length: cols }, (_, j) => `Column ${j + 1}`)
  const body = header ? grid.slice(1) : grid
  const stem = (file?.name || 'table').replace(/\.pdf$/i, '')
  const cur = res?.tables.find(t => t.id === tid)
  const out = useMemo(() => csvOf(header ? grid : [head, ...grid]), [grid, header]) // eslint-disable-line

  const download = () => {
    const blob = new Blob(['﻿' + out], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${stem}.csv`; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }
  const saveAsSource = async () => {
    setSaving(true); setError('')
    try {
      const fd = new FormData(); fd.append('file', new File([out], `${stem}.csv`, { type: 'text/csv' }))
      const r = await fetch(`${API_BASE}/api/connections/upload-csv`, { method: 'POST', credentials: 'include', body: fd })
      const j = await r.json().catch(() => ({} as any))
      if (!r.ok) { setError(j?.error || `Could not save (${r.status}).`); return }
      try { sessionStorage.setItem('gt_new_source', `${stem}.csv`) } catch { /* ignore */ }
      navigate('/sources')
    } catch { setError('Could not reach the server.') } finally { setSaving(false) }
  }

  return (
    <div>
      <p style={{ color: muted, margin: '0 0 18px', maxWidth: 760, lineHeight: 1.55 }}>
        Drop any PDF that has a table in it: a report, an invoice list, a price list. You get the table back as plain rows and
        columns, can tidy it with a few clicks, and download it as a CSV that opens in Excel or Google Sheets.
      </p>

      <div
        onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]) }}
        onClick={() => fileRef.current?.click()}
        style={{ ...card, borderStyle: 'dashed', borderColor: drag ? '#a78bfa' : 'rgba(255,255,255,0.18)', textAlign: 'center', cursor: 'pointer', padding: res ? 14 : 36 }}
      >
        <input ref={fileRef} type="file" accept="application/pdf,.pdf" style={{ display: 'none' }} onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }} />
        {busy ? <div style={{ color: '#c4b5fd', fontWeight: 600 }}>Reading {file?.name}…</div>
          : <div>
              <div style={{ fontWeight: 700 }}>{res ? `Read ${file?.name}. Drop another PDF to start over` : 'Drop a PDF here, or click to choose'}</div>
              {!res && <div style={{ color: muted, fontSize: '0.85rem', marginTop: 6 }}>Up to 15 MB. Read on our server without AI and not stored. Works on PDFs made by a program, not on scans or photos.</div>}
            </div>}
      </div>

      {error && (
        <div style={{ ...card, marginTop: 14, borderColor: 'rgba(248,113,113,0.4)', background: 'rgba(248,113,113,0.08)', color: '#fecaca', lineHeight: 1.5 }}>
          {error} {/paid plans/.test(error) && <a href="/pricing" style={{ color: '#fca5a5', fontWeight: 700 }}>See plans</a>}
        </div>
      )}

      {res && cur && (
        <>
          <div style={{ ...card, marginTop: 14 }}>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 800, color: GREEN }}>
                  {res.tables.length === 1 ? 'Found 1 table' : `Found ${res.tables.length}${res.moreTables ? '+' : ''} tables`}: {body.length} rows, {cols} columns
                </div>
                <div style={{ color: muted, fontSize: '0.85rem', marginTop: 3 }}>
                  {cur.pages[0] === cur.pages[1] ? `Page ${cur.pages[0]}` : `Pages ${cur.pages[0]} to ${cur.pages[1]}`} of {res.pages}.
                  Check it against the PDF: table reading is a best effort, and merged or very irregular cells can come out wrong.
                  {cur.cut && ' Only the first 20,000 rows are shown.'}{res.truncatedPages && ' Only the first 60 pages were read.'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={download} style={{ ...btn, fontWeight: 700 }}>Download CSV</button>
                <button onClick={saveAsSource} disabled={saving} style={{ ...btn, background: grad, border: 'none', fontWeight: 700, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Clean further in the app'}</button>
              </div>
            </div>
            {res.tables.length > 1 && (
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ color: muted, fontSize: '0.85rem' }}>Table</span>
                {res.tables.map(t => (
                  <button key={t.id} onClick={() => load(t)} style={{ ...btn, padding: '5px 12px', borderColor: t.id === tid ? '#a78bfa' : undefined, background: t.id === tid ? 'rgba(124,58,237,0.25)' : btn.background }}>
                    {t.id}: {t.nRows} rows, p.{t.pages[0]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ ...card, marginTop: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Clean it</div>
            <div style={{ color: muted, fontSize: '0.82rem', marginBottom: 10 }}>Each button changes the table and tells you what it did. Undo everything with Start over.</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button style={btn} onClick={() => apply(trim)}>Trim extra spaces</button>
              <button style={btn} onClick={() => apply(dropEmpty)}>Remove empty rows and columns</button>
              <button style={btn} onClick={() => apply(joinWrapped)}>Join wrapped lines</button>
              <button style={btn} onClick={() => apply(dedupe)}>Remove duplicate rows</button>
              <button style={btn} onClick={() => apply(numbers)}>Turn text into numbers</button>
              <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                <button style={btn} onClick={applyDates}>Make dates YYYY-MM-DD</button>
                <select value={dayFirst ? 'd' : 'm'} onChange={e => setDayFirst(e.target.value === 'd')} style={{ ...btn, padding: '7px 8px' }} aria-label="Date order for unclear dates">
                  <option value="d">unclear dates: day first</option>
                  <option value="m">unclear dates: month first</option>
                </select>
              </span>
              <button style={{ ...btn, marginLeft: 'auto' }} onClick={reset}>Start over</button>
            </div>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 12, color: muted, fontSize: '0.85rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={header} onChange={e => setHeader(e.target.checked)} /> The first row is the header
            </label>
            {log.length > 0 && (
              <ul style={{ margin: '12px 0 0', paddingLeft: 18, color: '#c4b5fd', fontSize: '0.85rem', lineHeight: 1.6 }}>
                {log.map((l, i) => <li key={i} style={{ opacity: i === 0 ? 1 : 0.6 }}>{l}</li>)}
              </ul>
            )}
          </div>

          <div style={{ ...card, marginTop: 14, padding: 0, overflow: 'hidden' }}>
            <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: '100%' }}>
                <thead>
                  <tr style={{ position: 'sticky', top: 0, background: '#15102a', zIndex: 1, textAlign: 'left', color: muted }}>
                    <th style={{ width: 28 }} />
                    {head.map((h, j) => <th key={j} style={{ padding: '10px 8px', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {body.slice(0, 500).map((r, bi) => {
                    const i = header ? bi + 1 : bi
                    return (
                      <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ textAlign: 'center' }}><button title="Remove this row" onClick={() => removeRow(i)} style={{ background: 'transparent', border: 'none', color: muted, cursor: 'pointer', fontSize: '0.9rem' }}>×</button></td>
                        {r.map((c, j) => (
                          <td key={j}><input value={c} onChange={e => edit(i, j, e.target.value)} style={{ width: '100%', minWidth: 80, boxSizing: 'border-box', background: 'transparent', border: '1px solid transparent', color: 'white', font: 'inherit', padding: '4px 6px', borderRadius: 6, outline: 'none' }} /></td>
                        ))}
                      </tr>
                    )
                  })}
                  {body.length === 0 && <tr><td colSpan={cols + 1} style={{ padding: 24, textAlign: 'center', color: muted }}>The table is empty.</td></tr>}
                </tbody>
              </table>
            </div>
            {body.length > 500 && <div style={{ padding: 10, color: muted, fontSize: '0.8rem' }}>Showing the first 500 rows. Downloads include all {body.length}.</div>}
          </div>

          <div style={{ ...card, marginTop: 18 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>What this cannot do</div>
            <div style={{ color: muted, fontSize: '0.86rem', lineHeight: 1.65 }}>
              It cannot read scanned pages or photos, because there is no text to read. Tables with merged cells, tables split into
              several blocks, or text that only looks like a table can come out wrong, so look the result over before you use it.
              Dates like 03/04/2026 can mean two things, so you choose the order. Nothing is changed unless you press a button.
            </div>
          </div>
        </>
      )}
    </div>
  )
}
