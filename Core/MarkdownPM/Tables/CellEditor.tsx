import { useEffect, useLayoutEffect, useRef } from 'react'
import { EditorView, keymap } from '@codemirror/view'
import { Annotation, EditorState, Prec } from '@codemirror/state'
import { defaultKeymap } from '@codemirror/commands'
import { customCaret } from '../caret'
import { customSelection } from '../selection'
import { markdownDecorations } from '../decorations'
import { formatKeymap } from '../Input/formatKeymap'
import { cellCitations, citesChanged } from './cellCitations'
import { autoPair, autoDelete, type Edit } from '../Input/edits'
import { docScan } from '../docCache'
import { AC_MAX, aliasRows, pageRow } from '../Autocomplete/autocomplete'
import { refusedInAlias } from '../Guards/aliasGuard'
import { aliasOnLeave } from '../Links/linkEdit'
import { linkRest, linkTyping } from '../Gestures/linkGestures'
import { connectionClicks } from '../Links/connectionClicks'
import { markdownLinkClicks } from '../Links/linkClicks'
import { pasteLink } from '../Links/pasteLink'
import { pendingTitle } from '../Links/pendingTitle'
import {
  useConnectionAutocomplete,
  detectConnectionQuery,
  whenAcOpen,
} from '../Autocomplete/useConnectionAutocomplete'
import { AutocompletePane } from '../Autocomplete/AutocompletePane'
import type { ConnectionsApi } from '../Links/connectionsApi'
import type { NavDir } from '../Engine/Tables/navigate'
import { type EditorHost, editorHost } from '../api'

const noConn = (): undefined => undefined

/** The cell sits inside the widget's `ignoreEvent` host, so every key it claims must stop here rather than fall through. */
const consume =
  (run: (view: EditorView) => void) =>
  (view: EditorView): boolean => {
    run(view)
    return true
  }

// Tags a programmatic content sync so the updateListener doesn't treat it as a user edit and echo it back through onCommit.
const silentEdit = Annotation.define<boolean>()

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
  onTablePaste?: (text: string) => boolean
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
  const onCommitRef = useRef(onCommit)
  onCommitRef.current = onCommit
  const onNavigateRef = useRef(onNavigate)
  onNavigateRef.current = onNavigate
  const onUndoRef = useRef(onUndo)
  onUndoRef.current = onUndo
  const onRedoRef = useRef(onRedo)
  onRedoRef.current = onRedo
  // The numbering is a whole-document fact and the extensions bake at mount, so it is read live.
  const ordinalOfRef = useRef(ordinalOf)
  ordinalOfRef.current = ordinalOf
  const onTablePasteRef = useRef(onTablePaste)
  onTablePasteRef.current = onTablePaste

  const { ac, setAc, candidates, acIndex, commit, acCtl } = useConnectionAutocomplete(
    viewRef,
    host,
    (q) => {
      const conn = connections?.()
      if (!conn) return []
      return q.form === 'alias'
        ? aliasRows(conn, host.aliases, q.title, q.query)
        : conn.candidates(q.query, AC_MAX).map(pageRow)
    },
  )

  useEffect(() => {
    const view = new EditorView({
      parent: mountRef.current!,
      state: EditorState.create({
        doc: initial,
        extensions: [
          editorHost.of(host),
          markdownDecorations(connections ?? noConn),
          cellCitations(() => ordinalOfRef.current),
          // A cell authors aliases like the body does — without this an abandoned pipe reaches disk.
          aliasOnLeave(() => connections?.()),
          pasteLink,
          // A cell's editor dies the moment it deactivates, so a late fetch reaches nothing and the Short Link stands.
          pendingTitle,
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
          // Opted in explicitly: the widget's contentEditable=false host suppresses the spell-check the page editor inherits.
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
              {
                key: 'Enter',
                run: consume(() =>
                  acCtl.current.open ? acCtl.current.pick() : onNavigateRef.current('down'),
                ),
              },
              { key: 'ArrowDown', run: whenAcOpen(acCtl, (c) => c.move(1)) },
              { key: 'ArrowUp', run: whenAcOpen(acCtl, (c) => c.move(-1)) },
              { key: 'Escape', run: whenAcOpen(acCtl, (c) => c.close()) },
              // A real newline; the row does NOT split, because cellToSource serializes it as <br> on disk.
              {
                key: 'Shift-Enter',
                run: consume((view) => view.dispatch(view.state.replaceSelection('\n'))),
              },
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
              // The main editor can't catch these itself (the widget's ignoreEvent), so the cell forwards them to the page history.
              { key: 'Mod-z', run: consume(() => onUndoRef.current()) },
              { key: 'Mod-Shift-z', run: consume(() => onRedoRef.current()) },
              { key: 'Mod-y', run: consume(() => onRedoRef.current()) },
            ]),
          ),
          formatKeymap,
          keymap.of(defaultKeymap),
          // Character-pair auto-pairing only, so the `[[…]]` query closes and autocomplete can fire.
          EditorView.inputHandler.of((view, from, to, text) => {
            if (text.length !== 1 || from !== to) return false
            const scan = docScan(view.state.doc)
            if (refusedInAlias(scan.text, from, text)) return true
            return applyEdit(view, autoPair(scan, from, from, text), 'input')
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
    return () => {
      view.destroy()
      viewRef.current = null
    }
    // Mount once — the cell IS the live editor.
  }, [])

  // A renumber above the table never touches this cell's document, so the host announces it on the same beat it re-keys the resting cells.
  useEffect(() => {
    viewRef.current?.dispatch({ effects: citesChanged.of(null) })
  }, [ordinalOf])

  // Safe while focused: a keystroke makes `initial` equal the text just typed so the guard below no-ops, while a reorder or focused undo brings genuinely different text the sync must apply.
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
      <div ref={mountRef} className="mdpm-tbl-cell-editor" />
      <AutocompletePane ac={ac} candidates={candidates} index={acIndex} onPick={commit} />
    </>
  )
}
