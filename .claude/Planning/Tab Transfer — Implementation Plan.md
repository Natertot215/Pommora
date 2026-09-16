## Tab Transfer — Implementation Plan

### Context

The main tab bar (`Core/Navigation/TabBar.tsx`) and the floating window's tab strip (`Core/Interface/Windows/WindowTabStrip.tsx`) each reorder on their own private instance of the drag engine (`UIX/Interactions/engine.tsx`), so nothing can move between them, and the NavWindow/NavView gallery (`Core/Navigation/NavGallery.tsx`) and list (`Core/Navigation/NavList.tsx`) only reorder within themselves. This plan teaches the engine to hand an item across zones of one family, mounts one group over the shell, and wires the two tab rows as targets and the nav surfaces and the sidebar's page rows as sources. It touches the engine and its tests, the drop chrome, the two tab strips and their windows, the two session slices that own tabs, the tab models, the nav gallery and list, the table-row drag frame, and the three Features documents that describe them. It leaves the Cards view's behavior as it is (it migrates to the family gate with no change in feel), the sidebar, the ribbon, and the table view untouched in behavior, and drag-to-pin and popping a tab into its own OS window as prospects.

### Summary

A page tab can be pulled out of its row with a deliberate vertical tug, floated across to the other row (main bar or floating window), and dropped at a precise spot; the tabs there part to make room and the accent slot shows where it lands. A card or list row in the NavWindow or NavView, or a page row in the sidebar, can be dragged the same way into either row to open that page as a new tab right there, while leaving its own list alone. Dragging within a row still reorders as before, and letting go over nothing snaps the item home.

#### Constraints

- Gates, from the repo root: `npm run typecheck` · `npm run test` · `npm run lint` — each exits 0; read each tail with `set -o pipefail`. Biome formats on write (single quotes, no semicolons); an Edit failing on whitespace means re-read and retry. Comments are `//` line comments, only where a boundary needs stating; `biome.json` has `useExhaustiveDependencies` off.
- Settled rulings (never re-litigate): page tabs only leave a row; the New Tab scratch tab, collections, spaces, and the homepage tab never leave; the pinned zone is not a target; the source row holds its gap while the tab hovers the other row; over nothing snaps back; breakout is 24px; the accent slot paints for cross-row landings only; a dropped page already open in the main bar focuses that tab and moves it to the drop index, a pinned one only focuses; a card or row drop opens beside the scratch tab and records no recent; the list keeps its insertion line for in-list reorder and displaces the tab row once it reaches one; search-result cards drag out; tables keep today's behavior byte-for-byte; sidebar page rows drag into the tab rows and nothing drags into the sidebar.
- The engine never depends on Core; Core reaches it only through `@pommora/uix/Interactions/drag`. The Cards view's `DragGroup` stays nested and both `cardDrops.test.tsx` assertions keep passing.
- A drag whose zone has no `family`, or whose `carry` declines, behaves exactly as today: axis-locked, in-zone, stuck to its zone. Axis zones (tab rows, ViewTile pills, the ribbon) now place by running offset, so unequal-width items part by exactly the lifted item's width — a visible correction, not a regression.
- Never delete: `TableRowDnd`'s existing props (`rows`, `disabled`, `canReorderWithin`, `crossZone`, `onDrop`); `TableView` passes nothing new.

#### Baseline

- Gates: green at `dd605692d`.
- `grep -c "  it(" UIX/Interactions/engine.test.tsx` → 19 — adds 16
- `grep -c "  it(" Core/Navigation/tabsModel.test.ts` → 40 — adds 3
- `grep -c "  it(" Core/Interface/Windows/windowTabs.test.ts` → 19 — adds 2
- `grep -rn "crossZone" UIX/Interactions/engine.tsx UIX/Interactions/engine.test.tsx Core/Views/Cards | wc -l` → 8 — retires to 0 (`TableRowDnd`'s prop of the same name stays)
- `grep -rn "CardDropSlot\|dropPreview" UIX Core | wc -l` → 9 — retires to 0

**START:** 2026-09-16T01:56:44Z
**END:** <same, as the report is given>

#### Implementation Process

- [x] **Phase 1** — The engine hands items across a family `[Parallel with Phase 2]`
  - [x] Task 1.1 — Shared tokens and the engine
  - [x] Task 1.2 — DropSlot, the z ladder, Cards on the family gate
  - [x] Task 1.3 — The row escort in the insertion lifecycle
  - [x] Task 1.4 — Engine tests
  - [ ] Review Checkpoint
- [x] **Phase 2** — Open at an index `[Parallel with Phase 1]`
  - [x] Task 2.1 — `openTabAt`
  - [x] Task 2.2 — `openTabIn` at an index
- [x] **Phase 3** — The rows become targets
  - [x] Task 3.1 — The carried type and the shell group
  - [x] Task 3.2 — The main bar's strip
  - [x] Task 3.3 — The window strip and the NavWindow
  - [ ] Review Checkpoint
- [ ] **Phase 4** — The nav surfaces become sources
  - [ ] Task 4.1 — Gallery cards, including search results
  - [ ] Task 4.2 — List rows through the escort
  - [ ] Task 4.3 — Sidebar page rows through the escort
  - [ ] Task 4.4 — Documents
- [ ] `[Stop: Nathan walks the manual checks]`

---

### Phase 1 — The Engine Hands Items Across a Family

**GOAL:** One engine change set inside `UIX/Interactions` that lets a zone's item leave for another zone of the same family, with breakout, snap-back, hold-gap, per-zone overlay, running-offset placement, and an escort for the insertion lifecycle. Everything is gated on `family`, so existing zones keep their behavior. One phase because every task edits `engine.tsx` or its test.

#### Task 1.1

**TASK:** Add the shared tokens and rewrite the engine.

**FILES:** `UIX/Interactions/shared.ts`, `UIX/Interactions/dragDisclose.ts`, `UIX/Interactions/engine.tsx`

**DEPENDENCIES:** Task 1.2 removes the last `crossZone` caller and shares this commit (typecheck is red between them).

**NOW** — `shared.ts` ends at `px`; `engine.tsx` is the file as it reads today (single `EngineCtx`, `crossZone`, `overlayOn`, `activeId`, grid-only placement).

**CHANGE**

- [ ] `shared.ts`: after `HYSTERESIS`, add:

```ts
export const BREAKOUT = 24 // px past an axis-locked zone's edges before its item is loose; a free zone lets go at its edge
/** What an item carries into another zone; the two zones agree on its shape. */
export type Carried = unknown
```

- [ ] `dragDisclose.ts`: the module-private `scheduleRemeasure` becomes `export function nudgeDragRemeasure(): void` (same body; its one internal call site renamed). A container that mounts mid-drag calls it so an escorted list retakes its rows and an engine drag resyncs.
- [ ] Replace `engine.tsx` with the following.

**AFTER**

```tsx
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
  /** Zones of one family hand items to each other; a zone with no family keeps its items. A zone is a target only when it owns a container. */
  family?: string
  /** A fixed zone's items may leave, but its own order never previews a move. */
  fixed: boolean
  /** What an item carries out; null keeps that item home. Absent, the item carries its id. */
  carry?: (id: string) => Carried | null
  receive?: (item: Carried, index: number) => void
  /** The source lets go of an item another zone has received. */
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
  /** The first item's corner, or the origin when the zone is empty: where an axis zone's run begins. */
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
  // What resolveIndex allows, or null where the pick is refused or there is none — either previews and lands back in the lifted slot.
  mapped: number | null
  family: string | null
  item: Carried | null
  /** Past the breakout: the axis lock is off and the family's zones are in play. */
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

// The gesture's travel; the zone's axis lock holds until the item is loose.
const travel = (d: DragScratch, x: number, y: number): Point => ({
  x: d.axis === 'y' && !d.loose ? 0 : x - d.startX,
  y: d.axis === 'x' && !d.loose ? 0 : y - d.startY,
})

// Where the gesture would land right now: a refused or absent pick lands back in the lifted slot.
const landingOf = (d: DragScratch): [string, number] =>
  d.mapped === null ? [d.zoneId, d.activeIdx] : [d.pickZone, d.mapped]

const within = (r: Rect, x: number, y: number, pad: number): boolean =>
  x >= r.left - pad && x <= r.left + r.width + pad && y >= r.top - pad && y <= r.top + r.height + pad

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

// A grid zone's cells past the last card are walked by its columns; a linear extrapolation would wrap a half-full row.
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

/** The post-move order: the zone's items minus the active one, which is spliced back in at `over`. `-1` stands for an active item belonging to another zone. */
function orderOf(count: number, activeIdx: number, over: number): number[] {
  const order: number[] = []
  for (let i = 0; i < count; i++) if (i !== activeIdx) order.push(i)
  if (over >= 0) order.splice(clamp(over, 0, order.length), 0, activeIdx)
  return order
}

/** The grid cell an item lands in. */
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

/** An axis zone's cells run by offset: each item sits after the sizes of those before it, so unequal widths part by exactly the size of the item coming in. */
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

/** `home` is the escort's own surface: the item is loose once the pointer leaves it. */
export type EscortSpec = { id: string; family: string; item: Carried; rect: Box; home: Box }
/** A lift for a surface that already owns the pointer: it feeds the engine its point and takes the landing back. */
export type Escort = {
  lift: (spec: EscortSpec) => boolean
  move: (x: number, y: number) => void
  drop: () => boolean
  abort: () => void
  /** Past its own surface's edge — the caller's cue to stop scrolling that surface. */
  loose: () => boolean
}

// Registration and lifts never change; the landing does, and only its readers re-render on it.
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
  /** The loose item's family — a target that exists only for one mounts on this. */
  family: string | null
  /** The lifted item's height in a container's own px while a drag is in flight: the floor an empty zone grows to hold it. */
  floor: number | null
  itemState: (zoneId: string, id: string) => ItemState
  dropBox: (foreignOnly: boolean, inZone?: string) => Box | null
}
const ApiCtx = createContext<EngineApi | null>(null)
const StateCtx = createContext<EngineState | null>(null)
const ZoneIdCtx = createContext<{ zoneId: string; disabled: boolean } | null>(null)

type DragGroupProps = {
  onCommit?: (activeId: string, toZone: string, toIndex: number, fromZone: string) => void
  /** What a loose item does over no zone at all: keep its last zone, or return to its lifted slot. */
  stray?: 'stick' | 'return'
  /** The source zone keeps the lifted item's slot open while the landing is elsewhere. */
  holdGap?: boolean
  /** Null refuses the landing. Must be idempotent: an index it returned maps to itself. */
  resolveIndex?: (zoneId: string, index: number, activeId: string) => number | null
  /** A clipping body places by transform, so only a body portal escapes it; a zone's own overlay wins over this one. */
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
  // A container that mounts because a drag is in flight measures at once, and the drag's own remeasure runs so an escorted list retakes the rows it shifted.
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
  // The topmost hit wins: a zone registered later (a floating window's strip) sits over one registered earlier.
  const zoneAt = (x: number, y: number, admit: (zid: string) => boolean): string | null => {
    let hit: string | null = null
    for (const [zid, b] of bounds.current) if (admit(zid) && within(b, x, y, 0)) hit = zid
    return hit
  }
  // The source's own edges, read live where it owns a container.
  const homeOf = (d: DragScratch): Rect | null => bounds.current.get(d.zoneId) ?? d.home
  // An axis row is left by a tug across it — the breakout on the cross axis alone, so overshooting its ends still lands at them; a free zone is left at its edge.
  const atHome = (d: DragScratch, x: number, y: number): boolean => {
    const home = homeOf(d)
    if (!home) return false
    if (d.axis === 'x') return y >= home.top - BREAKOUT && y <= home.top + home.height + BREAKOUT
    if (d.axis === 'y') return x >= home.left - BREAKOUT && x <= home.left + home.width + BREAKOUT
    return within(home, x, y, 0)
  }
  // The zone in play for a loose item: a foreign pick holds through the hysteresis band on its edge, the family's targets are hit-tested, the source counts within its own edges (plus the breakout on an axis-locked row), and past all of those the group's stray rule decides.
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
    // An escort has no zone of its own to come home to.
    if (atHome(d, x, y)) return d.zoneId || null
    return strayRef.current === 'stick' ? d.pickZone : null
  }
  // A foreign item takes the shape of the zone it enters: its last item's, or the container's cross size when the zone is empty.
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
      // A surface must not scroll itself under an item that has left it; a sticking group (Cards) keeps scrolling for the band below the fold.
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
    // A foreign zone's candidates are its rects plus one trailing cell, so an item can land past the last one.
    const count = f.rects.length + (own ? 0 : 1)
    const last = f.rects[f.rects.length - 1]
    const distTo = (i: number): number => {
      const b = f.rects[i]
      if (b) return Math.hypot(b.cx - projX, b.cy - projY)
      const toTail = Math.hypot(f.tail.x + half.x - projX, f.tail.y + half.y - projY)
      // A grid's tail wraps to a new row when the last row is full, so past the last card's edge on its own row counts as after it too.
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

  /** The one landing: settling back into the lifted slot commits nothing. Everything the commit needs is taken now — a zone can unmount, and a new lift can replace the scratch, before the glide ends. */
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

  // The escort's item has nothing of its own on screen: no element to move, no glide to wait on, so a landing commits at once.
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

  // The slot takes the shape of what will sit there: a grid cell's, an axis zone's own item shape for a foreign arrival, the lifted item's for its own row.
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
  /** An addressable zone owns an element, so an empty band is still a drop target and a family's target. */
  id?: string
  items: string[]
  onReorder?: (activeId: string, overId: string) => void
  disabled?: boolean
  axis?: Axis
  getItemLabel?: (id: string) => string
  family?: string
  fixed?: boolean
  carry?: (id: string) => Carried | null
  receive?: (item: Carried, index: number) => void
  release?: (id: string) => void
  renderOverlay?: Overlay
  className?: string
  children: ReactNode
}

export function SortableZone(props: SortableZoneProps): React.JSX.Element {
  const api = useContext(ApiCtx)
  // A surface outside any group carries its own, so a single-zone host mounts a zone and nothing else.
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

/** The box the lifted item would land in. Inside a zone, only that zone's landings; outside one, any zone's. */
export function useDropSlot(foreignOnly = false): Box | null {
  const s = useContext(StateCtx)
  const zone = useContext(ZoneIdCtx)
  return s && s.dropState === 'dragging' ? s.dropBox(foreignOnly, zone?.zoneId) : null
}

/** The landing slot painted while an item is in flight; `foreignOnly` leaves a zone's own reorder unmarked. */
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

/** The family of the loose item in flight, for a target that only exists while one is. */
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
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes; every family branch is behind `d.family !== null` or `d.loose`.
- [ ] `grep -n "crossZone\|overlayOn" UIX/Interactions/engine.tsx` → 0.
- [ ] Gates green once Task 1.2 lands.

#### Task 1.2

**TASK:** One slot painter in the engine with a cross-zone-only mode and zone scoping, the drag chrome above floating windows, and Cards on the family gate.

**FILES:** `UIX/Interactions/drag.tsx`, `UIX/Cards/Card.tsx`, `UIX/Theme/stack.ts`, `Core/Views/Cards/CardsView.tsx`, `Core/Navigation/NavGallery.tsx`

**DEPENDENCIES:** Shares Task 1.1's commit.

**NOW**

```ts
// stack.ts
  top: {
    dropPreview: 999,
    floating: 1000,
    menu: 1100,
    caret: 2147483647,
  },
// drag.tsx
import './drop-chrome.css'
import type { DragItem } from './shared'
import { moveItem } from '../Utilities/moveItem'

export type { DragItem }
export { DragGroup, SortableZone, useDragItem, useDropSlot } from './engine'
// Card.tsx lines 2, 6, 7 import createPortal, useDropSlot, stack; lines 91–109 define CardDropSlot
// CardsView.tsx: `CardDropSlot,` in the Card import; `<CardDropSlot />` at the set-cards zone and inside the DragGroup; `crossZone={canReassign || canRelocate}` on the DragGroup; the band zone `<SortableZone id={g.key} items=… getItemLabel=… className="cards-grid card-grid is-fill">`
// NavGallery.tsx: `CardDropSlot,` in the Card import; `<CardDropSlot />` in both zones
```

**CHANGE**

- [ ] `stack.ts` `top`: replace `dropPreview: 999,` with the two entries below (the overlay above the slot, both above a floating window, both under a menu).
- [ ] `drag.tsx`: replace the file with the block below.
- [ ] `Card.tsx`: delete the `createPortal` and `stack` imports, change line 6 to `import type { DragItem } from '../Interactions/drag'`, delete `CardDropSlot` and its docblock.
- [ ] `CardsView.tsx`: replace `CardDropSlot` with `DropSlot` in the import (moved to the `drag` import) and at both sites; delete the `crossZone` prop; the band zone gains `family={canReassign || canRelocate ? 'cards' : undefined}`. The set-cards slot sits inside its zone, so it paints that zone's landings only, whichever group the zone joins.
- [ ] `NavGallery.tsx`: the same import move; both `<CardDropSlot />` become `<DropSlot />` and stay — inside their zones they paint the gallery's own reorder as today.

**AFTER**

```ts
// stack.ts
  top: {
    floating: 1000,
    dragSlot: 1010,
    dragOverlay: 1020,
    menu: 1100,
    caret: 2147483647,
  },
```

```tsx
// drag.tsx
import './drop-chrome.css'
import { moveItem } from '../Utilities/moveItem'

export type { Carried, DragItem } from './shared'
export {
  DragGroup,
  DropSlot,
  SortableZone,
  useDragFamily,
  useDragItem,
  useDropSlot,
  useEscort,
  type Escort,
  type EscortSpec,
} from './engine'

export function reorder<T extends { id: string }>(
  items: T[],
  activeId: string,
  overId: string,
): T[] {
  const from = items.findIndex((i) => i.id === activeId)
  const to = items.findIndex((i) => i.id === overId)
  if (from === -1 || to === -1 || from === to) return items
  return moveItem(items, from, to)
}
```

```tsx
// CardsView.tsx, the DragGroup and the band zone
        <DragGroup
          onCommit={onCardDrop}
          resolveIndex={interactions.structuralSlot}
          renderOverlay={(id, rect) => { /* unchanged */ }}
        >
          <DropSlot />
          …
                  <SortableZone
                    id={g.key}
                    family={canReassign || canRelocate ? 'cards' : undefined}
                    items={g.items.map((r) => r.id)}
                    getItemLabel={(id) => rowById.get(id)?.title ?? 'card'}
                    className="cards-grid card-grid is-fill"
                  >
```

**VERIFY**

- [ ] Gates green; `cardDrops.test.tsx` passes both assertions.
- [ ] `grep -rn "CardDropSlot\|dropPreview" UIX Core` → 0; `grep -rn "crossZone" UIX/Interactions/engine.tsx Core/Views/Cards` → 0; `grep -c "<DropSlot" Core/Navigation/NavGallery.tsx` → 2.

#### Task 1.3

**TASK:** The insertion lifecycle can hand its row to the engine's escort and show a richer ghost.

**FILES:** `UIX/Interactions/insertionDrag.tsx`

**NOW**

```ts
interface InsertionDragSpec<Slot, Snap> {
  take; resolve; commit; lineFor?; lineClassName?
  label: (id: string) => string
  ghost?: 'offset' | 'grab' | 'none'
  rowEl; scrollTarget; armFrom?; alsoBlock?; disabled?; disclose?; capture?; swallowActiveEscape?; watch
}
// begin(): onActivate sets dragged/lastPoint, announces, arms autoscroll, resolves; onDragMove resolves; onDrop commits the slot; onAbort resets
// return: ghost: <DragGhost x y label={dragged.current?.label ?? ''} />
```

**CHANGE**

- [ ] Add the three spec fields; thread the escort through activate, move, drop, and abort (each engine method guards its own inactivity, so no flag is kept here); let the ghost take `ghostLabel`.

**AFTER**

```tsx
import { EDITABLE_TARGETS, GHOST_OFFSET, toBox, type Box } from './shared'
import type { Escort, EscortSpec } from './engine'

interface InsertionDragSpec<Slot, Snap> {
  /** Taken at activation, retaken lazily after an invalidation. Null fails the resolve closed. */
  take: (id: string) => Snap | null
  resolve: (id: string, point: { x: number; y: number }, snap: Snap) => Slot | null
  commit: (id: string, slot: Slot, snap: Snap) => void
  lineFor?: (slot: Slot, snap: Snap) => CSSProperties | null
  lineClassName?: string
  label: (id: string) => string
  /** What the ghost shows; `label` stays the spoken name. */
  ghostLabel?: (id: string) => ReactNode
  ghost?: 'offset' | 'grab' | 'none'
  /** A second surface the row may land in, reached without a second gesture; `escortSpec` says what a row carries, null keeping it home. */
  escort?: Escort | null
  escortSpec?: (id: string, rect: Box) => EscortSpec | null
  rowEl: (id: string) => HTMLElement | null | undefined
  scrollTarget: () => Element | null
  armFrom?: () => HTMLElement | null
  alsoBlock?: string
  disabled?: () => boolean
  disclose?: boolean
  capture?: boolean
  swallowActiveEscape?: boolean
  watch: unknown
}
```

```tsx
    beginGesture({
      el,
      event: e,
      capture: cfg.capture,
      swallowActiveEscape: cfg.swallowActiveEscape,
      onActivate: (ev) => {
        dragged.current = { id, grabX, label: cfg.label(id) }
        lastPoint.current = { x: ev.clientX, y: ev.clientY }
        announce(`Picked up ${dragged.current.label}.`)
        // No re-resolve callback: the loop's scrollBy raises the window scroll `onWindowScroll` already answers.
        stopScroll.current = armAutoScroll(cfg.armFrom?.() ?? el, () => lastPoint.current)
        const spec = cfg.escortSpec?.(id, toBox(el))
        if (spec) cfg.escort?.lift(spec)
        resolveSlot()
        return true
      },
      onDragMove: (ev) => {
        lastPoint.current = { x: ev.clientX, y: ev.clientY }
        const escort = specRef.current.escort
        escort?.move(ev.clientX, ev.clientY)
        // A list must not scroll itself under a row that has left it.
        if (escort?.loose()) {
          stopScroll.current?.()
          stopScroll.current = null
        }
        resolveSlot()
      },
      scrollTarget: cfg.scrollTarget,
      onWindowScroll: invalidate,
      onDrop: () => {
        // The escort answers first: a landing in its zone is the whole drop.
        if (specRef.current.escort?.drop()) {
          reset()
          return
        }
        if (snap.isDirty()) resolveSlot()
        const d = dragged.current
        const slot = live.current
        const s = snap.get()
        if (d && slot !== null && s !== null) {
          specRef.current.commit(d.id, slot, s)
          announce(`Moved ${d.label}.`)
        }
        reset()
      },
      onAbort: () => {
        specRef.current.escort?.abort()
        reset()
      },
      teardown: () => {
        stopScroll.current?.()
        stopScroll.current = null
      },
      // Staying dirty through the reveal animation — the sprung-open rows keep shifting.
      onDisclose: cfg.disclose
        ? () => {
            invalidate()
            snap.markDirty()
          }
        : undefined,
    })
```

```tsx
    ghost:
      drag?.ghost != null && dragged.current ? (
        <DragGhost
          x={drag.ghost.x}
          y={drag.ghost.y}
          label={specRef.current.ghostLabel?.(dragged.current.id) ?? dragged.current.label}
        />
      ) : null,
```

**VERIFY**

- [ ] Gates green; `tableDnd.test.tsx` and the sidebar tests unchanged and passing.

#### Task 1.4

**TASK:** Engine tests for every new behavior.

**FILES:** `UIX/Interactions/engine.test.tsx`

**NOW** — `Board` passes `crossZone` and zones have no family; the `Slot` probe reads top/width/height; 19 cases.

**CHANGE**

- [ ] Rewrite the harness head and append the cases below. The existing 19 cases stay verbatim.

**AFTER**

```tsx
import {
  DragGroup,
  placeAxis,
  placeCell,
  SortableZone,
  useDragFamily,
  useDragItem,
  useDropSlot,
  useEscort,
  type Escort,
} from './engine'
import { firePointer, pressEscape, stubPointerCapture, stubRect } from './pointerHarness'
import { DEFAULT_FEEL } from '../Animations/feel'
import { type Box, SETTLE_FALLBACK } from './shared'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
stubPointerCapture()

// An empty zone above two banded zones of 200px, an empty one below them, a wide one, a family-less one, and a 3-tab row of 200/120/120 at y 1000; each card a 100px row.
const ZONES: Record<string, string[]> = {
  E: [],
  A: ['a1', 'a2'],
  B: ['b1'],
  C: [],
  D: ['d1'],
  F: ['f1'],
  X: ['x1', 'x2', 'x3'],
}
const BAND: Record<string, number> = { E: -200, A: 0, B: 200, C: 400, D: 600, F: 800, X: 1000 }
const TAB_W = [200, 120, 120]

let commitSpy: ReturnType<typeof vi.fn<(activeId: string, zone: string, index: number) => void>>
let fromSpy: ReturnType<typeof vi.fn<(from: string) => void>>
let reorderSpy: ReturnType<typeof vi.fn<(activeId: string, overId: string) => void>>
let receiveSpy: ReturnType<typeof vi.fn<(item: unknown, index: number) => void>>
let resolve: (zoneId: string, index: number, activeId: string) => number | null
let withOverlay = false
let zoneOverlay = false
let stray: 'stick' | 'return' = 'stick'
let holdGap = false
let carryA: ((id: string) => unknown) | undefined
let hidden = new Set<string>()
let escortRef: Escort | null = null

function Item({ id }: { id: string }): React.JSX.Element {
  const { setNodeRef, style, handle } = useDragItem(id)
  return <div ref={setNodeRef} data-id={id} style={style} {...handle} />
}

function Slot(): React.JSX.Element | null {
  const slot = useDropSlot()
  return slot ? (
    <i data-slot style={{ top: slot.top, left: slot.left, width: slot.width, height: slot.height }} />
  ) : null
}

function Probe(): React.JSX.Element {
  escortRef = useEscort()
  return <b data-family={useDragFamily() ?? ''} />
}

function Board(): React.JSX.Element {
  return (
    <DragGroup
      stray={stray}
      holdGap={holdGap}
      onCommit={(activeId, zone, index, from) => {
        commitSpy(activeId, zone, index)
        fromSpy(from)
      }}
      resolveIndex={(zone, index, activeId) => resolve(zone, index, activeId)}
      renderOverlay={withOverlay ? (activeId) => <span data-overlay={activeId} /> : undefined}
    >
      {Object.entries(ZONES)
        .filter(([zid]) => !hidden.has(zid))
        .map(([zid, ids]) => (
          <SortableZone
            key={zid}
            id={zid}
            items={ids}
            className={`zone-${zid}`}
            family={zid === 'F' ? undefined : 'board'}
            axis={zid === 'X' ? 'x' : undefined}
            carry={zid === 'A' ? carryA : undefined}
            receive={zid === 'B' ? (item, index) => receiveSpy(item, index) : undefined}
            renderOverlay={
              zoneOverlay && zid === 'A' ? (id) => <span data-zone-overlay={id} /> : undefined
            }
            onReorder={(activeId, overId) => reorderSpy(activeId, overId)}
          >
            {ids.map((id) => (
              <Item key={id} id={id} />
            ))}
          </SortableZone>
        ))}
      <Slot />
      <Probe />
    </DragGroup>
  )
}

let host: HTMLDivElement
let root: Root

beforeEach(async () => {
  commitSpy = vi.fn()
  fromSpy = vi.fn()
  reorderSpy = vi.fn()
  receiveSpy = vi.fn()
  resolve = (_zone, index) => index
  withOverlay = false
  zoneOverlay = false
  stray = 'stick'
  holdGap = false
  carryA = undefined
  hidden = new Set()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await mount()
})

const mount = async (): Promise<void> => {
  await act(async () => root.render(<Board />))
  for (const [zid, ids] of Object.entries(ZONES)) {
    if (hidden.has(zid)) continue
    const top = BAND[zid]
    const wide = zid === 'D' || zid === 'X'
    stubRect(host.querySelector(`.zone-${zid}`) as Element, {
      top,
      bottom: top + (zid === 'X' ? 100 : 200),
      right: wide ? 1000 : 200,
    })
    ids.forEach((id, i) => {
      const el = host.querySelector(`.zone-${zid} [data-id="${id}"]`) as Element
      if (zid === 'X') {
        const left = TAB_W.slice(0, i).reduce((a, b) => a + b, 0)
        stubRect(el, { top, bottom: top + 100, left, right: left + TAB_W[i] })
      } else stubRect(el, { top: top + i * 100, bottom: top + i * 100 + 100, left: 0, right: 200 })
    })
  }
}
```

```tsx
describe('the drag engine across a family', () => {
  it('keeps an item home when its zone has no family', async () => {
    await dropAt('f1', 100, 210)
    expect(commitSpy).not.toHaveBeenCalled()
    expect(receiveSpy).not.toHaveBeenCalled()
  })

  it('keeps an item home when carry declines it', async () => {
    carryA = () => null
    await mount()
    await dropAt('a1', 100, 210)
    expect(receiveSpy).not.toHaveBeenCalled()
    expect(commitSpy).toHaveBeenCalledExactlyOnceWith('a1', 'A', 1)
  })

  it('returns to its slot when released over nothing', async () => {
    stray = 'return'
    await mount()
    await dropAt('a1', 300, 250)
    expect(commitSpy).not.toHaveBeenCalled()
    expect(reorderSpy).not.toHaveBeenCalled()
  })

  it('holds the source gap open while the landing is foreign', async () => {
    holdGap = true
    await mount()
    await dragTo('a1', 100, 210)
    expect(item('a2').style.transform).toBe('translate3d(0.0px, 0.0px, 0)')
    await settle()
  })

  it('closes the source gap without holdGap', async () => {
    await dragTo('a1', 100, 210)
    expect(item('a2').style.transform).toBe('translate3d(0.0px, -100.0px, 0)')
    await settle()
  })

  it('hands the carried item to the zone it lands in', async () => {
    carryA = (id) => ({ id, from: 'A' })
    await mount()
    await dropAt('a1', 100, 210)
    expect(receiveSpy).toHaveBeenCalledExactlyOnceWith({ id: 'a1', from: 'A' }, 0)
    expect(commitSpy).toHaveBeenCalledExactlyOnceWith('a1', 'B', 0)
    expect(fromSpy).toHaveBeenCalledExactlyOnceWith('A')
  })

  it('still receives when the landing zone unmounts during the drop animation', async () => {
    await dragTo('a1', 100, 210)
    hidden = new Set(['B'])
    await act(async () => root.render(<Board />))
    await settle()
    expect(receiveSpy).toHaveBeenCalledExactlyOnceWith('a1', 0)
  })

  it('marks only the lifted zone item as dragging when two zones share an id', async () => {
    ZONES.D = ['d1', 'a1']
    await mount()
    const twins = host.querySelectorAll('[data-id="a1"]')
    const r = twins[0].getBoundingClientRect()
    await act(async () => {
      firePointer(twins[0], 'pointerdown', { x: r.left + r.width / 2, y: r.top + r.height / 2 })
    })
    await act(async () => {
      firePointer(window, 'pointermove', { x: 100, y: 150 })
    })
    expect(twins[0].getAttribute('aria-pressed')).toBe('true')
    expect(twins[1].getAttribute('aria-pressed')).toBeNull()
    pressEscape()
    ZONES.D = ['d1']
  })

  it('reports the family once the item is loose and nothing after', async () => {
    await dragTo('a1', 100, 150)
    expect(host.querySelector('[data-family]')?.getAttribute('data-family')).toBe('')
    await settle()
    await dragTo('a1', 100, 210)
    expect(host.querySelector('[data-family]')?.getAttribute('data-family')).toBe('board')
    await settle()
    expect(host.querySelector('[data-family]')?.getAttribute('data-family')).toBe('')
  })

  it('uses the zone overlay over the group overlay', async () => {
    withOverlay = true
    zoneOverlay = true
    await mount()
    await dragTo('a1', 100, 130)
    expect(document.querySelector('[data-zone-overlay="a1"]')).not.toBeNull()
    expect(document.querySelector('[data-overlay="a1"]')).toBeNull()
    await settle()
  })

  it('parts an axis row by the width of the item coming in', async () => {
    await dragTo('x1', 260, 1050)
    expect(item('x2').style.transform).toBe('translate3d(-200.0px, 0.0px, 0)')
    const slot = host.querySelector('[data-slot]') as HTMLElement
    expect(slot.style.left).toBe('120px')
    await settle()
  })

  it('keeps an axis row item in its row when it overshoots the row end', async () => {
    stray = 'return'
    await mount()
    await dropAt('x1', 900, 1050)
    expect(reorderSpy).toHaveBeenCalledExactlyOnceWith('x1', 'x3')
    expect(commitSpy).toHaveBeenCalledExactlyOnceWith('x1', 'X', 2)
  })

  it('lands a foreign item past the last item of an axis row at the row own size', async () => {
    await dragTo('a1', 500, 1050)
    const slot = host.querySelector('[data-slot]') as HTMLElement
    expect(slot.style.left).toBe('440px')
    expect(slot.style.width).toBe('120px')
    await settle()
    expect(commitSpy).toHaveBeenCalledExactlyOnceWith('a1', 'X', 3)
  })

  it('escorts a foreign row into a zone and lands nowhere outside every zone', async () => {
    const rect: Box = { left: 0, top: -1000, width: 200, height: 24, cx: 100, cy: -988 }
    const spec = { id: 'row', family: 'board', item: { id: 'row' }, rect, home: rect }
    await act(async () => {
      escortRef?.lift(spec)
    })
    await act(async () => escortRef?.move(100, 210))
    expect(escortRef?.loose()).toBe(true)
    let landed = false
    await act(async () => {
      landed = escortRef?.drop() ?? false
    })
    expect(landed).toBe(true)
    expect(receiveSpy).toHaveBeenCalledExactlyOnceWith({ id: 'row' }, 0)
    await act(async () => {
      escortRef?.lift(spec)
    })
    await act(async () => escortRef?.move(100, 210))
    await act(async () => escortRef?.move(100, -990))
    await act(async () => {
      landed = escortRef?.drop() ?? false
    })
    expect(landed).toBe(false)
    expect(receiveSpy).toHaveBeenCalledOnce()
    stray = 'return'
    await mount()
    await act(async () => {
      escortRef?.lift(spec)
    })
    await act(async () => escortRef?.move(300, 250))
    await act(async () => {
      landed = escortRef?.drop() ?? false
    })
    expect(landed).toBe(false)
  })
})

describe('placeAxis — the running-offset core', () => {
  const row: Box[] = [
    { left: 0, top: 0, width: 200, height: 30, cx: 100, cy: 15 },
    { left: 200, top: 0, width: 120, height: 30, cx: 260, cy: 15 },
    { left: 320, top: 0, width: 120, height: 30, cx: 380, cy: 15 },
  ]
  it('moves the passed-over item back by the lifted width', () => {
    expect(placeAxis(row, 'x', 0, { x: 0, y: 0 }, 0, 1, 1, 200)).toEqual({ x: 0, y: 0 })
    expect(placeAxis(row, 'x', 0, { x: 0, y: 0 }, 0, 1, 0, 200)).toEqual({ x: 120, y: 0 })
  })
  it('opens a slot the size of a foreign item', () => {
    expect(placeAxis(row, 'x', 4, { x: 0, y: 0 }, -1, 1, 1, 80)).toEqual({ x: 288, y: 0 })
    expect(placeAxis(row, 'x', 4, { x: 0, y: 0 }, -1, 1, -1, 80)).toEqual({ x: 204, y: 0 })
  })
})
```

**VERIFY**

- [ ] `npm run test -- UIX/Interactions/engine.test.tsx` → 35 passing (19 + 14 + 2); the existing 19 keep their three-argument commit assertions because `Board` splits the fourth into `fromSpy`.
- [ ] Each new case goes red when its engine change is reverted (spot-check `holdGap` and `stray`).

#### Review Checkpoint

- [x] `npm run test -- UIX/Interactions` green with the counts above.
- [x] Nathan: Cards view reorder and cross-band moves, a ribbon icon reorder, a ViewTile pill reorder, main-bar and window tab reorders all feel as before.

---

### Phase 2 — Open at an Index

**GOAL:** The two tab owners can open a page at a chosen position. Pure model functions with tests, then the slice actions that apply them. Disjoint from Phase 1's files.

#### Task 2.1

**TASK:** `openTabAt` in the tab model and its slice action.

**FILES:** `Core/Navigation/tabsModel.ts`, `Core/Navigation/tabsModel.test.ts`, `Core/Session/navigationSlice.ts`

**NOW**

```ts
export function openNewTab(tabs: Tab[], newId: string): OpenResult { … }
// navigationSlice.ts interface: openNewTab: () => void  … reorderTabs: (activeId: string, overId: string) => void
// import list names openTab as openTabModel, openNewTab as openNewTabModel
```

**CHANGE**

- [ ] `tabsModel.ts`: hoist the "same entity" predicate that `isOpenInTabs` and `openTab` each spell out, and use it in both plus the new function:

```ts
/** The tabs showing one entity; the scratch tab matches nothing. */
const showing =
  (target: SelectTarget | NavRef) =>
  (t: Tab): boolean =>
    t.target.kind !== 'newtab' && navKey(t.target) === navKey(target)
```

`isOpenInTabs`: `tabs.some(showing(target)) || pinned.some((p) => navKey(p) === navKey(target))`. `openTab`: `const existing = all.find(showing(target))` (its `key` local goes).

- [ ] After `openNewTab`:

```ts
/** A drop lands a page at `index` among the unpinned tabs: an open tab moves there, a pinned one only comes forward, a new one is spliced in. `index` is an insertion point counted with the moving tab still in place. */
export function openTabAt(
  tabs: Tab[],
  pinned: Tab[],
  target: SelectTarget,
  index: number,
  newId: string,
): OpenResult {
  const pin = pinned.find(showing(target))
  if (pin) return { tabs, activeTabId: pin.id }
  const from = tabs.findIndex(showing(target))
  if (from !== -1) {
    const to = clamp(index > from ? index - 1 : index, 0, tabs.length - 1)
    return { tabs: from === to ? tabs : moveItem(tabs, from, to), activeTabId: tabs[from].id }
  }
  const at = clamp(index, 0, tabs.length)
  return { tabs: [...tabs.slice(0, at), tabFor(newId, target), ...tabs.slice(at)], activeTabId: newId }
}
```

- [ ] `navigationSlice.ts`: import `openTabAt as openTabAtModel`; interface line after `openNewTab`: `openTabAt: (target: SelectTarget, index: number) => void`; action after `openNewTab`:

```ts
    // A drop is a placement, not a navigation: no recent, no slide.
    openTabAt: (target, index) => {
      const s = get()
      const res = openTabAtModel(s.tabs, s.pinnedTabs, target, index, makeTabId())
      applyTabResult({ ...res, mru: pushMru(s.tabMru, res.activeTabId) })
    },
```

- [ ] `tabsModel.test.ts`, a new `describe('openTabAt', …)` with three cases: a new page splices at the index and activates; an open page moves to the index (insertion semantics: index 2 from 0 lands at 1) and activates; a pinned page returns `tabs` by reference with the pin active.

**VERIFY**

- [ ] Gates green; `tabsModel.test.ts` gains three cases.
- [ ] `grep -n "insertUnpinned(" Core/Session/navigationSlice.ts` → one caller (`unpinTab`).

#### Task 2.2

**TASK:** `openTabIn` accepts a page-only index and moves an existing tab there; `openWindowTab` takes the index and the id.

**FILES:** `Core/Interface/Windows/windowTabs.ts`, `Core/Interface/Windows/windowTabs.test.ts`, `Core/Session/windowSlice.ts`

**NOW**

```ts
export function openTabIn(
  win: WindowState,
  makeId: () => string,
  target: { id: string; path: string },
): WindowState {
  const existing = win.tabs.find((t) => targetPageId(t.target) === target.id)
  if (existing) {
    return existing.id === win.activeTabId ? win : { ...win, activeTabId: existing.id }
  }
  const tab: WindowTab = { id: makeId(), target: { kind: 'page', ...target } }
  return { ...win, tabs: [...win.tabs, tab], activeTabId: tab.id }
}
// windowSlice.ts: openWindowTab: (target: WindowTarget) => void … const next = openTabIn(cur, makeTabId, target)
```

**CHANGE**

- [ ] `windowTabs.ts`: add `import { clamp } from '@pommora/uix/Utilities/clamp'` and replace `openTabIn`:

```ts
/** `at` counts page tabs only, as the strip shows them; the map sentinel keeps its seat ahead of them. */
export function openTabIn(
  win: WindowState,
  makeId: () => string,
  target: { id: string; path: string },
  at?: number,
): WindowState {
  const first = win.tabs.findIndex((t) => t.target.kind !== 'navwindow')
  const base = first === -1 ? win.tabs.length : first
  const slot = at === undefined ? undefined : clamp(at + base, base, win.tabs.length)
  const from = win.tabs.findIndex((t) => targetPageId(t.target) === target.id)
  if (from !== -1) {
    const existing = win.tabs[from]
    const to = slot === undefined ? from : clamp(slot > from ? slot - 1 : slot, base, win.tabs.length - 1)
    const tabs = from === to ? win.tabs : moveItem(win.tabs, from, to)
    if (tabs === win.tabs && existing.id === win.activeTabId) return win
    return { ...win, tabs, activeTabId: existing.id }
  }
  const tab: WindowTab = { id: makeId(), target: { kind: 'page', ...target } }
  const tabs =
    slot === undefined ? [...win.tabs, tab] : [...win.tabs.slice(0, slot), tab, ...win.tabs.slice(slot)]
  return { ...win, tabs, activeTabId: tab.id }
}
```

- [ ] `windowSlice.ts`: interface `openWindowTab: (target: WindowTarget, at?: number) => void`; action head `openWindowTab: (target, at) => {` and `const next = openTabIn(cur, makeTabId, target, at)`.
- [ ] `windowTabs.test.ts`: two cases — a nav-kind window `[sentinel, x, y]` opening `z` at `at = 1` yields `[sentinel, x, z, y]` with `z` active; opening `x` at `at = 2` yields `[sentinel, y, x]`.

**VERIFY**

- [ ] Gates green; `windowTabs.test.ts` gains two cases, all existing pass.
- [ ] `grep -rn "openWindowTab(" Core --include='*.ts' --include='*.tsx' | grep -v test` — every existing call passes one argument.

---

### Phase 3 — The Rows Become Targets

**GOAL:** One group over the shell, and both tab rows declare the `tabs` family with carry, receive, overlay, and the slot. After this phase page tabs move between the rows.

#### Task 3.1

**TASK:** The carried shape, the shell group, and the one slot it paints.

**FILES:** `Core/Navigation/navRef.ts`, `Core/Interface/App.tsx`

**NOW**

```tsx
// navRef.ts ends with the Tab interface
// App.tsx: import list ends with ValuePickPresenter; the shell div's children run from `<div className="titlebar" />` to the side-pane resize strip
```

**CHANGE**

- [ ] `navRef.ts`, after `SelectTarget`:

```ts
/** What a tab row receives: only a page becomes a tab. */
export type PageTarget = Extract<SelectTarget, { kind: 'page' }>
```

- [ ] `App.tsx`: add `import { DragGroup, DropSlot } from '@pommora/uix/Interactions/drag'`; wrap the shell div's children: the first child line becomes `<DragGroup stray="return" holdGap>` followed by `<DropSlot foreignOnly />` and `<div className="titlebar" />`, and `</DragGroup>` closes before the shell's `</div>`. The one slot paints wherever a tabs-family item would land in another zone.

**AFTER**

```tsx
      >
        <DragGroup stray="return" holdGap>
          <DropSlot foreignOnly />
          <div className="titlebar" />
          …
          {status === 'ready' && sidePaneOpen && ( … )}
        </DragGroup>
      </div>
```

**VERIFY**

- [ ] Gates green.
- [ ] Nathan: ribbon reorder and a ViewTile pill reorder still work.

#### Task 3.2

**TASK:** The main bar's unpinned strip becomes the `tabs-main` zone: carries page tabs out, receives at an index, releases what left, floats an overlay, and mounts while a tabs drag is loose; the pinned zone keys by tab id.

**FILES:** `Core/Navigation/TabBar.tsx`, `Core/Navigation/tab-base.css`

**DEPENDENCIES:** Phase 1 and Task 2.1.

**NOW**

```tsx
import { Fragment, useEffect, useMemo, useRef } from 'react'
…
import { SortableZone, useDragItem, type DragItem } from '@pommora/uix/Interactions/drag'
…
import { cycle } from './tabsModel'
…
  // Blank ONLY for the pure empty state (a lone NavView, no pins); otherwise the bar shows so the + stays reachable, even at a single real tab.
  if (pinnedEntries.length === 0 && unpinnedEntries.every((e) => e.tab.target.kind === 'newtab'))
    return null
…
        <SortableZone
          items={pinnedEntries.map((e) => e.res?.key ?? '')}
          axis="x"
          onReorder={reorderPin}
        >
…
      <div className="tab-scroll over-scroll-x" ref={stripRef}>
        <SortableZone items={liveEntries.map((e) => e.tab.id)} axis="x" onReorder={reorderTabs}>
          <div className="tab-strip">
            {renderEntries.map(({ entry, ghost }, i) => (
              …
                <DraggableUnpinnedTab entry={entry} active={…} closing={ghost} onActivate={…} onClose={…} onMenu={…} />
              …
            ))}
          </div>
        </SortableZone>
      </div>
// PinnedTab: const drag = useDragItem(entry.res?.key ?? '')
// UnpinnedTab props: entry, active, closing, drag?, onActivate, onClose, onMenu; className cx('tab', hoverRemoveHost, …)
```

**CHANGE**

- [ ] Imports: `useLayoutEffect` from react; `SortableZone, useDragFamily, useDragItem, type Carried, type DragItem` from drag; `type PageTarget` beside `Tab, TabTarget`.
- [ ] Gate:

```tsx
  const forced = useDragFamily() === 'tabs'
  // Blank ONLY for the pure empty state (a lone NavView, no pins) with no tab loose that needs a row to land in; otherwise the bar shows so the + stays reachable, even at a single real tab.
  if (
    !forced &&
    pinnedEntries.length === 0 &&
    unpinnedEntries.every((e) => e.tab.target.kind === 'newtab')
  )
    return null
  return <TabBarBody pinnedEntries={pinnedEntries} unpinnedEntries={unpinnedEntries} forced={forced} />
```

- [ ] `TabBarBody` takes `forced: boolean`. Replace the region from `const reorderPin = …` through the `useTabClose(…)` call with:

```tsx
  const reorderPin = useSession((s) => s.reorderPin)
  const openTabAt = useSession((s) => s.openTabAt)
  const beginGesture = usePointerGesture()

  const { liveEntries, renderEntries, firstLive, requestClose } = useTabClose(
    unpinnedEntries,
    closeTab,
  )

  const entryOf = (id: string): TabEntry | undefined => liveEntries.find((e) => e.tab.id === id)
  const pinKeyOf = (id: string): string =>
    pinnedEntries.find((e) => e.tab.id === id)?.res?.key ?? ''
  const labelOf = (id: string): string => entryOf(id)?.res?.title ?? 'New Tab'
  // Only a page leaves the row.
  const carry = (id: string): PageTarget | null => {
    const tab = entryOf(id)?.tab
    return tab?.target.kind === 'page' ? tab.target : null
  }
  // The commit that seats a received tab renders the strip still: the row already parted for it, so no grow-in.
  const placing = useRef(false)
  useLayoutEffect(() => {
    placing.current = false
  })
  const receive = (item: Carried, index: number): void => {
    placing.current = true
    openTabAt(item as PageTarget, index)
  }
  const renderOverlay = (id: string): React.ReactNode => {
    const entry = entryOf(id)
    return entry ? (
      <div className="tab-overlay tabs-standard">
        <UnpinnedTab
          entry={entry}
          active={entry.tab.id === activeTabId}
          closing={false}
          onActivate={() => {}}
          onClose={() => {}}
          onMenu={() => {}}
        />
      </div>
    ) : null
  }
```

- [ ] Zones:

```tsx
      {pinnedEntries.length > 0 && (
        <SortableZone
          items={pinnedEntries.map((e) => e.tab.id)}
          axis="x"
          onReorder={(a, b) => reorderPin(pinKeyOf(a), pinKeyOf(b))}
        >
…
      <div className="tab-scroll over-scroll-x" ref={stripRef}>
        <SortableZone
          id="tabs-main"
          className={cx('tab-strip', (placing.current || forced) && 'is-still')}
          family="tabs"
          items={liveEntries.map((e) => e.tab.id)}
          axis="x"
          onReorder={reorderTabs}
          getItemLabel={labelOf}
          carry={carry}
          receive={receive}
          release={closeTab}
          renderOverlay={renderOverlay}
        >
          {renderEntries.map(({ entry, ghost }, i) => (
            <Fragment key={entry.tab.id}>
              {i > 0 && (
                <span
                  className={cx(segment, 'tab-seg', (ghost || i === firstLive) && 'is-closing')}
                  aria-hidden
                />
              )}
              {/* Same component type as a live tab — a type swap would remount the DOM node, losing the exit slide. */}
              <DraggableUnpinnedTab
                entry={entry}
                active={!ghost && entry.tab.id === activeTabId}
                closing={ghost}
                onActivate={() => activateTab(entry.tab.id)}
                onClose={() => requestClose(entry.tab.id)}
                onMenu={runTabMenu(entry.tab.id, false, entry.tab.target)}
              />
            </Fragment>
          ))}
        </SortableZone>
      </div>
```

- [ ] `PinnedTab`: `const drag = useDragItem(entry.tab.id)`.
- [ ] `tab-base.css`: the `@starting-style` rule's selector becomes `.tab-strip:not(.is-still) > .tab` (a still strip — one that mounted for a loose tab, or one seating a received tab — grows nothing in; the overlay's tab sits outside any strip and never grows in), and after `.tab.is-dragging` add:

```css
/* A tab in flight: the overlay clone fills the lifted rect and reads as lifted. */
.tab-overlay {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
}
.tab-overlay > .tab {
  flex: 1 1 auto;
  max-width: none;
  background: var(--state-hover);
}
```

**VERIFY**

- [ ] Gates green.
- [x] `grep -c "res?.key ?? ''" Core/Navigation/TabBar.tsx` → 1 (was 2; `pinKeyOf` is the one spelling).
- [ ] Nathan: in-row reorder feels as before; a horizontal drag never leaves the row; a 24px vertical tug lifts the tab free as a floating clone, and a release over nothing snaps it home with the gap still there.

#### Task 3.3

**TASK:** The window strip becomes the `tabs-window` zone, mounts during a tabs drag, keeps the map sentinel outside the zone, and the NavWindow's row opens for it.

**FILES:** `Core/Interface/Windows/WindowTabStrip.tsx`, `Core/Interface/Windows/NavWindow.tsx`, `Core/Interface/Windows/nav-window.css`

**DEPENDENCIES:** Phase 1 and Task 2.2.

**NOW** — the file as it reads today; `NavWindow`: `const hasTabs = pageWindow?.kind === 'nav' && pageWindow.tabs.length > 1` and `<div className={cx('navwindow-tabs', hasTabs && 'has-tabs')}>`.

**CHANGE**

- [ ] Replace `WindowTabStrip.tsx` with the block below. The map sentinel sits in `.window-tabwrap` (a flex row) ahead of `.tab-scroll`, so the zone container holds page tabs only and an empty one still spans the row.
- [ ] `NavWindow.tsx`: import `useDragFamily` from drag; replace the `hasTabs` line and the row's class:

```tsx
  const forced = useDragFamily() === 'tabs'
  const hasTabs = pageWindow?.kind === 'nav' && pageWindow.tabs.length > 1
…
        <div
          className={cx(
            'navwindow-tabs',
            (hasTabs || forced) && 'has-tabs',
            forced && !hasTabs && 'is-forced',
          )}
        >
```

- [ ] `nav-window.css`, after `.navwindow-tabs.has-tabs { … }`:

```css
/* A row opened for a loose tab measures at once; it eases shut again only if nothing lands. */
.navwindow-tabs.is-forced {
  transition: none;
}
```

**AFTER**

```tsx
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { cx } from '@pommora/uix/Utilities/cx'
import { overScrollEllipsis } from '@pommora/uix/Interactions/OverScroll'
import { HoverRemove, hoverRemoveHost } from '@pommora/uix/Interactions/HoverRemove'
import {
  SortableZone,
  useDragFamily,
  useDragItem,
  type Carried,
  type DragItem,
} from '@pommora/uix/Interactions/drag'
import { Icon } from '@pommora/uix/Symbols'
import { DEFAULT_ENTITY_ICONS } from '../../Assets/entityIconPolicy'
import { text } from '@pommora/uix/Theme'
import { EntityIcon } from '../../Assets/EntityIcon'
import { resolveWith, type ResolveIndex, type ResolvedNav } from '../../Navigation/navResolve'
import { useTabClose } from '../../Navigation/tabClose'
import { useExitPresence } from '@pommora/uix/Animations/useExitPresence'
import { useHeld } from '@pommora/uix/Animations/useExitPresence'
import type { PageTarget } from '@pommora/core/Navigation/navRef'
import { useSession } from '../../Session/store'
import type { WindowTab } from './windowTabs'
import '../../Navigation/tab-base.css'

const TAB_ICON = 'control'

interface Entry {
  tab: WindowTab
  res: ResolvedNav | null
}

// The strip stays mounted through a ghost close so the last collapse plays before the title returns, and through a tabs drag so a loose tab has a row to land in.
export function WindowTabStrip({
  index,
  title,
}: {
  index: ResolveIndex | null
  title: React.ReactNode
}): React.JSX.Element {
  const pageWindow = useSession((s) => s.pageWindow)
  const activateWindowTab = useSession((s) => s.activateWindowTab)
  const closeWindowTab = useSession((s) => s.closeWindowTab)
  const reorderWindowTabs = useSession((s) => s.reorderWindowTabs)
  const openWindowTab = useSession((s) => s.openWindowTab)
  const tabs = pageWindow?.tabs
  const activeTabId = pageWindow?.activeTabId
  const navKind = pageWindow?.kind === 'nav'

  const entries = useMemo<Entry[]>(
    () =>
      (tabs ?? []).map((tab) => ({
        tab,
        res: tab.target.kind === 'page' && index ? resolveWith(index, tab.target) : null,
      })),
    [tabs, index],
  )

  const { renderEntries, ghostCount, requestClose } = useTabClose(entries, closeWindowTab)
  const sentinel = renderEntries.find((e) => e.entry.tab.target.kind === 'navwindow')
  const pageEntries = renderEntries.filter((e) => e.entry.tab.target.kind === 'page')
  const firstLivePage = pageEntries.findIndex((e) => !e.ghost)

  const forced = useDragFamily() === 'tabs'
  const showStrip = (tabs?.length ?? 0) > 1 || ghostCount > 0 || forced
  const titlePresence = useExitPresence(!showStrip)
  // The exiting title fades out as WHAT IT WAS — crumbs re-derive from the new active tab, so the live node would swap text mid-collapse without this hold.
  const heldTitle = useHeld(title, !showStrip)

  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!activeTabId) return
    scrollRef.current
      ?.querySelector<HTMLElement>(`[data-tab-id="${CSS.escape(activeTabId)}"]`)
      ?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [activeTabId])

  const entryOf = (id: string): Entry | undefined =>
    pageEntries.find((e) => !e.ghost && e.entry.tab.id === id)?.entry
  const labelOf = (id: string): string => entryOf(id)?.res?.title ?? ''
  const carry = (id: string): PageTarget | null => {
    const tab = entryOf(id)?.tab
    return tab?.target.kind === 'page' ? tab.target : null
  }
  const placing = useRef(false)
  useLayoutEffect(() => {
    placing.current = false
  })
  const receive = (item: Carried, at: number): void => {
    placing.current = true
    openWindowTab(item as PageTarget, at)
  }
  const renderOverlay = (id: string): React.ReactNode => {
    const entry = entryOf(id)
    return entry ? (
      <div className="tab-overlay tabs-compact">
        <WindowTabItem
          entry={entry}
          navKind={navKind}
          active={entry.tab.id === activeTabId}
          closing={false}
          onActivate={() => {}}
          onClose={() => {}}
        />
      </div>
    ) : null
  }

  return (
    <>
      {titlePresence.mounted && (
        <div
          className={cx(
            'window-toolbar-title',
            'page-window-title',
            titlePresence.closing && 'is-collapsing',
          )}
        >
          {heldTitle}
        </div>
      )}
      <div className="window-tabwrap tabs-compact">
        {showStrip && sentinel && (
          <WindowTabItem
            entry={sentinel.entry}
            navKind={navKind}
            active={sentinel.entry.tab.id === activeTabId}
            closing={false}
            onActivate={() => activateWindowTab(sentinel.entry.tab.id)}
            onClose={() => {}}
          />
        )}
        {showStrip && (
          <div
            className="tab-scroll over-scroll-x"
            role="tablist"
            aria-label="Preview tabs"
            ref={scrollRef}
          >
            <SortableZone
              id="tabs-window"
              className={cx('tab-strip', (placing.current || forced) && 'is-still')}
              family="tabs"
              items={pageEntries.filter((e) => !e.ghost).map((e) => e.entry.tab.id)}
              axis="x"
              onReorder={reorderWindowTabs}
              getItemLabel={labelOf}
              carry={carry}
              receive={receive}
              release={closeWindowTab}
              renderOverlay={renderOverlay}
            >
              {pageEntries.map(({ entry, ghost }, i) => (
                <Fragment key={entry.tab.id}>
                  {(i > 0 || sentinel) && (
                    <span
                      className={cx(
                        'tab-seg',
                        (ghost || (i > 0 && i === firstLivePage)) && 'is-closing',
                      )}
                      aria-hidden
                    />
                  )}
                  <DraggableWindowTab
                    entry={entry}
                    navKind={navKind}
                    active={!ghost && entry.tab.id === activeTabId}
                    closing={ghost}
                    onActivate={() => activateWindowTab(entry.tab.id)}
                    onClose={() => requestClose(entry.tab.id)}
                  />
                </Fragment>
              ))}
            </SortableZone>
          </div>
        )}
      </div>
    </>
  )
}

function DraggableWindowTab(props: {
  entry: Entry
  navKind: boolean
  active: boolean
  closing: boolean
  onActivate: () => void
  onClose: () => void
}): React.JSX.Element {
  const drag = useDragItem(props.entry.tab.id)
  return <WindowTabItem {...props} drag={drag} />
}

function WindowTabItem({
  entry,
  navKind,
  active,
  closing,
  drag,
  onActivate,
  onClose,
}: {
  entry: Entry
  navKind: boolean
  active: boolean
  closing: boolean
  drag?: DragItem
  onActivate: () => void
  onClose: () => void
}): React.JSX.Element {
  const isMap = entry.tab.target.kind === 'navwindow'
  const label = isMap ? 'Navigation' : (entry.res?.title ?? '')
  // A page tab whose own icon is ALSO the map glyph renders its type icon instead — nothing masquerades as the perma-pinned NavWindow tab.
  const res =
    navKind && entry.res?.icon === 'map'
      ? { ...entry.res, icon: DEFAULT_ENTITY_ICONS.page }
      : entry.res
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the drag handle spread supplies onKeyDown (Space/Enter lift), which a spread hides from static analysis
    <div
      ref={drag?.setNodeRef}
      style={drag?.style}
      {...drag?.handle}
      data-tab-id={entry.tab.id}
      className={cx(
        'tab',
        hoverRemoveHost,
        text.caption.standard,
        active && 'is-active',
        closing && 'is-closing',
        isMap && 'tab-map',
        drag?.isDragging && 'is-dragging',
      )}
      title={label}
      role="tab"
      aria-selected={active}
      // Roving tabindex: the strip is ONE tab stop, the active tab holds it.
      tabIndex={active ? 0 : -1}
      onClick={() => {
        if (!drag?.isDragging) onActivate()
      }}
    >
      {res ? (
        <EntityIcon item={res} size={TAB_ICON} className="tab-icon" />
      ) : (
        <Icon name={isMap ? 'map' : 'file'} size={TAB_ICON} className="tab-icon" />
      )}
      {!isMap && <span className={cx(overScrollEllipsis, 'tab-label')}>{label}</span>}
      {!isMap && (
        <HoverRemove reveal="host" className="tab-x" label="Close Tab" onRemove={onClose} />
      )}
    </div>
  )
}
```

**VERIFY**

- [ ] Gates green.
- [ ] Nathan: main → window (Page Window and NavWindow) and window → main land at the pointed slot with displacement and the accent slot; the source gap holds while hovering the other row and collapses on drop; a single-tab Page Window grows its strip while a main tab is loose and the NavWindow opens its row; the moved tab arrives in one motion; a collection tab or the New Tab tab cannot leave; a page already open in the main bar focuses and moves; the last window tab dragged out closes the window; the map tab never lifts.

#### Review Checkpoint

- [ ] Every 3.2/3.3 hand-check confirmed by Nathan.
- [ ] `npm run test` green; `git diff --stat dd605692d..HEAD` shows no file outside the phases' FILES.

---

### Phase 4 — The Nav Surfaces Become Sources

**GOAL:** Gallery cards (recents, pins, search results) and list rows (recents, pins, Favorites rail) leave their surface into either tab row. Then the documents read true.

#### Task 4.1

**TASK:** Gallery zones declare the family, carry a resolved page target, float an overlay card, and search results become a fixed zone.

**FILES:** `Core/Navigation/NavGallery.tsx`

**NOW**

```tsx
      <div className={cx('card-grid', frozenLayout && 'is-fill')}>
        {pins.length > 0 && (
          <SortableZone items={pins.map((p) => p.key)} onReorder={reorderPin}>
            <DropSlot />
            {pins.map(card)}
          </SortableZone>
        )}
        {frozenLayout ? (
          items.map((it) => (
            <GalleryCard key={it.key} it={it} nexusId={nexusId} onSelect={onSelect} onMenu={openMenu} />
          ))
        ) : (
          <SortableZone items={items.map((r) => r.key)} onReorder={onReorderRecent}>
            <DropSlot />
            {items.map(card)}
          </SortableZone>
        )}
      </div>
```

**CHANGE**

- [ ] Imports: `DropSlot, SortableZone, useDragItem, type DragItem` from drag; `import type { NavRef, PageTarget } from '@pommora/core/Navigation/navRef'`.
- [ ] In `NavGallery`, after `nexusId`:

```tsx
  const tree = useSession((s) => s.tree)
  const find = (key: string): ResolvedNav | undefined =>
    pins.find((p) => p.key === key) ?? items.find((r) => r.key === key)
  // Only a page can become a tab; the gallery itself lets nothing go.
  const carry = (key: string): PageTarget | null => {
    const it = find(key)
    return (it && pageTargetFromNav(it, tree)) ?? null
  }
  const renderOverlay = (key: string): React.ReactNode => {
    const it = find(key)
    return it ? (
      <div className="nav-gallery">
        <div className="card-grid">
          <GalleryCard it={it} nexusId={nexusId} onSelect={onSelect} onMenu={openMenu} />
        </div>
      </div>
    ) : null
  }
  const zone = { family: 'tabs', carry, renderOverlay } as const
```

- [ ] The grid:

```tsx
      <div className={cx('card-grid', frozenLayout && 'is-fill')}>
        {pins.length > 0 && (
          <SortableZone items={pins.map((p) => p.key)} onReorder={reorderPin} {...zone}>
            <DropSlot />
            {pins.map(card)}
          </SortableZone>
        )}
        {frozenLayout ? (
          <SortableZone items={items.map((r) => r.key)} fixed {...zone}>
            {items.map(card)}
          </SortableZone>
        ) : (
          <SortableZone items={items.map((r) => r.key)} onReorder={onReorderRecent} {...zone}>
            <DropSlot />
            {items.map(card)}
          </SortableZone>
        )}
      </div>
```

**VERIFY**

- [ ] Gates green.
- [ ] Nathan: a gallery card (recent, pin, search hit) dragged into either row opens the page there at the pointed slot; the gallery's own order is untouched; releasing a card off the gallery does nothing; in-gallery reorder of recents and pins still works; a search result never previews a reorder; a task or event card cannot leave.

#### Task 4.2

**TASK:** List rows escort into the rows: the row keeps its insertion line inside the list, a ghost follows it out, and a tab row displaces when reached. Tables pass nothing new.

**FILES:** `UIX/Interactions/tableDnd.tsx`, `UIX/Interactions/drop-chrome.css`, `Core/Navigation/NavList.tsx`

**DEPENDENCIES:** Task 1.3.

**NOW** — `tableDnd.tsx` as it reads today; `NavList` wraps rows in `TableRowDnd` only when `reorderable` and splits `DraggableRow`/`NavRow`.

**CHANGE**

- [ ] Replace `tableDnd.tsx` with:

```tsx
import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { nearestByTop, useInsertionDrag } from './insertionDrag'
import type { Escort } from './engine'
import { type MeasuredRow, nextOrder, slotInGroup } from './reorderModel'
import { DROP_LINE_INSET, toBox, type Carried } from './shared'
import { currentZoom } from '../Utilities/zoom'

type Slot = { lineY: number; left: number; width: number; group: string; beforeId: string | null }
type TableRow = MeasuredRow & { left: number; contentRight: number; group: string }
type Snapshot = {
  rows: TableRow[]
  boxTop: number
  boxLeft: number
  boxRight: number
  boxBottom: number
  zoom: number
}

type Value = {
  draggingId: string | null
  registerRow: (id: string, el: HTMLElement | null) => void
  begin: (id: string, e: ReactPointerEvent) => void
}
const Ctx = createContext<Value | null>(null)

export function TableRowDnd({
  rows,
  disabled,
  canReorderWithin,
  crossZone,
  onDrop,
  escort,
  ghostLabel,
  children,
}: {
  rows: { id: string; groupKey: string }[]
  disabled: boolean
  canReorderWithin: boolean
  /** Whether a drop onto another group is offered at all — the caller decides whether it relocates the page or rewrites its group value. */
  crossZone: boolean
  /** `beforeId` is null at the target group's end. The caller routes a same-group drop to a reorder and a cross-group one to a relocate or a reassign; a row the escort lands elsewhere never reaches here. */
  onDrop: (activeId: string, toGroup: string, beforeId: string | null) => void
  /** Rows that may leave for a family zone: with an escort, a point outside the rows' box resolves to nothing, so a row carried away draws no line. */
  escort?: { via: Escort; family: string; carry: (id: string) => Carried | null } | null
  /** A ghost follows the row when a label is given. */
  ghostLabel?: (id: string) => ReactNode
  children: ReactNode
}): React.JSX.Element {
  const els = useRef(new Map<string, HTMLElement>())
  const content = useRef<HTMLDivElement | null>(null)
  const bounded = escort != null

  const drag = useInsertionDrag<Slot, Snapshot>({
    take: (excludeId) => {
      const box = content.current
      if (!box) return null
      const boxRect = box.getBoundingClientRect()
      const measured: TableRow[] = []
      for (const r of rows) {
        if (r.id === excludeId) continue
        const el = els.current.get(r.id)
        if (!el) continue
        const rect = el.getBoundingClientRect()
        // The row spans a trailing 1fr filler, so rect.right would run the line into the empty gutter past the last column.
        const filler = el.querySelector('.cell-filler')
        const contentRight = filler ? filler.getBoundingClientRect().left : rect.right
        measured.push({
          id: r.id,
          top: rect.top,
          bottom: rect.bottom,
          mid: rect.top + rect.height / 2,
          left: rect.left,
          contentRight,
          group: r.groupKey,
        })
      }
      measured.sort((a, b) => a.top - b.top)
      return {
        rows: measured,
        boxTop: boxRect.top,
        boxLeft: boxRect.left,
        boxRight: boxRect.right,
        boxBottom: boxRect.bottom,
        zoom: currentZoom(box),
      }
    },
    resolve: (id, point, s) => {
      const activeGroup = rows.find((r) => r.id === id)?.groupKey
      if (activeGroup === undefined || s.rows.length === 0) return null
      if (
        bounded &&
        (point.x < s.boxLeft || point.x > s.boxRight || point.y < s.boxTop || point.y > s.boxBottom)
      )
        return null
      const near = nearestByTop(s.rows, point.y)
      const group = near.group
      const crossing = group !== activeGroup
      if (crossing ? !crossZone : !canReorderWithin) return null
      const groupOrder = rows.flatMap((r) => (r.groupKey === group ? [r.id] : []))
      const { beforeId } = slotInGroup(groupOrder, near, point.y, id)
      // A slot reproducing the standing order is a noop — no line, no commit.
      if (!crossing && nextOrder(groupOrder, id, beforeId).every((x, i) => x === groupOrder[i]))
        return null
      const above = point.y < near.mid
      return {
        lineY: ((above ? near.top : near.bottom) - s.boxTop) / s.zoom,
        left: (near.left - s.boxLeft) / s.zoom + DROP_LINE_INSET,
        width: (near.contentRight - near.left) / s.zoom - DROP_LINE_INSET * 2,
        group,
        beforeId,
      }
    },
    commit: (id, slot) => onDrop(id, slot.group, slot.beforeId),
    lineFor: (slot) => ({ top: slot.lineY, left: slot.left, width: slot.width, right: 'auto' }),
    label: () => 'row',
    ghostLabel,
    ghost: ghostLabel ? 'grab' : 'none',
    escort: escort?.via,
    escortSpec: (id, rect) => {
      const item = escort?.carry(id)
      const box = content.current
      return escort && item != null && box
        ? { id, family: escort.family, item, rect, home: toBox(box) }
        : null
    },
    rowEl: (id) => els.current.get(id),
    scrollTarget: () => content.current,
    disabled: () => disabled,
    disclose: true,
    watch: rows,
  })

  const registerRow = (id: string, el: HTMLElement | null): void => {
    if (el) els.current.set(id, el)
    else els.current.delete(id)
  }

  const value = useMemo<Value>(
    () => ({ draggingId: drag.dragging, registerRow, begin: drag.begin }),
    [drag.dragging, drag.begin],
  )

  return (
    <Ctx.Provider value={value}>
      <div ref={content} className="drop-line-host">
        {children}
        {drag.line}
      </div>
      {drag.ghost}
    </Ctx.Provider>
  )
}

/** `ref` on the row, `handle` spread on the grip. `isDragging` mutes the row in place. */
export function useTableRowDrag(id: string): {
  ref: (el: HTMLElement | null) => void
  handle: { onPointerDown: (e: ReactPointerEvent) => void }
  isDragging: boolean
} {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTableRowDrag must be used inside <TableRowDnd>')
  return {
    ref: (el) => ctx.registerRow(id, el),
    handle: { onPointerDown: (e) => ctx.begin(id, e) },
    isDragging: ctx.draggingId === id,
  }
}
```

- [ ] `NavList.tsx`: imports gain `useEscort` from `@pommora/uix/Interactions/drag`; `pageTargetFromNav` is already imported. Replace `NavRow`, `DraggableRow`, and `NavList` with:

```tsx
function NavRow({
  it,
  onSelect,
  onMenu,
}: {
  it: ResolvedNav
  onSelect: (t: NavRef) => void
  onMenu: (it: ResolvedNav) => void
}): React.JSX.Element {
  const drag = useTableRowDrag(it.key)
  return (
    <MenuItem
      ref={drag.ref}
      className={cx(drag.isDragging && rowDragging)}
      leading={<EntityIcon item={it} size="headline" />}
      detail={<NavTrail segments={it.path} iconSize="control" />}
      overlay={<NavPinButton it={it} className={cx(overlay, 'nav-pin')} />}
      onPointerDown={drag.handle.onPointerDown}
      onClick={() => onSelect(it.target)}
      onMouseEnter={(e) => {
        const t = pageTargetFromNav(it, useSession.getState().tree)
        if (t) hoverGlance(t, e.currentTarget, 'location', e.shiftKey)
      }}
      onMouseLeave={() => leaveGlance()}
      onContextMenu={(e) => {
        e.preventDefault()
        onMenu(it)
      }}
    >
      {it.title}
    </MenuItem>
  )
}

export function NavList({
  items,
  pins,
  reorderable,
  onReorderRecent,
  onSelect,
  onOpenNewTab,
}: {
  items: ResolvedNav[]
  pins?: ResolvedNav[]
  reorderable?: boolean
  onReorderRecent?: (activeKey: string, overKey: string) => void
  onSelect: (target: NavRef) => void
  onOpenNewTab?: (target: NavRef) => void
}): React.JSX.Element | null {
  const reorderPin = useSession((s) => s.reorderPin)
  const tree = useSession((s) => s.tree)
  const engine = useEscort()
  const [menu, setMenu] = useState<{ item: ResolvedNav } | null>(null)
  const openMenu = (it: ResolvedNav): void => setMenu({ item: it })
  const pinRows = reorderable ? (pins ?? []) : []
  const rows = reorderable ? [...pinRows, ...items] : items
  // Identity-stable so a parent re-render mid-drag can't false-dirty the drag's row snapshot.
  const dndRows = useMemo(
    () => [
      ...(reorderable ? (pins ?? []).map((p) => ({ id: p.key, groupKey: 'pins' })) : []),
      ...items.map((r) => ({ id: r.key, groupKey: 'recents' })),
    ],
    [reorderable, pins, items],
  )
  if (rows.length === 0) return null

  const commitReorder = (activeId: string, groupKey: string, beforeId: string | null): void => {
    const group = groupKey === 'pins' ? pinRows : items
    const next = nextOrder(
      group.map((g) => g.key),
      activeId,
      beforeId,
    )
    const over = group[next.indexOf(activeId)]?.key
    if (!over || over === activeId) return
    if (groupKey === 'pins') reorderPin(activeId, over)
    else onReorderRecent?.(activeId, over)
  }
  // A page row rides the engine's escort into a tab row; the list itself lets nothing go.
  const carry = (key: string): PageTarget | null => {
    const it = rows.find((r) => r.key === key)
    return (it && pageTargetFromNav(it, tree)) ?? null
  }
  const ghostOf = (key: string): React.ReactNode => {
    const it = rows.find((r) => r.key === key)
    return it ? (
      <>
        <EntityIcon item={it} size="body" />
        {it.title}
      </>
    ) : null
  }

  return (
    <>
      <TableRowDnd
        rows={dndRows}
        disabled={false}
        canReorderWithin={!!reorderable}
        crossZone={false}
        onDrop={commitReorder}
        escort={engine && { via: engine, family: 'tabs', carry }}
        ghostLabel={ghostOf}
      >
        <div className="nav-list">
          {rows.map((it) => (
            <NavRow key={it.key} it={it} onSelect={onSelect} onMenu={openMenu} />
          ))}
        </div>
      </TableRowDnd>
      {menu && (
        <NavRowMenu item={menu.item} onClose={() => setMenu(null)} onOpenNewTab={onOpenNewTab} />
      )}
    </>
  )
}
```

- [ ] `NavList`'s `PageTarget` import: `import type { NavRef, PageTarget, SelectTarget } from '@pommora/core/Navigation/navRef'`.
- [ ] `.drag-ghost` needs the icon beside the title: in `UIX/Interactions/drop-chrome.css` add `display: inline-flex; align-items: center; gap: 6px;` to `.drag-ghost` (the sidebar's string label is unaffected).

**VERIFY**

- [ ] Gates green; `tableDnd.test.tsx` passes unchanged.
- [ ] `git diff dd605692d..HEAD -- Core/Views/Table/TableView.tsx` → empty.
- [ ] Nathan: a list row (recents, pins, Favorites rail, in NavWindow and NavView) reorders with the line inside its list and the ghost beside the cursor; dragged out, the line disappears, the ghost follows, a tab row displaces and shows the slot, and the drop opens the page; releasing between the list and a row does nothing; a Favorites row never reorders; the list stops scrolling once the row has left it.

#### Task 4.3

**TASK:** A sidebar page row escorts into the tab rows, one direction; the sidebar draws no line while the row is outside it.

**FILES:** `Core/Interface/Sidebar/sidebarDnd.tsx`

**DEPENDENCIES:** Task 1.3.

**NOW**

```ts
type Snapshot = { contentTop: number; measured: MeasuredRow[]; siblings: MeasuredRow[] }
// take(): const contentTop = content.getBoundingClientRect().top
// resolve: (id, point, s) => computeTarget(id, point.y, s)
// ghost: 'grab', disclose: true, watch: index
```

**CHANGE**

- [ ] Imports: `useEscort` from `@pommora/uix/Interactions/drag`; `toBox, type Box` from `@pommora/uix/Interactions/shared`.
- [ ] `Snapshot` gains `box: Box`; `take` measures it once (`const box = toBox(content)`, `contentTop: box.top`).
- [ ] Inside `SidebarDnd`, before the `useInsertionDrag` call: `const escort = useEscort()`.
- [ ] The spec gains, beside `resolve`:

```ts
    // A page row that has left the column draws no line; a row of any other kind stays the column's own.
    resolve: (id, point, s) =>
      escort && !within(s.box, point) ? null : computeTarget(id, point.y, s),
    escort,
    escortSpec: (id, rect) => {
      const entry = index.byId.get(id)
      const content = contentRef.current
      return entry?.kind === 'page' && content
        ? { id, family: 'tabs', item: { kind: 'page', id, path: entry.path }, rect, home: toBox(content) }
        : null
    },
```

with, at module level beside `sameOrder`:

```ts
const within = (b: Box, p: { x: number; y: number }): boolean =>
  p.x >= b.left && p.x <= b.left + b.width && p.y >= b.top && p.y <= b.top + b.height
```

**AFTER** — `SidebarDnd` is otherwise unchanged; `sidebarDnd.test.tsx` mounts it outside any group, so `escort` is null there and every case runs as today.

**VERIFY**

- [ ] Gates green; `sidebarDnd.test.tsx` unchanged and passing.
- [ ] Nathan: a sidebar page row dragged into the main bar or a window strip opens the page there at the pointed slot with the ghost following; the sidebar's line vanishes once the row leaves the column and the column stops scrolling; a Set or Collection row never leaves; releasing the row over the main pane does nothing; in-sidebar reorder and reparent feel as before.

#### Task 4.4

**TASK:** The Features documents describe the shipped behavior.

**FILES:** `.claude/Features/PommoraDND.md`, `.claude/Features/NavigationPM.md`, `.claude/Features/InterfacePM.md`

**CHANGE**

- [ ] Load `writing-standards` before the first edit.
- [ ] `PommoraDND.md` — The Seam: `SortableZone`'s bullet names `family`, `fixed`, `carry`/`receive`/`release`, and a zone-level `renderOverlay`; `DragGroup`'s bullet reports `(activeId, toZone, toIndex, fromZone)` and names `stray` and `holdGap`; add bullets for `DropSlot`, `useDragFamily`, and `useEscort`. Displacement: the family gate (a zone is a target only when it owns a container), the 24px breakout and the axis lock it releases, the return-home rule and the stray knob, the running-offset placement for axis zones and the foreign arrival taking the zone's own item shape, zone-level overlays, the zone-qualified active item, and autoscroll stopping once loose. Insertion Line: the escort paragraph — a row keeps its line and ghost while over its list and hands its point to the engine once it reaches a family zone. Constraints: "an `axis` lock per zone" becomes "an `axis` lock per zone that a family drag releases past the breakout".
- [ ] `NavigationPM.md` — NavWindow paragraph: cards and rows drag into either tab row to open there. Toolbar Tabs "Interaction": within-row drag reorders, pinned among pinned and unpinned among unpinned; a page tab tugged 24px off its row floats to the floating window's strip and back, landing where it points, and the scratch tab, a collection, a space, and the Homepage stay in their row; a moved tab starts a fresh history and rebuilds cold. Prospects: "Drag-to-pin across the tab divider, and dragging a tab out into its own OS window."
- [ ] `InterfacePM.md` — The Sidebar, Drag and Drop: a page row also drags into the main tab bar or a floating window's strip to open there, and nothing drags into the sidebar. Page Window: "Tabs drag-reorder" becomes "Tabs drag-reorder, and a page tab moves between this strip and the main tab bar"; NavWindow: page tabs open beside the map tab from its rows when the routing override is on, or from a card, row, or main-bar tab dropped onto the strip; the map tab is neither lifted nor landed on.

**VERIFY**

- [ ] Each rewritten paragraph read once in place; no "now"/"previously" framing.

---

### Completion Criteria

**Conformance**

- [ ] `grep -rn "crossZone" UIX/Interactions/engine.tsx Core/Views/Cards` → 0; one slot painter (`DropSlot`), mounted once in the shell group and once per private group; grid placement and axis placement each defined once.
- [ ] `git diff --name-only dd605692d..HEAD` is the union of every task's FILES plus this plan.

**Correctness**

- [ ] A page tab moves main ↔ window (Page Window and NavWindow) at the pointed index, with displacement and the slot, and never on a horizontal drag.
- [ ] Non-page tabs never leave; the pinned zone never receives; a release over nothing commits nothing.
- [ ] Gallery cards, list rows, and sidebar page rows open the page in either row at the pointed index; their own lists are unchanged; tables and the sidebar's own reorder are unchanged.
- [ ] Cards view, ribbon, ViewTile pills, sidebar drag behave as before.

**Completeness**

- [ ] Every task ticked; no scaffolding, debug output, or unauthorized TODO in `dd605692d..HEAD`.

**Confirmation**

- [ ] Every VERIFY result read; the new engine and model tests go red with their change reverted.
- [ ] Nathan's hand-checks in 3.2, 3.3, 4.1, 4.2, 4.3 carry his word.

**Continuity**

- [ ] Reconciliation complete; `ContextPM.md` and `HandoffPM.md` read true; Deviations each fixed or ruled on.

**Confidence**

- [ ] Gates green from clean on `dd605692d..HEAD`; Baseline counts moved as planned.
- [ ] Diff size reported (+/- lines, comments and tests excluded).

### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Ambiguity met during execution took the simplest reading and was recorded. Edits found in adjacent files that no task made belong to Nathan — folded into the commit at hand, not reverted.

- [ ] Phase review dispatched: Phase 1 · Phase 2 · Phase 3 · Phase 4
- [ ] All findings fixed or ruled on
- [ ] Neutral verification passed on `dd605692d..HEAD`
- [ ] Final pass: gates · baseline · diff · deviations · criteria
- [ ] Reconciliation walked; living documents read
- [ ] Report delivered

#### Reconciliation

- `PommoraDND.md` — "reporting each landing as `(activeId, toZone, toIndex)`", "a `DragGroup` given `renderOverlay` renders it instead", "an `axis` lock per zone", "the size of the cell it lands in, and the lifted item's own past the last cell", "A zone given an `id` is addressable … renders its own container", "Nothing displaces" / "One frame owns the lifecycle" — Task 4.4
- `NavigationPM.md` — "within-zone drag reorders, pinned among pinned and unpinned among unpinned", Prospects "dragging a tab out into its own window" — Task 4.4
- `InterfacePM.md` — "Every entity reorders within its parent by drag, and Pages and Sets also reparent…" (incomplete), "Tabs drag-reorder", "page tabs open beside it from its rows when the routing override is on" — Task 4.4
- `engine.tsx` comments — "`?? from`", "The one landing", `placeCell`'s docblock, "Walked by grid columns", "The slot takes the size of the cell it lands in", "An addressable zone owns an element", "A standalone surface carries its own provider" — Task 1.1 (rewritten in the AFTER)
- `tabsModel.ts` — the same-entity predicate spelled twice — Task 2.1
- `TabBar.tsx` — "Blank ONLY for the pure empty state" — Task 3.2
- `WindowTabStrip.tsx` — "Ghost-closing keeps the strip mounted so the last collapse plays" — Task 3.3
- `tableDnd.tsx` — "The caller routes a same-group drop to a reorder and a cross-group one" — Task 4.2
- `ContextPM.md` — Debt & Ride-Alongs gains the Open Items below if they survive — closing commit

#### Report & Closure

Per the skill's report shape, written when the chain is confirmed.

### Open Items

- **Warm state and history do not travel.** A moved tab rebuilds cold in its new row and starts a fresh history; the two caches are separate. Recorded in NavigationPM as a fact.
- **Keyboard lifts stay in-zone.** A Space-lifted tab cannot cross rows; the documented limitation stands.
- **No autoscroll while loose, and loose is for the gesture.** A tab tugged off its row stops that row's autoscroll and keeps its free travel even after coming back over it; a re-lock mid-gesture reads as a snap.
- **A page pinned in the main bar absorbs a drop.** Dropping a window tab whose page is pinned focuses the pin and closes the window tab, per the "pinned only focuses" ruling.
- **One group re-renders every subscriber per landing change.** The state context changes on each slot switch and every `useDragItem` under the shell re-renders; slot switches are rare against pointer moves, and the api/state split keeps registration and the escort off that path.

### Deviations

- **Task 1.4's harness head landed in Task 1.1/1.2's commit** (`d503c3deb`). The old `Board` passed `crossZone`, an excess prop under the new `DragGroupProps`, and declared no `family`, so the gates could not go green at Task 1.2 with the old harness; the head is the plan's own AFTER text one commit early. Lines from `afterEach` down were untouched until Task 1.4.
- **`dragTo` split into `dragHold` + `release`** in `engine.test.tsx`. `dragTo` fires pointerup, and `useDropSlot` paints only while `dropState === 'dragging'`, so the two axis-slot cases read a null slot as written. `dragTo` now delegates to the pair, the 19 existing callers are unchanged, and the two cases call `dragHold`, keep every assertion, and add one `await release(x, y)` before their `settle()`.
- **Biome wrapping in Phase 2.** `openTabAt`'s return and `windowTabs.ts`'s clamp and ternary wrapped past the print width; `tabsModel.test.ts`'s new block is titled `tabsModel — openTabAt` to match its siblings. No semantic difference.
- **Out-of-plan commits `6f4a901a9` and `a7f8e307c`.** Nathan asked mid-run for the dashboard republish prompt (`republish-dashboard.mjs`, its `PostToolUse` entry, and the docs describing it) to be retired; the git post-commit script keeps building. Those files appear in `dd605692d..HEAD` by his direction, not this plan.
- **Task 3.2's VERIFY grep read 0 where the AFTER block itself spells the expression once** (`pinKeyOf`). The count went 2 → 1; the VERIFY line now states that.
