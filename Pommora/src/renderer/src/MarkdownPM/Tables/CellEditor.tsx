import { useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { EditorView, keymap } from '@codemirror/view'
import { Annotation, EditorState, Prec } from '@codemirror/state'
import { defaultKeymap } from '@codemirror/commands'
import { customCaret } from '../editor/caret'
import { markdownDecorations } from '../editor/decorations'
import { autoPair, autoDelete, type Edit } from '../input'
import { AC_MAX, aliasRows, pageRow } from '../autocomplete'
import { aliasOnLeave } from '../editor/linkEdit'
import { linkRest, linkTyping } from '../editor/linkGestures'
import { markdownLinkClicks } from '../editor/links'
import { pasteLink } from '../editor/PasteLink'
import { pendingTitle } from '../editor/PendingTitle'
import {
  useConnectionAutocomplete,
  detectConnectionQuery,
  whenAcOpen,
} from '../useConnectionAutocomplete'
import { AutocompletePanel } from '../AutocompletePanel'
import type { ConnectionsApi } from '../connections'
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
  onUndo,
  onRedo,
  caretCoords,
  initialSelect,
  connections,
}: {
  initial: string
  onCommit: (text: string) => void
  onNavigate: (dir: NavDir) => void
  onUndo: () => void
  onRedo: () => void
  // The cell only mounts when it's the active cell, so it focuses itself: at the click point if one was
  // captured (StaticCell mousedown), otherwise at the end (keyboard navigation into the cell).
  caretCoords?: { x: number; y: number } | null
  /** A span to enter the cell with already selected — the link menu's Rename and Edit Link. */
  initialSelect?: [number, number] | null
  connections?: () => ConnectionsApi | undefined
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

  const { ac, setAc, candidates, acIndex, acTop, commit, acCtl } = useConnectionAutocomplete(
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
          // A cell authors aliases like the body does, so it owes the memory the same writes — without
          // this the mode it offers is one it can never contribute to, and an abandoned pipe reaches disk.
          aliasOnLeave(() => connections?.()),
          pasteLink,
          // A cell's editor dies the moment the cell deactivates, so a fetch that lands after you
          // tab away reaches nothing and the Short Link stands — recoverable later through Format.
          pendingTitle,
          // A link in a cell is a link: it follows, previews, and carries its own menu, the same as
          // one in the body. Nothing else pops a menu over a cell — the table widget reports as
          // non-editable, so the prose menu stands down across the whole of it.
          markdownLinkClicks(() => connections?.()),
          linkRest,
          linkTyping,
          customCaret,
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
              // With the connection panel open these keys drive it; when it's closed only Enter falls
              // through to cell navigation (arrows/Escape are no-ops without an open panel).
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
              // Backspace inside an empty auto-pair deletes both halves (the cell otherwise falls to the default
              // single-char delete, which would leave the stray closer); same autoDelete the page editor uses.
              {
                key: 'Backspace',
                run: (view) => {
                  const s = view.state.selection.main
                  return applyEdit(
                    view,
                    autoDelete(view.state.doc.toString(), s.from, s.to),
                    'delete',
                  )
                },
              },
              // Undo/redo scope to the whole page (the main editor's history) like everywhere else — not a
              // per-cell stack. The main editor can't catch these itself (the widget's ignoreEvent), so the
              // cell forwards them.
              { key: 'Mod-z', run: consume(() => onUndoRef.current()) },
              { key: 'Mod-Shift-z', run: consume(() => onRedoRef.current()) },
              { key: 'Mod-y', run: consume(() => onRedoRef.current()) },
            ]),
          ),
          keymap.of(defaultKeymap),
          // Character-pair auto-pairing only (not the main editor's list/blockquote input) so the `[[…]]`
          // query closes and autocomplete can fire.
          EditorView.inputHandler.of((view, from, to, text) => {
            if (text.length !== 1 || from !== to) return false
            return applyEdit(view, autoPair(view.state.doc.toString(), from, from, text), 'input')
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
    // Focus + land the caret: at the click point (posAtCoords) if one was captured, else at the end.
    // posAtCoords reads layout and can throw before the view has measured — fall back to the end.
    view.focus()
    if (initialSelect) {
      const end = view.state.doc.length
      view.dispatch({
        selection: { anchor: Math.min(initialSelect[0], end), head: Math.min(initialSelect[1], end) },
      })
      return () => {
        view.destroy()
        viewRef.current = null
      }
    }
    let pos: number | null = null
    try {
      if (caretCoords) pos = view.posAtCoords({ x: caretCoords.x, y: caretCoords.y })
    } catch {
      pos = null
    }
    view.dispatch({ selection: { anchor: pos ?? view.state.doc.length } })
    return () => {
      view.destroy()
      viewRef.current = null
    }
    // Mount once — the cell IS the live editor.
  }, [])

  // The model can re-render this positional cell with different text — a reorder moves content between
  // cells, a page undo reverts it, a cell edit rebuilds its own table. Sync the live editor to it. Safe
  // even while focused: a cell keystroke makes `initial` equal the text just typed (identical to the
  // live doc, so the guard below no-ops); a reorder or focused undo brings genuinely different text and
  // the sync applies — a focused undo MUST update the cell the caret sits in.
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
      {createPortal(
        <AutocompletePanel
          open={ac !== null}
          candidates={candidates}
          index={acIndex}
          left={ac?.left ?? 0}
          top={acTop}
          query={ac?.query ?? ''}
          onPick={commit}
        />,
        document.body,
      )}
    </>
  )
}
