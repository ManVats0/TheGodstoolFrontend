import { useEffect, useState } from 'react'
import { API_BASE } from './config'

// What the signed-in person may do, as decided by the SERVER. The app uses this only to decide what to show
// (locks, counters). The server enforces every limit again on its own, so editing anything in the browser's
// inspector changes how a button looks, never what is actually allowed.
export type FreeLimits = { maxSources: number; maxCsvBytes: number; maxCleanRows: number; maxPipelines: number; teamSeats: number }
export type Entitlements = {
  loaded: boolean
  plan: string
  paid: boolean
  freeSourceTypes: string[]
  limits: FreeLimits | null
  usage: { sources: number; pipelines: number }
}

const blank: Entitlements = { loaded: false, plan: 'none', paid: false, freeSourceTypes: ['csv', 'sheets'], limits: null, usage: { sources: 0, pipelines: 0 } }
let state: Entitlements = blank
let forToken = ''
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(l => l())
const token = () => { try { return localStorage.getItem('datapro_token') || '' } catch { return '' } }

export async function refreshEntitlements(): Promise<void> {
  const t = token()
  if (!t) { state = blank; forToken = ''; emit(); return }
  try {
    const res = await fetch(`${API_BASE}/api/entitlements`, { headers: { Authorization: `Bearer ${t}` } })
    if (!res.ok) return
    const d = await res.json()
    state = {
      loaded: true,
      plan: d.plan || 'none',
      paid: !!d.paid,
      freeSourceTypes: Array.isArray(d.freeSourceTypes) ? d.freeSourceTypes : ['csv', 'sheets'],
      limits: d.limits || null,
      usage: { sources: Number(d.usage?.sources) || 0, pipelines: Number(d.usage?.pipelines) || 0 },
    }
    forToken = t
    emit()
  } catch { /* offline: keep what we had; the server still enforces everything */ }
}

export function useEntitlements(): Entitlements {
  const [, bump] = useState(0)
  useEffect(() => {
    const l = () => bump(n => n + 1)
    listeners.add(l)
    return () => { listeners.delete(l) }
  }, [])
  // Never show one person's answer to the next person who logs in on the same tab.
  return forToken && forToken === token() ? state : blank
}

export function showUpgrade(message: string, feature = 'upgrade') {
  window.dispatchEvent(new CustomEvent('datapro:upgrade-required', { detail: { message, feature } }))
}
