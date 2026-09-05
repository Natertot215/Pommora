// Rides ONE CSS var --tile-zoom; font + glyphs + handle all derive from it. Applied linearly in
// CSS — never touches the editor's own clamped zoom curve.

import type { CSSProperties } from 'react'
import { SCALE_STEPS } from '@shared/types'

export const DEFAULT_ZOOM = 1
export const ZOOM_FACTORS: readonly number[] = [...SCALE_STEPS].reverse()

export interface ZoomStep {
  factor: number
  /** Compact form for the menu row's trailing value ("0.5x"). */
  inline: string
  /** Two-decimal form for the picker list ("0.50x"). */
  label: string
}

const step = (factor: number): ZoomStep => ({
  factor,
  inline: `${factor}x`,
  label: `${factor.toFixed(2)}x`,
})

export const ZOOM_STEPS: ZoomStep[] = ZOOM_FACTORS.map(step)

// One object per step, so a memoized tile sees the same style identity across renders.
const ZOOM_STYLES = new Map<number, CSSProperties>(
  ZOOM_FACTORS.filter((f) => f !== DEFAULT_ZOOM).map((f) => [
    f,
    { '--tile-zoom': f } as CSSProperties,
  ]),
)

/** The inline style that sets --tile-zoom on the element that transitions it; 1.0 sets none. */
export function zoomStyle(factor?: number): CSSProperties | undefined {
  return ZOOM_STYLES.get(zoomStep(factor).factor)
}

/** Absent → 1.0; any other value snaps to the nearest ratified step, so a hand-edited or foreign
 *  off-grid factor still renders and is clearable through the picker — never silently stuck at a
 *  scale the picker can't show. */
export function zoomStep(factor?: number): ZoomStep {
  const target = factor ?? DEFAULT_ZOOM
  return ZOOM_STEPS.reduce((best, s) =>
    Math.abs(s.factor - target) < Math.abs(best.factor - target) ? s : best,
  )
}
