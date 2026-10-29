import { API_BASE } from './config'

// Sends the login token with every request to our own Python service, so the server always knows who is asking
// (and therefore which plan applies). Without it, the server must treat the caller as a free visitor.
// It also turns the server's "upgrade required" (HTTP 402) and "free plan row limit" answers into on-screen prompts.
const original = window.fetch.bind(window)

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return (input as Request).url
}

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  let url = ''
  try { url = urlOf(input) } catch { /* ignore */ }
  const ours = !!url && url.startsWith(API_BASE)
  if (!ours) return original(input, init)

  let nextInit = init
  try {
    const tok = localStorage.getItem('datapro_token')
    if (tok) {
      const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
      if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${tok}`)
      nextInit = { ...init, headers }
    }
  } catch { /* storage unavailable: send as before */ }

  const res = await original(input, nextInit)
  try {
    if (res.status === 402) {
      res.clone().json().then(d => {
        if (d && d.code === 'upgrade_required') {
          window.dispatchEvent(new CustomEvent('datapro:upgrade-required', { detail: { message: d.error, feature: d.feature } }))
        }
      }).catch(() => { /* not JSON */ })
    } else if (res.ok && (url.includes('/api/clean-data') || url.includes('/api/sql-clean'))) {
      res.clone().json().then(d => {
        if (d && d.row_limit && d.row_limit.truncated) {
          window.dispatchEvent(new CustomEvent('datapro:row-limit', { detail: d.row_limit }))
        }
      }).catch(() => { /* not JSON */ })
    }
  } catch { /* never let a notice break a request */ }
  return res
}
