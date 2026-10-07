// The embedded-page tile. A StateField owns the replaces because only static decorations reach CM's height map.
import { createElement, Fragment, type ReactNode } from 'react'
import {
  EditorSelection,
  type EditorState,
  type Extension,
  Facet,
  MapMode,
  RangeSetBuilder,
  StateEffect,
  StateField,
  type Transaction,
} from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view'
import { ReactWidget, type ReactDom } from '../reactWidget'
import { cx } from '@pommora/uix/Utilities/cx'
import { useResizable } from '@pommora/uix/Interactions/useResizable'
import { type DismissalHandle, pushDismissal } from '@pommora/uix/Interactions/dismissalStack'
import { TILE_DEFAULT_PX, TILE_GAP_PX } from '@pommora/uix/Theme/theme-vars.css'
import { TILE_MIN_PX } from '@pommora/uix/Utilities/tileMetrics'
import { titleFromPath } from '../../Paths/posix'
import { normalizeTitle } from '../../Paths/caseFold'
import '../../Tiles/tile-base.css'
import { ZOOM } from '../../Settings/personalization'
import { zoomStep } from '../../Tiles/tileZoom'
import { docScan } from '../docCache'
import { claimedEmbeds } from '../Engine/embedClaims'
import { ownElements } from '../lineDom'
import { healTileScrolls } from './scrollHeal'
import type { ConnectionsApi } from '../Links/connectionsApi'
import { editorHost, persistPref, redrawNudge } from '../api'
import { clamp } from '@pommora/uix/Utilities/clamp'

interface EmbedHost {
  getConn: () => ConnectionsApi | undefined
  ancestors: readonly string[]
  tabActive?: () => boolean
}

const embedHost = Facet.define<EmbedHost, EmbedHost>({
  combine: (v) => v[0] ?? { getConn: () => undefined, ancestors: [] },
})

const setEmbedEditing = StateEffect.define<string | null>()

export const setWebLinkSeat = StateEffect.define<number | null>()

export const setEmbedHeights = StateEffect.define<Record<string, number>>()

export const setEmbedZooms = StateEffect.define<Record<string, number>>()

const loadEmbedPrefs = StateEffect.define<EmbedPrefs>()

type TileRange =
  | { kind: 'page'; from: number; to: number; path: string; title: string; id: string }
  | { kind: 'webpage'; from: number; to: number; url: string; label: string }

// What a tile's height and Scale are filed under: the target it shows.
const keyOf = (t: TileRange): string => (t.kind === 'page' ? t.id : t.url)

// A tile the next build may succeed: the ranges it had, and the tile an Edit Link seat un-formed.
interface Prior {
  from: number
  to: number
  key: string
}

interface EmbedPrefs {
  heights: Record<string, number>
  zooms: Record<string, number>
}

interface Seat {
  at: number
  key: string | null
}

interface EmbedMemory extends EmbedPrefs {
  editing: string | null
  seat: Seat | null
}

interface EmbedTiles extends EmbedMemory {
  deco: DecorationSet
  ranges: TileRange[]
  unformed: number
}

const tileTree = (body: ReactNode, handle: ReactNode): ReactNode =>
  createElement(Fragment, null, createElement('div', { className: 'tile-base-body' }, body), handle)

function EmbedResizeHandle({
  view,
  span,
  targetId,
}: {
  view: EditorView
  span: HTMLElement
  targetId: string
}): React.JSX.Element {
  const resize = useResizable<{ h: number }>({
    rect: () => ({ h: span.getBoundingClientRect().height }),
    min: { h: TILE_MIN_PX },
    max: { h: Number.POSITIVE_INFINITY },
    equilateral: true,
    onChange: (next, phase) => {
      const h = Math.round(next.h)
      if (phase !== 'drop') {
        span.style.height = `${h}px`
        view.requestMeasure()
        return
      }
      const heights = { ...view.state.field(embedField).heights, [targetId]: h }
      view.dispatch({ effects: setEmbedHeights.of(heights) })
    },
  })
  return resize.edges(['s'])[0]
}

const tileEstimate = (height: number | undefined): number =>
  (height ?? TILE_DEFAULT_PX) + TILE_GAP_PX * 2

// CM never hears a press inside its own tile, but the browser still drags its selection to the line above; the tile's own listener answers for its own editor alone.
function releaseOnPress(dom: HTMLElement, view: EditorView): void {
  dom.addEventListener(
    'pointerdown',
    () =>
      requestAnimationFrame(() => {
        if (view.hasFocus) view.contentDOM.blur()
      }),
    true,
  )
}

class EmbedTileWidget extends ReactWidget {
  constructor(
    readonly path: string,
    readonly title: string,
    readonly editing: boolean,
    readonly interactive: boolean,
    readonly cyclic: boolean,
    readonly ancestors: readonly string[],
    readonly targetId: string,
    readonly height: number | undefined,
  ) {
    super()
  }

  // Scale is deliberately NOT identity: an eq change re-seats the span and cancels the var's transition.
  eq(o: EmbedTileWidget): boolean {
    return (
      o.path === this.path &&
      o.editing === this.editing &&
      o.interactive === this.interactive &&
      o.cyclic === this.cyclic &&
      o.height === this.height
    )
  }

  get estimatedHeight(): number {
    return tileEstimate(this.height)
  }

  private renderInto(dom: ReactDom, view: EditorView): void {
    dom.className = cx(
      'mdpm-embed-tile tile-base',
      this.editing && 'is-editing-tile',
      !this.interactive && 'is-inert',
    )
    dom.dataset.revealHost = ''
    if (this.height !== undefined) dom.style.height = `${this.height}px`
    else dom.style.removeProperty('height')
    dom.dataset.embedTarget = this.targetId
    applyTileZoom(dom, view.state.field(embedField).zooms[this.targetId])
    this.render(
      dom,
      tileTree(
        view.state.facet(editorHost).renderTile({
          kind: 'page',
          path: this.path,
          editing: this.editing,
          locked: !this.interactive,
          ancestors: this.ancestors,
          onBeginEdit: () => {
            if (this.interactive) view.dispatch({ effects: setEmbedEditing.of(this.path) })
          },
        }),
        this.interactive && view.state.facet(editorHost).prefs
          ? createElement(EmbedResizeHandle, { view, span: dom, targetId: this.targetId })
          : null,
      ),
    )
  }

  toDOM(view: EditorView): HTMLElement {
    const dom = document.createElement('span') as ReactDom
    if (this.cyclic) {
      dom.className = 'mdpm-embed-cycle md-embed'
      dom.textContent = this.title
      return dom
    }
    releaseOnPress(dom, view)
    this.renderInto(dom, view)
    return dom
  }

  updateDOM(dom: HTMLElement, view: EditorView): boolean {
    if (this.cyclic || !this.mounted(dom)) return false
    this.renderInto(dom as ReactDom, view)
    return true
  }

  destroy(dom: HTMLElement): void {
    this.unmount(dom as ReactDom, 'if-detached')
  }
}

interface WebTileDom extends ReactDom {
  _visible?: boolean
  _wanted?: number
  _renderW?: () => void
  _obs?: WebObservers
}

// KNOB — the fit cap's breathing room below the port edges: a tile taller than the port minus this margin can never read fully-visible, and a never-fully-visible tile never goes live.
const WEB_FIT_MARGIN = 96
const WEB_FULL_RATIO = 0.99

const portHeight = (view: EditorView): number =>
  Math.min(
    view.scrollDOM.clientHeight || Number.POSITIVE_INFINITY,
    document.documentElement.clientHeight,
  )

function fitHeight(dom: WebTileDom, port: number): void {
  const wanted = dom._wanted ?? TILE_DEFAULT_PX
  dom.style.height = `${port > 0 ? clamp(port - WEB_FIT_MARGIN, TILE_MIN_PX, wanted) : wanted}px`
}

interface WebObservers {
  io: IntersectionObserver
  ro: ResizeObserver
  tiles: Set<WebTileDom>
}

const webObservers = new WeakMap<HTMLElement, WebObservers>()
function observersFor(view: EditorView): WebObservers {
  let o = webObservers.get(view.scrollDOM)
  if (!o) {
    const tiles = new Set<WebTileDom>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          const d = en.target as WebTileDom
          const visible = en.intersectionRatio >= WEB_FULL_RATIO
          if (d._visible !== visible) {
            d._visible = visible
            d._renderW?.()
          }
        }
      },
      // Viewport root, never an element: only it folds in every clipping ancestor. The ratio is itself a threshold — fractional layout tops a fully visible tile out just below 1.
      { threshold: [0, WEB_FULL_RATIO, 1] },
    )
    const ro = new ResizeObserver(() => {
      const port = portHeight(view)
      for (const d of tiles) fitHeight(d, port)
    })
    ro.observe(view.scrollDOM)
    o = { io, ro, tiles }
    webObservers.set(view.scrollDOM, o)
  }
  return o
}

class WebpageTileWidget extends ReactWidget {
  constructor(
    readonly url: string,
    readonly label: string,
    readonly height: number | undefined,
  ) {
    super()
  }

  eq(o: WebpageTileWidget): boolean {
    return o.url === this.url && o.label === this.label && o.height === this.height
  }

  get estimatedHeight(): number {
    return tileEstimate(this.height)
  }

  private renderInto(dom: WebTileDom, view: EditorView): void {
    dom.className = 'mdpm-embed-tile tile-base'
    dom.dataset.revealHost = ''
    dom.dataset.embedTarget = this.url
    dom._wanted = this.height
    fitHeight(dom, portHeight(view))
    const host = view.state.facet(embedHost)
    const editor = view.state.facet(editorHost)
    this.render(
      dom,
      tileTree(
        editor.renderTile({
          kind: 'webpage',
          url: this.url,
          label: this.label,
          visible: editor.pageSurface === true && dom._visible === true,
          tabInactive: host.tabActive?.() === false,
          zoom: zoomStep(view.state.field(embedField).zooms[this.url]),
          refocusHost: () => view.focus(),
        }),
        editor.pageSurface
          ? createElement(EmbedResizeHandle, { view, span: dom, targetId: this.url })
          : null,
      ),
    )
  }

  toDOM(view: EditorView): HTMLElement {
    const dom = document.createElement('span') as WebTileDom
    dom._renderW = () => this.renderInto(dom, view)
    if (view.state.facet(editorHost).pageSurface) {
      const o = observersFor(view)
      o.tiles.add(dom)
      o.io.observe(dom)
      dom._obs = o
    }
    releaseOnPress(dom, view)
    this.renderInto(dom, view)
    return dom
  }

  updateDOM(dom: HTMLElement, view: EditorView): boolean {
    const d = dom as WebTileDom
    if (!this.mounted(d)) return false
    d._renderW = () => this.renderInto(d, view)
    this.renderInto(d, view)
    return true
  }

  destroy(dom: HTMLElement): void {
    const d = dom as WebTileDom
    d._obs?.io.unobserve(d)
    d._obs?.tiles.delete(d)
    this.unmount(d, 'if-detached')
  }
}

const fenceLine = Decoration.line({ class: 'mdpm-embed-fence' })
const embedLine = Decoration.line({ class: 'mdpm-embed-line' })

const selectionOn = (state: EditorState, from: number, to: number): boolean =>
  state.selection.ranges.some((s) => s.from <= to && s.to >= from)

function applyTileZoom(dom: HTMLElement, zoom: number | undefined): void {
  const factor = zoomStep(zoom)
  if (factor === ZOOM.default) dom.style.removeProperty('--tile-zoom')
  else dom.style.setProperty('--tile-zoom', String(factor))
}

const moveKey = (map: Record<string, number>, from: string, to: string): Record<string, number> => {
  if (!(from in map) || to in map) return map
  const { [from]: kept, ...rest } = map
  return { ...rest, [to]: kept }
}

// A tile re-aimed where it stands keeps its height and Scale, unless another tile still shows the old target or the new one has its own.
function succeed(
  prefs: EmbedPrefs,
  tiles: readonly TileRange[],
  prior: readonly Prior[],
): EmbedPrefs {
  let { heights, zooms } = prefs
  for (const t of tiles) {
    const key = keyOf(t)
    const p = prior.find((p) => p.from <= t.to && p.to >= t.from && p.key !== key)
    if (!p || tiles.some((o) => keyOf(o) === p.key)) continue
    heights = moveKey(heights, p.key, key)
    zooms = moveKey(zooms, p.key, key)
  }
  return { heights, zooms }
}

function buildTiles(
  state: EditorState,
  memory: EmbedMemory,
  prev: readonly TileRange[] | 'mount',
  prior: readonly Prior[] = [],
): EmbedTiles {
  const host = state.facet(embedHost)
  const conn = host.getConn()
  const scan = docScan(state.doc)
  const interactive = host.ancestors.length <= 1
  let unformed = 0

  const tiles: TileRange[] = []
  if (conn && scan.embeds.length > 0) {
    for (const e of claimedEmbeds(scan.embeds, (t) => conn.resolve(t).status)) {
      const r = conn.resolve(e.title)
      if (r.status !== 'resolved' || !r.page) continue
      const { path, id } = r.page
      tiles.push({ kind: 'page', from: e.from, to: e.to, path, title: e.title, id })
    }
  }
  // The formation gate: typing `https://example.c` mid-address passes the grammar, so the grammar alone can't decide.
  for (const w of scan.webpages) {
    const formed =
      w.from !== memory.seat?.at &&
      (prev === 'mount' ||
        prev.some(
          (p) => p.kind === 'webpage' && p.url === w.url && p.from <= w.to && p.to >= w.from,
        ) ||
        !selectionOn(state, w.from, w.to))
    if (!formed) {
      unformed++
      continue
    }
    tiles.push({ kind: 'webpage', from: w.from, to: w.to, url: w.url, label: w.label })
  }
  tiles.sort((a, b) => a.from - b.from)
  const { heights, zooms } = succeed(memory, tiles, prior)

  const builder = new RangeSetBuilder<Decoration>()
  let lastFence = -1
  for (const t of tiles) {
    const cyclic = t.kind === 'page' && host.ancestors.includes(t.path)
    const height = heights[keyOf(t)]
    const widget =
      t.kind === 'page'
        ? new EmbedTileWidget(
            t.path,
            t.title,
            memory.editing === t.path,
            interactive && !cyclic,
            cyclic,
            host.ancestors,
            t.id,
            height,
          )
        : new WebpageTileWidget(t.url, t.label, height)
    const tileLine = state.doc.lineAt(t.from)
    if (tileLine.number > 1) {
      const above = state.doc.line(tileLine.number - 1)
      if (above.text.trim() === '' && above.from !== lastFence)
        builder.add(above.from, above.from, fenceLine)
    }
    builder.add(tileLine.from, tileLine.from, embedLine)
    builder.add(t.from, t.to, Decoration.replace({ widget }))
    if (tileLine.number < state.doc.lines) {
      const below = state.doc.line(tileLine.number + 1)
      if (below.text.trim() === '') {
        builder.add(below.from, below.from, fenceLine)
        lastFence = below.from
      }
    }
  }
  return { ...memory, heights, zooms, deco: builder.finish(), ranges: tiles, unformed }
}

// The SAME cached scan every keystroke already pays for, so the gate can't disagree with the scanner.
function editAffectsEmbeds(value: EmbedTiles, tr: Transaction): boolean {
  const doc = tr.startState.doc
  for (const r of value.ranges) {
    const from = doc.lineAt(Math.max(0, r.from - 1)).from
    const to = doc.lineAt(Math.min(doc.length, r.to + 1)).to
    if (tr.changes.touchesRange(from, to) !== false) return true
  }
  const before = docScan(tr.startState.doc)
  const after = docScan(tr.state.doc)
  return (
    scanMoved(before.embeds, after.embeds, tr, (a, b) => a.title === b.title) ||
    scanMoved(before.webpages, after.webpages, tr, (a, b) => a.url === b.url && a.label === b.label)
  )
}

function scanMoved<T extends { from: number }>(
  before: readonly T[],
  after: readonly T[],
  tr: Transaction,
  sameIdentity: (a: T, b: T) => boolean,
): boolean {
  if (before.length !== after.length) return true
  return before.some(
    (b, i) => !sameIdentity(b, after[i]) || after[i].from !== tr.changes.mapPos(b.from, 1),
  )
}

const mapRanges = (ranges: readonly TileRange[], tr: Transaction): TileRange[] =>
  ranges.map((r) => ({
    ...r,
    from: tr.changes.mapPos(r.from, 1),
    to: tr.changes.mapPos(r.to, -1),
  }))

// A range the edit collapsed was deleted, not re-aimed; a seat still held keeps its tile raw, so nothing forms there to succeed it.
function priorOf(ranges: readonly TileRange[], seat: Seat | null): Prior[] {
  const prior = ranges.flatMap((r) =>
    r.to > r.from ? [{ from: r.from, to: r.to, key: keyOf(r) }] : [],
  )
  if (seat?.key) prior.push({ from: seat.at, to: seat.at, key: seat.key })
  return prior
}

export const embedField = StateField.define<EmbedTiles>({
  create: (state) =>
    buildTiles(state, { editing: null, seat: null, heights: {}, zooms: {} }, 'mount'),
  update(value, tr) {
    let { editing, heights, zooms } = value
    const at = value.seat && tr.changes.mapPos(value.seat.at, 1, MapMode.TrackAfter)
    const mappedSeat = value.seat && at !== null ? { ...value.seat, at } : null
    let seat = mappedSeat
    let nudged = false
    for (const e of tr.effects) {
      if (e.is(setWebLinkSeat)) {
        const tile = value.ranges.find((r) => r.from === e.value)
        const key = tile ? keyOf(tile) : seat?.at === e.value ? seat.key : null
        seat = e.value === null ? null : { at: e.value, key }
      } else if (e.is(setEmbedEditing)) editing = e.value
      else if (e.is(redrawNudge)) nudged = true
      else if (e.is(setEmbedHeights)) heights = e.value
      else if (e.is(setEmbedZooms)) zooms = e.value
      else if (e.is(loadEmbedPrefs)) {
        heights = { ...e.value.heights, ...heights }
        zooms = { ...e.value.zooms, ...zooms }
      }
    }
    const selMoved = !tr.startState.selection.eq(tr.state.selection)
    const formationDue = value.unformed > 0 && selMoved
    // Leaving the seated line IS the submission, whatever the address reads mid-retype; a seat outliving its line would hold the next tile raw.
    if (seat !== null) {
      const line = tr.state.doc.lineAt(seat.at)
      if (line.from !== seat.at || (selMoved && !selectionOn(tr.state, line.from, line.to)))
        seat = null
    }
    const seatMoved = seat?.at !== value.seat?.at
    const memory = { editing, seat, heights, zooms }
    const restored = tr.isUserEvent('undo') || tr.isUserEvent('redo')
    if (!tr.docChanged) {
      if (
        nudged ||
        editing !== value.editing ||
        heights !== value.heights ||
        seatMoved ||
        formationDue
      )
        return buildTiles(tr.state, memory, value.ranges, priorOf(value.ranges, mappedSeat))
      return zooms !== value.zooms ? { ...value, zooms } : value
    }
    const ranges = mapRanges(value.ranges, tr)
    if (editAffectsEmbeds(value, tr) || formationDue || restored || seatMoved)
      return buildTiles(tr.state, memory, restored ? 'mount' : ranges, priorOf(ranges, mappedSeat))
    return { ...memory, deco: value.deco.map(tr.changes), ranges, unformed: value.unformed }
  },
  provide: (f) => EditorView.decorations.from(f, (v) => v.deco),
})

// Each tile's atomic range swallows its boundary newlines; doc-edge seats and word motion still reach it.
const embedAtomic = EditorView.atomicRanges.of((view) => {
  const { ranges } = view.state.field(embedField)
  if (ranges.length === 0) return Decoration.none
  const b = new RangeSetBuilder<Decoration>()
  const len = view.state.doc.length
  for (const r of ranges)
    b.add(Math.max(0, r.from - 1), Math.min(len, r.to + 1), Decoration.mark({}))
  return b.finish()
})

const editingExit = ViewPlugin.fromClass(
  class {
    private dismissal: DismissalHandle | null = null

    update(u: ViewUpdate): void {
      const editing = u.state.field(embedField).editing
      if (editing === u.startState.field(embedField).editing) return
      if (!editing) {
        this.dismissal?.release()
        this.dismissal = null
        return
      }
      const { view } = u
      this.dismissal ??= pushDismissal({
        layer: () => view.dom.querySelector('.mdpm-embed-tile.is-editing-tile'),
        dismiss: () => view.dispatch({ effects: setEmbedEditing.of(null) }),
      })
    }

    destroy(): void {
      this.dismissal?.release()
    }
  },
)

function embedPrefKey(state: EditorState, pos: number): string | null {
  const r = state.field(embedField).ranges.find((t) => t.from <= pos && pos <= t.to)
  return r ? keyOf(r) : null
}

export function embedZoomAt(state: EditorState, pos: number): number | null {
  const key = embedPrefKey(state, pos)
  return key === null ? null : zoomStep(state.field(embedField).zooms[key])
}

function refreshTileZooms(view: EditorView, animate: boolean): void {
  const zooms = view.state.field(embedField).zooms
  for (const span of ownElements<WebTileDom>(view, '[data-embed-target]')) {
    if (span._renderW) {
      span._renderW()
      continue
    }
    if (!animate) span.style.transition = 'none'
    applyTileZoom(span, zooms[span.dataset.embedTarget ?? ''])
    if (!animate) requestAnimationFrame(() => span.style.removeProperty('transition'))
  }
}

export function rerenderWebTiles(view: EditorView): void {
  for (const span of ownElements<WebTileDom>(view, '[data-embed-target]')) span._renderW?.()
}

export function applyEmbedZoom(view: EditorView, pos: number, factor: number): void {
  const key = embedPrefKey(view.state, pos)
  if (key === null) return
  const zooms = { ...view.state.field(embedField).zooms }
  if (factor === ZOOM.default) delete zooms[key]
  else zooms[key] = factor
  view.dispatch({ effects: setEmbedZooms.of(zooms) })
  refreshTileZooms(view, true)
}

export function applySavedEmbeds(
  view: EditorView,
  heights: Record<string, number>,
  zooms: Record<string, number>,
): void {
  if (Object.keys(heights).length + Object.keys(zooms).length === 0) return
  view.dispatch({ effects: loadEmbedPrefs.of({ heights, zooms }) })
  if (Object.keys(zooms).length > 0) refreshTileZooms(view, false)
}

export function embedTileRanges(state: EditorState): readonly TileRange[] {
  return state.field(embedField, false)?.ranges ?? []
}

export function embedExclusions(state: EditorState): Set<string> {
  const out = new Set<string>()
  const host = state.facet(embedHost)
  // Page ranges only: a webpage label collides with real titles by construction, and would delete that page from the pool.
  for (const t of embedTileRanges(state)) if (t.kind === 'page') out.add(normalizeTitle(t.title))
  for (const a of host.ancestors) out.add(normalizeTitle(titleFromPath(a)))
  return out
}

// Seats by NEARER edge — CM's atomic default snaps backward, teleporting a bottom-sliver click above the tile.
const embedClickSeat = EditorView.domEventHandlers({
  mousedown(event, view) {
    if (event.button !== 0 || event.shiftKey || event.detail > 1) return false
    const { ranges } = view.state.field(embedField)
    if (ranges.length === 0) return false
    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
    if (pos === null) return false
    for (const r of ranges) {
      if (pos < r.from || pos > r.to) continue
      const block = view.lineBlockAt(r.from)
      const y = event.clientY - view.documentTop
      // posAtCoords clamps padding presses onto the nearest position, so outside the tile's band the press stays CM's.
      if (y < block.top || y > block.bottom) return false
      const below = y > (block.top + block.bottom) / 2
      const len = view.state.doc.length
      const seat = below
        ? EditorSelection.cursor(Math.min(len, r.to + 1), 1)
        : EditorSelection.cursor(Math.max(0, r.from - 1), -1)
      view.dispatch({ selection: seat, userEvent: 'select.pointer' })
      view.focus()
      event.preventDefault()
      return true
    }
    return false
  },
})

// A detach zeroes every scroller inside the tile with no event and, on full reuse, no widget callback.
const healMeasure = { read: healTileScrolls, key: healTileScrolls }
const reslotHeal = ViewPlugin.fromClass(
  class {
    update(u: ViewUpdate): void {
      if (u.state.field(embedField).ranges.length > 0) u.view.requestMeasure(healMeasure)
    }
  },
)

export function embedTiles(host: EmbedHost): Extension {
  return [
    embedHost.of(host),
    embedField,
    embedAtomic,
    embedClickSeat,
    editingExit,
    reslotHeal,
    persistPref(
      (s) => s.field(embedField).heights,
      loadEmbedPrefs,
      (h) => ['embedHeights', h],
    ),
    persistPref(
      (s) => s.field(embedField).zooms,
      loadEmbedPrefs,
      (z) => ['embedZooms', z],
    ),
  ]
}
