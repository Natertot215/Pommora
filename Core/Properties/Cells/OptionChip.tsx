import type { ColumnLook } from '../columnStyles'
import type { OptionAppearance, PropertyDefinition, PropertyType } from '../properties'
import { chipOf } from '../typeDisplay'
import { Label } from '@pommora/uix/Labels/Label'
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
  type: PropertyType | undefined,
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
  type: PropertyType | undefined
  look?: ColumnLook
  option: OptionChipData | undefined
  def?: Pick<PropertyDefinition, 'status_groups'>
  onRemove?: () => void
  className?: string
}): React.JSX.Element {
  const label = option?.label ?? ''
  return (
    <Label
      shape={chipOf(type).shape}
      color={colorNameFor(option?.color)}
      {...(option?.appearance === 'clear' ? { fill: 'none' as const } : {})}
      className={className}
      {...(look === 'compact'
        ? { icon: <Icon name={optionGlyph(type, option, def)} size="body" /> }
        : { text: label })}
      {...(onRemove ? { onRemove } : {})}
    />
  )
}
