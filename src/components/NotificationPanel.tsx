import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { API_BASE } from '../config'

const SEV = {
  warning: { dot: '#f97316', label: 'Warning', bg: 'rgba(249,115,22,0.1)', text: '#fb923c' },
  error:   { dot: '#ef4444', label: 'Alert',   bg: 'rgba(239,68,68,0.1)',  text: '#f87171' },
  info:    { dot: '#3b82f6', label: 'Info',     bg: 'rgba(59,130,246,0.1)', text: '#60a5fa' },
}

const TYPE_COLOR: Record<string, string> = {
  missing: '#f97316', duplicate: '#ef4444', outlier: '#eab308',
  schema: '#8b5cf6', failure: '#ef4444', staleness: '#06b6d4',
  anomaly: '#ec4899', imbalance: '#f59e0b'
}

function NotifIcon({ name, size = 14, color = '#a78bfa' }: { name: string; size?: number; color?: string }) {
  const paths: Record<string, JSX.Element> = {
    close: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    mail: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></>,
    check: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>,
    rocket: <><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></>,
    bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  )
}

export default function NotificationPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const {
    notifications, readIds, markRead, markAllRead,
    notifyEmail, setNotifyEmail,
    alertConditions, setAlertCondition,
    setAnalysisTab
  } = useStore()

  const [emailInput, setEmailInput] = useState(notifyEmail || localStorage.getItem('datapro_alert_email') || '')
  const [emailSaved, setEmailSaved] = useState(!!notifyEmail || !!localStorage.getItem('datapro_alert_email'))

  useEffect(() => {
    const saved = localStorage.getItem('datapro_alert_email')
    if (saved && !notifyEmail) {
      setNotifyEmail(saved)
      setEmailInput(saved)
      setEmailSaved(true)
      return
    }
    fetch(`${API_BASE}/api/get-alert-email`)
      .then(r => r.json())
      .then(d => {
        if (d.email) {
          setNotifyEmail(d.email)
          setEmailInput(d.email)
          setEmailSaved(true)
          localStorage.setItem('datapro_alert_email', d.email)
        }
      })
      .catch(() => {})
  }, [])

  const unread = notifications.filter(n => !readIds.has(n.id)).length

  const handleClick = (n: any) => {
    markRead(n.id)
    onClose()
    // Switch to the source this notification was generated for, if known
    if (n.sourceName) {
      const { sources, switchActiveSource } = useStore.getState()
      const sourceObj = sources.find((s: any) => s.name === n.sourceName)
      if (sourceObj && useStore.getState().activeSourceName !== n.sourceName) {
        switchActiveSource(sourceObj.file ?? null, sourceObj.name)
      }
    }
    navigate('/analysis')
    if (n.link === 'timeseries') setAnalysisTab('timeseries')
    else if (n.link === 'problems') setAnalysisTab('problems')
    else setAnalysisTab('preview')
  }

const handleEmailOk = async () => {
    if (!emailInput.trim()) return
    try {
      const res = await fetch(`${API_BASE}/api/save-alert-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim(), source_name: 'default' })
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        console.error('Failed:', data.error)
        return
      }
      setNotifyEmail(emailInput.trim())
      localStorage.setItem('datapro_alert_email', emailInput.trim())
      setEmailSaved(true)
    } catch {
      console.error('Cannot connect to server.')
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailInput(e.target.value)
    setEmailSaved(false)
  }

  const toggles = [
    { key: 'staleness', label: 'Data Staleness', desc: 'Time series update gaps' },
    { key: 'schema',    label: 'Schema Drift',   desc: 'Column/type changes vs last upload' },
    { key: 'anomalies', label: 'Anomalies',       desc: 'Class imbalance and high skew' },
    { key: 'flow',      label: 'Flow Failure',    desc: 'Empty dataset or broken pipeline' },
  ]

  const recommendedSteps = [
    { done: !!emailInput, text: 'Enter your email above and click OK' },
    { done: Object.values(alertConditions).some(Boolean), text: 'Enable the alert conditions you care about' },
    { done: false, text: 'Upload your CSV — alerts fire automatically' },
  ]

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} />
      <div className="relative flex flex-col shadow-2xl overflow-hidden"
        style={{
          width: '380px', height: '100%',
          background: 'rgba(10,7,20,0.98)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)'
        }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h2 className="font-bold text-white text-base">Notifications</h2>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {unread > 0 ? `${unread} unread` : 'All caught up'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {unread > 0 && (
              <button onClick={markAllRead}
                className="text-xs font-semibold transition-colors"
                style={{ color: '#60a5fa' }}>
                Mark all read
              </button>
            )}
            <button onClick={onClose} className="transition-colors"
              style={{ color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <NotifIcon name="close" size={18} color="rgba(255,255,255,0.35)" />
            </button>
          </div>
        </div>

        {/* Email Alerts */}
        <div className="p-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>

          <div className="flex items-center gap-2 mb-2">
            <NotifIcon name="mail" size={14} color="rgba(255,255,255,0.6)" />
            <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>Email Alerts</p>
            {emailSaved && (
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"
                style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>
                <NotifIcon name="check" size={10} color="#4ade80" /> Active
              </span>
            )}
          </div>

          <input
            type="email"
            value={emailInput}
            onChange={handleEmailChange}
            placeholder="your@email.com"
            className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none transition-all"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: emailSaved
                ? '1px solid rgba(34,197,94,0.4)'
                : '1px solid rgba(255,255,255,0.1)',
              color: 'white'
            }} />

          {!emailSaved ? (
            <button
              onClick={handleEmailOk}
              disabled={!emailInput.trim()}
              className="w-full mt-2 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: emailInput.trim()
                  ? 'linear-gradient(135deg,#7c3aed,#3b82f6)'
                  : 'rgba(255,255,255,0.06)',
                color: emailInput.trim() ? 'white' : 'rgba(255,255,255,0.2)',
                cursor: emailInput.trim() ? 'pointer' : 'not-allowed'
              }}>
              OK — Save Email
            </button>
          ) : (
            <div className="mt-2 rounded-xl px-3 py-2.5 flex items-start gap-2"
              style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <span style={{ marginTop: '2px' }}><NotifIcon name="check" size={13} color="#4ade80" /></span>
              <div>
                <p className="text-xs font-semibold" style={{ color: '#4ade80' }}>
                  Email saved — alerts will go to {emailInput}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Check your inbox after the next analysis run.
                </p>
                <button
                  onClick={() => setEmailSaved(false)}
                  className="text-xs mt-1 underline"
                  style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Change email
                </button>
              </div>
            </div>
          )}

          {/* Recommended steps */}
          <div className="mt-3 rounded-xl p-3"
            style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.18)' }}>
            <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: '#a78bfa' }}>
              <NotifIcon name="rocket" size={12} color="#a78bfa" /> 3 steps to get alerts
            </p>
            <div className="space-y-1.5">
              {recommendedSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span style={{ fontSize: '11px', color: step.done ? '#4ade80' : 'rgba(255,255,255,0.25)', display: 'inline-flex', alignItems: 'center' }}>
                    {step.done ? <NotifIcon name="check" size={11} color="#4ade80" /> : `${i + 1}.`}
                  </span>
                  <p className="text-xs" style={{ color: step.done ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.35)' }}>
                    {step.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.18)' }}>
            One email per analysis · same thread per file
          </p>
        </div>

        {/* Alert Conditions */}
        <div className="p-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-semibold mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>Alert Conditions</p>
          <div className="space-y-1">
            {toggles.map(t => (
              <div key={t.key} className="flex items-center justify-between py-2.5"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div>
                  <p className="text-sm font-medium text-white">{t.label}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{t.desc}</p>
                </div>
                <button
                  onClick={() => setAlertCondition(t.key, !alertConditions[t.key])}
                  className="relative flex-shrink-0 ml-3 transition-all rounded-full"
                  style={{
                    width: '36px', height: '20px',
                    background: alertConditions[t.key] ? '#7c3aed' : 'rgba(255,255,255,0.15)'
                  }}>
                  <span className="absolute top-1 rounded-full bg-white transition-all"
                    style={{
                      width: '12px', height: '12px',
                      left: alertConditions[t.key] ? '20px' : '4px'
                    }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications list */}
        <div className="flex-1 overflow-auto">
          {notifications.length === 0 ? (
            <div className="text-center py-16">
              <div className="flex justify-center mb-3"><NotifIcon name="bell" size={34} color="rgba(255,255,255,0.25)" /></div>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No notifications yet</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.15)' }}>Upload a CSV to generate alerts</p>
            </div>
          ) : notifications.map(n => {
            const isUnread = !readIds.has(n.id)
            const sev = SEV[n.severity as keyof typeof SEV] || SEV.info
            const dotColor = TYPE_COLOR[n.type] || '#6b7280'
            const time = new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            return (
              <div key={n.id}
                onClick={() => handleClick(n)}
                className="p-4 cursor-pointer transition-all"
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: isUnread ? 'rgba(124,58,237,0.06)' : 'transparent'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = isUnread ? 'rgba(124,58,237,0.06)' : 'transparent')}>
                <div className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                    style={{ background: isUnread ? dotColor : 'rgba(255,255,255,0.2)' }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-semibold text-sm leading-tight"
                        style={{ color: isUnread ? 'white' : 'rgba(255,255,255,0.4)' }}>
                        {n.title}
                      </p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: sev.bg, color: sev.text }}>
                          {sev.label}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed"
                      style={{ color: isUnread ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.2)' }}>
                      {n.message}
                    </p>
                    <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
                      {time} · Click to view analysis
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
