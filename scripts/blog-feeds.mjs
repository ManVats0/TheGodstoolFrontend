// Runs after `vite build`. Adds every published blog post to dist/sitemap.xml and writes dist/blog/rss.xml,
// so search engines and feed readers learn about new posts without anyone editing those files by hand.
import fs from 'fs'

const SITE = 'https://thegodstool.com'

// Read the post list straight from src/blog/posts.ts (no extra tools needed): it is a plain JavaScript array.
const src = fs.readFileSync('src/blog/posts.ts', 'utf8')
const start = src.indexOf('export const PUBLISHED: Post[] = [')
const end = src.indexOf('\n]\n', start)
if (start < 0 || end < 0) throw new Error('blog-feeds: could not find the PUBLISHED list in src/blog/posts.ts')
const PUBLISHED = new Function('return ' + src.slice(start + 'export const PUBLISHED: Post[] = '.length, end + 2))()

const plain = t => t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/`(.+?)`/g, '$1').replace(/\[(.+?)\]\(.+?\)/g, '$1')
const excerptOf = p => {
  if (p.excerpt) return p.excerpt
  const first = p.body.find(b => b.type === 'p')
  const t = plain(first ? first.text : '')
  return t.length <= 170 ? t : t.slice(0, 170).replace(/\s+\S*$/, '') + '…'
}
const today = new Date().toISOString().slice(0, 10)
const posts = PUBLISHED.filter(p => (p.published.length === 7 ? p.published + '-01' : p.published) <= today)
  .sort((a, b) => (a.published < b.published ? 1 : a.published > b.published ? -1 : 0))

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const dateOf = p => new Date(p.published.length === 7 ? p.published + '-01' : p.published)

// sitemap
const smPath = 'dist/sitemap.xml'
if (fs.existsSync(smPath)) {
  let sm = fs.readFileSync(smPath, 'utf8')
  const urls = posts.filter(p => !sm.includes(`/blog/${p.slug}<`)).map(p =>
    `  <url>\n    <loc>${SITE}/blog/${esc(p.slug)}</loc>\n    <lastmod>${esc(p.published)}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`).join('')
  sm = sm.replace('</urlset>', urls + '</urlset>')
  fs.writeFileSync(smPath, sm)
}

// RSS
fs.mkdirSync('dist/blog', { recursive: true })
const items = posts.map(p => `    <item>
      <title>${esc(p.title)}</title>
      <link>${SITE}/blog/${esc(p.slug)}</link>
      <guid isPermaLink="true">${SITE}/blog/${esc(p.slug)}</guid>
      <pubDate>${dateOf(p).toUTCString()}</pubDate>
      <category>${esc(p.tag)}</category>
      <description>${esc(excerptOf(p))}</description>
    </item>`).join('\n')
fs.writeFileSync('dist/blog/rss.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>The God's Tool Blog</title>
    <link>${SITE}/blog</link>
    <description>Straight answers on cleaning and moving data.</description>
    <language>en</language>
${items}
  </channel>
</rss>
`)
console.log(`Blog feeds: ${posts.length} post(s) added to sitemap and RSS`)
