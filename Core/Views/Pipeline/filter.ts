// Match modes are all = AND and any = OR at every depth; negation lives on the per-rule operators.

import {
  FILTER_OPS,
  type FilterGroup,
  type FilterRule,
  answerable,
  isGroup,
  ruleOperands,
} from '../filterRules'
import type { ViewRow } from '../viewRow'
import { FILEDATA, type PropertyDefinition } from '../../Properties/properties'
import { resolveFieldValue } from '../../Properties/fieldValue'
import { resolveColumn } from './columns'
import type { SetTreeNode } from './group'
import { viewSpecOf } from '../valueKinds'
import { foldKey } from '../../Paths/caseFold'
import { isUlidShaped } from '../../Nexus/identityMark'

type RowTest = (row: ViewRow) => boolean

export function applyFilter(
  rows: ViewRow[],
  filter: FilterGroup | undefined,
  schema: PropertyDefinition[],
  setTree: SetTreeNode[],
  contextIds: readonly string[],
): ViewRow[] {
  const test = filter && prepareGroup(filter, schema, setTree, contextIds)
  return test ? rows.filter(test) : rows
}

/** `undefined` when no rule applies. */
export function prepareGroup(
  group: FilterGroup,
  schema: PropertyDefinition[],
  setTree: SetTreeNode[],
  contextIds: readonly string[],
): RowTest | undefined {
  const tests = group.rules.flatMap((node) => {
    const test = isGroup(node)
      ? prepareGroup(node, schema, setTree, contextIds)
      : prepareRule(node, schema, setTree, contextIds)
    return test ? [test] : []
  })
  if (tests.length === 0) return undefined
  switch (group.match) {
    case 'all':
      return (row) => tests.every((test) => test(row))
    case 'any':
      return (row) => tests.some((test) => test(row))
  }
}

/** `undefined` when the rule abstains: an unauthored operand, a property the schema lacks, an op its kind doesn't answer, an operand that doesn't read, or a Location naming only dead ids. */
export function prepareRule(
  rule: FilterRule,
  schema: PropertyDefinition[],
  setTree: SetTreeNode[],
  contextIds: readonly string[],
): RowTest | undefined {
  const { op, property_id: id } = rule
  const want = ruleOperands(rule)
  if (!answerable(rule)) return undefined
  if (id === FILEDATA.location.id) return prepareLocation(op, want, setTree)
  const column = resolveColumn(id, schema, contextIds)
  const kind = viewSpecOf(column?.type)
  if (!column || !kind) return undefined
  switch (op) {
    case FILTER_OPS.isEmpty:
      return (row) => !kind.filled(resolveFieldValue(row, column))
    case FILTER_OPS.isNotEmpty:
      return (row) => kind.filled(resolveFieldValue(row, column))
  }
  const test = kind.prepare(op, want, column.def)
  return test && ((row) => test(resolveFieldValue(row, column)))
}

// Is/Isn't test the immediate parent by id, Contains/Doesn't any depth by id or folder name. Ids naming no folder are dead and abstain; an unmatched name matches nothing.
function prepareLocation(op: string, want: string[], setTree: SetTreeNode[]): RowTest | undefined {
  switch (op) {
    case FILTER_OPS.is:
      return ({ parentSetId: p }) => p != null && want.includes(p)
    case FILTER_OPS.isNot:
      return ({ parentSetId: p }) => p == null || !want.includes(p)
    case FILTER_OPS.isInside:
    case FILTER_OPS.isNotInside: {
      const inside = new Set<string>()
      const names = new Set(want.map(foldKey))
      const hit = (n: SetTreeNode): boolean => want.includes(n.id) || names.has(foldKey(n.title))
      const walk = (nodes: SetTreeNode[], within: boolean): void => {
        for (const n of nodes) {
          const held = within || hit(n)
          if (held) inside.add(n.id)
          walk(n.sets ?? [], held)
        }
      }
      walk(setTree, false)
      if (inside.size === 0 && want.every(isUlidShaped)) return undefined
      const keep = op === FILTER_OPS.isInside
      return ({ parentSetId: p }) => (p != null && inside.has(p)) === keep
    }
    default:
      return undefined
  }
}
