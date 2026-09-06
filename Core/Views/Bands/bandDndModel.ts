// A drop slot resolves its IMPLIED PARENT from the band below the line — the router compares it against the dragged band's current parent to pick reorder vs reparent (a flat array alone can never lift a child past its parent).

import type { ResolvedGroup } from '@pommora/core/Views/viewRow'
import { type MeasuredRow, nextOrder } from '@pommora/uix/Interactions/reorderModel'

export interface Band {
  id: string
  kind: 'set' | 'property'
  depth: number
  parentId: string | null
}

export interface BandSlot {
  beforeId: string | null
  impliedParentId: string | null
  nestInto: string | null
  lineY: number
}

/** Top/bottom fraction of a set band that reads as a before/after slot; the middle nests. */
const NEST_ZONE = 0.3

/** A ResolvedGroup's own isCollapsed is a snapshot; the render reads live state. The ungrouped tail is a non-entity: no band, no drag, no target. */
export function flattenBands(groups: ResolvedGroup[], collapsed: Set<string>): Band[] {
  const out: Band[] = []
  const walk = (gs: ResolvedGroup[], depth: number, parentId: string | null): void => {
    for (const g of gs) {
      if (g.kind === 'ungrouped') continue
      out.push({
        id: g.key,
        kind: g.kind === 'structural-set' ? 'set' : 'property',
        depth,
        parentId,
      })
      if (g.children && !collapsed.has(g.key)) walk(g.children, depth + 1, g.key)
    }
  }
  walk(groups, 0, null)
  return out
}

export function canNest(draggedId: string, targetId: string, bands: Band[]): boolean {
  const byId = new Map(bands.map((b) => [b.id, b]))
  return byId.get(targetId)?.kind === 'set' && !walksTo(targetId, draggedId, byId)
}

function walksTo(fromId: string, ancestorId: string, byId: Map<string, Band>): boolean {
  let cur: string | null = fromId
  while (cur) {
    if (cur === ancestorId) return true
    cur = byId.get(cur)?.parentId ?? null
  }
  return false
}

/** Built ONCE at activation: hit-testing runs per pointermove and must never allocate or rebuild indexes. */
export interface BandIndex {
  byId: Map<string, Band>
  rows: MeasuredRow[]
}

export function buildBandIndex(bands: Band[], measured: MeasuredRow[]): BandIndex {
  const byId = new Map(bands.map((b) => [b.id, b]))
  return { byId, rows: measured.filter((m) => byId.has(m.id)) }
}

export function bandSlot(
  index: BandIndex,
  y: number,
  draggedId: string,
  endY: number,
  nestable = true,
): BandSlot | null {
  const { byId, rows } = index
  if (rows.length === 0) return null

  const inDraggedSubtree = (id: string): boolean => walksTo(id, draggedId, byId)

  // The band below the line owns the level; skipping the dragged subtree makes "just above the dragged band" resolve to its own current position rather than an inside-itself slot.
  const slotBefore = (i: number, lineY: number): BandSlot | null => {
    let j = i
    while (j < rows.length && inDraggedSubtree(rows[j].id)) j++
    if (j >= rows.length) return { beforeId: null, impliedParentId: null, nestInto: null, lineY }
    const below = byId.get(rows[j].id)
    if (!below) return null
    if (below.parentId !== null && inDraggedSubtree(below.parentId)) return null
    return { beforeId: below.id, impliedParentId: below.parentId, nestInto: null, lineY }
  }

  let idx = -1
  for (const [i, m] of rows.entries()) {
    if (y >= m.top) idx = i
    else break
  }
  if (idx === -1) return slotBefore(0, rows[0].top)
  const row = rows[idx]
  const band = byId.get(row.id)
  if (!band) return null
  const inset = (row.bottom - row.top) * NEST_ZONE

  if (y < row.top + inset) return slotBefore(idx, row.top)
  const regionEnd = idx < rows.length - 1 ? rows[idx + 1].top : Math.max(endY, row.bottom)
  if (nestable && band.kind === 'set' && y < regionEnd && !inDraggedSubtree(band.id)) {
    return { beforeId: null, impliedParentId: band.id, nestInto: band.id, lineY: row.mid }
  }
  if (idx === rows.length - 1 && y >= regionEnd) {
    return { beforeId: null, impliedParentId: null, nestInto: null, lineY: regionEnd }
  }
  if (y < row.mid) return slotBefore(idx, row.top)
  return slotBefore(idx + 1, rows[idx + 1] ? rows[idx + 1].top : row.bottom)
}

/** Merge-then-move over the FULL id set, never the visible flatten, so collapsed siblings always survive. */
export function structuralOrderAfterDrop(
  priorOrder: string[],
  fullTreeIds: string[],
  draggedId: string,
  beforeId: string | null,
): string[] {
  const tree = new Set(fullTreeIds)
  const kept = priorOrder.filter((id) => tree.has(id))
  const listed = new Set(kept)
  const seeded = [...kept, ...fullTreeIds.filter((id) => !listed.has(id))]
  return nextOrder(seeded, draggedId, beforeId)
}

export function propertyOrderAfterDrop(
  presentKeys: string[],
  draggedKey: string,
  beforeKey: string | null,
): string[] {
  return nextOrder(presentKeys, draggedKey, beforeKey)
}

/** Its CURRENT children + the moved id APPENDED — never the visual drop position, which persists only in the view's group_order: the per-view order must not leak into the filesystem. */
export function reparentFsOrder(destChildIds: string[], movedId: string): string[] {
  return [...destChildIds.filter((id) => id !== movedId), movedId]
}
