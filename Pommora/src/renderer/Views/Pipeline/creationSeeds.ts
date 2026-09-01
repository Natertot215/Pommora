// What a view's filter cleanly implies for a page created inside it. A rule stamps only when it
// names one unambiguous value on a user property — a positive Is under All-mode. Any/None groups,
// negatives, presence ops, and metadata rules (title, dates) derive nothing: metadata is never
// changed to satisfy a filter, and a page those exclude simply creates and stays filtered out.

import type { PropertyDefinition } from '@shared/properties'
import type { PropertyValue } from '@shared/propertyValue'
import type { FilterGroup, FilterRule } from '@shared/views'
import { FILTER_OPS } from './filter'

function ruleSeed(rule: FilterRule, schema: PropertyDefinition[]): PropertyValue | null {
  if (rule.op !== FILTER_OPS.is || rule.value === undefined) return null
  const def = schema.find((d) => d.id === rule.property_id)
  switch (def?.type) {
    case 'status':
    case 'select':
      return { kind: 'select', value: rule.value }
    case 'checkbox':
      return rule.value === 'true' ? { kind: 'checkbox', value: true } : null
    default:
      return null
  }
}

/** The seed map an active filter implies. Callers spread gesture-context seeds AFTER these —
 *  where a filter implication and the gesture disagree, the gesture wins. */
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
