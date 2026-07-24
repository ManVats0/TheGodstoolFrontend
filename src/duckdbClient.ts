import * as duckdb from '@duckdb/duckdb-wasm'
import duckdb_wasm_mvp from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url'
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url'
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url'
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url'

let dbPromise: Promise<duckdb.AsyncDuckDB> | null = null

async function getDB(): Promise<duckdb.AsyncDuckDB> {
  if (dbPromise) return dbPromise
  dbPromise = (async () => {
    const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
      mvp: { mainModule: duckdb_wasm_mvp, mainWorker: mvp_worker },
      eh:  { mainModule: duckdb_wasm_eh, mainWorker: eh_worker },
    }
    const bundle = await duckdb.selectBundle(MANUAL_BUNDLES)
    const worker = new Worker(bundle.mainWorker!)
    const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING)
    const db = new duckdb.AsyncDuckDB(logger, worker)
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker)
    return db
  })()
  return dbPromise
}

// Same guardrail as the backend's /api/sql-clean — read-only only.
// This is defense-in-depth, not the real security boundary (the browser
// sandbox is); the real boundary is that this never touches your server.
const BLOCKED_KEYWORDS = [
  'attach ', 'pragma ', 'copy ', 'install ', 'load ', 'create ',
  'insert ', 'update ', 'delete ', 'drop ', 'call ',
]

function validateReadOnlySQL(sql: string): string | null {
  const noBlockComments = sql.replace(/\/\*[\s\S]*?\*\//g, '')
  const noLineComments = noBlockComments.replace(/--[^\n]*/g, '')
  const stripped = noLineComments.trim().replace(/^\(+/, '').trim()
  const lowered = stripped.toLowerCase()
  if (!(lowered.startsWith('select') || lowered.startsWith('with'))) {
    return 'Only SELECT / WITH queries are allowed. Statements like INSERT, DELETE, DROP, ATTACH, COPY, or PRAGMA are blocked.'
  }
  if (BLOCKED_KEYWORDS.some(kw => lowered.includes(kw))) {
    return 'Query contains a disallowed keyword. Only read-only SELECT queries are permitted.'
  }
  return null
}

export interface SqlPreviewResult {
  success: boolean
  error?: string
  original_shape?: [number, number]
  cleaned_shape?: [number, number]
  preview_data?: any[]
  preview_columns?: string[]
}

/**
 * Runs a SQL query against a CSV file entirely in the browser via DuckDB-WASM.
 * Mirrors the shape of the backend's /api/sql-clean (preview_only=true) response
 * so callers don't need to change how they read the result.
 */
export async function runSQLPreviewWasm(
  file: File,
  sql: string,
  previewRows = 100
): Promise<SqlPreviewResult> {
  const validationError = validateReadOnlySQL(sql)
  if (validationError) return { success: false, error: validationError }

  let conn: duckdb.AsyncDuckDBConnection | null = null
  try {
    const db = await getDB()
    conn = await db.connect()

    const buf = new Uint8Array(await file.arrayBuffer())
    await db.registerFileBuffer('source.csv', buf)
    await conn.insertCSVFromPath('source.csv', { name: 'source', detect: true })

    const countRes = await conn.query('SELECT COUNT(*) AS c FROM source')
    const originalRows = Number(countRes.toArray()[0].c)
    const describeRes = await conn.query('DESCRIBE source')
    const originalCols = describeRes.numRows

    const result = await conn.query(sql)
    const rows = result.toArray().map((r: any) => r.toJSON())
    const columns = result.schema.fields.map((f: any) => f.name)

    return {
      success: true,
      original_shape: [originalRows, originalCols],
      cleaned_shape: [rows.length, columns.length],
      preview_data: rows.slice(0, previewRows),
      preview_columns: columns,
    }
  } catch (e: any) {
    return { success: false, error: `SQL error: ${e?.message || String(e)}` }
  } finally {
    if (conn) await conn.close().catch(() => {})
  }
}
