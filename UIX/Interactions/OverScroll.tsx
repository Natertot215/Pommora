import type { ReactNode } from 'react'
import { duration, ms } from '../Animations/motion'
import { clamp } from '../Utilities/clamp'
import { cx } from '../Utilities/cx'
import './over-scroll.css'

const overScrollLabel = 'over-scroll-x over-scroll-cap'

export const overScrollEllipsis = `${overScrollLabel} over-scroll-ellipsis`

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

function hold(cap: HTMLElement | null): void {
  if (cap === held) return
  if (held) slideScrollBack(held)
  held = cap
}

/** Wired once for the document: a cap is often a bare class, and a pointer-inert label gets no events. A trackpad flick is usually off-axis, so the dominant delta drives. */
function wireCaps(): void {
  const root = document.documentElement
  if (root.dataset.overScroll === 'on') return
  root.dataset.overScroll = 'on'
  document.addEventListener('pointerover', (e) => hold(capUnder(e.target)), { capture: true })
  document.addEventListener('pointerleave', () => hold(null))
  document.addEventListener(
    'wheel',
    (e) => {
      const cap = capUnder(e.target)
      if (!cap) return
      const max = cap.scrollWidth - cap.clientWidth
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      const next = clamp(cap.scrollLeft + delta, 0, max)
      if (next === cap.scrollLeft) return
      cap.scrollLeft = next
      markScroll(cap)
      e.preventDefault()
    },
    { capture: true, passive: false },
  )
}

/** How far off its start a label sits, for overlays that must land on its VISIBLE tail. */
function markScroll(cap: HTMLElement): void {
  cap.style.setProperty('--os-scroll', `${cap.scrollLeft}px`)
}

if (typeof document !== 'undefined') wireCaps()

/** scrollLeft isn't CSS-transitionable, so this rAF tween replaces it on the duration token. */
function slideScrollBack(scroller: HTMLElement): void {
  const from = scroller.scrollLeft
  if (from <= 0) return
  const span = ms(duration.base)
  const t0 = performance.now()
  const tick = (t: number): void => {
    const p = Math.min(1, (t - t0) / span)
    scroller.scrollLeft = from * (1 - p) ** 3 // ease-out settle, as close to --ease-base as JS gets
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
