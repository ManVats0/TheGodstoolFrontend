import { useEffect, useState } from 'react'
import { useStatus } from '../status'
import { track } from '../analytics'

// A quiet bar at the bottom of the screen that appears only when something is wrong. It links to /status.
export default function StatusBanner() {
  const { file, level, liveDown } = useStatus()
  useEffect(() => {
    if (level !== 'operational') track('status_banner_shown', { level }, 600000)
  }, [level])
  const [hidden, setHidden] = useState<string>(() => {
    try {
      return sessionStorage.getItem('gt_status_hidden') || ''
    } catch {
      return ''
    }
  })
  if (window.location.pathname === '/status' || level === 'operational') return null
  const key = `${level}:${file.message}:${liveDown}`
  if (hidden === key) return null
  const text =
    file.message ||
    (level === 'maintenance'
      ? 'We are doing planned maintenance.'
      : liveDown
        ? 'Some of our services are not answering right now. You may see errors or slow responses.'
        : 'We are looking into a problem.')
  const warn = level === 'outage' ? '#f87171' : '#fbbf24'
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 12,
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          pointerEvents: 'auto',
          maxWidth: 720,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 10,
          background: 'rgba(15,10,30,0.97)',
          border: `1px solid ${warn}`,
          borderRadius: 12,
          padding: '10px 14px',
          color: '#f1f5f9',
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.88rem',
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
        }}
      >
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: warn, flex: '0 0 auto' }} />
        <span style={{ flex: '1 1 260px', lineHeight: 1.45 }}>{text}</span>
        <a href="/status" style={{ color: '#c4b5fd', fontWeight: 700, textDecoration: 'underline' }}>
          Check status
        </a>
        <button
          aria-label="Dismiss"
          onClick={() => {
            setHidden(key)
            try {
              sessionStorage.setItem('gt_status_hidden', key)
            } catch {
              /* ignore */
            }
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
            fontSize: '1.1rem',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
    </div>
  )
}
