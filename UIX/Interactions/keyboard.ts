import type { Geometry } from './reorderModel'
import type { Box } from './shared'

export type Dir = { x: number; y: number }

export const ARROW_DIRS: Record<string, Dir> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
}

export function keyboardNext(rects: Box[], over: number, dir: Dir): number {
  const c = rects[over]
  if (!c) return over
  let best = over
  let bestCost = Infinity
  rects.forEach((r, i) => {
    if (i === over) return
    const dx = r.cx - c.cx
    const dy = r.cy - c.cy
    const along = dx * dir.x + dy * dir.y
    if (along <= 0) return
    const perp = Math.abs(dx * dir.y - dy * dir.x)
    const cost = along + perp * 2 // biased toward aligned neighbors
    if (cost < bestCost) {
      bestCost = cost
      best = i
    }
  })
  return best
}

export type StepPart = 'before' | 'into' | 'after'
export type Probe = { y: number; id: string } & (
  | { kind: 'row'; base: number }
  | { kind: 'group' }
  | { kind: 'end' }
)

export function lineProbes(g: Geometry): Probe[] {
  const empty = [...g.groups.values()]
    .filter((box) => !g.rows.some((r) => r.mid >= box.top && r.mid <= box.bottom))
    .sort((a, b) => a.mid - b.mid)
  const out: Probe[] = []
  let e = 0
  const groupsAbove = (y: number): void => {
    for (; e < empty.length && empty[e].mid < y; e++)
      out.push({ y: empty[e].mid, id: empty[e].id, kind: 'group' })
  }
  for (const r of g.rows) {
    groupsAbove(r.top)
    const inset = (r.bottom - r.top) / 8
    const base = out.length
    out.push(
      { y: r.top + inset, id: r.id, kind: 'row', base },
      { y: r.mid, id: r.id, kind: 'row', base },
      { y: r.bottom - inset, id: r.id, kind: 'row', base },
    )
  }
  groupsAbove(Number.POSITIVE_INFINITY)
  const last = g.rows[g.rows.length - 1]
  if (last) out.push({ y: g.bottom, id: last.id, kind: 'end' })
  return out
}
