import type { MeasuredRow } from '@pommora/uix/Interactions/reorderModel'
import {
  isReservedPropertyId,
  type PropertyDefinition,
  RESERVED_PROPERTY_ID,
  STAMP_TYPE,
} from '@pommora/core/Properties/properties'
import type { SavedView } from '@pommora/core/Views/views'
import {
  nexusReorderIndex,
  regionScan,
  withinRegion,
  type FrameRow,
  type FrameSlot,
  type Region,
} from '@pommora/uix/Interactions/frameDndModel'

type VisibilityPatch = Pick<SavedView, 'property_order' | 'hidden_properties'>

/** Explicitly hidden OR unaccounted for in property_order — which is what makes a prop or Context created after the view revealable rather than invisible. */
export function hiddenListIds(
  view: SavedView,
  schema: PropertyDefinition[],
  contextIds: readonly string[] = [],
): string[] {
  const set = new Set(view.hidden_properties)
  const shown = new Set(view.property_order)
  const nonShown = (id: string): boolean => set.has(id) || !shown.has(id)
  return [
    ...contextIds.filter(nonShown),
    ...schema.filter((d) => !isReservedPropertyId(d.id) && nonShown(d.id)).map((d) => d.id),
    ...Object.keys(STAMP_TYPE).filter(nonShown),
  ]
}

export function placeInShown(
  view: SavedView,
  fullVisibleIds: string[],
  sectionIds: string[],
  id: string,
  toIndex: number,
): VisibilityPatch {
  const next = fullVisibleIds.filter((x) => x !== id)
  next.splice(nexusReorderIndex(fullVisibleIds, sectionIds, id, toIndex), 0, id)
  return {
    property_order: [...next, ...view.property_order.filter((x) => !next.includes(x))],
    hidden_properties: view.hidden_properties.filter((x) => x !== id),
  }
}

/** Hide a shown property — flag it, never move it: its property_order slot is its remembered spot, so a later unhide restores it where it was. */
export function hideShown(view: SavedView, id: string): Pick<SavedView, 'hidden_properties'> {
  return {
    hidden_properties: view.hidden_properties.includes(id)
      ? view.hidden_properties
      : [...view.hidden_properties, id],
  }
}

export function unhide(view: SavedView, id: string): VisibilityPatch {
  return {
    property_order: view.property_order.includes(id)
      ? view.property_order
      : [...view.property_order, id],
    hidden_properties: view.hidden_properties.filter((x) => x !== id),
  }
}

/** The shown zone takes positional drops (reorder or unhide-at-slot); the hidden zone takes a membership drop from a shown row. */
export function hiddenPaneSlot(
  rows: MeasuredRow[],
  byId: Map<string, FrameRow>,
  regions: { assigned: Region; all: Region },
  pointerY: number,
  draggedId: string,
): FrameSlot | null {
  const dragged = byId.get(draggedId)
  if (!dragged) return null
  if (withinRegion(regions.all, pointerY) && !withinRegion(regions.assigned, pointerY)) {
    if (dragged.group !== 'assigned' || draggedId === RESERVED_PROPERTY_ID.title) return null
    return { drop: { kind: 'unassign', propId: draggedId }, lineY: null, highlightAll: true }
  }
  if (!withinRegion(regions.assigned, pointerY)) return null
  const { i, lineY } = regionScan(rows, byId, 'assigned', draggedId, pointerY, regions.assigned.top)
  return {
    drop: {
      kind: dragged.group === 'assigned' ? 'reorder-assigned' : 'assign',
      propId: draggedId,
      toIndex: i,
    },
    lineY,
    highlightAll: false,
  }
}
