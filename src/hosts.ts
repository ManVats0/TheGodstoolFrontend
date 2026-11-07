// Two addresses, one build. The public site (home page, guides, blog) lives on thegodstool.com and the logged-in
// app lives on app.thegodstool.com. Any other address (localhost, the Railway preview address) is left alone.
export const APP_HOST = 'app.thegodstool.com'
export const SITE_HOSTS = ['thegodstool.com', 'www.thegodstool.com']
export const APP_ORIGIN = `https://${APP_HOST}`
export const SITE_ORIGIN = 'https://thegodstool.com'

export const onSite = () => SITE_HOSTS.includes(window.location.hostname)
export const onApp = () => window.location.hostname === APP_HOST

// Pages that only make sense once you are signed in. Old links to them on the public site are forwarded.
const APP_PATHS = ['/dashboard', '/sources', '/catalog', '/pdf', '/flow', '/analysis', '/audit', '/team', '/billing', '/docs', '/tunneling', '/auth/callback', '/thank-you']

// Runs once before the page is drawn. Returns true when it is sending the visitor somewhere else.
export function hostRedirect(): boolean {
  const { pathname, search, hash } = window.location
  if (onSite()) {
    const isAppPath = APP_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
    if (isAppPath) {
      window.location.replace(APP_ORIGIN + pathname + search + hash)
      return true
    }
  }
  if (onApp()) {
    // The app address is not for reading. Blog posts and the static guides belong on the public site.
    if (pathname.startsWith('/blog') || pathname.endsWith('.html')) {
      window.location.replace(SITE_ORIGIN + pathname + search + hash)
      return true
    }
    // Keep the app out of search results.
    const m = document.createElement('meta')
    m.name = 'robots'
    m.content = 'noindex, nofollow'
    document.head.appendChild(m)
  }
  return false
}

// Sign-in always happens on the app address, because the session is stored per address.
export function signInUrl(opts: { register?: boolean; after?: string } = {}) {
  const q = new URLSearchParams({ signin: '1' })
  if (opts.register === false) q.set('mode', 'login')
  if (opts.after && opts.after.startsWith('/') && !opts.after.startsWith('//')) q.set('after', opts.after)
  return `${APP_ORIGIN}/?${q.toString()}`
}
