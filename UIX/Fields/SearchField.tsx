import type { InputHTMLAttributes, Ref } from 'react'
import { cx } from '../Utilities/cx'
import * as s from './fields.css'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: string
  onValueChange: (value: string) => void
  inputRef?: Ref<HTMLInputElement>
}

/** The one search placeholder — every filter field reads it unless a caller overrides it. */
export const SEARCH_PLACEHOLDER = 'Search…'

export function SearchField({
  value,
  onValueChange,
  inputRef,
  className,
  placeholder = SEARCH_PLACEHOLDER,
  onKeyDown,
  ...rest
}: Props): React.JSX.Element {
  return (
    <input
      {...rest}
      placeholder={placeholder}
      ref={inputRef}
      className={cx(s.search, className)}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      onKeyDown={(e) => {
        onKeyDown?.(e)
        if (e.key !== 'Escape' || e.defaultPrevented || !value) return
        e.preventDefault()
        e.currentTarget.blur()
      }}
      spellCheck={false}
    />
  )
}
