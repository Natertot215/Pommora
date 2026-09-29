import { currentZoom } from '../Utilities/zoom'
import { rank } from './reorderModel'
import { boxAt, type Box } from './shared'

export type Axis = 'x' | 'y'
type Point = { x: number; y: number }
type Size = { width: number; height: number }

export type Frozen = {
  ids: string[]
  rects: Box[]
  rows: number[]
  rowTops: number[]
  centres: number[]
  ref: HTMLElement
  origin: Point
  zoom: number
  pitch: number
  gap: number
  grid: { x0: number; stride: number; cols: number; col: number; top: number }
  tail: Point
}

const along = (b: Box, axis: Axis): number => (axis === 'x' ? b.left : b.top)
const centre = (b: Box, axis: Axis): number => (axis === 'x' ? b.cx : b.cy)
const extent = (s: Size, axis: Axis): number => (axis === 'x' ? s.width : s.height)

function pitchOf(rects: Box[], gap: number, fallback: number): number {
  let best = Infinity
  let tallest = rects.length ? 0 : fallback
  for (let i = 0; i < rects.length; i++) {
    tallest = Math.max(tallest, rects[i].height)
    const step = i > 0 ? rects[i].top - rects[i - 1].top : 0
    if (step > 1 && step < best) best = step
  }
  return best === Infinity ? tallest + gap : best
}

function cellAt(f: Frozen, slot: number): Point {
  if (slot < f.rects.length) return { x: f.rects[slot].left, y: f.rects[slot].top }
  if (f.rects.length === 0) return { x: 0, y: 0 }
  let { col, top } = f.grid
  for (let s = f.rects.length; s <= slot; s++) {
    col++
    if (col >= f.grid.cols) {
      col = 0
      top += f.pitch
    }
  }
  return { x: f.grid.x0 + col * f.grid.stride, y: top }
}

export function freeze(
  ids: readonly string[],
  els: ReadonlyMap<string, HTMLElement>,
  box: HTMLElement | null,
  axis: Axis | undefined,
  activeHeight: number,
): Frozen | null {
  const kept: string[] = []
  const screen: DOMRect[] = []
  for (const id of ids) {
    const el = els.get(id)
    if (!el) continue
    kept.push(id)
    screen.push(el.getBoundingClientRect())
  }
  const ref = box ?? (kept.length ? (els.get(kept[0])?.parentElement ?? null) : null)
  if (!ref) return null
  const o = ref.getBoundingClientRect()
  const rects = screen.map((s) => boxAt(s.left - o.left, s.top - o.top, s.width, s.height))
  const rows: number[] = []
  rects.forEach((r, i) => {
    if (i === 0 || r.top !== rects[i - 1].top) rows.push(i)
  })
  const lefts = [...new Set(rects.map((r) => Math.round(r.left)))].sort((a, b) => a - b)
  const stride = lefts.length >= 2 ? lefts[1] - lefts[0] : (rects[0]?.width ?? 1) + 1
  const last = rects[rects.length - 1]
  const x0 = lefts[0] ?? 0
  const zoom = currentZoom(ref)
  const rowGap = (Number.parseFloat(getComputedStyle(ref).rowGap) || 0) * zoom
  const f: Frozen = {
    ids: kept,
    rects,
    rows,
    rowTops: rows.map((i) => rects[i].top),
    centres: axis ? rects.map((r) => centre(r, axis)) : [],
    ref,
    origin: { x: o.left, y: o.top },
    zoom,
    pitch: pitchOf(rects, rowGap, activeHeight),
    gap:
      axis && rects.length > 1
        ? along(rects[1], axis) - along(rects[0], axis) - extent(rects[0], axis)
        : 0,
    grid: {
      x0,
      stride,
      cols: Math.max(lefts.length, box ? Math.round(o.width / stride) : 1, 1),
      col: last ? Math.max(0, Math.round((last.left - x0) / stride)) : 0,
      top: last?.top ?? 0,
    },
    tail: { x: 0, y: 0 },
  }
  f.tail = !last
    ? f.tail
    : !axis
      ? cellAt(f, rects.length)
      : axis === 'x'
        ? { x: last.left + last.width + f.gap, y: last.top }
        : { x: last.left, y: last.top + last.height + f.gap }
  return f
}

export function reorigin(f: Frozen): void {
  const r = f.ref.getBoundingClientRect()
  f.origin = { x: r.left, y: r.top }
}

export function unionOf(f: Frozen): Box | null {
  if (f.rects.length === 0) return null
  let left = Infinity
  let top = Infinity
  let right = -Infinity
  let bottom = -Infinity
  for (const r of f.rects) {
    left = Math.min(left, r.left)
    top = Math.min(top, r.top)
    right = Math.max(right, r.left + r.width)
    bottom = Math.max(bottom, r.top + r.height)
  }
  return boxAt(left + f.origin.x, top + f.origin.y, right - left, bottom - top)
}

export function placeItem(
  f: Frozen,
  axis: Axis | undefined,
  i: number,
  a: number,
  over: number,
  size: Size,
): Point {
  const k = a >= 0 && i > a ? i - 1 : i
  const opens = over >= 0 && k >= over
  if (!axis) return cellAt(f, opens ? k + 1 : k)
  const r = f.rects[i]
  const out = a >= 0 && i > a ? extent(f.rects[a], axis) + f.gap : 0
  const inn = opens ? extent(size, axis) + f.gap : 0
  return axis === 'x' ? { x: r.left - out + inn, y: r.top } : { x: r.left, y: r.top - out + inn }
}

export function slotPoint(
  f: Frozen,
  axis: Axis | undefined,
  a: number,
  over: number,
  size: Size,
): Point {
  if (!axis) return cellAt(f, over)
  const n = f.rects.length - (a >= 0 ? 1 : 0)
  if (n === 0) return a >= 0 ? { x: f.rects[a].left, y: f.rects[a].top } : { x: 0, y: 0 }
  const at = Math.min(over, n)
  const j = at < n ? at : n - 1
  const i = a >= 0 && j >= a ? j + 1 : j
  const p = placeItem(f, axis, i, a, -1, size)
  if (at < n) return p
  const r = f.rects[i]
  return axis === 'x' ? { x: p.x + r.width + f.gap, y: p.y } : { x: p.x, y: p.y + r.height + f.gap }
}

export function distanceTo(f: Frozen, i: number, p: Point, half: Size): number {
  const b = f.rects[i]
  if (b) return Math.hypot(b.cx - p.x, b.cy - p.y)
  return Math.hypot(f.tail.x + half.width - p.x, f.tail.y + half.height - p.y)
}

function pastLast(f: Frozen, p: Point): boolean {
  const last = f.rects[f.rects.length - 1]
  return (
    last !== undefined &&
    p.y >= last.top &&
    (p.x >= last.left + last.width || p.y >= last.top + last.height)
  )
}

export function nearest(
  f: Frozen,
  count: number,
  p: Point,
  half: Size,
  axis: Axis | undefined,
): { at: number; dist: number } {
  const n = f.rects.length
  let from = 0
  let to = n
  if (axis) {
    const lo = rank(f.centres, axis === 'x' ? p.x : p.y)
    from = Math.max(0, lo - 1)
    to = Math.min(n, lo + 1)
  } else if (pastLast(f, p)) return { at: count - 1, dist: 0 }
  else if (f.rows.length > 1) {
    const row = Math.max(0, rank(f.rowTops, p.y) - 1)
    from = f.rows[Math.max(0, row - 1)]
    to = f.rows[row + 2] ?? n
  }
  let at = -1
  let dist = Infinity
  for (let i = from; i < to; i++) {
    const d = distanceTo(f, i, p, half)
    if (d < dist) {
      dist = d
      at = i
    }
  }
  if (count > n) {
    const d = distanceTo(f, n, p, half)
    if (d < dist) {
      dist = d
      at = n
    }
  }
  return { at: Math.max(at, 0), dist }
}

export function beforeIdAt(
  ids: readonly string[],
  skip: string | null,
  index: number,
): string | null {
  let k = 0
  for (const id of ids) {
    if (id === skip) continue
    if (k++ === index) return id
  }
  return null
}
