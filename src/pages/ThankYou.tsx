import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function ThankYou() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [showIndra, setShowIndra] = useState(true)

  // Optional tailored message for a custom-credits top-up (see Pricing.tsx
  // handleCustomPayment). When ?type is absent, every branch below falls
  // back to the original generic subscription copy — untouched.
  const purchaseType = searchParams.get('type')
  const isCreditsPurchase = purchaseType === 'credits'
  const creditsCurrency = searchParams.get('currency') === 'USD' ? 'USD' : 'INR'
  const creditsCurrencySymbol = creditsCurrency === 'USD' ? '$' : '₹'
  const creditsAmountParam = searchParams.get('amount')
  const creditsAmount = creditsAmountParam && !isNaN(Number(creditsAmountParam)) ? Number(creditsAmountParam) : null

useEffect(() => {
    // Verify user is logged in. A plan is only required for the subscription
    // flow — a pure credits top-up never sets 'datapro_plan' (see Pricing.tsx
    // handleCustomPayment), so the credits flow isn't gated on having a plan.
    const userPlan = localStorage.getItem('datapro_plan')
    const isLoggedIn = localStorage.getItem('datapro_logged_in')

    if (!isLoggedIn) {
      // If somehow they got here without proper state, redirect to home
      window.location.href = '/'
      return
    }
    if (!isCreditsPurchase && (!userPlan || userPlan === 'none')) {
      // Subscription flow still requires an active plan, exactly as before
      window.location.href = '/'
      return
    }

    // Fire Trackdesk "sale" + "lead" conversions — guarded to fire only once per payment
    const conversionAlreadyFired = sessionStorage.getItem('trackdesk_conversion_fired')
    if (!conversionAlreadyFired) {
      const paidAmount = localStorage.getItem('datapro_amount') // CONFIRM: is this the correct key?
      if (window.trackdesk && paidAmount) {
        window.trackdesk("thegodstool", "conversion", {
          conversionType: "sale",
          amount: { value: paidAmount }
        })
        window.trackdesk("thegodstool", "conversion", {
          conversionType: "lead"
        })
        sessionStorage.setItem('trackdesk_conversion_fired', 'true')
      }
    }

    // Fire Google Ads "Subscribe" conversion — guarded to fire only once per payment
    // NOTE: requires the base Google tag (gtag.js) script to already be loaded
    // globally in index.html. This only fires the conversion EVENT.
    const googleAdsConversionAlreadyFired = sessionStorage.getItem('google_ads_conversion_fired')
    if (!googleAdsConversionAlreadyFired) {
      if (window.gtag) {
        window.gtag('event', 'ads_conversion_Subscribe_1', {
          // Optional: pass the paid amount as the conversion value if you have it
          // value: localStorage.getItem('datapro_amount'),
          // currency: 'INR',
        })
        sessionStorage.setItem('google_ads_conversion_fired', 'true')
      } else {
        console.warn('gtag not found — Google Ads base tag may not be loaded on this page.')
      }
    }
  }, [])

  
  const handleContinue = () => {
    // Navigate to the main app (Data Sources)
    // This will render the app with sidebar since user has plan now
    navigate('/')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#07050f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      flexDirection: 'column'
    }}>
      <style>{`
        @keyframes checkmark {
          0% { transform: scale(0) rotate(-45deg); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(32px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes indraSlide {
          from{opacity:0;transform:translateY(24px) scale(0.97)}
          to{opacity:1;transform:translateY(0) scale(1)}
        }
        @keyframes indraLightning { 0%,100%{opacity:0.5} 50%{opacity:1} }
        .success-circle {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 32px;
          box-shadow: 0 0 60px rgba(124,58,237,0.4);
          animation: slideUp 0.6s ease-out;
        }
        .checkmark {
          font-size: 60px;
          color: white;
          animation: checkmark 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.2s both;
        }
        .content {
          animation: slideUp 0.6s ease-out 0.1s both;
        }
      `}</style>

      <div className="success-circle">
        <span className="checkmark">✓</span>
      </div>

      <div className="content" style={{ textAlign: 'center', maxWidth: '600px' }}>
        <h1 style={{
          fontSize: '2.8rem',
          fontWeight: 900,
          color: 'white',
          fontFamily: 'Georgia, serif',
          margin: '0 0 16px',
          background: 'linear-gradient(135deg, #e9d5ff, #a78bfa, #7c3aed)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          {isCreditsPurchase ? 'Credits Added!' : 'Payment Successful!'}
        </h1>

        <p style={{
          fontSize: '1.1rem',
          color: 'rgba(255,255,255,0.6)',
          fontFamily: 'Georgia, serif',
          lineHeight: 1.8,
          margin: '0 0 24px'
        }}>
          {isCreditsPurchase
            ? `You've added ${creditsCurrencySymbol}${creditsAmount !== null ? creditsAmount.toLocaleString() : ''} in credits to The God's Tool! 🎉`
            : "Your subscription is now active. Welcome to The God's Tool! 🎉"}
        </p>

        <div style={{
          background: 'rgba(52,211,153,0.08)',
          border: '1px solid rgba(52,211,153,0.2)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '32px',
          textAlign: 'left'
        }}>
          <div style={{ color: '#34d399', fontSize: '0.9rem', fontFamily: 'monospace', marginBottom: '12px', fontWeight: 700 }}>
            {isCreditsPurchase ? '✓ Credits Added' : '✓ Subscription Active'}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem', fontFamily: 'monospace', lineHeight: 1.7 }}>
            {isCreditsPurchase
              ? `Your ${creditsCurrency} credit balance has been topped up${creditsAmount !== null ? ` by ${creditsCurrencySymbol}${creditsAmount.toLocaleString()}` : ''}. Credits never expire and stack with any active plan.`
              : 'You now have full access to all data sources, AI cleaning, and pipeline automation. Start by connecting your first data source.'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
          <button
            onClick={handleContinue}
            style={{
              width: '100%',
              padding: '16px',
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'Georgia, serif',
              letterSpacing: '0.05em',
              transition: 'all 0.3s',
              boxShadow: '0 0 40px rgba(124,58,237,0.3)'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 0 60px rgba(124,58,237,0.5)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 40px rgba(124,58,237,0.3)' }}
          >
            Go to Dashboard →
          </button>

          <button
            onClick={() => window.location.href = '/'}
            style={{
              width: '100%',
              padding: '16px',
              background: 'transparent',
              color: '#a78bfa',
              border: '1px solid rgba(167,139,250,0.3)',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'Georgia, serif',
              letterSpacing: '0.05em',
              transition: 'all 0.3s'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(167,139,250,0.6)'; e.currentTarget.style.background = 'rgba(167,139,250,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(167,139,250,0.3)'; e.currentTarget.style.background = 'transparent' }}
          >
            Return to Home
          </button>
        </div>

        <p style={{
          fontSize: '0.85rem',
          color: 'rgba(255,255,255,0.35)',
          fontFamily: 'monospace',
          marginTop: '24px',
          lineHeight: 1.6
        }}>
          A confirmation email has been sent to {localStorage.getItem('datapro_email')}
        </p>
      </div>

      {/* ── INDRA POPUP ── */}
      {showIndra && (
        <div style={{ position: 'fixed', bottom: '32px', right: '32px', zIndex: 999, width: '320px', background: 'linear-gradient(145deg, #0a0820 0%, #110d2e 60%, #0d1a3a 100%)', border: '1px solid rgba(99,179,237,0.25)', borderRadius: '12px', boxShadow: '0 0 40px rgba(66,153,225,0.15), 0 8px 32px rgba(0,0,0,0.6)', overflow: 'hidden', animation: 'indraSlide 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
          <div style={{ position: 'relative', height: '240px', overflow: 'hidden' }}>
            <img src="https://i.postimg.cc/DfcCXhSJ/Indra.png" alt="Indra" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%', filter: 'brightness(0.75) saturate(1.4) contrast(1.1)' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, #0a0820 100%)' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(66,153,225,0.18) 0%, transparent 70%)', animation: 'indraLightning 2.5s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', bottom: '8px', left: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.1rem' }}></span>
              <span style={{ fontFamily: 'Georgia, serif', color: '#63b3ed', fontSize: '0.65rem', opacity: 0.7, letterSpacing: '0.1em' }}>GOD OF RAIN</span>
            </div>
          </div>
          <div style={{ padding: '14px 16px 16px' }}>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '0.82rem', lineHeight: 1.7, color: '#a0c4e8', margin: 0, fontStyle: 'italic' }}>
              "I used this tool in the 1990s to identify vulnerable areas that needed rain. Now — due to the sins of people — I follow no rules. To rain or not to rain... is simply my choice. You have pleased me today."
            </p>
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowIndra(false)} style={{ fontFamily: 'Georgia, serif', background: 'transparent', border: '1px solid rgba(99,179,237,0.3)', color: '#63b3ed', padding: '5px 16px', borderRadius: '4px', fontSize: '0.75rem', letterSpacing: '0.1em', cursor: 'pointer' }}>Understood</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
