import type { ReactNode, RefObject } from 'react'
import { EditableInput } from '../Fields/EditableInput'
import { PickerMenu } from './PickerMenu'
import * as s from './field-picker.css'

/** What the one chrome holds: the kit's input over a `value`, with its affixes, or a caller's own editor as `children`. */
type Typed = {
  value: string
  onCommit: (next: string) => void
  invalid?: (text: string) => boolean
  leading?: string
  hint?: string
  children?: undefined
}
type Hosted = {
  children: ReactNode
  value?: undefined
  onCommit?: undefined
  invalid?: undefined
  leading?: undefined
  hint?: undefined
}

/** A typed value's popover: one field wrapper owning the fill, stroke, focus ring, type, and width, around either the kit's input or an editor the caller mounts. */
export function FieldPicker({
  open,
  onDismiss,
  triggerRef,
  ...inner
}: {
  open: boolean
  onDismiss: () => void
  triggerRef: RefObject<HTMLElement | null>
} & (Typed | Hosted)): React.JSX.Element | null {
  return (
    <PickerMenu
      open={open}
      onDismiss={onDismiss}
      triggerRef={triggerRef}
      direction="down"
      origin="center"
      contentClassName={s.content}
    >
      <div className={s.field}>
        {inner.value === undefined ? (
          inner.children
        ) : (
          <EditableInput
            initial={inner.value}
            className={s.suffixInput}
            caretAtEnd
            leading={inner.leading}
            hint={inner.hint}
            invalid={inner.invalid}
            onCommit={inner.onCommit}
            onCancel={onDismiss}
          />
        )}
      </div>
    </PickerMenu>
  )
}
