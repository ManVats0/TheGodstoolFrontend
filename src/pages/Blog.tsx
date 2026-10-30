import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BlogShell, NotifyForm, ArtIcon, useSeo, SITE } from '../blog/BlogShell'
import { UPCOMING, listPublished, formatDate, readTimeOf, excerptOf, plain } from '../blog/posts'
import type { Post } from '../blog/posts'

function Meta({ p }: { p: Post }) {
  return (
    <div className="gb-meta">
      <time dateTime={p.published}><b>{formatDate(p.published)}</b></time>
      <span className="gb-dot" /><span>{readTimeOf(p)}</span>
    </div>
  )
}

export default function Blog() {
  const posts = useMemo(() => listPublished(), [])
  const navigate = useNavigate()
  const { hash } = useLocation()
  const [q, setQ] = useState('')
  const [tag, setTag] = useState('All')

  // Old links like /blog#is-my-data-safe now open the post's own page.
  useEffect(() => {
    const slug = hash.replace('#', '')
    if (slug && posts.some(p => p.slug === slug)) navigate(`/blog/${slug}`, { replace: true })
  }, [hash, posts, navigate])

  useSeo({
    title: "Blog — The God's Tool",
    description: 'Straight answers on cleaning and moving data: how it works, how to keep it safe, and how to get clean results fast.',
    path: '/blog',
    jsonLd: {
      '@context': 'https://schema.org', '@type': 'Blog', name: "The God's Tool Blog", url: `${SITE}/blog`,
      blogPost: posts.map(p => ({ '@type': 'BlogPosting', headline: p.title, url: `${SITE}/blog/${p.slug}`, datePublished: p.published })),
    },
  })

  const tags = useMemo(() => ['All', ...Array.from(new Set(posts.map(p => p.tag)))], [posts])
  const counts = useMemo(() => Object.fromEntries(tags.map(t => [t, t === 'All' ? posts.length : posts.filter(p => p.tag === t).length])), [tags, posts])
  const needle = q.trim().toLowerCase()
  const filtering = needle !== '' || tag !== 'All'
  const results = useMemo(() => posts.filter(p =>
    (tag === 'All' || p.tag === tag) &&
    (!needle || [p.title, p.tag, excerptOf(p), p.body.map(b => ('text' in b ? b.text : b.items.join(' '))).join(' ')].some(t => plain(t).toLowerCase().includes(needle)))
  ), [posts, tag, needle])

  const [featured, ...rest] = posts

  return (
    <BlogShell>
      <header className="gb-hero">
        <div className="gb-eyebrow">The God's Tool Blog</div>
        <h1 className="gb-h1">Straight answers, no marketing spin.</h1>
        <p className="gb-sub">Practical notes on cleaning data, written by the people who built the tool.</p>
        <div className="gb-tools">
          <label className="gb-search">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input type="search" placeholder="Search the blog" aria-label="Search the blog" value={q} onChange={e => setQ(e.target.value)} />
          </label>
          {tags.length > 2 && (
            <div className="gb-chips" role="group" aria-label="Filter by topic">
              {tags.map(t => (
                <button key={t} className={`gb-chip${tag === t ? ' on' : ''}`} onClick={() => setTag(t)} aria-pressed={tag === t}>{t} <span style={{ opacity: .55 }}>{counts[t]}</span></button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="gb-wrap">
        {filtering ? (
          results.length === 0 ? (
            <div className="gb-empty">
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: 6 }}>No posts match that yet</div>
              <div>Try a different word, or <button className="gb-chip" onClick={() => { setQ(''); setTag('All') }}>show all posts</button></div>
            </div>
          ) : (
            <>
              <div className="gb-section-title">{results.length} post{results.length === 1 ? '' : 's'}</div>
              <div className="gb-grid">{results.map(p => <PostCard key={p.slug} p={p} />)}</div>
            </>
          )
        ) : (
          <>
            {featured && (
              <>
                <div className="gb-section-title">Latest</div>
                <Link to={`/blog/${featured.slug}`} className="gb-featured">
                  <div className="gb-art"><ArtIcon /></div>
                  <div className="gb-feat-body">
                    <span className="gb-tag" style={{ alignSelf: 'flex-start' }}>{featured.tag}</span>
                    <h2>{featured.title}</h2>
                    <p>{excerptOf(featured)}</p>
                    <Meta p={featured} />
                    <span className="gb-more">Read the article →</span>
                  </div>
                </Link>
              </>
            )}

            {rest.length > 0 && (
              <>
                <div className="gb-section-title">More articles</div>
                <div className="gb-grid">{rest.map(p => <PostCard key={p.slug} p={p} />)}</div>
              </>
            )}

            {UPCOMING.length > 0 && (
              <>
                <div className="gb-section-title">Coming soon</div>
                <div className="gb-grid">
                  {UPCOMING.map(u => (
                    <div key={u.title} className="gb-card soon">
                      <span className="gb-badge">Coming soon</span>
                      <span className="gb-tag" style={{ alignSelf: 'flex-start' }}>{u.tag}</span>
                      <h3>{u.title}</h3>
                      <p>{u.blurb}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        <NotifyForm />
      </main>
    </BlogShell>
  )
}

function PostCard({ p }: { p: Post }) {
  return (
    <Link to={`/blog/${p.slug}`} className="gb-card">
      <span className="gb-tag" style={{ alignSelf: 'flex-start' }}>{p.tag}</span>
      <h3>{p.title}</h3>
      <p>{excerptOf(p)}</p>
      <Meta p={p} />
    </Link>
  )
}
