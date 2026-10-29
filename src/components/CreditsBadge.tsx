import { Link } from 'react-router-dom'
import { useCredits } from '../credits'

// Shows the AI credit balance everywhere in the app, with a one-tap top-up and a link to receipts.
export default function CreditsBadge() {
  const { credits, loaded } = useCredits()
  if (!loaded) return null
  const low = credits <= 10
  return (
    <div className="px-3 pb-2">
      <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>AI credits</p>
      <div className="flex items-center justify-between rounded-lg px-2.5 py-2"
        style={{ background: low ? 'rgba(245,158,11,0.10)' : 'rgba(52,211,153,0.10)', border: `1px solid ${low ? 'rgba(245,158,11,0.35)' : 'rgba(52,211,153,0.3)'}` }}>
        <span className="text-sm font-bold" style={{ color: low ? '#fbbf24' : '#34d399' }}>{credits.toLocaleString('en-IN')}</span>
        <a href="/pricing#credits" className="text-[11px] font-semibold underline" style={{ color: '#c4b5fd' }}>Top up</a>
      </div>
      {low && <p className="text-[10px] mt-1" style={{ color: '#fbbf24' }}>{credits === 0 ? 'No credits left.' : 'Running low.'}</p>}
      <Link to="/billing" className="text-[11px] block mt-1.5 underline" style={{ color: 'rgba(255,255,255,0.45)' }}>Billing & receipts</Link>
    </div>
  )
}
