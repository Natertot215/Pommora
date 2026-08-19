import { Icon } from '@renderer/design-system/symbols'
import { MenuItem } from '../../design-system/components/menu'
import { flushTrailing } from '../../design-system/components/menu/menu.css'
import { cx } from '../../design-system/cx'
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
      leading={icon ? <Icon name={icon} size={14} /> : undefined}
      trailing={<PickerControl ariaLabel={label} value={value} options={options} onPick={onPick} />}
    >
      {tier === 'sub' ? <span className={gp.subLabel}>{label}</span> : label}
    </MenuItem>
  )
}
