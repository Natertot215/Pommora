import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  type CSSProperties,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { stack } from '../Theme/stack'
import { DEFAULT_FEEL } from '../Animations/feel'
import { clamp } from '../Utilities/clamp'
import { currentZoom } from '../Utilities/zoom'
import { findScroller, startAutoScroll } from './autoscroll'
import { announce, ensureInstructions, INSTRUCTIONS_ID } from './a11y'
import { nudgeDragRemeasure } from './dragDisclose'
import { usePointerGesture } from './gesture'
import { ARROW_DIRS, keyboardNext } from './keyboard'
import {
  ACTIVATION,
  BREAKOUT,
  HYSTERESIS,
  SETTLE_FALLBACK,
  px,
  toBox,
  type Box,
  type Carried,
  type DragItem,
  type DropState,
} from './shared'

// ── Types & scratch ─────────────────────────────────────────────────────────

// So a tap-wobble opens the control instead of lifting the card.
const INTERACTIVE_ACTIVATION = 12
const INTERACTIVE = '[data-drag-slop], button, input, textarea, select, a[href], [contenteditable]'

type Point = { x: number; y: number }
type Axis = 'x' | 'y'
type Size = { width: number; height: number }
type Rect = Size & { left: number; top: number }
type Overlay = (id: string, rect: Box) => ReactNode

type ZoneReg = {
  ids: string[]
  els: Map<string, HTMLElement>
  container: HTMLElement | null
  onReorder?: (activeId: string, overId: string) => void
  disabled: boolean
  axis?: Axis
  getItemLabel?: (id: string) => string
  family?: string
  fixed: boolean
  carry?: (id: string) => Carried | null
  receive?: (item: Carried, index: number) => void
  release?: (id: string) => void
  renderOverlay?: Overlay
}
type ZoneProps = Omit<ZoneReg, 'els' | 'container'>

// Taken at lift and only ever shifted: a mid-drag re-measure reads the drag's own transforms.
type Frozen = {
  ids: string[]
  rects: Box[]
  ref: HTMLElement | null
  origin: Point
  start: Point
  pitch: number
  gap: number
  tail: Point
}

// Mutable so pointer/rAF/keydown callbacks read it without stale closures. Every lift installs a fresh scratch, so nothing survives the gesture before it.
type DragScratch = {
  id: string
  zoneId: string
  el: HTMLElement | null
  rect: Box | null
  startX: number
  startY: number
  lastX: number
  lastY: number
  active: boolean
  activeIdx: number
  axis?: Axis
  zoom: number
  compX: number
  compY: number
  pickZone: string
  pick: number
  mapped: number | null
  family: string | null
  item: Carried | null
  loose: boolean
  home: Rect | null
  overlay: Overlay | null
  kdown: ((e: KeyboardEvent) => void) | null
  liftKey: KeyboardEvent | null
}
const blankDrag = (): DragScratch => ({
  id: '',
  zoneId: '',
  el: null,
  rect: null,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
  active: false,
  activeIdx: -1,
  zoom: 1,
  compX: 0,
  compY: 0,
  pickZone: '',
  pick: -1,
  mapped: null,
  family: null,
  item: null,
  loose: false,
  home: null,
  overlay: null,
  kdown: null,
  liftKey: null,
})

const travel = (d: DragScratch, x: number, y: number): Point => ({
  x: d.axis === 'y' && !d.loose ? 0 : x - d.startX,
  y: d.axis === 'x' && !d.loose ? 0 : y - d.startY,
})

const landingOf = (d: DragScratch): [string, number] =>
  d.mapped === null ? [d.zoneId, d.activeIdx] : [d.pickZone, d.mapped]

const within = (r: Rect, x: number, y: number, pad: number): boolean =>
  x >= r.left - pad &&
  x <= r.left + r.width + pad &&
  y >= r.top - pad &&
  y <= r.top + r.height + pad

const along = (b: Box, axis: Axis): number => (axis === 'x' ? b.left : b.top)
const extent = (s: Size, axis: Axis): number => (axis === 'x' ? s.width : s.height)

function unionOf(rects: Box[]): Rect | null {
  if (rects.length === 0) return null
  const left = Math.min(...rects.map((b) => b.left))
  const top = Math.min(...rects.map((b) => b.top))
  const right = Math.max(...rects.map((b) => b.left + b.width))
  const bottom = Math.max(...rects.map((b) => b.top + b.height))
  return { left, top, width: right - left, height: bottom - top }
}

// ── Zone registry ───────────────────────────────────────────────────────────

type ZoneMap = Map<string, ZoneReg>

function ensureZone(zones: ZoneMap, zoneId: string): ZoneReg {
  let z = zones.get(zoneId)
  if (!z) {
    z = { ids: [], els: new Map(), container: null, disabled: false, fixed: false }
    zones.set(zoneId, z)
  }
  return z
}

// ── Measurement ─────────────────────────────────────────────────────────────

// Smallest positive vertical step, not rects[1] - rects[0]: a grid's first two items share a row.
function pitchOf(rects: Box[], activeHeight: number): number {
  const tops = [...new Set(rects.map((b) => b.top))].sort((a, b) => a - b)
  let best = Infinity
  for (let i = 1; i < tops.length; i++) {
    const step = tops[i] - tops[i - 1]
    if (step > 1 && step < best) best = step
  }
  return best === Infinity ? (activeHeight || rects[0]?.height || 0) + 8 : best
}

function freezeZone(z: ZoneReg, activeHeight: number, width: number): Frozen {
  const ids: string[] = []
  const rects: Box[] = []
  for (const id of z.ids) {
    const el = z.els.get(id)
    if (!el) continue
    ids.push(id)
    rects.push(toBox(el))
  }
  const ref = z.container ?? (ids.length ? (z.els.get(ids[0])?.parentElement ?? null) : null)
  const r = ref?.getBoundingClientRect()
  const origin = { x: r?.left ?? 0, y: r?.top ?? 0 }
  const start = rects[0] ? { x: rects[0].left, y: rects[0].top } : origin
  const pitch = pitchOf(rects, activeHeight)
  const axis = z.axis
  const gap =
    axis && rects.length > 1
      ? along(rects[1], axis) - along(rects[0], axis) - extent(rects[0], axis)
      : 0
  const last = rects[rects.length - 1]
  const tail = !last
    ? origin
    : !axis
      ? cellAt(rects, rects.length, pitch, width)
      : axis === 'x'
        ? { x: last.left + last.width + gap, y: start.y }
        : { x: start.x, y: last.top + last.height + gap }
  return { ids, rects, ref, origin, start, pitch, gap, tail }
}

function shiftFrozen(f: Frozen, dx: number, dy: number): void {
  f.rects = f.rects.map((b) => ({
    ...b,
    left: b.left + dx,
    top: b.top + dy,
    cx: b.cx + dx,
    cy: b.cy + dy,
  }))
  f.origin = { x: f.origin.x + dx, y: f.origin.y + dy }
  f.start = { x: f.start.x + dx, y: f.start.y + dy }
  f.tail = { x: f.tail.x + dx, y: f.tail.y + dy }
}

// ── Grid model ──────────────────────────────────────────────────────────────

function cellAt(rects: Box[], slot: number, pitch: number, containerWidth: number): Point {
  if (slot < rects.length) return { x: rects[slot].left, y: rects[slot].top }
  // Auto-fill keeps empty tracks, so the column count comes from width, not from the cards present.
  const lefts = [...new Set(rects.map((r) => Math.round(r.left)))].sort((a, b) => a - b)
  const stride = lefts.length >= 2 ? lefts[1] - lefts[0] : (rects[0]?.width ?? 1) + 1
  const cols = Math.max(
    lefts.length,
    containerWidth > 0 ? Math.round(containerWidth / stride) : 1,
    1,
  )
  const last = rects[rects.length - 1]
  let col = Math.max(0, Math.round((last.left - lefts[0]) / stride))
  let top = last.top
  for (let s = rects.length; s <= slot; s++) {
    col++
    if (col >= cols) {
      col = 0
      top += pitch
    }
  }
  return { x: lefts[0] + col * stride, y: top }
}

// ── Placement ───────────────────────────────────────────────────────────────

function orderOf(count: number, activeIdx: number, over: number): number[] {
  const order: number[] = []
  for (let i = 0; i < count; i++) if (i !== activeIdx) order.push(i)
  if (over >= 0) order.splice(clamp(over, 0, order.length), 0, activeIdx)
  return order
}

export function placeCell(
  rects: Box[],
  activeIdx: number,
  over: number,
  index: number,
  pitch: number,
  width: number,
): Point {
  const order = orderOf(rects.length, activeIdx, over)
  return cellAt(rects, Math.max(0, order.indexOf(index)), pitch, width)
}

export function placeAxis(
  rects: Box[],
  axis: Axis,
  gap: number,
  start: Point,
  activeIdx: number,
  over: number,
  index: number,
  activeSize: number,
): Point {
  let at = 0
  for (const i of orderOf(rects.length, activeIdx, over)) {
    if (i === index) break
    at += (i === activeIdx ? activeSize : extent(rects[i], axis)) + gap
  }
  return axis === 'x' ? { x: start.x + at, y: start.y } : { x: start.x, y: start.y + at }
}

const STILL = 'translate3d(0,0,0)'
const translate = (x: number, y: number): string => `translate3d(${px(x)}, ${px(y)}, 0)`

/** Local px, so a zoomed root's items travel the screen distance the pointer did. */
const placeTransform = (target: Point, base: Box, zoom: number): string =>
  translate((target.x - base.left) / zoom, (target.y - base.top) / zoom)

// ── Context ─────────────────────────────────────────────────────────────────

type ItemState = { transform: string | undefined; hidden: boolean; animate: boolean }
type Active = { id: string; zoneId: string }

/** `home` is the escort's own surface; the item is loose once the pointer leaves it. */
export type EscortSpec = { id: string; family: string; item: Carried; rect: Box; home: Box }
export type Escort = {
  lift: (spec: EscortSpec) => boolean
  move: (x: number, y: number) => void
  drop: () => boolean
  abort: () => void
  loose: () => boolean
}

type EngineApi = {
  setZone: (zoneId: string, props: ZoneProps) => void
  releaseZone: (zoneId: string) => void
  registerContainer: (zoneId: string, el: HTMLElement | null) => void
  registerItem: (zoneId: string, id: string, el: HTMLElement | null) => void
  begin: (zoneId: string, id: string, e: ReactPointerEvent) => void
  liftKeyboard: (zoneId: string, id: string, liftKey: KeyboardEvent) => void
  escort: Escort
}
type EngineState = {
  active: Active | null
  dropState: DropState
  family: string | null
  floor: number | null
  itemState: (zoneId: string, id: string) => ItemState
  dropBox: (foreignOnly: boolean, inZone?: string) => Box | null
}
const ApiCtx = createContext<EngineApi | null>(null)
const StateCtx = createContext<EngineState | null>(null)
const ZoneIdCtx = createContext<{ zoneId: string; disabled: boolean } | null>(null)

type DragGroupProps = {
  onCommit?: (activeId: string, toZone: string, toIndex: number, fromZone: string) => void
  /** Over no zone, a loose item keeps its last zone or returns to its lifted slot. */
  stray?: 'stick' | 'return'
  /** The source zone keeps the lifted item's slot open while the landing is elsewhere. */
  holdGap?: boolean
  /** Null refuses the landing. Must be idempotent: an index it returned maps to itself. */
  resolveIndex?: (zoneId: string, index: number, activeId: string) => number | null
  renderOverlay?: Overlay
  children: ReactNode
}

export function DragGroup({
  onCommit,
  stray = 'stick',
  holdGap = false,
  resolveIndex,
  renderOverlay,
  children,
}: DragGroupProps): React.JSX.Element {
  const onCommitRef = useRef(onCommit)
  onCommitRef.current = onCommit
  const strayRef = useRef(stray)
  strayRef.current = stray
  const holdGapRef = useRef(holdGap)
  holdGapRef.current = holdGap
  const resolveRef = useRef(resolveIndex)
  resolveRef.current = resolveIndex
  const resolveAt = (zoneId: string, index: number): number | null =>
    resolveRef.current ? resolveRef.current(zoneId, index, drag.current.id) : index
  const overlayRef = useRef(renderOverlay)
  overlayRef.current = renderOverlay

  const zones = useRef<ZoneMap>(new Map())
  const frozen = useRef(new Map<string, Frozen>())
  const bounds = useRef(new Map<string, DOMRect>())
  const drag = useRef(blankDrag())
  const overlayEl = useRef<HTMLDivElement | null>(null)
  const pending = useRef<(() => void) | null>(null)
  const timer = useRef<number | null>(null)
  const stopScroll = useRef<(() => void) | null>(null)

  const [active, setActive] = useState<Active | null>(null)
  const [activeRect, setActiveRect] = useState<Box | null>(null)
  const [landing, setLanding] = useState<[string, number] | null>(null)
  const [dropState, setDropState] = useState<DropState>('idle')
  const [keyboard, setKeyboard] = useState(false)
  const [loose, setLoose] = useState(false)
  const beginGesture = usePointerGesture()

  const setZone = (zoneId: string, props: ZoneProps): void => {
    Object.assign(ensureZone(zones.current, zoneId), props)
  }
  const releaseZone = (zoneId: string): void => {
    zones.current.delete(zoneId)
  }
  const registerContainer = (zoneId: string, el: HTMLElement | null): void => {
    ensureZone(zones.current, zoneId).container = el
    if (el && drag.current.active) {
      syncBounds()
      nudgeDragRemeasure()
    }
  }
  const registerItem = (zoneId: string, id: string, el: HTMLElement | null): void => {
    const z = ensureZone(zones.current, zoneId)
    if (el) z.els.set(id, el)
    else z.els.delete(id)
  }
  const labelOf = (zoneId: string, id: string): string =>
    zones.current.get(zoneId)?.getItemLabel?.(id) ?? id

  const widthOf = (zoneId: string): number => bounds.current.get(zoneId)?.width ?? 0
  const syncBounds = (): void => {
    for (const [zid, z] of zones.current)
      if (z.container) bounds.current.set(zid, z.container.getBoundingClientRect())
  }
  const freeze = (zoneId: string): Frozen | null => {
    const held = frozen.current.get(zoneId)
    if (held) return held
    const z = zones.current.get(zoneId)
    if (!z) return null
    const f = freezeZone(z, drag.current.rect?.height ?? 0, widthOf(zoneId))
    frozen.current.set(zoneId, f)
    return f
  }
  // Shifted by the reference element's own delta, never re-measured, and never per pointermove.
  const resync = (): void => {
    const d = drag.current
    for (const [zid, f] of frozen.current) {
      const r = f.ref?.getBoundingClientRect()
      if (!r) continue
      const shx = r.left - f.origin.x
      const shy = r.top - f.origin.y
      if (!shx && !shy) continue
      shiftFrozen(f, shx, shy)
      if (zid === d.zoneId) {
        d.compX -= shx
        d.compY -= shy
        if (d.home) d.home = { ...d.home, left: d.home.left + shx, top: d.home.top + shy }
      }
    }
    syncBounds()
  }
  const zoneAt = (x: number, y: number, admit: (zid: string) => boolean): string | null => {
    let hit: string | null = null
    for (const [zid, b] of bounds.current) if (admit(zid) && within(b, x, y, 0)) hit = zid
    return hit
  }
  const atHome = (d: DragScratch, x: number, y: number): boolean => {
    const home = bounds.current.get(d.zoneId) ?? d.home
    if (!home) return false
    if (d.axis === 'x') return y >= home.top - BREAKOUT && y <= home.top + home.height + BREAKOUT
    if (d.axis === 'y') return x >= home.left - BREAKOUT && x <= home.left + home.width + BREAKOUT
    return within(home, x, y, 0)
  }
  const zoneFor = (d: DragScratch, x: number, y: number): string | null => {
    if (!d.loose) return d.zoneId
    if (d.pickZone !== d.zoneId) {
      const b = bounds.current.get(d.pickZone)
      if (b && within(b, x, y, HYSTERESIS)) return d.pickZone
    }
    const hit = zoneAt(
      x,
      y,
      (zid) => zid !== d.zoneId && zones.current.get(zid)?.family === d.family,
    )
    if (hit) return hit
    if (atHome(d, x, y)) return d.zoneId || null
    return strayRef.current === 'stick' ? d.pickZone : null
  }
  const foreignSize = (zid: string): Size => {
    const f = frozen.current.get(zid)
    const last = f?.rects[f.rects.length - 1]
    if (last) return { width: last.width, height: last.height }
    const b = bounds.current.get(zid)
    const r = drag.current.rect
    return {
      width: Math.min(r?.width ?? 0, b?.width ?? Infinity),
      height: b?.height ?? r?.height ?? 0,
    }
  }
  const sizeIn = (zid: string): Size => {
    const d = drag.current
    return zid === d.zoneId && d.rect ? d.rect : foreignSize(zid)
  }
  const cellOf = (zid: string, f: Frozen, a: number, over: number, index: number): Point => {
    const axis = zones.current.get(zid)?.axis
    return axis
      ? placeAxis(f.rects, axis, f.gap, f.start, a, over, index, extent(sizeIn(zid), axis))
      : placeCell(f.rects, a, over, index, f.pitch, widthOf(zid))
  }
  const targetCell = (zoneId: string, idx: number): Point | null => {
    const f = frozen.current.get(zoneId)
    if (!f) return null
    if (f.rects.length === 0) return f.tail
    const a = zoneId === drag.current.zoneId ? drag.current.activeIdx : -1
    return cellOf(zoneId, f, a, idx, a)
  }

  // ── Lift / move / drop ────────────────────────────────────────────────────

  const lift = (zoneId: string, id: string): Frozen | null => {
    const z = zones.current.get(zoneId)
    const el = z?.els.get(id) ?? null
    if (!z || z.disabled || !el) return null
    syncBounds()
    frozen.current.clear()
    const f = freezeZone(z, 0, widthOf(zoneId))
    const idx = f.ids.indexOf(id)
    const rect = f.rects[idx]
    if (!rect) return null
    frozen.current.set(zoneId, f)
    const item = z.family === undefined ? null : z.carry ? z.carry(id) : id
    const d = drag.current
    d.id = id
    d.zoneId = zoneId
    d.el = el
    d.active = true
    d.activeIdx = idx
    d.axis = z.axis
    // A copy, not the frozen entry: the projection and the overlay's origin both need the lift-time rect, which resync shifts out from under them.
    d.rect = { ...rect }
    d.zoom = currentZoom(el)
    d.pickZone = zoneId
    d.pick = idx
    d.mapped = idx
    d.family = item === null ? null : (z.family ?? null)
    d.item = item
    d.loose = false
    d.home = item === null ? null : (bounds.current.get(zoneId) ?? unionOf(f.rects))
    d.overlay = z.renderOverlay ?? overlayRef.current ?? null
    setActive({ id, zoneId })
    setActiveRect(d.rect)
    setLanding([zoneId, idx])
    setDropState('dragging')
    return f
  }

  const track = (cx: number, cy: number): void => {
    const d = drag.current
    if (!d.active || !d.rect) return
    if (d.family !== null && !d.loose && !atHome(d, cx, cy)) {
      d.loose = true
      setLoose(true)
      if (d.axis || strayRef.current === 'return') {
        stopScroll.current?.()
        stopScroll.current = null
      }
    }
    const { x: dx, y: dy } = travel(d, cx, cy)
    // Written straight to the element: a delta in context would re-render every item per pointermove. useDragItem omits `transform` so React never clobbers this write.
    if (overlayEl.current) overlayEl.current.style.transform = translate(dx, dy)
    else if (d.el && !d.overlay)
      d.el.style.transform = translate((dx + d.compX) / d.zoom, (dy + d.compY) / d.zoom)

    const from = d.pickZone
    const zid = d.family === null ? d.zoneId : zoneFor(d, cx, cy)
    if (zid === null) {
      if (d.mapped !== null || from !== d.zoneId) {
        d.pickZone = d.zoneId
        d.pick = d.activeIdx
        d.mapped = null
        setLanding(landingOf(d))
      }
      return
    }
    const f = freeze(zid)
    if (!f) return
    const z = zones.current.get(zid)
    const projX = d.rect.cx + dx
    const projY = d.rect.cy + dy
    const own = zid === d.zoneId
    const size = sizeIn(zid)
    const half = { x: size.width / 2, y: size.height / 2 }
    const count = f.rects.length + (own ? 0 : 1)
    const last = f.rects[f.rects.length - 1]
    const distTo = (i: number): number => {
      const b = f.rects[i]
      if (b) return Math.hypot(b.cx - projX, b.cy - projY)
      const toTail = Math.hypot(f.tail.x + half.x - projX, f.tail.y + half.y - projY)
      return last && !z?.axis
        ? Math.min(toTail, Math.hypot(last.left + last.width + half.x - projX, last.cy - projY))
        : toTail
    }
    let pick = 0
    let nearest = Infinity
    for (let i = 0; i < count; i++) {
      const at = distTo(i)
      if (at < nearest) {
        nearest = at
        pick = i
      }
    }
    // A new candidate has to beat the standing one; on a zone switch the argmin wins outright.
    if (zid === from && pick !== d.pick && distTo(d.pick) - nearest <= HYSTERESIS) pick = d.pick
    const mapped = own && z?.fixed ? d.activeIdx : resolveAt(zid, pick)
    d.pickZone = zid
    d.pick = pick
    if (mapped !== d.mapped || zid !== from) {
      d.mapped = mapped
      setLanding(landingOf(d))
    }
  }

  const detach = (): void => {
    stopScroll.current?.()
    stopScroll.current = null
    const d = drag.current
    if (d.kdown) {
      document.removeEventListener('keydown', d.kdown)
      d.kdown = null
    }
  }

  const reset = (): void => {
    drag.current.active = false
    frozen.current.clear()
    bounds.current.clear()
    setActive(null)
    setActiveRect(null)
    setLanding(null)
    setDropState('idle')
    setKeyboard(false)
    setLoose(false)
  }

  const land = (zoneId: string, idx: number, focus: HTMLElement | null): void => {
    const d = drag.current
    const { id, zoneId: from, item } = d
    const label = labelOf(from, id)
    const moved = zoneId !== from || idx !== d.activeIdx
    const target = zones.current.get(zoneId)
    const onReorder = target?.onReorder
    const receive = target?.receive
    const release = zones.current.get(from)?.release
    const overId = frozen.current.get(zoneId)?.ids[idx]
    settle(zoneId, idx, () => {
      if (!moved) announce(`${label} returned to its original position.`)
      else {
        if (zoneId !== from) {
          receive?.(item, idx)
          release?.(id)
        } else if (overId) onReorder?.(id, overId)
        onCommitRef.current?.(id, zoneId, idx, from)
        announce(`Dropped ${label} at position ${idx + 1}.`)
      }
      if (focus) requestAnimationFrame(() => focus.focus())
    })
  }

  // What the preview showed is what lands: track resolves the pair on every move, and a disclosure re-tracks.
  const drop = (): void => {
    const d = drag.current
    if (!d.active) return
    d.active = false
    const [zone, idx] = landingOf(d)
    land(zone, idx, null)
  }

  function onScrolled(): void {
    resync()
    if (drag.current.active) track(drag.current.lastX, drag.current.lastY)
  }

  const begin = (zoneId: string, id: string, e: ReactPointerEvent): void => {
    if (drag.current.active) return
    // A press during the drop animation fast-forwards it instead of being refused.
    pending.current?.()
    const z = zones.current.get(zoneId)
    const el = z?.els.get(id) ?? null
    if (!z || z.disabled || !el) return
    const interactive = !!(e.target as Element)?.closest?.(INTERACTIVE)
    drag.current = {
      ...blankDrag(),
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
    }
    beginGesture({
      el,
      event: e,
      activation: interactive ? INTERACTIVE_ACTIVATION : ACTIVATION,
      onActivate: () => {
        if (!lift(zoneId, id)) return false
        announce(`Picked up ${labelOf(zoneId, id)}.`)
        const scroller = findScroller(el, 'xy')
        if (scroller)
          stopScroll.current = startAutoScroll({
            getPoint: () => ({ x: drag.current.lastX, y: drag.current.lastY }),
            scroller,
            dragEl: el,
            axis: 'xy',
            onScrolled,
          })
        // The activation commit strips React's managed transform; re-assert before the item can paint at origin.
        requestAnimationFrame(() => {
          if (drag.current.active) track(drag.current.lastX, drag.current.lastY)
        })
        return true
      },
      onDragMove: (ev: PointerEvent) => {
        const d = drag.current
        d.lastX = ev.clientX
        d.lastY = ev.clientY
        track(ev.clientX, ev.clientY)
      },
      onDrop: drop,
      onAbort: () => {
        const d = drag.current
        if (!d.active) return
        d.active = false
        settle(d.zoneId, d.activeIdx)
      },
      onWindowScroll: onScrolled,
      onDisclose: z.family === undefined ? undefined : onScrolled,
      teardown: detach,
    })
  }

  const escort: Escort = {
    lift: (spec) => {
      if (drag.current.active) return false
      pending.current?.()
      syncBounds()
      frozen.current.clear()
      drag.current = {
        ...blankDrag(),
        id: spec.id,
        active: true,
        rect: { ...spec.rect },
        startX: spec.rect.cx,
        startY: spec.rect.cy,
        lastX: spec.rect.cx,
        lastY: spec.rect.cy,
        family: spec.family,
        item: spec.item,
        home: spec.home,
      }
      setActive({ id: spec.id, zoneId: '' })
      setActiveRect(drag.current.rect)
      setLanding(null)
      setDropState('dragging')
      return true
    },
    move: (x, y) => {
      const d = drag.current
      if (!d.active) return
      d.lastX = x
      d.lastY = y
      track(x, y)
    },
    drop: () => {
      const d = drag.current
      if (!d.active) return false
      const { id, item, mapped } = d
      const [zone, idx] = landingOf(d)
      const receive = zones.current.get(zone)?.receive
      reset()
      if (mapped === null) return false
      receive?.(item, idx)
      onCommitRef.current?.(id, zone, idx, '')
      return true
    },
    abort: () => {
      if (drag.current.active) reset()
    },
    loose: () => drag.current.active && drag.current.loose,
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────

  const onKeyboard = (e: KeyboardEvent): void => {
    const d = drag.current
    const f = frozen.current.get(d.zoneId)
    if (!d.active || !f || e === d.liftKey) return
    if (e.key in ARROW_DIRS) {
      e.preventDefault()
      const next = keyboardNext(f.rects, d.pick, ARROW_DIRS[e.key])
      if (next !== d.pick) {
        d.pick = next
        d.mapped = resolveAt(d.zoneId, next)
        setLanding(landingOf(d))
        announce(`Moved to position ${next + 1} of ${f.rects.length}.`)
      }
    } else if (e.key === ' ' || e.key === 'Enter' || e.key === 'Tab') {
      // Tab drops too: it must commit, not tab focus away mid-drag.
      e.preventDefault()
      const [zone, idx] = landingOf(d)
      land(zone, idx, d.el)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      const el = d.el
      const label = labelOf(d.zoneId, d.id)
      settle(d.zoneId, d.activeIdx, () => {
        announce(`Movement canceled. ${label} returned to its original position.`)
        requestAnimationFrame(() => el?.focus())
      })
    }
  }

  // React delegates keydown at the root container, so the lifting keypress still reaches the document listener below — held on the scratch for onKeyboard to skip.
  const liftKeyboard = (zoneId: string, id: string, liftKey: KeyboardEvent): void => {
    if (drag.current.active) return
    pending.current?.()
    drag.current = { ...blankDrag(), kdown: onKeyboard, liftKey }
    const f = lift(zoneId, id)
    if (!f) return
    setKeyboard(true)
    document.addEventListener('keydown', onKeyboard)
    announce(
      `Picked up ${labelOf(zoneId, id)}. Item ${drag.current.activeIdx + 1} of ${f.rects.length}.`,
    )
  }

  // ── Settle ────────────────────────────────────────────────────────────────

  // Commits on `transitionend`, not a timer: the transition starts a frame later, so a timer fires mid-flight and snaps the gap items short. The fallback covers no-transition hosts.
  function settle(zoneId: string, idx: number, commit?: () => void): void {
    const d = drag.current
    d.active = false
    detach()
    setDropState('dropping')
    setLanding([zoneId, idx])
    const target = targetCell(zoneId, idx)
    const el = overlayEl.current ?? d.el
    if (overlayEl.current && target && d.rect) {
      overlayEl.current.style.transition = `transform ${DEFAULT_FEEL.duration}ms ${DEFAULT_FEEL.easing}`
      overlayEl.current.style.transform = translate(target.x - d.rect.left, target.y - d.rect.top)
    }
    let done = false
    const finish = (): void => {
      if (done) return
      done = true
      pending.current = null
      if (timer.current != null) {
        clearTimeout(timer.current)
        timer.current = null
      }
      el?.removeEventListener('transitionend', onEnd)
      reset()
      commit?.()
    }
    const onEnd = (e: TransitionEvent): void => {
      if (e.target === el && e.propertyName === 'transform') finish()
    }
    pending.current = finish
    el?.addEventListener('transitionend', onEnd)
    timer.current = window.setTimeout(finish, DEFAULT_FEEL.duration + SETTLE_FALLBACK)
  }

  useEffect(() => ensureInstructions(), [])
  useEffect(
    () => () => {
      detach()
      // A view switch mid-drop must still commit what the preview promised; finish clears its own timer.
      pending.current?.()
    },
    [],
  )

  // ── Overlay ───────────────────────────────────────────────────────────────

  // React commits the lift state on a Scheduler task, so the rAF re-assert can run before the overlay mounts: it seeds its own first frame.
  const holdOverlay = useCallback((el: HTMLDivElement | null) => {
    overlayEl.current = el
    const d = drag.current
    if (!el || !d.active) return
    const t = travel(d, d.lastX, d.lastY)
    el.style.transform = translate(t.x, t.y)
  }, [])

  const overlay =
    active && activeRect && dropState !== 'idle' && !keyboard && drag.current.overlay
      ? createPortal(
          <div
            ref={holdOverlay}
            style={{
              position: 'fixed',
              left: activeRect.left,
              top: activeRect.top,
              width: activeRect.width,
              height: activeRect.height,
              pointerEvents: 'none',
              zIndex: stack.top.dragOverlay,
            }}
          >
            {drag.current.overlay(active.id, activeRect)}
          </div>,
          document.body,
        )
      : null

  // ── Context & hooks ───────────────────────────────────────────────────────

  const itemState = (zoneId: string, id: string): ItemState => {
    const d = drag.current
    const animate = dropState !== 'idle'
    const atRest = (transitioning: boolean): ItemState => ({
      transform: STILL,
      hidden: false,
      animate: transitioning,
    })
    if (!active) return atRest(false)
    if (id === active.id && zoneId === active.zoneId) {
      if (d.overlay && !keyboard) return { transform: STILL, hidden: true, animate: false }
      // Omitted during a live pointer drag so a re-render can't clobber track()'s imperative write.
      if (dropState === 'dragging' && !keyboard)
        return { transform: undefined, hidden: false, animate: false }
      const base = frozen.current.get(d.zoneId)?.rects[d.activeIdx]
      const target = landing && targetCell(...landing)
      if (!base || !target) return atRest(animate)
      return { transform: placeTransform(target, base, d.zoom), hidden: false, animate: true }
    }
    const f = frozen.current.get(zoneId)
    const index = f ? f.ids.indexOf(id) : -1
    if (!f || index === -1) return atRest(animate)
    const own = zoneId === d.zoneId
    const over =
      landing && landing[0] === zoneId ? landing[1] : own && holdGapRef.current ? d.activeIdx : -1
    const target = cellOf(zoneId, f, own ? d.activeIdx : -1, over, index)
    return { transform: placeTransform(target, f.rects[index], d.zoom), hidden: false, animate }
  }

  // Containers grow their drag-time floor on the lift commit, so every measurement is re-read once it has laid out; the landing re-renders because dropBox reads the shifted rects at render.
  useLayoutEffect(() => {
    if (dropState !== 'dragging') return
    resync()
    setLanding((l) => l && [...l])
  }, [dropState])

  const dropBox = (foreignOnly: boolean, inZone?: string): Box | null => {
    if (!activeRect || !landing || landing[1] < 0) return null
    const [zid, idx] = landing
    const own = zid === drag.current.zoneId
    if ((foreignOnly && own) || (inZone !== undefined && inZone !== zid)) return null
    const target = targetCell(zid, idx)
    if (!target) return null
    const { width, height } = zones.current.get(zid)?.axis
      ? sizeIn(zid)
      : (frozen.current.get(zid)?.rects[idx] ?? activeRect)
    return {
      left: target.x,
      top: target.y,
      width,
      height,
      cx: target.x + width / 2,
      cy: target.y + height / 2,
    }
  }

  const api = useMemo<EngineApi>(
    () => ({ setZone, releaseZone, registerContainer, registerItem, begin, liftKeyboard, escort }),
    [],
  )
  const state = useMemo<EngineState>(
    () => ({
      active,
      dropState,
      family: loose ? drag.current.family : null,
      floor: activeRect && dropState !== 'idle' ? activeRect.height / drag.current.zoom : null,
      itemState,
      dropBox,
    }),
    [active, activeRect, landing, dropState, keyboard, loose],
  )

  return (
    <ApiCtx.Provider value={api}>
      <StateCtx.Provider value={state}>
        {children}
        {overlay}
      </StateCtx.Provider>
    </ApiCtx.Provider>
  )
}

type SortableZoneProps = {
  /** An addressable zone owns an element, so an empty band is still a drop target. */
  id?: string
  items: string[]
  onReorder?: (activeId: string, overId: string) => void
  disabled?: boolean
  axis?: Axis
  getItemLabel?: (id: string) => string
  /** Zones of one family exchange items; only a zone with an `id` receives. */
  family?: string
  /** Items may leave a fixed zone, but its own order never previews a move. */
  fixed?: boolean
  /** Null keeps that item home; absent, the item carries its id. */
  carry?: (id: string) => Carried | null
  receive?: (item: Carried, index: number) => void
  release?: (id: string) => void
  renderOverlay?: Overlay
  className?: string
  children: ReactNode
}

export function SortableZone(props: SortableZoneProps): React.JSX.Element {
  const api = useContext(ApiCtx)
  // A standalone surface carries its own provider, so a single-zone host mounts a zone and nothing else.
  if (!api)
    return (
      <DragGroup>
        <SortableZone {...props} />
      </DragGroup>
    )
  return <ZoneBody api={api} {...props} />
}

function ZoneBody({
  api,
  id,
  items,
  onReorder,
  disabled = false,
  axis,
  getItemLabel,
  family,
  fixed = false,
  carry,
  receive,
  release,
  renderOverlay,
  className,
  children,
}: SortableZoneProps & { api: EngineApi }): React.JSX.Element {
  const floor = useContext(StateCtx)?.floor ?? null
  const auto = useId()
  const zoneId = id ?? auto
  // Registered in an effect, after the item refs land: a render-time write would be undone by the outgoing zone's cleanup when one id remounts inside a single commit.
  useEffect(() => {
    api.setZone(zoneId, {
      ids: items,
      onReorder,
      disabled,
      axis,
      getItemLabel,
      family,
      fixed,
      carry,
      receive,
      release,
      renderOverlay,
    })
  })
  useEffect(() => () => api.releaseZone(zoneId), [zoneId])
  const zone = useMemo(() => ({ zoneId, disabled }), [zoneId, disabled])
  return (
    <ZoneIdCtx.Provider value={zone}>
      {id == null ? (
        children
      ) : (
        <div
          ref={(el) => api.registerContainer(zoneId, el)}
          className={className}
          style={floor === null ? undefined : ({ '--drag-floor': px(floor) } as CSSProperties)}
        >
          {children}
        </div>
      )}
    </ZoneIdCtx.Provider>
  )
}

/** Inside a zone, only that zone's landings; outside one, any zone's; `foreignOnly` skips the item's own zone. */
export function useDropSlot(foreignOnly = false): Box | null {
  const s = useContext(StateCtx)
  const zone = useContext(ZoneIdCtx)
  return s && s.dropState === 'dragging' ? s.dropBox(foreignOnly, zone?.zoneId) : null
}

export function DropSlot({ foreignOnly }: { foreignOnly?: boolean }): React.JSX.Element | null {
  const slot = useDropSlot(foreignOnly)
  if (!slot) return null
  return createPortal(
    <div
      className="drop-slot"
      style={{
        position: 'fixed',
        left: slot.left,
        top: slot.top,
        width: slot.width,
        height: slot.height,
        zIndex: stack.top.dragSlot,
      }}
    />,
    document.body,
  )
}

/** Null until an item has left its own zone. */
export function useDragFamily(): string | null {
  return useContext(StateCtx)?.family ?? null
}

export function useEscort(): Escort | null {
  return useContext(ApiCtx)?.escort ?? null
}

export function useDragItem(id: string): DragItem {
  const api = useContext(ApiCtx)
  const state = useContext(StateCtx)
  const zone = useContext(ZoneIdCtx)
  if (!api || !state || !zone) throw new Error('useDragItem must be used inside a <SortableZone>')
  const { zoneId, disabled } = zone
  const { transform, hidden, animate } = state.itemState(zoneId, id)
  const isDragging = state.active?.id === id && state.active.zoneId === zoneId
  return {
    setNodeRef: (el) => api.registerItem(zoneId, id, el),
    style: {
      transform,
      // At rest the inline transition clears entirely: an inline value (even 'none') replaces the element's whole stylesheet transition list and kills its own color/size motion. Safe because the zone contract forbids an item's stylesheet from transitioning `transform`.
      transition: animate
        ? `transform ${DEFAULT_FEEL.duration}ms ${DEFAULT_FEEL.easing}`
        : undefined,
      visibility: hidden ? 'hidden' : undefined,
      // The lifted item must not answer the disclose hit-test it is riding over.
      pointerEvents: isDragging && !hidden && state.dropState === 'dragging' ? 'none' : undefined,
      zIndex: isDragging ? stack.local.lifted : undefined,
      position: 'relative',
      touchAction: 'none',
    },
    handle: {
      onPointerDown: (e: ReactPointerEvent) => api.begin(zoneId, id, e),
      onKeyDown: (e: ReactKeyboardEvent) => {
        // A focusable descendant's Space or Enter is its own, never a lift.
        if (e.target !== e.currentTarget) return
        if ((e.key === ' ' || e.key === 'Enter') && !isDragging && !disabled) {
          e.preventDefault()
          api.liftKeyboard(zoneId, id, e.nativeEvent)
        }
      },
      role: 'button',
      tabIndex: disabled ? -1 : 0,
      'aria-roledescription': 'sortable',
      'aria-describedby': INSTRUCTIONS_ID,
      'aria-pressed': isDragging || undefined,
      'aria-disabled': disabled || undefined,
    },
    isDragging,
  }
}
