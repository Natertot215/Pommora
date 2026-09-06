import type { IconName } from '@pommora/uix/Symbols'
import type { PropertyDefinition, StatusGroupId } from '@pommora/core/Properties/properties'

const STATUS_GROUP_GLYPH: Record<string, IconName> = {
  upcoming: 'circle-dashed',
  in_progress: 'minus',
  done: 'check',
}

export function statusGroupGlyph(group: string | undefined): IconName {
  return (group ? STATUS_GROUP_GLYPH[group] : undefined) ?? 'circle-dashed'
}

export function statusGroupOf(
  value: string,
  def: Pick<PropertyDefinition, 'status_groups'> | undefined,
): StatusGroupId | undefined {
  for (const g of def?.status_groups ?? []) {
    if (g.options.some((o) => o.value === value)) return g.id
  }
  return undefined
}
