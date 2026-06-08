export default function About() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a1a',
      color: 'white',
      fontFamily: '"Palatino Linotype", Georgia, serif',
      padding: '60px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <div style={{ maxWidth: 720, width: '100%' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>♔</div>
          <h1 style={{
            fontSize: '2.8rem', fontWeight: 900, letterSpacing: '0.06em',
            background: 'linear-gradient(135deg, #e9d5ff, #a78bfa, #7c3aed)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            margin: '0 0 12px',
          }}>
            The God's Tool
          </h1>
          <p style={{ color: '#7c6fff', letterSpacing: '0.3em', textTransform: 'uppercase', fontSize: '0.9rem', opacity: 0.8 }}>
            Omniscience · Precision · Power
          </p>
        </div>

        {/* What is this app */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: '1.2rem', color: '#c4b5fd', letterSpacing: '0.1em', marginBottom: 12 }}>What is The God's Tool?</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, fontSize: '1rem' }}>
            The God's Tool is a data intelligence and pipeline automation platform. It allows users to connect data sources
            (CSV files, Google Sheets, MySQL, PostgreSQL, BigQuery, MongoDB, and more), run automated data quality analysis,
            build cleaning pipelines, and govern datasets through a unified catalog — all from a browser-based interface.
          </p>
        </section>

        {/* Why Google OAuth */}
        <section style={{ marginBottom: 48, background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 12, padding: '28px 32px' }}>
          <h2 style={{ fontSize: '1.2rem', color: '#c4b5fd', letterSpacing: '0.1em', marginBottom: 12 }}>Why we use Google Sign-In</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, fontSize: '1rem', marginBottom: 16 }}>
            The God's Tool uses Google OAuth 2.0 solely to allow users to sign in securely without a password.
            We request only your email address and basic profile information to create and identify your account.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, fontSize: '1rem', marginBottom: 16 }}>
            We also offer an optional Google Sheets integration, which allows users to connect their own spreadsheets
            as data sources and write cleaned data back to Sheets. This requires read/write access to Google Sheets,
            which users explicitly grant during the connection flow inside the app.
          </p>
          <ul style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 2, paddingLeft: 20, fontSize: '0.95rem' }}>
            <li>We do <strong style={{ color: '#a78bfa' }}>not</strong> access any Google data without explicit user action</li>
            <li>We do <strong style={{ color: '#a78bfa' }}>not</strong> sell or share your data with third parties</li>
            <li>We do <strong style={{ color: '#a78bfa' }}>not</strong> store Google credentials on any server</li>
            <li>All credentials remain in your browser's localStorage only</li>
          </ul>
        </section>

        {/* Features */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: '1.2rem', color: '#c4b5fd', letterSpacing: '0.1em', marginBottom: 20 }}>Core Features</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              ['🔌', 'Data Sources', 'Connect 12+ source types including databases, cloud warehouses, and APIs'],
              ['📊', 'Data Analysis', 'Automated profiling: missing values, outliers, schema drift, time series'],
              ['⚙️', 'Pipeline Flow', 'Chain cleaning transformations with scheduling and full run logs'],
              ['🗂️', 'Data Catalog', 'Governance layer with tagging, data dictionary, and profiling status'],
              ['🔐', 'Secure Tunneling', 'Connect private network databases without opening firewall ports'],
              ['📜', 'Audit Logs', 'Full history of every action taken on the platform'],
            ].map(([icon, title, desc]) => (
              <div key={title as string} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '20px 18px' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{icon}</div>
                <div style={{ fontWeight: 700, color: '#e9d5ff', marginBottom: 6, fontSize: '0.95rem' }}>{title}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Legal links */}
        <section style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 32, display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/privacy" style={{ color: '#7c6fff', fontSize: '0.9rem', textDecoration: 'none' }}>Privacy Policy</a>
          <a href="/terms" style={{ color: '#7c6fff', fontSize: '0.9rem', textDecoration: 'none' }}>Terms of Service</a>
          <a href="mailto:vatsaman888@gmail.com" style={{ color: '#7c6fff', fontSize: '0.9rem', textDecoration: 'none' }}>Contact</a>
        </section>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.15)', fontSize: '0.78rem', marginTop: 32, fontFamily: 'monospace' }}>
          © {new Date().getFullYear()} The God's Tool. All rights reserved.
        </p>
      </div>
    </div>
  )
}
