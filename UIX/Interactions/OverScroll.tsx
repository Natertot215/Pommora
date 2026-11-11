import type { ReactNode } from 'react'
import { duration, easeBase, ms, prefersReducedMotion } from '../Animations/motion'
import { clamp } from '../Utilities/clamp'
import { cx } from '../Utilities/cx'
import { holdsOpenTrigger, subscribeDismissals } from './dismissalStack'
import './over-scroll.css'

export const overScrollLabel = 'scroll-fade-x over-scroll-cap'

/** A label's fades and ellipsis without the cap, for a box whose offset something else drives. */
export const overScrollFace = 'scroll-fade-x over-scroll-ellipsis'

export const overScrollEllipsis = `${overScrollFace} over-scroll-cap`

/** No mask, for a box whose DESCENDANTS must keep painting: a mask erases everything under it. */
export const overScrollUnmasked = 'over-scroll-cap over-scroll-ellipsis'

export const overScrollHost = 'over-scroll-host'

/** A host is its own cap's seat, read BEFORE any cap further up — else an ancestor cap answers for a pointer-inert label. */
function capUnder(target: EventTarget | null): HTMLElement | null {
  let node = target instanceof Element ? target : null
  while (node) {
    const seat = node.closest<HTMLElement>('.over-scroll-cap, .over-scroll-host')
    if (!seat) return null
    if (seat.classList.contains('over-scroll-cap')) return seat
    const cap = seat.querySelector<HTMLElement>('.over-scroll-cap')
    if (cap) return cap
    node = seat.parentElement
  }
  return null
}

let held: HTMLElement | null = null
const kept = new Set<HTMLElement>()
let unlisten: (() => void) | null = null

/** The blocking wheel listener exists only while a label is hovered, so no other scroll waits on it. */
function hold(cap: HTMLElement | null): void {
  if (cap === held) return
  if (cap && !held) document.addEventListener('wheel', wheelCap, WHEEL)
  else if (!cap && held) document.removeEventListener('wheel', wheelCap, WHEEL)
  let lane = held
  held = cap
  while (lane && !lane.contains(cap)) {
    kept.add(lane)
    lane = lane.parentElement?.closest<HTMLElement>('.over-scroll-cap') ?? null
  }
  release()
}

/** Caught in capture as `blur`, since a field that closes on its own blur is gone before its `focusout` bubbles. */
const onBlur = (e: FocusEvent): void => release(e.relatedTarget as Element | null)

// A lane the pointer left slides back, unless it holds the focused field or an open layer's trigger: then it keeps its place until that ends, sliding back if the pointer is elsewhere.
function release(focused: Element | null = document.activeElement): void {
  for (const lane of kept) {
    if (lane.isConnected && (lane.contains(focused) || holdsOpenTrigger(lane))) continue
    kept.delete(lane)
    if (lane.isConnected && !lane.contains(held)) slideScrollBack(lane)
  }
  if (kept.size > 0 && !unlisten) {
    const off = subscribeDismissals(() => release())
    document.addEventListener('blur', onBlur, true)
    unlisten = () => {
      off()
      document.removeEventListener('blur', onBlur, true)
    }
  } else if (kept.size === 0 && unlisten) {
    unlisten()
    unlisten = null
  }
}

const WHEEL = { capture: true, passive: false }

/** Resolved per wheel rather than from `held`, since a label can remount under a still pointer. A trackpad flick is usually off-axis, so the dominant delta drives. */
function wheelCap(e: WheelEvent): void {
  const cap = capUnder(e.target)
  if (!cap) return
  const lane = cap.parentElement?.closest<HTMLElement>('.scroll-fade-x')
  if (lane && lane.scrollWidth > lane.clientWidth) return
  const max = cap.scrollWidth - cap.clientWidth
  const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
  const next = clamp(cap.scrollLeft + delta, 0, max)
  if (next === cap.scrollLeft) return
  cap.scrollLeft = next
  markScroll(cap)
  e.preventDefault()
}

/** Wired once for the document: a cap is often a bare class, and a pointer-inert label gets no events. */
function wireCaps(): void {
  const root = document.documentElement
  if (root.dataset.overScroll === 'on') return
  root.dataset.overScroll = 'on'
  document.addEventListener('pointerover', (e) => hold(capUnder(e.target)), { capture: true })
  document.addEventListener('pointerleave', () => hold(null))
}

/** How far off its start a label sits, for overlays that must land on its VISIBLE tail. */
function markScroll(cap: HTMLElement): void {
  cap.style.setProperty('--over-scroll-offset', `${cap.scrollLeft}px`)
}

if (typeof document !== 'undefined') wireCaps()

/** scrollLeft isn't CSS-transitionable, so this rAF tween replaces it on the duration token; it stops the moment anything else scrolls the label, an overlapping tween included. */
function slideScrollBack(scroller: HTMLElement): void {
  const from = scroller.scrollLeft
  if (from <= 0) return
  if (prefersReducedMotion()) {
    scroller.scrollLeft = 0
    markScroll(scroller)
    return
  }
  const span = ms(duration.base)
  const t0 = performance.now()
  let last = from
  const tick = (t: number): void => {
    if (scroller.scrollLeft !== last) return
    const p = Math.min(1, (t - t0) / span)
    scroller.scrollLeft = from * (1 - easeBase(p))
    last = scroller.scrollLeft
    markScroll(scroller)
    if (p < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

export function OverScroll({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}): React.JSX.Element {
  return <span className={cx(overScrollLabel, className)}>{children}</span>
}
