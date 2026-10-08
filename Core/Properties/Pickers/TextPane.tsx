import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { EditorView, keymap, placeholder } from '@codemirror/view'
import { EditorState, Prec } from '@codemirror/state'
import { history, historyKeymap, insertNewline } from '@codemirror/commands'
import { PickerMenu } from '@pommora/uix/Pickers/PickerMenu'
import { AccessoryButton } from '@pommora/uix/Menus'
import { useLatest } from '@pommora/uix/Utilities/stableApi'
import type { ConnPage } from '../../Connections/pageIndex'
import { type EditorHost, heldPage, mirrorBody } from '../../MarkdownPM/api'
import { editorBase } from '../../MarkdownPM/surface'
import { formatKeymap } from '../../MarkdownPM/Input/formatKeymap'
import { useReconfigured } from '../../MarkdownPM/Input/useReconfigured'
import { useConnectionAutocomplete } from '../../MarkdownPM/Autocomplete/useConnectionAutocomplete'
import { AutocompletePane } from '../../MarkdownPM/Autocomplete/AutocompletePane'
import { useEditorHost } from '../../Pages/editorHost'
import type { ConnectionsApi } from '../../MarkdownPM/Links/connectionsApi'
import { previewConnections } from '../../Session/pageConnections'
import type { PropertyValue } from '../propertyValue'
import './text-pane.css'

const stopBubble = (e: { stopPropagation: () => void }): void => e.stopPropagation()

const settled = (doc: string): string => (doc.trim() === '' ? '' : doc)

/** A Text value's pane: MarkdownPM's `'text'` scope with its own history and placeholder, saving once on every way out. The editor lives in the pane's body, which `PickerMenu` mounts and unmounts around each open. */
export function TextPane({
  current,
  holder,
  connections = previewConnections,
  open,
  triggerRef,
  onCommit,
  onDismiss,
}: {
  current: PropertyValue | null
  holder?: ConnPage
  connections?: () => ConnectionsApi | undefined
  open: boolean
  triggerRef: RefObject<HTMLElement | null>
  onCommit: (value: PropertyValue | null) => void
  onDismiss: () => void
}): React.JSX.Element {
  const host = useEditorHost({})
  const saveRef = useRef<() => void>(() => {})
  const close = (): void => {
    saveRef.current()
    onDismiss()
  }
  return (
    <PickerMenu
      open={open}
      onDismiss={close}
      triggerRef={triggerRef}
      direction="down"
      origin="center"
      contentClassName="text-pane"
    >
      <TextPaneEditor
        text={current?.kind === 'text' ? current.value : ''}
        holder={holder}
        connections={connections}
        host={host}
        saveRef={saveRef}
        onCommit={onCommit}
        onClose={close}
      />
      <AccessoryButton
        icon="x"
        size="control"
        ariaLabel="Save and close"
        className="text-pane-close"
        onClick={close}
      />
    </PickerMenu>
  )
}

function TextPaneEditor({
  text,
  holder,
  connections,
  host,
  saveRef,
  onCommit,
  onClose,
}: {
  text: string
  holder: ConnPage | undefined
  connections: () => ConnectionsApi | undefined
  host: EditorHost
  saveRef: RefObject<() => void>
  onCommit: (value: PropertyValue | null) => void
  onClose: () => void
}): React.JSX.Element {
  const onCloseRef = useLatest(onClose)
  const mountRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const committed = useRef(text)
  const onCommitRef = useLatest(onCommit)
  const { setAc, acCtl, pane } = useConnectionAutocomplete(viewRef, host, connections)
  const formatExt = useReconfigured(viewRef, host.settings().commands, formatKeymap)

  const save = (): void => {
    const doc = viewRef.current?.state.doc.toString()
    if (doc === undefined || settled(doc) === committed.current) return
    committed.current = settled(doc)
    onCommitRef.current(committed.current === '' ? null : { kind: 'text', value: doc })
  }
  saveRef.current = save

  useEffect(() => {
    const view = new EditorView({
      parent: mountRef.current!,
      state: EditorState.create({
        doc: text,
        extensions: [
          editorBase({
            host,
            getConn: connections,
            scope: 'text',
            ac: { acCtl, setAc },
            formatExt,
          }),
          heldPage.of(holder ?? null),
          history(),
          placeholder('Begin typing.'),
          // Shift-Tab stops short of the pane's focus trap, which would carry it to the ×.
          Prec.highest(
            keymap.of([
              {
                key: 'Enter',
                run: () => {
                  onCloseRef.current()
                  return true
                },
              },
              { key: 'Shift-Enter', run: insertNewline },
              { key: 'Tab', run: () => true },
              { key: 'Shift-Tab', run: () => true, stopPropagation: true },
            ]),
          ),
          keymap.of(historyKeymap),
        ],
      }),
    })
    viewRef.current = view
    view.dispatch({ selection: { anchor: view.state.doc.length } })
    // The pane blooms in from a scale the caret was measured through, so the editor measures again once it settles.
    const shell = mountRef.current!.closest('.text-pane')
    const settle = (): void => view.requestMeasure()
    shell?.addEventListener('animationend', settle)
    return () => {
      shell?.removeEventListener('animationend', settle)
      view.destroy()
      viewRef.current = null
    }
  }, [])
  // Saved in the mutation phase: a seat unmounting with the pane retires its writer in its own passive cleanup first, so a passive save here would be dropped.
  useLayoutEffect(() => save, [])
  // An outside write lands only in a pane that holds nothing unsaved; the pane's own close then writes last, as a page body's merge does.
  useEffect(() => {
    const view = viewRef.current
    if (
      view &&
      settled(view.state.doc.toString()) === committed.current &&
      text !== committed.current
    ) {
      committed.current = text
      mirrorBody(view, text)
    }
  }, [text])

  return (
    <>
      {/* The layer above cancels every right-click; the editor's own menu asks first, so its event stops here. */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: a bubble guard, not a control */}
      <div className="text-pane-body mdpm-shell" onContextMenu={stopBubble}>
        <div ref={mountRef} className="mdpm-editor" />
      </div>
      <AutocompletePane {...pane} />
    </>
  )
}
