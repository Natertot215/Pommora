import { Decoration, type DecorationSet, EditorView } from '@codemirror/view'
import { ReactWidget, type ReactDom } from '../reactWidget'
import { docHeadingKeys, docScan, perDoc } from '../docCache'
import { type CitationEntry, foldLabel } from '../Engine/detect'
import { focusAt } from '../caretPlacement'
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
import { blockDeleteSpan } from '../Menus/gripMenu'
import { tableMergeGuard, tablePasteGuard } from '../Guards/tableGuard'
import type { TableModel } from '../Engine/Tables/model'
import type { ConnectionsApi } from '../Links/connectionsApi'
import { type CellPage, linksOwnHeadings } from './cellStatic'
import type { TableMenuAction, TableMenuContext } from './tableMenu'
import { editorHost, persistPref, redrawNudge } from '../api'
import type { HeadingLinkStyle } from '../../Settings/personalization'
import { sameSet } from '@pommora/uix/Utilities/same'
import { capSet } from '@pommora/uix/Utilities/capMap'

type ConnGetter = () => ConnectionsApi | undefined
const tableConnections = Facet.define<ConnGetter, ConnGetter>({ combine: (vals) => vals[0] })

// A Pommora-only visual with no GFM equivalent, kept per machine (`local_state` rows) rather than in the file.
const setHeadingColsEffect = StateEffect.define<number[]>()
const toggleHeadingColEffect = StateEffect.define<number>()

// The header row's cell texts joined — a table's stable identity, unchanged when OTHER tables are inserted, removed, or reordered around it.
function headerKeyOf(region: TableRegion): string {
  return region.rows[0].cells.join(' ')
}

// Each table's ordinal after the transaction, or -1 once it's gone: every piece of per-table memory follows its table through this one rule. Header keys match in order, a tie going to the table nearest where the old one maps, and a table left unmatched keeps its ordinal when the count holds, since an in-place edit never moves tables.
function tableSuccessors(tr: Transaction): number[] {
  const oldTables = docScan(tr.startState.doc).tables
  if (!tr.docChanged) return oldTables.map((_, i) => i)
  const newTables = docScan(tr.state.doc).tables
  const newKeys = newTables.map(headerKeyOf)
  const taken = new Set<number>()
  const claim = (j: number): number => {
    if (j >= 0) taken.add(j)
    return j
  }
  const next = oldTables.map((old) => {
    const key = headerKeyOf(old)
    const at = tr.changes.mapPos(old.from, 1)
    let best = -1
    newKeys.forEach((k, j) => {
      if (k !== key || taken.has(j)) return
      if (best < 0 || Math.abs(newTables[j].from - at) < Math.abs(newTables[best].from - at))
        best = j
    })
    return claim(best)
  })
  if (newTables.length !== oldTables.length) return next
  return next.map((j, i) => (j < 0 && !taken.has(i) ? claim(i) : j))
}

// The same reference when membership holds, so an ordinary edit costs nothing downstream.
function remapHeadingCols(set: Set<number>, tr: Transaction): Set<number> {
  if (set.size === 0) return set
  const successors = tableSuccessors(tr)
  const next = new Set([...set].map((i) => successors[i] ?? -1).filter((j) => j >= 0))
  return sameSet(next, set) ? set : next
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
    if (tr.docChanged && !tr.annotation(tableSelfEdit)) next = remapHeadingCols(next, tr)
    return next
  },
})

export function applySavedHeadingCols(view: EditorView, indices: number[]): void {
  if (indices.length === 0) return
  view.dispatch({ effects: setHeadingColsEffect.of(indices) })
}

let MarkdownTableComp: typeof import('./MarkdownTable').MarkdownTable | undefined
const loadTable = (): Promise<void> =>
  import('./MarkdownTable').then(({ MarkdownTable }) => {
    MarkdownTableComp = MarkdownTable
  })
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
    readonly around: CellPage,
    readonly linkStyle: HeadingLinkStyle,
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
      other.around === this.around &&
      other.linkStyle === this.linkStyle
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
    // The widget replaces exactly the table's lines, so its own edges draw the caret in the gutter; the exit lands one line past the edge, making that line when the table bounds the document.
    const exit = (dir: 'before' | 'after'): void => {
      const region = docScan(view.state.doc).tables[this.tableIndex]
      if (!region) return
      if (dir === 'after') {
        if (region.to === view.state.doc.length)
          view.dispatch({ changes: { from: region.to, insert: '\n' } })
        focusAt(view, region.to + 1)
      } else if (region.from === 0) {
        view.dispatch({ changes: { from: 0, insert: '\n' } })
        focusAt(view, 0)
      } else focusAt(view, region.from - 1)
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
    // A whole table pasted into a table has no cells to land in.
    const fill = (row: number, col: number, payload: TablePayload): void => {
      if (payload.kind === 'table') return
      structural((m) =>
        payload.kind === 'column'
          ? fillColumn(m, row, col, payload.header, payload.body)
          : fillCells(m, row, col, payload.grid),
      )
    }
    const tableDrag = (e: PointerEvent): void => {
      const region = docScan(view.state.doc).tables[this.tableIndex]
      if (region) startBlockDrag(view, e, { from: region.from, to: region.to })
    }
    const onMenu = (ctx: TableMenuContext): void => {
      const at = docScan(view.state.doc)
      const opened = at.tables[this.tableIndex]
      if (!opened) return
      // The menu can stand open while an undo or a sync moves the document, so the action re-finds its table and stands down if it changed.
      const source = at.text.slice(opened.from, opened.to)
      void host.menus.table(ctx).then((action) => {
        if (!action) return
        const scan = docScan(view.state.doc)
        const region = scan.tables[this.tableIndex]
        if (!region || scan.text.slice(region.from, region.to) !== source) return
        if (action === 'col:toggle-heading') {
          view.dispatch({ effects: toggleHeadingColEffect.of(this.tableIndex) })
          return
        }
        const model = modelFromRegion(region)
        const copy = copyTextFor(action, ctx.index, source, model)
        if (copy !== null) {
          void host.clipboard.write(copy)
          return
        }
        if (action === 'table:delete' || (action === 'col:delete' && model.columns.length <= 1)) {
          view.dispatch({ changes: { ...blockDeleteSpan(scan.text, region), insert: '' } })
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
        around={this.around}
        headingColumn={this.headingColumn}
        onCellCommit={commit}
        onSettled={() => view.dispatch({ effects: refreshTableEffect.of(this.tableIndex) })}
        onExit={exit}
        onReorder={reorder}
        onResize={resize}
        onAppend={append}
        onClearCells={clearCells}
        onFill={fill}
        onMenu={onMenu}
        onTableDrag={tableDrag}
        onUndo={() => undo(view)}
        onRedo={() => redo(view)}
        connections={view.state.facet(tableConnections)}
        readOnly={() => view.state.readOnly}
        linkStyle={this.linkStyle}
      />,
    )
    // Queued behind the first render's flush, so the reserved height yields only once the table has drawn.
    queueMicrotask(() => dom.style.removeProperty('min-height'))
  }

  toDOM(view: EditorView): HTMLElement {
    const dom = document.createElement('div') as TableDom
    dom.className = 'mdpm-tbl-widget'
    // A table drawn before reserves its last height until it renders, so CodeMirror measures it at size rather than collapsing it.
    if (this.height.px > 0) {
      dom.style.minHeight = `${this.height.px}px`
    }
    if (MarkdownTableComp) {
      this.renderInto(dom, view)
    } else {
      void loadTable().then(() => {
        if (!this.destroyed) this.renderInto(dom, view)
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
}

function heightBoxes(deco: DecorationSet): HeightBox[] {
  const boxes: HeightBox[] = []
  for (const it = deco.iter(); it.value; it.next()) {
    const w = it.value.spec.widget
    if (w instanceof TableWidget) boxes.push(w.height)
  }
  return boxes
}

export function buildWidgetDecorations(
  state: EditorState,
  prev?: { deco: DecorationSet; tr: Transaction },
): DecorationSet {
  const doc = state.doc
  const headingCols = state.field(headingColField, false) ?? new Set<number>()
  const boxes: HeightBox[] = []
  if (prev) {
    const successors = tableSuccessors(prev.tr)
    heightBoxes(prev.deco).forEach((box, i) => {
      if (successors[i] >= 0) boxes[successors[i]] = box
    })
  }
  const ranges: Range<Decoration>[] = []
  const scan = docScan(doc)
  const linkStyle = state.facet(editorHost).settings().headingLinkStyle
  scan.tables.forEach((region, i) => {
    const text = doc.sliceString(region.from, region.to)
    const model = modelFromRegion(region)
    const around = cellPage(doc, text)
    ranges.push(
      Decoration.replace({
        widget: new TableWidget(text, model, i, headingCols.has(i), around, linkStyle, boxes[i]),
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
  const region = docScan(state.doc).tables[index]
  if (!region) return deco
  const text = state.doc.sliceString(region.from, region.to)
  const around = cellPage(state.doc, text)
  return swapTableWidget(deco, index, (w) =>
    w.text === text && w.around === around
      ? null
      : new TableWidget(
          text,
          modelFromRegion(region),
          index,
          w.headingColumn,
          around,
          w.linkStyle,
          w.height,
        ),
  )
}

const numbered = (e: CitationEntry): [string, number][] =>
  e.ordinal === null ? [] : [[foldLabel(e.label), e.ordinal]]
const ordinals = perDoc((doc) => new Map(docScan(doc).citations.entries.flatMap(numbered)))
// Each pair joins as `label,n`, and a label holds no whitespace, so no two numberings share a key.
const citeKey = perDoc((doc) => [...ordinals(doc)].join(' '))
const headingKey = perDoc((doc) => docHeadingKeys(doc).join('\n'))

// KNOB — page contexts every editor shares, one object each, so a widget and a cell compare what they draw from the page by identity.
const cellPages = new Map<string, CellPage>()

/** What a cell draws from the page around it and its own text never holds: the footnote numbering, and the headings a same-page link is judged against when the table holds one. */
function cellPage(doc: Text, text: string): CellPage {
  const linksHeadings = linksOwnHeadings(text)
  const key = linksHeadings ? `${citeKey(doc)}\n${headingKey(doc)}` : citeKey(doc)
  let page = cellPages.get(key)
  if (!page) {
    const numbers = ordinals(doc)
    page = {
      ordinalOf: (label) => numbers.get(foldLabel(label)) ?? null,
      ownKeys: linksHeadings ? docHeadingKeys(doc) : [],
    }
    capSet(cellPages, key, page, 16)
  }
  return page
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
        return new TableWidget(text, model, idx, on, w.around, w.linkStyle, w.height)
      })
    }
    if (toggled) return toggledSet
    if (tr.effects.some((e) => e.is(setHeadingColsEffect) || e.is(redrawNudge)))
      return buildWidgetDecorations(tr.state, { deco, tr })
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
    if (editAffectsTables(deco, tr)) return buildWidgetDecorations(tr.state, { deco, tr })
    const { doc } = tr.state
    let next = deco.map(tr.changes)
    const was = tr.startState.doc
    if (citeKey(doc) === citeKey(was) && headingKey(doc) === headingKey(was)) return next
    for (const it = next.iter(); it.value; it.next()) {
      const w = it.value.spec.widget as TableWidget
      if (w.around !== cellPage(doc, w.text)) next = rebuiltTable(next, tr.state, w.tableIndex)
    }
    return next
  },
  provide: (f) => EditorView.decorations.from(f),
})

export function tableWidgetExtension(connections: ConnGetter): Extension {
  // Loaded ahead so the first table to scroll in draws with its frame rather than after an import.
  if (!MarkdownTableComp) void loadTable()
  // headingColField precedes widgetField so the widget reads the up-to-date set; atomicRanges makes the caret skip a table as one unit.
  return [
    headingColField,
    widgetField,
    tableMergeGuard,
    tablePasteGuard,
    EditorView.atomicRanges.of((view) => view.state.field(widgetField)),
    tableConnections.of(connections),
    // A remap correcting stale ordinals is written back too, so a reload can't re-apply them.
    persistPref(
      (s) => s.field(headingColField),
      setHeadingColsEffect,
      (set) => ['headingCols', [...set]],
    ),
  ]
}
