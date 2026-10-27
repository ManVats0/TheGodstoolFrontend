import { create } from 'zustand'
import { API_BASE } from './config'

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  severity: 'warning' | 'error' | 'info'
  link?: string
  timestamp: number
  sourceName?: string
}

export interface AuditLog {
  id: string
  time: string
  action: string
  entity_type: string
  entity_id: string
  details: string
  user: string
}

export interface AnalysisResult {
  shape: number[]
  dataset_info: {
    rows: number
    columns: number
    memory_mb: number
    missing_total: number
  }
  quality_score: number
  sample_data: any[]
  original_preview: any[]
  describe: Record<string, any>
  col_info: any[]
  pii_columns?: Record<string, { pii: boolean; type: string; confidence: string }>
  top_missing: { col: string; count: number }[]
  insight: string
  primary_key: string | null
  problems: any[]
  total_problems: number
  problem_counts: { missing: number; duplicates: number; outliers: number }
  original_file: string
  issues: Record<string, boolean>
  top4_issues: string[]
  notifications: Notification[]
  time_series: {
    detected: boolean
    date_col: string | null
    frequency: string | null
    chart_data: {
      date_col: string
      value_col: string
      freq: string
      dates: string[]
      values: number[]
    } | null
  }
}

export interface DataSource {
  id: string
  name: string
  type: 'csv' | 'sheets' | 'db' | 'catalog' | 'mysql' | 'postgres' | 'bigquery' | 'mongodb' | 'aws' | 'ga4' | 'gcs' | 'cloudsql' | 'databricks' | 'rest'
  file?: File
  filename?: string
  sheetId?: string
  tab?: string
  addedAt: string
  // ── Backend persistence ──────────────────────────────────────────────
  // Mongo _id of the connection doc this source belongs to. Present when
  // the source was created via /api/connections (i.e. anything except a
  // raw CSV upload or a catalog pick).
  connectionId?: string
  // Which object inside the connection this source points at
  table?: string
  collection?: string
  objectPath?: string   // GCS file / S3 key
  endpoint?: string     // REST
  report?: string       // GA4
}

export interface Transformation {
  id: string
  type: string
  applied: boolean
  label: string
  icon: string
  desc: string
}

export interface CatalogItem {
  id: string
  name: string
  description: string
  columns: number
  rows: number
  tags: string[]
  owner: string
  lastUpdated: string
}

export interface SavedFlow {
  id: string
  name: string
  description: string
  transformations: Transformation[]
  createdAt: string
}

// ── Backend connection doc shape (mirrors main.py's /api/connections) ────
export interface BackendConnection {
  _id: string
  userId: string
  createdBy?: string
  name: string
  type: string
  config: Record<string, any>
  // Who may use this source. Absent / 'workspace' = everyone whose role allows it.
  access?: { mode: 'workspace' | 'restricted'; userIds: string[] }
  status: string
  createdAt: string
  updatedAt: string
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('datapro_token') || ''
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Stable key for analysis_results / catalog. connectionId alone is NOT enough:
// one connection has many tables, so include the object name.
export function sourceKeyOf(s: {
  name: string; connectionId?: string; table?: string; collection?: string
  objectPath?: string; endpoint?: string; report?: string
}): string {
  if (!s.connectionId) return s.name
  const sub = s.table || s.collection || s.objectPath || s.endpoint || s.report || ''
  return sub ? `${s.connectionId}:${sub}` : s.connectionId
}

// Rebuild the per-table/per-collection/per-file DataSource entries this
// app already expects, from one saved connection doc's `config`.
function expandConnectionToSources(conn: BackendConnection): DataSource[] {
  const { type } = conn
  const config: Record<string, any> = conn.config || {}
  const addedAt = conn.updatedAt || conn.createdAt || new Date().toLocaleString()
  const mk = (idx: number, name: string, extra: Partial<DataSource> = {}): DataSource => ({
    id: `${conn._id}-${idx}`,
    name,
    type: type as DataSource['type'],
    addedAt,
    connectionId: conn._id,
    ...extra,
  })
  // config may hold a list (tables) or a single value (table)
  const list = (arr?: any, one?: any): string[] =>
    Array.isArray(arr) && arr.length ? arr : (one ? [one] : [])

  switch (type) {
    case 'mysql':
    case 'postgres':
      return list(config.tables, config.table).map((t, i) =>
        mk(i, `${config.database}.${t}@${config.host}`, { table: t }))
    case 'cloudsql':
      return list(config.tables, config.table).map((t, i) =>
        mk(i, `${config.database}.${t}@cloudsql.${config.project}`, { table: t }))
    case 'bigquery':
      return list(config.tables, config.table).map((t, i) =>
        mk(i, `${config.project}.${config.dataset}.${t}`, { table: t }))
    case 'mongodb':
      return list(config.collections, config.collection).map((c, i) =>
        mk(i, `${config.database}.${c}@mongo`, { collection: c }))
    case 'gcs':
      return list(config.files, config.file).map((f, i) =>
        mk(i, `gcs://${config.bucket}/${f}`, { objectPath: f }))
    case 'databricks':
      return list(config.tables, config.table).map((t, i) =>
        mk(i, `${config.catalog}.${config.schema}.${t}@${config.host}`, { table: t }))
    case 'rest': {
      const host = (config.base_url || '').replace(/https?:\/\//, '')
      return list(config.endpoints, config.endpoint).map((ep, i) =>
        mk(i, `rest:${host}${ep}`, { endpoint: ep }))
    }
    case 'ga4': {
      const pid = config.property_id || config.propertyId
      return list(config.reports, config.report || 'report').map((r, i) =>
        mk(i, `ga4:${pid}/${r}`, { report: r }))
    }
    case 'aws': {
      const svc = config.service
      return list(config.tables, config.table).map((item, i) => {
        const name =
          svc === 's3' ? `s3://${config.bucket}/${item}` :
          svc === 'dynamodb' ? `${item}@dynamodb.${config.region}` :
          svc === 'cost-explorer' ? `cost-explorer:${item}@${config.region}` :
          `${config.database}.${item}@${config.host}`
        return mk(i, name, { table: item })
      })
    }
    case 'sheets':
      return [mk(0, config.sheetName || conn.name, { sheetId: config.sheetId, tab: config.tab })]
    case 'csv':
      // Uploaded files are stored server-side per workspace, so teammates see them too.
      return [mk(0, config.filename || conn.name, { filename: config.filename || conn.name })]
    default:
      return []
  }
}

// True when a source must be read by the SERVER (via its connection id) rather than from this browser:
// every database / API source, and any CSV or Google Sheet that has no file held in this browser
// (e.g. one a teammate uploaded). Credentials and file bytes never travel to the browser.
export function isServerSource(s?: Pick<DataSource, 'connectionId' | 'type' | 'file'> | null): boolean {
  if (!s || !s.connectionId || s.type === 'catalog') return false
  if (s.type === 'csv' || s.type === 'sheets') return !s.file
  return true
}

interface AppState {
  activePage: string
  setActivePage: (page: string) => void

  sources: DataSource[]
  addSource: (source: DataSource) => void
  removeSource: (id: string) => void

  // ── Backend-backed connections (MongoDB via main.py /api/connections) ──
  loadingSourcesFromBackend: boolean
  connections: BackendConnection[]
  loadSourcesFromBackend: () => Promise<void>
  saveConnectionToBackend: (
    name: string,
    type: string,
    config: Record<string, any>,
    credentials: Record<string, any>,
  ) => Promise<string | undefined>

  catalog: CatalogItem[]

  savedFlows: SavedFlow[]
  saveFlow: (flow: SavedFlow) => void
  applyFlow: (flowId: string) => void

  analysis: AnalysisResult | null
  setAnalysis: (a: AnalysisResult | null) => void

  activeFile: File | null
  setActiveFile: (f: File | null) => void

  activeSourceName: string
  setActiveSourceName: (n: string) => void

  switchActiveSource: (file: File | null, name: string) => void

  loadCachedAnalysis: (name: string, a: AnalysisResult) => void

  activeDestinationName: string
  setActiveDestinationName: (n: string) => void

  notifications: Notification[]
  addNotifications: (n: Notification[]) => void
  readIds: Set<string>
  markRead: (id: string) => void
  markAllRead: () => void
  notifyEmail: string
  setNotifyEmail: (e: string) => void

  savedEmails: Record<string, string>
  saveEmailForSource: (sourceName: string, email: string) => void
  removeEmailForSource: (sourceName: string) => void

  alertConditions: Record<string, boolean>
  setAlertCondition: (key: string, val: boolean) => void

  lastSourcesScanAt: number
  setLastSourcesScanAt: (t: number) => void

  auditLogs: AuditLog[]
  addAuditLog: (log: AuditLog) => void

  transformations: Transformation[]
  addTransformation: (t: Transformation) => void
  removeTransformation: (id: string) => void
  clearTransformations: () => void
  setTransformations: (t: Transformation[]) => void

  analysisTab: string
  setAnalysisTab: (t: string) => void

  pendingCleanOptions: Record<string, boolean> | null
  setPendingCleanOptions: (opts: Record<string, boolean> | null) => void
  pipelineSteps: string[]
  setPipelineSteps: (steps: string[]) => void
  lastPipelineRunAt: string | null
  setLastPipelineRunAt: (t: string | null) => void
  pipelineOutputFile: File | null
  setPipelineOutputFile: (f: File | null) => void
  gsheetsDestination: { email: string; sheetName: string; sheetId: string } | null
  setGsheetsDestination: (g: { email: string; sheetName: string; sheetId: string } | null) => void
}

export const useStore = create<AppState>((set, get) => ({
  activePage: 'sources',
  setActivePage: (page) => set({ activePage: page }),

  sources: [],
  addSource: (source) => set((s) => ({ sources: [...s.sources, source] })),
  removeSource: (id) => set((s) => ({ sources: s.sources.filter(src => src.id !== id) })),

  loadingSourcesFromBackend: false,
  connections: [],
  loadSourcesFromBackend: async () => {
    set({ loadingSourcesFromBackend: true })
    try {
      const res = await fetch(`${API_BASE}/api/connections`, {
        credentials: 'include',
        headers: authHeaders(),
      })
      if (!res.ok) {
        // Not authenticated yet, or backend not reachable — fail silently,
        // local-only sources (CSV uploads etc.) are unaffected.
        set({ loadingSourcesFromBackend: false })
        return
      }
      const conns: BackendConnection[] = await res.json()
      if (!Array.isArray(conns)) {
        set({ loadingSourcesFromBackend: false })
        return
      }
      set((s) => {
        const backendIds = new Set(conns.map(c => c._id))
        // keep local-only sources (CSV, catalog) and still-valid backend ones
        const next = s.sources.filter(src => !src.connectionId || backendIds.has(src.connectionId))
        const indexById = new Map(next.map((src, i) => [src.id, i]))
        for (const conn of conns) {
          for (const src of expandConnectionToSources(conn)) {
            const at = indexById.get(src.id)
            if (at !== undefined) {
              // refresh fields, keep any in-memory File (e.g. Sheets import)
              next[at] = { ...src, file: next[at].file, filename: next[at].filename }
            } else {
              indexById.set(src.id, next.length)
              next.push(src)
            }
          }
        }
        return { sources: next, connections: conns, loadingSourcesFromBackend: false }
      })
    } catch {
      set({ loadingSourcesFromBackend: false })
    }
  },

  saveConnectionToBackend: async (name, type, config, credentials) => {
    const token = localStorage.getItem('datapro_token') || ''
    if (!token) {
      console.warn('saveConnectionToBackend: no auth token, skipping backend save')
      return undefined
    }
    try {
      const res = await fetch(`${API_BASE}/api/connections`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({ name, type, config, credentials }),
      })
      if (!res.ok) {
        console.warn(`saveConnectionToBackend: HTTP ${res.status}`)
        return undefined
      }
      const doc = await res.json()
      return doc._id
    } catch (e) {
      console.warn('saveConnectionToBackend failed:', e)
      return undefined
    }
  },

  catalog: [
    { id: 'cat-1', name: 'Global_Sales_2023', description: 'Verified sales records from all regions', columns: 24, rows: 150000, tags: ['verified', 'finance'], owner: 'Data Team', lastUpdated: '2023-11-10' },
    { id: 'cat-2', name: 'User_Activity_Logs', description: 'Raw clickstream and event data', columns: 12, rows: 8000000, tags: ['raw', 'product'], owner: 'Engineering', lastUpdated: '2023-11-12' },
    { id: 'cat-3', name: 'Customer_Demographics', description: 'Aggregated user demographic profiles', columns: 8, rows: 45000, tags: ['marketing', 'clean'], owner: 'Marketing', lastUpdated: '2023-11-15' }
  ],

  savedFlows: [],
  saveFlow: (flow) => set((s) => ({ savedFlows: [...s.savedFlows, flow] })),
  applyFlow: (flowId) => set((s) => {
    const flow = s.savedFlows.find(f => f.id === flowId)
    return flow ? { transformations: [...flow.transformations] } : {}
  }),

  analysis: null,
  setAnalysis: (a) => set({ analysis: a }),

  activeFile: null,
  setActiveFile: (f) => set({ activeFile: f }),

  activeSourceName: '',
  setActiveSourceName: (n) => set({ activeSourceName: n }),

  switchActiveSource: (file, name) => set({
    activeFile: file,
    activeSourceName: name,
    analysis: null,
    analysisTab: 'preview',
  }),

  loadCachedAnalysis: (name, a) => set({
    activeFile: null,
    activeSourceName: name,
    analysis: a,
    analysisTab: 'preview',
  }),

  activeDestinationName: '',
  setActiveDestinationName: (n) => set({ activeDestinationName: n }),

  notifications: [],
  addNotifications: (newOnes) => set((s) => {
    const existingKeys = new Set(s.notifications.map(n => `${n.type}|${n.title}|${n.message}`))
    const deduped = newOnes.filter(n => !existingKeys.has(`${n.type}|${n.title}|${n.message}`))
    return {
      notifications: [...deduped.map(n => ({ ...n, timestamp: Date.now() })), ...s.notifications],
    }
  }),

  readIds: new Set(),
  markRead: (id) => set((s) => ({ readIds: new Set([...s.readIds, id]) })),
  markAllRead: () => set((s) => ({ readIds: new Set(s.notifications.map(n => n.id)) })),

  notifyEmail: '',
  setNotifyEmail: (e) => set({ notifyEmail: e }),

  savedEmails: {},
  saveEmailForSource: (sourceName, email) => set((s) => ({
    savedEmails: { ...s.savedEmails, [sourceName]: email },
    notifyEmail: email
  })),
  removeEmailForSource: (sourceName) => set((s) => {
    const updated = { ...s.savedEmails }
    delete updated[sourceName]
    return { savedEmails: updated, notifyEmail: '' }
  }),

  alertConditions: { staleness: true, schema: true, anomalies: true, flow: true },
  setAlertCondition: (key, val) => set((s) => ({
    alertConditions: { ...s.alertConditions, [key]: val }
  })),

  lastSourcesScanAt: 0,
  setLastSourcesScanAt: (t: number) => set({ lastSourcesScanAt: t }),

  auditLogs: (() => {
    try {
      const saved = localStorage.getItem('datapipe_audit_logs')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })(),
  addAuditLog: (log) => set((s) => {
    // Cap at 500 entries so localStorage doesn't grow unbounded — audit
    // logs are meant as a rolling recent-activity view, not permanent
    // storage (that's what the backend /api/pipelines execute history is for).
    const updated = [log, ...s.auditLogs].slice(0, 500)
    try { localStorage.setItem('datapipe_audit_logs', JSON.stringify(updated)) } catch {}
    return { auditLogs: updated }
  }),

  transformations: [],
  addTransformation: (t) => set((s) => ({ transformations: [...s.transformations, t] })),
  removeTransformation: (id) => set((s) => ({ transformations: s.transformations.filter(t => t.id !== id) })),
  clearTransformations: () => set({ transformations: [] }),
  setTransformations: (t) => set({ transformations: t }),

  analysisTab: 'preview',
  setAnalysisTab: (t) => set({ analysisTab: t }),

  pendingCleanOptions: null,
  setPendingCleanOptions: (opts) => set({ pendingCleanOptions: opts }),
  pipelineSteps: [],
  setPipelineSteps: (steps) => set({ pipelineSteps: steps }),
  lastPipelineRunAt: null,
  setLastPipelineRunAt: (t) => set({ lastPipelineRunAt: t }),
  pipelineOutputFile: null,
  setPipelineOutputFile: (f) => set({ pipelineOutputFile: f }),
  gsheetsDestination: (() => {
    try {
      const saved = localStorage.getItem('datapro_gsheets_dest')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })(),
  setGsheetsDestination: (g) => {
    if (g) localStorage.setItem('datapro_gsheets_dest', JSON.stringify(g))
    else localStorage.removeItem('datapro_gsheets_dest')
    set({ gsheetsDestination: g })
  },
}))
