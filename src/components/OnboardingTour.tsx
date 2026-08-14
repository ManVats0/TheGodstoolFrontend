import { useEffect, useState } from 'react'
import { SIDEBAR_NAV_ITEMS } from './Sidebar'

const STORAGE_KEY = 'godstool_sidebar_tour_completed_v1'

interface OnboardingTourProps {
  /** Called whenever the spotlighted step changes; pass the value straight into Sidebar's `highlightedTourPath`. */
  onStepChange?: (targetPath: string | null) => void
  /** Called when the tour starts/ends; pass the value into Sidebar's `forceExpanded`. */
  onExpandNeeded?: (expanded: boolean) => void
}

/**
 * First-run walkthrough of the sidebar. Dims the screen, spotlights each nav
 * item in turn, and shows a short card explaining what it's for. Shown once
 * per browser (tracked in localStorage) and skippable at any time.
 *
 * Usage: render <OnboardingTour /> once near the root of your layout,
 * alongside <Sidebar forceExpanded={...} highlightedTourPath={...} />,
 * wiring the two callbacks into that Sidebar's props.
 */
export default function OnboardingTour({ onStepChange, onExpandNeeded }: OnboardingTourProps) {
  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)

  // Kick off the tour once, on first visit only.
  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY)
    if (!seen) {
      const t = setTimeout(() => setActive(true), 400)
      return () => clearTimeout(t)
    }
  }, [])

  useEffect(() => {
    onExpandNeeded?.(active)
  }, [active])

  // Measure the current target's position whenever the step (or window) changes.
  useEffect(() => {
    if (!active) {
      onStepChange?.(null)
      return
    }
    const step = SIDEBAR_NAV_ITEMS[stepIndex]
    onStepChange?.(step.path)

    const update = () => {
      const el = document.querySelector(`[data-tour-id="${step.path}"]`)
      if (el) setRect(el.getBoundingClientRect())
    }
    update()
    // Re-measure shortly after in case the sidebar is still animating open.
    const t = setTimeout(update, 320)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      clearTimeout(t)
    }
  }, [active, stepIndex])

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setActive(false)
    setStepIndex(0)
    setRect(null)
  }

  if (!active || !rect) return null

  const step = SIDEBAR_NAV_ITEMS[stepIndex]
  const isLast = stepIndex === SIDEBAR_NAV_ITEMS.length - 1

  const cardWidth = 288
  const cardTop = Math.min(Math.max(rect.top - 20, 16), window.innerHeight - 200)
  const cardLeft = Math.min(rect.right + 16, window.innerWidth - cardWidth - 16)

  return (
    <>
      {/* Dimmed backdrop; clicking it skips the tour */}
      <div
        className="fixed inset-0 z-[100] transition-opacity duration-200"
        style={{ background: 'rgba(0,0,0,0.6)' }}
        onClick={finish}
      />

      {/* Spotlight ring around the active nav item */}
      <div
        className="fixed z-[101] rounded-xl pointer-events-none transition-all duration-300"
        style={{
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12,
          boxShadow: '0 0 0 4px rgba(196,181,253,0.65), 0 0 24px rgba(124,58,237,0.5)',
        }}
      />

      {/* Explanation card */}
      <div
        className="fixed z-[102] rounded-2xl p-4 shadow-2xl"
        style={{
          top: cardTop,
          left: cardLeft,
          width: cardWidth,
          background: '#151129',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div className="text-xs font-semibold text-purple-300 mb-1">
          Step {stepIndex + 1} of {SIDEBAR_NAV_ITEMS.length}
        </div>
        <div className="text-white font-bold text-sm mb-1">{step.label}</div>
        <p className="text-white/60 text-xs leading-relaxed mb-4">{step.description}</p>

        <div className="flex items-center justify-between">
          <button
            onClick={finish}
            className="text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <button
                onClick={() => setStepIndex((i) => i - 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:bg-white/10 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={() => (isLast ? finish() : setStepIndex((i) => i + 1))}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-600 text-white hover:bg-purple-500 transition-colors"
            >
              {isLast ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
