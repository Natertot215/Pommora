import type { ColumnLook } from '../columnStyles'
import { Checkbox } from '@pommora/uix/Controls/Checkbox'
import { DualSwitch } from '@pommora/uix/Controls/DualSwitch'

/** A checkbox property's value as display, in the property's own color and the view's look. */
export function CheckboxGlyph({
  checked,
  color,
  look,
}: {
  checked: boolean
  color?: string
  look?: ColumnLook
}): React.JSX.Element {
  return look === 'switch' ? (
    <span className="cell-switch">
      <DualSwitch readOnly checked={checked} color={color} />
    </span>
  ) : (
    <Checkbox readOnly filled state={checked} color={color} className="cell-checkbox" />
  )
}
