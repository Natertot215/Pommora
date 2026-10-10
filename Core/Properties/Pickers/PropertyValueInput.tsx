import type { ConnectionsApi } from '../../MarkdownPM/Links/connectionsApi'
import type { RefObject } from 'react'
import { EditableInput } from '@pommora/uix/Fields/EditableInput'
import { fillInput } from '@pommora/uix/Fields/fields.css'
import { TextPicker } from '@pommora/uix/Pickers/TextPicker'
import { solidColorCss } from '@pommora/uix/Theme/ramp'
import type { ConnPage } from '../../Connections/pageIndex'
import type { PropertyDefinition } from '../properties'
import type { PropertyValue } from '../propertyValue'
import { linkValueFromRename, readLinkText } from '../../Connections/linkValue'
import { editorText, parseEditorValue } from '../parseEditorValue'
import { NumberValuePicker } from './NumberValuePicker'
import { TextPane } from './TextPane'

export function PropertyValueInput({
  def,
  current,
  holder,
  connections,
  alias,
  popover,
  onCommit,
  onClose,
}: {
  def: PropertyDefinition
  current: PropertyValue | null
  holder?: ConnPage
  connections?: () => ConnectionsApi | undefined
  alias?: boolean
  popover?: { open: boolean; triggerRef: RefObject<HTMLElement | null> }
  onCommit: (next: PropertyValue | null) => void
  onClose: () => void
}): React.JSX.Element {
  if (popover && def.type === 'number')
    return (
      <NumberValuePicker
        {...popover}
        def={def}
        current={current}
        onCommit={onCommit}
        onDismiss={onClose}
      />
    )
  if (popover && def.type === 'text')
    return (
      <TextPane
        {...popover}
        current={current}
        holder={holder}
        connections={connections}
        onCommit={onCommit}
        onDismiss={onClose}
      />
    )
  const raw = current?.kind === 'link' ? current.value : ''
  const initial = alias ? (readLinkText(raw)?.alias ?? '') : editorText(current)
  const parse = (text: string): PropertyValue | null | undefined =>
    alias ? linkValueFromRename(text, raw) : parseEditorValue(def.type, text, current)
  const invalid = (text: string): boolean => parse(text) === undefined
  const commit = (text: string): void => {
    onClose()
    const next = text === initial ? undefined : parse(text)
    if (next !== undefined) onCommit(next)
  }
  const accent = def.type === 'link' ? solidColorCss(def.link_color) : undefined
  if (popover)
    return (
      <TextPicker
        {...popover}
        value={initial}
        accent={accent}
        invalid={invalid}
        onCommit={commit}
        onDismiss={onClose}
      />
    )
  const field = (
    <EditableInput
      initial={initial}
      className={fillInput}
      caretAtEnd
      invalid={invalid}
      onCommit={commit}
      onCancel={onClose}
    />
  )
  return accent ? <span style={{ color: accent, display: 'contents' }}>{field}</span> : field
}
