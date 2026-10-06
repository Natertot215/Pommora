import type { DividerRef, Edge, LayoutNode, TileBand, TileLayout, TileLeaf } from './model'
import { cloneLayout, findTile, getTile, NEW_TILE_H, nodeAt } from './model'
import { clamp } from '@pommora/uix/Utilities/clamp'

// A share that isn't positive takes the mean of those that are, so a row a hand edit broke still draws every child.
function renormalize(ratios: number[]): number[] {
  const positive = ratios.filter((r) => r > 0)
  const fill = positive.length ? positive.reduce((a, r) => a + r, 0) / positive.length : 1
  const filled = ratios.map((r) => (r > 0 ? r : fill))
  const sum = filled.reduce((a, r) => a + r, 0)
  return Math.abs(sum - 1) < 1e-9 ? filled : filled.map((r) => r / sum)
}

// Rebuilds the tree from the leaves `keep` returns: a container left with one child collapses into it, an emptied one goes, and a row's shares renormalize over the children it kept.
function rebuild(layout: TileLayout, keep: (leaf: TileLeaf) => TileLeaf | null): TileLayout {
  const walk = (n: LayoutNode): LayoutNode | null => {
    if (n.kind === 'tile') return keep(n)
    const kept = n.children.map(walk)
    const children = kept.filter((c): c is LayoutNode => c !== null)
    if (children.length < 2) return children[0] ?? null
    if (n.kind === 'column') return { kind: 'column', children }
    const ratios = kept.flatMap((c, i) => (c === null ? [] : [n.ratios[i] ?? 0]))
    return { kind: 'row', ratios: renormalize(ratios), children }
  }
  return {
    bands: layout.bands.flatMap((b) => {
      const root = walk(b.node)
      return root ? [{ node: root }] : []
    }),
  }
}

/** The rules every op keeps, applied to a stored tree: one leaf per id (the first wins), a height of at least `minPx`, and positive shares that sum to one. */
export function repairLayout(layout: TileLayout, minPx: number): TileLayout {
  const seen = new Set<string>()
  return rebuild(layout, (leaf) => {
    if (seen.has(leaf.id)) return null
    seen.add(leaf.id)
    return leaf.h < minPx ? { ...leaf, h: minPx } : leaf
  })
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

function placeLeaf(layout: TileLayout, targetId: string, edge: Edge, leaf: TileLeaf): TileLayout {
  const at = findTile(layout, targetId)
  if (!at || findTile(layout, leaf.id)) return layout

  const next = cloneLayout(layout)
  const band = next.bands[at.band]
  if (!band) return layout
  const dir = edge === 'e' || edge === 'w' ? 'row' : 'column'
  const first = edge === 'w' || edge === 'n'

  const parentPath = at.path.slice(0, -1)
  const childIndex = at.path[at.path.length - 1]
  const parent = at.path.length > 0 ? nodeAt(next, { band: at.band, path: parentPath }) : null

  if (parent && parent.kind === dir && childIndex !== undefined) {
    const insertAt = first ? childIndex : childIndex + 1
    parent.children.splice(insertAt, 0, leaf)
    if (parent.kind === 'row') {
      const half = (parent.ratios[childIndex] ?? 0) / 2
      parent.ratios[childIndex] = half
      parent.ratios.splice(insertAt, 0, half)
      parent.ratios = renormalize(parent.ratios)
    }
    return next
  }

  const target = nodeAt(next, at) as TileLeaf
  const pair = first ? [leaf, target] : [target, leaf]
  const split: LayoutNode =
    dir === 'row'
      ? { kind: 'row', ratios: [0.5, 0.5], children: pair }
      : { kind: 'column', children: pair }
  band.node = replaceAt(band.node, at.path, split)
  return next
}

/** A row placement (e/w) adopts the target's height, so a drop beside a tile lands flush instead of importing the mover's old height as a ragged end; stacking (n/s) keeps it. */
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
  return placeLeaf(removed, targetId, edge, { kind: 'tile', id: tileId, h })
}

export function removeLeaf(layout: TileLayout, tileId: string): TileLayout {
  if (!findTile(layout, tileId)) return layout
  return rebuild(layout, (leaf) => (leaf.id === tileId ? null : leaf))
}

export function attachBelow(
  layout: TileLayout,
  targetId: string,
  newId: string,
  h: number,
): TileLayout {
  return placeLeaf(layout, targetId, 's', { kind: 'tile', id: newId, h })
}

export function insertBand(
  layout: TileLayout,
  index: number,
  tileId: string,
  height: number,
): TileLayout {
  if (findTile(layout, tileId)) return layout
  const next = cloneLayout(layout)
  const at = clamp(index, 0, next.bands.length)
  const band: TileBand = { node: { kind: 'tile', id: tileId, h: height } }
  next.bands.splice(at, 0, band)
  return next
}

/** A new leaf lands under `under` at height `h`, or as the board's last band — at `h` when there is no tile to seat it under, at the default when there is no height. */
export function seatBelow(
  layout: TileLayout,
  id: string,
  under: string | null,
  h: number | undefined,
): TileLayout {
  if (under !== null && h !== undefined) return attachBelow(layout, under, id, h)
  return insertBand(
    layout,
    layout.bands.length,
    id,
    under === null && h !== undefined ? h : NEW_TILE_H,
  )
}

/** The index is against the layout as given — when the tile currently IS a band above the target, its removal shifts the band list, so the insertion compensates. */
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
  const next = cloneLayout(layout)
  const node = nodeAt(next, ref)
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

// Pair negotiation is tile-to-tile; a nested split neighbor doesn't have one height to give, so that edge trades nothing.
function tradeHeights(
  above: LayoutNode | undefined,
  below: LayoutNode | undefined,
  deltaPx: number,
  minPx: number,
): boolean {
  if (above?.kind !== 'tile' || below?.kind !== 'tile' || above.h + below.h < minPx * 2)
    return false
  const delta = clamp(deltaPx, minPx - above.h, below.h - minPx)
  if (delta === 0) return false
  above.h += delta
  below.h -= delta
  return true
}

export function resizeStackPair(
  layout: TileLayout,
  ref: DividerRef,
  deltaPx: number,
  minPx: number,
): TileLayout {
  if (deltaPx === 0) return layout
  const next = cloneLayout(layout)
  const node = nodeAt(next, ref)
  if (node?.kind !== 'column') return layout
  return tradeHeights(node.children[ref.index], node.children[ref.index + 1], deltaPx, minPx)
    ? next
    : layout
}

export function resizeBandPair(
  layout: TileLayout,
  aboveIndex: number,
  deltaPx: number,
  minPx: number,
): TileLayout {
  if (deltaPx === 0) return layout
  const next = cloneLayout(layout)
  return tradeHeights(
    next.bands[aboveIndex]?.node,
    next.bands[aboveIndex + 1]?.node,
    deltaPx,
    minPx,
  )
    ? next
    : layout
}
