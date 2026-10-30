import { useEffect, useState } from 'react'
import type { ReactNode, FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { API_BASE } from '../config'
import './blog.css'

export const SITE = 'https://thegodstool.com'

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el) }
  el.setAttribute('content', content)
}

/** Sets the page title, description, share-card tags and structured data for search engines, and restores them on leaving. */
export function useSeo(opts: { title: string; description: string; path: string; type?: 'website' | 'article'; jsonLd?: object }) {
  const { title, description, path, type = 'website', jsonLd } = opts
  const ld = jsonLd ? JSON.stringify(jsonLd) : ''
  useEffect(() => {
    const prevTitle = document.title
    const keys: [('name' | 'property'), string, string][] = [
      ['name', 'description', description], ['property', 'og:title', title], ['property', 'og:description', description],
      ['property', 'og:url', SITE + path], ['property', 'og:type', type], ['name', 'twitter:title', title], ['name', 'twitter:description', description],
    ]
    const prev = keys.map(([a, k]) => [a, k, document.head.querySelector<HTMLMetaElement>(`meta[${a}="${k}"]`)?.getAttribute('content') ?? null] as const)
    document.title = title
    keys.forEach(([a, k, v]) => setMeta(a, k, v))
    let canon = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    const prevCanon = canon?.getAttribute('href') ?? null
    if (!canon) { canon = document.createElement('link'); canon.rel = 'canonical'; document.head.appendChild(canon) }
    canon.href = SITE + path
    let script: HTMLScriptElement | null = null
    if (ld) { script = document.createElement('script'); script.type = 'application/ld+json'; script.text = ld; document.head.appendChild(script) }
    return () => {
      document.title = prevTitle
      prev.forEach(([a, k, v]) => { if (v !== null) setMeta(a, k, v) })
      if (canon) { if (prevCanon) canon.href = prevCanon; else canon.remove() }
      script?.remove()
    }
  }, [title, description, path, type, ld])
}

export function BlogShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  useEffect(() => { if (!window.location.hash) window.scrollTo(0, 0) }, [pathname])
  return (
    <div className="gb-root">
      <nav className="gb-nav" aria-label="Main">
        <Link to="/" className="gb-brand">The God's Tool</Link>
        <div className="gb-navlinks">
          <Link to="/blog" className="on">Blog</Link>
          <Link to="/pricing" className="hide-sm">Pricing</Link>
          <a href="/blog/rss.xml" className="hide-sm" title="RSS feed">RSS</a>
          <Link to="/" className="gb-btn">Try it free</Link>
        </div>
      </nav>
      {children}
      <footer className="gb-footer">
        <div>
          <Link to="/">Home</Link><Link to="/blog">Blog</Link><Link to="/pricing">Pricing</Link><Link to="/contact">Contact</Link><Link to="/terms">Terms</Link>
        </div>
        <div style={{ marginTop: 10 }}>© {new Date().getFullYear()} The God's Tool</div>
      </footer>
    </div>
  )
}

/** "Tell me when there is a new post". Uses the existing contact form, so each sign-up reaches your contact inbox. */
export function NotifyForm({ heading = 'Get new posts the day they go live', text = 'Short, practical posts about cleaning data. No spam, and you can ask us to stop any time.' }: { heading?: string; text?: string }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const clean = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) { setState('error'); setMsg('Please enter a valid email address.'); return }
    setState('sending'); setMsg('')
    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Blog subscriber', email: clean, message: 'Please notify me when new blog posts are published.' }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok && d.success !== false) { setState('done'); setMsg("You're on the list. We'll email you when the next post is live."); setEmail('') }
      else { setState('error'); setMsg(d.error || 'Something went wrong. Please try again in a moment.') }
    } catch { setState('error'); setMsg('We could not reach the server. Please try again in a moment.') }
  }
  return (
    <div className="gb-notify">
      <h3>{heading}</h3>
      <p>{text}</p>
      <form className="gb-form" onSubmit={submit} noValidate>
        <input type="email" aria-label="Your email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} disabled={state === 'sending' || state === 'done'} />
        <button className="gb-btn" type="submit" disabled={state === 'sending' || state === 'done'}>{state === 'sending' ? 'Sending…' : state === 'done' ? 'Done ✓' : 'Notify me'}</button>
      </form>
      {msg && <div className="gb-note" role="status" style={{ color: state === 'done' ? '#34d399' : '#fca5a5' }}>{msg}</div>}
    </div>
  )
}

export function ArtIcon() {
  return (
    <svg width="76" height="76" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5h16M4 10h10M4 15h16M4 20h7" />
    </svg>
  )
}
