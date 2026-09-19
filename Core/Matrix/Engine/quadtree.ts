import type { GraphNode } from './graph'

export interface Cell {
  x0: number
  y0: number
  x1: number
  y1: number
  leaf: boolean
  node: GraphNode | null
  children: [Cell | null, Cell | null, Cell | null, Cell | null]
  count: number
  cx: number
  cy: number
  maxRadius: number
}

export interface Quadtree {
  root: Cell | null
}

const cell = (x0: number, y0: number, x1: number, y1: number): Cell => ({
  x0,
  y0,
  x1,
  y1,
  leaf: true,
  node: null,
  children: [null, null, null, null],
  count: 0,
  cx: 0,
  cy: 0,
  maxRadius: 0,
})

const quadrant = (c: Cell, x: number, y: number): number =>
  (x >= (c.x0 + c.x1) / 2 ? 1 : 0) + (y >= (c.y0 + c.y1) / 2 ? 2 : 0)

function childBounds(c: Cell, q: number): [number, number, number, number] {
  const mx = (c.x0 + c.x1) / 2
  const my = (c.y0 + c.y1) / 2
  return [q & 1 ? mx : c.x0, q & 2 ? my : c.y0, q & 1 ? c.x1 : mx, q & 2 ? c.y1 : my]
}

function insert(c: Cell, n: GraphNode): void {
  if (c.leaf) {
    const held = c.node
    if (held === null) {
      c.node = n
      return
    }
    c.leaf = false
    c.node = null
    // The one write in a read: two nodes on one point would split forever, so the newcomer takes a hair's offset.
    if (held.x === n.x && held.y === n.y) n.x += 1e-3
    insert(c, held)
  }
  const q = quadrant(c, n.x, n.y)
  let child = c.children[q]
  if (!child) {
    child = cell(...childBounds(c, q))
    c.children[q] = child
  }
  insert(child, n)
}

function accumulate(c: Cell): void {
  if (c.leaf) {
    if (c.node) {
      c.count = 1
      c.cx = c.node.x
      c.cy = c.node.y
      c.maxRadius = c.node.radius
    }
    return
  }
  let count = 0
  let sx = 0
  let sy = 0
  let max = 0
  for (const ch of c.children) {
    if (!ch) continue
    accumulate(ch)
    count += ch.count
    sx += ch.cx * ch.count
    sy += ch.cy * ch.count
    max = Math.max(max, ch.maxRadius)
  }
  c.count = count
  c.cx = count ? sx / count : 0
  c.cy = count ? sy / count : 0
  c.maxRadius = max
}

export function buildQuadtree(nodes: GraphNode[]): Quadtree {
  if (nodes.length === 0) return { root: null }
  let x0 = Number.POSITIVE_INFINITY
  let y0 = x0
  let x1 = Number.NEGATIVE_INFINITY
  let y1 = x1
  for (const n of nodes) {
    if (n.x < x0) x0 = n.x
    if (n.x > x1) x1 = n.x
    if (n.y < y0) y0 = n.y
    if (n.y > y1) y1 = n.y
  }
  const side = Math.max(x1 - x0, y1 - y0, 1) + 1
  const root = cell(x0, y0, x0 + side, y0 + side)
  for (const n of nodes) insert(root, n)
  accumulate(root)
  return { root }
}

// One stack for every walk: two visits per node per tick would otherwise allocate thousands of arrays a frame.
const stack: Cell[] = []

// Pre-order; return `true` from `fn` to skip the cell's children.
// The stack is shared, so `fn` must never call `visit` or `find` itself.
export function visit(tree: Quadtree, fn: (c: Cell) => boolean): void {
  stack.length = 0
  if (tree.root) stack.push(tree.root)
  while (stack.length) {
    const c = stack.pop() as Cell
    if (fn(c) || c.leaf) continue
    for (const ch of c.children) if (ch) stack.push(ch)
  }
}

export function find(tree: Quadtree, x: number, y: number, radius: number): GraphNode | null {
  let best: GraphNode | null = null
  let bestD = radius
  visit(tree, (c) => {
    if (c.count === 0) return true
    const dx = x < c.x0 ? c.x0 - x : x > c.x1 ? x - c.x1 : 0
    const dy = y < c.y0 ? c.y0 - y : y > c.y1 ? y - c.y1 : 0
    const reach = Math.max(bestD, 0) + c.maxRadius
    if (dx * dx + dy * dy > reach * reach) return true
    if (!c.leaf || !c.node) return false
    const n = c.node
    const d = Math.hypot(n.x - x, n.y - y) - n.radius
    if (d < bestD) {
      best = n
      bestD = d
    }
    return true
  })
  return best
}
