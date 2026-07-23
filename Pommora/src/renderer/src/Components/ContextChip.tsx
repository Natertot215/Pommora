import { chipContext, chipColor, chipRemovable } from '@renderer/design-system/tokens'
import type { ChipColorName } from '@renderer/design-system/tokens/chip.css'
import { cx } from '@renderer/design-system/cx'
import { Icon } from '@renderer/design-system/symbols'
import { ChipLabel, ChipRemoveButton } from './Chip'

/** A Context reference chip (tier cells). The whole look lives in the chipContext
 *  shape (neutral quaternary fill, 8px radius, --chip-fill following the fill) — this component
 *  wires the leading icon + label + remove affordance. The icon reads in the chip's text color
 *  (currentColor); size is the one knob here. */
export function ContextChip({
  color,
  title,
  icon,
  onRemove,
}: {
  color: ChipColorName
  title: string
  icon?: string
  onRemove?: () => void
}): React.JSX.Element {
  return (
    <span className={cx(chipContext, chipColor[color], onRemove && chipRemovable)}>
      {onRemove ? <ChipRemoveButton onRemove={onRemove} /> : null}
      {icon ? <Icon name={icon} size={12} /> : null}
      <ChipLabel label={title} removable={!!onRemove} />
    </span>
  )
}
