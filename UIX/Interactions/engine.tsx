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
  spillOf,
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
  onMove?: (id: string, beforeId: string | null) => unknown
  receive?(item: T, beforeId: string | null): void
  release?: (id: string) => void
  resolveIndex?: (index: number, id: string) => number | null
  renderOverlay?: (id: string, rect: Box) => ReactNode
}

export type LineSpec<Slot, Snap> = ZoneShared & {
  snap(id: string, geometry: Geometry): Snap | null
  resolve(id: string, point: Point, snap: Snap): Slot | null
  commit(id: string, slot: Slot, snap: Snap): unknown
  line?(slot: Slot, snap: Snap): CSSProperties | null
  slotKey?(slot: Slot): string
  step?(slot: Slot, snap: Snap): { part: StepPart; id: string } | null
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
type ZoneDef =
  | { kind: 'displace'; spec: DisplaceSpec }
  | { kind: 'line'; spec: AnyLine; paint: (p: LinePaint | null) => void }
type ZoneEntry = {
  def: ZoneDef | null
  els: Map<string, HTMLElement>
  groups: Map<string, HTMLElement>
  box: HTMLElement | null
}

type DisplaceLanding = { kind: 'displace'; zone: string; index: number }
type LineLanding = { kind: 'line'; zone: string; slot: unknown; key: unknown; snap: unknown }
type Landing = DisplaceLanding | LineLanding
type LineSnap = { geometry: Geometry; snap: unknown; origin: Point; zoom: number; dirty: boolean }

type Session = {
  id: string
  zone: string
  kind: ZoneDef['kind']
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
  offset: Point
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
type DragItemOptions = { open?: () => void; tabStop?: boolean }
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

function measureLine(entry: ZoneEntry, spec: AnyLine, id: string): LineSnap | null {
  if (!entry.box) return null
  const host = entry.box.getBoundingClientRect()
  const zoom = currentZoom(entry.box)
  const local = (key: string, el: HTMLElement): Row => {
    const rect = el.getBoundingClientRect()
    const top = (rect.top - host.top) / zoom
    const bottom = (rect.bottom - host.top) / zoom
    return {
      id: key,
      top,
      bottom,
      mid: (top + bottom) / 2,
      left: (rect.left - host.left) / zoom,
      right: (rect.right - host.left) / zoom,
    }
  }
  const rows = Array.from(entry.els, ([key, el]) => local(key, el)).sort((a, b) => a.top - b.top)
  const groups = new Map(Array.from(entry.groups, ([key, el]) => [key, local(key, el)] as const))
  const geometry: Geometry = { rows, groups, bottom: host.height / zoom }
  const origin = { x: host.left, y: host.top }
  return { geometry, snap: spec.snap(id, geometry), origin, zoom, dirty: false }
}

// ── Engine ──────────────────────────────────────────────────────────────────

function createEngine(setChrome: (c: Chrome | null) => void): Api {
  const zones = new Map<string, ZoneEntry>()
  const frozen = new Map<string, Frozen>()
  const bounds = new Map<string, Rect>()
  const clips = new Map<string, Element[]>()
  const cuts = new Map<string, Rect | null>()
  const overs = new Map<string, number>()
  const touched = new Set<HTMLElement>()
  const floored = new Set<HTMLElement>()
  const spilled = new Set<HTMLElement>()
  const active = channel<Active | null>(null)
  const slotBox = channel<SlotBox | null>(null)
  const loose = channel<ReadonlyMap<Family<unknown>, unknown> | null>(null)
  let session: Session | null = null
  let gesture: GestureHandle | null = null
  let pending: (() => void) | null = null
  let chromeEl: HTMLDivElement | null = null
  let refocus: Active | null = null
  let disposing = false

  const entryOf = (zoneId: string): ZoneEntry => {
    let entry = zones.get(zoneId)
    if (!entry) {
      entry = { def: null, els: new Map(), groups: new Map(), box: null }
      zones.set(zoneId, entry)
    }
    return entry
  }
  const defOf = (zoneId: string): ZoneDef | null => zones.get(zoneId)?.def ?? null
  const displaceOf = (zoneId: string): DisplaceSpec | null => {
    const def = defOf(zoneId)
    return def?.kind === 'displace' ? def.spec : null
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
    const entry = zones.get(zoneId)
    const spec = displaceOf(zoneId)
    if (!entry || !spec || !session) return null
    const layout = freeze(spec.items, entry.els, entry.box, spec.axis, session.rect.height)
    if (layout) frozen.set(zoneId, layout)
    return layout
  }

  const sizeIn = (s: Session, zoneId: string, layout: Frozen): Pick<Box, 'width' | 'height'> => {
    if (zoneId === s.zone) return s.rect
    const last = layout.rects[layout.rects.length - 1]
    if (last) return last
    const zoneBounds = bounds.get(zoneId)
    return {
      width: Math.min(s.rect.width, zoneBounds?.width ?? Infinity),
      height: displaceOf(zoneId)?.axis ? (zoneBounds?.height ?? s.rect.height) : s.rect.height,
    }
  }

  const syncBounds = (target: EventTarget | null = null): void => {
    for (const [zoneId, entry] of zones) {
      if (!entry.box || entry.def?.kind !== 'displace' || !scrollMoved(target, entry.box)) continue
      const chain = clips.get(zoneId) ?? clipChain(entry.box)
      clips.set(zoneId, chain)
      const cut = clipOf(chain)
      cuts.set(zoneId, cut)
      const visible = intersect(entry.box.getBoundingClientRect(), cut)
      if (visible) bounds.set(zoneId, visible)
      else bounds.delete(zoneId)
    }
  }

  const floor = (s: Session, zoneId: string): void => {
    const entry = zones.get(zoneId)
    const box = entry?.box
    if (!box || entry.els.size > 0 || !admits(s, zoneId)) return
    box.style.setProperty('--drag-floor', px(s.rect.height / currentZoom(box)))
    floored.add(box)
  }

  const homeOf = (s: Session): Rect | null => {
    if (s.carried.size === 0) return null
    const box = zones.get(s.zone)?.box
    const layout = frozen.get(s.zone)
    const rect = box?.getBoundingClientRect() ?? (layout ? unionOf(layout) : null)
    return rect ? intersect(rect, clipOf(s.chain)) : null
  }

  const atHome = (s: Session, x: number, y: number): boolean => {
    const home = s.home
    if (!home) return true
    if (s.axis === 'x') return y >= home.top - BREAKOUT && y <= home.top + home.height + BREAKOUT
    const across = x >= home.left - BREAKOUT && x <= home.left + home.width + BREAKOUT
    if (s.axis === 'y') return across
    if (s.kind === 'line') return across && y >= home.top && y <= home.top + home.height
    return within(home, x, y, 0)
  }

  const travel = (s: Session, x: number, y: number): Point => ({
    x: s.axis === 'y' && !s.loose ? 0 : x - s.start.x,
    y: s.axis === 'x' && !s.loose ? 0 : y - s.start.y,
  })

  const chipTravel = (s: Session, x: number, y: number): Point =>
    s.fence ? travel(s, clamp(x, 0, s.fence.x), clamp(y, 0, s.fence.y)) : travel(s, x, y)

  const surfaceOf = (s: Session): Element => {
    let top: Element = s.el
    for (const entry of zones.values()) if (entry.box?.contains(top)) top = entry.box
    return top
  }

  const lineOf = (s: Session, spec: AnyLine): LineSnap | null => {
    if (!s.line || s.line.dirty) {
      const entry = zones.get(s.zone)
      s.line = entry ? measureLine(entry, spec, s.id) : null
    }
    return s.line
  }

  // ── Painting ──

  const spill = (box: HTMLElement, height: number): void => {
    if (height > 0) {
      box.style.setProperty('--drag-spill', px(height))
      spilled.add(box)
    } else {
      box.style.removeProperty('--drag-spill')
      spilled.delete(box)
    }
  }

  const paintZone = (s: Session, zoneId: string, to: number): void => {
    const spec = displaceOf(zoneId)
    const layout = frozen.get(zoneId)
    const entry = zones.get(zoneId)
    if (!spec || !layout || !entry) return
    const own = zoneId === s.zone
    const lifted = own ? s.index : -1
    const from = overs.get(zoneId) ?? lifted
    if (from === to) return
    overs.set(zoneId, to)
    if (!own && !spec.axis && entry.box) {
      const grown = spillOf(layout, layout.ids.length + 1, s.rect.height)
      spill(entry.box, to < 0 ? 0 : grown / layout.zoom)
    }
    const count = layout.ids.length - (own ? 1 : 0)
    const lo = from < 0 ? to : to < 0 ? from : Math.min(from, to)
    const hi = from < 0 || to < 0 ? count : Math.max(from, to)
    const size = sizeIn(s, zoneId, layout)
    for (let at = lo; at < hi; at++) {
      const i = own && at >= lifted ? at + 1 : at
      const el = entry.els.get(layout.ids[i])
      if (!el) continue
      const { x, y } = placeItem(layout, spec.axis, i, lifted, to, size)
      const rect = layout.rects[i]
      el.style.transition = GLIDE
      el.style.transform =
        x === rect.left && y === rect.top
          ? ''
          : translate((x - rect.left) / layout.zoom, (y - rect.top) / layout.zoom)
      touched.add(el)
    }
  }

  const placeLifted = (s: Session): void => {
    const layout = frozen.get(s.zone)
    const spec = displaceOf(s.zone)
    if (!layout || !spec) return
    const landing = s.landing
    const over = landing?.kind === 'displace' && landing.zone === s.zone ? landing.index : s.index
    const { x, y } = slotPoint(layout, spec.axis, s.index, over, s.rect)
    const rect = layout.rects[s.index]
    s.el.style.transition = GLIDE
    s.el.style.transform = translate((x - rect.left) / layout.zoom, (y - rect.top) / layout.zoom)
  }

  const overIn = (s: Session, zoneId: string, landing: Landing | null): number => {
    if (landing?.kind === 'displace' && landing.zone === zoneId) return landing.index
    if (zoneId !== s.zone) return -1
    return landing !== null && displaceOf(s.zone)?.release ? -1 : s.index
  }

  const repaint = (s: Session, prev: Landing | null, next: Landing | null): void => {
    if (s.kind === 'displace') paintZone(s, s.zone, overIn(s, s.zone, next))
    if (prev?.kind === 'displace' && prev.zone !== s.zone)
      paintZone(s, prev.zone, overIn(s, prev.zone, next))
    if (next?.kind === 'displace' && next.zone !== s.zone) paintZone(s, next.zone, next.index)
    if (s.via === 'keyboard' && s.kind === 'displace') placeLifted(s)
  }

  const paintLine = (zoneId: string, landing: LineLanding | null): void => {
    const def = defOf(zoneId)
    if (def?.kind !== 'line') return
    const line = landing && (def.spec.line?.(landing.slot, landing.snap) ?? null)
    def.paint(landing ? { slot: landing.slot, line } : null)
  }

  const slotBoxOf = (s: Session, landing: Landing | null): SlotBox | null => {
    if (landing?.kind !== 'displace') return null
    const layout = frozen.get(landing.zone)
    const spec = displaceOf(landing.zone)
    if (!layout || !spec) return null
    const own = landing.zone === s.zone
    const incoming = sizeIn(s, landing.zone, layout)
    const size = spec.axis ? incoming : (layout.rects[landing.index] ?? s.rect)
    const at = slotPoint(layout, spec.axis, own ? s.index : -1, landing.index, incoming)
    const box = boxAt(at.x + layout.origin.x, at.y + layout.origin.y, size.width, size.height)
    return { zone: landing.zone, own, box, clip: cuts.get(landing.zone) ?? null }
  }

  const setLanding = (s: Session, next: Landing | null): void => {
    const prev = s.landing
    if (sameLanding(prev, next)) return
    s.landing = next
    if (prev?.kind === 'line') paintLine(prev.zone, null)
    if (next?.kind === 'line') paintLine(next.zone, next)
    repaint(s, prev, next)
    slotBox.set(s.phase === 'live' ? slotBoxOf(s, next) : null)
  }

  // ── Routing ──

  const lineAtLocal = (s: Session, spec: AnyLine, point: Point): LineLanding | null => {
    const line = lineOf(s, spec)
    if (!line || line.snap === null) return null
    s.cursor = point
    const slot = spec.resolve(s.id, point, line.snap)
    return slot === null
      ? null
      : { kind: 'line', zone: s.zone, slot, key: keyOf(spec, slot), snap: line.snap }
  }

  const lineAt = (s: Session, spec: AnyLine, x: number, y: number): LineLanding | null => {
    const line = lineOf(s, spec)
    if (!line) return null
    const { origin, zoom } = line
    return lineAtLocal(s, spec, { x: (x - origin.x) / zoom, y: (y - origin.y) / zoom })
  }

  const pickDisplace = (
    s: Session,
    zoneId: string,
    spec: DisplaceSpec,
    x: number,
    y: number,
  ): void => {
    const layout = frozenOf(zoneId)
    if (!layout) return
    const own = zoneId === s.zone
    const size = sizeIn(s, zoneId, layout)
    const { x: dx, y: dy } = travel(s, x, y)
    const { origin } = layout
    const centre = { x: s.aim.x + dx - origin.x, y: s.aim.y + dy - origin.y }
    const half = { width: size.width / 2, height: size.height / 2 }
    const near = nearest(layout, layout.rects.length + (own ? 0 : 1), centre, half, spec.axis)
    const kept = distanceTo(layout, s.pick.at, centre, half) - near.dist <= HYSTERESIS
    if (s.pick.zone === zoneId && kept) return
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
    const layout = frozen.get(zoneId)
    if (!layout) return false
    const { width, height } = sizeIn(s, zoneId, layout)
    const { tail, origin } = layout
    return within({ left: tail.x + origin.x, top: tail.y + origin.y, width, height }, x, y, 0)
  }

  const foreignAt = (s: Session, x: number, y: number): string | null => {
    const held = s.pick.zone
    if (held !== s.zone && (within(bounds.get(held), x, y, HYSTERESIS) || overTail(s, held, x, y)))
      return held
    let hit: string | null = null
    for (const [zoneId, box] of bounds) if (within(box, x, y, 0) && admits(s, zoneId)) hit = zoneId
    return hit
  }

  const route = (s: Session, x: number, y: number): void => {
    const zoneId = s.loose ? foreignAt(s, x, y) : s.zone
    const def = zoneId === null ? null : defOf(zoneId)
    if (zoneId === null || !def) setLanding(s, null)
    else if (def.kind === 'line') setLanding(s, lineAt(s, def.spec, x, y))
    else pickDisplace(s, zoneId, def.spec, x, y)
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
    const { x: dx, y: dy } = chipTravel(s, x, y)
    if (chromeEl) chromeEl.style.transform = translate(dx, dy)
    else if (s.kind === 'displace' && !s.overlaid)
      s.el.style.transform = translate((dx + s.offset.x) / s.zoom, (dy + s.offset.y) / s.zoom)
    route(s, x, y)
  }

  const refresh = (s: Session): void => {
    const def = defOf(s.zone)
    if (s.via === 'pointer') route(s, s.last.x, s.last.y)
    else if (def?.kind === 'line') setLanding(s, lineAtLocal(s, def.spec, s.cursor))
  }

  const rescroll = (target: EventTarget | null): void => {
    const s = session
    if (s?.phase !== 'live') return
    for (const [zoneId, layout] of frozen) {
      if (!scrollMoved(target, layout.ref)) continue
      const { x, y } = layout.origin
      reorigin(layout)
      if (zoneId !== s.zone) continue
      s.offset.x -= layout.origin.x - x
      s.offset.y -= layout.origin.y - y
    }
    const host = zones.get(s.zone)?.box
    if (s.line && host && scrollMoved(target, host)) {
      const rect = host.getBoundingClientRect()
      s.line.origin = { x: rect.left, y: rect.top }
    }
    syncBounds(target)
    s.home = homeOf(s)
    slotBox.set(slotBoxOf(s, s.landing))
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
    const entry = zones.get(zoneId)
    const def = entry?.def
    const el = entry?.els.get(id)
    if (!entry || !def || !el || def.spec.disabled) return null
    const rect = toBox(el)
    const start = at ?? { x: rect.cx, y: rect.cy }
    const s: Session = {
      id,
      zone: zoneId,
      kind: def.kind,
      name: def.spec.label(id),
      via,
      phase: 'live',
      el,
      rect,
      start,
      aim: def.kind === 'displace' ? { x: rect.cx, y: rect.cy } : start,
      last: start,
      overlaid:
        def.kind === 'displace' && via === 'pointer' && def.spec.renderOverlay !== undefined,
      axis: def.kind === 'displace' ? def.spec.axis : undefined,
      zoom: currentZoom(el),
      index: -1,
      offset: { x: 0, y: 0 },
      carried: carriedOf(def.spec.carry, id),
      chain: clipChain(entry.box ?? el),
      home: null,
      loose: false,
      pick: { zone: zoneId, at: -1 },
      landing: null,
      line: null,
      cursor: { x: 0, y: 0 },
      fence: null,
      release: noop,
    }
    if (def.kind === 'line') {
      s.line = measureLine(entry, def.spec, id)
      if (!s.line || (s.line.snap === null && (via === 'keyboard' || s.carried.size === 0)))
        return null
      const own = s.line.geometry.rows.find((row) => row.id === id)
      if (own) s.cursor = { x: (own.left + own.right) / 2, y: own.mid }
      el.setAttribute(SOURCE, '')
    }
    session = s
    for (const other of zones.keys()) floor(s, other)
    syncBounds()
    if (def.kind === 'displace') {
      const layout = frozenOf(zoneId)
      s.index = layout ? layout.ids.indexOf(id) : -1
      if (!layout || s.index < 0) {
        unwind(s)
        end(s)
        return null
      }
      const slotRect = layout.rects[s.index]
      const { origin } = layout
      s.offset = { x: rect.left - slotRect.left - origin.x, y: rect.top - slotRect.top - origin.y }
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
      if (def.kind === 'line')
        setChrome({
          node: (
            <DragGhost>
              {def.spec.chip?.(id) ?? (
                <>
                  {def.spec.glyph?.(id)}
                  {s.name}
                </>
              )}
            </DragGhost>
          ),
          style: { ...base, left: start.x, top: start.y },
        })
      else if (def.spec.renderOverlay)
        setChrome({
          node: def.spec.renderOverlay(id, rect),
          style: {
            ...base,
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          },
        })
      const disclose = def.spec.disclose
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
    for (const box of spilled) box.style.removeProperty('--drag-spill')
    spilled.clear()
    for (const held of [frozen, bounds, clips, cuts, overs]) held.clear()
    if (s.landing?.kind === 'line') paintLine(s.landing.zone, null)
    active.set(null)
    slotBox.set(null)
    loose.set(null)
  }

  const end = (s: Session): void => {
    if (session === s) session = null
    gesture = null
    pending = null
    for (const el of touched) {
      el.style.transition = ''
      el.style.visibility = ''
    }
    touched.clear()
    if (s.kind === 'displace') {
      s.el.style.visibility = ''
      s.el.style.pointerEvents = ''
      s.el.style.zIndex = ''
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

  const land = (
    s: Session,
    word: DragWord,
    commit: (() => unknown) | null,
    glides: boolean,
  ): void => {
    s.phase = 'settling'
    const animates = glides && !disposing && s.kind === 'displace'
    const from = new Map<HTMLElement, DOMRect>()
    if (animates) {
      for (const el of touched) from.set(el, el.getBoundingClientRect())
      if (!s.overlaid) from.set(s.el, s.el.getBoundingClientRect())
    }
    let said = word
    const run = (): void => {
      try {
        if (commit?.() === false) said = 'return'
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
    announceDrag(said, s.name)
    if (s.via === 'keyboard')
      requestAnimationFrame(() => {
        const entry = zones.get(s.zone)
        const el = entry?.els.get(s.id) ?? entry?.box
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
    const landing = s.landing
    const target = landing ? defOf(landing.zone) : null
    if (landing?.kind === 'line' && target?.kind === 'line') {
      land(s, 'move', () => target.spec.commit(s.id, landing.slot, landing.snap), false)
      return
    }
    const layout = landing ? frozen.get(landing.zone) : undefined
    if (landing?.kind !== 'displace' || target?.kind !== 'displace' || !layout) {
      land(s, 'return', null, true)
      return
    }
    const spec = target.spec
    const source = displaceOf(s.zone)
    const own = landing.zone === s.zone
    const beforeId = beforeIdAt(layout.ids, own ? s.id : null, landing.index)
    const item = spec.family && s.carried.get(spec.family)
    const commit = own
      ? () => spec.onMove?.(s.id, beforeId)
      : () => {
          spec.receive?.(item, beforeId)
          source?.release?.(s.id)
        }
    const kin = own || (source?.family !== undefined && source.family === spec.family)
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
    const layout = frozen.get(s.zone)
    if (!layout || spec.fixed) return
    const next = keyboardNext(layout.rects, s.pick.at, dir)
    if (next === s.pick.at) return
    s.pick = { zone: s.zone, at: next }
    const index = spec.resolveIndex ? spec.resolveIndex(next, s.id) : next
    if (index === null) return
    setLanding(s, index === s.index ? null : { kind: 'displace', zone: s.zone, index })
    announce(STEP_WORDS.position(index + 1, layout.rects.length))
  }

  const stepLine = (s: Session, spec: AnyLine, dir: 1 | -1): void => {
    const line = lineOf(s, spec)
    if (!line || line.snap === null) return
    const probes = lineProbes(line.geometry)
    const own = line.geometry.rows.find((row) => row.id === s.id)
    const current = s.landing?.kind === 'line' ? s.landing.key : null
    const keyAt = (i: number): unknown => {
      const slot = spec.resolve(s.id, { x: s.cursor.x, y: probes[i].y }, line.snap)
      return slot === null ? null : keyOf(spec, slot)
    }
    const partOf = (probe: Probe, key: unknown): StepPart => {
      switch (probe.kind) {
        case 'group':
          return 'into'
        case 'end':
          return 'after'
        case 'row': {
          const [before, into, after] = [0, 1, 2].map((step) => keyAt(probe.base + step))
          const middle = Object.is(before, into) === Object.is(into, after)
          if (Object.is(key, into) && middle) return 'into'
          return Object.is(key, before) ? 'before' : 'after'
        }
      }
    }
    const at = probes.findIndex((probe) => probe.y >= s.cursor.y)
    let i = at < 0 ? probes.length : at
    if (dir > 0 && probes[i]?.y === s.cursor.y) i += 1
    if (dir < 0) i -= 1
    for (; i >= 0 && i < probes.length; i += dir) {
      const probe = probes[i]
      const key = keyAt(i)
      const home = key === null && own !== undefined && probe.y >= own.top && probe.y <= own.bottom
      if ((key === null && !home) || Object.is(key, current)) continue
      const point = { x: s.cursor.x, y: probe.y }
      const next = key === null ? null : lineAtLocal(s, spec, point)
      setLanding(s, next)
      s.cursor = point
      if (!next) announceDrag('return', s.name)
      else {
        const step = spec.step?.(next.slot, next.snap) ?? { part: partOf(probe, key), id: probe.id }
        announce(STEP_WORDS[step.part](spec.label(step.id)))
      }
      const entry = zones.get(s.zone)
      const shown = probe.kind === 'group' ? entry?.groups : entry?.els
      shown?.get(probe.id)?.scrollIntoView({ block: 'nearest' })
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
    const def = defOf(s.zone)
    if (dir && def?.kind === 'displace') stepDisplace(s, def.spec, dir)
    else if (dir && def?.kind === 'line' && dir.y !== 0) stepLine(s, def.spec, dir.y > 0 ? 1 : -1)
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
    const def = defOf(zoneId)
    const el = zones.get(zoneId)?.els.get(id)
    if (!def || !el || def.spec.disabled) return
    const start = { x: e.clientX, y: e.clientY }
    const handle = beginPointerGesture({
      el,
      event: e,
      activation: 'item',
      cursor: 'grabbing',
      autoScroll: { from: el, axis: def.kind === 'line' ? 'y' : 'xy' },
      onActivate: () => lift(zoneId, id, 'pointer', start) !== null,
      onDragMove: (ev) => track(ev.clientX, ev.clientY),
      onWindowScroll: rescroll,
      onDrop: drop,
      onAbort: cancel,
    })
    if (handle) gesture = handle
  }

  // ── Registration ──

  return {
    active,
    slot: slotBox,
    loose,
    setDisplace: (zoneId, spec) => {
      const entry = entryOf(zoneId)
      const fresh = entry.def === null
      entry.def = { kind: 'displace', spec }
      if (fresh) admitLate(zoneId)
    },
    setLine: (zoneId, spec, paint) => {
      entryOf(zoneId).def = { kind: 'line', spec, paint }
    },
    forget: (zoneId) => {
      if (session?.zone === zoneId) halt()
      zones.delete(zoneId)
    },
    box: (zoneId, el) => {
      entryOf(zoneId).box = el
      if (el) admitLate(zoneId)
    },
    el: (zoneId, id, el) => {
      const entry = entryOf(zoneId)
      if (el) entry.els.set(id, el)
      else entry.els.delete(id)
      if (el && refocus?.zone === zoneId && refocus.id === id) focusBack(el, null)
      if (session?.zone === zoneId && session.line) session.line.dirty = true
    },
    group: (zoneId, key, el) => {
      const entry = entryOf(zoneId)
      if (el) entry.groups.set(key, el)
      else entry.groups.delete(key)
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
      if (session?.zone === zoneId) remeasure()
    },
    begin,
    liftKeyboard,
    busy: () => session !== null,
    holdChrome: (el) => {
      chromeEl = el
      const s = session
      if (!el || !s) return
      if (s.kind === 'line') {
        const rect = el.getBoundingClientRect()
        s.fence = { x: window.innerWidth - rect.width, y: window.innerHeight - rect.height }
      }
      const { x: dx, y: dy } = chipTravel(s, s.last.x, s.last.y)
      el.style.transform = translate(dx, dy)
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
  const zone = useContext(ZoneCtx)
  if (!zone) throw new Error(`${hook} must be used inside a zone`)
  return zone
}

const heldWhileBusy = (api: Api, e: ReactKeyboardEvent): boolean => {
  if (!api.busy()) return false
  if (e.key === ' ' || e.key === 'Enter') e.preventDefault()
  return true
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
  const enter = (host: HTMLElement): void => {
    const held = last.current?.isConnected && host.contains(last.current) ? last.current : null
    ;(held ?? host.querySelector<HTMLElement>(rows))?.focus()
  }
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
    if (!pointed) enter(host)
  }
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (e.target !== e.currentTarget || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return
    e.preventDefault()
    enter(e.currentTarget)
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
          className={cx('line-zone', className)}
          tabIndex={stop}
          onPointerDownCapture={() => {
            viaPointer.current = true
          }}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
        >
          {children}
          {paint?.line ? <DropLine style={paint.line} /> : null}
        </div>
      </SlotCtx.Provider>
    </ZoneCtx.Provider>
  )
}

export function useDragItem(id: string, { open, tabStop = true }: DragItemOptions = {}): DragItem {
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
        if (e.target !== e.currentTarget || e.repeat || heldWhileBusy(api, e)) return
        if (e.key === 'Enter' && opens) {
          e.preventDefault()
          run.current?.()
        } else if ((e.key === ' ' || e.key === 'Enter') && !disabled) {
          e.preventDefault()
          api.liftKeyboard(zoneId, id)
        }
      },
      role: 'button',
      tabIndex: tabStop && (opens || !disabled) ? 0 : -1,
      'aria-roledescription': 'sortable',
      'aria-describedby': INSTRUCTIONS_ID,
      'aria-pressed': isDragging || undefined,
      'aria-disabled': (disabled && !opens) || undefined,
    }),
    [api, zoneId, id, disabled, opens, tabStop, isDragging],
  )
  return useMemo(
    () => ({ setNodeRef, style: ITEM_STYLE, handle, isDragging }),
    [setNodeRef, handle, isDragging],
  )
}

export function useLineSpring(
  spring: ((dragged: string) => void) | undefined,
): (el: HTMLElement | null) => void {
  const { api } = useZone('useLineSpring')
  const node = useRef<HTMLElement | null>(null)
  const expand = useLatest(spring)
  const springs = spring !== undefined
  useEffect(() => {
    const el = node.current
    if (!springs || !el) return
    return addSpring(el, () => expand.current?.(api.active.get()?.id ?? ''))
  }, [springs])
  return useCallback((el: HTMLElement | null) => {
    node.current = el
  }, [])
}

export function useLineRow(
  id: string,
  { spring, open }: LineRowOptions = {},
): { ref: (el: HTMLElement | null) => void; handle: LineHandle } {
  const { api, zoneId } = useZone('useLineRow')
  const springRef = useLineSpring(spring)
  const run = useLatest(open)
  const opens = open !== undefined
  const ref = useCallback(
    (el: HTMLElement | null) => {
      springRef(el)
      api.el(zoneId, id, el)
    },
    [api, zoneId, id, springRef],
  )
  const handle = useMemo<LineHandle>(
    () => ({
      onPointerDown: (e) => api.begin(zoneId, id, e),
      onKeyDown: (e) => {
        const row = e.currentTarget
        if (e.target !== row || heldWhileBusy(api, e)) return
        const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
        const opening = e.key === 'Enter' && opens && !e.repeat
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
  const shown = useSyncExternalStore(api.slot.subscribe, () => {
    const at = api.slot.get()
    return at && at.zone === zoneId && !(foreignOnly && at.own) ? at : null
  })
  if (!shown) return null
  const { box, clip } = shown
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
