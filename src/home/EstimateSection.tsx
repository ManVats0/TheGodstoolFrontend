import { useMemo, useState } from 'react'
import content from './content.json'
import { estimate, fmt, type Cur } from './estimate'
import logo from '../../the_gods_tool_logo_3d.png'
import { scrollToQuote } from './HomeSections'

const num = (v: string) => (v === '' ? 0 : Number(v.replace(/[^0-9]/g, '')))

function Field({ label, hint, value, onChange }: { label: string; hint?: string; value: string; onChange: (v: string) => void }) {
  return (
    <label>
      <span>{label}{hint && <span className="hm-opt"> {hint}</span>}</span>
      <input inputMode="numeric" value={value} onChange={e => onChange(e.target.value.replace(/[^0-9]/g, ''))} />
    </label>
  )
}

export function EstimateSection() {
  const t = content.estimate
  const [v, setV] = useState({ files: '20', rows: '5000', aiPerFile: '5', sources: '1', seats: '1' })
  const [cur, setCur] = useState<Cur>('USD')
  const [who, setWho] = useState({ name: '', email: '', company: '' })
  const [tell, setTell] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const set = (k: keyof typeof v) => (x: string) => setV(s => ({ ...s, [k]: x }))

  const inputs = useMemo(() => ({
    files: num(v.files), rows: num(v.rows), aiPerFile: num(v.aiPerFile), sources: Math.max(1, num(v.sources)), seats: Math.max(1, num(v.seats)), cur,
  }), [v, cur])
  const est = useMemo(() => estimate(inputs), [inputs])

  const download = async () => {
    setMsg('')
    if (tell && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(who.email)) { setMsg('Add a valid email so the team can reach you.'); return }
    setBusy(true)
    try {
      const { makeEstimatePdf } = await import('./estimatePdf')
      const pdf = await makeEstimatePdf(inputs, who, logo)
      pdf.save()
      if (tell) {
        const text = ['ESTIMATE DOWNLOADED', `Company: ${who.company || '-'}`, `Files/month: ${inputs.files}, rows/file: ${inputs.rows}, AI actions/file: ${inputs.aiPerFile}`,
          `Sources: ${inputs.sources}, logins: ${inputs.seats}`, `Recommended: ${est.best ? `${est.best.name} ${fmt(est.best.total, cur, true)}/month` : 'custom'}`, `Ref: ${pdf.file}`].join('\n')
        fetch(`${import.meta.env.VITE_API_URL}/api/contact`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: who.name.trim() || 'Estimate visitor', email: who.email.trim(), message: text }),
        }).catch(() => {})
      }
      setMsg('Downloaded. Check your downloads folder.')
    } catch {
      setMsg('Could not make the PDF. Please try again.')
    } finally { setBusy(false) }
  }

  return (
    <section id={t.id} className="hm-sec" aria-labelledby="hm-est">
      <header className="hm-head"><h2 id="hm-est">{t.h2}</h2><p>{t.body}</p></header>
      <div className="hm-est">
        <div className="hm-form">
          <div className="hm-two">
            <Field label="Files cleaned a month" value={v.files} onChange={set('files')} />
            <Field label="Rows in a typical file" value={v.rows} onChange={set('rows')} />
            <Field label="AI actions per file" hint="(about 5 is common)" value={v.aiPerFile} onChange={set('aiPerFile')} />
            <Field label="Data sources" value={v.sources} onChange={set('sources')} />
            <Field label="People logging in" value={v.seats} onChange={set('seats')} />
            <label><span>Currency</span>
              <select value={cur} onChange={e => setCur(e.target.value as Cur)}><option value="USD">US dollars</option><option value="INR">Indian rupees</option></select>
            </label>
          </div>
        </div>
        <div className="hm-form" aria-live="polite">
          {est.custom || !est.best ? (
            <>
              <p className="hm-lead" style={{ margin: 0 }}>{t.customMsg}</p>
              <button className="cta-btn" onClick={scrollToQuote}>Get a quote</button>
            </>
          ) : (
            <>
              <div className="hm-recommend">Best fit: {est.best.name}</div>
              <div className="hm-total">{fmt(est.best.total, cur)}<span> / month</span></div>
              <ul className="hm-lines">{est.best.lines.map(l => <li key={l.label + l.detail}><span>{l.label}<small>{l.detail}</small></span><b>{fmt(l.amount, cur)}</b></li>)}</ul>
              {est.others.length > 0 && <p className="hm-small">Also fits: {est.others.map(o => `${o.name} (${fmt(o.total, cur)})`).join(', ')}</p>}
              {est.notes.map(n => <p className="hm-small" key={n}>{n}</p>)}
              <div className="hm-two">
                <label><span>Your name <span className="hm-opt">(optional)</span></span><input value={who.name} onChange={e => setWho(s => ({ ...s, name: e.target.value }))} autoComplete="name" /></label>
                <label><span>Company <span className="hm-opt">(optional)</span></span><input value={who.company} onChange={e => setWho(s => ({ ...s, company: e.target.value }))} autoComplete="organization" /></label>
              </div>
              <label><span>Email <span className="hm-opt">(optional)</span></span><input type="email" value={who.email} onChange={e => setWho(s => ({ ...s, email: e.target.value }))} autoComplete="email" /></label>
              <label className="hm-check"><input type="checkbox" checked={tell} onChange={e => setTell(e.target.checked)} /> {t.optin}</label>
              {msg && <div className={msg.startsWith('Downloaded') ? 'hm-ok' : 'hm-err'} role="status">{msg}</div>}
              <button className="cta-btn" onClick={download} disabled={busy}>{busy ? 'Making your PDF...' : t.button}</button>
              <p className="hm-small">{t.note}</p>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
