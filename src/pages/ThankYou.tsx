import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ThankYou() {
  const navigate = useNavigate()

  useEffect(() => {
    // Auto-redirect to dashboard after 3 seconds
    const timer = setTimeout(() => {
      navigate('/dashboard')
    }, 3000)
    
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div 
      className="flex items-center justify-center min-h-screen"
      style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
    >
      <div className="text-center">
        {/* Celebration Icon */}
        <div className="text-7xl mb-6">🎉</div>

        {/* Main Heading */}
        <h1 className="text-4xl font-bold text-white mb-3">
          Welcome to God's Tool!
        </h1>

        {/* Subheading */}
        <p className="text-lg text-white mb-2 opacity-90">
          Your subscription is now active
        </p>

        {/* Description */}
        <p className="text-base text-white mb-8 opacity-75 max-w-md mx-auto">
          You can now access all premium features. 
          Redirecting to dashboard in 3 seconds...
        </p>

        {/* Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="px-8 py-3 bg-white text-purple-700 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all shadow-lg"
        >
          Go to Dashboard →
        </button>

        {/* Backup info */}
        <p className="text-xs text-white opacity-50 mt-6">
          Not redirecting? Click the button above
        </p>
      </div>
    </div>
  )
}
