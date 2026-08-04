// The embedded-page tile: a claimed lone-line `![[Title]]` renders as a live page tile on its own
// real .cm-line. A StateField owns the replace decorations — only static decorations reach CM's
// height map, so a ViewPlugin-sourced tile would under-report the scrollbar for every off-screen
// embed. The claim (resolved + first-per-normalized-title) is claimedEmbeds — the same predicate
// the token suppression reads, so the tile and the dim token can never disagree about a line.
import { createRoot, type Root } from 'react-dom/client'
import { createElement, Fragment, lazy, Suspense } from 'react'
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
import { Decoration, type DecorationSet, EditorView, ViewPlugin, WidgetType } from '@codemirror/view'
import { cx } from '@renderer/design-system/cx'
import { usePointerGesture } from '@renderer/design-system/interactions/gesture'
import { TILE_MIN_PX } from '@renderer/design-system/tokens/size.css'
import { normalizeTitle, titleFromPath } from '@shared/connections'
import '@renderer/design-system/tile-chassis.css'
import { docScan } from './docCache'
import { loneEmbedTitle } from '../detect'
import { claimedEmbeds } from './embedRanges'
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

export interface TileRange {
  from: number
  to: number
  path: string
  title: string
}

interface EmbedTiles {
  deco: DecorationSet
  ranges: TileRange[]
  editing: string | null
  /** Persisted tile heights, target page id → px; {} until the host's load lands. */
  heights: Record<string, number>
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
    return this.height ?? 320
  }

  private renderInto(dom: TileDom, view: EditorView): void {
    dom.className = cx(
      'mdpm-embed-tile tile-chassis',
      this.editing && 'is-editing-tile',
      !this.interactive && 'is-inert',
    )
    if (this.height !== undefined) dom.style.height = `${this.height}px`
    else dom.style.removeProperty('height')
    let root = dom._root
    if (!root) {
      root = createRoot(dom)
      dom._root = root
    }
    const host = view.state.facet(embedHost)
    const conn = host.getConn()
    root.render(
      createElement(
        Fragment,
        null,
        createElement(
          Suspense,
          { fallback: null },
          createElement(
            'div',
            { className: 'tile-chassis-body' },
            createElement(LazyPageEmbed, {
              path: this.path,
              editing: this.editing,
              onBeginEdit: () => {
                if (this.interactive) view.dispatch({ effects: setEmbedEditing.of(this.path) })
              },
              connections: conn,
              locked: !this.interactive,
              ancestors: this.ancestors,
              chrome: 'page',
            }),
          ),
        ),
        // Outside the Suspense boundary — the handle depends on nothing that suspends and must
        // exist through the loading frame too.
        this.interactive && host.saveHeights
          ? createElement(EmbedResizeHandle, { view, targetId: this.targetId })
          : null,
      ),
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
    // CM hands a tile's DOM to its successor widget on rebuilds and relocations, and calls destroy
    // BEFORE detaching on a real delete — so connectivity is only decidable after the update
    // settles: an adopted node is still in the document (unmounting would blank the reused tile),
    // a deleted one is gone and its root must unmount or the nested editor leaks whole.
    const d = dom as TileDom
    queueMicrotask(() => {
      const root = d._root
      if (d.isConnected || !root) return
      d._root = undefined
      root.unmount()
    })
  }

  ignoreEvent(): boolean {
    return true
  }
}

const fenceLine = Decoration.line({ class: 'mdpm-embed-fence' })
// The tile's own line drops its text strut — the leading a line-height reserves for glyphs that
// aren't there — so the tile sits at its margins, not a phantom line of space below them.
const embedLine = Decoration.line({ class: 'mdpm-embed-line' })

function buildTiles(
  state: EditorState,
  editing: string | null,
  heights: Record<string, number>,
): EmbedTiles {
  const host = state.facet(embedHost)
  const conn = host.getConn()
  const embeds = docScan(state.doc).embeds
  if (!conn || embeds.length === 0) return { deco: Decoration.none, ranges: [], editing, heights }
  const claimed = claimedEmbeds(embeds, (t) => conn.resolve(t).status)
  if (claimed.length === 0) return { deco: Decoration.none, ranges: [], editing, heights }
  const interactive = host.ancestors.length <= 1
  const builder = new RangeSetBuilder<Decoration>()
  const ranges: TileRange[] = []
  // The fencing blanks are mechanism, not content: they keep their seat and their deletion
  // refusal, but render collapsed so the tile sits against its real neighbors. A blank shared
  // between two tiles is one line and gets the class once.
  let lastFence = -1
  for (const e of claimed) {
    const r = conn.resolve(e.title)
    if (r.status !== 'resolved' || !r.page) continue
    const path = r.page.path
    const cyclic = host.ancestors.includes(path)
    const tileLine = state.doc.lineAt(e.from)
    if (tileLine.number > 1) {
      const above = state.doc.line(tileLine.number - 1)
      if (above.text.trim() === '' && above.from !== lastFence)
        builder.add(above.from, above.from, fenceLine)
    }
    builder.add(tileLine.from, tileLine.from, embedLine)
    builder.add(
      e.from,
      e.to,
      Decoration.replace({
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
    )
    if (tileLine.number < state.doc.lines) {
      const below = state.doc.line(tileLine.number + 1)
      if (below.text.trim() === '') {
        builder.add(below.from, below.from, fenceLine)
        lastFence = below.from
      }
    }
    // The cycle token joins too: exclusions already cover it via the ancestors chain, and without
    // a range here it would be the one replaced line with no absorb and no guard.
    ranges.push({ from: e.from, to: e.to, path, title: e.title })
  }
  return { deco: builder.finish(), ranges, editing, heights }
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
  const before = docScan(tr.startState.doc).embeds
  const after = docScan(tr.state.doc).embeds
  if (before.length !== after.length) return true
  for (let i = 0; i < before.length; i++) {
    if (
      after[i].title !== before[i].title ||
      after[i].from !== tr.changes.mapPos(before[i].from, 1)
    )
      return true
  }
  return false
}

export const embedField = StateField.define<EmbedTiles>({
  create: (state) => buildTiles(state, null, {}),
  update(value, tr) {
    let editing = value.editing
    let heights = value.heights
    let nudged = false
    for (const e of tr.effects) {
      if (e.is(setEmbedEditing)) editing = e.value
      else if (e.is(resolutionNudge)) nudged = true
      else if (e.is(setEmbedHeights)) heights = e.value
    }
    if (!tr.docChanged) {
      return nudged || editing !== value.editing || heights !== value.heights
        ? buildTiles(tr.state, editing, heights)
        : value
    }
    if (editAffectsEmbeds(value, tr)) return buildTiles(tr.state, editing, heights)
    return {
      deco: value.deco.map(tr.changes),
      ranges: value.ranges.map((r) => ({
        ...r,
        from: tr.changes.mapPos(r.from, 1),
        to: tr.changes.mapPos(r.to, -1),
      })),
      editing,
      heights,
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
  for (const r of ranges) b.add(Math.max(0, r.from - 1), Math.min(len, r.to + 1), Decoration.mark({}))
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
        if (!view.state.field(embedField).editing) return
        const t = e.target as HTMLElement | null
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
      if (loneEmbedTitle(line.text) !== r.title) continue
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
    if (!line.text.includes(`![[${r.title}]]`)) continue // syntax gone whole → a legal removal
    if (loneEmbedTitle(line.text) !== null) continue // still lone → untouched or cleanly shifted
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
  for (const t of embedTileRanges(state)) out.add(normalizeTitle(t.title))
  for (const a of state.facet(embedHost).ancestors) out.add(normalizeTitle(titleFromPath(a)))
  return out
}

// A click landing on a tile's line seats by NEARER edge — CM's atomic default always snaps
// backward, so a click at a tile's bottom sliver would otherwise teleport the caret to the seat
// above the whole tile. Clicks inside the widget's own box stay the widget's (ignoreEvent).
const embedClickSeat = EditorView.domEventHandlers({
  mousedown(event, view) {
    if (event.button !== 0) return false
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
      const below = event.clientY - view.documentTop > (block.top + block.bottom) / 2
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

export function embedTiles(host: EmbedHost): Extension {
  return [embedHost.of(host), embedField, embedAtomic, embedGuard, embedClickSeat, editingExit]
}
