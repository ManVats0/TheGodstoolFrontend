// ─────────────────────────────────────────────────────────────────────────────────────────────
// HOW TO PUBLISH A NEW POST
//   1. Copy an entry in PUBLISHED below, give it a new `slug` (the page address), `title`, `tag`, and body.
//   2. Set `published` to the real date: '2026-11-04' (day included) or '2026-11' (month only).
//   3. Optional: `excerpt` (the short preview). If you leave it out, the first paragraph is used.
//   4. If the topic was listed in UPCOMING, delete that line. Save, merge, done: the post appears on the blog
//      home, gets its own page, and is added to the sitemap and RSS feed automatically at the next build.
// Body blocks:  { type: 'p', text }  paragraph      { type: 'h', text }   section heading
//               { type: 'ul', items: [...] }  bullet list   { type: 'quote', text }  pull quote   { type: 'tip', text }  highlighted tip
// Inside text you can use **bold**, `code` and [link text](https://example.com).
// ─────────────────────────────────────────────────────────────────────────────────────────────

export type PostBlock =
  | { type: 'p'; text: string }
  | { type: 'h'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'tip'; text: string }

export type Post = {
  slug: string
  tag: string
  readTime?: string
  published: string // 'YYYY-MM-DD' or 'YYYY-MM'
  title: string
  excerpt?: string
  body: PostBlock[]
}

export type Upcoming = { title: string; tag: string; blurb: string }

export const PUBLISHED: Post[] = [
  {
    slug: 'is-my-data-safe',
    tag: 'Security',
    readTime: '5 min read',
    published: '2026-08',
    title: 'Is my data actually safe on this platform?',
    body: [
      { type: 'p', text: `Every time someone asks about connecting a database, this is the real question underneath it. Not "what features do you have" — it's "what happens to my data once I hand it over." Fair enough. Here's the straight answer.` },
      { type: 'p', text: `Start with a test run, not your real database. Point the platform at a dummy table, a throwaway sheet, anything you don't care about, and watch what it actually does — how it profiles the data, what it flags, what fixes it suggests. Your real numbers are never touched during this. Once you've seen it work and you trust the process, swapping in your actual database is the exact same steps, just with real credentials this time.` },
      { type: 'p', text: `And here's the part that usually surprises people: we don't keep your data. Not a cached copy, not a backup, nothing sitting in a warehouse somewhere with your company's name on it. What we store is your name and your email — that's the account info, full stop. Everything else passes through and leaves.` },
      { type: 'p', text: `So what actually happens when you run a pipeline? Your database never moves. It stays exactly where it lives, behind whatever firewall or VPN you already have. A small agent sits on a machine you control and opens an encrypted connection out to us. When you kick off a query, it travels through that tunnel, gets executed right there on your own database, and the results come straight back the same way. You see it on your dashboard, and that's the end of the trip for that data — we don't hang onto it after.` },
      { type: 'h', text: 'Setting up the connection' },
      { type: 'p', text: `If your database is sitting behind a firewall (most are, and it should stay that way), you don't open a port or change any network settings. Instead you run a lightweight script — the agent — on any machine that already has access to your database.` },
      { type: 'p', text: `It goes like this: install two small Python packages with one pip command. Download the agent file from your dashboard. Grab a one-time connection token from your account and keep it somewhere safe — this is what tells our backend the agent belongs to you. Run the script, and it'll ask for your server URL, that token, and your database's host, username, and password. None of this goes anywhere except between your machine and your own backend — no third party sees it. Last step, add your database as a source in the browser, plug in the same host and database name, hit test connection, and you're live.` },
      { type: 'p', text: `Every query after that runs through the same tunnel, every time.` },
      { type: 'h', text: 'One mistake to avoid' },
      { type: 'p', text: `Where people park agent.py trips them up more than anything else. Keep it running on a machine that actually stays on — a server, not your laptop that goes to sleep at night. If the agent stops, the connection drops and nothing can reach your database until you start it back up. Don't move the file around after setup either, because you'll just have to redo the whole thing from the new spot. And treat that connection token like a password — don't paste it in a Slack channel or push it to a public repo. If someone gets hold of it, they can pretend to be your agent.` },
      { type: 'p', text: `Try the free trial before you put a card down. Run it against a test source first if you want zero risk while you're figuring things out, and only connect the real database once it feels right. If something's still unclear, just ask — happy to walk through it.` },
    ],
  },
]

// Topics you plan to write. They show as "Coming soon" cards. Edit freely, or empty the list to hide the section.
export const UPCOMING: Upcoming[] = [
  { title: 'How to clean a messy CSV in five minutes', tag: 'Guides', blurb: 'A step-by-step walkthrough: duplicates, blanks, dates and spelling, with before and after.' },
  { title: 'Google Sheets or CSV: which should you clean first?', tag: 'Guides', blurb: 'When each one makes sense, and how to move between them without losing work.' },
  { title: 'How AI credits work, and how far they go', tag: 'Product', blurb: 'What one credit buys, when daily allowances apply, and how to avoid running out mid-job.' },
  { title: 'Delivering clean data to clients, faster', tag: 'Freelancers', blurb: 'A simple routine freelancers use to turn a client file into a finished, repeatable result.' },
]

// ── helpers ─────────────────────────────────────────────────────────────────────────────────────
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function formatDate(published: string): string {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(published)
  if (!m) return published
  const month = MONTHS[Number(m[2]) - 1] || ''
  return m[3] ? `${Number(m[3])} ${month} ${m[1]}` : `${month} ${m[1]}`
}

export function plain(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/`(.+?)`/g, '$1').replace(/\[(.+?)\]\(.+?\)/g, '$1')
}

export function wordCount(p: Post): number {
  const words = p.body.map(b => ('text' in b ? b.text : b.items.join(' '))).join(' ')
  return plain(words).split(/\s+/).filter(Boolean).length
}

export function readTimeOf(p: Post): string {
  return p.readTime || `${Math.max(1, Math.round(wordCount(p) / 200))} min read`
}

export function excerptOf(p: Post): string {
  if (p.excerpt) return p.excerpt
  const first = p.body.find(b => b.type === 'p') as { text: string } | undefined
  const t = plain(first?.text || '')
  if (t.length <= 170) return t
  return t.slice(0, 170).replace(/\s+\S*$/, '') + '…'
}

export function headingId(text: string): string {
  return plain(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** Newest first. Posts dated in the future are held back until their date, so you can prepare ahead. */
export function listPublished(now = new Date()): Post[] {
  const today = now.toISOString().slice(0, 10)
  return PUBLISHED.filter(p => (p.published.length === 7 ? p.published + '-01' : p.published) <= today)
    .sort((a, b) => (a.published < b.published ? 1 : a.published > b.published ? -1 : 0))
}

export function findPost(slug: string): Post | undefined {
  return listPublished().find(p => p.slug === slug)
}
