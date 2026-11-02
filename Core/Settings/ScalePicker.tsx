import { steppedPickerProps, PickerControl } from '@pommora/uix/Menus/PickerControl'
import { SCALE } from './personalization'

export function ScalePicker({
  ariaLabel,
  value,
  onPick,
}: {
  ariaLabel: string
  value: number
  onPick: (factor: number) => void
}): React.JSX.Element {
  return (
    <PickerControl
      ariaLabel={ariaLabel}
      solid
      chevronLead
      {...steppedPickerProps({
        range: SCALE,
        value,
        onPick,
      })}
    />
  )
}
