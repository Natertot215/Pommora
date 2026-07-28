// One singleton rAF loop scrolls a FIXED container, resolved once at drag start. Tuning lives in
// autoscroll.css, read off the drag element once per drag. The pure math below is unit-tested;
// the loop's DOM glue is verified live.

export type Axis = 'x' | 'y' | 'xy'

export interface Params {
  edge: number // px band from a container edge where scroll engages
  speed: number // px/second at the true edge, at the acceleration floor
  ramp: number // proximity exponent (2 = quadratic)
  accelStart: number // speed multiplier at the start of a scroll run (>0, eases in)
  accelMax: number // speed multiplier after a sustained scroll (the acceleration ceiling)
  accelDist: number // px of accumulated scroll to climb from start → max
}

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

/** Axis-aware so a vertical drag skips an x-only ancestor (e.g. a horizontal-scroll shell) to
 *  reach the real y-scroller. */
export function findScroller(el: HTMLElement | null, axis: Axis = 'xy'): HTMLElement | null {
  let n = el?.parentElement ?? null
  while (n) {
    const s = getComputedStyle(n)
    if (scrollableInAxis(s.overflowX, s.overflowY, n, axis)) return n
    n = n.parentElement
  }
  return null
}

/** Signed velocity for one axis: negative toward `lo`, positive toward `hi`. Pre-acceleration,
 *  pre-limit — composed with accelFactor/clampToLimit downstream. */
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

/** `accelStart` MUST be > 0: at 0 the loop would scroll 0px, accumulate 0 distance, and deadlock. */
export function accelFactor(scrolled: number, { accelStart, accelMax, accelDist }: Params): number {
  if (accelDist <= 0) return accelMax
  return accelStart + (accelMax - accelStart) * Math.min(1, scrolled / accelDist)
}

/** Zero a velocity that would push past a scroll limit — no render churn while pinned at a maxed edge. */
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

/** A direction may scroll only after the pointer has been OUTSIDE that direction's edge band at
 *  least once since drag start — so grabbing an item already pinned at an edge doesn't
 *  immediately rocket the container. */
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

// One drag at a time (pointer capture guarantees it). The loop scrolls every frame off the last
// recorded point, so holding still at the edge keeps scrolling. It self-owns a termination
// backstop (blur/visibilitychange/pointercancel) so a focus-steal can't strand it running — but
// stops the LOOP only; each surface still aborts its OWN gesture on its own up/cancel/blur.

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
  dist: number // accumulated |scroll px| for THIS run — resets when the scroll stops, drives acceleration
  last: number | null
  frac: { x: number; y: number }
  intent: Intent
  teardown: () => void
}

let live: Live | null = null

// Upper bound on a single frame's dt. A velocity×dt loop teleports if rAF stalls (a jank spike,
// display sleep/wake) and resumes with a huge gap — cap it so the worst case is one small step.
const MAX_FRAME_MS = 50

function readParams(el: HTMLElement): Params {
  const s = getComputedStyle(el)
  const num = (name: string, fallback: number): number => {
    const v = parseFloat(s.getPropertyValue(name))
    return Number.isFinite(v) ? v : fallback
  }
  return {
    edge: num('--autoscroll-edge', 48),
    speed: num('--autoscroll-speed', 840),
    ramp: num('--autoscroll-ramp', 2),
    accelStart: num('--autoscroll-accel-start', 0.5),
    accelMax: num('--autoscroll-accel-max', 1.5),
    accelDist: num('--autoscroll-accel-distance', 600),
  }
}

export type { StartCfg }

/** Returns an INSTANCE-scoped stopper that halts only THIS loop (a no-op if another drag has
 *  since replaced it) — so a bystander's unmount teardown can't sabotage a live drag. Prefer this
 *  over the global `stopAutoScroll` wherever a stop might fire after ownership may have changed
 *  (e.g. unmount cleanup). */
export function startAutoScroll(cfg: StartCfg): () => void {
  stopAutoScroll()
  const axis = cfg.axis ?? 'xy'
  const scroller = cfg.scroller ?? findScroller(cfg.dragEl ?? null, axis)
  if (!scroller) return () => {} // no scrollable container — the drag still works, just no auto-scroll
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
  // No edge velocity (out of the band, or a gated direction) resets the run so the next scroll
  // eases in fresh.
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
  if (live !== L) return // onScrolled stopped or replaced this loop — don't resurrect the old one
  L.raf = requestAnimationFrame(tick)
}
