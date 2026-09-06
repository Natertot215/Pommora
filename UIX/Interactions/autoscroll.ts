import { duration, ms } from '../Animations/motion'

export type Axis = 'x' | 'y' | 'xy'

export interface Params {
  edge: number // px band from a container edge where scroll engages
  speed: number // px/second at the true edge, at the acceleration floor
  ramp: number // proximity exponent, 2 being quadratic
  accelStart: number // speed multiplier at the start of a run; must be > 0
  accelMax: number
  accelDist: number // px of accumulated scroll to climb from start → max
}

/** Read through `getComputedStyle`, never `var()`, so a token audit finds no consumers. */
export const AUTOSCROLL_KNOBS = {
  edge: ['--autoscroll-edge', '48px'],
  speed: ['--autoscroll-speed', '840px'],
  ramp: ['--autoscroll-ramp', '2'],
  accelStart: ['--autoscroll-accel-start', '0.5'],
  accelMax: ['--autoscroll-accel-max', '1.5'],
  accelDist: ['--autoscroll-accel-distance', '600px'],
} as const satisfies Record<keyof Params, readonly [string, string]>

export interface Intent {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
}

export function scrollableInAxis(
  overflowX: string,
  overflowY: string,
  dims: { scrollWidth: number; clientWidth: number; scrollHeight: number; clientHeight: number },
  axis: Axis,
): boolean {
  const y =
    (overflowY === 'auto' || overflowY === 'scroll') && dims.scrollHeight > dims.clientHeight
  const x = (overflowX === 'auto' || overflowX === 'scroll') && dims.scrollWidth > dims.clientWidth
  if (axis === 'y') return y
  if (axis === 'x') return x
  return x || y
}

/** Axis-aware so a vertical drag skips an x-only ancestor to reach the real y-scroller. */
export function findScroller(el: HTMLElement | null, axis: Axis = 'xy'): HTMLElement | null {
  let n = el?.parentElement ?? null
  while (n) {
    const s = getComputedStyle(n)
    if (scrollableInAxis(s.overflowX, s.overflowY, n, axis)) return n
    n = n.parentElement
  }
  return null
}

export function resolveScroller(el: HTMLElement, axis: Axis = 'xy'): HTMLElement {
  const cs = getComputedStyle(el)
  return scrollableInAxis(cs.overflowX, cs.overflowY, el, axis)
    ? el
    : (findScroller(el, axis) ?? el)
}

export function edgeVelocity(
  lo: number,
  hi: number,
  p: number,
  { edge, speed, ramp }: Params,
): number {
  const ramped = (depth: number): number => speed * Math.min(1, depth / edge) ** ramp
  if (p < lo + edge) return -ramped(lo + edge - p)
  if (p > hi - edge) return ramped(p - (hi - edge))
  return 0
}

// At accelStart 0 the loop would scroll 0px, accumulate 0 distance, and deadlock.
export function accelFactor(scrolled: number, { accelStart, accelMax, accelDist }: Params): number {
  if (accelDist <= 0) return accelMax
  return accelStart + (accelMax - accelStart) * Math.min(1, scrolled / accelDist)
}

export function clampToLimit(v: number, pos: number, max: number): number {
  if (v < 0 && pos <= 0) return 0
  if (v > 0 && pos >= max) return 0
  return v
}

/** Folds the fractional remainder forward so a slow ramp doesn't round to 0 every frame. */
export function stepPixels(v: number, dtMs: number, frac: number): { px: number; frac: number } {
  const raw = v * (dtMs / 1000) + frac
  const px = Math.trunc(raw)
  return { px, frac: raw - px }
}

/** A direction scrolls only once the pointer has left its edge band, so grabbing an item already
 *  pinned at an edge doesn't rocket the container. */
export function gateIntent(intent: Intent, vx: number, vy: number): { vx: number; vy: number } {
  if (vy >= 0) intent.up = true
  if (vy <= 0) intent.down = true
  if (vx >= 0) intent.left = true
  if (vx <= 0) intent.right = true
  return {
    vx: (vx < 0 && !intent.left) || (vx > 0 && !intent.right) ? 0 : vx,
    vy: (vy < 0 && !intent.up) || (vy > 0 && !intent.down) ? 0 : vy,
  }
}

interface StartCfg {
  getPoint: () => { x: number; y: number }
  scroller?: HTMLElement | null
  dragEl?: HTMLElement | null
  axis?: Axis
  onScrolled?: () => void
}

interface Live {
  raf: number
  getPoint: () => { x: number; y: number }
  scroller: HTMLElement
  axis: Axis
  params: Params
  onScrolled?: () => void
  dist: number
  last: number | null
  frac: { x: number; y: number }
  intent: Intent
  teardown: () => void
}

let live: Live | null = null

// A velocity×dt loop teleports if rAF stalls and resumes with a huge gap.
const MAX_FRAME_MS = 50

function readParams(el: HTMLElement): Params {
  const s = getComputedStyle(el)
  const read = (key: keyof Params): number => {
    const [name, fallback] = AUTOSCROLL_KNOBS[key]
    const v = parseFloat(s.getPropertyValue(name))
    return Number.isFinite(v) ? v : parseFloat(fallback)
  }
  return {
    edge: read('edge'),
    speed: read('speed'),
    ramp: read('ramp'),
    accelStart: read('accelStart'),
    accelMax: read('accelMax'),
    accelDist: read('accelDist'),
  }
}

export type { StartCfg }

/** Resolves the scroller up front, so an unscrollable container never enters the loop. */
export function armAutoScroll(
  dragEl: HTMLElement | null,
  getPoint: () => { x: number; y: number },
  onScrolled?: () => void,
): (() => void) | null {
  const scroller = findScroller(dragEl, 'y')
  if (!scroller) return null
  return startAutoScroll({ getPoint, scroller, dragEl, axis: 'y', onScrolled })
}

export function startAutoScroll(cfg: StartCfg): () => void {
  stopAutoScroll()
  stopGlide()
  const axis = cfg.axis ?? 'xy'
  const scroller = cfg.scroller ?? findScroller(cfg.dragEl ?? null, axis)
  if (!scroller) return () => {}
  const onBackstop = (): void => stopAutoScroll()
  window.addEventListener('blur', onBackstop)
  document.addEventListener('visibilitychange', onBackstop)
  window.addEventListener('pointercancel', onBackstop)
  live = {
    raf: 0,
    getPoint: cfg.getPoint,
    scroller,
    axis,
    params: readParams(cfg.dragEl ?? scroller),
    onScrolled: cfg.onScrolled,
    dist: 0,
    last: null,
    frac: { x: 0, y: 0 },
    intent: { up: false, down: false, left: false, right: false },
    teardown: () => {
      window.removeEventListener('blur', onBackstop)
      document.removeEventListener('visibilitychange', onBackstop)
      window.removeEventListener('pointercancel', onBackstop)
    },
  }
  live.raf = requestAnimationFrame(tick)
  const mine = live
  return () => {
    if (live === mine) stopAutoScroll()
  }
}

export function stopAutoScroll(): void {
  if (!live) return
  if (live.raf) cancelAnimationFrame(live.raf)
  live.teardown()
  live = null
}

export interface GlideParams {
  speed: number
  minMs: number
  maxMs: number
}

export const SEEK_GLIDE: GlideParams = {
  speed: 3,
  minMs: ms(duration.fast),
  maxMs: ms(duration.slow),
}

export function glideMs(distance: number, { speed, minMs, maxMs }: GlideParams): number {
  return Math.min(maxMs, Math.max(minMs, Math.abs(distance) / speed))
}

/** The JS mirror of the `out` easing token (ease-out quint) — a CSS cubic-bezier can't drive a
 *  scrollTop, so the curve is stated twice on purpose. Change them together. */
export function easeOutQuint(t: number): number {
  return 1 - (1 - t) ** 5
}

let glide: { raf: number; teardown: () => void } | null = null

export function stopGlide(): void {
  if (!glide) return
  cancelAnimationFrame(glide.raf)
  glide.teardown()
  glide = null
}

/** A thunk `to` is re-read per frame, following a lazy host's sharpening estimate. */
export function scrollGlide(
  scroller: HTMLElement,
  to: number | (() => number),
  params: GlideParams,
  onArrive?: () => void,
): () => void {
  stopAutoScroll()
  stopGlide()
  const seek = typeof to === 'function' ? to : (): number => to
  const target = (): number =>
    Math.max(0, Math.min(seek(), scroller.scrollHeight - scroller.clientHeight))
  const from = scroller.scrollTop
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  if (reduced || target() === from) {
    scroller.scrollTop = target()
    onArrive?.()
    return () => {}
  }
  // Fixed from the opening distance: a shifting destination changes where it lands, not how long.
  const ms = glideMs(target() - from, params)
  // Timed from the first frame, not dispatch — the gap is dead time the easing would have spent.
  let started: number | null = null
  const onInterrupt = (): void => stopGlide()
  for (const ev of ['wheel', 'touchstart', 'keydown'] as const)
    window.addEventListener(ev, onInterrupt, { passive: true })
  const teardown = (): void => {
    for (const ev of ['wheel', 'touchstart', 'keydown'] as const)
      window.removeEventListener(ev, onInterrupt)
  }
  const step = (now: number): void => {
    const g = glide
    if (!g) return
    started ??= now
    const t = Math.min(1, (now - started) / ms)
    scroller.scrollTop = from + (target() - from) * easeOutQuint(t)
    if (t < 1) {
      g.raf = requestAnimationFrame(step)
      return
    }
    stopGlide()
    onArrive?.()
  }
  glide = { raf: requestAnimationFrame(step), teardown }
  const mine = glide
  return () => {
    if (glide === mine) stopGlide()
  }
}

function tick(ts: number): void {
  const L = live
  if (!L) return
  const dt = L.last === null ? 0 : Math.min(ts - L.last, MAX_FRAME_MS)
  L.last = ts
  const pt = L.getPoint()
  const r = L.scroller.getBoundingClientRect()
  let vx = L.axis === 'y' ? 0 : edgeVelocity(r.left, r.right, pt.x, L.params)
  let vy = L.axis === 'x' ? 0 : edgeVelocity(r.top, r.bottom, pt.y, L.params)
  ;({ vx, vy } = gateIntent(L.intent, vx, vy))
  if (vx === 0 && vy === 0) L.dist = 0
  const accel = accelFactor(L.dist, L.params)
  vx = clampToLimit(
    vx * accel,
    L.scroller.scrollLeft,
    L.scroller.scrollWidth - L.scroller.clientWidth,
  )
  vy = clampToLimit(
    vy * accel,
    L.scroller.scrollTop,
    L.scroller.scrollHeight - L.scroller.clientHeight,
  )
  const sx = stepPixels(vx, dt, L.frac.x)
  const sy = stepPixels(vy, dt, L.frac.y)
  L.frac.x = sx.frac
  L.frac.y = sy.frac
  if (sx.px || sy.px) {
    L.scroller.scrollBy(sx.px, sy.px)
    L.dist += Math.abs(sx.px) + Math.abs(sy.px)
    L.onScrolled?.()
  }
  if (live !== L) return // onScrolled stopped or replaced this loop
  L.raf = requestAnimationFrame(tick)
}
