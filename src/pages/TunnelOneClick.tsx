import { useCallback, useEffect, useRef, useState } from 'react'
import { API_BASE } from '../config'

type Connector = {
  id: string; label: string; device: string; allowWrites: boolean
  createdAt: string | null; lastSeenAt: string | null; online: boolean
  database: string | null; host: string | null
}

const api = () => (API_BASE && API_BASE.startsWith('http') ? API_BASE : 'http://localhost:8000')
const headers = (): Record<string, string> => {
  const t = localStorage.getItem('datapro_token') || ''
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }
}

const card = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' } as const
const mute = 'rgba(255,255,255,0.55)'

const SOURCES: { key: string; label: string; oneClick: boolean }[] = [
  { key: 'mysql', label: 'MySQL', oneClick: true },
  { key: 'postgres', label: 'PostgreSQL', oneClick: true },
  { key: 'mongodb', label: 'MongoDB', oneClick: true },
  { key: 'redshift', label: 'Redshift', oneClick: true },
  { key: 'bigquery', label: 'BigQuery', oneClick: false },
  { key: 'databricks', label: 'Databricks', oneClick: false },
  { key: 'rest', label: 'REST API', oneClick: false },
]

export default function TunnelOneClick({ canManage, onNeedSteps }: { canManage: boolean; onNeedSteps: (db: string) => void }) {
  const [source, setSource] = useState('mysql')
  const [os, setOs] = useState<'mac' | 'win'>(() => (/Win/i.test(navigator.platform) ? 'win' : 'mac'))
  const [allowWrites, setAllowWrites] = useState(false)
  const [label, setLabel] = useState('')
  const [code, setCode] = useState('')
  const [issuedAt, setIssuedAt] = useState(0)
  const [left, setLeft] = useState(0)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)
  const [list, setList] = useState<Connector[]>([])
  const [loaded, setLoaded] = useState(false)
  const knownIds = useRef<Set<string>>(new Set())

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`${api()}/api/agent/connectors`, { headers: headers() })
      if (r.ok) { setList((await r.json()).connectors || []); setLoaded(true) }
    } catch { /* offline: keep what we have */ }
  }, [])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 4000)
    return () => clearInterval(t)
  }, [refresh])

  useEffect(() => {
    if (!code) return
    const t = setInterval(() => {
      const s = Math.max(0, 600 - Math.floor((Date.now() - issuedAt) / 1000))
      setLeft(s)
      if (s === 0) setCode('')
    }, 1000)
    return () => clearInterval(t)
  }, [code, issuedAt])

  const create = async () => {
    setBusy(true); setErr('')
    knownIds.current = new Set(list.map(c => c.id))
    try {
      const r = await fetch(`${api()}/api/agent/pair-code`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ label: label.trim() || 'my computer', allowWrites }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || `Could not create a code (${r.status}).`)
      setCode(j.code); setIssuedAt(Date.now()); setLeft(600)
    } catch (e: any) {
      setErr(e.message || 'Could not create a code.')
    } finally { setBusy(false) }
  }

  const revoke = async (id: string) => {
    if (!confirm('Disconnect this computer? Anything using it will stop working until you connect it again.')) return
    await fetch(`${api()}/api/agent/connectors/${id}`, { method: 'DELETE', headers: headers() })
    refresh()
  }

  const A = api()
  const command = os === 'win'
    ? `& ([scriptblock]::Create((irm ${A}/download/install.ps1))) ${code} ${A}`
    : `curl -sSL ${A}/download/install.sh | bash -s -- ${code} ${A}`

  const copy = () => {
    navigator.clipboard.writeText(command)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const fresh = code ? list.find(c => !knownIds.current.has(c.id) && c.online) : undefined
  const mm = String(Math.floor(left / 60)).padStart(1, '0')
  const ss = String(left % 60).padStart(2, '0')

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-6" style={{ background: 'rgba(124,92,255,0.07)', border: '1px solid rgba(124,92,255,0.28)' }}>
        <h2 className="font-bold text-white text-base mb-1">Turn this computer into your connector, in one click</h2>
        <p className="text-sm leading-relaxed" style={{ color: mute }}>
          Run one command on the computer that can reach your database. It pairs itself with your workspace, then opens a small
          page <b>on that computer</b> where you type your database details. They are saved there and never sent to us.
          After that it reconnects by itself whenever it is running.
        </p>
      </div>

      <div className="rounded-2xl p-5" style={card}>
        <p className="text-xs font-semibold mb-2" style={{ color: mute }}>Which database are you connecting?</p>
        <div className="flex flex-wrap gap-2">
          {SOURCES.map(x => (
            <button key={x.key} onClick={() => setSource(x.key)} aria-pressed={source === x.key}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: source === x.key ? (x.oneClick ? 'rgba(124,92,255,0.3)' : 'rgba(245,158,11,0.22)') : 'rgba(255,255,255,0.05)',
                       color: source === x.key ? '#fff' : mute,
                       border: `1px solid ${source === x.key ? (x.oneClick ? 'rgba(124,92,255,0.6)' : 'rgba(245,158,11,0.5)') : 'rgba(255,255,255,0.08)'}` }}>
              {x.label}{x.oneClick ? '' : ' *'}
            </button>
          ))}
        </div>
        <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>* needs the step-by-step setup</p>
        {!SOURCES.find(x => x.key === source)!.oneClick && (
          <div className="mt-4 rounded-xl p-4" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }} role="status">
            <p className="text-sm" style={{ color: '#fbbf24' }}>
              <b>{SOURCES.find(x => x.key === source)!.label}</b> can't be set up with one click yet.
              It needs a key, token or API settings that are easier to enter step by step.
            </p>
            <button onClick={() => onNeedSteps(source)} className="mt-3 px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: '#f59e0b', color: '#111' }}>
              Use Follow the steps for {SOURCES.find(x => x.key === source)!.label}
            </button>
          </div>
        )}
      </div>

      {!SOURCES.find(x => x.key === source)!.oneClick ? null : canManage ? (
        !code ? (
          <div className="rounded-2xl p-6" style={card}>
            <label className="block text-xs font-semibold mb-1" style={{ color: mute }}>Name for this computer (optional)</label>
            <input
              value={label} onChange={e => setLabel(e.target.value)} maxLength={60} placeholder="e.g. Office server"
              className="w-full rounded-xl px-3 py-2 text-sm mb-4"
              style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
            <label className="flex items-start gap-3 text-sm mb-5 cursor-pointer" style={{ color: 'rgba(255,255,255,0.8)' }}>
              <input type="checkbox" checked={!allowWrites} onChange={e => setAllowWrites(!e.target.checked)} style={{ marginTop: 3 }} />
              <span>
                <b>Read-only (recommended).</b> The connector can only read data. Even if something went wrong on our side, it cannot change or delete anything in your database.
                {allowWrites && <span style={{ color: '#fbbf24' }}> Writes are on: this connector can change data, so only pair it with a database user whose permissions you are happy with.</span>}
              </span>
            </label>
            <button
              onClick={create} disabled={busy}
              className="px-5 py-3 rounded-xl text-sm font-semibold"
              style={{ background: '#7c5cff', color: '#fff', opacity: busy ? 0.6 : 1 }}
            >
              {busy ? 'Creating...' : 'Connect this computer'}
            </button>
            {err && <p className="text-sm mt-3" style={{ color: '#fca5a5' }} role="alert">{err}</p>}
          </div>
        ) : fresh ? (
          <div className="rounded-2xl p-6" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)' }}>
            <h3 className="font-bold text-white text-sm mb-1">Connected</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
              Your computer is online, linked to <b>{fresh.database}</b> on <b>{fresh.host}</b>.
              Now go to <b>Data Sources</b>, add the same database, and type exactly <b>{fresh.host}</b> as the host and <b>{fresh.database}</b> as the database name.
              The app notices the connector and sends the requests through your computer.
            </p>
            <button onClick={() => setCode('')} className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff' }}>Done</button>
          </div>
        ) : (
          <div className="rounded-2xl p-6" style={card}>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h3 className="font-bold text-white text-sm">Paste this on the computer you want to connect</h3>
              <div className="flex gap-1">
                {(['mac', 'win'] as const).map(o => (
                  <button key={o} onClick={() => setOs(o)} className="px-3 py-1 rounded-lg text-xs font-semibold"
                    style={{ background: os === o ? 'rgba(124,92,255,0.3)' : 'rgba(255,255,255,0.06)', color: os === o ? '#fff' : mute }}>
                    {o === 'mac' ? 'Mac / Linux' : 'Windows'}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs mb-2" style={{ color: mute }}>
              {os === 'win' ? 'Open PowerShell, paste, press Enter.' : 'Open Terminal, paste, press Enter.'}
            </p>
            <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <pre className="p-4 text-xs leading-relaxed" style={{ color: '#a5f3fc', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: "'JetBrains Mono','Fira Code',monospace" }}>{command}</pre>
            </div>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <button onClick={copy} className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: copied ? 'rgba(34,197,94,0.25)' : '#7c5cff', color: '#fff' }}>
                {copied ? 'Copied' : 'Copy command'}
              </button>
              <span className="text-xs" style={{ color: mute }}>Code <b style={{ color: '#fff' }}>{code}</b> works once and expires in {mm}:{ss}</span>
            </div>
            <ol className="text-sm mt-5 space-y-2 list-decimal pl-5" style={{ color: 'rgba(255,255,255,0.7)' }}>
              <li>The command installs the agent and pairs the computer.</li>
              <li>A page opens on that computer. Pick your database type and enter host, user and password.</li>
              <li>It tests the connection from that computer. Leave "Start automatically" ticked and it keeps running in the background and starts with the computer.</li>
              <li>When it works, this box turns green.</li>
            </ol>
            <button onClick={() => setCode('')} className="mt-4 text-xs underline" style={{ color: mute }}>Cancel and start over</button>
          </div>
        )
      ) : (
        <div className="rounded-2xl p-5" style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)' }}>
          <p className="text-sm" style={{ color: '#fbbf24' }}>An Admin needs to connect a computer. You can use any connector that shows as online below.</p>
        </div>
      )}

      <div className="rounded-2xl p-6" style={card}>
        <h3 className="font-bold text-white text-sm mb-3">Connected computers</h3>
        {!loaded ? <p className="text-sm" style={{ color: mute }}>Loading...</p>
          : list.length === 0 ? <p className="text-sm" style={{ color: mute }}>None yet.</p>
          : (
            <div className="space-y-2">
              {list.map(c => (
                <div key={c.id} className="flex items-center justify-between gap-3 flex-wrap rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div>
                    <div className="text-sm font-semibold text-white">
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 99, marginRight: 8, background: c.online ? '#4ade80' : '#6b7280' }} />
                      {c.label || 'my computer'}
                      <span className="text-xs font-normal ml-2" style={{ color: mute }}>{c.allowWrites ? 'read and write' : 'read-only'}</span>
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: mute }}>
                      {c.online ? `Online. ${c.database}@${c.host}` : 'Offline. Start the agent on that computer to reconnect.'}
                      {c.device ? ` (${c.device})` : ''}
                    </div>
                  </div>
                  {canManage && <button onClick={() => revoke(c.id)} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5' }}>Disconnect</button>}
                </div>
              ))}
            </div>
          )}
      </div>

      <div className="rounded-2xl p-6" style={card}>
        <h3 className="font-bold text-white text-sm mb-2">What runs where</h3>
        <p className="text-sm leading-relaxed" style={{ color: mute }}>
          On your computer: the connection to your database, your database password, and every query. Your database never needs a public address or an open port.
          The rows that a query returns travel over an encrypted connection to our server, where the cleaning steps run. Your password never leaves your computer.
          One click supports MySQL, PostgreSQL, MongoDB and Redshift. For BigQuery, Databricks or REST APIs, use <b>Follow the steps</b>.
        </p>
      </div>
    </div>
  )
}
