import { clamp } from '@pommora/uix/Utilities/clamp'
import type { GraphLink, GraphNode, LinkKind, GraphNodeKind } from './graph'
import { type Cell, type Quadtree, visit } from './quadtree'

// KNOBs — the node radii and their growth, the per-kind link strengths, and the four forces the menu scales.
export const BASE_RADIUS: Record<GraphNodeKind, number> = { page: 25, folder: 35, space: 45 }
export const LINK_MULTIPLE: Record<LinkKind, number> = {
  body: 0.075,
  citation: 0.05,
  frontmatter: 0.075,
  space: 0,
  location: 0,
}
const MEMBER_MULTIPLE = 0.025
const SPACE_LINK_MULTIPLE = 0.1
export const RADIUS_MAX = 160
const LINK_STRENGTH: Record<LinkKind, number> = {
  body: 1,
  citation: 0.6,
  frontmatter: 0.8,
  space: 0.7,
  location: 0.75,
}
export const LINK_GAP = 8
const COLLIDE_STRENGTH = 0.7
const THETA2 = 0.8
const DISTANCE_MIN2 = 1
const GRAVITY = 0.035
const CHARGE = 375
const DISTANCE = 240

export interface Forces {
  gravity: number
  spread: number
  strength: number
  distance: number
}

export function radiusOf(kind: GraphNodeKind, inbound: number, members: number, links = 0): number {
  const base = BASE_RADIUS[kind]
  const grown =
    kind === 'page'
      ? base * (1 + inbound)
      : base * (1 + MEMBER_MULTIPLE * members + SPACE_LINK_MULTIPLE * links)
  return clamp(grown, base, RADIUS_MAX)
}

const jiggle = (): number => (Math.random() - 0.5) * 1e-6

export function applyGravity(nodes: GraphNode[], forces: Forces, alpha: number): void {
  const k = GRAVITY * forces.gravity * alpha
  for (const n of nodes) {
    if (n.pinned) continue
    n.vx -= n.x * k
    n.vy -= n.y * k
  }
}

export function applySpread(
  nodes: GraphNode[],
  tree: Quadtree,
  forces: Forces,
  alpha: number,
): void {
  const charge = -CHARGE * forces.spread * alpha
  let n = nodes[0]
  const push = (cell: Cell): boolean => {
    if (cell.count === 0) return true
    let dx = cell.cx - n.x
    let dy = cell.cy - n.y
    let d2 = dx * dx + dy * dy
    const w = cell.x1 - cell.x0
    if (w * w < THETA2 * d2 || cell.leaf) {
      if (cell.leaf && cell.node === n) return true
      if (d2 < DISTANCE_MIN2) {
        dx = dx || jiggle()
        dy = dy || jiggle()
        d2 = DISTANCE_MIN2
      }
      const f = (charge * cell.count) / d2
      n.vx += dx * f
      n.vy += dy * f
      return true
    }
    return false
  }
  for (n of nodes) if (!n.pinned) visit(tree, push)
}

export function applyLink(
  nodes: GraphNode[],
  links: GraphLink[],
  forces: Forces,
  alpha: number,
): void {
  const distance = DISTANCE * forces.distance
  for (const l of links) {
    const a = nodes[l.source]
    const b = nodes[l.target]
    let dx = b.x + b.vx - a.x - a.vx || jiggle()
    let dy = b.y + b.vy - a.y - a.vy || jiggle()
    const d = Math.sqrt(dx * dx + dy * dy)
    const rest = distance + a.radius + b.radius
    const strength = (LINK_STRENGTH[l.kind] * forces.strength) / Math.min(a.degree, b.degree)
    const f = ((d - rest) / d) * alpha * strength
    dx *= f
    dy *= f
    const bias = a.degree / (a.degree + b.degree)
    b.vx -= dx * bias
    b.vy -= dy * bias
    a.vx += dx * (1 - bias)
    a.vy += dy * (1 - bias)
  }
}

export function applyCollide(nodes: GraphNode[], tree: Quadtree): void {
  let n = nodes[0]
  let r = 0
  const separate = (cell: Cell): boolean => {
    if (cell.count === 0) return true
    const reach = cell.maxRadius + LINK_GAP
    const x = n.x + n.vx
    const y = n.y + n.vy
    if (x + r < cell.x0 - reach || x - r > cell.x1 + reach) return true
    if (y + r < cell.y0 - reach || y - r > cell.y1 + reach) return true
    if (!cell.leaf) return false
    const m = cell.node
    if (m === null || m === n || m.id < n.id) return true
    const rr = r + m.radius + LINK_GAP
    let dx = n.x + n.vx - m.x - m.vx || jiggle()
    let dy = n.y + n.vy - m.y - m.vy || jiggle()
    const d2 = dx * dx + dy * dy
    if (d2 < rr * rr) {
      const d = Math.sqrt(d2)
      const push = ((rr - d) / d) * COLLIDE_STRENGTH
      dx *= push
      dy *= push
      const share = (m.radius * m.radius) / (n.radius * n.radius + m.radius * m.radius)
      n.vx += dx * share
      n.vy += dy * share
      m.vx -= dx * (1 - share)
      m.vy -= dy * (1 - share)
    }
    return true
  }
  for (n of nodes) {
    r = n.radius + LINK_GAP
    visit(tree, separate)
  }
}
