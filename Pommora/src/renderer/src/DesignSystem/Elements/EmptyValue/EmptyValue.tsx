import { cx } from '../../Util/cx'
import { emptyValue } from './emptyValue.css'

/** The one "nothing here yet" mark a value slot shows — a property row, a card value, a date
 *  field. Type size comes from the host; the tone is the element's. */
export function EmptyValue({ className }: { className?: string }): React.JSX.Element {
  return <span className={cx(emptyValue, className)}>—</span>
}
