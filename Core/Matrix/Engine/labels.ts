import { clamp } from '@pommora/uix/Utilities/clamp'
import type { GraphNode, NodeKind } from './graph'
import { toScreen, type Viewport } from './viewport'

// KNOBs — the label cell, the zoom each node kind reveals its title at, and the share of that zoom the reveal fades across.
const REVEAL_ZOOM: Record<NodeKind, number> = { page: 0.6, folder: 0.4, space: 0.2 }
const REVEAL_BAND = 0.35
const LABEL_CELL_PX = 96

export type LabelReveal = Record<NodeKind, number>

// A share of each kind's own threshold, so the three bands read as one gesture across a zoom range that spans an order of magnitude.
const revealOf = (kind: NodeKind, zoom: number): number => {
  const at = REVEAL_ZOOM[kind]
  return clamp((zoom - at) / (at * REVEAL_BAND), 0, 1)
}

// How far each kind is through its reveal — linear, since the curve it paints on belongs to the surface.
export const labelReveal = (zoom: number): LabelReveal => ({
  page: revealOf('page', zoom),
  folder: revealOf('folder', zoom),
  space: revealOf('space', zoom),
})

// The caller owns `cells` and reads the surviving indices off it, so a per-frame cull allocates nothing.
export function cullLabels(
  nodes: GraphNode[],
  v: Viewport,
  width: number,
  height: number,
  skip: number,
  cells: Map<number, number>,
  reveal: LabelReveal,
): void {
  cells.clear()
  const cols = Math.ceil(width / LABEL_CELL_PX) + 1
  nodes.forEach((n, i) => {
    if (i === skip || reveal[n.kind] === 0) return
    const [sx, sy] = toScreen(v, n.x, n.y + n.radius)
    if (sx < 0 || sy < 0 || sx > width || sy > height) return
    const key = Math.floor(sy / LABEL_CELL_PX) * cols + Math.floor(sx / LABEL_CELL_PX)
    const held = cells.get(key)
    if (held === undefined || nodes[held].radius < n.radius) cells.set(key, i)
  })
}
