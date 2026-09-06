import { Checkbox } from '@pommora/uix/Controls/Checkbox'

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
