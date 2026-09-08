// The embedded-page tile. A StateField owns the replaces because only static decorations reach CM's height map.
import { createElement, Fragment, type ReactNode } from 'react'
import {
  EditorSelection,
  EditorState,
  type Extension,
  Facet,
  RangeSetBuilder,
  StateEffect,
  StateField,
  type Text,
  Transaction,
} from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view'
import { ReactWidget, type ReactDom } from '../Widgets/reactWidget'
import { cx } from '@pommora/uix/Utilities/cx'
import { useResizeFrame } from '@pommora/uix/Interactions/ResizeFrame'
import { type DismissalHandle, pushEscape } from '@pommora/uix/Interactions/dismissalStack'
import { TILE_DEFAULT_PX, TILE_GAP_PX, TILE_MIN_PX } from '@pommora/uix/Theme/theme-vars.css'
import { normalizeTitle, pageEmbedText, titleFromPath } from '@pommora/core/Connections/connections'
import '../../Tiles/tile-base.css'
import { loneWebpageEmbed } from '@pommora/core/MarkdownPM/Embeds/webpageEmbed'
import { DEFAULT_ZOOM, zoomStep } from '../../Tiles/tileZoom'
import { docScan } from '../docCache'
import { loneEmbedTitle } from '../Engine/detect'
import { claimedEmbeds } from '../Engine/embedRanges'
import { healTileScrolls } from './scrollHeal'
import type { ConnectionsApi } from '../Links/connectionsApi'
import { editorHost } from '../api'
import { clamp } from '@pommora/uix/Utilities/clamp'

export interface EmbedHost {
  getConn: () => ConnectionsApi | undefined
  ancestors: readonly string[]
  saveHeights?: (heights: Record<string, number>) => void
  saveZooms?: (zooms: Record<string, number>) => void
  tabActive?: () => boolean
}

const embedHost = Facet.define<EmbedHost, EmbedHost>({
  combine: (v) => v[0] ?? { getConn: () => undefined, ancestors: [] },
})

const setEmbedEditing = StateEffect.define<string | null>()

export const setWebLinkSeat = StateEffect.define<number | null>()

export const resolutionNudge = StateEffect.define<null>()

export const setEmbedHeights = StateEffect.define<Record<string, number>>()

export const setEmbedZooms = StateEffect.define<Record<string, number>>()

export interface EmbedHeightsApi {
  load: () => Promise<Record<string, number>>
  save: (heights: Record<string, number>) => void
}

type TileRange =
  | { kind: 'page'; from: number; to: number; path: string; title: string }
  | { kind: 'webpage'; from: number; to: number; url: string; label: string }

interface EmbedTiles {
  deco: DecorationSet
  ranges: TileRange[]
  editing: string | null
  seat: number | null
  heights: Record<string, number>
  zooms: Record<string, number>
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
  const frame = useResizeFrame<{ h: number }>({
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
      view.state.facet(embedHost).saveHeights?.(heights)
    },
  })
  return frame.edges(['s'])[0]
}

const tileEstimate = (height: number | undefined): number =>
  (height ?? TILE_DEFAULT_PX) + TILE_GAP_PX * 2

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
    if (this.height !== undefined) dom.style.height = `${this.height}px`
    else dom.style.removeProperty('height')
    dom.dataset.embedTarget = this.targetId
    applyTileZoom(dom, view.state.field(embedField).zooms[this.targetId])
    const host = view.state.facet(embedHost)
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
        this.interactive && host.saveHeights
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
    this.renderInto(dom, view)
    return dom
  }

  updateDOM(dom: HTMLElement, view: EditorView): boolean {
    if (this.cyclic || !this.mounted(dom)) return false
    this.renderInto(dom as ReactDom, view)
    return true
  }

  destroy(dom: HTMLElement): void {
    this.unmountIfDetached(dom as ReactDom)
  }

  ignoreEvent(): boolean {
    return true
  }
}

interface WebTileDom extends ReactDom {
  _visible?: boolean
  _renderW?: () => void
  _obs?: WebObservers
}

// KNOB — the fit cap's breathing room below the port edges: a tile taller than the port minus this margin can never read fully-visible, and a never-fully-visible tile never goes live.
const WEB_FIT_MARGIN = 96
const WEB_FULL_RATIO = 0.99

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
      for (const d of tiles) d._renderW?.()
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
    readonly pageSurface: boolean,
  ) {
    super()
  }

  eq(o: WebpageTileWidget): boolean {
    return (
      o.url === this.url &&
      o.label === this.label &&
      o.height === this.height &&
      o.pageSurface === this.pageSurface
    )
  }

  get estimatedHeight(): number {
    return tileEstimate(this.height)
  }

  private renderInto(dom: WebTileDom, view: EditorView): void {
    dom.className = 'mdpm-embed-tile tile-base'
    const port = Math.min(
      view.scrollDOM.clientHeight || Number.POSITIVE_INFINITY,
      document.documentElement.clientHeight,
    )
    const wanted = this.height ?? TILE_DEFAULT_PX
    const capped = port > 0 ? clamp(port - WEB_FIT_MARGIN, TILE_MIN_PX, wanted) : wanted
    dom.style.height = `${capped}px`
    const host = view.state.facet(embedHost)
    this.render(
      dom,
      tileTree(
        view.state.facet(editorHost).renderTile({
          kind: 'webpage',
          url: this.url,
          label: this.label,
          visible: this.pageSurface && dom._visible === true,
          tabInactive: host.tabActive?.() === false,
          zoom: zoomStep(view.state.field(embedField).zooms[this.url]).factor,
          refocusHost: () => view.focus(),
        }),
        this.pageSurface && host.saveHeights
          ? createElement(EmbedResizeHandle, { view, span: dom, targetId: this.url })
          : null,
      ),
    )
  }

  toDOM(view: EditorView): HTMLElement {
    const dom = document.createElement('span') as WebTileDom
    dom.dataset.embedTarget = this.url
    dom._renderW = () => this.renderInto(dom, view)
    if (this.pageSurface) {
      const o = observersFor(view)
      o.tiles.add(dom)
      o.io.observe(dom)
      dom._obs = o
    }
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
    this.unmountIfDetached(d)
  }

  ignoreEvent(): boolean {
    return true
  }
}

const fenceLine = Decoration.line({ class: 'mdpm-embed-fence' })
const embedLine = Decoration.line({ class: 'mdpm-embed-line' })

const selectionOn = (state: EditorState, from: number, to: number): boolean =>
  state.selection.ranges.some((s) => s.from <= to && s.to >= from)

function applyTileZoom(dom: HTMLElement, zoom: number | undefined): void {
  const factor = zoomStep(zoom).factor
  if (factor === DEFAULT_ZOOM) dom.style.removeProperty('--tile-zoom')
  else dom.style.setProperty('--tile-zoom', String(factor))
}

function buildTiles(
  state: EditorState,
  editing: string | null,
  heights: Record<string, number>,
  zooms: Record<string, number>,
  prev: readonly TileRange[] | 'mount',
  seat: number | null,
): EmbedTiles {
  const host = state.facet(embedHost)
  const conn = host.getConn()
  const scan = docScan(state.doc)
  const interactive = host.ancestors.length <= 1
  let unformed = 0

  const entries: { from: number; to: number; deco: Decoration; range: TileRange }[] = []
  if (conn && scan.embeds.length > 0) {
    for (const e of claimedEmbeds(scan.embeds, (t) => conn.resolve(t).status)) {
      const r = conn.resolve(e.title)
      if (r.status !== 'resolved' || !r.page) continue
      const path = r.page.path
      const cyclic = host.ancestors.includes(path)
      entries.push({
        from: e.from,
        to: e.to,
        deco: Decoration.replace({
          widget: new EmbedTileWidget(
            path,
            e.title,
            editing === path,
            interactive && !cyclic,
            cyclic,
            host.ancestors,
            r.page.id,
            heights[r.page.id],
          ),
        }),
        range: { kind: 'page', from: e.from, to: e.to, path, title: e.title },
      })
    }
  }
  // The formation gate: typing `https://example.c` mid-address passes the grammar, so the grammar alone can't decide.
  for (const w of scan.webpages) {
    const formed =
      w.from !== seat &&
      (prev === 'mount' ||
        prev.some(
          (p) => p.kind === 'webpage' && p.url === w.url && p.from <= w.to && p.to >= w.from,
        ) ||
        !selectionOn(state, w.from, w.to))
    if (!formed) {
      unformed++
      continue
    }
    entries.push({
      from: w.from,
      to: w.to,
      deco: Decoration.replace({
        widget: new WebpageTileWidget(
          w.url,
          w.label,
          heights[w.url],
          host.saveHeights !== undefined,
        ),
      }),
      range: { kind: 'webpage', from: w.from, to: w.to, url: w.url, label: w.label },
    })
  }
  entries.sort((a, b) => a.from - b.from)

  const builder = new RangeSetBuilder<Decoration>()
  const ranges: TileRange[] = []
  let lastFence = -1
  for (const en of entries) {
    const tileLine = state.doc.lineAt(en.from)
    if (tileLine.number > 1) {
      const above = state.doc.line(tileLine.number - 1)
      if (above.text.trim() === '' && above.from !== lastFence)
        builder.add(above.from, above.from, fenceLine)
    }
    builder.add(tileLine.from, tileLine.from, embedLine)
    builder.add(en.from, en.to, en.deco)
    if (tileLine.number < state.doc.lines) {
      const below = state.doc.line(tileLine.number + 1)
      if (below.text.trim() === '') {
        builder.add(below.from, below.from, fenceLine)
        lastFence = below.from
      }
    }
    ranges.push(en.range)
  }
  return { deco: builder.finish(), ranges, editing, heights, zooms, unformed, seat }
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

export const embedField = StateField.define<EmbedTiles>({
  create: (state) => buildTiles(state, null, {}, {}, 'mount', null),
  update(value, tr) {
    let editing = value.editing
    let heights = value.heights
    let zooms = value.zooms
    let seat = value.seat === null ? null : tr.changes.mapPos(value.seat, 1)
    let nudged = false
    for (const e of tr.effects) {
      if (e.is(setWebLinkSeat)) seat = e.value
      else if (e.is(setEmbedEditing)) editing = e.value
      else if (e.is(resolutionNudge)) nudged = true
      else if (e.is(setEmbedHeights)) heights = e.value
      else if (e.is(setEmbedZooms)) zooms = e.value
    }
    const selMoved = !tr.startState.selection.eq(tr.state.selection)
    const formationDue = value.unformed > 0 && selMoved
    // Leaving the seated line IS the submission; a seat outliving its line would hold the next tile raw.
    if (seat !== null) {
      const line = seat <= tr.state.doc.length ? tr.state.doc.lineAt(seat) : null
      if (!line || line.from !== seat || !loneWebpageEmbed(line.text)) seat = null
      else if (selMoved && !selectionOn(tr.state, line.from, line.to)) seat = null
    }
    const restored = tr.isUserEvent('undo') || tr.isUserEvent('redo')
    if (!tr.docChanged) {
      if (
        nudged ||
        editing !== value.editing ||
        heights !== value.heights ||
        seat !== value.seat ||
        formationDue
      )
        return buildTiles(tr.state, editing, heights, zooms, value.ranges, seat)
      return zooms !== value.zooms ? { ...value, zooms } : value
    }
    if (editAffectsEmbeds(value, tr) || formationDue || restored || seat !== value.seat)
      return buildTiles(
        tr.state,
        editing,
        heights,
        zooms,
        restored ? 'mount' : mapRanges(value.ranges, tr),
        seat,
      )
    return {
      deco: value.deco.map(tr.changes),
      ranges: mapRanges(value.ranges, tr),
      editing,
      heights,
      zooms,
      unformed: value.unformed,
      seat,
    }
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
    private readonly onDown: (e: PointerEvent) => void
    private dismissal: DismissalHandle | null = null

    constructor(view: EditorView) {
      this.onDown = (e) => {
        const t = e.target as HTMLElement | null
        // CM never hears a press inside a tile, but the browser still drags the host's selection to the line above.
        if (t?.closest?.('.mdpm-embed-tile') && view.dom.contains(t))
          requestAnimationFrame(() => {
            if (view.hasFocus) view.contentDOM.blur()
          })
        if (!view.state.field(embedField).editing) return
        if (t?.closest?.('.mdpm-embed-tile.is-editing-tile')) return
        view.dispatch({ effects: setEmbedEditing.of(null) })
      }
      document.addEventListener('pointerdown', this.onDown, true)
    }

    update(u: ViewUpdate): void {
      const editing = u.state.field(embedField).editing
      if (editing === u.startState.field(embedField).editing) return
      if (!editing) {
        this.dismissal?.release()
        this.dismissal = null
        return
      }
      const { view } = u
      this.dismissal ??= pushEscape(() => view.dispatch({ effects: setEmbedEditing.of(null) }))
    }

    destroy(): void {
      document.removeEventListener('pointerdown', this.onDown, true)
      this.dismissal?.release()
    }
  },
)

// Per tile, never a document-wide sum — a summed compare would let one tile's un-gluing pay for another's regression.
function gluedOf(doc: Text, from: number): number {
  let glued = 0
  const n = doc.lineAt(Math.min(from, doc.length)).number
  if (n > 1 && doc.line(n - 1).text.trim() !== '') glued++
  if (n < doc.lines && doc.line(n + 1).text.trim() !== '') glued++
  return glued
}

function boundaryRepair(
  tr: Transaction,
  r: TileRange,
): { from: number; insert: string; caret: number } | null {
  const changes: { from: number; to: number; text: string }[] = []
  tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
    changes.push({ from: fromA, to: toA, text: inserted.toString() })
  })
  if (changes.length !== 1) return null
  const [{ from, to, text }] = changes
  if (from !== to || text === '') return null
  if (from === r.from) return { from, insert: `${text}\n`, caret: from + text.length }
  if (from === r.to) return { from, insert: `\n${text}`, caret: from + 1 + text.length }
  return null
}

// A CLAIMED embed line can be removed whole but never eroded: a pure boundary insertion repairs, the rest refuse.
const embedGuard = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged) return tr
  const { ranges } = tr.startState.field(embedField)
  if (ranges.length === 0) return tr
  let hasDeletion = false
  tr.changes.iterChangedRanges((fromA, toA) => {
    if (toA > fromA) hasDeletion = true
  })
  if (hasDeletion) {
    for (const r of ranges) {
      const mappedFrom = tr.changes.mapPos(r.from, 1)
      const line = tr.newDoc.lineAt(Math.min(mappedFrom, tr.newDoc.length))
      const stillLone =
        r.kind === 'page'
          ? loneEmbedTitle(line.text) === r.title
          : loneWebpageEmbed(line.text)?.url === r.url
      if (!stillLone) continue
      if (gluedOf(tr.newDoc, mappedFrom) > gluedOf(tr.startState.doc, r.from)) return []
    }
  }
  for (const r of ranges) {
    // A change STRICTLY INSIDE the token is in-place damage — word motion bypasses the atomic absorb.
    let interior = false
    tr.changes.iterChangedRanges((fromA, toA) => {
      const overlaps = fromA < r.to && toA > r.from
      const covers = fromA <= r.from && toA >= r.to
      if (overlaps && !covers) interior = true
    })
    if (interior) return []
    const mapped = tr.changes.mapPos(r.from, 1)
    const line = tr.newDoc.lineAt(Math.min(mapped, tr.newDoc.length))
    const present =
      r.kind === 'page'
        ? line.text.includes(pageEmbedText(r.title))
        : line.text.includes(`](${r.url})`)
    if (!present) continue
    const lone =
      r.kind === 'page' ? loneEmbedTitle(line.text) !== null : loneWebpageEmbed(line.text) !== null
    if (lone) continue
    const repair = boundaryRepair(tr, r)
    if (repair) {
      const userEvent = tr.annotation(Transaction.userEvent)
      return [
        {
          changes: { from: repair.from, insert: repair.insert },
          selection: { anchor: repair.caret },
          annotations: userEvent ? Transaction.userEvent.of(userEvent) : undefined,
        },
      ]
    }
    return []
  }
  return tr
})

function embedPrefKey(state: EditorState, pos: number): string | null {
  const r = state.field(embedField).ranges.find((t) => t.from <= pos && pos <= t.to)
  if (!r) return null
  if (r.kind === 'webpage') return r.url
  const resolved = state.facet(embedHost).getConn()?.resolve(r.title)
  return resolved?.status === 'resolved' ? (resolved.page?.id ?? null) : null
}

export function embedZoomAt(state: EditorState, pos: number): number | null {
  const key = embedPrefKey(state, pos)
  return key === null ? null : zoomStep(state.field(embedField).zooms[key]).factor
}

function ownTiles(view: EditorView): WebTileDom[] {
  const tiles: WebTileDom[] = []
  for (const el of view.dom.querySelectorAll<HTMLElement>('[data-embed-target]')) {
    if (el.closest('.cm-content') === view.contentDOM) tiles.push(el as WebTileDom)
  }
  return tiles
}

export function refreshTileZooms(view: EditorView, animate: boolean): void {
  const zooms = view.state.field(embedField).zooms
  for (const span of ownTiles(view)) {
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
  for (const span of ownTiles(view)) span._renderW?.()
}

export function applyEmbedZoom(view: EditorView, pos: number, factor: number): void {
  const key = embedPrefKey(view.state, pos)
  if (key === null) return
  const zooms = { ...view.state.field(embedField).zooms }
  if (factor === DEFAULT_ZOOM) delete zooms[key]
  else zooms[key] = factor
  view.dispatch({ effects: setEmbedZooms.of(zooms) })
  view.state.facet(embedHost).saveZooms?.(zooms)
  refreshTileZooms(view, true)
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
    if ((event.target as HTMLElement).closest?.('.mdpm-embed-tile')) return false
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
    embedGuard,
    embedClickSeat,
    editingExit,
    reslotHeal,
  ]
}
