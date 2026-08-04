// The embedded-page tile: a claimed lone-line `![[Title]]` renders as a live page tile on its own
// real .cm-line. A StateField owns the replace decorations — only static decorations reach CM's
// height map, so a ViewPlugin-sourced tile would under-report the scrollbar for every off-screen
// embed. The claim (resolved + first-per-normalized-title) is claimedEmbeds — the same predicate
// the token suppression reads, so the tile and the dim token can never disagree about a line.
import { createRoot, type Root } from 'react-dom/client'
import { createElement, lazy, Suspense } from 'react'
import {
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

/** The resize floor — SurfacePM's own tile minimum. */
export const EMBED_MIN_H = 64

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
      const span = (e.currentTarget as HTMLElement).parentElement
      if (!span) return
      const startH = span.getBoundingClientRect().height
      const startY = e.clientY
      beginGesture({
        el: e.currentTarget as HTMLElement,
        event: e,
        activation: 0, // a resize arms on the first move, the SurfacePM edge precedent
        onActivate: () => {
          span.classList.add('is-resizing-tile')
          return undefined
        },
        onDragMove: (ev) => {
          span.style.height = `${Math.max(EMBED_MIN_H, Math.round(startH + ev.clientY - startY))}px`
          view.requestMeasure()
        },
        onDrop: () => {
          span.classList.remove('is-resizing-tile')
          const h = Math.round(span.getBoundingClientRect().height)
          const heights = { ...view.state.field(embedField).heights, [targetId]: h }
          view.dispatch({ effects: setEmbedHeights.of(heights) })
          view.state.facet(embedHost).saveHeights?.(heights)
        },
        onAbort: () => {
          span.classList.remove('is-resizing-tile')
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
    // CM hands a tile's DOM to its successor widget on rebuilds and relocations — a node still in
    // the document is ADOPTED, not dead, and unmounting its root would blank the reused tile.
    if (dom.isConnected) return
    const d = dom as TileDom
    const root = d._root
    d._root = undefined
    if (root) queueMicrotask(() => root.unmount())
  }

  ignoreEvent(): boolean {
    return true
  }
}

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
  for (const e of claimed) {
    const r = conn.resolve(e.title)
    if (r.status !== 'resolved' || !r.page) continue
    const path = r.page.path
    const cyclic = host.ancestors.includes(path)
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
  for (const r of value.ranges)
    if (tr.changes.touchesRange(Math.max(0, r.from - 1), r.to + 1) !== false) return true
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

export function embedTiles(host: EmbedHost): Extension {
  return [embedHost.of(host), embedField, embedAtomic, embedGuard, editingExit]
}
