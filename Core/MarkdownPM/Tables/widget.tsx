import { Decoration, type DecorationSet, EditorView } from '@codemirror/view'
import { ReactWidget, type ReactDom } from '../reactWidget'
import { docScan } from '../docCache'
import { foldLabel } from '../Engine/detect'
import type { DocScan } from '../Engine/docScan'
import { focusAt } from '../caretPlacement'
import { travelToCitation } from '../Citations/citationActions'
import {
  Facet,
  StateField,
  StateEffect,
  type EditorState,
  type Extension,
  type Range,
  type Text,
  type Transaction,
} from '@codemirror/state'
import { undo, redo } from '@codemirror/commands'
import { modelFromRegion, type TableRegion } from '../Engine/Tables/regions'
import { parseDelimiter } from '../Engine/Tables/codec'
import { cellCommitChange, structuralEditChange, tableSelfEdit } from './sync'
import { startBlockDrag } from '../Gestures/blockDrag'
import {
  moveColumn,
  moveRow,
  setAlign,
  insertColumn,
  deleteColumn,
  insertRow,
  deleteRow,
  clearColumn,
  clearRow,
  clearHeader,
  clearTable,
  clearRect,
  fillCells,
  fillColumn,
  resizeColumns,
} from '../Engine/Tables/operations'
import {
  encodeColumn,
  encodeRect,
  serializeOutline,
  type TablePayload,
} from '../Engine/Tables/clipboard'
import { tableMergeGuard, tablePasteGuard } from './guard'
import type { TableModel } from '../Engine/Tables/model'
import type { ConnectionsApi } from '../Links/connectionsApi'
import type { TableMenuAction, TableMenuContext } from '@pommora/core/MarkdownPM/Tables/tableMenu'
import { editorHost } from '../api'

type ConnGetter = () => ConnectionsApi | undefined
const tableConnections = Facet.define<ConnGetter, ConnGetter>({
  combine: (vals) => vals[0] ?? (() => undefined),
})

// A Pommora-only visual with no GFM equivalent, kept per machine (`local_state` rows) rather than in the file.
export interface TableHeadingColsApi {
  load: () => Promise<number[]>
  save: (indices: number[]) => void
}
const setHeadingColsEffect = StateEffect.define<number[]>()
const toggleHeadingColEffect = StateEffect.define<number>()

// The header row's cell texts joined — a table's stable identity, unchanged when OTHER tables are inserted, removed, or reordered around it.
function headerKeyOf(region: TableRegion): string {
  return region.rows[0].cells.map((c) => c.text).join(' ')
}

// Re-point each toggled ordinal at the table it still names after a doc change: match old header key to new ordinal, consuming matches in order so duplicate headers stay one-to-one. A key with no match keeps its ordinal when the table count is unchanged (an in-place edit never moves tables) and is dropped when the count fell (the table was removed). Returns the same reference when membership holds, so an ordinary edit costs nothing downstream.
function remapHeadingCols(set: Set<number>, oldDoc: Text, newDoc: Text): Set<number> {
  if (set.size === 0) return set
  const oldTables = docScan(oldDoc).tables
  const newKeys = docScan(newDoc).tables.map(headerKeyOf)
  const next = new Set<number>()
  const consumed = new Set<number>()
  for (const oldIdx of [...set].sort((a, b) => a - b)) {
    const region = oldTables[oldIdx]
    if (!region) continue
    const key = headerKeyOf(region)
    let matched = -1
    for (let j = 0; j < newKeys.length; j++) {
      if (consumed.has(j) || newKeys[j] !== key) continue
      matched = j
      break
    }
    if (matched === -1 && newKeys.length === oldTables.length) matched = oldIdx
    if (matched === -1) continue
    consumed.add(matched)
    next.add(matched)
  }
  return next.size === set.size && [...next].every((i) => set.has(i)) ? set : next
}

const headingColField = StateField.define<Set<number>>({
  create: () => new Set(),
  update(set, tr) {
    let next = set
    for (const e of tr.effects) {
      if (e.is(setHeadingColsEffect)) next = new Set(e.value)
      else if (e.is(toggleHeadingColEffect)) {
        next = new Set(next)
        if (next.has(e.value)) next.delete(e.value)
        else next.add(e.value)
      }
    }
    // A cell commit never reorders tables, so its self-edit is left to keep the toggle put.
    if (tr.docChanged && !tr.annotation(tableSelfEdit))
      next = remapHeadingCols(next, tr.startState.doc, tr.state.doc)
    return next
  },
})

export function applySavedHeadingCols(view: EditorView, indices: number[]): void {
  if (indices.length === 0) return
  view.dispatch({ effects: setHeadingColsEffect.of(indices) })
}

let MarkdownTableComp: typeof import('./MarkdownTable').MarkdownTable | undefined
interface TableDom extends ReactDom {
  _height?: HeightBox
  _ro?: ResizeObserver
}

/** CodeMirror asks the widget what height to assume until the next measure — a table answering "unknown" is assumed one line tall, collapsing the document's height on every keystroke a cell makes. */
interface HeightBox {
  px: number
}

// `index` is the menu's visual row (0 = header), so a body operation takes `index - 1`; `table:delete` is a doc-level region removal handled by the caller, so it maps to null.
function transformFor(
  action: TableMenuAction,
  index: number,
): ((m: TableModel) => TableModel) | null {
  switch (action) {
    case 'align:left':
      return (m) => setAlign(m, index, 'left')
    case 'align:center':
      return (m) => setAlign(m, index, 'center')
    case 'align:right':
      return (m) => setAlign(m, index, 'right')
    case 'col:insert-left':
      return (m) => insertColumn(m, index, 'left')
    case 'col:insert-right':
      return (m) => insertColumn(m, index, 'right')
    case 'col:clear':
      return (m) => clearColumn(m, index)
    case 'col:delete':
      return (m) => deleteColumn(m, index)
    case 'row:insert-above':
      return (m) => insertRow(m, index - 1, 'above')
    case 'row:insert-below':
      return (m) => insertRow(m, index - 1, 'below')
    case 'row:clear':
      return (m) => clearRow(m, index - 1)
    case 'row:delete':
      return (m) => deleteRow(m, index - 1)
    case 'table:clear-header':
      return clearHeader
    case 'table:clear':
      return clearTable
    case 'table:delete':
    case 'col:toggle-heading':
    case 'col:copy':
    case 'row:copy':
    case 'table:copy-outline':
    case 'table:copy-content':
      return null
  }
}

function copyTextFor(
  action: TableMenuAction,
  index: number,
  source: string,
  model: TableModel,
): string | null {
  switch (action) {
    case 'row:copy':
      return encodeRect([model.rows[index - 1] ?? []])
    case 'col:copy':
      return encodeColumn(
        model.header[index] ?? '',
        model.columns[index] ?? { align: null, dashes: 1 },
        model.rows.map((r) => r[index] ?? ''),
      )
    case 'table:copy-content':
      return source
    case 'table:copy-outline':
      return serializeOutline(model)
    default:
      return null
  }
}

class TableWidget extends ReactWidget {
  private destroyed = false

  constructor(
    readonly text: string,
    readonly model: TableModel,
    readonly tableIndex: number,
    readonly headingColumn: boolean,
    /** A cell's marker draws a number its own text never holds, and this equality gates above the cell memo. */
    readonly cites: string,
    readonly height: HeightBox = { px: -1 },
  ) {
    super()
  }

  get estimatedHeight(): number {
    return this.height.px
  }

  eq(other: TableWidget): boolean {
    return (
      other.text === this.text &&
      other.tableIndex === this.tableIndex &&
      other.headingColumn === this.headingColumn &&
      other.cites === this.cites
    )
  }

  private renderInto(dom: TableDom, view: EditorView): void {
    const TV = MarkdownTableComp
    if (!TV) return
    const host = view.state.facet(editorHost)
    const commit = (row: number, col: number, text: string): void => {
      const change = cellCommitChange(docScan(view.state.doc), this.tableIndex, row, col, text)
      if (change) view.dispatch({ changes: change, annotations: tableSelfEdit.of(true) })
    }
    const exit = (dir: 'before' | 'after'): void => {
      const region = docScan(view.state.doc).tables[this.tableIndex]
      if (!region) return
      focusAt(view, dir === 'before' ? region.from : region.to)
    }
    const structural = (transform: (m: TableModel) => TableModel): boolean => {
      const change = structuralEditChange(docScan(view.state.doc), this.tableIndex, transform)
      if (!change) return false
      view.dispatch({ changes: change })
      return true
    }
    const reorder = (axis: 'col' | 'row', from: number, to: number): boolean =>
      structural((m) => (axis === 'col' ? moveColumn(m, from, to) : moveRow(m, from - 1, to - 1)))
    const append = (axis: 'col' | 'row'): void => {
      structural((m) =>
        axis === 'col'
          ? insertColumn(m, m.columns.length - 1, 'right')
          : insertRow(m, m.rows.length - 1, 'below'),
      )
    }
    const resize = (widths: number[]): boolean => structural((m) => resizeColumns(m, widths))
    const clearCells = (r0: number, c0: number, r1: number, c1: number): void => {
      structural((m) => clearRect(m, r0, c0, r1, c1))
    }
    const fill = (row: number, col: number, payload: TablePayload): void => {
      structural((m) =>
        payload.kind === 'column'
          ? fillColumn(m, row, col, payload.header, payload.body)
          : payload.kind === 'rect'
            ? fillCells(m, row, col, payload.grid)
            : m,
      )
    }
    const toClipboard = (text: string): void => void host.clipboard.write(text)
    const tableDrag = (e: PointerEvent): void => {
      const region = docScan(view.state.doc).tables[this.tableIndex]
      if (region) startBlockDrag(view, e, { from: region.from, to: region.to })
    }
    const onMenu = (ctx: TableMenuContext): void => {
      void host.menus.table(ctx).then((action) => {
        if (!action) return
        // A `.nexus/`-persisted visual, not a source edit — toggling the field rebuilds this table's widget.
        if (action === 'col:toggle-heading') {
          view.dispatch({ effects: toggleHeadingColEffect.of(this.tableIndex) })
          return
        }
        const scan = docScan(view.state.doc)
        const region = scan.tables[this.tableIndex]
        if (!region) return
        const copy = copyTextFor(
          action,
          ctx.index,
          scan.text.slice(region.from, region.to),
          modelFromRegion(region),
        )
        if (copy !== null) {
          toClipboard(copy)
          return
        }
        if (
          action === 'table:delete' ||
          (action === 'col:delete' && modelFromRegion(region).columns.length <= 1)
        ) {
          view.dispatch({ changes: { from: region.from, to: region.to, insert: '' } })
          return
        }
        const transform = transformFor(action, ctx.index)
        if (!transform) return
        const change = structuralEditChange(scan, this.tableIndex, transform)
        if (change) view.dispatch({ changes: change })
      })
    }
    dom._height = this.height
    if (!dom._ro) {
      dom._ro = new ResizeObserver(([entry]) => {
        const box = dom._height
        if (box) box.px = entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height
      })
      dom._ro.observe(dom)
    }
    this.render(
      dom,
      <TV
        host={host}
        model={this.model}
        cites={this.cites}
        headingColumn={this.headingColumn}
        onCellCommit={commit}
        onSettled={() => view.dispatch({ effects: refreshTableEffect.of(this.tableIndex) })}
        onExit={exit}
        onReorder={reorder}
        onResize={resize}
        onAppend={append}
        onClearCells={clearCells}
        onFill={fill}
        onCopyText={toClipboard}
        readClipboard={() => host.clipboard.read()}
        onMenu={onMenu}
        onTableDrag={tableDrag}
        onCite={(label) => travelToCitation(view, label)}
        onUndo={() => undo(view)}
        onRedo={() => redo(view)}
        connections={view.state.facet(tableConnections)}
        readOnly={() => view.state.readOnly}
      />,
    )
  }

  toDOM(view: EditorView): HTMLElement {
    const dom = document.createElement('div') as TableDom
    dom.className = 'mdpm-tbl-widget'
    if (MarkdownTableComp) {
      this.renderInto(dom, view)
    } else {
      void import('./MarkdownTable').then(({ MarkdownTable }) => {
        MarkdownTableComp = MarkdownTable
        if (this.destroyed) return
        this.renderInto(dom, view)
      })
    }
    return dom
  }

  // Re-renders the React root in place, avoiding a CM destroy+recreate that would re-mount cell editors.
  updateDOM(dom: HTMLElement, view: EditorView): boolean {
    if (!MarkdownTableComp || !this.mounted(dom)) return false
    this.renderInto(dom as TableDom, view)
    return true
  }

  destroy(dom: HTMLElement): void {
    this.destroyed = true
    // Only a node that is genuinely being dropped reaches here — a widget replaced over a reused DOM is never destroyed — so the observer measuring it goes with it rather than outliving the table.
    ;(dom as TableDom)._ro?.disconnect()
    this.unmount(dom as TableDom, 'eager')
  }

  ignoreEvent(): boolean {
    return true
  }
}

function heightBoxes(deco: DecorationSet): HeightBox[] {
  const boxes: HeightBox[] = []
  for (const it = deco.iter(); it.value; it.next()) {
    const w = it.value.spec.widget
    if (w instanceof TableWidget) boxes.push(w.height)
  }
  return boxes
}

export function buildWidgetDecorations(state: EditorState, prev?: DecorationSet): DecorationSet {
  const doc = state.doc
  const headingCols = state.field(headingColField, false) ?? new Set<number>()
  const boxes = prev ? heightBoxes(prev) : []
  const ranges: Range<Decoration>[] = []
  const scan = docScan(doc)
  const cites = citeKey(scan)
  scan.tables.forEach((region, i) => {
    const text = doc.sliceString(region.from, region.to)
    const model = modelFromRegion(region)
    ranges.push(
      Decoration.replace({
        widget: new TableWidget(text, model, i, headingCols.has(i), cites, boxes[i]),
        block: true,
      }).range(region.from, region.to),
    )
  })
  return Decoration.set(ranges, true)
}

/** A rebuild hands each table back its last laid-out height, so the block never collapses to its estimate. */
function editAffectsTables(deco: DecorationSet, tr: Transaction): boolean {
  for (const it = deco.iter(); it.value; it.next()) {
    if (tr.changes.touchesRange(it.from, it.to) !== false) return true
  }
  if (deco.size > 0 && citeKey(docScan(tr.state.doc)) !== citeKey(docScan(tr.startState.doc)))
    return true
  const doc = tr.state.doc
  let delimiterNearby = false
  tr.changes.iterChangedRanges((_fromA, _toA, fromB, toB) => {
    if (delimiterNearby) return
    const first = doc.lineAt(fromB).number
    const last = doc.lineAt(toB).number
    for (let n = Math.max(1, first - 1); n <= Math.min(doc.lines, last + 1); n++) {
      if (parseDelimiter(doc.line(n).text)) {
        delimiterNearby = true
        return
      }
    }
  })
  return delimiterNearby
}

export const refreshTableEffect = StateEffect.define<number>()

function swapTableWidget(
  deco: DecorationSet,
  index: number,
  make: (current: TableWidget) => TableWidget | null,
): DecorationSet {
  for (const cur = deco.iter(); cur.value; cur.next()) {
    const w = cur.value.spec.widget
    if (!(w instanceof TableWidget) || w.tableIndex !== index) continue
    const widget = make(w)
    if (!widget) break
    return deco.update({
      filterFrom: cur.from,
      filterTo: cur.to,
      filter: () => false,
      add: [Decoration.replace({ widget, block: true }).range(cur.from, cur.to)],
    })
  }
  return deco
}

function rebuiltTable(deco: DecorationSet, state: EditorState, index: number): DecorationSet {
  const scan = docScan(state.doc)
  const region = scan.tables[index]
  if (!region) return deco
  const text = state.doc.sliceString(region.from, region.to)
  const cites = citeKey(scan)
  return swapTableWidget(deco, index, (w) =>
    w.text === text && w.cites === cites
      ? null
      : new TableWidget(text, modelFromRegion(region), index, w.headingColumn, cites, w.height),
  )
}

function citeKey(scan: DocScan): string {
  return scan.citations.entries
    .filter((e) => e.ordinal !== null)
    .map((e) => `${foldLabel(e.label)}=${e.ordinal}`)
    .join(';')
}

const widgetField = StateField.define<DecorationSet>({
  create: buildWidgetDecorations,
  update: (deco, tr) => {
    // Doc unchanged, so swap ONLY the toggled table's widget — a captured snapshot would render pre-edit content.
    let toggledSet = deco
    let toggled = false
    for (const eff of tr.effects) {
      if (!eff.is(toggleHeadingColEffect)) continue
      toggled = true
      const idx = eff.value
      const on = tr.state.field(headingColField).has(idx)
      toggledSet = swapTableWidget(toggledSet, idx, (w) => {
        const region = docScan(tr.state.doc).tables[idx]
        const text = region ? tr.state.doc.sliceString(region.from, region.to) : w.text
        const model = region ? modelFromRegion(region) : w.model
        return new TableWidget(text, model, idx, on, w.cites, w.height)
      })
    }
    if (toggled) return toggledSet
    if (tr.effects.some((e) => e.is(setHeadingColsEffect)))
      return buildWidgetDecorations(tr.state, deco)
    // Map the widgets forward and STOP: rebuilding per keystroke makes CM re-measure against React content that hasn't rendered. `refreshTableEffect` does it when the cell demotes.
    if (tr.annotation(tableSelfEdit)) return deco.map(tr.changes)
    let refreshedSet = deco
    let refreshed = false
    for (const eff of tr.effects) {
      if (!eff.is(refreshTableEffect)) continue
      refreshedSet = rebuiltTable(refreshedSet, tr.state, eff.value)
      refreshed = true
    }
    if (refreshed) return refreshedSet
    if (!tr.docChanged) return deco
    return editAffectsTables(deco, tr)
      ? buildWidgetDecorations(tr.state, deco)
      : deco.map(tr.changes)
  },
  provide: (f) => EditorView.decorations.from(f),
})

export function tableWidgetExtension(
  connections?: ConnGetter,
  onHeadingColsChange?: (indices: number[]) => void,
): Extension {
  const persist = EditorView.updateListener.of((u) => {
    // Any change to the set is written back — a toggle, or a remap correcting stale ordinals so a reload can't re-apply them — but not a load, which is where the set came from.
    if (u.startState.field(headingColField) === u.state.field(headingColField)) return
    if (u.transactions.some((tr) => tr.effects.some((e) => e.is(setHeadingColsEffect)))) return
    onHeadingColsChange?.([...u.state.field(headingColField)])
  })
  // headingColField precedes widgetField so the widget reads the up-to-date set; atomicRanges makes the caret skip a table as one unit.
  return [
    headingColField,
    widgetField,
    tableMergeGuard,
    tablePasteGuard,
    EditorView.atomicRanges.of((view) => view.state.field(widgetField)),
    connections ? tableConnections.of(connections) : [],
    onHeadingColsChange ? persist : [],
  ]
}
