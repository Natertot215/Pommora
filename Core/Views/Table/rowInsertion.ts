import type { CSSProperties } from 'react'
import type { StepPart } from '@pommora/uix/Interactions/keyboard'
import {
  buildLanes,
  type Geometry,
  type LaneSlot,
  type Lanes,
  type Row,
} from '@pommora/uix/Interactions/reorderModel'
import { DROP_LINE_INSET, px } from '@pommora/uix/Interactions/shared'

export const ROW_END = 'end'

export type RowSnap = Lanes & { left: number; width: number }

export function rowSnap(
  g: Geometry,
  id: string,
  bandOf: ReadonlyMap<string, string>,
  vacant: (key: string) => boolean,
): RowSnap | null {
  const own = g.rows.find((r) => r.id === id)
  if (!own) return null
  const left = own.left + DROP_LINE_INSET
  const right = (g.groups.get(ROW_END)?.left ?? own.right) - DROP_LINE_INSET
  const heads = new Map<string, Row>()
  for (const r of g.rows) if (vacant(r.id)) heads.set(r.id, { ...r, top: r.bottom })
  return {
    ...buildLanes(g.rows, id, (x) => bandOf.get(x), heads),
    left,
    width: right - left,
  }
}

export const rowLine = (slot: LaneSlot, s: RowSnap, inset: string): CSSProperties => ({
  top: slot.edge,
  left: `calc(${px(s.left)} + ${inset})`,
  width: `calc(${px(s.width)} - ${inset})`,
  right: 'auto',
})

export function rowStep(
  slot: LaneSlot,
  s: RowSnap,
  headed: boolean,
): { part: StepPart; id: string } {
  if (slot.index === 0 && headed) return { part: 'into', id: slot.lane }
  if (slot.before !== null) return { part: 'before', id: slot.before }
  const lane = s.list.find((l) => l.key === slot.lane)!
  return { part: 'after', id: lane.slots[slot.index - 1].before! }
}
