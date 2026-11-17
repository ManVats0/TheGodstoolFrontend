import { useEffect, useRef, useState } from 'react'
import { API_BASE, AUTH_BASE } from './config'
import { APP_HOST, SITE_HOSTS } from './hosts'

// Status without a database. Two sources, both free:
//  1. /status.json, a small file in this repo that the team edits by hand when something is wrong (see STATUS_HOWTO.md).
//  2. A live check from the visitor's own browser: it asks each service "are you there?" every minute.
// Nothing is stored anywhere. Each visitor's browser does the checking.

export type Level = 'operational' | 'degraded' | 'outage' | 'maintenance'
export type Update = { time: string; text: string }
export type Incident = { title: string; status: 'investigating' | 'identified' | 'monitoring' | 'resolved'; started: string; updates: Update[] }
export type StatusFile = { state: Level; message: string; updated: string; incidents: Incident[] }
export type Live = 'checking' | 'up' | 'down'
export type Checks = { auth: Live; engine: Live; checkedAt: number | null }

const LEVELS: Level[] = ['operational', 'degraded', 'outage', 'maintenance']
const EMPTY: StatusFile = { state: 'operational', message: '', updated: '', incidents: [] }

// Only real addresses are checked. Local development has no services running, so it would always say "down".
export const liveChecksEnabled = () => typeof window !== 'undefined' && (window.location.hostname === APP_HOST || SITE_HOSTS.includes(window.location.hostname))

async function ping(url: string): Promise<boolean> {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 7000)
  try {
    const r = await fetch(`${url}${url.includes('?') ? '&' : '?'}_s=${Date.now()}`, { signal: ctl.signal, cache: 'no-store', credentials: 'omit' })
    return r.status < 500
  } catch { return false } finally { clearTimeout(timer) }
}

export function cleanStatus(raw: any): StatusFile {
  if (!raw || typeof raw !== 'object') return EMPTY
  const incidents: Incident[] = Array.isArray(raw.incidents) ? raw.incidents.filter((i: any) => i && typeof i.title === 'string').map((i: any) => ({
    title: String(i.title), status: ['investigating', 'identified', 'monitoring', 'resolved'].includes(i.status) ? i.status : 'investigating',
    started: String(i.started || ''), updates: Array.isArray(i.updates) ? i.updates.filter((u: any) => u && u.text).map((u: any) => ({ time: String(u.time || ''), text: String(u.text) })) : [],
  })) : []
  return { state: LEVELS.includes(raw.state) ? raw.state : 'operational', message: String(raw.message || ''), updated: String(raw.updated || ''), incidents }
}

// Polls both sources once a minute while the tab is visible. A service counts as down only after two failed rounds
// in a row, so one slow request or a blip on the visitor's own connection does not raise an alarm.
export function useStatus(intervalMs = 60000) {
  const [file, setFile] = useState<StatusFile>(EMPTY)
  const [checks, setChecks] = useState<Checks>({ auth: 'checking', engine: 'checking', checkedAt: null })
  const fails = useRef({ auth: 0, engine: 0 })

  useEffect(() => {
    let stop = false
    const run = async () => {
      if (document.visibilityState === 'hidden') return
      try {
        const r = await fetch(`/status.json?_s=${Date.now()}`, { cache: 'no-store' })
        const ct = r.headers.get('content-type') || ''
        if (r.ok && ct.includes('json')) { const j = cleanStatus(await r.json()); if (!stop) setFile(j) }
      } catch { /* the file is optional */ }
      if (!liveChecksEnabled() || !navigator.onLine) return
      const [a, e] = await Promise.all([ping(`${AUTH_BASE}/api/health`), ping(`${API_BASE}/`)])
      fails.current.auth = a ? 0 : fails.current.auth + 1
      fails.current.engine = e ? 0 : fails.current.engine + 1
      if (!stop) setChecks({ auth: fails.current.auth >= 2 ? 'down' : a ? 'up' : 'checking', engine: fails.current.engine >= 2 ? 'down' : e ? 'up' : 'checking', checkedAt: Date.now() })
    }
    run()
    const t = setInterval(run, intervalMs)
    const onVis = () => { if (document.visibilityState === 'visible') run() }
    document.addEventListener('visibilitychange', onVis)
    return () => { stop = true; clearInterval(t); document.removeEventListener('visibilitychange', onVis) }
  }, [intervalMs])

  // One overall level: what the team wrote, or the worse of that and what the live check found.
  const rank: Record<Level, number> = { operational: 0, maintenance: 1, degraded: 2, outage: 3 }
  const liveDown = (checks.auth === 'down' ? 1 : 0) + (checks.engine === 'down' ? 1 : 0)
  const liveLevel: Level = liveDown === 2 ? 'outage' : liveDown === 1 ? 'degraded' : 'operational'
  const level: Level = rank[liveLevel] > rank[file.state] ? liveLevel : file.state
  return { file, checks, level, liveDown }
}
