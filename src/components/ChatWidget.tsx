import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { API_BASE } from '../config'
import { APP_HOST, SITE_HOSTS } from '../hosts'
import { track } from '../analytics'

// Support chat for the public site. It only ever answers from the website's own text (see site_chat.py).
// It never opens by itself, never makes a sound, never shows a badge: the visitor decides. The chat lives in memory
// (and in session storage when the browser allows it), so a private window simply starts fresh each time.

type Msg = { role: 'user' | 'assistant'; content: string }
const EMAIL = 'contact@thegodstool.com'
const STARTERS = ['What does it do?', 'Is there a free plan?', 'Does the AI see my data?']
const GREETING: Msg = { role: 'assistant', content: 'Hi. Ask me anything about The God\'s Tool: what it does, plans, limits or how the free try works.' }

const read = (k: string) => { try { return sessionStorage.getItem(k) } catch { return null } }
const write = (k: string, v: string) => { try { sessionStorage.setItem(k, v) } catch { /* private window: fine, stays in memory */ } }

// Turns /try.html, /pricing and the support email in a reply into links. Nothing else is interpreted.
function linkify(text: string): ReactNode[] {
  const re = /(contact@thegodstool\.com|\/(?:try\.html|pricing|about\.html|faq\.html|contact|blog|privacy\.html|terms\.html|refund\.html)\b)/g
  return text.split(re).map((part, i) => {
    if (i % 2 === 0) return part
    const href = part.includes('@') ? `mailto:${part}` : part
    return <a key={i} href={href} style={{ color: '#c4b5fd', textDecoration: 'underline' }}>{part}</a>
  })
}

export default function ChatWidget() {
  // Public site pages, plus the app address while it is still showing the public landing page to someone who is signed out.
  const loggedIn = (() => { try { return !!localStorage.getItem('datapro_logged_in') } catch { return false } })()
  const onSite = SITE_HOSTS.includes(window.location.hostname) || import.meta.env.DEV
    || (window.location.hostname === APP_HOST && window.location.pathname === '/' && !loggedIn)
  const [hidden, setHidden] = useState(() => read('gt_chat_hidden') === '1')
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>(() => { try { const j = JSON.parse(read('gt_chat') || '[]'); return Array.isArray(j) && j.length ? j : [GREETING] } catch { return [GREETING] } })
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [more, setMore] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { write('gt_chat', JSON.stringify(msgs.slice(-20))); endRef.current?.scrollIntoView({ block: 'end' }) }, [msgs, open])
  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open])

  if (!onSite || hidden) return null

  const send = async (q: string) => {
    const content = q.trim().slice(0, 600)
    if (!content || busy) return
    const next: Msg[] = [...msgs, { role: 'user', content }]
    setMsgs(next); setText(''); setBusy(true)
    track('chat_message_sent', {}, 1000)
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 30000)
    try {
      // The greeting is ours, not part of the conversation the model should see.
      const history = next.filter(m => m !== GREETING && m.content !== GREETING.content).slice(-8)
      const r = await fetch(`${API_BASE}/api/public/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history }), signal: ctl.signal, credentials: 'omit' })
      const j = await r.json().catch(() => ({}))
      if (r.ok && j.ok && j.reply) setMsgs(m => [...m, { role: 'assistant', content: String(j.reply) }])
      else { track('chat_error', { code: String(j.code || r.status) }); setMsgs(m => [...m, { role: 'assistant', content: String(j.error || `I could not answer that just now. Please email ${EMAIL}.`) }]) }
    } catch {
      track('chat_error', { code: 'network' })
      setMsgs(m => [...m, { role: 'assistant', content: `I could not reach the server. Please try again, or email ${EMAIL}.` }])
    } finally { clearTimeout(timer); setBusy(false) }
  }

  const toggle = () => { setOpen(o => { if (!o) track('chat_open'); return !o }) }
  const hide = () => { setOpen(false); setHidden(true); write('gt_chat_hidden', '1') }

  return (
    <div className="gt-chat" style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 9000, fontFamily: "'Inter', sans-serif" }}>
      {open && (
        <div role="dialog" aria-label="Ask about The God's Tool" className="gt-chat-panel" style={{ width: 360, maxWidth: 'calc(100vw - 24px)', height: 520, maxHeight: 'calc(100vh - 96px)', display: 'flex', flexDirection: 'column', background: '#0d0a1f', border: '1px solid rgba(167,139,250,0.35)', borderRadius: 16, boxShadow: '0 16px 50px rgba(0,0,0,0.55)', marginBottom: 10, overflow: 'hidden', color: '#f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ flex: 1, fontWeight: 800, fontSize: '0.95rem' }}>Ask about The God&rsquo;s Tool</div>
            <a href={`mailto:${EMAIL}`} style={{ ...hbtn, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }} title="Email a person">Email us</a>
            <button onClick={hide} style={hbtn} title="Hide the chat button for this visit">Hide</button>
            <button onClick={() => setOpen(false)} aria-label="Close chat" style={{ ...hbtn, fontSize: '1.2rem', lineHeight: 1 }}>×</button>
          </div>
          <div style={{ padding: '8px 14px', fontSize: '0.74rem', lineHeight: 1.5, color: 'rgba(255,255,255,0.68)', background: 'rgba(124,58,237,0.08)', borderBottom: '1px solid rgba(255,255,255,0.06)', maxHeight: more ? 180 : undefined, overflowY: 'auto' }}>
            Automated assistant. I answer from this website&rsquo;s public pages only and I cannot see your files or account. Please do not type passwords or personal data.{' '}
            {!more && <button onClick={() => setMore(true)} style={{ background: 'none', border: 'none', color: '#c4b5fd', textDecoration: 'underline', cursor: 'pointer', fontSize: 'inherit', padding: 0 }}>Read the full note</button>}
            {more && <>
              <br /><br />I cannot see your files, rows or account in any AI privacy mode (private or sample sharing), so I cannot help with a specific file. Your messages are sent to our AI provider (Anthropic) to write the reply, and we do not save this chat. I can be wrong, so check prices and limits on the <a href="/pricing" style={{ color: '#c4b5fd' }}>pricing page</a>. For anything else, email <a href={`mailto:${EMAIL}`} style={{ color: '#c4b5fd' }}>{EMAIL}</a>.{' '}
              <button onClick={() => setMore(false)} style={{ background: 'none', border: 'none', color: '#c4b5fd', textDecoration: 'underline', cursor: 'pointer', fontSize: 'inherit', padding: 0 }}>Show less</button>
            </>}
          </div>
          <div role="log" aria-live="polite" style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', background: m.role === 'user' ? '#7c3aed' : 'rgba(255,255,255,0.07)', borderRadius: 12, padding: '9px 12px', fontSize: '0.88rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{m.role === 'assistant' ? linkify(m.content) : m.content}</div>
            ))}
            {msgs.length === 1 && !busy && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {STARTERS.map(s => <button key={s} onClick={() => send(s)} style={{ background: 'transparent', border: '1px solid rgba(167,139,250,0.5)', color: '#ddd6fe', borderRadius: 999, padding: '7px 12px', fontSize: '0.8rem', cursor: 'pointer', minHeight: 36 }}>{s}</button>)}
              </div>
            )}
            {busy && <div style={{ alignSelf: 'flex-start', color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem' }}>Thinking…</div>}
            <div ref={endRef} />
          </div>
          <form onSubmit={e => { e.preventDefault(); send(text) }} style={{ display: 'flex', gap: 8, padding: 10, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <textarea ref={inputRef} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(text) } }} rows={1} maxLength={600} placeholder="Type your question" aria-label="Your question"
              style={{ flex: 1, resize: 'none', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: 'white', padding: '10px 12px', fontSize: '16px', fontFamily: 'inherit', minHeight: 44, boxSizing: 'border-box' }} />
            <button type="submit" disabled={busy || !text.trim()} style={{ background: '#7c3aed', border: 'none', color: 'white', borderRadius: 10, padding: '0 16px', fontWeight: 700, cursor: busy || !text.trim() ? 'default' : 'pointer', opacity: busy || !text.trim() ? 0.5 : 1, minHeight: 44 }}>Send</button>
          </form>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={toggle} aria-expanded={open} aria-label={open ? 'Close chat' : 'Ask a question about The God\'s Tool'} className="gt-chat-btn"
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1b1236', border: '1px solid rgba(167,139,250,0.55)', color: '#e9d5ff', borderRadius: 999, padding: '0 16px', minHeight: 44, fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', boxShadow: '0 6px 20px rgba(0,0,0,0.4)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" /></svg>
          {open ? 'Close' : 'Ask a question'}
        </button>
      </div>
    </div>
  )
}

const hbtn = { background: 'none', border: 'none', color: 'rgba(255,255,255,0.65)', cursor: 'pointer', fontSize: '0.78rem', padding: '6px 8px', minHeight: 32 } as const
