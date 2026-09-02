import { cx } from '../../Util/cx'
import { emptyValue } from './empty-value.css'

/** Type size comes from the host; the tone is the element's. */
export function EmptyValue({ className }: { className?: string }): React.JSX.Element {
  return <span className={cx(emptyValue, className)}>—</span>
}
