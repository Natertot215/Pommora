import { useEffect, useLayoutEffect, useRef } from 'react'
import { EditorView, keymap } from '@codemirror/view'
import { Annotation, EditorSelection, EditorState, Prec } from '@codemirror/state'
import { deleteCharForward, historyKeymap, redo, undo } from '@codemirror/commands'
import { useReconfigured } from '../Input/useReconfigured'
import { editorKeymap, formatKeymap } from '../Input/formatKeymap'
import { cellCitations } from './cellCitations'
import {
  autoDelete,
  continueListOnEnter,
  indentListOnTab,
  outdentListOnShiftTab,
  smartBackspace,
  type Edit,
} from '../Input/edits'
import { parseListMarker, type ListMarker, type MarkdownScope } from '../Engine/detect'
import { cellToSource } from '../Engine/Tables/codec'
import { decodePayload, type TablePayload } from '../Engine/Tables/clipboard'
import { applyEdit } from '../Input/applyEdit'
import { docLineIntentsOf, docScan } from '../docCache'
import type { DocScan } from '../Engine/docScan'
import { listGlyphOf, seatPastMarker } from '../Engine/intents'
import {
  useConnectionAutocomplete,
  detectConnectionQuery,
} from '../Autocomplete/useConnectionAutocomplete'
import { paneKeys } from '../Menus/caretPane'
import { AutocompletePane } from '../Autocomplete/AutocompletePane'
import type { ConnectionsApi } from '../Links/connectionsApi'
import type { NavDir } from '../Engine/Tables/navigate'
import { type EditorHost, editorHost, resolutionNudge } from '../api'
import { useLatest } from '@pommora/uix/Utilities/stableApi'
import { inlineSurface } from '../surface'

const HISTORY_BINDINGS = historyKeymap.filter((b) => b.run === undo || b.run === redo)

/** The cell sits inside the widget's `ignoreEvent` host, so every key it claims must stop here rather than fall through. */
const consume =
  (run: (view: EditorView) => void) =>
  (view: EditorView): boolean => {
    run(view)
    return true
  }

// Tags a programmatic content sync so the updateListener doesn't treat it as a user edit and echo it back through onCommit.
const silentEdit = Annotation.define<boolean>()

/** The list transforms are pure over the cell's own document; a null hands the key back to the table's navigation. */
const listEdit =
  (
    transform: (
      scan: DocScan,
      selStart: number,
      selEnd: number,
      scope: MarkdownScope,
    ) => Edit | null,
  ) =>
  (view: EditorView): boolean => {
    const s = view.state.selection.main
    return applyEdit(view, transform(docScan(view.state.doc), s.from, s.to, 'cell'))
  }

const continueList = listEdit(continueListOnEnter)
const nestList = listEdit(indentListOnTab)
const unnestList = listEdit(outdentListOnShiftTab)

// The glyph, not the parse: a marker nothing draws is prose on both surfaces, so a key that read the raw parse would act on a line showing no list at all.
const listLineAt = (view: EditorView): ListMarker | null => {
  const lm = parseListMarker(view.state.doc.lineAt(view.state.selection.main.from).text)
  return lm && listGlyphOf(lm) ? lm : null
}

// A key the list holds has to be one a transform could act on. With a range selected none applies, so holding it would leave a dead key where the cell would otherwise navigate.
const listClaims = (view: EditorView): boolean =>
  view.state.selection.main.empty && listLineAt(view) !== null

// A marker the caret lands INSIDE after an edit reads as a caret that went nowhere, so it takes the seat the marker hands it — the one a pointer press already gets.
const seatPastMarkerNow = (view: EditorView): void => {
  const s = view.state.selection.main
  if (!s.empty) return
  const seat = seatPastMarker(
    docLineIntentsOf(view.state.doc, 'cell'),
    docScan(view.state.doc),
    s.head,
    'cell',
  )
  if (seat !== null && seat !== s.head) view.dispatch({ selection: EditorSelection.cursor(seat) })
}

// Nothing sits above a cell's first line, so a Backspace on an empty one takes the break ahead rather than refusing, and the content below comes up to meet the caret.
const joinEmptyHead = (view: EditorView): boolean => {
  const s = view.state.selection.main
  const doc = view.state.doc
  if (!s.empty || s.from !== 0 || doc.lines < 2 || doc.line(1).length !== 0) return false
  view.dispatch({ changes: { from: 0, to: 1 }, userEvent: 'delete' })
  return true
}

/** The item nothing further down the cell belongs to — a nested item below still carries the list on. */
const atListEnd = (view: EditorView): boolean => {
  const doc = view.state.doc
  for (let i = doc.lineAt(view.state.selection.main.from).number + 1; i <= doc.lines; i++) {
    const lm = parseListMarker(doc.line(i).text)
    if (lm && listGlyphOf(lm)) return false
  }
  return true
}

export function CellEditor({
  host,
  initial,
  onCommit,
  onNavigate,
  onTablePaste,
  onUndo,
  onRedo,
  caretCoords,
  initialSelect,
  sweepFrom,
  connections,
  ordinalOf,
}: {
  host: EditorHost
  initial: string
  onCommit: (text: string) => void
  onNavigate: (dir: NavDir) => void
  onTablePaste?: (payload: TablePayload) => void
  onUndo: () => void
  onRedo: () => void
  caretCoords?: { x: number; y: number } | null
  initialSelect?: [number, number] | null
  sweepFrom?: 'start' | 'end' | null
  connections?: () => ConnectionsApi | undefined
  ordinalOf?: (label: string) => number | null
}): React.JSX.Element {
  const mountRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onCommitRef = useLatest(onCommit)
  const onNavigateRef = useLatest(onNavigate)
  const onUndoRef = useLatest(onUndo)
  const onRedoRef = useLatest(onRedo)
  // The numbering is a whole-document fact and the extensions bake at mount, so it is read live.
  const ordinalOfRef = useLatest(ordinalOf)
  const onTablePasteRef = useLatest(onTablePaste)
  const { setAc, acCtl, pane } = useConnectionAutocomplete(viewRef, host, () => connections?.())
  const formatExt = useReconfigured(viewRef, host.settings().commands, formatKeymap)

  useEffect(() => {
    const view = new EditorView({
      parent: mountRef.current!,
      state: EditorState.create({
        doc: initial,
        extensions: [
          editorHost.of(host),
          inlineSurface(() => connections?.(), 'cell'),
          cellCitations(() => ordinalOfRef.current),
          // Every paste reaches here tagged, the menu's and the inverse chord's included, so a table-shaped clipboard fills the cells instead of landing escaped in this one.
          EditorState.transactionFilter.of((tr) => {
            if (!tr.isUserEvent('input.paste') || !onTablePasteRef.current) return tr
            let text = ''
            tr.changes.iterChanges((_fa, _ta, _fb, _tb, inserted) => {
              text += inserted.toString()
            })
            const payload = decodePayload(text)
            if (!payload) return tr
            queueMicrotask(() => onTablePasteRef.current?.(payload))
            return []
          }),
          Prec.highest(
            keymap.of([
              // In a list Tab is nest and nothing else; at the deepest level it holds, as Shift-Tab does at the shallowest.
              {
                key: 'Tab',
                run: consume((view) => {
                  if (acCtl.current.open) return acCtl.current.pick()
                  if (!listClaims(view)) return onNavigateRef.current('next')
                  nestList(view)
                }),
              },
              {
                key: 'Shift-Tab',
                run: consume((view) => {
                  if (!listClaims(view)) return onNavigateRef.current('prev')
                  unnestList(view)
                }),
              },
              {
                key: 'Enter',
                run: consume((view) => {
                  if (acCtl.current.open) return acCtl.current.pick()
                  // The cell is left from a line no list owns; on one a list owns, the body writes a break wherever it cannot continue — before the marker, or over a selection.
                  if (!listLineAt(view)) return onNavigateRef.current('down')
                  if (!continueList(view)) view.dispatch(view.state.replaceSelection('\n'))
                }),
              },
              ...paneKeys([acCtl]),
              // The exit is the list's final item alone; above it, and outside a list, the break is the body's own, and the row does NOT split, because cellToSource serializes it as <br> on disk.
              {
                key: 'Shift-Enter',
                run: consume((view) => {
                  if (listClaims(view) && atListEnd(view)) return onNavigateRef.current('down')
                  view.dispatch(view.state.replaceSelection('\n'))
                }),
              },
              {
                key: 'Backspace',
                run: (view) => {
                  const s = view.state.selection.main
                  const scan = docScan(view.state.doc)
                  if (
                    applyEdit(
                      view,
                      smartBackspace(scan, s.from, s.to, 'cell') ??
                        autoDelete(scan, s.from, s.to, host.settings()),
                      { userEvent: 'delete' },
                    )
                  )
                    return true
                  if (!joinEmptyHead(view)) return false
                  seatPastMarkerNow(view)
                  return true
                },
              },
              {
                key: 'Delete',
                run: (view) => {
                  if (!deleteCharForward(view)) return false
                  seatPastMarkerNow(view)
                  return true
                },
              },
              // The main editor can't catch these itself (the widget's ignoreEvent), so the cell forwards them to the page history.
              ...HISTORY_BINDINGS.map((b) => ({
                ...b,
                run: consume(() => (b.run === undo ? onUndoRef : onRedoRef).current()),
              })),
            ]),
          ),
          formatExt,
          keymap.of(editorKeymap),
          EditorView.domEventHandlers({
            blur: () => {
              setAc(null)
              return false
            },
          }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged && !u.transactions.some((t) => t.annotation(silentEdit)))
              onCommitRef.current(u.state.doc.toString())
            if (u.docChanged || u.selectionSet) detectConnectionQuery(u.view, setAc)
          }),
        ],
      }),
    })
    viewRef.current = view
    // posAtCoords can throw before the view has measured.
    view.focus()
    const end = view.state.doc.length
    let pos: number | null = null
    if (!initialSelect && caretCoords) {
      try {
        pos = view.posAtCoords(caretCoords)
      } catch {
        pos = null
      }
    }
    const head = pos ?? end
    view.dispatch({
      selection: initialSelect
        ? { anchor: Math.min(initialSelect[0], end), head: Math.min(initialSelect[1], end) }
        : sweepFrom
          ? { anchor: sweepFrom === 'start' ? 0 : end, head }
          : { anchor: head },
    })
    // The press that promoted this cell never reached CM, so the seat its own pointer filter would have given lands here.
    seatPastMarkerNow(view)
    return () => {
      view.destroy()
      viewRef.current = null
    }
    // Mount once — the cell IS the live editor.
  }, [])

  // A renumber or a heading change elsewhere on the page never touches this cell's document, so the host announces it on the same beat it re-keys the resting cells.
  useEffect(() => {
    viewRef.current?.dispatch({ effects: resolutionNudge.of(null) })
  }, [ordinalOf])

  // Compared as SOURCE, not as text: a rebuild that differs only in what a GFM cell cannot hold — an edge space, a trailing empty item — would otherwise rewrite the live document under the caret.
  // Safe while focused: a keystroke makes `initial` equal the text just typed so the guard below no-ops, while a reorder or focused undo brings genuinely different text the sync must apply.
  useLayoutEffect(() => {
    const view = viewRef.current
    if (!view || cellToSource(view.state.doc.toString()).trim() === cellToSource(initial).trim())
      return
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: initial },
      annotations: silentEdit.of(true),
    })
  }, [initial])

  return (
    <>
      <div ref={mountRef} className="mdpm-tbl-cell-editor" />
      <AutocompletePane {...pane} />
    </>
  )
}
