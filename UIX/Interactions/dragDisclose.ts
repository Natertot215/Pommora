import { type RefObject, useEffect, useRef } from 'react'
import { duration, ms } from '../Animations/motion'
import { useLatest } from '../Utilities/stableApi'

const DWELL_MS = 500
const CHECK_MS = 100
const SETTLE_MS = ms(duration.fast) + 70

type Armed = { remeasure: () => void; within: Element; source: Element }

const targets = new Map<Element, () => void>()
const point = { x: 0, y: 0 }
let armed: Armed | null = null
let pointed = false
let hovered: Element | null = null
let dwell: number | null = null
let trailing: number | null = null
let lastCheck = 0
let remeasureRaf: number | null = null

function targetAt(): Element | null {
  if (!armed || !pointed) return null
  let t = document.elementFromPoint(point.x, point.y)
  while (t && !targets.has(t)) t = t.parentElement
  return t && t !== armed.source && armed.within.contains(t) ? t : null
}

function clearHover(): void {
  hovered = null
  if (dwell != null) {
    clearTimeout(dwell)
    dwell = null
  }
}

function check(): void {
  trailing = null
  lastCheck = performance.now()
  const t = targetAt()
  if (t === hovered) return
  clearHover()
  hovered = t
  if (!t) return
  dwell = window.setTimeout(() => {
    const expand = targets.get(t)
    const still = targetAt() === t
    clearHover()
    if (!still || !expand) return
    expand()
    nudgeDragRemeasure()
  }, DWELL_MS)
}

function schedule(): void {
  if (trailing != null) return
  const wait = CHECK_MS - (performance.now() - lastCheck)
  if (wait <= 0) check()
  else trailing = window.setTimeout(check, wait)
}

function onMove(e: PointerEvent): void {
  point.x = e.clientX
  point.y = e.clientY
  pointed = true
  schedule()
}

export function nudgeDragRemeasure(): void {
  if (!armed) return
  if (remeasureRaf != null) cancelAnimationFrame(remeasureRaf)
  const settle = performance.now() + SETTLE_MS
  const tick = (): void => {
    remeasureRaf = null
    armed?.remeasure()
    if (performance.now() < settle) remeasureRaf = requestAnimationFrame(tick)
  }
  remeasureRaf = requestAnimationFrame(tick)
}

export function addSpring(el: Element, expand: () => void): () => void {
  targets.set(el, expand)
  return () => {
    targets.delete(el)
    if (hovered === el) clearHover()
  }
}

export function useDiscloseTarget(
  collapsed: boolean,
  expand: () => void,
): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement | null>(null)
  const expandRef = useLatest(expand)
  useEffect(() => {
    const el = ref.current
    if (!collapsed || !el) return
    return addSpring(el, () => expandRef.current())
  }, [collapsed])
  return ref
}

export function beginDragDisclose(remeasure: () => void, within: Element, source: Element): void {
  armed = { remeasure, within, source }
  window.addEventListener('pointermove', onMove)
}

export function pointDisclose(x: number, y: number): void {
  if (!armed) return
  point.x = x
  point.y = y
  pointed = true
  schedule()
}

export function endDragDisclose(): void {
  window.removeEventListener('pointermove', onMove)
  clearHover()
  armed = null
  pointed = false
  if (trailing != null) {
    clearTimeout(trailing)
    trailing = null
  }
  if (remeasureRaf != null) {
    cancelAnimationFrame(remeasureRaf)
    remeasureRaf = null
  }
}
