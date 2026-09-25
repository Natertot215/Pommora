import { useCallback, useRef, useState, type PointerEvent } from 'react'

/** Tracked against the pointer, not invisible buttons, so the reveal area never swallows clicks beneath it. */
const REVEAL_NEAR_W = 260
const REVEAL_NEAR_H = 120

/** The surface's raw left edge can sit under an overlaying pane, unreachable; the content box is where it visibly starts. */
function leadOrigin(el: HTMLElement | null, fallback: number): number {
  if (!el) return fallback
  return el.getBoundingClientRect().left + Number.parseFloat(getComputedStyle(el).paddingLeft)
}

/** Cached because a rect per move forces a layout; a held button may be moving the surface itself, so the cache drops until the pointer moves free, and a surface that moves under a still pointer calls `remeasure`. */
export function useRevealNear(): {
  near: boolean
  nearLead: boolean
  onPointerMove: (e: PointerEvent<HTMLElement>) => void
  onPointerLeave: () => void
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
    onPointerMove: (e) => {
      if (e.buttons !== 0) {
        rect.current = null
        setNear(false)
        setNearLead(false)
        return
      }
      if (!rect.current) {
        rect.current = e.currentTarget.getBoundingClientRect()
        leadEdge.current = leadOrigin(
          e.currentTarget.querySelector('[data-reveal-lead]'),
          rect.current.left,
        )
      }
      const r = rect.current
      const low = e.clientY > r.bottom - REVEAL_NEAR_H
      setNear(low && e.clientX > r.right - REVEAL_NEAR_W)
      setNearLead(low && e.clientX < leadEdge.current + REVEAL_NEAR_W)
    },
    onPointerLeave: () => {
      rect.current = null
      setNear(false)
      setNearLead(false)
    },
    remeasure,
  }
}
