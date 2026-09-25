import { steppedPickerProps, PickerControl } from '@pommora/uix/Pickers/PickerControl'
import { coerceScale, SCALE } from './personalization'

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
        steps: SCALE.steps,
        value,
        coerce: (typed) => coerceScale(typed, value),
        onPick,
      })}
    />
  )
}
