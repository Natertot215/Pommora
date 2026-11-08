import type { PropertyDefinition, ResolvedColumn } from '../../Properties/properties'
import type { ResolvedGroup, ViewRow } from '../viewRow'
import { isBucketHidden, type SavedView, viewOption } from '../views'
import { applyFilter } from './filter'
import {
  bucketGroupingOf,
  type GroupPlan,
  orderSetTree,
  pruneGroups,
  pruneHiddenSets,
  resolveGroups,
  type SetTreeNode,
  viewSetOrder,
} from './group'
import { makeSorter } from './sort'
import { resolveColumns } from './columns'
import type { IdentityMaps } from '../../Contexts/contextIdentity'

const holdsRows = (group: ResolvedGroup): boolean =>
  group.items.length > 0 || (group.children?.some(holdsRows) ?? false)

export function resolveView(input: {
  rows: ViewRow[]
  setTree: SetTreeNode[]
  view: SavedView
  schema: PropertyDefinition[]
  plan: GroupPlan
  manualOrder?: string[]
  /** The registry's Contexts and their Spaces — context columns + their filter typing. */
  identity: IdentityMaps
}): { columns: ResolvedColumn[]; groups: ResolvedGroup[] } {
  const { rows, setTree, view, schema, plan, manualOrder, identity } = input
  const columns = resolveColumns(view, schema, identity.contextIds)
  // Parked filters keep their rules and their mode; only application stops.
  const filtered = applyFilter(
    rows,
    viewOption(view, 'filter_enabled') ? view.filter : undefined,
    schema,
    setTree,
    identity,
  )
  const sorter = makeSorter(view.sort, schema, identity.contextIds, manualOrder)
  const hidden = new Set(view.hidden_groups ?? [])
  let tree = orderSetTree(setTree, viewSetOrder(plan, view))
  if (plan.kind === 'sets' && hidden.size > 0) tree = pruneHiddenSets(tree, hidden)
  const groups = resolveGroups(
    filtered,
    plan,
    tree,
    sorter,
    viewOption(view, 'ungrouped_placement'),
  )

  const hideEmpty = viewOption(view, 'hide_empty_groups')
  const filtering = filtered.length !== rows.length
  if (hidden.size === 0 && !hideEmpty && !filtering) return { columns, groups }
  const grouping = bucketGroupingOf(plan)
  const level = plan.kind === 'property' ? 'group' : 'sub'
  const drops = (group: ResolvedGroup): boolean =>
    (group.kind === 'bucket' &&
      grouping !== undefined &&
      isBucketHidden(hidden, level, grouping.config.property_id, group.value)) ||
    ((hideEmpty ? group.kind !== 'tail' : filtering && group.kind === 'set') && !holdsRows(group))
  return { columns, groups: pruneGroups(groups, drops) }
}
