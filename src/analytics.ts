// One place for Google Analytics events. Rules: never send file contents, file names, emails or anything typed by a
// person. Only short labels such as a plan name or a source type. A tracking problem must never break the page.

type Params = Record<string, string | number | boolean | undefined>

const last: Record<string, number> = {}

export function track(name: string, params: Params = {}, minGapMs = 0) {
  try {
    const now = Date.now()
    if (minGapMs && last[name] && now - last[name] < minGapMs) return
    last[name] = now
    const clean: Record<string, string | number | boolean> = {}
    for (const [k, v] of Object.entries(params))
      if (v !== undefined) clean[k] = typeof v === 'string' ? v.slice(0, 100) : v
    ;(window as any).gtag?.('event', name, clean)
  } catch {
    /* tracking must never break the page */
  }
}

// Called once at startup. A cleaned file is saved by a script clicking a hidden link, so that click is where a
// download can be seen without editing every screen that makes one.
export function initAnalytics() {
  try {
    const proto = HTMLAnchorElement.prototype as any
    if (proto.__gtPatched) return
    const click = proto.click
    proto.click = function (this: HTMLAnchorElement) {
      try {
        if (this.hasAttribute('download'))
          track('file_downloaded', { kind: /\.csv$/i.test(this.download || '') ? 'csv' : 'other' }, 2000)
      } catch {
        /* ignore */
      }
      return click.apply(this, arguments as any)
    }
    proto.__gtPatched = true
  } catch {
    /* ignore */
  }
}

// Called from the network wrapper for our own service. Only counts calls that succeeded.
export function trackApiCall(url: string, ok: boolean) {
  if (!ok) return
  if (url.includes('/api/analyze')) track('analysis_run', {}, 8000)
  else if (url.includes('/api/clean-data') || url.includes('/api/sql-clean'))
    track('clean_run', { mode: url.includes('/api/sql-clean') ? 'sql' : 'steps' }, 8000)
  else if (url.includes('/api/pdf/tables')) track('pdf_extracted', {}, 8000)
}
