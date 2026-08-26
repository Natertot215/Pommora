// The pane owns the filter slot wholesale for the shapes it writes; anything it can't faithfully
// represent decodes as `locked` and is never silently flattened (a rewrite would change the
// filter's truth table). Pure: no fs, no React.

import type { PropertyDefinition } from '@shared/properties'
import { RESERVED_PROPERTY_ID } from '@shared/properties'
import type { FilterGroup, FilterRule, MatchMode } from '@shared/views'

export type { MatchMode }
import type { NexusTree } from '@shared/types'
import type { Icon } from '@renderer/DesignSystem/Symbols'
import { contextsByIdOf } from '../../Detail/Views/pipeline/contextIdentity'
import { declaredType } from '../../Detail/Views/pipeline/value'
import { FILTER_OPS } from '../../Detail/Views/pipeline/filter'
import { MODIFIED_TARGET, schemaTargets, TITLE_TARGET } from '../../Properties/PropertyTypes'

export type Connector = 'and' | 'or'

/** One authored row — `connector` is null on row 0 (nothing to join). Named FilterRow, not PaneRow:
 *  paneDndModel exports an unrelated PaneRow in this same directory. */
export interface FilterRow {
  connector: Connector | null
  rule: FilterRule
}

export type DecodedFilter =
  | { kind: 'rows'; mode: MatchMode; rows: FilterRow[] }
  | { kind: 'locked' }

const isLeaf = (node: FilterRule | FilterGroup): node is FilterRule => !('rules' in node)
const isAllOfLeaves = (node: FilterRule | FilterGroup): node is FilterGroup =>
  !isLeaf(node) && node.match === 'all' && node.rules.every(isLeaf)

/** The encoder's structure rule and the pane's row seeding both read the default connector from here. */
export const connectorFor = (mode: MatchMode): Connector => (mode === 'any' ? 'or' : 'and')

/** Rows → tree. Connectors derive the structure: the list splits into AND-runs at each 'or'; one run
 *  is a flat group in the base mode, several become of-runs (a one-rule run stays a bare leaf). A
 *  split under All becomes an `any` of `all`-runs — the OR-of-ANDs the connectors literally spell
 *  out; under Any the root already is `any`, so it holds. */
export function encodeFilter(mode: MatchMode, rows: FilterRow[]): FilterGroup | undefined {
  if (rows.length === 0) return undefined
  const runs: FilterRule[][] = [[]]
  for (const row of rows) {
    if (row.connector === 'or' && runs[runs.length - 1].length > 0) runs.push([])
    runs[runs.length - 1].push(row.rule)
  }
  if (runs.length === 1) return { match: mode, rules: runs[0] }
  return {
    match: mode === 'all' ? 'any' : mode,
    rules: runs.map((run) => (run.length === 1 ? run[0] : { match: 'all', rules: run })),
  }
}

/** Tree → rows, or `locked` when the shape isn't one the pane writes (defined by SHAPE, never
 *  depth — an `any` nested under an `all` root is only 2 deep but inexpressible flat). Mixed
 *  connectors display mode `all` ("Or" is a valid deviation under All). */
export function decodeFilter(filter: FilterGroup | undefined): DecodedFilter {
  if (!filter) return { kind: 'rows', mode: 'all', rows: [] }

  // A flat all is one And-run of leaves — no split, so every connector reads And.
  if (filter.match !== 'any' && filter.rules.every(isLeaf)) {
    return {
      kind: 'rows',
      mode: filter.match,
      rows: filter.rules.map((rule, i) => ({ connector: i === 0 ? null : 'and', rule })),
    }
  }

  // `any` over runs: every child must be a leaf or an all-of-leaves run.
  if (!filter.rules.every((n) => isLeaf(n) || isAllOfLeaves(n))) return { kind: 'locked' }
  const rows: FilterRow[] = []
  for (const child of filter.rules) {
    const run = isLeaf(child) ? [child] : (child.rules as FilterRule[])
    run.forEach((rule, i) => {
      rows.push({ connector: rows.length === 0 ? null : i === 0 ? 'or' : 'and', rule })
    })
  }
  // A pure-leaf `any` is genuinely Any; one carrying an all-of-leaves run is a mixed tree, which the
  // pane shows as All with the Or as a deviation.
  const mode: MatchMode = filter.rules.every(isLeaf) ? 'any' : 'all'
  return { kind: 'rows', mode, rows }
}

export type ValueSlot = 'none' | 'text' | 'number' | 'date' | 'chips' | 'set'

export interface OperatorChoice {
  op: string
  label: string
  slot: ValueSlot
  /** Chip ops: the picker toggles values[] and stays open. */
  multi?: boolean
  /** Self-contained ops (checkbox) write this into `value` on pick. */
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

/** Before/After are the INCLUSIVE ops (on-or-before / on-or-after) — the boundary date matching is
 *  the behavior people expect, so it's the default rather than a second, longer-labeled entry. The
 *  strict variants stay registered in the evaluator for hand-authored files; the pane doesn't offer
 *  them, because a second pair of near-identical labels costs more width than the distinction buys. */
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

const NUMBER_OPS: OperatorChoice[] = [
  { op: FILTER_OPS.is, label: 'Is', slot: 'number' },
  { op: FILTER_OPS.isNot, label: "Isn't", slot: 'number' },
  { op: FILTER_OPS.greaterThan, label: 'Greater Than', slot: 'number' },
  { op: FILTER_OPS.greaterOrEqual, label: 'At Least', slot: 'number' },
  { op: FILTER_OPS.lessThan, label: 'Less Than', slot: 'number' },
  { op: FILTER_OPS.lessOrEqual, label: 'At Most', slot: 'number' },
  ...EMPTIES,
]

/** Is/Isn't are chip pickers whose multi-chips mean any-of/none-of — never Is All, which is
 *  unsatisfiable on a one-value property. */
const OPTION_OPS: OperatorChoice[] = [
  { op: FILTER_OPS.is, label: 'Is', slot: 'chips', multi: true },
  { op: FILTER_OPS.isNot, label: "Isn't", slot: 'chips', multi: true },
  ...EMPTIES,
]

const CHECKBOX_OPS: OperatorChoice[] = [
  { op: FILTER_OPS.is, label: 'Is Checked', slot: 'none', impliedValue: 'true' },
  { op: FILTER_OPS.is, label: "Isn't Checked", slot: 'none', impliedValue: 'false' },
]

/** Location reads from the SET's side — you choose the Set, not the page, which is why "Contains"
 *  beats "Is Inside" as the label. Is/Isn't test the IMMEDIATE parent Set; Contains/Doesn't Contain are their any-depth twins. All
 *  four take a SET of Sets — "in any of these" — so the operand is chips like every other membership
 *  test, not a single pick. */
const LOCATION_OPS: OperatorChoice[] = [
  { op: FILTER_OPS.is, label: 'Is', slot: 'set', multi: true },
  { op: FILTER_OPS.isNot, label: "Isn't", slot: 'set', multi: true },
  { op: FILTER_OPS.isInside, label: 'Contains', slot: 'set', multi: true },
  { op: FILTER_OPS.isNotInside, label: "Doesn't Contain", slot: 'set', multi: true },
]

/** Title never offers empty ops — a title (the filename basename) is never empty. */
const TITLE_OPS: OperatorChoice[] = TEXT_OPS

export function operatorsFor(
  propertyId: string,
  schema: PropertyDefinition[],
  contextIds: readonly string[] = [],
): OperatorChoice[] {
  if (propertyId === RESERVED_PROPERTY_ID.title) return TITLE_OPS
  if (propertyId === RESERVED_PROPERTY_ID.location) return LOCATION_OPS
  switch (declaredType(propertyId, schema, contextIds)) {
    case 'select':
    case 'status':
      return OPTION_OPS
    case 'multi_select':
    case 'context':
      return SET_OPS
    case 'number':
      return NUMBER_OPS
    case 'datetime':
    case 'last_edited_time':
      return DATE_OPS
    case 'checkbox':
      return CHECKBOX_OPS
    case 'url':
      return [...TEXT_OPS, ...EMPTIES]
    case 'file':
      return EMPTIES
    default:
      return []
  }
}

export interface FilterTarget {
  id: string
  label: string
  icon: React.ComponentProps<typeof Icon>['name'] | undefined
}

/** Contexts resolve through the identity seam, so a user-defined one is offered on the same
 *  footing as the seeded three and wears its own title and icon. */
export function filterTargets(
  schema: PropertyDefinition[],
  tree: NexusTree | null,
  hasSets = true,
): FilterTarget[] {
  const contextsById = contextsByIdOf(tree)
  const contextIds = [...contextsById.keys()]
  return [
    TITLE_TARGET,
    // Every Location operator needs a Set to point at, so on a container with none it's a target
    // that can never complete.
    ...(hasSets
      ? [{ id: RESERVED_PROPERTY_ID.location, label: 'Location', icon: 'folder' as const }]
      : []),
    MODIFIED_TARGET,
    ...[...contextsById].map(([id, identity]) => ({
      id,
      label: identity.title,
      icon: identity.icon,
    })),
    ...schemaTargets(schema, (d) => operatorsFor(d.id, schema, contextIds).length > 0),
  ]
}
