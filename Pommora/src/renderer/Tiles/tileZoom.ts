import type { CSSProperties } from 'react'
import { SCALE_STEPS } from '@shared/types'

export const DEFAULT_ZOOM = 1

export interface ZoomStep {
  factor: number
  inline: string
  label: string
}

export const ZOOM_STEPS: ZoomStep[] = [...SCALE_STEPS].reverse().map((factor) => ({
  factor,
  inline: `${factor}x`,
  label: `${factor.toFixed(2)}x`,
}))

const ZOOM_STYLES = new Map<number, CSSProperties>(
  ZOOM_STEPS.filter((s) => s.factor !== DEFAULT_ZOOM).map((s) => [
    s.factor,
    { '--tile-zoom': s.factor } as CSSProperties,
  ]),
)

export function zoomStyle(factor?: number): CSSProperties | undefined {
  return ZOOM_STYLES.get(zoomStep(factor).factor)
}

/** Snaps to the nearest step so a hand-edited off-grid factor stays clearable through the picker. */
export function zoomStep(factor?: number): ZoomStep {
  const target = factor ?? DEFAULT_ZOOM
  return ZOOM_STEPS.reduce((best, s) =>
    Math.abs(s.factor - target) < Math.abs(best.factor - target) ? s : best,
  )
}
