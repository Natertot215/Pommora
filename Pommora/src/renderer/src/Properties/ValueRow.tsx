import { Icon } from '@renderer/DesignSystem/Symbols'
import { MenuItem } from '@renderer/DesignSystem/Menus'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { PickerControl, type PickerChoice } from '@renderer/DesignSystem/Elements/PickerControl'
import * as gp from '../Frames/groupFrame.css'

export function ValueRow<T extends string>({
  tier = 'primary',
  icon,
  label,
  value,
  options,
  onPick,
}: {
  tier?: 'primary' | 'sub'
  icon?: PickerChoice<string>['icon']
  label: string
  value: T
  options: PickerChoice<T>[]
  onPick: (v: T) => void
}): React.JSX.Element {
  return (
    <MenuItem
      className={cx(gp.pickerTone, tier === 'sub' && gp.subRow)}
      leading={icon ? <Icon name={icon} size="body" /> : undefined}
      trailing={<PickerControl ariaLabel={label} value={value} options={options} onPick={onPick} />}
    >
      {tier === 'sub' ? <span className={gp.subLabel}>{label}</span> : label}
    </MenuItem>
  )
}
