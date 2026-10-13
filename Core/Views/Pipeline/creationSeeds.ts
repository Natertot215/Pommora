// A rule stamps only when it names one value it can be satisfied by: an Is rule on a Select, Status, or Checkbox, or an Is Any or Is All rule on a Multi-Select or a Context, where two such rules on one property take both values. An Any group seeds from its first rule that can. Metadata is never changed to satisfy a filter, and a page those exclude simply creates and stays filtered out.

import { type PropertyDefinition, specOf } from '../../Properties/properties'
import type { PropertyValue } from '../../Properties/propertyValue'
import {
  FILTER_OPS,
  type FilterGroup,
  type FilterRule,
  isGroup,
  ruleOperands,
} from '../filterRules'
import { declaredType } from '../../Properties/value'
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
  const kind = specOf(type)?.kind
  switch (kind) {
    case 'context':
    case 'multiSelect':
      return LIST_OPS.has(rule.op) ? { kind, value: operands } : null
    case 'select':
    case 'checkbox':
    case 'number':
    case 'dateTime':
    case 'link':
    case 'text':
    case 'file':
    case undefined:
      return rule.op === FILTER_OPS.is ? groupKeyToValue(operands[0], type) : null
  }
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
  const seed = (rule: FilterRule): boolean => {
    const value = ruleSeed(rule, schema, contextIds)
    if (value === null) return false
    const prior = seeds[rule.property_id]
    seeds[rule.property_id] =
      (value.kind === 'context' || value.kind === 'multiSelect') && prior?.kind === value.kind
        ? { ...value, value: [...new Set([...prior.value, ...value.value])] }
        : value
    return true
  }
  // Meeting one rule meets an Any group, so it seeds from its first rule that can.
  const walk = (group: FilterGroup): boolean => {
    const first = group.match === 'any'
    let seeded = false
    for (const entry of group.rules) {
      const hit = isGroup(entry) ? walk(entry) : seed(entry)
      seeded ||= hit
      if (hit && first) break
    }
    return seeded
  }
  walk(filter)
  return seeds
}
