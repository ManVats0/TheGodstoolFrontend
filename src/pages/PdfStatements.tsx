import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../config'

// PDF bank statement -> table you can trust.
// The server reads the PDF's own text (no AI, nothing is stored) and checks every row against the statement's
// printed balances. This page shows the result next to the PDF so the few doubtful rows are quick to settle.

type Flag = { code: string; message: string; severity: 'review' | 'info' }
type Status = 'verified' | 'flagged' | 'unchecked'
type Row = {
  id: number; page: number; bbox: [number, number, number, number]
  date: string; description: string; ref: string
  debit: string | null; credit: string | null; balance: string | null
  status: Status; flags: Flag[]
}
type PageInfo = { page: number; width: number; height: number; image: string | null }
type Summary = { label: string; rows: number; verified: number; flagged: number; unchecked: number; fileFlags: Flag[] }
type Ok = { ok: true; summary: Summary; dateOrder: 'DMY' | 'MDY'; dateOrderCertain: boolean; pages: PageInfo[]; rows: Row[]; truncated: boolean }
type Fail = { ok: false; code: string; error: string }

const card: CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20 }
const muted = 'rgba(255,255,255,0.55)'
const grad = 'linear-gradient(135deg,#7c3aed,#a78bfa)'
const GREEN = '#34d399', AMBER = '#fbbf24'

// ── re-check after the person fixes a cell ─────────────────────────────────────────────────────────────────────
const CHAIN = new Set(['balance_break', 'sign', 'digits', 'duplicate', 'opening', 'first_row', 'inferred'])
const cents = (s: string | null): number | null => {
  if (s == null || String(s).trim() === '') return null
  const n = Number(String(s).replace(/[,\s]/g, ''))
  return Number.isFinite(n) ? Math.round(n * 100) : null
}

function recheck(rows: Row[], edited: Set<number>): Row[] {
  const amt = rows.map(r => {
    const d = cents(r.debit), c = cents(r.credit)
    return d == null && c == null ? null : (c || 0) - (d || 0)
  })
  const bal = rows.map(r => cents(r.balance))
  const fits = (p: number, c: number) => bal[p] != null && bal[c] != null && amt[c] != null && bal[p]! + amt[c]! === bal[c]
  const order = (rev: boolean) => { const o = rows.map((_, i) => i); return rev ? o.reverse() : o }
  const score = (rev: boolean) => { const o = order(rev); let ok = 0; for (let k = 1; k < o.length; k++) if (fits(o[k - 1], o[k])) ok++; return ok }
  const o = order(score(true) > score(false))
  const out = rows.map(r => ({ ...r, flags: r.flags.filter(f => !CHAIN.has(f.code) && !(edited.has(r.id) && f.code === 'readers_disagree')) }))
  const status: Status[] = rows.map(() => 'unchecked')
  for (let k = 1; k < o.length; k++) {
    const p = o[k - 1], c = o[k]
    if (bal[p] == null || bal[c] == null || amt[c] == null) continue
    if (fits(p, c)) status[c] = 'verified'
    else {
      status[c] = 'flagged'
      out[c].flags.push({ code: 'balance_break', severity: 'review',
        message: 'The balance does not follow from the previous row’s balance and this amount. Check this row against the PDF.' })
    }
  }
  // the first row has nothing before it: it keeps what the server decided unless it was edited
  const first = o[0]
  status[first] = edited.has(rows[first].id) ? 'unchecked' : (rows[first].status === 'verified' ? 'verified' : 'unchecked')
  return out.map((r, i) => {
    const review = r.flags.some(f => f.severity === 'review')
    return { ...r, status: review ? 'flagged' : status[i] }
  })
}

// ── readable details ──────────────────────────────────────────────────────────────────────────────────────────
// Banks print the payment as one long code. This works out a type, the other party and a reference number from it.
// It is a best guess from the text only: the exact bank text always stays in the Description column and in the CSV.
const KINDS: [RegExp, string][] = [
  [/\bUPI\b/i, 'UPI'], [/\bIMPS\b/i, 'IMPS'], [/\bNEFT\b/i, 'NEFT'], [/\bRTGS\b/i, 'RTGS'],
  [/\b(ATM|NFS|CASH\s*WDL|CASH\s*WITHDRAWAL)\b/i, 'ATM'], [/\bPOS\b/i, 'Card'],
  [/\b(ECS|NACH|MANDATE)\b/i, 'Auto-debit'],
  [/\b(CHGS|CHARGES?|CHRG|GST|SMS\s*ALERT|CONSUMER|HIGH\s*MARK|MORTGAGE)\b/i, 'Charges'],
  [/\bINT(EREST)?\b\.?\s*(PD|PAID|CR|CREDIT)\b/i, 'Interest'],
  [/\b(CHQ\s*:?\s*[1-9]\d*|CHEQUE|CLG|CLEARING)\b/i, 'Cheque'],
]
const NOT_A_NAME = new Set(['DR', 'CR', 'UPI', 'IMPS', 'NEFT', 'RTGS', 'MB', 'CHQ', 'CHEQUE', 'NFS', 'ATM', 'POS', 'PAYMENT', 'PAYMENTS', 'FROM', 'TO', 'BY', 'TRANSFER', 'TRF', 'REF', 'NA', 'NIL', 'INB', 'BANK', 'PAY', 'DEBIT', 'CREDIT'])
function tidy(description: string, ref: string): { type: string; party: string; ref: string } {
  const text = `${description || ''} ${ref || ''}`.replace(/\s+/g, ' ').trim()
  const kindText = text.replace(/\bchq\s*:?\s*0\b/ig, ' ')
  const type = KINDS.find(([re]) => re.test(kindText))?.[1] || (/\bMB\b/i.test(kindText) ? 'Mobile banking' : '')
  const refNo = (text.match(/\d{9,}/) || [''])[0]
  let party = ''
  for (const raw of text.split(/[\/|]|\s-\s|-(?=[A-Za-z]{2,}\b)/)) {
    const tok = raw.replace(/^(chq|ref|upi|imps|neft)\s*:?\s*\d*\s*/i, '').trim()
    if (tok.length < 3 || /\d{3,}/.test(tok) || /^[A-F0-9]{10,}$/i.test(tok)) continue
    if (!/^[A-Za-z][A-Za-z .&']+$/.test(tok) || NOT_A_NAME.has(tok.toUpperCase())) continue
    if (KINDS.some(([re]) => re.test(tok))) continue
    party = tok.slice(0, 28); break
  }
  return { type, party, ref: refNo }
}
const looksLike = (d: { type: string; party: string }) => [d.type, d.party].filter(Boolean).join(' · ')

// ── totals at the top ───────────────────────────────────────────────────────────────────────────────────────────
function totalsOf(rows: Row[]) {
  const amt = rows.map(r => { const d = cents(r.debit), c = cents(r.credit); return d == null && c == null ? null : (c || 0) - (d || 0) })
  const bal = rows.map(r => cents(r.balance))
  const fits = (p: number, c: number) => bal[p] != null && bal[c] != null && amt[c] != null && bal[p]! + amt[c]! === bal[c]
  const idx = rows.map((_, i) => i)
  const score = (o: number[]) => { let ok = 0; for (let k = 1; k < o.length; k++) if (fits(o[k - 1], o[k])) ok++; return ok }
  const o = score([...idx].reverse()) > score(idx) ? [...idx].reverse() : idx
  if (!o.length) return null
  const first = o[0], last = o[o.length - 1]
  const opening = bal[first] != null && amt[first] != null ? bal[first]! - amt[first]! : null
  const closing = bal[last]
  let inn = 0, out = 0
  for (const a of amt) { if (a == null) continue; if (a > 0) inn += a; else out -= a }
  const ties = opening != null && closing != null && opening + inn - out === closing
  return { opening, closing, inn, out, ties }
}
const money = (c: number | null) => c == null ? '–' : (c / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function toCsv(rows: Row[]): string {
  const q = (v: string | null) => {
    const s = v ?? ''
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const head = ['Date', 'Description', 'Ref', 'Debit', 'Credit', 'Balance', 'Check', 'Type', 'Party', 'Reference no']
  const label = (s: Status) => s === 'verified' ? 'verified' : s === 'flagged' ? 'needs review' : 'not checked'
  return [head.join(','), ...rows.map(r => { const d = tidy(r.description, r.ref); return [r.date, r.description, r.ref, r.debit, r.credit, r.balance, label(r.status), d.type, d.party, d.ref].map(q).join(',') })].join('\n')
}

function StatusDot({ s, title }: { s: Status; title?: string }) {
  const c = s === 'verified' ? GREEN : s === 'flagged' ? AMBER : 'rgba(255,255,255,0.3)'
  const t = s === 'verified' ? '✓' : s === 'flagged' ? '!' : '–'
  return <span title={title} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 99, background: `${c}22`, color: c, fontWeight: 800, fontSize: 12 }}>{t}</span>
}

const cellInput: CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'transparent', border: '1px solid transparent', color: 'white', font: 'inherit', padding: '4px 6px', borderRadius: 6, outline: 'none' }

export default function PdfStatements() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const hiRef = useRef<HTMLDivElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [res, setRes] = useState<Ok | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [edited, setEdited] = useState<Set<number>>(new Set())
  const [sel, setSel] = useState<number | null>(null)
  const [onlyCheck, setOnlyCheck] = useState(false)
  const [saving, setSaving] = useState(false)
  const [drag, setDrag] = useState(false)

  const run = async (f: File, order?: string) => {
    setBusy(true); setError(''); setRes(null); setEdited(new Set()); setSel(null)
    try {
      const fd = new FormData()
      fd.append('file', f)
      if (order) fd.append('date_order', order)
      const r = await fetch(`${API_BASE}/api/pdf/extract`, { method: 'POST', credentials: 'include', body: fd })
      const j: Ok | Fail | { error?: string } = await r.json().catch(() => ({}))
      if (r.status === 402) { setError('PDF to table is part of the paid plans.'); return }
      if (!r.ok || (j as Fail).ok === false) { setError((j as any).error || `Something went wrong (${r.status}).`); return }
      const ok = j as Ok
      setRes(ok); setRows(ok.rows)
      const firstBad = ok.rows.find(x => x.status === 'flagged')
      if (firstBad) setSel(firstBad.id)
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally { setBusy(false) }
  }

  const pick = (f: File | null | undefined) => {
    if (!f) return
    if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') { setError('Please choose a PDF file.'); return }
    setFile(f); run(f)
  }

  const edit = (id: number, key: 'date' | 'description' | 'debit' | 'credit' | 'balance', value: string) => {
    const nextEdited = new Set(edited); nextEdited.add(id)
    const numeric = key === 'debit' || key === 'credit' || key === 'balance'
    const next = rows.map(r => r.id === id ? { ...r, [key]: numeric && value.trim() === '' ? null : value } : r)
    setEdited(nextEdited)
    setRows(numeric ? recheck(next, nextEdited) : next)
  }

  const summary = useMemo(() => {
    const v = rows.filter(r => r.status === 'verified').length
    const f = rows.filter(r => r.status === 'flagged').length
    return { v, f, u: rows.length - v - f }
  }, [rows])

  const totals = useMemo(() => totalsOf(rows), [rows])
  const selRow = rows.find(r => r.id === sel) || null
  const pageNo = selRow?.page ?? 1
  const page = res?.pages.find(p => p.page === pageNo) || null
  useEffect(() => { hiRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }) }, [sel, pageNo])

  const visible = onlyCheck ? rows.filter(r => r.status !== 'verified') : rows
  const stem = (file?.name || 'statement').replace(/\.pdf$/i, '')

  const download = () => {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `${stem}.csv`; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }

  const saveAsSource = async () => {
    setSaving(true); setError('')
    try {
      const fd = new FormData()
      fd.append('file', new File([toCsv(rows)], `${stem}.csv`, { type: 'text/csv' }))
      const r = await fetch(`${API_BASE}/api/connections/upload-csv`, { method: 'POST', credentials: 'include', body: fd })
      const j = await r.json().catch(() => ({} as any))
      if (!r.ok) { setError(j?.error || `Could not save (${r.status}).`); return }
      navigate('/sources')
    } catch { setError('Could not reach the server.') } finally { setSaving(false) }
  }

  const hasEdits = edited.size > 0
  const allClear = !!res && summary.f === 0 && summary.u === 0 && !res.summary.fileFlags.some(f => f.severity === 'review' && !hasEdits)
  const tone = !res ? muted : allClear ? GREEN : summary.f > 0 || res.summary.fileFlags.some(f => f.severity === 'review') ? AMBER : '#93c5fd'

  return (
    <div style={{ padding: '28px 24px 60px', maxWidth: 1400, margin: '0 auto', fontFamily: 'Inter, sans-serif', color: 'white' }}>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>PDF to table</h1>
      <p style={{ color: muted, margin: '6px 0 20px', maxWidth: 760, lineHeight: 1.55 }}>
        Drop a bank statement PDF. Every row is checked against the balances printed on the statement itself, and the few rows
        that do not add up are marked so you can look at them next to the PDF. Nothing is changed quietly.
      </p>

      <div
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]) }}
        onClick={() => fileRef.current?.click()}
        style={{ ...card, borderStyle: 'dashed', borderColor: drag ? '#a78bfa' : 'rgba(255,255,255,0.18)', textAlign: 'center', cursor: 'pointer', padding: res ? 14 : 36 }}
      >
        <input ref={fileRef} type="file" accept="application/pdf,.pdf" style={{ display: 'none' }} onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }} />
        {busy ? <div style={{ color: '#c4b5fd', fontWeight: 600 }}>Reading and checking {file?.name}…</div>
          : <div>
              <div style={{ fontWeight: 700 }}>{res ? `Checked ${file?.name}. Drop another PDF to start over` : 'Drop a statement PDF here, or click to choose'}</div>
              {!res && <div style={{ color: muted, fontSize: '0.85rem', marginTop: 6 }}>Up to 15 MB. Read on our server without AI and not stored. Use the PDF from your bank, not a scan.</div>}
            </div>}
      </div>

      {error && (
        <div style={{ ...card, marginTop: 14, borderColor: 'rgba(248,113,113,0.4)', background: 'rgba(248,113,113,0.08)', color: '#fecaca', lineHeight: 1.5 }}>
          {error} {/paid plans/.test(error) && <a href="/pricing" style={{ color: '#fca5a5', fontWeight: 700 }}>See plans</a>}
        </div>
      )}

      {res && (
        <>
          <div style={{ ...card, marginTop: 14, borderColor: `${tone}66`, background: `${tone}12` }}>
            <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 320px' }}>
                <div style={{ fontWeight: 800, color: tone, fontSize: '1.05rem' }}>
                  {allClear
                    ? `All ${rows.length} rows are proven by the statement’s own balances`
                    : summary.f > 0
                      ? `${summary.f} of ${rows.length} rows need a look`
                      : summary.u > 0 && summary.v === 0
                        ? 'Could not be proven: this statement has no balances to check against'
                        : `${summary.v} of ${rows.length} rows are proven, ${summary.u} could not be checked`}
                </div>
                <div style={{ color: muted, fontSize: '0.88rem', marginTop: 4, lineHeight: 1.5 }}>
                  {summary.v} proven · {summary.f} to check · {summary.u} not checkable
                  {hasEdits && ' · re-checked after your edits'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={download} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', borderRadius: 10, padding: '9px 16px', fontWeight: 700, cursor: 'pointer' }}>Download CSV</button>
                <button onClick={saveAsSource} disabled={saving} style={{ background: grad, border: 'none', color: 'white', borderRadius: 10, padding: '9px 16px', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Saving…' : allClear ? 'Use in the app' : 'Use in the app anyway'}
                </button>
              </div>
            </div>
            {res.summary.fileFlags.length > 0 && (
              <ul style={{ margin: '12px 0 0', paddingLeft: 18, color: '#fde68a', fontSize: '0.88rem', lineHeight: 1.55 }}>
                {res.summary.fileFlags.map(f => <li key={f.code} style={f.severity === 'info' ? { color: muted } : undefined}>{f.message}</li>)}
              </ul>
            )}
            {hasEdits && res.summary.fileFlags.length > 0 && (
              <div style={{ color: muted, fontSize: '0.8rem', marginTop: 6 }}>The notes above come from the first read, before your edits.</div>
            )}
            {!res.dateOrderCertain && (
              <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: '0.88rem' }}>
                <span style={{ color: muted }}>Read dates as</span>
                {(['DMY', 'MDY'] as const).map(o => (
                  <button key={o} onClick={() => file && run(file, o)} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.18)', color: 'white', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontWeight: 600 }}>
                    {o === 'DMY' ? 'day/month (3 April = 03/04)' : 'month/day (4 March = 03/04)'}
                  </button>
                ))}
              </div>
            )}
            {res.truncated && <div style={{ color: '#fde68a', fontSize: '0.85rem', marginTop: 8 }}>Only the first 60 pages were read.</div>}
          </div>

          {totals && (
            <div style={{ ...card, marginTop: 14, padding: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10 }}>
                {([['Opening balance', totals.opening], ['Money in', totals.inn], ['Money out', totals.out], ['Closing balance', totals.closing]] as [string, number | null][]).map(([k, v]) => (
                  <div key={k}>
                    <div style={{ color: muted, fontSize: '0.78rem' }}>{k}</div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', fontVariantNumeric: 'tabular-nums' }}>{money(v)}</div>
                  </div>
                ))}
              </div>
              {totals.opening != null && totals.closing != null && (
                <div style={{ marginTop: 10, fontSize: '0.85rem', lineHeight: 1.5, color: totals.ties ? GREEN : AMBER }}>
                  {totals.ties
                    ? 'Opening balance, plus money in, minus money out, equals the closing balance.'
                    : 'Opening balance, plus money in, minus money out, does not equal the closing balance. Look at the marked rows.'}
                </div>
              )}
              <div style={{ color: muted, fontSize: '0.78rem', marginTop: 4 }}>{rows.length} transactions. Worked out from the rows below, so they change if you edit a number.</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 14, alignItems: 'center', margin: '16px 0 8px', flexWrap: 'wrap', fontSize: '0.88rem' }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer', color: muted }}>
              <input type="checkbox" checked={onlyCheck} onChange={e => setOnlyCheck(e.target.checked)} /> Show only rows to check ({summary.f + summary.u})
            </label>
            <span style={{ color: muted }}>Click a row to see it on the PDF. You can fix a number in the table and the check runs again.</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,520px),1fr))', gap: 14, alignItems: 'start' }}>
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <div style={{ maxHeight: '72vh', overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: 760, tableLayout: 'fixed' }}>
                  <colgroup><col style={{ width: 34 }} /><col style={{ width: 96 }} /><col style={{ width: 150 }} /><col /><col style={{ width: 96 }} /><col style={{ width: 96 }} /><col style={{ width: 108 }} /></colgroup>
                  <thead>
                    <tr style={{ position: 'sticky', top: 0, background: '#15102a', zIndex: 1, textAlign: 'left', color: muted }}>
                      {['', 'Date', 'Looks like', 'Description', 'Debit', 'Credit', 'Balance'].map((h, i) => (
                        <th key={i} title={h === 'Looks like' ? 'A best guess worked out from the description. The Description column is the bank’s exact text.' : undefined} style={{ padding: '10px 8px', fontWeight: 600, textAlign: i >= 4 ? 'right' : 'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map(r => {
                      const on = r.id === sel
                      const bg = on ? 'rgba(124,58,237,0.22)' : r.status === 'flagged' ? 'rgba(251,191,36,0.07)' : 'transparent'
                      return (
                        <tr key={r.id} onClick={() => setSel(r.id)} style={{ background: bg, cursor: 'pointer', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '4px 8px' }}><StatusDot s={r.status} title={r.status} /></td>
                          <td><input style={cellInput} value={r.date} onChange={e => edit(r.id, 'date', e.target.value)} /></td>
                          <td style={{ padding: '4px 8px', color: '#ddd6fe', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={tidy(r.description, r.ref).ref ? `Reference ${tidy(r.description, r.ref).ref}` : undefined}>{looksLike(tidy(r.description, r.ref)) || '–'}</td>
                          <td><input style={cellInput} value={r.description} title={r.description} onChange={e => edit(r.id, 'description', e.target.value)} /></td>
                          {(['debit', 'credit', 'balance'] as const).map(k => (
                            <td key={k}>
                              <input style={{ ...cellInput, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }} value={r[k] ?? ''} onChange={e => edit(r.id, k, e.target.value)} />
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                    {visible.length === 0 && <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: muted }}>Every row is proven.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ ...card, padding: 14, position: 'sticky', top: 12 }}>
              {selRow && selRow.flags.filter(f => f.severity === 'review').length > 0 && (
                <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.35)', borderRadius: 10, padding: '10px 12px', marginBottom: 10, color: '#fde68a', fontSize: '0.85rem', lineHeight: 1.55 }}>
                  {selRow.flags.filter(f => f.severity === 'review').map(f => <div key={f.code}>{f.message}</div>)}
                </div>
              )}
              {selRow && selRow.flags.filter(f => f.severity === 'info').map(f => (
                <div key={f.code} style={{ color: muted, fontSize: '0.8rem', marginBottom: 8, lineHeight: 1.5 }}>{f.message}</div>
              ))}
              <div style={{ color: muted, fontSize: '0.8rem', marginBottom: 8 }}>Page {pageNo} of {res.pages.length}</div>
              <div style={{ maxHeight: '66vh', overflow: 'auto', borderRadius: 8, background: 'white' }}>
                {page?.image ? (
                  <div style={{ position: 'relative', lineHeight: 0 }}>
                    <img src={page.image} alt={`Statement page ${page.page}`} style={{ width: '100%', display: 'block' }} />
                    {selRow && selRow.page === page.page && (
                      <div ref={hiRef} style={{
                        position: 'absolute',
                        left: `${(selRow.bbox[0] / page.width) * 100 - 0.6}%`, width: `${((selRow.bbox[2] - selRow.bbox[0]) / page.width) * 100 + 1.2}%`,
                        top: `${(selRow.bbox[1] / page.height) * 100 - 0.25}%`, height: `${((selRow.bbox[3] - selRow.bbox[1]) / page.height) * 100 + 0.5}%`,
                        border: `2px solid ${selRow.status === 'flagged' ? AMBER : '#7c3aed'}`, background: 'rgba(124,58,237,0.14)', borderRadius: 3, pointerEvents: 'none',
                      }} />
                    )}
                  </div>
                ) : <div style={{ padding: 30, textAlign: 'center', color: '#475569', lineHeight: 1.4 }}>The page preview is not available.</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button disabled={pageNo <= 1} onClick={() => { const r = rows.find(x => x.page === pageNo - 1); if (r) setSel(r.id) }} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', opacity: pageNo <= 1 ? 0.4 : 1 }}>Previous page</button>
                <button disabled={pageNo >= res.pages.length} onClick={() => { const r = rows.find(x => x.page === pageNo + 1); if (r) setSel(r.id) }} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', opacity: pageNo >= res.pages.length ? 0.4 : 1 }}>Next page</button>
              </div>
            </div>
          </div>
        </>
      )}

      <div style={{ ...card, marginTop: 22 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>How the check works</div>
        <div style={{ color: muted, fontSize: '0.88rem', lineHeight: 1.65 }}>
          A bank statement prints a balance after every row, so it can check itself: the previous balance plus this row’s amount must equal this row’s balance.
          Where that breaks, the row is marked and you are told why it might have happened (debit and credit swapped, two digits swapped, a row lost at a page break, a duplicate).
          The statement is also read a second way, and a row is marked if the two readings disagree. A row is only ever called proven when the numbers add up.
          What this cannot catch: a number that is wrong in a way that still adds up, a statement that prints no balances, or a scanned page. Those are labelled, not hidden.
        </div>
      </div>
    </div>
  )
}
