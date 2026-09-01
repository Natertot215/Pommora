import { useEffect, useLayoutEffect, useRef } from 'react'
import { EditorView, keymap } from '@codemirror/view'
import { Annotation, EditorState, Prec } from '@codemirror/state'
import { defaultKeymap } from '@codemirror/commands'
import { customCaret } from '../Editor/caret'
import { customSelection } from '../Editor/selection'
import { markdownDecorations } from '../Editor/decorations'
import { formatKeymap } from '../Editor/formatKeymap'
import { cellCitations, citesChanged } from './cellCitations'
import { autoPair, autoDelete, type Edit } from '../Input'
import { docScan } from '../Editor/docCache'
import { AC_MAX, aliasRows, pageRow } from '../autocomplete'
import { aliasOnLeave } from '../Editor/linkEdit'
import { linkRest, linkTyping } from '../Editor/linkGestures'
import { connectionClicks } from '../Editor/connections'
import { markdownLinkClicks } from '../Editor/links'
import { pasteLink } from '../Editor/PasteLink'
import { pendingTitle } from '../Editor/PendingTitle'
import {
  useConnectionAutocomplete,
  detectConnectionQuery,
  whenAcOpen,
} from '../useConnectionAutocomplete'
import { AutocompletePane } from '../AutocompletePane'
import type { ConnectionsApi } from '../Connections'
import type { NavDir } from './navigate'

const noConn = (): undefined => undefined

/** A cell binding that always consumes its key. The cell sits inside the widget's `ignoreEvent` host,
 *  so every key it claims must stop here rather than fall through to the page editor beneath. */
const consume =
  (run: (view: EditorView) => void) =>
  (view: EditorView): boolean => {
    run(view)
    return true
  }

// Tags a programmatic content sync (the model re-rendered this cell with new text, e.g. after a reorder)
// so the updateListener doesn't treat it as a user edit and echo it back through onCommit.
const silentEdit = Annotation.define<boolean>()

// One dispatch for any input/index Edit — auto-pair and paired-delete share it (the page editor's `apply`
// equivalent, kept cell-local since the cell doesn't scrollIntoView and varies the userEvent).
function applyEdit(view: EditorView, e: Edit | null, userEvent: string): boolean {
  if (!e) return false
  view.dispatch({
    changes: { from: e.from, to: e.to, insert: e.insert },
    selection: { anchor: e.selection },
    userEvent,
  })
  return true
}

export function CellEditor({
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
  initial: string
  onCommit: (text: string) => void
  onNavigate: (dir: NavDir) => void
  /** True claims the paste as a structural fill; false lets it paste as the text it is. */
  onTablePaste?: (text: string) => boolean
  onUndo: () => void
  onRedo: () => void
  // The cell only mounts when it's the active cell, so it focuses itself: at the click point if one was
  // captured (StaticCell mousedown), otherwise at the end (keyboard navigation into the cell).
  caretCoords?: { x: number; y: number } | null
  /** A span to enter the cell with already selected — the link menu's Rename and Edit Link. */
  initialSelect?: [number, number] | null
  /** The cell was entered by a selection swept in from outside the table: the caret lands at the
   *  release point as ever, and the end the sweep came from becomes the selection's anchor. */
  sweepFrom?: 'start' | 'end' | null
  connections?: () => ConnectionsApi | undefined
  /** The document's footnote numbering, which this editor's own one-cell document cannot hold. */
  ordinalOf?: (label: string) => number | null
}): React.JSX.Element {
  const host = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onCommitRef = useRef(onCommit)
  onCommitRef.current = onCommit
  const onNavigateRef = useRef(onNavigate)
  onNavigateRef.current = onNavigate
  const onUndoRef = useRef(onUndo)
  onUndoRef.current = onUndo
  const onRedoRef = useRef(onRedo)
  onRedoRef.current = onRedo
  // The numbering is a whole-document fact and the extensions bake at mount, so it is read live like
  // every other value this editor takes from its host.
  const ordinalOfRef = useRef(ordinalOf)
  ordinalOfRef.current = ordinalOf
  const onTablePasteRef = useRef(onTablePaste)
  onTablePasteRef.current = onTablePaste

  const { ac, setAc, candidates, acIndex, commit, acCtl } = useConnectionAutocomplete(
    viewRef,
    (q) => {
      const conn = connections?.()
      if (!conn) return []
      // A cell renders an alias like any other surface, so it offers the same memory the body does.
      return q.form === 'alias'
        ? aliasRows(conn, q.title, q.query)
        : conn.candidates(q.query, AC_MAX).map(pageRow)
    },
  )

  useEffect(() => {
    const view = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: initial,
        extensions: [
          markdownDecorations(connections ?? noConn),
          // A marker's number is a whole-document fact, and this editor's document is one cell.
          cellCitations(() => ordinalOfRef.current),
          // A cell authors aliases like the body does — without this an abandoned pipe reaches disk.
          aliasOnLeave(() => connections?.()),
          pasteLink,
          // A cell's editor dies the moment it deactivates, so a fetch landing after you tab away
          // reaches nothing and the Short Link stands, recoverable later through Format.
          pendingTitle,
          // Ahead of pasteLink: a pipe-shaped clipboard is structural before it is cell text.
          Prec.highest(
            EditorView.domEventHandlers({
              paste(event) {
                const text = event.clipboardData?.getData('text/plain')
                if (!text || !onTablePasteRef.current?.(text)) return false
                event.preventDefault()
                return true
              },
            }),
          ),
          markdownLinkClicks(() => connections?.()),
          connectionClicks(() => connections?.()),
          linkRest,
          linkTyping,
          customCaret,
          customSelection,
          EditorView.lineWrapping,
          // Native spell-check, opted in explicitly: the cell editor sits inside the table widget's
          // contentEditable=false host, which suppresses the spell-check the page editor inherits by default.
          EditorView.contentAttributes.of({ spellcheck: 'true' }),
          Prec.highest(
            keymap.of([
              {
                key: 'Tab',
                run: consume(() =>
                  acCtl.current.open ? acCtl.current.pick() : onNavigateRef.current('next'),
                ),
              },
              { key: 'Shift-Tab', run: consume(() => onNavigateRef.current('prev')) },
              // With the connection pane open these keys drive it; closed, only Enter falls through.
              {
                key: 'Enter',
                run: consume(() =>
                  acCtl.current.open ? acCtl.current.pick() : onNavigateRef.current('down'),
                ),
              },
              { key: 'ArrowDown', run: whenAcOpen(acCtl, (c) => c.move(1)) },
              { key: 'ArrowUp', run: whenAcOpen(acCtl, (c) => c.move(-1)) },
              { key: 'Escape', run: whenAcOpen(acCtl, (c) => c.close()) },
              // Shift+Enter is the in-cell line break — a real newline (the cell grows taller; the row does
              // NOT split, because cellToSource serializes the newline as <br> on disk).
              {
                key: 'Shift-Enter',
                run: consume((view) => view.dispatch(view.state.replaceSelection('\n'))),
              },
              // Backspace inside an empty auto-pair deletes both halves; same autoDelete the page editor uses.
              {
                key: 'Backspace',
                run: (view) => {
                  const s = view.state.selection.main
                  return applyEdit(
                    view,
                    autoDelete(docScan(view.state.doc), s.from, s.to),
                    'delete',
                  )
                },
              },
              // Undo/redo scope to the whole page's history, not a per-cell stack — the main editor can't
              // catch these itself (the widget's ignoreEvent), so the cell forwards them.
              { key: 'Mod-z', run: consume(() => onUndoRef.current()) },
              { key: 'Mod-Shift-z', run: consume(() => onRedoRef.current()) },
              { key: 'Mod-y', run: consume(() => onRedoRef.current()) },
            ]),
          ),
          // The inline chords are the body's, not the table's — a cell formats with the same keys and
          // the same transforms every other surface uses.
          formatKeymap,
          keymap.of(defaultKeymap),
          // Character-pair auto-pairing only (not the main editor's list/blockquote input) so the `[[…]]`
          // query closes and autocomplete can fire.
          EditorView.inputHandler.of((view, from, to, text) => {
            if (text.length !== 1 || from !== to) return false
            return applyEdit(view, autoPair(docScan(view.state.doc), from, from, text), 'input')
          }),
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
    // Land the caret: the span a menu action asked for, else the click point (posAtCoords, which can
    // throw before the view has measured), else the end.
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
    return () => {
      view.destroy()
      viewRef.current = null
    }
    // Mount once — the cell IS the live editor.
  }, [])

  // A renumber above the table never touches this cell's document, so nothing in it announces the
  // move. The host does — the same beat on which it hands the resting cells a fresh key.
  useEffect(() => {
    viewRef.current?.dispatch({ effects: citesChanged.of(null) })
  }, [ordinalOf])

  // The model can re-render this positional cell with different text (reorder, page undo, a sibling
  // cell edit rebuilding the table) — sync the live editor to it. Safe while focused: a keystroke makes
  // `initial` equal the text just typed, so the guard below no-ops; a reorder or focused undo brings
  // genuinely different text and the sync must apply.
  useLayoutEffect(() => {
    const view = viewRef.current
    if (!view || view.state.doc.toString() === initial) return
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: initial },
      annotations: silentEdit.of(true),
    })
  }, [initial])

  return (
    <>
      <div ref={host} className="mdpm-tbl-cell-editor" />
      <AutocompletePane
        open={ac !== null}
        candidates={candidates}
        index={acIndex}
        form={ac?.form ?? 'link'}
        caretX={ac?.caretX ?? 0}
        caretTop={ac?.caretTop ?? 0}
        caretBottom={ac?.caretBottom ?? 0}
        bounds={ac?.bounds}
        query={ac?.query ?? ''}
        onPick={commit}
      />
    </>
  )
}
