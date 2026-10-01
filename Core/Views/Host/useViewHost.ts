import { useEffect, useMemo, useRef } from 'react'
import { type PropertyType, specOf } from '../../Properties/properties'
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
import { contextIdsOf, identityOf } from '../../Contexts/contextIdentity'
import { type PickTarget, syntheticContextDef } from '../../Properties/Pickers/PropertyPicker'
import { declaredType, resolveFieldValue } from '../../Properties/value'
import { buildValueContext } from '../../Properties/valueContext'
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
import { foldKey } from '../../Paths/caseFold'
import { resolvedSortCount } from '../Pipeline/sort'
import { useActiveView } from './useActiveView'
import { useBandHeads } from './useBandHeads'
import { patchOverride } from '../../Properties/valueOverride'
import { useContainerValues } from './useContainerValues'
import { pickedStyle, styleFor } from './useColumnStyles'
import type { ViewPatch } from '../views'
import { groupKeyToValue, reassignable, reassignTarget } from '../reassign'

export type ViewHostApi = NonNullable<ReturnType<typeof useViewHost>>

const NO_COLLAPSE = new Set<string>()

export function useViewHost(source: CollectionNode | SetNode, nests: boolean) {
  const tree = useSession((s) => s.tree)
  const assetMap = useSession((s) => s.assetMap)
  const select = useSession((s) => s.select)
  const mutate = useSession((s) => s.mutate)
  const saveView = useSaveView(source)
  const tile = useViewTileScope()
  const host = useContentHost()
  const query = useSession((s) => (tile || !host ? undefined : s.viewSearch[host.tabId]?.query))
  const needle = foldKey(query?.trim() ?? '')
  const searching = needle !== ''

  const { values, effectiveValues, setValueOverride } = useContainerValues(source.path)

  const schema = useMemo(() => containerSchema(tree, source), [tree, source])
  const view = useActiveView(source, schema)

  const collapsed = useMemo(() => new Set(view.collapsed_groups ?? []), [view.collapsed_groups])

  const plan = useMemo(() => groupPlan(view, schema, nests), [view, schema, nests])
  const sortKeys = useMemo(() => resolvedSortCount(view.sort, schema), [view.sort, schema])
  const pageOrder = pageOrderOf(plan, view, sortKeys)
  const bucketGroup = bucketGroupingOf(plan)
  const groupPropId = bucketGroup?.property_id
  const { painted, sets, nexus, heads } = useBandHeads(source, bucketGroup, schema, view)
  const groupPropType = groupPropId ? declaredType(groupPropId, schema) : undefined
  const canReassign = reassignable(groupPropType)
  const canRelocate = plan.kind === 'sets' && plan.sub === undefined
  const manualOrder = pageOrder === 'location' ? undefined : view.manual_order
  const dragDisabled = searching || sortKeys >= 2
  const crossBand = !dragDisabled && (canReassign || canRelocate)

  const contextIds = contextIdsOf(tree)
  const {
    columns,
    groups: resolvedGroups,
    rows,
  } = useMemo(() => {
    const { rows, setTree } = flattenContainer(
      painted,
      effectiveValues,
      tree?.config.pageMetadata ?? {},
    )
    return {
      ...resolveView({ rows, setTree, view, schema, plan, manualOrder, contextIds }),
      rows,
    }
  }, [
    painted,
    effectiveValues,
    tree?.config.pageMetadata,
    view,
    schema,
    plan,
    manualOrder,
    contextIds,
  ])
  const titles = useMemo(
    () => (searching ? new Map(rows.map((r) => [r.id, foldKey(r.title)])) : null),
    [rows, searching],
  )
  const groups = useMemo(
    () => (titles ? searchGroups(resolvedGroups, needle, titles) : resolvedGroups),
    [resolvedGroups, needle, titles],
  )
  const shownCollapsed = searching ? NO_COLLAPSE : collapsed
  // A single-sorted view lays its rows out in value RUNS, so a reorder landing one strictly inside another run rewrites the sorted property. Armed only when the column is shown — an unrendered property leaves the run boundaries unreadable.
  const sortReassign = useMemo(() => {
    if (groupPropId !== undefined || sortKeys !== 1) return undefined
    for (const c of view.sort ?? []) {
      const type = declaredType(c.property_id, schema)
      if (!reassignable(type)) continue
      if (columns.some((col) => col.id === c.property_id))
        return { propertyId: c.property_id, type }
    }
    return undefined
  }, [groupPropId, sortKeys, view.sort, schema, columns])

  const identity = tree && identityOf(tree)
  const ctx = useMemo(
    () => (identity ? buildValueContext(identity, schema, assetMap) : null),
    [identity, schema, assetMap],
  )
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
  const setStylePatch = (colId: string, key: keyof ColumnStyle & string, value: string): void => {
    void persistView({
      column_styles: {
        [colId]: {
          ...view.column_styles?.[colId],
          [key]: pickedStyle(colId, schema, nexus, key, value),
        },
      },
    })
  }
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
      schema,
      mutate,
      rowOf: (id) => rows.find((r) => r.id === id),
      apply: (id, fm, write, contexts) => patchOverride(setValueOverride, id, fm, write, contexts),
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
    type: PropertyType | 'title' | undefined,
    groupKey: string,
  ): Promise<boolean> | undefined => {
    const row = rowById.get(pageId)
    return (
      row && commitValue(row, { id: propertyId, kind: 'property' }, groupKeyToValue(groupKey, type))
    )
  }
  const reassignBySortRun = (orderIds: string[], bandKey: string, activeId: string): void => {
    if (!sortReassign) return
    const keyOf = (id: string): string => {
      const row = rowById.get(id)
      return (row ? bucketKey(row, sortReassign.propertyId, schema, 'day') : null) ?? UNGROUPED
    }
    const band = orderIds.filter((id) => rowBand.get(id) === bandKey)
    const target = reassignTarget(band, activeId, keyOf)
    if (target === undefined) return
    commitGroupValue(activeId, sortReassign.propertyId, sortReassign.type, target)
  }
  const styleOf = (columnId: string): ColumnStyle => styleFor(columnId, schema, view, nexus)
  const pickTarget = (row: ViewRow, column: ResolvedColumn): PickTarget => {
    const def = schema.find((d) => d.id === column.id) ?? syntheticContextDef(column.id)
    const current = resolveFieldValue(row, column.id, schema)
    const style = styleOf(column.id)
    const type = declaredType(column.id, schema, contextIds)
    const spec = specOf(type)
    if (spec?.kind === 'dateTime' && spec.origin === 'user')
      return {
        kind: 'dateTime',
        def,
        current,
        dateFormat: style.date_format,
        timeFormat: style.time_format,
      }
    if (type === 'file') return { kind: 'file', def, current }
    return {
      kind: 'options',
      def,
      current,
      look: style.look,
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
    hideProperty,
    revealProperty,
    persistView,
    commitValue,
    commitGroupValue,
    pickTarget,
    styleOf,
    mutate,
    select,
    tree,
    values,
    effectiveValues,
    setValueOverride,
    viewRootRef,
  }
}
