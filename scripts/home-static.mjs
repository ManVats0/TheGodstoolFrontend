// Rewrites dist/index.html into the homepage: same shell plus the homepage text,
// head tags and JSON-LD as plain HTML, for crawlers that do not run JavaScript (most AI bots).
// The server sends every route to index.html, so a small inline script in index.html
// removes the homepage-only pieces when the page is not "/".
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const c = JSON.parse(readFileSync('src/home/content.json', 'utf8'))
const shell = 'dist/index.html'
if (!existsSync(shell)) throw new Error('run vite build first')
let html = readFileSync(shell, 'utf8')

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const url = c.site.url

// ---------- head ----------
const offers = [
  { name: 'Free', price: '0', desc: c.pricing.freeLine },
  ...c.pricing.plans.map((p) => ({ name: p.name, price: p.price, desc: p.features.join(', ') })),
].map((o) => ({
  '@type': 'Offer', name: o.name, price: o.price, priceCurrency: 'USD', description: o.desc, url: `${url}/#pricing`,
}))

const ld = [
  {
    '@context': 'https://schema.org', '@type': 'Organization', name: c.site.name, url,
    logo: `${url}/the_gods_tool_logo_3d.png`, email: c.site.email,
    sameAs: ['https://www.youtube.com/@TheGodsTool-DataPipeline', 'https://x.com/TheGodsToojsg0'],
  },
  { '@context': 'https://schema.org', '@type': 'WebSite', name: c.site.name, url },
  {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: c.site.name, url,
    applicationCategory: 'BusinessApplication', operatingSystem: 'Web',
    description: c.site.description,
    featureList: c.features.items.map((f) => f.title),
    offers,
  },
  {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: c.faq.items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  },
]

const headTags = `
  <link rel="canonical" href="${url}/" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${esc(c.site.name)}" />
  <meta property="og:title" content="${esc(c.site.ogTitle)}" />
  <meta property="og:description" content="${esc(c.site.ogDescription)}" />
  <meta property="og:url" content="${url}/" />
  <meta property="og:image" content="${url}/og-image.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${esc(c.hero.h1)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(c.site.ogTitle)}" />
  <meta name="twitter:description" content="${esc(c.site.ogDescription)}" />
  <meta name="twitter:image" content="${url}/og-image.png" />
${ld.map((o) => `  <script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n')}
`

html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(c.site.title)}</title>`)
html = html.replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(c.site.description)}" />`)
if (!html.includes('<!--HEAD_SEO-->')) throw new Error('index.html is missing <!--HEAD_SEO-->')
html = html.replace('<!--HEAD_SEO-->', headTags)

// ---------- body ----------
const li = (items) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`
const card = (it) => `<li><h3>${esc(it.title)}</h3><p>${esc(it.body)}</p></li>`
const body = `
<main id="seo-static">
<nav aria-label="Main"><a href="/">${esc(c.site.name)}</a> · <a href="#features">Features</a> · <a href="#pricing">Pricing</a> · <a href="#quote">Get a quote</a> · <a href="/blog">Blog</a> · <a href="/faq.html">FAQ</a> · <a href="/contact">Contact</a></nav>
<p>${esc(c.hero.eyebrow)}</p>
<h1>${esc(c.hero.h1)}</h1>
<p>${esc(c.hero.sub)}</p>
${li(c.hero.sources.map(esc))}
<p>${esc(c.hero.note)}</p>
<section><h2>${esc(c.problem.h2)}</h2><p>${esc(c.problem.intro)}</p><ul>${c.problem.items.map(card).join('')}</ul><p>${esc(c.problem.fix)}</p></section>
<section><h2>${esc(c.audience.h2)}</h2><ul>${c.audience.items.map(card).join('')}</ul></section>
<section id="features"><h2>${esc(c.features.h2)}</h2><p>${esc(c.features.intro)}</p><ul>${c.features.items.map(card).join('')}</ul></section>
<section id="how"><h2>${esc(c.steps.h2)}</h2><ol>${c.steps.items.map(card).join('')}</ol></section>
<section><h2>${esc(c.alerts.h2)}</h2><p>${esc(c.alerts.body)}</p></section>
<section id="pricing"><h2>${esc(c.pricing.h2)}</h2><p>${esc(c.pricing.sub)}</p>
<ul>${c.pricing.plans.map((p) => `<li><h3>${esc(p.name)}: $${esc(p.price)} a month</h3>${li(p.features.map(esc))}</li>`).join('')}</ul>
<p>${esc(c.pricing.freeLine)}</p><p><strong>${esc(c.pricing.creditsTitle)}</strong> ${esc(c.pricing.creditsBody)}</p><p>${esc(c.pricing.foot)}</p></section>
<section id="quote"><h2>${esc(c.quote.h2)}</h2><p>${esc(c.quote.body)}</p>${li(c.quote.points.map(esc))}<p>${esc(c.quote.note)} Email <a href="mailto:${c.site.email}">${c.site.email}</a> or use the form on this page.</p></section>
<section id="faq"><h2>${esc(c.faq.h2)}</h2>${c.faq.items.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}</section>
<section><h2>${esc(c.cta.h2)}</h2><p>${esc(c.cta.body)}</p></section>
<footer><a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a> · <a href="/refund.html">Refunds</a> · <a href="/blog">Blog</a></footer>
</main>`

if (!/<div id="root"><\/div>/.test(html)) throw new Error('root div not found in dist/index.html')
html = html.replace('<div id="root"></div>', `<div id="root">${body}</div>`)

writeFileSync(shell, html)
console.log(`homepage written to index.html (${Math.round(html.length / 1024)} KB)`)
