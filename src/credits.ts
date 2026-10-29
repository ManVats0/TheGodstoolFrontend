import { useEffect, useState } from 'react'

// One shared view of the person's credit balance, so the sidebar, the Sources page, Pricing and the
// payment pages always agree. 1 credit = 1 AI action. Credits are spent after the plan's daily allowance,
// or on their own when there is no plan.
const AUTH_BASE = (import.meta.env.VITE_AUTH_URL as string) || ''

export type CreditRates = {
  INR: { perCredit: number; min: number; max: number }
  USD: { perCredit: number; min: number; max: number }
}
export const DEFAULT_RATES: CreditRates = {
  INR: { perCredit: 2, min: 99, max: 50000 },
  USD: { perCredit: 0.03, min: 2, max: 360 },
}

type State = { credits: number; plan: string; rates: CreditRates | null; loaded: boolean }
let state: State = { credits: 0, plan: 'none', rates: null, loaded: false }
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(l => l())
const token = () => localStorage.getItem('datapro_token') || ''

export async function refreshCredits(): Promise<void> {
  try {
    const t = token()
    if (t) {
      const res = await fetch(`${AUTH_BASE}/api/plan`, { headers: { Authorization: `Bearer ${t}` } })
      if (res.ok) {
        const d = await res.json()
        state = { credits: Number(d.credits) || 0, plan: d.plan || 'none', rates: d.creditRates || state.rates, loaded: true }
        emit()
        return
      }
    }
    if (!state.rates) {
      const r = await fetch(`${AUTH_BASE}/api/credit-rates`)
      if (r.ok) { state = { ...state, rates: await r.json() }; emit() }
    }
  } catch {
    /* offline / not signed in: the badge simply keeps its last value */
  }
}

export function useCredits() {
  const [, tick] = useState(0)
  useEffect(() => {
    const l = () => tick(n => n + 1)
    listeners.add(l)
    refreshCredits()
    const again = () => { refreshCredits() }
    window.addEventListener('focus', again)
    window.addEventListener('datapro:credits-changed', again)
    window.addEventListener('datapro:team-joined', again)
    return () => {
      listeners.delete(l)
      window.removeEventListener('focus', again)
      window.removeEventListener('datapro:credits-changed', again)
      window.removeEventListener('datapro:team-joined', again)
    }
  }, [])
  return { credits: state.credits, plan: state.plan, rates: state.rates || DEFAULT_RATES, loaded: state.loaded, refresh: refreshCredits }
}

export type AiCheck = { ok: boolean; source?: 'plan' | 'credits'; credits?: number; message?: string; code?: string }

// Every AI action asks the server first. The server uses the plan's daily allowance, then a credit.
export async function checkAiAllowance(): Promise<AiCheck> {
  try {
    const res = await fetch(`${AUTH_BASE}/api/ai-usage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
    })
    const d = await res.json().catch(() => ({} as any))
    if (res.ok && d.allowed) {
      if (typeof d.credits === 'number') { state = { ...state, credits: d.credits }; emit() }
      return { ok: true, source: d.source, credits: d.credits }
    }
    return { ok: false, code: d.error, message: d.message || 'AI is not available right now.' }
  } catch {
    return { ok: false, message: 'Could not reach the server. Check your connection and try again.' }
  }
}
