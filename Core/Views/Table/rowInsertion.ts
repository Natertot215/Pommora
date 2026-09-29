import type { CSSProperties } from 'react'
import {
  buildLanes,
  type Geometry,
  type LaneSlot,
  type Lanes,
} from '@pommora/uix/Interactions/reorderModel'
import { DROP_LINE_INSET } from '@pommora/uix/Interactions/shared'

export const ROW_END = 'end'

export type RowSnap = Lanes & { left: number; width: number }

export function rowSnap(
  g: Geometry,
  id: string,
  bandOf: ReadonlyMap<string, string>,
): RowSnap | null {
  const own = g.rows.find((r) => r.id === id)
  if (!own) return null
  const left = own.left + DROP_LINE_INSET
  const right = (g.groups.get(ROW_END)?.left ?? own.right) - DROP_LINE_INSET
  return { ...buildLanes(g.rows, id, (x) => bandOf.get(x)), left, width: right - left }
}

export const rowLine = (slot: LaneSlot, s: RowSnap): CSSProperties => ({
  top: slot.edge,
  left: s.left,
  width: s.width,
  right: 'auto',
})
