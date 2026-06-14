import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'

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

export default function NotificationPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const {
    notifications, readIds, markRead, markAllRead,
    notifyEmail, setNotifyEmail,
    alertConditions, setAlertCondition,
    setAnalysisTab
  } = useStore()

  const [emailInput, setEmailInput] = useState(notifyEmail)
  const [emailSaved, setEmailSaved] = useState(!!notifyEmail)

  const unread = notifications.filter(n => !readIds.has(n.id)).length

  const handleClick = (n: any) => {
    markRead(n.id)
    onClose()
    navigate('/analysis')
    if (n.link === 'timeseries') setAnalysisTab('timeseries')
    else if (n.link === 'problems') setAnalysisTab('problems')
    else setAnalysisTab('preview')
  }

  const handleEmailOk = async () => {
    if (!emailInput.trim()) return
    try {
      const res = await fetch(`${import.meta.env.VITE_AUTH_URL || 'http://localhost:4000'}/api/save-alert-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim() })
      })
      const data = await res.json()
      if (!res.ok) {
        console.error('Failed:', data.error)
        return
      }
      setNotifyEmail(emailInput)
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
            <button onClick={onClose} className="text-xl transition-colors"
              style={{ color: 'rgba(255,255,255,0.35)' }}>✕</button>
          </div>
        </div>

        {/* Email Alerts */}
        <div className="p-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>

          <div className="flex items-center gap-2 mb-2">
            <span style={{ fontSize: '14px' }}>📧</span>
            <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>Email Alerts</p>
            {emailSaved && (
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>
                ✓ Active
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
              <span style={{ fontSize: '14px', marginTop: '1px' }}>✅</span>
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
            <p className="text-xs font-semibold mb-2" style={{ color: '#a78bfa' }}>
              🚀 3 steps to get alerts
            </p>
            <div className="space-y-1.5">
              {recommendedSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span style={{ fontSize: '11px', color: step.done ? '#4ade80' : 'rgba(255,255,255,0.25)' }}>
                    {step.done ? '✓' : `${i + 1}.`}
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
              <div className="text-4xl mb-3">🔔</div>
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
