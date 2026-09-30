import { ZOOM } from '../Settings/personalization'
import type { ActionItem } from '../Actions/menuModel'
import { unitLabel } from '@pommora/uix/Pickers/numberUnit'

export const ZOOM_STEPS: readonly number[] = [...ZOOM.steps].reverse()

/** Snaps to the nearest step so a hand-edited off-grid factor stays clearable through the picker. */
export function zoomStep(factor?: number): number {
  const target = factor ?? ZOOM.default
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
