import type { IconName } from '@renderer/DesignSystem/Symbols'
import type { PropertyDefinition, StatusGroupId } from '@shared/properties'

const STATUS_GROUP_GLYPH: Record<string, IconName> = {
  upcoming: 'circle-dashed',
  in_progress: 'minus',
  done: 'check',
}

/** A group's glyph for the Compact status chip. An unknown or absent group (reachable only via
 *  malformed data today) falls back to the neutral dashed circle. */
export function statusGroupGlyph(group: string | undefined): IconName {
  return (group ? STATUS_GROUP_GLYPH[group] : undefined) ?? 'circle-dashed'
}

export function statusGroupOf(
  value: string,
  def: PropertyDefinition | undefined,
): StatusGroupId | undefined {
  for (const g of def?.status_groups ?? []) {
    if (g.options.some((o) => o.value === value)) return g.id
  }
  return undefined
}
