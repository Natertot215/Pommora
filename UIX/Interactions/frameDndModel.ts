// Slot indexes are in the persisted arrays' without-dragged coordinates.

import type { MeasuredRow } from './reorderModel'

export type FrameRow = { id: string; group: 'assigned' | 'all' }

// The schema pane and the view-visibility pane derive from this vocabulary and refuse drops differently by design: the schema pane's bottom zone is the ordered nexus registry and reorders, the view pane's is a derived hidden list with no order and can't.
// Title and every reserved property is never removable: the schema pane filters reserved ids out of both zones, the view pane refuses to hide Title.
export type PaneDrop =
  | { kind: 'reorder-assigned'; propId: string; toIndex: number } // → schema.reorder
  | { kind: 'reorder-nexus'; propId: string; toIndex: number } // → registry.reorder
  | { kind: 'assign'; propId: string; toIndex: number }
  | { kind: 'unassign'; propId: string }

export type FrameSlot = { drop: PaneDrop; lineY: number | null; highlightAll: boolean }
export type Region = { top: number; bottom: number }

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

export const withinRegion = (r: Region, pointerY: number): boolean =>
  pointerY >= r.top && pointerY <= r.bottom

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
  if (region === null) return null

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
