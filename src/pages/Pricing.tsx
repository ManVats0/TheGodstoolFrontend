import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

type Cycle = 'monthly' | 'yearly'
type Currency = 'INR' | 'USD'

const PLANS = [
  {
    key: 'lite',
    name: 'Lite',
    monthlyPriceINR: '₹774',
    yearlyPriceINR: '₹8,256',
    monthlyPriceUSD: '$9',
    yearlyPriceUSD: '$99',
    aiPerDay: 4,
    userLimit: 1,
    features: ['All data sources', 'Full pipeline builder', 'CSV cleaning', 'SQL translator'],
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.08)',
    border: 'rgba(99,102,241,0.25)',
  },
  {
    key: 'starter',
    name: 'Starter',
    monthlyPriceINR: '₹1,634',
    yearlyPriceINR: '₹17,114',
    monthlyPriceUSD: '$19',
    yearlyPriceUSD: '$199',
    aiPerDay: 35,
    userLimit: 1,
    features: ['Everything in Lite', '35 AI transforms/day', 'Email support'],
    color: '#22d3ee',
    bg: 'rgba(34,211,238,0.08)',
    border: 'rgba(34,211,238,0.25)',
    badge: 'Best Value',
  },
  {
    key: 'pro',
    name: 'Pro',
    monthlyPriceINR: '₹3,354',
    yearlyPriceINR: '₹36,034',
    monthlyPriceUSD: '$39',
    yearlyPriceUSD: '$399',
    aiPerDay: 110,
    userLimit: 5,
    features: ['Everything in Starter', '110 AI transforms/day', '5 concurrent logins', 'Priority support'],
    color: '#a78bfa',
    bg: 'rgba(124,58,237,0.12)',
    border: 'rgba(124,58,237,0.4)',
    highlight: true,
  },
  {
    key: 'team',
    name: 'Team',
    monthlyPriceINR: '₹6,794',
    yearlyPriceINR: '₹72,154',
    monthlyPriceUSD: '$79',
    yearlyPriceUSD: '$799',
    aiPerDay: 150,
    userLimit: 15,
    features: ['Everything in Pro', '150 AI transforms/day', '15 concurrent logins', 'Priority support'],
    color: '#34d399',
    bg: 'rgba(52,211,153,0.08)',
    border: 'rgba(52,211,153,0.25)',
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    monthlyPriceINR: '₹42,914',
    yearlyPriceINR: '₹4,11,940',
    monthlyPriceUSD: '$499',
    yearlyPriceUSD: '$4,999',
    aiPerDay: 500,
    userLimit: 100,
    features: ['Everything in Team', '500 AI transforms/day', '100 concurrent logins', 'Dedicated support'],
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.08)',
    border: 'rgba(251,191,36,0.25)',
  },
]

export default function Pricing() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [cycle, setCycle] = useState<Cycle>('monthly')
  const [currency, setCurrency] = useState<Currency>('INR')

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)
    return () => {
      document.body.removeChild(script)
    }
  }, [])

  useEffect(() => {
    const detectCurrency = async () => {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 3000)
        const res = await fetch('https://ipapi.co/json/', { signal: controller.signal })
        clearTimeout(timeout)
        const data = await res.json()
        if (data?.country_code) {
          if (data.country_code !== 'IN') setCurrency('USD')
          return
        }
      } catch { /* try fallback below */ }

      try {
        const controller2 = new AbortController()
        const timeout2 = setTimeout(() => controller2.abort(), 3000)
        const res2 = await fetch('https://ipwho.is/', { signal: controller2.signal })
        clearTimeout(timeout2)
        const data2 = await res2.json()
        if (data2?.country_code && data2.country_code !== 'IN') {
          setCurrency('USD')
        }
      } catch { /* both failed — default to INR, manual toggle still works */ }
    }

    detectCurrency()
  }, [])

  const handleSubscribe = async (planKey: string) => {
    setError('')
    setLoading(planKey)
    const token = localStorage.getItem('datapro_token')
    if (!token) { navigate('/'); return }

    try {
      const res = await fetch(`${import.meta.env.VITE_AUTH_URL}/api/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planKey, billingCycle: cycle, currency })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to create subscription'); setLoading(null); return }

      const { subscriptionId, key } = data

      const rzp = new (window as any).Razorpay({
        key,
        subscription_id: subscriptionId,
        name: "The God's Tool",
        description: PLANS.find(p => p.key === planKey)?.name + ' Plan',
        handler: async (response: any) => {
  const verifyRes = await fetch(`${import.meta.env.VITE_AUTH_URL}/api/verify-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ...response, planKey, billingCycle: cycle, currency })
  })
  const verifyData = await verifyRes.json()
  if (verifyData.success) {
    localStorage.setItem('datapro_plan', planKey)
    window.location.href = '/thank-you'
  } else {
    setError('Payment verified failed. Contact support.')
  }
  setLoading(null)
},
        modal: { ondismiss: () => setLoading(null) },
        prefill: { email: localStorage.getItem('datapro_email') || '' },
        theme: { color: '#7c3aed' }
      })
      rzp.open()
    } catch (err) {
      setError('Cannot connect to server.')
      setLoading(null)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#07050f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>

      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '2.8rem', fontWeight: 900, fontFamily: 'Georgia, serif', background: 'linear-gradient(135deg, #e9d5ff, #a78bfa, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          Unlock The God's Tool
        </div>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '12px', fontSize: '1rem', fontFamily: 'Georgia, serif' }}>
          Choose a plan to access AI-powered data cleaning
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '4px' }}>
        <button
          onClick={() => setCycle('monthly')}
          style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.8rem', letterSpacing: '0.05em', background: cycle === 'monthly' ? 'rgba(124,58,237,0.35)' : 'transparent', color: cycle === 'monthly' ? 'white' : 'rgba(255,255,255,0.5)' }}
        >
          Monthly
        </button>
        <button
          onClick={() => setCycle('yearly')}
          style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.8rem', letterSpacing: '0.05em', background: cycle === 'yearly' ? 'rgba(124,58,237,0.35)' : 'transparent', color: cycle === 'yearly' ? 'white' : 'rgba(255,255,255,0.5)' }}
        >
          Yearly
        </button>
      </div>

      <button
        onClick={() => setCurrency(c => c === 'INR' ? 'USD' : 'INR')}
        style={{ marginBottom: '32px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '20px', padding: '5px 16px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', fontSize: '0.72rem', cursor: 'pointer', letterSpacing: '0.05em' }}
      >
        {currency === 'INR' ? '₹ INR · switch to $ USD' : '$ USD · switch to ₹ INR'}
      </button>

      {error && (
        <div style={{ marginBottom: '24px', background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '10px', padding: '12px 20px', color: '#fca5a5', fontSize: '0.875rem', fontFamily: 'monospace' }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', maxWidth: '1200px', width: '100%' }}>
        {PLANS.map(plan => {
          const price = currency === 'INR'
            ? (cycle === 'monthly' ? plan.monthlyPriceINR : plan.yearlyPriceINR)
            : (cycle === 'monthly' ? plan.monthlyPriceUSD : plan.yearlyPriceUSD)

          return (
          <div key={plan.key} style={{
            background: plan.highlight ? 'rgba(124,58,237,0.12)' : plan.bg,
            border: `1px solid ${plan.border}`,
            borderRadius: '16px',
            padding: '28px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            position: 'relative',
            boxShadow: plan.highlight ? '0 0 40px rgba(124,58,237,0.2)' : 'none'
          }}>
            {plan.badge && (
              <div style={{ position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)', background: '#22d3ee', color: '#0a0a1a', fontSize: '0.7rem', fontWeight: 700, padding: '3px 12px', borderRadius: '20px', fontFamily: 'monospace', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                {plan.badge}
              </div>
            )}

            <div>
              <div style={{ color: plan.color, fontWeight: 700, fontSize: '0.85rem', fontFamily: 'monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{plan.name}</div>
              <div style={{ color: 'white', fontWeight: 900, fontSize: '1.8rem', fontFamily: 'Georgia, serif', lineHeight: 1.1, marginTop: '6px' }}>
                {price}
                <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400, fontSize: '0.9rem' }}>{cycle === 'monthly' ? '/month' : '/year'}</span>
              </div>
            </div>

            <div style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.78rem', color: '#34d399', fontFamily: 'monospace' }}>
              ⚡ {plan.aiPerDay} AI transforms/day
            </div>

            <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.78rem', color: '#a5b4fc', fontFamily: 'monospace' }}>
              👤 {plan.userLimit} concurrent login{plan.userLimit > 1 ? 's' : ''}
            </div>

            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              {plan.features.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', fontFamily: 'monospace' }}>
                  <span style={{ color: plan.color, marginTop: '1px' }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe(plan.key)}
              disabled={loading === plan.key}
              style={{
                width: '100%',
                padding: '13px',
                background: plan.highlight ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : `${plan.color}22`,
                border: `1px solid ${plan.color}55`,
                borderRadius: '10px',
                color: plan.highlight ? 'white' : plan.color,
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: loading === plan.key ? 'not-allowed' : 'pointer',
                fontFamily: 'monospace',
                letterSpacing: '0.05em',
                opacity: loading === plan.key ? 0.6 : 1,
                transition: 'opacity 0.2s'
              }}
            >
              {loading === plan.key ? 'Opening...' : 'Subscribe'}
            </button>
          </div>
          )
        })}
      </div>

      <button
        onClick={() => navigate('/')}
        style={{ marginTop: '32px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'monospace' }}
      >
        ← Back to app
      </button>
    </div>
  )
}
