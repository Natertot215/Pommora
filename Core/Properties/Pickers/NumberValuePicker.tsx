import type { RefObject } from 'react'
import { TextPicker } from '@pommora/uix/Pickers/TextPicker'
import type { PropertyDefinition } from '../properties'
import type { PropertyValue } from '../propertyValue'
import { editorText, parseEditorValue } from '../parseEditorValue'
import { fractionDenominator, numberFormatGlyph } from '../formatValue'

export function NumberValuePicker({
  def,
  current,
  open,
  triggerRef,
  onCommit,
  onDismiss,
}: {
  def: PropertyDefinition
  current: PropertyValue | null
  open: boolean
  triggerRef: RefObject<HTMLElement | null>
  onCommit: (value: PropertyValue | null) => void
  onDismiss: () => void
}): React.JSX.Element {
  const denominator = fractionDenominator(def)
  return (
    <TextPicker
      open={open}
      triggerRef={triggerRef}
      value={editorText(current)}
      leading={numberFormatGlyph(def)}
      trailing={denominator === undefined ? undefined : `/ ${denominator}`}
      onCommit={(raw) => {
        const next = parseEditorValue('number', raw)
        if (next !== undefined) onCommit(next)
        onDismiss()
      }}
      onDismiss={onDismiss}
    />
  )
}
