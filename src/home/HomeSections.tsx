import { useState } from 'react'
import type { ComponentType, FormEvent } from 'react'
import content from './content.json'
import './home.css'

type IconType = ComponentType<{ name: string; size?: number; color?: string }>

function Head({ id, h2, intro }: { id?: string; h2: string; intro?: string }) {
  return (
    <header className="hm-head">
      <h2 id={id}>{h2}</h2>
      {intro && <p>{intro}</p>}
    </header>
  )
}

export function scrollToQuote() {
  document.getElementById(content.quote.id)?.scrollIntoView({ behavior: 'smooth' })
}

export function ProblemSection() {
  const p = content.problem
  return (
    <section className="hm-sec" aria-labelledby="hm-problem">
      <Head id="hm-problem" h2={p.h2} intro={p.intro} />
      <div className="hm-grid hm-grid-3">
        {p.items.map(it => (
          <div key={it.title} className="hm-card">
            <h3>{it.title}</h3>
            <p>{it.body}</p>
          </div>
        ))}
      </div>
      <p className="hm-fix">{p.fix}</p>
    </section>
  )
}

export function AudienceSection({ onRegister }: { onRegister: () => void }) {
  const a = content.audience
  return (
    <section className="hm-sec" aria-labelledby="hm-audience">
      <Head id="hm-audience" h2={a.h2} />
      <div className="hm-grid hm-grid-3">
        {a.items.map(it => (
          <div key={it.title} className="hm-card">
            <h3>{it.title}</h3>
            <p>{it.body}</p>
            <button className="hm-link" onClick={it.action === 'quote' ? scrollToQuote : onRegister}>{it.cta} →</button>
          </div>
        ))}
      </div>
    </section>
  )
}

export function FeaturesSection({ Icon }: { Icon: IconType }) {
  const f = content.features
  return (
    <section id="features" className="hm-sec" aria-labelledby="hm-features">
      <Head id="hm-features" h2={f.h2} intro={f.intro} />
      <div className="hm-grid hm-grid-4">
        {f.items.map(it => (
          <div key={it.title} className="hm-card">
            <div className="hm-icon"><Icon name={it.icon} size={26} /></div>
            <h3>{it.title}</h3>
            <p>{it.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export function StepsSection({ Icon, onRegister }: { Icon: IconType; onRegister: () => void }) {
  const s = content.steps
  return (
    <section id="how" className="hm-sec hm-tint" aria-labelledby="hm-steps">
      <div className="hm-narrow">
        <Head id="hm-steps" h2={s.h2} />
        <ol className="hm-steps">
          {s.items.map((it, i) => (
            <li key={it.title}>
              <span className="hm-num">{i + 1}</span>
              <div>
                <h3><Icon name={it.icon} size={18} color="#a78bfa" /> {it.title}</h3>
                <p>{it.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="hm-center"><button className="cta-btn" onClick={onRegister}>{content.hero.primary}</button></div>
      </div>
    </section>
  )
}

export function QuoteSection() {
  const q = content.quote
  const [form, setForm] = useState({ name: '', email: '', role: q.roles[0], need: q.needs[0], volume: q.volumes[0], team: q.teams[0], details: '', website: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [err, setErr] = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (form.website) { setStatus('sent'); return } // honeypot, bots only
    if (!form.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setErr('Please add your name and a valid email.')
      setStatus('error')
      return
    }
    setStatus('sending')
    setErr('')
    const message = [
      'QUOTE REQUEST',
      `I am: ${form.role}`,
      `Looking for: ${form.need}`,
      `Volume: ${form.volume}`,
      `Team size: ${form.team}`,
      '',
      form.details.trim() || '(no details given)',
    ].join('\n')
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), message }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        setErr(data.error || `Something went wrong. You can also email ${content.site.email}.`)
        setStatus('error')
        return
      }
      setStatus('sent')
    } catch {
      setErr(`Couldn't reach the server. You can email ${content.site.email} instead.`)
      setStatus('error')
    }
  }

  return (
    <section id={q.id} className="hm-sec hm-tint" aria-labelledby="hm-quote">
      <div className="hm-quote">
        <div>
          <h2 id="hm-quote">{q.h2}</h2>
          <p className="hm-lead">{q.body}</p>
          <ul className="hm-points">
            {q.points.map(p => <li key={p}>{p}</li>)}
          </ul>
          <p className="hm-small">{q.note}</p>
        </div>
        {status === 'sent' ? (
          <div className="hm-form hm-thanks" role="status">{q.thanks}</div>
        ) : (
          <form className="hm-form" onSubmit={submit} noValidate>
            <label>Name
              <input value={form.name} onChange={e => set('name', e.target.value)} autoComplete="name" required />
            </label>
            <label>Email
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} autoComplete="email" required />
            </label>
            <label>I am a
              <select value={form.role} onChange={e => set('role', e.target.value)}>
                {q.roles.map(r => <option key={r}>{r}</option>)}
              </select>
            </label>
            <label>Looking for
              <select value={form.need} onChange={e => set('need', e.target.value)}>
                {q.needs.map(r => <option key={r}>{r}</option>)}
              </select>
            </label>
            <label>Volume
              <select value={form.volume} onChange={e => set('volume', e.target.value)}>
                {q.volumes.map(r => <option key={r}>{r}</option>)}
              </select>
            </label>
            <label>Team size
              <select value={form.team} onChange={e => set('team', e.target.value)}>
                {q.teams.map(r => <option key={r}>{r}</option>)}
              </select>
            </label>
            <label><span>What does your data look like? <span className="hm-opt">(optional)</span></span>
              <textarea rows={4} value={form.details} maxLength={1500} onChange={e => set('details', e.target.value)}
                placeholder="e.g. about 20 client CSVs a month, 50k rows each, mostly dates and duplicate customers" />
            </label>
            <input className="hm-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={e => set('website', e.target.value)} />
            {status === 'error' && <div className="hm-err" role="alert">{err}</div>}
            <button className="cta-btn" type="submit" disabled={status === 'sending'}>{status === 'sending' ? 'Sending...' : q.button}</button>
          </form>
        )}
      </div>
    </section>
  )
}

export function FaqSection() {
  const f = content.faq
  return (
    <section id="faq" className="hm-sec" aria-labelledby="hm-faq">
      <div className="hm-narrow">
        <Head id="hm-faq" h2={f.h2} />
        {f.items.map(it => (
          <details key={it.q} className="hm-faq">
            <summary>{it.q}</summary>
            <p>{it.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
