import { useEffect, useRef } from 'react'
import { cx } from '../Utilities/cx'
import { autoSizeWrap, autoSizeMirror, autoSizeInput, invalidInput } from './fields.css'

/** `settled` marks the edit over: the commit's blur or an Escape sets it, so Escape's own blur commits nothing, and focus clears it, so a field that stays mounted keeps saving. Enter commits through the blur it causes. */
export function EditableInput({
  initial,
  className,
  type,
  inputMode,
  maxLength,
  placeholder,
  autoSize,
  caretAtEnd,
  boxed,
  ariaLabel,
  autoFocus = true,
  invalid,
  onCommit,
  onCancel,
}: {
  initial: string
  className: string
  type?: 'text' | 'password'
  inputMode?: 'decimal' | 'numeric'
  maxLength?: number
  placeholder?: string
  autoSize?: boolean
  caretAtEnd?: boolean
  boxed?: boolean
  ariaLabel?: string
  /** Off for a field that merely SITS in a pane: mounting must not steal the selection. */
  autoFocus?: boolean
  /** Dims text that won't commit, marked on the node so a keystroke never renders. */
  invalid?: (text: string) => boolean
  onCommit: (next: string) => void
  onCancel: () => void
}): React.JSX.Element {
  const settled = useRef(false)
  const mirror = useRef<HTMLSpanElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])
  const field = (
    <input
      ref={inputRef}
      // The eclipse fade follows the caret; Chromium drops an ellipsis while a field is focused.
      className={cx(
        className,
        !boxed && 'scroll-fade-x',
        autoSize && autoSizeInput,
        invalid && invalidInput,
      )}
      type={type}
      inputMode={inputMode}
      defaultValue={initial}
      placeholder={placeholder}
      size={autoSize ? 1 : undefined}
      spellCheck={false}
      aria-label={ariaLabel}
      aria-invalid={invalid?.(initial)}
      maxLength={maxLength}
      onFocus={(e) => {
        settled.current = false
        if (!caretAtEnd) return e.currentTarget.select()
        const len = e.currentTarget.value.length
        e.currentTarget.setSelectionRange(len, len)
      }}
      onClick={(e) => e.stopPropagation()}
      onInput={(e) => {
        const text = e.currentTarget.value
        if (mirror.current) mirror.current.textContent = text || ' '
        if (invalid) e.currentTarget.setAttribute('aria-invalid', String(invalid(text)))
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          // Focus can restore to the trigger before the default action runs, reopening the picker on the same press.
          e.preventDefault()
          e.currentTarget.blur()
        } else if (e.key === 'Escape') {
          // Window-level closers stand down on a prevented press, so cancelling never also takes down the host surface.
          e.preventDefault()
          settled.current = true
          e.currentTarget.value = initial
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
        {initial || ' '}
      </span>
      {field}
    </span>
  )
}
