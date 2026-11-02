import type { ColumnLook } from '../columnStyles'
import type { ColumnType, OptionAppearance, PropertyDefinition } from '../properties'
import { chipOf } from '../typeDisplay'
import { Label } from '@pommora/uix/Labels/Label'
import { NeutralChip } from '@pommora/uix/Labels/recipes'
import { Icon, type IconName, iconNameOr } from '@pommora/uix/Symbols'
import { colorNameFor } from '@pommora/uix/Theme/ramp'

export interface OptionChipData {
  id?: string
  label: string
  color?: string
  icon?: string
  appearance?: OptionAppearance
}

const STATUS_GROUP_GLYPH: Record<string, IconName> = {
  upcoming: 'circle-dashed',
  in_progress: 'minus',
  done: 'check',
}

export function optionGlyph(
  type: ColumnType,
  option: OptionChipData | undefined,
  def?: Pick<PropertyDefinition, 'status_groups'>,
): string {
  const fallback = chipOf(type).glyph
  if (type !== 'status') return iconNameOr(option?.icon, fallback)
  const group = def?.status_groups?.find((g) => g.options.some((o) => o.id === option?.id))
  return iconNameOr(option?.icon, (group && STATUS_GROUP_GLYPH[group.id]) ?? fallback)
}

export function OptionChip({
  type,
  look,
  option,
  def,
  onRemove,
  className,
}: {
  type: ColumnType
  look?: ColumnLook
  option: OptionChipData | undefined
  def?: Pick<PropertyDefinition, 'status_groups'>
  onRemove?: () => void
  className?: string
}): React.JSX.Element {
  const label = option?.label ?? ''
  const color = colorNameFor(option?.color)
  const removal = onRemove ? { onRemove } : {}
  if (type === 'context')
    return (
      <NeutralChip
        color={color}
        title={label}
        icon={option?.icon}
        className={className}
        {...removal}
      />
    )
  return (
    <Label
      shape={chipOf(type).shape}
      color={color}
      {...(option?.appearance === 'clear' ? { fill: 'none' as const } : {})}
      className={className}
      {...(look === 'compact'
        ? { icon: <Icon name={optionGlyph(type, option, def)} size="body" /> }
        : { text: label })}
      {...removal}
    />
  )
}
