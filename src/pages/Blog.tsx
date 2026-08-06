import { Link } from 'react-router-dom'

type PostBlock =
  | { type: 'p'; text: string }
  | { type: 'h'; text: string }

type Post = {
  slug: string
  tag: string
  readTime: string
  date: string
  title: string
  body: PostBlock[]
}

const POSTS: Post[] = [
  {
    slug: 'is-my-data-safe',
    tag: 'Security',
    readTime: '5 min read',
    date: 'August 2026',
    title: 'Is my data actually safe with us?',
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

function ShieldIcon({ size = 17, color = '#a78bfa' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

export default function Blog() {
  return (
    <div style={{ minHeight: '100vh', background: '#05030f', color: 'white', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* ── NAVBAR ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, padding: '16px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(5,3,15,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <span style={{ fontFamily: "'Inter', -apple-system, sans-serif", fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em', background: 'linear-gradient(135deg, #e9d5ff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>The God's Tool</span>
        </Link>
        <Link to="/" style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em', textDecoration: 'none' }}>
          ← Back to home
        </Link>
      </nav>

      {/* ── HERO ── */}
      <section style={{ padding: '80px 24px 60px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#7c3aed', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '16px' }}>From The Blog</div>
        <h1 style={{ fontFamily: "'Inter', -apple-system, sans-serif", fontSize: 'clamp(2rem, 4.2vw, 3rem)', fontWeight: 700, margin: '0 auto', letterSpacing: '-0.03em', lineHeight: 1.12, maxWidth: '640px' }}>
          Straight answers, no marketing spin.
        </h1>
        <p style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', marginTop: '16px', maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto' }}>
          Notes on how the platform actually works, written by the people who built it.
        </p>
      </section>

      {/* ── POSTS ── */}
      <section style={{ padding: '0 24px 120px', maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {POSTS.map(post => (
          <article
            key={post.slug}
            id={post.slug}
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(167,139,250,0.12)', borderRadius: '16px', padding: '40px 36px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(167,139,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldIcon />
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: '#a78bfa', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {post.tag} · {post.readTime}
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>{post.date}</span>
            </div>

            <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: '1.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.95)', margin: '0 0 24px', letterSpacing: '-0.01em' }}>
              {post.title}
            </h2>

            <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'rgba(255,255,255,0.62)', lineHeight: 1.85 }}>
              {post.body.map((block, i) =>
                block.type === 'h' ? (
                  <div key={i} style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#7c3aed', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '32px 0 12px' }}>
                    {block.text}
                  </div>
                ) : (
                  <p key={i} style={{ margin: '0 0 18px' }}>{block.text}</p>
                )
              )}
            </div>
          </article>
        ))}
      </section>

      {/* ── FOOTER CTA ── */}
      <section style={{ padding: '0 24px 80px', textAlign: 'center' }}>
        <Link
          to="/"
          style={{
            display: 'inline-block', fontFamily: "'Inter', -apple-system, sans-serif", background: '#7c3aed', color: 'white',
            border: 'none', padding: '13px 38px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600,
            letterSpacing: '0.01em', textDecoration: 'none',
          }}
        >
          Connect a Source
        </Link>
      </section>
    </div>
  )
}
