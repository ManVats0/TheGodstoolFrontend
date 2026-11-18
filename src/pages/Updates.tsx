// Full list of product updates (from src/updates.json), newest first. Opened from the "What's new" card.

import { ALL_UPDATES, UpdateLink, dateLabel } from '../components/WhatsNew'

export default function Updates() {
  return (
    <div className="p-8 max-w-3xl mx-auto" style={{ display: 'grid', gap: 16 }}>
      <div>
        <h1 style={{ color: 'white', fontSize: '1.7rem', fontWeight: 800, margin: 0 }}>What's new</h1>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.88rem' }}>
          Everything we have changed, newest first.
        </div>
      </div>
      {ALL_UPDATES.map(u => (
        <div
          key={u.id}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: 20,
          }}
        >
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem' }}>{dateLabel(u.date)}</div>
          <div style={{ color: 'white', fontWeight: 700, fontSize: '1.05rem' }}>{u.title}</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.92rem', margin: '4px 0' }}>{u.text}</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.92rem' }}>
            {u.youCan} <UpdateLink u={u} />
          </div>
        </div>
      ))}
    </div>
  )
}
