import { useEffect, useMemo, useRef } from 'react'
import { specOf } from '../../Properties/properties'
import { UNGROUPED, type ResolvedColumn, type ResolvedGroup, type ViewRow } from '../viewRow'
import type { CollectionNode, SetNode } from '../../Nexus/tree'
import type { ColumnStyle } from '../../Properties/columnStyles'
import type { PropertyValue } from '../../Properties/propertyValue'
import { assignValue, type ValueWriter } from '../../Properties/assignValue'
import type { Result } from '../../Contract/result'
import { useSession } from '../../Session/store'
import { useContentHost } from '../../Interface/contentHost'
import { useViewTileScope } from '../ViewTileScope'
import { useSaveView } from '../viewWrite'
import { contextOptionsFor } from '../../Contexts/contextOptions'
import { contextIdsOf } from '../../Contexts/contextIdentity'
import { type PickTarget, syntheticContextDef } from '../../Properties/Pickers/PropertyPicker'
import { resolveFieldValue } from '../../Properties/fieldValue'
import { useValueContext } from '../../Properties/valueContext'
import { hideShown, unhide } from '../visibilityModel'
import { bandModelOf } from '../Bands/bandModel'
import { containerSchema } from '../../Nexus/treePatch'
import {
  bucketGroupingOf,
  bucketKey,
  flattenContainer,
  groupPlan,
  pageOrderOf,
} from '../Pipeline/group'
import { resolveView } from '../Pipeline/resolveView'
import { searchGroups } from '../Pipeline/search'
import { matchKey, matchQuery } from '../../Paths/caseFold'
import { relDirname } from '../../Paths/posix'
import { resolvedSortCount } from '../Pipeline/sort'
import { useActiveView } from './useActiveView'
import { useBandHeads } from './useBandHeads'
import { patchOverride } from '../../Properties/valueOverride'
import { useContainerValues } from './useContainerValues'
import { columnStylePatch, styleFor } from './useColumnStyles'
import type { ViewPatch } from '../views'
import { groupKeyToValue, reassignable, reassignTarget } from '../reassign'
import { resolveColumn } from '../Pipeline/columns'

export type ViewHostApi = NonNullable<ReturnType<typeof useViewHost>>

const NO_COLLAPSE = new Set<string>()

export function useViewHost(source: CollectionNode | SetNode, nests: boolean) {
  const tree = useSession((s) => s.tree)
  const openTarget = useSession((s) => s.openTarget)
  const mutate = useSession((s) => s.mutate)
  const saveView = useSaveView(source)
  const tile = useViewTileScope()
  const host = useContentHost()
  const query = useSession((s) => (tile || !host ? undefined : s.viewSearch[host.tabId]?.query))
  const needle = matchQuery(query ?? '')
  const searching = needle !== ''

  const { values, effectiveValues, setValueOverride } = useContainerValues(source.path)

  const schema = useMemo(() => containerSchema(tree, source), [tree, source])
  const view = useActiveView(source)

  const collapsed = useMemo(() => new Set(view.collapsed_groups ?? []), [view.collapsed_groups])

  const contextIds = contextIdsOf(tree)
  const plan = useMemo(() => groupPlan(view, schema, nests), [view, schema, nests])
  const sortKeys = useMemo(
    () => resolvedSortCount(view.sort, schema, contextIds),
    [view.sort, schema, contextIds],
  )
  const pageOrder = pageOrderOf(plan, view, sortKeys)
  const grouping = bucketGroupingOf(plan)
  const groupPropId = grouping?.config.property_id
  const { painted, sets, nexus, heads } = useBandHeads(source, grouping, view)
  const groupPropType = grouping?.column.type
  const canReassign = reassignable(groupPropType)
  const canRelocate = plan.kind === 'sets' && plan.sub === undefined
  const manualOrder = pageOrder === 'location' ? undefined : view.manual_order
  const dragDisabled = searching || sortKeys >= 2
  const crossBand = !dragDisabled && (canReassign || canRelocate)

  const pageMetadata = tree?.config.pageMetadata
  const {
    columns,
    groups: resolvedGroups,
    rows,
  } = useMemo(() => {
    const { rows, setTree } = flattenContainer(painted, effectiveValues, pageMetadata ?? {})
    return {
      ...resolveView({ rows, setTree, view, schema, plan, manualOrder, contextIds }),
      rows,
    }
  }, [painted, effectiveValues, pageMetadata, view, schema, plan, manualOrder, contextIds])
  // Every shown column's style, resolved once per pass; the table, the cards, and the pickers read it.
  const styleById = useMemo(
    () => new Map(columns.map((c) => [c.id, styleFor(c, view, nexus)])),
    [columns, view, nexus],
  )
  // A row's place is the Set chain below the source: every row shares the source's own name, which would otherwise keep them all.
  const keys = useMemo(
    () =>
      searching
        ? new Map(
            rows.map((r) => [
              r.id,
              matchKey(r.title, relDirname(r.path).slice(source.path.length + 1)),
            ]),
          )
        : null,
    [rows, searching, source.path],
  )
  const groups = useMemo(
    () => (keys ? searchGroups(resolvedGroups, needle, keys) : resolvedGroups),
    [resolvedGroups, needle, keys],
  )
  const shownCollapsed = searching ? NO_COLLAPSE : collapsed
  // A single-sorted view lays its rows out in value RUNS, so a reorder landing one strictly inside another run rewrites the sorted property. Armed only when the column is shown — an unrendered property leaves the run boundaries unreadable.
  const sortReassign = useMemo(() => {
    if (groupPropId !== undefined || sortKeys !== 1) return undefined
    for (const c of view.sort ?? []) {
      const column = columns.find((col) => col.id === c.property_id)
      if (column && reassignable(column.type)) return column
    }
    return undefined
  }, [groupPropId, sortKeys, view.sort, columns])

  const ctx = useValueContext(tree, schema)
  const bands = useMemo(() => bandModelOf(groups, heads), [groups, heads])
  const { rowById, rowBand, paintOrder } = useMemo(() => {
    const byId = new Map<string, ViewRow>()
    const band = new Map<string, string>()
    const ordered: { id: string; groupKey: string }[] = []
    const walk = (gs: ResolvedGroup[]): void => {
      for (const g of gs) {
        for (const r of g.items) {
          byId.set(r.id, r)
          band.set(r.id, g.key)
          ordered.push({ id: r.id, groupKey: g.key })
        }
        if (g.children) walk(g.children)
      }
    }
    walk(groups)
    return { rowById: byId, rowBand: band, paintOrder: ordered }
  }, [groups])

  const persistView = (
    patch: ViewPatch,
    opts?: { viewState?: boolean },
  ): Promise<Result<{ id: string }>> => saveView(view, patch, opts)
  const toggleCollapse = (key: string): void => {
    if (searching) return
    const next = new Set(collapsed)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    void persistView({ collapsed_groups: next.size ? [...next] : undefined }, { viewState: true })
  }
  const setStylePatch = (
    column: ResolvedColumn,
    key: keyof ColumnStyle & string,
    value: string,
  ): void => void persistView(columnStylePatch(view, column, nexus, { [key]: value }))
  const viewRootRef = useRef<HTMLElement | null>(null)
  const revealingRef = useRef<Set<string>>(new Set())
  const revealProperty = (id: string): void => {
    if (revealingRef.current.has(id)) return
    if (view.property_order.includes(id) && !view.hidden_properties.includes(id)) return
    revealingRef.current.add(id)
    void persistView(unhide(view, id)).finally(() => revealingRef.current.delete(id))
  }
  const hideProperty = (id: string): void => {
    if (view.hidden_properties.includes(id)) return
    void persistView(hideShown(view, id))
  }

  const writer = useRef<ValueWriter | null>(null)
  useEffect(() => {
    writer.current = {
      mutate,
      rowOf: (id) => rows.find((r) => r.id === id),
      apply: (id, picked, write) => patchOverride(setValueOverride, id, picked, write),
    }
    return () => {
      writer.current = null
    }
  })
  const commitValue = (
    row: ViewRow,
    column: ResolvedColumn,
    value: PropertyValue | null,
  ): Promise<boolean> | undefined => assignValue(writer, row, column, value)
  const commitGroupValue = (
    pageId: string,
    propertyId: string,
    groupKey: string,
  ): Promise<boolean> | undefined => {
    const row = rowById.get(pageId)
    const column = resolveColumn(propertyId, schema, contextIds)
    return row && column && commitValue(row, column, groupKeyToValue(groupKey, column.type))
  }
  const reassignBySortRun = (orderIds: string[], bandKey: string, activeId: string): void => {
    if (!sortReassign) return
    const keyOf = (id: string): string => {
      const row = rowById.get(id)
      return (row ? bucketKey(row, sortReassign, 'day') : null) ?? UNGROUPED
    }
    const band = orderIds.filter((id) => rowBand.get(id) === bandKey)
    const target = reassignTarget(band, activeId, keyOf)
    if (target === undefined) return
    commitGroupValue(activeId, sortReassign.id, target)
  }
  const styleOf = (column: ResolvedColumn): ColumnStyle =>
    styleById.get(column.id) ?? styleFor(column, view, nexus)
  const pickTarget = (row: ViewRow, column: ResolvedColumn): PickTarget => {
    const def = column.def ?? syntheticContextDef(column.id)
    const current = resolveFieldValue(row, column)
    const style = styleOf(column)
    const spec = specOf(column.type)
    if (spec?.kind === 'dateTime' && spec.origin === 'user')
      return {
        kind: 'dateTime',
        def,
        current,
        dateFormat: style.date_format,
        timeFormat: style.time_format,
      }
    if (column.type === 'file') return { kind: 'file', def, current }
    return {
      kind: 'options',
      def,
      current,
      style: { current: style, set: (key, value) => setStylePatch(column, key, value) },
      contextOptions:
        column.kind === 'context' && tree ? contextOptionsFor(column.id, tree) : undefined,
    }
  }

  if (!ctx || !tree) return null
  return {
    source: painted,
    schema,
    view,
    plan,
    nests,
    columns,
    groups,
    rows,
    ctx,
    contextIds,
    sets,
    bands,
    rowById,
    rowBand,
    paintOrder,
    collapsed: shownCollapsed,
    toggleCollapse,
    groupPropId,
    groupPropType,
    canReassign,
    canRelocate,
    crossBand,
    reassignBySortRun,
    sortKeys,
    pageOrder,
    dragDisabled,
    searching,
    setStylePatch,
    styleById,
    hideProperty,
    revealProperty,
    persistView,
    commitValue,
    commitGroupValue,
    pickTarget,
    styleOf,
    mutate,
    openTarget,
    tree,
    values,
    effectiveValues,
    setValueOverride,
    viewRootRef,
  }
}
