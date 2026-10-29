import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCredits } from '../credits'

const AUTH = (import.meta.env.VITE_AUTH_URL as string) || ''
const authHeaders = (): Record<string, string> => {
  const t = localStorage.getItem('datapro_token') || ''
  return t ? { Authorization: `Bearer ${t}` } : {}
}

type Receipt = {
  id: string; receiptNo: string; kind: 'credits' | 'subscription'; description: string
  amount: number; currency: 'INR' | 'USD'; credits: number; balanceAfter: number | null
  planKey: string | null; billingCycle: string | null; periodEnd: string | null
  razorpayPaymentId: string; customerEmail: string | null; customerName: string | null; createdAt: string
  business: { name: string; address: string; gstin: string; gstRate: number; supportEmail: string }
}

export const formatMoney = (n: number, c: 'INR' | 'USD') =>
  (c === 'USD' ? '$' : '\u20B9') + Number(n || 0).toLocaleString(c === 'USD' ? 'en-US' : 'en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const day = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '')

function ReceiptView({ id }: { id: string }) {
  const [r, setR] = useState<Receipt | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    fetch(`${AUTH}/api/payments/${encodeURIComponent(id)}`, { headers: authHeaders() })
      .then(async res => (res.ok ? setR(await res.json()) : setErr(res.status === 404 ? 'We could not find that receipt.' : 'Please sign in to view this receipt.')))
      .catch(() => setErr('Could not reach the server.'))
  }, [id])
  if (err) return <div className="p-8"><p style={{ color: '#f87171' }}>{err}</p><Link to="/billing" className="underline text-sm text-white">Back to billing</Link></div>
  if (!r) return <div className="p-8"><p style={{ color: 'rgba(255,255,255,0.4)' }}>Loading receipt…</p></div>

  const b = r.business
  const tax = b.gstRate > 0 ? r.amount - r.amount / (1 + b.gstRate / 100) : 0
  const title = b.gstin ? 'Tax invoice' : 'Payment receipt'
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <style>{`@media print { body * { visibility: hidden } #receipt-print, #receipt-print * { visibility: visible } #receipt-print { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important } .no-print { display: none !important } }`}</style>
      <div className="no-print flex items-center justify-between mb-4">
        <Link to="/billing" className="text-sm underline" style={{ color: '#c4b5fd' }}>← All payments</Link>
        <button onClick={() => window.print()} className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}>Print / Save as PDF</button>
      </div>
      <div id="receipt-print" style={{ background: '#fff', color: '#0f172a', borderRadius: 14, padding: 32, fontFamily: '-apple-system, Segoe UI, sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{b.name}</div>
            {b.address && <div style={{ fontSize: 12, color: '#475569', whiteSpace: 'pre-line' }}>{b.address}</div>}
            {b.gstin && <div style={{ fontSize: 12, color: '#475569' }}>GSTIN: {b.gstin}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
            <div style={{ fontSize: 13, color: '#475569' }}>No. {r.receiptNo}</div>
            <div style={{ fontSize: 13, color: '#475569' }}>{day(r.createdAt)}</div>
            <div style={{ display: 'inline-block', marginTop: 6, padding: '2px 10px', border: '1.5px solid #16a34a', color: '#16a34a', borderRadius: 6, fontWeight: 700, fontSize: 12 }}>PAID</div>
          </div>
        </div>
        <div style={{ margin: '22px 0 6px', fontSize: 12, color: '#64748b' }}>BILLED TO</div>
        <div style={{ fontSize: 14 }}>{r.customerName || '—'}<br />{r.customerEmail || ''}</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 22, fontSize: 14 }}>
          <thead><tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: 12 }}><th style={{ padding: '8px 0' }}>Item</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '10px 0' }}>{r.description}{r.kind === 'subscription' && r.periodEnd ? <div style={{ fontSize: 12, color: '#64748b' }}>Access paid until {day(r.periodEnd)}</div> : null}</td>
              <td style={{ textAlign: 'right' }}>{formatMoney(r.amount - tax, r.currency)}</td>
            </tr>
            {tax > 0 && <tr><td style={{ padding: '8px 0', color: '#475569' }}>GST @ {b.gstRate}%</td><td style={{ textAlign: 'right' }}>{formatMoney(tax, r.currency)}</td></tr>}
            <tr style={{ borderTop: '2px solid #0f172a', fontWeight: 800 }}><td style={{ padding: '10px 0' }}>Total paid</td><td style={{ textAlign: 'right' }}>{formatMoney(r.amount, r.currency)}</td></tr>
          </tbody>
        </table>
        {r.kind === 'credits' && (
          <div style={{ marginTop: 14, fontSize: 13, color: '#334155' }}>
            Credits added: <b>{r.credits.toLocaleString('en-IN')}</b>{r.balanceAfter != null ? <> · Balance after this payment: <b>{r.balanceAfter.toLocaleString('en-IN')}</b></> : null}
          </div>
        )}
        <div style={{ marginTop: 20, fontSize: 12, color: '#64748b' }}>Payment ID: {r.razorpayPaymentId}<br />Questions? {b.supportEmail}</div>
      </div>
    </div>
  )
}

function History() {
  const [rows, setRows] = useState<Receipt[] | null>(null)
  const [err, setErr] = useState('')
  const { credits } = useCredits()
  useEffect(() => {
    fetch(`${AUTH}/api/payments`, { headers: authHeaders() })
      .then(async res => (res.ok ? setRows(await res.json()) : setErr('Please sign in to see your billing history.')))
      .catch(() => setErr('Could not reach the server.'))
  }, [])
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Billing & receipts</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Every payment, with a receipt you can print or save as PDF.</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>AI credits</div>
          <div className="text-2xl font-extrabold" style={{ color: '#34d399' }}>{credits.toLocaleString('en-IN')}</div>
          <a href="/pricing#credits" className="text-xs underline" style={{ color: '#c4b5fd' }}>Buy more</a>
        </div>
      </div>
      {err && <p style={{ color: '#f87171' }}>{err}</p>}
      {!err && !rows && <p style={{ color: 'rgba(255,255,255,0.4)' }}>Loading…</p>}
      {rows && rows.length === 0 && <p style={{ color: 'rgba(255,255,255,0.5)' }}>No payments yet. When you buy credits or a plan, your receipt appears here.</p>}
      <div className="space-y-2">
        {(rows || []).map(r => (
          <Link key={r.id} to={`/billing/${r.id}`} className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{r.description}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{day(r.createdAt)} · {r.receiptNo}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-white">{formatMoney(r.amount, r.currency)}</p>
              <p className="text-xs underline" style={{ color: '#c4b5fd' }}>View receipt</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function Billing() {
  const { id } = useParams()
  return id ? <ReceiptView id={id} /> : <History />
}
