import { useState, useLayoutEffect, type ReactNode } from 'react'
import { duration as motionDuration, easing } from './motion'

/**
 * Children mount on open and unmount once the collapse finishes, so closed subtrees stay out of
 * the DOM (no regression to the sidebar's lazy rendering). `duration` overrides the default
 * disclosure beat — a Reveal inside a FrameSlide pins to the frame's beat so the unfold and the
 * height-resize land together.
 *
 * The inner clips only while animating/collapsed; once idle it stops clipping so overhanging
 * affordances (the table's drag grips) aren't cut off.
 *
 * `fill` constrains the implicit grid column to `minmax(0, 1fr)` so content is capped at the
 * container's width. Without it the column defaults to `max-content`, which a `nowrap` title
 * balloons to its full length.
 */
export function Reveal({
  open,
  fill = false,
  duration = motionDuration.fast,
  enterOnMount = false,
  onCollapsed,
  children,
}: {
  open: boolean
  fill?: boolean
  duration?: string
  enterOnMount?: boolean
  onCollapsed?: () => void
  children: ReactNode
}): React.JSX.Element {
  const [mounted, setMounted] = useState(open)
  const [expanded, setExpanded] = useState(open && !enterOnMount)
  const [settled, setSettled] = useState(open && !enterOnMount)

  useLayoutEffect(() => {
    if (open) {
      setMounted(true)
      const id = requestAnimationFrame(() => setExpanded(true)) // next frame, so it animates instead of jumping
      return () => cancelAnimationFrame(id)
    }
    setExpanded(false) // unmount happens once the transition lands, in onTransitionEnd
    setSettled(false)
    return undefined
  }, [open])

  return (
    <div
      // So a sibling `+` rule can tell a collapsed disclosure (still a box in the DOM) from a
      // real row — a zero-height spacer must not read as a separator.
      data-reveal
      data-open={mounted || undefined}
      style={{
        display: 'grid',
        transition: `grid-template-rows ${duration} ${easing.baseEase}`,
        gridTemplateRows: expanded ? '1fr' : '0fr',
        gridTemplateColumns: fill ? 'minmax(0, 1fr)' : undefined,
      }}
      onTransitionEnd={(e) => {
        // Reveals nest (a disclosed Set tree, sub-bands), and this handler bubbles — a child's
        // transition would otherwise settle its parent mid-animation and unclip a still-growing box.
        if (e.target !== e.currentTarget) return
        if (e.propertyName !== 'grid-template-rows') return
        if (open) setSettled(true)
        else {
          setMounted(false)
          onCollapsed?.()
        }
      }}
    >
      {/* The seam law (group-band.css) addresses this wrapper as `[data-reveal] > *` — its depth is
          a published contract, not free to change. */}
      <div style={{ overflow: settled ? 'visible' : 'hidden', minHeight: 0 }}>
        {mounted ? children : null}
      </div>
    </div>
  )
}
