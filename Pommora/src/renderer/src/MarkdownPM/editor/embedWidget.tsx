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
  type Transaction,
} from '@codemirror/state'
import { Decoration, type DecorationSet, EditorView, ViewPlugin, WidgetType } from '@codemirror/view'
import { cx } from '@renderer/design-system/cx'
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
}

const embedHost = Facet.define<EmbedHost, EmbedHost>({
  combine: (v) => v[0] ?? { getConn: () => undefined, ancestors: [] },
})

/** Flips which tile (by target path) holds the live edit; null ends it. */
export const setEmbedEditing = StateEffect.define<string | null>()

interface TileRange {
  from: number
  to: number
  path: string
  title: string
}

interface EmbedTiles {
  deco: DecorationSet
  ranges: TileRange[]
  editing: string | null
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

class EmbedTileWidget extends WidgetType {
  private root: Root | undefined

  constructor(
    readonly path: string,
    readonly title: string,
    readonly editing: boolean,
    readonly interactive: boolean,
    readonly cyclic: boolean,
    readonly ancestors: readonly string[],
  ) {
    super()
  }

  eq(o: EmbedTileWidget): boolean {
    return (
      o.path === this.path &&
      o.editing === this.editing &&
      o.interactive === this.interactive &&
      o.cyclic === this.cyclic
    )
  }

  // A real estimate (not the don't-estimate sentinel) so off-screen tiles hold scrollbar-true
  // height before their first measure; CM corrects on render.
  get estimatedHeight(): number {
    return 320
  }

  private renderInto(dom: TileDom, view: EditorView): void {
    dom.className = cx(
      'mdpm-embed-tile tile-chassis',
      this.editing && 'is-editing-tile',
      !this.interactive && 'is-inert',
    )
    let root = dom._root
    if (!root) {
      root = createRoot(dom)
      dom._root = root
    }
    this.root = root
    const conn = view.state.facet(embedHost).getConn()
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
          }),
        ),
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

  destroy(): void {
    const root = this.root
    this.root = undefined
    if (root) queueMicrotask(() => root.unmount())
  }

  ignoreEvent(): boolean {
    return true
  }
}

function buildTiles(state: EditorState, editing: string | null): EmbedTiles {
  const host = state.facet(embedHost)
  const conn = host.getConn()
  const embeds = docScan(state.doc).embeds
  if (!conn || embeds.length === 0) return { deco: Decoration.none, ranges: [], editing }
  const claimed = claimedEmbeds(embeds, (t) => conn.resolve(t).status)
  if (claimed.length === 0) return { deco: Decoration.none, ranges: [], editing }
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
        ),
      }),
    )
    if (!cyclic) ranges.push({ from: e.from, to: e.to, path, title: e.title })
  }
  return { deco: builder.finish(), ranges, editing }
}

function editAffectsEmbeds(value: EmbedTiles, tr: Transaction): boolean {
  for (const r of value.ranges)
    if (tr.changes.touchesRange(Math.max(0, r.from - 1), r.to + 1) !== false) return true
  let hit = false
  tr.changes.iterChangedRanges((_fa: number, _ta: number, fb: number, tb: number) => {
    if (hit) return
    const doc = tr.newDoc
    const a = doc.lineAt(Math.min(fb, doc.length)).number
    const b = doc.lineAt(Math.min(tb, doc.length)).number
    for (let ln = Math.max(1, a - 1); ln <= Math.min(doc.lines, b + 1); ln++)
      if (doc.line(ln).text.includes('![[')) {
        hit = true
        return
      }
  })
  return hit
}

export const embedField = StateField.define<EmbedTiles>({
  create: (state) => buildTiles(state, null),
  update(value, tr) {
    let editing = value.editing
    for (const e of tr.effects) if (e.is(setEmbedEditing)) editing = e.value
    if (!tr.docChanged) {
      return editing === value.editing ? value : buildTiles(tr.state, editing)
    }
    if (editAffectsEmbeds(value, tr)) return buildTiles(tr.state, editing)
    return {
      deco: value.deco.map(tr.changes),
      ranges: value.ranges.map((r) => ({
        ...r,
        from: tr.changes.mapPos(r.from, 1),
        to: tr.changes.mapPos(r.to, -1),
      })),
      editing,
    }
  },
  provide: (f) => EditorView.decorations.from(f, (v) => v.deco),
})

// The skip-over absorb: each tile's atomic range swallows its boundary newlines (clamped at doc
// edges), so no motion command can seat the caret on the embed line. Doc-edge boundary seats are
// visible beside the tile and covered by the lone-line guard's insertion repair.
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

/** Per tile, the count of immediate neighbor lines that are non-blank — the fence predicate. A
 *  hand-typed glued embed is legal, so gluing is only refused when a DELETION grows this count
 *  (removing the lone fencing blank), the same result-doc mechanic the table merge-guard uses. */
function gluedTileCount(doc: Text, ranges: readonly { from: number; to: number }[]): number {
  let glued = 0
  for (const r of ranges) {
    const n = doc.lineAt(Math.min(r.from, doc.length)).number
    if (n > 1 && doc.line(n - 1).text.trim() !== '') glued++
    if (n < doc.lines && doc.line(n + 1).text.trim() !== '') glued++
  }
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
    const survivors = ranges
      .map((r) => ({ from: tr.changes.mapPos(r.from, 1), to: tr.changes.mapPos(r.to, -1), title: r.title }))
      .filter((r) => {
        const line = tr.newDoc.lineAt(Math.min(r.from, tr.newDoc.length))
        return loneEmbedTitle(line.text) === r.title
      })
    if (
      survivors.length > 0 &&
      gluedTileCount(tr.newDoc, survivors) > gluedTileCount(tr.startState.doc, ranges)
    )
      return []
  }
  for (const r of ranges) {
    const mapped = tr.changes.mapPos(r.from, 1)
    const line = tr.newDoc.lineAt(Math.min(mapped, tr.newDoc.length))
    if (!line.text.includes(`![[${r.title}]]`)) continue // syntax gone whole → a legal removal
    if (loneEmbedTitle(line.text) !== null) continue // still lone → untouched or cleanly shifted
    const repair = boundaryRepair(tr, r)
    if (repair)
      return [
        { changes: { from: repair.from, insert: repair.insert }, selection: { anchor: repair.caret } },
      ]
    return []
  }
  return tr
})

/** The claimed-tile spans, for the boundary-delete refusals in the input keymap. */
export function embedTileRanges(state: EditorState): readonly { from: number; to: number }[] {
  return state.field(embedField, false)?.ranges ?? []
}

export function embedTiles(host: EmbedHost): Extension {
  return [embedHost.of(host), embedField, embedAtomic, embedGuard, editingExit]
}
