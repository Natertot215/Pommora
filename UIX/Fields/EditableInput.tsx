import { useEffect, useRef } from 'react'
import { cx } from '../Utilities/cx'
import { autoSizeWrap, autoSizeMirror, autoSizeInput } from './fields.css'

/** The `settled` guard stops Enter (which blurs) and the trailing blur from both committing; it is
 *  mounted only while editing, so each edit session gets a fresh one. */
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
  /** Off for a field that merely SITS in a pane (the option editor) rather than being the act
   *  the pane opened for — mounting must not steal the selection. */
  autoFocus?: boolean
  onCommit: (next: string) => void
  onCancel: () => void
}): React.JSX.Element {
  const settled = useRef(false)
  const mirror = useRef<HTMLSpanElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // Inside PickerMenu's rename pane the field can't focus yet (visibility:hidden until measured,
  // launched async from a native menu) — the backstop re-asserts once shown, a no-op if it took.
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
      // The eclipse fade follows the caret to whichever edge hides text; an ellipsis can't —
      // Chromium drops it while a field is focused.
      className={cx(className, !boxed && 'over-scroll-x', autoSize && autoSizeInput)}
      defaultValue={initialText ?? value}
      size={autoSize ? 1 : undefined}
      // Every consumer is a title field — proper nouns, not prose; squiggles are noise.
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
          // As the blur commits and a hosting picker closes, focus can restore to the trigger
          // button before the default action runs — reopening the picker on the same press.
          e.preventDefault()
          e.currentTarget.blur()
        } else if (e.key === 'Escape') {
          // Marked handled on the house contract — window-level closers stand down on a prevented
          // press — so cancelling a field never also takes down the surface holding it.
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
