// One singleton rAF loop scrolls a FIXED container, resolved once at drag start. Tuning is read off
// the drag element once per drag. The pure math below is unit-tested; the loop's DOM glue is
// verified live.

import { duration } from '../tokens/motion'

export type Axis = 'x' | 'y' | 'xy'

export interface Params {
  edge: number // px band from a container edge where scroll engages
  speed: number // px/second at the true edge, at the acceleration floor
  ramp: number // proximity exponent (2 = quadratic)
  accelStart: number // speed multiplier at the start of a scroll run (>0, eases in)
  accelMax: number // speed multiplier after a sustained scroll (the acceleration ceiling)
  accelDist: number // px of accumulated scroll to climb from start → max
}

/** The tuning knobs, as the CSS var a surface overrides and the value it falls back to. These are
 *  read through `getComputedStyle`, never `var()`, so a token audit searching for consumers finds
 *  none — this map is the one place they exist, feeding both the `:root` declaration
 *  (autoscroll.css.ts) and the read below, so a default can never be tuned in one and not the other.
 *  Any surface may override one on itself or an ancestor (`.sidebar { --autoscroll-speed }`). */
export const AUTOSCROLL_KNOBS = {
  /** band from a container edge where auto-scroll engages */
  edge: ['--autoscroll-edge', '48px'],
  /** px/SECOND at the true edge, at the acceleration floor (frame-rate-independent) */
  speed: ['--autoscroll-speed', '840px'],
  /** proximity ramp exponent — 2 = quadratic (gentle entry, fast at the edge) */
  ramp: ['--autoscroll-ramp', '2'],
  /** speed multiplier when a scroll run begins — eases in (must be > 0) */
  accelStart: ['--autoscroll-accel-start', '0.5'],
  /** speed multiplier after a sustained scroll — the acceleration ceiling */
  accelMax: ['--autoscroll-accel-max', '1.5'],
  /** px of accumulated scroll to climb from start → max */
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

/** The scroller to hand a drag that already knows its own element, for a surface whose element may or
 *  may not be the thing that scrolls. One that overflows scrolls itself; one at rest (an embed tile, a
 *  host grown to its content) scrolls nothing, so the drag climbs to the ancestor that does — without
 *  which it can never reach a candidate off-screen. Falls back to the element so a caller always has one. */
export function resolveScroller(el: HTMLElement, axis: Axis = 'xy'): HTMLElement {
  const cs = getComputedStyle(el)
  return scrollableInAxis(cs.overflowX, cs.overflowY, el, axis) ? el : (findScroller(el, axis) ?? el)
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

/** Returns an INSTANCE-scoped stopper that halts only THIS loop (a no-op if another drag has
 *  since replaced it) — so a bystander's unmount teardown can't sabotage a live drag. Prefer this
 *  over the global `stopAutoScroll` wherever a stop might fire after ownership may have changed
 *  (e.g. unmount cleanup). */
export function startAutoScroll(cfg: StartCfg): () => void {
  stopAutoScroll()
  stopGlide() // a drag takes the scroller from any travel in flight
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

// ── Glide ──────────────────────────────────────────────────────────────────────
// The other way this module scrolls a container: a finite travel to a known destination, for a
// surface sending the reader somewhere. It shares this module's scroller resolution and its
// one-owner-at-a-time rule, and nothing else — the drag loop above is open-ended and takes its speed
// from the pointer's distance to an edge, which is a different animation, not a parameter of this one.

export interface GlideParams {
  /** px per ms of travel — the apparent speed the document moves at, before the floor and ceiling. */
  speed: number
  /** Floor, so a short hop still reads as movement rather than a cut. */
  minMs: number
  /** Ceiling, so crossing a long document never becomes a wait. */
  maxMs: number
}

/** The house tuning for programmatic seeks — one recipe for every surface that glides to a target. */
export const SEEK_GLIDE: GlideParams = {
  speed: 3,
  minMs: Number.parseInt(duration.fast, 10),
  maxMs: Number.parseInt(duration.slow, 10),
}

/** How long a glide over `distance` px runs. Proportional to the distance so near and far jumps travel
 *  at one apparent speed, clamped at both ends. */
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

/** Travel `scroller` to `to` over a distance-proportional beat. Returns an instance-scoped stopper.
 *
 *  `to` may be a THUNK, and should be wherever the destination is measured rather than known: it is
 *  re-read every frame and the travel eases toward wherever it currently is. A host that renders
 *  lazily only estimates the height of what it hasn't drawn, so the destination sharpens as the
 *  travel reveals it — converging into the easing costs nothing, while landing on the first estimate
 *  and correcting afterwards is a visible jump at the end of an otherwise smooth move.
 *
 *  Cancels on any real scroll input — a glide that keeps pulling while the reader scrolls away fights
 *  them, which the drag loop never has to worry about because the pointer is held. Honours
 *  reduced-motion by arriving immediately. */
export function scrollGlide(
  scroller: HTMLElement,
  to: number | (() => number),
  params: GlideParams,
  onArrive?: () => void,
): () => void {
  stopAutoScroll() // one owner of programmatic scrolling at a time
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
  // The beat is fixed from the opening distance, so a destination that shifts underfoot changes where
  // the travel lands but never how long it takes.
  const ms = glideMs(target() - from, params)
  // Timed from the first FRAME, not from dispatch: the gap between them is dead time the easing would
  // otherwise have already spent by the time anything is drawn.
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
