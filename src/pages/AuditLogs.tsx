import { useState } from 'react'
import { useStore } from '../store'

const CATEGORY_COLOR: Record<string, string> = {
  connection: '#22c55e',
  pipeline: '#3b82f6',
  data: '#8b5cf6',
  security: '#f59e0b',
  billing: '#06b6d4',
  other: '#64748b',
}

export default function AuditLogs() {
  const { auditLogs } = useStore()
  const [groupByTrigger, setGroupByTrigger] = useState(false)
  const [filter, setFilter] = useState('')

  const filtered = auditLogs.filter(l =>
    !filter ||
    (l.action || '').toLowerCase().includes(filter.toLowerCase()) ||
    (l.entity_type || '').toLowerCase().includes(filter.toLowerCase()) ||
    (l.details || '').toLowerCase().includes(filter.toLowerCase())
  )

  const grouped = groupByTrigger
    ? filtered.reduce((acc, log) => {
        const key = log.action
        if (!acc[key]) acc[key] = []
        acc[key].push(log)
        return acc
      }, {} as Record<string, typeof auditLogs>)
    : null

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)' }}>
            <svg width="14" height="14" fill="none" stroke="#a78bfa" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Complete history of all actions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input value={filter} onChange={e => setFilter(e.target.value)}
            placeholder="Search logs..."
            className="px-3 py-2 rounded-xl text-sm outline-none"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white', width: '200px'
            }} />
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Group by Trigger</span>
            <button onClick={() => setGroupByTrigger(!groupByTrigger)}
              className="relative rounded-full transition-all"
              style={{
                width: '40px', height: '22px',
                background: groupByTrigger ? '#7c3aed' : 'rgba(255,255,255,0.15)'
              }}>
              <span className="absolute top-1 rounded-full bg-white transition-all"
                style={{ width: '14px', height: '14px', left: groupByTrigger ? '22px' : '4px' }} />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity header */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <h2 className="font-bold text-white">Recent Activity</h2>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-white font-medium mb-1">No activity yet</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Actions like uploads, analyses, and alerts will appear here
            </p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid px-6 py-3 text-xs font-semibold"
              style={{
                gridTemplateColumns: '180px 1fr 120px 140px 100px 60px',
                color: 'rgba(255,255,255,0.35)',
                borderBottom: '1px solid rgba(255,255,255,0.06)'
              }}>
              <span>Time</span>
              <span>Details</span>
              <span>Action</span>
              <span>Entity Type</span>
              <span>Entity ID</span>
              <span>View</span>
            </div>

            {/* Rows */}
            {(grouped
              ? Object.entries(grouped).flatMap(([key, logs]) => [
                  <div key={`group-${key}`} className="px-6 py-2 text-xs font-bold uppercase tracking-wider"
                    style={{ background: 'rgba(124,58,237,0.05)', color: '#a78bfa' }}>
                    {key.replace(/_/g, ' ')} ({logs.length})
                  </div>,
                  ...logs.map(log => <LogRow key={log.id} log={log} />)
                ])
              : filtered.map(log => <LogRow key={log.id} log={log} />)
            )}
          </>
        )}
      </div>
    </div>
  )
}

// AuditLog entries only ever have {id, time, action, entity_type, entity_id,
// details, user} — there's no stored "category" field. Derive a display
// color from entity_type/action instead of a nonexistent log.category, so
// rows aren't all falling back to the same gray "other" color.
function deriveCategory(log: any): string {
  const key = `${log.entity_type || ''} ${log.action || ''}`.toLowerCase()
  if (key.includes('connection') || key.includes('connect')) return 'connection'
  if (key.includes('pipeline') || key.includes('transformation') || key.includes('schedule')) return 'pipeline'
  if (key.includes('source') || key.includes('destination') || key.includes('analysis')) return 'data'
  if (key.includes('alert') || key.includes('approve') || key.includes('drift')) return 'security'
  return 'other'
}

function LogRow({ log }: { log: any }) {
  const [showDetail, setShowDetail] = useState(false)
  const color = CATEGORY_COLOR[deriveCategory(log)] || '#64748b'

  return (
    <>
      <div className="grid px-6 py-4 text-sm transition-all"
        style={{
          gridTemplateColumns: '180px 1fr 120px 140px 100px 60px',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          alignItems: 'center'
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {log.time || ''}
        </span>
        <span className="text-white text-xs truncate pr-4" title={log.details}>
          {log.details || '—'}
        </span>
        <span>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: `${color}18`, color }}>
            {(log.action || '').replace(/[._]/g, ' ')}
          </span>
        </span>
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{log.entity_type}</span>
        <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {(log.entity_id || '').slice(0, 8)}...
        </span>
        <button onClick={() => setShowDetail(!showDetail)}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </button>
      </div>
      {showDetail && (
        <div className="px-6 py-3 text-xs"
          style={{
            background: 'rgba(124,58,237,0.06)',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.55)'
          }}>
          <span className="font-semibold text-white">Full Entity ID:</span> {log.entity_id}<br />
          <span className="font-semibold text-white">Entity Type:</span> {log.entity_type}<br />
          <span className="font-semibold text-white">User:</span> {log.user}<br />
          <span className="font-semibold text-white">Time:</span> {log.time}<br />
          <span className="font-semibold text-white">Details:</span> {log.details}
        </div>
      )}
    </>
  )
}
