// Slot indexes are in the persisted arrays' without-dragged coordinates.

import type { ReactNode } from 'react'
import { LineGroup, type LineSpec, useLineSlot } from '@pommora/uix/Interactions/drag'
import {
  buildLanes,
  laneAt,
  type LaneSlot,
  type Lanes,
  rowSlot,
} from '@pommora/uix/Interactions/reorderModel'
import { rowDropLine } from '@pommora/uix/Menus'
import { allHighlight } from '@pommora/uix/Menus/frames.css'
import { cx } from '@pommora/uix/Utilities/cx'

// The schema pane and the view-visibility pane derive from this vocabulary and refuse drops differently by design: the schema pane's bottom zone is the ordered nexus registry and reorders, the view pane's is a derived hidden list with no order and can't.
// Title and every reserved property is never removable: the schema pane filters reserved ids out of both zones, the view pane refuses to hide Title.
export type PaneDrop =
  | { kind: 'reorder-assigned'; propId: string; toIndex: number } // → schema.reorder
  | { kind: 'reorder-nexus'; propId: string; toIndex: number } // → registry.reorder
  | { kind: 'assign'; propId: string; toIndex: number }
  | { kind: 'unassign'; propId: string }

export type PaneSlot = LaneSlot | 'unassign'

/** The full order still holds every assigned id, so a raw visible index would land the drop among hidden rows. */
export function nexusReorderIndex(
  orderedIds: string[],
  visibleIds: string[],
  draggedId: string,
  visibleToIndex: number,
): number {
  const full = orderedIds.filter((id) => id !== draggedId)
  const visible = visibleIds.filter((id) => id !== draggedId)
  const successor = visible[visibleToIndex]
  if (successor !== undefined) return full.indexOf(successor)
  const last = visible[visible.length - 1]
  return last !== undefined ? full.indexOf(last) + 1 : full.length
}

function paneSlot(
  s: Lanes,
  y: number,
  id: string,
  ordersAll: boolean,
  pinned?: string,
): PaneSlot | null {
  const lane = laneAt(s, y)
  if (lane?.key === 'all' && s.home?.key === 'assigned') return id === pinned ? null : 'unassign'
  if (lane?.key === 'all' && !ordersAll) return null
  return rowSlot(lane, y)
}

const dropOf = (id: string, slot: PaneSlot, from: string | undefined): PaneDrop =>
  slot === 'unassign'
    ? { kind: 'unassign', propId: id }
    : {
        kind:
          slot.lane === 'all'
            ? 'reorder-nexus'
            : from === 'assigned'
              ? 'reorder-assigned'
              : 'assign',
        propId: id,
        toIndex: slot.index,
      }

export function paneSpec({
  assigned,
  ordersAll,
  pinned,
  titles,
  label,
  glyph,
  onDrop,
  watch,
}: {
  assigned: readonly string[]
  ordersAll: boolean
  pinned?: string
  titles: { assigned: string; all: string }
  label: (id: string) => string
  glyph: (id: string) => ReactNode
  onDrop: (drop: PaneDrop) => void
  watch: readonly unknown[]
}): LineSpec<PaneSlot, Lanes> {
  return {
    snap: (id, g) => {
      const upper = new Set(assigned)
      return buildLanes(g.rows, id, (x) => (upper.has(x) ? 'assigned' : 'all'), g.groups)
    },
    resolve: (id, point, s) => paneSlot(s, point.y, id, ordersAll, pinned),
    commit: (id, slot, s) => onDrop(dropOf(id, slot, s.home?.key)),
    line: (slot) => (slot === 'unassign' ? null : rowDropLine(slot.edge)),
    step: (slot) => (slot === 'unassign' ? { part: 'into', id: 'all' } : null),
    label: (id) => (id === 'assigned' || id === 'all' ? titles[id] : label(id)),
    glyph,
    watch,
  }
}

export function PaneAllGroup({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}): React.JSX.Element {
  const into = useLineSlot<PaneSlot>() === 'unassign'
  return (
    <LineGroup id="all" className={cx(className, into && allHighlight)}>
      {children}
    </LineGroup>
  )
}
