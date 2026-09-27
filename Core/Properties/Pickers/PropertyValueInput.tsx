import { EditableInput } from '@pommora/uix/Fields/EditableInput'
import { fillInput } from '@pommora/uix/Fields/fields.css'
import type { PropertyType } from '@pommora/core/Properties/properties'
import type { PropertyValue } from '@pommora/core/Properties/propertyValue'
import { editorText, parseEditorValue } from '../parseEditorValue'

export function PropertyValueInput({
  type,
  current,
  accent,
  onCommit,
  onClose,
}: {
  type: PropertyType | 'title' | undefined
  current: PropertyValue | null
  accent?: string
  onCommit: (next: PropertyValue | null) => void
  onClose: () => void
}): React.JSX.Element {
  const initial = editorText(current)
  const field = (
    <EditableInput
      initial={initial}
      className={fillInput}
      caretAtEnd
      invalid={(text) => parseEditorValue(type, text, current) === undefined}
      onCommit={(raw) => {
        onClose()
        if (raw === initial) return
        const next = parseEditorValue(type, raw, current)
        if (next !== undefined) onCommit(next)
      }}
      onCancel={onClose}
    />
  )
  return accent ? <span style={{ color: accent }}>{field}</span> : field
}
