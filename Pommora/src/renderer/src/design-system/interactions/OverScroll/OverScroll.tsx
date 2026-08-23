import type { ReactNode } from 'react'
import { cx } from '../../cx'
import './overScroll.css'

/** The capped-label class run — a plain stylesheet, since a `style([])` cannot compose a mask. */
const overScrollLabel = 'over-scroll-x over-scroll-cap'

/** Truncating with an ellipsis instead of a fade; the leading edge still dissolves what scrolled
 *  off the start where a surface names a width. */
export const overScrollEllipsis = `${overScrollLabel} over-scroll-ellipsis`

/** The cap without any mask, for a box whose DESCENDANTS must keep painting: a mask erases
 *  everything under it, and the removable chip stacks pre-masked twins inside its label. */
export const overScrollUnmasked = 'over-scroll-cap over-scroll-ellipsis'

/** Marks the ancestor a capped label takes its hover from. */
export const overScrollHost = 'over-scroll-host'

/**
 * The cap under the pointer. A host counts as its own cap's seat and is read BEFORE any cap
 * further up: a pointer-inert label (the removable chip's) puts the pointer on its host, and an
 * ancestor cap — the cell box the chip sits in — would otherwise answer for it.
 */
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

/** The cap the pointer is on, so leaving it can return it. */
let held: HTMLElement | null = null

function hold(cap: HTMLElement | null): void {
  if (cap === held) return
  if (held) slideScrollBack(held)
  held = cap
}

/**
 * Gesture and return for every cap, wired once for the whole document — a cap is a bare class on
 * markup as often as it is this component, and a pointer-inert label receives no events of its own
 * to hang them off.
 *
 * A capped label scrolls on ONE axis and a trackpad flick is usually the other one, so the dominant
 * delta drives it whichever way it points. Any cap this resolves is under the pointer by
 * construction, which is what opens it; a label already at its end chains the gesture onward.
 */
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
      const next = Math.max(0, Math.min(max, cap.scrollLeft + delta))
      if (next === cap.scrollLeft) return
      cap.scrollLeft = next
      markScroll(cap)
      e.preventDefault()
    },
    { capture: true, passive: false },
  )
}

/** How far off its start a label sits, for the overlays that have to land on its VISIBLE tail
 *  rather than on the content's — a masked twin inside the scroller travels with the text. */
function markScroll(cap: HTMLElement): void {
  cap.style.setProperty('--os-scroll', `${cap.scrollLeft}px`)
}

// Guarded: the module is imported by node-environment tests, which have no document.
if (typeof document !== 'undefined') wireCaps()

/** scrollLeft isn't CSS-transitionable, so this rAF tween replaces it — reads --duration-base. */
function slideScrollBack(scroller: HTMLElement): void {
  const from = scroller.scrollLeft
  if (from <= 0) return
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--duration-base').trim()
  const ms = (raw.endsWith('ms') ? Number.parseFloat(raw) : Number.parseFloat(raw) * 1000) || 240
  const t0 = performance.now()
  const tick = (t: number): void => {
    const p = Math.min(1, (t - t0) / ms)
    scroller.scrollLeft = from * (1 - p) ** 3 // ease-out settle, matching --ease-standard
    markScroll(scroller)
    if (p < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

/**
 * Overflowing content ECLIPSES — a fade at whichever edge hides content, never a hard cutoff, and
 * only while content genuinely overflows. No JS measurement, so resizes, edits and zoom re-resolve
 * on their own. The consumer's class owns display/gap/width.
 */
export function OverScroll({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}): React.JSX.Element {
  return <span className={cx(overScrollLabel, className)}>{children}</span>
}
