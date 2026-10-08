  import { useState, useEffect } from 'react'
  import { useNavigate } from 'react-router-dom'
  import { useStore, sourceKeyOf } from '../store'
  import { API_BASE } from '../config'
import { usePermissions } from '../usePermissions'

  // ── DATA DICTIONARY ─────────────────────────────────────────────────────────
  // Full 17-column dictionary. Adjust column names/types/definitions to match
  // your real CSV schema.
  const DATA_DICTIONARY = [
    { name: 'id',              type: 'Integer', definition: 'Unique identifier for each record in the dataset.' },
    { name: 'name',            type: 'String',  definition: 'Full legal name of the entity or individual.' },
    { name: 'email',           type: 'String',  definition: 'Primary contact email address.' },
    { name: 'phone',           type: 'String',  definition: 'Contact phone number including country code.' },
    { name: 'department',      type: 'String',  definition: 'Organisational department the record belongs to.' },
    { name: 'region',          type: 'String',  definition: 'Geographical region or territory.' },
    { name: 'scheme_id',       type: 'String',  definition: 'MyGov scheme reference identifier.' },
    { name: 'amount',          type: 'Float',   definition: 'Monetary value in INR associated with the record.' },
    { name: 'status',          type: 'String',  definition: 'Current processing status (e.g. Approved, Pending).' },
    { name: 'category',        type: 'String',  definition: 'Classification category for downstream analytics.' },
    { name: 'created_at',      type: 'Date',    definition: 'Timestamp when the record was first created.' },
    { name: 'updated_at',      type: 'Date',    definition: 'Timestamp of the most recent modification.' },
    { name: 'fiscal_year',     type: 'Integer', definition: 'Financial year the record is attributed to.' },
    { name: 'verified',        type: 'Boolean', definition: 'Whether the record has passed identity verification.' },
    { name: 'source_system',   type: 'String',  definition: 'Originating upstream system (e.g. PFMS, NIC Portal).' },
    { name: 'notes',           type: 'String',  definition: 'Free-text field for additional remarks or flags.' },
    { name: 'hash',            type: 'String',  definition: 'SHA-256 hash of PII fields for deduplication.' },
  ]

  // ── TAG DEFINITIONS ──────────────────────────────────────────────────────────
  const TAG_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    Sensitive:   { bg: 'rgba(239,68,68,0.12)',   text: '#f87171', border: 'rgba(239,68,68,0.25)'   },
    Restricted:  { bg: 'rgba(239,68,68,0.08)',   text: '#fca5a5', border: 'rgba(239,68,68,0.2)'    },
    MyGov:       { bg: 'rgba(59,130,246,0.12)',  text: '#60a5fa', border: 'rgba(59,130,246,0.25)'  },
    Finance:     { bg: 'rgba(234,179,8,0.12)',   text: '#fbbf24', border: 'rgba(234,179,8,0.25)'   },
    Public:      { bg: 'rgba(34,197,94,0.12)',   text: '#4ade80', border: 'rgba(34,197,94,0.25)'   },
    Internal:    { bg: 'rgba(124,58,237,0.12)',  text: '#a78bfa', border: 'rgba(124,58,237,0.25)'  },
    PII:         { bg: 'rgba(239,68,68,0.15)',   text: '#f87171', border: 'rgba(239,68,68,0.3)'    },
    Verified:    { bg: 'rgba(34,197,94,0.1)',    text: '#86efac', border: 'rgba(34,197,94,0.2)'    },
    Raw:         { bg: 'rgba(255,255,255,0.05)', text: 'rgba(255,255,255,0.45)', border: 'rgba(255,255,255,0.1)' },
  }

  // Default tags applied to every source. In a real app these could be per-source.
  const DEFAULT_TAGS = ['Sensitive', 'MyGov', 'Finance', 'Internal']

  function CatalogIcon({ name, size = 18, color = '#a78bfa' }: { name: string; size?: number; color?: string }) {
    const paths: Record<string, JSX.Element> = {
      folder: <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />,
      inbox: <><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></>,
      search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></>,
      check: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>,
      alert: <><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
      lightbulb: <><path d="M9 18h6M10 22h4M15.09 14c.18-.98.65-1.74 1.41-2.5A6 6 0 1 0 6.5 9.5c0 2.5 1.5 3.5 2 4.5" /></>,
    }
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {paths[name]}
      </svg>
    )
  }

  // ── DESCRIPTION GENERATOR ────────────────────────────────────────────────────
  // In production this would come from the source metadata / user input.
  function getDescription(name: string): string {
    return `This dataset contains transactional and identity records ingested from the ${name.replace(/\.(csv|xlsx?)$/i, '')} upstream system. It is used for financial reconciliation, scheme disbursement tracking, and compliance reporting across regional offices.`
  }

  export default function DataCatalog() {
    const navigate = useNavigate()
    const { can } = usePermissions()  
    const { sources, activeSourceName, analysis, setActiveSourceName, addAuditLog } = useStore()

    // ── STATE ────────────────────────────────────────────────────────────────
    const [searchQuery, setSearchQuery]         = useState('')
    const [ownerFilter, setOwnerFilter]         = useState('')
    const [dateFilter, setDateFilter]           = useState('')
    const [dictionaryOpen, setDictionaryOpen]   = useState(false)
    const [dictionarySource, setDictionarySource] = useState<string | null>(null)

    // ── Catalog metadata (backend-persisted overlay) ──────────────────────
    const [catalogMap, setCatalogMap] = useState<Record<string, any>>({})
    const [editingDescKey, setEditingDescKey] = useState<string | null>(null)
    const [descDraft, setDescDraft] = useState('')
    const [tagDraft, setTagDraft] = useState<Record<string, string>>({})
    const [editingOwnerKey, setEditingOwnerKey] = useState<string | null>(null)
    const [ownerDraft, setOwnerDraft] = useState('')
    const [orgMembers, setOrgMembers] = useState<{ userId: string; roleKey: string }[]>([])

    const authHeaders = (): Record<string, string> => {
      const token = localStorage.getItem('datapro_token') || ''
      return token ? { Authorization: `Bearer ${token}` } : {}
    }

    const catalogKeyFor = (source: any) => sourceKeyOf(source)

    useEffect(() => {
      const loadCatalog = async () => {
        try {
          const res = await fetch(`${API_BASE}/api/catalog`, {
            credentials: 'include',
            headers: authHeaders(),
          })
          if (!res.ok) return
          const rows = await res.json()
          if (!Array.isArray(rows)) return
          const map: Record<string, any> = {}
          rows.forEach((r: any) => { map[r.sourceKey] = r })
          setCatalogMap(map)
        } catch {
          // Not authenticated or backend unreachable — cards fall back to
          // the templated description/default tags below; harmless.
        }
      }
      loadCatalog()
    }, [])

    useEffect(() => {
      const loadOrgMembers = async () => {
        try {
          const res = await fetch(`${API_BASE}/api/org/members`, {
            credentials: 'include',
            headers: authHeaders(),
          })
          if (!res.ok) return
          const rows = await res.json()
          if (Array.isArray(rows)) setOrgMembers(rows.map((r: any) => ({ userId: r.userId, roleKey: r.roleKey })))
        } catch {
          // Not authenticated or backend unreachable — owner dropdown falls
          // back to "Unassigned only"; harmless.
        }
      }
      loadOrgMembers()
    }, [])

    const saveCatalogField = async (source: any, field: 'description' | 'tags' | 'owner', value: any) => {
      const key = catalogKeyFor(source)
      setCatalogMap(prev => ({
        ...prev,
        [key]: { ...(prev[key] || { sourceKey: key, sourceName: source.name, colInfo: [], columnOverrides: {} }), [field]: value },
      }))
      try {
        await fetch(`${API_BASE}/api/catalog`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({
            source_name: source.name,
            connection_id: source.connectionId || '',
            [field]: value,
          }),
        })
      } catch {
        // Best-effort — local state already reflects the edit for this session.
      }
    }

    const saveColumnDefinition = async (source: any, columnName: string, definition: string) => {
      const key = catalogKeyFor(source)
      setCatalogMap(prev => {
        const existing = prev[key] || { sourceKey: key, sourceName: source.name, colInfo: [], columnOverrides: {} }
        return {
          ...prev,
          [key]: {
            ...existing,
            columnOverrides: { ...(existing.columnOverrides || {}), [columnName]: { ...(existing.columnOverrides?.[columnName] || {}), definition } },
          },
        }
      })
      try {
        await fetch(`${API_BASE}/api/catalog`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({
            source_name: source.name,
            connection_id: source.connectionId || '',
            column_overrides: { [columnName]: { definition } },
          }),
        })
      } catch {
        // Best-effort.
      }
    }

    
    const saveColumnPII = async (source: any, columnName: string, isPii: boolean) => {
      const key = catalogKeyFor(source)
      setCatalogMap(prev => {
        const existing = prev[key] || { sourceKey: key, sourceName: source.name, colInfo: [], columnOverrides: {} }
        return {
          ...prev,
          [key]: {
            ...existing,
            columnOverrides: { ...(existing.columnOverrides || {}), [columnName]: { ...(existing.columnOverrides?.[columnName] || {}), pii: isPii } },
          },
        }
      })
      try {
        await fetch(`${API_BASE}/api/catalog`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({
            source_name: source.name,
            connection_id: source.connectionId || '',
            column_overrides: { [columnName]: { pii: isPii } },
          }),
        })
      } catch {
        // Best-effort.
      }
    }

    // ── SEARCH / FILTER LOGIC ────────────────────────────────────────────────
    const filteredSources = sources.filter(source => {
      const q = searchQuery.toLowerCase()
      const catalogEntry = catalogMap[catalogKeyFor(source)]
      const desc = (catalogEntry?.description || getDescription(source.name)).toLowerCase()
      const tags = (catalogEntry?.tags?.length ? catalogEntry.tags : DEFAULT_TAGS).map((t: string) => t.toLowerCase())
      const owner = (catalogEntry?.owner || 'local user').toLowerCase()

      const matchesSearch = !q ||
        source.name.toLowerCase().includes(q) ||
        desc.includes(q) ||
        tags.some(t => t.includes(q)) ||
        owner.includes(q)

      const matchesOwner = !ownerFilter || owner.includes(ownerFilter.toLowerCase())
      const matchesDate  = !dateFilter  || source.addedAt.includes(dateFilter)

      return matchesSearch && matchesOwner && matchesDate
    })

    // ── HANDLERS ─────────────────────────────────────────────────────────────
    const handleAnalyze = (source: any) => {
      setActiveSourceName(source.name)
      addAuditLog({
        id: crypto.randomUUID(),
        time: new Date().toLocaleString(),
        action: 'open_from_catalog',
        entity_type: 'data_source',
        entity_id: source.id,
        details: `Opened source from catalog: ${source.name}`,
        user: 'local_user'
      })
      navigate('/analysis')
    }

    const openDictionary = (sourceName: string) => {
      setDictionarySource(sourceName)
      setDictionaryOpen(true)
    }

    // ── RENDER ────────────────────────────────────────────────────────────────
    return (
      <div className="p-8 max-w-6xl mx-auto">

        {/* ── HEADER ── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)' }}>
              <CatalogIcon name="folder" size={16} />
            </div>
            <h1 className="text-3xl font-bold text-white">Data Catalog</h1>
          </div>
          <p className="text-white/40">Browse, search, and manage your connected enterprise metadata and schemas.</p>
        </div>

        {/* ── SEARCH + FILTERS ── */}
        {sources.length > 0 && (
          <div className="mb-6 flex flex-col sm:flex-row gap-3">
            {/* Main search bar — searches name, description, tags, owner */}
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" width="15" height="15" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Search by name, description, tag, or owner…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-white/30 outline-none transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>

            {/* Filter by data owner */}
            <input
              type="text"
              placeholder="Filter by owner…"
              value={ownerFilter}
              onChange={e => setOwnerFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/30 outline-none transition-colors w-44"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
            />

            {/* Filter by last-updated date (partial match) */}
            <input
              type="text"
              placeholder="Filter by date…"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/30 outline-none transition-colors w-40"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
            />

            {(searchQuery || ownerFilter || dateFilter) && (
              <button
                onClick={() => { setSearchQuery(''); setOwnerFilter(''); setDateFilter('') }}
                className="px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                Clear
              </button>
            )}
          </div>
        )}

        {/* ── EMPTY CATALOG ── */}
        {sources.length === 0 ? (
          <div className="text-center py-20 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}>
            <div className="flex justify-center mb-4"><CatalogIcon name="inbox" size={40} color="rgba(255,255,255,0.25)" /></div>
            <p className="text-white font-medium mb-1">Your catalog is empty</p>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Connect a data source first to generate metadata.
            </p>
            <button onClick={() => navigate('/sources')} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all" style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}>
              Go to Data Sources →
            </button>
          </div>

        ) : filteredSources.length === 0 ? (
          /* ── NO RESULTS ── */
          <div className="text-center py-20 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}>
            <div className="flex justify-center mb-4"><CatalogIcon name="search" size={40} color="rgba(255,255,255,0.25)" /></div>
            <p className="text-white font-medium mb-1">No results match your search</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Try a different keyword, owner, or date.
            </p>
          </div>

        ) : (
          /* ── SOURCE CARDS ── */
          <div className="grid gap-4">
            {filteredSources.map(source => {
              const isAnalyzed = activeSourceName === source.name && analysis !== null
              const catalogKey = catalogKeyFor(source)
              const catalogEntry = catalogMap[catalogKey]
              const rows = isAnalyzed ? analysis.dataset_info?.rows : (catalogEntry?.rows ?? null)
              const cols = isAnalyzed ? analysis.dataset_info?.columns : null
              const description = catalogEntry?.description || getDescription(source.name)
              const tags: string[] = catalogEntry?.tags?.length ? catalogEntry.tags : DEFAULT_TAGS
              const isEditingDesc = editingDescKey === catalogKey

              return (
                <div key={source.id} className="bg-[#110e1b] border border-white/5 p-6 rounded-2xl hover:border-purple-500/30 transition-all flex flex-col group">

                  {/* ── TOP ROW: title + action buttons ── */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 mr-6">
                      {/* File title */}
                      <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
                        {source.name}
                      </h3>

                      {/* 1. Business description — click to edit, persists to backend */}
                      {isEditingDesc ? (
                        <div className="mb-1" style={{ maxWidth: '680px' }}>
                          <textarea
                            value={descDraft}
                            onChange={e => setDescDraft(e.target.value)}
                            rows={2}
                            className="w-full text-sm text-white rounded-lg px-2 py-1.5 outline-none resize-none"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(124,58,237,0.3)' }}
                          />
                          <div className="flex gap-2 mt-1">
                            <button
                              onClick={() => { saveCatalogField(source, 'description', descDraft); setEditingDescKey(null) }}
                              className="text-xs font-semibold px-2 py-0.5 rounded-md"
                              style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399' }}>
                              Save
                            </button>
                            <button
                              onClick={() => setEditingDescKey(null)}
                              className="text-xs font-semibold px-2 py-0.5 rounded-md"
                              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p
                          onClick={() => { if (can('catalog.editText')) { setEditingDescKey(catalogKey); setDescDraft(description) } }}
                          className="text-sm leading-relaxed cursor-pointer"
                          title={can('catalog.editText') ? 'Click to edit description' : undefined}
                          style={{ color: 'rgba(255,255,255,0.45)', maxWidth: '680px' }}>
                          {description}
                        </p>
                      )}

                      {/* 3. Tags / labels — editable, persists to backend */}
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        {tags.map(tag => {
                          const style = TAG_STYLES[tag] || TAG_STYLES['Raw']
                          return (
                            <span
                              key={tag}
                              className="text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1"
                              style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}>
                              {tag}
                              <button
                                hidden={!can('catalog.editText')} onClick={() => saveCatalogField(source, 'tags', tags.filter(t => t !== tag))}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.6, fontSize: '10px', lineHeight: 1 }}
                                title="Remove tag">✕</button>
                            </span>
                          )
                        })}
                        <input
                          type="text"
                          hidden={!can('catalog.editText')} value={tagDraft[catalogKey] || ''}
                          onChange={e => setTagDraft(prev => ({ ...prev, [catalogKey]: e.target.value }))}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && tagDraft[catalogKey]?.trim()) {
                              const newTag = tagDraft[catalogKey].trim()
                              if (!tags.includes(newTag)) saveCatalogField(source, 'tags', [...tags, newTag])
                              setTagDraft(prev => ({ ...prev, [catalogKey]: '' }))
                            }
                          }}
                          placeholder="+ tag"
                          className="text-xs px-2 py-0.5 rounded-full outline-none"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)', color: 'white', width: '70px' }}
                        />
                        {/* Status pill */}
                        {isAnalyzed ? (
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1" style={{ background: TAG_STYLES.Verified.bg, color: TAG_STYLES.Verified.text, border: `1px solid ${TAG_STYLES.Verified.border}` }}>
                            <CatalogIcon name="check" size={11} color={TAG_STYLES.Verified.text} /> Profiled
                          </span>
                        ) : (
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'rgba(234,179,8,0.1)', color: '#fbbf24', border: '1px solid rgba(234,179,8,0.2)' }}>
                            <CatalogIcon name="alert" size={11} color="#fbbf24" /> Needs Profiling
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {/* 2. View Data Dictionary button */}
                      <button
                        onClick={() => openDictionary(source.name)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                        style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                        </svg>
                        View Dictionary
                      </button>

                      <button
                        onClick={() => handleAnalyze(source)}
                        className="px-5 py-2 bg-white/5 hover:bg-purple-600 border border-white/10 hover:border-purple-500 text-white text-sm font-bold rounded-lg transition-all flex items-center gap-2 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0">
                        {isAnalyzed ? 'View Analysis →' : 'Run Profiler →'}
                      </button>
                    </div>
                  </div>

                  {/* ── METADATA ROW ── */}
                  <div className="grid grid-cols-4 gap-4 mt-4 pt-5 border-t border-white/5">
                    <div>
                      <span className="block text-xs text-white/40 mb-1">Rows</span>
                      <span className={`font-mono text-sm ${rows ? 'text-white' : 'text-white/30'}`}>
                        {rows ? rows.toLocaleString() : 'Pending'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-white/40 mb-1">Columns</span>
                      <span className={`font-mono text-sm ${cols ? 'text-white' : 'text-white/30'}`}>
                        {cols ? cols.toLocaleString() : 'Pending'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-white/40 mb-1">Data Owner</span>
                      {editingOwnerKey === catalogKey ? (
                        <div className="flex items-center gap-1.5">
                          <select
                            value={ownerDraft}
                            onChange={e => setOwnerDraft(e.target.value)}
                            className="text-sm text-white rounded-md px-2 py-1 outline-none"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(124,58,237,0.3)' }}
                          >
                            <option value="" style={{ background: '#0d0a1a' }}>Unassigned</option>
                            {orgMembers.map(m => (
                              <option key={m.userId} value={m.userId} style={{ background: '#0d0a1a' }}>
                                {m.userId} ({m.roleKey})
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => { saveCatalogField(source, 'owner', ownerDraft); setEditingOwnerKey(null) }}
                            className="text-xs font-semibold px-1.5 py-0.5 rounded-md"
                            style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399' }}>
                            ✓
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => { if (can('catalog.assignOwner')) { setEditingOwnerKey(catalogKey); setOwnerDraft(catalogEntry?.owner || '') } }}
                          className="text-white text-sm cursor-pointer"
                          title={can('catalog.assignOwner') ? 'Click to edit owner' : undefined}>
                          {catalogEntry?.owner || '<unassigned>'}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="block text-xs text-white/40 mb-1">Last Updated</span>
                      <span className="text-white text-sm">{source.addedAt.split(',')[0]}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── DATA DICTIONARY MODAL ── */}
        {dictionaryOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.8)' }}
            onClick={() => setDictionaryOpen(false)}>
            <div
              className="rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
              style={{ background: '#0d0a1a', border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={e => e.stopPropagation()}>

              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)' }}>
                    <svg width="14" height="14" fill="none" stroke="#818cf8" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-bold text-white text-sm">Data Dictionary</h2>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {(() => {
                        const dictSource = sources.find(s => s.name === dictionarySource)
                        const dictColInfo = dictSource ? (catalogMap[catalogKeyFor(dictSource)]?.colInfo || []) : []
                        const count = dictColInfo.length > 0 ? dictColInfo.length : DATA_DICTIONARY.length
                        return `${dictionarySource} · ${count} columns${dictColInfo.length > 0 ? '' : ' (run the profiler for real columns)'}`
                      })()}
                    </p>
                  </div>
                </div>
                <button onClick={() => setDictionaryOpen(false)} style={{ color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {/* Column legend */}
              <div className="px-6 py-3 flex gap-6" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {[
                  { label: 'Column Name', color: 'rgba(255,255,255,0.5)' },
                  { label: 'Type',        color: '#818cf8' },
                  { label: 'Definition',  color: 'rgba(255,255,255,0.35)' },
                  { label: 'Sensitive',   color: '#f87171' },
                ].map(h => (
                  <span key={h.label} className="text-xs font-semibold uppercase tracking-widest" style={{ color: h.color }}>
                    {h.label}
                  </span>
                ))}
              </div>

              {/* Column rows */}
              <div className="overflow-auto flex-1">
                {(() => {
                  const dictSource = sources.find(s => s.name === dictionarySource)
                  const dictEntry = dictSource ? catalogMap[catalogKeyFor(dictSource)] : null
                  const dictColInfo: any[] = dictEntry?.colInfo || []
                  const overrides: Record<string, any> = dictEntry?.columnOverrides || {}
                  const detectedPii: Record<string, any> = dictEntry?.piiColumns || {}
                  const usingRealColumns = dictColInfo.length > 0

                  const rows = usingRealColumns
                    ? dictColInfo.map((c: any) => ({
                        name: c.column,
                        type: c.dtype,
                        definition: overrides[c.column]?.definition ?? '',
                        pii: overrides[c.column]?.pii ?? detectedPii[c.column]?.pii ?? false,
                      }))
                    : DATA_DICTIONARY

                  return (
                    <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                      <tbody>
                        {rows.map((col: any, i: number) => (
                          <tr
                            key={col.name}
                            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                            {/* Column name */}
                            <td className="px-6 py-3 font-mono font-semibold whitespace-nowrap" style={{ color: '#e2e8f0', width: '200px' }}>
                              {col.name}
                            </td>
                            {/* Type badge */}
                            <td className="px-4 py-3 whitespace-nowrap" style={{ width: '110px' }}>
                              <span
                                className="text-xs font-bold px-2 py-0.5 rounded-md"
                                style={{
                                  background: /int|float/i.test(col.type) ? 'rgba(234,179,8,0.12)'
                                            : /bool/i.test(col.type) ? 'rgba(239,68,68,0.1)'
                                            : /date|time/i.test(col.type) ? 'rgba(34,197,94,0.1)'
                                            : col.type === 'Integer' ? 'rgba(99,102,241,0.15)'
                                            : 'rgba(255,255,255,0.07)',
                                  color: /int|float/i.test(col.type) ? '#fbbf24'
                                       : /bool/i.test(col.type) ? '#f87171'
                                       : /date|time/i.test(col.type) ? '#4ade80'
                                       : col.type === 'Integer' ? '#818cf8'
                                       : 'rgba(255,255,255,0.55)',
                                }}>
                                {col.type}
                              </span>
                            </td>
                            {/* Definition — editable only for real, profiled columns */}
                            <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.45)', lineHeight: '1.5' }}>
                              {usingRealColumns && dictSource ? (
                                <input
                                  type="text"
                                  readOnly={!can('catalog.editText')} defaultValue={col.definition}
                                  placeholder="Add a definition…"
                                  onBlur={e => {
                                    if (e.target.value !== col.definition) {
                                      saveColumnDefinition(dictSource, col.name, e.target.value)
                                    }
                                  }}
                                  className="w-full text-xs outline-none rounded-md px-2 py-1"
                                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
                                />
                              ) : (
                                col.definition
                              )}
                            </td>
                            {/* Sensitive / PII toggle — editable only for real, profiled columns */}
                            <td className="px-4 py-3 whitespace-nowrap" style={{ width: '90px' }}>
                              {usingRealColumns && dictSource ? (
                                <button
                                  disabled={!can('catalog.editLabels')} onClick={() => saveColumnPII(dictSource, col.name, !col.pii)}
                                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                  style={col.pii
                                    ? { background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }
                                    : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)', border: '1px dashed rgba(255,255,255,0.15)' }}>
                                  {col.pii ? '⚠ PII' : '+ mark'}
                                </button>
                              ) : (
                                col.pii ? <span style={{ color: '#f87171' }}>⚠ PII</span> : null
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                })()}
              </div>

              {/* Modal footer */}
              <div className="px-6 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  <CatalogIcon name="lightbulb" size={12} color="rgba(255,255,255,0.3)" />
                  Column definitions are maintained by the Data Governance team. Contact your data owner to request changes.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }
