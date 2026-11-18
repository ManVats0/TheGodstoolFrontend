// Writes plain-HTML versions of the pages that are otherwise built by JavaScript: pricing, contact, the blog home,
// every blog post, plus feedback and status (kept out of search results). Each gets its own title, description,
// canonical address and structured data, and a readable text body. The app replaces that text as soon as it loads,
// so people see the normal page; search engines and AI bots that do not run JavaScript see real content.
//
// Without this, these addresses all returned the homepage's HTML (including its canonical tag), so search engines
// could treat /pricing as a copy of the homepage.
//
// Each page is written as <address>/index.html (for example dist/pricing/index.html) and the web server is told which
// address serves which file (end of this script).
// Run it after vite build and BEFORE home-static.mjs, while dist/index.html is still the plain shell.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'

const content = JSON.parse(readFileSync('src/home/content.json', 'utf8'))
const site = content.site
const shell = 'dist/index.html'
if (!existsSync(shell)) throw new Error('run vite build first')
const plainShell = readFileSync(shell, 'utf8')
if (!plainShell.includes('<!--HEAD_SEO-->')) throw new Error('dist/index.html is missing <!--HEAD_SEO--> (run before home-static)')
if (!/<div id="root"><\/div>/.test(plainShell)) throw new Error('root div not found in dist/index.html')

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
// Post text allows **bold**, `code` and [link](url). Escape first, then turn those into tags.
const rich = t =>
  esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, (_, a, h) => `<a href="${h}">${a}</a>`)
const plain = t =>
  t
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')

const nav = `<nav aria-label="Main"><a href="/">${esc(site.name)}</a> · <a href="/try.html">Try it free</a> · <a href="/guides.html">Guides</a> · <a href="/pricing">Pricing</a> · <a href="/faq.html">FAQ</a> · <a href="/blog">Blog</a> · <a href="/about.html">About</a> · <a href="/contact">Contact</a></nav>`
const footer = `<footer><p><a href="/">Home</a> · <a href="/guides.html">Guides</a> · <a href="/faq.html">FAQ</a> · <a href="/about.html">About</a> · <a href="/pricing">Pricing</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a> · <a href="/refund.html">Refunds</a></p></footer>`

const crumbs = items => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name,
    item: `${site.url}${path}`,
  })),
})

// Builds one page from the plain shell and writes it. `noindex` pages stay out of search results.
function writePage({ file, title, description, path, type = 'website', noindex = false, ld = [], body, maxTitle = 60 }) {
  if (title.length > maxTitle) throw new Error(`${file}: title is ${title.length} characters, keep it to ${maxTitle} or fewer`)
  if (description.length > 155) throw new Error(`${file}: description is ${description.length} characters, keep it to 155 or fewer`)
  const url = `${site.url}${path}`
  const head = `
  <link rel="canonical" href="${url}" />
${noindex ? '  <meta name="robots" content="noindex, follow" />\n' : ''}  <meta property="og:type" content="${type}" />
  <meta property="og:site_name" content="${esc(site.name)}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${site.url}/og-image.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
${ld.map(o => `  <script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n')}
`
  let html = plainShell
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
  html = html.replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(description)}" />`)
  html = html.replace('<!--HEAD_SEO-->', head)
  html = html.replace('<div id="root"></div>', `<div id="root"><main id="seo-static">${nav}${body}${footer}</main></div>`)
  const dir = file.includes('/') ? 'dist/' + file.slice(0, file.lastIndexOf('/')) : null
  if (dir) mkdirSync(dir, { recursive: true })
  writeFileSync('dist/' + file, html)
}

const webPage = (name, description, path) => ({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name,
  description,
  url: `${site.url}${path}`,
  inLanguage: 'en',
})

// ---------- pricing ----------
const pr = content.pricing
const cheapest = Math.min(...pr.plans.map(p => Number(p.price)))
writePage({
  file: 'pricing/index.html',
  title: `Pricing: Free Plan, 14-Day Trial, Plans from $${cheapest}`,
  description: `Start free: 3 sources, CSV files up to 5 MB, 5,000 rows per run. Paid plans from $${cheapest} a month, or buy credits with no subscription.`,
  path: '/pricing',
  ld: [
    webPage(`Pricing | ${site.name}`, pr.sub, '/pricing'),
    crumbs([['Home', '/'], ['Pricing', '/pricing']]),
  ],
  body: `
<h1>Pricing</h1>
<p>${esc(pr.h2)} ${esc(pr.sub)}</p>
<section><h2>Free plan and trial</h2><p>${esc(pr.freeLine)} New accounts also get a 14-day trial with every feature included and no card needed. <a href="/try.html">Try one PDF table or CSV with no sign-up</a>.</p></section>
<section><h2>Paid plans (USD per month)</h2><ul>${pr.plans
    .map(p => `<li><h3>${esc(p.name)}: $${esc(p.price)} a month</h3><ul>${p.features.map(f => `<li>${esc(f)}</li>`).join('')}</ul></li>`)
    .join('')}</ul><p>${esc(pr.foot)}</p></section>
<section><h2>${esc(pr.creditsTitle)}</h2><p>${esc(pr.creditsBody)}</p></section>
<section><h2>Need a quote?</h2><p>Bulk credits, team plans, database or API sources and invoicing are quoted by email. <a href="/contact">Get a quote</a> or write to <a href="mailto:${site.email}">${site.email}</a>.</p></section>
<section><h2>Before you decide</h2><ul><li><a href="/faq.html">Frequently asked questions</a></li><li><a href="/guides.html">Cleaning guides</a></li><li><a href="/about.html">About the builder, and where your data goes</a></li></ul></section>`,
})

// ---------- contact ----------
writePage({
  file: 'contact/index.html',
  title: `Contact ${site.name}: Questions, Quotes, Support`,
  description: 'Write to the builder for support, a quote for teams or bulk credits, or a file that came out wrong. A real person reads it.',
  path: '/contact',
  ld: [
    { ...webPage(`Contact | ${site.name}`, 'Support, quotes and questions.', '/contact'), '@type': 'ContactPage' },
    crumbs([['Home', '/'], ['Contact', '/contact']]),
  ],
  body: `
<h1>Contact ${esc(site.name)}</h1>
<p>Questions, a file that came out wrong, a feature you need, or a quote for a team: write to <a href="mailto:${site.email}">${site.email}</a>. A real person reads it.</p>
<section><h2>Get a quote</h2><p>Bulk credits, team plans, database or API sources and invoicing are quoted by email. Quotes cover access to the tool, not a done-for-you cleaning service. See the <a href="/pricing">plans and credits</a> first if you are not sure what you need.</p></section>
<section><h2>Before you write</h2><ul><li><a href="/faq.html">Frequently asked questions</a></li><li><a href="/guides.html">Cleaning guides</a></li><li><a href="/try.html">Try one file free, no sign-up</a></li></ul></section>`,
})

// ---------- feedback and status: shown to people, kept out of search results ----------
writePage({
  file: 'feedback/index.html',
  title: `Feedback | ${site.name}`,
  description: 'Tell us what worked and what did not.',
  path: '/feedback',
  noindex: true,
  body: `<h1>Feedback</h1><p>Tell us what worked and what did not. You can also write to <a href="mailto:${site.email}">${site.email}</a>.</p>`,
})
writePage({
  file: 'status/index.html',
  title: `Service Status | ${site.name}`,
  description: 'Whether sign-in and the data cleaning engine are working, and any problem we are working on.',
  path: '/status',
  noindex: true,
  body: `<h1>Service status</h1><p>Whether sign-in and the data cleaning engine are working, and any problem we are working on. Need help? Email <a href="mailto:${site.email}">${site.email}</a>.</p>`,
})

// ---------- blog ----------
// The post list is read straight from src/blog/posts.ts (a plain JavaScript array), like blog-feeds.mjs does.
const src = readFileSync('src/blog/posts.ts', 'utf8')
const start = src.indexOf('export const PUBLISHED: Post[] = [')
const end = src.indexOf('\n]\n', start)
if (start < 0 || end < 0) throw new Error('pages-static: could not find the PUBLISHED list in src/blog/posts.ts')
const PUBLISHED = new Function('return ' + src.slice(start + 'export const PUBLISHED: Post[] = '.length, end + 2))()
const today = new Date().toISOString().slice(0, 10)
const full = p => (p.published.length === 7 ? p.published + '-01' : p.published)
const posts = PUBLISHED.filter(p => full(p) <= today).sort((a, b) => (full(a) < full(b) ? 1 : -1))
const excerptOf = p => {
  if (p.excerpt) return p.excerpt
  const first = p.body.find(b => b.type === 'p')
  const t = plain(first ? first.text : '')
  return t.length <= 170 ? t : t.slice(0, 170).replace(/\s+\S*$/, '') + '…'
}
const blogDesc = 'Straight answers on cleaning and moving data: how it works, how to keep it safe, and how to get clean results fast.'

writePage({
  file: 'blog/index.html',
  title: `Data Cleaning and Data Safety Blog | ${site.name}`,
  description: blogDesc,
  path: '/blog',
  ld: [
    {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: `${site.name} Blog`,
      url: `${site.url}/blog`,
      description: blogDesc,
      blogPost: posts.map(p => ({ '@type': 'BlogPosting', headline: p.title, url: `${site.url}/blog/${p.slug}`, datePublished: p.published })),
    },
    crumbs([['Home', '/'], ['Blog', '/blog']]),
  ],
  body: `
<h1>Blog</h1>
<p>${esc(blogDesc)} For step-by-step fixes, see the <a href="/guides.html">cleaning guides</a>.</p>
${posts
  .map(p => `<article><h2><a href="/blog/${p.slug}">${esc(p.title)}</a></h2><p>${esc(p.tag)} · ${esc(p.published)}</p><p>${esc(excerptOf(p))}</p></article>`)
  .join('\n')}`,
})

const block = b => {
  if (b.type === 'p') return `<p>${rich(b.text)}</p>`
  if (b.type === 'h') return `<h2>${esc(b.text)}</h2>`
  if (b.type === 'ul') return `<ul>${b.items.map(i => `<li>${rich(i)}</li>`).join('')}</ul>`
  if (b.type === 'quote') return `<blockquote>${rich(b.text)}</blockquote>`
  if (b.type === 'tip') return `<p><strong>Tip:</strong> ${rich(b.text)}</p>`
  if (b.type === 'diagram') return b.caption ? `<p><em>${esc(b.caption)}</em></p>` : ''
  return ''
}
for (const p of posts) {
  const desc = excerptOf(p).slice(0, 155)
  const others = posts.filter(o => o.slug !== p.slug)
  writePage({
    file: `blog/${p.slug}/index.html`,
    // Post titles can be long; the brand is added only when the whole title still fits in a search result.
    title: `${p.title} | ${site.name}`.length <= 70 ? `${p.title} | ${site.name}` : p.title,
    maxTitle: 90,
    description: desc.length === 155 ? desc.replace(/\s+\S*$/, '') : desc,
    path: `/blog/${p.slug}`,
    type: 'article',
    ld: [
      {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: p.title,
        description: excerptOf(p),
        datePublished: p.published,
        mainEntityOfPage: `${site.url}/blog/${p.slug}`,
        author: { '@type': 'Organization', name: site.name, url: `${site.url}/` },
        publisher: { '@type': 'Organization', name: site.name, url: `${site.url}/` },
      },
      crumbs([['Home', '/'], ['Blog', '/blog'], [p.title, `/blog/${p.slug}`]]),
    ],
    body: `
<article>
<p><a href="/blog">Blog</a> › ${esc(p.tag)}</p>
<h1>${esc(p.title)}</h1>
<p>${esc(p.published)}${p.readTime ? ' · ' + esc(p.readTime) : ''}</p>
${p.body.map(block).join('\n')}
</article>
<section><h2>More to read</h2><ul>${others.map(o => `<li><a href="/blog/${o.slug}">${esc(o.title)}</a></li>`).join('')}<li><a href="/guides.html">All cleaning guides</a></li><li><a href="/try.html">Try one file free, no sign-up</a></li></ul></section>`,
  })
}

// ---------- web server: which address serves which file ----------
// How the server (serve) works matters here:
//   - It only rewrites an address when no file of that name exists, uses the FIRST rule that matches, and then keeps
//     applying the remaining rules to the result.
//   - Its `-s` flag puts a catch-all rule first, which hides every other rule. So the app is started WITHOUT `-s`
//     (see nixpacks.toml) and every address that should show the app is listed here by name instead.
// The list of app addresses is read from the routes in src/App.tsx, so a new page there needs no extra step.
// An address that is neither a file nor in this list returns a normal "not found" page.
const cfgPath = 'dist/serve.json'
const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'))
const staticPages = [
  ['/', '/index.html'],
  ['/pricing', '/pricing/index.html'],
  ['/contact', '/contact/index.html'],
  ['/feedback', '/feedback/index.html'],
  ['/status', '/status/index.html'],
  ['/blog', '/blog/index.html'],
  ...posts.map(p => [`/blog/${p.slug}`, `/blog/${p.slug}/index.html`]),
  ['/faq', '/faq.html'],
  ['/terms', '/terms.html'],
]
const appSrc = readFileSync('src/App.tsx', 'utf8')
const appPaths = [...new Set([...appSrc.matchAll(/path="(\/[^"*]*)"/g)].map(m => m[1]).concat(['/auth/callback']))]
const taken = new Set(staticPages.map(([s]) => s))
// Pages made by this script are served by their own rules; a blog address not listed (a typo) is "not found".
const appRules = appPaths.filter(p => !taken.has(p) && p !== '/blog/:slug').map(source => ({ source, destination: '/index.html' }))
const keep = (cfg.rewrites || []).filter(r => r.source !== '/**' && !taken.has(r.source))
cfg.rewrites = [...staticPages.map(([source, destination]) => ({ source, destination })), ...keep, ...appRules]
writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n')

console.log(`pages-static: wrote pricing, contact, feedback, status, blog home and ${posts.length} blog posts`)
