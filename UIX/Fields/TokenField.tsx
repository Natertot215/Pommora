import type { Ref } from 'react'
import { cx } from '../Utilities/cx'
import { FieldRun, type RunEntry } from './FieldRun'
import { InputField } from './InputField'
import * as s from './fields.css'

/** Values standing in a field beside a bare caret: Enter offers the draft, and Backspace on an empty caret removes the last value. The host owns the draft and decides what Enter makes. */
export function TokenField({
  entries,
  draft,
  onDraftChange,
  onEnter,
  onFocus,
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
  placeholder?: string
  ariaLabel?: string
  chrome?: 'boxed' | 'bordered'
  className?: string
  ref?: Ref<HTMLDivElement>
}): React.JSX.Element {
  return (
    <InputField ref={ref} chrome={chrome} className={cx(s.editable, className)}>
      {entries.length > 0 && <FieldRun entries={entries} />}
      <input
        className={cx(s.base, s.tokenCaret)}
        value={draft}
        placeholder={entries.length > 0 ? undefined : placeholder}
        aria-label={ariaLabel}
        spellCheck={false}
        onFocus={onFocus}
        onChange={(e) => onDraftChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (draft.trim()) onEnter(draft.trim())
          } else if (e.key === 'Backspace' && draft === '') entries.at(-1)?.onRemove?.()
        }}
      />
    </InputField>
  )
}
