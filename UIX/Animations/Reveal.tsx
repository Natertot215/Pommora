import { useState, useLayoutEffect, type ReactNode } from 'react'
import { duration as motionDuration, easing } from './motion'

/** `fill` caps content at the container width; without it the implicit column is `max-content`, which a `nowrap` title balloons to. */
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
      const id = requestAnimationFrame(() => setExpanded(true)) // next frame, or it jumps
      return () => cancelAnimationFrame(id)
    }
    setExpanded(false)
    setSettled(false)
    return undefined
  }, [open])

  return (
    <div
      // A sibling `+` rule must tell a collapsed disclosure from a real row.
      data-reveal
      data-open={mounted || undefined}
      style={{
        display: 'grid',
        transition: `grid-template-rows ${duration} ${easing.baseEase}`,
        gridTemplateRows: expanded ? '1fr' : '0fr',
        gridTemplateColumns: fill ? 'minmax(0, 1fr)' : undefined,
      }}
      onTransitionEnd={(e) => {
        // Reveals nest: a bubbled child event would settle its parent mid-animation.
        if (e.target !== e.currentTarget) return
        if (e.propertyName !== 'grid-template-rows') return
        if (open) setSettled(true)
        else {
          setMounted(false)
          onCollapsed?.()
        }
      }}
    >
      {/* group-band.css addresses this wrapper as `[data-reveal] > *`; its depth is a contract. */}
      <div style={{ overflow: settled ? 'visible' : 'hidden', minHeight: 0 }}>
        {mounted ? children : null}
      </div>
    </div>
  )
}
