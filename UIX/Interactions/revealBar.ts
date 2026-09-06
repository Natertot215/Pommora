import { useCallback, useRef, useState, type MouseEvent } from 'react'

/** Tracked against the pointer, not invisible buttons, so the reveal area never swallows clicks beneath it. */
const REVEAL_NEAR_W = 260
const REVEAL_NEAR_H = 120

/** The surface's raw left edge can sit under an overlaying pane, unreachable; the content box is where it visibly starts. */
function leadOrigin(el: HTMLElement | null, fallback: number): number {
  if (!el) return fallback
  return el.getBoundingClientRect().left + Number.parseFloat(getComputedStyle(el).paddingLeft)
}

/** Cached because a rect per mousemove forces a layout; a surface that moves under a still pointer calls `remeasure`. */
export function useRevealNear(): {
  near: boolean
  nearLead: boolean
  onMouseMove: (e: MouseEvent<HTMLElement>) => void
  onMouseLeave: () => void
  remeasure: () => void
} {
  const [near, setNear] = useState(false)
  const [nearLead, setNearLead] = useState(false)
  const rect = useRef<DOMRect | null>(null)
  const leadEdge = useRef(0)
  const remeasure = useCallback(() => {
    rect.current = null
  }, [])
  return {
    near,
    nearLead,
    onMouseMove: (e) => {
      if (!rect.current) {
        rect.current = e.currentTarget.getBoundingClientRect()
        leadEdge.current = leadOrigin(
          e.currentTarget.querySelector('.footnotes-toggle'),
          rect.current.left,
        )
      }
      const r = rect.current
      const low = e.clientY > r.bottom - REVEAL_NEAR_H
      setNear(low && e.clientX > r.right - REVEAL_NEAR_W)
      setNearLead(low && e.clientX < leadEdge.current + REVEAL_NEAR_W)
    },
    onMouseLeave: () => {
      rect.current = null
      setNear(false)
      setNearLead(false)
    },
    remeasure,
  }
}
