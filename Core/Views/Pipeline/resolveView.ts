// View pipeline orchestrator. Composes the pure stages: columns (resolver) + filter → group →
// sort-within-group. VIEW-SOURCE-AGNOSTIC — `view`, `rows`, `schema`, `setTree` are all passed in,
// so a future context-dashboard embed reuses this verbatim with its own stored SavedView + a target
// ref. Never couple the view to its container or read `views[]` here. Pure: no fs, no React.

import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import type { ResolvedColumn, ResolvedGroup, ViewRow } from '@pommora/core/Views/viewRow'
import { isLocationFsOrder, type SavedView } from '@pommora/core/Views/views'
import { applyFilter } from './filter'
import { orderGroups } from './bandOrder'
import {
  dropHiddenGroups,
  groupsStructurally,
  pruneEmptyBuckets,
  pruneEmptyGroups,
  pruneHiddenSets,
  resolveGroups,
  type SetTreeNode,
} from './group'
import { makeSorter } from './sort'
import { resolveColumns } from './columns'

export function resolveView(input: {
  rows: ViewRow[]
  setTree: SetTreeNode[]
  view: SavedView
  schema: PropertyDefinition[]
  manualOrder?: string[]
  /** Cards flatten each top-level set's subtree into one band, so structural grouping resolves
   *  flat — one group per top set, its whole subtree in items — and a manual reorder spans the band. */
  flattenStructural?: boolean
  /** Registry Context ids (display order) — context columns + their filter typing. */
  contextIds?: readonly string[]
}): { columns: ResolvedColumn[]; groups: ResolvedGroup[] } {
  const { rows, setTree, view, schema, manualOrder, flattenStructural, contextIds = [] } = input
  // Sort By: Location (cards) is a reserved sort primary the sorter can't rank; on its Location order
  // mode it flattens the structural walk into one band (locationFlat).
  const locationFsOrder = isLocationFsOrder(view)
  const useLocationFlat =
    (flattenStructural && view.group?.kind === 'flat' && locationFsOrder) ?? false
  const columns = resolveColumns(view, schema, contextIds)
  // Parked filters keep their rules and their mode; only application stops.
  const filtered = applyFilter(
    rows,
    view.filter_enabled === false ? undefined : view.filter,
    schema,
    setTree,
    contextIds,
  )
  const sorter = makeSorter(view.sort, schema, manualOrder)
  const structuralGrouping = groupsStructurally(view.group, schema)
  const locationOrdered = structuralGrouping && view.structural_order_mode === 'location'
  const hidden = new Set(view.hidden_groups ?? [])
  let resolved = resolveGroups(
    filtered,
    view.group,
    schema,
    structuralGrouping && hidden.size > 0 ? pruneHiddenSets(setTree, hidden) : setTree,
    sorter,
    view.collapsed_groups,
    view.ungrouped_placement ?? 'bottom',
    structuralGrouping ? view.sub_group : undefined,
    flattenStructural,
    useLocationFlat,
  )
  if (hidden.size > 0) resolved = dropHiddenGroups(resolved, hidden)
  const hideEmpty =
    view.hide_empty_groups ?? (view.group?.kind === 'property' && view.group.hide_empty_groups)
  if (hideEmpty) resolved = pruneEmptyGroups(pruneEmptyBuckets(resolved))
  else if (filtered.length !== rows.length) resolved = pruneEmptyGroups(resolved)
  return { columns, groups: orderGroups(resolved, locationOrdered ? undefined : view.group_order) }
}
