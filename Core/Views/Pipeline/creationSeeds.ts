// A rule stamps only when it names one value it can be satisfied by: an Is rule on a Select, Status, or Checkbox, or an Is Any or Is All rule on a Multi-Select or a Context, where two such rules on one property take both values. An Any group seeds nothing when a blank page already meets it, else from its first rule or group that seeding meets. Metadata is never changed to satisfy a filter, and a page those exclude simply creates and stays filtered out.

import { type PropertyDefinition, specOf } from '../../Properties/properties'
import type { PropertyValue } from '../../Properties/propertyValue'
import {
  FILTER_OPS,
  type FilterGroup,
  type FilterRule,
  isGroup,
  ruleOperands,
} from '../filterRules'
import { resolveColumn } from './columns'
import { groupKeyToValue } from '../reassign'
import { prepareGroup, prepareRule } from './filter'
import type { ViewRow } from '../viewRow'
import type { SetTreeNode } from './group'

const LIST_OPS: ReadonlySet<string> = new Set([FILTER_OPS.containsAny, FILTER_OPS.containsAll])

function ruleSeed(
  rule: FilterRule,
  schema: PropertyDefinition[],
  contextIds: readonly string[],
): PropertyValue | null {
  const operands = ruleOperands(rule)
  if (operands.length !== 1) return null
  const type = resolveColumn(rule.property_id, schema, contextIds)?.type
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

type Seeds = Record<string, PropertyValue>

function mergeSeeds(into: Seeds, from: Seeds): Seeds {
  const out = { ...into }
  for (const [id, value] of Object.entries(from)) {
    const prior = out[id]
    out[id] =
      (value.kind === 'context' || value.kind === 'multiSelect') && prior?.kind === value.kind
        ? { ...value, value: [...new Set([...prior.value, ...value.value])] }
        : value
  }
  return out
}

/** Callers spread gesture-context seeds AFTER these — where a filter implication and the gesture disagree, the gesture wins. */
export function filterSeeds({
  filter,
  blank,
  schema,
  setTree,
  contextIds,
}: {
  filter: FilterGroup | undefined
  blank: ViewRow
  schema: PropertyDefinition[]
  setTree: SetTreeNode[]
  contextIds: readonly string[]
}): Seeds {
  if (!filter) return {}
  // `passes` is the blank page against the node's compiled test, `undefined` when the node abstains.
  const judge = (
    node: FilterRule | FilterGroup,
  ): { seeds: Seeds; met: boolean; passes?: boolean } => {
    if (!isGroup(node)) {
      const passes = prepareRule(node, schema, setTree, contextIds)?.(blank)
      const seed = passes === undefined ? null : ruleSeed(node, schema, contextIds)
      return {
        seeds: seed ? { [node.property_id]: seed } : {},
        met: passes !== false || seed !== null,
        passes,
      }
    }
    const passes = prepareGroup(node, schema, setTree, contextIds)?.(blank)
    const children = node.rules.map(judge)
    switch (node.match) {
      case 'all':
        return {
          seeds: children.reduce<Seeds>((seeds, c) => mergeSeeds(seeds, c.seeds), {}),
          met: children.every((c) => c.met),
          passes,
        }
      case 'any': {
        if (passes !== false) return { seeds: {}, met: true, passes }
        const first = children.find((c) => c.passes !== undefined && c.met)
        return { seeds: first?.seeds ?? {}, met: first !== undefined, passes }
      }
    }
  }
  return judge(filter).seeds
}
