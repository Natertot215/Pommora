import type { InputHTMLAttributes, Ref } from 'react'
import { cx } from '../cx'
import * as s from './fields.css'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: string
  onValueChange: (value: string) => void
  inputRef?: Ref<HTMLInputElement>
}

/** The one search placeholder — every filter field reads this copy unless a caller overrides it. */
export const SEARCH_PLACEHOLDER = 'Search…'

/** The app's filter field. Controlled, never spell-checked, and stripped of the browser's own chrome. */
export function SearchField({
  value,
  onValueChange,
  inputRef,
  className,
  placeholder = SEARCH_PLACEHOLDER,
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
      spellCheck={false}
    />
  )
}
