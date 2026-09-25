import { SCALE_STEPS } from '@pommora/core/Settings/personalization'
import type { ActionItem } from '@pommora/core/Actions/menuModel'
import { unitLabel } from '@pommora/uix/Pickers/numberUnit'

export const DEFAULT_ZOOM = 1

export const ZOOM_STEPS: readonly number[] = [...SCALE_STEPS].reverse()

/** Snaps to the nearest step so a hand-edited off-grid factor stays clearable through the picker. */
export function zoomStep(factor?: number): number {
  const target = factor ?? DEFAULT_ZOOM
  return ZOOM_STEPS.reduce((best, f) => (Math.abs(f - target) < Math.abs(best - target) ? f : best))
}

export const scaleRows = <P extends string>(
  prefix: P,
  current: number,
): ActionItem<`${P}${number}`>[] =>
  ZOOM_STEPS.map((f) => ({
    label: unitLabel(f),
    action: `${prefix}${f}`,
    checked: f === current,
    stay: true,
  }))
