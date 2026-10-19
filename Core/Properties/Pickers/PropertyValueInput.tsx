import type { ConnectionsApi } from '../../MarkdownPM/Links/connectionsApi'
import type { CSSProperties, RefObject } from 'react'
import { EditableInput } from '@pommora/uix/Fields/EditableInput'
import { fillInput } from '@pommora/uix/Fields/fields.css'
import { FieldPicker } from '@pommora/uix/Pickers/FieldPicker'
import { solidColorCss } from '@pommora/uix/Theme/ramp'
import type { ConnPage } from '../../Connections/pageIndex'
import type { ConnEditAction } from '../../Actions/connectionMenu'
import type { PropertyDefinition } from '../properties'
import type { PropertyValue } from '../propertyValue'
import { editorText, parseEditorValue } from '../parseEditorValue'
import { numberAffixes } from '../formatValue'
import { useEditorHost } from '../../Pages/editorHost'
import { useSession } from '../../Session/store'
import { TextPane } from './TextPane'
import { ValueEditor } from './ValueEditor'

/** A value typed as text: a Number in the kit's input, a Text value's popover in its pane, and every other value in the one-line editor, which opens on the whole written value, seated as `ValueEditor` seats it. A Link value leaves alias memory to the write layer, which remembers once per landed value; a one-line Text field remembers as its edit commits, so a cancelled one remembers nothing. */
export function PropertyValueInput({
  def,
  current,
  holder,
  connections,
  seat,
  popover,
  onCommit,
  onClose,
}: {
  def: PropertyDefinition
  current: PropertyValue | null
  holder?: ConnPage
  connections?: () => ConnectionsApi | undefined
  seat?: ConnEditAction
  popover?: { open: boolean; triggerRef: RefObject<HTMLElement | null> }
  onCommit: (next: PropertyValue | null) => void
  onClose: () => void
}): React.JSX.Element {
  const host = useEditorHost({ connections: useSession(() => connections?.()) })
  const initial = editorText(current)
  const parse = (text: string): PropertyValue | null | undefined =>
    parseEditorValue(def.type, text, current, { index: connections?.()?.index, own: holder })
  const invalid = (text: string): boolean => parse(text) === undefined
  // Deduped on what the field would reopen on, since a seat may have rewritten the text it holds.
  const commit = (text: string): void => {
    const next = parse(text)
    if (next !== undefined && editorText(next) !== initial) onCommit(next)
  }
  if (def.type === 'number') {
    const close = (text: string): void => {
      commit(text)
      onClose()
    }
    const { leading, trailing } = numberAffixes(def)
    // Away from its column, the picker names even a plain number's format.
    if (popover)
      return (
        <FieldPicker
          {...popover}
          value={initial}
          leading={(def.number_family ?? 'number') === 'number' ? '#' : leading}
          trailing={trailing}
          invalid={invalid}
          onCommit={close}
          onDismiss={onClose}
        />
      )
    return (
      <EditableInput
        initial={initial}
        className={fillInput}
        caretAtEnd
        leading={leading}
        trailing={trailing}
        invalid={invalid}
        onCommit={close}
        onCancel={onClose}
      />
    )
  }
  if (popover && def.type === 'text')
    return (
      <TextPane
        {...popover}
        current={current}
        holder={holder}
        host={host}
        onCommit={onCommit}
        onDismiss={onClose}
      />
    )
  const editor = (
    <ValueEditor
      initial={initial}
      holder={holder}
      host={host}
      oneLine
      remembers={def.type === 'link' ? 'never' : 'flush'}
      seat={seat}
      invalid={invalid}
      onCommit={commit}
      onClose={onClose}
    />
  )
  // The property's link color tints an address and the text around it, as the resting cell's anchor is tinted; a page link keeps the app's connection color there too.
  const accent = def.type === 'link' ? solidColorCss(def.link_color) : undefined
  const tinted = accent ? (
    <span style={{ color: accent, '--link': accent, display: 'contents' } as CSSProperties}>
      {editor}
    </span>
  ) : (
    editor
  )
  return popover ? (
    <FieldPicker {...popover} onDismiss={onClose}>
      {tinted}
    </FieldPicker>
  ) : (
    tinted
  )
}
