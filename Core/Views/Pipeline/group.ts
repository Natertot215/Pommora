// The setTree is built from node.sets (the real folder walk), so empty Sets still appear as disclosure groups and a Collection and a Set container flow through the identical structural path.

import type { CollectionNode, PageNode, SetNode } from '@pommora/core/Nexus/tree'
import type { PageValues, ResolvedGroup, RowValues, ViewRow } from '@pommora/core/Views/viewRow'
import {
  type DateGranularity,
  type EmptyPlacement,
  type GroupConfig,
  type GroupedView,
  granularityOf,
  isBucketHidden,
  type SubGroupConfig,
} from '@pommora/core/Views/views'
import { ID_KEY } from '@pommora/core/Nexus/identityMark'
import { localDayKey, pad } from '@pommora/uix/Utilities/pad'
import type { PageFrontmatter, PageMeta } from '@pommora/core/Nexus/schemas'
import {
  groupable,
  optionValues,
  type PropertyDefinition,
} from '@pommora/core/Properties/properties'
import { UNGROUPED, isEmptyBand } from '@pommora/core/Views/viewRow'
import { declaredType, resolveFieldValue } from '../../Properties/value'
import { readDate } from '../../Properties/formatValue'

type PropertyGroup = Extract<GroupConfig, { kind: 'property' }>
type Sorter = (rows: ViewRow[]) => ViewRow[]

export interface SetTreeNode {
  id: string
  children: SetTreeNode[]
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
  const band: ResolvedGroup = { key, kind: 'ungrouped', items: applySort(tail, sorter) }
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

export function buildSetTree(sets: SetNode[] | undefined): SetTreeNode[] {
  return (sets ?? []).map((s) => ({ id: s.id, children: buildSetTree(s.sets) }))
}

export function subtreeIds(node: SetTreeNode): string[] {
  return [node.id, ...node.children.flatMap(subtreeIds)]
}

/** Hidden-set prune, ahead of resolution: a hidden node leaves with its whole subtree, so every structural path excludes its pages by construction. */
export function pruneHiddenSets(tree: SetTreeNode[], hidden: ReadonlySet<string>): SetTreeNode[] {
  return tree.flatMap((node) =>
    hidden.has(node.id) ? [] : [{ id: node.id, children: pruneHiddenSets(node.children, hidden) }],
  )
}

export function dropHiddenGroups(
  groups: ResolvedGroup[],
  hidden: ReadonlySet<string>,
  view: GroupedView,
): ResolvedGroup[] {
  const top = view.group?.kind === 'property' ? view.group.property_id : undefined
  const sub = view.sub_group?.property_id
  return groups.flatMap((group) => {
    if (
      group.kind === 'property' &&
      top &&
      isBucketHidden(view, hidden, 'group', top, group.bucket ?? group.key)
    )
      return []
    const { children: nested, ...band } = group
    const children = nested?.filter(
      (c) =>
        c.kind !== 'property' ||
        !sub ||
        !isBucketHidden(view, hidden, 'sub', sub, c.bucket ?? c.key),
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
  const contextValues = v?.contextValues
    ? { ...page.contextValues, ...v.contextValues }
    : page.contextValues
  return {
    id: page.id,
    title: page.title,
    icon: pageMetadata[page.id]?.icon,
    path: page.path,
    ...(parentSetId !== undefined ? { parentSetId } : {}),
    frontmatter: frontmatterOf(values, page.id),
    createdAt: v?.createdAt ?? null,
    modifiedAt: v?.modifiedAt ?? null,
    ...(contextValues !== undefined ? { contextValues } : {}),
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
  return { rows, setTree: buildSetTree(node.sets) }
}

/** UTC arithmetic, so adding days never crosses a DST boundary. A week belongs to the year of its Thursday; weeks start Monday. */
function isoWeek(year: number, month: number, day: number): [year: number, week: number] {
  const d = new Date(Date.UTC(year, month, day))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7)
  return [d.getUTCFullYear(), week]
}

/** Zero-padded so lexicographic order IS chronological. Buckets by the local day the cell shows, so a date-only value keeps the day the user picked. */
export function dateBucketKey(iso: string, granularity: DateGranularity): string | null {
  const d = readDate(iso)?.at
  if (!d) return null
  const year = d.getFullYear()
  const month = d.getMonth()
  const day = d.getDate()
  switch (granularity) {
    case 'year':
      return pad(year, 4)
    case 'month':
      return `${pad(year, 4)}-${pad(month + 1, 2)}`
    case 'day':
      return localDayKey(d)
    case 'week': {
      const [wy, w] = isoWeek(year, month, day)
      return `${pad(wy, 4)}-W${pad(w, 2)}`
    }
  }
}

export function bucketKey(
  row: ViewRow,
  propertyId: string,
  schema: PropertyDefinition[],
  granularity: DateGranularity,
): string | null {
  const v = resolveFieldValue(row, propertyId, schema)
  switch (v.kind) {
    case 'select':
      return v.value
    case 'checkbox':
      return 'true'
    case 'dateTime':
      return dateBucketKey(v.value, granularity)
    case 'number':
    case 'multiSelect':
    case 'context':
    case 'link':
    case 'file':
    case 'null':
      return null
  }
}

function schemaOptionOrder(def: PropertyDefinition | undefined): string[] | null {
  if (!def) return null
  const values = optionValues(def)
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
  group: PropertyGroup,
  schema: PropertyDefinition[],
  sorter: Sorter | null,
  placement: EmptyPlacement,
): ResolvedGroup[] {
  const def = schema.find((d) => d.id === group.property_id)
  const granularity = granularityOf(group)

  const byBucket = groupRows(rows, (r) => bucketKey(r, group.property_id, schema, granularity))
  const noValue = byBucket.get(null) ?? []
  byBucket.delete(null)
  const buckets = byBucket as Map<string, ViewRow[]>

  const groups: ResolvedGroup[] = []
  // Only LIVE schema keys earn an empty band: a stale manual-order key (a deleted option, an old date bucket snapshotted by a band drag) must never render a ghost band.
  const liveKeys = new Set(schemaOptionOrder(def) ?? [])
  for (const key of bucketOrder(group, def, new Set(buckets.keys()))) {
    const items = buckets.get(key) ?? []
    if (items.length === 0 && !liveKeys.has(key)) continue
    groups.push({
      key,
      kind: 'property',
      items: applySort(items, sorter),
    })
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
    const children = node.children.map(build)
    return {
      key: node.id,
      kind: 'structural-set',
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
    kind: 'structural-set',
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
  return [{ key: UNGROUPED, kind: 'ungrouped', items: bands.flatMap((g) => g.items) }]
}

/** Set ids are ULIDs, never containing `/`, so one set's collapse never bleeds into its twin bucket in another set. */
export const subGroupKey = (setId: string, bucket: string): string => `${setId}/${bucket}`

function structuralSubGrouped(
  rows: ViewRow[],
  setTree: SetTreeNode[],
  sub: SubGroupConfig,
  schema: PropertyDefinition[],
  sorter: Sorter | null,
  placement: EmptyPlacement,
): ResolvedGroup[] {
  const def = schema.find((d) => d.id === sub.property_id)
  const granularity = granularityOf(sub)
  const byParent = groupRows(rows, (r) => r.parentSetId)
  const rootRows = byParent.get(undefined) ?? []

  const groups: ResolvedGroup[] = setTree.map((node) => {
    const pages = subtreeIds(node).flatMap((id) => byParent.get(id) ?? [])
    const byBucket = groupRows(pages, (r) => bucketKey(r, sub.property_id, schema, granularity))
    const noValue = byBucket.get(null) ?? []
    byBucket.delete(null)
    const buckets = byBucket as Map<string, ViewRow[]>

    let children = bucketOrder(sub, def, new Set(buckets.keys())).flatMap((b): ResolvedGroup[] => {
      const items = buckets.get(b)
      if (!items) return []
      const key = subGroupKey(node.id, b)
      return [
        {
          key,
          bucket: b,
          kind: 'property',
          items: applySort(items, sorter),
        },
      ]
    })
    children = placeTail(children, noValue, sorter, placement, subGroupKey(node.id, UNGROUPED))
    return {
      key: node.id,
      kind: 'structural-set',
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
    if (group.kind === 'property' && isEmptyBand({ ...band, children })) return []
    return [children?.length ? { ...band, children } : band]
  })
}

export function pruneEmptyGroups(groups: ResolvedGroup[]): ResolvedGroup[] {
  return groups.flatMap((group) => {
    if (group.kind !== 'structural-set') return [group]
    const { children: nested, ...band } = group
    const children = nested ? pruneEmptyGroups(nested) : []
    if (isEmptyBand({ ...band, children })) return []
    return [children.length > 0 ? { ...band, children } : band]
  })
}

function flat(rows: ViewRow[], sorter: Sorter | null): ResolvedGroup[] {
  if (rows.length === 0) return []
  return [{ key: UNGROUPED, kind: 'ungrouped', items: applySort(rows, sorter) }]
}

/** Every consumer must read this, never the raw `kind`, or they diverge from what the table actually draws. */
export function groupsStructurally(
  group: GroupConfig | undefined,
  schema: PropertyDefinition[],
): boolean {
  if (group?.kind === 'flat') return false
  if (group?.kind !== 'property') return true
  return !groupable(declaredType(group.property_id, schema))
}

/** The sub-group the engine draws inside Set bands: a view grouped by Set, sub-grouped by a groupable property. */
export function drawnSubGroup(
  view: { group?: GroupConfig; sub_group?: SubGroupConfig },
  schema: PropertyDefinition[],
): SubGroupConfig | undefined {
  const { group, sub_group } = view
  return groupsStructurally(group, schema) &&
    sub_group &&
    groupable(declaredType(sub_group.property_id, schema))
    ? sub_group
    : undefined
}

/** The grouping a view's property bands follow: its property group when the engine draws it, else the sub-group it draws inside Set bands. */
export function bandGrouping(
  view: { group?: GroupConfig; sub_group?: SubGroupConfig },
  schema: PropertyDefinition[],
): PropertyGroup | SubGroupConfig | undefined {
  const { group } = view
  return group?.kind === 'property' && !groupsStructurally(group, schema)
    ? group
    : drawnSubGroup(view, schema)
}

export function resolveGroups(
  rows: ViewRow[],
  group: GroupConfig | undefined,
  schema: PropertyDefinition[],
  setTree: SetTreeNode[],
  sorter: Sorter | null,
  placement: EmptyPlacement,
  subGroup?: SubGroupConfig,
  flattenStructural = false,
  locationFlatten = false,
): ResolvedGroup[] {
  // Sort by Location forces structural resolution and flattens every band into one — it wins over a property group.
  if (locationFlatten) return locationFlat(rows, setTree, sorter, placement)
  if (group?.kind === 'flat') return flat(rows, sorter)
  if (!groupsStructurally(group, schema))
    return property(rows, group as PropertyGroup, schema, sorter, placement)
  if (flattenStructural) return structuralFlat(rows, setTree, sorter, placement)
  const drawn = drawnSubGroup({ group, sub_group: subGroup }, schema)
  if (drawn) return structuralSubGrouped(rows, setTree, drawn, schema, sorter, placement)
  return structural(rows, setTree, sorter, placement)
}
