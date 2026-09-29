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
type Probe = { y: number; row: string; part: StepPart }

export function lineProbes(g: Geometry): Probe[] {
  const out: Probe[] = []
  for (const r of g.rows) {
    const inset = (r.bottom - r.top) / 8
    out.push(
      { y: r.top + inset, row: r.id, part: 'before' },
      { y: r.mid, row: r.id, part: 'into' },
      { y: r.bottom - inset, row: r.id, part: 'after' },
    )
  }
  const last = g.rows[g.rows.length - 1]
  if (last) out.push({ y: g.bottom, row: last.id, part: 'after' })
  return out
}
