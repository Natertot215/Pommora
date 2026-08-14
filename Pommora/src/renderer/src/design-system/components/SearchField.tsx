import type { InputHTMLAttributes, Ref } from 'react'
import * as s from './searchField.css'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: string
  onValueChange: (value: string) => void
  inputRef?: Ref<HTMLInputElement>
}

/** The app's filter field. Controlled, never spell-checked, and stripped of the browser's own chrome. */
export function SearchField({
  value,
  onValueChange,
  inputRef,
  className,
  ...rest
}: Props): React.JSX.Element {
  return (
    <input
      {...rest}
      ref={inputRef}
      className={className ? `${s.field} ${className}` : s.field}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      spellCheck={false}
    />
  )
}
