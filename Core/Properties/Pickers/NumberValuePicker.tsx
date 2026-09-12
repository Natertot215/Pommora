import type { RefObject } from 'react'
import { TextPicker } from '@pommora/uix/Pickers/TextPicker'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import type { PropertyValue } from '@pommora/core/Properties/propertyValue'
import { numberFormatGlyph } from '../Cells/PropertyTypes'
import { parseEditorValue } from '../parseEditorValue'

const denominatorOf = (def: PropertyDefinition): string | undefined =>
  def.number_fraction && def.number_denominator ? `/ ${def.number_denominator}` : undefined

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
  return (
    <TextPicker
      open={open}
      triggerRef={triggerRef}
      value={current?.kind === 'number' ? String(current.value) : ''}
      leading={numberFormatGlyph(def)}
      trailing={denominatorOf(def)}
      onCommit={(raw) => {
        const next = parseEditorValue('number', raw)
        if (next !== undefined) onCommit(next)
        onDismiss()
      }}
      onDismiss={onDismiss}
    />
  )
}
