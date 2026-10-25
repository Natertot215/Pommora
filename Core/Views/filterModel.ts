// Anything the frame can't faithfully represent decodes as `locked` rather than being silently flattened.

import { FILEDATA, type PropertyDefinition } from '../Properties/properties'
import {
  FILTER_OPS,
  type FilterGroup,
  type FilterRule,
  isGroup,
  type MatchMode,
  OPERANDLESS_OPS,
} from './filterRules'
import { type OperatorChoice, VALUE_KINDS, viewSpecOf } from './valueKinds'
import type { NexusTree } from '../Nexus/tree'
import { contextIdsOf } from '../Contexts/contextIdentity'
import { resolveColumn } from './Pipeline/columns'
import { contextPaneTargets, FILEDATA_TARGETS, type PaneTarget, schemaTargets } from './paneTargets'

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

/** Location reads from the Set's side — you choose the Set, not the page, hence "Contains" over "Is Inside". */
const LOCATION_OPS: OperatorChoice[] = [
  { op: FILTER_OPS.is, label: 'Is', slot: 'set' },
  { op: FILTER_OPS.isNot, label: "Isn't", slot: 'set' },
  { op: FILTER_OPS.isInside, label: 'Contains', slot: 'set', names: true },
  { op: FILTER_OPS.isNotInside, label: "Doesn't Contain", slot: 'set', names: true },
]

/** Title never offers empty ops — a title (the filename basename) is never empty. */
const TITLE_OPS = VALUE_KINDS.text.ops.filter((o) => !OPERANDLESS_OPS.has(o.op))

export function operatorsFor(
  propertyId: string,
  schema: PropertyDefinition[],
  contextIds: readonly string[],
): readonly OperatorChoice[] {
  if (propertyId === FILEDATA.title.id) return TITLE_OPS
  if (propertyId === FILEDATA.location.id) return LOCATION_OPS
  return viewSpecOf(resolveColumn(propertyId, schema, contextIds)?.type)?.ops ?? []
}

export function filterTargets(
  schema: PropertyDefinition[],
  tree: NexusTree | null,
  hasLocations = true,
): PaneTarget[] {
  const contextIds = contextIdsOf(tree)
  return [
    FILEDATA_TARGETS.title,
    // Every Location operator needs a location to point at, so with none it's a target that can never complete.
    ...(hasLocations ? [FILEDATA_TARGETS.location] : []),
    FILEDATA_TARGETS.createdAt,
    FILEDATA_TARGETS.modifiedAt,
    ...contextPaneTargets(tree),
    ...schemaTargets(schema, (d) => operatorsFor(d.id, schema, contextIds).length > 0),
  ]
}
