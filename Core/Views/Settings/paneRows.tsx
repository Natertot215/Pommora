import { EyeToggle } from '@pommora/uix/Elements/EyeToggle'
import type { PickerRowLook } from '@pommora/uix/Menus'
import { side } from '@pommora/uix/Menus/menu-row.css'
import * as oo from './option-order.css'

export const SUB_LOOK: PickerRowLook = {
  className: oo.subOrderRow,
  labelClassName: oo.orderLabel,
}

export interface HideControls {
  isHidden?: (key: string) => boolean
  onToggleHidden?: (key: string) => void
}

export function rowEye(
  label: string,
  hideKey: string,
  { isHidden, onToggleHidden }: HideControls,
): React.JSX.Element | null {
  if (!onToggleHidden) return null
  return (
    <span className={side}>
      <EyeToggle
        hidden={isHidden?.(hideKey) ?? false}
        name={label}
        onToggle={() => onToggleHidden(hideKey)}
      />
    </span>
  )
}
