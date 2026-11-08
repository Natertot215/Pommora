import { type ResolvedGroup, type ViewRow, UNGROUPED } from '../viewRow'
import {
  bandKey,
  type DateGranularity,
  type EmptyPlacement,
  type GroupConfig,
  granularityOf,
  LOCATION_SORT,
  type SavedView,
  type StructuralOrderMode,
  type SubGroupConfig,
  viewOption,
} from '../views'
import {
  optionIds,
  type PropertyDefinition,
  type ResolvedColumn,
} from '../../Properties/properties'
import { resolveFieldValue } from '../../Properties/fieldValue'
import { propertyColumn } from './columns'
import { groupable, viewSpecOf } from '../valueKinds'
import { resolveRowOrder } from '@pommora/uix/Utilities/moveItem'

export type PropertyGroup = Extract<GroupConfig, { kind: 'property' }>
type Sorter = (rows: ViewRow[]) => ViewRow[]

/** A Collection or Set as the tree holds it. */
export interface SetTreeNode {
  id: string
  title: string
  sets?: SetTreeNode[]
}

const applySort = (rows: ViewRow[], sorter: Sorter | null): ViewRow[] =>
  sorter ? sorter(rows) : rows

const placeTail = (
  groups: ResolvedGroup[],
  tail: ViewRow[],
  sorter: Sorter | null,
  placement: EmptyPlacement,
  key: string = UNGROUPED,
): ResolvedGroup[] => {
  if (tail.length === 0) return groups
  const band: ResolvedGroup = { key, kind: 'tail', items: applySort(tail, sorter) }
  return placement === 'top' ? [band, ...groups] : [...groups, band]
}

function groupRows<K>(rows: ViewRow[], keyOf: (r: ViewRow) => K): Map<K, ViewRow[]> {
  const m = new Map<K, ViewRow[]>()
  for (const r of rows) {
    const k = keyOf(r)
    const arr = m.get(k)
    if (arr) arr.push(r)
    else m.set(k, [r])
  }
  return m
}

function subtreeIds(node: SetTreeNode): string[] {
  return [node.id, ...(node.sets ?? []).flatMap(subtreeIds)]
}

/** Hidden-set prune, ahead of resolution: a hidden node leaves with its whole subtree, so every structural path excludes its pages by construction. */
export function pruneHiddenSets(tree: SetTreeNode[], hidden: ReadonlySet<string>): SetTreeNode[] {
  return tree.flatMap((node) =>
    hidden.has(node.id) ? [] : [{ ...node, sets: pruneHiddenSets(node.sets ?? [], hidden) }],
  )
}

export const orderSetTree = (
  tree: SetTreeNode[],
  order: readonly string[] | undefined,
): SetTreeNode[] =>
  order?.length
    ? resolveRowOrder(tree, (node) => node.id, order).map((node) =>
        node.sets ? { ...node, sets: orderSetTree(node.sets, order) } : node,
      )
    : tree

export function bucketKey(
  row: ViewRow,
  column: ResolvedColumn,
  granularity: DateGranularity,
): string | null {
  return viewSpecOf(column.type)?.bucket?.(resolveFieldValue(row, column), granularity) ?? null
}

const appendTail = (base: string[], present: Set<string>): string[] => [
  ...base,
  ...[...present].filter((k) => !base.includes(k)).sort(),
]

export function liveBucketOrder(
  config: Pick<PropertyGroup, 'order_mode' | 'order'>,
  def: PropertyDefinition | undefined,
  present: Iterable<string>,
): string[] {
  return bucketOrder(config, def, new Set([...(def ? optionIds(def) : []), ...present]))
}

export function bucketOrder(
  group: Pick<PropertyGroup, 'order_mode' | 'order'>,
  def: PropertyDefinition | undefined,
  present: Set<string>,
): string[] {
  if (group.order_mode === 'manual') return appendTail(group.order ?? [], present)
  const configured = appendTail(def ? optionIds(def) : [], present)
  return group.order_mode === 'reversed' ? configured.reverse() : configured
}

function bucketBands(
  rows: ViewRow[],
  { config, column }: Grouping,
  sorter: Sorter | null,
  placement: EmptyPlacement,
  scope?: string,
): ResolvedGroup[] {
  const { def } = column
  const byBucket = groupRows(rows, (r) => bucketKey(r, column, granularityOf(config)))
  const noValue = byBucket.get(null) ?? []
  byBucket.delete(null)
  const buckets = byBucket as Map<string, ViewRow[]>

  // Only a LIVE option earns an empty band: a stale manual-order entry (a deleted option, an old date bucket snapshotted by a band drag) must never render a ghost band.
  const live = new Set(def ? optionIds(def) : [])
  const groups = liveBucketOrder(config, def, buckets.keys()).flatMap((value): ResolvedGroup[] => {
    const items = buckets.get(value) ?? []
    if (items.length === 0 && !live.has(value)) return []
    const key = bandKey(config.property_id, value, scope)
    return [{ key, kind: 'bucket', value, items: applySort(items, sorter) }]
  })
  // No "None" band: value-less rows are a flattened, header-less tail placed by the VIEW-level knob — it holds rows, so hide_empty_groups never touches it.
  const tail = scope === undefined ? UNGROUPED : bandKey(config.property_id, UNGROUPED, scope)
  return placeTail(groups, noValue, sorter, placement, tail)
}

function setBands(
  rows: ViewRow[],
  setTree: SetTreeNode[],
  { nests, sub }: { nests: boolean; sub?: Grouping },
  sorter: Sorter | null,
  placement: EmptyPlacement,
): ResolvedGroup[] {
  const bySet = groupRows(rows, (r) => r.parentSetId)
  const gathered = (node: SetTreeNode): ViewRow[] =>
    subtreeIds(node).flatMap((id) => bySet.get(id) ?? [])
  const band = (node: SetTreeNode): ResolvedGroup => {
    // A kind that doesn't nest draws each top-level set as ONE flat band, so a manual reorder spans the whole band instead of snapping back within a sub-set.
    if (!nests) return { key: node.id, kind: 'set', items: applySort(gathered(node), sorter) }
    const children = sub
      ? bucketBands(gathered(node), sub, sorter, placement, node.id)
      : (node.sets ?? []).map(band)
    return {
      key: node.id,
      kind: 'set',
      items: sub ? [] : applySort(bySet.get(node.id) ?? [], sorter),
      ...(children.length > 0 ? { children } : {}),
    }
  }
  return placeTail(setTree.map(band), bySet.get(undefined) ?? [], sorter, placement)
}

export function pruneGroups(
  groups: ResolvedGroup[],
  drops: (group: ResolvedGroup) => boolean,
): ResolvedGroup[] {
  return groups.flatMap((group) => {
    const { children: nested, ...band } = group
    const children = nested && pruneGroups(nested, drops)
    const pruned: ResolvedGroup = children?.length ? { ...band, children } : band
    return drops(pruned) ? [] : [pruned]
  })
}

/** A grouping and the column it reads, resolved once when the plan is made. */
export type Grouping<C extends SubGroupConfig = SubGroupConfig> = {
  config: C
  column: ResolvedColumn
}

export type GroupPlan = (
  | { kind: 'none' }
  | { kind: 'sets'; nests: boolean; sub: Grouping | undefined }
  | { kind: 'property'; group: Grouping<PropertyGroup> }
) & { locationSort: StructuralOrderMode | undefined }

// A Date grouping has no manual order, so one stored manual reads as configured.
function groupingOf<C extends SubGroupConfig>(
  config: C | undefined,
  schema: PropertyDefinition[],
): Grouping<C> | undefined {
  const def = config && schema.find((d) => d.id === config.property_id)
  if (!def || !groupable(def.type)) return undefined
  const byDate = def.type === 'dateTime'
  return {
    config:
      byDate && config.order_mode === 'manual' ? { ...config, order_mode: 'configured' } : config,
    column: propertyColumn(def),
  }
}

export function groupPlan(
  view: SavedView,
  schema: PropertyDefinition[],
  nests: boolean,
): GroupPlan {
  const { group, sub_group } = view
  const locationSort =
    !nests && view.sort?.[0]?.property_id === LOCATION_SORT
      ? viewOption(view, 'location_order_mode')
      : undefined
  if (group?.kind === 'flat') return { kind: 'none', locationSort }
  const grouped = group?.kind === 'property' ? groupingOf(group, schema) : undefined
  if (grouped) return { kind: 'property', group: grouped, locationSort }
  return {
    kind: 'sets',
    nests,
    sub: nests ? groupingOf(sub_group, schema) : undefined,
    locationSort,
  }
}

export const bucketGroupingOf = (plan: GroupPlan): Grouping | undefined =>
  plan.kind === 'property' ? plan.group : plan.kind === 'sets' ? plan.sub : undefined

export function setOrderOf(plan: GroupPlan, view: SavedView): StructuralOrderMode {
  switch (plan.kind) {
    case 'sets':
      return viewOption(view, 'structural_order_mode')
    case 'none':
      return plan.locationSort ?? 'custom'
    case 'property':
      return 'custom'
  }
}

export const pageOrderOf = (
  plan: GroupPlan,
  view: SavedView,
  sortKeys: number,
): StructuralOrderMode => (sortKeys > 0 ? 'custom' : (plan.locationSort ?? setOrderOf(plan, view)))

export const viewSetOrder = (plan: GroupPlan, view: SavedView): string[] | undefined =>
  setOrderOf(plan, view) === 'custom' ? view.group_order : undefined

export function resolveGroups(
  rows: ViewRow[],
  plan: GroupPlan,
  setTree: SetTreeNode[],
  sorter: Sorter | null,
  placement: EmptyPlacement,
): ResolvedGroup[] {
  switch (plan.kind) {
    case 'none':
      return plan.locationSort === 'location'
        ? placeTail(
            [],
            setBands(rows, setTree, { nests: false }, sorter, placement).flatMap((g) => g.items),
            null,
            placement,
          )
        : placeTail([], rows, sorter, placement)
    case 'property':
      return bucketBands(rows, plan.group, sorter, placement)
    case 'sets':
      return setBands(rows, setTree, plan, sorter, placement)
  }
}
