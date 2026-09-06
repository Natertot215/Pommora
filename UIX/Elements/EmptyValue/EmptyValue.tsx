import { cx } from '../../Utilities/cx'
import { emptyValue } from './empty-value.css'

export function EmptyValue({ className }: { className?: string }): React.JSX.Element {
  return <span className={cx(emptyValue, className)}>—</span>
}
