import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BlogShell, NotifyForm, useSeo, SITE } from '../blog/BlogShell'
import { Body } from '../blog/render'
import { findPost, listPublished, formatDate, readTimeOf, excerptOf, headingId, plain } from '../blog/posts'
import type { Post } from '../blog/posts'

export default function BlogPost() {
  const { slug = '' } = useParams()
  const post = findPost(slug)
  return post ? <Article post={post} /> : <NotFound />
}

function NotFound() {
  useSeo({ title: "Post not found — The God's Tool", description: 'This post does not exist.', path: '/blog' })
  return (
    <BlogShell>
      <div className="gb-wrap gb-empty" style={{ paddingTop: 96 }}>
        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: 8 }}>We couldn't find that post</div>
        <p>It may have moved, or it isn't published yet.</p>
        <Link to="/blog" className="gb-btn" style={{ marginTop: 12 }}>See all posts</Link>
      </div>
    </BlogShell>
  )
}

function Article({ post }: { post: Post }) {
  const url = `${SITE}/blog/${post.slug}`
  const desc = excerptOf(post)
  const heads = useMemo(() => post.body.filter(b => b.type === 'h').map(b => ({ id: headingId((b as { text: string }).text), text: plain((b as { text: string }).text) })), [post])
  const others = useMemo(() => listPublished().filter(p => p.slug !== post.slug).sort((a, b) => Number(b.tag === post.tag) - Number(a.tag === post.tag)).slice(0, 2), [post])
  const [progress, setProgress] = useState(0)
  const [active, setActive] = useState('')
  const [copied, setCopied] = useState(false)

  useSeo({
    title: `${post.title} — The God's Tool`, description: desc, path: `/blog/${post.slug}`, type: 'article',
    jsonLd: {
      '@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.title, description: desc, datePublished: post.published,
      mainEntityOfPage: url, url, author: { '@type': 'Organization', name: "The God's Tool" },
      publisher: { '@type': 'Organization', name: "The God's Tool", url: SITE },
    },
  })

  useEffect(() => {
    const onScroll = () => {
      const el = document.getElementById('gb-article')
      if (!el) return
      const r = el.getBoundingClientRect()
      const total = r.height - window.innerHeight * 0.6
      setProgress(total <= 0 ? 100 : Math.min(100, Math.max(0, (-r.top / total) * 100)))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [post])

  useEffect(() => {
    if (heads.length === 0 || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(entries => {
      const hit = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (hit) setActive(hit.target.id)
    }, { rootMargin: '-80px 0px -65% 0px' })
    heads.forEach(h => { const el = document.getElementById(h.id); if (el) io.observe(el) })
    return () => io.disconnect()
  }, [heads])

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    catch { window.prompt('Copy this link', url) }
  }
  const enc = encodeURIComponent
  const share = (
    <div className="gb-share">
      <span>Share</span>
      <button className="gb-sbtn" onClick={copy}>{copied ? 'Link copied ✓' : 'Copy link'}</button>
      <a className="gb-sbtn" target="_blank" rel="noopener noreferrer" href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`}>LinkedIn</a>
      <a className="gb-sbtn" target="_blank" rel="noopener noreferrer" href={`https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(post.title)}`}>X</a>
      <a className="gb-sbtn" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${enc(post.title + ' ' + url)}`}>WhatsApp</a>
    </div>
  )

  return (
    <BlogShell>
      <div className="gb-progress" style={{ width: `${progress}%` }} role="presentation" />
      <div className="gb-wrap">
        <div className="gb-post-grid">
          <article id="gb-article">
            <nav className="gb-crumbs" aria-label="Breadcrumb"><Link to="/blog">Blog</Link><span>/</span><span>{post.tag}</span></nav>
            <span className="gb-tag">{post.tag}</span>
            <h1 className="gb-title">{post.title}</h1>
            <div className="gb-meta">
              <span className="gb-avatar" aria-hidden="true">G</span>
              <b>The God's Tool team</b><span className="gb-dot" />
              <time dateTime={post.published}>Published {formatDate(post.published)}</time><span className="gb-dot" />
              <span>{readTimeOf(post)}</span>
            </div>
            {share}
            <Body blocks={post.body} />

            <div className="gb-cta">
              <h3>See it on your own data</h3>
              <p>Upload a CSV or link a Google Sheet and watch the difference in minutes. Free to start, nothing to install.</p>
              <Link to="/" className="gb-btn">Try it free</Link>
            </div>

            {others.length > 0 ? (
              <>
                <div className="gb-section-title">Keep reading</div>
                <div className="gb-grid">
                  {others.map(p => (
                    <Link key={p.slug} to={`/blog/${p.slug}`} className="gb-card">
                      <span className="gb-tag" style={{ alignSelf: 'flex-start' }}>{p.tag}</span>
                      <h3>{p.title}</h3><p>{excerptOf(p)}</p>
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <NotifyForm heading="More posts are on the way" text="Leave your email and we'll tell you when the next one is published." />
            )}
          </article>

          {heads.length > 1 && (
            <aside className="gb-toc" aria-label="On this page">
              <b>On this page</b>
              {heads.map(h => (
                <a key={h.id} href={`#${h.id}`} className={active === h.id ? 'on' : ''}
                  onClick={e => { e.preventDefault(); document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth' }); history.replaceState(null, '', `#${h.id}`) }}>{h.text}</a>
              ))}
              <div style={{ marginTop: 22 }}><Link to="/blog" style={{ color: '#c4b5fd', textDecoration: 'none', border: 'none', padding: 0 }}>← All posts</Link></div>
            </aside>
          )}
        </div>
      </div>
    </BlogShell>
  )
}
