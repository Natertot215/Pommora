// The setTree is node.sets itself (the real folder walk), so empty Sets still appear as disclosure groups and a Collection and a Set container flow through the identical structural path.

import type { CollectionNode, PageNode, SetNode } from '../../Nexus/tree'
import {
  type PageValues,
  type ResolvedColumn,
  type ResolvedGroup,
  type RowValues,
  type ViewRow,
  UNGROUPED,
  isEmptyBand,
} from '../viewRow'
import {
  bandKey,
  type DateGranularity,
  type DateSeparator,
  type EmptyPlacement,
  type GroupConfig,
  granularityOf,
  isBucketHidden,
  LOCATION_SORT,
  type SavedView,
  type StructuralOrderMode,
  type SubGroupConfig,
  viewOption,
} from '../views'
import { ID_KEY } from '../../Nexus/identityMark'
import type { PageFrontmatter, PageMeta } from '../../Nexus/schemas'
import { optionIds, type PropertyDefinition } from '../../Properties/properties'
import { resolveFieldValue } from '../../Properties/fieldValue'
import { propertyColumn } from './columns'
import { dateFmt, formatDate, NUMERIC_FORMATS } from '../../Properties/formatValue'
import { groupable, VALUE_KINDS } from '../valueKinds'
import type { DateFormat } from '../../Properties/columnStyles'
import { resolveRowOrder } from '@pommora/uix/Utilities/moveItem'
import type { SetIndex } from './setIndex'

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

export function dropHiddenGroups(
  groups: ResolvedGroup[],
  hidden: ReadonlySet<string>,
  plan: GroupPlan,
): ResolvedGroup[] {
  const top = plan.kind === 'property' ? plan.group.config.property_id : undefined
  const sub = plan.kind === 'sets' ? plan.sub?.config.property_id : undefined
  return groups.flatMap((group) => {
    if (group.kind === 'bucket' && top && isBucketHidden(hidden, 'group', top, group.value))
      return []
    const { children: nested, ...band } = group
    const children = nested?.filter(
      (c) => c.kind !== 'bucket' || !sub || !isBucketHidden(hidden, 'sub', sub, c.value),
    )
    return [children?.length ? { ...band, children } : band]
  })
}

export const frontmatterOf = (
  values: Record<string, PageValues>,
  pageId: string,
): PageFrontmatter => values[pageId]?.frontmatter ?? { [ID_KEY]: pageId }

export function toRow(
  page: PageNode,
  parentSetId: string | undefined,
  values: Record<string, RowValues>,
  pageMetadata: Record<string, PageMeta>,
): ViewRow {
  const v = values[page.id]
  return {
    id: page.id,
    title: page.title,
    icon: pageMetadata[page.id]?.icon,
    path: page.path,
    ...(parentSetId !== undefined ? { parentSetId } : {}),
    frontmatter: frontmatterOf(values, page.id),
    createdAt: v?.createdAt ?? null,
    modifiedAt: v?.modifiedAt ?? null,
    ...(page.contextValues !== undefined ? { contextValues: page.contextValues } : {}),
    ...(v?.picked ? { picked: v.picked } : {}),
  }
}

export function flattenContainer(
  node: CollectionNode | SetNode,
  valuesByPageId: Record<string, RowValues>,
  pageMetadata: Record<string, PageMeta>,
): { rows: ViewRow[]; setTree: SetTreeNode[] } {
  const rows: ViewRow[] = []
  const walk = (container: CollectionNode | SetNode, parentSetId: string | undefined): void => {
    for (const p of container.pages) rows.push(toRow(p, parentSetId, valuesByPageId, pageMetadata))
    for (const child of container.sets ?? []) walk(child, child.id)
  }
  walk(node, undefined)
  return { rows, setTree: node.sets ?? [] }
}

export function formatBucketLabel(
  key: string,
  granularity: DateGranularity,
  dateFormat: DateFormat,
  separator: DateSeparator,
): string {
  const numeric = NUMERIC_FORMATS.has(dateFormat)
  const sep = separator === 'slash' ? '/' : '-'
  switch (granularity) {
    case 'year':
      return key
    case 'week': {
      const m = /^(\d{4})-W(\d{2})$/.exec(key)
      if (!m) return key
      return numeric ? `W${m[2]}${sep}${m[1]}` : `Week ${Number(m[2])}, ${m[1]}`
    }
    case 'month': {
      const m = /^(\d{4})-(\d{2})$/.exec(key)
      if (!m) return key
      if (numeric) return `${m[2]}${sep}${m[1]}`
      const month = dateFmt({ month: 'long' }).format(new Date(`${key}-01T00:00:00`))
      return `${month} ${m[1]}`
    }
    case 'day': {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return key
      const out = formatDate(key, dateFormat, 'none')
      return numeric && separator === 'dash' ? out.replaceAll('/', '-') : out
    }
  }
}

export function bucketKey(
  row: ViewRow,
  column: ResolvedColumn,
  granularity: DateGranularity,
): string | null {
  const v = resolveFieldValue(row, column)
  return v.kind === 'null' ? null : (VALUE_KINDS[v.kind].bucket?.(v, granularity) ?? null)
}

function schemaOptionOrder(def: PropertyDefinition | undefined): string[] | null {
  if (!def) return null
  const values = optionIds(def)
  return values.length ? values : null
}

const appendTail = (base: string[], present: Set<string>): string[] => [
  ...base,
  ...[...present].filter((k) => !base.includes(k)).sort(),
]

function configuredOrder(def: PropertyDefinition | undefined, present: Set<string>): string[] {
  const schemaOrder = schemaOptionOrder(def)
  if (schemaOrder) return appendTail(schemaOrder, present)
  return [...present].sort()
}

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
  const configured = configuredOrder(def, present)
  return group.order_mode === 'reversed' ? [...configured].reverse() : configured
}

function property(
  rows: ViewRow[],
  { config: group, column }: Grouping<PropertyGroup>,
  sorter: Sorter | null,
  placement: EmptyPlacement,
): ResolvedGroup[] {
  const { def } = column
  const granularity = granularityOf(group)

  const byBucket = groupRows(rows, (r) => bucketKey(r, column, granularity))
  const noValue = byBucket.get(null) ?? []
  byBucket.delete(null)
  const buckets = byBucket as Map<string, ViewRow[]>

  const groups: ResolvedGroup[] = []
  // Only a LIVE option earns an empty band: a stale manual-order entry (a deleted option, an old date bucket snapshotted by a band drag) must never render a ghost band.
  const live = new Set(schemaOptionOrder(def) ?? [])
  for (const bucket of liveBucketOrder(group, def, buckets.keys())) {
    const items = buckets.get(bucket) ?? []
    if (items.length === 0 && !live.has(bucket)) continue
    const key = bandKey(group.property_id, bucket)
    groups.push({ key, kind: 'bucket', value: bucket, items: applySort(items, sorter) })
  }
  // No "None" band: value-less rows are a flattened, header-less tail placed by the VIEW-level knob — it holds rows, so hide_empty_groups never touches it.
  return placeTail(groups, noValue, sorter, placement)
}

function structural(
  rows: ViewRow[],
  setTree: SetTreeNode[],
  sorter: Sorter | null,
  placement: EmptyPlacement,
): ResolvedGroup[] {
  const bySet = groupRows(rows, (r) => r.parentSetId)
  const rootRows = bySet.get(undefined) ?? []
  const build = (node: SetTreeNode): ResolvedGroup => {
    const children = (node.sets ?? []).map(build)
    return {
      key: node.id,
      kind: 'set',
      items: applySort(bySet.get(node.id) ?? [], sorter),
      ...(children.length > 0 ? { children } : {}),
    }
  }
  const groups = setTree.map(build)
  return placeTail(groups, rootRows, sorter, placement)
}

/** Cards never indent: each top-level set is ONE flat band, so a manual reorder spans the whole band instead of snapping back within a sub-set. */
function structuralFlat(
  rows: ViewRow[],
  setTree: SetTreeNode[],
  sorter: Sorter | null,
  placement: EmptyPlacement,
): ResolvedGroup[] {
  const byParent = groupRows(rows, (r) => r.parentSetId)
  const rootRows = byParent.get(undefined) ?? []
  const groups: ResolvedGroup[] = setTree.map((node) => ({
    key: node.id,
    kind: 'set',
    items: applySort(
      subtreeIds(node).flatMap((id) => byParent.get(id) ?? []),
      sorter,
    ),
  }))
  return placeTail(groups, rootRows, sorter, placement)
}

function locationFlat(
  rows: ViewRow[],
  setTree: SetTreeNode[],
  sorter: Sorter | null,
  placement: EmptyPlacement,
): ResolvedGroup[] {
  const bands = structuralFlat(rows, setTree, sorter, placement)
  return [{ key: UNGROUPED, kind: 'tail', items: bands.flatMap((g) => g.items) }]
}

function structuralSubGrouped(
  rows: ViewRow[],
  setTree: SetTreeNode[],
  { config: sub, column }: Grouping,
  sorter: Sorter | null,
  placement: EmptyPlacement,
): ResolvedGroup[] {
  const { def } = column
  const granularity = granularityOf(sub)
  const byParent = groupRows(rows, (r) => r.parentSetId)
  const rootRows = byParent.get(undefined) ?? []

  const groups: ResolvedGroup[] = setTree.map((node) => {
    const pages = subtreeIds(node).flatMap((id) => byParent.get(id) ?? [])
    const byBucket = groupRows(pages, (r) => bucketKey(r, column, granularity))
    const noValue = byBucket.get(null) ?? []
    byBucket.delete(null)
    const buckets = byBucket as Map<string, ViewRow[]>

    let children = bucketOrder(sub, def, new Set(buckets.keys())).flatMap((b): ResolvedGroup[] => {
      const items = buckets.get(b)
      if (!items) return []
      const key = bandKey(sub.property_id, b, node.id)
      return [{ key, kind: 'bucket', value: b, items: applySort(items, sorter) }]
    })
    const tail = bandKey(sub.property_id, UNGROUPED, node.id)
    children = placeTail(children, noValue, sorter, placement, tail)
    return {
      key: node.id,
      kind: 'set',
      items: [],
      ...(children.length > 0 ? { children } : {}),
    }
  })
  return placeTail(groups, rootRows, sorter, placement)
}

/** Compose bucket-first so a set whose sub-buckets all emptied goes with them. */
export function pruneEmptyBuckets(groups: ResolvedGroup[]): ResolvedGroup[] {
  return groups.flatMap((group) => {
    const { children: nested, ...band } = group
    const children = nested ? pruneEmptyBuckets(nested) : undefined
    if (group.kind === 'bucket' && isEmptyBand({ ...band, children })) return []
    return [children?.length ? { ...band, children } : band]
  })
}

export function pruneEmptyGroups(groups: ResolvedGroup[]): ResolvedGroup[] {
  return groups.flatMap((group): ResolvedGroup[] => {
    if (group.kind !== 'set') return [group]
    const { children: nested, ...band } = group
    const children = nested ? pruneEmptyGroups(nested) : []
    if (isEmptyBand({ ...band, children })) return []
    return [children.length > 0 ? { ...band, children } : band]
  })
}

function flat(rows: ViewRow[], sorter: Sorter | null): ResolvedGroup[] {
  if (rows.length === 0) return []
  return [{ key: UNGROUPED, kind: 'tail', items: applySort(rows, sorter) }]
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

export const orderedChildren = (
  sets: SetIndex,
  parentKey: string | null,
  plan: GroupPlan,
  view: SavedView,
): string[] =>
  resolveRowOrder(sets.children.get(parentKey) ?? [], (id) => id, viewSetOrder(plan, view))

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
        ? locationFlat(rows, setTree, sorter, placement)
        : flat(rows, sorter)
    case 'property':
      return property(rows, plan.group, sorter, placement)
    case 'sets':
      if (!plan.nests) return structuralFlat(rows, setTree, sorter, placement)
      return plan.sub
        ? structuralSubGrouped(rows, setTree, plan.sub, sorter, placement)
        : structural(rows, setTree, sorter, placement)
  }
}
