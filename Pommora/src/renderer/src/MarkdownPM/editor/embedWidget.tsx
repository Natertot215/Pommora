// The embedded-page tile: a claimed lone-line `![[Title]]` renders as a live page tile on its own
// real .cm-line. A StateField owns the replace decorations — only static decorations reach CM's
// height map, so a ViewPlugin-sourced tile would under-report the scrollbar for every off-screen
// embed. The claim (resolved + first-per-normalized-title) is claimedEmbeds — the same predicate
// the token suppression reads, so the tile and the dim token can never disagree about a line.
import { createRoot, type Root } from 'react-dom/client'
import { createElement, Fragment, lazy, Suspense, type ReactNode } from 'react'
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
  WidgetType,
} from '@codemirror/view'
import { cx } from '@renderer/design-system/cx'
import { usePointerGesture } from '@renderer/design-system/interactions/gesture'
import { clamp } from '@renderer/design-system/clamp'
import { TILE_DEFAULT_PX, TILE_MIN_PX } from '@renderer/design-system/tokens/size.css'
import { normalizeTitle, titleFromPath } from '@shared/connections'
import '@renderer/design-system/tile-chassis.css'
import { loneWebpageEmbed } from '@shared/webpageEmbed'
import { docScan } from './docCache'
import { loneEmbedTitle } from '../detect'
import { claimedEmbeds } from './embedRanges'
import { healTileScrolls, tileWarmSeam } from '@renderer/Embeds/tileWarm'
import type { ConnectionsApi } from '../connections'

export interface EmbedHost {
  getConn: () => ConnectionsApi | undefined
  /** The embed-host chain above this editor — cycle guard + nesting depth. A tile is interactive
   *  only while the chain is at most one deep; a target already in the chain renders inert. */
  ancestors: readonly string[]
  /** Present only where heights can persist (the page surface) — the handle hides otherwise. */
  saveHeights?: (heights: Record<string, number>) => void
}

const embedHost = Facet.define<EmbedHost, EmbedHost>({
  combine: (v) => v[0] ?? { getConn: () => undefined, ancestors: [] },
})

/** Flips which tile (by target path) holds the live edit; null ends it. */
export const setEmbedEditing = StateEffect.define<string | null>()

/** The webpage line Edit Link seated the caret in — held raw until the selection leaves it, so the
 *  address is edited in place and the site is asked to load again only once the line re-forms. */
export const setWebLinkSeat = StateEffect.define<number | null>()

/** The resolution nudge — dispatched when the page index changes identity, so tiles and
 *  connection styling react to a rename/delete/restore without waiting for a caret move. */
export const resolutionNudge = StateEffect.define<null>()

/** Replaces the host page's persisted tile heights (target page id → px) — loaded once at mount,
 *  updated whole on each resize commit. */
export const setEmbedHeights = StateEffect.define<Record<string, number>>()

/** Persistence callbacks the host page supplies; absent (preview, blocks) hides the resize handle. */
export interface EmbedHeightsApi {
  load: () => Promise<Record<string, number>>
  save: (heights: Record<string, number>) => void
}

export type TileRange =
  | { kind: 'page'; from: number; to: number; path: string; title: string }
  | { kind: 'webpage'; from: number; to: number; url: string; label: string }

interface EmbedTiles {
  deco: DecorationSet
  ranges: TileRange[]
  editing: string | null
  /** The webpage line being re-aimed in place, or null. */
  seat: number | null
  /** Persisted tile heights, target page id → px; {} until the host's load lands. */
  heights: Record<string, number>
  /** Webpage candidates the formation gate declined (the selection sat on their line) — a
   *  selection move re-evaluates only while this is non-zero. */
  unformed: number
}

// PageEmbed mounts MarkdownEditor, which registers this extension — a static import would be the
// cycle. React.lazy owns the load-order problem the manual then-capture pattern mishandles under
// async module graphs; Suspense's null fallback is the loading frame estimatedHeight covers.
const LazyPageEmbed = lazy(() =>
  import('@renderer/Embeds/PageEmbed').then((m) => ({ default: m.PageEmbed })),
)

interface TileDom extends HTMLElement {
  _root?: Root
}

/** Mount a tile's tree into its own React root, created on first render. Both tiles lazy-load their
 *  surface, so the body sits under a Suspense boundary — and the resize handle deliberately sits
 *  OUTSIDE it: the handle depends on nothing that suspends and must exist through the loading frame
 *  too. */
function mountTile(dom: TileDom, body: ReactNode, handle: ReactNode): void {
  let root = dom._root
  if (!root) {
    root = createRoot(dom)
    dom._root = root
  }
  root.render(
    createElement(
      Fragment,
      null,
      createElement(
        Suspense,
        { fallback: null },
        createElement('div', { className: 'tile-chassis-body' }, body),
      ),
      handle,
    ),
  )
}

// CM hands a tile's DOM to its successor widget on rebuilds and relocations, and calls destroy
// BEFORE detaching on a real delete — so connectivity is only decidable after the update settles:
// an adopted node is still in the document (unmounting would blank the reused tile), a deleted one
// is gone and its root must unmount or the nested editor leaks whole.
function unmountIfDetached(d: TileDom): void {
  queueMicrotask(() => {
    const root = d._root
    if (d.isConnected || !root) return
    d._root = undefined
    root.unmount()
  })
}

/** The bottom-edge resize strip: drag sets the tile's height live (writing the widget span and
 *  remeasuring — CM's observer watches only scrollDOM, so a widget growing inside it is invisible
 *  without requestMeasure), Escape restores, drop persists through the host's save callback. */
function EmbedResizeHandle({
  view,
  targetId,
}: {
  view: EditorView
  targetId: string
}): React.JSX.Element {
  const beginGesture = usePointerGesture()
  return createElement('div', {
    className: 'mdpm-embed-resize',
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return
      e.preventDefault()
      const strip = e.currentTarget
      const span = strip.parentElement
      if (!span) return
      const startH = span.getBoundingClientRect().height
      const startY = e.clientY
      // The drop commits the height the drag computed, never a DOM re-read — a tile degrading under
      // the pointer (target deleted or renamed mid-drag) detaches the span, and a detached rect's 0
      // would fail the main-process guard and silently refuse every later save on this page.
      let lastH = Math.round(startH)
      beginGesture({
        el: strip,
        event: e,
        activation: 0, // a resize arms on the first move, the SurfacePM edge precedent
        onActivate: () => {
          span.classList.add('is-resizing-tile')
          return undefined
        },
        onDragMove: (ev) => {
          lastH = Math.max(TILE_MIN_PX, Math.round(startH + ev.clientY - startY))
          span.style.height = `${lastH}px`
          view.requestMeasure()
        },
        teardown: () => span.classList.remove('is-resizing-tile'),
        onDrop: () => {
          const heights = { ...view.state.field(embedField).heights, [targetId]: lastH }
          view.dispatch({ effects: setEmbedHeights.of(heights) })
          view.state.facet(embedHost).saveHeights?.(heights)
        },
        onAbort: () => {
          span.style.height = `${startH}px`
          view.requestMeasure()
        },
      })
    },
  })
}

class EmbedTileWidget extends WidgetType {
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

  eq(o: EmbedTileWidget): boolean {
    return (
      o.path === this.path &&
      o.editing === this.editing &&
      o.interactive === this.interactive &&
      o.cyclic === this.cyclic &&
      o.height === this.height
    )
  }

  // A real estimate (not the don't-estimate sentinel) so off-screen tiles hold scrollbar-true
  // height before their first measure; CM corrects on render. Tracks the persisted height so a
  // resized tile reports true even before it scrolls in.
  get estimatedHeight(): number {
    return this.height ?? TILE_DEFAULT_PX
  }

  private renderInto(dom: TileDom, view: EditorView): void {
    dom.className = cx(
      'mdpm-embed-tile tile-chassis',
      this.editing && 'is-editing-tile',
      !this.interactive && 'is-inert',
    )
    if (this.height !== undefined) dom.style.height = `${this.height}px`
    else dom.style.removeProperty('height')
    const host = view.state.facet(embedHost)
    mountTile(
      dom,
      createElement(LazyPageEmbed, {
        path: this.path,
        editing: this.editing,
        onBeginEdit: () => {
          if (this.interactive) view.dispatch({ effects: setEmbedEditing.of(this.path) })
        },
        connections: host.getConn(),
        locked: !this.interactive,
        ancestors: this.ancestors,
        chrome: 'page',
        warm: tileWarmSeam([...this.ancestors, this.path]),
      }),
      this.interactive && host.saveHeights
        ? createElement(EmbedResizeHandle, { view, targetId: this.targetId })
        : null,
    )
  }

  toDOM(view: EditorView): HTMLElement {
    const dom = document.createElement('span') as TileDom
    if (this.cyclic) {
      dom.className = 'mdpm-embed-cycle md-embed'
      dom.textContent = this.title
      return dom
    }
    this.renderInto(dom, view)
    return dom
  }

  // Re-render the existing root in place (an editing flip must not remount the inner editor —
  // the compartment reconfigure is the whole point).
  updateDOM(dom: HTMLElement, view: EditorView): boolean {
    if (this.cyclic || !(dom as TileDom)._root) return false
    this.renderInto(dom as TileDom, view)
    return true
  }

  destroy(dom: HTMLElement): void {
    unmountIfDetached(dom as TileDom)
  }

  ignoreEvent(): boolean {
    return true
  }
}

/** The webpage tile's seat on the shared chassis. */
interface WebTileDom extends TileDom {
  _visible?: boolean
  _renderW?: () => void
  _obs?: WebObservers
}

// KNOB — the fit cap's breathing room below the port edges: the pane's vertical insets sit
// inside the viewport, and a tile taller than the port minus this margin can never read
// fully-visible — a never-fully-visible tile never goes live.
const WEB_FIT_MARGIN = 96
// Full visibility with subpixel slack: fractional zoom can report ~0.999 for a fully visible
// tile, and demanding an exact 1 there would hold it on its static face forever.
const WEB_FULL_RATIO = 0.99

interface WebObservers {
  io: IntersectionObserver
  ro: ResizeObserver
  tiles: Set<WebTileDom>
}

// One observer pair per editor scroller, shared by its tiles — transitions only, per the
// no-per-scroll-work rule. Keyed weakly so a destroyed editor's pair collects with it.
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
      // Viewport root, never an element: the page's real scroller is a pane ABOVE the editor
      // (scrollDOM doesn't scroll there), and an element root only counts the clips between
      // target and root — the viewport folds in every clipping ancestor there is. The acceptance
      // ratio must itself be a threshold: fractional layout tops a fully visible tile out just
      // below 1, and a lone threshold of 1 then never fires the callback at all.
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

const LazyWebpageEmbed = lazy(() =>
  import('@renderer/Embeds/WebpageEmbed').then((m) => ({ default: m.WebpageEmbed })),
)

class WebpageTileWidget extends WidgetType {
  constructor(
    readonly url: string,
    readonly label: string,
    readonly height: number | undefined,
    /** Guests run live only on the page surface; nested editors (a page-embed body, the hover
     *  card) render the face unconditionally. NOT an ancestors-length read — the page surface
     *  carries its own path in the chain as the cycle guard, so length can't tell it apart. */
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
    return this.height ?? TILE_DEFAULT_PX
  }

  private renderInto(dom: WebTileDom, view: EditorView): void {
    dom.className = 'mdpm-embed-tile tile-chassis'
    // The fit cap, applied and re-applied at render time: a tile taller than its port can never
    // be fully visible, so the stored height yields to what the port can hold. The port is the
    // tighter of the editor's own scroller and the window — scrollDOM doesn't scroll on the page
    // surface, where its clientHeight is the whole document's.
    const port = Math.min(
      view.scrollDOM.clientHeight || Number.POSITIVE_INFINITY,
      document.documentElement.clientHeight,
    )
    const wanted = this.height ?? TILE_DEFAULT_PX
    const capped = port > 0 ? clamp(port - WEB_FIT_MARGIN, TILE_MIN_PX, wanted) : wanted
    dom.style.height = `${capped}px`
    const host = view.state.facet(embedHost)
    mountTile(
      dom,
      createElement(LazyWebpageEmbed, {
        url: this.url,
        label: this.label,
        visible: this.pageSurface && dom._visible === true,
        refocusHost: () => view.focus(),
      }),
      // Heights ride the same persisted blob as page tiles, URL-keyed — the blob's keys are free
      // by design.
      this.pageSurface && host.saveHeights
        ? createElement(EmbedResizeHandle, { view, targetId: this.url })
        : null,
    )
  }

  toDOM(view: EditorView): HTMLElement {
    const dom = document.createElement('span') as WebTileDom
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
    if (!d._root) return false
    d._renderW = () => this.renderInto(d, view)
    this.renderInto(d, view)
    return true
  }

  destroy(dom: HTMLElement): void {
    const d = dom as WebTileDom
    d._obs?.io.unobserve(d)
    d._obs?.tiles.delete(d)
    unmountIfDetached(d)
  }

  ignoreEvent(): boolean {
    return true
  }
}

const fenceLine = Decoration.line({ class: 'mdpm-embed-fence' })
// The tile's own line drops its text strut — the leading a line-height reserves for glyphs that
// aren't there — so the tile sits at its margins, not a phantom line of space below them.
const embedLine = Decoration.line({ class: 'mdpm-embed-line' })

/** Whether any selection range touches the line span — the formation gate's predicate. */
const selectionOn = (state: EditorState, from: number, to: number): boolean =>
  state.selection.ranges.some((s) => s.from <= to && s.to >= from)

function buildTiles(
  state: EditorState,
  editing: string | null,
  heights: Record<string, number>,
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
        // The cycle token joins too: exclusions already cover it via the ancestors chain, and
        // without a range here it would be the one replaced line with no absorb and no guard.
        range: { kind: 'page', from: e.from, to: e.to, path, title: e.title },
      })
    }
  }
  // The formation gate: a valid line claims at mount, or once the selection is off it — typing
  // `https://example.c` mid-address passes the grammar, so the grammar can never be the whole
  // test. A tile formed once survives regardless of where the selection goes next, unless Edit
  // Link seated the caret in it on purpose, which returns the line to the address it holds.
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
  // The fencing blanks are mechanism, not content: they keep their seat and their deletion
  // refusal, but render collapsed so the tile sits against its real neighbors. A blank shared
  // between two tiles is one line and gets the class once.
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
  return { deco: builder.finish(), ranges, editing, heights, unformed, seat }
}

// Rebuild when the doc's embed set itself moved — read from the SAME cached scan every keystroke
// already pays for, so the gate can never disagree with the scanner about what an embed is (a fence
// typed above a tile changes the exclusion set without ever touching the tile's own lines).
function editAffectsEmbeds(value: EmbedTiles, tr: Transaction): boolean {
  const doc = tr.startState.doc
  for (const r of value.ranges) {
    // The whole adjacent lines, not just the boundary newlines — an interior edit on a neighbor
    // can flip it blank ↔ non-blank, which moves the fence collapse.
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

/** Whether one scanned line set gained, lost, changed identity, or slid off where the changes map
 *  its members to — the per-kind half of editAffectsEmbeds. */
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

/** The prior ranges in the new doc's coordinates — what formation matches candidates against. */
const mapRanges = (ranges: readonly TileRange[], tr: Transaction): TileRange[] =>
  ranges.map((r) => ({
    ...r,
    from: tr.changes.mapPos(r.from, 1),
    to: tr.changes.mapPos(r.to, -1),
  }))

export const embedField = StateField.define<EmbedTiles>({
  create: (state) => buildTiles(state, null, {}, 'mount', null),
  update(value, tr) {
    let editing = value.editing
    let heights = value.heights
    let seat = value.seat === null ? null : tr.changes.mapPos(value.seat, 1)
    let nudged = false
    for (const e of tr.effects) {
      if (e.is(setWebLinkSeat)) seat = e.value
      else if (e.is(setEmbedEditing)) editing = e.value
      else if (e.is(resolutionNudge)) nudged = true
      else if (e.is(setEmbedHeights)) heights = e.value
    }
    // Selection changes are transactions, so the selection-departure trigger needs no dispatcher:
    // while unformed candidates exist, any selection move re-runs the formation check. Undo/redo
    // form like a mount — a restored tile line was a tile, and the restoring selection sits on it.
    const selMoved = !tr.startState.selection.eq(tr.state.selection)
    const formationDue = value.unformed > 0 && selMoved
    // Leaving the seated line IS the submission: the seat clears, and the line re-forms around
    // whatever address it now holds. The seat also dies with its line — one that was deleted or
    // is no longer an address has nothing to hold open, and a stale position would hold whatever
    // tile later lands on it raw.
    if (seat !== null) {
      const line = seat <= tr.state.doc.length ? tr.state.doc.lineAt(seat) : null
      if (!line || line.from !== seat || !loneWebpageEmbed(line.text)) seat = null
      else if (selMoved && !selectionOn(tr.state, line.from, line.to)) seat = null
    }
    const restored = tr.isUserEvent('undo') || tr.isUserEvent('redo')
    if (!tr.docChanged) {
      return nudged ||
        editing !== value.editing ||
        heights !== value.heights ||
        seat !== value.seat ||
        formationDue
        ? buildTiles(tr.state, editing, heights, value.ranges, seat)
        : value
    }
    if (editAffectsEmbeds(value, tr) || formationDue || restored || seat !== value.seat)
      return buildTiles(
        tr.state,
        editing,
        heights,
        restored ? 'mount' : mapRanges(value.ranges, tr),
        seat,
      )
    return {
      deco: value.deco.map(tr.changes),
      ranges: mapRanges(value.ranges, tr),
      editing,
      heights,
      unformed: value.unformed,
      seat,
    }
  },
  provide: (f) => EditorView.decorations.from(f, (v) => v.deco),
})

// The skip-over absorb: each tile's atomic range swallows its boundary newlines (clamped at doc
// edges). Char/vertical motion can never seat the caret on the embed line; doc-edge boundary seats
// and syntax-aware word motion can — every keystroke from ANY seat is guarded (interior damage is
// refused, boundary insertions repair onto their own line).
const embedAtomic = EditorView.atomicRanges.of((view) => {
  const { ranges } = view.state.field(embedField)
  if (ranges.length === 0) return Decoration.none
  const b = new RangeSetBuilder<Decoration>()
  const len = view.state.doc.length
  for (const r of ranges)
    b.add(Math.max(0, r.from - 1), Math.min(len, r.to + 1), Decoration.mark({}))
  return b.finish()
})

// Click-out + Escape end the live edit — the same pair BlockSurface owns for SurfacePM tiles.
// Capture-phase so nothing inside the editor can swallow the exit; Escape yields to a consumer
// that already handled it (the autocomplete panel eats the first Esc).
const editingExit = ViewPlugin.fromClass(
  class {
    private readonly onDown: (e: PointerEvent) => void
    private readonly onKey: (e: KeyboardEvent) => void

    constructor(view: EditorView) {
      this.onDown = (e) => {
        const t = e.target as HTMLElement | null
        // A press inside a tile is the tile's, and CM never hears it (ignoreEvent takes the whole
        // event out of the pipeline) — but the browser still drags the host's selection to the
        // nearest seat it can take, the line above the tile, and leaves a live caret blinking
        // there. The host gives its caret up instead. Read a frame later, after the press's own
        // focus work: a surface inside the tile that took the focus itself makes this a no-op.
        if (t?.closest?.('.mdpm-embed-tile') && view.dom.contains(t))
          requestAnimationFrame(() => {
            if (view.hasFocus) view.contentDOM.blur()
          })
        if (!view.state.field(embedField).editing) return
        if (t?.closest?.('.mdpm-embed-tile.is-editing-tile')) return
        view.dispatch({ effects: setEmbedEditing.of(null) })
      }
      this.onKey = (e) => {
        if (e.key !== 'Escape' || e.defaultPrevented) return
        if (view.state.field(embedField).editing)
          view.dispatch({ effects: setEmbedEditing.of(null) })
      }
      document.addEventListener('pointerdown', this.onDown, true)
      window.addEventListener('keydown', this.onKey)
    }

    destroy(): void {
      document.removeEventListener('pointerdown', this.onDown, true)
      window.removeEventListener('keydown', this.onKey)
    }
  },
)

/** One tile's count of non-blank immediate neighbors — the fence predicate. Hand-typed gluing is
 *  legal authoring, so a DELETION may never raise a tile's OWN count (removing its fencing blank).
 *  Per tile, never a document-wide sum — a summed compare would let one tile's un-gluing pay for
 *  another's regression. */
function gluedOf(doc: Text, from: number): number {
  let glued = 0
  const n = doc.lineAt(Math.min(from, doc.length)).number
  if (n > 1 && doc.line(n - 1).text.trim() !== '') glued++
  if (n < doc.lines && doc.line(n + 1).text.trim() !== '') glued++
  return glued
}

/** The insertion repair for an eroded tile line, or null when the transaction has to be refused.
 *  Only ONE pure non-empty insertion seated exactly at a tile boundary repairs — it lands on its
 *  own fresh line, carrying the caret to the end of what was typed. */
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

// The lone-line guard: a CLAIMED embed line (a live tile) can be removed whole — the menu's delete,
// a spanning selection — but never eroded in place. A transaction that leaves the tile's `![[…]]`
// on a no-longer-lone line is a join or an edge-seat insertion: pure boundary-seat insertions are
// REPAIRED onto a fresh adjacent line (the caret's visible seat beside a document-edge tile), and
// everything else is refused. Unclaimed lines are ordinary text and stay editable.
const embedGuard = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged) return tr
  const { ranges } = tr.startState.field(embedField)
  if (ranges.length === 0) return tr
  // The fence: a deletion that leaves a surviving tile glued to content it was blank-separated
  // from has removed the lone fencing blank — refused, exactly as the table refuses fusion.
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
    // A change landing STRICTLY INSIDE the token is in-place damage, never a removal — the atomic
    // absorb stops motion, but syntax-aware word motion (and any future seat) bypasses it, and a
    // damaged token would otherwise slip the gone-whole test below. Refused outright.
    let interior = false
    tr.changes.iterChangedRanges((fromA, toA) => {
      const overlaps = fromA < r.to && toA > r.from
      const covers = fromA <= r.from && toA >= r.to
      if (overlaps && !covers) interior = true
    })
    if (interior) return []
    const mapped = tr.changes.mapPos(r.from, 1)
    const line = tr.newDoc.lineAt(Math.min(mapped, tr.newDoc.length))
    // The presence probe reads the URL verbatim rather than recomposing the line — a label whose
    // on-disk escapes are non-canonical wouldn't round-trip through compose byte-identically.
    const present =
      r.kind === 'page' ? line.text.includes(`![[${r.title}]]`) : line.text.includes(`](${r.url})`)
    if (!present) continue // syntax gone whole → a legal removal
    const lone =
      r.kind === 'page' ? loneEmbedTitle(line.text) !== null : loneWebpageEmbed(line.text) !== null
    if (lone) continue // still lone → untouched or cleanly shifted
    const repair = boundaryRepair(tr, r)
    if (repair) {
      // The userEvent rides along — a filtered transaction rebuilds from startState and would
      // otherwise drop it, splitting history grouping (the callout guard's own discipline).
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

/** The claimed-tile spans — the boundary-delete refusals and the grip menu both read them. */
export function embedTileRanges(state: EditorState): readonly TileRange[] {
  return state.field(embedField, false)?.ranges ?? []
}

/** The titles this document may not embed — every tile it already holds, plus its whole host chain.
 *  The grip menu's pick tree and the `![[` autocomplete pool both filter on this one set. */
export function embedExclusions(state: EditorState): Set<string> {
  const out = new Set<string>()
  // Page ranges only — a webpage label collides with real page titles by construction (Short
  // Link, Page Title), and admitting one here would delete that page from the autocomplete pool
  // and the grip's pick tree.
  for (const t of embedTileRanges(state)) if (t.kind === 'page') out.add(normalizeTitle(t.title))
  for (const a of state.facet(embedHost).ancestors) out.add(normalizeTitle(titleFromPath(a)))
  return out
}

// A click landing on a tile's line seats by NEARER edge — CM's atomic default always snaps
// backward, so a click at a tile's bottom sliver would otherwise teleport the caret to the seat
// above the whole tile. Clicks inside the widget's own box stay the widget's (ignoreEvent).
const embedClickSeat = EditorView.domEventHandlers({
  mousedown(event, view) {
    // Only a plain single left press is this handler's: extending selections, double/triple-click,
    // and other buttons keep CM's own semantics even beside a tile.
    if (event.button !== 0 || event.shiftKey || event.detail > 1) return false
    // Cheapest first — a page holding no tiles pays neither the ancestor walk nor the hit-test.
    const { ranges } = view.state.field(embedField)
    if (ranges.length === 0) return false
    if ((event.target as HTMLElement).closest?.('.mdpm-embed-tile')) return false
    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
    if (pos === null) return false
    for (const r of ranges) {
      if (pos < r.from || pos > r.to) continue
      const block = view.lineBlockAt(r.from)
      // documentTop, not a hand-rolled scroller offset — block positions start below .cm-content's
      // top padding (the header zone), which a scrollDOM-based conversion silently omits.
      const y = event.clientY - view.documentTop
      // The band gate: posAtCoords clamps presses in the content's padding onto the nearest
      // position, so a doc ENDING in a tile would hand this handler the entire bottom padding —
      // outside the tile's own band the press stays CM's (drag-select lives there).
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

// Any update can re-slot tile DOM (a rebuild's DOM sync moves nodes via detach + re-insert), and
// the detach zeroes every scroller inside the tile with no event and — on full reuse — no widget
// callback. The update cycle is the one signal a re-slot can't dodge: after each update on a
// tile-bearing doc, run the warm editors' scroll self-checks in the measure phase, before paint.
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
