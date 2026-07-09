import logo from '../the_gods_tool_logo_3d.png'
import ResetPassword from './pages/ResetPassword'
import Pricing from './pages/Pricing'
import ThankYou from './pages/ThankYou'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import { useState, useEffect } from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import NotificationPanel from './components/NotificationPanel'
import DataSources from './pages/DataSources'
import DataCatalog from './pages/DataCatalog'
import Flow from './pages/Flow'
import Analysis from './pages/Analysis'
import AuditLogs from './pages/AuditLogs'
import { useStore } from './store'
import Documentation from './pages/Documentation'
import Tunneling from './pages/Tunneling'
import Contact from './pages/Contact'
import Feedback from './pages/Feedback'

const GOOGLE_CLIENT_ID = '973595012454-ojh9i31u6ocq5l12t8gccer8dlc8gaim.apps.googleusercontent.com'

function redirectToGoogleOAuth() {
  const redirectUri = `${import.meta.env.VITE_AUTH_URL}/api/google/callback`
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account'
  })
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export default function App() {
  const [showNotif, setShowNotif] = useState(false)
  const navigate = useNavigate()
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const location = useLocation()

const [entered, setEntered] = useState(() => !!localStorage.getItem('datapro_logged_in'))
const [userPlan, setUserPlan] = useState<string>(() => {
  const stored = localStorage.getItem('datapro_plan')
  return stored || 'none'
})
const [showLogin, setShowLogin] = useState(false)
const [loginEmail, setLoginEmail] = useState('')
const [loginPassword, setLoginPassword] = useState('')
const [loginError, setLoginError] = useState('')
const [isRegisterMode, setIsRegisterMode] = useState(false)
const [showForgot, setShowForgot] = useState(false)
const [forgotEmail, setForgotEmail] = useState('')
const [forgotMsg, setForgotMsg] = useState('')
const [forgotError, setForgotError] = useState('')
const [isGoogleLoading, setIsGoogleLoading] = useState(false)
const [isLoginLoading, setIsLoginLoading] = useState(false)

  useEffect(() => {
    if (location.pathname !== '/docs') {
      localStorage.setItem('datapro_last_page', location.pathname)
    }
  }, [location.pathname]) // Default to true if you prefer it open
  const notifications = useStore(s => s.notifications)
  const readIds = useStore(s => s.readIds)
  const unread = notifications.filter(n => !readIds.has(n.id)).length

  const speakWelcome = () => {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance('We are so happy you found this technology.')
    utterance.pitch = 0.1
    utterance.rate = 0.78
    utterance.volume = 1
    const trySpeak = () => {
      const voices = window.speechSynthesis.getVoices()
      const deep = voices.find(v => /male/i.test(v.name) || /david/i.test(v.name) || /daniel/i.test(v.name) || /james/i.test(v.name))
      if (deep) utterance.voice = deep
      window.speechSynthesis.speak(utterance)
    }
    if (window.speechSynthesis.getVoices().length > 0) {
      trySpeak()
    } else {
      window.speechSynthesis.onvoiceschanged = () => { trySpeak(); window.speechSynthesis.onvoiceschanged = null }
    }
  }

  useEffect(() => {
    if (entered) speakWelcome()
  }, [entered])

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'GOOGLE_TOKEN' && (window as any)._googleLoginCallback) {
        (window as any)._googleLoginCallback(e.data.token)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  useEffect(() => {
    if (location.pathname !== '/auth/callback') return
    const params = new URLSearchParams(location.search)
    const token = params.get('token')
    const email = params.get('email')
    if (!token || !email) {
      navigate('/', { replace: true })
      return
    }
    localStorage.setItem('datapro_logged_in', '1')
    localStorage.setItem('datapro_token', token)
    localStorage.setItem('datapro_email', email)
    if (email === 'vatsaman888@gmail.com') {
      localStorage.setItem('datapro_plan', 'enterprise')
      setUserPlan('enterprise')
      setEntered(true)
      navigate('/', { replace: true })
      return
    }
    fetch(`${import.meta.env.VITE_AUTH_URL}/api/plan`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(planData => {
        const plan = planData.plan || 'none'
        localStorage.setItem('datapro_plan', plan)
        setUserPlan(plan)
      })
      .catch(() => { /* ignore */ })
      .finally(() => {
        setEntered(true)
        navigate('/', { replace: true })
      })
  }, [location.pathname])

  const [showIndra, setShowIndra] = useState(true)
  const [demoPlaying, setDemoPlaying] = useState(false)
  const handleEnter = () => setShowLogin(true)

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Please enter email and password.')
      return
    }
    setIsLoginLoading(true)
    try {
      const endpoint = isRegisterMode ? 'register' : 'login'
      const res = await fetch(`${import.meta.env.VITE_AUTH_URL}/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      })
      const data = await res.json()
      if (!res.ok) {
        setLoginError(data.error || (isRegisterMode ? 'Registration failed' : 'Login failed'))
        return
      }
      localStorage.setItem('datapro_logged_in', '1')
      localStorage.setItem('datapro_token', data.token)
      localStorage.setItem('datapro_email', data.email)
      // Founder bypass
      if (data.email === 'vatsaman888@gmail.com') {
        localStorage.setItem('datapro_plan', 'enterprise')
        setUserPlan('enterprise')
        setEntered(true)
        setShowLogin(false)
        return
      }
      // Fetch plan
      try {
        const planRes = await fetch(`${import.meta.env.VITE_AUTH_URL}/api/plan`, {
          headers: { Authorization: `Bearer ${data.token}` }
        })
        const planData = await planRes.json()
        const plan = planData.plan || 'none'
        localStorage.setItem('datapro_plan', plan)
        setUserPlan(plan)
      } catch { /* ignore */ }
      setEntered(true)
      setShowLogin(false)
    } catch (err) {
      setLoginError('Cannot connect to server. Make sure backend is running.')
    } finally {
      setIsLoginLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) { setForgotError('Please enter your email.'); return }
    try {
      const res = await fetch(`${import.meta.env.VITE_AUTH_URL}/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      })
      const data = await res.json()
      if (!res.ok) { setForgotError(data.error || 'Failed'); return }
      setForgotMsg('Reset link sent! Check your email.')
      setForgotError('')
    } catch {
      setForgotError('Cannot connect to server.')
    }
  }

 const handleGoogleLogin = () => {
    setIsGoogleLoading(true)
    ;(window as any).google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response: any) => {
        try {
          const payload = JSON.parse(atob(response.credential.split('.')[1]))
          const backendRes = await fetch(`${import.meta.env.VITE_AUTH_URL}/api/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: payload.email,
              googleId: payload.sub,
              name: payload.name
            })
          })
          const data = await backendRes.json()
          if (!backendRes.ok) { setLoginError(data.error || 'Google login failed'); setIsGoogleLoading(false); return }
          localStorage.setItem('datapro_logged_in', '1')
          localStorage.setItem('datapro_token', data.token)
          localStorage.setItem('datapro_email', data.email)
          // Founder bypass
          if (data.email === 'vatsaman888@gmail.com') {
            localStorage.setItem('datapro_plan', 'enterprise')
            setUserPlan('enterprise')
            setEntered(true)
            setShowLogin(false)
            return
          }
          try {
            const planRes = await fetch(`${import.meta.env.VITE_AUTH_URL}/api/plan`, {
              headers: { Authorization: `Bearer ${data.token}` }
            })
            const planData = await planRes.json()
            const plan = planData.plan || 'none'
            localStorage.setItem('datapro_plan', plan)
            setUserPlan(plan)
          } catch { /* ignore */ }
          setEntered(true)
          setShowLogin(false)
        } catch {
          setLoginError('Google login failed. Try again.')
          setIsGoogleLoading(false)
        }
      }
    })
    ;(window as any).google.accounts.id.prompt((notification: any) => {
      if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
        redirectToGoogleOAuth()
        return
      }
      if (notification?.isDismissedMoment?.()) {
        setIsGoogleLoading(false)
      }
    })
  }

if (location.pathname === '/privacy.html') { window.location.href = '/privacy.html'; return null; }
if (location.pathname === '/terms.html') { window.location.href = '/terms.html'; return null; }

if (location.pathname === '/reset-password') return <Routes><Route path="/reset-password" element={<ResetPassword />} /></Routes>
if (location.pathname === '/pricing') return <Routes><Route path="/pricing" element={<Pricing />} /></Routes>
if (location.pathname === '/privacy') return <Routes><Route path="/privacy" element={<Privacy />} /></Routes>
if (location.pathname === '/terms') return <Routes><Route path="/terms" element={<Terms />} /></Routes>
if (location.pathname === '/contact') return <Routes><Route path="/contact" element={<Contact />} /></Routes>
if (location.pathname === '/feedback') return <Routes><Route path="/feedback" element={<Feedback />} /></Routes>
if (location.pathname === '/thank-you') return <Routes><Route path="/thank-you" element={<ThankYou />} /></Routes>

if (location.pathname === '/auth/callback') return (
  <div style={{ minHeight: '100vh', background: '#05030f', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', fontSize: '1rem' }}>
    Signing you in…
  </div>
)

if (!entered) return (
  <div style={{ minHeight: '100vh', background: '#05030f', color: 'white', fontFamily: 'Georgia, serif', overflowX: 'hidden' }}>
    <style>{`
      @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
      @keyframes fadeUp { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:translateY(0)} }
      @keyframes pulseGlow { 0%,100%{box-shadow:0 0 40px rgba(124,58,237,0.3)} 50%{box-shadow:0 0 80px rgba(124,58,237,0.7)} }
      @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
      @keyframes rotateOrb { 0%{transform:rotate(0deg) translateX(120px) rotate(0deg)} 100%{transform:rotate(360deg) translateX(120px) rotate(-360deg)} }
      @keyframes gridFade { 0%,100%{opacity:0.04} 50%{opacity:0.08} }
      .hero-title {
        font-size: clamp(2.8rem, 7vw, 5.5rem);
        font-weight: 900;
        letter-spacing: -0.02em;
        line-height: 1.05;
        background: linear-gradient(135deg, #ffffff 0%, #e9d5ff 30%, #a78bfa 60%, #7c3aed 100%);
        background-size: 300% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: shimmer 6s linear infinite;
      }
      .nav-link {
        color: rgba(255,255,255,0.55);
        text-decoration: none;
        font-family: monospace;
        font-size: 0.82rem;
        letter-spacing: 0.08em;
        transition: color 0.2s;
        cursor: pointer;
      }
      .nav-link:hover { color: #a78bfa; }
      .feature-card {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(167,139,250,0.12);
        border-radius: 16px;
        padding: 28px 24px;
        transition: all 0.3s;
        animation: fadeUp 0.6s ease both;
      }
      .feature-card:hover {
        background: rgba(124,58,237,0.08);
        border-color: rgba(167,139,250,0.35);
        transform: translateY(-4px);
      }
      .stat-item {
        text-align: center;
        padding: 24px 16px;
      }
      .cta-btn {
        font-family: Georgia, serif;
        background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
        color: white;
        border: none;
        padding: 18px 52px;
        border-radius: 6px;
        font-size: 1rem;
        font-weight: 700;
        letter-spacing: 0.15em;
        cursor: pointer;
        text-transform: uppercase;
        animation: pulseGlow 3s ease-in-out infinite;
        transition: transform 0.2s;
      }
      .cta-btn:hover { transform: scale(1.04); }
      .step-num {
        width: 48px; height: 48px;
        border-radius: 50%;
        background: linear-gradient(135deg, #7c3aed, #4f46e5);
        display: flex; align-items: center; justify-content: center;
        font-size: 1.1rem; font-weight: 900; color: white;
        flex-shrink: 0;
        box-shadow: 0 0 24px rgba(124,58,237,0.5);
      }
      .pricing-card {
        background: rgba(255,255,255,0.02);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 16px;
        padding: 32px 28px;
        flex: 1;
        min-width: 220px;
        max-width: 280px;
        transition: all 0.3s;
      }
      .pricing-card:hover { border-color: rgba(167,139,250,0.3); transform: translateY(-4px); }
      .pricing-card.featured {
        background: rgba(124,58,237,0.12);
        border: 2px solid rgba(124,58,237,0.5);
        position: relative;
      }
      .auth-input {
        width: 100%; padding: 13px 16px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(99,179,237,0.18);
        border-radius: 6px; color: #e2e8f0;
        font-size: 0.95rem; font-family: Georgia, serif;
        box-sizing: border-box; outline: none;
        transition: border-color 0.2s;
      }
      .auth-input::placeholder { color: rgba(148,163,184,0.5); }
      .auth-input:focus { border-color: rgba(99,179,237,0.55); }
      .auth-btn-primary {
        width: 100%; padding: 14px;
        background: linear-gradient(135deg, #1a56db 0%, #1e40af 100%);
        border: none; border-radius: 6px; color: white;
        font-weight: 700; font-size: 0.95rem; letter-spacing: 0.08em;
        cursor: pointer; font-family: Georgia, serif; transition: opacity 0.2s;
      }
      .auth-btn-primary:hover { opacity: 0.88; }
      .auth-btn-google {
        display: flex; align-items: center; gap: 10px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 6px; padding: 12px 20px;
        font-size: 0.92rem; font-weight: 500; cursor: pointer;
        width: 100%; justify-content: center; color: #cbd5e1;
        font-family: Georgia, serif; transition: background 0.2s;
      }
      .auth-btn-google:hover { background: rgba(255,255,255,0.1); }
      .auth-btn-primary:disabled, .auth-btn-google:disabled { opacity: 0.65; cursor: not-allowed; }
      .btn-spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes indraSlide {
        from{opacity:0;transform:translateY(24px) scale(0.97)}
        to{opacity:1;transform:translateY(0) scale(1)}
      }
      @keyframes indraLightning { 0%,100%{opacity:0.5} 50%{opacity:1} }
      @keyframes float-up { 0%{transform:translateY(0);opacity:0.18} 100%{transform:translateY(-80px);opacity:0} }
    `}</style>

    {/* ── NAVBAR ── */}
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '16px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(5,3,15,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img src={logo} alt="logo" style={{ height: '28px', width: '28px' }} />
        <span style={{ fontFamily: '"Palatino Linotype", Georgia, serif', fontWeight: 900, fontSize: '1rem', letterSpacing: '0.06em', background: 'linear-gradient(135deg, #e9d5ff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>The God's Tool</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <span className="nav-link" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Features</span>
        <span className="nav-link" onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}>How It Works</span>
        <span className="nav-link" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>Pricing</span>
        <button onClick={handleEnter} style={{ fontFamily: 'monospace', background: 'transparent', border: '1px solid rgba(167,139,250,0.4)', color: '#a78bfa', padding: '8px 20px', borderRadius: '4px', fontSize: '0.8rem', letterSpacing: '0.1em', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.2)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
          SIGN IN
        </button>
      </div>
    </nav>

    {/* ── HERO ── */}
    <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', textAlign: 'center', padding: '120px 24px 80px', position: 'relative', overflow: 'hidden' }}>
      {/* Grid bg */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', animation: 'gridFade 4s ease-in-out infinite' }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hgrid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#7c3aed" strokeWidth="0.4"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hgrid)" />
      </svg>
      {/* Orbs */}
      <div style={{ position: 'absolute', top: '20%', left: '15%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '25%', right: '10%', width: '250px', height: '250px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,70,229,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: '900px', animation: 'fadeUp 0.8s ease both' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '20px', padding: '6px 18px', marginBottom: '32px', fontFamily: 'monospace', fontSize: '0.72rem', color: '#a78bfa', letterSpacing: '0.15em' }}>
          ⚡ DATA INTELLIGENCE PLATFORM
        </div>

        <h1 className="hero-title" style={{ margin: '0 0 24px' }}>
          The God's Tool
        </h1>

        <p style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: '620px', margin: '0 auto 16px', fontFamily: 'Georgia, serif' }}>
          Connect any data source. Clean it with AI. Automate your pipelines. All from one browser tab — no engineers required.
        </p>

        <p style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#6d5fc7', letterSpacing: '0.1em', marginBottom: '20px', opacity: 0.7 }}>
          CSV · Google Sheets · MySQL · PostgreSQL · BigQuery · MongoDB
        </p>

        <p style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginBottom: '48px' }}>
          Free forever plan · No credit card required · Setup in under 2 minutes
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="cta-btn" onClick={handleEnter}>Start Cleaning Data Free</button>
          <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} style={{ fontFamily: 'Georgia, serif', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.65)', padding: '18px 40px', borderRadius: '6px', fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.05em' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(167,139,250,0.4)'; e.currentTarget.style.color = '#a78bfa' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)' }}>
            See How It Works
          </button>
        </div>
      </div>
      <div onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} style={{ position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', animation: 'float 2s ease-in-out infinite' }}>
        <span style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.15em' }}>SCROLL TO EXPLORE</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
      </div>
    </section>

    {/* ── STATS BAR ── */}
    <div style={{ background: 'rgba(124,58,237,0.08)', borderTop: '1px solid rgba(167,139,250,0.1)', borderBottom: '1px solid rgba(167,139,250,0.1)', padding: '0 24px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { val: '∞', label: 'Data Sources' },
          { val: '🔍', label: 'Schema Detector' },
          { val: 'AI', label: 'Powered Cleaning' },
          { val: '1', label: 'Everything in Browser Tab' },
        ].map((s, i) => (
          <div key={i} className="stat-item" style={{ padding: '28px 40px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 900, background: 'linear-gradient(135deg, #e9d5ff, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', marginTop: '6px', textTransform: 'uppercase' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>

    {/* ── FEATURES ── */}
    <section id="features" style={{ padding: '100px 24px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '64px' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#7c3aed', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '16px' }}>What It Does</div>
        <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>Everything your data needs.</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: '0.85rem', marginTop: '12px' }}>One platform. Zero compromises.</p>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', fontSize: '0.72rem', marginTop: '8px' }}>Built by a data professional with 4+ years of enterprise pipeline experience.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {[
          { icon: '⚡', title: 'AI-Powered Cleaning', desc: 'Detect nulls, fix formats, remove duplicates, and standardize columns — automatically. Claude AI does the heavy lifting.', delay: '0s' },
          { icon: '🔌', title: 'Connect Anything', desc: 'CSV, Google Sheets, MySQL, PostgreSQL, BigQuery, MongoDB, GA4 — plug in any source in seconds.', delay: '0.1s' },
          { icon: '🔄', title: 'Pipeline Automation', desc: 'Build no-code data flows that run on a schedule. Transform, join, filter, and export without writing a line.', delay: '0.2s' },
          { icon: '📊', title: 'Instant Analysis', desc: 'Profile your data instantly. Distributions, correlations, outliers — visualized before you even ask.', delay: '0.3s' },
          { icon: '🔒', title: 'Secure by Default', desc: 'Your data never leaves your session without permission. Encrypted in transit, zero third-party sharing.', delay: '0.4s' },
          { icon: '🔒', title: 'Secure Tunneling', desc: 'Connect private databases behind firewalls — no public IP or firewall changes needed. A lightweight agent runs locally and bridges your backend securely.', delay: '0.5s' },
        ].map((f, i) => (
          <div key={i} className="feature-card" style={{ animationDelay: f.delay }}>
            <div style={{ fontSize: '2rem', marginBottom: '16px', filter: 'drop-shadow(0 0 12px rgba(124,58,237,0.5))' }}>{f.icon}</div>
            <div style={{ fontFamily: '"Palatino Linotype", Georgia, serif', fontSize: '1.05rem', fontWeight: 700, marginBottom: '10px', color: 'rgba(255,255,255,0.9)' }}>{f.title}</div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </section>

    {/* ── HOW IT WORKS ── */}
    <section id="how" style={{ padding: '100px 24px', background: 'rgba(124,58,237,0.04)', borderTop: '1px solid rgba(167,139,250,0.07)', borderBottom: '1px solid rgba(167,139,250,0.07)' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#7c3aed', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '16px' }}>The Process</div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>Three steps to clean data.</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {[
            { n: '1', title: 'Connect Your Source', body: 'Upload a CSV, paste a Google Sheet link, or connect your database. The God\'s Tool recognizes your schema instantly.' },
            { n: '2', title: 'Let AI Clean & Profile', body: 'Our AI scans every column, flags issues, suggests fixes, and applies transformations — all reviewable before you confirm.' },
            { n: '3', title: 'Automate & Export', body: 'Set a pipeline schedule, push to your warehouse, or download clean data. Your workflow, fully automated.' },
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
              <div className="step-num">{step.n}</div>
              <div style={{ paddingTop: '8px' }}>
                <div style={{ fontFamily: '"Palatino Linotype", Georgia, serif', fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>{step.title}</div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.75 }}>{step.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

{/* ── DEMO VIDEO ── */}
    <section style={{ padding: '100px 24px', background: 'rgba(79,70,229,0.04)', borderTop: '1px solid rgba(167,139,250,0.07)', borderBottom: '1px solid rgba(167,139,250,0.07)' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#7c3aed', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '16px' }}>See It In Action</div>
        <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, margin: '0 0 16px', letterSpacing: '-0.02em' }}>Watch the AI clean your data live.</h2>
        <p style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.75, marginBottom: '48px', maxWidth: '560px', margin: '0 auto 48px' }}>Upload a messy CSV. Watch the platform detect issues, suggest fixes, and produce clean output — in seconds.</p>
<div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(167,139,250,0.2)', boxShadow: '0 0 60px rgba(124,58,237,0.15)', background: '#000' }}>
          {demoPlaying ? (
            <iframe
              src="https://www.youtube-nocookie.com/embed/YMY6fx731Ps?autoplay=1&rel=0&modestbranding=1&showinfo=0&controls=1&iv_load_policy=3"
              title="The God's Tool Demo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              frameBorder="0"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
            />
          ) : (
            <div onClick={() => setDemoPlaying(true)} style={{ position: 'absolute', inset: 0, cursor: 'pointer' }}>
              <img
                src="https://img.youtube.com/vi/YMY6fx731Ps/maxresdefault.jpg"
                alt="Demo Video"
                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://img.youtube.com/vi/YMY6fx731Ps/hqdefault.jpg' }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)' }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(255,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 32px rgba(255,0,0,0.5)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
              </div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '32px', justifyContent: 'center', marginTop: '40px', flexWrap: 'wrap' }}>
          {[
            { icon: '📥', text: 'Upload any CSV or sheet' },
            { icon: '🤖', text: 'AI detects every issue' },
            { icon: '✅', text: 'One-click clean export' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'monospace', fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>
              <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
              {item.text}
            </div>
          ))}
        </div>
        <div style={{ marginTop: '48px' }}>
          <button className="cta-btn" onClick={handleEnter}>Try It Free — No Card Needed</button>
        </div>
      </div>
    </section>

    {/* ── ALERT SECTION ── */}
    <section style={{ padding: '100px 24px', maxWidth: '820px', margin: '0 auto' }}>
      <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(167,139,250,0.18)', borderRadius: '20px', padding: '56px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '220px', height: '220px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,70,229,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '20px', padding: '6px 18px', marginBottom: '28px', fontFamily: 'monospace', fontSize: '0.72rem', color: '#f87171', letterSpacing: '0.15em' }}>
            🔔 ANOMALY ALERTS
          </div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 900, margin: '0 0 20px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            We wake up before your Saturdays do.
          </h2>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1rem, 2vw, 1.15rem)', color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, maxWidth: '580px', margin: '0 auto 40px' }}>
            Something went sideways in your pipeline at 2 AM — your data drifted, a schema broke, row counts dropped to zero. Before your senior even opens Slack on Monday morning, <span style={{ color: '#a78bfa', fontStyle: 'italic' }}>you already know, you already fixed it, and you already moved on.</span>
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '40px', textAlign: 'left' }}>
            {[
              { icon: '📉', title: 'Data drift detected', desc: 'Unusual volume drops, column nulls spiking, distribution shifts — caught the moment they happen.' },
              { icon: '🔗', title: 'Pipeline failures', desc: 'A connector went silent, a cron job missed its window, a schema changed upstream. You hear it first.' },
              { icon: '🧬', title: 'Schema anomalies', desc: 'New columns appeared, data types flipped, a table got truncated. Alerts land in your inbox instantly.' },
            ].map((item, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(167,139,250,0.1)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ fontSize: '1.4rem', marginBottom: '10px' }}>{item.icon}</div>
                <div style={{ fontFamily: '"Palatino Linotype", Georgia, serif', fontSize: '0.92rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: '6px' }}>{item.title}</div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'rgba(255,255,255,0.38)', lineHeight: 1.7 }}>{item.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', background: 'rgba(10,15,28,0.7)', border: '1px solid rgba(99,179,237,0.2)', borderRadius: '10px', padding: '16px 24px', fontFamily: 'monospace', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'left' }}>
            <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>📬</span>
            <span><span style={{ color: '#38bdf8' }}>alert@thegodstool.com</span> → <span style={{ color: '#86efac' }}>you@company.com</span><br/><span style={{ opacity: 0.55, fontSize: '0.72rem' }}>Sat 07:14 AM · "Row count in orders_fact dropped 94% since last run."</span></span>
          </div>
        </div>
      </div>
    </section>

    {/* ── PRICING ── */}
    <section id="pricing" style={{ padding: '100px 24px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#7c3aed', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '16px' }}>Pricing</div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>Start free. Scale when ready.</h2>
          <p style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#fbbf24', marginTop: '16px', letterSpacing: '0.05em' }}>
            ⏳ Lock in current pricing — rates increase soon
          </p>
        </div>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { name: 'Free', price: '$0', period: 'forever', features: ['CSV & Google Sheets', 'GA4 connector', 'Basic analysis', 'Data cleaning'], featured: false },
            { name: 'Lite', price: '$9', period: '/month', features: ['All data sources', 'Full pipeline builder', 'CSV cleaning', 'SQL translator'], featured: false },
            { name: 'Starter', price: '$17', period: '/month', features: ['Everything in Lite', '35 AI transforms/day', 'Email support'], featured: false },
            { name: 'Pro', price: '$35', period: '/month', features: ['Everything in Starter', '110 AI transforms/day', '5 concurrent logins', 'Priority support'], featured: true },
            { name: 'Team', price: '$71', period: '/month', features: ['Everything in Pro', '150 AI transforms/day', '15 concurrent logins', 'Priority support'], featured: false },
          ].map((plan, i) => (
            <div key={i} className={`pricing-card${plan.featured ? ' featured' : ''}`}>
              {plan.featured && <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white', fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.15em', padding: '4px 16px', borderRadius: '20px', whiteSpace: 'nowrap' }}>MOST POPULAR</div>}
              <div style={{ fontFamily: '"Palatino Linotype", Georgia, serif', fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>{plan.name}</div>
              <div style={{ marginBottom: '24px' }}>
                <span style={{ fontSize: '2.2rem', fontWeight: 900, background: 'linear-gradient(135deg, #e9d5ff, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{plan.price}</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginLeft: '4px' }}>{plan.period}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
                {plan.features.map(f => (
                  <div key={f} style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span style={{ color: '#7c3aed', flexShrink: 0 }}>✓</span>{f}
                  </div>
                ))}
              </div>
              <button onClick={handleEnter} style={{ width: '100%', padding: '11px', borderRadius: '6px', border: plan.featured ? 'none' : '1px solid rgba(255,255,255,0.12)', background: plan.featured ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'rgba(255,255,255,0.04)', color: 'white', fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'opacity 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
                {plan.name === 'Free' ? 'Start Free' : plan.featured ? 'Start Pro Trial' : 'Get Started'}
              </button>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginTop: '32px' }}>
          💳 Cancel anytime · 🔒 7-day money-back guarantee on all paid plans
        </p>
      </div>
    </section>

    {/* ── FINAL CTA ── */}
    <section style={{ padding: '80px 24px', textAlign: 'center', borderTop: '1px solid rgba(167,139,250,0.08)' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 900, margin: '0 0 16px', letterSpacing: '-0.02em' }}>Still deciding?</h2>
        <p style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)', marginBottom: '32px' }}>Try it free — no credit card needed. Upgrade only when you're ready.</p>
        <button className="cta-btn" onClick={handleEnter}>Start Free Now</button>
      </div>
    </section>

    {/* ── FOOTER ── */}
    <footer style={{ padding: '48px 24px 32px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '24px' }}>
        <img src={logo} alt="logo" style={{ height: '24px', width: '24px' }} />
        <span style={{ fontFamily: '"Palatino Linotype", Georgia, serif', fontWeight: 900, fontSize: '0.95rem', background: 'linear-gradient(135deg, #e9d5ff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>The God's Tool</span>
      </div>
      <p style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', marginBottom: '20px', lineHeight: 1.8 }}>
        Google Sign-In is used solely for account authentication. Google Sheets access is optional and only activated when you explicitly connect a sheet. We do not access, store, or share any Google data without your action.
      </p>
      <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginBottom: '28px' }}>
        <a href="/privacy" style={{ color: '#6d5fc7', fontSize: '0.75rem', fontFamily: 'monospace', textDecoration: 'none', opacity: 0.7 }}>Privacy Policy</a>
        <a href="/terms" style={{ color: '#6d5fc7', fontSize: '0.75rem', fontFamily: 'monospace', textDecoration: 'none', opacity: 0.7 }}>Terms of Service</a>
        <a href="/contact" style={{ color: '#6d5fc7', fontSize: '0.75rem', fontFamily: 'monospace', textDecoration: 'none', opacity: 0.7 }}>Contact</a>
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: 'rgba(255,255,255,0.12)', letterSpacing: '0.08em' }}>© 2025 The God's Tool · Built for data professionals</div>
    </footer>

    {/* ── INDRA POPUP ── */}
    {showIndra && (
      <div style={{ position: 'fixed', bottom: '32px', right: '32px', zIndex: 999, width: '320px', background: 'linear-gradient(145deg, #0a0820 0%, #110d2e 60%, #0d1a3a 100%)', border: '1px solid rgba(99,179,237,0.25)', borderRadius: '12px', boxShadow: '0 0 40px rgba(66,153,225,0.15), 0 8px 32px rgba(0,0,0,0.6)', overflow: 'hidden', animation: 'indraSlide 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
        <div style={{ position: 'relative', height: '240px', overflow: 'hidden' }}>
          <img src="https://i.postimg.cc/DfcCXhSJ/Indra.png" alt="Indra" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%', filter: 'brightness(0.75) saturate(1.4) contrast(1.1)' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, #0a0820 100%)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(66,153,225,0.18) 0%, transparent 70%)', animation: 'indraLightning 2.5s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', bottom: '8px', left: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.1rem' }}>⚡</span>
            <span style={{ fontFamily: 'Georgia, serif', color: '#90cdf4', fontSize: '1rem', fontWeight: 700, letterSpacing: '0.15em', textShadow: '0 0 12px rgba(66,153,225,0.8)' }}>INDRA</span>
            <span style={{ fontFamily: 'Georgia, serif', color: '#63b3ed', fontSize: '0.65rem', opacity: 0.7, letterSpacing: '0.1em' }}>GOD OF RAIN & THUNDER</span>
          </div>
        </div>
        <div style={{ padding: '14px 16px 16px' }}>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '0.82rem', lineHeight: 1.7, color: '#a0c4e8', margin: 0, fontStyle: 'italic' }}>
            "I used this tool in the 1990s to identify vulnerable areas that needed rain. Now — due to the sins of people — I follow no rules. To rain or not to rain... is simply my choice."
          </p>
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowIndra(false)} style={{ fontFamily: 'Georgia, serif', background: 'transparent', border: '1px solid rgba(99,179,237,0.3)', color: '#63b3ed', padding: '5px 16px', borderRadius: '4px', fontSize: '0.75rem', letterSpacing: '0.1em', cursor: 'pointer' }}>Understood</button>
          </div>
        </div>
      </div>
    )}

    {/* ── LOGIN MODAL ── */}
    {showLogin && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(5,8,15,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
        <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: '400px', margin: '0 16px', background: 'rgba(10,15,28,0.95)', border: '1px solid rgba(99,179,237,0.15)', borderRadius: '12px', padding: '36px 32px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Floating SQL particles */}
          {['SELECT *','JOIN','GROUP BY','WHERE','AVG()','COUNT(*)'].map((word, i) => (
            <div key={i} style={{ position: 'absolute', left: `${8 + (i * 15) % 80}%`, top: `${65 + (i * 8) % 30}%`, fontFamily: 'monospace', fontSize: '0.65rem', color: '#38bdf8', opacity: 0.1, pointerEvents: 'none', animation: `float-up ${3 + (i % 3)}s ease-in ${i * 0.6}s infinite`, userSelect: 'none' }}>{word}</div>
          ))}
          <div style={{ textAlign: 'center', marginBottom: '4px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(30,64,175,0.25)', border: '1px solid rgba(99,179,237,0.2)', marginBottom: '14px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
              </svg>
            </div>
            <div style={{ fontFamily: '"Palatino Linotype", Georgia, serif', fontSize: '1.5rem', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.04em' }}>The God's Tool</div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#38bdf8', letterSpacing: '0.2em', marginTop: '6px', opacity: 0.7 }}>DATA · INTELLIGENCE · PIPELINE</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {[['∞','Data Sources'],['⚡','Real-time'],['🔒','Encrypted']].map(([icon, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(30,64,175,0.15)', border: '1px solid rgba(99,179,237,0.15)', borderRadius: '20px', padding: '4px 12px', fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                <span style={{ fontSize: '0.8rem' }}>{icon}</span>{label}
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(99,179,237,0.1)' }} />
          <button onClick={handleGoogleLogin} className="auth-btn-google" disabled={isGoogleLoading}>
            {isGoogleLoading ? <span className="btn-spinner" /> : (<>
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              Continue with Google
            </>)}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(99,179,237,0.12)' }} />
            <span style={{ color: '#475569', fontSize: '0.78rem', fontFamily: 'monospace' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(99,179,237,0.12)' }} />
          </div>
          <input type="email" placeholder="you@example.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="auth-input" />
          <input type="password" placeholder="Password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} className="auth-input" />
          {loginError && (
            <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: '6px', padding: '10px 14px', color: '#fca5a5', fontSize: '0.82rem', fontFamily: 'monospace' }}>⚠ {loginError}</div>
          )}
          <button onClick={() => handleLogin()} className="auth-btn-primary" disabled={isLoginLoading}>{isLoginLoading ? <span className="btn-spinner" /> : (isRegisterMode ? 'CREATE ACCOUNT' : 'ACCESS THE TOOL')}</button>
          {!isRegisterMode && !showForgot && (
            <div style={{ textAlign: 'center' }}>
              <span onClick={() => { setShowForgot(true); setForgotMsg(''); setForgotError('') }} style={{ color: '#38bdf8', fontSize: '0.78rem', fontFamily: 'monospace', cursor: 'pointer', textDecoration: 'underline' }}>Forgot password?</span>
            </div>
          )}
          {showForgot && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(30,64,175,0.08)', border: '1px solid rgba(99,179,237,0.15)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontFamily: 'monospace' }}>Enter your email to receive a reset link:</div>
              <input type="email" placeholder="you@example.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} className="auth-input" />
              {forgotError && <div style={{ color: '#fca5a5', fontSize: '0.78rem', fontFamily: 'monospace' }}>⚠ {forgotError}</div>}
              {forgotMsg && <div style={{ color: '#86efac', fontSize: '0.78rem', fontFamily: 'monospace' }}>✓ {forgotMsg}</div>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleForgotPassword} className="auth-btn-primary" style={{ flex: 1, padding: '10px' }}>Send Reset Link</button>
                <button onClick={() => setShowForgot(false)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid rgba(99,179,237,0.2)', borderRadius: '6px', color: '#94a3b8', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.85rem' }}>Cancel</button>
              </div>
            </div>
          )}
          <div style={{ textAlign: 'center' }}>
            {isRegisterMode ? (
              <><span style={{ color: '#475569', fontSize: '0.78rem', fontFamily: 'monospace' }}>Already have an account? </span><span onClick={() => { setIsRegisterMode(false); setLoginError('') }} style={{ color: '#38bdf8', fontSize: '0.78rem', fontFamily: 'monospace', cursor: 'pointer', textDecoration: 'underline' }}>Sign in</span></>
            ) : (
              <><span style={{ color: '#475569', fontSize: '0.78rem', fontFamily: 'monospace' }}>Don't have an account? </span><span onClick={() => { setIsRegisterMode(true); setLoginError('') }} style={{ color: '#38bdf8', fontSize: '0.78rem', fontFamily: 'monospace', cursor: 'pointer', textDecoration: 'underline' }}>Register</span></>
            )}
          </div>
          <p style={{ color: '#334155', fontSize: '0.72rem', textAlign: 'center', margin: 0, fontFamily: 'monospace', lineHeight: 1.6 }}>
            By continuing you agree to The God's Tool's{' '}
            <a href="/terms" target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>Terms of Service</a>{' '}and{' '}
            <a href="/privacy" target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>Privacy Policy</a>
          </p>
          <button onClick={() => setShowLogin(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '1.2rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>
      </div>
    )}
  </div>
)
  if (entered && userPlan === 'none') return (
    <div style={{ minHeight: '100vh', background: '#07050f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '24px', padding: '24px' }}>
      <div style={{ textAlign: 'center', maxWidth: '480px' }}>
        <img src={logo} alt="logo" style={{ height: '64px', width: '64px', marginBottom: '16px' }} />
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.8rem', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Welcome to The God's Tool</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: '0.85rem', marginBottom: '32px' }}>Get started for free or unlock the full platform</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {/* Free tier */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px 24px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ color: 'white', fontWeight: 700, fontFamily: 'Georgia, serif', fontSize: '1rem' }}>Free</span>
              <span style={{ color: '#4ade80', fontFamily: 'monospace', fontSize: '0.78rem', background: 'rgba(74,222,128,0.1)', padding: '2px 10px', borderRadius: '20px', border: '1px solid rgba(74,222,128,0.2)' }}>No credit card</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              {['✓ CSV upload', '✓ Google Sheets', '✓ Google Analytics', '✓ Data analysis & cleaning', '✗ Other data sources (locked)', '✗ AI features (locked)'].map(f => (
                <div key={f} style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: f.startsWith('✗') ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.65)' }}>{f}</div>
              ))}
            </div>
            <button
              onClick={() => { localStorage.setItem('datapro_plan', 'free'); setUserPlan('free'); }}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'white', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'Georgia, serif' }}
            >
              Continue Free
            </button>
          </div>

          {/* Paid tier */}
          <div style={{ background: 'rgba(124,58,237,0.1)', border: '2px solid rgba(124,58,237,0.4)', borderRadius: '12px', padding: '20px 24px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ color: 'white', fontWeight: 700, fontFamily: 'Georgia, serif', fontSize: '1rem' }}>Paid Plans</span>
              <span style={{ color: '#a78bfa', fontFamily: 'monospace', fontSize: '0.78rem' }}>from $9/mo</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              {['✓ All data sources (MySQL, Postgres, BigQuery…)', '✓ AI-powered data cleaning', '✓ Unlimited pipeline automation', '✓ Priority support'].map(f => (
                <div key={f} style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)' }}>{f}</div>
              ))}
            </div>
            <button
              onClick={() => navigate('/pricing')}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'Georgia, serif' }}
            >
              View Plans →
            </button>
          </div>
        </div>

        <span onClick={() => {
          const token = localStorage.getItem('datapro_token')
          if (token) fetch(`${import.meta.env.VITE_AUTH_URL}/api/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
          localStorage.removeItem('datapro_logged_in'); localStorage.removeItem('datapro_plan'); setUserPlan('none'); setEntered(false); setShowLogin(false);
        }} style={{ color: '#475569', fontFamily: 'monospace', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline' }}>
          Sign out
        </span>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen" style={{ background: '#07050f' }}>
      <Sidebar 
  onOpenNotif={() => setShowNotif(true)} 
  unread={unread} 
  isExpanded={sidebarExpanded}
  onToggleExpand={() => setSidebarExpanded(!sidebarExpanded)}
  onLogout={() => {
    const token = localStorage.getItem('datapro_token')
    if (token) fetch(`${import.meta.env.VITE_AUTH_URL}/api/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    localStorage.removeItem('datapro_logged_in'); localStorage.removeItem('datapro_plan'); setUserPlan('none'); setEntered(false); setShowLogin(false);
  }}
/>
      
      <main className={`flex-1 min-h-screen overflow-auto transition-all duration-300 ${sidebarExpanded ? 'ml-64' : 'ml-16'}`}>
        {/* The floating hamburger menu that used to be here has been removed and moved inside the Sidebar */}
        
        <Routes>
          <Route path="/" element={<DataSources />} />
          <Route path="/sources" element={<DataSources />} />
          <Route path="/catalog" element={<DataCatalog />} />
          <Route path="/flow" element={<Flow />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/audit" element={<AuditLogs />} />
          <Route path="/docs" element={<Documentation />} />
          <Route path="/tunneling" element={<Tunneling />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/pricing" element={<Pricing />} />
        </Routes>
      </main>
      
      {showNotif && <NotificationPanel onClose={() => setShowNotif(false)} />}
    </div>
  )
}
