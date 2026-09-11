import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

type Cycle = 'monthly' | 'yearly'

const PLANS = [
  {
    key: 'lite',
    name: 'Lite',
    monthlyPrice: '₹774',
    yearlyPrice: '₹8,256',
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
    monthlyPrice: '₹1,634',
    yearlyPrice: '₹17,114',
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
    monthlyPrice: '₹3,354',
    yearlyPrice: '₹36,034',
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
    monthlyPrice: '₹6,794',
    yearlyPrice: '₹72,154',
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
    monthlyPrice: '₹42,914',
    yearlyPrice: '₹4,11,940',
    aiPerDay: 500,
    userLimit: 100,
    features: ['Everything in Team', '500 AI transforms/day', '100 concurrent logins', 'Dedicated support'],
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.08)',
    border: 'rgba(251,191,36,0.25)',
  },
]

// Plans/cycles that exceed Razorpay's current transaction cap (₹50k domestic, ₹30k international).
// These route to Contact Sales instead of checkout. Remove entries here once Razorpay raises the limit.
const CONTACT_SALES_ONLY: Record<string, Cycle[]> = {
  enterprise: ['monthly', 'yearly'],
  team: ['yearly'],
}

function requiresContactSales(planKey: string, cycle: Cycle) {
  return CONTACT_SALES_ONLY[planKey]?.includes(cycle) ?? false
}

export default function Pricing() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [cycle, setCycle] = useState<Cycle>('monthly')
  const [customAmount, setCustomAmount] = useState('')
  const [customLoading, setCustomLoading] = useState(false)
  const [customError, setCustomError] = useState('')

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)
    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const handleSubscribe = async (planKey: string) => {
    setError('')

    // ── Payment cap guard ───────────────────────────────────────────────
    // Razorpay checkout is skipped for plan/cycle combos above the current
    // transaction cap. The Razorpay code below is untouched and still runs
    // normally for every other plan — this only intercepts the capped ones.
    if (requiresContactSales(planKey, cycle)) {
      navigate(`/contact?intent=sales&plan=${planKey}&billing=${cycle}`)
      return
    }
    // ────────────────────────────────────────────────────────────────────

    setLoading(planKey)
    const token = localStorage.getItem('datapro_token')
    if (!token) { navigate('/'); return }

    try {
      const res = await fetch(`${import.meta.env.VITE_AUTH_URL}/api/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planKey, billingCycle: cycle })
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
    body: JSON.stringify({ ...response, planKey, billingCycle: cycle })
  })
  const verifyData = await verifyRes.json()
  if (verifyData.success) {
    localStorage.setItem('datapro_plan', planKey)
    // ← CHANGED: Redirect to thank you page instead of home
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

  const handleCustomPayment = async () => {
    setCustomError('')
    const amountNum = Number(customAmount)
    if (!amountNum || amountNum <= 0) {
      setCustomError('Enter a valid amount')
      return
    }
    setCustomLoading(true)
    const token = localStorage.getItem('datapro_token')
    if (!token) { navigate('/'); return }

    try {
      const res = await fetch(`${import.meta.env.VITE_AUTH_URL}/api/create-custom-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: amountNum, currency: 'INR' })
      })
      const data = await res.json()
      if (!res.ok) { setCustomError(data.error || 'Failed to create payment'); setCustomLoading(false); return }

      const { orderId, key } = data

      const rzp = new (window as any).Razorpay({
        key,
        order_id: orderId,
        name: "The God's Tool",
        description: 'Custom payment',
        handler: async (response: any) => {
          const verifyRes = await fetch(`${import.meta.env.VITE_AUTH_URL}/api/verify-custom-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(response)
          })
          const verifyData = await verifyRes.json()
          if (verifyData.success) {
            setCustomAmount('')
            alert('Payment successful — thank you!')
          } else {
            setCustomError('Payment verification failed. Contact support.')
          }
          setCustomLoading(false)
        },
        modal: { ondismiss: () => setCustomLoading(false) },
        prefill: { email: localStorage.getItem('datapro_email') || '' },
        theme: { color: '#7c3aed' }
      })
      rzp.open()
    } catch (err) {
      setCustomError('Cannot connect to server.')
      setCustomLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#07050f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>

      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '2.8rem', fontWeight: 900, fontFamily: 'Georgia, serif', background: 'linear-gradient(135deg, #e9d5ff, #a78bfa, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          Unlock The God's Tool
        </div>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '12px', fontSize: '1rem', fontFamily: 'Georgia, serif' }}>
          Transparent pricing for freelancers, growing teams, and enterprises
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '4px' }}>
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

      {error && (
        <div style={{ marginBottom: '24px', background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '10px', padding: '12px 20px', color: '#fca5a5', fontSize: '0.875rem', fontFamily: 'monospace' }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', maxWidth: '1200px', width: '100%' }}>
        {PLANS.map(plan => (
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
                {cycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
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
              {loading === plan.key ? 'Opening...' : (requiresContactSales(plan.key, cycle) ? 'Contact Sales' : 'Subscribe')}
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '32px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '24px 28px', maxWidth: '420px', width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <div style={{ color: 'white', fontWeight: 700, fontSize: '1rem', fontFamily: 'Georgia, serif' }}>
            Flexible Credit Top-Up
          </div>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', marginTop: '6px', lineHeight: 1.5, fontFamily: 'monospace' }}>
            Add credits on your own terms — no subscription, no lock-in. Built for freelancers covering a single project, agencies managing multiple clients, and corporate teams needing ad-hoc budget without a procurement cycle.
          </p>
        </div>
        <input
          type="number"
          min="1"
          placeholder="Enter amount"
          value={customAmount}
          onChange={(e) => setCustomAmount(e.target.value)}
          style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)', color: 'white', fontFamily: 'monospace', fontSize: '0.9rem' }}
        />
        {customError && (
          <div style={{ color: '#fca5a5', fontSize: '0.78rem', fontFamily: 'monospace' }}>⚠ {customError}</div>
        )}
        <button
          onClick={handleCustomPayment}
          disabled={customLoading}
          style={{
            width: '100%',
            padding: '12px',
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            border: 'none',
            borderRadius: '10px',
            color: 'white',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: customLoading ? 'not-allowed' : 'pointer',
            fontFamily: 'monospace',
            letterSpacing: '0.05em',
            opacity: customLoading ? 0.6 : 1
          }}
        >
          {customLoading ? 'Opening...' : 'Add Credits'}
        </button>
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem', fontFamily: 'monospace', textAlign: 'center' }}>
          Credits never expire and stack with any active plan
        </p>
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
