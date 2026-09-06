import type { ColumnLook } from '@pommora/core/Properties/columnStyles'
import type { OptionAppearance, PropertyDefinition } from '@pommora/core/Properties/properties'
import { Label } from '@pommora/uix/Labels/Label'
import { optionShapeFor } from '@pommora/uix/Labels/recipes'
import { Icon, type IconName, iconNameOr } from '@pommora/uix/Symbols'
import { labelColorFor } from '@pommora/uix/Theme/ramp'
import { statusGroupGlyph, statusGroupOf } from './statusCycle'

export interface OptionChipData {
  value: string
  label?: string
  color?: string
  icon?: string
  appearance?: OptionAppearance
}

const defaultOptionIcon = (type: string): IconName => (type === 'multi_select' ? 'tags' : 'tag')

export function optionGlyph(
  type: string,
  option: OptionChipData | undefined,
  def?: Pick<PropertyDefinition, 'status_groups'>,
): string {
  return type === 'status'
    ? iconNameOr(option?.icon, statusGroupGlyph(statusGroupOf(option?.value ?? '', def)))
    : iconNameOr(option?.icon, defaultOptionIcon(type))
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
      color={labelColorFor(option?.color)}
      {...(option?.appearance === 'clear' ? { fill: 'none' as const } : {})}
      className={className}
      {...(look === 'compact'
        ? { icon: <Icon name={optionGlyph(type, option, def)} size="body" /> }
        : { text: option?.label ?? value })}
      {...(onRemove ? { onRemove } : {})}
    />
  )
}
