import type { Band, DividerRef, Edge, LayoutNode, TileLayout, TileLeaf } from './model'
import { cloneLayout, findTile, getTile } from './model'
import { clamp } from '@shared/clamp'

function renormalize(ratios: number[]): number[] {
  const sum = ratios.reduce((a, r) => a + r, 0)
  return ratios.map((r) => r / sum)
}

function parentAt(root: LayoutNode, path: number[]): LayoutNode {
  return path.reduce<LayoutNode>((n, i) => (n.kind === 'tile' ? n : (n.children[i] ?? n)), root)
}

function replaceAt(node: LayoutNode, path: number[], next: LayoutNode): LayoutNode {
  if (path.length === 0) return next
  if (node.kind === 'tile') return node
  const [head, ...rest] = path
  const children = node.children.map((child, i) =>
    i === head ? replaceAt(child, rest, next) : child,
  )
  return node.kind === 'row' ? { ...node, children } : { kind: 'column', children }
}

function placeLeaf(
  layout: TileLayout,
  targetId: string,
  edge: Edge,
  leaf: TileLeaf,
  share: number,
): TileLayout {
  const at = findTile(layout, targetId)
  if (!at || findTile(layout, leaf.id)) return layout

  const next = cloneLayout(layout)
  const band = next.bands[at.band]
  if (!band) return layout
  const dir = edge === 'e' || edge === 'w' ? 'row' : 'column'
  const first = edge === 'w' || edge === 'n'

  const parentPath = at.path.slice(0, -1)
  const childIndex = at.path[at.path.length - 1]
  const parent = at.path.length > 0 ? parentAt(band.node, parentPath) : null

  if (parent && parent.kind === dir && childIndex !== undefined) {
    const insertAt = first ? childIndex : childIndex + 1
    parent.children.splice(insertAt, 0, leaf)
    if (parent.kind === 'row') {
      const targetRatio = parent.ratios[childIndex] ?? 0
      parent.ratios[childIndex] = targetRatio * (1 - share)
      parent.ratios.splice(insertAt, 0, targetRatio * share)
      parent.ratios = renormalize(parent.ratios)
    }
    return next
  }

  const target = parentAt(band.node, at.path) as TileLeaf
  const pair = first ? [leaf, target] : [target, leaf]
  const split: LayoutNode =
    dir === 'row'
      ? { kind: 'row', ratios: first ? [share, 1 - share] : [1 - share, share], children: pair }
      : { kind: 'column', children: pair }
  band.node = replaceAt(band.node, at.path, split)
  return next
}

export function splitAtTile(
  layout: TileLayout,
  targetId: string,
  edge: Edge,
  newId: string,
  share = 0.5,
): TileLayout {
  const target = getTile(layout, targetId)
  if (!target) return layout
  const vertical = edge === 'n' || edge === 's'
  const leaf: TileLeaf = {
    kind: 'tile',
    id: newId,
    h: vertical ? Math.round(target.h * share) : target.h,
  }
  const placed = placeLeaf(layout, targetId, edge, leaf, share)
  if (placed === layout) return layout
  if (vertical) {
    const t = getTile(placed, targetId) as TileLeaf
    t.h = Math.max(1, target.h - leaf.h)
  }
  return placed
}

/** Move an existing tile against a target edge. A row placement (e/w) adopts the
 *  target's height — dropping beside a tile lands flush with it instead of
 *  importing the mover's old height as a ragged end; stacking (n/s) keeps it. */
export function moveTile(
  layout: TileLayout,
  tileId: string,
  targetId: string,
  edge: Edge,
): TileLayout {
  if (tileId === targetId) return layout
  const mover = getTile(layout, tileId)
  if (!mover || !findTile(layout, targetId)) return layout
  const removed = removeLeaf(layout, tileId)
  const target = getTile(removed, targetId)
  if (!target) return layout
  const h = edge === 'e' || edge === 'w' ? target.h : mover.h
  return placeLeaf(removed, targetId, edge, { kind: 'tile', id: tileId, h }, 0.5)
}

export function removeLeaf(layout: TileLayout, tileId: string): TileLayout {
  const at = findTile(layout, tileId)
  if (!at) return layout

  const next = cloneLayout(layout)
  const band = next.bands[at.band]
  if (!band) return layout

  if (at.path.length === 0) {
    next.bands.splice(at.band, 1)
    return next
  }

  const parentPath = at.path.slice(0, -1)
  const childIndex = at.path[at.path.length - 1] as number
  const parent = parentAt(band.node, parentPath)
  if (parent.kind === 'tile') return layout

  parent.children.splice(childIndex, 1)
  if (parent.kind === 'row') {
    parent.ratios.splice(childIndex, 1)
    parent.ratios = renormalize(parent.ratios)
  }

  if (parent.children.length === 1) {
    const survivor = parent.children[0] as LayoutNode
    band.node = replaceAt(band.node, parentPath, survivor)
  }
  return next
}

export function attachBelow(
  layout: TileLayout,
  targetId: string,
  newId: string,
  h: number,
): TileLayout {
  return placeLeaf(layout, targetId, 's', { kind: 'tile', id: newId, h }, 0.5)
}

export function insertBand(
  layout: TileLayout,
  index: number,
  tileId: string,
  height: number,
): TileLayout {
  if (findTile(layout, tileId)) return layout
  const next = cloneLayout(layout)
  const at = Math.max(0, Math.min(index, next.bands.length))
  const band: Band = { node: { kind: 'tile', id: tileId, h: height } }
  next.bands.splice(at, 0, band)
  return next
}

/** Move an existing tile out into its own band at `index` (an index against the
 *  layout as given — when the tile currently IS a band above the target, its
 *  removal shifts the band list, so the insertion compensates). */
export function moveTileToBand(layout: TileLayout, tileId: string, index: number): TileLayout {
  const at = findTile(layout, tileId)
  const mover = getTile(layout, tileId)
  if (!at || !mover) return layout
  const ownBand = at.path.length === 0
  const insertAt = ownBand && at.band < index ? index - 1 : index
  if (ownBand && insertAt === at.band) return layout
  const removed = removeLeaf(layout, tileId)
  return insertBand(removed, insertAt, tileId, mover.h)
}

export function resizeDivider(
  layout: TileLayout,
  ref: DividerRef,
  deltaPx: number,
  extentPx: number,
  minPx: number,
): TileLayout {
  if (extentPx <= 0) return layout
  const next = cloneLayout(layout)
  let node = next.bands[ref.band]?.node
  for (const i of ref.path) {
    if (!node || node.kind === 'tile') return layout
    node = node.children[i]
  }
  if (node?.kind !== 'row') return layout
  const a = node.ratios[ref.index]
  const b = node.ratios[ref.index + 1]
  if (a === undefined || b === undefined) return layout

  const pair = a + b
  if (pair * extentPx < minPx * 2) return layout
  const minRatio = Math.min(minPx / extentPx, pair / 2)
  const nextA = clamp(a + deltaPx / extentPx, minRatio, pair - minRatio)
  node.ratios[ref.index] = nextA
  node.ratios[ref.index + 1] = pair - nextA
  return next
}

export function stretchTileHeight(
  layout: TileLayout,
  tileId: string,
  deltaPx: number,
  minPx: number,
): TileLayout {
  if (deltaPx === 0) return layout
  const current = getTile(layout, tileId)
  if (!current) return layout
  const h = Math.max(minPx, current.h + deltaPx)
  if (h === current.h) return layout
  const next = cloneLayout(layout)
  ;(getTile(next, tileId) as TileLeaf).h = h
  return next
}

export function resizeStackPair(
  layout: TileLayout,
  ref: DividerRef,
  deltaPx: number,
  minPx: number,
): TileLayout {
  if (deltaPx === 0) return layout
  const next = cloneLayout(layout)
  let node = next.bands[ref.band]?.node
  for (const i of ref.path) {
    if (!node || node.kind === 'tile') return layout
    node = node.children[i]
  }
  if (node?.kind !== 'column') return layout
  const above = node.children[ref.index]
  const below = node.children[ref.index + 1]
  // Pair negotiation is tile-to-tile; a nested split neighbor doesn't have one
  // height to give — those edges stretch instead (the caller falls back).
  if (above?.kind !== 'tile' || below?.kind !== 'tile') return layout
  const delta = clamp(deltaPx, minPx - above.h, below.h - minPx)
  if (delta === 0) return layout
  above.h += delta
  below.h -= delta
  return next
}

/** Two adjacent full-width bands negotiate the seam — one grows what the other gives, so the
 *  tiles below stay put. */
export function resizeBandPair(
  layout: TileLayout,
  aboveIndex: number,
  deltaPx: number,
  minPx: number,
): TileLayout {
  if (deltaPx === 0) return layout
  const next = cloneLayout(layout)
  const above = next.bands[aboveIndex]?.node
  const below = next.bands[aboveIndex + 1]?.node
  if (above?.kind !== 'tile' || below?.kind !== 'tile') return layout
  const delta = clamp(deltaPx, minPx - above.h, below.h - minPx)
  if (delta === 0) return layout
  above.h += delta
  below.h -= delta
  return next
}
