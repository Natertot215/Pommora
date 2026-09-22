// Slot indexes are in the persisted arrays' without-dragged coordinates.

import {
  type FrameSlot,
  regionScan,
  type SlotFor,
  withinRegion,
} from '@pommora/uix/Interactions/frameDndModel'

// The schema pane and the view-visibility pane derive from this vocabulary and refuse drops differently by design: the schema pane's bottom zone is the ordered nexus registry and reorders, the view pane's is a derived hidden list with no order and can't.
// Title and every reserved property is never removable: the schema pane filters reserved ids out of both zones, the view pane refuses to hide Title.
export type PaneDrop =
  | { kind: 'reorder-assigned'; propId: string; toIndex: number } // → schema.reorder
  | { kind: 'reorder-nexus'; propId: string; toIndex: number } // → registry.reorder
  | { kind: 'assign'; propId: string; toIndex: number }
  | { kind: 'unassign'; propId: string }

export type PaneSlot = FrameSlot<PaneDrop>

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

export const frameSlot: SlotFor<PaneDrop> = (rows, byId, regions, pointerY, draggedId) => {
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
