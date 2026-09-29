import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { createPortal, flushSync } from 'react-dom'
import { DEFAULT_FEEL } from '../Animations/feel'
import { stack } from '../Theme/stack'
import { clamp } from '../Utilities/clamp'
import { cx } from '../Utilities/cx'
import { useLatest } from '../Utilities/stableApi'
import { type Channel, channel } from '../Utilities/subscribable'
import { currentZoom } from '../Utilities/zoom'
import {
  announce,
  announceDrag,
  type DragWord,
  ensureInstructions,
  INSTRUCTIONS_ID,
  STEP_WORDS,
} from './a11y'
import { pushDismissal } from './dismissalStack'
import { DragGhost } from './DragGhost'
import { addSpring, beginDragDisclose, endDragDisclose, pointDisclose } from './dragDisclose'
import { DropLine } from './DropLine'
import { beginPointerGesture, type GestureHandle, scrollMoved } from './gesture'
import {
  ARROW_DIRS,
  type Dir,
  keyboardNext,
  lineProbes,
  type Probe,
  type StepPart,
} from './keyboard'
import {
  type Axis,
  beforeIdAt,
  distanceTo,
  type Frozen,
  freeze,
  nearest,
  placeItem,
  reorigin,
  slotPoint,
  unionOf,
} from './placement'
import type { Geometry, Row } from './reorderModel'
import {
  BREAKOUT,
  type Box,
  boxAt,
  type CarryEntry,
  clipChain,
  clipOf,
  type DragItem,
  EDITABLE_TARGETS,
  type Family,
  HYSTERESIS,
  px,
  type Rect,
  SETTLE_FALLBACK,
  intersect,
  toBox,
} from './shared'

// ── Specs ───────────────────────────────────────────────────────────────────

type Point = { x: number; y: number }

type Carry = readonly CarryEntry[]

type ZoneShared = {
  label: (id: string) => string
  carry?: Carry
  disabled?: boolean
  disclose?: boolean | ((id: string) => boolean)
}

export type DisplaceSpec<T = unknown> = ZoneShared & {
  items: string[]
  axis?: Axis
  fixed?: boolean
  family?: Family<T>
  accepts?(item: T): boolean
  opens?: boolean
  onMove?: (id: string, beforeId: string | null) => void
  receive?(item: T, beforeId: string | null): void
  release?: (id: string) => void
  resolveIndex?: (index: number, id: string) => number | null
  renderOverlay?: (id: string, rect: Box) => ReactNode
}

export type LineSpec<Slot, Snap> = ZoneShared & {
  snap(id: string, g: Geometry): Snap | null
  resolve(id: string, p: Point, s: Snap): Slot | null
  commit(id: string, slot: Slot, s: Snap): void
  line?(slot: Slot, s: Snap): CSSProperties | null
  slotKey?(slot: Slot): string
  step?(slot: Slot, s: Snap): { part: StepPart; id: string } | null
  glyph?: (id: string) => ReactNode
  chip?: (id: string) => ReactNode
  watch: readonly unknown[]
}

type ZoneBody = { className?: string; children: ReactNode }
type SortableZoneProps<T> = DisplaceSpec<T> & ZoneBody
type LineZoneProps<Slot, Snap> = LineSpec<Slot, Snap> & ZoneBody

// ── Registry and session ────────────────────────────────────────────────────

type AnyLine = LineSpec<unknown, unknown>
type LinePaint = { slot: unknown; line: CSSProperties | null }
type ZoneKind =
  | { kind: 'displace'; spec: DisplaceSpec }
  | { kind: 'line'; spec: AnyLine; paint: (p: LinePaint | null) => void }
type Reg = {
  zone: ZoneKind | null
  els: Map<string, HTMLElement>
  groups: Map<string, HTMLElement>
  box: HTMLElement | null
}

type DisplaceLanding = { kind: 'displace'; zone: string; index: number }
type LineLanding = { kind: 'line'; zone: string; slot: unknown; key: unknown; snap: unknown }
type Landing = DisplaceLanding | LineLanding
type LineSnap = { g: Geometry; snap: unknown; origin: Point; zoom: number; dirty: boolean }

type Session = {
  id: string
  zone: string
  kind: ZoneKind['kind']
  name: string
  via: 'pointer' | 'keyboard'
  phase: 'live' | 'settling'
  el: HTMLElement
  rect: Box
  start: Point
  aim: Point
  last: Point
  overlaid: boolean
  axis: Axis | undefined
  zoom: number
  index: number
  comp: Point
  carried: ReadonlyMap<Family<unknown>, unknown>
  chain: Element[]
  home: Rect | null
  loose: boolean
  pick: { zone: string; at: number }
  landing: Landing | null
  line: LineSnap | null
  cursor: Point
  fence: Point | null
  release: () => void
}

type Chrome = { node: ReactNode; style: CSSProperties }
type LineHandle = {
  onPointerDown: (e: ReactPointerEvent) => void
  onKeyDown: (e: ReactKeyboardEvent) => void
  tabIndex: number
  'aria-describedby': string
  'data-line-row': string
}
type LineRowOptions = { spring?: (dragged: string) => void; open?: () => void }
type DragItemOptions = { open?: () => void }
type Active = { zone: string; id: string }
type SlotBox = { zone: string; own: boolean; box: Box; clip: Rect | null }

type Api = {
  active: Channel<Active | null>
  slot: Channel<SlotBox | null>
  loose: Channel<ReadonlyMap<Family<unknown>, unknown> | null>
  setDisplace: (zoneId: string, spec: DisplaceSpec) => void
  setLine: (zoneId: string, spec: AnyLine, paint: (p: LinePaint | null) => void) => void
  forget: (zoneId: string) => void
  box: (zoneId: string, el: HTMLElement | null) => void
  el: (zoneId: string, id: string, el: HTMLElement | null) => void
  group: (zoneId: string, key: string, el: HTMLElement | null) => void
  rowEl: (zoneId: string, id: string) => HTMLElement | undefined
  focusRow: (zoneId: string, from: Element, step: number) => void
  invalidate: (zoneId: string) => void
  begin: (zoneId: string, id: string, e: ReactPointerEvent) => void
  liftKeyboard: (zoneId: string, id: string) => void
  busy: () => boolean
  holdChrome: (el: HTMLDivElement | null) => void
  dispose: () => void
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const noop = (): void => {}
const SOURCE = 'data-drag-source'
const rowsOf = (zoneId: string): string => `[data-line-row="${zoneId}"]`
const GLIDE = `transform ${DEFAULT_FEEL.duration}ms ${DEFAULT_FEEL.easing}`
const translate = (x: number, y: number): string => `translate3d(${px(x)}, ${px(y)}, 0)`

const keyOf = (spec: AnyLine, slot: unknown): unknown => (spec.slotKey ? spec.slotKey(slot) : slot)

const within = (r: Rect | undefined, x: number, y: number, pad: number): boolean =>
  r !== undefined &&
  x >= r.left - pad &&
  x <= r.left + r.width + pad &&
  y >= r.top - pad &&
  y <= r.top + r.height + pad

function carriedOf(carry: Carry | undefined, id: string): ReadonlyMap<Family<unknown>, unknown> {
  const out = new Map<Family<unknown>, unknown>()
  for (const [family, of] of carry ?? []) {
    const item = of(id)
    if (item !== null) out.set(family, item)
  }
  return out
}

function sameLanding(a: Landing | null, b: Landing | null): boolean {
  if (a === null || b === null) return a === b
  if (a.zone !== b.zone) return false
  if (a.kind === 'displace') return b.kind === 'displace' && a.index === b.index
  return b.kind === 'line' && a.snap === b.snap && Object.is(a.key, b.key)
}

function measureLine(r: Reg, spec: AnyLine, id: string): LineSnap | null {
  if (!r.box) return null
  const host = r.box.getBoundingClientRect()
  const zoom = currentZoom(r.box)
  const local = (key: string, el: HTMLElement): Row => {
    const b = el.getBoundingClientRect()
    const top = (b.top - host.top) / zoom
    const bottom = (b.bottom - host.top) / zoom
    return {
      id: key,
      top,
      bottom,
      mid: (top + bottom) / 2,
      left: (b.left - host.left) / zoom,
      right: (b.right - host.left) / zoom,
    }
  }
  const rows = Array.from(r.els, ([key, el]) => local(key, el)).sort((a, b) => a.top - b.top)
  const groups = new Map(Array.from(r.groups, ([key, el]) => [key, local(key, el)] as const))
  const g: Geometry = { rows, groups, bottom: host.height / zoom }
  return { g, snap: spec.snap(id, g), origin: { x: host.left, y: host.top }, zoom, dirty: false }
}

// ── Engine ──────────────────────────────────────────────────────────────────

function createEngine(setChrome: (c: Chrome | null) => void): Api {
  const zones = new Map<string, Reg>()
  const frozen = new Map<string, Frozen>()
  const bounds = new Map<string, Rect>()
  const clips = new Map<string, Element[]>()
  const cuts = new Map<string, Rect | null>()
  const overs = new Map<string, number>()
  const touched = new Set<HTMLElement>()
  const floored = new Set<HTMLElement>()
  const active = channel<Active | null>(null)
  const slot = channel<SlotBox | null>(null)
  const loose = channel<ReadonlyMap<Family<unknown>, unknown> | null>(null)
  let session: Session | null = null
  let gesture: GestureHandle | null = null
  let pending: (() => void) | null = null
  let chromeEl: HTMLDivElement | null = null
  let refocus: Active | null = null
  let disposing = false

  const reg = (zoneId: string): Reg => {
    let r = zones.get(zoneId)
    if (!r) {
      r = { zone: null, els: new Map(), groups: new Map(), box: null }
      zones.set(zoneId, r)
    }
    return r
  }
  const kindOf = (zoneId: string): ZoneKind | null => zones.get(zoneId)?.zone ?? null
  const displaceOf = (zoneId: string): DisplaceSpec | null => {
    const k = kindOf(zoneId)
    return k?.kind === 'displace' ? k.spec : null
  }

  // ── Admission and geometry ──

  const admits = (s: Session, zoneId: string): boolean => {
    const spec = displaceOf(zoneId)
    if (zoneId === s.zone || !spec?.family || !spec.receive) return false
    const item = s.carried.get(spec.family)
    return item !== undefined && (spec.accepts?.(item) ?? true)
  }

  const frozenOf = (zoneId: string): Frozen | null => {
    const held = frozen.get(zoneId)
    if (held) return held
    const r = zones.get(zoneId)
    const spec = displaceOf(zoneId)
    if (!r || !spec || !session) return null
    const f = freeze(spec.items, r.els, r.box, spec.axis, session.rect.height)
    if (f) frozen.set(zoneId, f)
    return f
  }

  const sizeIn = (s: Session, zoneId: string, f: Frozen): { width: number; height: number } => {
    if (zoneId === s.zone) return s.rect
    const last = f.rects[f.rects.length - 1]
    if (last) return last
    const b = bounds.get(zoneId)
    return {
      width: Math.min(s.rect.width, b?.width ?? Infinity),
      height: b?.height ?? s.rect.height,
    }
  }

  const syncBounds = (target: EventTarget | null = null): void => {
    for (const [zoneId, r] of zones) {
      if (!r.box || r.zone?.kind !== 'displace' || !scrollMoved(target, r.box)) continue
      const chain = clips.get(zoneId) ?? clipChain(r.box)
      clips.set(zoneId, chain)
      const cut = clipOf(chain)
      cuts.set(zoneId, cut)
      const b = intersect(r.box.getBoundingClientRect(), cut)
      if (b) bounds.set(zoneId, b)
      else bounds.delete(zoneId)
    }
  }

  const floor = (s: Session, zoneId: string): void => {
    const r = zones.get(zoneId)
    const box = r?.box
    if (!box || r.els.size > 0 || !admits(s, zoneId)) return
    box.style.setProperty('--drag-floor', px(s.rect.height / currentZoom(box)))
    floored.add(box)
  }

  const homeOf = (s: Session): Rect | null => {
    if (s.carried.size === 0) return null
    const box = zones.get(s.zone)?.box
    const f = frozen.get(s.zone)
    const r = box?.getBoundingClientRect() ?? (f ? unionOf(f) : null)
    return r ? intersect(r, clipOf(s.chain)) : null
  }

  const atHome = (s: Session, x: number, y: number): boolean => {
    const h = s.home
    if (!h) return true
    if (s.axis === 'x') return y >= h.top - BREAKOUT && y <= h.top + h.height + BREAKOUT
    if (s.axis === 'y') return x >= h.left - BREAKOUT && x <= h.left + h.width + BREAKOUT
    return within(h, x, y, 0)
  }

  const travel = (s: Session, x: number, y: number): Point => ({
    x: s.axis === 'y' && !s.loose ? 0 : x - s.start.x,
    y: s.axis === 'x' && !s.loose ? 0 : y - s.start.y,
  })

  const chipTravel = (s: Session, x: number, y: number): Point =>
    s.fence ? travel(s, clamp(x, 0, s.fence.x), clamp(y, 0, s.fence.y)) : travel(s, x, y)

  const surfaceOf = (s: Session): Element => {
    let top: Element = s.el
    for (const r of zones.values()) if (r.box?.contains(top)) top = r.box
    return top
  }

  const lineOf = (s: Session, spec: AnyLine): LineSnap | null => {
    if (!s.line || s.line.dirty) {
      const r = zones.get(s.zone)
      s.line = r ? measureLine(r, spec, s.id) : null
    }
    return s.line
  }

  // ── Painting ──

  const paintZone = (s: Session, zoneId: string, to: number): void => {
    const spec = displaceOf(zoneId)
    const f = frozen.get(zoneId)
    const r = zones.get(zoneId)
    if (!spec || !f || !r) return
    const own = zoneId === s.zone
    const a = own ? s.index : -1
    const from = overs.get(zoneId) ?? a
    if (from === to) return
    overs.set(zoneId, to)
    const n = f.ids.length - (own ? 1 : 0)
    const lo = from < 0 ? to : to < 0 ? from : Math.min(from, to)
    const hi = from < 0 || to < 0 ? n : Math.max(from, to)
    const size = sizeIn(s, zoneId, f)
    for (let k = lo; k < hi; k++) {
      const i = own && k >= a ? k + 1 : k
      const el = r.els.get(f.ids[i])
      if (!el) continue
      const at = placeItem(f, spec.axis, i, a, to, size)
      const b = f.rects[i]
      el.style.transition = GLIDE
      el.style.transform =
        at.x === b.left && at.y === b.top
          ? ''
          : translate((at.x - b.left) / f.zoom, (at.y - b.top) / f.zoom)
      touched.add(el)
    }
  }

  const placeLifted = (s: Session): void => {
    const f = frozen.get(s.zone)
    const spec = displaceOf(s.zone)
    if (!f || !spec) return
    const L = s.landing
    const over = L?.kind === 'displace' && L.zone === s.zone ? L.index : s.index
    const at = slotPoint(f, spec.axis, s.index, over, s.rect)
    const b = f.rects[s.index]
    s.el.style.transition = GLIDE
    s.el.style.transform = translate((at.x - b.left) / f.zoom, (at.y - b.top) / f.zoom)
  }

  const overIn = (s: Session, zoneId: string, L: Landing | null): number => {
    if (L?.kind === 'displace' && L.zone === zoneId) return L.index
    if (zoneId !== s.zone) return -1
    return L !== null && displaceOf(s.zone)?.release ? -1 : s.index
  }

  const repaint = (s: Session, prev: Landing | null, next: Landing | null): void => {
    if (s.kind === 'displace') paintZone(s, s.zone, overIn(s, s.zone, next))
    if (prev?.kind === 'displace' && prev.zone !== s.zone)
      paintZone(s, prev.zone, overIn(s, prev.zone, next))
    if (next?.kind === 'displace' && next.zone !== s.zone) paintZone(s, next.zone, next.index)
    if (s.via === 'keyboard' && s.kind === 'displace') placeLifted(s)
  }

  const paintLine = (zoneId: string, L: LineLanding | null): void => {
    const k = kindOf(zoneId)
    if (k?.kind !== 'line') return
    k.paint(L ? { slot: L.slot, line: k.spec.line?.(L.slot, L.snap) ?? null } : null)
  }

  const slotBoxOf = (s: Session, L: Landing | null): SlotBox | null => {
    if (L?.kind !== 'displace') return null
    const f = frozen.get(L.zone)
    const spec = displaceOf(L.zone)
    if (!f || !spec) return null
    const own = L.zone === s.zone
    const incoming = sizeIn(s, L.zone, f)
    const size = spec.axis ? incoming : (f.rects[L.index] ?? s.rect)
    const at = slotPoint(f, spec.axis, own ? s.index : -1, L.index, incoming)
    const box = boxAt(at.x + f.origin.x, at.y + f.origin.y, size.width, size.height)
    return { zone: L.zone, own, box, clip: cuts.get(L.zone) ?? null }
  }

  const setLanding = (s: Session, next: Landing | null): void => {
    const prev = s.landing
    if (sameLanding(prev, next)) return
    s.landing = next
    if (prev?.kind === 'line') paintLine(prev.zone, null)
    if (next?.kind === 'line') paintLine(next.zone, next)
    repaint(s, prev, next)
    slot.set(s.phase === 'live' ? slotBoxOf(s, next) : null)
  }

  // ── Routing ──

  const lineAtLocal = (s: Session, spec: AnyLine, p: Point): LineLanding | null => {
    const m = lineOf(s, spec)
    if (!m || m.snap === null) return null
    s.cursor = p
    const got = spec.resolve(s.id, p, m.snap)
    return got === null
      ? null
      : { kind: 'line', zone: s.zone, slot: got, key: keyOf(spec, got), snap: m.snap }
  }

  const lineAt = (s: Session, spec: AnyLine, x: number, y: number): LineLanding | null => {
    const m = lineOf(s, spec)
    if (!m) return null
    return lineAtLocal(s, spec, { x: (x - m.origin.x) / m.zoom, y: (y - m.origin.y) / m.zoom })
  }

  const pickDisplace = (
    s: Session,
    zoneId: string,
    spec: DisplaceSpec,
    x: number,
    y: number,
  ): void => {
    const f = frozenOf(zoneId)
    if (!f) return
    const own = zoneId === s.zone
    const size = sizeIn(s, zoneId, f)
    const t = travel(s, x, y)
    const p = { x: s.aim.x + t.x - f.origin.x, y: s.aim.y + t.y - f.origin.y }
    const half = { width: size.width / 2, height: size.height / 2 }
    const near = nearest(f, f.rects.length + (own ? 0 : 1), p, half, spec.axis)
    if (s.pick.zone === zoneId && distanceTo(f, s.pick.at, p, half) - near.dist <= HYSTERESIS)
      return
    s.pick = { zone: zoneId, at: near.at }
    const index =
      own && spec.fixed ? s.index : spec.resolveIndex ? spec.resolveIndex(near.at, s.id) : near.at
    setLanding(
      s,
      index === null || (own && index === s.index)
        ? null
        : { kind: 'displace', zone: zoneId, index },
    )
  }

  const overTail = (s: Session, zoneId: string, x: number, y: number): boolean => {
    const f = frozen.get(zoneId)
    if (!f) return false
    const { width, height } = sizeIn(s, zoneId, f)
    return within(
      { left: f.tail.x + f.origin.x, top: f.tail.y + f.origin.y, width, height },
      x,
      y,
      0,
    )
  }

  const foreignAt = (s: Session, x: number, y: number): string | null => {
    const held = s.pick.zone
    if (held !== s.zone && (within(bounds.get(held), x, y, HYSTERESIS) || overTail(s, held, x, y)))
      return held
    let hit: string | null = null
    for (const [zoneId, b] of bounds) if (within(b, x, y, 0) && admits(s, zoneId)) hit = zoneId
    return hit
  }

  const route = (s: Session, x: number, y: number): void => {
    const zoneId = s.loose ? foreignAt(s, x, y) : s.zone
    const k = zoneId === null ? null : kindOf(zoneId)
    if (zoneId === null || !k) setLanding(s, null)
    else if (k.kind === 'line') setLanding(s, lineAt(s, k.spec, x, y))
    else pickDisplace(s, zoneId, k.spec, x, y)
  }

  const track = (x: number, y: number): void => {
    const s = session
    if (s?.phase !== 'live') return
    s.last = { x, y }
    pointDisclose(x, y)
    const out = !atHome(s, x, y)
    if (out !== s.loose) {
      s.loose = out
      gesture?.autoScroll(!out)
      loose.set(out ? s.carried : null)
    }
    const t = chipTravel(s, x, y)
    if (chromeEl) chromeEl.style.transform = translate(t.x, t.y)
    else if (s.kind === 'displace' && !s.overlaid)
      s.el.style.transform = translate((t.x + s.comp.x) / s.zoom, (t.y + s.comp.y) / s.zoom)
    route(s, x, y)
  }

  const refresh = (s: Session): void => {
    const k = kindOf(s.zone)
    if (s.via === 'pointer') route(s, s.last.x, s.last.y)
    else if (k?.kind === 'line') setLanding(s, lineAtLocal(s, k.spec, s.cursor))
  }

  const rescroll = (target: EventTarget | null): void => {
    const s = session
    if (s?.phase !== 'live') return
    for (const [zoneId, f] of frozen) {
      if (!scrollMoved(target, f.ref)) continue
      const { x, y } = f.origin
      reorigin(f)
      if (zoneId !== s.zone) continue
      s.comp.x -= f.origin.x - x
      s.comp.y -= f.origin.y - y
    }
    const host = zones.get(s.zone)?.box
    if (s.line && host && scrollMoved(target, host)) {
      const r = host.getBoundingClientRect()
      s.line.origin = { x: r.left, y: r.top }
    }
    syncBounds(target)
    s.home = homeOf(s)
    slot.set(slotBoxOf(s, s.landing))
    if (s.via === 'pointer') track(s.last.x, s.last.y)
    else refresh(s)
  }

  const remeasure = (): void => {
    const s = session
    if (s?.phase !== 'live') return
    if (s.line) s.line.dirty = true
    rescroll(null)
  }

  const admitLate = (zoneId: string): void => {
    const s = session
    if (s?.phase !== 'live') return
    floor(s, zoneId)
    remeasure()
  }

  // ── Lift ──

  const lift = (zoneId: string, id: string, via: Session['via'], at?: Point): Session | null => {
    const r = zones.get(zoneId)
    const k = r?.zone
    const el = r?.els.get(id)
    if (!r || !k || !el || k.spec.disabled) return null
    const rect = toBox(el)
    const start = at ?? { x: rect.cx, y: rect.cy }
    const s: Session = {
      id,
      zone: zoneId,
      kind: k.kind,
      name: k.spec.label(id),
      via,
      phase: 'live',
      el,
      rect,
      start,
      aim: k.kind === 'displace' ? { x: rect.cx, y: rect.cy } : start,
      last: start,
      overlaid: k.kind === 'displace' && via === 'pointer' && k.spec.renderOverlay !== undefined,
      axis: k.kind === 'displace' ? k.spec.axis : undefined,
      zoom: currentZoom(el),
      index: -1,
      comp: { x: 0, y: 0 },
      carried: carriedOf(k.spec.carry, id),
      chain: clipChain(r.box ?? el),
      home: null,
      loose: false,
      pick: { zone: zoneId, at: -1 },
      landing: null,
      line: null,
      cursor: { x: 0, y: 0 },
      fence: null,
      release: noop,
    }
    if (k.kind === 'line') {
      s.line = measureLine(r, k.spec, id)
      if (!s.line || (s.line.snap === null && (via === 'keyboard' || s.carried.size === 0)))
        return null
      const own = s.line.g.rows.find((row) => row.id === id)
      if (own) s.cursor = { x: (own.left + own.right) / 2, y: own.mid }
      el.setAttribute(SOURCE, '')
    }
    session = s
    for (const zid of zones.keys()) floor(s, zid)
    syncBounds()
    if (k.kind === 'displace') {
      const f = frozenOf(zoneId)
      s.index = f ? f.ids.indexOf(id) : -1
      if (!f || s.index < 0) {
        unwind(s)
        end(s)
        return null
      }
      const b = f.rects[s.index]
      s.comp = { x: rect.left - b.left - f.origin.x, y: rect.top - b.top - f.origin.y }
      s.pick = { zone: zoneId, at: s.index }
      if (!s.overlaid) {
        el.style.zIndex = `${stack.local.lifted}`
        if (via === 'pointer') el.style.pointerEvents = 'none'
      }
    }
    s.home = homeOf(s)
    if (via === 'pointer') {
      const base: CSSProperties = {
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: stack.top.dragOverlay,
      }
      if (k.kind === 'line')
        setChrome({
          node: (
            <DragGhost>
              {k.spec.chip?.(id) ?? (
                <>
                  {k.spec.glyph?.(id)}
                  {s.name}
                </>
              )}
            </DragGhost>
          ),
          style: { ...base, left: start.x, top: start.y },
        })
      else if (k.spec.renderOverlay)
        setChrome({
          node: k.spec.renderOverlay(id, rect),
          style: {
            ...base,
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          },
        })
      const disclose = k.spec.disclose
      if (typeof disclose === 'function' ? disclose(id) : disclose)
        beginDragDisclose(remeasure, surfaceOf(s), el)
    }
    active.set({ zone: zoneId, id })
    announceDrag('lift', s.name)
    return s
  }

  // ── Drop, land, glide, end ──

  const unwind = (s: Session): void => {
    s.release()
    endDragDisclose()
    for (const el of touched) {
      el.style.transform = ''
      el.style.transition = ''
    }
    if (s.kind === 'line') s.el.removeAttribute(SOURCE)
    else if (!s.overlaid) {
      s.el.style.transform = ''
      s.el.style.transition = ''
    }
    for (const box of floored) box.style.removeProperty('--drag-floor')
    floored.clear()
    frozen.clear()
    bounds.clear()
    clips.clear()
    cuts.clear()
    overs.clear()
    if (s.landing?.kind === 'line') paintLine(s.landing.zone, null)
    active.set(null)
    slot.set(null)
    loose.set(null)
  }

  const end = (s: Session): void => {
    if (session === s) session = null
    gesture = null
    pending = null
    for (const el of touched) {
      el.style.transform = ''
      el.style.transition = ''
      el.style.visibility = ''
    }
    touched.clear()
    const st = s.el.style
    if (s.kind === 'displace') {
      st.transform = ''
      st.transition = ''
      st.visibility = ''
      st.pointerEvents = ''
      st.zIndex = ''
    }
    setChrome(null)
  }

  const glide = (s: Session, from: ReadonlyMap<HTMLElement, DOMRect>): void => {
    const target = zones.get(s.landing?.zone ?? s.zone)?.els.get(s.id)
    if (chromeEl && !target) {
      end(s)
      return
    }
    const flips: [HTMLElement, string][] = []
    for (const [el, was] of from) {
      if (!el.isConnected) continue
      const now = el.getBoundingClientRect()
      if (was.left === now.left && was.top === now.top) continue
      const zoom = currentZoom(el)
      flips.push([el, translate((was.left - now.left) / zoom, (was.top - now.top) / zoom)])
    }
    for (const [el, inverse] of flips) el.style.transform = inverse
    if (flips.length) document.body.getBoundingClientRect()
    for (const [el] of flips) {
      el.style.transition = GLIDE
      el.style.transform = ''
      touched.add(el)
    }
    if (chromeEl && target) {
      const to = target.getBoundingClientRect()
      chromeEl.style.transition = GLIDE
      chromeEl.style.transform = translate(to.left - s.rect.left, to.top - s.rect.top)
      if (target !== s.el) {
        target.style.visibility = 'hidden'
        touched.add(target)
      }
    }
    const el = chromeEl ?? s.el
    let timer = 0
    function settled(): void {
      if (pending !== settled) return
      el.removeEventListener('transitionend', onEnd)
      window.clearTimeout(timer)
      end(s)
    }
    function onEnd(e: TransitionEvent): void {
      if (e.target === el && e.propertyName === 'transform') settled()
    }
    pending = settled
    el.addEventListener('transitionend', onEnd)
    timer = window.setTimeout(settled, DEFAULT_FEEL.duration + SETTLE_FALLBACK)
  }

  const land = (s: Session, word: DragWord, commit: (() => void) | null, glides: boolean): void => {
    s.phase = 'settling'
    const animates = glides && !disposing && s.kind === 'displace'
    const from = new Map<HTMLElement, DOMRect>()
    if (animates) {
      for (const el of touched) from.set(el, el.getBoundingClientRect())
      if (!s.overlaid) from.set(s.el, s.el.getBoundingClientRect())
    }
    const run = (): void => {
      try {
        commit?.()
      } catch (err) {
        console.error(err)
      }
      unwind(s)
      if (!animates) end(s)
    }
    if (s.via === 'keyboard') {
      refocus = { zone: s.zone, id: s.id }
      window.addEventListener('pointerdown', settleFocus, { capture: true })
      window.addEventListener('keydown', settleFocus, { capture: true })
    }
    if (disposing) run()
    else flushSync(run)
    if (animates) glide(s, from)
    announceDrag(word, s.name)
    if (s.via === 'keyboard')
      requestAnimationFrame(() => {
        const r = zones.get(s.zone)
        const el = r?.els.get(s.id) ?? r?.box
        if (el) focusBack(el, s.el)
      })
  }

  const settleFocus = (): void => {
    refocus = null
    window.removeEventListener('pointerdown', settleFocus, { capture: true })
    window.removeEventListener('keydown', settleFocus, { capture: true })
  }

  const focusBack = (el: HTMLElement, was: HTMLElement | null): void => {
    const at = document.activeElement
    if (!refocus || !(at === null || at === document.body || el.contains(at) || was?.contains(at)))
      return
    el.focus()
  }

  const drop = (): void => {
    const s = session
    if (s?.phase !== 'live') return
    if (s.line?.dirty) refresh(s)
    const L = s.landing
    const target = L ? kindOf(L.zone) : null
    if (L?.kind === 'line' && target?.kind === 'line') {
      land(s, 'move', () => target.spec.commit(s.id, L.slot, L.snap), false)
      return
    }
    const f = L ? frozen.get(L.zone) : undefined
    if (L?.kind !== 'displace' || target?.kind !== 'displace' || !f) {
      land(s, 'return', null, true)
      return
    }
    const spec = target.spec
    const src = displaceOf(s.zone)
    const own = L.zone === s.zone
    const beforeId = beforeIdAt(f.ids, own ? s.id : null, L.index)
    const item = spec.family && s.carried.get(spec.family)
    const commit = own
      ? () => spec.onMove?.(s.id, beforeId)
      : () => {
          spec.receive?.(item, beforeId)
          src?.release?.(s.id)
        }
    const kin = own || (src?.family !== undefined && src.family === spec.family)
    land(s, kin || !spec.opens ? 'move' : 'open', commit, kin)
  }

  const cancel = (): void => {
    const s = session
    if (s?.phase === 'live') land(s, 'cancel', null, true)
  }

  const halt = (): void => {
    disposing = true
    gesture?.abort()
    cancel()
    pending?.()
    disposing = false
  }

  // ── Keyboard ──

  const stepDisplace = (s: Session, spec: DisplaceSpec, dir: Dir): void => {
    const f = frozen.get(s.zone)
    if (!f || spec.fixed) return
    const next = keyboardNext(f.rects, s.pick.at, dir)
    if (next === s.pick.at) return
    s.pick = { zone: s.zone, at: next }
    const index = spec.resolveIndex ? spec.resolveIndex(next, s.id) : next
    if (index === null) return
    setLanding(s, index === s.index ? null : { kind: 'displace', zone: s.zone, index })
    announce(STEP_WORDS.position(index + 1, f.rects.length))
  }

  const stepLine = (s: Session, spec: AnyLine, dir: 1 | -1): void => {
    const m = lineOf(s, spec)
    if (!m || m.snap === null) return
    const probes = lineProbes(m.g)
    const own = m.g.rows.find((row) => row.id === s.id)
    const current = s.landing?.kind === 'line' ? s.landing.key : null
    const keyAt = (i: number): unknown => {
      const got = spec.resolve(s.id, { x: s.cursor.x, y: probes[i].y }, m.snap)
      return got === null ? null : keyOf(spec, got)
    }
    const partOf = (p: Probe, key: unknown): StepPart => {
      switch (p.kind) {
        case 'group':
          return 'into'
        case 'end':
          return 'after'
        case 'row': {
          const [before, into, after] = [keyAt(p.base), keyAt(p.base + 1), keyAt(p.base + 2)]
          const middle = Object.is(before, into) === Object.is(into, after)
          if (Object.is(key, into) && middle) return 'into'
          return Object.is(key, before) ? 'before' : 'after'
        }
      }
    }
    const at = probes.findIndex((p) => p.y >= s.cursor.y)
    let i = at < 0 ? probes.length : at
    if (dir > 0 && probes[i]?.y === s.cursor.y) i += 1
    if (dir < 0) i -= 1
    for (; i >= 0 && i < probes.length; i += dir) {
      const p = probes[i]
      const key = keyAt(i)
      const home = key === null && own !== undefined && p.y >= own.top && p.y <= own.bottom
      if ((key === null && !home) || Object.is(key, current)) continue
      const point = { x: s.cursor.x, y: p.y }
      const L = key === null ? null : lineAtLocal(s, spec, point)
      setLanding(s, L)
      s.cursor = point
      if (!L) announceDrag('return', s.name)
      else {
        const named = spec.step?.(L.slot, L.snap) ?? { part: partOf(p, key), id: p.id }
        announce(STEP_WORDS[named.part](spec.label(named.id)))
      }
      const r = zones.get(s.zone)
      ;(p.kind === 'group' ? r?.groups : r?.els)?.get(p.id)?.scrollIntoView({ block: 'nearest' })
      return
    }
  }

  const keyboard = (s: Session, e: KeyboardEvent): void => {
    const dir = e.key in ARROW_DIRS ? ARROW_DIRS[e.key] : null
    const drops = e.key === ' ' || e.key === 'Enter' || e.key === 'Tab'
    if (!dir && !drops && e.key !== 'Escape') return
    e.preventDefault()
    e.stopPropagation()
    if (s.phase !== 'live' || (drops && e.repeat)) return
    const k = kindOf(s.zone)
    if (dir && k?.kind === 'displace') stepDisplace(s, k.spec, dir)
    else if (dir && k?.kind === 'line' && dir.y !== 0) stepLine(s, k.spec, dir.y > 0 ? 1 : -1)
    else if (drops) drop()
    else if (!dir) cancel()
  }

  const liftKeyboard = (zoneId: string, id: string): void => {
    if (session?.phase === 'live') return
    pending?.()
    const s = lift(zoneId, id, 'keyboard')
    if (!s) return
    const onKey = (e: KeyboardEvent): void => keyboard(s, e)
    const onOut = (e: FocusEvent): void => {
      if (!(e.relatedTarget instanceof Node && s.el.contains(e.relatedTarget))) cancel()
    }
    window.addEventListener('keydown', onKey, { capture: true })
    s.el.addEventListener('focusout', onOut)
    const outside = pushDismissal({ layer: () => null, trigger: () => s.el, dismiss: cancel })
    s.release = () => {
      window.removeEventListener('keydown', onKey, { capture: true })
      s.el.removeEventListener('focusout', onOut)
      outside.release()
    }
  }

  // ── Pointer ──

  const begin = (zoneId: string, id: string, e: ReactPointerEvent): void => {
    if (session?.phase === 'live') return
    pending?.()
    const k = kindOf(zoneId)
    const el = zones.get(zoneId)?.els.get(id)
    if (!k || !el || k.spec.disabled) return
    const start = { x: e.clientX, y: e.clientY }
    const h = beginPointerGesture({
      el,
      event: e,
      activation: 'item',
      cursor: 'grabbing',
      autoScroll: { from: el, axis: k.kind === 'line' ? 'y' : 'xy' },
      onActivate: () => lift(zoneId, id, 'pointer', start) !== null,
      onDragMove: (ev) => track(ev.clientX, ev.clientY),
      onWindowScroll: rescroll,
      onDrop: drop,
      onAbort: cancel,
    })
    if (h) gesture = h
  }

  // ── Registration ──

  return {
    active,
    slot,
    loose,
    setDisplace: (zoneId, spec) => {
      const r = reg(zoneId)
      const fresh = r.zone === null
      r.zone = { kind: 'displace', spec }
      if (fresh) admitLate(zoneId)
    },
    setLine: (zoneId, spec, paint) => {
      reg(zoneId).zone = { kind: 'line', spec, paint }
    },
    forget: (zoneId) => {
      if (session?.zone === zoneId) halt()
      zones.delete(zoneId)
    },
    box: (zoneId, el) => {
      reg(zoneId).box = el
      if (el) admitLate(zoneId)
    },
    el: (zoneId, id, el) => {
      const r = reg(zoneId)
      if (el) r.els.set(id, el)
      else r.els.delete(id)
      if (el && refocus?.zone === zoneId && refocus.id === id) focusBack(el, null)
      if (session?.zone === zoneId && session.line) session.line.dirty = true
    },
    group: (zoneId, key, el) => {
      const r = reg(zoneId)
      if (el) r.groups.set(key, el)
      else r.groups.delete(key)
      if (session?.zone === zoneId && session.line) session.line.dirty = true
    },
    rowEl: (zoneId, id) => zones.get(zoneId)?.els.get(id),
    focusRow: (zoneId, from, step) => {
      const rows = zones.get(zoneId)?.box?.querySelectorAll<HTMLElement>(rowsOf(zoneId))
      if (!rows) return
      const list = Array.from(rows)
      list[list.indexOf(from as HTMLElement) + step]?.focus()
    },
    invalidate: (zoneId) => {
      const s = session
      if (s?.phase !== 'live' || s.zone !== zoneId || !s.line) return
      s.line.dirty = true
      refresh(s)
    },
    begin,
    liftKeyboard,
    busy: () => session !== null,
    holdChrome: (el) => {
      chromeEl = el
      const s = session
      if (!el || !s) return
      if (s.kind === 'line') {
        const b = el.getBoundingClientRect()
        s.fence = { x: window.innerWidth - b.width, y: window.innerHeight - b.height }
      }
      const t = chipTravel(s, s.last.x, s.last.y)
      el.style.transform = translate(t.x, t.y)
      if (s.overlaid) s.el.style.visibility = 'hidden'
    },
    dispose: halt,
  }
}

// ── Contexts and hooks ──────────────────────────────────────────────────────

type ZoneValue = { api: Api; zoneId: string; disabled: boolean }
type ZoneSeat = { zoneId: string; box: (el: HTMLElement | null) => void; zone: ZoneValue }

const ApiCtx = createContext<Api | null>(null)
const ZoneCtx = createContext<ZoneValue | null>(null)
const SlotCtx = createContext<unknown>(null)
const ITEM_STYLE: CSSProperties = { position: 'relative', touchAction: 'none' }
const NO_SUB = (): (() => void) => noop
const insetOf = (box: Rect, clip: Rect): string => {
  const top = Math.max(0, clip.top - box.top)
  const right = Math.max(0, box.left + box.width - clip.left - clip.width)
  const bottom = Math.max(0, box.top + box.height - clip.top - clip.height)
  const left = Math.max(0, clip.left - box.left)
  return `inset(${px(top)} ${px(right)} ${px(bottom)} ${px(left)})`
}

function useZone(hook: string): ZoneValue {
  const z = useContext(ZoneCtx)
  if (!z) throw new Error(`${hook} must be used inside a zone`)
  return z
}

function useDragging(api: Api, zoneId: string, id: string): boolean {
  return useSyncExternalStore(api.active.subscribe, () => {
    const a = api.active.get()
    return a !== null && a.zone === zoneId && a.id === id
  })
}

export function DragGroup({ children }: { children: ReactNode }): React.JSX.Element {
  const [chrome, setChrome] = useState<Chrome | null>(null)
  const [api] = useState(() => createEngine(setChrome))
  useEffect(() => ensureInstructions(), [])
  useEffect(() => api.dispose, [api])
  return (
    <ApiCtx.Provider value={api}>
      {children}
      {chrome &&
        createPortal(
          <div ref={api.holdChrome} style={chrome.style}>
            {chrome.node}
          </div>,
          document.body,
        )}
    </ApiCtx.Provider>
  )
}

function useZoneSeat(api: Api, disabled: boolean): ZoneSeat {
  const zoneId = useId()
  useEffect(() => () => api.forget(zoneId), [api, zoneId])
  const box = useCallback((el: HTMLElement | null) => api.box(zoneId, el), [api, zoneId])
  const zone = useMemo(() => ({ api, zoneId, disabled }), [api, zoneId, disabled])
  return { zoneId, box, zone }
}

function InGroup({ children }: { children: (api: Api) => ReactNode }): ReactNode {
  const api = useContext(ApiCtx)
  if (api) return children(api)
  return (
    <DragGroup>
      <InGroup>{children}</InGroup>
    </DragGroup>
  )
}

export function SortableZone<T>(props: SortableZoneProps<T>): React.JSX.Element {
  return <InGroup>{(api) => <DisplaceZone api={api} {...props} />}</InGroup>
}

function DisplaceZone({
  api,
  className,
  children,
  ...spec
}: SortableZoneProps<unknown> & { api: Api }): React.JSX.Element {
  const { zoneId, box, zone } = useZoneSeat(api, spec.disabled ?? false)
  useEffect(() => api.setDisplace(zoneId, spec))
  return (
    <ZoneCtx.Provider value={zone}>
      {className === undefined ? (
        children
      ) : (
        <div ref={box} className={className}>
          {children}
        </div>
      )}
    </ZoneCtx.Provider>
  )
}

export function LineZone<Slot, Snap>(props: LineZoneProps<Slot, Snap>): React.JSX.Element {
  return <InGroup>{(api) => <LineHost api={api} {...props} />}</InGroup>
}

function LineHost({
  api,
  className,
  children,
  ...spec
}: LineZoneProps<unknown, unknown> & { api: Api }): React.JSX.Element {
  const disabled = spec.disabled ?? false
  const { zoneId, box, zone } = useZoneSeat(api, disabled)
  const [paint, setPaint] = useState<LinePaint | null>(null)
  const last = useRef<HTMLElement | null>(null)
  const viaPointer = useRef(false)
  useEffect(() => api.setLine(zoneId, spec, setPaint))
  useEffect(() => api.invalidate(zoneId), [api, zoneId, ...spec.watch])
  const stop = disabled ? -1 : 0
  const rows = rowsOf(zoneId)
  const onFocus = (e: ReactFocusEvent<HTMLDivElement>): void => {
    const pointed = viaPointer.current
    viaPointer.current = false
    const host = e.currentTarget
    if (e.target !== host) {
      host.tabIndex = -1
      if (!(e.target instanceof HTMLElement)) return
      const row = e.target.closest<HTMLElement>(rows)
      if (pointed && row && row !== e.target && !e.target.matches(EDITABLE_TARGETS)) row.focus()
      else if (row === e.target) last.current = row
      return
    }
    if (pointed) return
    const held = last.current?.isConnected && host.contains(last.current) ? last.current : null
    ;(held ?? host.querySelector<HTMLElement>(rows))?.focus()
  }
  const onBlur = (e: ReactFocusEvent<HTMLDivElement>): void => {
    if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) return
    e.currentTarget.tabIndex = stop
    viaPointer.current = false
  }
  return (
    <ZoneCtx.Provider value={zone}>
      <SlotCtx.Provider value={paint?.slot ?? null}>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: the host is the list's one tab stop and hands focus to a row at once; the container role belongs to the list's owner */}
        <div
          ref={box}
          className={cx('drop-line-host', className)}
          tabIndex={stop}
          onPointerDownCapture={() => {
            viaPointer.current = true
          }}
          onFocus={onFocus}
          onBlur={onBlur}
        >
          {children}
          {paint?.line ? <DropLine style={paint.line} /> : null}
        </div>
      </SlotCtx.Provider>
    </ZoneCtx.Provider>
  )
}

export function useDragItem(id: string, { open }: DragItemOptions = {}): DragItem {
  const { api, zoneId, disabled } = useZone('useDragItem')
  const isDragging = useDragging(api, zoneId, id)
  const run = useLatest(open)
  const opens = open !== undefined
  const setNodeRef = useCallback(
    (el: HTMLElement | null) => api.el(zoneId, id, el),
    [api, zoneId, id],
  )
  const handle = useMemo(
    () => ({
      onPointerDown: (e: ReactPointerEvent) => api.begin(zoneId, id, e),
      onKeyDown: (e: ReactKeyboardEvent) => {
        if (e.target !== e.currentTarget || e.repeat) return
        if (api.busy()) {
          if (e.key === ' ' || e.key === 'Enter') e.preventDefault()
          return
        }
        if (e.key === 'Enter' && opens) {
          e.preventDefault()
          run.current?.()
        } else if ((e.key === ' ' || e.key === 'Enter') && !disabled) {
          e.preventDefault()
          api.liftKeyboard(zoneId, id)
        }
      },
      role: 'button',
      tabIndex: disabled && !opens ? -1 : 0,
      'aria-roledescription': 'sortable',
      'aria-describedby': INSTRUCTIONS_ID,
      'aria-pressed': isDragging || undefined,
      'aria-disabled': (disabled && !opens) || undefined,
    }),
    [api, zoneId, id, disabled, opens, isDragging],
  )
  return useMemo(
    () => ({ setNodeRef, style: ITEM_STYLE, handle, isDragging }),
    [setNodeRef, handle, isDragging],
  )
}

export function useLineRow(
  id: string,
  { spring, open }: LineRowOptions = {},
): { ref: (el: HTMLElement | null) => void; handle: LineHandle } {
  const { api, zoneId } = useZone('useLineRow')
  const node = useRef<HTMLElement | null>(null)
  const expand = useLatest(spring)
  const run = useLatest(open)
  const springs = spring !== undefined
  const opens = open !== undefined
  const ref = useCallback(
    (el: HTMLElement | null) => {
      node.current = el
      api.el(zoneId, id, el)
    },
    [api, zoneId, id],
  )
  useEffect(() => {
    const el = node.current
    if (!springs || !el) return
    return addSpring(el, () => expand.current?.(api.active.get()?.id ?? ''))
  }, [springs])
  const handle = useMemo<LineHandle>(
    () => ({
      onPointerDown: (e) => api.begin(zoneId, id, e),
      onKeyDown: (e) => {
        const row = e.currentTarget
        if (e.target !== row) return
        const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
        const opening = e.key === 'Enter' && opens && !e.repeat && !api.busy()
        if (e.key !== ' ' && step === 0 && !opening) return
        e.preventDefault()
        if (opening) run.current?.()
        else if (step !== 0) api.focusRow(zoneId, row, step)
        else if (!e.repeat) api.liftKeyboard(zoneId, id)
      },
      tabIndex: -1,
      'aria-describedby': INSTRUCTIONS_ID,
      'data-line-row': zoneId,
    }),
    [api, zoneId, id, opens],
  )
  return useMemo(() => ({ ref, handle }), [ref, handle])
}

export function useLineGroup(key: string): (el: HTMLElement | null) => void {
  const { api, zoneId } = useZone('useLineGroup')
  return useCallback((el: HTMLElement | null) => api.group(zoneId, key, el), [api, zoneId, key])
}

export function LineRow({
  id,
  spring,
  open,
  ...div
}: { id: string } & LineRowOptions & HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  const { ref, handle } = useLineRow(id, { spring, open })
  return <div ref={ref} {...div} {...handle} />
}

export function LineGroup({
  id,
  ...div
}: { id: string } & HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  const ref = useLineGroup(id)
  return <div ref={ref} {...div} />
}

export function useLineSlot<S>(): S | null {
  return useContext(SlotCtx) as S | null
}

export function useLineEl(): (id: string) => HTMLElement | undefined {
  const { api, zoneId } = useZone('useLineEl')
  return useCallback((id: string) => api.rowEl(zoneId, id), [api, zoneId])
}

export function DropSlot({ foreignOnly = false }: { foreignOnly?: boolean }): ReactNode {
  const { api, zoneId } = useZone('DropSlot')
  const v = useSyncExternalStore(api.slot.subscribe, () => {
    const at = api.slot.get()
    return at && at.zone === zoneId && !(foreignOnly && at.own) ? at : null
  })
  if (!v) return null
  const { box, clip } = v
  return createPortal(
    <div
      className="drop-slot is-floating"
      style={{
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        clipPath: clip ? insetOf(box, clip) : undefined,
      }}
    />,
    document.body,
  )
}

export function useLooseItem<T>(family: Family<T>): T | null {
  const api = useContext(ApiCtx)
  return useSyncExternalStore(
    api?.loose.subscribe ?? NO_SUB,
    () => (api?.loose.get()?.get(family) as T | undefined) ?? null,
  )
}
