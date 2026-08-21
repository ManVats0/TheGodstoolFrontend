import { create } from 'zustand'
import { API_BASE } from '../config'

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
interface BackendConnection {
  _id: string
  userId: string
  name: string
  type: string
  config: Record<string, any>
  status: string
  createdAt: string
  updatedAt: string
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('datapro_auth_token') || ''
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Rebuild the per-table/per-collection/per-file DataSource entries this
// app already expects, from one saved connection doc's `config`.
function expandConnectionToSources(conn: BackendConnection): DataSource[] {
  const { type, config } = conn
  const addedAt = conn.updatedAt || conn.createdAt || new Date().toLocaleString()
  const mk = (idx: number, name: string, extra: Partial<DataSource> = {}): DataSource => ({
    id: `${conn._id}-${idx}`,
    name,
    type: type as DataSource['type'],
    addedAt,
    connectionId: conn._id,
    ...extra,
  })

  switch (type) {
    case 'mysql':
    case 'postgres':
      return (config.tables || []).map((t: string, i: number) =>
        mk(i, `${config.database}.${t}@${config.host}`))
    case 'cloudsql':
      return (config.tables || []).map((t: string, i: number) =>
        mk(i, `${config.database}.${t}@cloudsql.${config.project}`))
    case 'bigquery':
      return (config.tables || []).map((t: string, i: number) =>
        mk(i, `${config.project}.${config.dataset}.${t}`))
    case 'mongodb':
      return (config.collections || []).map((c: string, i: number) =>
        mk(i, `${config.database}.${c}@mongo`))
    case 'gcs':
      return (config.files || []).map((f: string, i: number) =>
        mk(i, `gcs://${config.bucket}/${f}`))
    case 'databricks':
      return (config.tables || []).map((t: string, i: number) =>
        mk(i, `${config.catalog}.${config.schema}.${t}@${config.host}`))
    case 'rest': {
      const host = (config.base_url || '').replace(/https?:\/\//, '')
      return (config.endpoints || []).map((ep: string, i: number) =>
        mk(i, `rest:${host}${ep}`))
    }
    case 'ga4':
      return (config.reports || []).map((r: string, i: number) =>
        mk(i, `ga4:${config.propertyId}/${r}`))
    case 'aws': {
      const svc = config.service
      return (config.tables || []).map((item: string, i: number) => {
        const name =
          svc === 's3' ? `s3://${config.bucket}/${item}` :
          svc === 'dynamodb' ? `${item}@dynamodb.${config.region}` :
          svc === 'cost-explorer' ? `cost-explorer:${item}@${config.region}` :
          `${config.database}.${item}@${config.host}`
        return mk(i, name)
      })
    }
    case 'sheets':
      return [mk(0, config.sheetName || conn.name, {
        sheetId: config.sheetId, tab: config.tab,
      })]
    default:
      return []
  }
}

interface AppState {
  activePage: string
  setActivePage: (page: string) => void

  sources: DataSource[]
  addSource: (source: DataSource) => void
  removeSource: (id: string) => void

  // ── Backend-backed connections (MongoDB via main.py /api/connections) ──
  loadingSourcesFromBackend: boolean
  loadSourcesFromBackend: () => Promise<void>

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
        const existingIds = new Set(s.sources.map(src => src.id))
        const newSources: DataSource[] = []
        for (const conn of conns) {
          for (const src of expandConnectionToSources(conn)) {
            if (!existingIds.has(src.id)) newSources.push(src)
          }
        }
        return {
          sources: [...s.sources, ...newSources],
          loadingSourcesFromBackend: false,
        }
      })
    } catch {
      set({ loadingSourcesFromBackend: false })
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

  auditLogs: [],
  addAuditLog: (log) => set((s) => ({ auditLogs: [log, ...s.auditLogs] })),

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
