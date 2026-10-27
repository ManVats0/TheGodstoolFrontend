  import { useState, useRef, useEffect } from 'react'
  import { useNavigate } from 'react-router-dom'
  import { useStore, sourceKeyOf, isServerSource } from '../store'
  import SourceAccess from '../components/SourceAccess'
  import { API_BASE } from '../config'
  import { usePermissions, forbiddenMessage, retryPermissions } from '../usePermissions'
  import GuidedTour, { TourStep } from './FlowTutorial'

  const DATASOURCES_TOUR: TourStep[] = [
  {
    title: 'Welcome to Data Sources 👋',
    body: 'This is where every project starts. Connect a CSV, Google Sheet, database, or API here and DataPipe will pull it in for cleaning and analysis.',
  },
  {
    target: '[data-tour="tour-datasources-tabs"]',
    title: 'Connected vs Add New',
    body: 'Use "Connected Sources" to see everything you\'ve already linked, and "+ Add New" any time you want to bring in another dataset.',
    placement: 'bottom',
  },
]

  const badge = (text: string, _color?: string) => (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(124,58,237,0.15)', color: '#c4b5fd' }}>{text}</span>
  )

  function SourceIcon({ name, size = 18, color = '#a78bfa' }: { name: string; size?: number; color?: string }) {
    const paths: Record<string, JSX.Element> = {
      inbox: <><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></>,
      file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
      grid: <><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /></>,
      folder: <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />,
      database: <><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4.03 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" /></>,
      leaf: <><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 11 13.51 11 11" /></>,
      cloud: <path d="M17.5 19H9a7 7 0 1 1 6.71-9h.79a4.5 4.5 0 1 1 0 9z" />,
      bucket: <><path d="M4 6h16l-1.58 14.22A2 2 0 0 1 16.43 22H7.57a2 2 0 0 1-1.99-1.78z" /><path d="M2 6h20M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>,
      cube: <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></>,
      globe: <><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>,
      trending: <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></>,
      check: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>,
    }
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {paths[name]}
      </svg>
    )
  }

  function getCachedAnalysis(sourceName: string): any | null {
    try {
      const raw = localStorage.getItem(`analysis_cache_${sourceName}`)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  export default function DataSources() {
    const navigate = useNavigate()
    const { can, loading: permsLoading, error: permsError } = usePermissions()
    const {
      sources, addSource, removeSource,
      switchActiveSource,
      loadCachedAnalysis,
      addAuditLog,
      loadSourcesFromBackend,
      connections
    } = useStore()
    const [tab, setTab] = useState<'existing' | 'add'>('existing')
    const [dragging, setDragging] = useState(false)
    const [pendingFile, setPendingFile] = useState<File | null>(null)
    const [showCatalogList, setShowCatalogList] = useState(false)
    const [backendAnalysisBadges, setBackendAnalysisBadges] = useState<Record<string, any>>({})
    const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null)
    const [credits, setCredits] = useState<number | null>(null)
    const [customCreditsINR, setCustomCreditsINR] = useState<number | null>(null)
    const [customCreditsUSD, setCustomCreditsUSD] = useState<number | null>(null)
    const [retentionDraft, setRetentionDraft] = useState<Record<string, string>>({})
    const [retentionSaving, setRetentionSaving] = useState<Record<string, boolean>>({})
    const [erasingId, setErasingId] = useState<string | null>(null)
    const [showGSheetsFlow, setShowGSheetsFlow] = useState(false)
    const [showMySQLFlow, setShowMySQLFlow] = useState(false)
const [mysql, setMysql] = useState({ host: '', port: '3306', user: '', password: '', database: '', ssl: false })
const [mysqlStatus, setMysqlStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
const [mysqlError, setMysqlError] = useState('')
const [mysqlTables, setMysqlTables] = useState<string[]>([])
const [mysqlSelectedTables, setMysqlSelectedTables] = useState<Set<string>>(new Set())
const [mysqlTablesLoading, setMysqlTablesLoading] = useState(false)
const [savedMySQLConns, setSavedMySQLConns] = useState<any[]>(() => {
  try { return JSON.parse(localStorage.getItem('datapro_mysql_connections') || '[]') } catch { return [] }
})
const [showPostgresFlow, setShowPostgresFlow] = useState(false)
const [postgres, setPostgres] = useState({ host: '', port: '5432', user: '', password: '', database: '', ssl: false })
const [postgresStatus, setPostgresStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
const [postgresError, setPostgresError] = useState('')
const [postgresTables, setPostgresTables] = useState<string[]>([])
const [postgresSelectedTables, setPostgresSelectedTables] = useState<Set<string>>(new Set())
const [postgresTablesLoading, setPostgresTablesLoading] = useState(false)
const [savedPostgresConns, setSavedPostgresConns] = useState<any[]>(() => {
  try { return JSON.parse(localStorage.getItem('datapro_postgres_connections') || '[]') } catch { return [] }
})
const [showBigQueryFlow, setShowBigQueryFlow] = useState(false)
const [showMongoFlow, setShowMongoFlow] = useState(false)
const [mongo, setMongo] = useState({ uri: '', database: '', ssl: false })
const [mongoStatus, setMongoStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
const [mongoError, setMongoError] = useState('')
const [mongoCollections, setMongoCollections] = useState<string[]>([])
const [mongoSelectedCollections, setMongoSelectedCollections] = useState<Set<string>>(new Set())
const [mongoCollectionsLoading, setMongoCollectionsLoading] = useState(false)
const [savedMongoConns, setSavedMongoConns] = useState<any[]>(() => {
  try { return JSON.parse(localStorage.getItem('datapro_mongo_connections') || '[]') } catch { return [] }
})
const [bqKeyJson, setBqKeyJson] = useState('')
const [bqProject, setBqProject] = useState('')
const [bqDataset, setBqDataset] = useState('')
const [bqStatus, setBqStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
const [bqError, setBqError] = useState('')
const [bqDatasets, setBqDatasets] = useState<string[]>([])
const [bqTables, setBqTables] = useState<string[]>([])
const [bqSelectedTables, setBqSelectedTables] = useState<Set<string>>(new Set())
const [bqTablesLoading, setBqTablesLoading] = useState(false)
const [savedBqConns, setSavedBqConns] = useState<any[]>(() => {
  try { return JSON.parse(localStorage.getItem('datapro_bigquery_connections') || '[]') } catch { return [] }
})

// ── GCS State ────────────────────────────────────────────────────────────────
const [showGCSFlow, setShowGCSFlow] = useState(false)
const [gcs, setGcs] = useState({ keyJson: '', project: '', bucket: '', prefix: '' })
const [gcsStatus, setGcsStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
const [gcsError, setGcsError] = useState('')
const [gcsFiles, setGcsFiles] = useState<string[]>([])
const [gcsSelectedFiles, setGcsSelectedFiles] = useState<Set<string>>(new Set())
const [gcsFilesLoading, setGcsFilesLoading] = useState(false)
const [savedGcsConns, setSavedGcsConns] = useState<any[]>(() => {
  try { return JSON.parse(localStorage.getItem('datapro_gcs_connections') || '[]') } catch { return [] }
})

// ── Cloud SQL State ───────────────────────────────────────────────────────────
const [showCloudSQLFlow, setShowCloudSQLFlow] = useState(false)
const [cloudSQL, setCloudSQL] = useState({ keyJson: '', project: '', instanceConnectionName: '', user: '', password: '', database: '', dbType: 'postgres', port: '5432' })
const [cloudSQLStatus, setCloudSQLStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
const [cloudSQLError, setCloudSQLError] = useState('')
const [cloudSQLTables, setCloudSQLTables] = useState<string[]>([])
const [cloudSQLSelectedTables, setCloudSQLSelectedTables] = useState<Set<string>>(new Set())
const [cloudSQLTablesLoading, setCloudSQLTablesLoading] = useState(false)
const [savedCloudSQLConns, setSavedCloudSQLConns] = useState<any[]>(() => {
  try { return JSON.parse(localStorage.getItem('datapro_cloudsql_connections') || '[]') } catch { return [] }
})

const [showAWSFlow, setShowAWSFlow] = useState(false)
const [showCostExplorerFlow, setShowCostExplorerFlow] = useState(false)
const [costExplorer, setCostExplorer] = useState({ accessKeyId: '', secretAccessKey: '', region: 'us-east-1', startDate: '', endDate: '', granularity: 'MONTHLY', groupBy: 'SERVICE' })
const [costExplorerStatus, setCostExplorerStatus] = useState<'idle' | 'fetching' | 'ok' | 'error'>('idle')
const [costExplorerError, setCostExplorerError] = useState('')
const [costExplorerData, setCostExplorerData] = useState<any[]>([])
const [awsService, setAwsService] = useState<'rds-mysql' | 'rds-postgres' | 's3' | 'redshift' | 'dynamodb' | 'cost-explorer'>('rds-mysql')
const [aws, setAws] = useState({
  region: 'us-east-1',
  accessKeyId: '',
  secretAccessKey: '',
  // RDS / Redshift
  host: '',
  port: '',
  user: '',
  password: '',
  database: '',
  ssl: true,
  // S3
  bucket: '',
  prefix: '',
  // DynamoDB
  tableName: '',
})
const [awsCostStartDate, setAwsCostStartDate] = useState(() => {
  const d = new Date(); d.setMonth(d.getMonth() - 3);
  return d.toISOString().slice(0, 10);
})
const [awsCostEndDate, setAwsCostEndDate] = useState(() => new Date().toISOString().slice(0, 10))
const [awsCostGranularity, setAwsCostGranularity] = useState<'DAILY' | 'MONTHLY'>('MONTHLY')
const [awsCostGroupBy, setAwsCostGroupBy] = useState<'SERVICE' | 'REGION' | 'USAGE_TYPE'>('SERVICE')
const [awsStatus, setAwsStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
const [awsError, setAwsError] = useState('')
const [awsTables, setAwsTables] = useState<string[]>([])
const [awsSelectedTables, setAwsSelectedTables] = useState<Set<string>>(new Set())
const [awsTablesLoading, setAwsTablesLoading] = useState(false)
const [savedAWSConns, setSavedAWSConns] = useState<any[]>(() => {
  try { return JSON.parse(localStorage.getItem('datapro_aws_connections') || '[]') } catch { return [] }
})

const [showDatabricksFlow, setShowDatabricksFlow] = useState(false)
const [showGA4Flow, setShowGA4Flow] = useState(false)
const [ga4, setGa4] = useState({
  keyJson: '',
  propertyId: '',
  metrics: 'sessions,activeUsers,newUsers,screenPageViews,bounceRate,averageSessionDuration',
  dimensions: 'date,sessionDefaultChannelGroup',
  startDate: '365daysAgo',
  endDate: 'today',
})
const [ga4Status, setGa4Status] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
const [ga4Error, setGa4Error] = useState('')
const [ga4Reports, setGa4Reports] = useState<string[]>([])
const [ga4SelectedReports, setGa4SelectedReports] = useState<Set<string>>(new Set())
const [ga4ReportsLoading, setGa4ReportsLoading] = useState(false)
const [savedGa4Conns, setSavedGa4Conns] = useState<any[]>(() => {
  try { return JSON.parse(localStorage.getItem('datapro_ga4_connections') || '[]') } catch { return [] }
})
const [showRestApiFlow, setShowRestApiFlow] = useState(false)
const [restApi, setRestApi] = useState({
  base_url: '',
  api_key: '',
  auth_header: 'Authorization',
  auth_prefix: 'Bearer',
  endpoints: '',
  test_path: '/',
  verify_ssl: true,
  timeout: 10,
  data_path: '',
  method: 'GET',
})
const [restStatus, setRestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
const [restError, setRestError] = useState('')
const [restEndpointResults, setRestEndpointResults] = useState<{ endpoint: string; url: string; status: number; ok: boolean; error?: string }[]>([])
const [restSelectedEndpoints, setRestSelectedEndpoints] = useState<Set<string>>(new Set())
const [savedRestConns, setSavedRestConns] = useState<any[]>(() => {
  try { return JSON.parse(localStorage.getItem('datapro_rest_connections') || '[]') } catch { return [] }
})
const [databricks, setDatabricks] = useState({ host: '', httpPath: '', token: '', catalog: 'hive_metastore', schema: 'default' })
const [databricksStatus, setDatabricksStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
const [databricksError, setDatabricksError] = useState('')
const [databricksTables, setDatabricksTables] = useState<string[]>([])
const [databricksSelectedTables, setDatabricksSelectedTables] = useState<Set<string>>(new Set())
const [databricksTablesLoading, setDatabricksTablesLoading] = useState(false)
const [savedDatabricksConns, setSavedDatabricksConns] = useState<any[]>(() => {
  try { return JSON.parse(localStorage.getItem('datapro_databricks_connections') || '[]') } catch { return [] }
})

    const [gsheetsStep, setGsheetsStep] = useState<'auth' | 'progress' | 'picker'>('auth')
    const [gsheetsEmail, setGsheetsEmail] = useState('')
    const [gsheetsProgress, setGsheetsProgress] = useState(0)
    const [gsheetsProgressLabel, setGsheetsProgressLabel] = useState('')
    const [selectedSheetId, setSelectedSheetId] = useState('')
    const [gsheetsError, setGsheetsError] = useState('')
    const fileRef = useRef<HTMLInputElement>(null)
    const dropZoneRef = useRef<HTMLDivElement>(null)

    // ── Backend connection persistence (MongoDB via main.py /api/connections) ──
    const authHeaders = (): Record<string, string> => {
      const token = localStorage.getItem('datapro_token') || ''
      return token ? { Authorization: `Bearer ${token}` } : {}
    }

    const saveConnectionToBackend = async (name: string, type: string, config: any, credentials: any): Promise<string | null> => {
      try {
        const res = await fetch(`${API_BASE}/api/connections`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ name, type, config, credentials }),
        })
        if (!res.ok) return null
        const data = await res.json()
        return data._id || null
      } catch {
        return null
      }
    }

    // Saves a Google Sheet to the workspace (stores the importer's refresh token encrypted, server-side)
    // so teammates with the right role can read it too.
    const saveSheetToBackend = async (name: string, sheetId: string, tab: string, sessionId: string): Promise<{ id: string | null; error: string }> => {
      try {
        const res = await fetch(`${API_BASE}/api/connections/google-sheets`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ sheetName: name, sheetId, tab, sessionId }),
        })
        const data = await res.json().catch(() => ({} as any))
        if (!res.ok) return { id: null, error: data?.error || `Server error (${res.status})` }
        return { id: data._id || null, error: '' }
      } catch {
        return { id: null, error: 'Could not reach the server.' }
      }
    }

    // Stores an uploaded CSV on the server (per workspace) so teammates can open it too.
    const uploadCsvToBackend = async (file: File): Promise<{ id: string | null; error: string }> => {
      try {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch(`${API_BASE}/api/connections/upload-csv`, {
          method: 'POST',
          credentials: 'include',
          headers: authHeaders(),
          body: fd,
        })
        const data = await res.json().catch(() => ({} as any))
        if (!res.ok) return { id: null, error: data?.error || `Server error (${res.status})` }
        return { id: data._id || null, error: '' }
      } catch {
        return { id: null, error: 'Could not reach the server.' }
      }
    }

    const deleteConnectionFromBackend = async (connectionId: string): Promise<'ok' | 'forbidden' | 'error'> => {
      try {
        const res = await fetch(`${API_BASE}/api/connections/${connectionId}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: authHeaders(),
        })
        if (res.status === 403) return 'forbidden'
        return res.ok ? 'ok' : 'error'
      } catch {
        return 'error'
      }
    }

    const saveRetention = async (connectionId: string) => {
      const raw = retentionDraft[connectionId]
      const days = raw && raw.trim() ? parseInt(raw, 10) : null
      setRetentionSaving(prev => ({ ...prev, [connectionId]: true }))
      try {
        await fetch(`${API_BASE}/api/connections/${connectionId}/retention`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ retention_days: days && days > 0 ? days : null }),
        })
      } catch { /* best-effort */ }
      finally { setRetentionSaving(prev => ({ ...prev, [connectionId]: false })) }
    }

    const eraseConnectionData = async (connectionId: string, sourceName: string) => {
      const confirmed = window.confirm(
        `Permanently erase ALL data for "${sourceName}"?\n\nThis drops the entire table/collection/file at the source and cannot be undone.`
      )
      if (!confirmed) return
      setErasingId(connectionId)
      try {
        const res = await fetch(`${API_BASE}/api/connections/${connectionId}/erase`, {
          method: 'POST',
          credentials: 'include',
          headers: authHeaders(),
        })
        const result = await res.json()
        if (result.success) alert(` Erased: ${result.detail || 'done'}`)
        else alert(`❌ Erasure failed: ${result.detail || 'unknown error'}`)
      } catch (e) {
        alert(`❌ Could not reach backend: ${e}`)
      } finally {
        setErasingId(null)
      }
    }

    useEffect(() => {
      // On every page load: silently check + refresh Google token, show cached sheets instantly
      const checkAuth = async () => {
        try {
          const storedSession = localStorage.getItem('datapro_session') || ''
          const status = await fetch(`${API_BASE}/api/auth/google/check`, {
            credentials: 'include',
            headers: storedSession ? { 'X-Session-ID': storedSession } : {}
          }).then(r => r.json())
          if (!status.authenticated) return

          setGsheetsEmail(status.email)

          const cached = await fetch(`${API_BASE}/api/auth/google/sheets/cached`, {
            credentials: 'include',
            headers: storedSession ? { 'X-Session-ID': storedSession } : {}
          }).then(r => r.json())
          if (cached.sheets?.length > 0) {
            setRealSheets(cached.sheets)
            setGsheetsStep('picker')
          }
        } catch {
          // No internet or backend not running — fail silently
        }
      }
      checkAuth()

      // ── Every connected data source (MySQL, Postgres, BigQuery, Mongo,
      // GCS, Cloud SQL, AWS, Databricks, REST, GA4) now lives in MongoDB
      // via /api/connections. One call rebuilds the "Connected Sources" list
      // for this user regardless of which browser/device they're on.
      loadSourcesFromBackend()

      // Credits balance — shown right after login in the page header.
      const loadCredits = async () => {
        try {
          const token = localStorage.getItem('datapro_token') || ''
          if (!token) return
          const res = await fetch(`${API_BASE}/api/plan`, {
            credentials: 'include',
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!res.ok) return
          const data = await res.json()
          setCredits(typeof data.credits === 'number' ? data.credits : 0)
          setCustomCreditsINR(typeof data.customCreditsINR === 'number' ? data.customCreditsINR : 0)
          setCustomCreditsUSD(typeof data.customCreditsUSD === 'number' ? data.customCreditsUSD : 0)
        } catch {
          // Not authenticated or backend unreachable — badge just won't show.
        }
      }
      loadCredits()

      // Cross-device "Last Run" badges — one bulk call instead of per-source.
      const loadAnalysisBadges = async () => {
        try {
          const token = localStorage.getItem('datapro_token') || ''
          const res = await fetch(`${API_BASE}/api/analysis-results`, {
            credentials: 'include',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          })
          if (!res.ok) return
          const rows = await res.json()
          if (!Array.isArray(rows)) return
          const map: Record<string, any> = {}
          rows.forEach((r: any) => { map[r.sourceKey] = r })
          setBackendAnalysisBadges(map)
        } catch {
          // Not authenticated or backend unreachable — badges just won't show; harmless.
        }
      }
      loadAnalysisBadges()
    }, [])
    // ── FIX: default to '' not 'Sheet1' — auto-set from real tab list ───────
    const [realSheets, setRealSheets] = useState<{
      id: string; name: string; tabs: string[]; tabCount: number; modifiedTime: string
    }[]>([])
    const [selectedTab, setSelectedTab] = useState('')
    const [gsheetsSearch, setGsheetsSearch] = useState('')
    const filteredRealSheets = gsheetsSearch.trim()
      ? realSheets.filter(s => s.name.toLowerCase().includes(gsheetsSearch.toLowerCase()))
      : realSheets
    // Auto-select first tab whenever a sheet is picked
    const handleSheetSelect = (sheetId: string) => {
      setSelectedSheetId(sheetId)
      const sheet = realSheets.find(s => s.id === sheetId)
      if (!sheet) {
        console.error('Sheet not found in realSheets:', sheetId, realSheets)
        return
      }
      console.log('Selected sheet:', sheet.id, sheet.name, sheet.tabs)
      setSelectedTab(sheet?.tabs?.[0] ?? '')
    }

    const handleFile = (f: File) => {
      setPendingFile(f)
    }

    const startGoogleOAuth = async () => {
  setGsheetsError('')
  setGsheetsStep('progress')
  setGsheetsProgress(10)
  setGsheetsProgressLabel('Step 1/3: Getting authorization URL…')

  try {
    const res = await fetch(`${API_BASE}/api/auth/google/url`, { credentials: 'include' })
    const data = await res.json()
    if (data.error) { setGsheetsError(data.error); setGsheetsStep('auth'); return }

    setGsheetsProgress(30)
    setGsheetsProgressLabel('Step 2/3: Waiting for Google sign-in… (complete in popup)')

    const popup = window.open(data.url, 'google-oauth', 'width=500,height=650,left=200,top=100')

    let authCompleted = false
    let popupClosedAt: number | null = null

    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type !== 'GOOGLE_AUTH_SUCCESS') return
      if (authCompleted) return
      authCompleted = true
      window.removeEventListener('message', handleMessage)
      clearInterval(timer)
      const sessionId = event.data?.sessionId || ''
      await fetchSheetsAfterAuth(sessionId)
    }

    window.addEventListener('message', handleMessage)

    const timer = setInterval(async () => {
      if (authCompleted) { clearInterval(timer); return }

      // Detect popup closed — but wait 3 seconds before giving up,
      // because COOP errors make popup.closed throw or return true prematurely
      let isClosed = false
      try {
        isClosed = popup == null || !!popup?.closed
      } catch {
        isClosed = false
      }

      if (isClosed && !authCompleted) {
        if (popupClosedAt === null) {
          popupClosedAt = Date.now()
          // Don't reset yet — give backend 3s to finish the OAuth callback
          return
        }
        if (Date.now() - popupClosedAt < 3000) {
          // Still within grace period — check auth
        } else {
          // Grace period expired and still not authed — user cancelled
          clearInterval(timer)
          window.removeEventListener('message', handleMessage)
          authCompleted = true
          setGsheetsStep('auth')
          setGsheetsProgress(0)
          return
        }
      }

      // Always poll backend regardless of popup state
      try {
        const status = await fetch(`${API_BASE}/api/auth/google/check`, { credentials: 'include' }).then(r => r.json())
        if (status.authenticated && !authCompleted) {
          authCompleted = true
          clearInterval(timer)
          window.removeEventListener('message', handleMessage)
          await fetchSheetsAfterAuth()
        }
      } catch {}
    }, 1000)

  } catch {
    setGsheetsError('Could not reach backend. Make sure the server is running.')
    setGsheetsStep('auth')
  }
}

const openGooglePicker = async () => {
      try {
        const storedSession = localStorage.getItem('datapro_session') || ''
        const res = await fetch(`${API_BASE}/api/auth/google/picker-token`, {
          credentials: 'include',
          headers: storedSession ? { 'X-Session-ID': storedSession } : {}
        })
        const data = await res.json()
        if (!data.access_token) {
          setGsheetsError('Please sign in with Google first.')
          return
        }

        const anyWindow = window as any
        anyWindow.gapi.load('picker', () => {
          const view = new anyWindow.google.picker.DocsView(anyWindow.google.picker.ViewId.SPREADSHEETS)
            .setMimeTypes('application/vnd.google-apps.spreadsheet')

          const picker = new anyWindow.google.picker.PickerBuilder()
            .addView(view)
            .setOAuthToken(data.access_token)
            .setCallback((pickerData: any) => {
              if (pickerData.action === anyWindow.google.picker.Action.PICKED) {
                const file = pickerData.docs[0]
                setRealSheets(prev => {
                  const exists = prev.find(s => s.id === file.id)
                  if (exists) return prev
                  return [...prev, { id: file.id, name: file.name, tabs: ['Sheet1'], tabCount: 1, modifiedTime: file.lastEditedUtc || '' }]
                })
                setSelectedSheetId(file.id)
                setSelectedTab('Sheet1')
              }
            })
            .build()
          picker.setVisible(true)
        })
      } catch {
        setGsheetsError('Could not open file picker. Try again.')
      }
    }

    const fetchSheetsAfterAuth = async (sessionId?: string) => {
  try {
    setGsheetsProgress(70)
    setGsheetsProgressLabel('Step 3/3: Fetching your spreadsheets…')

    if (sessionId) {
      localStorage.setItem('datapro_session', sessionId)
    }

    const storedSession = sessionId || localStorage.getItem('datapro_session') || ''

    // Retry loop — COOP can delay cookie propagation by a few seconds
    let statusData: any = null
    for (let attempt = 0; attempt < 8; attempt++) {
      await new Promise(r => setTimeout(r, 800))
      try {
        const res = await fetch(`${API_BASE}/api/auth/google/check`, {
          credentials: 'include',
          headers: storedSession ? { 'X-Session-ID': storedSession } : {}
        })
        statusData = await res.json()
        if (statusData.authenticated) break
      } catch {}
    }

    if (!statusData?.authenticated) {
      setGsheetsStep('auth')
      setGsheetsProgress(0)
      setGsheetsError('Authentication did not complete. Please try again.')
      return
    }

    setGsheetsEmail(statusData.email)
    setGsheetsProgress(85)
    setGsheetsProgressLabel('Step 3/3: Loading your spreadsheets…')

    setGsheetsProgress(100)
    setRealSheets([])
    setSelectedSheetId('')
    setSelectedTab('')
    setTimeout(() => setGsheetsStep('picker'), 400)
  } catch {
    setGsheetsError('Failed to load sheets. Try again.')
    setGsheetsStep('auth')
  }
}

    const confirmGSheet = async () => {
      if (!selectedSheetId) return
      const sheet = realSheets.find(s => s.id === selectedSheetId)
      if (!sheet) {
        setGsheetsError('Could not find the selected sheet in your list. Please close and reopen the dialog.')
        return
      }
      if (!sheet.id) {
        setGsheetsError('Sheet ID is missing. Please close and reopen the dialog.')
        return
      }

      // ── Guard: must have a real tab selected ────────────────────────────
      const tabToImport = selectedTab || sheet.tabs?.[0]
      if (!tabToImport) {
        setGsheetsError('Could not determine the worksheet tab. Please select one manually.')
        return
      }

      setGsheetsStep('progress')
      setGsheetsProgress(20)
      setGsheetsProgressLabel(`Importing "${sheet.name}" → tab "${tabToImport}"…`)
      setGsheetsError('')

      try {
        const storedSession = localStorage.getItem('datapro_session') || ''
      const res = await fetch(
        `${API_BASE}/api/auth/google/sheets/${sheet.id}/import?tab=${encodeURIComponent(tabToImport)}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: storedSession ? { 'X-Session-ID': storedSession } : {}
        }
      )
        if (!res.ok) {
          const errText = await res.text()
          setGsheetsError(`Server error ${res.status}: ${errText}`)
          setGsheetsStep('picker')
          return
        }
        const data = await res.json()
        console.log('Import response:', data)
        if (!data.filename) {
          setGsheetsError(data.error || 'Import returned no filename. Check backend logs.')
          setGsheetsStep('picker')
          return
        }
        if (data.error) {
          setGsheetsError(data.error)
          setGsheetsStep('picker')
          return
        }
        setGsheetsProgress(100)
        

  // Fetch the saved CSV so we have a real File object — same as CSV upload
  // REPLACE from "// Fetch the saved CSV..." down to "navigate('/analysis')"
  setGsheetsProgress(80)
  setGsheetsProgressLabel('Downloading imported CSV…')

  const storedSession2 = localStorage.getItem('datapro_session') || ''
  const csvRes = await fetch(`${API_BASE}/api/download/${data.filename}`, {
    credentials: 'include',
    headers: storedSession2 ? { 'X-Session-ID': storedSession2 } : {}
  })
  if (!csvRes.ok) {
    setGsheetsError(`Could not download CSV: ${data.filename}`)
    setGsheetsStep('picker')
    return
  }
  const blob = await csvRes.blob()
  if (blob.size === 0) {
    setGsheetsError('Downloaded file is empty. The sheet may have no data.')
    setGsheetsStep('picker')
    return
  }
  const realFile = new File([blob], data.filename, { type: 'text/csv' })
  setGsheetsProgress(100)

  const saved = await saveSheetToBackend(sheet.name, sheet.id, tabToImport, storedSession2)
  const backendId = saved.id
  if (!backendId) {
    alert(`Imported for you, but it could not be shared with your team:\n${saved.error}`)
  }

  const source = {
    id: backendId ? `${backendId}-0` : crypto.randomUUID(),
    name: sheet.name,
    type: 'sheets' as const,
    file: realFile,
    filename: data.filename,
    addedAt: new Date().toLocaleString(),
    sheetId: sheet.id,        // ← store the real sheet ID
    tab: tabToImport,         // ← store the tab name
    connectionId: backendId || undefined,
  }
  addSource(source)
  switchActiveSource(realFile, sheet.name)

        addAuditLog({
          id: crypto.randomUUID(),
          time: new Date().toLocaleString(),
          action: 'add_source',
          entity_type: 'data_source',
          entity_id: source.id,
          details: `Connected Google Sheet: ${sheet.name} · ${data.rows} rows · ${data.cols} cols`,
          user: 'local_user',
        })
        setShowGSheetsFlow(false)
        setGsheetsStep('auth')
        setSelectedSheetId('')
        setSelectedTab('')
        setGsheetsProgress(0)
        setTab('existing')
        navigate('/analysis')
      } catch {
        setGsheetsError('Import failed. Please try again.')
        setGsheetsStep('picker')
      }
    }

    const confirmSource = async () => {
      if (!pendingFile) return
      const saved = await uploadCsvToBackend(pendingFile)
      if (!saved.id) {
        alert(`Added for you, but it could not be shared with your team:\n${saved.error}`)
      }
      const source = {
        id: saved.id ? `${saved.id}-0` : crypto.randomUUID(),
        name: pendingFile.name,
        type: 'csv' as const,
        file: pendingFile,
        filename: pendingFile.name,
        addedAt: new Date().toLocaleString(),
        connectionId: saved.id || undefined,
      }
      addSource(source)
      switchActiveSource(pendingFile, pendingFile.name)
      addAuditLog({
        id: crypto.randomUUID(),
        time: new Date().toLocaleString(),
        action: 'add_source',
        entity_type: 'data_source',
        entity_id: source.id,
        details: `Added CSV source: ${pendingFile.name}`,
        user: 'local_user'
      })
      setPendingFile(null)
      setTab('existing')
      navigate('/analysis')
    }

    const loadSource = async (source: any) => {
      const cached = getCachedAnalysis(source.name)
      if (cached) {
        loadCachedAnalysis(source.name, cached)
        navigate('/analysis')
        return
      }
      if (!source.file && (source.type === 'csv' || source.type === 'sheets') && !isServerSource(source)) {
        alert('Re-import this source: CSV and Google Sheets data lives in the browser it was added from. Open "+ Add New" and import it again.')
        return
      }
      if (source.file) {
        switchActiveSource(source.file, source.name)
        navigate('/analysis')
      } else if (isServerSource(source)) {
        // Credentials stay server-side; Analysis sends connection_id (+ source.table etc.)
        switchActiveSource(null, source.name)
        navigate('/analysis')
      } else if (source.type === 'catalog' || source.type === 'sheets') {
        switchActiveSource(null, source.name)
        navigate('/analysis')
      } else if (source.type === 'mysql') {
        const parts: string[] = source.name.split('.')
        const tableAndHost: string = parts[1] || ''
        const table: string = tableAndHost.split('@')[0] || ''
        const database: string = parts[0] || ''
        const host: string = tableAndHost.split('@')[1] || ''
        const mysqlMeta = JSON.parse(localStorage.getItem('datapro_mysql_connections') || '[]')
        const conn = mysqlMeta.find((c: any) => String(c.host) === host && String(c.database) === database)
        if (conn) {
          localStorage.setItem('datapro_active_mysql_source', JSON.stringify({ ...conn, table }))
        }
        switchActiveSource(null, source.name)
        navigate('/analysis')
      } else if (source.type === 'postgres') {
        const parts: string[] = source.name.split('.')
        const tableAndHost: string = parts[1] || ''
        const table: string = tableAndHost.split('@')[0] || ''
        const database: string = parts[0] || ''
        const host: string = tableAndHost.split('@')[1] || ''
        const pgMeta = JSON.parse(localStorage.getItem('datapro_postgres_connections') || '[]')
        const conn = pgMeta.find((c: any) => String(c.host) === host && String(c.database) === database)
        if (conn) {
          localStorage.setItem('datapro_active_postgres_source', JSON.stringify({ ...conn, table }))
        }
        switchActiveSource(null, source.name)
        navigate('/analysis')
      } else if (source.type === 'bigquery') {
        const parts: string[] = source.name.split('.')
        const project: string = parts[0] || ''
        const dataset: string = parts[1] || ''
        const table: string = parts[2] || ''
        const bqMeta = JSON.parse(localStorage.getItem('datapro_bigquery_connections') || '[]')
        const conn = bqMeta.find((c: any) => String(c.project) === project && String(c.dataset) === dataset)
        if (conn) {
          localStorage.setItem('datapro_active_bigquery_source', JSON.stringify({ ...conn, table }))
        }
        switchActiveSource(null, source.name)
        navigate('/analysis')
      } else if (source.type === 'mongodb') {
        const atIdx = source.name.lastIndexOf('@')
        const beforeAt = atIdx >= 0 ? source.name.slice(0, atIdx) : source.name
        const dotIdx = beforeAt.indexOf('.')
        const database: string = dotIdx >= 0 ? beforeAt.slice(0, dotIdx) : beforeAt
        const collection: string = dotIdx >= 0 ? beforeAt.slice(dotIdx + 1) : ''
        const mongoMeta = JSON.parse(localStorage.getItem('datapro_mongo_connections') || '[]')
        let conn = mongoMeta.find((c: any) => String(c.database) === database)
        if (!conn && source.connectionId) {
          try {
            const res = await fetch(`${API_BASE}/api/connections/${source.connectionId}/reveal`, {
              credentials: 'include',
              headers: authHeaders(),
            })
            const data = await res.json()
            if (data && !data.error) {
              conn = { uri: data.credentials?.uri, database: data.config?.database }
            }
          } catch { /* fall through — analysis will surface a clear error */ }
        }
        if (conn) {
          localStorage.setItem('datapro_active_mongo_source', JSON.stringify({ ...conn, collection }))
        }
        switchActiveSource(null, source.name)
        navigate('/analysis')
      } else if (source.type === 'gcs') {
        const savedGCSMeta = JSON.parse(localStorage.getItem('datapro_gcs_connections') || '[]')
        const withoutProto = source.name.replace('gcs://', '')
        const slashIdx = withoutProto.indexOf('/')
        const bucket: string = slashIdx >= 0 ? withoutProto.slice(0, slashIdx) : withoutProto
        const file: string = slashIdx >= 0 ? withoutProto.slice(slashIdx + 1) : ''
        const conn = savedGCSMeta.find((c: any) => String(c.bucket) === bucket)
        if (conn) {
          localStorage.setItem('datapro_active_gcs_source', JSON.stringify({ ...conn, file }))
        }
        switchActiveSource(null, source.name)
        navigate('/analysis')
      } else if (source.type === 'cloudsql') {
        const savedCSQLMeta = JSON.parse(localStorage.getItem('datapro_cloudsql_connections') || '[]')
        const atIdx = source.name.lastIndexOf('@')
        const beforeAt = atIdx >= 0 ? source.name.slice(0, atIdx) : source.name
        const dotIdx = beforeAt.indexOf('.')
        const database: string = dotIdx >= 0 ? beforeAt.slice(0, dotIdx) : beforeAt
        const table: string = dotIdx >= 0 ? beforeAt.slice(dotIdx + 1) : ''
        const projectPart: string = atIdx >= 0 ? source.name.slice(atIdx + 1).replace('cloudsql.', '') : ''
        const conn = savedCSQLMeta.find((c: any) => String(c.database) === database && String(c.project) === projectPart)
        if (conn) {
          localStorage.setItem('datapro_active_cloudsql_source', JSON.stringify({ ...conn, table }))
        }
        switchActiveSource(null, source.name)
        navigate('/analysis')
      } else if (source.type === 'aws') {
        const awsMeta = JSON.parse(localStorage.getItem('datapro_aws_connections') || '[]')
        const conn = awsMeta.find((c: any) => {
          if (c.service === 's3') return source.name.startsWith(`s3://${c.bucket}`)
          if (c.service === 'dynamodb') return source.name.includes(`@dynamodb.${c.region}`)
          if (c.service === 'cost-explorer') return source.name.startsWith('cost-explorer:') && source.name.includes(`@${c.region}`)
          const atIdx = source.name.lastIndexOf('@')
          const host: string = atIdx >= 0 ? source.name.slice(atIdx + 1) : ''
          const beforeAt = atIdx >= 0 ? source.name.slice(0, atIdx) : source.name
          const dotIdx = beforeAt.indexOf('.')
          const database: string = dotIdx >= 0 ? beforeAt.slice(0, dotIdx) : beforeAt
          return String(c.host) === host && String(c.database) === database
        })
        if (conn) {
          localStorage.setItem('datapro_active_aws_source', JSON.stringify({ ...conn }))
        }
        switchActiveSource(null, source.name)
        navigate('/analysis')
      } else if ((source.type as string) === 'databricks') {
        const databricksMeta = JSON.parse(localStorage.getItem('datapro_databricks_connections') || '[]')
        const atIdx = source.name.lastIndexOf('@')
        const beforeAt = atIdx >= 0 ? source.name.slice(0, atIdx) : source.name
        const parts = beforeAt.split('.')
        const catalog: string = parts[0] || ''
        const schema: string = parts[1] || ''
        const table: string = parts[2] || ''
        const host: string = atIdx >= 0 ? source.name.slice(atIdx + 1) : ''
        const conn = databricksMeta.find((c: any) => String(c.host) === host && String(c.catalog) === catalog && String(c.schema) === schema)
        if (conn) {
          localStorage.setItem('datapro_active_databricks_source', JSON.stringify({ ...conn, table }))
        }
        switchActiveSource(null, source.name)
        navigate('/analysis')
      } else if ((source.type as string) === 'rest') {
        const savedRestMeta = JSON.parse(localStorage.getItem('datapro_rest_connections') || '[]')
        const withoutProto = source.name.replace('rest:', '')
        const conn = savedRestMeta.find((c: any) => {
          const connHost = (c.base_url || '').replace(/https?:\/\//, '')
          return withoutProto.startsWith(connHost)
        })
        if (conn) {
          localStorage.setItem('datapro_active_rest_source', JSON.stringify({ ...conn }))
        }
        switchActiveSource(null, source.name)
        navigate('/analysis')
      } else if ((source.type as string) === 'ga4') {
        const savedGA4Meta = JSON.parse(localStorage.getItem('datapro_ga4_connections') || '[]')
        // name format: "ga4:propertyId/reportName"
        const withoutProto = source.name.replace('ga4:', '')
        const slashIdx = withoutProto.indexOf('/')
        const propertyId = slashIdx >= 0 ? withoutProto.slice(0, slashIdx) : withoutProto
        const conn = savedGA4Meta.find((c: any) => c.propertyId === propertyId)
        if (conn) {
          localStorage.setItem('datapro_active_ga4_source', JSON.stringify({ ...conn }))
        }
        switchActiveSource(null, source.name)
        navigate('/analysis')
      }
    }

    const closeGSheets = () => {
      setShowGSheetsFlow(false)
      setGsheetsStep('auth')
      setSelectedSheetId('')
      setSelectedTab('')
      setGsheetsProgress(0)
      setGsheetsError('')
      setGsheetsSearch('')
    } 

    // Load Google Picker library once
  useEffect(() => {
    if (!document.getElementById('google-picker-script')) {
      const script = document.createElement('script')
      script.id = 'google-picker-script'
      script.src = 'https://apis.google.com/js/api.js'
      document.head.appendChild(script)
    }
  }, [])

// Google Analytics Frontend Tracking Initialization
  useEffect(() => {
    const anyWindow = window as any;
    // Only inject tracking script if it hasn't been added already
    if (!anyWindow.dataLayer) {
      const scriptId = "google-analytics-script";
      if (!document.getElementById(scriptId)) {
        const gaScript = document.createElement("script");
        gaScript.id = scriptId;
        gaScript.async = true;
        gaScript.src = "https://www.googletagmanager.com/gtag/js?id=G-TRACKING_ID"; // Replace with your real GA4 Measurement ID
        document.head.appendChild(gaScript);

        const configScript = document.createElement("script");
        configScript.textContent = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-TRACKING_ID', { page_path: window.location.pathname });
        `;
        document.head.appendChild(configScript);
      }
    } else if (typeof anyWindow.gtag === 'function') {
      // Trigger a virtual page view on component mount safely
      anyWindow.gtag('config', 'G-TRACKING_ID', { page_path: window.location.pathname });
    }
  }, []);

  const userPlan = localStorage.getItem('datapro_plan') || 'none'
  const isPaid = ['trial', 'lite', 'starter', 'pro', 'team', 'enterprise'].includes(userPlan)
const handleLockedSource = () => {
    alert('This data source requires a paid plan.\n\nUpgrade to unlock all connectors.')
    window.location.href = '/pricing'
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <GuidedTour steps={DATASOURCES_TOUR} storageKey="datapipe_tour_datasources_seen" />
      {/* Header */}
        <div className="mb-8 relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)' }}>
              <svg width="14" height="14" fill="none" stroke="#a78bfa" strokeWidth="2" viewBox="0 0 24 24">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Data Sources</h1>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Manage your data connections</p>
            </div>
            {credits !== null && credits > 0 && (
              <span className="ml-2 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5"
                style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}>
                🪙 {credits.toLocaleString()} credits
              </span>
            )}
            {customCreditsINR !== null && customCreditsINR > 0 && (
              <span className="ml-2 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5"
                style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}>
                🪙 ₹{customCreditsINR.toLocaleString(undefined, { maximumFractionDigits: 2 })} credits
              </span>
            )}
            {customCreditsUSD !== null && customCreditsUSD > 0 && (
              <span className="ml-2 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5"
                style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}>
                🪙 ${customCreditsUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })} credits
              </span>
            )}
          </div>

          {/* ── Warrior Animation ── */}
          <div className="absolute top-0 right-0" style={{ width: '120px', height: '120px' }}>
            <style>{`
              .warrior-group { cursor: pointer; }
              .warrior-body { transition: all 0.4s ease; transform-origin: bottom center; }
              .warrior-speech { opacity: 0; transition: opacity 0.3s ease 0.2s; }
              .warrior-group:hover .warrior-speech { opacity: 1; }
              .warrior-group:hover .torso { transform: translateY(18px); }
              .warrior-group:hover .head-group { transform: translateY(18px); }
              .warrior-group:hover .right-arm { transform: translateY(18px) rotate(-15deg); transform-origin: top center; }
              .warrior-group:hover .left-arm { transform: translateY(18px) rotate(15deg); transform-origin: top center; }
              .warrior-group:hover .right-leg { transform: translateY(4px) rotate(40deg) translateX(-8px); transform-origin: top center; }
              .warrior-group:hover .left-leg { transform: translateY(2px) rotate(-15deg) translateX(4px); transform-origin: top center; }
              .warrior-group:hover .cape { transform: translateY(18px) rotate(8deg); transform-origin: top center; }
              @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
              .warrior-group:not(:hover) { animation: float 3s ease-in-out infinite; }
            `}</style>
            <svg className="warrior-group" viewBox="0 0 120 130" width="120" height="130" xmlns="http://www.w3.org/2000/svg">
              {/* Speech bubble */}
              <g className="warrior-speech">
                <rect x="2" y="2" width="116" height="38" rx="10" ry="10" fill="#1a1040" stroke="#a78bfa" strokeWidth="1.5"/>
                <polygon points="55,40 65,40 60,48" fill="#1a1040" stroke="#a78bfa" strokeWidth="1.5" strokeLinejoin="round"/>
                <text x="60" y="14" textAnchor="middle" fill="#a78bfa" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif">I HAIL TO THE</text>
                <text x="60" y="26" textAnchor="middle" fill="#c4b5fd" fontSize="8" fontWeight="bold" fontFamily="sans-serif">GOD OF DATA</text>
                <text x="60" y="37" textAnchor="middle" fill="#7c3aed" fontSize="7" fontFamily="sans-serif">⚔️ 🛡️ ⚔️</text>
              </g>

              {/* Cape */}
              <g className="warrior-body cape">
                <path d="M52,68 Q44,85 46,102 Q54,98 60,100 Q66,98 74,102 Q76,85 68,68 Z" fill="#4c1d95" opacity="0.85"/>
              </g>

              {/* Legs */}
              <g className="warrior-body right-leg" style={{transformOrigin:'60px 98px'}}>
                <rect x="55" y="96" width="9" height="18" rx="4" fill="#5b21b6"/>
                <rect x="54" y="112" width="11" height="5" rx="2" fill="#6d28d9"/>
              </g>
              <g className="warrior-body left-leg" style={{transformOrigin:'60px 98px'}}>
                <rect x="66" y="96" width="9" height="18" rx="4" fill="#5b21b6"/>
                <rect x="65" y="112" width="11" height="5" rx="2" fill="#6d28d9"/>
              </g>

              {/* Torso + armor */}
              <g className="warrior-body torso">
                <rect x="50" y="68" width="20" height="28" rx="5" fill="#6d28d9"/>
                <rect x="53" y="71" width="14" height="10" rx="2" fill="#7c3aed" opacity="0.7"/>
                <line x1="60" y1="71" x2="60" y2="96" stroke="#a78bfa" strokeWidth="1" opacity="0.5"/>
                <line x1="50" y1="80" x2="70" y2="80" stroke="#a78bfa" strokeWidth="1" opacity="0.4"/>
              </g>

              {/* Arms */}
              <g className="warrior-body right-arm">
                <rect x="38" y="69" width="13" height="7" rx="3" fill="#6d28d9"/>
                {/* Sword */}
                <line x1="26" y1="65" x2="39" y2="72" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round"/>
                <line x1="30" y1="69" x2="34" y2="67" stroke="#94a3b8" strokeWidth="1.5"/>
              </g>
              <g className="warrior-body left-arm">
                <rect x="69" y="69" width="13" height="7" rx="3" fill="#6d28d9"/>
                {/* Shield */}
                <ellipse cx="85" cy="74" rx="7" ry="8" fill="#1e40af" stroke="#3b82f6" strokeWidth="1.5"/>
                <line x1="85" y1="67" x2="85" y2="81" stroke="#60a5fa" strokeWidth="1"/>
                <line x1="79" y1="74" x2="91" y2="74" stroke="#60a5fa" strokeWidth="1"/>
              </g>

              {/* Head */}
              <g className="warrior-body head-group">
                {/* Helmet */}
                <path d="M52,58 Q52,50 60,49 Q68,50 68,58 L68,62 L52,62 Z" fill="#4c1d95"/>
                <path d="M52,58 Q52,50 60,49 Q68,50 68,58" fill="#6d28d9"/>
                {/* Plume */}
                <path d="M58,49 Q60,42 62,49" stroke="#f59e0b" strokeWidth="2" fill="none" strokeLinecap="round"/>
                <circle cx="60" cy="42" r="2" fill="#f59e0b"/>
                {/* Face */}
                <rect x="53" y="58" width="14" height="10" rx="3" fill="#fcd34d"/>
                {/* Visor slit */}
                <rect x="54" y="61" width="12" height="2" rx="1" fill="#4c1d95" opacity="0.6"/>
                {/* Eyes */}
                <circle cx="57" cy="60" r="1" fill="#1e1b4b"/>
                <circle cx="63" cy="60" r="1" fill="#1e1b4b"/>
              </g>
            </svg>
          </div>
        </div>

        {/* Tabs */}
        <div data-tour="tour-datasources-tabs" className="flex gap-1 mb-6 p-1 rounded-xl w-fit"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {(['existing', 'add'] as const).filter(t => t === 'existing' || can('connection.create')).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: tab === t ? 'rgba(124,58,237,0.25)' : 'transparent',
                color: tab === t ? '#a78bfa' : 'rgba(255,255,255,0.4)',
                border: tab === t ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent'
              }}>
              {t === 'existing' ? 'Connected Sources' : '+ Add New'}
            </button>
          ))}
        </div>

        {/* Existing sources */}
        {tab === 'existing' && (
          <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Sources added earlier for AWS, Cloud Storage, Cloud SQL, Databricks, REST API or GA4 were stored in one browser only. Re-add each one once and your whole team will see it.
          </p>
        )}
        {tab === 'existing' && (
          <div>
            {sources.length === 0 ? (
              <div className="text-center py-20 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}>
                <div className="flex justify-center mb-4"><SourceIcon name="inbox" size={40} color="rgba(255,255,255,0.25)" /></div>
                <p className="text-white font-medium mb-1">No sources yet</p>
                <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>Add a data source to get started</p>
                {permsError ? (
                  <div>
                    <p className="text-sm mb-3" style={{ color: '#f87171' }}>Couldn't load your permissions</p>
                    <button onClick={() => retryPermissions()}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                      style={{ background: 'rgba(124,58,237,0.3)', border: '1px solid rgba(124,58,237,0.4)' }}>
                      Retry
                    </button>
                  </div>
                ) : permsLoading ? (
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Loading…</p>
                ) : (
                  <button disabled={!can('connection.create')} onClick={() => setTab('add')}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{ background: 'rgba(124,58,237,0.3)', border: '1px solid rgba(124,58,237,0.4)' }}>
                    {can('connection.create') ? 'Add your first source' : 'Ask an Admin or Editor to add one'}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {sources.map(s => (
                  <div key={s.id}>
                  <div
                    className="flex items-center justify-between p-4 rounded-2xl transition-all"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                    onMouseEnter={e => (e.currentTarget.style.border = '1px solid rgba(124,58,237,0.3)')}
                    onMouseLeave={e => (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.07)')}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: 'rgba(124,58,237,0.15)' }}>
                        <SourceIcon name={
                          String(s.type) === 'csv' ? 'file' : String(s.type) === 'sheets' ? 'grid' : String(s.type) === 'catalog' ? 'folder' : String(s.type) === 'mongodb' ? 'leaf' : String(s.type) === 'aws' ? 'cloud' : String(s.type) === 'gcs' ? 'bucket' : String(s.type) === 'cloudsql' ? 'database' : String(s.type) === 'databricks' ? 'cube' : String(s.type) === 'rest' ? 'globe' : String(s.type) === 'ga4' ? 'trending' : 'database'
                        } />
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">{s.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Added {s.addedAt}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {badge(s.type.toUpperCase(), '#7c3aed')}
                      {s.connectionId && connections.find(c => c._id === s.connectionId)?.access?.mode === 'restricted' && badge('Restricted', '#f59e0b')}
                      {!s.connectionId && badge('Only on this device', '#64748b')}
                      {(getCachedAnalysis(s.name) || backendAnalysisBadges[sourceKeyOf(s)]) && badge('Last Run', '#34d399')}
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#22c55e' }} />
                      <button onClick={() => loadSource(s)}
                        className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white"
                        style={{ background: 'rgba(124,58,237,0.25)', border: '1px solid rgba(124,58,237,0.3)' }}
                        title={s.name}>
                        {(() => {
                          const label = s.type === 'mysql' || s.type === 'postgres'
                              ? `Analyze (${s.name.split('.')[1]?.split('@')[0] || '?'})`
                              : s.type === 'bigquery'
                              ? `Analyze (${s.name.split('.')[2] || '?'})`
                              : s.type === 'mongodb'
                              ? `Analyze (${s.name.split('.')[1]?.split('@')[0] || '?'})`
                              : s.type === 'aws'
                              ? `Analyze (${s.name.split('/').pop()?.split('@')[0] || '?'})`
                              : (s.type as string) === 'gcs'
                              ? `Analyze (${s.name.split('/').pop() || '?'})`
                              : (s.type as string) === 'cloudsql'
                              ? `Analyze (${s.name.split('.')[1]?.split('@')[0] || '?'})`
                              : (s.type as string) === 'databricks'
                              ? `Analyze (${s.name.split('.')[2]?.split('@')[0] || '?'})`
                              : (s.type as string) === 'rest'
                              ? `Analyze (${s.name.replace('rest:', '').split('/').filter(Boolean).pop() || 'endpoint'})`
                              : (s.type as string) === 'ga4'
                              ? `Analyze (${s.name.split('/').pop() || 'report'})`
                              : 'Analyze'
                          return getCachedAnalysis(s.name) ? `${label} — Last Run →` : `${label} →`
                        })()}
                      </button>
                      <button hidden={!can('connection.erase')} onClick={() => setExpandedSourceId(prev => prev === s.id ? null : s.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: expandedSourceId === s.id ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: expandedSourceId === s.id ? '#a78bfa' : 'rgba(255,255,255,0.5)' }}
                        title="Data governance: retention & erasure">
                        ⚙
                      </button>
                      <button onClick={() => {
                        if (s.connectionId) {
                          if (!(can('connection.delete') || can('connection.deleteOwn'))) { alert(forbiddenMessage()); return }
                          deleteConnectionFromBackend(s.connectionId).then(outcome => {
                            if (outcome === 'forbidden') { alert(forbiddenMessage()); loadSourcesFromBackend() }
                          })
                        }
                        removeSource(s.id)
                        if (s.type === 'mysql') {
                          const filtered = savedMySQLConns.filter((c: any) => c.id !== s.id)
                          localStorage.setItem('datapro_mysql_connections', JSON.stringify(filtered))
                          setSavedMySQLConns(filtered)
                        }
                        if (s.type === 'postgres') {
                          const filtered = savedPostgresConns.filter((c: any) => c.id !== s.id)
                          localStorage.setItem('datapro_postgres_connections', JSON.stringify(filtered))
                          setSavedPostgresConns(filtered)
                        }
                        if (s.type === 'bigquery') {
                          const filtered = savedBqConns.filter((c: any) => c.id !== s.id)
                          localStorage.setItem('datapro_bigquery_connections', JSON.stringify(filtered))
                          setSavedBqConns(filtered)
                        }
                        if (s.type === 'mongodb') {
                          const filtered = savedMongoConns.filter((c: any) => c.id !== s.id)
                          localStorage.setItem('datapro_mongo_connections', JSON.stringify(filtered))
                          setSavedMongoConns(filtered)
                        }
                        if (s.type === 'aws') {
                          const filtered = savedAWSConns.filter((c: any) => c.id !== s.id)
                          localStorage.setItem('datapro_aws_connections', JSON.stringify(filtered))
                          setSavedAWSConns(filtered)
                        }
                        if ((s.type as string) === 'gcs') {
                          const filtered = savedGcsConns.filter((c: any) => c.id !== s.id)
                          localStorage.setItem('datapro_gcs_connections', JSON.stringify(filtered))
                          setSavedGcsConns(filtered)
                        }
                        if ((s.type as string) === 'cloudsql') {
                          const filtered = savedCloudSQLConns.filter((c: any) => c.id !== s.id)
                          localStorage.setItem('datapro_cloudsql_connections', JSON.stringify(filtered))
                          setSavedCloudSQLConns(filtered)
                        }
                                                if ((s.type as string) === 'databricks') {
                          const filtered = savedDatabricksConns.filter((c: any) => c.id !== s.id)
                          localStorage.setItem('datapro_databricks_connections', JSON.stringify(filtered))
                          setSavedDatabricksConns(filtered)
                        }
                        if ((s.type as string) === 'rest') {
                          const filtered = savedRestConns.filter((c: any) => c.id !== s.id)
                          localStorage.setItem('datapro_rest_connections', JSON.stringify(filtered))
                          setSavedRestConns(filtered)
                        }
                        if ((s.type as string) === 'ga4') {
                          const filtered = savedGa4Conns.filter((c: any) => c.id !== s.id)
                          localStorage.setItem('datapro_ga4_connections', JSON.stringify(filtered))
                          setSavedGa4Conns(filtered)
                        }
                      }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                        hidden={!(can('connection.delete') || can('connection.deleteOwn'))}
                        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                        ✕
                      </button>
                    </div>
                  </div>
                  {expandedSourceId === s.id && can('connection.erase') && (
                    <div className="mt-2 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                      <p className="text-xs font-bold text-white mb-3">Data Governance</p>
                      {s.connectionId ? (
                        <div className="space-y-3">
                          <SourceAccess
                            connectionId={s.connectionId}
                            current={connections.find(c => c._id === s.connectionId)?.access}
                            onSaved={() => { loadSourcesFromBackend() }}
                          />
                          <div>
                            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                              Retention (days) — auto-erase data after this many days of inactivity
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min={1}
                                placeholder="e.g. 90 (leave empty to disable)"
                                value={retentionDraft[s.connectionId] ?? ''}
                                onChange={e => setRetentionDraft(prev => ({ ...prev, [s.connectionId!]: e.target.value }))}
                                className="flex-1 text-sm text-white rounded-xl px-3 py-2 outline-none"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                              />
                              <button
                                onClick={() => saveRetention(s.connectionId!)}
                                disabled={retentionSaving[s.connectionId]}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-40"
                                style={{ background: 'rgba(124,58,237,0.25)', border: '1px solid rgba(124,58,237,0.35)' }}>
                                {retentionSaving[s.connectionId] ? 'Saving…' : 'Save'}
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                            <div>
                              <p className="text-xs font-semibold text-white">Right to Erasure</p>
                              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Immediately and permanently deletes this source's data (DPDP/GDPR requests)</p>
                            </div>
                            <button
                              onClick={() => eraseConnectionData(s.connectionId!, s.name)}
                              disabled={erasingId === s.connectionId}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40"
                              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                              {erasingId === s.connectionId ? 'Erasing…' : 'Erase Now'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          This source exists only in this browser, so it can't be shared, restricted or erased centrally. Re-add it while signed in to share it with your team.
                        </p>
                      )}
                    </div>
                  )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add new */}
        {tab === 'add' && !showCatalogList && (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
              <div className="p-6 rounded-2xl cursor-pointer transition-all"
                style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)' }}
                onClick={() => {
                  dropZoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  fileRef.current?.click()
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.14)'; e.currentTarget.style.border = '1px solid rgba(124,58,237,0.45)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.08)'; e.currentTarget.style.border = '1px solid rgba(124,58,237,0.25)' }}>
                <div className="mb-3"><SourceIcon name="file" size={26} /></div>
                <h3 className="font-bold text-white mb-1">CSV Upload</h3>
                <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>Upload any .csv file for instant analysis</p>
                {badge('Available', '#22c55e')}
              </div>
              <div className="p-6 rounded-2xl cursor-pointer hover:bg-blue-500/10"
                style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)' }}
                onClick={() => setShowCatalogList(true)}>
                <div className="mb-3"><SourceIcon name="folder" size={26} color="#60a5fa" /></div>
                <h3 className="font-bold text-white mb-1">From Catalog</h3>
                <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>Select verified metadata datasets</p>
                {badge('Available', '#3b82f6')}
              </div>
              <div className="p-6 rounded-2xl cursor-pointer transition-all"
                style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)' }}
                onClick={() => setShowGSheetsFlow(true)}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.14)'; e.currentTarget.style.border = '1px solid rgba(52,211,153,0.45)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.08)'; e.currentTarget.style.border = '1px solid rgba(52,211,153,0.25)' }}>
                <div className="mb-3"><SourceIcon name="grid" size={26} color="#34d399" /></div>
                <h3 className="font-bold text-white mb-1">Google Sheets</h3>
                <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>Connect live Google Sheets data</p>
                {badge('Available', '#34d399')}
              </div>
              <div className="p-6 rounded-2xl cursor-pointer transition-all"
                style={{ background: isPaid ? 'rgba(234,179,8,0.08)' : 'rgba(255,255,255,0.02)', border: isPaid ? '1px solid rgba(234,179,8,0.25)' : '1px solid rgba(255,255,255,0.06)', opacity: isPaid ? 1 : 0.6 }}
                onClick={() => isPaid ? setShowMySQLFlow(true) : handleLockedSource()}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(234,179,8,0.14)'; e.currentTarget.style.border = '1px solid rgba(234,179,8,0.45)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(234,179,8,0.08)'; e.currentTarget.style.border = '1px solid rgba(234,179,8,0.25)' }}>
                <div className="mb-3">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <ellipse cx="12" cy="5" rx="9" ry="3" fill="#f59e0b" fillOpacity="0.6"/>
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" stroke="#f59e0b" strokeWidth="1.5"/>
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" stroke="#f59e0b" strokeWidth="1.5"/>
                  </svg>
                </div>
                <h3 className="font-bold text-white mb-1">MySQL</h3>
                <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>Connect any MySQL server securely</p>
                {badge('New', '#f59e0b')}
              </div>
              <div className="p-6 rounded-2xl cursor-pointer transition-all"
                style={{ background: isPaid ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)', border: isPaid ? '1px solid rgba(99,102,241,0.25)' : '1px solid rgba(255,255,255,0.06)', opacity: isPaid ? 1 : 0.6 }}
                onClick={() => isPaid ? setShowPostgresFlow(true) : handleLockedSource()}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.14)'; e.currentTarget.style.border = '1px solid rgba(99,102,241,0.45)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; e.currentTarget.style.border = '1px solid rgba(99,102,241,0.25)' }}>
                <div className="mb-3">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <ellipse cx="12" cy="5" rx="9" ry="3" fill="#6366f1" fillOpacity="0.6"/>
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" stroke="#6366f1" strokeWidth="1.5"/>
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" stroke="#6366f1" strokeWidth="1.5"/>
                  </svg>
                </div>
                <h3 className="font-bold text-white mb-1">PostgreSQL</h3>
                <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>Connect any PostgreSQL server securely</p>
                {badge('New', '#6366f1')}
              </div>
              <div className="p-6 rounded-2xl cursor-pointer transition-all"
                style={{ background: isPaid ? 'rgba(234,88,12,0.08)' : 'rgba(255,255,255,0.02)', border: isPaid ? '1px solid rgba(234,88,12,0.25)' : '1px solid rgba(255,255,255,0.06)', opacity: isPaid ? 1 : 0.6 }}
                onClick={() => isPaid ? setShowBigQueryFlow(true) : handleLockedSource()}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(234,88,12,0.14)'; e.currentTarget.style.border = '1px solid rgba(234,88,12,0.45)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(234,88,12,0.08)'; e.currentTarget.style.border = '1px solid rgba(234,88,12,0.25)' }}>
                <div className="mb-3">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L22 19H2L12 2Z" fill="#ea580c" fillOpacity="0.6" stroke="#ea580c" strokeWidth="1.5" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="font-bold text-white mb-1">BigQuery</h3>
                <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>Connect Google BigQuery via service account</p>
                {badge('New', '#ea580c')}
              </div>
              <div className="p-6 rounded-2xl cursor-pointer transition-all"
                style={{ background: isPaid ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.02)', border: isPaid ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(255,255,255,0.06)', opacity: isPaid ? 1 : 0.6 }}
                onClick={() => isPaid ? setShowMongoFlow(true) : handleLockedSource()}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.14)'; e.currentTarget.style.border = '1px solid rgba(34,197,94,0.45)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.08)'; e.currentTarget.style.border = '1px solid rgba(34,197,94,0.25)' }}>
                <div className="mb-3">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <ellipse cx="12" cy="5" rx="9" ry="3" fill="#22c55e" fillOpacity="0.6"/>
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" stroke="#22c55e" strokeWidth="1.5" fill="none"/>
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" stroke="#22c55e" strokeWidth="1.5" fill="none"/>
                  </svg>
                </div>
                <h3 className="font-bold text-white mb-1">MongoDB</h3>
                <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>Connect MongoDB via connection URI</p>
                {badge('New', '#22c55e')}
              </div>
            <div className="p-6 rounded-2xl cursor-pointer transition-all"
                style={{ background: isPaid ? 'rgba(255,153,0,0.08)' : 'rgba(255,255,255,0.02)', border: isPaid ? '1px solid rgba(255,153,0,0.25)' : '1px solid rgba(255,255,255,0.06)', opacity: isPaid ? 1 : 0.6 }}
                onClick={() => isPaid ? setShowAWSFlow(true) : handleLockedSource()}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,153,0,0.14)'; e.currentTarget.style.border = '1px solid rgba(255,153,0,0.45)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,153,0,0.08)'; e.currentTarget.style.border = '1px solid rgba(255,153,0,0.25)' }}>
                <div className="mb-3">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <path d="M6.5 20C4.01 20 2 17.99 2 15.5C2 13.01 4.01 11 6.5 11C6.5 8.24 8.74 6 11.5 6C13.85 6 15.82 7.57 16.4 9.74C16.6 9.72 16.8 9.7 17 9.7C19.21 9.7 21 11.49 21 13.7C21 15.91 19.21 17.7 17 17.7H16.5" stroke="#FF9900" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M9 17L12 20L15 17" stroke="#FF9900" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 20V13" stroke="#FF9900" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <h3 className="font-bold text-white mb-1">AWS</h3>
                <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>RDS, S3, Redshift, DynamoDB via IAM</p>
                {badge('New', '#FF9900')}
              </div>
              <div className="p-6 rounded-2xl cursor-pointer transition-all"
                style={{ background: isPaid ? 'rgba(255,153,0,0.08)' : 'rgba(255,255,255,0.02)', border: isPaid ? '1px solid rgba(255,153,0,0.25)' : '1px solid rgba(255,255,255,0.06)', opacity: isPaid ? 1 : 0.6 }}
                onClick={() => isPaid ? setShowCostExplorerFlow(true) : handleLockedSource()}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,153,0,0.14)'; e.currentTarget.style.border = '1px solid rgba(255,153,0,0.45)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,153,0,0.08)'; e.currentTarget.style.border = '1px solid rgba(255,153,0,0.25)' }}>
                <div className="mb-3">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#FF9900" fillOpacity="0.8"/>
                  </svg>
                </div>
                <h3 className="font-bold text-white mb-1">Cost Explorer</h3>
                <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>AWS billing & cost data via IAM</p>
                {badge('New', '#FF9900')}
              </div>
              {/* GCS Card */}
              <div className="p-6 rounded-2xl cursor-pointer transition-all"
                style={{ background: isPaid ? 'rgba(66,133,244,0.08)' : 'rgba(255,255,255,0.02)', border: isPaid ? '1px solid rgba(66,133,244,0.25)' : '1px solid rgba(255,255,255,0.06)', opacity: isPaid ? 1 : 0.6 }}
                onClick={() => isPaid ? setShowGCSFlow(true) : handleLockedSource()}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(66,133,244,0.14)'; e.currentTarget.style.border = '1px solid rgba(66,133,244,0.45)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(66,133,244,0.08)'; e.currentTarget.style.border = '1px solid rgba(66,133,244,0.25)' }}>
                <div className="mb-3">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#4285F4" strokeWidth="1.5" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="font-bold text-white mb-1">Cloud Storage</h3>
                <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>GCS buckets via service account</p>
                {badge('GCP', '#4285F4')}
              </div>
              {/* Cloud SQL Card */}
              <div className="p-6 rounded-2xl cursor-pointer transition-all"
                style={{ background: isPaid ? 'rgba(52,168,83,0.08)' : 'rgba(255,255,255,0.02)', border: isPaid ? '1px solid rgba(52,168,83,0.25)' : '1px solid rgba(255,255,255,0.06)', opacity: isPaid ? 1 : 0.6 }}
                onClick={() => isPaid ? setShowCloudSQLFlow(true) : handleLockedSource()}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(52,168,83,0.14)'; e.currentTarget.style.border = '1px solid rgba(52,168,83,0.45)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(52,168,83,0.08)'; e.currentTarget.style.border = '1px solid rgba(52,168,83,0.25)' }}>
                <div className="mb-3">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <ellipse cx="12" cy="5" rx="9" ry="3" fill="#34A853" fillOpacity="0.6"/>
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" stroke="#34A853" strokeWidth="1.5" fill="none"/>
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" stroke="#34A853" strokeWidth="1.5" fill="none"/>
                  </svg>
                </div>
                <h3 className="font-bold text-white mb-1">Cloud SQL</h3>
                <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>PostgreSQL/MySQL on Cloud SQL</p>
                {badge('GCP', '#34A853')}
              </div>
                            <div className="p-6 rounded-2xl cursor-pointer transition-all"
                style={{ background: 'rgba(255,70,0,0.08)', border: '1px solid rgba(255,70,0,0.25)' }}
                onClick={() => isPaid ? setShowDatabricksFlow(true) : handleLockedSource()}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,70,0,0.14)'; e.currentTarget.style.border = '1px solid rgba(255,70,0,0.45)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,70,0,0.08)'; e.currentTarget.style.border = '1px solid rgba(255,70,0,0.25)' }}>
                <div className="mb-3">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7v5l10 5 10-5V7L12 2z" fill="#FF4600" fillOpacity="0.7" stroke="#FF4600" strokeWidth="1.2"/>
                    <path d="M2 12v5l10 5 10-5v-5" stroke="#FF4600" strokeWidth="1.2" fill="none"/>
                  </svg>
                </div>
                <h3 className="font-bold text-white mb-1">Databricks</h3>
                <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>Connect via SQL Warehouse token</p>
                {badge('New', '#FF4600')}
              </div>
              <div className="p-6 rounded-2xl cursor-pointer transition-all"
                style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.25)' }}
                onClick={() => isPaid ? setShowRestApiFlow(true) : handleLockedSource()}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(20,184,166,0.14)'; e.currentTarget.style.border = '1px solid rgba(20,184,166,0.45)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(20,184,166,0.08)'; e.currentTarget.style.border = '1px solid rgba(20,184,166,0.25)' }}>
                <div className="mb-3">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#14b8a6" strokeWidth="1.5"/>
                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="#14b8a6" strokeWidth="1.5" fill="none"/>
                  </svg>
                </div>
                <h3 className="font-bold text-white mb-1">REST API</h3>
                <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>Connect any REST API endpoint as a data source</p>
                {badge('New', '#14b8a6')}
              </div>
              <div className="p-6 rounded-2xl cursor-pointer transition-all"
                style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.25)' }}
                onClick={() => isPaid ? setShowGA4Flow(true) : handleLockedSource()}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,146,60,0.14)'; e.currentTarget.style.border = '1px solid rgba(251,146,60,0.45)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(251,146,60,0.08)'; e.currentTarget.style.border = '1px solid rgba(251,146,60,0.25)' }}>
                <div className="mb-3">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="#fb923c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="font-bold text-white mb-1">Google Analytics 4</h3>
                <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>Connect GA4 property via service account</p>
                {badge('New', '#fb923c')}
              </div>
            </div>
            {/* CSV Upload area */}
            <div
              ref={dropZoneRef}
              className="rounded-2xl p-12 text-center transition-all cursor-pointer"
              style={{
                background: dragging ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.02)',
                border: `2px dashed ${dragging ? 'rgba(124,58,237,0.6)' : pendingFile ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'}`,
              }}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => {
                e.preventDefault(); setDragging(false)
                const f = e.dataTransfer.files[0]
                if (f?.name.endsWith('.csv')) handleFile(f)
              }}>
              <input ref={fileRef} type="file" accept=".csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              {pendingFile ? (
                <div>
                  <div className="flex justify-center mb-4"><SourceIcon name="check" size={36} color="#4ade80" /></div>
                  <p className="font-bold text-white text-lg mb-1">{pendingFile.name}</p>
                  <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {Math.round(pendingFile.size / 1024)} KB · Ready to analyze
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button onClick={e => { e.stopPropagation(); setPendingFile(null) }}
                      className="px-5 py-2.5 rounded-xl text-sm font-medium"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      Clear
                    </button>
                    <button onClick={e => { e.stopPropagation(); confirmSource() }}
                      className="px-6 py-2.5 rounded-xl text-sm font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}>
                      Add Source & Analyze →
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-center mb-4"><SourceIcon name="cloud" size={36} color="rgba(255,255,255,0.3)" /></div>
                  <p className="font-bold text-white text-lg mb-1">Drop your CSV here</p>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>or click to browse · any CSV file works</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Catalog selection */}
        {tab === 'add' && showCatalogList && (
          <div className="rounded-2xl p-6 border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.1)' }}>
            <button onClick={() => setShowCatalogList(false)} className="text-white/50 hover:text-white mb-6 text-sm flex items-center gap-2">
              ← Back to connection types
            </button>
            <h3 className="text-xl font-bold text-white mb-6">Select from Data Catalog</h3>
            <div className="space-y-3">
              {sources.length === 0 ? (
  <div className="text-center py-10 text-white/30 text-sm">
    No sources connected yet. Add a source first.
  </div>
) : (
  sources.map(item => (
    <div key={item.id}
      className="flex justify-between items-center p-4 rounded-xl border border-white/10 hover:border-blue-500/50 bg-white/5 cursor-pointer"
      onClick={() => loadSource(item)}>
      <div>
        <h4 className="font-bold text-white mb-1">{item.name}</h4>
        <p className="text-xs text-white/50">Added {item.addedAt}</p>
      </div>
      <div className="flex items-center gap-4">
        <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">{item.type.toUpperCase()}</span>
        <span className="text-blue-400 font-bold ml-4">Select →</span>
      </div>
    </div>
  ))
)}
            </div>
          </div>
        )}

        {/* Google Sheets Modal */}
        {showGSheetsFlow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)' }}
            onClick={closeGSheets}>
            <div className="rounded-2xl w-full max-w-md overflow-hidden"
              style={{ background: '#0d0a1a', border: '1px solid rgba(255,255,255,0.12)' }}
              onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(124,58,237,0.3)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <rect x="4" y="2" width="16" height="20" rx="2" fill="#34A853" fillOpacity="0.2" stroke="#34A853" strokeWidth="1.5"/>
                      <line x1="8" y1="8"  x2="16" y2="8"  stroke="#34A853" strokeWidth="1.3"/>
                      <line x1="8" y1="12" x2="16" y2="12" stroke="#34A853" strokeWidth="1.3"/>
                      <line x1="8" y1="16" x2="13" y2="16" stroke="#34A853" strokeWidth="1.3"/>
                      <line x1="12" y1="2" x2="12" y2="8"  stroke="#34A853" strokeWidth="1.3"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Connect Google Sheets</h3>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {gsheetsStep === 'auth'     && 'Sign in with your Google account'}
                      {gsheetsStep === 'progress' && 'Authorizing…'}
                      {gsheetsStep === 'picker'   && `Signed in as ${gsheetsEmail}`}
                    </p>
                  </div>
                </div>
                <button onClick={closeGSheets} style={{ color: 'rgba(255,255,255,0.35)', fontSize: '18px' }}>✕</button>
              </div>

              <div className="p-5 space-y-4">

                {/* Step 1: Auth */}
                {gsheetsStep === 'auth' && (
                  <>
                    <div className="rounded-xl p-4" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(52,211,153,0.2)' }}>
                      <p className="text-xs font-bold text-white mb-1.5">🔒 Secure OAuth 2.0 via Google</p>
                      <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        We use Google's standard sign-in screen. If you're already logged into Google in this browser, your account will be pre-populated — one click and you're in.
                      </p>
                      <button className="mt-2 text-xs underline"
                        style={{ color: 'rgba(52,211,153,0.6)', background: 'none', border: 'none', cursor: 'pointer' }}
                        onClick={() => setGsheetsError(v => v ? '' : 'Google requires explicit permission consent to access your Sheets. This is a one-time step per account.')}>
                        Why this step? ⓘ
                      </button>
                      {gsheetsError && (
                        <p className="mt-2 text-xs leading-relaxed" style={{ color: '#f87171' }}>{gsheetsError}</p>
                      )}
                    </div>
                    <button onClick={startGoogleOAuth}
                      className="w-full flex items-center justify-center gap-3 py-3 rounded-xl font-semibold text-sm"
                      style={{ background: 'white', color: '#1f1f1f', border: 'none', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.3)')}
                      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                      <svg width="18" height="18" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Sign in with Google
                    </button>
                    <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                      Tip: if the picker doesn't open, your browser's ad-blocker may be blocking Google's iframe.
                    </p>
                  </>
                )}

                {/* Step 2: Progress */}
                {gsheetsStep === 'progress' && (
                  <div className="py-4 space-y-5">
                    <div className="flex items-center gap-3">
                      <svg className="animate-spin flex-shrink-0" width="20" height="20" fill="none" stroke="#34d399" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                      </svg>
                      <p className="text-sm font-semibold text-white">{gsheetsProgressLabel}</p>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        <span>Progress</span><span>{Math.round(gsheetsProgress)}%</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${gsheetsProgress}%`, background: 'linear-gradient(90deg, #34d399, #059669)' }} />
                      </div>
                    </div>
                    <div className="rounded-xl p-3 space-y-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Data row preview (sample)</p>
                      {['Row 1: Sales · Q2 · ₹48,200', 'Row 2: Marketing · Q2 · ₹12,400', 'Row 3: HR · Q1 · ₹8,900'].map((r, i) => (
                        <div key={i} className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(52,211,153,0.05)', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{r}</div>
                      ))}
                    </div>
                    <button onClick={() => { setGsheetsStep('auth'); setGsheetsProgress(0) }}
                      className="text-xs underline" style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}>
                      ↩ Something went wrong? Click to retry
                    </button>
                  </div>
                )}

                {/* Step 3: Picker */}
                {gsheetsStep === 'picker' && (
                  <>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                      style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
                      <span className="text-xs" style={{ color: '#34d399' }}>✓ Signed in as</span>
                      <span className="text-xs font-bold text-white">{gsheetsEmail}</span>
                    </div>

                    {/* Error banner (shown inline so user can recover without re-authing) */}
                    {gsheetsError && (
                      <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                        <p className="text-xs font-bold mb-0.5" style={{ color: '#f87171' }}>Import error</p>
                        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{gsheetsError}</p>
                        <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          Try selecting a different worksheet tab below, or pick another spreadsheet.
                        </p>
                      </div>
                    )}

                    <div>
                      {/* Search bar */}
                      <div style={{ position: 'relative', marginBottom: '12px' }}>
                        <svg width="13" height="13" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2"
                          viewBox="0 0 24 24"
                          style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        <input
                          type="text"
                          value={gsheetsSearch}
                          onChange={e => setGsheetsSearch(e.target.value)}
                          placeholder="Search spreadsheets by name…"
                          className="w-full text-sm text-white rounded-xl outline-none"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(52,211,153,0.25)',
                            padding: '10px 36px 10px 36px',
                          }}
                        />
                        {gsheetsSearch && (
                          <button
                            onClick={() => setGsheetsSearch('')}
                            style={{
                              position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                              background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                              cursor: 'pointer', padding: '4px',
                            }}>
                            <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        )}
                      </div>

<button onClick={openGooglePicker}
                        className="w-full mb-3 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                        style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.4)', cursor: 'pointer' }}>
                        📁 Choose a Spreadsheet from Drive
                      </button>

                      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {gsheetsSearch
                          ? `${filteredRealSheets.length} result${filteredRealSheets.length !== 1 ? 's' : ''} for "${gsheetsSearch}"`
                          : 'Your Spreadsheets'}
                      </p>
                      {filteredRealSheets.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
                          {gsheetsSearch ? `No spreadsheets match "${gsheetsSearch}"` : 'No spreadsheets found in your account.'}
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-56 overflow-auto">
                          {filteredRealSheets.map(sheet => (
                            <div key={sheet.id || sheet.name}
                              onClick={() => handleSheetSelect(sheet.id)}
                              className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all"
                              style={{
                                background: selectedSheetId === sheet.id ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${selectedSheetId === sheet.id ? 'rgba(52,211,153,0.35)' : 'rgba(255,255,255,0.07)'}`,
                              }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <rect x="3" y="2" width="18" height="20" rx="2" fill="#34A853" fillOpacity="0.2" stroke="#34A853" strokeWidth="1.5"/>
                                <line x1="7" y1="9"  x2="17" y2="9"  stroke="#34A853" strokeWidth="1.2"/>
                                <line x1="7" y1="13" x2="17" y2="13" stroke="#34A853" strokeWidth="1.2"/>
                                <line x1="7" y1="17" x2="13" y2="17" stroke="#34A853" strokeWidth="1.2"/>
                              </svg>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">{sheet.name}</p>
                                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                  {sheet.tabCount} tab{sheet.tabCount !== 1 ? 's' : ''}
                                  {sheet.modifiedTime ? ` · ${new Date(sheet.modifiedTime).toLocaleDateString()}` : ''}
                                </p>
                              </div>
                              {selectedSheetId === sheet.id && <span style={{ color: '#34d399', fontSize: '16px' }}>✓</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Tab picker — only shows real tabs from the API */}
                    {selectedSheetId && (() => {
                      const sheet = realSheets.find(s => s.id === selectedSheetId)
                      const tabs = sheet?.tabs ?? []
                      if (tabs.length === 0) return null
                      return (
                        <div>
                          <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            Select worksheet tab:
                            {selectedTab && (
                              <span className="ml-1.5 font-semibold" style={{ color: '#34d399' }}>
                                "{selectedTab}" selected
                              </span>
                            )}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {tabs.map(t => (
                              <button key={t} onClick={() => setSelectedTab(t)}
                                className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                                style={{
                                  background: selectedTab === t ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.05)',
                                  border: `1px solid ${selectedTab === t ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.1)'}`,
                                  color: selectedTab === t ? '#34d399' : 'rgba(255,255,255,0.5)',
                                }}>
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })()}

                    <button onClick={confirmGSheet} disabled={!selectedSheetId || !selectedTab}
                      className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-40 transition-all"
                      style={{ background: 'linear-gradient(135deg, #34A853, #0d9488)', border: 'none', cursor: selectedSheetId && selectedTab ? 'pointer' : 'not-allowed' }}>
                      {(() => {
                        const selectedSheetName = realSheets.find(s => s.id === selectedSheetId)?.name || ''
                        return !selectedSheetId
                          ? 'Select a spreadsheet above'
                          : !selectedTab
                            ? 'Select a worksheet tab above'
                            : `Select & Import "${selectedSheetName.length > 24 ? selectedSheetName.slice(0, 24) + '…' : selectedSheetName}" → ${selectedTab}`
                      })()}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

      {/* ── MySQL Connection Modal ──────────────────────────────────────── */}
      {showMySQLFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => { setShowMySQLFlow(false); setMysqlStatus('idle'); setMysqlError('') }}>
          <div className="rounded-2xl w-full max-w-md overflow-hidden"
            style={{ background: '#0d0a1a', border: '1px solid rgba(234,179,8,0.25)' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.8">
                    <ellipse cx="12" cy="5" rx="9" ry="3"/>
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <ellipse cx="12" cy="5" rx="9" ry="3" fill="#f59e0b" fillOpacity="0.7"/>
                      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" stroke="#f59e0b" strokeWidth="1.5"/>
                      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" stroke="#f59e0b" strokeWidth="1.5"/>
                    </svg>
                    <h3 className="font-bold text-white text-sm">Connect MySQL</h3>
                  </div>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Saved to your browser · never shared
                  </p>
                </div>
              </div>
              <button onClick={() => { setShowMySQLFlow(false); setMysqlStatus('idle'); setMysqlError('') }}
                style={{ color: 'rgba(255,255,255,0.35)', fontSize: '18px', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>

            <div className="p-5 space-y-4">

              {/* Info banner */}
              <div className="rounded-xl p-3" style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)' }}>
                <p className="text-xs font-bold text-white mb-1">🔒 SSL/TLS · Connection pool · Health check</p>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Credentials are saved in your browser only. Other users on this tool connect with their own MySQL — your database is never shared.
                </p>
              </div>

              {/* Host + Port */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Host</label>
                  <input
                    type="text"
                    value={mysql.host}
                    onChange={e => setMysql(p => ({ ...p, host: e.target.value }))}
                    placeholder="localhost or db.example.com"
                    className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(234,179,8,0.25)' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Port</label>
                  <input
                    type="number"
                    value={mysql.port}
                    onChange={e => setMysql(p => ({ ...p, port: e.target.value }))}
                    className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(234,179,8,0.25)' }}
                  />
                </div>
              </div>

              {/* Username + Password */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Username</label>
                  <input
                    type="text"
                    value={mysql.user}
                    onChange={e => setMysql(p => ({ ...p, user: e.target.value }))}
                    placeholder="root"
                    className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(234,179,8,0.25)' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Password</label>
                  <input
                    type="password"
                    value={mysql.password}
                    onChange={e => setMysql(p => ({ ...p, password: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(234,179,8,0.25)' }}
                  />
                </div>
              </div>

              {/* Database name */}
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Database Name</label>
                <input
                  type="text"
                  value={mysql.database}
                  onChange={e => setMysql(p => ({ ...p, database: e.target.value }))}
                  placeholder="my_database"
                  className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(234,179,8,0.25)' }}
                />
              </div>

              {/* SSL toggle */}
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div>
                  <p className="text-xs font-semibold text-white">SSL / TLS</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Required for remote / public servers</p>
                </div>
                <button
                  onClick={() => setMysql(p => ({ ...p, ssl: !p.ssl }))}
                  className="relative rounded-full transition-all flex-shrink-0"
                  style={{
                    width: '36px', height: '20px',
                    background: mysql.ssl ? '#f59e0b' : 'rgba(255,255,255,0.15)',
                    border: 'none', cursor: 'pointer',
                  }}>
                  <span className="absolute top-1 rounded-full bg-white transition-all"
                    style={{ width: '12px', height: '12px', left: mysql.ssl ? '20px' : '4px' }} />
                </button>
              </div>

              {/* Error message */}
              {mysqlError && (
                <div className="rounded-xl px-4 py-3"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <p className="text-xs font-bold mb-1" style={{ color: '#f87171' }}>Connection failed</p>
                  <pre className="text-xs leading-relaxed whitespace-pre-wrap m-0"
                    style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{mysqlError}</pre>
                </div>
              )}

              {/* Success + Table Picker */}
              {mysqlStatus === 'ok' && !mysqlError && (
                <div className="space-y-3">
                  <div className="rounded-xl px-4 py-3"
                    style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}>
                    <p className="text-xs font-bold" style={{ color: '#4ade80' }}>
                      ✅ Health check passed — database is reachable
                    </p>
                  </div>

                  {mysqlTablesLoading && (
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>⏳ Loading tables…</p>
                  )}

                  {!mysqlTablesLoading && mysqlTables.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          Tables to Connect
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                            {mysqlSelectedTables.size}/{mysqlTables.length} selected
                          </span>
                          <button
                            onClick={() => {
                              if (mysqlSelectedTables.size === mysqlTables.length) {
                                setMysqlSelectedTables(new Set())
                              } else {
                                setMysqlSelectedTables(new Set(mysqlTables))
                              }
                            }}
                            className="text-xs px-2 py-0.5 rounded-md font-semibold"
                            style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)', color: '#fbbf24' }}>
                            {mysqlSelectedTables.size === mysqlTables.length ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5 max-h-44 overflow-auto pr-1">
                        {mysqlTables.map((table, tableIdx) => {
  const checked = mysqlSelectedTables.has(table)
  return (
    <div
      key={`${table}-${tableIdx}`}
                              onClick={() => {
                                const next = new Set(mysqlSelectedTables)
                                checked ? next.delete(table) : next.add(table)
                                setMysqlSelectedTables(next)
                              }}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
                              style={{
                                background: checked ? 'rgba(234,179,8,0.1)' : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${checked ? 'rgba(234,179,8,0.35)' : 'rgba(255,255,255,0.07)'}`,
                              }}>
                              <div className="flex items-center justify-center rounded-md flex-shrink-0"
                                style={{
                                  width: '16px', height: '16px',
                                  background: checked ? '#f59e0b' : 'transparent',
                                  border: `2px solid ${checked ? '#f59e0b' : 'rgba(255,255,255,0.25)'}`,
                                }}>
                                {checked && (
                                  <svg width="9" height="9" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <polyline points="20 6 9 17 4 12"/>
                                  </svg>
                                )}
                              </div>
                              <svg width="13" height="13" fill="none" stroke={checked ? '#fbbf24' : 'rgba(255,255,255,0.35)'} strokeWidth="2" viewBox="0 0 24 24">
                                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
                              </svg>
                              <span className="text-sm flex-1 font-medium" style={{ color: checked ? 'white' : 'rgba(255,255,255,0.55)' }}>
                                {table}
                              </span>
                              {checked && (
                                <span className="text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ background: 'rgba(234,179,8,0.15)', color: '#fbbf24' }}>✓</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      {mysqlSelectedTables.size === 0 && (
                        <p className="text-xs mt-2 text-center" style={{ color: '#f87171' }}>Select at least one table to connect</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={async () => {
                    if (!mysql.host || !mysql.user || !mysql.database) return
                    setMysqlStatus('testing')
                    setMysqlError('')
                    try {
                      const res = await fetch(`${API_BASE}/api/mysql/health`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(mysql),
                      })
                      const data = await res.json()
                      if (data.healthy) {
                        setMysqlStatus('ok')
                        // Fetch tables after successful health check
                        setMysqlTablesLoading(true)
                        try {
                          const tablesRes = await fetch(`${API_BASE}/api/mysql/tables`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(mysql),
                          })
                          const tablesData = await tablesRes.json()
if (tablesData.tables?.length > 0) {
  setMysqlTables(tablesData.tables)
  setMysqlSelectedTables(new Set(tablesData.tables))
}
                        } catch {
                          setMysqlTables([])
                        } finally {
                          setMysqlTablesLoading(false)
                        }
                      } else {
                        setMysqlStatus('error')
                        setMysqlError(data.message || 'Unknown error')
                      }
                    } catch {
                      setMysqlStatus('error')
                      setMysqlError('❌ Could not reach backend.\n   → Make sure the server is running on port 8000.')
                    }
                  }}
                  disabled={!mysql.host || !mysql.user || !mysql.database || mysqlStatus === 'testing'}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                  style={{
                    background: 'rgba(234,179,8,0.15)',
                    border: '1px solid rgba(234,179,8,0.35)',
                    color: '#fbbf24',
                    cursor: (!mysql.host || !mysql.user || !mysql.database || mysqlStatus === 'testing') ? 'not-allowed' : 'pointer',
                  }}>
                  {mysqlStatus === 'testing' ? '⏳ Testing…' : '🔍 Test Connection'}
                </button>

                <button
                  onClick={async () => {
                    if (mysqlStatus !== 'ok') return
                    const tablesArr = [...mysqlSelectedTables]
                    const addedAt = new Date().toLocaleString()

                    const backendId = await saveConnectionToBackend(
                      `${mysql.database}@${mysql.host}`,
                      'mysql',
                      { host: mysql.host, port: mysql.port, database: mysql.database, ssl: mysql.ssl, tables: tablesArr },
                      { user: mysql.user, password: mysql.password },
                    )
                    if (!backendId) {
                      setMysqlError('\u274c Could not save this connection to your workspace, so teammates would not see it.\n   \u2192 Check that you are signed in and that your role allows connecting data sources, then try again.')
                      setMysqlStatus('error')
                      return
                    }
                    const id = backendId

                    // Keep a local cache too — needed until /api/analyze accepts
                    // connection_id directly (see get_decrypted_connection in main.py).
                    const connRecord = {
                      id, host: mysql.host, port: mysql.port, user: mysql.user,
                      password: mysql.password, database: mysql.database, ssl: mysql.ssl,
                      table: tablesArr[0], tables: tablesArr,
                      name: `${mysql.database}@${mysql.host}`, addedAt,
                    }
                    const existing = JSON.parse(localStorage.getItem('datapro_mysql_connections') || '[]')
                    const updated = [...existing, connRecord]
                    localStorage.setItem('datapro_mysql_connections', JSON.stringify(updated))
                    setSavedMySQLConns(updated)

                    tablesArr.forEach((tbl, idx) => {
                      addSource({
                        id: `${id}-${idx}`,
                        name: `${mysql.database}.${tbl}@${mysql.host}`,
                        type: 'mysql' as const,
                        addedAt,
                        connectionId: backendId || undefined,
                      })
                    })
                    addAuditLog({
                      id: crypto.randomUUID(),
                      time: addedAt,
                      action: 'add_source',
                      entity_type: 'data_source',
                      entity_id: id,
                      details: `Connected MySQL: ${mysql.database}@${mysql.host}:${mysql.port}${mysql.ssl ? ' (SSL)' : ''}`,
                      user: 'local_user',
                    })
                    setShowMySQLFlow(false)
                    setMysqlStatus('idle')
                    setMysqlError('')
                    setMysql({ host: '', port: '3306', user: '', password: '', database: '', ssl: false })
                    setMysqlTables([])
                    setMysqlSelectedTables(new Set())
                    setTab('existing')
                  }}
                  disabled={mysqlStatus !== 'ok' || mysqlSelectedTables.size === 0}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                  style={{
                    background: mysqlStatus === 'ok' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.06)',
                    border: 'none',
                    cursor: mysqlStatus !== 'ok' ? 'not-allowed' : 'pointer',
                  }}>
                  Add Source →
                </button>
              </div>

              <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Test must pass first · credentials stay in your browser only
              </p>

            </div>
          </div>
        </div>
      )}

      {/* ── PostgreSQL Connection Modal ──────────────────────────────────────── */}
      {showPostgresFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => { setShowPostgresFlow(false); setPostgresStatus('idle'); setPostgresError('') }}>
          <div className="rounded-2xl w-full max-w-md overflow-hidden"
            style={{ background: '#0d0a1a', border: '1px solid rgba(99,102,241,0.25)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.8">
                    <ellipse cx="12" cy="5" rx="9" ry="3"/>
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Connect PostgreSQL</h3>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Saved to your browser · never shared</p>
                </div>
              </div>
              <button onClick={() => { setShowPostgresFlow(false); setPostgresStatus('idle'); setPostgresError('') }}
                style={{ color: 'rgba(255,255,255,0.35)', fontSize: '18px', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-xl p-3" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <p className="text-xs font-bold text-white mb-1">🔒 SSL/TLS · Connection pool · Health check</p>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Credentials are saved in your browser only. Your database is never shared with other users.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Host</label>
                  <input type="text" value={postgres.host}
                    onChange={e => setPostgres(p => ({ ...p, host: e.target.value }))}
                    placeholder="localhost or db.example.com"
                    className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.25)' }} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Port</label>
                  <input type="number" value={postgres.port}
                    onChange={e => setPostgres(p => ({ ...p, port: e.target.value }))}
                    className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.25)' }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Username</label>
                  <input type="text" value={postgres.user}
                    onChange={e => setPostgres(p => ({ ...p, user: e.target.value }))}
                    placeholder="postgres"
                    className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.25)' }} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Password</label>
                  <input type="password" value={postgres.password}
                    onChange={e => setPostgres(p => ({ ...p, password: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.25)' }} />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Database Name</label>
                <input type="text" value={postgres.database}
                  onChange={e => setPostgres(p => ({ ...p, database: e.target.value }))}
                  placeholder="my_database"
                  className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.25)' }} />
              </div>

              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div>
                  <p className="text-xs font-semibold text-white">SSL / TLS</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Required for remote / public servers</p>
                </div>
                <button onClick={() => setPostgres(p => ({ ...p, ssl: !p.ssl }))}
                  className="relative rounded-full transition-all flex-shrink-0"
                  style={{ width: '36px', height: '20px', background: postgres.ssl ? '#6366f1' : 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer' }}>
                  <span className="absolute top-1 rounded-full bg-white transition-all"
                    style={{ width: '12px', height: '12px', left: postgres.ssl ? '20px' : '4px' }} />
                </button>
              </div>

              {postgresError && (
                <div className="rounded-xl px-4 py-3"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <p className="text-xs font-bold mb-1" style={{ color: '#f87171' }}>Connection failed</p>
                  <pre className="text-xs leading-relaxed whitespace-pre-wrap m-0"
                    style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{postgresError}</pre>
                </div>
              )}

              {postgresStatus === 'ok' && !postgresError && (
                <div className="space-y-3">
                  <div className="rounded-xl px-4 py-3"
                    style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}>
                    <p className="text-xs font-bold" style={{ color: '#4ade80' }}>✅ Health check passed — database is reachable</p>
                  </div>
                  {postgresTablesLoading && (
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>⏳ Loading tables…</p>
                  )}
                  {!postgresTablesLoading && postgresTables.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Tables to Connect</label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{postgresSelectedTables.size}/{postgresTables.length} selected</span>
                          <button
                            onClick={() => { if (postgresSelectedTables.size === postgresTables.length) { setPostgresSelectedTables(new Set()) } else { setPostgresSelectedTables(new Set(postgresTables)) } }}
                            className="text-xs px-2 py-0.5 rounded-md font-semibold"
                            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8' }}>
                            {postgresSelectedTables.size === postgresTables.length ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5 max-h-44 overflow-auto pr-1">
                        {postgresTables.map((table, idx) => {
                          const checked = postgresSelectedTables.has(table)
                          return (
                            <div key={`${table}-${idx}`}
                              onClick={() => { const next = new Set(postgresSelectedTables); checked ? next.delete(table) : next.add(table); setPostgresSelectedTables(next) }}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
                              style={{ background: checked ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${checked ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.07)'}` }}>
                              <div className="flex items-center justify-center rounded-md flex-shrink-0"
                                style={{ width: '16px', height: '16px', background: checked ? '#6366f1' : 'transparent', border: `2px solid ${checked ? '#6366f1' : 'rgba(255,255,255,0.25)'}` }}>
                                {checked && <svg width="9" height="9" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                              </div>
                              <svg width="13" height="13" fill="none" stroke={checked ? '#818cf8' : 'rgba(255,255,255,0.35)'} strokeWidth="2" viewBox="0 0 24 24">
                                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
                              </svg>
                              <span className="text-sm flex-1 font-medium" style={{ color: checked ? 'white' : 'rgba(255,255,255,0.55)' }}>{table}</span>
                              {checked && <span className="text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>✓</span>}
                            </div>
                          )
                        })}
                      </div>
                      {postgresSelectedTables.size === 0 && (
                        <p className="text-xs mt-2 text-center" style={{ color: '#f87171' }}>Select at least one table to connect</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={async () => {
                    if (!postgres.host || !postgres.user || !postgres.database) return
                    setPostgresStatus('testing')
                    setPostgresError('')
                    try {
                      const res = await fetch(`${API_BASE}/api/postgres/health`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(postgres),
                      })
                      const data = await res.json()
                      if (data.healthy) {
                        setPostgresStatus('ok')
                        setPostgresTablesLoading(true)
                        try {
                          const tablesRes = await fetch(`${API_BASE}/api/postgres/tables`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(postgres),
                          })
                          const tablesData = await tablesRes.json()
                          if (tablesData.tables?.length > 0) {
                            setPostgresTables(tablesData.tables)
                            setPostgresSelectedTables(new Set(tablesData.tables))
                          }
                        } catch { setPostgresTables([]) }
                        finally { setPostgresTablesLoading(false) }
                      } else {
                        setPostgresStatus('error')
                        setPostgresError(data.message || 'Unknown error')
                      }
                    } catch {
                      setPostgresStatus('error')
                      setPostgresError('❌ Could not reach backend.\n   → Make sure the server is running.')
                    }
                  }}
                  disabled={!postgres.host || !postgres.user || !postgres.database || postgresStatus === 'testing'}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                  style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)', color: '#818cf8', cursor: (!postgres.host || !postgres.user || !postgres.database || postgresStatus === 'testing') ? 'not-allowed' : 'pointer' }}>
                  {postgresStatus === 'testing' ? '⏳ Testing…' : '🔍 Test Connection'}
                </button>
                <button
                  onClick={async () => {
                    if (postgresStatus !== 'ok') return
                    const tablesArr = [...postgresSelectedTables]
                    const addedAt = new Date().toLocaleString()

                    const backendId = await saveConnectionToBackend(
                      `${postgres.database}@${postgres.host}`,
                      'postgres',
                      { host: postgres.host, port: postgres.port, database: postgres.database, ssl: postgres.ssl, tables: tablesArr },
                      { user: postgres.user, password: postgres.password },
                    )
                    if (!backendId) {
                      setPostgresError('\u274c Could not save this connection to your workspace, so teammates would not see it.\n   \u2192 Check that you are signed in and that your role allows connecting data sources, then try again.')
                      setPostgresStatus('error')
                      return
                    }
                    const id = backendId

                    const connRecord = {
                      id, host: postgres.host, port: postgres.port, user: postgres.user,
                      password: postgres.password, database: postgres.database, ssl: postgres.ssl,
                      table: tablesArr[0], tables: tablesArr,
                      name: `${postgres.database}@${postgres.host}`, addedAt,
                    }
                    const existing = JSON.parse(localStorage.getItem('datapro_postgres_connections') || '[]')
                    const updated = [...existing, connRecord]
                    localStorage.setItem('datapro_postgres_connections', JSON.stringify(updated))
                    setSavedPostgresConns(updated);
                    tablesArr.forEach((tbl, idx) => {
                      addSource({
                        id: `${id}-${idx}`,
                        name: `${postgres.database}.${tbl}@${postgres.host}`,
                        type: 'postgres' as const,
                        addedAt,
                        connectionId: backendId || undefined,
                      })
                    })
                    addAuditLog({
                      id: crypto.randomUUID(),
                      time: new Date().toLocaleString(),
                      action: 'add_source',
                      entity_type: 'data_source',
                      entity_id: id,
                      details: `Connected PostgreSQL: ${postgres.database}@${postgres.host}:${postgres.port}${postgres.ssl ? ' (SSL)' : ''}`,
                      user: 'local_user',
                    })
                    setShowPostgresFlow(false)
                    setPostgresStatus('idle')
                    setPostgresError('')
                    setPostgres({ host: '', port: '5432', user: '', password: '', database: '', ssl: false })
                    setPostgresTables([])
                    setPostgresSelectedTables(new Set())
                    setTab('existing')
                  }}
                  disabled={postgresStatus !== 'ok' || postgresSelectedTables.size === 0}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                  style={{ background: postgresStatus === 'ok' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255,255,255,0.06)', border: 'none', cursor: postgresStatus !== 'ok' ? 'not-allowed' : 'pointer' }}>
                  Add Source →
                </button>
              </div>

              <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Test must pass first · credentials stay in your browser only
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── BigQuery Connection Modal ──────────────────────────────────────── */}
      {showBigQueryFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => { setShowBigQueryFlow(false); setBqStatus('idle'); setBqError('') }}>
          <div className="rounded-2xl w-full max-w-md overflow-hidden"
            style={{ background: '#0d0a1a', border: '1px solid rgba(234,88,12,0.25)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(234,88,12,0.12)', border: '1px solid rgba(234,88,12,0.3)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L22 19H2L12 2Z" fill="#ea580c" fillOpacity="0.7" stroke="#ea580c" strokeWidth="1.5" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Connect BigQuery</h3>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Service account key · never shared</p>
                </div>
              </div>
              <button onClick={() => { setShowBigQueryFlow(false); setBqStatus('idle'); setBqError('') }}
                style={{ color: 'rgba(255,255,255,0.35)', fontSize: '18px', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-xl p-3" style={{ background: 'rgba(234,88,12,0.06)', border: '1px solid rgba(234,88,12,0.2)' }}>
                <p className="text-xs font-bold text-white mb-1">🔑 Service Account JSON Key</p>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  In Google Cloud Console → IAM → Service Accounts → create key (JSON). The service account needs BigQuery Data Viewer + BigQuery Job User roles. Key is saved in your browser only.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Project ID</label>
                <input
                  type="text"
                  value={bqProject}
                  onChange={e => setBqProject(e.target.value)}
                  placeholder="my-gcp-project-id"
                  className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(234,88,12,0.25)' }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Service Account Key JSON</label>
                <textarea
                  value={bqKeyJson}
                  onChange={e => setBqKeyJson(e.target.value)}
                  placeholder='Paste the full JSON key here: {"type":"service_account","project_id":...}'
                  rows={5}
                  className="w-full text-xs text-white rounded-xl px-3 py-2.5 outline-none resize-none font-mono"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(234,88,12,0.25)' }}
                />
              </div>

              {bqError && (
                <div className="rounded-xl px-4 py-3"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <p className="text-xs font-bold mb-1" style={{ color: '#f87171' }}>Connection failed</p>
                  <pre className="text-xs leading-relaxed whitespace-pre-wrap m-0"
                    style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{bqError}</pre>
                </div>
              )}

              {bqStatus === 'ok' && !bqError && (
                <div className="space-y-3">
                  <div className="rounded-xl px-4 py-3"
                    style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}>
                    <p className="text-xs font-bold" style={{ color: '#4ade80' }}>✅ Health check passed — BigQuery is reachable</p>
                  </div>

                  {bqDatasets.length > 0 && (
                    <div>
                      <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Dataset</label>
                      <div style={{ position: 'relative' }}>
                        <select
                          value={bqDataset}
                          onChange={async e => {
                            setBqDataset(e.target.value)
                            setBqTables([])
                            setBqSelectedTables(new Set())
                            if (!e.target.value) return
                            setBqTablesLoading(true)
                            try {
                              const res = await fetch(`${API_BASE}/api/bigquery/tables`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ key_json: bqKeyJson, project: bqProject, dataset: e.target.value }),
                              })
                              const data = await res.json()
                              if (data.tables?.length > 0) {
                                setBqTables(data.tables)
                                setBqSelectedTables(new Set(data.tables))
                              }
                            } catch { setBqTables([]) }
                            finally { setBqTablesLoading(false) }
                          }}
                          className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none appearance-none"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(234,88,12,0.25)', paddingRight: '28px', cursor: 'pointer' }}
                        >
                          <option value="" style={{ background: '#0d0a1a' }}>Select a dataset…</option>
                          {bqDatasets.map(d => (
                            <option key={d} value={d} style={{ background: '#0d0a1a' }}>{d}</option>
                          ))}
                        </select>
                        <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                          <svg width="10" height="10" fill="none" stroke="rgba(234,88,12,0.7)" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
                        </div>
                      </div>
                    </div>
                  )}

                  {bqTablesLoading && (
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>⏳ Loading tables…</p>
                  )}

                  {!bqTablesLoading && bqTables.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Tables to Connect</label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{bqSelectedTables.size}/{bqTables.length} selected</span>
                          <button
                            onClick={() => {
                              if (bqSelectedTables.size === bqTables.length) setBqSelectedTables(new Set())
                              else setBqSelectedTables(new Set(bqTables))
                            }}
                            className="text-xs px-2 py-0.5 rounded-md font-semibold"
                            style={{ background: 'rgba(234,88,12,0.1)', border: '1px solid rgba(234,88,12,0.25)', color: '#fb923c' }}>
                            {bqSelectedTables.size === bqTables.length ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5 max-h-44 overflow-auto pr-1">
                        {bqTables.map((table, idx) => {
                          const checked = bqSelectedTables.has(table)
                          return (
                            <div key={`${table}-${idx}`}
                              onClick={() => {
                                const next = new Set(bqSelectedTables)
                                checked ? next.delete(table) : next.add(table)
                                setBqSelectedTables(next)
                              }}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
                              style={{
                                background: checked ? 'rgba(234,88,12,0.1)' : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${checked ? 'rgba(234,88,12,0.35)' : 'rgba(255,255,255,0.07)'}`,
                              }}>
                              <div className="flex items-center justify-center rounded-md flex-shrink-0"
                                style={{ width: '16px', height: '16px', background: checked ? '#ea580c' : 'transparent', border: `2px solid ${checked ? '#ea580c' : 'rgba(255,255,255,0.25)'}` }}>
                                {checked && <svg width="9" height="9" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                              </div>
                              <svg width="13" height="13" fill="none" stroke={checked ? '#fb923c' : 'rgba(255,255,255,0.35)'} strokeWidth="2" viewBox="0 0 24 24">
                                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
                              </svg>
                              <span className="text-sm flex-1 font-medium" style={{ color: checked ? 'white' : 'rgba(255,255,255,0.55)' }}>{table}</span>
                              {checked && <span className="text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ background: 'rgba(234,88,12,0.15)', color: '#fb923c' }}>✓</span>}
                            </div>
                          )
                        })}
                      </div>
                      {bqSelectedTables.size === 0 && (
                        <p className="text-xs mt-2 text-center" style={{ color: '#f87171' }}>Select at least one table to connect</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={async () => {
                    if (!bqProject || !bqKeyJson) return
                    setBqStatus('testing')
                    setBqError('')
                    try {
                      const res = await fetch(`${API_BASE}/api/bigquery/health`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ key_json: bqKeyJson, project: bqProject }),
                      })
                      const data = await res.json()
                      if (data.healthy) {
                        setBqStatus('ok')
                        setBqTablesLoading(true)
                        try {
                          const dsRes = await fetch(`${API_BASE}/api/bigquery/tables`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ key_json: bqKeyJson, project: bqProject, dataset: '' }),
                          })
                          const dsData = await dsRes.json()
                          if (dsData.datasets?.length > 0) {
                            setBqDatasets(dsData.datasets)
                            // auto-load tables for first dataset
                            const firstDs = dsData.datasets[0]
                            setBqDataset(firstDs)
                            const tRes = await fetch(`${API_BASE}/api/bigquery/tables`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ key_json: bqKeyJson, project: bqProject, dataset: firstDs }),
                            })
                            const tData = await tRes.json()
                            if (tData.tables?.length > 0) {
                              setBqTables(tData.tables)
                              setBqSelectedTables(new Set(tData.tables))
                            }
                          }
                        } catch { setBqDatasets([]) }
                        finally { setBqTablesLoading(false) }
                      } else {
                        setBqStatus('error')
                        setBqError(data.message || 'Unknown error')
                      }
                    } catch {
                      setBqStatus('error')
                      setBqError('❌ Could not reach backend.\n   → Make sure the server is running on port 8000.')
                    }
                  }}
                  disabled={!bqProject || !bqKeyJson || bqStatus === 'testing'}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                  style={{
                    background: 'rgba(234,88,12,0.15)',
                    border: '1px solid rgba(234,88,12,0.35)',
                    color: '#fb923c',
                    cursor: (!bqProject || !bqKeyJson || bqStatus === 'testing') ? 'not-allowed' : 'pointer',
                  }}>
                  {bqStatus === 'testing' ? '⏳ Testing…' : '🔍 Test Connection'}
                </button>

                <button
                  onClick={async () => {
                    if (bqStatus !== 'ok' || bqSelectedTables.size === 0) return
                    const addedAt = new Date().toLocaleString()
                    const tablesArr = [...bqSelectedTables]
                    const backendId = await saveConnectionToBackend(
                      `${bqProject}.${bqDataset}@bigquery`,
                      'bigquery',
                      { project: bqProject, dataset: bqDataset, tables: tablesArr },
                      { key_json: bqKeyJson },
                    )
                    if (!backendId) { setBqError('Could not save the connection to the server. Make sure you are signed in and have permission.'); return }
                    const id = backendId
                    tablesArr.forEach((tbl, idx) => {
                      addSource({
                        id: `${id}-${idx}`,
                        name: `${bqProject}.${bqDataset}.${tbl}`,
                        type: 'bigquery' as const,
                        addedAt,
                        connectionId: backendId,
                        table: tbl,
                      } as any)
                    })
                    addAuditLog({
                      id: crypto.randomUUID(),
                      time: new Date().toLocaleString(),
                      action: 'add_source',
                      entity_type: 'data_source',
                      entity_id: id,
                      details: `Connected BigQuery: ${bqProject}.${bqDataset} (${bqSelectedTables.size} table(s))`,
                      user: 'local_user',
                    })
                    setShowBigQueryFlow(false)
                    setBqStatus('idle')
                    setBqError('')
                    setBqKeyJson('')
                    setBqProject('')
                    setBqDataset('')
                    setBqDatasets([])
                    setBqTables([])
                    setBqSelectedTables(new Set())
                    setTab('existing')
                  }}
                  disabled={bqStatus !== 'ok' || bqSelectedTables.size === 0}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                  style={{
                    background: bqStatus === 'ok' ? 'linear-gradient(135deg, #ea580c, #c2410c)' : 'rgba(255,255,255,0.06)',
                    border: 'none',
                    cursor: bqStatus !== 'ok' ? 'not-allowed' : 'pointer',
                  }}>
                  Add Source →
                </button>
              </div>

              <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Test must pass first · key stays in your browser only
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── MongoDB Connection Modal ──────────────────────────────────────── */}
      {showMongoFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => { setShowMongoFlow(false); setMongoStatus('idle'); setMongoError('') }}>
          <div className="rounded-2xl w-full max-w-md overflow-hidden"
            style={{ background: '#0d0a1a', border: '1px solid rgba(34,197,94,0.25)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.8">
                    <ellipse cx="12" cy="5" rx="9" ry="3"/>
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Connect MongoDB</h3>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Saved to your browser · never shared</p>
                </div>
              </div>
              <button onClick={() => { setShowMongoFlow(false); setMongoStatus('idle'); setMongoError('') }}
                style={{ color: 'rgba(255,255,255,0.35)', fontSize: '18px', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-xl p-3" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <p className="text-xs font-bold text-white mb-1">🔒 Connection URI · Health check</p>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Get this from MongoDB Atlas → Install MongoDB Atlas → Connect → Drivers. Format: mongodb+srv://user:pass@cluster.mongodb.net/ — Credentials stay in your browser only.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Connection URI</label>
                <input
                  type="text"
                  value={mongo.uri}
                  onChange={e => setMongo(p => ({ ...p, uri: e.target.value }))}
                  placeholder="mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/"
                  className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(34,197,94,0.25)' }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Database Name</label>
                <input
                  type="text"
                  value={mongo.database}
                  onChange={e => setMongo(p => ({ ...p, database: e.target.value }))}
                  placeholder="my_database"
                  className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(34,197,94,0.25)' }}
                />
              </div>

              {mongoError && (
                <div className="rounded-xl px-4 py-3"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <p className="text-xs font-bold mb-1" style={{ color: '#f87171' }}>Connection failed</p>
                  <pre className="text-xs leading-relaxed whitespace-pre-wrap m-0"
                    style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{mongoError}</pre>
                </div>
              )}

              {mongoStatus === 'ok' && !mongoError && (
                <div className="space-y-3">
                  <div className="rounded-xl px-4 py-3"
                    style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}>
                    <p className="text-xs font-bold" style={{ color: '#4ade80' }}>✅ Health check passed — MongoDB is reachable</p>
                  </div>
                  {mongoCollectionsLoading && (
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>⏳ Loading collections…</p>
                  )}
                  {!mongoCollectionsLoading && mongoCollections.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Collections to Connect</label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{mongoSelectedCollections.size}/{mongoCollections.length} selected</span>
                          <button
                            onClick={() => {
                              if (mongoSelectedCollections.size === mongoCollections.length) setMongoSelectedCollections(new Set())
                              else setMongoSelectedCollections(new Set(mongoCollections))
                            }}
                            className="text-xs px-2 py-0.5 rounded-md font-semibold"
                            style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }}>
                            {mongoSelectedCollections.size === mongoCollections.length ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5 max-h-44 overflow-auto pr-1">
                        {mongoCollections.map((coll, idx) => {
                          const checked = mongoSelectedCollections.has(coll)
                          return (
                            <div key={`${coll}-${idx}`}
                              onClick={() => {
                                const next = new Set(mongoSelectedCollections)
                                checked ? next.delete(coll) : next.add(coll)
                                setMongoSelectedCollections(next)
                              }}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
                              style={{ background: checked ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${checked ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.07)'}` }}>
                              <div className="flex items-center justify-center rounded-md flex-shrink-0"
                                style={{ width: '16px', height: '16px', background: checked ? '#22c55e' : 'transparent', border: `2px solid ${checked ? '#22c55e' : 'rgba(255,255,255,0.25)'}` }}>
                                {checked && <svg width="9" height="9" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                              </div>
                              <svg width="13" height="13" fill="none" stroke={checked ? '#4ade80' : 'rgba(255,255,255,0.35)'} strokeWidth="2" viewBox="0 0 24 24">
                                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
                              </svg>
                              <span className="text-sm flex-1 font-medium" style={{ color: checked ? 'white' : 'rgba(255,255,255,0.55)' }}>{coll}</span>
                              {checked && <span className="text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>✓</span>}
                            </div>
                          )
                        })}
                      </div>
                      {mongoSelectedCollections.size === 0 && (
                        <p className="text-xs mt-2 text-center" style={{ color: '#f87171' }}>Select at least one collection to connect</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={async () => {
                    if (!mongo.uri || !mongo.database) return
                    setMongoStatus('testing')
                    setMongoError('')
                    try {
                      const res = await fetch(`${API_BASE}/api/mongo/health`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ uri: mongo.uri, database: mongo.database }),
                      })
                      const data = await res.json()
                      if (data.healthy) {
                        setMongoStatus('ok')
                        setMongoCollectionsLoading(true)
                        try {
                          const collRes = await fetch(`${API_BASE}/api/mongo/collections`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ uri: mongo.uri, database: mongo.database }),
                          })
                          const collData = await collRes.json()
                          if (collData.collections?.length > 0) {
                            setMongoCollections(collData.collections)
                            setMongoSelectedCollections(new Set(collData.collections))
                          }
                        } catch { setMongoCollections([]) }
                        finally { setMongoCollectionsLoading(false) }
                      } else {
                        setMongoStatus('error')
                        setMongoError(data.message || 'Unknown error')
                      }
                    } catch {
                      setMongoStatus('error')
                      setMongoError('❌ Could not reach backend.\n   → Make sure the server is running.')
                    }
                  }}
                  disabled={!mongo.uri || !mongo.database || mongoStatus === 'testing'}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                  style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.35)', color: '#4ade80', cursor: (!mongo.uri || !mongo.database || mongoStatus === 'testing') ? 'not-allowed' : 'pointer' }}>
                  {mongoStatus === 'testing' ? '⏳ Testing…' : '🔍 Test Connection'}
                </button>

                <button
                  onClick={async () => {
                    if (mongoStatus !== 'ok' || mongoSelectedCollections.size === 0) return
                    const collectionsArr = [...mongoSelectedCollections]
                    const addedAt = new Date().toLocaleString()

                    const backendId = await saveConnectionToBackend(
                      `${mongo.database}@mongo`,
                      'mongodb',
                      { database: mongo.database, collections: collectionsArr },
                      { uri: mongo.uri },
                    )
                    if (!backendId) {
                      setMongoError('\u274c Could not save this connection to your workspace, so teammates would not see it.\n   \u2192 Check that you are signed in and that your role allows connecting data sources, then try again.')
                      setMongoStatus('error')
                      return
                    }
                    const id = backendId

                    const connRecord = {
                      id,
                      uri: mongo.uri,
                      database: mongo.database,
                      collection: collectionsArr[0],
                      collections: collectionsArr,
                      name: `${mongo.database}@mongo`,
                      addedAt,
                    }
                    const existing = JSON.parse(localStorage.getItem('datapro_mongo_connections') || '[]')
                    const updated = [...existing, connRecord]
                    localStorage.setItem('datapro_mongo_connections', JSON.stringify(updated))
                    setSavedMongoConns(updated)
                    collectionsArr.forEach((coll, idx) => {
                      addSource({
                        id: `${id}-${idx}`,
                        name: `${mongo.database}.${coll}@mongo`,
                        type: 'mongodb' as const,
                        addedAt,
                        connectionId: backendId || undefined,
                      })
                    })
                    addAuditLog({
                      id: crypto.randomUUID(),
                      time: addedAt,
                      action: 'add_source',
                      entity_type: 'data_source',
                      entity_id: id,
                      details: `Connected MongoDB: ${mongo.database} (${mongoSelectedCollections.size} collection(s))`,
                      user: 'local_user',
                    })
                    setShowMongoFlow(false)
                    setMongoStatus('idle')
                    setMongoError('')
                    setMongo({ uri: '', database: '', ssl: false })
                    setMongoCollections([])
                    setMongoSelectedCollections(new Set())
                    setTab('existing')
                  }}
                  disabled={mongoStatus !== 'ok' || mongoSelectedCollections.size === 0}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                  style={{ background: mongoStatus === 'ok' ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(255,255,255,0.06)', border: 'none', cursor: mongoStatus !== 'ok' ? 'not-allowed' : 'pointer' }}>
                  Add Source →
                </button>
              </div>

              <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Test must pass first · URI stays in your browser only
              </p>
            </div>
          </div>
        </div>
      )}
  {/* ── AWS Connection Modal ──────────────────────────────────────────── */}
      {showAWSFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => { setShowAWSFlow(false); setAwsStatus('idle'); setAwsError('') }}>
          <div className="rounded-2xl w-full max-w-lg overflow-hidden"
            style={{ background: '#0d0a1a', border: '1px solid rgba(255,153,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255,153,0,0.12)', border: '1px solid rgba(255,153,0,0.3)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M6.5 20C4.01 20 2 17.99 2 15.5C2 13.01 4.01 11 6.5 11C6.5 8.24 8.74 6 11.5 6C13.85 6 15.82 7.57 16.4 9.74C16.6 9.72 16.8 9.7 17 9.7C19.21 9.7 21 11.49 21 13.7C21 15.91 19.21 17.7 17 17.7H16.5" stroke="#FF9900" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M9 17L12 20L15 17" stroke="#FF9900" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 20V13" stroke="#FF9900" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Connect AWS</h3>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>IAM credentials · saved in browser only</p>
                </div>
              </div>
              <button onClick={() => { setShowAWSFlow(false); setAwsStatus('idle'); setAwsError('') }}
                style={{ color: 'rgba(255,255,255,0.35)', fontSize: '18px', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>

            <div className="p-5 space-y-4">
              {/* IAM info banner */}
              <div className="rounded-xl p-3" style={{ background: 'rgba(255,153,0,0.06)', border: '1px solid rgba(255,153,0,0.2)' }}>
                <p className="text-xs font-bold text-white mb-1">🔑 IAM Access Key Required</p>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  In AWS Console → IAM → Users → your user → Security credentials → Create access key.
                  The IAM user needs: <strong style={{ color: '#FF9900' }}>AmazonRDSReadOnlyAccess</strong> (for RDS/Redshift),
                  <strong style={{ color: '#FF9900' }}> AmazonS3ReadOnlyAccess</strong> (for S3),
                  or <strong style={{ color: '#FF9900' }}>AmazonDynamoDBReadOnlyAccess</strong> (for DynamoDB).
                  Keys are saved in your browser only and never shared.
                </p>
              </div>

              {/* Service selector */}
              <div>
                <label className="text-xs font-semibold block mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>AWS Service</label>
                <div className="grid grid-cols-6 gap-1.5">
                  {([
                    { id: 'rds-mysql', label: 'RDS MySQL' },
                    { id: 'rds-postgres', label: 'RDS PG' },
                    { id: 'redshift', label: 'Redshift' },
                    { id: 's3', label: 'S3' },
                    { id: 'dynamodb', label: 'DynamoDB' },
                    { id: 'cost-explorer', label: 'Cost Explorer' },
                  ] as const).map(svc => (
                    <div key={svc.id}
                      onClick={() => { setAwsService(svc.id); setAwsStatus('idle'); setAwsError(''); setAwsTables([]); setAwsSelectedTables(new Set()) }}
                      className="p-2 rounded-xl cursor-pointer text-center transition-all"
                      style={{
                        background: awsService === svc.id ? 'rgba(255,153,0,0.2)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${awsService === svc.id ? 'rgba(255,153,0,0.5)' : 'rgba(255,255,255,0.07)'}`,
                      }}>
                      <p className="text-xs font-semibold" style={{ color: awsService === svc.id ? '#FF9900' : 'rgba(255,255,255,0.55)', fontSize: '10px' }}>{svc.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Region */}
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>AWS Region</label>
                <select value={aws.region} onChange={e => setAws(p => ({ ...p, region: e.target.value }))}
                  className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,153,0,0.25)' }}>
                  {['us-east-1','us-east-2','us-west-1','us-west-2','eu-west-1','eu-west-2','eu-central-1',
                    'ap-south-1','ap-southeast-1','ap-southeast-2','ap-northeast-1','ca-central-1','sa-east-1'].map(r => (
                    <option key={r} value={r} style={{ background: '#0d0a1a' }}>{r}</option>
                  ))}
                </select>
              </div>

              {/* IAM credentials */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Access Key ID</label>
                  <input type="text" value={aws.accessKeyId}
                    onChange={e => setAws(p => ({ ...p, accessKeyId: e.target.value }))}
                    placeholder="AKIAIOSFODNN7EXAMPLE"
                    className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,153,0,0.25)' }} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Secret Access Key</label>
                  <input type="password" value={aws.secretAccessKey}
                    onChange={e => setAws(p => ({ ...p, secretAccessKey: e.target.value }))}
                    placeholder="••••••••••••••••••••"
                    className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,153,0,0.25)' }} />
                </div>
              </div>

              {/* Service-specific fields */}
              {(awsService === 'rds-mysql' || awsService === 'rds-postgres' || awsService === 'redshift') && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {awsService === 'redshift' ? 'Redshift Endpoint' : 'RDS Endpoint'}
                      </label>
                      <input type="text" value={aws.host}
                        onChange={e => setAws(p => ({ ...p, host: e.target.value }))}
                        placeholder={awsService === 'redshift' ? 'cluster.xxxx.region.redshift.amazonaws.com' : 'mydb.xxxx.region.rds.amazonaws.com'}
                        className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,153,0,0.25)' }} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Port</label>
                      <input type="number" value={aws.port || (awsService === 'rds-mysql' ? '3306' : awsService === 'redshift' ? '5439' : '5432')}
                        onChange={e => setAws(p => ({ ...p, port: e.target.value }))}
                        className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,153,0,0.25)' }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Username</label>
                      <input type="text" value={aws.user}
                        onChange={e => setAws(p => ({ ...p, user: e.target.value }))}
                        placeholder={awsService === 'redshift' ? 'awsuser' : 'admin'}
                        className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,153,0,0.25)' }} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Password</label>
                      <input type="password" value={aws.password}
                        onChange={e => setAws(p => ({ ...p, password: e.target.value }))}
                        placeholder="••••••••"
                        className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,153,0,0.25)' }} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Database Name</label>
                    <input type="text" value={aws.database}
                      onChange={e => setAws(p => ({ ...p, database: e.target.value }))}
                      placeholder="my_database"
                      className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,153,0,0.25)' }} />
                  </div>
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div>
                      <p className="text-xs font-semibold text-white">SSL / TLS</p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Required for all AWS RDS and Redshift instances</p>
                    </div>
                    <button onClick={() => setAws(p => ({ ...p, ssl: !p.ssl }))}
                      className="relative rounded-full transition-all flex-shrink-0"
                      style={{ width: '36px', height: '20px', background: aws.ssl ? '#FF9900' : 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer' }}>
                      <span className="absolute top-1 rounded-full bg-white transition-all"
                        style={{ width: '12px', height: '12px', left: aws.ssl ? '20px' : '4px' }} />
                    </button>
                  </div>
                </>
              )}

              {awsService === 's3' && (
                <>
                  <div>
                    <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>S3 Bucket Name</label>
                    <input type="text" value={aws.bucket}
                      onChange={e => setAws(p => ({ ...p, bucket: e.target.value }))}
                      placeholder="my-data-bucket"
                      className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,153,0,0.25)' }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Prefix / Folder (optional)</label>
                    <input type="text" value={aws.prefix}
                      onChange={e => setAws(p => ({ ...p, prefix: e.target.value }))}
                      placeholder="data/exports/ (leave empty for root)"
                      className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,153,0,0.25)' }} />
                  </div>
                </>
              )}

              {awsService === 'dynamodb' && (
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>DynamoDB Table Name</label>
                  <input type="text" value={aws.tableName}
                    onChange={e => setAws(p => ({ ...p, tableName: e.target.value }))}
                    placeholder="my-dynamo-table"
                    className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,153,0,0.25)' }} />
                </div>
              )}

              {awsService === 'cost-explorer' && (
                <>
                  <div className="rounded-xl p-3" style={{ background: 'rgba(255,153,0,0.06)', border: '1px solid rgba(255,153,0,0.2)' }}>
                    <p className="text-xs font-bold text-white mb-1">💰 AWS Cost Explorer</p>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      Pulls your AWS billing data into a CSV for analysis. Your IAM user needs the
                      <strong style={{ color: '#FF9900' }}> AWSBillingReadOnlyAccess</strong> or
                      <strong style={{ color: '#FF9900' }}> ce:GetCostAndUsage</strong> permission.
                      Cost Explorer must be enabled in your AWS account (Billing → Cost Explorer → Enable).
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Start Date</label>
                      <input
                        type="date"
                        value={awsCostStartDate}
                        onChange={e => setAwsCostStartDate(e.target.value)}
                        className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,153,0,0.25)', colorScheme: 'dark' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>End Date</label>
                      <input
                        type="date"
                        value={awsCostEndDate}
                        onChange={e => setAwsCostEndDate(e.target.value)}
                        className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,153,0,0.25)', colorScheme: 'dark' }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Granularity</label>
                      <div style={{ position: 'relative' }}>
                        <select
                          value={awsCostGranularity}
                          onChange={e => setAwsCostGranularity(e.target.value as 'DAILY' | 'MONTHLY')}
                          className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none appearance-none"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,153,0,0.25)', paddingRight: '28px', cursor: 'pointer' }}>
                          <option value="MONTHLY" style={{ background: '#0d0a1a' }}>Monthly</option>
                          <option value="DAILY" style={{ background: '#0d0a1a' }}>Daily</option>
                        </select>
                        <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                          <svg width="10" height="10" fill="none" stroke="rgba(255,153,0,0.7)" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Group By</label>
                      <div style={{ position: 'relative' }}>
                        <select
                          value={awsCostGroupBy}
                          onChange={e => setAwsCostGroupBy(e.target.value as 'SERVICE' | 'REGION' | 'USAGE_TYPE')}
                          className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none appearance-none"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,153,0,0.25)', paddingRight: '28px', cursor: 'pointer' }}>
                          <option value="SERVICE" style={{ background: '#0d0a1a' }}>Service (EC2, S3…)</option>
                          <option value="REGION" style={{ background: '#0d0a1a' }}>Region</option>
                          <option value="USAGE_TYPE" style={{ background: '#0d0a1a' }}>Usage Type</option>
                        </select>
                        <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                          <svg width="10" height="10" fill="none" stroke="rgba(255,153,0,0.7)" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Error */}
              {awsError && (
                <div className="rounded-xl px-4 py-3"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <p className="text-xs font-bold mb-1" style={{ color: '#f87171' }}>Connection failed</p>
                  <pre className="text-xs leading-relaxed whitespace-pre-wrap m-0"
                    style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{awsError}</pre>
                </div>
              )}

              {/* Success + table picker */}
              {awsStatus === 'ok' && !awsError && (
                <div className="space-y-3">
                  <div className="rounded-xl px-4 py-3"
                    style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}>
                    <p className="text-xs font-bold" style={{ color: '#4ade80' }}>✅ AWS connection healthy</p>
                  </div>
                  {awsTablesLoading && <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>⏳ Loading tables / objects…</p>}
                  {!awsTablesLoading && awsTables.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {awsService === 's3' ? 'CSV Files to Connect' : awsService === 'dynamodb' ? 'Tables to Connect' : awsService === 'cost-explorer' ? 'Cost Reports to Connect' : 'Tables to Connect'}
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{awsSelectedTables.size}/{awsTables.length} selected</span>
                          <button
                            onClick={() => {
                              if (awsSelectedTables.size === awsTables.length) setAwsSelectedTables(new Set())
                              else setAwsSelectedTables(new Set(awsTables))
                            }}
                            className="text-xs px-2 py-0.5 rounded-md font-semibold"
                            style={{ background: 'rgba(255,153,0,0.1)', border: '1px solid rgba(255,153,0,0.25)', color: '#FF9900' }}>
                            {awsSelectedTables.size === awsTables.length ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5 max-h-44 overflow-auto pr-1">
                        {awsTables.map((item, idx) => {
                          const checked = awsSelectedTables.has(item)
                          return (
                            <div key={`${item}-${idx}`}
                              onClick={() => { const next = new Set(awsSelectedTables); checked ? next.delete(item) : next.add(item); setAwsSelectedTables(next) }}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
                              style={{ background: checked ? 'rgba(255,153,0,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${checked ? 'rgba(255,153,0,0.35)' : 'rgba(255,255,255,0.07)'}` }}>
                              <div className="flex items-center justify-center rounded-md flex-shrink-0"
                                style={{ width: '16px', height: '16px', background: checked ? '#FF9900' : 'transparent', border: `2px solid ${checked ? '#FF9900' : 'rgba(255,255,255,0.25)'}` }}>
                                {checked && <svg width="9" height="9" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                              </div>
                              <span className="text-sm flex-1 font-medium font-mono" style={{ color: checked ? 'white' : 'rgba(255,255,255,0.55)', fontSize: '12px' }}>{item}</span>
                              {checked && <span className="text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ background: 'rgba(255,153,0,0.15)', color: '#FF9900' }}>✓</span>}
                            </div>
                          )
                        })}
                      </div>
                      {awsSelectedTables.size === 0 && (
                        <p className="text-xs mt-2 text-center" style={{ color: '#f87171' }}>Select at least one item to connect</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={async () => {
                    const required = awsService === 's3'
                      ? aws.accessKeyId && aws.secretAccessKey && aws.bucket
                      : awsService === 'dynamodb'
                      ? aws.accessKeyId && aws.secretAccessKey && aws.tableName
                      : awsService === 'cost-explorer'
                      ? aws.accessKeyId && aws.secretAccessKey && awsCostStartDate && awsCostEndDate
                      : aws.accessKeyId && aws.secretAccessKey && aws.host && aws.user && aws.database
                    if (!required) return
                    setAwsStatus('testing')
                    setAwsError('')
                    try {
                      const res = await fetch(`${API_BASE}/api/aws/health`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...aws, service: awsService, costStartDate: awsCostStartDate, costEndDate: awsCostEndDate, costGranularity: awsCostGranularity, costGroupBy: awsCostGroupBy }),
                      })
                      const data = await res.json()
                      if (data.healthy) {
                        setAwsStatus('ok')
                        setAwsTablesLoading(true)
                        try {
                          const tablesRes = await fetch(`${API_BASE}/api/aws/tables`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ...aws, service: awsService, costStartDate: awsCostStartDate, costEndDate: awsCostEndDate, costGranularity: awsCostGranularity, costGroupBy: awsCostGroupBy }),
                          })
                          const tablesData = await tablesRes.json()
                          if (tablesData.tables?.length > 0) {
                            setAwsTables(tablesData.tables)
                            setAwsSelectedTables(new Set(tablesData.tables))
                          }
                        } catch { setAwsTables([]) }
                        finally { setAwsTablesLoading(false) }
                      } else {
                        setAwsStatus('error')
                        setAwsError(data.message || 'Unknown error')
                      }
                    } catch {
                      setAwsStatus('error')
                      setAwsError('❌ Could not reach backend.\n   → Make sure the server is running on port 8000.')
                    }
                  }}
                  disabled={awsStatus === 'testing'}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                  style={{ background: 'rgba(255,153,0,0.15)', border: '1px solid rgba(255,153,0,0.35)', color: '#FF9900', cursor: awsStatus === 'testing' ? 'not-allowed' : 'pointer' }}>
                  {awsStatus === 'testing' ? '⏳ Testing…' : '🔍 Test Connection'}
                </button>

                <button
                  onClick={async () => {
                    if (awsStatus !== 'ok' || awsSelectedTables.size === 0) return
                    const addedAt = new Date().toLocaleString()
                    const itemsArr = [...awsSelectedTables]
                    const connName = awsService === 's3' ? `s3://${aws.bucket}` : awsService === 'dynamodb' ? `dynamodb.${aws.region}` : awsService === 'cost-explorer' ? `cost-explorer@${aws.region}` : `${aws.database}@${aws.host}`
                    const backendId = await saveConnectionToBackend(
                      connName,
                      'aws',
                      {
                        service: awsService, region: aws.region, host: aws.host,
                        port: aws.port || (awsService === 'rds-mysql' ? '3306' : awsService === 'redshift' ? '5439' : '5432'),
                        database: aws.database, ssl: aws.ssl, bucket: aws.bucket, prefix: aws.prefix,
                        tables: itemsArr,
                        costStartDate: awsCostStartDate, costEndDate: awsCostEndDate,
                        costGranularity: awsCostGranularity, costGroupBy: awsCostGroupBy,
                      },
                      { accessKeyId: aws.accessKeyId, secretAccessKey: aws.secretAccessKey, user: aws.user, password: aws.password },
                    )
                    if (!backendId) { setAwsError('Could not save the connection to the server. Make sure you are signed in and have permission.'); return }
                    const id = backendId
                    const connRecord = { name: connName, addedAt }
                    itemsArr.forEach((item, idx) => {
                      const srcName = awsService === 's3'
                        ? `s3://${aws.bucket}/${item}`
                        : awsService === 'dynamodb'
                        ? `${item}@dynamodb.${aws.region}`
                        : awsService === 'cost-explorer'
                        ? `cost-explorer:${item}@${aws.region}`
                        : `${aws.database}.${item}@${aws.host}`
                      addSource({ id: `${id}-${idx}`, name: srcName, type: 'aws' as any, addedAt, connectionId: backendId, table: item } as any)
                    })
                    addAuditLog({
                      id: crypto.randomUUID(), time: new Date().toLocaleString(),
                      action: 'add_source', entity_type: 'data_source', entity_id: id,
                      details: awsService === 'cost-explorer'
                        ? `Connected AWS Cost Explorer: ${awsCostStartDate} → ${awsCostEndDate} · ${awsCostGranularity} · grouped by ${awsCostGroupBy} · region: ${aws.region}`
                        : `Connected AWS ${awsService.toUpperCase()}: ${connRecord.name} (${awsSelectedTables.size} item(s)) · region: ${aws.region}`,
                      user: 'local_user',
                    })
                    setShowAWSFlow(false)
                    setAwsStatus('idle')
                    setAwsError('')
                    setAws({ region: 'us-east-1', accessKeyId: '', secretAccessKey: '', host: '', port: '', user: '', password: '', database: '', ssl: true, bucket: '', prefix: '', tableName: '' })
                    setAwsCostStartDate(() => { const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().slice(0, 10); })
                    setAwsCostEndDate(new Date().toISOString().slice(0, 10))
                    setAwsCostGranularity('MONTHLY')
                    setAwsCostGroupBy('SERVICE')
                    setAwsTables([])
                    setAwsSelectedTables(new Set())
                    setTab('existing')
                  }}
                  disabled={awsStatus !== 'ok' || awsSelectedTables.size === 0}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                  style={{ background: awsStatus === 'ok' ? 'linear-gradient(135deg, #FF9900, #e67e00)' : 'rgba(255,255,255,0.06)', border: 'none', cursor: awsStatus !== 'ok' ? 'not-allowed' : 'pointer' }}>
                  Add Source →
                </button>
              </div>
              <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Test must pass first · credentials stay in your browser only
              </p>
            </div>
          </div>
        </div>
      )}
      {showCostExplorerFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => { setShowCostExplorerFlow(false); setCostExplorerStatus('idle'); setCostExplorerError('') }}>
          <div className="rounded-2xl w-full max-w-lg overflow-hidden"
            style={{ background: '#0d0a1a', border: '1px solid rgba(255,153,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255,153,0,0.12)', border: '1px solid rgba(255,153,0,0.3)' }}>
                  <span style={{ fontSize: '18px' }}>💰</span>
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">AWS Cost Explorer</h3>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Fetch billing & cost data as a dataset</p>
                </div>
              </div>
              <button onClick={() => { setShowCostExplorerFlow(false); setCostExplorerStatus('idle'); setCostExplorerError('') }}
                style={{ color: 'rgba(255,255,255,0.35)', fontSize: '18px', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-xl p-3" style={{ background: 'rgba(255,153,0,0.06)', border: '1px solid rgba(255,153,0,0.2)' }}>
                <p className="text-xs font-bold text-white mb-1">🔑 IAM permissions required</p>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Your IAM user needs <strong style={{ color: '#FF9900' }}>ce:GetCostAndUsage</strong> permission. In AWS Console → IAM → attach a policy with that action on resource <code style={{ color: '#FF9900' }}>*</code>. Keys are saved in your browser only.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Access Key ID</label>
                  <input type="text" value={costExplorer.accessKeyId}
                    onChange={e => setCostExplorer(p => ({ ...p, accessKeyId: e.target.value }))}
                    placeholder="AKIAIOSFODNN7EXAMPLE"
                    className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,153,0,0.25)' }} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Secret Access Key</label>
                  <input type="password" value={costExplorer.secretAccessKey}
                    onChange={e => setCostExplorer(p => ({ ...p, secretAccessKey: e.target.value }))}
                    placeholder="••••••••••••••••••••"
                    className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,153,0,0.25)' }} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>AWS Region</label>
                <select value={costExplorer.region} onChange={e => setCostExplorer(p => ({ ...p, region: e.target.value }))}
                  className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,153,0,0.25)' }}>
                  {['us-east-1','us-east-2','us-west-1','us-west-2','eu-west-1','eu-central-1','ap-south-1','ap-southeast-1','ap-northeast-1'].map(r => (
                    <option key={r} value={r} style={{ background: '#0d0a1a' }}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Start Date</label>
                  <input type="date" value={costExplorer.startDate}
                    onChange={e => setCostExplorer(p => ({ ...p, startDate: e.target.value }))}
                    className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,153,0,0.25)', colorScheme: 'dark' }} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>End Date</label>
                  <input type="date" value={costExplorer.endDate}
                    onChange={e => setCostExplorer(p => ({ ...p, endDate: e.target.value }))}
                    className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,153,0,0.25)', colorScheme: 'dark' }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Granularity</label>
                  <select value={costExplorer.granularity} onChange={e => setCostExplorer(p => ({ ...p, granularity: e.target.value }))}
                    className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,153,0,0.25)' }}>
                    <option value="DAILY" style={{ background: '#0d0a1a' }}>Daily</option>
                    <option value="MONTHLY" style={{ background: '#0d0a1a' }}>Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Group By</label>
                  <select value={costExplorer.groupBy} onChange={e => setCostExplorer(p => ({ ...p, groupBy: e.target.value }))}
                    className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,153,0,0.25)' }}>
                    <option value="SERVICE" style={{ background: '#0d0a1a' }}>Service</option>
                    <option value="REGION" style={{ background: '#0d0a1a' }}>Region</option>
                    <option value="USAGE_TYPE" style={{ background: '#0d0a1a' }}>Usage Type</option>
                    <option value="LINKED_ACCOUNT" style={{ background: '#0d0a1a' }}>Linked Account</option>
                  </select>
                </div>
              </div>
              {costExplorerError && (
                <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <p className="text-xs font-bold mb-1" style={{ color: '#f87171' }}>Fetch failed</p>
                  <pre className="text-xs leading-relaxed whitespace-pre-wrap m-0" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{costExplorerError}</pre>
                </div>
              )}
              {costExplorerStatus === 'ok' && costExplorerData.length > 0 && (
                <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}>
                  <p className="text-xs font-bold" style={{ color: '#4ade80' }}>✅ {costExplorerData.length} rows fetched — ready to add as source</p>
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={async () => {
                    if (!costExplorer.accessKeyId || !costExplorer.secretAccessKey || !costExplorer.startDate || !costExplorer.endDate) return
                    setCostExplorerStatus('fetching')
                    setCostExplorerError('')
                    try {
                      const res = await fetch(`${API_BASE}/api/aws/cost-explorer`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(costExplorer),
                      })
                      const data = await res.json()
                      if (data.error) {
                        setCostExplorerStatus('error')
                        setCostExplorerError(data.error)
                      } else {
                        setCostExplorerStatus('ok')
                        setCostExplorerData(data.rows || [])
                      }
                    } catch (e) {
                      setCostExplorerStatus('error')
                      setCostExplorerError('❌ Could not reach backend.\n   → Make sure the server is running on port 8000.')
                    }
                  }}
                  disabled={!costExplorer.accessKeyId || !costExplorer.secretAccessKey || !costExplorer.startDate || !costExplorer.endDate || costExplorerStatus === 'fetching'}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                  style={{ background: 'rgba(255,153,0,0.15)', border: '1px solid rgba(255,153,0,0.35)', color: '#FF9900', cursor: 'pointer' }}>
                  {costExplorerStatus === 'fetching' ? '⏳ Fetching…' : '📊 Fetch Cost Data'}
                </button>
                <button
                  onClick={() => {
                    if (costExplorerStatus !== 'ok' || costExplorerData.length === 0) return
                    const id = crypto.randomUUID()
                    const sourceName = `cost-explorer-${costExplorer.startDate}-to-${costExplorer.endDate}`
                    const csvRows = [
                      Object.keys(costExplorerData[0]).join(','),
                      ...costExplorerData.map(row => Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
                    ].join('\n')
                    const blob = new Blob([csvRows], { type: 'text/csv' })
                    const file = new File([blob], `${sourceName}.csv`, { type: 'text/csv' })
                    addSource({ id, name: sourceName, type: 'csv' as const, file, addedAt: new Date().toLocaleString() })
                    switchActiveSource(file, sourceName)
                    addAuditLog({
                      id: crypto.randomUUID(), time: new Date().toLocaleString(),
                      action: 'add_source', entity_type: 'data_source', entity_id: id,
                      details: `Connected AWS Cost Explorer: ${sourceName} · ${costExplorerData.length} rows`,
                      user: 'local_user',
                    })
                    setShowCostExplorerFlow(false)
                    setCostExplorerStatus('idle')
                    setCostExplorerError('')
                    setCostExplorerData([])
                    setCostExplorer({ accessKeyId: '', secretAccessKey: '', region: 'us-east-1', startDate: '', endDate: '', granularity: 'MONTHLY', groupBy: 'SERVICE' })
                    setTab('existing')
                    navigate('/analysis')
                  }}
                  disabled={costExplorerStatus !== 'ok' || costExplorerData.length === 0}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                  style={{ background: costExplorerStatus === 'ok' ? 'linear-gradient(135deg, #FF9900, #e67e00)' : 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer' }}>
                  Add as Source →
                </button>
              </div>
              <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Cost data is converted to CSV and loaded locally · keys stay in your browser only
              </p>
            </div>
          </div>
        </div>
      )}
      {/* ── GCS Connection Modal ──────────────────────────────────────────── */}
      {showGCSFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => { setShowGCSFlow(false); setGcsStatus('idle'); setGcsError('') }}>
          <div className="rounded-2xl w-full max-w-md overflow-hidden"
            style={{ background: '#0d0a1a', border: '1px solid rgba(66,133,244,0.25)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(66,133,244,0.12)', border: '1px solid rgba(66,133,244,0.3)' }}>
                  <span style={{ fontSize: '18px' }}>🪣</span>
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Connect Cloud Storage</h3>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Service account key · never shared</p>
                </div>
              </div>
              <button onClick={() => { setShowGCSFlow(false); setGcsStatus('idle'); setGcsError('') }}
                style={{ color: 'rgba(255,255,255,0.35)', fontSize: '18px', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-xl p-3" style={{ background: 'rgba(66,133,244,0.06)', border: '1px solid rgba(66,133,244,0.2)' }}>
                <p className="text-xs font-bold text-white mb-1">🔑 Service Account JSON Key</p>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  GCP Console → IAM → Service Accounts → Create key (JSON). The account needs <strong style={{ color: '#4285F4' }}>Storage Object Viewer</strong> role. Key stays in your browser only.
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Project ID</label>
                <input type="text" value={gcs.project}
                  onChange={e => setGcs(p => ({ ...p, project: e.target.value }))}
                  placeholder="my-gcp-project"
                  className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(66,133,244,0.25)' }} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Bucket Name</label>
                <input type="text" value={gcs.bucket}
                  onChange={e => setGcs(p => ({ ...p, bucket: e.target.value }))}
                  placeholder="my-data-bucket"
                  className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(66,133,244,0.25)' }} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Prefix / Folder (optional)</label>
                <input type="text" value={gcs.prefix}
                  onChange={e => setGcs(p => ({ ...p, prefix: e.target.value }))}
                  placeholder="data/exports/ (leave empty for root)"
                  className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(66,133,244,0.25)' }} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Service Account Key JSON</label>
                <textarea value={gcs.keyJson}
                  onChange={e => setGcs(p => ({ ...p, keyJson: e.target.value }))}
                  placeholder='Paste the full JSON key here: {"type":"service_account","project_id":...}'
                  rows={4}
                  className="w-full text-xs text-white rounded-xl px-3 py-2.5 outline-none resize-none font-mono"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(66,133,244,0.25)' }} />
              </div>
              {gcsError && (
                <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <p className="text-xs font-bold mb-1" style={{ color: '#f87171' }}>Connection failed</p>
                  <pre className="text-xs whitespace-pre-wrap m-0" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{gcsError}</pre>
                </div>
              )}
              {gcsStatus === 'ok' && !gcsError && (
                <div className="space-y-3">
                  <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}>
                    <p className="text-xs font-bold" style={{ color: '#4ade80' }}>✅ GCS bucket reachable</p>
                  </div>
                  {gcsFilesLoading && <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>⏳ Loading CSV files…</p>}
                  {!gcsFilesLoading && gcsFiles.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>CSV Files to Connect</label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{gcsSelectedFiles.size}/{gcsFiles.length} selected</span>
                          <button onClick={() => { if (gcsSelectedFiles.size === gcsFiles.length) setGcsSelectedFiles(new Set()); else setGcsSelectedFiles(new Set(gcsFiles)) }}
                            className="text-xs px-2 py-0.5 rounded-md font-semibold"
                            style={{ background: 'rgba(66,133,244,0.1)', border: '1px solid rgba(66,133,244,0.25)', color: '#4285F4' }}>
                            {gcsSelectedFiles.size === gcsFiles.length ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5 max-h-44 overflow-auto pr-1">
                        {gcsFiles.map((f, idx) => {
                          const checked = gcsSelectedFiles.has(f)
                          return (
                            <div key={`${f}-${idx}`}
                              onClick={() => { const next = new Set(gcsSelectedFiles); checked ? next.delete(f) : next.add(f); setGcsSelectedFiles(next) }}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
                              style={{ background: checked ? 'rgba(66,133,244,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${checked ? 'rgba(66,133,244,0.35)' : 'rgba(255,255,255,0.07)'}` }}>
                              <div className="flex items-center justify-center rounded-md flex-shrink-0"
                                style={{ width: '16px', height: '16px', background: checked ? '#4285F4' : 'transparent', border: `2px solid ${checked ? '#4285F4' : 'rgba(255,255,255,0.25)'}` }}>
                                {checked && <svg width="9" height="9" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                              </div>
                              <span className="text-sm flex-1 font-medium font-mono" style={{ color: checked ? 'white' : 'rgba(255,255,255,0.55)', fontSize: '12px' }}>{f}</span>
                              {checked && <span className="text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ background: 'rgba(66,133,244,0.15)', color: '#4285F4' }}>✓</span>}
                            </div>
                          )
                        })}
                      </div>
                      {gcsSelectedFiles.size === 0 && <p className="text-xs mt-2 text-center" style={{ color: '#f87171' }}>Select at least one file to connect</p>}
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={async () => {
                    if (!gcs.project || !gcs.bucket || !gcs.keyJson) return
                    setGcsStatus('testing'); setGcsError('')
                    try {
                      const res = await fetch(`${API_BASE}/api/gcs/health`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ key_json: gcs.keyJson, project: gcs.project, bucket: gcs.bucket }),
                      })
                      const data = await res.json()
                      if (data.healthy) {
                        setGcsStatus('ok')
                        setGcsFilesLoading(true)
                        try {
                          const filesRes = await fetch(`${API_BASE}/api/gcs/list-files`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ key_json: gcs.keyJson, project: gcs.project, bucket: gcs.bucket, prefix: gcs.prefix }),
                          })
                          const filesData = await filesRes.json()
                          if (filesData.files?.length > 0) { setGcsFiles(filesData.files); setGcsSelectedFiles(new Set(filesData.files)) }
                        } catch { setGcsFiles([]) } finally { setGcsFilesLoading(false) }
                      } else { setGcsStatus('error'); setGcsError(data.message || 'Unknown error') }
                    } catch { setGcsStatus('error'); setGcsError('❌ Could not reach backend.\n   → Make sure the server is running on port 8000.') }
                  }}
                  disabled={!gcs.project || !gcs.bucket || !gcs.keyJson || gcsStatus === 'testing'}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                  style={{ background: 'rgba(66,133,244,0.15)', border: '1px solid rgba(66,133,244,0.35)', color: '#4285F4', cursor: 'pointer' }}>
                  {gcsStatus === 'testing' ? '⏳ Testing…' : '🔍 Test Connection'}
                </button>
                <button
                  onClick={async () => {
                    if (gcsStatus !== 'ok' || gcsSelectedFiles.size === 0) return
                    const addedAt = new Date().toLocaleString()
                    const filesArr = [...gcsSelectedFiles]
                    const backendId = await saveConnectionToBackend(
                      `gcs://${gcs.bucket}`,
                      'gcs',
                      { project: gcs.project, bucket: gcs.bucket, prefix: gcs.prefix, files: filesArr },
                      { key_json: gcs.keyJson },
                    )
                    if (!backendId) { setGcsError('Could not save the connection to the server. Make sure you are signed in and have permission.'); return }
                    const id = backendId
                    filesArr.forEach((f, idx) => {
                      addSource({ id: `${id}-${idx}`, name: `gcs://${gcs.bucket}/${f}`, type: 'gcs' as any, addedAt, connectionId: backendId, objectPath: f } as any)
                    })
                    addAuditLog({ id: crypto.randomUUID(), time: new Date().toLocaleString(), action: 'add_source', entity_type: 'data_source', entity_id: id, details: `Connected GCS: ${gcs.bucket} (${gcsSelectedFiles.size} file(s))`, user: 'local_user' })
                    setShowGCSFlow(false); setGcsStatus('idle'); setGcsError('')
                    setGcs({ keyJson: '', project: '', bucket: '', prefix: '' }); setGcsFiles([]); setGcsSelectedFiles(new Set()); setTab('existing')
                  }}
                  disabled={gcsStatus !== 'ok' || gcsSelectedFiles.size === 0}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                  style={{ background: gcsStatus === 'ok' ? 'linear-gradient(135deg, #4285F4, #1a73e8)' : 'rgba(255,255,255,0.06)', border: 'none', cursor: gcsStatus !== 'ok' ? 'not-allowed' : 'pointer' }}>
                  Add Source →
                </button>
              </div>
              <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Test must pass first · key stays in your browser only</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Cloud SQL Connection Modal ─────────────────────────────────────── */}
      {showCloudSQLFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => { setShowCloudSQLFlow(false); setCloudSQLStatus('idle'); setCloudSQLError('') }}>
          <div className="rounded-2xl w-full max-w-md overflow-hidden"
            style={{ background: '#0d0a1a', border: '1px solid rgba(52,168,83,0.25)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(52,168,83,0.12)', border: '1px solid rgba(52,168,83,0.3)' }}>
                  <span style={{ fontSize: '18px' }}>☁️</span>
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Connect Cloud SQL</h3>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>GCP managed PostgreSQL/MySQL</p>
                </div>
              </div>
              <button onClick={() => { setShowCloudSQLFlow(false); setCloudSQLStatus('idle'); setCloudSQLError('') }}
                style={{ color: 'rgba(255,255,255,0.35)', fontSize: '18px', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-xl p-3" style={{ background: 'rgba(52,168,83,0.06)', border: '1px solid rgba(52,168,83,0.2)' }}>
                <p className="text-xs font-bold text-white mb-1">🔌 Cloud SQL Connection</p>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Use the public IP of your Cloud SQL instance (enable it in GCP Console → Cloud SQL → Connections → Public IP). Add your IP to Authorized Networks. Credentials stay in browser only.
                </p>
              </div>
              <div className="flex gap-2">
                {(['postgres', 'mysql'] as const).map(t => (
                  <button key={t} onClick={() => setCloudSQL(p => ({ ...p, dbType: t, port: t === 'postgres' ? '5432' : '3306' }))}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: cloudSQL.dbType === t ? 'rgba(52,168,83,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${cloudSQL.dbType === t ? 'rgba(52,168,83,0.5)' : 'rgba(255,255,255,0.08)'}`, color: cloudSQL.dbType === t ? '#34A853' : 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                    {t === 'postgres' ? 'PostgreSQL' : 'MySQL'}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>GCP Project ID</label>
                <input type="text" value={cloudSQL.project}
                  onChange={e => setCloudSQL(p => ({ ...p, project: e.target.value }))}
                  placeholder="my-gcp-project"
                  className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(52,168,83,0.25)' }} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Host (Public IP)</label>
                  <input type="text" value={cloudSQL.instanceConnectionName}
                    onChange={e => setCloudSQL(p => ({ ...p, instanceConnectionName: e.target.value }))}
                    placeholder="34.x.x.x or instance IP"
                    className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(52,168,83,0.25)' }} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Port</label>
                  <input type="number" value={cloudSQL.port}
                    onChange={e => setCloudSQL(p => ({ ...p, port: e.target.value }))}
                    className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(52,168,83,0.25)' }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Username</label>
                  <input type="text" value={cloudSQL.user}
                    onChange={e => setCloudSQL(p => ({ ...p, user: e.target.value }))}
                    placeholder={cloudSQL.dbType === 'postgres' ? 'postgres' : 'root'}
                    className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(52,168,83,0.25)' }} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Password</label>
                  <input type="password" value={cloudSQL.password}
                    onChange={e => setCloudSQL(p => ({ ...p, password: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(52,168,83,0.25)' }} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Database Name</label>
                <input type="text" value={cloudSQL.database}
                  onChange={e => setCloudSQL(p => ({ ...p, database: e.target.value }))}
                  placeholder="my_database"
                  className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(52,168,83,0.25)' }} />
              </div>
              {cloudSQLError && (
                <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <p className="text-xs font-bold mb-1" style={{ color: '#f87171' }}>Connection failed</p>
                  <pre className="text-xs whitespace-pre-wrap m-0" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{cloudSQLError}</pre>
                </div>
              )}
              {cloudSQLStatus === 'ok' && !cloudSQLError && (
                <div className="space-y-3">
                  <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}>
                    <p className="text-xs font-bold" style={{ color: '#4ade80' }}>✅ Cloud SQL reachable</p>
                  </div>
                  {cloudSQLTablesLoading && <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>⏳ Loading tables…</p>}
                  {!cloudSQLTablesLoading && cloudSQLTables.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Tables to Connect</label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{cloudSQLSelectedTables.size}/{cloudSQLTables.length} selected</span>
                          <button onClick={() => { if (cloudSQLSelectedTables.size === cloudSQLTables.length) setCloudSQLSelectedTables(new Set()); else setCloudSQLSelectedTables(new Set(cloudSQLTables)) }}
                            className="text-xs px-2 py-0.5 rounded-md font-semibold"
                            style={{ background: 'rgba(52,168,83,0.1)', border: '1px solid rgba(52,168,83,0.25)', color: '#34A853' }}>
                            {cloudSQLSelectedTables.size === cloudSQLTables.length ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5 max-h-44 overflow-auto pr-1">
                        {cloudSQLTables.map((tbl, idx) => {
                          const checked = cloudSQLSelectedTables.has(tbl)
                          return (
                            <div key={`${tbl}-${idx}`}
                              onClick={() => { const next = new Set(cloudSQLSelectedTables); checked ? next.delete(tbl) : next.add(tbl); setCloudSQLSelectedTables(next) }}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
                              style={{ background: checked ? 'rgba(52,168,83,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${checked ? 'rgba(52,168,83,0.35)' : 'rgba(255,255,255,0.07)'}` }}>
                              <div className="flex items-center justify-center rounded-md flex-shrink-0"
                                style={{ width: '16px', height: '16px', background: checked ? '#34A853' : 'transparent', border: `2px solid ${checked ? '#34A853' : 'rgba(255,255,255,0.25)'}` }}>
                                {checked && <svg width="9" height="9" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                              </div>
                              <span className="text-sm flex-1 font-medium" style={{ color: checked ? 'white' : 'rgba(255,255,255,0.55)' }}>{tbl}</span>
                              {checked && <span className="text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ background: 'rgba(52,168,83,0.15)', color: '#34A853' }}>✓</span>}
                            </div>
                          )
                        })}
                      </div>
                      {cloudSQLSelectedTables.size === 0 && <p className="text-xs mt-2 text-center" style={{ color: '#f87171' }}>Select at least one table to connect</p>}
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={async () => {
                    if (!cloudSQL.instanceConnectionName || !cloudSQL.user || !cloudSQL.database) return
                    setCloudSQLStatus('testing'); setCloudSQLError('')
                    try {
                      const res = await fetch(`${API_BASE}/api/cloudsql/health`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(cloudSQL),
                      })
                      const data = await res.json()
                      if (data.healthy) {
                        setCloudSQLStatus('ok')
                        setCloudSQLTablesLoading(true)
                        try {
                          const tRes = await fetch(`${API_BASE}/api/cloudsql/tables`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(cloudSQL),
                          })
                          const tData = await tRes.json()
                          if (tData.tables?.length > 0) { setCloudSQLTables(tData.tables); setCloudSQLSelectedTables(new Set(tData.tables)) }
                        } catch { setCloudSQLTables([]) } finally { setCloudSQLTablesLoading(false) }
                      } else { setCloudSQLStatus('error'); setCloudSQLError(data.message || 'Unknown error') }
                    } catch { setCloudSQLStatus('error'); setCloudSQLError('❌ Could not reach backend.\n   → Make sure the server is running on port 8000.') }
                  }}
                  disabled={!cloudSQL.instanceConnectionName || !cloudSQL.user || !cloudSQL.database || cloudSQLStatus === 'testing'}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                  style={{ background: 'rgba(52,168,83,0.15)', border: '1px solid rgba(52,168,83,0.35)', color: '#34A853', cursor: 'pointer' }}>
                  {cloudSQLStatus === 'testing' ? '⏳ Testing…' : '🔍 Test Connection'}
                </button>
                <button
                  onClick={async () => {
                    if (cloudSQLStatus !== 'ok' || cloudSQLSelectedTables.size === 0) return
                    const addedAt = new Date().toLocaleString()
                    const tablesArr = [...cloudSQLSelectedTables]
                    const backendId = await saveConnectionToBackend(
                      `${cloudSQL.database}@cloudsql.${cloudSQL.project}`,
                      'cloudsql',
                      { project: cloudSQL.project, instanceConnectionName: cloudSQL.instanceConnectionName, port: cloudSQL.port, database: cloudSQL.database, dbType: cloudSQL.dbType, tables: tablesArr },
                      { user: cloudSQL.user, password: cloudSQL.password },
                    )
                    if (!backendId) { setCloudSQLError('Could not save the connection to the server. Make sure you are signed in and have permission.'); return }
                    const id = backendId
                    tablesArr.forEach((tbl, idx) => {
                      addSource({ id: `${id}-${idx}`, name: `${cloudSQL.database}.${tbl}@cloudsql.${cloudSQL.project}`, type: 'cloudsql' as any, addedAt, connectionId: backendId, table: tbl } as any)
                    })
                    addAuditLog({ id: crypto.randomUUID(), time: new Date().toLocaleString(), action: 'add_source', entity_type: 'data_source', entity_id: id, details: `Connected Cloud SQL: ${cloudSQL.database}@${cloudSQL.instanceConnectionName} (${cloudSQLSelectedTables.size} table(s))`, user: 'local_user' })
                    setShowCloudSQLFlow(false); setCloudSQLStatus('idle'); setCloudSQLError('')
                    setCloudSQL({ keyJson: '', project: '', instanceConnectionName: '', user: '', password: '', database: '', dbType: 'postgres', port: '5432' })
                    setCloudSQLTables([]); setCloudSQLSelectedTables(new Set()); setTab('existing')
                  }}
                  disabled={cloudSQLStatus !== 'ok' || cloudSQLSelectedTables.size === 0}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                  style={{ background: cloudSQLStatus === 'ok' ? 'linear-gradient(135deg, #34A853, #1e8e3e)' : 'rgba(255,255,255,0.06)', border: 'none', cursor: cloudSQLStatus !== 'ok' ? 'not-allowed' : 'pointer' }}>
                  Add Source →
                </button>
              </div>
              <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Test must pass first · credentials stay in your browser only</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Databricks Connection Modal ────────────────────────────────────── */}
      {showDatabricksFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => { setShowDatabricksFlow(false); setDatabricksStatus('idle'); setDatabricksError('') }}>
          <div className="rounded-2xl w-full max-w-md overflow-hidden"
            style={{ background: '#0d0a1a', border: '1px solid rgba(255,70,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255,70,0,0.12)', border: '1px solid rgba(255,70,0,0.3)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7v5l10 5 10-5V7L12 2z" fill="#FF4600" fillOpacity="0.7" stroke="#FF4600" strokeWidth="1.5"/>
                    <path d="M2 12v5l10 5 10-5v-5" stroke="#FF4600" strokeWidth="1.5" fill="none"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Connect Databricks</h3>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>SQL Warehouse · PAT token · never shared</p>
                </div>
              </div>
              <button onClick={() => { setShowDatabricksFlow(false); setDatabricksStatus('idle'); setDatabricksError('') }}
                style={{ color: 'rgba(255,255,255,0.35)', fontSize: '18px', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-xl p-3" style={{ background: 'rgba(255,70,0,0.06)', border: '1px solid rgba(255,70,0,0.2)' }}>
                <p className="text-xs font-bold text-white mb-1">🔑 Personal Access Token (PAT)</p>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  In Databricks → User Settings → Access Tokens → Generate token. Host is your workspace URL e.g. <strong style={{ color: '#FF4600' }}>adb-xxxx.azuredatabricks.net</strong>. HTTP path is in SQL Warehouses → your warehouse → Connection details. Token stays in your browser only.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Workspace Host</label>
                <input
                  type="text"
                  value={databricks.host}
                  onChange={e => setDatabricks(p => ({ ...p, host: e.target.value }))}
                  placeholder="adb-1234567890.azuredatabricks.net"
                  className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,70,0,0.25)' }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>HTTP Path</label>
                <input
                  type="text"
                  value={databricks.httpPath}
                  onChange={e => setDatabricks(p => ({ ...p, httpPath: e.target.value }))}
                  placeholder="/sql/1.0/warehouses/xxxxxxxxxx"
                  className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,70,0,0.25)' }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Personal Access Token</label>
                <input
                  type="password"
                  value={databricks.token}
                  onChange={e => setDatabricks(p => ({ ...p, token: e.target.value }))}
                  placeholder="dapi••••••••••••••••••••••••••••••••"
                  className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,70,0,0.25)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Catalog</label>
                  <input
                    type="text"
                    value={databricks.catalog}
                    onChange={e => setDatabricks(p => ({ ...p, catalog: e.target.value }))}
                    placeholder="hive_metastore"
                    className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,70,0,0.25)' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Schema / Database</label>
                  <input
                    type="text"
                    value={databricks.schema}
                    onChange={e => setDatabricks(p => ({ ...p, schema: e.target.value }))}
                    placeholder="default"
                    className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,70,0,0.25)' }}
                  />
                </div>
              </div>

              {databricksError && (
                <div className="rounded-xl px-4 py-3"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <p className="text-xs font-bold mb-1" style={{ color: '#f87171' }}>Connection failed</p>
                  <pre className="text-xs leading-relaxed whitespace-pre-wrap m-0"
                    style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{databricksError}</pre>
                </div>
              )}

              {databricksStatus === 'ok' && !databricksError && (
                <div className="space-y-3">
                  <div className="rounded-xl px-4 py-3"
                    style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}>
                    <p className="text-xs font-bold" style={{ color: '#4ade80' }}>✅ Health check passed — Databricks is reachable</p>
                  </div>
                  {databricksTablesLoading && (
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>⏳ Loading tables…</p>
                  )}
                  {!databricksTablesLoading && databricksTables.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Tables to Connect</label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{databricksSelectedTables.size}/{databricksTables.length} selected</span>
                          <button
                            onClick={() => {
                              if (databricksSelectedTables.size === databricksTables.length) setDatabricksSelectedTables(new Set())
                              else setDatabricksSelectedTables(new Set(databricksTables))
                            }}
                            className="text-xs px-2 py-0.5 rounded-md font-semibold"
                            style={{ background: 'rgba(255,70,0,0.1)', border: '1px solid rgba(255,70,0,0.25)', color: '#FF4600' }}>
                            {databricksSelectedTables.size === databricksTables.length ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5 max-h-44 overflow-auto pr-1">
                        {databricksTables.map((table, tableIdx) => {
                          const checked = databricksSelectedTables.has(table)
                          return (
                            <div key={`${table}-${tableIdx}`}
                              onClick={() => {
                                const next = new Set(databricksSelectedTables)
                                checked ? next.delete(table) : next.add(table)
                                setDatabricksSelectedTables(next)
                              }}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
                              style={{
                                background: checked ? 'rgba(255,70,0,0.1)' : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${checked ? 'rgba(255,70,0,0.35)' : 'rgba(255,255,255,0.07)'}`,
                              }}>
                              <div className="flex items-center justify-center rounded-md flex-shrink-0"
                                style={{
                                  width: '16px', height: '16px',
                                  background: checked ? '#FF4600' : 'transparent',
                                  border: `2px solid ${checked ? '#FF4600' : 'rgba(255,255,255,0.25)'}`,
                                }}>
                                {checked && (
                                  <svg width="9" height="9" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <polyline points="20 6 9 17 4 12"/>
                                  </svg>
                                )}
                              </div>
                              <svg width="13" height="13" fill="none" stroke={checked ? '#FF4600' : 'rgba(255,255,255,0.35)'} strokeWidth="2" viewBox="0 0 24 24">
                                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
                              </svg>
                              <span className="text-sm flex-1 font-medium" style={{ color: checked ? 'white' : 'rgba(255,255,255,0.55)' }}>
                                {table}
                              </span>
                              {checked && (
                                <span className="text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ background: 'rgba(255,70,0,0.15)', color: '#FF4600' }}>✓</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      {databricksSelectedTables.size === 0 && (
                        <p className="text-xs mt-2 text-center" style={{ color: '#f87171' }}>Select at least one table to connect</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={async () => {
                    if (!databricks.host || !databricks.httpPath || !databricks.token) return
                    setDatabricksStatus('testing')
                    setDatabricksError('')
                    try {
                      const res = await fetch(`${API_BASE}/api/databricks/health`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(databricks),
                      })
                      const data = await res.json()
                      if (data.healthy) {
                        setDatabricksStatus('ok')
                        setDatabricksTablesLoading(true)
                        try {
                          const tablesRes = await fetch(`${API_BASE}/api/databricks/tables`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(databricks),
                          })
                          const tablesData = await tablesRes.json()
                          if (tablesData.tables?.length > 0) {
                            setDatabricksTables(tablesData.tables)
                            setDatabricksSelectedTables(new Set(tablesData.tables))
                          }
                        } catch {
                          setDatabricksTables([])
                        } finally {
                          setDatabricksTablesLoading(false)
                        }
                      } else {
                        setDatabricksStatus('error')
                        setDatabricksError(data.message || 'Unknown error')
                      }
                    } catch {
                      setDatabricksStatus('error')
                      setDatabricksError('❌ Could not reach backend.\n   → Make sure the server is running on port 8000.')
                    }
                  }}
                  disabled={!databricks.host || !databricks.httpPath || !databricks.token || databricksStatus === 'testing'}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                  style={{
                    background: 'rgba(255,70,0,0.15)',
                    border: '1px solid rgba(255,70,0,0.35)',
                    color: '#FF4600',
                    cursor: (!databricks.host || !databricks.httpPath || !databricks.token || databricksStatus === 'testing') ? 'not-allowed' : 'pointer',
                  }}>
                  {databricksStatus === 'testing' ? '⏳ Testing…' : '🔍 Test Connection'}
                </button>

                <button
                                    onClick={async () => {
                    if (databricksStatus !== 'ok' || databricksSelectedTables.size === 0) return
                    const addedAt = new Date().toLocaleString()
                    const tablesArr = [...databricksSelectedTables]
                    const backendId = await saveConnectionToBackend(
                      `${databricks.catalog}.${databricks.schema}@${databricks.host}`,
                      'databricks',
                      { host: databricks.host, httpPath: databricks.httpPath, catalog: databricks.catalog, schema: databricks.schema, tables: tablesArr },
                      { token: databricks.token },
                    )
                    if (!backendId) { setDatabricksError('Could not save the connection to the server. Make sure you are signed in and have permission.'); return }
                    const id = backendId
                    tablesArr.forEach((tbl, idx) => {
                      addSource({
                        id: `${id}-${idx}`,
                        name: `${databricks.catalog}.${databricks.schema}.${tbl}@${databricks.host}`,
                        type: 'databricks' as any,
                        addedAt,
                        connectionId: backendId,
                        table: tbl,
                      } as any)
                    })
                    addAuditLog({
                      id: crypto.randomUUID(),
                      time: new Date().toLocaleString(),
                      action: 'add_source',
                      entity_type: 'data_source',
                      entity_id: id,
                      details: `Connected Databricks: ${databricks.catalog}.${databricks.schema}@${databricks.host} (${databricksSelectedTables.size} table(s))`,
                      user: 'local_user',
                    })
                    setShowDatabricksFlow(false)
                    setDatabricksStatus('idle')
                    setDatabricksError('')
                    setDatabricks({ host: '', httpPath: '', token: '', catalog: 'hive_metastore', schema: 'default' })
                    setDatabricksTables([])
                    setDatabricksSelectedTables(new Set())
                    setTab('existing')
                  }}
                  disabled={databricksStatus !== 'ok' || databricksSelectedTables.size === 0}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                  style={{
                    background: databricksStatus === 'ok' ? 'linear-gradient(135deg, #FF4600, #cc3800)' : 'rgba(255,255,255,0.06)',
                    border: 'none',
                    cursor: databricksStatus !== 'ok' ? 'not-allowed' : 'pointer',
                  }}>
                  Add Source →
                </button>
              </div>

              <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Test must pass first · token stays in your browser only
              </p>
            </div>
          </div>
        </div>
      )}
      {/* ── REST API Connection Modal ──────────────────────────────────────── */}
      {showRestApiFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => { setShowRestApiFlow(false); setRestStatus('idle'); setRestError('') }}>
          <div className="rounded-2xl w-full max-w-lg overflow-hidden"
            style={{ background: '#0d0a1a', border: '1px solid rgba(20,184,166,0.25)', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(20,184,166,0.12)', border: '1px solid rgba(20,184,166,0.3)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#14b8a6" strokeWidth="1.5"/>
                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="#14b8a6" strokeWidth="1.5" fill="none"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Connect REST API</h3>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Connect any REST API as a data source</p>
                </div>
              </div>
              <button onClick={() => { setShowRestApiFlow(false); setRestStatus('idle'); setRestError('') }}
                style={{ color: 'rgba(255,255,255,0.35)', fontSize: '18px', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-xl p-3" style={{ background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.2)' }}>
                <p className="text-xs font-bold text-white mb-1">🌐 REST API Connection</p>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Connect any REST API endpoint. Supports Bearer token, API key, or no auth. Credentials stay in your browser only.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Base URL</label>
                <input type="text" value={restApi.base_url}
                  onChange={e => setRestApi(p => ({ ...p, base_url: e.target.value }))}
                  placeholder="https://api.example.com"
                  className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(20,184,166,0.25)' }} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Auth Header</label>
                  <input type="text" value={restApi.auth_header}
                    onChange={e => setRestApi(p => ({ ...p, auth_header: e.target.value }))}
                    placeholder="Authorization"
                    className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(20,184,166,0.25)' }} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Auth Prefix</label>
                  <input type="text" value={restApi.auth_prefix}
                    onChange={e => setRestApi(p => ({ ...p, auth_prefix: e.target.value }))}
                    placeholder="Bearer"
                    className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(20,184,166,0.25)' }} />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>API Key / Token (optional)</label>
                <input type="password" value={restApi.api_key}
                  onChange={e => setRestApi(p => ({ ...p, api_key: e.target.value }))}
                  placeholder="••••••••••••••••"
                  className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(20,184,166,0.25)' }} />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Test Path (for health check)</label>
                <input type="text" value={restApi.test_path}
                  onChange={e => setRestApi(p => ({ ...p, test_path: e.target.value }))}
                  placeholder="/health or /api/v1/status"
                  className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(20,184,166,0.25)' }} />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Endpoints (one per line)
                </label>
                <textarea value={restApi.endpoints}
                  onChange={e => setRestApi(p => ({ ...p, endpoints: e.target.value }))}
                  placeholder={"/api/v1/users\n/api/v1/orders\n/api/v1/products"}
                  rows={4}
                  className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none resize-none font-mono"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(20,184,166,0.25)' }} />
              </div>

              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div>
                  <p className="text-xs font-semibold text-white">Verify SSL</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Disable for self-signed certificates</p>
                </div>
                <button onClick={() => setRestApi(p => ({ ...p, verify_ssl: !p.verify_ssl }))}
                  className="relative rounded-full transition-all flex-shrink-0"
                  style={{ width: '36px', height: '20px', background: restApi.verify_ssl ? '#14b8a6' : 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer' }}>
                  <span className="absolute top-1 rounded-full bg-white transition-all"
                    style={{ width: '12px', height: '12px', left: restApi.verify_ssl ? '20px' : '4px' }} />
                </button>
              </div>

              {restError && (
                <div className="rounded-xl px-4 py-3"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <p className="text-xs font-bold mb-1" style={{ color: '#f87171' }}>Connection failed</p>
                  <pre className="text-xs leading-relaxed whitespace-pre-wrap m-0"
                    style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{restError}</pre>
                </div>
              )}

              {restStatus === 'ok' && !restError && (
                <div className="space-y-3">
                  <div className="rounded-xl px-4 py-3"
                    style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}>
                    <p className="text-xs font-bold" style={{ color: '#4ade80' }}>✅ REST API reachable</p>
                  </div>
                  {restEndpointResults.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Endpoints to Connect</label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{restSelectedEndpoints.size}/{restEndpointResults.length} selected</span>
                          <button
                            onClick={() => {
                              const okEndpoints = restEndpointResults.filter(r => r.ok).map(r => r.endpoint)
                              if (restSelectedEndpoints.size === okEndpoints.length) setRestSelectedEndpoints(new Set())
                              else setRestSelectedEndpoints(new Set(okEndpoints))
                            }}
                            className="text-xs px-2 py-0.5 rounded-md font-semibold"
                            style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.25)', color: '#14b8a6' }}>
                            {restSelectedEndpoints.size === restEndpointResults.filter(r => r.ok).length ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5 max-h-44 overflow-auto pr-1">
                        {restEndpointResults.map((result, idx) => {
                          const checked = restSelectedEndpoints.has(result.endpoint)
                          return (
                            <div key={`${result.endpoint}-${idx}`}
                              onClick={() => {
                                if (!result.ok) return
                                const next = new Set(restSelectedEndpoints)
                                checked ? next.delete(result.endpoint) : next.add(result.endpoint)
                                setRestSelectedEndpoints(next)
                              }}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                              style={{
                                background: checked ? 'rgba(20,184,166,0.1)' : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${checked ? 'rgba(20,184,166,0.35)' : 'rgba(255,255,255,0.07)'}`,
                                cursor: result.ok ? 'pointer' : 'not-allowed',
                                opacity: result.ok ? 1 : 0.5,
                              }}>
                              <div className="flex items-center justify-center rounded-md flex-shrink-0"
                                style={{ width: '16px', height: '16px', background: checked ? '#14b8a6' : 'transparent', border: `2px solid ${checked ? '#14b8a6' : 'rgba(255,255,255,0.25)'}` }}>
                                {checked && <svg width="9" height="9" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                              </div>
                              <span className="text-sm flex-1 font-mono" style={{ color: checked ? 'white' : 'rgba(255,255,255,0.55)', fontSize: '12px' }}>{result.endpoint}</span>
                              <span className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                                style={{ background: result.ok ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: result.ok ? '#4ade80' : '#f87171' }}>
                                {result.ok ? `✓ ${result.status}` : `✗ ${result.status || 'err'}`}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                      {restSelectedEndpoints.size === 0 && (
                        <p className="text-xs mt-2 text-center" style={{ color: '#f87171' }}>Select at least one endpoint to connect</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={async () => {
                    if (!restApi.base_url) return
                    setRestStatus('testing')
                    setRestError('')
                    setRestEndpointResults([])
                    setRestSelectedEndpoints(new Set())
                    try {
                      const headers: Record<string, string> = {}
                      if (restApi.api_key) {
                        headers[restApi.auth_header] = `${restApi.auth_prefix} ${restApi.api_key}`.trim()
                      }
                      const healthRes = await fetch(`${API_BASE}/api/rest/health`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          base_url: restApi.base_url,
                          headers,
                          verify_ssl: restApi.verify_ssl,
                          test_path: restApi.test_path || '/',
                          timeout: restApi.timeout,
                        }),
                      })
                      const healthData = await healthRes.json()
                      if (healthData.healthy) {
                        setRestStatus('ok')
                        const endpointList = restApi.endpoints
                          .split('\n')
                          .map(e => e.trim())
                          .filter(Boolean)
                        if (endpointList.length > 0) {
                          const epRes = await fetch(`${API_BASE}/api/rest/endpoints`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              base_url: restApi.base_url,
                              headers,
                              verify_ssl: restApi.verify_ssl,
                              timeout: restApi.timeout,
                              endpoints: endpointList,
                            }),
                          })
                          const epData = await epRes.json()
                          if (epData.endpoints?.length > 0) {
                            setRestEndpointResults(epData.endpoints)
                            setRestSelectedEndpoints(new Set(epData.endpoints.filter((e: any) => e.ok).map((e: any) => e.endpoint)))
                          }
                        }
                      } else {
                        setRestStatus('error')
                        setRestError(healthData.message || 'Unknown error')
                      }
                    } catch {
                      setRestStatus('error')
                      setRestError('❌ Could not reach backend.\n   → Make sure the server is running on port 8000.')
                    }
                  }}
                  disabled={!restApi.base_url || restStatus === 'testing'}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                  style={{ background: 'rgba(20,184,166,0.15)', border: '1px solid rgba(20,184,166,0.35)', color: '#14b8a6', cursor: (!restApi.base_url || restStatus === 'testing') ? 'not-allowed' : 'pointer' }}>
                  {restStatus === 'testing' ? '⏳ Testing…' : '🔍 Test Connection'}
                </button>

                <button
                                    onClick={async () => {
                    if (restStatus !== 'ok' || restSelectedEndpoints.size === 0) return
                    const addedAt = new Date().toLocaleString()
                    const endpointsArr = [...restSelectedEndpoints]
                    const headers: Record<string, string> = {}
                    if (restApi.api_key) {
                      headers[restApi.auth_header] = `${restApi.auth_prefix} ${restApi.api_key}`.trim()
                    }
                    const hostName = restApi.base_url.replace(/https?:\/\//, '')
                    const backendId = await saveConnectionToBackend(
                      hostName,
                      'rest',
                      { base_url: restApi.base_url, endpoints: endpointsArr, verify_ssl: restApi.verify_ssl, test_path: restApi.test_path, timeout: restApi.timeout },
                      { headers },
                    )
                    if (!backendId) { setRestError('Could not save the connection to the server. Make sure you are signed in and have permission.'); return }
                    const id = backendId
                    endpointsArr.forEach((ep, idx) => {
                      addSource({
                        id: `${id}-${idx}`,
                        name: `rest:${hostName}${ep}`,
                        type: 'rest' as any,
                        addedAt,
                        connectionId: backendId,
                        endpoint: ep,
                      } as any)
                    })
                    addAuditLog({
                      id: crypto.randomUUID(),
                      time: new Date().toLocaleString(),
                      action: 'add_source',
                      entity_type: 'data_source',
                      entity_id: id,
                      details: `Connected REST API: ${restApi.base_url} (${restSelectedEndpoints.size} endpoint(s))`,
                      user: 'local_user',
                    })
                    setShowRestApiFlow(false)
                    setRestStatus('idle')
                    setRestError('')
                    setRestApi({ base_url: '', api_key: '', auth_header: 'Authorization', auth_prefix: 'Bearer', endpoints: '', test_path: '/', verify_ssl: true, timeout: 10, data_path: '', method: 'GET' })
                    setRestEndpointResults([])
                    setRestSelectedEndpoints(new Set())
                    setTab('existing')
                  }}
                  disabled={restStatus !== 'ok' || restSelectedEndpoints.size === 0}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                  style={{ background: restStatus === 'ok' ? 'linear-gradient(135deg, #14b8a6, #0d9488)' : 'rgba(255,255,255,0.06)', border: 'none', cursor: restStatus !== 'ok' ? 'not-allowed' : 'pointer' }}>
                  Add Source →
                </button>
              </div>
              <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Test must pass first · credentials stay in your browser only
              </p>
            </div>
          </div>
        </div>
      )}
      {/* ── GA4 Connection Modal ──────────────────────────────────────────── */}
      {showGA4Flow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => { setShowGA4Flow(false); setGa4Status('idle'); setGa4Error('') }}>
          <div className="rounded-2xl w-full max-w-md overflow-hidden"
            style={{ background: '#0d0a1a', border: '1px solid rgba(251,146,60,0.25)', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.3)' }}>
                  <span style={{ fontSize: '18px' }}>📈</span>
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Connect Google Analytics 4</h3>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Service account key · read-only</p>
                </div>
              </div>
              <button onClick={() => { setShowGA4Flow(false); setGa4Status('idle'); setGa4Error('') }}
                style={{ color: 'rgba(255,255,255,0.35)', fontSize: '18px', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-xl p-3" style={{ background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.2)' }}>
                <p className="text-xs font-bold text-white mb-1">🔑 Setup Instructions</p>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  1. GCP Console → IAM → Service Accounts → Create key (JSON)<br/>
                  2. In GA4: Admin → Property Access Management → Add user (service account email) with Viewer role<br/>
                  3. Find your Property ID in GA4: Admin → Property Settings (format: 123456789)<br/>
                  Key stays in your browser only — never shared. Date ranges are selected during analysis.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>GA4 Property ID</label>
                <input type="text" value={ga4.propertyId}
                  onChange={e => setGa4(p => ({ ...p, propertyId: e.target.value }))}
                  placeholder="123456789"
                  className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(251,146,60,0.25)' }} />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Service Account Key JSON</label>
                <textarea value={ga4.keyJson}
                  onChange={e => setGa4(p => ({ ...p, keyJson: e.target.value }))}
                  placeholder='Paste the full JSON key here: {"type":"service_account","project_id":...}'
                  rows={4}
                  className="w-full text-xs text-white rounded-xl px-3 py-2.5 outline-none resize-none font-mono"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(251,146,60,0.25)' }} />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Metrics (comma-separated)</label>
                <input type="text" value={ga4.metrics}
                  onChange={e => setGa4(p => ({ ...p, metrics: e.target.value }))}
                  placeholder="sessions,activeUsers,newUsers,screenPageViews"
                  className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(251,146,60,0.25)' }} />
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Common: sessions, activeUsers, newUsers, screenPageViews, bounceRate, averageSessionDuration, conversions</p>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Dimensions (comma-separated)</label>
                <input type="text" value={ga4.dimensions}
                  onChange={e => setGa4(p => ({ ...p, dimensions: e.target.value }))}
                  placeholder="date,sessionDefaultChannelGroup"
                  className="w-full text-sm text-white rounded-xl px-3 py-2.5 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(251,146,60,0.25)' }} />
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Common: date, country, city, deviceCategory, sessionDefaultChannelGroup, pagePath, browser</p>
              </div>

              {ga4Error && (
                <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <p className="text-xs font-bold mb-1" style={{ color: '#f87171' }}>Connection failed</p>
                  <pre className="text-xs leading-relaxed whitespace-pre-wrap m-0" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{ga4Error}</pre>
                </div>
              )}

              {ga4Status === 'ok' && !ga4Error && (
                <div className="space-y-3">
                  <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}>
                    <p className="text-xs font-bold" style={{ color: '#4ade80' }}>✅ GA4 property reachable</p>
                  </div>
                  {ga4ReportsLoading && <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>⏳ Building report list…</p>}
                  {!ga4ReportsLoading && ga4Reports.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Reports to Connect</label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{ga4SelectedReports.size}/{ga4Reports.length} selected</span>
                          <button
                            onClick={() => { if (ga4SelectedReports.size === ga4Reports.length) setGa4SelectedReports(new Set()); else setGa4SelectedReports(new Set(ga4Reports)) }}
                            className="text-xs px-2 py-0.5 rounded-md font-semibold"
                            style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.25)', color: '#fb923c' }}>
                            {ga4SelectedReports.size === ga4Reports.length ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5 max-h-44 overflow-auto pr-1">
                        {ga4Reports.map((report, idx) => {
                          const checked = ga4SelectedReports.has(report)
                          return (
                            <div key={`${report}-${idx}`}
                              onClick={() => { const next = new Set(ga4SelectedReports); checked ? next.delete(report) : next.add(report); setGa4SelectedReports(next) }}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
                              style={{ background: checked ? 'rgba(251,146,60,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${checked ? 'rgba(251,146,60,0.35)' : 'rgba(255,255,255,0.07)'}` }}>
                              <div className="flex items-center justify-center rounded-md flex-shrink-0"
                                style={{ width: '16px', height: '16px', background: checked ? '#fb923c' : 'transparent', border: `2px solid ${checked ? '#fb923c' : 'rgba(255,255,255,0.25)'}` }}>
                                {checked && <svg width="9" height="9" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                              </div>
                              <span className="text-sm flex-1 font-medium" style={{ color: checked ? 'white' : 'rgba(255,255,255,0.55)' }}>{report}</span>
                              {checked && <span className="text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ background: 'rgba(251,146,60,0.15)', color: '#fb923c' }}>✓</span>}
                            </div>
                          )
                        })}
                      </div>
                      {ga4SelectedReports.size === 0 && <p className="text-xs mt-2 text-center" style={{ color: '#f87171' }}>Select at least one report to connect</p>}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={async () => {
                    if (!ga4.propertyId || !ga4.keyJson) return
                    setGa4Status('testing'); setGa4Error('')
                    try {
                      const res = await fetch(`${API_BASE}/api/ga4/health`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ key_json: ga4.keyJson, property_id: ga4.propertyId }),
                      })
                      const data = await res.json()
                      if (data.healthy) {
                        setGa4Status('ok')
                        setGa4ReportsLoading(true)
                        // Build report name from metrics+dimensions config
                        const reportName = `${ga4.metrics.split(',')[0]}_by_${ga4.dimensions.split(',')[0]}_${ga4.startDate}_${ga4.endDate}`.replace(/[^a-zA-Z0-9_]/g, '_')
                        setGa4Reports([reportName])
                        setGa4SelectedReports(new Set([reportName]))
                        setGa4ReportsLoading(false)
                      } else {
                        setGa4Status('error'); setGa4Error(data.message || 'Unknown error')
                      }
                    } catch {
                      setGa4Status('error'); setGa4Error('❌ Could not reach backend.\n   → Make sure the server is running on port 8000.')
                    }
                  }}
                  disabled={!ga4.propertyId || !ga4.keyJson || ga4Status === 'testing'}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                  style={{ background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.35)', color: '#fb923c', cursor: 'pointer' }}>
                  {ga4Status === 'testing' ? '⏳ Testing…' : '🔍 Test Connection'}
                </button>

                <button
                                    onClick={async () => {
                    if (ga4Status !== 'ok' || ga4SelectedReports.size === 0) return
                    const addedAt = new Date().toLocaleString()
                    const reportsArr = [...ga4SelectedReports]
                    const backendId = await saveConnectionToBackend(
                      `ga4:${ga4.propertyId}`,
                      'ga4',
                      { property_id: ga4.propertyId, metrics: ga4.metrics, dimensions: ga4.dimensions, start_date: '365daysAgo', end_date: 'today', reports: reportsArr },
                      { key_json: ga4.keyJson },
                    )
                    if (!backendId) { setGa4Error('Could not save the connection to the server. Make sure you are signed in and have permission.'); return }
                    const id = backendId
                    reportsArr.forEach((report, idx) => {
                      addSource({
                        id: `${id}-${idx}`,
                        name: `ga4:${ga4.propertyId}/${report}`,
                        type: 'ga4' as any,
                        addedAt,
                        connectionId: backendId,
                        report,
                      } as any)
                    })
                    addAuditLog({
                      id: crypto.randomUUID(), time: new Date().toLocaleString(),
                      action: 'add_source', entity_type: 'data_source', entity_id: id,
                      details: `Connected GA4 Property: ${ga4.propertyId} (${ga4SelectedReports.size} report(s))`,
                      user: 'local_user',
                    })
                    setShowGA4Flow(false); setGa4Status('idle'); setGa4Error('')
                    setGa4({ keyJson: '', propertyId: '', metrics: 'sessions,activeUsers,newUsers,screenPageViews,bounceRate,averageSessionDuration', dimensions: 'date,sessionDefaultChannelGroup', startDate: '365daysAgo', endDate: 'today' })
                    setGa4Reports([]); setGa4SelectedReports(new Set()); setTab('existing')
                  }}
                  disabled={ga4Status !== 'ok' || ga4SelectedReports.size === 0}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                  style={{ background: ga4Status === 'ok' ? 'linear-gradient(135deg, #fb923c, #ea580c)' : 'rgba(255,255,255,0.06)', border: 'none', cursor: ga4Status !== 'ok' ? 'not-allowed' : 'pointer' }}>
                  Add Source →
                </button>
              </div>
              <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Read-only · key stays in your browser only</p>
            </div>
          </div>
        </div>
      )}

      </div>
    )
  }
