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
    if (along <= 0) return // not ahead in the arrow direction
    const perp = Math.abs(dx * dir.y - dy * dir.x)
    const cost = along + perp * 2 // bias toward aligned neighbors (grid rows/columns)
    if (cost < bestCost) {
      bestCost = cost
      best = i
    }
  })
  return best
}
