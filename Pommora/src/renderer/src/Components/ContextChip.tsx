import { chipContext, chipColor } from '@renderer/design-system/tokens'
import type { ChipColorName } from '@renderer/design-system/tokens/chip.css'
import { cx } from '@renderer/design-system/cx'
import { hoverRemoveHost } from '@renderer/design-system/interactions/HoverRemove'
import { Icon } from '@renderer/design-system/symbols'
import { ChipLabel } from './Chip'

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
    <span className={cx(chipContext, chipColor[color], onRemove && hoverRemoveHost)}>
      {icon ? <Icon name={icon} size="control" /> : null}
      <ChipLabel label={title} onRemove={onRemove} />
    </span>
  )
}
