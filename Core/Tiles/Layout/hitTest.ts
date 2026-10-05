import type { Edge, TileLayout } from './model'
import type { TileGeometry } from './rects'

export type DropTarget =
  | { kind: 'tile'; id: string; edge: Edge }
  | { kind: 'band'; index: number }
  | null

export const sameTarget = (a: DropTarget, b: DropTarget): boolean =>
  a?.kind === 'tile' && b?.kind === 'tile'
    ? a.id === b.id && a.edge === b.edge
    : a?.kind === 'band' && b?.kind === 'band'
      ? a.index === b.index
      : a === b

export function hitTest(
  geometry: TileGeometry,
  layout: TileLayout,
  dragId: string,
  px: number,
  py: number,
  bandZonePx: number,
  prev: DropTarget,
  hysteresisPx: number,
): DropTarget {
  if (py < bandZonePx) return { kind: 'band', index: 0 }
  // Append owns only the pad BELOW the content — the last band's south edges stay targetable.
  if (py > geometry.totalHeight) return { kind: 'band', index: layout.bands.length }
  for (const [band, y] of geometry.seams.slice(0, -1).entries()) {
    if (Math.abs(py - y) <= bandZonePx) return { kind: 'band', index: band + 1 }
  }

  for (const [id, r] of geometry.tiles) {
    if (id === dragId) continue
    if (px < r.x || px > r.x + r.w || py < r.y || py > r.y + r.h) continue
    const relX = (px - r.x) / r.w
    const relY = (py - r.y) / r.h
    const dists: Array<[Edge, number]> = [
      ['w', relX],
      ['e', 1 - relX],
      ['n', relY],
      ['s', 1 - relY],
    ]
    dists.sort((a, b) => a[1] - b[1])
    const best = dists[0]?.[0] ?? 'e'

    if (prev?.kind === 'tile' && prev.id === id && prev.edge !== best) {
      const margin = hysteresisPx / Math.min(r.w, r.h)
      const prevDist = dists.find(([edge]) => edge === prev.edge)?.[1] ?? Infinity
      const bestDist = dists[0]?.[1] ?? 0
      if (prevDist - bestDist < margin) return prev
    }
    return { kind: 'tile', id, edge: best }
  }
  return null
}
