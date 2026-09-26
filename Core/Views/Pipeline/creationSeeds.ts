// A rule stamps only when it names one unambiguous value on a user property. Metadata is never changed to satisfy a filter, and a page those exclude simply creates and stays filtered out.

import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import type { PropertyValue } from '@pommora/core/Properties/propertyValue'
import type { FilterGroup, FilterRule } from '@pommora/core/Views/views'
import { FILTER_OPS } from './filter'
import { groupKeyToValue } from '../reassign'

function ruleSeed(rule: FilterRule, schema: PropertyDefinition[]): PropertyValue | null {
  if (rule.op !== FILTER_OPS.is) return null
  const one = rule.value ?? (rule.values?.length === 1 ? rule.values[0] : undefined)
  if (one === undefined) return null
  return groupKeyToValue(one, schema.find((d) => d.id === rule.property_id)?.type)
}

/** Callers spread gesture-context seeds AFTER these — where a filter implication and the gesture disagree, the gesture wins. */
export function filterSeeds(
  filter: FilterGroup | undefined,
  enabled: boolean,
  schema: PropertyDefinition[],
): Record<string, PropertyValue> {
  const seeds: Record<string, PropertyValue> = {}
  if (!filter || !enabled) return seeds
  const walk = (group: FilterGroup): void => {
    if (group.match !== 'all') return
    for (const entry of group.rules) {
      if ('match' in entry) {
        walk(entry)
        continue
      }
      const value = ruleSeed(entry, schema)
      if (value !== null) seeds[entry.property_id] = value
    }
  }
  walk(filter)
  return seeds
}
