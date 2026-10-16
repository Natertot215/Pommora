import type { ReactNode, RefObject } from 'react'
import { EditableInput } from '../Fields/EditableInput'
import { PickerMenu } from './PickerMenu'
import * as s from './text-picker.css'

/** What the one chrome holds: the kit's input over a `value`, with its affixes, or a caller's own editor as `children`. */
type Typed = {
  value: string
  onCommit: (next: string) => void
  invalid?: (text: string) => boolean
  leading?: ReactNode
  trailing?: ReactNode
  children?: undefined
}
type Hosted = {
  children: ReactNode
  value?: undefined
  onCommit?: undefined
  invalid?: undefined
  leading?: undefined
  trailing?: undefined
}

/** A typed value's popover: one field wrapper owning the fill, stroke, focus ring, type, and width, around either the kit's input or an editor the caller mounts. */
export function TextPicker({
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
          <>
            {inner.leading !== undefined && <span className={s.leading}>{inner.leading}</span>}
            <EditableInput
              initial={inner.value}
              className={s.suffixInput}
              caretAtEnd
              invalid={inner.invalid}
              onCommit={inner.onCommit}
              onCancel={onDismiss}
            />
            {inner.trailing !== undefined && <span className={s.trailing}>{inner.trailing}</span>}
          </>
        )}
      </div>
    </PickerMenu>
  )
}
