import type { ReactNode } from 'react'
import { cx } from '../../cx'
import './overScroll.css'

/** The capped-label class run. Exported for the vanilla-extract surfaces that build their own label
 *  box: the mask lives in a plain stylesheet, which a `style([])` cannot compose. */
export const overScrollLabel = 'over-scroll-x over-scroll-cap'

/** The same label, truncating with an ellipsis instead of a fade — the leading edge still
 *  dissolves what scrolled off the start where a surface names a width. */
export const overScrollEllipsis = `${overScrollLabel} over-scroll-ellipsis`

/** The cap without any mask, for a box whose DESCENDANTS must keep painting: a mask erases
 *  everything under it, and the removable chip stacks pre-masked twins inside its label. */
export const overScrollUnmasked = 'over-scroll-cap over-scroll-ellipsis'

/** Marks the ancestor a capped label takes its hover from. */
export const overScrollHost = 'over-scroll-host'

/** scrollLeft isn't CSS-transitionable, so this rAF tween replaces it — reads --duration-base. */
export function slideScrollBack(scroller: HTMLElement): void {
  const from = scroller.scrollLeft
  if (from <= 0) return
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--duration-base').trim()
  const ms = (raw.endsWith('ms') ? Number.parseFloat(raw) : Number.parseFloat(raw) * 1000) || 240
  const t0 = performance.now()
  const tick = (t: number): void => {
    const p = Math.min(1, (t - t0) / ms)
    scroller.scrollLeft = from * (1 - p) ** 3 // ease-out settle, matching --ease-standard
    if (p < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

/**
 * Overflowing content always ECLIPSES — a fade at whichever edge hides content, never a hard
 * cutoff. It activates only while content genuinely overflows: no JS measurement, so resizes, edits
 * and zoom re-resolve on their own. The consumer's class owns display/gap/width;
 * `--over-scroll-fade` tunes the width per context.
 */
export function OverScroll({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <span
      className={cx(overScrollLabel, className)}
      onPointerLeave={(e) => slideScrollBack(e.currentTarget)}
    >
      {children}
    </span>
  )
}
