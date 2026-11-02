import { MENU_GAP as GAP } from '../Menus/menuAnchor'
import { clamp } from '../Utilities/clamp'
import { PANE_RADIUS } from './picker-base.css'

export const VIEWPORT_MARGIN = 8

export type PickerDirection = 'down' | 'up'

export type PanePos = {
  top?: number
  bottom?: number
  right?: number
  left?: number
  origin?: string
}

export type TriggerBox = Pick<DOMRect, 'left' | 'top' | 'bottom' | 'width' | 'height'>

/** KNOB — how far past the trigger's center the near edge and the Bloom's origin sit. */
const ANCHOR_RESERVE = 30

const CORNER_CLEAR = PANE_RADIUS + 2

export const roomAround = (t: TriggerBox, viewH: number): Record<PickerDirection, number> => ({
  up: t.top - GAP - VIEWPORT_MARGIN,
  down: viewH - t.bottom - GAP - VIEWPORT_MARGIN,
})

export function sideFor(
  side: PickerDirection,
  height: number,
  room: Record<PickerDirection, number>,
): PickerDirection {
  const other = side === 'up' ? 'down' : 'up'
  return height > room[side] && room[other] > room[side] ? other : side
}

export function placePane({
  t,
  pane,
  view,
  side,
  centered,
  origin,
  centerX,
  bounds,
}: {
  t: TriggerBox
  pane: { w: number; h: number }
  view: { w: number; h: number }
  side: PickerDirection
  centered: boolean | null
  origin: 'auto' | 'right' | 'center' | 'left'
  centerX?: number
  bounds?: { left: number; right: number }
}): { pos: PanePos; centered: boolean } {
  const c = centerX ?? t.left + t.width / 2
  const edgeL = (bounds?.left ?? 0) + VIEWPORT_MARGIN
  const edgeR = (bounds?.right ?? view.w) - VIEWPORT_MARGIN
  const { w: pw, h: ph } = pane
  const edge = (along: number, at: number): number =>
    clamp(at, CORNER_CLEAR, Math.max(CORNER_CLEAR, along - CORNER_CLEAR))
  const near = (x: number): string => `${edge(pw, x)}px ${side === 'up' ? ph : 0}px`
  const vertical = side === 'up' ? { bottom: view.h - t.top + GAP } : { top: t.bottom + GAP }
  const center =
    centered ??
    (origin === 'center' || (origin === 'auto' && c - pw / 2 >= edgeL && c + pw / 2 <= edgeR))
  if (center) {
    const half = pw / 2
    const left = Math.min(Math.max(c, edgeL + half), edgeR - half)
    return {
      pos: { ...vertical, left: left - half, origin: near(c - (left - half)) },
      centered: true,
    }
  }
  if (origin === 'left') {
    const left = clamp(c - ANCHOR_RESERVE, edgeL, Math.max(edgeL, edgeR - pw))
    return { pos: { ...vertical, left, origin: near(ANCHOR_RESERVE) }, centered: false }
  }
  const right = clamp(
    view.w - c - ANCHOR_RESERVE,
    view.w - edgeR,
    Math.max(view.w - edgeR, view.w - edgeL - pw),
  )
  return { pos: { ...vertical, right, origin: near(pw - ANCHOR_RESERVE) }, centered: false }
}
