import { useEffect, useState } from 'react'
import { API_BASE } from './config'

export type OrgInfo = {
  role: string
  userId: string
  orgName: string
  permissions: Record<string, boolean>
}

export const ROLE_LABELS: Record<string, string> = {
  owner: 'Organization Owner',
  admin: 'Admin',
  steward: 'Data Steward',
  editor: 'Editor',
  viewer: 'Viewer',
}

let cache: OrgInfo | null = null
let inflight: Promise<OrgInfo | null> | null = null
let version = 0
const listeners = new Set<() => void>()

async function fetchOrg(): Promise<OrgInfo | null> {
  const token = localStorage.getItem('datapro_token') || ''
  if (!token) return null
  try {
    const res = await fetch(`${API_BASE}/api/org`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data || data.error) return null
    return {
      role: data.role || '',
      userId: data.userId || '',
      orgName: data.org?.name || '',
      permissions: data.permissions || {},
    }
  } catch {
    return null
  }
}

let loadFailed = false

// Up to 3 attempts with backoff, so one blip doesn't look like "no permissions".
async function fetchOrgRetry(): Promise<OrgInfo | null> {
  if (!localStorage.getItem('datapro_token')) return null
  for (let attempt = 0; attempt < 3; attempt++) {
    const info = await fetchOrg()
    if (info) return info
    await new Promise(r => setTimeout(r, 600 * (attempt + 1)))
  }
  return null
}

export function loadPermissions(): Promise<OrgInfo | null> {
  if (cache) return Promise.resolve(cache)
  if (inflight) return inflight
  const myVersion = version
  const p: Promise<OrgInfo | null> = fetchOrgRetry().then(info => {
    if (myVersion === version) {
      cache = info
      loadFailed = !info && !!localStorage.getItem('datapro_token')
    }
    if (inflight === p) inflight = null
    return info
  })
  inflight = p
  return p
}

// Silent refresh: updates role/permissions in place (no loading flash).
export async function refreshPermissions() {
  const info = await fetchOrg()
  if (info) {
    cache = info
    listeners.forEach(l => l())
  }
}

// Re-fetch after a failed load (used by the Retry button).
export function retryPermissions() {
  clearPermissionsCache()
}

// Call on logout and after joining a team.
export function clearPermissionsCache() {
  cache = null
  inflight = null
  version++
  loadFailed = false
  listeners.forEach(l => l())
}

export function usePermissions() {
  const [, setTick] = useState(0)
  const [loading, setLoading] = useState<boolean>(() => !cache && !!localStorage.getItem('datapro_token'))

  useEffect(() => {
    let alive = true
    const refresh = () => {
      if (cache || !localStorage.getItem('datapro_token')) {
        setLoading(false)
        setTick(t => t + 1)
        return
      }
      setLoading(true)
      loadPermissions().then(() => {
        if (alive) {
          setLoading(false)
          setTick(t => t + 1)
        }
      })
    }
    listeners.add(refresh)
    refresh()
    return () => {
      alive = false
      listeners.delete(refresh)
    }
  }, [])

  const can = (key: string) => !!cache?.permissions?.[key]
  const role = cache?.role || ''
  return {
    role,
    roleLabel: ROLE_LABELS[role] || role,
    userId: cache?.userId || '',
    orgName: cache?.orgName || '',
    loading,
    error: loadFailed && !cache,
    can,
  }
}

export function forbiddenMessage(): string {
  const role = cache?.role || ''
  if (!role) return "You don't have permission to do this."
  return `Your role (${ROLE_LABELS[role] || role}) can't do this.`
}

function showToast(message: string) {
  if (typeof document === 'undefined') return
  const el = document.createElement('div')
  el.textContent = message
  el.setAttribute('role', 'alert')
  el.style.cssText =
    'position:fixed;top:20px;right:20px;z-index:9999;max-width:360px;padding:12px 16px;border-radius:12px;' +
    'background:#1a1040;border:1px solid rgba(239,68,68,0.4);color:#fca5a5;' +
    'font:600 13px Inter,-apple-system,sans-serif;box-shadow:0 8px 32px rgba(0,0,0,0.5)'
  document.body.appendChild(el)
  window.setTimeout(() => el.remove(), 4000)
}

// Item 8: any 403 on a write (POST/PUT/DELETE) to our API shows a friendly toast.
export function installForbiddenHandler() {
  if (typeof window === 'undefined') return
  const w = window as any
  if (w.__forbiddenHandlerInstalled) return
  w.__forbiddenHandlerInstalled = true
  const originalFetch = window.fetch.bind(window)
  let lastShown = 0
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await originalFetch(input, init)
    try {
      if (res.status === 403) {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        const method = (
          init?.method || (typeof input === 'string' || input instanceof URL ? 'GET' : input.method) || 'GET'
        ).toUpperCase()
        if (url.startsWith(API_BASE) && method !== 'GET' && Date.now() - lastShown > 3000) {
          lastShown = Date.now()
          showToast(forbiddenMessage())
        }
      }
    } catch {
      /* never break a request because of the toast */
    }
    return res
  }
}
