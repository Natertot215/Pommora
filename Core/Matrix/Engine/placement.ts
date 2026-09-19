import type { Graph } from './graph'

// KNOBs — initial values; tuned by eye in the iteration pass (Task 8.3), never exposed.
const SPIRAL_STEP = 60
const PLACE_JITTER = 12
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

export type Layout = ReadonlyMap<string, { x: number; y: number }>

export function spiral(i: number): { x: number; y: number } {
  const r = SPIRAL_STEP * Math.sqrt(0.5 + i)
  const a = i * GOLDEN_ANGLE
  return { x: r * Math.cos(a), y: r * Math.sin(a) }
}

export function place(graph: Graph, layout: Layout): Set<string> {
  const { nodes, links } = graph
  const fresh = new Set<string>()
  if (layout.size === 0) {
    nodes.forEach((n, i) => {
      const p = spiral(i)
      n.x = p.x
      n.y = p.y
      fresh.add(n.id)
    })
    return fresh
  }
  let ring = 0
  for (const n of nodes) {
    const p = layout.get(n.id)
    if (p) {
      n.x = p.x
      n.y = p.y
      ring = Math.max(ring, Math.hypot(p.x, p.y))
    } else fresh.add(n.id)
  }
  const neighbours = new Map<number, number[]>()
  const near = (from: number, to: number): void => {
    if (!fresh.has(nodes[from].id) || fresh.has(nodes[to].id)) return
    const list = neighbours.get(from)
    if (list) list.push(to)
    else neighbours.set(from, [to])
  }
  for (const l of links) {
    near(l.source, l.target)
    near(l.target, l.source)
  }
  let k = 0
  nodes.forEach((n, i) => {
    if (!fresh.has(n.id)) return
    const near = neighbours.get(i) ?? []
    if (near.length) {
      n.x =
        near.reduce((s, j) => s + nodes[j].x, 0) / near.length +
        (Math.random() - 0.5) * PLACE_JITTER
      n.y =
        near.reduce((s, j) => s + nodes[j].y, 0) / near.length +
        (Math.random() - 0.5) * PLACE_JITTER
    } else {
      const a = k * GOLDEN_ANGLE
      const r = ring + SPIRAL_STEP * Math.sqrt(1 + k++)
      n.x = r * Math.cos(a)
      n.y = r * Math.sin(a)
    }
  })
  return fresh
}
