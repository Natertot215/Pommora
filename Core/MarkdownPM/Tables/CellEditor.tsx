import { useEffect, useLayoutEffect, useRef } from 'react'
import { EditorView, keymap } from '@codemirror/view'
import { EditorSelection, EditorState, Prec } from '@codemirror/state'
import { deleteCharForward, historyKeymap, redo, undo } from '@codemirror/commands'
import { useReconfigured } from '../Input/useReconfigured'
import { formatKeymap } from '../Input/formatKeymap'
import { cellCitations } from './cellCitations'
import {
  continueListOnEnter,
  indentListOnTab,
  outdentListOnShiftTab,
  type Edit,
} from '../Input/edits'
import { parseListMarker, type ListMarker, type MarkdownScope } from '../Engine/detect'
import { cellToSource } from '../Engine/Tables/codec'
import { decodePayload, type TablePayload } from '../Engine/Tables/clipboard'
import { applyEdit } from '../Input/applyEdit'
import { docLineIntentsOf, docScan } from '../docCache'
import type { DocScan } from '../Engine/docScan'
import { listGlyphOf, seatPastMarker } from '../Engine/intents'
import { useConnectionAutocomplete } from '../Autocomplete/useConnectionAutocomplete'
import { AutocompletePane } from '../Autocomplete/AutocompletePane'
import type { NavDir } from '../Engine/Tables/navigate'
import { type EditorHost, mirrorBody, mirrored, redrawNudge } from '../api'
import { useLatest } from '@pommora/uix/Utilities/stableApi'
import { editorBase } from '../surface'
import { type PendingTitle, pendingTitles } from '../Links/pendingTitle'

const HISTORY_BINDINGS = historyKeymap.filter((b) => b.run === undo || b.run === redo)

/** The cell sits inside the widget's `ignoreEvent` host, so every key it claims must stop here rather than fall through. */
const consume =
  (run: (view: EditorView) => void) =>
  (view: EditorView): boolean => {
    run(view)
    return true
  }

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

export type Seat =
  | { kind: 'point'; x: number; y: number; sweep?: 'start' | 'end' }
  | { kind: 'select'; range: [number, number] }

export function seatSelection(
  seat: Seat | null,
  end: number,
  posAt: (p: { x: number; y: number }) => number | null,
): { anchor: number; head: number } {
  if (!seat) return { anchor: end, head: end }
  switch (seat.kind) {
    case 'select':
      return { anchor: Math.min(seat.range[0], end), head: Math.min(seat.range[1], end) }
    case 'point': {
      const head = posAt(seat) ?? end
      if (!seat.sweep) return { anchor: head, head }
      return { anchor: seat.sweep === 'start' ? 0 : end, head }
    }
  }
}

export function CellEditor({
  host,
  initial,
  onCommit,
  onNavigate,
  onTablePaste,
  onUndo,
  onRedo,
  seat,
  ordinalOf,
  onClose,
}: {
  host: EditorHost
  initial: string
  onCommit: (text: string) => void
  onNavigate: (dir: NavDir) => void
  onTablePaste: (payload: TablePayload) => void
  onUndo: () => void
  onRedo: () => void
  seat: Seat | null
  ordinalOf: (label: string) => number | null
  onClose: (pending: readonly PendingTitle[]) => void
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
  const onCloseRef = useLatest(onClose)
  const ac = useConnectionAutocomplete(viewRef, host, 'cell')
  const formatExt = useReconfigured(viewRef, host.settings().commands, formatKeymap)

  useEffect(() => {
    const view = new EditorView({
      parent: mountRef.current!,
      state: EditorState.create({
        doc: initial,
        extensions: [
          editorBase({
            host,
            scope: 'cell',
            panes: [ac],
            formatExt,
          }),
          cellCitations(() => ordinalOfRef.current),
          // Every paste reaches here tagged, the menu's and the inverse chord's included, so a table-shaped clipboard fills the cells instead of landing escaped in this one.
          EditorState.transactionFilter.of((tr) => {
            if (!tr.isUserEvent('input.paste')) return tr
            let text = ''
            tr.changes.iterChanges((_fa, _ta, _fb, _tb, inserted) => {
              text += inserted.toString()
            })
            const payload = decodePayload(text)
            if (!payload) return tr
            queueMicrotask(() => onTablePasteRef.current(payload))
            return []
          }),
          Prec.highest(
            keymap.of([
              // In a list Tab is nest and nothing else; at the deepest level it holds, as Shift-Tab does at the shallowest.
              {
                key: 'Tab',
                run: consume((view) => {
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
                  // The cell is left from a line no list owns; on one a list owns, the body writes a break wherever it cannot continue — before the marker, or over a selection.
                  if (!listLineAt(view)) return onNavigateRef.current('down')
                  if (!continueList(view)) view.dispatch(view.state.replaceSelection('\n'))
                }),
              },
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
          EditorView.domEventHandlers({
            // A menu's native Undo or Redo arrives as input rather than keys, and reaches the page history the same way.
            beforeinput: (e) => {
              const forward =
                e.inputType === 'historyUndo'
                  ? onUndoRef
                  : e.inputType === 'historyRedo'
                    ? onRedoRef
                    : null
              if (!forward) return false
              e.preventDefault()
              forward.current()
              return true
            },
          }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged && !u.transactions.some((t) => t.annotation(mirrored)))
              onCommitRef.current(u.state.doc.toString())
          }),
        ],
      }),
    })
    viewRef.current = view
    view.focus()
    const posAt = (p: { x: number; y: number }): number | null => {
      // posAtCoords can throw before the view has measured.
      try {
        return view.posAtCoords(p)
      } catch {
        return null
      }
    }
    view.dispatch({ selection: seatSelection(seat, view.state.doc.length, posAt) })
    // The press that promoted this cell never reached CM, so the seat its own pointer filter would have given lands here.
    seatPastMarkerNow(view)
    return () => {
      onCloseRef.current(view.state.field(pendingTitles))
      view.destroy()
      viewRef.current = null
    }
    // Mount once — the cell IS the live editor.
  }, [])

  // A renumber or a heading change elsewhere on the page never touches this cell's document, so the host announces it on the same beat it re-keys the resting cells.
  useEffect(() => {
    viewRef.current?.dispatch({ effects: redrawNudge.of(null) })
  }, [ordinalOf])

  // Compared as SOURCE, not as text: a rebuild that differs only in what a GFM cell cannot hold — an edge space, a trailing empty item — would otherwise rewrite the live document under the caret.
  // Safe while focused: a keystroke makes `initial` equal the text just typed so the guard below no-ops, while a reorder or focused undo brings genuinely different text the sync must apply.
  useLayoutEffect(() => {
    const view = viewRef.current
    if (view && cellToSource(view.state.doc.toString()).trim() !== cellToSource(initial).trim())
      mirrorBody(view, initial)
  }, [initial])

  return (
    <>
      <div ref={mountRef} className="mdpm-tbl-cell-editor" />
      <AutocompletePane {...ac.pane} />
    </>
  )
}
