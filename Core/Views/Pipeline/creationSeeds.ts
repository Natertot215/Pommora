// A rule stamps only when it names one value it can be satisfied by: an Is rule on a Select, Status, or Checkbox, or an Is Any, Is All, or Contains rule on a Multi-Select or a Context, where two such rules on one property take both values. Metadata is never changed to satisfy a filter, and a page those exclude simply creates and stays filtered out.

import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import type { PropertyValue } from '@pommora/core/Properties/propertyValue'
import type { FilterGroup, FilterRule } from '@pommora/core/Views/views'
import { declaredType } from '@pommora/core/Properties/value'
import { FILTER_OPS, ruleOperands } from './filter'
import { groupKeyToValue } from '../reassign'

const LIST_OPS: ReadonlySet<string> = new Set([FILTER_OPS.containsAny, FILTER_OPS.containsAll])

function ruleSeed(
  rule: FilterRule,
  schema: PropertyDefinition[],
  contextIds: readonly string[],
): PropertyValue | null {
  const operands = ruleOperands(rule)
  if (operands.length !== 1) return null
  const type = declaredType(rule.property_id, schema, contextIds)
  if (type === 'context' || type === 'multiSelect') {
    if (!LIST_OPS.has(rule.op)) return null
    return type === 'context'
      ? { kind: 'context', value: operands }
      : { kind: 'multiSelect', value: operands }
  }
  return rule.op === FILTER_OPS.is ? groupKeyToValue(operands[0], type) : null
}

/** Callers spread gesture-context seeds AFTER these — where a filter implication and the gesture disagree, the gesture wins. */
export function filterSeeds(
  filter: FilterGroup | undefined,
  enabled: boolean,
  schema: PropertyDefinition[],
  contextIds: readonly string[] = [],
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
      const value = ruleSeed(entry, schema, contextIds)
      if (value === null) continue
      const prior = seeds[entry.property_id]
      seeds[entry.property_id] =
        (value.kind === 'context' || value.kind === 'multiSelect') && prior?.kind === value.kind
          ? { ...value, value: [...new Set([...prior.value, ...value.value])] }
          : value
    }
  }
  walk(filter)
  return seeds
}
