import { Checkbox } from '@renderer/DesignSystem/Controls/Checkbox'

/** A checkbox property's value as it stands in a cell: the shared checkbox in its read-only, filled
 *  form, so a value's box can't drift from the control it mirrors. `color` overrides the accent the
 *  checked box tints from — a set solid, else the live accent. */
export function CheckboxGlyph({
  checked,
  color,
  className,
}: {
  checked: boolean
  color?: string
  className?: string
}): React.JSX.Element {
  return <Checkbox readOnly filled state={checked} color={color} className={className} />
}
