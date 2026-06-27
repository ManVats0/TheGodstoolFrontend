// /src/pages/ThankYou.tsx

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ThankYou() {
  const navigate = useNavigate()

  useEffect(() => {
    // Auto-redirect after 3 seconds
    const timer = setTimeout(() => {
      navigate('/dashboard')
    }, 3000)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="flex items-center justify-center min-h-screen" 
      style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}>
      <div className="text-center">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-3xl font-bold text-white mb-2">Success!</h1>
        <p className="text-white mb-8 text-lg">
          Your subscription is active. Redirecting to dashboard...
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-8 py-3 bg-white text-purple-700 rounded-xl font-bold"
        >
          Go to Dashboard →
        </button>
      </div>
    </div>
  )
}
