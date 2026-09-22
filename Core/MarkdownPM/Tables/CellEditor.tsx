import { useEffect, useLayoutEffect, useRef } from 'react'
import { EditorView, keymap } from '@codemirror/view'
import { Annotation, Compartment, EditorSelection, EditorState, Prec } from '@codemirror/state'
import { defaultKeymap, deleteCharForward, historyKeymap, redo, undo } from '@codemirror/commands'
import { customCaret } from '../caret'
import { customSelection } from '../selection'
import { markdownDecorations } from '../decorations'
import { formatKeymap } from '../Input/formatKeymap'
import { cellCitations, citesChanged } from './cellCitations'
import {
  autoPair,
  autoDelete,
  canonicalizeCheckbox,
  continueListOnEnter,
  dashArrow,
  ellipsis,
  equations,
  bullet,
  sectionSign,
  indentListOnTab,
  outdentListOnShiftTab,
  smartBackspace,
  wrapSelection,
  type Edit,
} from '../Input/edits'
import { listRenumberOnDelete } from '../Input/listRenumber'
import { listDragExtension } from '../Gestures/listDrag'
import { blockDragExtension } from '../Gestures/blockDrag'
import { blockGripHover, blockHandles } from '../Menus/blockHandles'
import { gripMenu } from '../Menus/gripMenu'
import { renumberAfterNest } from '../Engine/listDragModel'
import { parseListMarker, type ListMarker, type MarkdownScope } from '../Engine/detect'
import { cellToSource } from '../Engine/Tables/codec'
import { applyEdit } from '../Input/applyEdit'
import { docLineIntentsOf, docScan, docString } from '../docCache'
import { listGlyphOf, seatPastMarker } from '../Engine/intents'
import { headingTargetOf } from '../Autocomplete/headingTarget'
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
    transform: (doc: string, selStart: number, selEnd: number, scope: MarkdownScope) => Edit | null,
    recount = false,
  ) =>
  (view: EditorView): boolean => {
    const s = view.state.selection.main
    const doc = docString(view.state.doc)
    const edit = transform(doc, s.from, s.to, 'cell')
    // The recount rides a NEST alone: continueListOnEnter renumbers the run it splits itself, and a second pass counts those items twice.
    return applyEdit(view, edit, {
      recount: edit && recount ? renumberAfterNest(doc, edit) : [],
    })
  }

const continueList = listEdit(continueListOnEnter)
const nestList = listEdit(indentListOnTab, true)
const unnestList = listEdit(outdentListOnShiftTab, true)

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
  const formatGate = useRef(new Compartment())
  const lastCommands = useRef(host.settings().commands)

  const {
    ac,
    setAc,
    candidates,
    acIndex,
    commit,
    acCtl,
    viaChevron,
    loading,
    headingRows,
    collapsed,
    toggleHeading,
  } = useConnectionAutocomplete(
    viewRef,
    host,
    (q) => {
      const conn = connections?.()
      if (!conn) return []
      return q.form === 'alias'
        ? aliasRows(conn, host.aliases, q.title, q.query)
        : conn.candidates(q.query, AC_MAX).map(pageRow)
    },
    (title) => headingTargetOf(host, connections?.(), title),
  )

  useEffect(() => {
    const view = new EditorView({
      parent: mountRef.current!,
      state: EditorState.create({
        doc: initial,
        extensions: [
          editorHost.of(host),
          markdownDecorations(connections ?? noConn, 'cell'),
          listDragExtension,
          listRenumberOnDelete,
          blockHandles('cell'),
          blockGripHover('cell'),
          blockDragExtension,
          gripMenu,
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
          EditorView.contentAttributes.of({ spellcheck: 'true', 'data-drawn-caret': '' }),
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
              { key: 'ArrowDown', run: whenAcOpen([acCtl], (c) => c.move(1)) },
              { key: 'ArrowUp', run: whenAcOpen([acCtl], (c) => c.move(-1)) },
              { key: 'Escape', run: whenAcOpen([acCtl], (c) => c.close()) },
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
          formatGate.current.of(formatKeymap(lastCommands.current)),
          keymap.of(defaultKeymap),
          EditorView.inputHandler.of((view, from, to, text) => {
            if (view.composing || view.compositionStarted) return false
            if (text.length !== 1) return false
            const scan = docScan(view.state.doc)
            const settings = host.settings()
            if (from !== to) return applyEdit(view, wrapSelection(scan, from, to, text, settings))
            if (refusedInAlias(scan.text, from, text)) return true
            return applyEdit(
              view,
              canonicalizeCheckbox(scan.text, from, from, text, 'cell') ??
                autoPair(scan, from, from, text, settings) ??
                dashArrow(scan, from, from, text, settings) ??
                ellipsis(scan, from, from, text, settings) ??
                equations(scan, from, from, text, settings) ??
                sectionSign(scan, from, from, text, settings) ??
                bullet(scan, from, from, text, settings),
            )
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
    // The press that promoted this cell never reached CM, so the seat its own pointer filter would have given lands here.
    seatPastMarkerNow(view)
    return () => {
      view.destroy()
      viewRef.current = null
    }
    // Mount once — the cell IS the live editor.
  }, [])

  const commands = host.settings().commands
  useEffect(() => {
    const view = viewRef.current
    if (!view || commands === lastCommands.current) {
      lastCommands.current = commands
      return
    }
    lastCommands.current = commands
    view.dispatch({ effects: formatGate.current.reconfigure(formatKeymap(commands)) })
  }, [commands])

  // A renumber above the table never touches this cell's document, so the host announces it on the same beat it re-keys the resting cells.
  useEffect(() => {
    viewRef.current?.dispatch({ effects: citesChanged.of(null) })
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
      <AutocompletePane
        ac={ac}
        candidates={candidates}
        index={acIndex}
        onPick={commit}
        viaChevron={viaChevron}
        loading={loading}
        headingRows={headingRows}
        collapsed={collapsed}
        onToggleHeading={toggleHeading}
        onAside={(row) => commit(row, { openHeading: true })}
        onBack={() => {
          acCtl.current.aside?.(-1)
        }}
      />
    </>
  )
}
