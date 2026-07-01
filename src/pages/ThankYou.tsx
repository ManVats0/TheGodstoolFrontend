import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ThankYou() {
  const navigate = useNavigate()

useEffect(() => {
    // Verify user is logged in and has a plan
    const userPlan = localStorage.getItem('datapro_plan')
    const isLoggedIn = localStorage.getItem('datapro_logged_in')
    
    if (!isLoggedIn || !userPlan || userPlan === 'none') {
      // If somehow they got here without proper state, redirect to home
      window.location.href = '/'
      return
    }

    // Fire Trackdesk "sale" conversion — guarded to fire only once per payment
    const conversionAlreadyFired = sessionStorage.getItem('trackdesk_conversion_fired')
    if (!conversionAlreadyFired) {
      const paidAmount = localStorage.getItem('datapro_amount') // CONFIRM: is this the correct key?
      if (window.trackdesk && paidAmount) {
        window.trackdesk("thegodstool", "conversion", {
          conversionType: "sale",
          amount: { value: paidAmount }
        })
        sessionStorage.setItem('trackdesk_conversion_fired', 'true')
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
          Payment Successful!
        </h1>

        <p style={{
          fontSize: '1.1rem',
          color: 'rgba(255,255,255,0.6)',
          fontFamily: 'Georgia, serif',
          lineHeight: 1.8,
          margin: '0 0 24px'
        }}>
          Your subscription is now active. Welcome to The God's Tool! 🎉
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
            ✓ Subscription Active
          </div>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem', fontFamily: 'monospace', lineHeight: 1.7 }}>
            You now have full access to all data sources, AI cleaning, and pipeline automation. Start by connecting your first data source.
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
    </div>
  )
}
