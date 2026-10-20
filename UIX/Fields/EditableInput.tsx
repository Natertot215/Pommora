import { useEffect, useRef } from 'react'
import { cx } from '../Utilities/cx'
import { keepFocus } from '../Interactions/shared'
import {
  affixed,
  affixHint,
  affixRun,
  autoSizeWrap,
  autoSizeMirror,
  autoSizeInput,
  invalidInput,
  valueGlyph,
} from './fields.css'

/** How an edit ended: by Enter or Escape, or by the focus leaving. */
export type EditEnd = 'key' | 'blur'

/** `settled` marks the edit over: the commit's blur or an Escape sets it, so Escape's own blur commits nothing, and focus clears it, so a field that stays mounted keeps saving. Enter commits through the blur it causes, and `how` tells the caller whether a key or the focus leaving ended the edit. */
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
  required,
  leading,
  trailing,
  hint,
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
  /** Dims text that won't commit, marked on the node so a keystroke never renders; leaving with it restores the field and cancels, as a blank name does. */
  invalid?: (text: string) => boolean
  /** A blank commit restores the field and cancels: a name, not a value. */
  required?: boolean
  /** Symbols beside the typed text, and a hint after them, belonging to the field: pressing one keeps the caret, and its click never reaches the host. */
  leading?: string
  trailing?: string
  hint?: string
  onCommit: (next: string, how: EditEnd) => void
  onCancel: (how: EditEnd) => void
}): React.JSX.Element {
  const settled = useRef(false)
  const byKey = useRef(false)
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
          byKey.current = true
          e.currentTarget.blur()
        } else if (e.key === 'Escape') {
          // Window-level closers stand down on a prevented press, so cancelling never also takes down the host surface.
          e.preventDefault()
          settled.current = true
          e.currentTarget.value = initial
          // A focused field removed from the DOM fires no blur, stranding the drawn caret.
          e.currentTarget.blur()
          onCancel('key')
        }
      }}
      onBlur={(e) => {
        if (settled.current) return
        settled.current = true
        const how: EditEnd = byKey.current ? 'key' : 'blur'
        byKey.current = false
        const next = e.currentTarget.value.trim()
        if ((required && !next) || invalid?.(next)) {
          e.currentTarget.value = initial
          return onCancel(how)
        }
        onCommit(next, how)
      }}
    />
  )
  const sized = autoSize ? (
    <span className={autoSizeWrap}>
      <span ref={mirror} className={autoSizeMirror} aria-hidden>
        {initial || ' '}
      </span>
      {field}
    </span>
  ) : (
    field
  )
  if (leading === undefined && trailing === undefined && hint === undefined) return sized
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: the symbols are the field's own, so the input inside stays the only control
    <span className={affixed} onMouseDown={keepFocus} onClick={(e) => e.stopPropagation()}>
      <span className={affixRun}>
        {leading !== undefined && <span className={valueGlyph}>{leading}</span>}
        {sized}
        {trailing !== undefined && <span className={valueGlyph}>{trailing}</span>}
        {hint !== undefined && <span className={affixHint}>{hint}</span>}
      </span>
    </span>
  )
}
