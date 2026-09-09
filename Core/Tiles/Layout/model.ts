// Columns flow independently: a short column simply ends (ragged ends are legal), so trapped holes between tiles can't exist by construction.

export interface RowNode {
  kind: 'row'
  ratios: number[]
  children: LayoutNode[]
}

export interface ColumnNode {
  kind: 'column'
  children: LayoutNode[]
}

export interface TileLeaf {
  kind: 'tile'
  id: string
  h: number
}

export type LayoutNode = RowNode | ColumnNode | TileLeaf

export interface Band {
  node: LayoutNode
}

export interface TileLayout {
  bands: Band[]
}

export type Edge = 'n' | 's' | 'e' | 'w'

interface NodePath {
  band: number
  path: number[]
}

export interface DividerRef extends NodePath {
  index: number
}

export const emptyLayout = (): TileLayout => ({ bands: [] })

/** A row is as tall as its tallest child; shorter children end ragged. */
export function nodeHeight(node: LayoutNode, gap: number): number {
  if (node.kind === 'tile') return node.h
  if (node.kind === 'column') {
    const sum = node.children.reduce((a, c) => a + nodeHeight(c, gap), 0)
    return sum + gap * (node.children.length - 1)
  }
  return node.children.reduce((a, c) => Math.max(a, nodeHeight(c, gap)), 0)
}

function nodeAt(layout: TileLayout, ref: NodePath): LayoutNode | undefined {
  let node = layout.bands[ref.band]?.node
  for (const i of ref.path) {
    if (!node || node.kind === 'tile') return undefined
    node = node.children[i]
  }
  return node
}

export function findTile(
  layout: TileLayout,
  tileId: string,
): { band: number; path: number[] } | undefined {
  const walk = (node: LayoutNode, path: number[]): number[] | undefined => {
    if (node.kind === 'tile') return node.id === tileId ? path : undefined
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i]
      if (!child) continue
      const hit = walk(child, [...path, i])
      if (hit) return hit
    }
    return undefined
  }
  for (let b = 0; b < layout.bands.length; b++) {
    const band = layout.bands[b]
    if (!band) continue
    const hit = walk(band.node, [])
    if (hit) return { band: b, path: hit }
  }
  return undefined
}

export function getTile(layout: TileLayout, tileId: string): TileLeaf | undefined {
  const at = findTile(layout, tileId)
  if (!at) return undefined
  const node = nodeAt(layout, at)
  return node?.kind === 'tile' ? node : undefined
}

export function tileIds(layout: TileLayout): string[] {
  const out: string[] = []
  const walk = (node: LayoutNode): void => {
    if (node.kind === 'tile') {
      out.push(node.id)
      return
    }
    for (const child of node.children) walk(child)
  }
  for (const band of layout.bands) walk(band.node)
  return out
}

function cloneNode(node: LayoutNode): LayoutNode {
  if (node.kind === 'tile') return { kind: 'tile', id: node.id, h: node.h }
  if (node.kind === 'column') return { kind: 'column', children: node.children.map(cloneNode) }
  return { kind: 'row', ratios: [...node.ratios], children: node.children.map(cloneNode) }
}

export function cloneLayout(layout: TileLayout): TileLayout {
  return { bands: layout.bands.map((b) => ({ node: cloneNode(b.node) })) }
}

export function validateLayout(layout: TileLayout): string[] {
  const problems: string[] = []
  const walk = (node: LayoutNode, where: string): void => {
    if (node.kind === 'tile') {
      if (!(node.h > 0)) problems.push(`${where}: non-positive tile height`)
      return
    }
    if (node.kind === 'row') {
      if (node.ratios.some((r) => !(r > 0))) problems.push(`${where}: non-positive ratio`)
      const sum = node.ratios.reduce((a, r) => a + r, 0)
      if (Math.abs(sum - 1) > 1e-6) problems.push(`${where}: ratios sum to ${sum}`)
    }
    node.children.forEach((child, i) => {
      walk(child, `${where}.${i}`)
    })
  }
  layout.bands.forEach((band, i) => {
    walk(band.node, `band ${i}`)
  })
  const ids = tileIds(layout)
  if (new Set(ids).size !== ids.length) problems.push('duplicate tile id')
  return problems
}
