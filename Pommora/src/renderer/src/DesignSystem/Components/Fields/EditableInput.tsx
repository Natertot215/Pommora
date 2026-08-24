import { useEffect, useRef } from 'react'
import { cx } from '../../Util/cx'
import { autoSizeWrap, autoSizeMirror, autoSizeInput } from './fields.css'

/**
 * The `settled` guard stops Enter (which blurs) and the trailing blur from both committing;
 * it's mounted only while editing, so each edit session gets a fresh guard.
 *
 * `autoSize`'s hidden mirror span inherits font + padding from the caller's surface so it
 * measures in the same metrics as the real input.
 */
export function EditableInput({
  value,
  initialText,
  className,
  maxLength,
  autoSize,
  caretAtEnd,
  boxed,
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
  onCommit: (next: string) => void
  onCancel: () => void
}): React.JSX.Element {
  const settled = useRef(false)
  const mirror = useRef<HTMLSpanElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // Focus so an active caret blinks the moment the field appears. Mounted already-visible (the sidebar /
  // chip rename) it takes focus at once; mounted inside PickerMenu's rename pane it can't yet — the pane
  // is visibility:hidden until measured, and it's launched from a native menu whose focus-return is
  // async — so a short backstop re-asserts once it's shown. Re-focusing a focused field is a no-op.
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.focus()
    const t = setTimeout(() => el.focus(), 60)
    return () => clearTimeout(t)
  }, [])
  const field = (
    <input
      ref={inputRef}
      // The input is its own inline scroller, so the eclipse fade follows the caret to whichever
      // edge is hiding text — an ellipsis can't; Chromium drops it while a field is focused.
      className={cx(className, !boxed && 'over-scroll-x', autoSize && autoSizeInput)}
      defaultValue={initialText ?? value}
      size={autoSize ? 1 : undefined}
      // Every consumer is a title field — proper nouns, not prose; squiggles are noise.
      spellCheck={false}
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
          // Also cancels the keydown's default action: as the blur commits and a hosting picker
          // closes, focus can restore to the trigger button before the action runs — which would
          // activate that button and reopen the picker on the same press.
          e.preventDefault()
          e.currentTarget.blur()
        } else if (e.key === 'Escape') {
          // Escape abandons THIS edit and nothing above it. Marked handled on the house contract —
          // window-level closers stand down on a prevented press — so cancelling a field never also
          // takes down the surface holding it.
          e.preventDefault()
          settled.current = true
          // Hand focus back before the host tears the field down: a focused field removed from the
          // DOM fires no blur, which would strand the drawn caret blinking where it stood.
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
