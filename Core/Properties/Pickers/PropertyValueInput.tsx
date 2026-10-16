import type { ConnectionsApi } from '../../MarkdownPM/Links/connectionsApi'
import type { CSSProperties, RefObject } from 'react'
import { EditableInput } from '@pommora/uix/Fields/EditableInput'
import { editable, field, fillInput } from '@pommora/uix/Fields/fields.css'
import { PickerMenu } from '@pommora/uix/Pickers/PickerMenu'
import { TextPicker } from '@pommora/uix/Pickers/TextPicker'
import { solidColorCss } from '@pommora/uix/Theme/ramp'
import { cx } from '@pommora/uix/Utilities/cx'
import type { ConnPage } from '../../Connections/pageIndex'
import type { PropertyDefinition } from '../properties'
import type { PropertyValue } from '../propertyValue'
import { editorText, parseEditorValue } from '../parseEditorValue'
import { fractionDenominator, numberFormatGlyph } from '../formatValue'
import { useEditorHost } from '../../Pages/editorHost'
import { useSession } from '../../Session/store'
import { TextPane } from './TextPane'
import { ValueEditor } from './ValueEditor'

/** A value typed as text: a Number in the kit's input, a Text value's popover in its pane, and every other value in the one-line editor, which opens on the whole written value and, for the Link value's Rename, seats the caret in its alias slot. A Link value leaves alias memory to the write layer, which remembers once per landed value. */
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
  const host = useEditorHost({ connections: useSession(() => connections?.()) })
  const initial = editorText(current)
  const parse = (text: string): PropertyValue | null | undefined =>
    parseEditorValue(def.type, text, current, { index: connections?.()?.index, own: holder })
  const invalid = (text: string): boolean => parse(text) === undefined
  const commit = (text: string): void => {
    const next = text.trim() === initial ? undefined : parse(text)
    if (next !== undefined) onCommit(next)
  }
  if (def.type === 'number') {
    const close = (text: string): void => {
      onClose()
      commit(text)
    }
    if (popover) {
      const denominator = fractionDenominator(def)
      return (
        <TextPicker
          {...popover}
          value={initial}
          leading={numberFormatGlyph(def)}
          trailing={denominator === undefined ? undefined : `/ ${denominator}`}
          invalid={invalid}
          onCommit={close}
          onDismiss={onClose}
        />
      )
    }
    return (
      <EditableInput
        initial={initial}
        className={fillInput}
        caretAtEnd
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
      remembers={def.type !== 'link'}
      seat={alias ? 'alias' : undefined}
      invalid={invalid}
      onCommit={commit}
      onClose={onClose}
    />
  )
  // The property's link color reaches the drawn link as the cell's does, and the text around it.
  const accent = def.type === 'link' ? solidColorCss(def.link_color) : undefined
  const tinted = accent ? (
    <span
      style={
        {
          color: accent,
          '--connection': accent,
          '--link': accent,
          display: 'contents',
        } as CSSProperties
      }
    >
      {editor}
    </span>
  ) : (
    editor
  )
  return popover ? (
    <PickerMenu
      open={popover.open}
      triggerRef={popover.triggerRef}
      onDismiss={onClose}
      direction="down"
      origin="center"
      contentClassName="value-popover"
    >
      <div className={cx(field, editable)}>{tinted}</div>
    </PickerMenu>
  ) : (
    tinted
  )
}
