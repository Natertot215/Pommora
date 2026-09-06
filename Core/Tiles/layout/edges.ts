import type { DividerRef, Edge, TileLayout } from './model'
import { findTile } from './model'

export type EdgeBoundary =
  | { kind: 'divider'; ref: DividerRef }
  | { kind: 'stack'; ref: DividerRef }
  | { kind: 'bandpair'; above: number }
  | null

export function resolveEdge(layout: TileLayout, tileId: string, edge: Edge): EdgeBoundary {
  if (edge === 's') return null
  const at = findTile(layout, tileId)
  if (!at) return null

  const wantKind = edge === 'n' ? 'column' : 'row'
  const trailing = edge === 'e'

  for (let depth = at.path.length - 1; depth >= 0; depth--) {
    const parentPath = at.path.slice(0, depth)
    let node = layout.bands[at.band]?.node
    for (const i of parentPath) {
      if (!node || node.kind === 'tile') return null
      node = node.children[i]
    }
    if (!node || node.kind !== wantKind) continue

    const childIndex = at.path[depth] as number
    if (edge === 'n') {
      if (childIndex > 0)
        return { kind: 'stack', ref: { band: at.band, path: parentPath, index: childIndex - 1 } }
      continue
    }
    if (trailing && childIndex < node.children.length - 1)
      return { kind: 'divider', ref: { band: at.band, path: parentPath, index: childIndex } }
    if (!trailing && childIndex > 0)
      return { kind: 'divider', ref: { band: at.band, path: parentPath, index: childIndex - 1 } }
  }

  // A full-width tile's north edge crosses the band seam: negotiate with the
  // band above when both roots are plain tiles (each has one height to give).
  if (edge === 'n' && at.path.length === 0 && at.band > 0) {
    const above = layout.bands[at.band - 1]?.node
    if (above?.kind === 'tile') return { kind: 'bandpair', above: at.band - 1 }
  }
  return null
}
