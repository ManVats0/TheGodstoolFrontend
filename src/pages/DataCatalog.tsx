  import { useState } from 'react'
  import { useNavigate } from 'react-router-dom'
  import { useStore } from '../store'

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

  // ── DESCRIPTION GENERATOR ────────────────────────────────────────────────────
  // In production this would come from the source metadata / user input.
  function getDescription(name: string): string {
    return `This dataset contains transactional and identity records ingested from the ${name.replace(/\.(csv|xlsx?)$/i, '')} upstream system. It is used for financial reconciliation, scheme disbursement tracking, and compliance reporting across regional offices.`
  }

  export default function DataCatalog() {
    const navigate = useNavigate()
    const { sources, activeSourceName, analysis, setActiveSourceName, addAuditLog } = useStore()

    // ── STATE ────────────────────────────────────────────────────────────────
    const [searchQuery, setSearchQuery]         = useState('')
    const [ownerFilter, setOwnerFilter]         = useState('')
    const [dateFilter, setDateFilter]           = useState('')
    const [dictionaryOpen, setDictionaryOpen]   = useState(false)
    const [dictionarySource, setDictionarySource] = useState<string | null>(null)

    // ── SEARCH / FILTER LOGIC ────────────────────────────────────────────────
    const filteredSources = sources.filter(source => {
      const q = searchQuery.toLowerCase()
      const desc = getDescription(source.name).toLowerCase()
      const tags = DEFAULT_TAGS.map(t => t.toLowerCase())
      const owner = 'local user'

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
          <h1 className="text-3xl font-bold text-white mb-2">🗂️ Data Catalog</h1>
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
            <div className="text-4xl mb-4">📭</div>
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
            <div className="text-4xl mb-4">🔍</div>
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
              const rows = isAnalyzed ? analysis.dataset_info?.rows : null
              const cols = isAnalyzed ? analysis.dataset_info?.columns : null
              const description = getDescription(source.name)

              return (
                <div key={source.id} className="bg-[#110e1b] border border-white/5 p-6 rounded-2xl hover:border-purple-500/30 transition-all flex flex-col group">

                  {/* ── TOP ROW: title + action buttons ── */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 mr-6">
                      {/* File title */}
                      <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
                        {source.name}
                      </h3>

                      {/* 1. Business description — lighter text directly under title */}
                      <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)', maxWidth: '680px' }}>
                        {description}
                      </p>

                      {/* 3. Tags / labels */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {DEFAULT_TAGS.map(tag => {
                          const style = TAG_STYLES[tag] || TAG_STYLES['Raw']
                          return (
                            <span
                              key={tag}
                              className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                              style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}>
                              {tag}
                            </span>
                          )
                        })}
                        {/* Status pill */}
                        {isAnalyzed ? (
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ background: TAG_STYLES.Verified.bg, color: TAG_STYLES.Verified.text, border: `1px solid ${TAG_STYLES.Verified.border}` }}>
                            ✓ Profiled
                          </span>
                        ) : (
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(234,179,8,0.1)', color: '#fbbf24', border: '1px solid rgba(234,179,8,0.2)' }}>
                            ⚠️ Needs Profiling
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
                      <span className="text-white text-sm">Local User</span>
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
                      {dictionarySource} · {DATA_DICTIONARY.length} columns
                    </p>
                  </div>
                </div>
                <button onClick={() => setDictionaryOpen(false)} style={{ color: 'rgba(255,255,255,0.35)', fontSize: '20px', lineHeight: 1 }}>✕</button>
              </div>

              {/* Column legend */}
              <div className="px-6 py-3 flex gap-6" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {[
                  { label: 'Column Name', color: 'rgba(255,255,255,0.5)' },
                  { label: 'Type',        color: '#818cf8' },
                  { label: 'Definition',  color: 'rgba(255,255,255,0.35)' },
                ].map(h => (
                  <span key={h.label} className="text-xs font-semibold uppercase tracking-widest" style={{ color: h.color }}>
                    {h.label}
                  </span>
                ))}
              </div>

              {/* Column rows */}
              <div className="overflow-auto flex-1">
                <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                  <tbody>
                    {DATA_DICTIONARY.map((col, i) => (
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
                              background: col.type === 'Integer' ? 'rgba(99,102,241,0.15)'
                                        : col.type === 'Float'   ? 'rgba(234,179,8,0.12)'
                                        : col.type === 'Date'    ? 'rgba(34,197,94,0.1)'
                                        : col.type === 'Boolean' ? 'rgba(239,68,68,0.1)'
                                        : 'rgba(255,255,255,0.07)',
                              color:     col.type === 'Integer' ? '#818cf8'
                                        : col.type === 'Float'   ? '#fbbf24'
                                        : col.type === 'Date'    ? '#4ade80'
                                        : col.type === 'Boolean' ? '#f87171'
                                        : 'rgba(255,255,255,0.55)',
                            }}>
                            {col.type}
                          </span>
                        </td>
                        {/* Definition */}
                        <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.45)', lineHeight: '1.5' }}>
                          {col.definition}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Modal footer */}
              <div className="px-6 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  💡 Column definitions are maintained by the Data Governance team. Contact your data owner to request changes.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }