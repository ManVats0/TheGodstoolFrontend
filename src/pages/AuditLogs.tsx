import { useState, useEffect } from 'react'
import { API_BASE } from '../config'
import { usePermissions, forbiddenMessage } from '../usePermissions'
import NoAccess from '../components/NoAccess'

const CATEGORY_COLOR: Record<string, string> = {
  connection: '#22c55e',
  pipeline: '#3b82f6',
  data: '#8b5cf6',
  security: '#f59e0b',
  billing: '#06b6d4',
  other: '#64748b',
}

const STATUS_COLOR: Record<string, string> = {
  success: '#4ade80',
  failure: '#f87171',
  info: 'rgba(255,255,255,0.5)',
}

const SEVERITY_COLOR: Record<string, string> = {
  info: 'rgba(255,255,255,0.5)',
  warning: '#fbbf24',
  error: '#f87171',
}

type AuditLogDoc = {
  _id: string
  action: string
  category: string
  resourceType: string
  resourceId: string
  resourceName: string
  status: string
  severity: string
  changes: Record<string, any> | null
  metadata: Record<string, any>
  correlationId: string | null
  actorType?: string
  createdAt: string
}

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('datapro_token') || ''
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export default function AuditLogs() {
  const { can, loading } = usePermissions()
  if (loading) return null
  if (!can('audit.view')) return <NoAccess />
  return <AuditLogsInner />
}

function AuditLogsInner() {
  const { can } = usePermissions()
  const [logs, setLogs] = useState<AuditLogDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [groupByTrigger, setGroupByTrigger] = useState(false)
  const [filter, setFilter] = useState('')

  const loadLogs = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/audit-logs`, {
        credentials: 'include',
        headers: authHeaders(),
      })
      if (res.status === 401) {
        setError('Sign in to view audit logs.')
        setLogs([])
        return
      }
      const data = await res.json()
      if (data?.error) {
        setError(data.error)
        setLogs([])
        return
      }
      if (Array.isArray(data)) setLogs(data)
      else setLogs([])
    } catch {
      setError('Could not reach server to load audit logs.')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadLogs() }, [])

  const exportLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/audit-logs/export`, { credentials: 'include', headers: authHeaders() })
      if (!res.ok) {
        alert(res.status === 403 ? forbiddenMessage() : 'Export failed.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'audit_log_export.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Could not reach server to export audit logs.')
    }
  }

  const filtered = logs.filter(l =>
    !filter ||
    (l.action || '').toLowerCase().includes(filter.toLowerCase()) ||
    (l.resourceType || '').toLowerCase().includes(filter.toLowerCase()) ||
    (l.resourceName || '').toLowerCase().includes(filter.toLowerCase()) ||
    (l.category || '').toLowerCase().includes(filter.toLowerCase())
  )

  const grouped = groupByTrigger
    ? filtered.reduce((acc, log) => {
        const key = log.action
        if (!acc[key]) acc[key] = []
        acc[key].push(log)
        return acc
      }, {} as Record<string, AuditLogDoc[]>)
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
          <button onClick={loadLogs} className="px-3 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
            ↻ Refresh
          </button>
          {can('audit.export') && (
            <button onClick={exportLogs} className="px-3 py-2 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa' }}>
              ⬇ Export CSV
            </button>
          )}
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

        {loading ? (
          <div className="text-center py-20">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Loading audit logs…</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-white font-medium mb-1">Could not load audit logs</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-white font-medium mb-1">No activity yet</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Actions like connections, pipeline runs, and catalog edits will appear here
            </p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid px-6 py-3 text-xs font-semibold"
              style={{
                gridTemplateColumns: '160px 1fr 130px 110px 90px 60px',
                color: 'rgba(255,255,255,0.35)',
                borderBottom: '1px solid rgba(255,255,255,0.06)'
              }}>
              <span>Time</span>
              <span>Resource</span>
              <span>Action</span>
              <span>Category</span>
              <span>Status</span>
              <span>View</span>
            </div>

            {/* Rows */}
            {(grouped
              ? Object.entries(grouped).flatMap(([key, groupLogs]) => [
                  <div key={`group-${key}`} className="px-6 py-2 text-xs font-bold uppercase tracking-wider"
                    style={{ background: 'rgba(124,58,237,0.05)', color: '#a78bfa' }}>
                    {key.replace(/[._]/g, ' ')} ({groupLogs.length})
                  </div>,
                  ...groupLogs.map(log => <LogRow key={log._id} log={log} />)
                ])
              : filtered.map(log => <LogRow key={log._id} log={log} />)
            )}
          </>
        )}
      </div>
    </div>
  )
}

function LogRow({ log }: { log: AuditLogDoc }) {
  const [showDetail, setShowDetail] = useState(false)
  const color = CATEGORY_COLOR[log.category] || CATEGORY_COLOR.other
  const statusColor = STATUS_COLOR[log.status] || 'rgba(255,255,255,0.5)'
  const severityColor = SEVERITY_COLOR[log.severity] || 'rgba(255,255,255,0.5)'
  const timeLabel = log.createdAt ? new Date(log.createdAt).toLocaleString() : ''

  return (
    <>
      <div className="grid px-6 py-4 text-sm transition-all"
        style={{
          gridTemplateColumns: '160px 1fr 130px 110px 90px 60px',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          alignItems: 'center'
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {timeLabel}
        </span>
        <span className="text-white text-xs truncate pr-4" title={log.resourceName || log.resourceId}>
          {log.resourceName || log.resourceId || '—'}
        </span>
        <span>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: `${color}18`, color }}>
            {(log.action || '').replace(/[._]/g, ' ')}
          </span>
        </span>
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{log.category}</span>
        <span className="text-xs font-semibold" style={{ color: statusColor }}>
          {log.status}
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
          <span className="font-semibold text-white">Resource Type:</span> {log.resourceType}<br />
          <span className="font-semibold text-white">Resource ID:</span> {log.resourceId}<br />
          <span className="font-semibold text-white">Severity:</span> <span style={{ color: severityColor }}>{log.severity}</span><br />
          {log.actorType && <><span className="font-semibold text-white">Actor:</span> {log.actorType}<br /></>}
          {log.correlationId && <><span className="font-semibold text-white">Correlation ID:</span> {log.correlationId}<br /></>}
          {log.changes && <><span className="font-semibold text-white">Changes:</span> {JSON.stringify(log.changes)}<br /></>}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <><span className="font-semibold text-white">Metadata:</span> {JSON.stringify(log.metadata)}<br /></>
          )}
        </div>
      )}
    </>
  )
}
