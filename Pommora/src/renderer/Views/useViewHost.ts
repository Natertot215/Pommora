// The one view host. Everything a renderer needs before it can draw lives here exactly once:
// the value stack, schema + active view, the optimistic layers, band ordering, collapse, the
// pipeline invocation, the writers, the persist fold, and the creation engine. A renderer adds
// presentation plus the five-field seam — nothing else.

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import type {
  CollectionNode,
  NexusTree,
  ResolvedColumn,
  ResolvedGroup,
  SetNode,
  ViewRow,
} from '@shared/types'
import type { PropertyDefinition } from '@shared/properties'
import type { PageFrontmatter } from '@shared/schemas'
import type { ColumnStyle } from '@shared/columnStyles'
import { isLocationFsOrder, type SavedView } from '@shared/views'
import { applyValueAtRoot, type PropertyValue } from '@shared/propertyValue'
import type { MutateRequest } from '@shared/mutate'
import { useSession, type SessionState } from '../store'
import { useSaveView } from '@renderer/SurfacePM/ViewTileScope'
import {
  contextOptionsFor as contextOptionsForSpaces,
  type ContextOption,
} from '@renderer/Properties/contextOptions'
import { contextIdsOf } from '@renderer/Properties/contextIdentity'
import { declaredType } from '@renderer/Properties/value'
import { buildResolveContext, type ResolveContext } from '@renderer/Properties/resolveContext'
import {
  buildSetIcons,
  buildSetNames,
  buildSetPaths,
} from '@renderer/Properties/Assignment/cellResolve'
import { hideShown, unhide } from '@renderer/Frames/hiddenFrameModel'
import { resolveContainerSchema } from './Pipeline/pickView'
import { flattenContainer, groupsStructurally, type SetTreeNode } from './Pipeline/group'
import { resolveView } from './Pipeline/resolveView'
import { resolvedSortCount, resolveManualOrder } from './Pipeline/sort'
import { useActiveView } from './useActiveView'
import { useValuesEpoch } from './useValuesEpoch'
import { useViewOrders } from './useViewOrders'
import { groupingKeyOf, useBandOrdering } from './useBandOrdering'
import { useViewCreation, type ViewCreation } from './useViewCreation'
import { writeContextValue } from './contextCellWrite'
import { mergeOverrides, mergeStyleRecords } from './viewMerge'
import { REASSIGNABLE_GROUP_TYPES } from './TableView/reassign'
import { sameIds } from './creationOrder'

export interface ViewHostSeam {
  /** Read at fire time; identity by default. The renderer folds its local layers into a persist. */
  foldOverrides?: { current: (v: SavedView) => SavedView }
  flattenStructural: boolean
  bandBucket: (key: string) => string | null
  viewRootRef: { readonly current: HTMLElement | null }
  onCreated: (created: { id: string; path: string }) => void
}

export interface ViewHostApi {
  source: CollectionNode | SetNode
  schema: PropertyDefinition[]
  view: SavedView
  liveView: SavedView
  values: Record<string, PageFrontmatter>
  effectiveValues: Record<string, PageFrontmatter>
  setValueOverride: Dispatch<SetStateAction<Record<string, PageFrontmatter> | null>>
  columns: ResolvedColumn[]
  groups: ResolvedGroup[]
  setTree: SetTreeNode[]
  ctx: ResolveContext
  contextIds: string[]
  setNames: Map<string, string>
  setIcons: Map<string, string | undefined>
  setPaths: Map<string, string>
  rowById: Map<string, ViewRow>
  rowBand: Map<string, string>
  collapsed: Set<string>
  toggleCollapse: (key: string) => void
  structuralGrouping: boolean
  subGrouped: boolean
  groupPropId: string | undefined
  groupPropType: string | undefined
  canReassign: boolean
  canReorderWithin: boolean
  canRelocate: boolean
  structuralOrder: boolean
  dragDisabled: boolean
  manualOrder: string[] | undefined
  viewOrders: Record<string, string[]>
  persistViewOrder: (ids: string[]) => void
  setManualOverride: Dispatch<SetStateAction<string[] | null>>
  setOrderOverride: Dispatch<SetStateAction<string[] | null>>
  setHiddenOverride: Dispatch<SetStateAction<string[] | null>>
  setStylePatch: (colId: string, key: keyof ColumnStyle & string, value: string) => void
  hideProperty: (id: string) => void
  revealProperty: (id: string) => void
  persistView: (patch: Partial<SavedView>, opts?: { viewState?: boolean }) => void
  commitBand: (patch: Partial<SavedView>) => void
  setProperty: (row: ViewRow, propertyId: string, value: PropertyValue | null) => void
  commitValue: (row: ViewRow, column: ResolvedColumn, value: PropertyValue | null) => void
  contextOptionsFor: (column: ResolvedColumn) => ContextOption[] | null
  refreshValues: () => void
  creation: ViewCreation
  mutate: (req: MutateRequest) => Promise<boolean>
  select: SessionState['select']
  tree: NexusTree
  /** The renderer's upward slots — assigned on render, read at fire time. */
  seam: {
    foldOverrides: { current: (v: SavedView) => SavedView }
    bandBucket: { current: (key: string) => string | null }
    viewRootRef: { current: HTMLElement | null }
    onCreated: { current: (created: { id: string; path: string }) => void }
  }
}

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
  seam: ViewHostSeam,
  upward: ViewHostApi['seam'],
): ViewHostApi | null {
  const tree = useSession((s) => s.tree)
  const assetMap = useSession((s) => s.assetMap)
  const select = useSession((s) => s.select)
  const mutate = useSession((s) => s.mutate)
  const saveView = useSaveView(source)

  const [values, setValues] = useState<Record<string, PageFrontmatter>>({})
  // Optimistic property patches keyed by page id: the loaded values never re-read on a write, so
  // a changed row re-groups only because this patch feeds the pipeline.
  const [valueOverride, setValueOverride] = useState<Record<string, PageFrontmatter> | null>(null)
  // Lazy value load on container open; `canceled` guards a fast container swap.
  useEffect(() => {
    let canceled = false
    setValueOverride(null) // canonical values for the new container supersede any optimistic patches
    void window.nexus.loadValues(source.path).then((v) => {
      if (!canceled) setValues(v)
    })
    return () => {
      canceled = true
    }
  }, [source.path])
  useValuesEpoch(source.path, setValues, setValueOverride)

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

  // Host layers reset on the id STRINGS, never `[source]` identity (which would break
  // useBandOrdering's echo-survival). `source.id` must be in the array: every sub-Set deeper than
  // depth 1 shares the DEFAULT_VIEW_ID sentinel and the host is unkeyed, so on `[view.id]` alone a
  // layer would leak between sibling sub-Sets and a later persist would write one container's
  // config into the other's sidecar.
  useEffect(() => {
    setOrderOverride(null)
    setHiddenOverride(null)
    setStylePatchState(null)
    setManualOverride(null)
    resetBand()
    setCollapsed(new Set(view.collapsed_groups ?? []))
  }, [source.id, view.id])
  // A fresh tree (a sidebar reorder, or this view's own write round-tripping back) carries the
  // canonical page_order, so drop the optimistic MANUAL ORDER it was masking — canon has caught up.
  // VALUES deliberately do NOT reset here: a PageNode carries no property value and loadValues
  // never re-reads mid-session, so clearing valueOverride on a `source`-identity change would
  // revert a just-assigned value whenever a watcher echo re-mints `source` (the assign-vanish).
  // The value override clears+reloads only on a real container switch, above.
  useEffect(() => {
    setManualOverride(null)
  }, [source])
  // The Visibility pane writes property_order / hidden_properties from OUTSIDE the host. Once the
  // canonical view catches an override up (this view's own write round-tripped), drop it — a pinned
  // override would mask the pane's later writes and fold stale state back over them on the next
  // persist. Styles drop the same way, key-for-key.
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
  const subGrouped =
    structuralGrouping && liveView.sub_group !== undefined && !seam.flattenStructural
  const groupPropId =
    liveView.group?.kind === 'property'
      ? liveView.group.property_id
      : subGrouped
        ? liveView.sub_group?.property_id
        : undefined
  const groupPropType = groupPropId ? declaredType(groupPropId, schema) : undefined
  const canReassign = groupPropType !== undefined && REASSIGNABLE_GROUP_TYPES.has(groupPropType)
  const locationFsOrder = seam.flattenStructural && isLocationFsOrder(liveView)
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

  const effectiveValues = useMemo(
    () => (valueOverride ? { ...values, ...valueOverride } : values),
    [values, valueOverride],
  )
  const contextIds = contextIdsOf(tree)
  const { columns, groups, setTree } = useMemo(() => {
    const { rows, setTree } = flattenContainer(source, effectiveValues)
    return {
      ...resolveView({
        rows,
        setTree,
        view: liveView,
        schema,
        manualOrder,
        flattenStructural: seam.flattenStructural,
        contextIds,
      }),
      setTree,
    }
  }, [source, effectiveValues, liveView, schema, manualOrder, contextIds, seam.flattenStructural])
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

  // Persist the saved view + every live layer + a patch, so no one mutation clobbers another's
  // unsaved state. The renderer's fold ref adds its local layers at fire time; the explicit patch
  // wins last.
  const foldedView = (): SavedView => {
    const folded = mergeOverrides(liveView, {}, {}, collapsed, {})
    const fold = seam.foldOverrides?.current
    return fold ? fold(folded) : folded
  }
  const persistView = (patch: Partial<SavedView>, opts?: { viewState?: boolean }): void => {
    void saveView({ ...foldedView(), ...patch }, opts)
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
    if (view.property_order.includes(id) && !view.hidden_properties.includes(id)) return
    revealingRef.current.add(id)
    void saveView({ ...foldedView(), ...unhide(view, id) }).finally(() =>
      revealingRef.current.delete(id),
    )
  }
  const hideProperty = (id: string): void => {
    if (view.hidden_properties.includes(id)) return
    persistView(hideShown(view, id))
  }

  const setProperty = (row: ViewRow, propertyId: string, value: PropertyValue | null): void => {
    const def = schema.find((d) => d.id === propertyId)
    if (!def) return
    const prior = effectiveValues[row.id] ?? row.frontmatter
    const patched = applyValueAtRoot(
      prior as Record<string, unknown>,
      def,
      value,
    ) as PageFrontmatter
    setValueOverride((prev) => ({ ...prev, [row.id]: patched }))
    void mutate({ op: 'setProperty', path: row.path, propertyId, value })
  }
  const commitValue = (row: ViewRow, column: ResolvedColumn, value: PropertyValue | null): void => {
    if (column.kind === 'context') {
      const ids = value?.kind === 'context' ? value.value : []
      writeContextValue(
        row,
        column.id,
        ids,
        effectiveValues[row.id] ?? row.frontmatter,
        setValueOverride,
        mutate,
      )
      return
    }
    setProperty(row, column.id, value)
  }
  const contextOptionsFor = (column: ResolvedColumn): ContextOption[] | null => {
    if (column.kind !== 'context' || !tree) return null
    return contextOptionsForSpaces(column.id, tree)
  }
  const refreshValues = (): void => {
    void window.nexus.loadValues(source.path).then((v) => setValues(v))
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
    bandBucket: seam.bandBucket,
    canReassign,
    groupPropId,
    groupPropType,
    setPaths,
    collapsed,
    toggleCollapse,
    viewRootRef: seam.viewRootRef,
    onCreated: seam.onCreated,
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
    ctx,
    contextIds,
    setNames,
    setIcons,
    setPaths,
    rowById,
    rowBand,
    collapsed,
    toggleCollapse,
    structuralGrouping,
    subGrouped,
    groupPropId,
    groupPropType,
    canReassign,
    canReorderWithin,
    canRelocate,
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
    refreshValues,
    creation,
    mutate,
    select,
    tree,
    seam: upward,
  }
}
