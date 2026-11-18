// "What's new" card on the Dashboard, and the helpers the full list page shares.
// How it works: the Node service remembers the last time this person saw the updates (/api/updates/seen).
// We show every entry in src/updates.json that is newer than that date. Dismissing the card (or having nothing new)
// marks "seen now". A brand new account has no date yet, so it sees nothing and starts counting from now.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AUTH_BASE } from '../config'
import updatesData from '../updates.json'

export type UpdateEntry = {
  id: string
  date: string // full time in UTC, e.g. 2026-11-17T09:00:00Z
  title: string
  text: string // what changed
  youCan: string // what the person can do about it now
  link?: string // a page inside the app, or a full address
  linkLabel?: string
}

// Newest first.
export const ALL_UPDATES: UpdateEntry[] = [...(updatesData as UpdateEntry[])].sort(
  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
)

export function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Update links can be a path in the app ("/status") or a full address.
export function UpdateLink({ u }: { u: UpdateEntry }) {
  if (!u.link) return null
  const style = { color: '#a78bfa', fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none' as const }
  const label = `${u.linkLabel || 'Open'} →`
  return /^https?:/.test(u.link) ? (
    <a href={u.link} target="_blank" rel="noreferrer" style={style}>
      {label}
    </a>
  ) : (
    <Link to={u.link} style={style}>
      {label}
    </Link>
  )
}

function token(): string {
  try {
    return localStorage.getItem('datapro_token') || ''
  } catch {
    return ''
  }
}

const MAX_SHOWN = 4
const REFRESH_MS = 12 * 60 * 60 * 1000
const AWAY_DAYS = 7 // after this long we also say "welcome back"

export default function WhatsNewCard() {
  const [fresh, setFresh] = useState<UpdateEntry[]>([])
  const [awayDays, setAwayDays] = useState(0)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    const auth = { Authorization: `Bearer ${token()}` }
    const markSeen = () => fetch(`${AUTH_BASE}/api/updates/seen`, { method: 'POST', headers: auth }).catch(() => {})
    let alive = true
    fetch(`${AUTH_BASE}/api/updates/seen`, { headers: auth })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then((d: { seenAt: string | null }) => {
        if (!alive) return
        if (!d.seenAt) return void markSeen() // first time: nothing to compare with yet
        const since = new Date(d.seenAt).getTime()
        const news = ALL_UPDATES.filter(u => new Date(u.date).getTime() > since)
        // Nothing new: only refresh the date now and then (at most about twice a day) so the database is barely touched.
        if (news.length === 0) return void (Date.now() - since > REFRESH_MS && markSeen())
        setAwayDays(Math.floor((Date.now() - since) / 86400000))
        setFresh(news)
      })
      .catch(() => {
        /* the card is optional: if the service does not answer we simply show nothing */
      })
    return () => {
      alive = false
    }
  }, [])

  if (gone || fresh.length === 0) return null
  const shown = fresh.slice(0, MAX_SHOWN)
  const extra = fresh.length - shown.length

  const dismiss = () => {
    setGone(true)
    fetch(`${AUTH_BASE}/api/updates/seen`, { method: 'POST', headers: { Authorization: `Bearer ${token()}` } }).catch(
      () => {}
    )
  }

  return (
    <div
      style={{
        background: 'linear-gradient(135deg,rgba(124,58,237,0.18),rgba(255,255,255,0.02))',
        border: '1px solid rgba(167,139,250,0.35)',
        borderRadius: 16,
        padding: 20,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: 'white', fontWeight: 800, fontSize: '1.05rem' }}>
            What's new since you were last here
          </div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.86rem', marginTop: 2 }}>
            {awayDays >= AWAY_DAYS
              ? `You were away for ${awayDays} days. Here is what changed while you were gone.`
              : 'Here is what we changed since your last visit.'}
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss updates"
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'rgba(255,255,255,0.8)',
            borderRadius: 8,
            padding: '4px 10px',
            cursor: 'pointer',
            fontSize: '0.8rem',
            whiteSpace: 'nowrap',
          }}
        >
          Got it
        </button>
      </div>
      <div style={{ display: 'grid', gap: 14, marginTop: 14 }}>
        {shown.map(u => (
          <div key={u.id} style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12 }}>
            <div style={{ color: 'white', fontWeight: 700 }}>
              {u.title}{' '}
              <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400, fontSize: '0.78rem' }}>
                {dateLabel(u.date)}
              </span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '2px 0 4px' }}>{u.text}</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
              {u.youCan} <UpdateLink u={u} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, fontSize: '0.85rem' }}>
        <Link to="/whats-new" style={{ color: '#a78bfa', textDecoration: 'none' }}>
          {extra > 0 ? `And ${extra} more. See all updates →` : 'See all updates →'}
        </Link>
      </div>
    </div>
  )
}
