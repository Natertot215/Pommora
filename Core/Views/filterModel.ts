// Anything the frame can't faithfully represent decodes as `locked` rather than being silently flattened.

import { type PropertyDefinition, RESERVED_PROPERTY_ID, specOf } from '../Properties/properties'
import type { ValueKind } from '../Properties/propertyValue'
import {
  FILTER_OPS,
  type FilterGroup,
  type FilterRule,
  isGroup,
  type MatchMode,
} from './filterRules'
import type { NexusTree } from '../Nexus/tree'
import { contextIdsOf } from '../Contexts/contextIdentity'
import { declaredType } from '../Properties/value'
import {
  contextPaneTargets,
  LOCATION_TARGET,
  type PaneTarget,
  STAMP_TARGETS,
  schemaTargets,
  TITLE_TARGET,
} from '../Properties/Cells/PropertyTypes'

export type DecodedFilter =
  | { kind: 'rows'; mode: MatchMode; rules: FilterRule[] }
  | { kind: 'locked' }

/** The pane writes one shape, a flat group under the footer's mode; anything nested was authored elsewhere and locks. */
export function decodeFilter(filter: FilterGroup | undefined): DecodedFilter {
  if (!filter) return { kind: 'rows', mode: 'any', rules: [] }
  return filter.rules.some(isGroup)
    ? { kind: 'locked' }
    : { kind: 'rows', mode: filter.match, rules: filter.rules as FilterRule[] }
}

type ValueSlot = 'none' | 'text' | 'number' | 'date' | 'chips' | 'set'

export interface OperatorChoice {
  op: string
  label: string
  slot: ValueSlot
  impliedValue?: string
  /** A typed folder name is an operand as well as a picked folder. */
  names?: true
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

/** The Starts and Ends ops are inclusive — the strict variants stay registered for hand-authored files, but the frame doesn't offer a second near-identical set. */
const DATE_OPS: OperatorChoice[] = [
  { op: FILTER_OPS.is, label: 'Is', slot: 'date' },
  { op: FILTER_OPS.onOrBefore, label: 'Starts Before', slot: 'date' },
  { op: FILTER_OPS.onOrAfter, label: 'Starts After', slot: 'date' },
  { op: FILTER_OPS.endsOnOrBefore, label: 'Ends Before', slot: 'date' },
  { op: FILTER_OPS.endsOnOrAfter, label: 'Ends After', slot: 'date' },
  ...EMPTIES,
]

const SET_OPS: OperatorChoice[] = [
  { op: FILTER_OPS.containsAny, label: 'Is Any', slot: 'chips' },
  { op: FILTER_OPS.containsAll, label: 'Is All', slot: 'chips' },
  { op: FILTER_OPS.doesNotContain, label: "Isn't", slot: 'chips' },
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
  { op: FILTER_OPS.is, label: 'Is', slot: 'chips' },
  { op: FILTER_OPS.isNot, label: "Isn't", slot: 'chips' },
  ...EMPTIES,
]

const CHECKBOX_OPS: OperatorChoice[] = [
  { op: FILTER_OPS.is, label: 'Is Checked', slot: 'none', impliedValue: 'true' },
  { op: FILTER_OPS.is, label: "Isn't Checked", slot: 'none', impliedValue: 'false' },
]

/** Location reads from the Set's side — you choose the Set, not the page, hence "Contains" over "Is Inside". */
const LOCATION_OPS: OperatorChoice[] = [
  { op: FILTER_OPS.is, label: 'Is', slot: 'set' },
  { op: FILTER_OPS.isNot, label: "Isn't", slot: 'set' },
  { op: FILTER_OPS.isInside, label: 'Contains', slot: 'set', names: true },
  { op: FILTER_OPS.isNotInside, label: "Doesn't Contain", slot: 'set', names: true },
]

/** Title never offers empty ops — a title (the filename basename) is never empty. */
const TITLE_OPS: OperatorChoice[] = TEXT_OPS

const KIND_OPS: Record<ValueKind, OperatorChoice[]> = {
  select: OPTION_OPS,
  multiSelect: SET_OPS,
  context: SET_OPS,
  number: NUMBER_OPS,
  dateTime: DATE_OPS,
  checkbox: CHECKBOX_OPS,
  link: [...TEXT_OPS, ...EMPTIES],
  text: [...TEXT_OPS, ...EMPTIES],
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
): PaneTarget[] {
  const contextIds = contextIdsOf(tree)
  return [
    TITLE_TARGET,
    // Every Location operator needs a location to point at, so with none it's a target that can never complete.
    ...(hasLocations ? [LOCATION_TARGET] : []),
    ...STAMP_TARGETS,
    ...contextPaneTargets(tree),
    ...schemaTargets(schema, (d) => operatorsFor(d.id, schema, contextIds).length > 0),
  ]
}
