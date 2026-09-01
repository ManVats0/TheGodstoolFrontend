import logo from '../the_gods_tool_logo_3d.png'
import analysisBeforeImg from './ANALYSIS SHOWCASE.png'
import postTransformAfterImg from './post transformation overview.png'
import pipelineBuilderImg from './pipeline builder.png'
import transformTypesImg from './TYPES OF TRANSFORMATIONS OVERVIEW.png'
import cronJobsImg from './pipeline creation cron jobs.png'
import heroClipA from './preview_A_sql_reveal.mp4'
import heroClipB from './preview_B_stats_reveal.mp4'
import ResetPassword from './pages/ResetPassword'
import Pricing from './pages/Pricing'
import ThankYou from './pages/ThankYou'
// import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
// import Faq from './pages/Faq'
import { useState, useEffect, useRef } from 'react'
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
import Blog from './pages/Blog'
import Feedback from './pages/Feedback'

const GOOGLE_CLIENT_ID = '973595012454-ojh9i31u6ocq5l12t8gccer8dlc8gaim.apps.googleusercontent.com'

const ROTATING_PHRASES = [
  'in one platform.',
  'in minutes, not weeks.',
]

function redirectToGoogleOAuth() {
  const redirectUri = `${import.meta.env.VITE_AUTH_URL}/api/auth/google/callback`
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account'
  })
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

function getPasswordStrength(pw: string) {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (!pw) return { label: '', color: 'transparent', pct: 0 }
  if (score <= 1) return { label: 'Weak', color: '#f87171', pct: 25 }
  if (score <= 3) return { label: 'Okay', color: '#fbbf24', pct: 55 }
  if (score === 4) return { label: 'Good', color: '#4ade80', pct: 80 }
  return { label: 'Strong', color: '#22c55e', pct: 100 }
}

function LineIcon({ name, size = 32, color = '#a78bfa' }: { name: string; size?: number; color?: string }) {
  const paths: Record<string, JSX.Element> = {
    zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>,
    refresh: <><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></>,
    chart: <><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    database: <><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4.03 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" /></>,
    clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
    alert: <><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
    filter: <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />,
    book: <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>,
    cpu: <><rect x="4" y="4" width="16" height="16" rx="2" ry="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" /></>,
    check: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>,
    trendDown: <><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" /></>,
    layers: <><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></>,
    mail: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></>,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  )
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
const [showForceLogout, setShowForceLogout] = useState(false)
const [pendingGooglePayload, setPendingGooglePayload] = useState<{ email: string; googleId: string; name: string } | null>(null)
const [regName, setRegName] = useState('')
const [regNickname, setRegNickname] = useState('')
const [confirmPassword, setConfirmPassword] = useState('')
const [showTrialWelcome, setShowTrialWelcome] = useState(false)
const [regFeeling, setRegFeeling] = useState('')
const forceLogoutRef = useRef<HTMLButtonElement>(null)
const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null)
const [phraseIndex, setPhraseIndex] = useState(0)
const [phraseVisible, setPhraseVisible] = useState(true)

useEffect(() => {
  const interval = setInterval(() => {
    setPhraseVisible(false)
    setTimeout(() => {
      setPhraseIndex(i => (i + 1) % ROTATING_PHRASES.length)
      setPhraseVisible(true)
    }, 350)
  }, 2600)
  return () => clearInterval(interval)
}, [])

useEffect(() => {
  if (userPlan !== 'trial') { setTrialDaysLeft(null); return }
  const expiresStr = localStorage.getItem('datapro_plan_expires')
  if (!expiresStr) { setTrialDaysLeft(null); return }
  const msLeft = new Date(expiresStr).getTime() - Date.now()
  setTrialDaysLeft(Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24))))
}, [userPlan])

useEffect(() => {
  if (showForceLogout && forceLogoutRef.current) {
    forceLogoutRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}, [showForceLogout])

useEffect(() => {
  if (location.pathname !== '/docs') {
    localStorage.setItem('datapro_last_page', location.pathname)
  }
}, [location.pathname]) // Default to true if you prefer it open

useEffect(() => {
  const titles: Record<string, string> = {
    '/': "The God's Tool — No-Code ETL & Data Pipeline Platform",
    '/pricing': "Pricing — The God's Tool",
    '/contact': "Contact — The God's Tool",
    '/blog': "Blog — The God's Tool",
    '/terms': "Terms of Service — The God's Tool",
    '/feedback': "Feedback — The God's Tool",
  }
  document.title = titles[location.pathname] || "The God's Tool"
}, [location.pathname])
  const notifications = useStore(s => s.notifications)
  const readIds = useStore(s => s.readIds)
  const unread = notifications.filter(n => !readIds.has(n.id)).length

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
        if (planData.planExpiresAt) localStorage.setItem('datapro_plan_expires', planData.planExpiresAt)
        else localStorage.removeItem('datapro_plan_expires')
        setUserPlan(plan)
      })
      .catch(() => { /* ignore */ })
      .finally(() => {
        setEntered(true)
        navigate('/', { replace: true })
      })
  }, [location.pathname])

  const [heroClipIndex, setHeroClipIndex] = useState(0)
  const heroClips = [heroClipA, heroClipB]
  const [showAllFeatures, setShowAllFeatures] = useState(false)
  const [sideEmail, setSideEmail] = useState('')
  const [sidePassword, setSidePassword] = useState('')
  const [sideConfirmPassword, setSideConfirmPassword] = useState('')
  const [sideName, setSideName] = useState('')
  const [sideNickname, setSideNickname] = useState('')
  const [sideFeeling, setSideFeeling] = useState('')
  const [sideFormError, setSideFormError] = useState('')
  const handleEnter = (mode: 'login' | 'register' = 'register') => {
    setShowLogin(true)
    setIsRegisterMode(mode === 'register')
    setLoginError('')
  }
  const handleSideFormSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!sideEmail.trim() || !sidePassword.trim()) {
      setSideFormError('Please fill in at least email and password.')
      return
    }
    if (sidePassword !== sideConfirmPassword) {
      setSideFormError('Passwords do not match.')
      return
    }
    setSideFormError('')
    setLoginEmail(sideEmail)
    setLoginPassword(sidePassword)
    setConfirmPassword(sideConfirmPassword)
    setRegName(sideName)
    setRegNickname(sideNickname)
    setRegFeeling(sideFeeling)
    setIsRegisterMode(true)
    setShowLogin(true)
    setLoginError('')
  }

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Please enter email and password.')
      return
    }
    if (isRegisterMode) {
      if (loginPassword !== confirmPassword) {
        setLoginError('Passwords do not match.')
        return
      }
      if (getPasswordStrength(loginPassword).pct < 55) {
        setLoginError('Please choose a stronger password.')
        return
      }
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
        if (res.status === 429 && !isRegisterMode) {
          // Login limit reached — automatically log out oldest device and retry, no second click needed
          await handleForceLogin()
          return
        }
        setLoginError(data.error || (isRegisterMode ? 'Registration failed' : 'Login failed'))
        setShowForceLogout(false)
        return
      }
      setShowForceLogout(false)
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
        if (planData.planExpiresAt) localStorage.setItem('datapro_plan_expires', planData.planExpiresAt)
        else localStorage.removeItem('datapro_plan_expires')
        setUserPlan(plan)
        if (isRegisterMode && plan === 'trial') setShowTrialWelcome(true)
      } catch { /* ignore */ }
      setEntered(true)
      setShowLogin(false)
    } catch (err) {
      setLoginError('Cannot connect to server. Make sure backend is running.')
    } finally {
      setIsLoginLoading(false)
    }
  }

  const handleForceLogin = async () => {
    setIsLoginLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_AUTH_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword, forceLogout: true })
      })
      const data = await res.json()
      if (!res.ok) { setLoginError(data.error || 'Login failed'); return }
      setShowForceLogout(false)
      localStorage.setItem('datapro_logged_in', '1')
      localStorage.setItem('datapro_token', data.token)
      localStorage.setItem('datapro_email', data.email)
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
          if (!backendRes.ok) {
            setLoginError(data.error || 'Google login failed')
            if (backendRes.status === 429) {
              setPendingGooglePayload({ email: payload.email, googleId: payload.sub, name: payload.name })
              setShowForceLogout(true)
            }
            setIsGoogleLoading(false)
            return
          }
          setShowForceLogout(false)
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

  const handleForceGoogleLogin = async () => {
    if (!pendingGooglePayload) return
    setIsGoogleLoading(true)
    try {
      const backendRes = await fetch(`${import.meta.env.VITE_AUTH_URL}/api/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...pendingGooglePayload, forceLogout: true })
      })
      const data = await backendRes.json()
      if (!backendRes.ok) { setLoginError(data.error || 'Google login failed'); return }
      setShowForceLogout(false)
      setPendingGooglePayload(null)
      localStorage.setItem('datapro_logged_in', '1')
      localStorage.setItem('datapro_token', data.token)
      localStorage.setItem('datapro_email', data.email)
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
      setLoginError('Cannot connect to server. Make sure backend is running.')
    } finally {
      setIsGoogleLoading(false)
    }
  }

if (location.pathname === '/privacy.html' || location.pathname === '/privacy' || location.pathname === '/terms.html') return null

if (location.pathname === '/reset-password') return <Routes><Route path="/reset-password" element={<ResetPassword />} /></Routes>
if (location.pathname === '/pricing') return <Routes><Route path="/pricing" element={<Pricing />} /></Routes>
if (location.pathname === '/terms') return <Routes><Route path="/terms" element={<Terms />} /></Routes>
// if (location.pathname === '/faq') return <Routes><Route path="/faq" element={<Faq />} /></Routes>
if (location.pathname === '/contact') return <Routes><Route path="/contact" element={<Contact />} /></Routes>
if (location.pathname === '/blog') return <Routes><Route path="/blog" element={<Blog />} /></Routes>
if (location.pathname === '/feedback') return <Routes><Route path="/feedback" element={<Feedback />} /></Routes>
if (location.pathname === '/thank-you') return <Routes><Route path="/thank-you" element={<ThankYou />} /></Routes>

if (location.pathname === '/auth/callback') return (
  <div style={{ minHeight: '100vh', background: '#05030f', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', -apple-system, sans-serif", fontSize: '1rem' }}>
    Signing you in…
  </div>
)

if (!entered) return (
  <div style={{ minHeight: '100vh', background: '#05030f', color: 'white', fontFamily: "'Inter', -apple-system, sans-serif", overflowX: 'hidden' }}>
    <style>{`
      @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
      @keyframes fadeUp { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:translateY(0)} }
      @keyframes pulseGlow { 0%,100%{box-shadow:0 0 40px rgba(124,58,237,0.3)} 50%{box-shadow:0 0 80px rgba(124,58,237,0.7)} }
      @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
      @keyframes rotateOrb { 0%{transform:rotate(0deg) translateX(120px) rotate(0deg)} 100%{transform:rotate(360deg) translateX(120px) rotate(-360deg)} }
      @keyframes gridFade { 0%,100%{opacity:0.04} 50%{opacity:0.08} }
      .hero-title {
        font-family: 'Inter', -apple-system, sans-serif;
        font-size: clamp(2rem, 4.2vw, 3.4rem);
        font-weight: 700;
        letter-spacing: -0.03em;
        line-height: 1.08;
        color: #ffffff;
      }
      .hero-title .accent { color: #a78bfa; }
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
        font-family: 'Inter', -apple-system, sans-serif;
        background: #7c3aed;
        color: white;
        border: none;
        padding: 13px 38px;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 600;
        letter-spacing: 0.01em;
        cursor: pointer;
        transition: background 0.15s ease, transform 0.15s ease;
      }
      .cta-btn:hover { background: #6d28d9; transform: translateY(-1px); }
      .cta-btn-outline {
        font-family: 'Inter', -apple-system, sans-serif;
        background: transparent;
        color: #a78bfa;
        border: 1px solid rgba(167,139,250,0.4);
        padding: 16px 44px;
        border-radius: 6px;
        font-size: 0.92rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        cursor: pointer;
        text-transform: uppercase;
        transition: all 0.2s;
      }
      .cta-btn-outline:hover { background: rgba(124,58,237,0.15); transform: scale(1.03); }
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
        font-size: 0.95rem; font-family: "'Inter', -apple-system, sans-serif";
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
        cursor: pointer; font-family: "'Inter', -apple-system, sans-serif"; transition: opacity 0.2s;
      }
      .auth-btn-primary:hover { opacity: 0.88; }
      .auth-btn-google {
        display: flex; align-items: center; gap: 10px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 6px; padding: 12px 20px;
        font-size: 0.92rem; font-weight: 500; cursor: pointer;
        width: 100%; justify-content: center; color: #cbd5e1;
        font-family: "'Inter', -apple-system, sans-serif"; transition: background 0.2s;
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
        <img src={logo} alt="The God's Tool - AI data cleaning and ETL platform" style={{ height: '28px', width: '28px' }} /> 
        <span style={{ fontFamily: "'Inter', -apple-system, sans-serif", fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em', background: 'linear-gradient(135deg, #e9d5ff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>The God's Tool</span>      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <span className="nav-link" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Features</span>
        <span className="nav-link" onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}>How It Works</span>
        <span className="nav-link" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>Pricing</span>
        <a href="/contact" className="nav-link" style={{ textDecoration: 'none' }}>Contact</a>
<a href="/blog" className="nav-link" style={{ textDecoration: 'none' }}>Blog</a>
        <button onClick={() => handleEnter('login')} style={{ fontFamily: 'monospace', background: 'transparent', border: '1px solid rgba(167,139,250,0.4)', color: '#a78bfa', padding: '8px 20px', borderRadius: '4px', fontSize: '0.8rem', letterSpacing: '0.1em', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.2)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
          SIGN IN
        </button>
      </div>
    </nav>

    {/* ── HERO ── */}
    <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', textAlign: 'center', padding: '85px 24px 40px', position: 'relative', overflow: 'hidden' }}>
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

      <div style={{ position: 'relative', zIndex: 2, maxWidth: '1180px', width: '100%', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '32px', animation: 'fadeUp 0.8s ease both' }}>
      <div style={{ flex: '1 1 480px', maxWidth: '620px', minWidth: '300px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '20px', padding: '5px 16px', marginBottom: '10px', fontFamily: 'monospace', fontSize: '0.68rem', color: '#a78bfa', letterSpacing: '0.15em' }}>
           ETL SOFTWARE AND DATA INTELLIGENCE PLATFORM
        </div>

        <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#a78bfa', letterSpacing: '0.1em', marginBottom: '8px', textTransform: 'uppercase' }}>
          For Teams Who care about data quality, speed, and security
        </p>
        <h1 className="hero-title" style={{ margin: '0 0 8px' }}>
  Everything your data needs{' '}
  <span
    className="accent"
    style={{
      display: 'inline-block',
      minWidth: '15ch',
      textAlign: 'left',
      whiteSpace: 'nowrap',
      opacity: phraseVisible ? 1 : 0,
      transition: 'opacity 0.35s ease',
    }}
  >
    {ROTATING_PHRASES[phraseIndex]}
  </span>
</h1>

        {/* */}
<p style={{ fontSize: 'clamp(0.88rem, 1.5vw, 1.02rem)', color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, maxWidth: '600px', margin: '0 auto 10px', fontFamily: "'Inter', -apple-system, sans-serif" }}>
  Connect your database, sheet, or CRM. AI profiles it, cleans it, and pipelines it out — the work a data engineer would spend hours on, done in minutes.
</p>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', rowGap: '6px', columnGap: '10px', marginBottom: '12px', maxWidth: '640px', margin: '0 auto 12px' }}>
          {['CSV', 'Google Sheets', 'MySQL', 'PostgreSQL', 'BigQuery', 'MongoDB', 'AWS', 'Cloud Storage', 'Cloud SQL', 'Databricks', 'REST API', 'Google Analytics 4'].map((src, i, arr) => (
            <span key={src} style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: '#6d5fc7', letterSpacing: '0.08em', opacity: 0.7, whiteSpace: 'nowrap' }}>
              {src}{i < arr.length - 1 && <span style={{ marginLeft: '10px', opacity: 0.5 }}>·</span>}
            </span>
          ))}
        </div>

        <p style={{ fontFamily: 'monospace', fontSize: '0.66rem', color: 'rgba(255,255,255,0.35)', marginBottom: '14px' }}>
           14-day free trial · Full platform unlocked · No credit card required
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="cta-btn" onClick={() => handleEnter('register')}>Connect a Source</button>
          <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.65)', padding: '13px 32px', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.05em' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(167,139,250,0.4)'; e.currentTarget.style.color = '#a78bfa' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)' }}>
            See How It Works
          </button>
        </div>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '12px' }}>
          Built with years of experience handling sensitive, large-scale, systems in production · Data Security Guaranteed · Google OAuth Verified
        </p>
      </div>

      {/* ── SIDE SIGNUP FORM ── */}
      <form onSubmit={handleSideFormSubmit} style={{ flex: '1 1 340px', maxWidth: '380px', minWidth: '280px', background: 'rgba(10,15,28,0.85)', border: '1px solid rgba(99,179,237,0.18)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '7px', textAlign: 'left', backdropFilter: 'blur(6px)' }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0' }}>Start your 14-day free trial</div>
        <p style={{ fontFamily: 'monospace', fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', margin: '0 0 2px' }}>Full access, no card needed. Fill this once — confirm on the next screen.</p>
        <input type="email" placeholder="you@example.com" value={sideEmail} onChange={e => setSideEmail(e.target.value)} className="auth-input" style={{ padding: '8px 12px', fontSize: '0.8rem' }} required />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
          <input type="password" placeholder="Password" value={sidePassword} onChange={e => setSidePassword(e.target.value)} className="auth-input" style={{ padding: '8px 12px', fontSize: '0.8rem' }} required />
          <input type="password" placeholder="Repeat password" value={sideConfirmPassword} onChange={e => setSideConfirmPassword(e.target.value)} className="auth-input" style={{ padding: '8px 12px', fontSize: '0.8rem' }} required />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
          <input type="text" placeholder="Name" value={sideName} onChange={e => setSideName(e.target.value)} className="auth-input" style={{ padding: '8px 12px', fontSize: '0.8rem' }} />
          <input type="text" placeholder="Nickname" value={sideNickname} onChange={e => setSideNickname(e.target.value)} className="auth-input" style={{ padding: '8px 12px', fontSize: '0.8rem' }} />
        </div>
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.64rem', color: '#94a3b8', marginBottom: '4px' }}>How are you feeling right now?</div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {[
              { label: 'Excited' },
              { label: 'Calm' },
              { label: 'Nervous' },
              { label: 'Curious' },
              { label: 'Determined' },
            ].map(f => (
              <button
                key={f.label}
                type="button"
                onClick={() => setSideFeeling(f.label)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '3px',
                  background: sideFeeling === f.label ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.04)',
                  border: sideFeeling === f.label ? '1px solid rgba(167,139,250,0.5)' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '20px', padding: '3px 8px',
                  fontFamily: 'monospace', fontSize: '0.6rem', color: '#e2e8f0',
                  cursor: 'pointer', transition: 'all 0.15s'
                }}
              >
                <span>{f.emoji}</span>{f.label}
              </button>
            ))}
          </div>
        </div>
        {sideFormError && (
          <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: '6px', padding: '6px 10px', color: '#fca5a5', fontSize: '0.68rem', fontFamily: 'monospace' }}>⚠ {sideFormError}</div>
        )}
        <button type="submit" className="auth-btn-primary" style={{ padding: '9px', fontSize: '0.85rem' }}>CONTINUE →</button>
        <p style={{ fontFamily: 'monospace', fontSize: '0.56rem', color: 'rgba(255,255,255,0.25)', textAlign: 'center', margin: 0 }}>14-day free trial · No credit card required · Takes 30 seconds</p>
      </form>
      </div>
      <div onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} style={{ position: 'absolute', bottom: '14px', left: '50%', transform: 'translateX(-50%)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', animation: 'float 2s ease-in-out infinite' }}>
        <span style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.15em' }}>SCROLL TO EXPLORE</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
      </div>
    </section>

    {/* ── STATS BAR ── */}
    <div style={{ background: 'rgba(124,58,237,0.08)', borderTop: '1px solid rgba(167,139,250,0.1)', borderBottom: '1px solid rgba(167,139,250,0.1)', padding: '0 24px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { val: 'SQL', label: 'Editable & Copyable Pipelines' },
          { val: 'AUTO', label: 'Schema Change Detector' },
          { val: 'AI', label: 'Powered Cleaning' },
          { val: 'ALERT', label: 'Email Alerts on Data Anomalies' },
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
        <h2 style={{ 
  fontFamily: "'Inter', -apple-system, sans-serif", 
  fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', 
  fontWeight: 700, 
  margin: 0, 
  letterSpacing: '-0.03em', 
  lineHeight: 1.15 
}}>Messy data in. Clean answers out</h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', fontSize: '0.85rem', marginTop: '12px' }}>Connect, clean, automate — one platform, zero hires.</p>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace', fontSize: '0.72rem', marginTop: '8px' }}>Engineered with years of hands-on experience handling sensitive, large-scale, and multilingual data systems.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {[
          { icon: 'zap', title: 'AI-Powered Cleaning', desc: 'Detect nulls, fix formats, remove duplicates, and standardize columns — automatically. Or just write in plain English to generate a cleaning step. Claude AI does the heavy lifting.', delay: '0s' },
          { icon: 'shield', title: 'Your Data Never Leaves Home', desc: 'We tunnel into your database to clean it — nothing sits exposed on the internet, and you never touch a firewall setting.', delay: '0.1s' },
          { icon: 'alert', title: 'Issue Detector', desc: 'Auto-detects issues in your data before they break downstream.', delay: '0.2s' },
        ].map((f, i) => (
          <div key={i} className="feature-card" style={{ animationDelay: f.delay }}>
            <div style={{ marginBottom: '16px' }}><LineIcon name={f.icon} size={30} /></div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '1.05rem', fontWeight: 700, marginBottom: '10px', color: 'rgba(255,255,255,0.9)' }}>{f.title}</div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'rgba(255,255,255,0.58)', lineHeight: 1.7 }}>{f.desc}</div>
          </div>
        ))}
        {showAllFeatures && [
          { icon: 'link', title: 'Connect Anything', desc: 'CSV, Google Sheets, MySQL, PostgreSQL, BigQuery, MongoDB, GA4 — plug in any source in seconds.', delay: '0s' },
          { icon: 'refresh', title: 'Pipeline Automation', desc: 'Build no-code data flows that run on a schedule. Transform, join, filter, and export without writing a line.', delay: '0.05s' },
          { icon: 'chart', title: 'Instant Analysis', desc: 'Profile your data instantly. Distributions, correlations, outliers — visualized before you even ask.', delay: '0.1s' },
          { icon: 'database', title: 'Build Pipelines in SQL', desc: 'Skip the drag-and-drop if you\'d rather not. Write plain SQL in our built-in editor and get a live, editable pipeline — a real SQL interface for people who just want to do ground-level work on their data.', delay: '0.15s' },
          { icon: 'clock', title: 'Schedule Your Runs', desc: 'Set it once, then stop thinking about it. Every 5 seconds or once a month — pick your rhythm and the tool keeps the beat, even when you\'re not watching.', delay: '0.2s' },
          { icon: 'filter', title: 'Advanced Filter', desc: 'Instantly isolate the exact rows or values causing a data quality issue — no more scrolling through thousands of rows by hand.', delay: '0.25s' },
          { icon: 'book', title: 'Analyse', desc: 'Free analysis on every connected data source — a full data dictionary and data info, ready for you.', delay: '0.3s' },
        ].map((f, i) => (
          <div key={`extra-${i}`} className="feature-card" style={{ animationDelay: f.delay }}>
            <div style={{ marginBottom: '16px' }}><LineIcon name={f.icon} size={30} /></div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '1.05rem', fontWeight: 700, marginBottom: '10px', color: 'rgba(255,255,255,0.9)' }}>{f.title}</div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'rgba(255,255,255,0.58)', lineHeight: 1.7 }}>{f.desc}</div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', marginTop: '32px' }}>
        <button
          onClick={() => setShowAllFeatures(v => !v)}
          style={{ fontFamily: 'monospace', background: 'transparent', border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa', padding: '10px 28px', borderRadius: '6px', fontSize: '0.78rem', letterSpacing: '0.08em', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.15)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          {showAllFeatures ? 'SHOW LESS ↑' : 'SEE ALL FEATURES ↓'}
        </button>
      </div>
    </section>

    {/* ── HOW IT WORKS ── */}
    <section id="how" style={{ padding: '100px 24px', background: 'rgba(124,58,237,0.04)', borderTop: '1px solid rgba(167,139,250,0.07)', borderBottom: '1px solid rgba(167,139,250,0.07)' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#7c3aed', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '16px' }}>The Process</div>
          <h2 style={{ fontFamily: "'Inter', -apple-system, sans-serif", fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.15 }}>Three steps to clean data.</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {[
            { n: '1', icon: 'link', title: 'Connect Your Source', body: 'Upload a CSV, paste a Google Sheet link, or connect your database. The God\'s Tool recognizes your schema instantly.' },
            { n: '2', icon: 'zap', title: 'Let AI Clean & Profile', body: 'Our AI scans every column, flags issues, suggests fixes, and applies transformations — all reviewable before you confirm.' },
            { n: '3', icon: 'refresh', title: 'Automate & Export', body: 'Set a pipeline schedule, push to your warehouse, or download clean data. Your workflow, fully automated.' },
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
              <div className="step-num" style={{ position: 'relative' }}>
                <LineIcon name={step.icon} size={22} color="#fff" />
                <span style={{
                  position: 'absolute', bottom: '-6px', right: '-6px',
                  width: '18px', height: '18px', borderRadius: '50%',
                  background: '#0d0a1a', border: '1px solid rgba(167,139,250,0.4)',
                  fontSize: '0.62rem', fontWeight: 800, color: '#a78bfa',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>{step.n}</span>
              </div>
              <div style={{ paddingTop: '8px' }}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>{step.title}</div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.75 }}>{step.body}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '48px' }}>
          <button className="cta-btn" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>See Plans & Pricing</button>
        </div>
      </div>
    </section>

{/* ── LIVE DEMO REEL ── */}
<section style={{ padding: '80px 24px 20px', maxWidth: '900px', margin: '0 auto' }}>
  <div style={{ textAlign: 'center', marginBottom: '32px' }}>
    <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#7c3aed', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '16px' }}>See It Live</div>
    <h2 style={{ fontFamily: "'Inter', -apple-system, sans-serif", fontSize: 'clamp(1.6rem, 3.2vw, 2.4rem)', fontWeight: 700, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.15 }}>Cleaning rules run. SQL gets generated. Row counts update.</h2>
  </div>
  <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(167,139,250,0.25)', background: '#0a0714', boxShadow: '0 12px 50px rgba(124,58,237,0.2)', maxWidth: '760px', margin: '0 auto' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
      <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#ef4444', opacity: 0.6 }} />
      <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#eab308', opacity: 0.6 }} />
      <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#22c55e', opacity: 0.6 }} />
    </div>
    <video
      key={heroClipIndex}
      autoPlay
      muted
      playsInline
      onEnded={() => setHeroClipIndex(i => (i + 1) % heroClips.length)}
      style={{ width: '100%', display: 'block', aspectRatio: '16 / 9', objectFit: 'cover', background: '#05030f' }}
    >
      <source src={heroClips[heroClipIndex]} type="video/mp4" />
    </video>
  </div>
</section>

{/* ── BEFORE / AFTER SHOWCASE ── */}
<section style={{ padding: '100px 24px', maxWidth: '1100px', margin: '0 auto' }}>
  <div style={{ textAlign: 'center', marginBottom: '56px' }}>
    <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#7c3aed', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '16px' }}>Real Output</div>
    <h2 style={{ fontFamily: "'Inter', -apple-system, sans-serif", fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.15 }}>From messy to production-ready.</h2>
    <p style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'rgba(255,255,255,0.58)', marginTop: '12px' }}>37,880 rows analyzed, cleaned, and scheduled to stay clean — no code written.</p>
  </div>

  <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '28px' }}>
    {/* Center divider arrow — desktop only */}
    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 3, width: '44px', height: '44px', borderRadius: '50%', background: '#0d0a1a', border: '1px solid rgba(167,139,250,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(124,58,237,0.4)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
    </div>

    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#f87171', display: 'inline-block' }} />
        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#f87171', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Before — 221 problems found</span>
      </div>
      <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(167,139,250,0.15)', background: '#0a0714', boxShadow: '0 12px 40px rgba(0,0,0,0.4)' }}>
        {/* Fake browser chrome bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#ef4444', opacity: 0.6 }} />
          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#eab308', opacity: 0.6 }} />
          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#22c55e', opacity: 0.6 }} />
        </div>
        <div style={{ width: '100%', aspectRatio: '16 / 10', overflow: 'hidden', background: '#05030f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={analysisBeforeImg} alt="Analysis dashboard showing 221 data quality problems before cleaning" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} loading="lazy" />
        </div>
      </div>
    </div>

    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#4ade80', letterSpacing: '0.1em', textTransform: 'uppercase' }}>After — 100% dataset quality</span>
      </div>
      <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(124,58,237,0.35)', background: '#0a0714', boxShadow: '0 12px 40px rgba(124,58,237,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#ef4444', opacity: 0.6 }} />
          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#eab308', opacity: 0.6 }} />
          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#22c55e', opacity: 0.6 }} />
        </div>
        <div style={{ width: '100%', aspectRatio: '16 / 10', overflow: 'hidden', background: '#05030f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={postTransformAfterImg} alt="Post-transform preview showing cleaned data with duplicate rows removed" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} loading="lazy" />
        </div>
      </div>
    </div>
  </div>

  <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '28px', marginTop: '28px' }}>
    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 3, width: '44px', height: '44px', borderRadius: '50%', background: '#0d0a1a', border: '1px solid rgba(167,139,250,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(124,58,237,0.4)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
    </div>

    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#a78bfa', display: 'inline-block' }} />
        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#a78bfa', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Build — visual pipeline flow</span>
      </div>
      <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(167,139,250,0.15)', background: '#0a0714', boxShadow: '0 12px 40px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#ef4444', opacity: 0.6 }} />
          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#eab308', opacity: 0.6 }} />
          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#22c55e', opacity: 0.6 }} />
        </div>
        <div style={{ width: '100%', aspectRatio: '16 / 10', overflow: 'hidden', background: '#05030f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={pipelineBuilderImg} alt="Visual pipeline builder showing source to destination flow" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} loading="lazy" />
        </div>
      </div>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#4ade80', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Then — pick a transform &amp; schedule it</span>
      </div>
      <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(124,58,237,0.35)', background: '#0a0714', boxShadow: '0 12px 40px rgba(124,58,237,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#ef4444', opacity: 0.6 }} />
          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#eab308', opacity: 0.6 }} />
          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#22c55e', opacity: 0.6 }} />
        </div>
        <div style={{ width: '100%', aspectRatio: '16 / 10', overflow: 'hidden', background: '#05030f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={transformTypesImg} alt="Transform options: remove duplicates, fill missing, cap outliers, AI custom rules" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} loading="lazy" />
        </div>
      </div>
      <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(124,58,237,0.35)', background: '#0a0714', boxShadow: '0 12px 40px rgba(124,58,237,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#ef4444', opacity: 0.6 }} />
          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#eab308', opacity: 0.6 }} />
          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#22c55e', opacity: 0.6 }} />
        </div>
        <div style={{ width: '100%', aspectRatio: '16 / 10', overflow: 'hidden', background: '#05030f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={cronJobsImg} alt="Pipeline scheduling panel with cron jobs and automation options" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} loading="lazy" />
        </div>
      </div>
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
            ANOMALY ALERTS
          </div>
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 700, margin: '0 0 20px', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
            Know about data problems before they reach your reports.
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 'clamp(1rem, 2vw, 1.15rem)', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: '580px', margin: '0 auto 40px' }}>
            When a pipeline breaks at 2 AM — data drifts, a schema changes, row counts drop to zero — you get an alert immediately, not when someone notices the report looks wrong.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '40px', textAlign: 'left' }}>
            {[
              { icon: 'trendDown', title: 'Data drift detected', desc: 'Unusual volume drops, column nulls spiking, distribution shifts — caught the moment they happen.' },
              { icon: 'link', title: 'Pipeline failures', desc: 'A connector went silent, a cron job missed its window, a schema changed upstream. You hear it first.' },
              { icon: 'layers', title: 'Schema anomalies', desc: 'Your client won\'t call you asking why the columns moved and the numbers don\'t match last week\'s report — because you\'ll already know, and it\'ll already be fixed.' },
            ].map((item, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(167,139,250,0.1)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ marginBottom: '10px' }}><LineIcon name={item.icon} size={22} /></div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.92rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: '6px' }}>{item.title}</div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'rgba(255,255,255,0.58)', lineHeight: 1.7 }}>{item.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', background: 'rgba(10,15,28,0.7)', border: '1px solid rgba(99,179,237,0.2)', borderRadius: '10px', padding: '16px 24px', fontFamily: 'monospace', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'left' }}>
            <span style={{ flexShrink: 0 }}><LineIcon name="mail" size={20} /></span>
            <span><span style={{ color: '#38bdf8' }}>alert@thegodstool.com</span> → <span style={{ color: '#86efac' }}>you@company.com</span><br/><span style={{ opacity: 0.55, fontSize: '0.72rem' }}>Sat 07:14 AM · "Row count in orders_fact dropped 94% since last run."</span></span>
          </div>
        </div>
      </div>
    </section>

    {/* ── PRICING ── */}
    <section id="pricing" style={{ padding: '100px 24px', background: 'linear-gradient(180deg, rgba(124,58,237,0.05) 0%, rgba(251,191,36,0.02) 100%)', borderTop: '1px solid rgba(167,139,250,0.08)', borderBottom: '1px solid rgba(167,139,250,0.08)' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#7c3aed', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '16px' }}>Pricing</div>
          <h2 style={{ fontFamily: "'Inter', -apple-system, sans-serif", fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.15 }}>Priced by how much data you actually touch.</h2>
          <p style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#fbbf24', marginTop: '16px', letterSpacing: '0.05em' }}>
            Priced for teams who care about their data quality, not for the number of users or rows in a database.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { name: 'Lite', price: '$19', period: '/month', features: ['All data sources', 'Full pipeline builder', 'CSV cleaning', 'SQL translator'], featured: false },
            { name: 'Starter', price: '$39', period: '/month', features: ['Everything in Lite', '35 AI transforms/day', 'Email support'], featured: false },
            { name: 'Pro', price: '$79', period: '/month', features: ['Everything in Starter', '110 AI transforms/day', '5 concurrent logins', 'Priority support'], featured: true },
            { name: 'Team', price: '$199', period: '/month', features: ['Everything in Pro', '150 AI transforms/day', '15 concurrent logins', 'Priority support'], featured: false },
          ].map((plan, i) => (
            <div key={i} className={`pricing-card${plan.featured ? ' featured' : ''}`}>
              {plan.featured && <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white', fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.15em', padding: '4px 16px', borderRadius: '20px', whiteSpace: 'nowrap' }}>MOST POPULAR</div>}
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>{plan.name}</div>
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
              <button onClick={() => handleEnter('register')} style={{ width: '100%', padding: '11px', borderRadius: '6px', border: plan.featured ? 'none' : '1px solid rgba(255,255,255,0.12)', background: plan.featured ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'rgba(255,255,255,0.04)', color: 'white', fontFamily: "'Inter', -apple-system, sans-serif", fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'opacity 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
                {plan.name === 'Free' ? 'Start Free' : plan.featured ? 'Start Pro Trial' : 'Get Started'}
              </button>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginTop: '32px' }}>
         Cancel anytime · 14-day money-back guarantee on all paid plans
        </p>
        <p style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginTop: '12px' }}>
          Need more than Team? <a href="/pricing" style={{ color: '#a78bfa', textDecoration: 'underline' }}>View Enterprise pricing →</a>
        </p>
      </div>
    </section>

    {/* ── FINAL CTA ── */}
    <section style={{ padding: '80px 24px', textAlign: 'center', borderTop: '1px solid rgba(167,139,250,0.08)' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: "'Inter', -apple-system, sans-serif", fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 700, margin: '0 0 16px', letterSpacing: '-0.03em', lineHeight: 1.15 }}>Still deciding?</h2>
        <p style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)', marginBottom: '32px' }}>No sales call. No onboarding call. Connect a source and see what it finds.</p>
        <button className="cta-btn" onClick={() => handleEnter('register')}>Connect a Source</button>
      </div>
    </section>

    {/* ── FOOTER ── */}
    <footer style={{ padding: '48px 24px 32px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '24px' }}>
        <img src={logo} alt="The God's Tool - AI data cleaning and ETL platform" style={{ height: '24px', width: '24px' }} />
        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900, fontSize: '0.95rem', background: 'linear-gradient(135deg, #e9d5ff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>The God's Tool</span>
      </div>
      <p style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginBottom: '20px', lineHeight: 1.8 }}>
        Google Sign-In is used solely for account authentication. Google Sheets access is optional and only activated when you explicitly connect a sheet. We do not access, store, or share any Google data without your action.
      </p>
      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginBottom: '24px' }}>
        <a href="https://www.youtube.com/@TheGodsTool-DataPipeline" target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.4)', transition: 'color 0.2s', display: 'inline-flex' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#a78bfa' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.51 3.5 12 3.5 12 3.5s-7.51 0-9.38.56A3.02 3.02 0 0 0 .5 6.2 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.8 3.02 3.02 0 0 0 2.12 2.14c1.87.56 9.38.56 9.38.56s7.51 0 9.38-.56a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.8ZM9.75 15.5v-7l6.27 3.5-6.27 3.5Z"/></svg>
        </a>
        <a href="https://x.com/TheGodsToojsg0" target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.4)', transition: 'color 0.2s', display: 'inline-flex' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#a78bfa' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-7.6 8.7L23.3 22h-7.1l-5.6-6.9L4.2 22H1l8.2-9.3L.8 2h7.3l5 6.4L18.9 2Zm-1.2 18h1.9L7.4 4H5.3l12.4 16Z"/></svg>
        </a>
      </div>
      <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginBottom: '28px' }}>
        <a href="/faq.html" style={{ color: '#6d5fc7', fontSize: '0.75rem', fontFamily: 'monospace', textDecoration: 'none', opacity: 0.7 }}>FAQ</a>
        <a href="/privacy" style={{ color: '#6d5fc7', fontSize: '0.75rem', fontFamily: 'monospace', textDecoration: 'none', opacity: 0.7 }}>Privacy Policy</a>
        <a href="/terms" style={{ color: '#6d5fc7', fontSize: '0.75rem', fontFamily: 'monospace', textDecoration: 'none', opacity: 0.7 }}>Terms of Service</a>
        <a href="/refund.html" style={{ color: '#6d5fc7', fontSize: '0.75rem', fontFamily: 'monospace', textDecoration: 'none', opacity: 0.7 }}>Refund Policy</a>
        <a href="/feedback" style={{ color: '#6d5fc7', fontSize: '0.75rem', fontFamily: 'monospace', textDecoration: 'none', opacity: 0.7 }}>Feedback</a>
<a href="/contact" style={{ color: '#6d5fc7', fontSize: '0.75rem', fontFamily: 'monospace', textDecoration: 'none', opacity: 0.7 }}>Contact</a>
<a href="/blog" style={{ color: '#6d5fc7', fontSize: '0.75rem', fontFamily: 'monospace', textDecoration: 'none', opacity: 0.7 }}>Blog</a>
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: 'rgba(255,255,255,0.12)', letterSpacing: '0.08em' }}>© 2026 The God's Tool · Built for data professionals</div>
    </footer>

    {/* ── LOGIN MODAL ── */}
    {showLogin && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(5,8,15,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
        <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: '400px', margin: '0 16px', background: 'rgba(10,15,28,0.95)', border: '1px solid rgba(99,179,237,0.15)', borderRadius: '12px', padding: '36px 32px', display: 'flex', flexDirection: 'column', gap: '18px', maxHeight: '90vh', overflowY: 'auto' }}>
          {/* Floating SQL particles */}
          {/* {['SELECT *','JOIN','GROUP BY','WHERE','AVG()','COUNT(*)'].map((word, i) => (
            <div key={i} style={{ position: 'absolute', left: `${8 + (i * 15) % 80}%`, top: `${65 + (i * 8) % 30}%`, fontFamily: 'monospace', fontSize: '0.65rem', color: '#38bdf8', opacity: 0.1, pointerEvents: 'none', animation: `float-up ${3 + (i % 3)}s ease-in ${i * 0.6}s infinite`, userSelect: 'none' }}>{word}</div>
          ))} */}
          <div style={{ textAlign: 'center', marginBottom: '4px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(30,64,175,0.25)', border: '1px solid rgba(99,179,237,0.2)', marginBottom: '14px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
              </svg>
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '1.5rem', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.04em' }}>The God's Tool</div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#38bdf8', letterSpacing: '0.2em', marginTop: '6px', opacity: 0.7 }}>DATA · INTELLIGENCE · PIPELINE</div>
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

          {isRegisterMode && (
            <>
              <input type="text" placeholder="Your name (What do your stakeholders call you?)" value={regName} onChange={e => setRegName(e.target.value)} className="auth-input" />
              <input type="text" placeholder="Nickname (What does your mom call you?)" value={regNickname} onChange={e => setRegNickname(e.target.value)} className="auth-input" />
              <input type="password" placeholder="Repeat password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="auth-input" />

              {loginPassword && (
                <div style={{ marginTop: '-8px' }}>
                  <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${getPasswordStrength(loginPassword).pct}%`, background: getPasswordStrength(loginPassword).color, transition: 'width 0.25s ease, background 0.25s ease' }} />
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: getPasswordStrength(loginPassword).color, marginTop: '4px' }}>
                    {getPasswordStrength(loginPassword).label}
                  </div>
                </div>
              )}
            </>
          )}

          {loginError && (
            <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: '6px', padding: '10px 14px', color: '#fca5a5', fontSize: '0.82rem', fontFamily: 'monospace' }}>⚠ {loginError}</div>
          )}
          {showForceLogout && (
            <>
              <div style={{ textAlign: 'center', color: '#fca5a5', fontSize: '0.78rem', fontFamily: 'monospace', marginBottom: '-6px' }}>
                👆 Click below again to confirm and log in here
              </div>
              <button
                ref={forceLogoutRef}
                onClick={() => (pendingGooglePayload ? handleForceGoogleLogin() : handleForceLogin())}
                className="auth-btn-primary"
                disabled={isLoginLoading || isGoogleLoading}
                style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)' }}
              >
              {(isLoginLoading || isGoogleLoading) ? <span className="btn-spinner" /> : 'Log out oldest device & sign in here'}
              </button>
            </>
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
        <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", fontSize: '1.8rem', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Welcome to The God's Tool</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: '0.85rem', marginBottom: '32px' }}>Get started for free or unlock the full platform</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {/* Free tier */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px 24px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ color: 'white', fontWeight: 700, fontFamily: "'Inter', -apple-system, sans-serif", fontSize: '1rem' }}>Free</span>
              <span style={{ color: '#4ade80', fontFamily: 'monospace', fontSize: '0.78rem', background: 'rgba(74,222,128,0.1)', padding: '2px 10px', borderRadius: '20px', border: '1px solid rgba(74,222,128,0.2)' }}>No credit card</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              {['✓ CSV upload', '✓ Google Sheets', '✓ Google Analytics', '✓ Data profiling (view only)', '✗ AI-powered cleaning (locked)', '✗ Other data sources (locked)'].map(f => (
                <div key={f} style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: f.startsWith('✗') ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.65)' }}>{f}</div>
              ))}
            </div>
            <button
              onClick={() => { localStorage.setItem('datapro_plan', 'free'); setUserPlan('free'); }}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'white', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', fontFamily: "'Inter', -apple-system, sans-serif" }}
            >
              Continue Free
            </button>
          </div>

          {/* Paid tier */}
          <div style={{ background: 'rgba(124,58,237,0.1)', border: '2px solid rgba(124,58,237,0.4)', borderRadius: '12px', padding: '20px 24px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
  <span style={{ color: 'white', fontWeight: 700, fontFamily: "'Inter', -apple-system, sans-serif", fontSize: '1rem' }}>Paid Plans</span>
</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              {['✓ All data sources (MySQL, Postgres, BigQuery…)', '✓ AI-powered data cleaning', '✓ Unlimited pipeline automation', '✓ Priority support'].map(f => (
                <div key={f} style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)' }}>{f}</div>
              ))}
            </div>
            <button
              onClick={() => navigate('/pricing')}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', fontFamily: "'Inter', -apple-system, sans-serif" }}
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
        
        {trialDaysLeft !== null && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '10px 16px', background: trialDaysLeft <= 3 ? 'rgba(239,68,68,0.1)' : 'rgba(124,58,237,0.1)',
            borderBottom: `1px solid ${trialDaysLeft <= 3 ? 'rgba(239,68,68,0.25)' : 'rgba(167,139,250,0.2)'}`,
            fontFamily: 'monospace', fontSize: '0.78rem',
            color: trialDaysLeft <= 3 ? '#fca5a5' : '#c4b5fd',
          }}>
            <span>
              {trialDaysLeft === 0
                ? ' Your free trial ends today'
                : ` Free trial — ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left`}
            </span>
            <a href="/pricing" style={{ color: trialDaysLeft <= 3 ? '#f87171' : '#a78bfa', fontWeight: 700, textDecoration: 'underline' }}>
              Upgrade now →
            </a>
          </div>
        )}

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
      {showTrialWelcome && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(5,8,15,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowTrialWelcome(false)}>
          <div style={{ maxWidth: '420px', margin: '0 16px', background: 'rgba(10,15,28,0.97)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '16px', padding: '32px 28px', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🎉</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '1.3rem', fontWeight: 700, color: 'white', marginBottom: '8px' }}>
              Your 14-day free trial has started
            </div>
            <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: '24px' }}>
              Every data source and AI feature is unlocked for the next 14 days — no credit card needed. Connect a real database and see how it feels before you decide on a plan.
            </p>
            <button onClick={() => setShowTrialWelcome(false)} className="cta-btn" style={{ width: '100%' }}>
              Let's go →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
