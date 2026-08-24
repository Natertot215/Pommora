import { Icon } from '@renderer/DesignSystem/Symbols'
import { MenuItem } from '@renderer/DesignSystem/Components/Menu'
import { flushTrailing } from '@renderer/DesignSystem/Components/Menu/menu.css'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { PickerControl, type PickerChoice } from './PickerControl'
import * as gp from './groupingPane.css'

/** A settings-pane row that states one value and pops a picker to change it — the shape every
 *  Grouping and Sorting row takes. A `sub` row is the indented continuation of the row above it,
 *  so it wears the gap and the dimmer label rather than reading as another top-level choice. */
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
      className={cx(flushTrailing, gp.pickerTone, tier === 'sub' && gp.subRow)}
      leading={icon ? <Icon name={icon} size="body" /> : undefined}
      trailing={<PickerControl ariaLabel={label} value={value} options={options} onPick={onPick} />}
    >
      {tier === 'sub' ? <span className={gp.subLabel}>{label}</span> : label}
    </MenuItem>
  )
}
