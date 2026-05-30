import { useState, JSX } from 'react'
import { useNavigate } from 'react-router-dom'

const STEPS_MYSQL = [
  {
    n: 1,
    title: 'Install the dependencies',
    body: 'Open a terminal on the machine that can reach your MySQL database. Run the command below. This installs the two libraries the agent needs — websockets for the secure tunnel and aiomysql to talk to MySQL.',
    code: 'pip install websockets aiomysql',
  },
  {
    n: 2,
    title: 'Save the agent script',
    body: 'Copy the agent.py file from the repo root (it is listed in the codebase as document 2). Save it anywhere on your machine, for example ~/datapro/agent.py.',
    code: '# The file is already in your project root as agent.py\ncp agent.py ~/datapro/agent.py',
  },
  {
    n: 3,
    title: 'Get an agent token',
    body: 'The server needs to trust your agent. Generate a token by calling the admin endpoint once. Save the token — you will paste it into the agent script next.',
    code: 'curl -X POST http://localhost:8000/api/agent/token \\\n  -H "Content-Type: application/json" \\\n  -d \'{"label": "my-laptop"}\'',
  },
  {
    n: 4,
    title: 'Run the agent',
    body: 'Start the agent on the machine with database access. It will prompt you for the server URL, your token, and the database credentials. Nothing is sent to any third party — all traffic goes directly between your machine and your own backend server.',
    code: 'python ~/datapro/agent.py',
  },
  {
    n: 5,
    title: 'Fill in the prompts',
    body: 'The agent asks you five things:\n\n  Server URL  — the URL of your running backend, e.g. https://your-app.up.railway.app\n  Token       — the token you got in step 3\n  DB type     — type "mysql"\n  Host        — your database hostname, e.g. db.internal.company.com\n  Port        — usually 3306\n  Username    — your MySQL username\n  Password    — your MySQL password (hidden while you type)\n  Database    — the database name\n  SSL         — y or n',
    code: '',
  },
  {
    n: 6,
    title: 'Add the source in the browser',
    body: 'Go to Data Sources → Add New → MySQL. Type the SAME host and database name you entered in the agent. Click "Test Connection". The backend detects the connected agent and routes the health check through the tunnel. Your private database is now reachable without opening any firewall port.',
    code: '',
  },
]

const STEPS_POSTGRES = STEPS_MYSQL.map((s, i) => {
  if (i === 0) return { ...s, body: 'Open a terminal on the machine that can reach your PostgreSQL database. Run the command below.', code: 'pip install websockets asyncpg' }
  if (i === 4) return { ...s, body: s.body.replace('type "mysql"', 'type "postgres"').replace('3306', '5432') }
  if (i === 5) return { ...s, body: s.body.replace('MySQL', 'PostgreSQL') }
  return s
})

const STEPS_MONGODB: typeof STEPS_MYSQL = [
  {
    n: 1,
    title: 'Install the dependencies',
    body: 'Open a terminal on the machine that can reach your MongoDB instance. Run the command below.',
    code: 'pip install websockets motor',
  },
  {
    n: 2,
    title: 'Save the agent script',
    body: 'Copy agent.py from the repo root and save it on your machine.',
    code: '# The file is already in your project root as agent.py\ncp agent.py ~/datapro/agent.py',
  },
  {
    n: 3,
    title: 'Get an agent token',
    body: 'Generate a token by calling the admin endpoint once. Save the token.',
    code: 'curl -X POST http://localhost:8000/api/agent/token \\\n  -H "Content-Type: application/json" \\\n  -d \'{"label": "my-laptop"}\'',
  },
  {
    n: 4,
    title: 'Run the agent',
    body: 'Start the agent on the machine with database access.',
    code: 'python ~/datapro/agent.py',
  },
  {
    n: 5,
    title: 'Fill in the prompts',
    body: 'The agent asks you:\n\n  Server URL  — the URL of your running backend\n  Token       — the token from step 3\n  DB type     — type "mongodb"\n  Host        — your MongoDB hostname, e.g. mongo.internal.company.com\n  Port        — usually 27017\n  Username    — your MongoDB username\n  Password    — your MongoDB password (hidden while you type)\n  Database    — the database (auth source) name\n  SSL         — y or n',
    code: '',
  },
  {
    n: 6,
    title: 'Add the source in the browser',
    body: 'Go to Data Sources → Add New → MongoDB. Enter the same host and database name you used in the agent prompts. Click "Test Connection" — the backend routes it through the tunnel automatically.',
    code: '',
  },
]

const STEPS_BIGQUERY: typeof STEPS_MYSQL = [
  {
    n: 1,
    title: 'Install the dependencies',
    body: 'Open a terminal on the machine that has access to your GCP service account. Run the command below.',
    code: 'pip install websockets google-cloud-bigquery',
  },
  {
    n: 2,
    title: 'Save the agent script',
    body: 'Copy agent.py from the repo root and save it on your machine.',
    code: 'cp agent.py ~/datapro/agent.py',
  },
  {
    n: 3,
    title: 'Get an agent token',
    body: 'Generate a token by calling the admin endpoint once.',
    code: 'curl -X POST http://localhost:8000/api/agent/token \\\n  -H "Content-Type: application/json" \\\n  -d \'{"label": "my-laptop"}\'',
  },
  {
    n: 4,
    title: 'Run the agent',
    body: 'Start the agent on the machine with GCP credentials.',
    code: 'python ~/datapro/agent.py',
  },
  {
    n: 5,
    title: 'Fill in the prompts',
    body: 'The agent asks you:\n\n  Server URL            — the URL of your running backend\n  Token                 — the token from step 3\n  DB type               — type "bigquery"\n  GCP Project ID        — your Google Cloud project ID\n  Dataset name          — optional; leave blank to see all datasets\n  Service account JSON  — full path to your downloaded .json key file',
    code: '',
  },
  {
    n: 6,
    title: 'Add the source in the browser',
    body: 'Go to Data Sources → Add New → BigQuery. Enter your GCP Project ID. Click "Test Connection".',
    code: '',
  },
]

const STEPS_DATABRICKS: typeof STEPS_MYSQL = [
  {
    n: 1,
    title: 'Install the dependencies',
    body: 'Open a terminal on any machine with internet access. Run the command below.',
    code: 'pip install websockets databricks-sql-connector',
  },
  {
    n: 2,
    title: 'Save the agent script',
    body: 'Copy agent.py from the repo root and save it on your machine.',
    code: 'cp agent.py ~/datapro/agent.py',
  },
  {
    n: 3,
    title: 'Get an agent token',
    body: 'Generate a DataPro agent token by calling the admin endpoint.',
    code: 'curl -X POST http://localhost:8000/api/agent/token \\\n  -H "Content-Type: application/json" \\\n  -d \'{"label": "my-laptop"}\'',
  },
  {
    n: 4,
    title: 'Run the agent',
    body: 'Start the agent on your machine.',
    code: 'python ~/datapro/agent.py',
  },
  {
    n: 5,
    title: 'Fill in the prompts',
    body: 'The agent asks you:\n\n  Server URL   — the URL of your running backend\n  Token        — the DataPro agent token from step 3\n  DB type      — type "databricks"\n  Workspace    — your Databricks workspace hostname, e.g. adb-123.azuredatabricks.net\n  HTTP Path    — found in SQL Warehouse → Connection Details, e.g. /sql/1.0/warehouses/abc123\n  Access Token — your Databricks Personal Access Token (hidden while you type)\n  Schema       — optional catalog/schema name, default is "default"',
    code: '',
  },
  {
    n: 6,
    title: 'Add the source in the browser',
    body: 'Go to Data Sources → Add New → Databricks. Enter the workspace hostname and HTTP path. Click "Test Connection".',
    code: '',
  },
]

const STEPS_REDSHIFT: typeof STEPS_MYSQL = [
  {
    n: 1,
    title: 'Install the dependencies',
    body: 'Open a terminal on the machine that can reach your Redshift cluster. Run the command below.',
    code: 'pip install websockets aiopg',
  },
  {
    n: 2,
    title: 'Save the agent script',
    body: 'Copy agent.py from the repo root and save it on your machine.',
    code: 'cp agent.py ~/datapro/agent.py',
  },
  {
    n: 3,
    title: 'Get an agent token',
    body: 'Generate a DataPro agent token by calling the admin endpoint once.',
    code: 'curl -X POST http://localhost:8000/api/agent/token \\\n  -H "Content-Type: application/json" \\\n  -d \'{"label": "my-laptop"}\'',
  },
  {
    n: 4,
    title: 'Run the agent',
    body: 'Start the agent on the machine with access to the Redshift cluster.',
    code: 'python ~/datapro/agent.py',
  },
  {
    n: 5,
    title: 'Fill in the prompts',
    body: 'The agent asks you:\n\n  Server URL  — the URL of your running backend\n  Token       — the token from step 3\n  DB type     — type "redshift"\n  Host        — your Redshift cluster endpoint, e.g. cluster.abc123.us-east-1.redshift.amazonaws.com\n  Port        — usually 5439\n  Username    — your Redshift username, e.g. awsuser\n  Password    — your Redshift password (hidden while you type)\n  Database    — the database name\n  SSL         — y (Redshift requires SSL)',
    code: '',
  },
  {
    n: 6,
    title: 'Add the source in the browser',
    body: 'Go to Data Sources → Add New → AWS (Redshift). Enter the cluster endpoint and database name. Click "Test Connection".',
    code: '',
  },
]

type DB = 'mysql' | 'postgres' | 'mongodb' | 'bigquery' | 'databricks' | 'redshift'

export default function Tunneling() {
  const navigate = useNavigate()
  const [db, setDb] = useState<DB>('mysql')
  const [copied, setCopied] = useState<number | null>(null)

  const STEPS_MAP: Record<DB, typeof STEPS_MYSQL> = {
    mysql:      STEPS_MYSQL,
    postgres:   STEPS_POSTGRES,
    mongodb:    STEPS_MONGODB,
    bigquery:   STEPS_BIGQUERY,
    databricks: STEPS_DATABRICKS,
    redshift:   STEPS_REDSHIFT,
  }
  const steps = STEPS_MAP[db]

  const copy = (text: string, idx: number) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(idx)
    setTimeout(() => setCopied(null), 2000)
  }

  const DB_META: Record<DB, { accent: string; accentBg: string; accentBorder: string; label: string; icon: JSX.Element }> = {
    mysql: {
      accent: '#fbbf24', accentBg: 'rgba(245,158,11,0.2)', accentBorder: 'rgba(245,158,11,0.45)', label: 'MySQL',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="5" rx="9" ry="3" fill="#f59e0b" fillOpacity="0.7"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" stroke="#f59e0b" strokeWidth="1.5" fill="none"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" stroke="#f59e0b" strokeWidth="1.5" fill="none"/></svg>,
    },
    postgres: {
      accent: '#818cf8', accentBg: 'rgba(99,102,241,0.2)', accentBorder: 'rgba(99,102,241,0.45)', label: 'PostgreSQL',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="5" rx="9" ry="3" fill="#6366f1" fillOpacity="0.7"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" stroke="#6366f1" strokeWidth="1.5" fill="none"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" stroke="#6366f1" strokeWidth="1.5" fill="none"/></svg>,
    },
    mongodb: {
      accent: '#4ade80', accentBg: 'rgba(34,197,94,0.2)', accentBorder: 'rgba(34,197,94,0.45)', label: 'MongoDB',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2C8 8 8 14 12 22c4-8 4-14 0-20z" fill="#4ade80" fillOpacity="0.8"/></svg>,
    },
    bigquery: {
      accent: '#38bdf8', accentBg: 'rgba(56,189,248,0.2)', accentBorder: 'rgba(56,189,248,0.45)', label: 'BigQuery',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#38bdf8" strokeWidth="1.8"/><path d="M16.5 16.5L21 21" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    },
    databricks: {
      accent: '#fb923c', accentBg: 'rgba(251,146,60,0.2)', accentBorder: 'rgba(251,146,60,0.45)', label: 'Databricks',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3L3 8.5V15l9 5.5 9-5.5V8.5z" stroke="#fb923c" strokeWidth="1.6" fill="none"/><path d="M3 8.5l9 5 9-5" stroke="#fb923c" strokeWidth="1.4"/></svg>,
    },
    redshift: {
      accent: '#f472b6', accentBg: 'rgba(244,114,182,0.2)', accentBorder: 'rgba(244,114,182,0.45)', label: 'Redshift',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 19h20L12 2z" fill="#f472b6" fillOpacity="0.7"/></svg>,
    },
  }
  const meta = DB_META[db]

  return (
    <div className="p-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.3)' }}
          >
            <svg width="14" height="14" fill="none" stroke="#fbbf24" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Secure Tunneling</h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Connect private databases — no firewall changes needed
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/docs', { state: { from: '/tunneling' } })}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          Full Docs
        </button>
      </div>

      {/* What is tunneling */}
      <div
        className="rounded-2xl p-6 mb-8"
        style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}
      >
        <h2 className="font-bold text-white text-base mb-2">What is tunneling and why do I need it?</h2>
        <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Most company databases live inside a private network — behind a VPN, behind a corporate firewall, or on a server with no public IP. Your DataPro backend (the FastAPI server) cannot reach those databases directly.
        </p>
        <p className="text-sm leading-relaxed mt-3" style={{ color: 'rgba(255,255,255,0.6)' }}>
          The agent is a small Python script you run on a machine that <em>can</em> reach the database. It opens a secure WebSocket connection to your backend and waits. When you run a pipeline or analysis in the browser, the backend sends the SQL query through that connection, the agent runs it locally on your database, and sends the results back. Your database never needs a public IP or an open firewall port.
        </p>
        <div
          className="mt-4 flex items-center gap-3 text-sm rounded-xl px-4 py-3"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
        >
          <span style={{ fontSize: '20px' }}>💻</span>
          <span>Your machine (runs agent.py)</span>
          <svg width="20" height="12" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" viewBox="0 0 20 12">
            <path d="M1 6h18M13 1l5 5-5 5"/>
          </svg>
          <span style={{ color: '#fbbf24' }}>Secure WebSocket (wss://)</span>
          <svg width="20" height="12" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" viewBox="0 0 20 12">
            <path d="M1 6h18M13 1l5 5-5 5"/>
          </svg>
          <span>🖥️ Your DataPro backend</span>
          <svg width="20" height="12" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" viewBox="0 0 20 12">
            <path d="M1 6h18M13 1l5 5-5 5"/>
          </svg>
          <span>🌐 Browser</span>
        </div>
      </div>

      {/* DB selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(Object.keys(DB_META) as DB[]).map(d => {
          const m = DB_META[d]
          const active = db === d
          return (
            <button
              key={d}
              onClick={() => setDb(d)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: active ? m.accentBg : 'rgba(255,255,255,0.04)',
                border: `1px solid ${active ? m.accentBorder : 'rgba(255,255,255,0.08)'}`,
                color: active ? m.accent : 'rgba(255,255,255,0.5)',
              }}
            >
              {m.icon}
              {m.label}
            </button>
          )
        })}
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, i) => (
          <div
            key={i}
            className="rounded-2xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div
              className="flex items-center gap-4 px-6 py-4"
              style={{ borderBottom: step.code || step.body.includes('\n') ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
            >
              <div
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  background: meta.accentBg,
                  color: meta.accent,
                  border: `1px solid ${meta.accentBorder}`,
                }}
              >
                {step.n}
              </div>
              <h3 className="font-semibold text-white text-sm">{step.title}</h3>
            </div>

            <div className="px-6 py-4 space-y-3">
              <div className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {step.body.split('\n').map((line, li) => (
                  <span key={li}>
                    {line}
                    {li < step.body.split('\n').length - 1 && <br />}
                  </span>
                ))}
              </div>

              {step.code && (
                <div
                  className="relative rounded-xl overflow-hidden"
                  style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div
                    className="flex items-center justify-between px-4 py-2"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
                  >
                    <span className="text-xs font-bold" style={{ color: meta.accent }}>
                      bash
                    </span>
                    <button
                      onClick={() => copy(step.code!, i)}
                      className="text-xs px-2 py-0.5 rounded-md font-semibold transition-all"
                      style={{
                        background: copied === i ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)',
                        color: copied === i ? '#4ade80' : 'rgba(255,255,255,0.5)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      {copied === i ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre
                    className="p-4 text-xs leading-relaxed overflow-auto"
                    style={{ color: '#a5f3fc', fontFamily: "'JetBrains Mono','Fira Code',monospace", margin: 0 }}
                  >
                    {step.code}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Troubleshooting */}
      <div
        className="mt-8 rounded-2xl p-6"
        style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}
      >
        <h2 className="font-bold text-white text-sm mb-4">Common problems</h2>
        <div className="space-y-3">
          {[
            {
              problem: '"Invalid token" when the agent connects',
              fix: 'The token was not saved correctly. Run the curl command in step 3 again and paste the new token carefully — no extra spaces.',
            },
            {
              problem: 'Agent connects but queries time out',
              fix: 'The agent can reach the backend but not the database. Check that the host, port, username, and password are correct on the machine running the agent, not on the server machine.',
            },
            {
              problem: '"No agent connected" error in the browser',
              fix: 'The agent is not running or has disconnected. Restart agent.py on your machine. The browser and backend reconnect automatically once the agent registers.',
            },
            {
              problem: 'agent.py says "asyncpg not installed"',
              fix: 'Run: pip install asyncpg  —  this is required for PostgreSQL only. MySQL uses aiomysql.',
            },
            {
              problem: 'Connection works but I see wrong tables',
              fix: 'Check the database name you typed in step 6 matches exactly what you typed in the agent prompt. Database names are case-sensitive on Linux.',
            },
          ].map((item, i) => (
            <div
              key={i}
              className="rounded-xl px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-sm font-semibold text-white mb-1">{item.problem}</p>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{item.fix}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Security note */}
      <div
        className="mt-6 rounded-2xl p-5 flex items-start gap-3"
        style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}
      >
        <span style={{ fontSize: '18px' }}>🔒</span>
        <div>
          <p className="text-sm font-semibold text-white mb-1">Security model</p>
          <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Your database credentials are entered interactively on the agent machine and never stored anywhere on the server. The WebSocket connection uses TLS (wss://) end-to-end. Tokens are random 32-byte secrets. The agent only executes SELECT queries — it cannot write to your database.
          </p>
        </div>
      </div>
    </div>
  )
}