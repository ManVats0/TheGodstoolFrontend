import { useState, useEffect, useCallback, CSSProperties } from 'react'

export type TourStep = {
  target?: string
  title: string
  body: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

function getRect(selector: string): DOMRect | null {
  const el = document.querySelector(selector)
  return el ? el.getBoundingClientRect() : null
}

export default function GuidedTour({
  steps,
  storageKey,
  startDelay = 600,
  onFinish,
}: {
  steps: TourStep[]
  storageKey: string
  startDelay?: number
  onFinish?: () => void
}) {
  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined
    try {
      const seen = localStorage.getItem(storageKey)
      if (!seen) t = setTimeout(() => setActive(true), startDelay)
    } catch {}
    return () => { if (t) clearTimeout(t) }
  }, [storageKey, startDelay])

  const currentStep = steps[stepIndex]

  const updateRect = useCallback(() => {
    if (!currentStep?.target) { setRect(null); return }
    setRect(getRect(currentStep.target))
  }, [currentStep])

  useEffect(() => {
    if (!active) return
    updateRect()
    const id = setInterval(updateRect, 300)
    window.addEventListener('resize', updateRect)
    window.addEventListener('scroll', updateRect, true)
    return () => {
      clearInterval(id)
      window.removeEventListener('resize', updateRect)
      window.removeEventListener('scroll', updateRect, true)
    }
  }, [active, updateRect])

  useEffect(() => {
    if (!active || !currentStep?.target) return
    document.querySelector(currentStep.target)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [active, stepIndex, currentStep])

  const finish = useCallback(() => {
    try { localStorage.setItem(storageKey, 'true') } catch {}
    setActive(false)
    onFinish?.()
  }, [storageKey, onFinish])

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') finish() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, finish])

  if (!active || steps.length === 0) return null

  const next = () => (stepIndex >= steps.length - 1 ? finish() : setStepIndex(i => i + 1))
  const prev = () => setStepIndex(i => Math.max(0, i - 1))

  const pad = 8
  const spotlightStyle: CSSProperties = rect
    ? {
        position: 'fixed',
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
        borderRadius: 14,
        boxShadow: '0 0 0 9999px rgba(0,0,0,0.72)',
        border: '2px solid #7c3aed',
        pointerEvents: 'none',
        zIndex: 9998,
        transition: 'top 0.2s ease, left 0.2s ease, width 0.2s ease, height 0.2s ease',
      }
    : { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 9998, pointerEvents: 'none' }

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  let tooltipStyle: CSSProperties = { position: 'fixed', zIndex: 9999, width: 320 }
  if (rect) {
    const placement = currentStep.placement || 'bottom'
    if (placement === 'bottom') {
      tooltipStyle.top = Math.min(rect.bottom + pad + 12, vh - 200)
      tooltipStyle.left = Math.min(Math.max(rect.left, 16), vw - 336)
    } else if (placement === 'top') {
      tooltipStyle.top = Math.max(rect.top - pad - 220, 16)
      tooltipStyle.left = Math.min(Math.max(rect.left, 16), vw - 336)
    } else if (placement === 'right') {
      tooltipStyle.top = Math.min(rect.top, vh - 220)
      tooltipStyle.left = Math.min(rect.right + pad + 12, vw - 336)
    } else {
      tooltipStyle.top = Math.min(rect.top, vh - 220)
      tooltipStyle.left = Math.max(rect.left - pad - 12 - 320, 16)
    }
  } else {
    tooltipStyle.top = '50%'
    tooltipStyle.left = '50%'
    tooltipStyle.transform = 'translate(-50%, -50%)'
  }

  return (
    <>
      <div style={spotlightStyle} />
      <div
        style={{
          ...tooltipStyle,
          background: '#0d0a1a',
          border: '1px solid rgba(124,58,237,0.4)',
          borderRadius: 16,
          padding: '18px 20px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#a78bfa', textTransform: 'uppercase' }}>
            Step {stepIndex + 1} of {steps.length}
          </span>
          <div className="flex items-center gap-3">
            <button onClick={finish} style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>
              Skip tour
            </button>
            <button
              onClick={finish}
              aria-label="Close tour"
              title="Close (Esc)"
              style={{
                width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 6, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: 13, lineHeight: 1, flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#f87171' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
            >
              ✕
            </button>
          </div>
        </div>
        <p style={{ color: 'white', fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{currentStep.title}</p>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>{currentStep.body}</p>
        <div className="flex items-center justify-between">
          <button
            onClick={prev}
            disabled={stepIndex === 0}
            style={{ fontSize: 12, fontWeight: 600, color: stepIndex === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: stepIndex === 0 ? 'default' : 'pointer' }}
          >
            ← Back
          </button>
          <button
            onClick={next}
            style={{ fontSize: 13, fontWeight: 700, color: 'white', background: 'linear-gradient(135deg, #7c3aed, #2563eb)', border: 'none', borderRadius: 10, padding: '8px 18px', cursor: 'pointer' }}
          >
            {stepIndex === steps.length - 1 ? 'Got it →' : 'Next →'}
          </button>
        </div>
      </div>
    </>
  )
}
