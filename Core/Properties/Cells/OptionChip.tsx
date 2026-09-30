import type { ColumnLook } from '../columnStyles'
import type { OptionAppearance, PropertyDefinition } from '../properties'
import { Label } from '@pommora/uix/Labels/Label'
import { optionShapeFor } from '@pommora/uix/Labels/recipes'
import { Icon, type IconName, iconNameOr } from '@pommora/uix/Symbols'
import { colorNameFor } from '@pommora/uix/Theme/ramp'

export interface OptionChipData {
  value: string
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
  type: string,
  option: OptionChipData | undefined,
  def?: Pick<PropertyDefinition, 'status_groups'>,
): string {
  if (type !== 'status') return iconNameOr(option?.icon, type === 'multiSelect' ? 'tags' : 'tag')
  const value = option?.value ?? ''
  const group = def?.status_groups?.find((g) => g.options.some((o) => o.value === value))
  return iconNameOr(option?.icon, (group && STATUS_GROUP_GLYPH[group.id]) ?? 'circle-dashed')
}

export function OptionChip({
  type,
  look,
  option,
  def,
  onRemove,
  className,
}: {
  type: string
  look?: ColumnLook
  option: OptionChipData | undefined
  def?: Pick<PropertyDefinition, 'status_groups'>
  onRemove?: () => void
  className?: string
}): React.JSX.Element {
  const value = option?.value ?? ''
  return (
    <Label
      shape={optionShapeFor(type)}
      color={colorNameFor(option?.color)}
      {...(option?.appearance === 'clear' ? { fill: 'none' as const } : {})}
      className={className}
      {...(look === 'compact'
        ? { icon: <Icon name={optionGlyph(type, option, def)} size="body" /> }
        : { text: value })}
      {...(onRemove ? { onRemove } : {})}
    />
  )
}
