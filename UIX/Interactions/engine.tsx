import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
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
import { findScroller, startAutoScroll } from './autoscroll'
import { announce, ensureInstructions, INSTRUCTIONS_ID } from './a11y'
import { usePointerGesture } from './gesture'
import { ARROW_DIRS, keyboardNext } from './keyboard'
import {
  ACTIVATION,
  HYSTERESIS,
  SETTLE_FALLBACK,
  px,
  toBox,
  type Box,
  type DragItem,
  type DropState,
} from './shared'

// ── Types & scratch ─────────────────────────────────────────────────────────

// So a tap-wobble opens the control instead of lifting the card.
const INTERACTIVE_ACTIVATION = 12
const INTERACTIVE = '[data-drag-slop], button, input, textarea, select, a[href], [contenteditable]'

type Point = { x: number; y: number }

type ZoneReg = {
  ids: string[]
  els: Map<string, HTMLElement>
  container: HTMLElement | null
  onReorder?: (activeId: string, overId: string) => void
  disabled: boolean
  axis?: 'x' | 'y'
  getItemLabel?: (id: string) => string
}
type ZoneProps = Omit<ZoneReg, 'els' | 'container'>

// Taken at lift and only ever shifted: a mid-drag re-measure reads the drag's own transforms.
type Frozen = {
  ids: string[]
  rects: Box[]
  ref: HTMLElement | null
  origin: Point
  pitch: number
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
  axis?: 'x' | 'y'
  zoom: number
  compX: number
  compY: number
  pickZone: string
  pick: number
  // What resolveIndex allows, or null where it refuses the pick — a refused landing previews and lands back in the lifted slot.
  mapped: number | null
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
  kdown: null,
  liftKey: null,
})

// The gesture's travel, with the zone's axis lock applied.
const travel = (d: DragScratch, x: number, y: number): Point => ({
  x: d.axis === 'y' ? 0 : x - d.startX,
  y: d.axis === 'x' ? 0 : y - d.startY,
})

// Where the gesture would land right now.
const landingOf = (d: DragScratch): [string, number] =>
  d.mapped === null ? [d.zoneId, d.activeIdx] : [d.pickZone, d.mapped]

// ── Zone registry ───────────────────────────────────────────────────────────

type ZoneMap = Map<string, ZoneReg>

function ensureZone(zones: ZoneMap, zoneId: string): ZoneReg {
  let z = zones.get(zoneId)
  if (!z) {
    z = { ids: [], els: new Map(), container: null, disabled: false }
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
  const pitch = pitchOf(rects, activeHeight)
  return {
    ids,
    rects,
    ref,
    origin,
    pitch,
    tail: rects.length ? cellAt(rects, rects.length, pitch, width) : origin,
  }
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
  f.tail = { x: f.tail.x + dx, y: f.tail.y + dy }
}

// ── Grid model ──────────────────────────────────────────────────────────────

// Walked by grid columns past the last card; a linear extrapolation would wrap a half-full row.
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

/** The cell an item lands in: the zone's order minus the active item, which is spliced back in at `over` when this is the over-zone. `-1` stands for an active item belonging to another zone. */
export function placeCell(
  rects: Box[],
  activeIdx: number,
  over: number,
  index: number,
  pitch: number,
  width: number,
): Point {
  const order: number[] = []
  for (let i = 0; i < rects.length; i++) if (i !== activeIdx) order.push(i)
  if (over >= 0) order.splice(clamp(over, 0, order.length), 0, activeIdx)
  return cellAt(rects, Math.max(0, order.indexOf(index)), pitch, width)
}

const STILL = 'translate3d(0,0,0)'
const translate = (x: number, y: number): string => `translate3d(${px(x)}, ${px(y)}, 0)`

/** Local px, so a zoomed root's items travel the screen distance the pointer did. */
const placeTransform = (target: Point, base: Box, zoom: number): string =>
  translate((target.x - base.left) / zoom, (target.y - base.top) / zoom)

// ── Context ─────────────────────────────────────────────────────────────────

type ItemState = { transform: string | undefined; hidden: boolean; animate: boolean }
type EngineValue = {
  activeId: string | null
  dropState: DropState
  setZone: (zoneId: string, props: ZoneProps) => void
  releaseZone: (zoneId: string) => void
  registerContainer: (zoneId: string, el: HTMLElement | null) => void
  registerItem: (zoneId: string, id: string, el: HTMLElement | null) => void
  begin: (zoneId: string, id: string, e: ReactPointerEvent) => void
  liftKeyboard: (zoneId: string, id: string, liftKey: KeyboardEvent) => void
  itemState: (zoneId: string, id: string) => ItemState
  dropBox: () => Box | null
}
const EngineCtx = createContext<EngineValue | null>(null)
const ZoneIdCtx = createContext<{ zoneId: string; disabled: boolean } | null>(null)

export type DragGroupProps = {
  onCommit?: (activeId: string, toZone: string, toIndex: number) => void
  crossZone?: boolean
  /** Null refuses the landing. Must be idempotent: an index it returned maps to itself. */
  resolveIndex?: (zoneId: string, index: number, activeId: string) => number | null
  /** A tile embed's body clips and places by transform, so only a body portal escapes it. */
  renderOverlay?: (activeId: string, rect: Box) => ReactNode
  children: ReactNode
}

export function DragGroup({
  onCommit,
  crossZone = false,
  resolveIndex,
  renderOverlay,
  children,
}: DragGroupProps): React.JSX.Element {
  const onCommitRef = useRef(onCommit)
  onCommitRef.current = onCommit
  const crossZoneRef = useRef(crossZone)
  crossZoneRef.current = crossZone
  const resolveRef = useRef(resolveIndex)
  resolveRef.current = resolveIndex
  const resolveAt = (zoneId: string, index: number): number | null =>
    resolveRef.current ? resolveRef.current(zoneId, index, drag.current.id) : index
  const overlayOn = useRef(renderOverlay != null)
  overlayOn.current = renderOverlay != null

  const zones = useRef<ZoneMap>(new Map())
  const frozen = useRef(new Map<string, Frozen>())
  const bounds = useRef(new Map<string, DOMRect>())
  const drag = useRef(blankDrag())
  const overlayEl = useRef<HTMLDivElement | null>(null)
  const pending = useRef<(() => void) | null>(null)
  const timer = useRef<number | null>(null)
  const stopScroll = useRef<(() => void) | null>(null)

  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeRect, setActiveRect] = useState<Box | null>(null)
  const [landing, setLanding] = useState<[string, number] | null>(null)
  const [dropState, setDropState] = useState<DropState>('idle')
  const [keyboard, setKeyboard] = useState(false)
  const beginGesture = usePointerGesture()

  const setZone = (zoneId: string, props: ZoneProps): void => {
    Object.assign(ensureZone(zones.current, zoneId), props)
  }
  const releaseZone = (zoneId: string): void => {
    zones.current.delete(zoneId)
  }
  const registerContainer = (zoneId: string, el: HTMLElement | null): void => {
    ensureZone(zones.current, zoneId).container = el
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
      }
    }
    syncBounds()
  }
  const zoneAt = (x: number, y: number): string | null => {
    for (const [zid, b] of bounds.current)
      if (x >= b.left && x <= b.right && y >= b.top && y <= b.bottom) return zid
    return null
  }
  const targetCell = (zoneId: string, idx: number): Point | null => {
    const f = frozen.current.get(zoneId)
    if (!f) return null
    if (f.rects.length === 0) return f.tail
    const a = zoneId === drag.current.zoneId ? drag.current.activeIdx : -1
    return placeCell(f.rects, a, idx, a, f.pitch, widthOf(zoneId))
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
    const d = drag.current
    d.id = id
    d.zoneId = zoneId
    d.el = el
    d.active = true
    d.activeIdx = idx
    d.axis = z.axis
    // A copy, not the frozen entry: the projection and the overlay's origin both need the lift-time rect, which resync shifts out from under them.
    d.rect = { ...rect }
    d.zoom = el.currentCSSZoom || 1
    d.pickZone = zoneId
    d.pick = idx
    d.mapped = idx
    setActiveId(id)
    setActiveRect(d.rect)
    setLanding([zoneId, idx])
    setDropState('dragging')
    return f
  }

  const track = (cx: number, cy: number): void => {
    const d = drag.current
    if (!d.active || !d.rect) return
    const { x: dx, y: dy } = travel(d, cx, cy)
    // Written straight to the element: a delta in context would re-render every item per pointermove. useZoneItem omits `transform` so React never clobbers this write.
    if (overlayEl.current) overlayEl.current.style.transform = translate(dx, dy)
    else if (d.el && !overlayOn.current)
      d.el.style.transform = translate((dx + d.compX) / d.zoom, (dy + d.compY) / d.zoom)

    const from = d.pickZone
    const zid = crossZoneRef.current ? (zoneAt(cx, cy) ?? from) : d.zoneId
    const f = freeze(zid)
    if (!f) return
    const projX = d.rect.cx + dx
    const projY = d.rect.cy + dy
    const half = { x: d.rect.width / 2, y: d.rect.height / 2 }
    // A foreign zone's candidates are its rects plus one trailing cell, so a card can land past the last one.
    const count = f.rects.length + (zid === d.zoneId ? 0 : 1)
    const last = f.rects[f.rects.length - 1]
    const distTo = (i: number): number => {
      const b = f.rects[i]
      if (b) return Math.hypot(b.cx - projX, b.cy - projY)
      // The tail wraps to a new row when the last row is full, so past the last card's edge on its own row counts as after it too.
      const toTail = Math.hypot(f.tail.x + half.x - projX, f.tail.y + half.y - projY)
      return last
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
    const mapped = resolveAt(zid, pick)
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
    setActiveId(null)
    setActiveRect(null)
    setLanding(null)
    setDropState('idle')
    setKeyboard(false)
  }

  /** The one landing: settling back into the lifted slot commits nothing. */
  const land = (zoneId: string, idx: number, focus: HTMLElement | null): void => {
    const d = drag.current
    const label = labelOf(d.zoneId, d.id)
    const moved = zoneId !== d.zoneId || idx !== d.activeIdx
    const onReorder = zones.current.get(zoneId)?.onReorder
    const overId = frozen.current.get(zoneId)?.ids[idx]
    settle(zoneId, idx, () => {
      if (!moved) announce(`${label} returned to its original position.`)
      else {
        if (zoneId === d.zoneId && overId) onReorder?.(d.id, overId)
        onCommitRef.current?.(d.id, zoneId, idx)
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
      onDisclose: crossZoneRef.current ? onScrolled : undefined,
      teardown: detach,
    })
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
    renderOverlay && activeId && activeRect && dropState !== 'idle' && !keyboard
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
              zIndex: stack.top.floating,
            }}
          >
            {renderOverlay(activeId, activeRect)}
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
    if (!activeId) return atRest(false)
    if (id === activeId) {
      if (overlayOn.current && !keyboard) return { transform: STILL, hidden: true, animate: false }
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
    const target = placeCell(
      f.rects,
      zoneId === d.zoneId ? d.activeIdx : -1,
      landing && landing[0] === zoneId ? landing[1] : -1,
      index,
      f.pitch,
      widthOf(zoneId),
    )
    return { transform: placeTransform(target, f.rects[index], d.zoom), hidden: false, animate }
  }

  // Containers grow their drag-time floor on the lift commit, so every measurement is re-read once it has laid out.
  useLayoutEffect(() => {
    if (dropState === 'dragging') resync()
  }, [dropState])

  const dropBox = (): Box | null => {
    if (!activeRect || !landing || landing[1] < 0) return null
    const target = targetCell(...landing)
    if (!target) return null
    // The slot takes the size of the cell it lands in; past the last cell it has only the lifted item's.
    const { width, height } = frozen.current.get(landing[0])?.rects[landing[1]] ?? activeRect
    return {
      left: target.x,
      top: target.y,
      width,
      height,
      cx: target.x + width / 2,
      cy: target.y + height / 2,
    }
  }

  const value = useMemo<EngineValue>(
    () => ({
      activeId,
      dropState,
      setZone,
      releaseZone,
      registerContainer,
      registerItem,
      begin,
      liftKeyboard,
      itemState,
      dropBox,
    }),
    [activeId, activeRect, landing, dropState, keyboard],
  )

  return (
    <EngineCtx.Provider value={value}>
      {children}
      {overlay}
    </EngineCtx.Provider>
  )
}

type SortableZoneProps = {
  /** An addressable zone owns an element, so an empty band is still a drop target. */
  id?: string
  items: string[]
  onReorder?: (activeId: string, overId: string) => void
  disabled?: boolean
  axis?: 'x' | 'y'
  getItemLabel?: (id: string) => string
  className?: string
  children: ReactNode
}

export function SortableZone(props: SortableZoneProps): React.JSX.Element {
  const engine = useContext(EngineCtx)
  // A standalone surface carries its own provider, so a single-zone host mounts a zone and nothing else.
  if (!engine)
    return (
      <DragGroup>
        <SortableZone {...props} />
      </DragGroup>
    )
  return <ZoneBody engine={engine} {...props} />
}

function ZoneBody({
  engine,
  id,
  items,
  onReorder,
  disabled = false,
  axis,
  getItemLabel,
  className,
  children,
}: SortableZoneProps & { engine: EngineValue }): React.JSX.Element {
  const auto = useId()
  const zoneId = id ?? auto
  // Registered in an effect, after the item refs land: a render-time write would be undone by the outgoing zone's cleanup when one id remounts inside a single commit.
  useEffect(() => {
    engine.setZone(zoneId, { ids: items, onReorder, disabled, axis, getItemLabel })
  })
  useEffect(() => () => engine.releaseZone(zoneId), [zoneId])
  const zone = useMemo(() => ({ zoneId, disabled }), [zoneId, disabled])
  return (
    <ZoneIdCtx.Provider value={zone}>
      {id == null ? (
        children
      ) : (
        <div
          ref={(el) => engine.registerContainer(zoneId, el)}
          className={className}
          data-drag-active={engine.dropState !== 'idle' || undefined}
        >
          {children}
        </div>
      )}
    </ZoneIdCtx.Provider>
  )
}

export function useDropSlot(): Box | null {
  const engine = useContext(EngineCtx)
  return engine && engine.dropState === 'dragging' ? engine.dropBox() : null
}

export function useZoneItem(id: string): DragItem {
  const engine = useContext(EngineCtx)
  const zone = useContext(ZoneIdCtx)
  if (!engine || zone === null) throw new Error('useDragItem must be used inside a <SortableZone>')
  const { zoneId, disabled } = zone
  const { transform, hidden, animate } = engine.itemState(zoneId, id)
  const isDragging = engine.activeId === id
  return {
    setNodeRef: (el) => engine.registerItem(zoneId, id, el),
    style: {
      transform,
      // At rest the inline transition clears entirely: an inline value (even 'none') replaces the element's whole stylesheet transition list and kills its own color/size motion. Safe because the zone contract forbids an item's stylesheet from transitioning `transform`.
      transition: animate
        ? `transform ${DEFAULT_FEEL.duration}ms ${DEFAULT_FEEL.easing}`
        : undefined,
      visibility: hidden ? 'hidden' : undefined,
      // The lifted item must not answer the disclose hit-test it is riding over.
      pointerEvents: isDragging && !hidden && engine.dropState === 'dragging' ? 'none' : undefined,
      zIndex: isDragging ? stack.local.lifted : undefined,
      position: 'relative',
      touchAction: 'none',
    },
    handle: {
      onPointerDown: (e: ReactPointerEvent) => engine.begin(zoneId, id, e),
      onKeyDown: (e: ReactKeyboardEvent) => {
        // A focusable descendant's Space or Enter is its own, never a lift.
        if (e.target !== e.currentTarget) return
        if ((e.key === ' ' || e.key === 'Enter') && !isDragging && !disabled) {
          e.preventDefault()
          engine.liftKeyboard(zoneId, id, e.nativeEvent)
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
