import type { ReactNode } from 'react'
import { cx } from '../cx'
import { truncateHoverScroll } from '../tokens/typography.css'
import '../edge-fade.css'

// A later call on the same element takes the tween over — enter and leave can trade a chip's
// label mid-flight, and two live loops would fight over one scrollLeft.
const tweens = new WeakMap<HTMLElement, number>()

/** scrollLeft isn't a CSS-transitionable property, so this rAF tween replaces it — reads --duration-base, never hardcodes the timing. */
export function slideScrollTo(scroller: HTMLElement, to: number): void {
  const from = scroller.scrollLeft
  if (from === to) return
  const id = (tweens.get(scroller) ?? 0) + 1
  tweens.set(scroller, id)
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--duration-base').trim()
  const ms = (raw.endsWith('ms') ? Number.parseFloat(raw) : Number.parseFloat(raw) * 1000) || 240
  const t0 = performance.now()
  const tick = (t: number): void => {
    if (tweens.get(scroller) !== id) return
    const p = Math.min(1, (t - t0) / ms)
    scroller.scrollLeft = to + (from - to) * (1 - p) ** 3 // ease-out settle, matching --ease-standard
    if (p < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

export function slideScrollBack(scroller: HTMLElement): void {
  slideScrollTo(scroller, 0)
}

/**
 * Overflowing content always ECLIPSES — a fade at whichever edge hides content, never a hard
 * cutoff (OverflowScroll.css). The fade activates only while content genuinely overflows: no JS
 * measurement, so resizes, edits, and zoom all re-resolve on their own. The consumer's class owns
 * display/gap/width; --edge-fade tunes the fade width per context.
 */
export function OverflowScroll({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <span
      className={cx(truncateHoverScroll, 'overflow-eclipse', className)}
      onPointerLeave={(e) => slideScrollBack(e.currentTarget)}
    >
      {children}
    </span>
  )
}
