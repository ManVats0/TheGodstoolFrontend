import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API_BASE, AUTH_BASE } from '../config'
import { usePermissions } from '../usePermissions'

// The first page after login. Two faces:
//  - a brand-new workspace gets a short welcome that shows the value and one clear next step;
//  - everyone else gets a calm overview of their pipelines, runs, plan, credits and sign-ins.
// Every card loads on its own, so one slow or failing service never blanks the page.

type Dash = {
  role: string
  workspace?: { name: string; personal: boolean }
  sources: { total: number; byType: Record<string, number> } | null
  pipelines: { total: number; active: number; pendingApproval: number; items: PipelineItem[] } | null
  runs: { last7: { total: number; success: number; failed: number; rowsOut: number }; recent: RunItem[] } | null
  team: { members: number; pending: number } | null
  activity: { action: string; resourceName: string; severity: string; at: string | null }[] | null
  entitlements: { plan: string; paid: boolean; limits: { maxSources: number; maxCleanRows: number; maxPipelines: number } | null; usage: { sources: number; pipelines: number } }
}
type PipelineItem = { id: string; name: string; sourceName: string; destinationName: string; isActive: boolean; status: string; scheduleLabel: string | null; lastRun: string | null; runCount: number }
type RunItem = { ts: string | null; pipelineName: string; status: string; rowsOut: number; durationMs: number; triggeredBy: string }
type Summary = {
  name: string | null; plan: string; isTrial: boolean; daysLeft: number | null; planExpiresAt: string | null
  ai: { usedToday: number; limit: number }; credits: number
  recentCredits: { delta: number; reason: string; at: string }[]
  logins: { active: number; limit: number; mine: { device: string; lastActive: string }[] }
}

const PLAN_NAMES: Record<string, string> = { none: 'Free', trial: 'Free trial', lite: 'Lite', starter: 'Starter', pro: 'Pro', team: 'Team', enterprise: 'Enterprise' }
const card: CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20 }
const muted = 'rgba(255,255,255,0.5)'
const grad = 'linear-gradient(135deg,#7c3aed,#a78bfa)'

function ago(iso: string | null): string {
  if (!iso) return 'never'
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return `${Math.floor(s / 86400)} d ago`
}
function nice(action: string): string {
  const t = action.replace(/[._]/g, ' ').trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Activity'
}
const reasonText: Record<string, string> = { purchase: 'Credits added', ai: 'AI action', usd_migration: 'Credits added', adjustment: 'Adjustment' }

function Bar({ value, max, color = '#a78bfa' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: pct >= 90 ? '#f59e0b' : color, borderRadius: 99, transition: 'width .4s' }} />
    </div>
  )
}
function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={card}>
      <div style={{ fontSize: '0.72rem', color: muted, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
      <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'white', marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.78rem', color: muted, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}
function Empty({ children }: { children: ReactNode }) {
  return <div style={{ color: muted, fontSize: '0.85rem', padding: '8px 0' }}>{children}</div>
}
function Btn({ to, children, ghost = false }: { to: string; children: ReactNode; ghost?: boolean }) {
  return (
    <Link to={to} style={{ textDecoration: 'none', display: 'inline-block', borderRadius: 10, padding: '10px 18px', fontWeight: 700, fontSize: '0.9rem',
      background: ghost ? 'transparent' : grad, border: ghost ? '1px solid rgba(255,255,255,0.18)' : 'none', color: ghost ? 'rgba(255,255,255,0.8)' : 'white' }}>{children}</Link>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { can } = usePermissions()
  const [dash, setDash] = useState<Dash | null>(null)
  const [dashFailed, setDashFailed] = useState(false)
  const [sum, setSum] = useState<Summary | null>(null)
  const [sumFailed, setSumFailed] = useState(false)

  useEffect(() => {
    const token = (() => { try { return localStorage.getItem('datapro_token') || '' } catch { return '' } })()
    let alive = true
    fetch(`${API_BASE}/api/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => { if (alive) setDash(d) })
      .catch(() => { if (alive) setDashFailed(true) })
    fetch(`${AUTH_BASE}/api/dashboard-summary`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => { if (alive) setSum(d) })
      .catch(() => { if (alive) setSumFailed(true) })
    return () => { alive = false }
  }, [])

  const paid = dash?.entitlements.paid ?? (sum ? sum.plan !== 'none' : false)
  const first = (sum?.name || '').trim().split(/\s+/)[0]
  const sourcesN = dash?.sources?.total ?? dash?.entitlements.usage.sources ?? 0
  const pipelinesN = dash?.pipelines?.total ?? dash?.entitlements.usage.pipelines ?? 0
  const runsN = dash?.runs?.last7.total ?? 0
  const isNew = !!dash && sourcesN === 0 && pipelinesN === 0
  const steps = [
    { done: sourcesN > 0, title: 'Add your data', text: 'Upload a CSV or link a Google Sheet.', to: '/sources', cta: 'Add data' },
    { done: pipelinesN > 0, title: 'Clean it', text: 'Pick fixes: duplicates, blanks, dates, spelling.', to: '/flow', cta: 'Open the cleaner' },
    { done: runsN > 0 || (dash?.pipelines?.items || []).some(p => p.runCount > 0), title: 'Run it & get the result', text: 'Download clean data, or send it to a Sheet.', to: '/flow', cta: 'Run it' },
  ]
  const doneCount = steps.filter(s => s.done).length

  const TrialBanner = () => {
    if (!sum) return null
    if (sum.isTrial && sum.daysLeft !== null)
      return (
        <div style={{ ...card, borderColor: 'rgba(124,58,237,0.45)', background: 'rgba(124,58,237,0.10)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '1.4rem' }}>🎁</span>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ color: 'white', fontWeight: 700 }}>Your free trial: {sum.daysLeft} day{sum.daysLeft === 1 ? '' : 's'} left</div>
            <div style={{ color: muted, fontSize: '0.85rem' }}>Everything is unlocked right now. Keep it all after the trial by choosing a plan.</div>
          </div>
          <Btn to="/pricing">See plans</Btn>
        </div>
      )
    return null
  }

  if (dashFailed && sumFailed)
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div style={card}>
          <div style={{ color: 'white', fontWeight: 700, marginBottom: 6 }}>We couldn't load your dashboard just now</div>
          <div style={{ color: muted, marginBottom: 14 }}>Your data is safe. Check your connection and try again.</div>
          <button onClick={() => window.location.reload()} style={{ background: grad, border: 'none', color: 'white', borderRadius: 10, padding: '10px 18px', fontWeight: 700, cursor: 'pointer' }}>Try again</button>
        </div>
      </div>
    )

  if (!dash && !dashFailed)
    return (
      <div className="p-8 max-w-5xl mx-auto" aria-busy="true">
        <div style={{ ...card, height: 150, opacity: 0.5 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginTop: 16 }}>
          {[0, 1, 2, 3].map(i => <div key={i} style={{ ...card, height: 100, opacity: 0.4 }} />)}
        </div>
      </div>
    )

  // ───────────────────────── First visit: show the value, one clear next step ─────────────────────────
  if (isNew)
    return (
      <div className="p-8 max-w-5xl mx-auto" style={{ display: 'grid', gap: 20 }}>
        <TrialBanner />
        <div style={{ ...card, padding: 32, background: 'linear-gradient(135deg,rgba(124,58,237,0.18),rgba(255,255,255,0.02))', borderColor: 'rgba(124,58,237,0.35)' }}>
          <div style={{ color: '#c4b5fd', fontWeight: 700, fontSize: '0.85rem', marginBottom: 8 }}>Welcome{first ? `, ${first}` : ''} 👋</div>
          <h1 style={{ color: 'white', fontSize: 'clamp(1.6rem,4vw,2.4rem)', fontWeight: 800, lineHeight: 1.15, margin: 0 }}>
            Turn a messy spreadsheet into clean data, in minutes.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.02rem', margin: '12px 0 20px', maxWidth: 560 }}>
            No code. No setup. Add a file or a Google Sheet, pick what to fix, and download a clean version you can send to a client.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Btn to="/sources">Clean my first file →</Btn>
            <Btn to="/docs" ghost>See how it works</Btn>
          </div>
        </div>

        <div style={{ ...card }}>
          <div style={{ color: 'white', fontWeight: 700, marginBottom: 12 }}>What it does for you</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16, alignItems: 'center' }}>
            <MiniTable title="Before" rows={[['  anna SMITH ', '03/04/24', ''], ['Anna Smith', '2024-04-03', '₹ 1,200'], ['ravi  k', 'April 5', '950'], ['ravi  k', 'April 5', '950']]} bad />
            <MiniTable title="After" rows={[['Anna Smith', '2024-04-03', '1200'], ['Ravi K', '2024-04-05', '950']]} />
          </div>
          <p style={{ color: muted, fontSize: '0.85rem', margin: '12px 0 0' }}>Extra spaces, mixed date styles, blanks and repeated rows fixed in a few clicks.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
          {steps.map((s, i) => (
            <div key={s.title} style={card}>
              <div style={{ color: '#a78bfa', fontWeight: 800, fontSize: '0.8rem' }}>STEP {i + 1}</div>
              <div style={{ color: 'white', fontWeight: 700, margin: '4px 0' }}>{s.title}</div>
              <div style={{ color: muted, fontSize: '0.88rem', marginBottom: 12 }}>{s.text}</div>
              <Link to={s.to} style={{ color: '#c4b5fd', fontWeight: 700, fontSize: '0.85rem' }}>{s.cta} →</Link>
            </div>
          ))}
        </div>

        {!paid && (
          <div style={{ ...card, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ color: 'white', fontWeight: 700 }}>Free for CSV files and Google Sheets</div>
              <div style={{ color: muted, fontSize: '0.88rem' }}>Need databases, bigger files, schedules or teammates? Upgrade whenever you're ready.</div>
            </div>
            <Btn to="/pricing" ghost>Compare plans</Btn>
          </div>
        )}
      </div>
    )

  // ───────────────────────── Returning view ─────────────────────────
  const lowCredits = sum && sum.ai.limit === 0 && sum.credits <= 10
  const successPct = dash?.runs && dash.runs.last7.total ? Math.round((dash.runs.last7.success / dash.runs.last7.total) * 100) : null
  const ent = dash?.entitlements

  return (
    <div className="p-8 max-w-6xl mx-auto" style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ color: 'white', fontSize: '1.7rem', fontWeight: 800, margin: 0 }}>Welcome back{first ? `, ${first}` : ''}</h1>
          <div style={{ color: muted, fontSize: '0.88rem' }}>
            {dash?.workspace?.name && !dash.workspace.personal ? `${dash.workspace.name} · ` : ''}{dash?.role ? `${dash.role.charAt(0).toUpperCase()}${dash.role.slice(1)}` : ''}
            {sum ? ` · ${PLAN_NAMES[sum.plan] || sum.plan} plan` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {can('connection.create') && <Btn to="/sources" ghost>Add data</Btn>}
          {can('pipeline.create') && <Btn to="/flow">New pipeline</Btn>}
        </div>
      </div>

      <TrialBanner />

      {lowCredits && (
        <div style={{ ...card, borderColor: 'rgba(245,158,11,0.45)', background: 'rgba(245,158,11,0.08)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220, color: '#fbbf24', fontWeight: 600 }}>
            {sum!.credits === 0 ? 'You are out of AI credits.' : `Only ${sum!.credits} AI credit${sum!.credits === 1 ? '' : 's'} left.`} Top up to keep using AI cleaning.
          </div>
          <a href="/pricing#credits" style={{ textDecoration: 'none', background: grad, color: 'white', borderRadius: 10, padding: '9px 16px', fontWeight: 700 }}>Top up credits</a>
        </div>
      )}

      {doneCount < 3 && (
        <div style={{ ...card }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'white', fontWeight: 700, marginBottom: 8 }}>
            <span>Finish setting up</span><span style={{ color: muted, fontWeight: 600 }}>{doneCount}/3</span>
          </div>
          <Bar value={doneCount} max={3} />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
            {steps.map(s => (
              <button key={s.title} onClick={() => navigate(s.to)} disabled={s.done}
                style={{ background: s.done ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.05)', border: `1px solid ${s.done ? 'rgba(52,211,153,0.35)' : 'rgba(255,255,255,0.12)'}`, color: s.done ? '#34d399' : 'white', borderRadius: 99, padding: '6px 14px', fontSize: '0.82rem', cursor: s.done ? 'default' : 'pointer' }}>
                {s.done ? '✓ ' : ''}{s.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
        <Stat label="Pipelines" value={String(pipelinesN)} sub={dash?.pipelines ? `${dash.pipelines.active} scheduled${dash.pipelines.pendingApproval ? ` · ${dash.pipelines.pendingApproval} awaiting approval` : ''}` : undefined} />
        <Stat label="Runs this week" value={String(runsN)} sub={successPct !== null ? `${successPct}% succeeded` : 'No runs yet'} />
        <Stat label="Rows cleaned (7 days)" value={(dash?.runs?.last7.rowsOut ?? 0).toLocaleString('en-IN')} />
        <Stat label="Data sources" value={String(sourcesN)} sub={dash?.sources ? Object.entries(dash.sources.byType).map(([k, v]) => `${v} ${k}`).join(' · ') : undefined} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 16, alignItems: 'start' }}>
        {/* Pipelines */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ color: 'white', fontWeight: 700 }}>Your pipelines</span>
            <Link to="/flow" style={{ color: '#c4b5fd', fontSize: '0.82rem' }}>Open →</Link>
          </div>
          {!dash?.pipelines ? <Empty>{dashFailed ? "We couldn't load your pipelines right now. Try refreshing." : "You don't have access to pipelines in this workspace."}</Empty>
            : dash.pipelines.items.length === 0 ? <Empty>No pipelines yet. Build your first one and it will appear here.</Empty>
            : dash.pipelines.items.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: 'white', fontSize: '0.92rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ color: muted, fontSize: '0.78rem' }}>{p.sourceName || 'Source'} → {p.destinationName || 'Destination'}</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.78rem', color: muted, whiteSpace: 'nowrap' }}>
                  <div style={{ color: p.status === 'pending_approval' ? '#fbbf24' : p.isActive ? '#34d399' : muted }}>
                    {p.status === 'pending_approval' ? 'Awaiting approval' : p.isActive ? (p.scheduleLabel || 'Scheduled') : 'Manual'}
                  </div>
                  <div>Last run {ago(p.lastRun)}</div>
                </div>
              </div>
            ))}
        </div>

        {/* Plan, credits, sign-ins */}
        <div style={{ ...card, display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'white', fontWeight: 700 }}>Plan & credits</span>
            <Link to="/billing" style={{ color: '#c4b5fd', fontSize: '0.82rem' }}>Billing →</Link>
          </div>
          {sumFailed && <Empty>Plan details are unavailable right now.</Empty>}
          {sum && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <div style={{ color: muted, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>AI credits left</div>
                  <div style={{ color: sum.credits <= 10 ? '#fbbf24' : '#34d399', fontSize: '2rem', fontWeight: 800 }}>{sum.credits.toLocaleString('en-IN')}</div>
                </div>
                <a href="/pricing#credits" style={{ textDecoration: 'none', background: grad, color: 'white', borderRadius: 10, padding: '8px 14px', fontWeight: 700, fontSize: '0.85rem' }}>Top up</a>
              </div>
              {sum.ai.limit > 0 ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: muted, fontSize: '0.8rem', marginBottom: 4 }}>
                    <span>AI actions today</span><span>{sum.ai.usedToday} / {sum.ai.limit}</span>
                  </div>
                  <Bar value={sum.ai.usedToday} max={sum.ai.limit} />
                  <div style={{ color: muted, fontSize: '0.74rem', marginTop: 4 }}>Once today's included actions are used, credits are spent.</div>
                </div>
              ) : (
                <div style={{ color: muted, fontSize: '0.82rem' }}>1 credit = 1 AI action. Credits never expire.</div>
              )}
              {sum.recentCredits.length > 0 && (
                <div>
                  {sum.recentCredits.slice(0, 3).map((c, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: muted, padding: '3px 0' }}>
                      <span>{reasonText[c.reason] || 'Credits'} · {ago(c.at)}</span>
                      <span style={{ color: c.delta > 0 ? '#34d399' : 'rgba(255,255,255,0.6)' }}>{c.delta > 0 ? '+' : ''}{c.delta}</span>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: muted, fontSize: '0.8rem', marginBottom: 4 }}>
                  <span>Devices signed in</span><span>{sum.logins.active} of {sum.logins.limit}</span>
                </div>
                <Bar value={sum.logins.active} max={sum.logins.limit} color="#60a5fa" />
                {sum.logins.mine.length > 0 && (
                  <div style={{ color: muted, fontSize: '0.74rem', marginTop: 6 }}>Yours: {sum.logins.mine.map(m => m.device).join(', ')}</div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Recent runs */}
        <div style={card}>
          <div style={{ color: 'white', fontWeight: 700, marginBottom: 10 }}>Recent runs</div>
          {!dash?.runs ? <Empty>{dashFailed ? "We couldn't load your runs right now." : 'Runs are not available for your role.'}</Empty>
            : dash.runs.recent.length === 0 ? <Empty>No runs in the last 7 days.</Empty>
            : dash.runs.recent.map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.85rem' }}>
                <span style={{ color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ color: r.status === 'success' ? '#34d399' : '#f87171' }}>●</span> {r.pipelineName}
                </span>
                <span style={{ color: muted, whiteSpace: 'nowrap' }}>{r.status === 'success' ? `${r.rowsOut.toLocaleString('en-IN')} rows · ` : 'failed · '}{ago(r.ts)}</span>
              </div>
            ))}
        </div>

        {/* Activity (only for roles that may see the audit log) */}
        {dash?.activity && (
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: 'white', fontWeight: 700 }}>Recent activity</span>
              <Link to="/audit" style={{ color: '#c4b5fd', fontSize: '0.82rem' }}>Audit logs →</Link>
            </div>
            {dash.activity.length === 0 ? <Empty>Nothing yet.</Empty> : dash.activity.map((a, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '7px 0', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.84rem' }}>
                <span style={{ color: a.severity === 'warning' || a.severity === 'critical' ? '#fbbf24' : 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {nice(a.action)}{a.resourceName ? ` · ${a.resourceName}` : ''}
                </span>
                <span style={{ color: muted, whiteSpace: 'nowrap' }}>{ago(a.at)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Team */}
        {dash?.team && (
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: 'white', fontWeight: 700 }}>Team</span>
              <Link to="/team" style={{ color: '#c4b5fd', fontSize: '0.82rem' }}>Manage →</Link>
            </div>
            <div style={{ color: 'white', fontSize: '1.4rem', fontWeight: 800 }}>{dash.team.members} member{dash.team.members === 1 ? '' : 's'}</div>
            <div style={{ color: muted, fontSize: '0.82rem' }}>{dash.team.pending} invite{dash.team.pending === 1 ? '' : 's'} waiting</div>
          </div>
        )}

        {/* Free plan: show what is used and what upgrading adds */}
        {ent && !ent.paid && ent.limits && (
          <div style={{ ...card, borderColor: 'rgba(124,58,237,0.35)' }}>
            <div style={{ color: 'white', fontWeight: 700, marginBottom: 10 }}>Your free plan</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: muted, fontSize: '0.8rem', marginBottom: 4 }}><span>Saved sources</span><span>{ent.usage.sources} / {ent.limits.maxSources}</span></div>
            <Bar value={ent.usage.sources} max={ent.limits.maxSources} />
            <div style={{ display: 'flex', justifyContent: 'space-between', color: muted, fontSize: '0.8rem', margin: '10px 0 4px' }}><span>Saved pipelines</span><span>{ent.usage.pipelines} / {ent.limits.maxPipelines}</span></div>
            <Bar value={ent.usage.pipelines} max={ent.limits.maxPipelines} />
            <div style={{ color: muted, fontSize: '0.82rem', margin: '12px 0' }}>Cleans the first {ent.limits.maxCleanRows.toLocaleString('en-IN')} rows per file. Upgrade for databases, every row, schedules and teammates.</div>
            <Btn to="/pricing">Unlock everything</Btn>
          </div>
        )}
      </div>
    </div>
  )
}

function MiniTable({ title, rows, bad = false }: { title: string; rows: string[][]; bad?: boolean }) {
  return (
    <div style={{ border: `1px solid ${bad ? 'rgba(248,113,113,0.35)' : 'rgba(52,211,153,0.4)'}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: 700, color: bad ? '#f87171' : '#34d399', background: bad ? 'rgba(248,113,113,0.08)' : 'rgba(52,211,153,0.08)' }}>{title}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', fontFamily: 'monospace' }}>
        <thead><tr>{['Name', 'Date', 'Amount'].map(h => <th key={h} style={{ textAlign: 'left', padding: '5px 10px', color: muted, fontWeight: 600 }}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {r.map((c, j) => <td key={j} style={{ padding: '5px 10px', color: 'rgba(255,255,255,0.8)', whiteSpace: 'pre' }}>{c || '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
