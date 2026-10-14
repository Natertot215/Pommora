import { type KeyboardEvent, type Ref, useRef } from 'react'
import { cx } from '../Utilities/cx'
import { FieldRun, type RunEntry } from './FieldRun'
import { InputField } from './InputField'
import * as s from './fields.css'

/** Values standing in a field beside a bare caret: Enter offers the draft, and Backspace on an empty caret removes the last value. The host owns the draft and decides what Enter makes; a key its `onKeyDown` prevents is left to it. */
export function TokenField({
  entries,
  draft,
  onDraftChange,
  onEnter,
  onFocus,
  onBlur,
  onPress,
  onKeyDown,
  placeholder,
  ariaLabel,
  chrome,
  className,
  ref,
}: {
  entries: RunEntry[]
  draft: string
  onDraftChange: (draft: string) => void
  onEnter: (draft: string) => void
  onFocus?: () => void
  onBlur?: () => void
  /** A click anywhere on the field, which an already-focused caret reports no focus for. */
  onPress?: () => void
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
  placeholder?: string
  ariaLabel?: string
  chrome?: 'boxed' | 'bordered'
  className?: string
  ref?: Ref<HTMLDivElement>
}): React.JSX.Element {
  const caret = useRef<HTMLInputElement>(null)
  return (
    <InputField
      ref={ref}
      chrome={chrome}
      className={cx(s.editable, className)}
      onMouseDown={(e) => {
        const target = e.target as Element
        if (target === caret.current) return
        e.preventDefault()
        if (!target.closest('button')) caret.current?.focus()
      }}
      onClick={onPress}
    >
      {entries.length > 0 && <FieldRun entries={entries} />}
      <input
        ref={caret}
        className={cx(s.base, s.tokenCaret)}
        value={draft}
        placeholder={entries.length > 0 ? undefined : placeholder}
        aria-label={ariaLabel}
        spellCheck={false}
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={(e) => onDraftChange(e.target.value)}
        onKeyDown={(e) => {
          onKeyDown?.(e)
          if (e.defaultPrevented) return
          if (e.key === 'Enter') {
            e.preventDefault()
            if (draft.trim()) onEnter(draft.trim())
          } else if (e.key === 'Backspace' && draft === '') entries.at(-1)?.onRemove?.()
        }}
      />
    </InputField>
  )
}
