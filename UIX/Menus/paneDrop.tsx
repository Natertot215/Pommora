// Slot indexes are in the persisted arrays' without-dragged coordinates.

import type { ReactNode } from 'react'
import { LineGroup, type LineSpec, useLineSlot } from '../Interactions/drag'
import {
  buildLanes,
  laneAt,
  type LaneSlot,
  type Lanes,
  rowSlot,
} from '../Interactions/reorderModel'
import { cx } from '../Utilities/cx'
import { restHighlight } from './frames.css'
import { menuDropLine } from './MenuRows'

// Two lanes: the members, ordered, and the rest, which a pane may order (`ordersRest`) or not.
export type PaneDrop =
  | { kind: 'reorder-members'; id: string; toIndex: number }
  | { kind: 'reorder-rest'; id: string; toIndex: number }
  | { kind: 'join'; id: string; toIndex: number }
  | { kind: 'leave'; id: string }

type PaneSlot = LaneSlot | 'leave'
type PaneSnap = Lanes & { bottom: number }

function paneSlot(
  s: PaneSnap,
  y: number,
  id: string,
  ordersRest: boolean,
  pinned?: string,
): PaneSlot | null {
  if (y < 0 || y > s.bottom) return null
  const lane = laneAt(s, y)
  if (lane?.key === 'rest' && s.home?.key === 'members') return id === pinned ? null : 'leave'
  if (lane?.key === 'rest' && !ordersRest) return null
  return rowSlot(lane, y)
}

const dropOf = (id: string, slot: PaneSlot, from: string | undefined): PaneDrop =>
  slot === 'leave'
    ? { kind: 'leave', id }
    : {
        kind:
          slot.lane === 'rest' ? 'reorder-rest' : from === 'members' ? 'reorder-members' : 'join',
        id,
        toIndex: slot.index,
      }

export function paneSpec({
  members,
  ordersRest,
  pinned,
  titles,
  label,
  glyph,
  onDrop,
  watch,
}: {
  members: readonly string[]
  ordersRest: boolean
  pinned?: string
  titles: { members: string; rest: string }
  label: (id: string) => string
  glyph: (id: string) => ReactNode
  onDrop: (drop: PaneDrop) => void
  watch: readonly unknown[]
}): LineSpec<PaneSlot, PaneSnap> {
  return {
    snap: (id, g) => {
      const upper = new Set(members)
      const lanes = buildLanes(g.rows, id, (x) => (upper.has(x) ? 'members' : 'rest'), g.groups)
      return { ...lanes, bottom: g.bottom }
    },
    resolve: (id, point, s) => paneSlot(s, point.y, id, ordersRest, pinned),
    commit: (id, slot, s) => onDrop(dropOf(id, slot, s.home?.key)),
    line: (slot) => (slot === 'leave' ? null : menuDropLine(slot)),
    step: (slot) => (slot === 'leave' ? { part: 'into', id: 'rest' } : null),
    label: (id) => (id === 'members' || id === 'rest' ? titles[id] : label(id)),
    glyph,
    watch,
  }
}

export function PaneRestGroup({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}): React.JSX.Element {
  const into = useLineSlot<PaneSlot>() === 'leave'
  return (
    <LineGroup id="rest" className={cx(className, into && restHighlight)}>
      {children}
    </LineGroup>
  )
}
