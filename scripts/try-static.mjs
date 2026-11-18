// Writes dist/try.html: the shell plus the free-try page text, head tags and JSON-LD as plain HTML, so crawlers that do
// not run JavaScript (most AI bots) can read the page. The app replaces this text as soon as it loads.
// Run it after vite build and BEFORE home-static.mjs, while dist/index.html is still the plain shell.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const t = JSON.parse(readFileSync('src/home/try-content.json', 'utf8'))
const site = JSON.parse(readFileSync('src/home/content.json', 'utf8')).site
const shell = 'dist/index.html'
if (!existsSync(shell)) throw new Error('run vite build first')
let html = readFileSync(shell, 'utf8')
if (!html.includes('<!--HEAD_SEO-->'))
  throw new Error('dist/index.html is missing <!--HEAD_SEO--> (run try-static before home-static)')
if (t.title.length > 60) throw new Error(`title is ${t.title.length} characters, keep it to 60 or fewer`)
if (t.description.length > 155)
  throw new Error(`description is ${t.description.length} characters, keep it to 155 or fewer`)

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const url = `${site.url}${t.path}`

const ld = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: "The God's Tool free PDF table and CSV check",
    url,
    description: t.description,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free try: one file, first 20 rows, no account',
    },
    featureList: [
      'PDF table to rows and columns',
      'Counts of blanks, duplicates, extra spaces, numbers stored as text and mixed dates',
      'First 20 rows cleaned in one click',
    ],
    publisher: { '@type': 'Organization', name: site.name, url: `${site.url}/` },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${site.url}/` },
      { '@type': 'ListItem', position: 2, name: 'Free try', item: url },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: t.faq.items.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  },
]

const head = `
  <link rel="canonical" href="${url}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${esc(site.name)}" />
  <meta property="og:title" content="${esc(t.ogTitle)}" />
  <meta property="og:description" content="${esc(t.description)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${site.url}/og-image.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(t.ogTitle)}" />
  <meta name="twitter:description" content="${esc(t.description)}" />
${ld.map(o => `  <script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n')}
`
html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(t.title)}</title>`)
html = html.replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(t.description)}" />`)
html = html.replace('<!--HEAD_SEO-->', head)

const body = `
<main id="seo-try">
<nav aria-label="Main"><a href="/">${esc(site.name)}</a> · <a href="/guides.html">Guides</a> · <a href="/pricing">Pricing</a> · <a href="/faq.html">FAQ</a> · <a href="/blog">Blog</a> · <a href="/about.html">About</a></nav>
<p>${esc(t.badge)}</p>
<h1>${esc(t.h1)}</h1>
<p>${esc(t.answer)}</p>
<section><h2>${esc(t.how.h2)}</h2><ol>${t.how.items.map(i => `<li><h3>${esc(i.title)}</h3><p>${esc(i.body)}</p></li>`).join('')}</ol></section>
<section><h2>${esc(t.account.h2)}</h2><p>${esc(t.account.intro)}</p>${t.account.tiers.map(x => `<h3>${esc(x.name)} (${esc(x.tag)})</h3><ul>${x.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`).join('')}<p>${esc(t.account.note)}</p><p><a href="/">${esc(t.account.cta)}</a>. ${esc(t.account.ctaNote)}</p></section>
<section><h2>${esc(t.limits.h2)}</h2><p>${esc(t.limits.body)}</p></section>
<section><h2>${esc(t.faq.h2)}</h2>${t.faq.items.map(f => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}</section>
<section><h2>Keep reading</h2><ul>${t.related.map(r => `<li><a href="${r.href}">${esc(r.title)}</a>: ${esc(r.desc)}</li>`).join('')}</ul></section>
<footer><p><a href="/">Home</a> · <a href="/guides.html">Guides</a> · <a href="/faq.html">FAQ</a> · <a href="/about.html">About</a> · <a href="/pricing">Pricing</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></p></footer>
</main>`
if (!/<div id="root"><\/div>/.test(html)) throw new Error('root div not found in dist/index.html')
html = html.replace('<div id="root"></div>', `<div id="root">${body}</div>`)
writeFileSync('dist/try.html', html)
console.log(
  `try.html written (${Math.round(html.length / 1024)} KB), title ${t.title.length} chars, description ${t.description.length} chars`
)
