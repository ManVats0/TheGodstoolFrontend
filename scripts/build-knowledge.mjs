// Writes dist/knowledge.txt: the plain text of the public site, used by the support chat as its only source.
// It is rebuilt on every deploy, so the chat always answers from the pages as they are now.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const site = JSON.parse(readFileSync('src/home/content.json', 'utf8'))
const origin = site.site.url
const parts = []

const decode = s =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;|&rsquo;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&middot;/g, '·')

function htmlText(html) {
  let h = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
  h = h
    .replace(/<(h[1-6])[^>]*>/gi, '\n\n## ')
    .replace(/<\/(h[1-6]|p|div|li|tr|section|article|table|ul|ol)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/t[dh]>/gi, ' | ')
  h = decode(h.replace(/<[^>]+>/g, ''))
  return h
    .split('\n')
    .map(l => l.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
}

// Every readable string in a JSON file, skipping links, ids and image names.
function jsonText(o, out = []) {
  if (typeof o === 'string') {
    if (!/^(\/|https?:|#)/.test(o) && o.length > 2) out.push(o)
  } else if (Array.isArray(o)) o.forEach(x => jsonText(x, out))
  else if (o && typeof o === 'object')
    for (const [k, v] of Object.entries(o))
      if (!['href', 'id', 'path', 'action', 'icon', 'image', 'updated', 'url'].includes(k)) jsonText(v, out)
  return out
}

parts.push(`# The God's Tool: website text\nSupport email: ${site.site.email}. Site: ${origin}. Updated at build time.`)
parts.push(`## Home page (${origin}/)\n` + jsonText(site).join('\n'))
const t = JSON.parse(readFileSync('src/home/try-content.json', 'utf8'))
parts.push(`## Free try page (${origin}/try.html)\n` + jsonText(t).join('\n'))

// Plan numbers that live only in the pricing screen's code (AI actions a day, people signed in at once).
const pr = readFileSync('src/pages/Pricing.tsx', 'utf8')
const plans = [
  ...pr.matchAll(/usdMonthly:\s*(\d+|null[^,]*),\s*name:\s*'(\w+)'[\s\S]*?aiPerDay:\s*(\d+),\s*userLimit:\s*(\d+)/g),
]
if (plans.length)
  parts.push(
    '## Plan details (pricing page)\n' +
      plans
        .map(
          m =>
            `- ${m[2]}: ${m[1].startsWith('null') ? 'custom price' : '$' + m[1] + ' a month'}, ${m[3]} AI actions a day, ${m[4]} ${Number(m[4]) > 1 ? 'people' : 'person'} signed in at once`
        )
        .join('\n')
  )

// What each screen of the app does, taken from the in-app documentation (src/pages/Documentation.tsx), so the chat can
// answer "how do I ..." questions. The DOCS object only holds plain text, so it can be read as it is.
function appDocs() {
  const src = readFileSync('src/pages/Documentation.tsx', 'utf8')
  const start = src.indexOf('const DOCS')
  if (start < 0) return ''
  const open = src.indexOf('= {', start) + 2
  let depth = 0
  let end = open
  let quote = ''
  for (let i = open; i < src.length; i++) {
    const c = src[i]
    if (quote) {
      if (c === '\\') i++
      else if (c === quote) quote = ''
    } else if (c === "'" || c === '"' || c === '`') quote = c
    else if (c === '{') depth++
    else if (c === '}' && --depth === 0) {
      end = i + 1
      break
    }
  }
  let docs
  try {
    docs = new Function('return (' + src.slice(open, end) + ')')()
  } catch (e) {
    console.warn('knowledge: could not read the in-app documentation (' + e.message + ')')
    return ''
  }
  const out = [
    `## How the app works (the in-app Documentation page, app.thegodstool.com/docs after signing in)`,
  ]
  for (const [path, d] of Object.entries(docs)) {
    out.push(`### ${d.title} (app page ${path})`)
    for (const sec of d.sections) {
      out.push(`**${sec.heading}.** ${sec.body}`)
      for (const k of ['tip', 'note', 'warning']) if (sec[k]) out.push(`${k[0].toUpperCase() + k.slice(1)}: ${sec[k]}`)
      for (const e of sec.errors || []) out.push(`Problem "${e.code}": ${e.cause} Fix: ${e.fix}`)
    }
  }
  return out.join('\n')
}
const docsText = appDocs()
if (docsText) parts.push(docsText)

// Product updates (src/updates.json), newest first, so the chat can say what changed and when.
const updates = JSON.parse(readFileSync('src/updates.json', 'utf8')).sort((a, b) => b.date.localeCompare(a.date))
parts.push(
  '## Product updates (newest first)\n' +
    updates.map(u => `- ${u.date.slice(0, 10)}: ${u.title}. ${u.text} ${u.youCan}`).join('\n')
)

const pages = [
  ['faq.html', 'FAQ'],
  ['guides.html', 'Guides'],
  ['about.html', 'About'],
  ['privacy.html', 'Privacy policy'],
  ['terms.html', 'Terms of service'],
  ['refund.html', 'Refund policy'],
  ['bank-statement-pdf-to-excel.html', 'Guide'],
  ['fix-mixed-date-formats-csv.html', 'Guide'],
  ['remove-duplicate-customers-csv.html', 'Guide'],
  ['fix-numbers-stored-as-text-csv.html', 'Guide'],
  ['csv-data-cleaning-checklist.html', 'Guide'],
  ['pdf-table-to-excel-csv.html', 'Guide'],
]
for (const [f, kind] of pages) {
  if (!existsSync(f)) continue
  const raw = readFileSync(f, 'utf8')
  const title = decode((raw.match(/<title>([\s\S]*?)<\/title>/i) || [, f])[1]).trim()
  parts.push(`## ${kind}: ${title} (${origin}/${f})\n` + htmlText(raw))
}
// Drop lines that already appeared (the same sentence is on the home page, the FAQ and the guides). Less to read, lower cost.
const seen = new Set()
const text =
  parts
    .join('\n\n')
    .split('\n')
    .filter(l => {
      const k = l.trim()
      if (k.length < 25 || k.startsWith('#') || k.startsWith('-')) return true
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    .join('\n') + '\n'
writeFileSync('dist/knowledge.txt', text)
console.log(
  `knowledge.txt written (${Math.round(text.length / 1024)} KB, about ${Math.round(text.length / 4).toLocaleString()} tokens)`
)
