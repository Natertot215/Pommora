## Engine Fold — Implementation Plan

### Context

The View Engine arc left Table and Cards rendering over one interaction layer while two drag engines stayed behind the design kit's façade: `UIX/Interactions/engine.tsx`, the single-zone engine serving nine surfaces, and `UIX/Interactions/group.tsx`, a cross-list engine serving Cards alone. The audit's R-52 names the fold. This plan makes `engine.tsx` the one engine, with a zone registry, a trailing landing cell for foreign zones, `resolveIndex`, and an optional overlay, and deletes `group.tsx`. It touches `UIX/Interactions` (engine, façade, tests), `UIX/Cards/Card.tsx`, `Core/Views/Cards` (the `DragGroup` mount, the page-card zone, one hook call, one stylesheet), and, as a bundled fix, `Core/Views/Bands` (an empty band no longer opens onto clearance it has nothing to clear).

It leaves alone the insertion-line frame (`insertionDrag.tsx`, `tableDnd.tsx`), the views' drop contract in `useViewInteractions.tsx`, the tile grid and the tab bar's window scrub (R-58: a two-dimensional layout editor with edge relations and a window-move scrub are not sortable lists; the tile grid is recorded in the drag doc as the third treatment and the tab bar keeps its row), and cross-zone keyboard.

Every AFTER below is drawn on branch `engine-fold` and gate-verified before this document was assembled, reproduced whole where a file was rewritten and as its complete diff where it was edited in place, so reviews run against what will land.

### Summary

Today a card drag and a tab drag run on different code that does the same job. After this plan they run on one engine: every list, row, grid, and band shares the same pick-up, collision, settle, and keyboard, and a future view type gets drag by mounting a zone. Cards keeps its look, neighbors gliding open to show where the card lands, and gains keyboard reorder inside a band. The Set-card row stops mis-scaling at embed zoom, a bug it has carried since the group engine alone was patched for it. Opening an empty band no longer nudges the content below it.

The design kit loses a second engine and gains its first DOM test of the engine. The tree ends about three hundred and twenty source lines lighter.

#### Constraints

- Gates, from the repo root: `npm run typecheck` · `npm run test` (ends in `Test Files N passed` / `Tests N passed`) · `npm run lint` — each exits 0. Read the summary line; `set -o pipefail` on any piped run.
- `Core/Views/Host/useViewInteractions.tsx`, `UIX/Interactions/tableDnd.tsx`, `UIX/Interactions/insertionDrag.tsx`, `Core/Views/Cards/CardValue.tsx`, `Core/Tiles/TileGrid.tsx`, `Core/Navigation/TabBar.tsx` do not change. The views' drop contract `(activeId, toZone, beforeId)` and `SortableZone`'s standalone props (`items`, `onReorder`, `disabled`, `axis`, `getItemLabel`) do not change shape.
- `Core/Views/Cards/CardsView.tsx` and `cards-view.css` are the only Core files the engine fold touches; `Core/Views/Bands/*` is touched only by the bundled empty-band fix.
- Ratified design, not to be re-opened during execution: the overlay stays as an optional `DragGroup` prop because a tile embed's body scrolls and tiles are placed by transform, so only a body portal escapes; zoom is read from the lifted element's `currentCSSZoom`; no padding is added to a hovered foreign band; the 12px interactive-press threshold is engine-wide; a zone with an explicit `id` renders its own container; cards gain same-band keyboard; a drop lands where the preview showed (releasing outside every zone lands in the last hovered zone); a same-slot landing commits nothing; drag-disclose arms only for cross-zone groups.
- Comments are `//` full lines; Biome formats on write (single quotes, no semicolons). No narration comments; the whys carried from the old files stay.
- Files come from the branch, not from this document: `git checkout engine-fold -- <path>` per task, then read the diff against this document's AFTER once.
- Never `git stash` in this repo. Commit on `main` with `--no-verify`, every commit message ending in `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`; `git checkout -- .claude/scripts` after each commit clears the post-commit hook's dirt.
- Never delete: `UIX/Interactions/drag.tsx`'s `reorder` (five consumers in Core and UIX, three in Showcase), `UIX/Cards/Card.tsx`'s `CardDropSlot`, `.cards-grid`'s `min-height` (the empty band's drop target).
- Refactor shape: the eight standalone surfaces outside Cards keep their reorder behavior; what they gain is the engine-wide 12px interactive threshold, the lifted item's pointer-events lock, the focusable-descendant key guard, and re-tracking on a wheel scroll, and the Set-card row gains the zoom division; `cardDrops.test.tsx` and `manualOrderDrops.test.tsx` pass unchanged.

#### Baseline

At `main` `4cae54e5d`, gates green: `npm run typecheck` · `npm run test` → 372 files, 4518 tests · `npm run lint`.

- `wc -l UIX/Interactions/engine.tsx UIX/Interactions/group.tsx UIX/Interactions/drag.tsx` → 442 + 683 + 52 = 1177 — becomes 849 + 18 = 867 (`group.tsx` gone)
- `grep -rln useGroupedDragItem Core UIX | wc -l` → 3 — drops to 1 after Phase 1 (`group.tsx` alone) and 0 after Phase 3
- `grep -rln "DragGroup\|useGroupedDragItem\|useDropSlot" Core UIX | wc -l` → 5 — stays 5 (`engine.test.tsx` takes `group.tsx`'s place)
- `ls UIX/Interactions/group.tsx` → exists — gone after Phase 3
- `grep -rn 'group="cards"' Core | wc -l` → 1 — drops to 0
- `grep -rn '<SortableZone' Core UIX --include='*.tsx' | grep -v test | wc -l` → 12 — unchanged
- `ls UIX/Interactions/engine.test.tsx` → none — exists, 11 tests
- `npx vitest run UIX/Interactions/` → 12 files, 140 tests — becomes 13 files, 153 tests
- `grep -rln data-empty Core | wc -l` → 0 — becomes 3
- `npx vitest run Core/Views/Bands/` → 4 files, 47 tests — becomes 4 files, 48 tests
- `npm run test` → 372 files, 4518 tests — becomes 373 files, 4532 tests
- `python3 .claude/scripts/loc.py | python3 -c "import json,sys; print(json.load(sys.stdin)['total'])"` → 69735 — drops to 69413 (−322)
- `git diff --numstat main..engine-fold` summed → −72 all lines; −308 with test files and `.claude/` excluded; −322 with comment and blank lines excluded as well (source, comments and tests excluded, the ledger's figure). The audit's band was −200 to −400.
- Worktree: `/Users/nathantaichman/The Studio/Projects/pommora-fold`, branch `engine-fold`, `main..HEAD` (eight commits: the fold, the band fix, the simplification, the review fixes, two document commits, the closing review edits, a wide-row test). Delete the worktree at closeout: `git worktree remove --force "/Users/nathantaichman/The Studio/Projects/pommora-fold"` (it holds untracked `node_modules` links) then `git branch -D engine-fold`. The run's accumulated time is reported at closure in place of start and end stamps.

#### Implementation Process

- [ ] **Phase 1** — One Engine
  - [ ] Task 1.1 — the engine and its tests
  - [ ] Task 1.2 — the façade and the drop-slot comment
  - [ ] Task 1.3 — Cards on the one engine
  - [ ] Review Checkpoint
- [ ] **Phase 2** — Empty Band Clearance
  - [ ] Task 2.1
  - [ ] Review Checkpoint
- [ ] `[Stop: Nathan's hand checks over every drag surface before the second engine is deleted — the CDP smoke informs the stop, only Nathan clears it]`
- [ ] **Phase 3** — Retire and Reconcile
  - [ ] Task 3.1 — delete `group.tsx`
  - [ ] Task 3.2 — the documents
  - [ ] Review Checkpoint

The phases run in sequence in one working tree; Phase 2 is its own phase because it shares no file with the fold, and every commit carries a pathspec so one phase's staged files never ride another's commit. Phase 3 waits on the stop. Agents: Sonnet at low effort copies files from the branch and runs gates (Tasks 1.1, 1.2, 1.3, 2.1, 3.1); Opus writes Task 3.2's living-document text and reviews; two Opus reviewers per phase, simplify then break.

### Phase 1 — One Engine

**GOAL:** `engine.tsx` becomes the one drag engine and Cards mounts on it. `group.tsx` stays on disk, un-imported, until the stop clears; the gates are green at the end of the phase with it present because nothing references it.

#### Task 1.1

**TASK:** Replace `engine.tsx` with the folded engine; retarget `engine.test.ts`'s displacement cases at `placeCell`; add `engine.test.tsx`, the kit's first DOM test of the engine.

**FILES:** `UIX/Interactions/engine.tsx`, `UIX/Interactions/engine.test.ts`, `UIX/Interactions/engine.test.tsx` (new)

**DEPENDENCIES:** Task 1.2 imports `DragGroup`, `SortableZone`, `useDropSlot`, `useZoneItem` from here; Task 1.3 compiles only once 1.2 lands. The three tasks share one commit.

**NOW**

`engine.tsx` (442 lines) is the single-zone engine: `Zone` holds one `ids` list and one element map, `track` picks the over slot by closest center against frozen rects with `HYSTERESIS`, `reflow` moves neighbors through `moveItem`, `settle` commits on `transitionend`, `liftKeyboard`/`onKeyboard` drive Space, arrows, Tab, and Escape, and `useZoneItem` returns the handle. It knows one zone, no container, no overlay, no zoom, no `resolveIndex`. `group.tsx` (683 lines) is the cross-list engine Cards uses: a zone registry keyed by band, row-banded `indexAt`, `cellAt` walking grid columns past the last card, a portal overlay driven by React state per pointermove, a `zoom` prop dividing transforms, `setPad` growing a hovered band, `capture: false`, a 12px interactive threshold, its own settle and its own `.drop-slot` portal, no keyboard, no DOM test.

**CHANGE**

- [ ] `git checkout engine-fold -- UIX/Interactions/engine.tsx UIX/Interactions/engine.test.ts UIX/Interactions/engine.test.tsx`
- [ ] Read the diff of each against this document's AFTER; they are byte-identical.

**AFTER** — `UIX/Interactions/engine.tsx`

```tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
type Bounds = { left: number; right: number; top: number; bottom: number }

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

function boundsOf(el: HTMLElement): Bounds {
  const r = el.getBoundingClientRect()
  return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }
}

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

/** Local px, so a zoomed root's items travel the screen distance the pointer did. */
const placeTransform = (target: Point, base: Box, zoom: number): string =>
  `translate3d(${px((target.x - base.left) / zoom)}, ${px((target.y - base.top) / zoom)}, 0)`

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
  const overlayOn = useRef(renderOverlay != null)
  overlayOn.current = renderOverlay != null

  const zones = useRef<ZoneMap>(new Map())
  const frozen = useRef(new Map<string, Frozen>())
  const bounds = useRef(new Map<string, Bounds>())
  const drag = useRef(blankDrag())
  const overlayEl = useRef<HTMLDivElement | null>(null)
  const pending = useRef<(() => void) | null>(null)
  const timer = useRef<number | null>(null)
  const stopScroll = useRef<(() => void) | null>(null)

  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeRect, setActiveRect] = useState<Box | null>(null)
  const [overZone, setOverZone] = useState<string | null>(null)
  const [over, setOver] = useState(-1)
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

  const widthOf = (zoneId: string): number => {
    const b = bounds.current.get(zoneId)
    return b ? b.right - b.left : 0
  }
  const syncBounds = (): void => {
    for (const [zid, z] of zones.current)
      if (z.container) bounds.current.set(zid, boundsOf(z.container))
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
    setOverZone(zoneId)
    setOver(idx)
    setDropState('dragging')
    return f
  }

  const track = (cx: number, cy: number): void => {
    const d = drag.current
    if (!d.active || !d.rect) return
    const { x: dx, y: dy } = travel(d, cx, cy)
    // Written straight to the element: a delta in context would re-render every item per pointermove. useZoneItem omits `transform` so React never clobbers this write.
    if (overlayEl.current)
      overlayEl.current.style.transform = `translate3d(${px(dx)}, ${px(dy)}, 0)`
    else if (d.el && !overlayOn.current)
      d.el.style.transform = `translate3d(${px((dx + d.compX) / d.zoom)}, ${px((dy + d.compY) / d.zoom)}, 0)`

    const from = d.pickZone
    const zid = crossZoneRef.current ? (zoneAt(cx, cy) ?? from) : d.zoneId
    const f = freeze(zid)
    if (!f) return
    const projX = d.rect.cx + dx
    const projY = d.rect.cy + dy
    const half = { x: d.rect.width / 2, y: d.rect.height / 2 }
    // A foreign zone's candidates are its rects plus one trailing cell, so a card can land past the last one.
    const count = f.rects.length + (zid === d.zoneId ? 0 : 1)
    const distTo = (i: number): number => {
      const b = f.rects[i]
      return b
        ? Math.hypot(b.cx - projX, b.cy - projY)
        : Math.hypot(f.tail.x + half.x - projX, f.tail.y + half.y - projY)
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
    const mapped = resolveRef.current ? resolveRef.current(zid, pick, d.id) : pick
    d.pickZone = zid
    d.pick = pick
    if (mapped !== d.mapped || zid !== from) {
      d.mapped = mapped
      const [zone, idx] = landingOf(d)
      setOverZone(zone)
      setOver(idx)
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
    setOverZone(null)
    setOver(-1)
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
        d.mapped = resolveRef.current ? resolveRef.current(d.zoneId, next, d.id) : next
        const [zone, idx] = landingOf(d)
        setOverZone(zone)
        setOver(idx)
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
    setOverZone(zoneId)
    setOver(idx)
    const target = targetCell(zoneId, idx)
    const el = overlayEl.current ?? d.el
    if (overlayEl.current && target && d.rect) {
      overlayEl.current.style.transition = `transform ${DEFAULT_FEEL.duration}ms ${DEFAULT_FEEL.easing}`
      overlayEl.current.style.transform = `translate3d(${px(target.x - d.rect.left)}, ${px(target.y - d.rect.top)}, 0)`
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
    el.style.transform = `translate3d(${px(t.x)}, ${px(t.y)}, 0)`
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
      const target = overZone === null ? null : targetCell(overZone, over)
      if (!base || !target) return atRest(animate)
      return { transform: placeTransform(target, base, d.zoom), hidden: false, animate: true }
    }
    const f = frozen.current.get(zoneId)
    const index = f ? f.ids.indexOf(id) : -1
    if (!f || index === -1) return atRest(animate)
    const target = placeCell(
      f.rects,
      zoneId === d.zoneId ? d.activeIdx : -1,
      zoneId === overZone ? over : -1,
      index,
      f.pitch,
      widthOf(zoneId),
    )
    return { transform: placeTransform(target, f.rects[index], d.zoom), hidden: false, animate }
  }

  const dropBox = (): Box | null => {
    const target = overZone === null ? null : targetCell(overZone, over)
    if (!activeRect || !target || over < 0) return null
    const { width, height } = activeRect
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
    [activeId, activeRect, overZone, over, dropState, keyboard],
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
        <div ref={(el) => engine.registerContainer(zoneId, el)} className={className}>
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
```

**AFTER** — `UIX/Interactions/engine.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { placeCell } from './engine'
import type { Box } from './shared'
import { keyboardNext, ARROW_DIRS } from './keyboard'

// A column of uniform 10px-tall slots at y = 0,10,20,...
const column = (n: number): Box[] =>
  Array.from({ length: n }, (_, i) => ({
    left: 0,
    top: i * 10,
    width: 100,
    height: 10,
    cx: 50,
    cy: i * 10 + 5,
  }))

// A `cols`-wide grid of 100px cells.
const grid = (count: number, cols: number): Box[] =>
  Array.from({ length: count }, (_, i) => {
    const c = i % cols
    const r = Math.floor(i / cols)
    return {
      left: c * 100,
      top: r * 100,
      width: 100,
      height: 100,
      cx: c * 100 + 50,
      cy: r * 100 + 50,
    }
  })

const cellIn = (rects: Box[], over: number, activeIdx: number, index: number): { y: number } =>
  placeCell(rects, activeIdx, over, index, 10, 100)

describe('placeCell — the displacement core', () => {
  it('shifts the passed-over items up when dragging forward', () => {
    const r = column(4)
    expect(cellIn(r, 2, 0, 1).y).toBe(0)
    expect(cellIn(r, 2, 0, 2).y).toBe(10)
    expect(cellIn(r, 2, 0, 3).y).toBe(30)
  })

  it('shifts the passed-over items down when dragging backward', () => {
    const r = column(4)
    expect(cellIn(r, 1, 3, 0).y).toBe(0)
    expect(cellIn(r, 1, 3, 1).y).toBe(20)
    expect(cellIn(r, 1, 3, 2).y).toBe(30)
  })

  it('is a no-op when over === active (hovering its own slot)', () => {
    const r = column(4)
    for (let i = 0; i < 4; i++) expect(cellIn(r, 1, 1, i).y).toBe(i * 10)
  })

  it('closes the gap when the active item is in another zone', () => {
    const r = column(4)
    expect(cellIn(r, -1, 1, 0).y).toBe(0)
    expect(cellIn(r, -1, 1, 2).y).toBe(10)
    expect(cellIn(r, -1, 1, 3).y).toBe(20)
  })

  it('opens a slot for a foreign item, and walks the grid past the last cell', () => {
    const g = grid(4, 2)
    expect(placeCell(g, -1, 0, 0, 100, 200)).toEqual({ x: 100, y: 0 })
    expect(placeCell(g, -1, 4, 3, 100, 200)).toEqual({ x: 100, y: 100 })
    expect(placeCell(g, -1, 0, 3, 100, 200)).toEqual({ x: 0, y: 200 })
  })
})

describe('keyboardNext — arrow navigation', () => {
  it('steps a vertical list down/up by one slot', () => {
    const r = column(5)
    expect(keyboardNext(r, 0, ARROW_DIRS.ArrowDown)).toBe(1)
    expect(keyboardNext(r, 2, ARROW_DIRS.ArrowUp)).toBe(1)
  })

  it('returns the same index when nothing lies ahead', () => {
    const r = column(5)
    expect(keyboardNext(r, 4, ARROW_DIRS.ArrowDown)).toBe(4)
    expect(keyboardNext(r, 0, ARROW_DIRS.ArrowUp)).toBe(0)
    expect(keyboardNext(r, 0, ARROW_DIRS.ArrowLeft)).toBe(0)
  })

  it('navigates a grid by row and column', () => {
    const g = grid(9, 3)
    expect(keyboardNext(g, 0, ARROW_DIRS.ArrowRight)).toBe(1)
    expect(keyboardNext(g, 0, ARROW_DIRS.ArrowDown)).toBe(3)
    expect(keyboardNext(g, 4, ARROW_DIRS.ArrowUp)).toBe(1)
    expect(keyboardNext(g, 4, ARROW_DIRS.ArrowLeft)).toBe(3)
    expect(keyboardNext(g, 4, ARROW_DIRS.ArrowRight)).toBe(5)
  })
})
```

**AFTER** — `UIX/Interactions/engine.test.tsx`

```tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { DragGroup, SortableZone, useZoneItem } from './engine'
import { firePointer, pressEscape, stubPointerCapture, stubRect } from './pointerHarness'
import { DEFAULT_FEEL } from '../Animations/feel'
import { SETTLE_FALLBACK } from './shared'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
stubPointerCapture()

// Two banded zones of 200px and an empty one below them, each card a 100px row.
const ZONES: Record<string, string[]> = { A: ['a1', 'a2'], B: ['b1'], C: [], D: ['d1'] }
const BAND: Record<string, number> = { A: 0, B: 200, C: 400, D: 600 }

let commitSpy: ReturnType<typeof vi.fn>
let reorderSpy: ReturnType<typeof vi.fn>
let resolve: (zoneId: string, index: number, activeId: string) => number | null
let withOverlay = false

function Item({ id }: { id: string }): React.JSX.Element {
  const { setNodeRef, style, handle } = useZoneItem(id)
  return <div ref={setNodeRef} data-id={id} style={style} {...handle} />
}

function Board(): React.JSX.Element {
  return (
    <DragGroup
      crossZone
      onCommit={(activeId, zone, index) => commitSpy(activeId, zone, index)}
      resolveIndex={(zone, index, activeId) => resolve(zone, index, activeId)}
      renderOverlay={withOverlay ? (activeId) => <span data-overlay={activeId} /> : undefined}
    >
      {Object.entries(ZONES).map(([zid, ids]) => (
        <SortableZone
          key={zid}
          id={zid}
          items={ids}
          className={`zone-${zid}`}
          onReorder={(activeId, overId) => reorderSpy(activeId, overId)}
        >
          {ids.map((id) => (
            <Item key={id} id={id} />
          ))}
        </SortableZone>
      ))}
    </DragGroup>
  )
}

let host: HTMLDivElement
let root: Root

beforeEach(async () => {
  commitSpy = vi.fn()
  reorderSpy = vi.fn()
  resolve = (_zone, index) => index
  withOverlay = false
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await mount()
})

const mount = async (): Promise<void> => {
  await act(async () => root.render(<Board />))
  for (const [zid, ids] of Object.entries(ZONES)) {
    const top = BAND[zid]
    const wide = zid === 'D'
    stubRect(host.querySelector(`.zone-${zid}`) as Element, {
      top,
      bottom: top + 200,
      right: wide ? 1000 : 200,
    })
    ids.forEach((id, i) => {
      stubRect(item(id), { top: top + i * 100, bottom: top + i * 100 + 100, left: 0, right: 200 })
    })
  }
}

afterEach(() => {
  pressEscape()
  act(() => root.unmount())
  host.remove()
})

const item = (id: string): HTMLElement => host.querySelector(`[data-id="${id}"]`) as HTMLElement

const dragTo = async (id: string, x: number, y: number): Promise<void> => {
  const r = item(id).getBoundingClientRect()
  await act(async () => {
    firePointer(item(id), 'pointerdown', { x: r.left + r.width / 2, y: r.top + r.height / 2 })
  })
  await act(async () => {
    firePointer(window, 'pointermove', { x, y })
  })
  await act(async () => {
    firePointer(window, 'pointerup', { x, y })
  })
}

const settle = (): Promise<void> =>
  act(async () => {
    await new Promise((r) => setTimeout(r, DEFAULT_FEEL.duration + SETTLE_FALLBACK + 20))
  })

const dropAt = async (id: string, x: number, y: number): Promise<void> => {
  await dragTo(id, x, y)
  await settle()
}

describe('the drag engine across zones', () => {
  it('reorders within the source zone and reports the slot it landed on', async () => {
    await dropAt('a1', 100, 150)
    expect(reorderSpy).toHaveBeenCalledExactlyOnceWith('a1', 'a2')
    expect(commitSpy).toHaveBeenCalledExactlyOnceWith('a1', 'A', 1)
  })

  it('writes nothing when the item is dropped back on its own slot', async () => {
    await dropAt('a1', 100, 60)
    expect(reorderSpy).not.toHaveBeenCalled()
    expect(commitSpy).not.toHaveBeenCalled()
  })

  it('drops before an item in a foreign zone', async () => {
    await dropAt('a1', 100, 210)
    expect(commitSpy).toHaveBeenCalledExactlyOnceWith('a1', 'B', 0)
    expect(reorderSpy).not.toHaveBeenCalled()
  })

  it('appends past the last item of a foreign zone', async () => {
    await dropAt('a1', 100, 358)
    expect(commitSpy).toHaveBeenCalledExactlyOnceWith('a1', 'B', 1)
  })

  it('appends to the right of the last card in a wide foreign row', async () => {
    await dropAt('a1', 300, 650)
    expect(commitSpy).toHaveBeenCalledExactlyOnceWith('a1', 'D', 1)
  })

  it('lands at index 0 in an empty zone', async () => {
    await dropAt('a1', 100, 450)
    expect(commitSpy).toHaveBeenCalledExactlyOnceWith('a1', 'C', 0)
  })

  it('snaps back and commits nothing when the landing is refused', async () => {
    resolve = (zone, index) => (zone === 'B' ? null : index)
    await dropAt('a1', 100, 210)
    expect(commitSpy).not.toHaveBeenCalled()
    expect(reorderSpy).not.toHaveBeenCalled()
  })

  it('glides the overlay to the landing cell, not to the release point', async () => {
    withOverlay = true
    await mount()
    await dragTo('a1', 100, 130)
    const overlay = document.querySelector('[data-overlay="a1"]')?.parentElement as HTMLElement
    expect(overlay.style.transform).toBe('translate3d(0.0px, 100.0px, 0)')
    await settle()
  })

  it('keeps the keyboard lift off the keypress that lifted it', async () => {
    await act(async () => {
      item('a1').dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    })
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    })
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    })
    await settle()
    expect(reorderSpy).toHaveBeenCalledExactlyOnceWith('a1', 'a2')
  })

  it('marks a disabled zone on its items from the first render', async () => {
    const box = document.createElement('div')
    document.body.appendChild(box)
    const local = createRoot(box)
    await act(async () =>
      local.render(
        <SortableZone items={['a', 'b']} disabled>
          <Item id="a" />
          <Item id="b" />
        </SortableZone>,
      ),
    )
    const handle = box.querySelector('[data-id="a"]') as HTMLElement
    expect(handle.getAttribute('tabindex')).toBe('-1')
    expect(handle.getAttribute('aria-disabled')).toBe('true')
    act(() => local.unmount())
    box.remove()
  })

  it('holds the commit until the drop animation settles', async () => {
    await dragTo('a1', 100, 150)
    expect(commitSpy).not.toHaveBeenCalled()
    await settle()
    expect(commitSpy).toHaveBeenCalledOnce()
  })
})
```

**VERIFY**

- [ ] `wc -l UIX/Interactions/engine.tsx` → 849.
- [ ] `grep -c "^// ── " UIX/Interactions/engine.tsx` → 10 (the labeled sections: types and scratch, registry, measurement, grid model, placement, context, lift/move/drop, keyboard, settle, overlay, context and hooks read in order).
- [ ] `grep -n "useSession\|@pommora/core" UIX/Interactions/engine.tsx` → nothing.

#### Task 1.2

**TASK:** The façade re-exports the one engine and keeps `reorder`; the drop-slot comment in `Card.tsx` stops naming a second engine.

**FILES:** `UIX/Interactions/drag.tsx`, `UIX/Cards/Card.tsx`

**NOW** — `UIX/Interactions/drag.tsx`

```tsx
import type { ReactNode } from 'react'
import { Zone, useDropSlot, useZoneItem } from './engine'
import './drop-chrome.css'
import { DragGroup, GroupZone, useGroupedDragItem } from './group'
import type { DragItem } from './shared'
import { moveItem } from '../Utilities/moveItem'

export type { DragItem }
export { DragGroup, useGroupedDragItem, useDropSlot }

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

type SortableZoneProps = {
  id?: string
  items: string[]
  onReorder?: (activeId: string, overId: string) => void
  disabled?: boolean
  axis?: 'x' | 'y'
  getItemLabel?: (id: string) => string
  group?: string
  className?: string
  children: ReactNode
}

export function SortableZone(props: SortableZoneProps): React.JSX.Element {
  if (props.group != null) {
    return (
      <GroupZone id={props.id ?? props.group} items={props.items} className={props.className}>
        {props.children}
      </GroupZone>
    )
  }
  const { id: _id, items, group: _group, className: _className, children, ...rest } = props
  return (
    <Zone ids={items} {...rest}>
      {children}
    </Zone>
  )
}

export function useDragItem(id: string): DragItem {
  return useZoneItem(id)
}
```

**CHANGE**

- [ ] `git checkout engine-fold -- UIX/Interactions/drag.tsx UIX/Cards/Card.tsx`

**AFTER** — `UIX/Interactions/drag.tsx`

```tsx
import { DragGroup, SortableZone, useDropSlot, useZoneItem } from './engine'
import './drop-chrome.css'
import type { DragItem } from './shared'
import { moveItem } from '../Utilities/moveItem'

export type { DragItem }
export { DragGroup, SortableZone, useDropSlot, useZoneItem as useDragItem }

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

**AFTER** — `UIX/Cards/Card.tsx` (the one changed line)

```diff
diff --git a/UIX/Cards/Card.tsx b/UIX/Cards/Card.tsx
index b3a024ff0..d46a72b75 100644
--- a/UIX/Cards/Card.tsx
+++ b/UIX/Cards/Card.tsx
@@ -88,7 +88,7 @@ export function CardTitle({
   )
 }
 
-/** The landing slot painted while a card is in flight; the grouped engine draws its own across zones. */
+/** The landing slot painted while a card is in flight, wherever in the group it would land. */
 export function CardDropSlot(): React.JSX.Element | null {
   const slot = useDropSlot()
   if (!slot) return null
```

**VERIFY**

- [ ] `grep -n "group" UIX/Interactions/drag.tsx` → nothing.
- [ ] `grep -rn "from './group'\|Interactions/group'" Core UIX` → nothing.

#### Task 1.3

**TASK:** Cards mounts on the one engine: the `DragGroup` loses its `zoom` prop, paints the landing slot through `CardDropSlot`, names its page-card zones by band key with a title label, and `PageCard` wires through `useDragItem`. The grid's list resets go with the `<ul>`.

**FILES:** `Core/Views/Cards/CardsView.tsx`, `Core/Views/Cards/cards-view.css`

**NOW**

`CardsView.tsx` imports `useGroupedDragItem`, mounts `<DragGroup onCommit zoom={effectiveZoom} crossZone resolveIndex renderOverlay>`, renders each band's cards inside `<SortableZone group="cards" id={g.key} items className="cards-grid card-grid is-fill">` (a `<ul>` from `GroupZone`), and `PageCard` calls `useGroupedDragItem(row.id)`. `cards-view.css`'s `.cards-grid` carries `list-style: none; margin: 0; padding: 0; min-height: 44px`. `onCardDrop` (the index → `beforeId` adapter) is unchanged by this plan.

**CHANGE**

- [ ] `git checkout engine-fold -- Core/Views/Cards/CardsView.tsx Core/Views/Cards/cards-view.css`

**AFTER** — the complete diff of both files

```diff
diff --git a/Core/Views/Cards/CardsView.tsx b/Core/Views/Cards/CardsView.tsx
index dfb07ae0e..cc5caa47d 100644
--- a/Core/Views/Cards/CardsView.tsx
+++ b/Core/Views/Cards/CardsView.tsx
@@ -34,7 +34,6 @@ import {
   reorder,
   SortableZone,
   useDragItem,
-  useGroupedDragItem,
 } from '@pommora/uix/Interactions/drag'
 import { cx } from '@pommora/uix/Utilities/cx'
 import { useElementZoom } from '@pommora/uix/Utilities/zoom'
@@ -487,7 +486,6 @@ export function CardsView({ host }: { host: ViewHostApi }): React.JSX.Element {
         )}
         <DragGroup
           onCommit={onCardDrop}
-          zoom={effectiveZoom}
           crossZone={canReassign || canRelocate}
           resolveIndex={interactions.structuralSlot}
           renderOverlay={(id, rect) => {
@@ -530,6 +528,7 @@ export function CardsView({ host }: { host: ViewHostApi }): React.JSX.Element {
             )
           }}
         >
+          <CardDropSlot />
           <BandDnd
             bands={interactions.bands}
             labelFor={bandLabel}
@@ -554,9 +553,9 @@ export function CardsView({ host }: { host: ViewHostApi }): React.JSX.Element {
                   fill
                 >
                   <SortableZone
-                    group="cards"
                     id={g.key}
                     items={g.items.map((r) => r.id)}
+                    getItemLabel={(id) => rowById.get(id)?.title ?? 'card'}
                     className="cards-grid card-grid is-fill"
                   >
                     {g.items.flatMap((row) => {
@@ -1065,7 +1064,7 @@ const PageCard = memo(function PageCard({
   draggable,
   allowInlineRemove,
 }: PageCardProps): React.JSX.Element {
-  const gdrag = useGroupedDragItem(row.id)
+  const gdrag = useDragItem(row.id)
   const drag = draggable ? gdrag : null
   // The boolean, not the object: `gdrag` is a fresh object per slot flip, so a handler keyed on it would rebuild on every drag frame — exactly when CardFace's memo has to hold.
   const isDragging = drag?.isDragging ?? false
```

```diff
diff --git a/Core/Views/Cards/cards-view.css b/Core/Views/Cards/cards-view.css
index 910ffcf9a..e85674e0a 100644
--- a/Core/Views/Cards/cards-view.css
+++ b/Core/Views/Cards/cards-view.css
@@ -31,9 +31,6 @@
 }
 
 .cards-grid {
-  list-style: none;
-  margin: 0;
-  padding: 0;
   min-height: 44px;
 }
```

**VERIFY**

- [ ] Gates green: `npm run typecheck` · `npm run test` → 373 files, 4531 tests (4532 once Phase 2 lands) · `npm run lint`. `group.tsx` is still on disk and imports nothing this phase changed, so the gates do not see it.
- [ ] `npx vitest run UIX/Interactions/ Core/Views/` → `cardDrops.test.tsx` and `manualOrderDrops.test.tsx` pass unchanged.
- [ ] `grep -rln useGroupedDragItem Core UIX` → `UIX/Interactions/group.tsx` alone; `grep -rn 'group="cards"' Core | wc -l` → 0.
- [ ] Commit: `git commit --no-verify -m "refactor(uix): one drag engine — the zone registry, cellAt, resolveIndex, and the overlay fold into engine.tsx; Cards mounts on it" -- UIX/Interactions UIX/Cards Core/Views/Cards` then `git checkout -- .claude/scripts`.

#### Review Checkpoint

- [ ] Two Opus reviewers on the phase's commit: simplification first, then break; findings fixed before Phase 3.
- [ ] Baseline lines re-run: engine 849, `useGroupedDragItem` in one file, `<SortableZone` 12, `UIX/Interactions/` 13 files / 153 tests.
- [ ] A Sonnet CDP smoke from the repo root (`env -u ELECTRON_RUN_AS_NODE POMMORA_DEBUG_PORT=9333 npm run dev`; real pointer input through `Input.dispatchMouseEvent`; every reorder dragged back) over the list in Final Verification's user pass, reporting PASS/FAIL per check — until Nathan says he is back, when the list is his. Smoke rules: use a collection whose grouped values drive no file automation (during planning a drop into a `Closed` band moved the page into `II. Archive/` and the revert left a duplicate file); log the target card's rect, the computed trailing cell, and the pointer for every cross-band drop; drag every move back and confirm the DOM order before the next check; never run `rm` or `mv` in the Nexus.

### Phase 2 — Empty Band Clearance

**GOAL:** Opening a band with nothing inside adds no clearance beneath its head, so toggling an empty group no longer shifts the content below it by the band's clearance. A phase of its own because it shares no file with the fold and lands as one scoped commit.

#### Task 2.1

**TASK:** `ViewGroupBand` tells `GroupBand` when its group holds no items and no sub-bands; `GroupBand` marks the band row `data-empty`; the stylesheet zeroes the row's bottom clearance for it the way it already does for a collapsed row.

**FILES:** `Core/Views/Bands/GroupBand.tsx`, `Core/Views/Bands/ViewGroupBand.tsx`, `Core/Views/Bands/group-band.css`, `Core/Views/Bands/GroupBand.test.tsx`

**NOW**

`.group-band-row` carries `padding-bottom: var(--band-clearance)` whenever the band is open, and `[data-disclose]` (collapsed) zeroes it; an empty band opening therefore grows by the clearance with nothing beneath it. In Cards the empty grid also keeps its 44px `min-height` as the drop target, which stays.

**CHANGE**

- [ ] `git checkout engine-fold -- Core/Views/Bands/GroupBand.tsx Core/Views/Bands/ViewGroupBand.tsx Core/Views/Bands/group-band.css Core/Views/Bands/GroupBand.test.tsx`

**AFTER** — the complete diff

```diff
diff --git a/Core/Views/Bands/GroupBand.test.tsx b/Core/Views/Bands/GroupBand.test.tsx
index a3154f82d..f3ebdaf4c 100644
--- a/Core/Views/Bands/GroupBand.test.tsx
+++ b/Core/Views/Bands/GroupBand.test.tsx
@@ -8,7 +8,7 @@ import { EMPTY_ASSET_MAP, type CollectionNode } from '@pommora/core/Nexus/tree'
 import type { ResolvedGroup } from '@pommora/core/Views/viewRow'
 import type { GroupConfig, SavedView } from '@pommora/core/Views/views'
 import type { ValueContext } from '../../Properties/valueContext'
-import { resolveBandHead } from './GroupBand'
+import { GroupBand, resolveBandHead } from './GroupBand'
 import { mountEachTest } from '../../Testing/viewHarness'
 
 const schema: PropertyDefinition[] = [
@@ -213,3 +213,21 @@ describe('resolveBandHead — Context grouping', () => {
     expect(head.label).toBe('ghost')
   })
 })
+
+describe('GroupBand — an empty band', () => {
+  const mount = (empty: boolean): HTMLElement => {
+    act(() =>
+      root.render(
+        <GroupBand glyph="G" collapsed={false} empty={empty} onToggle={() => {}}>
+          {null}
+        </GroupBand>,
+      ),
+    )
+    return host.querySelector('.group-band-row') as HTMLElement
+  }
+
+  it('marks its row so opening it adds no clearance', () => {
+    expect(mount(true).hasAttribute('data-empty')).toBe(true)
+    expect(mount(false).hasAttribute('data-empty')).toBe(false)
+  })
+})
diff --git a/Core/Views/Bands/GroupBand.tsx b/Core/Views/Bands/GroupBand.tsx
index b8027a7b4..924254045 100644
--- a/Core/Views/Bands/GroupBand.tsx
+++ b/Core/Views/Bands/GroupBand.tsx
@@ -155,6 +155,7 @@ interface BandDragHandle {
 export function GroupBand({
   glyph,
   collapsed,
+  empty = false,
   onToggle,
   showAdd = false,
   onAdd,
@@ -169,6 +170,8 @@ export function GroupBand({
 }: {
   glyph: ReactNode
   collapsed: boolean
+  /** Opening a band with nothing inside adds no clearance beneath its head. */
+  empty?: boolean
   onToggle: () => void
   showAdd?: boolean
   onAdd?: () => void
@@ -199,6 +202,7 @@ export function GroupBand({
           className="group-band-row"
           ref={rowRef}
           data-disclose={collapsed ? '' : undefined}
+          data-empty={empty ? '' : undefined}
           style={indent ? { paddingLeft: indent } : undefined}
         >
           {/* biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics */}
diff --git a/Core/Views/Bands/ViewGroupBand.tsx b/Core/Views/Bands/ViewGroupBand.tsx
index d60985688..b9008da52 100644
--- a/Core/Views/Bands/ViewGroupBand.tsx
+++ b/Core/Views/Bands/ViewGroupBand.tsx
@@ -61,6 +61,7 @@ export function ViewGroupBand({
     <GroupBand
       glyph={glyph}
       collapsed={collapsed}
+      empty={group.items.length === 0 && !group.children?.length}
       onToggle={onToggle}
       showAdd={group.kind === 'structural-set'}
       onAdd={onAdd}
diff --git a/Core/Views/Bands/group-band.css b/Core/Views/Bands/group-band.css
index d5c3c0161..d151b07a3 100644
--- a/Core/Views/Bands/group-band.css
+++ b/Core/Views/Bands/group-band.css
@@ -7,7 +7,8 @@
   padding-bottom: var(--band-clearance);
   transition: padding-bottom var(--drop-outline-beat, var(--duration-fast)) var(--ease-base);
 }
-.group-band-row[data-disclose] {
+.group-band-row[data-disclose],
+.group-band-row[data-empty] {
   padding-bottom: 0;
 }
 [data-reveal] > * > .group-band:first-child > .group-band-row {
```

**VERIFY**

- [ ] `npx vitest run Core/Views/Bands/` → 4 files, 48 tests.
- [ ] `grep -rln data-empty Core | wc -l` → 3.
- [ ] Gates green; commit: `git commit --no-verify -m "fix(views): opening an empty band adds no clearance beneath its head" -- Core/Views/Bands` then `git checkout -- .claude/scripts`.
- [ ] User confirms (or the CDP smoke): in a Table view, an empty band's row reads `padding-bottom: 0px` open and collapsed, and a band with rows keeps its clearance.

#### Review Checkpoint

- [ ] Two Opus reviewers on the phase's commit, simplify then break; `npm run test` → 373 files, 4532 tests.
- [ ] Nathan, or the CDP smoke until he returns: toggling an empty band in a Table view and in a Cards view moves nothing below it but the band's own 44px drop area in Cards.

### Phase 3 — Retire and Reconcile

**GOAL:** The second engine leaves the tree and every document reads one engine.

#### Task 3.1

**TASK:** Delete `group.tsx`.

**FILES:** `UIX/Interactions/group.tsx` (delete)

**NOW**

683 lines, imported by nothing since Task 1.2.

**CHANGE**

- [ ] `git rm UIX/Interactions/group.tsx`

**AFTER**

The file is gone. `drag.tsx` re-exports `DragGroup`, `SortableZone`, `useDropSlot`, and `useDragItem` from `engine.tsx`; every former `group.tsx` consumer (`CardsView.tsx`) already imports those.

**VERIFY**

- [ ] `grep -rn "group.tsx\|GroupZone\|useGroupedDragItem" Core UIX Showcase` → nothing.
- [ ] Gates green; `npm run test` → 373 files, 4532 tests.
- [ ] Commit: `git commit --no-verify -m "refactor(uix): the second drag engine is retired" -- UIX/Interactions/group.tsx` then `git checkout -- .claude/scripts`.

#### Task 3.2

**TASK:** The drag doc, the kit table, and the audit read one engine; the living documents record the arc.

**FILES:** `.claude/Features/PommoraDND.md`, `.claude/Features/PommoraUIX.md`, `.claude/Features/ViewTypesPM.md`, `.claude/Planning/Codebase Audit — Report.md`, `.claude/ContextPM.md`, `.claude/HistoryPM.md`

**NOW**

PommoraDND's §The Seam lists `DragGroup` as "a set of zones … with a portal overlay" and `useGroupedDragItem`; its principle bullet says the single-zone engine binds under pointer capture while the group binds on the window; §Displacement describes two engines and an overlay "to escape column clipping"; §Constraints names a `resolveIndex` veto "on the cross-list engine"; Known Issues says keyboard "stops at the single-zone engine". PommoraUIX's kit table names `GroupZone`, `useGroupedDragItem`, `arraySwap` (already gone), and a separate "Zone engine" row. The audit's topic 8 carries change 2 (the fold) and change 6 (record the tile grid; the tab bar), its Found paragraph the two-engines sentence, its Deletes line "about 450 lines of the second reorder engine", line 45 "two engines to fold", the topic heading "Engines", and Appendix A rows R-52 and R-58. ViewTypesPM's Cards paragraph says "the card engine reports the landing index".

**CHANGE**

- [ ] `git checkout engine-fold -- .claude/Features/PommoraDND.md .claude/Features/PommoraUIX.md .claude/Features/ViewTypesPM.md ".claude/Planning/Codebase Audit — Report.md"`
- [ ] `ContextPM.md` › Current Focus: the sentence "The Table and Cards renderers draw over one interaction layer, `Core/Views/Host/useViewInteractions.tsx`, so a List view supplies a policy object and its presentation and inherits every band, drop, menu, and ghost behavior." becomes "The Table and Cards renderers draw over one interaction layer, `Core/Views/Host/useViewInteractions.tsx`, and every drag surface over one engine, `UIX/Interactions/engine.tsx`, so a List view supplies a policy object and its presentation and inherits every band, drop, menu, ghost, and drag behavior." The Lessons bullet "A whole-surface drag handle steals its own children's clicks. The drag engine captures the pointer on pointerdown, …" becomes "… The gesture captures the pointer once a drag activates, so an interactive descendant that must not lift stops pointerdown — a container only on its own empty space, so the title still drags."
- [ ] `HistoryPM.md`: add the index row `| <date> | PM-137 | One Drag Engine |` and the entry below, with the commit range and the diff figure from the run.

**AFTER** — the four drawn documents

```diff
diff --git a/.claude/Features/PommoraDND.md b/.claude/Features/PommoraDND.md
index 4cacf3fd8..2bd32c18d 100644
--- a/.claude/Features/PommoraDND.md
+++ b/.claude/Features/PommoraDND.md
@@ -11,14 +11,15 @@ One gesture runs at a time. A press becomes a drag only once it travels far enou
 
 `drag.tsx` is the sort-engine seam:
 
-- **`SortableZone`** — one sortable list: standalone by default (list, grid, table, each tree level), or a member of a `DragGroup` when passed `group`.
-- **`DragGroup`** — a set of zones that hand items between each other, with a portal overlay.
-- **`useDragItem(id)`** / **`useGroupedDragItem(id)`** — wire an item, returning the handle, the node ref, and the transform style.
+- **`SortableZone`** — one sortable list: standalone by default (a list, a row, a grid), or a member of the `DragGroup` above it. A zone given an `id` is addressable from the group's other zones and renders its own container, so an empty band is still a drop target.
+- **`DragGroup`** — the engine and its zone registry: a set of zones that hand items between each other, reporting each landing as `(activeId, toZone, toIndex)`, with an optional portal overlay for the lifted item.
+- **`useDragItem(id)`** — wires an item, returning the handle, the node ref, and the transform style.
+- **`useDropSlot()`** — the box the lifted item would land in, for whoever paints it.
 - **`reorder(items, activeId, overId)`** — the array commit helper a zone's `onReorder` applies.
 
 ### Core Principles
 
-- **One pointer sensor** handles mouse, trackpad, pen, and touch through Pointer Events; the single-zone engine binds to the dragged element under pointer capture, while the group and insertion-line surfaces bind on the window.
+- **One pointer sensor** handles mouse, trackpad, pen, and touch through Pointer Events over the one gesture skeleton, which listens on the window and captures the pointer once a drag activates, so a sub-threshold tap keeps its click.
 - **Measure once.** Item rects are frozen at drag start, collision runs against the frozen snapshot, the items array is never mutated mid-drag, and the reorder commits exactly once, on drop; a scroll or structural change invalidates the snapshot and the next move re-measures once.
 - **Closest-center collision with hysteresis.** The over-slot is the nearest item center to the projected drag point, and switching slots must clear a small threshold, so a boundary never flickers.
 - **One strategy-agnostic shift.** Displacement is a rects-reflow — each non-dragged item moves to the slot it will occupy — covering vertical lists, horizontal rows, and wrapping grids alike.
@@ -26,7 +27,9 @@ One gesture runs at a time. A press becomes a drag only once it travels far enou
 
 ### Displacement
 
-The first of the engine's two drop treatments: neighbors reflow to open the gap the item will land in. Two engines sit behind the seam for it, sharing types and the measure-once, decide-then-animate model. The **single-zone** engine (`engine.tsx`) serves lists, grids, tables, and each tree level, where the dragged item moves in place with its transform following the pointer. The **cross-list** engine (`group.tsx`) serves the Cards view: a `DragGroup` owns the one active drag across its zones, the lifted card renders as a fixed portal overlay under the cursor to escape column clipping, and every column shifts by one slot-pitch to show where the card would land. Either engine can name the box the item will land in — the cross-list one paints it itself, the single-zone one hands it to whoever asked through `useDropSlot` — and both wear the one `.drop-slot` rect, which the card chassis renders as `CardDropSlot` and the tile grid as its tile placement.
+The first of the engine's two drop treatments: neighbors reflow to open the gap the item will land in. One engine (`engine.tsx`) serves lists, rows, grids, and the Cards view's bands. A lift freezes a zone's geometry as it is first entered and shifts it by its reference element's movement on scroll and disclosure, never re-measuring under the drag's own transforms. The over slot is the candidate center nearest the lifted item's projected center, with hysteresis; a foreign zone's candidates are its items plus one trailing cell walked past the last item along the grid's own columns, so an item can land at a band's end or in an empty band, and a `DragGroup`'s `resolveIndex` can refuse a slot, in which case the preview and the drop both fall back to the lifted slot. One placement rule moves every item: the zone's order without the lifted item, the lifted item spliced in at the over slot when this is the zone under it, and each item's transform the distance from its frozen rect to that cell, divided by the surface's own CSS zoom, which the engine reads off the lifted element. The lifted item moves in place with its transform following the pointer; a `DragGroup` given `renderOverlay` renders it instead as a fixed portal overlay under the cursor, which the Cards view uses so a card can leave a tile embed's scrolling body. The engine names the box the item will land in through `useDropSlot`, and the card chassis paints it as `CardDropSlot` in the one `.drop-slot` rect.
+
+The tile grid's placement preview is a third treatment beside these two: a two-dimensional layout editor (`Core/Tiles/TileGrid.tsx`) that moves and resizes tiles by edge relations over its own computed geometry, sharing only the gesture skeleton and the `.drop-slot` chrome.
 
 ### Insertion Line
 
@@ -49,16 +52,16 @@ The tunables are custom properties declared at `:root`, overridable on any ances
 
 ### Constraints & Accessibility
 
-- **Constraints** — an `axis` lock on the single-zone engine, and a `resolveIndex` veto on the cross-list engine that refuses a landing slot outside the dragged item's run.
+- **Constraints** — an `axis` lock per zone, a `resolveIndex` veto on the group that refuses a landing slot outside the dragged item's run, and a press that begins on an interactive descendant (a button, a field, a value chip marked `data-drag-slop`) needs 12px of travel to lift, so a tap-wobble opens the control instead.
 - **Announcements** — an assertive ARIA live region announces every product drag's pick-up and drop, pointer or keyboard, through the one `announce` primitive.
-- **Keyboard** — Space or Enter lifts, arrow keys move on a geometric next-slot getter covering list, row, and grid, Space, Enter, or Tab drops, and Esc cancels; focus returns to the item on drop. Items are focusable and the handle role is `button`.
+- **Keyboard** — Space or Enter on the item lifts, arrow keys move within the item's own zone on a geometric next-slot getter covering list, row, and grid, Space, Enter, or Tab drops, and Esc cancels; focus returns to the item on drop. Items are focusable and the handle role is `button`; a focusable descendant's keys are its own.
 
 ---
 
 #### Known Issues
 
 - **A sub-perceptible snap at the commit** can show on a gap item under aggressive drag-then-drop, from in-flight transition timing and sub-pixel rounding. The `transitionend` commit mitigates it; the residual is accepted.
-- **Keyboard access stops at the single-zone engine.** The cross-list engine and every insertion-line surface are pointer-only.
+- **Keyboard access stops at the zone.** A cross-zone move and every insertion-line surface are pointer-only.
 
 #### Pending
```

```diff
diff --git a/.claude/Features/PommoraUIX.md b/.claude/Features/PommoraUIX.md
index 6a2a67b88..5793f2973 100644
--- a/.claude/Features/PommoraUIX.md
+++ b/.claude/Features/PommoraUIX.md
@@ -315,8 +315,7 @@ The elements that draw and frame a stored image — `AssetImage`, `ImagePicker`,
 
 | Title        | Export                                                  | What it is                                             |
 | ------------ | ------------------------------------------------------- | ------------------------------------------------------ |
-| Drag engine  | `SortableZone` · `DragGroup` · `GroupZone` · `useDragItem` · `useGroupedDragItem` · `reorder` · `arraySwap` | The in-house DND. |
-| Zone engine  | `Zone` · `useZoneItem` · `reflow`                       | The layout engine beneath the sortable zone (`engine.tsx`). |
+| Drag engine  | `DragGroup` · `SortableZone` · `useDragItem` · `useDropSlot` · `reorder` | The in-house DND: one engine (`engine.tsx`) behind the `drag.tsx` façade. |
 | Drop chrome  | `DropLine` · `DragGhost` · `.drop-slot` · `drop-chrome.css` · `ghost-create.css` | The insertion line, dot, the landing slot, and the glass drag chip. |
 | Disclose     | `beginDragDisclose` · `registerDiscloseTarget`          | Hover-open while dragging.                             |
 | Snapshot     | `useDragSnapshot`                                       | The list held still for a drag's duration.             |
```

```diff
diff --git a/.claude/Features/ViewTypesPM.md b/.claude/Features/ViewTypesPM.md
index 7bc511d1e..9795c96b7 100644
--- a/.claude/Features/ViewTypesPM.md
+++ b/.claude/Features/ViewTypesPM.md
@@ -119,7 +119,7 @@ Cards never indent: structural grouping renders one flat band per top-level Set
 
 #### II. Drag & Menus
 
-Cards reorder within their band by displacement; the card engine reports the landing index, the view turns it into the shared `(activeId, toZone, beforeId)` drop, and the interactions hook writes the view's `manual_order` the pipeline reads as its lowest-priority tiebreaker; two effective sort criteria or a Location sort retire it. A card dropped across location bands moves the page into that band's Set at its landing slot through the same route. Band drag is the shared insertion-line gesture without a nest zone — every drop is a reorder, writing the view's band order, or the container's Set order under Sort By: Location. A card's right-click menu holds **Add Property** over the page menu: Edit Image when a banner is set, Open, Rename, Edit Icon, New Page, Move To ▸, Copy Link, Copy Path, Delete. New Page creates after the anchor, and the hover ghost grows a skeleton card at the next flow slot with neighbors making room.
+Cards reorder within their band by displacement; the drag engine reports the landing index, the view turns it into the shared `(activeId, toZone, beforeId)` drop, and the interactions hook writes the view's `manual_order` the pipeline reads as its lowest-priority tiebreaker; two effective sort criteria or a Location sort retire it. A card dropped across location bands moves the page into that band's Set at its landing slot through the same route. Band drag is the shared insertion-line gesture without a nest zone — every drop is a reorder, writing the view's band order, or the container's Set order under Sort By: Location. A card's right-click menu holds **Add Property** over the page menu: Edit Image when a banner is set, Open, Rename, Edit Icon, New Page, Move To ▸, Copy Link, Copy Path, Delete. New Page creates after the anchor, and the hover ghost grows a skeleton card at the next flow slot with neighbors making room.
 
 #### II. Card Tokens
```

```diff
diff --git "a/.claude/Planning/Codebase Audit \342\200\224 Report.md" "b/.claude/Planning/Codebase Audit \342\200\224 Report.md"
index ef099a72b..9d0bafc07 100644
--- "a/.claude/Planning/Codebase Audit \342\200\224 Report.md"	
+++ "b/.claude/Planning/Codebase Audit \342\200\224 Report.md"	
@@ -42,7 +42,7 @@ Nathan's scarce resource is decisions; the implementation is Claude's. What rema
 - `Core/Session` and `Core/Navigation`: identity-first references are exactly what sync needs. Session is where the external-edit reload has to land, and it appears in no Features doc.
 - `Core/Actions`: portable menu models and the one door every menu opens through; a second host owes it only the native `menu` channel.
 - `Desktop/Platform`, `Desktop/Store`, `Desktop/Bridge`, `Desktop/FileWatch`: where every safety guarantee actually lives. Desktop is 2,027 lines, readable end to end in an afternoon.
-- `UIX/Interactions`, `UIX/Symbols`, `UIX/Theme`: one harness to keep, two engines to fold, no touch awareness.
+- `UIX/Interactions`, `UIX/Symbols`, `UIX/Theme`: one harness to keep, no touch awareness.
 - `Core/MarkdownPM/Engine` and `Core/MarkdownPM/Links`: the pure engine is the asset that ports.
 
 **Matters for the product.** Shapes what the app can do; can be reworked freely with no cross-device consequence:
@@ -88,22 +88,21 @@ The most reachable piece: **when a file changes outside Pommora, the open page n
 
 **Findings:** R-07, R-09.
 
-##### 8. UIX: Engines, Bundle, Touch, Filing
+##### 8. UIX: Bundle, Touch, Filing
 
-**Lenses and state:** Gates Mobile · touch, Foundation risk, Debt, Decision, Asymmetry, Duplication, Performance, Filing. **Effort:** Small to large. **Deletes:** About 450 lines of the second reorder engine, 60 lines of small duplications, 490 relocated.
+**Lenses and state:** Gates Mobile · touch, Foundation risk, Debt, Decision, Asymmetry, Duplication, Performance, Filing. **Effort:** Small to large. **Deletes:** 60 lines of small duplications, 490 relocated.
 
-**Found.** The strongest-built part of the codebase, and the numbers aren't soft: one pointer harness every drag surface funnels through, one picker base, one menu vocabulary, zero raw colors, a hard import boundary that holds. Two things would resist a second host. Nothing in the kit ever asks what kind of pointer is driving it, in a kit whose reveal affordances are all hover-gated, so on a touch device a class of controls is simply absent. And reordering by dragging is implemented twice behind one façade, the larger version serving exactly one screen and carrying no keyboard support, while the single-zone engine serving the other twelve call sites has no DOM test of its own. Alongside: the design kit carries Pommora's application vocabulary in four files, and the drawn caret is split across three packages with UIX styling CodeMirror's classes directly.
+**Found.** The strongest-built part of the codebase, and the numbers aren't soft: one pointer harness every drag surface funnels through, one picker base, one menu vocabulary, zero raw colors, a hard import boundary that holds. Two things would resist a second host. Nothing in the kit ever asks what kind of pointer is driving it, in a kit whose reveal affordances are all hover-gated, so on a touch device a class of controls is simply absent. Alongside: the design kit carries Pommora's application vocabulary in four files, and the drawn caret is split across three packages with UIX styling CodeMirror's classes directly.
 
 **Change.**
 
 1. Add a coarse-pointer branch that pins hover reveals visible, a press-delay beside the travel threshold in the gesture harness, and a long-press route to dwell-to-create. *(L; after D-7)*
-2. Fold cross-zone support into the single-zone engine as a zone registry and retire the second. The fold is three axes — the registry, the collision model, and the overlay presentation — and cross-zone keyboard is its own step after it; the views consume one drop contract, so the fold touches only Cards' adapter. *(L; −200 to −400 lines)*
-3. Move the drawn caret into one `Core/Caret` with both geometry producers and both stylesheets; UIX keeps only the four caret tokens. *(M; ~490 lines relocated)*
-4. Move the property drop model to `Core/Properties` and the on-disk color key names beside the schemas that persist them; parameterize the three class-name queries. *(M; after D-9; ~78 lines relocated)*
-5. Generate the kebab token republish from the source list; one Bloom factory. *(S)*
-6. Record the tile grid as a third drag treatment in the drag doc; put the tab bar's window drag on the shared harness. *(S; ~20 lines)*
+2. Move the drawn caret into one `Core/Caret` with both geometry producers and both stylesheets; UIX keeps only the four caret tokens. *(M; ~490 lines relocated)*
+3. Move the property drop model to `Core/Properties` and the on-disk color key names beside the schemas that persist them; parameterize the three class-name queries. *(M; after D-9; ~78 lines relocated)*
+4. Generate the kebab token republish from the source list; one Bloom factory. *(S)*
+5. Put the tab bar's window drag on the shared harness. *(S; ~20 lines)*
 
-**Findings:** R-52, R-54, R-55, R-56, R-57, R-58.
+**Findings:** R-54, R-55, R-56, R-57, R-58.
 
 ##### 9. Shell Debt
 
@@ -187,12 +186,11 @@ Every open finding and where it lands. Kind: **FR** foundation risk, **D** decis
 | R-05 | 1     | D    | File History exists only on the machine that made the edit, and it is the sole record of an overwritten external change            | `Core/Pages/fileHistory.ts, Desktop/Store/versionsDb.ts`                                                              |
 | R-07 | 2     | FR   | An external edit never reaches an open page, and the next keystroke writes over it                                                 | `Core/Session/nexusSlice.ts, Core/Session/mutationSlice.ts, Core/Nexus/watchPatch.ts`                                 |
 | R-09 | 2     | FR   | Identity re-minting is adjudicated from non-syncing device state and from file birth time, then written into files that sync       | `Core/Nexus/remint.ts, Core/Nexus/remintLedger.ts, Desktop/Store/open.ts`                                             |
-| R-52 | 8     | Dt   | Two reorder engines behind one façade, the larger serving one screen                                                               | `UIX/Interactions/engine.tsx, UIX/Interactions/group.tsx, UIX/Interactions/drag.tsx`                                  |
 | R-54 | 8     | FR   | Zero coarse-pointer awareness in a kit whose reveal affordances are all hover-gated                                                | `UIX/Interactions/HoverRemove.tsx, UIX/Interactions/revealBar.ts, UIX/Interactions/OverScroll.tsx`                    |
 | R-55 | 8     | Dt   | The drawn caret is split across three packages, and the design kit styles CodeMirror                                               | `UIX/Theme/nativeCaret.ts, UIX/Theme/caret.css, UIX/Theme/text-selection.css`                                         |
 | R-56 | 8     | Dt   | Pommora's application vocabulary sits inside the design kit                                                                        | `UIX/Interactions/frameDndModel.ts, Core/Views/hiddenFrameModel.ts, UIX/Interactions/revealBar.ts`                    |
 | R-57 | 8     | P    | Small UIX duplications: a hand-maintained kebab token republish and a second Bloom factory                                         | `UIX/Glass/glass-window.tsx, UIX/Glass/glass-surface.tsx`                                                             |
-| R-58 | 8     |      | The tile grid is a third drop treatment, and the tab bar hand-rolls the harness                                                    | `Core/Tiles/TileGrid.tsx, Core/Navigation/TabBar.tsx`                                                                 |
+| R-58 | 8     |      | The tab bar hand-rolls the harness for its window drag                                                                             | `Core/Navigation/TabBar.tsx`                                                                                          |
 | R-59 | 9     | D    | Two tab models in two folders, with types crossing both ways                                                                       | `Core/Navigation/tabsModel.ts, Core/Interface/Windows/windowTabs.ts, Core/Navigation/TabBar.tsx`                      |
 | R-60 | 9     | Dt   | Four warm caches, one shared helper, two adopters                                                                                  | `Core/Navigation/warmTabs.ts, Core/Interface/Windows/windowCache.ts, Core/Interface/Glance/GlancePane.tsx`            |
 | R-61 | 9     | Dt   | A new user-facing setting needs three edits, and only two are checked by the compiler                                              | `Core/Settings/personalization.ts, Core/Settings/codec.ts, Core/Settings/SettingsWindow.tsx`                          |
```

**AFTER** — the `HistoryPM.md` entry (figures filled at closeout)

```markdown
#### PM-137 || One Drag Engine
**DATE:** <date>

`UIX/Interactions/engine.tsx` became the one drag engine behind the design kit's façade and `group.tsx`, the cross-list engine that served Cards alone, retired. The engine gained the zone registry a `DragGroup` holds, a trailing landing cell walked along a foreign grid's own columns so an item can land at a band's end or in an empty band, the `resolveIndex` veto, and an optional portal overlay for a lifted item that must leave a clipping host; it reads the surface's CSS zoom off the lifted element, so the Set-card row stopped mis-scaling at embed zoom, and cards gained same-band keyboard reorder. Every drag surface freezes geometry at lift and shifts it by its container's movement, and a drop lands where the preview showed. `engine.test.tsx` is the kit's first DOM test of the engine. Opening an empty band no longer adds clearance beneath its head.

- **Commits:** `<first>^..<last>`
- **Diff:** Net <n> (source, comments and tests excluded)
```

**VERIFY**

- [ ] Open each of the five documents and read the changed paragraphs once in place; no paragraph contradicts its neighbor.
- [ ] `grep -rn "useGroupedDragItem\|GroupZone\|group.tsx\|cross-list engine\|single-zone engine" .claude/Features .claude/ContextPM.md` → nothing (HistoryPM's older entries keep their wording).
- [ ] Commit: `git commit --no-verify -m "docs(pommora): one drag engine — the drag doc, the kit table, the audit, and the living documents" -- .claude` then `git checkout -- .claude/scripts`.

#### Review Checkpoint

- [ ] Two Opus reviewers on the phase's commits, simplify then break; the six documents read once in place.
- [ ] `ls UIX/Interactions/group.tsx` → gone; every Baseline line at its after value.

### Completion Criteria

**Conformance**

- [ ] One engine: `ls UIX/Interactions/group.tsx` → gone; `grep -rn "createContext" UIX/Interactions/engine.tsx | wc -l` → 2 (the engine and the zone id), and no displacement surface outside `engine.tsx` computes a collision.
- [ ] Nothing changed outside what the plan named: `git diff --name-only <baseline>..HEAD` is the twelve source files, the four drawn documents, `ContextPM.md`, and `HistoryPM.md`.
- [ ] The frozen files are untouched: `git diff <baseline>..HEAD --stat -- Core/Views/Host/useViewInteractions.tsx UIX/Interactions/tableDnd.tsx UIX/Interactions/insertionDrag.tsx Core/Views/Cards/CardValue.tsx Core/Tiles/TileGrid.tsx Core/Navigation/TabBar.tsx` → empty.

**Correctness**

- [ ] A card dragged within its band displaces its neighbors and lands at the previewed slot; across bands it lands at the end past the last card and in an empty band; a refused structural slot snaps back and commits nothing (`cardDrops.test.tsx`, `manualOrderDrops.test.tsx`, `engine.test.tsx`).
- [ ] The nine standalone surfaces reorder as before, and a value-chip press opens its picker without lifting the card (the user pass).
- [ ] Space on a focused card lifts it, arrows move it inside its band, Space drops it (`engine.test.tsx` keyboard case; the user pass).
- [ ] An empty band opens without adding clearance (`GroupBand.test.tsx`; the user pass).

**Completeness**

- [ ] Every task ticked; no scaffolding, debug output, or unauthorized TODO in `<baseline>..HEAD`.

**Confirmation**

- [ ] Every verification result read; `engine.test.tsx` goes red with `engine.tsx` reverted to `main`; `GroupBand.test.tsx`'s empty case goes red with `GroupBand.tsx` reverted.
- [ ] User: the hand checks in Final Verification carry Nathan's own word, or the CDP smoke's evidence until he returns.

**Continuity**

- [ ] Reconciliation complete; the living documents read true; Deviations each fixed or ruled on.

**Confidence**

- [ ] Gates green from clean on `<baseline>..HEAD`; Baseline counts moved as planned.
- [ ] Diff size as the plan implied: about −322 source lines, comments and tests excluded (loc.py −322).

### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity met during execution took the simplest reading and was recorded; it didn't stop the run. Edits found in adjacent files that no task made belong to the user — folded into the commit at hand, not reverted.

- [ ] Phase review dispatched: Phase 1 · Phase 2 · Phase 3
- [ ] All findings fixed or ruled on
- [ ] Neutral verification passed on `<baseline>..HEAD`
- [ ] Final pass: gates · baseline · diff · deviations · criteria
- [ ] Reconciliation walked; living documents read
- [ ] Report delivered

**The user pass** (Nathan's hand checks, or the Sonnet CDP smoke until he returns; each a drag and a drag back):

- Ribbon icons · WindowTabStrip tabs · NavGallery pins and recents · TabBar pinned and live tabs, and a tab's close button still closes · ViewTile pills, and a locked tile's pills do not lift · IconPicker favorites.
- Cards: same-band reorder with neighbors gliding · a cross-band drop past the last card · a drop into an empty band · a refused structural slot snapping back · band spring-open on dwell · a value-chip press opening the picker without a lift · a card dropped back on its own slot writing nothing · a card drag inside a tile embed floating over the tile edge · the Set-card row at embed zoom moving its neighbors by exactly one slot · Space, arrow, Space on a focused card.
- An empty band in a Table view opening without a shift.
- A ribbon drag while a Cards view with a collapsed band is on screen: the band does not spring open.

#### Reconciliation

- `.claude/Features/PommoraDND.md` — §The Seam's `DragGroup` and `useGroupedDragItem` lines; the "binds to the dragged element under pointer capture" principle; §Displacement's two engines and "to escape column clipping"; §Constraints' "on the cross-list engine"; Known Issues' "stops at the single-zone engine" — Task 3.2
- `.claude/Features/PommoraUIX.md` — the Drag engine row (`GroupZone`, `useGroupedDragItem`, `arraySwap`) and the Zone engine row — Task 3.2
- `.claude/Features/ViewTypesPM.md` — "the card engine reports the landing index" — Task 3.2
- `.claude/Planning/Codebase Audit — Report.md` — line 45 "two engines to fold"; topic 8's heading, Found sentence, Deletes line, change 2 and change 6; Appendix A rows R-52 and R-58 — Task 3.2
- `.claude/ContextPM.md` — the one-interaction-layer sentence; the drag-handle lesson's "captures the pointer on pointerdown" — Task 3.2
- `.claude/HistoryPM.md` — PM-137 — Task 3.2
- `UIX/Cards/Card.tsx` — "the grouped engine draws its own across zones" — Task 1.2
- `Core/Views/Cards/CardsView.tsx` — none of its comments name the engine; the `gdrag` comment stays true — Task 1.3
- `.claude/Planning/View Engine — Implementation Plan.md` — a closed plan whose frozen list names `group.tsx`; history, left as written.

#### Report & Closure

Per the skill's §5.5 shape, with the accumulated run time in place of START and END.

### Open Items

- The planning-time smoke reported one FAIL it could not retest: a card dragged about 100px past the right edge of a single-card `Closed` band landed before that card instead of after it. The same geometry passes in jsdom (`engine.test.tsx`, "appends to the right of the last card in a wide foreign row"), so the pointer's true position is the open question; Phase 1's smoke retests it with the rect, trailing cell, and pointer logged, and a repeat FAIL is a Phase 1 finding, not a closeout note.
- The mandate reserved `onCardDrop` as the only Core edit and asked that anything more be surfaced rather than added. `onCardDrop` is unchanged; the fold needs four other lines of `CardsView.tsx` (the `DragGroup` mount losing `zoom`, the zone's `group` becoming `id` plus a title label, `useGroupedDragItem` becoming `useDragItem`, `CardDropSlot` mounted once) and three lines of `cards-view.css`, all deletions or renames of the retired API's call sites. Surfaced at Present; the plan proceeds on Nathan's approval.

### Deviations

