import type { ReactNode } from 'react'
import type { PostBlock } from './posts'
import { headingId } from './posts'

/** **bold**, `code` and [text](https://link). Anything else is shown exactly as written (never executed as HTML). */
export function rich(text: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /\*\*(.+?)\*\*|`(.+?)`|\[(.+?)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g
  let last = 0, m: RegExpExecArray | null, i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[1] !== undefined) out.push(<strong key={i++}>{m[1]}</strong>)
    else if (m[2] !== undefined) out.push(<code key={i++}>{m[2]}</code>)
    else {
      const ext = m[4].startsWith('http')
      out.push(<a key={i++} href={m[4]} {...(ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{m[3]}</a>)
    }
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function Body({ blocks }: { blocks: PostBlock[] }) {
  return (
    <div className="gb-prose">
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'h': return <h2 key={i} id={headingId(b.text)}>{rich(b.text)}</h2>
          case 'ul': return <ul key={i}>{b.items.map((it, j) => <li key={j}>{rich(it)}</li>)}</ul>
          case 'quote': return <blockquote key={i}>{rich(b.text)}</blockquote>
          case 'tip': return <div key={i} className="gb-tip">💡 {rich(b.text)}</div>
          default: return <p key={i}>{rich(b.text)}</p>
        }
      })}
    </div>
  )
}
