import { useEffect, useRef } from 'react'
import { cx } from '../Utilities/cx'
import { autoSizeWrap, autoSizeMirror, autoSizeInput } from './fields.css'

/** `settled` stops Enter (which blurs) and the trailing blur from both committing. */
export function EditableInput({
  value,
  initialText,
  className,
  maxLength,
  autoSize,
  caretAtEnd,
  boxed,
  ariaLabel,
  autoFocus = true,
  onCommit,
  onCancel,
}: {
  value: string
  initialText?: string
  className: string
  maxLength?: number
  autoSize?: boolean
  caretAtEnd?: boolean
  boxed?: boolean
  ariaLabel?: string
  /** Off for a field that merely SITS in a pane: mounting must not steal the selection. */
  autoFocus?: boolean
  onCommit: (next: string) => void
  onCancel: () => void
}): React.JSX.Element {
  const settled = useRef(false)
  const mirror = useRef<HTMLSpanElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // Inside PickerMenu the field can't focus yet (visibility:hidden until measured).
  useEffect(() => {
    if (!autoFocus) return
    const el = inputRef.current
    if (!el) return
    el.focus()
    const t = setTimeout(() => el.focus(), 60)
    return () => clearTimeout(t)
  }, [autoFocus])
  const field = (
    <input
      ref={inputRef}
      // The eclipse fade follows the caret; Chromium drops an ellipsis while a field is focused.
      className={cx(className, !boxed && 'over-scroll-x', autoSize && autoSizeInput)}
      defaultValue={initialText ?? value}
      size={autoSize ? 1 : undefined}
      spellCheck={false}
      aria-label={ariaLabel}
      maxLength={maxLength}
      onFocus={(e) => {
        if (!caretAtEnd) return e.currentTarget.select()
        const len = e.currentTarget.value.length
        e.currentTarget.setSelectionRange(len, len)
      }}
      onClick={(e) => e.stopPropagation()}
      onInput={
        autoSize
          ? (e) => {
              if (mirror.current) mirror.current.textContent = e.currentTarget.value || ' '
            }
          : undefined
      }
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          // Focus can restore to the trigger before the default action runs, reopening the picker on the same press.
          e.preventDefault()
          e.currentTarget.blur()
        } else if (e.key === 'Escape') {
          // Window-level closers stand down on a prevented press, so cancelling never also takes down the host surface.
          e.preventDefault()
          settled.current = true
          // A focused field removed from the DOM fires no blur, stranding the drawn caret.
          e.currentTarget.blur()
          onCancel()
        }
      }}
      onBlur={(e) => {
        if (settled.current) return
        settled.current = true
        onCommit(e.currentTarget.value.trim())
      }}
    />
  )
  if (!autoSize) return field
  return (
    <span className={autoSizeWrap}>
      <span ref={mirror} className={autoSizeMirror} aria-hidden>
        {(initialText ?? value) || ' '}
      </span>
      {field}
    </span>
  )
}
