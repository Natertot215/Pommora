import { useCallback, useRef, useState, type MouseEvent } from 'react'

/** The reveal band's hit-zone, measured from the surface's own bottom corner — one per end of the
 *  bar, mirrored. A host tracks the pointer against these rather than mounting invisible buttons,
 *  so a generous reveal area never swallows clicks to the content beneath it. */
export const REVEAL_NEAR_W = 260
export const REVEAL_NEAR_H = 120

/** Where a lead control's label actually begins on screen. A zone measured from the surface's raw
 *  left edge can sit under an overlaying pane — the detail pane runs beneath the sidebar — leaving
 *  the pointer no way to reach it. The control's own content box is where it visibly starts, so a
 *  zone hung off that stays the size it reads as, and follows the inset when the sidebar hides. */
function leadOrigin(el: HTMLElement | null, fallback: number): number {
  if (!el) return fallback
  return el.getBoundingClientRect().left + Number.parseFloat(getComputedStyle(el).paddingLeft)
}

/** The pointer tracking both of a band's reveal zones, for a host that owns a bar with a control at
 *  either end. The surface's rect and the lead control's origin are measured lazily and cached — a
 *  rect per mousemove forces a layout on every pointer move — and the pointer leaving is a free
 *  moment to drop them; a host whose surface can move under a still pointer calls `remeasure`. */
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
  // Stable, so a host can hang it off an effect without re-dropping the cache on every render.
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
