import { useEffect, useMemo, useRef, useState } from 'react'
import { type PropertyType, specOf } from '@pommora/core/Properties/properties'
import { UNGROUPED } from '@pommora/core/Views/viewRow'
import type { CollectionNode, SetNode } from '@pommora/core/Nexus/tree'
import type { ResolvedColumn, ResolvedGroup, ViewRow } from '@pommora/core/Views/viewRow'
import type { ColumnStyle } from '@pommora/core/Properties/columnStyles'
import { isLocationFsOrder } from '@pommora/core/Views/views'
import type { PropertyValue } from '@pommora/core/Properties/propertyValue'
import { assignValue, type ValueWriter } from '@pommora/core/Properties/assignValue'
import type { Result } from '@pommora/core/Contract/result'
import { useSession } from '../../Session/store'
import { useContentHost } from '../../Interface/contentHost'
import { useViewTileScope } from '../ViewTileScope'
import { useSaveView } from '../viewWrite'
import { contextOptionsFor } from '../../Contexts/contextOptions'
import { contextIdsOf, identityOf } from '../../Contexts/contextIdentity'
import { type PickTarget, syntheticContextDef } from '../../Properties/Pickers/PropertyPicker'
import { declaredType, resolveFieldValue } from '../../Properties/value'
import { buildValueContext } from '../../Properties/valueContext'
import { buildSetIcons, buildSetNames, buildSetPaths } from '../../Properties/Cells/cellResolve'
import { hideShown, unhide } from '../visibilityModel'
import { resolveBandHead } from '../Bands/GroupBand'
import { NO_SCHEMA, resolveContainerSchema } from '../Pipeline/pickView'
import {
  bandGrouping,
  bucketKey,
  drawnSubGroup,
  flattenContainer,
  groupsStructurally,
} from '../Pipeline/group'
import { resolveView } from '../Pipeline/resolveView'
import { searchGroups } from '../Pipeline/search'
import { foldKey } from '../../Paths/caseFold'
import { resolvedSortCount } from '../Pipeline/sort'
import { useActiveView } from './useActiveView'
import { patchOverride } from '../../Properties/valueOverride'
import { useContainerValues } from './useContainerValues'
import { pickedStyle, styleFor, useNexusForms } from './useColumnStyles'
import type { ViewPatch } from '@pommora/core/Views/views'
import { groupKeyToValue, reassignable, reassignTarget } from '../reassign'

export type ViewHostApi = NonNullable<ReturnType<typeof useViewHost>>

const NO_COLLAPSE = new Set<string>()

export function useViewHost(source: CollectionNode | SetNode, flattenStructural: boolean) {
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

  const schema = useMemo(
    () => (tree ? resolveContainerSchema(tree, source) : NO_SCHEMA),
    [tree, source],
  )
  const view = useActiveView(source, schema)

  const nexus = useNexusForms()
  const collapsed = useMemo(() => new Set(view.collapsed_groups ?? []), [view.collapsed_groups])
  // Painted ahead of the tree push that carries the new page_order; it settles on that push, not on a view save.
  const [structuralPaint, setStructuralPaint] = useState<string[] | null>(null)

  const sortKeys = useMemo(() => resolvedSortCount(view.sort, schema), [view.sort, schema])
  const structuralGrouping = groupsStructurally(view.group, schema)
  // The engine's own sub-group rule: a flattened paint, or a sub_group it won't bucket, must not reassign against it.
  const subGrouped = !flattenStructural && drawnSubGroup(view, schema) !== undefined
  const groupPropId =
    !structuralGrouping || subGrouped ? bandGrouping(view, schema)?.property_id : undefined
  const groupPropType = groupPropId ? declaredType(groupPropId, schema) : undefined
  const canReassign = reassignable(groupPropType)
  const locationFsOrder = flattenStructural && isLocationFsOrder(view)
  const canReorderWithin = sortKeys < 2 && !locationFsOrder
  const canRelocate = structuralGrouping && !subGrouped
  const structuralOrder = groupPropId === undefined && sortKeys === 0
  useEffect(() => {
    if (structuralOrder) setStructuralPaint(null)
  }, [source, structuralOrder])

  const manualOrder = locationFsOrder
    ? undefined
    : structuralOrder
      ? (structuralPaint ?? undefined)
      : view.manual_order
  const dragDisabled = searching || !(canReorderWithin || canReassign || canRelocate)

  const contextIds = contextIdsOf(tree)
  const {
    columns,
    groups: resolvedGroups,
    setTree,
    rows,
  } = useMemo(() => {
    const { rows, setTree } = flattenContainer(source, effectiveValues, tree?.pageMetadata ?? {})
    return {
      ...resolveView({
        rows,
        setTree,
        view,
        schema,
        manualOrder,
        flattenStructural,
        contextIds,
      }),
      setTree,
      rows,
    }
  }, [
    source,
    effectiveValues,
    tree?.pageMetadata,
    view,
    schema,
    manualOrder,
    contextIds,
    flattenStructural,
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
  const setNames = useMemo(() => buildSetNames(source), [source])
  const setIcons = useMemo(() => buildSetIcons(source), [source])
  const setPaths = useMemo(() => buildSetPaths(source), [source])
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
  const bandLabel = (id: string): string => {
    const find = (gs: ResolvedGroup[]): ResolvedGroup | undefined => {
      for (const g of gs) {
        if (g.key === id) return g
        const hit = g.children && find(g.children)
        if (hit) return hit
      }
      return undefined
    }
    const g = find(groups)
    return g && ctx ? resolveBandHead(g, view, ctx, nexus, setNames, setIcons, source).label : id
  }

  const persistView = (
    patch: ViewPatch,
    opts?: { viewState?: boolean },
  ): Promise<Result<{ id: string }>> => saveView(view, patch, opts)
  const toggleCollapse = (key: string): void => {
    if (searching) return
    const next = new Set(collapsed)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    void persistView({ collapsed_groups: [...next] }, { viewState: true })
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
    source,
    schema,
    view,
    flat: flattenStructural,
    columns,
    groups,
    setTree,
    rows,
    ctx,
    contextIds,
    setNames,
    setIcons,
    setPaths,
    rowById,
    rowBand,
    paintOrder,
    bandLabel,
    collapsed: shownCollapsed,
    toggleCollapse,
    structuralGrouping,
    subGrouped,
    groupPropId,
    groupPropType,
    canReassign,
    canReorderWithin,
    canRelocate,
    reassignBySortRun,
    structuralOrder,
    dragDisabled,
    searching,
    setStructuralPaint,
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
