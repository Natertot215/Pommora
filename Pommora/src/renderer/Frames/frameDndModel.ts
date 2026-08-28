// Pure model behind the Properties frame's two-region drag — no React, no DOM. One gesture
// surface, two persistence targets: the pointer's REGION decides everything; the rows
// only refine the insertion slot within it. Slot indexes land in the persisted arrays'
// without-dragged coordinates — the filter-then-splice idiom both reorder ops share.

import type { MeasuredRow } from '@renderer/Sidebar/sidebarDndModel'

export type FrameRow = { id: string; group: 'assigned' | 'all' }

export type PaneDrop =
  | { kind: 'reorder-assigned'; propId: string; toIndex: number } // → schema.reorder
  | { kind: 'reorder-nexus'; propId: string; toIndex: number } // → registry.reorder
  | { kind: 'assign'; propId: string; toIndex: number } // all → assigned at the slot
  | { kind: 'unassign'; propId: string } // assigned → all; area highlight, natural slot

export type FrameSlot = { drop: PaneDrop; lineY: number | null; highlightAll: boolean }
export type Region = { top: number; bottom: number }

/** Translate an All-Properties visible slot (counted over unassigned rows only) into the FULL
 *  nexus-order index `registry:reorder` splices at — the full order still holds every assigned
 *  id, so the raw visible index would land the drop among hidden rows. Anchors on
 *  the visible successor's full-order position; past the last visible row appends after it. */
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

export const withinRegion = (r: Region, pointerY: number): boolean =>
  pointerY >= r.top && pointerY <= r.bottom

/** The midpoint scan both pane models share: the insertion index among one group's rows (the
 *  dragged row excluded) and the line's Y — the next row's top, the last row's bottom, or the
 *  region's own top when the group is empty. */
export function regionScan(
  rows: MeasuredRow[],
  byId: Map<string, FrameRow>,
  group: FrameRow['group'],
  draggedId: string,
  pointerY: number,
  emptyTop: number,
): { i: number; lineY: number } {
  const groupRows = rows.filter((r) => byId.get(r.id)?.group === group && r.id !== draggedId)
  let i = 0
  while (i < groupRows.length && pointerY >= groupRows[i].mid) i++
  const last = groupRows[groupRows.length - 1]
  const lineY = i < groupRows.length ? groupRows[i].top : last ? last.bottom : emptyTop
  return { i, lineY }
}

export function frameSlot(
  rows: MeasuredRow[],
  byId: Map<string, FrameRow>,
  regions: { assigned: Region; all: Region },
  pointerY: number,
  draggedId: string,
): FrameSlot | null {
  const dragged = byId.get(draggedId)
  if (!dragged) return null
  const region = withinRegion(regions.assigned, pointerY)
    ? 'assigned'
    : withinRegion(regions.all, pointerY)
      ? 'all'
      : null
  if (region === null) return null // outside both — release is a no-op

  if (region === 'all' && dragged.group === 'assigned') {
    return { drop: { kind: 'unassign', propId: draggedId }, lineY: null, highlightAll: true }
  }

  const { i, lineY } = regionScan(rows, byId, region, draggedId, pointerY, regions[region].top)
  const drop: PaneDrop =
    region === 'assigned'
      ? dragged.group === 'assigned'
        ? { kind: 'reorder-assigned', propId: draggedId, toIndex: i }
        : { kind: 'assign', propId: draggedId, toIndex: i }
      : { kind: 'reorder-nexus', propId: draggedId, toIndex: i }
  return { drop, lineY, highlightAll: false }
}
