// Composes the pure stages: columns (resolver) + filter → group → sort-within-group. VIEW-SOURCE-AGNOSTIC — `view`, `rows`, `schema`, `setTree` are all passed in, so a future context-dashboard embed reuses this verbatim. Never couple the view to its container or read `views[]` here.

import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import type { ResolvedColumn, ResolvedGroup, ViewRow } from '@pommora/core/Views/viewRow'
import { type SavedView, viewOption } from '@pommora/core/Views/views'
import { applyFilter } from './filter'
import { orderGroups } from './bandOrder'
import {
  dropHiddenGroups,
  type GroupPlan,
  pruneEmptyBuckets,
  pruneEmptyGroups,
  pruneHiddenSets,
  resolveGroups,
  type SetTreeNode,
  viewSetOrder,
} from './group'
import { makeSorter } from './sort'
import { resolveColumns } from './columns'

export function resolveView(input: {
  rows: ViewRow[]
  setTree: SetTreeNode[]
  view: SavedView
  schema: PropertyDefinition[]
  plan: GroupPlan
  manualOrder?: string[]
  /** Registry Context ids (display order) — context columns + their filter typing. */
  contextIds?: readonly string[]
}): { columns: ResolvedColumn[]; groups: ResolvedGroup[] } {
  const { rows, setTree, view, schema, plan, manualOrder, contextIds = [] } = input
  const columns = resolveColumns(view, schema, contextIds)
  // Parked filters keep their rules and their mode; only application stops.
  const filtered = applyFilter(
    rows,
    viewOption(view, 'filter_enabled') ? view.filter : undefined,
    schema,
    setTree,
    contextIds,
  )
  const sorter = makeSorter(view.sort, schema, manualOrder)
  const hidden = new Set(view.hidden_groups ?? [])
  let resolved = resolveGroups(
    filtered,
    plan,
    schema,
    plan.kind === 'sets' && hidden.size > 0 ? pruneHiddenSets(setTree, hidden) : setTree,
    sorter,
    viewOption(view, 'ungrouped_placement'),
  )
  if (hidden.size > 0) resolved = dropHiddenGroups(resolved, hidden, view)
  if (viewOption(view, 'hide_empty_groups'))
    resolved = pruneEmptyGroups(pruneEmptyBuckets(resolved))
  else if (filtered.length !== rows.length) resolved = pruneEmptyGroups(resolved)
  return { columns, groups: orderGroups(resolved, viewSetOrder(plan, view)) }
}
