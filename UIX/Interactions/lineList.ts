import type { CSSProperties } from 'react'
import type { LineSpec } from './engine'
import type { StepPart } from './keyboard'
import {
  buildLanes,
  type Geometry,
  type LaneSlot,
  type Lanes,
  laneSlot,
  type Row,
} from './reorderModel'
import { DROP_LINE_INSET, px } from './shared'

type LaneSnap = Lanes & { left: number; width: number }

type LineListSpec = Omit<LineSpec<LaneSlot, LaneSnap>, 'snap' | 'resolve'> & {
  laneOf?: (dragged: string) => (id: string) => string | undefined
  across?: boolean
  boxes?: (g: Geometry) => ReadonlyMap<string, Row>
  locked?: boolean
  accepts?: (slot: LaneSlot, id: string) => boolean
  end?: string
}

export function lineList({
  laneOf,
  across = false,
  boxes,
  locked = false,
  accepts,
  end,
  ...spec
}: LineListSpec): LineSpec<LaneSlot, LaneSnap> {
  return {
    snap: (id, g) => {
      if (locked) return null
      const own = g.rows.find((r) => r.id === id)
      if (!own) return null
      const left = own.left + DROP_LINE_INSET
      const right = ((end ? g.groups.get(end)?.left : undefined) ?? own.right) - DROP_LINE_INSET
      return { ...buildLanes(g.rows, id, laneOf?.(id), boxes?.(g)), left, width: right - left }
    },
    resolve: (id, p, s) => {
      const slot = laneSlot(s, p.y, across)
      return slot && (accepts?.(slot, id) ?? true) ? slot : null
    },
    ...spec,
  }
}

export const rowLine = (slot: LaneSlot, s: LaneSnap, inset: string): CSSProperties => ({
  top: slot.edge,
  left: `calc(${px(s.left)} + ${inset})`,
  width: `calc(${px(s.width)} - ${inset})`,
  right: 'auto',
})

export function rowStep(
  slot: LaneSlot,
  s: LaneSnap,
  headed: boolean,
): { part: StepPart; id: string } {
  if (slot.index === 0 && headed) return { part: 'into', id: slot.lane }
  if (slot.before !== null) return { part: 'before', id: slot.before }
  const lane = s.list.find((l) => l.key === slot.lane)!
  return { part: 'after', id: lane.slots[slot.index - 1].before! }
}
