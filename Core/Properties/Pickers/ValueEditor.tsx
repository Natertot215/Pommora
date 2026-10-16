import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { EditorView, keymap, placeholder } from '@codemirror/view'
import { EditorState, Prec } from '@codemirror/state'
import { history, historyKeymap, insertNewline } from '@codemirror/commands'
import { invalidInput } from '@pommora/uix/Fields/fields.css'
import { PICKER_PORTAL_ATTR } from '@pommora/uix/Pickers/PickerMenu'
import { useLatest } from '@pommora/uix/Utilities/stableApi'
import type { ConnPage } from '../../Connections/pageIndex'
import { markdownLink } from '../../Connections/links'
import { type EditorHost, heldPage, mirrorBody } from '../../MarkdownPM/api'
import { editorBase } from '../../MarkdownPM/surface'
import { focusRange } from '../../MarkdownPM/caretPlacement'
import { drawnLinkAt } from '../../MarkdownPM/decorations'
import { applyLinkAction } from '../../MarkdownPM/Links/linkEdit'
import { linkSettle } from '../../MarkdownPM/Links/linkSettle'
import { inCaretPane } from '../../MarkdownPM/Menus/caretPane'
import { formatKeymap } from '../../MarkdownPM/Input/formatKeymap'
import { useReconfigured } from '../../MarkdownPM/Input/useReconfigured'
import { useConnectionAutocomplete } from '../../MarkdownPM/Autocomplete/useConnectionAutocomplete'
import { AutocompletePane } from '../../MarkdownPM/Autocomplete/AutocompletePane'
import './text-pane.css'

const stopBubble = (e: { stopPropagation: () => void }): void => e.stopPropagation()

const blanked = (doc: string): string => (doc.trim() === '' ? '' : doc)

/** The one editor every property value is typed in: the Text pane's, and in `oneLine` mode a field's. Both save once on every way out; a field also ends its own edit, Return and blur committing unless the text is invalid, Escape cancelling, with the invalid state on the editor's own node. A commit settles the link under edit first, so what the leave would have written is what's read; a cancel ends the edit, so nothing after it, the unmount's save included, writes. */
export function ValueEditor({
  initial,
  holder,
  host,
  oneLine = false,
  remembers,
  alias,
  invalid,
  saveRef,
  onCommit,
  onClose,
}: {
  initial: string
  holder: ConnPage | undefined
  host: EditorHost
  oneLine?: boolean
  remembers?: boolean
  /** Once mounted, seat the caret in the value's alias slot: the Link value's Rename. */
  alias?: boolean
  invalid?: (text: string) => boolean
  saveRef?: RefObject<() => void>
  onCommit: (text: string) => void
  onClose: () => void
}): React.JSX.Element {
  const mountRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const committed = useRef(blanked(initial))
  const ended = useRef(false)
  const onCommitRef = useLatest(onCommit)
  const onCloseRef = useLatest(onClose)
  const invalidRef = useLatest(invalid)
  const ac = useConnectionAutocomplete(viewRef, host, 'text')
  const formatExt = useReconfigured(viewRef, host.settings().commands, formatKeymap)

  const commit = (): void => {
    const view = viewRef.current
    if (!view || ended.current) return
    view.plugin(linkSettle)?.flush()
    const text = blanked(view.state.doc.toString())
    if (text === committed.current) return
    committed.current = text
    onCommitRef.current(text)
  }
  const cancel = (): boolean => {
    ended.current = true
    onCloseRef.current()
    return true
  }
  const leave = (): boolean => {
    const view = viewRef.current
    if (view && invalidRef.current?.(view.state.doc.toString())) return cancel()
    commit()
    onCloseRef.current()
    return true
  }
  if (saveRef) saveRef.current = commit

  useEffect(() => {
    const view = new EditorView({
      parent: mountRef.current!,
      state: EditorState.create({
        doc: initial,
        extensions: [
          editorBase({ host, scope: 'text', panes: [ac], formatExt, oneLine, remembers }),
          heldPage.of(holder ?? null),
          history(),
          oneLine
            ? [
                EditorView.editorAttributes.of({ class: invalidInput }),
                // A field holds one line: a typed or pasted break lands as a space.
                EditorState.transactionFilter.of((tr) => {
                  if (!tr.docChanged || tr.newDoc.lines === 1) return tr
                  const breaks = []
                  for (let i = 1; i < tr.newDoc.lines; i++) {
                    const { to } = tr.newDoc.line(i)
                    breaks.push({ from: to, to: to + 1, insert: ' ' })
                  }
                  return [tr, { changes: breaks, sequential: true }]
                }),
                EditorView.updateListener.of((u) => {
                  if (u.docChanged && invalidRef.current)
                    u.view.dom.setAttribute(
                      'aria-invalid',
                      String(invalidRef.current(u.state.doc.toString())),
                    )
                }),
                EditorView.domEventHandlers({
                  blur: (e) => {
                    if (!inCaretPane(e.relatedTarget)) leave()
                    return false
                  },
                }),
              ]
            : placeholder('Begin typing.'),
          Prec.highest(
            keymap.of([
              { key: 'Enter', run: leave },
              { key: 'Shift-Enter', run: oneLine ? () => true : insertNewline },
              ...(oneLine
                ? [
                    { key: 'Mod-Enter', run: () => true },
                    { key: 'Escape', run: cancel },
                  ]
                : [
                    // A field lets Tab move the focus as a plain field does; the pane keeps it, and Shift-Tab stops short of its focus trap, which would carry it to the ×.
                    { key: 'Tab', run: () => true },
                    { key: 'Shift-Tab', run: () => true, stopPropagation: true },
                  ]),
            ]),
          ),
          keymap.of(historyKeymap),
        ],
      }),
    })
    viewRef.current = view
    if (invalid) view.dom.setAttribute('aria-invalid', String(invalid(initial)))
    const doc = view.state.doc.toString()
    if (alias && drawnLinkAt(view, 0)) applyLinkAction(view, 'rename', [0, doc.length])
    else if (alias) {
      // A bare address draws no link token, so Rename gives it the label a markdown link has.
      view.dispatch({ changes: { from: 0, to: doc.length, insert: markdownLink(doc, '') } })
      focusRange(view, 1)
    } else {
      view.dispatch({ selection: { anchor: doc.length }, scrollIntoView: true })
      view.focus()
    }
    // A popover blooms in from a scale the caret was measured through, so the editor measures again once it settles.
    const portal = mountRef.current!.closest(`[${PICKER_PORTAL_ATTR}]`)
    const remeasure = (): void => view.requestMeasure()
    portal?.addEventListener('animationend', remeasure)
    return () => {
      portal?.removeEventListener('animationend', remeasure)
      view.destroy()
      viewRef.current = null
    }
  }, [])
  // Saved in the mutation phase: a seat unmounting with the pane retires its writer in its own passive cleanup first, so a passive save here would be dropped.
  useLayoutEffect(() => commit, [])
  // An outside write lands only in an editor that holds nothing unsaved; the editor's own close then writes last, as a page body's merge does.
  useEffect(() => {
    const view = viewRef.current
    if (
      view &&
      blanked(view.state.doc.toString()) === committed.current &&
      initial !== committed.current
    ) {
      committed.current = initial
      mirrorBody(view, initial)
    }
  }, [initial])

  return (
    <>
      {/* The layer above cancels every right-click and a seat's click opens the edit; the editor's own menu and caret ask first, so both events stop here. */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: a bubble guard, not a control */}
      <div
        className={oneLine ? 'value-field mdpm-shell' : 'text-pane-body mdpm-shell'}
        onClick={stopBubble}
        onContextMenu={stopBubble}
      >
        <div ref={mountRef} className="mdpm-editor" />
      </div>
      <AutocompletePane {...ac.pane} />
    </>
  )
}
