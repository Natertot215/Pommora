// elementFromPoint on a window pointermove: pointerenter never fires under pointer capture.

import { type RefObject, useEffect, useRef } from 'react'
import { duration, ms } from '../Animations/motion'

const DWELL_MS = 500

const targets = new Map<Element, () => void>()
let hovered: Element | null = null
let timer: number | null = null
let lastCheck = 0
let remeasure: (() => void) | null = null
let remeasureRaf: number | null = null

function clearHover(): void {
  hovered = null
  if (timer != null) {
    clearTimeout(timer)
    timer = null
  }
}

const SETTLE_MS = ms(duration.fast) + 70 // Reveal's disclosure, plus slack for start-of-frame skew

// Every frame until settle: a once-then-settle pair let a move re-take the snapshot mid-animation and clear its dirty flag.
export function nudgeDragRemeasure(): void {
  if (!remeasure) return
  if (remeasureRaf != null) cancelAnimationFrame(remeasureRaf)
  const settle = performance.now() + SETTLE_MS
  const tick = (): void => {
    remeasureRaf = null
    remeasure?.()
    if (performance.now() < settle) remeasureRaf = requestAnimationFrame(tick)
  }
  remeasureRaf = requestAnimationFrame(tick)
}

function onMove(e: PointerEvent): void {
  // Throttled well under the dwell: elementFromPoint is a layout read.
  const now = performance.now()
  if (now - lastCheck < 100) return
  lastCheck = now
  let target = document.elementFromPoint(e.clientX, e.clientY)
  while (target && !targets.has(target)) target = target.parentElement
  if (target === hovered) return
  clearHover()
  hovered = target
  if (target)
    timer = window.setTimeout(() => {
      const expand = targets.get(target)
      clearHover()
      expand?.()
      nudgeDragRemeasure()
    }, DWELL_MS)
}

/** A collapsed row that springs open under a held drag: its ref goes on the row, which is a target while `collapsed`. A ref object rather than a callback ref, since callers merge refs inline and a callback ref would re-register — and drop the dwell — on every render. */
export function useDiscloseTarget(
  collapsed: boolean,
  expand: () => void,
): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement | null>(null)
  const expandRef = useRef(expand)
  expandRef.current = expand
  useEffect(() => {
    const el = ref.current
    if (!collapsed || !el) return
    targets.set(el, () => expandRef.current())
    return () => {
      targets.delete(el)
      if (hovered === el) clearHover()
    }
  }, [collapsed])
  return ref
}

export function beginDragDisclose(onDisclose: () => void): void {
  remeasure = onDisclose
  window.addEventListener('pointermove', onMove)
}

export function endDragDisclose(): void {
  window.removeEventListener('pointermove', onMove)
  clearHover()
  remeasure = null
  if (remeasureRaf != null) {
    cancelAnimationFrame(remeasureRaf)
    remeasureRaf = null
  }
}
