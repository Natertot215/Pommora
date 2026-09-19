import type { GraphNode, NodeKind } from './graph'
import { toScreen, type Viewport } from './viewport'

// KNOBs — initial values; tuned by eye in the iteration pass (Task 8.3), never exposed.
const REVEAL_ZOOM: Record<NodeKind, number> = { page: 1, folder: 0.6, space: 0.35 }
const LABEL_CELL_PX = 96

export const revealed = (kind: NodeKind, zoom: number): boolean => zoom >= REVEAL_ZOOM[kind]

// The caller owns `cells` and reads the surviving indices off it, so a per-frame cull allocates nothing.
export function cullLabels(
  nodes: GraphNode[],
  v: Viewport,
  width: number,
  height: number,
  skip: number,
  cells: Map<number, number>,
): void {
  cells.clear()
  const cols = Math.ceil(width / LABEL_CELL_PX) + 1
  nodes.forEach((n, i) => {
    if (i === skip || !revealed(n.kind, v.zoom)) return
    const [sx, sy] = toScreen(v, n.x, n.y + n.radius)
    if (sx < 0 || sy < 0 || sx > width || sy > height) return
    const key = Math.floor(sy / LABEL_CELL_PX) * cols + Math.floor(sx / LABEL_CELL_PX)
    const held = cells.get(key)
    if (held === undefined || nodes[held].radius < n.radius) cells.set(key, i)
  })
}
