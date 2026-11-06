import { useEffect, useLayoutEffect, useRef } from 'react'
import { EditorView, keymap } from '@codemirror/view'
import { EditorState, Prec } from '@codemirror/state'
import { historyKeymap, redo, undo } from '@codemirror/commands'
import { useReconfigured } from '../Input/useReconfigured'
import { formatKeymap } from '../Input/formatKeymap'
import { cellCitations } from './cellCitations'
import { cellToSource } from '../Engine/Tables/codec'
import { decodePayload, type TablePayload } from '../Engine/Tables/clipboard'
import { seatPastMarkerNow } from '../Input/markdownInput'
import { docScan } from '../docCache'
import { lineIndexAt } from '../Engine/markdownCode'
import { useConnectionAutocomplete } from '../Autocomplete/useConnectionAutocomplete'
import { AutocompletePane } from '../Autocomplete/AutocompletePane'
import type { NavDir } from '../Engine/Tables/navigate'
import { type EditorHost, mirrorBody, mirrored, redrawNudge } from '../api'
import { useLatest } from '@pommora/uix/Utilities/stableApi'
import { editorBase } from '../surface'
import { type PendingTitle, pendingTitles } from '../Links/pendingTitle'
import { linkSettle } from '../Links/linkSettle'

const HISTORY_BINDINGS = historyKeymap.filter((b) => b.run === undo || b.run === redo)

/** The cell sits inside the widget's `ignoreEvent` host, so every key it claims must stop here rather than fall through. */
const consume =
  (run: (view: EditorView) => void) =>
  (view: EditorView): boolean => {
    run(view)
    return true
  }

/** A caret on the cell's last item — a nested item below still carries the list on. */
const atListEnd = (view: EditorView): boolean => {
  const scan = docScan(view.state)
  const s = view.state.selection.main
  const k = lineIndexAt(scan, s.from)
  return s.empty && scan.markers[k] !== null && scan.markers.slice(k + 1).every((m) => m === null)
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
  onFill,
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
  onFill: (payload: TablePayload) => void
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
  const onFillRef = useLatest(onFill)
  const onCloseRef = useLatest(onClose)
  const ac = useConnectionAutocomplete(viewRef, host)
  const formatExt = useReconfigured(viewRef, host.settings().commands, formatKeymap)

  useEffect(() => {
    const view = new EditorView({
      parent: mountRef.current!,
      state: EditorState.create({
        doc: initial,
        extensions: [
          editorBase({
            host,
            scope: 'lists',
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
            queueMicrotask(() => onFillRef.current(payload))
            return []
          }),
          Prec.highest(
            keymap.of([
              { key: 'Tab', run: consume(() => onNavigateRef.current('next')) },
              { key: 'Shift-Tab', run: consume(() => onNavigateRef.current('prev')) },
              { key: 'Enter', run: consume(() => onNavigateRef.current('down')) },
              // The exit is the list's final item alone; above it, and outside a list, the break is the body's own, and the row does NOT split, because cellToSource serializes it as <br> on disk.
              {
                key: 'Shift-Enter',
                run: consume((view) => {
                  if (atListEnd(view)) return onNavigateRef.current('down')
                  view.dispatch(view.state.replaceSelection('\n'))
                }),
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
      view.plugin(linkSettle)?.flush()
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
