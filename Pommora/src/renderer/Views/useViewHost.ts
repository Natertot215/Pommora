import { useEffect, useMemo, useRef, useState } from 'react'
import { UNGROUPED } from '@shared/types'
import type {
  CollectionNode,
  PageValues,
  ResolvedColumn,
  ResolvedGroup,
  SetNode,
  ViewRow,
} from '@shared/types'
import type { PageFrontmatter } from '@shared/schemas'
import type { ColumnStyle } from '@shared/columnStyles'
import { isLocationFsOrder, type SavedView } from '@shared/views'
import { applyValueAtRoot, type PropertyValue } from '@shared/propertyValue'
import { useSession } from '../store'
import { useSaveView } from '@renderer/SurfacePM/ViewTileScope'
import {
  contextOptionsFor as contextOptionsForSpaces,
  type ContextOption,
} from '@renderer/Properties/contextOptions'
import { contextIdsOf } from '@renderer/Properties/contextIdentity'
import { declaredType } from '@renderer/Properties/value'
import { buildResolveContext } from '@renderer/Properties/resolveContext'
import {
  buildSetIcons,
  buildSetNames,
  buildSetPaths,
} from '@renderer/Properties/Assignment/cellResolve'
import { hideShown, unhide } from '@renderer/Frames/hiddenFrameModel'
import { resolveBandHead } from './GroupBand'
import { resolveContainerSchema } from './Pipeline/pickView'
import { bucketKey, flattenContainer, groupsStructurally } from './Pipeline/group'
import { resolveView } from './Pipeline/resolveView'
import { resolvedSortCount, resolveManualOrder } from './Pipeline/sort'
import { useActiveView } from './useActiveView'
import { type Overrides, patchOverride, useContainerValues } from './useValuesEpoch'
import { useViewOrders } from './useViewOrders'
import { groupingKeyOf, useBandOrdering } from './useBandOrdering'
import { useViewCreation } from './useViewCreation'
import { writeContextValue } from './contextCellWrite'
import { mergeStyleRecords } from './viewMerge'
import { groupKeyToValue, REASSIGNABLE_GROUP_TYPES, reassignTarget } from './TableView/reassign'
import { sameIds } from './creationOrder'

export interface ViewHostUpward {
  foldOverrides: { current: (v: SavedView) => SavedView }
  bandBucket: { current: (key: string) => string | null }
  viewRootRef: { current: HTMLElement | null }
  onCreated: { current: (created: { id: string; path: string }) => void }
}

/** The one object a renderer draws from — the hook's return, so the shape has a single writer. */
export type ViewHostApi = NonNullable<ReturnType<typeof useViewHost>>

const stylesCaughtUp = (
  patch: Record<string, ColumnStyle>,
  saved: Record<string, ColumnStyle> | undefined,
): boolean =>
  Object.entries(patch).every(([id, style]) =>
    Object.entries(style).every(
      ([key, value]) => (saved?.[id] as Record<string, unknown> | undefined)?.[key] === value,
    ),
  )

export function useViewHost(
  source: CollectionNode | SetNode,
  flattenStructural: boolean,
  upward: ViewHostUpward,
) {
  const tree = useSession((s) => s.tree)
  const assetMap = useSession((s) => s.assetMap)
  const select = useSession((s) => s.select)
  const mutate = useSession((s) => s.mutate)
  const saveView = useSaveView(source)

  // Optimistic property patches keyed by page id: the loaded values never re-read on a write, so
  // a changed row re-groups only because this patch feeds the pipeline.
  const [valueOverride, setValueOverride] = useState<Overrides | null>(null)
  const values = useContainerValues(source.path, setValueOverride)

  const schema = useMemo(() => (tree ? resolveContainerSchema(tree, source) : []), [tree, source])
  const { view } = useActiveView(source, schema)
  const { viewOrders, persistViewOrder } = useViewOrders(source.path, view.id)

  const [orderOverride, setOrderOverride] = useState<string[] | null>(null)
  const [hiddenOverride, setHiddenOverride] = useState<string[] | null>(null)
  const [stylePatch, setStylePatchState] = useState<Record<string, ColumnStyle> | null>(null)
  const [manualOverride, setManualOverride] = useState<string[] | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(view.collapsed_groups ?? []),
  )
  const { bandPatch, commitBand, resetBand } = useBandOrdering(
    (patch) => persistView(patch),
    groupingKeyOf(view),
  )

  // Host layers reset on the id STRINGS, never `[source]` identity (breaks useBandOrdering's
  // echo-survival) — and `source.id` must be in the array, since sibling sub-Sets below depth 1
  // share the DEFAULT_VIEW_ID sentinel and would leak layers between each other on `[view.id]` alone.
  useEffect(() => {
    setOrderOverride(null)
    setHiddenOverride(null)
    setStylePatchState(null)
    setManualOverride(null)
    resetBand()
    setCollapsed(new Set(view.collapsed_groups ?? []))
  }, [source.id, view.id])
  // A fresh tree carries canonical page_order, so drop the optimistic MANUAL ORDER it was masking —
  // VALUES deliberately do NOT reset here, since clearing valueOverride on this identity change would
  // revert a just-assigned value whenever a watcher echo re-mints `source` (the assign-vanish).
  useEffect(() => {
    setManualOverride(null)
  }, [source])
  // Drop an override once the canonical view catches it up (this view's own write round-tripped) —
  // a pinned override would otherwise mask a later external write (e.g. the Visibility pane) on the next persist.
  useEffect(() => {
    if (orderOverride && sameIds(orderOverride, view.property_order)) setOrderOverride(null)
    if (hiddenOverride && sameIds(hiddenOverride, view.hidden_properties)) setHiddenOverride(null)
    if (stylePatch && stylesCaughtUp(stylePatch, view.column_styles)) setStylePatchState(null)
  }, [view, orderOverride, hiddenOverride, stylePatch])

  const liveView = useMemo(() => {
    if (!orderOverride && !hiddenOverride && !stylePatch && !bandPatch) return view
    return {
      ...view,
      property_order: orderOverride ?? view.property_order,
      hidden_properties: hiddenOverride ?? view.hidden_properties,
      ...(stylePatch ? { column_styles: mergeStyleRecords(view.column_styles, stylePatch) } : {}),
      ...bandPatch,
    }
  }, [view, orderOverride, hiddenOverride, stylePatch, bandPatch])

  const sortKeys = useMemo(() => resolvedSortCount(liveView.sort, schema), [liveView.sort, schema])
  const sortedOrGrouped = sortKeys > 0 || liveView.group != null
  const structuralGrouping = groupsStructurally(liveView.group, schema)
  // A flattened paint never sub-groups, so a view still carrying `sub_group` from a type switch
  // must not reassign against it.
  const subGrouped = structuralGrouping && liveView.sub_group !== undefined && !flattenStructural
  const groupPropId =
    liveView.group?.kind === 'property'
      ? liveView.group.property_id
      : subGrouped
        ? liveView.sub_group?.property_id
        : undefined
  const groupPropType = groupPropId ? declaredType(groupPropId, schema) : undefined
  const canReassign = groupPropType !== undefined && REASSIGNABLE_GROUP_TYPES.has(groupPropType)
  const locationFsOrder = flattenStructural && isLocationFsOrder(liveView)
  const canReorderWithin = sortKeys < 2 && !locationFsOrder
  const canRelocate = structuralGrouping && !subGrouped
  const structuralOrder = groupPropId === undefined && sortKeys === 0
  // A held viewOrder mask never feeds a structural paint — the rows draw in tree order, and the
  // mask stays the sorted/grouped tiebreaker.
  const manualOrder = locationFsOrder
    ? undefined
    : resolveManualOrder(
        sortedOrGrouped,
        manualOverride,
        structuralOrder ? undefined : viewOrders[view.id],
      )
  const dragDisabled = !(canReorderWithin || canReassign || canRelocate)

  const effectiveValues = useMemo(() => {
    if (!valueOverride) return values
    const out = { ...values }
    for (const [id, e] of Object.entries(valueOverride)) {
      const prior: PageValues | undefined = values[id]
      out[id] = {
        createdAt: prior?.createdAt ?? null,
        modifiedAt: prior?.modifiedAt ?? null,
        frontmatter: e.fm,
      }
    }
    return out
  }, [values, valueOverride])
  const contextIds = contextIdsOf(tree)
  const { columns, groups, setTree, rows } = useMemo(() => {
    const { rows, setTree } = flattenContainer(source, effectiveValues)
    return {
      ...resolveView({
        rows,
        setTree,
        view: liveView,
        schema,
        manualOrder,
        flattenStructural,
        contextIds,
      }),
      setTree,
      rows,
    }
  }, [source, effectiveValues, liveView, schema, manualOrder, contextIds, flattenStructural])
  // Absent a property grouping, a single-sorted view lays its rows out in value RUNS — within each
  // band, where there are bands — so a reorder that lands one strictly inside another run rewrites
  // the sorted property. Armed only when the column is shown: an unrendered property leaves the run
  // boundaries with nothing to read them by.
  const sortReassign = useMemo(() => {
    if (groupPropId !== undefined || sortKeys !== 1) return undefined
    for (const c of liveView.sort ?? []) {
      const type = declaredType(c.property_id, schema)
      if (!type || !REASSIGNABLE_GROUP_TYPES.has(type)) continue
      if (columns.some((col) => col.id === c.property_id))
        return { propertyId: c.property_id, type }
    }
    return undefined
  }, [groupPropId, sortKeys, liveView.sort, schema, columns])

  const ctx = useMemo(
    () => (tree ? buildResolveContext(tree, schema, assetMap) : null),
    // buildResolveContext reads only contexts and the asset map — keying on those slices keeps ctx identity across unrelated tree pushes, so memoized rows hold.
    [tree?.contexts, schema, assetMap],
  )
  const setNames = useMemo(() => buildSetNames(source), [source])
  const setIcons = useMemo(() => buildSetIcons(source), [source])
  const setPaths = useMemo(() => buildSetPaths(source), [source])
  const { rowById, rowBand } = useMemo(() => {
    const byId = new Map<string, ViewRow>()
    const band = new Map<string, string>()
    const walk = (gs: ResolvedGroup[]): void => {
      for (const g of gs) {
        for (const r of g.items) {
          byId.set(r.id, r)
          band.set(r.id, g.key)
        }
        if (g.children) walk(g.children)
      }
    }
    walk(groups)
    return { rowById: byId, rowBand: band }
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
    return g && ctx ? resolveBandHead(g, liveView, ctx, setNames, setIcons, source).label : id
  }

  // Persist the saved view + every live layer + a patch, so no one mutation clobbers another's
  // unsaved state. The renderer's fold ref adds its local layers at fire time; the explicit patch
  // wins last.
  const saveFolded = (patch: Partial<SavedView>, opts?: { viewState?: boolean }) => {
    const folded = upward.foldOverrides.current({ ...liveView, collapsed_groups: [...collapsed] })
    return saveView({ ...folded, ...patch }, opts)
  }
  const persistView = (patch: Partial<SavedView>, opts?: { viewState?: boolean }): void => {
    void saveFolded(patch, opts)
  }
  const toggleCollapse = (key: string): void => {
    const next = new Set(collapsed)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setCollapsed(next)
    persistView({ collapsed_groups: [...next] }, { viewState: true })
  }
  const setStylePatch = (colId: string, key: keyof ColumnStyle & string, value: string): void => {
    const merged = { ...stylePatch?.[colId], [key]: value } as ColumnStyle
    setStylePatchState((prev) => ({ ...prev, [colId]: merged }))
    persistView({
      column_styles: mergeStyleRecords(view.column_styles, { ...stylePatch, [colId]: merged }),
    })
  }
  const revealingRef = useRef<Set<string>>(new Set())
  const revealProperty = (id: string): void => {
    if (revealingRef.current.has(id)) return
    if (liveView.property_order.includes(id) && !liveView.hidden_properties.includes(id)) return
    revealingRef.current.add(id)
    const patch = unhide(liveView, id)
    setOrderOverride(patch.property_order)
    setHiddenOverride(patch.hidden_properties)
    void saveFolded(patch).finally(() => revealingRef.current.delete(id))
  }
  const hideProperty = (id: string): void => {
    if (liveView.hidden_properties.includes(id)) return
    const patch = hideShown(liveView, id)
    setHiddenOverride(patch.hidden_properties)
    persistView(patch)
  }

  /** The row's live frontmatter: the override-folded batch entry, else what the row flattened with. */
  const liveFrontmatter = (row: ViewRow): PageFrontmatter =>
    effectiveValues[row.id]?.frontmatter ?? row.frontmatter

  const setProperty = (row: ViewRow, propertyId: string, value: PropertyValue | null): void => {
    const def = schema.find((d) => d.id === propertyId)
    if (!def) return
    const patched = applyValueAtRoot(
      liveFrontmatter(row) as Record<string, unknown>,
      def,
      value,
    ) as PageFrontmatter
    patchOverride(
      setValueOverride,
      row.id,
      patched,
      mutate({ op: 'setProperty', path: row.path, propertyId, value }),
    )
  }
  /** Fold a sorted-run reassignment into a reorder that just placed `activeId` in `bandKey`, given
   *  the view's whole new row order. */
  const reassignBySortRun = (orderIds: string[], bandKey: string, activeId: string): void => {
    if (!sortReassign) return
    const keyOf = (id: string): string => {
      const row = rowById.get(id)
      return (row ? bucketKey(row, sortReassign.propertyId, schema, 'day') : null) ?? UNGROUPED
    }
    const band = orderIds.filter((id) => rowBand.get(id) === bandKey)
    const target = reassignTarget(band, activeId, keyOf)
    if (target === undefined) return
    const row = rowById.get(activeId)
    if (row) setProperty(row, sortReassign.propertyId, groupKeyToValue(target, sortReassign.type))
  }
  const commitValue = (row: ViewRow, column: ResolvedColumn, value: PropertyValue | null): void => {
    if (column.kind === 'context') {
      const ids = value?.kind === 'context' ? value.value : []
      writeContextValue(row, column.id, ids, liveFrontmatter(row), setValueOverride, mutate)
      return
    }
    setProperty(row, column.id, value)
  }
  const contextOptionsFor = (column: ResolvedColumn): ContextOption[] | null => {
    if (column.kind !== 'context' || !tree) return null
    return contextOptionsForSpaces(column.id, tree)
  }

  const creation = useViewCreation(() => ({
    source,
    view: liveView,
    schema,
    values,
    setValueOverride,
    effectiveValues,
    structuralOrder,
    viewOrders,
    persistViewOrder,
    setManualOverride,
    rowBand,
    bandBucket: (key) => upward.bandBucket.current(key),
    canReassign,
    groupPropId,
    groupPropType,
    setPaths,
    collapsed,
    toggleCollapse,
    viewRootRef: upward.viewRootRef,
    onCreated: (created) => upward.onCreated.current(created),
  }))

  if (!ctx || !tree) return null
  return {
    source,
    schema,
    view,
    liveView,
    values,
    effectiveValues,
    setValueOverride,
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
    bandLabel,
    collapsed,
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
    manualOrder,
    viewOrders,
    persistViewOrder,
    setManualOverride,
    setOrderOverride,
    setHiddenOverride,
    setStylePatch,
    hideProperty,
    revealProperty,
    persistView,
    commitBand,
    setProperty,
    commitValue,
    contextOptionsFor,
    creation,
    mutate,
    select,
    tree,
    seam: upward,
  }
}
