import { chipContext, chipColor, chipRemovable } from '@renderer/design-system/tokens'
import type { ChipColorName } from '@renderer/design-system/tokens/chip.css'
import { cx } from '@renderer/design-system/cx'
import { Icon } from '@renderer/design-system/symbols'
import { ChipLabel, ChipRemoveButton } from './Chip'

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
      {icon ? <Icon name={icon} size="control" /> : null}
      <ChipLabel label={title} removable={!!onRemove} />
    </span>
  )
}
