import type { CSSProperties, RefObject } from 'react'
import { EditableInput } from '@renderer/DesignSystem/Fields'
import { PickerMenu } from '../picker-base'
import * as s from './text-picker.css'

/** The field grows with typing between a 100px floor and a 200px cap, then scrolls. Enter or
 *  blur commit the trimmed text; Escape cancels. `accent` scopes the pane's `--accent` so the
 *  focus stroke wears a caller's color; omitted, it inherits the app accent. */
export function TextPicker({
  open,
  onDismiss,
  triggerRef,
  value,
  onCommit,
  accent,
  maxLength,
  leading,
  trailing,
}: {
  open: boolean
  onDismiss: () => void
  triggerRef: RefObject<HTMLElement | null>
  value: string
  onCommit: (next: string) => void
  accent?: string
  maxLength?: number
  leading?: React.ReactNode
  trailing?: React.ReactNode
}): React.JSX.Element | null {
  const hasAffix = leading !== undefined || trailing !== undefined
  const field = (
    <EditableInput
      value={value}
      className={hasAffix ? s.suffixInput : s.input}
      // The bare variant wears the shared field chrome — fill and ring — so it truncates rather
      // than letting the eclipse dissolve its own box. The affixed variant carries no chrome.
      boxed={!hasAffix}
      maxLength={maxLength}
      caretAtEnd
      onCommit={onCommit}
      onCancel={onDismiss}
    />
  )
  return (
    <PickerMenu
      open={open}
      onDismiss={onDismiss}
      triggerRef={triggerRef}
      direction="down"
      origin="center"
      contentClassName={s.content}
      style={accent ? ({ '--accent': accent } as CSSProperties) : undefined}
    >
      {hasAffix ? (
        <div className={s.suffixField}>
          {leading !== undefined && <span className={s.leading}>{leading}</span>}
          {field}
          {trailing !== undefined && <span className={s.trailing}>{trailing}</span>}
        </div>
      ) : (
        field
      )}
    </PickerMenu>
  )
}
