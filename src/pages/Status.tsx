import { useEffect } from 'react'
import { useStatus, liveChecksEnabled } from '../status'
import type { Level, Live } from '../status'

const colour: Record<Level, string> = {
  operational: '#34d399',
  maintenance: '#60a5fa',
  degraded: '#fbbf24',
  outage: '#f87171',
}
const headline: Record<Level, string> = {
  operational: 'All systems working',
  maintenance: 'Planned maintenance',
  degraded: 'Some systems have problems',
  outage: 'Major problem',
}
const card = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 14,
  padding: 18,
} as const
const when = (s: string) => {
  const d = new Date(s)
  return isNaN(d.getTime()) ? s : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function Row({ name, desc, state }: { name: string; desc: string; state: Live | 'static' }) {
  const label = state === 'down' ? 'Not answering' : state === 'checking' ? 'Checking' : 'Working'
  const c = state === 'down' ? colour.outage : state === 'checking' ? 'rgba(255,255,255,0.4)' : colour.operational
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        padding: '12px 0',
        borderTop: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div>
        <div style={{ fontWeight: 700 }}>{name}</div>
        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem' }}>{desc}</div>
      </div>
      <div style={{ color: c, fontWeight: 700, whiteSpace: 'nowrap' }}>{label}</div>
    </div>
  )
}

export default function Status() {
  const { file, checks, level } = useStatus(30000)
  useEffect(() => {
    document.title = "Status | The God's Tool"
    const m = document.createElement('meta')
    m.name = 'robots'
    m.content = 'noindex'
    document.head.appendChild(m)
    return () => {
      m.remove()
    }
  }, [])
  const open = file.incidents.filter(i => i.status !== 'resolved')
  const past = file.incidents.filter(i => i.status === 'resolved')
  const shownMsg = file.message
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#05030f',
        color: 'white',
        fontFamily: "'Inter', sans-serif",
        padding: '28px 18px 60px',
      }}
    >
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <a href="/" style={{ color: '#c4b5fd', textDecoration: 'none', fontWeight: 700 }}>
          The God&rsquo;s Tool
        </a>
        <h1 style={{ fontSize: 'clamp(1.5rem,4vw,2.1rem)', fontWeight: 800, margin: '14px 0 14px' }}>Service status</h1>
        <div style={{ ...card, borderColor: colour[level] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: '1.15rem' }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: colour[level] }} />
            {headline[level]}
          </div>
          {shownMsg && (
            <p style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, margin: '8px 0 0' }}>{shownMsg}</p>
          )}
          {file.updated && (
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', margin: '8px 0 0' }}>
              Last update from the team: {when(file.updated)}
            </p>
          )}
        </div>

        <div style={{ ...card, marginTop: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Right now</div>
          <Row name="Website" desc="The pages you are reading" state="static" />
          <Row
            name="Sign-in and accounts"
            desc="Logging in, plans and billing"
            state={liveChecksEnabled() ? checks.auth : 'static'}
          />
          <Row
            name="Data cleaning engine"
            desc="Analysis, cleaning, PDF to data and the free try"
            state={liveChecksEnabled() ? checks.engine : 'static'}
          />
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', margin: '10px 0 0', lineHeight: 1.5 }}>
            These lines are checked live from your own browser, about once every 30 seconds.{' '}
            {checks.checkedAt ? `Last check: ${new Date(checks.checkedAt).toLocaleTimeString()}.` : ''} If your own
            internet is down they can be wrong.
          </p>
        </div>

        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '26px 0 10px' }}>Current problems</h2>
        {open.length === 0 ? (
          <div style={{ ...card, color: 'rgba(255,255,255,0.65)' }}>Nothing reported by the team right now.</div>
        ) : (
          open.map(i => <IncidentCard key={i.title + i.started} i={i} />)
        )}

        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '26px 0 10px' }}>Past problems</h2>
        {past.length === 0 ? (
          <div style={{ ...card, color: 'rgba(255,255,255,0.65)' }}>No past problems listed.</div>
        ) : (
          past.map(i => <IncidentCard key={i.title + i.started} i={i} />)
        )}

        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.88rem', marginTop: 28, lineHeight: 1.6 }}>
          Need help? Email{' '}
          <a href="mailto:contact@thegodstool.com" style={{ color: '#c4b5fd' }}>
            contact@thegodstool.com
          </a>
          .
        </p>
      </div>
    </div>
  )
}

function IncidentCard({ i }: { i: import('../status').Incident }) {
  const done = i.status === 'resolved'
  return (
    <div style={{ ...card, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 800 }}>{i.title}</div>
        <div
          style={{ color: done ? colour.operational : colour.degraded, fontWeight: 700, textTransform: 'capitalize' }}
        >
          {i.status}
        </div>
      </div>
      {i.started && (
        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', margin: '2px 0 8px' }}>
          Started {when(i.started)}
        </div>
      )}
      {[...i.updates].reverse().map((u, k) => (
        <div
          key={k}
          style={{
            borderTop: '1px solid rgba(255,255,255,0.07)',
            padding: '8px 0',
            fontSize: '0.9rem',
            lineHeight: 1.55,
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem' }}>{when(u.time)}</span>
          <br />
          {u.text}
        </div>
      ))}
    </div>
  )
}
