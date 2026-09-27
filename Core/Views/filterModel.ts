// Anything the frame can't faithfully represent decodes as `locked` rather than being silently flattened.

import {
  type PropertyDefinition,
  RESERVED_PROPERTY_ID,
  specOf,
} from '@pommora/core/Properties/properties'
import type { ValueKind } from '@pommora/core/Properties/propertyValue'
import {
  FILTER_OPS,
  type FilterGroup,
  type FilterRule,
  isGroup,
  type MatchMode,
} from '@pommora/core/Views/views'
import type { NexusTree } from '@pommora/core/Nexus/tree'
import { contextIdsOf } from '../Contexts/contextIdentity'
import { declaredType } from '../Properties/value'
import {
  contextPaneTargets,
  type PaneTarget,
  STAMP_TARGETS,
  schemaTargets,
  TITLE_TARGET,
} from '../Properties/Cells/PropertyTypes'

export type Connector = 'and' | 'or'

/** Named FilterRow, not FrameRow: frameDndModel exports an unrelated FrameRow in this same directory. */
export interface FilterRow {
  connector: Connector | null
  rule: FilterRule
}

export type DecodedFilter =
  | { kind: 'rows'; mode: MatchMode; rows: FilterRow[] }
  | { kind: 'locked' }

const isAllOfLeaves = (node: FilterRule | FilterGroup): node is FilterGroup =>
  isGroup(node) && node.match === 'all' && !node.rules.some(isGroup)

export const connectorFor = (mode: MatchMode): Connector => (mode === 'any' ? 'or' : 'and')

/** Connectors derive the structure: the list splits into AND-runs at each 'or', and a split becomes an `any` of `all`-runs. The mode names only a lone rule's group. */
export function encodeFilter(mode: MatchMode, rows: FilterRow[]): FilterGroup | undefined {
  if (rows.length === 0) return undefined
  const runs: FilterRule[][] = [[]]
  for (const row of rows) {
    if (row.connector === 'or' && runs[runs.length - 1].length > 0) runs.push([])
    runs[runs.length - 1].push(row.rule)
  }
  if (runs.length === 1) return { match: rows.length === 1 ? mode : 'all', rules: runs[0] }
  return {
    match: 'any',
    rules: runs.map((run) => (run.length === 1 ? run[0] : { match: 'all', rules: run })),
  }
}

/** The frame writes two shapes: a flat group, or an `any` of rules and all-of runs, which reads as All with each Or a deviation once a run joins with And. */
export function decodeFilter(filter: FilterGroup | undefined): DecodedFilter {
  if (!filter) return { kind: 'rows', mode: 'all', rows: [] }

  if (!filter.rules.some(isGroup)) {
    const connector = connectorFor(filter.match)
    return {
      kind: 'rows',
      mode: filter.match,
      rows: (filter.rules as FilterRule[]).map((rule, i) => ({
        connector: i === 0 ? null : connector,
        rule,
      })),
    }
  }

  if (filter.match === 'all' || !filter.rules.every((n) => !isGroup(n) || isAllOfLeaves(n)))
    return { kind: 'locked' }
  const rows: FilterRow[] = []
  for (const child of filter.rules) {
    const run = isGroup(child) ? (child.rules as FilterRule[]) : [child]
    run.forEach((rule, i) => {
      rows.push({ connector: rows.length === 0 ? null : i === 0 ? 'or' : 'and', rule })
    })
  }
  return { kind: 'rows', mode: rows.some((r) => r.connector === 'and') ? 'all' : 'any', rows }
}

type ValueSlot = 'none' | 'text' | 'number' | 'date' | 'chips' | 'set'

export interface OperatorChoice {
  op: string
  label: string
  slot: ValueSlot
  multi?: boolean
  impliedValue?: string
}

const EMPTIES: OperatorChoice[] = [
  { op: FILTER_OPS.isEmpty, label: 'Is Empty', slot: 'none' },
  { op: FILTER_OPS.isNotEmpty, label: "Isn't Empty", slot: 'none' },
]

const TEXT_OPS: OperatorChoice[] = [
  { op: FILTER_OPS.is, label: 'Is', slot: 'text' },
  { op: FILTER_OPS.isNot, label: "Isn't", slot: 'text' },
  { op: FILTER_OPS.startsWith, label: 'Starts With', slot: 'text' },
  { op: FILTER_OPS.contains, label: 'Contains', slot: 'text' },
  { op: FILTER_OPS.doesNotContain, label: "Doesn't Contain", slot: 'text' },
]

/** Before/After are the inclusive ops — the strict variants stay registered for hand-authored files, but the frame doesn't offer a second near-identical pair. */
const DATE_OPS: OperatorChoice[] = [
  { op: FILTER_OPS.is, label: 'Is', slot: 'date' },
  { op: FILTER_OPS.onOrBefore, label: 'Before', slot: 'date' },
  { op: FILTER_OPS.onOrAfter, label: 'After', slot: 'date' },
  ...EMPTIES,
]

const SET_OPS: OperatorChoice[] = [
  { op: FILTER_OPS.containsAny, label: 'Is Any', slot: 'chips', multi: true },
  { op: FILTER_OPS.containsAll, label: 'Is All', slot: 'chips', multi: true },
  { op: FILTER_OPS.doesNotContain, label: "Isn't", slot: 'chips', multi: true },
  ...EMPTIES,
]

const CONTEXT_OPS: OperatorChoice[] = [
  { op: FILTER_OPS.containsAny, label: 'Contains', slot: 'chips', multi: true },
  { op: FILTER_OPS.doesNotContain, label: "Isn't", slot: 'chips', multi: true },
  ...EMPTIES,
]

const NUMBER_OPS: OperatorChoice[] = [
  { op: FILTER_OPS.is, label: 'Is', slot: 'number' },
  { op: FILTER_OPS.isNot, label: "Isn't", slot: 'number' },
  { op: FILTER_OPS.greaterThan, label: 'Greater Than', slot: 'number' },
  { op: FILTER_OPS.greaterOrEqual, label: 'At Least', slot: 'number' },
  { op: FILTER_OPS.lessThan, label: 'Less Than', slot: 'number' },
  { op: FILTER_OPS.lessOrEqual, label: 'At Most', slot: 'number' },
  ...EMPTIES,
]

/** Is/Isn't are chip pickers whose multi-chips mean any-of/none-of — never Is All, which is unsatisfiable on a one-value property. */
const OPTION_OPS: OperatorChoice[] = [
  { op: FILTER_OPS.is, label: 'Is', slot: 'chips', multi: true },
  { op: FILTER_OPS.isNot, label: "Isn't", slot: 'chips', multi: true },
  ...EMPTIES,
]

const CHECKBOX_OPS: OperatorChoice[] = [
  { op: FILTER_OPS.is, label: 'Is Checked', slot: 'none', impliedValue: 'true' },
  { op: FILTER_OPS.is, label: "Isn't Checked", slot: 'none', impliedValue: 'false' },
]

/** Location reads from the Set's side — you choose the Set, not the page, hence "Contains" over "Is Inside". */
const LOCATION_OPS: OperatorChoice[] = [
  { op: FILTER_OPS.is, label: 'Is', slot: 'set', multi: true },
  { op: FILTER_OPS.isNot, label: "Isn't", slot: 'set', multi: true },
  { op: FILTER_OPS.isInside, label: 'Contains', slot: 'set', multi: true },
  { op: FILTER_OPS.isNotInside, label: "Doesn't Contain", slot: 'set', multi: true },
]

/** Title never offers empty ops — a title (the filename basename) is never empty. */
const TITLE_OPS: OperatorChoice[] = TEXT_OPS

const KIND_OPS: Record<ValueKind, OperatorChoice[]> = {
  select: OPTION_OPS,
  multiSelect: SET_OPS,
  context: CONTEXT_OPS,
  number: NUMBER_OPS,
  dateTime: DATE_OPS,
  checkbox: CHECKBOX_OPS,
  link: [...TEXT_OPS, ...EMPTIES],
  file: EMPTIES,
}

export function operatorsFor(
  propertyId: string,
  schema: PropertyDefinition[],
  contextIds: readonly string[] = [],
): OperatorChoice[] {
  if (propertyId === RESERVED_PROPERTY_ID.title) return TITLE_OPS
  if (propertyId === RESERVED_PROPERTY_ID.location) return LOCATION_OPS
  const kind = specOf(declaredType(propertyId, schema, contextIds))?.kind
  return kind ? KIND_OPS[kind] : []
}

export function filterTargets(
  schema: PropertyDefinition[],
  tree: NexusTree | null,
  hasLocations = true,
  capitalize = false,
): PaneTarget[] {
  const contextIds = contextIdsOf(tree)
  return [
    TITLE_TARGET,
    // Every Location operator needs a location to point at, so with none it's a target that can never complete.
    ...(hasLocations
      ? [{ id: RESERVED_PROPERTY_ID.location, label: 'Location', icon: 'folder' }]
      : []),
    ...STAMP_TARGETS,
    ...contextPaneTargets(tree),
    ...schemaTargets(schema, (d) => operatorsFor(d.id, schema, contextIds).length > 0, capitalize),
  ]
}
