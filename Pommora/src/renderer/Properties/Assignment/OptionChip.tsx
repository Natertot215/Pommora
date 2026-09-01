import type { ColumnLook } from '@shared/columnStyles'
import type { OptionAppearance, PropertyDefinition } from '@shared/properties'
import { Label, optionShapeFor } from '@renderer/DesignSystem/Labels'
import { Icon, type IconName, iconNameOr } from '@renderer/DesignSystem/Symbols'
import { labelColorFor } from '@renderer/DesignSystem/Tokens/colorMap'
import { statusGroupGlyph, statusGroupOf } from './statusCycle'

export interface OptionChipData {
  value: string
  label?: string
  color?: string
  icon?: string
  appearance?: OptionAppearance
}

/** The Compact glyph a select / multi option falls back to when it carries none of its own. */
const defaultOptionIcon = (type: string): IconName => (type === 'multi_select' ? 'tags' : 'tag')

/** The glyph an option leads with — its own icon, else its type's default (status: its group's). */
export function optionGlyph(
  type: string,
  option: OptionChipData | undefined,
  def?: Pick<PropertyDefinition, 'status_groups'>,
): string {
  return type === 'status'
    ? iconNameOr(option?.icon, statusGroupGlyph(statusGroupOf(option?.value ?? '', def)))
    : iconNameOr(option?.icon, defaultOptionIcon(type))
}

/** One option value as a chip — the single place a (type, look, option) becomes a Label. SHAPE is
 *  the type's identity (pill for status, tag for select / multi); the LOOK is its size: Standard
 *  shows the label, Compact an icon alone. */
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
  /** Status only: resolves the value's group for the Compact glyph. */
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
