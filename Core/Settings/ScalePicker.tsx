import { factorPickerProps, PickerControl } from '@pommora/uix/Pickers/PickerControl'
import { coerceScale, SCALE_STEPS } from './personalization'

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
      {...factorPickerProps({
        steps: SCALE_STEPS,
        value,
        coerce: (typed) => coerceScale(typed, value),
        onPick,
      })}
    />
  )
}
