// View pipeline orchestrator. Composes the pure stages: columns (resolver) + filter → group →
// sort-within-group. VIEW-SOURCE-AGNOSTIC — `view`, `rows`, `schema`, `setTree` are all passed in,
// so a future context-dashboard embed reuses this verbatim with its own stored SavedView + a target
// ref. Never couple the view to its container or read `views[]` here. Pure: no fs, no React.

import type { PropertyDefinition } from '@shared/properties'
import type { ResolvedColumn, ResolvedGroup, ViewRow } from '@shared/types'
import { isLocationFsOrder, type SavedView } from '@shared/views'
import { applyFilter } from './filter'
import { orderGroups } from './bandOrder'
import { groupsStructurally, pruneEmptyGroups, resolveGroups, type SetTreeNode } from './group'
import { makeSorter } from './sort'
import { resolveColumns } from './columns'

export function resolveView(input: {
  rows: ViewRow[]
  setTree: SetTreeNode[]
  view: SavedView
  schema: PropertyDefinition[]
  /** Per-machine manual row order (viewOrders cache) — the lowest-priority sort tiebreaker.
   *  Pass it only when the view is sorted or grouped; an unsorted, ungrouped view uses page_order. */
  manualOrder?: string[]
  /** Cards flatten each top-level set's subtree into one band, so structural grouping resolves
   *  flat — one group per top set, its whole subtree in items — and a manual reorder spans the band. */
  flattenStructural?: boolean
  /** Registry Context ids (display order) — context columns + their filter typing. */
  contextIds?: readonly string[]
}): { columns: ResolvedColumn[]; groups: ResolvedGroup[] } {
  const { rows, setTree, view, schema, manualOrder, flattenStructural, contextIds = [] } = input
  // Sort By: Location (cards) is a reserved sort primary the sorter can't rank; on its Location order
  // mode it flattens the structural walk into one band (locationFlat). Its Custom order mode falls to
  // the manual sorter (flat() + viewOrders). Gated on flattenStructural so it can't affect a table.
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
  // Location order mirrors the filesystem: group_order is preserved on the view but ignored.
  // The mode is structural-only — and "structural" is the EFFECTIVE mode (a dead-property grouping
  // renders structurally), so the location gate + sub-group thread whenever the table draws sets.
  const structuralGrouping = groupsStructurally(view.group, schema)
  const locationOrdered = structuralGrouping && view.structural_order_mode === 'location'
  const resolved = resolveGroups(
    filtered,
    view.group,
    schema,
    setTree,
    sorter,
    view.collapsed_groups,
    view.ungrouped_placement ?? 'bottom',
    structuralGrouping ? view.sub_group : undefined,
    flattenStructural,
    useLocationFlat,
  )
  // Empty Sets are shown deliberately — until a filter actually excludes something, at which point
  // the view shows what matched and a band holding nothing is noise.
  const groups = orderGroups(
    filtered.length === rows.length ? resolved : pruneEmptyGroups(resolved),
    locationOrdered ? undefined : view.group_order,
  )
  return { columns, groups }
}
