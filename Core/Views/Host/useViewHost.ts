import { useEffect, useMemo, useRef, useState } from 'react'
import { type Picked, type ResolvedGroup, type ViewRow, flattenContainer } from '../viewRow'
import type { CollectionNode, SetNode } from '../../Nexus/tree'
import type { ColumnStyle } from '../../Properties/columnStyles'
import type { PropertyValue } from '../../Properties/propertyValue'
import { assignValue, useValueWriter } from '../../Properties/assignValue'
import { patchOverride } from '../../Properties/valueOverride'
import type { Result } from '../../Contract/result'
import { useDateForms, useSession } from '../../Session/store'
import { useContentHost } from '../../Interface/contentHost'
import { useViewTileScope } from '../ViewTileScope'
import { identityOf } from '../../Contexts/contextIdentity'
import { useValueContext } from '../../Properties/valueContext'
import { bandModelOf } from '../Bands/bandModel'
import { containerSchema } from '../../Nexus/treePatch'
import { stabilize } from '../../Nexus/treeStabilize'
import { bucketGroupingOf, groupPlan, pageOrderOf } from '../Pipeline/group'
import { resolveView } from '../Pipeline/resolveView'
import { searchGroups, searchKeysOf } from '../Pipeline/search'
import { matchQuery } from '../../Paths/caseFold'
import { resolvedSortCount } from '../Pipeline/sort'
import { useActiveView, useSaveView, type ViewWriteOpts } from './liveView'
import { presentedKind } from './viewKinds'
import { useBandSource } from '../Bands/useBandSource'
import { useContainerValues } from './useContainerValues'
import { columnStylePatch, styleFor } from '../../Properties/columnStyles'
import type { ViewPatch } from '../views'
import { reassignable } from '../valueKinds'
import { hideShown, shownIn, unhide } from '../Pipeline/columns'
import type { Disclosure } from '@pommora/uix/Menus/DisclosureRow'
import { toggled } from '@pommora/uix/Utilities/checkSet'
import type { ResolvedColumn } from '../../Properties/properties'

export type ViewHostApi = NonNullable<ReturnType<typeof useViewHost>>

/** A memo that recycles every part of its value equal to the last one's (`stabilize`), so what's keyed on those parts holds across a recompute that changed nothing in them. */
function useRecycledMemo<T>(build: () => T, deps: readonly unknown[]): T {
  const held = useRef<T | undefined>(undefined)
  return useMemo(() => (held.current = stabilize(build(), held.current)), deps)
}

export function useViewHost(source: CollectionNode | SetNode) {
  const tree = useSession((s) => s.tree)
  const saveView = useSaveView(source)
  const tile = useViewTileScope()
  const host = useContentHost()
  const query = useSession((s) => (tile || !host ? undefined : s.viewSearch[host.tabId]?.query))
  const needle = matchQuery(query ?? '')
  const searching = needle !== ''

  const { effectiveValues, setValueOverride } = useContainerValues(source.path)

  const schema = useMemo(() => containerSchema(tree, source), [tree, source])
  const live = useActiveView(source)
  const collapsed = useMemo(() => new Set(live.collapsed_groups ?? []), [live.collapsed_groups])
  // A fold draws nothing a row shows, so the renderers read the view without it and a toggle re-renders no row.
  const view = useRecycledMemo(() => ({ ...live, collapsed_groups: undefined }), [live])
  const { nests } = presentedKind(view.type)

  const identity = identityOf(tree)
  const { contextIds } = identity
  const plan = useMemo(() => groupPlan(view, schema, nests), [view, schema, nests])
  const sortKeys = useMemo(
    () => resolvedSortCount(view.sort, schema, contextIds),
    [view.sort, schema, contextIds],
  )
  const pageOrder = pageOrderOf(plan, view, sortKeys)
  const grouping = bucketGroupingOf(plan)
  const groupPropId = grouping?.config.property_id
  const { painted, sets, heads } = useBandSource(source, grouping, view)
  const forms = useDateForms()
  const groupPropType = grouping?.column.type
  const canReassign = reassignable(groupPropType)
  const canRelocate = plan.kind === 'sets' && plan.sub === undefined
  const manualOrder = pageOrder === 'location' ? undefined : view.manual_order
  const dragDisabled = searching || sortKeys >= 2
  const crossBand = !dragDisabled && (canReassign || canRelocate)

  const pageMetadata = tree?.config.pageMetadata
  const flat = useRecycledMemo(
    () => flattenContainer(painted, effectiveValues, pageMetadata ?? {}),
    [painted, effectiveValues, pageMetadata],
  )
  const rows = flat.rows
  const { columns, groups: resolvedGroups } = useRecycledMemo(
    () => resolveView({ ...flat, view, schema, plan, manualOrder, identity }),
    [flat, view, schema, plan, manualOrder, identity],
  )
  // Every shown column's style, resolved once per pass; the table, the cards, the list, and the pickers read it.
  const styleById = useMemo(
    () => new Map(columns.map((c) => [c.id, styleFor(c, view, forms)])),
    [columns, view, forms],
  )
  const keys = useMemo(
    () => (searching ? searchKeysOf(rows, source.path) : null),
    [rows, searching, source.path],
  )
  // A page created while searching stays shown until the view is left for another view, tab, or page.
  const life = `${host?.tabId}:${host?.parked}:${view.id}`
  const [created, setCreated] = useState(() => ({ life, ids: new Set<string>() }))
  if (created.life !== life) setCreated({ life, ids: new Set() })
  const groups = useMemo(
    () => (keys ? searchGroups(resolvedGroups, needle, keys, created.ids) : resolvedGroups),
    [resolvedGroups, needle, keys, created.ids],
  )

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

  const [naming, setNaming] = useState<{ id: string; create: boolean; landing: boolean } | null>(
    null,
  )
  const strandedId = naming && !naming.landing && !rowById.has(naming.id) ? naming.id : null
  useEffect(() => {
    if (strandedId !== null) setNaming((n) => (n?.id === strandedId ? null : n))
  }, [strandedId])
  const beginNaming = (id: string, flight?: Promise<unknown>): void => {
    setNaming({ id, create: flight !== undefined, landing: flight !== undefined })
    if (flight && searching) setCreated((c) => ({ ...c, ids: new Set(c.ids).add(id) }))
    void flight?.finally(() => setNaming((n) => (n?.id === id ? { ...n, landing: false } : n)))
  }
  const endNaming = (): void => setNaming(null)

  const persistView = (patch: ViewPatch, opts?: ViewWriteOpts): Promise<Result<{ id: string }>> =>
    saveView(live, patch, opts)
  const disclosure: Disclosure = {
    isOpen: (key) => searching || !collapsed.has(key),
    toggle: (key) => {
      if (searching) return
      const next = toggled(collapsed, key)
      void persistView({ collapsed_groups: next.size ? [...next] : undefined }, { viewState: true })
    },
  }
  const setStylePatch = (
    column: ResolvedColumn,
    key: keyof ColumnStyle & string,
    value: string,
  ): void => void persistView(columnStylePatch(view, column, forms, { [key]: value }))
  const viewRootRef = useRef<HTMLDivElement>(null)
  const revealingRef = useRef<Set<string>>(new Set())
  const revealProperty = (id: string): void => {
    if (revealingRef.current.has(id)) return
    if (shownIn(view)(id)) return
    revealingRef.current.add(id)
    void persistView(unhide(view, id)).finally(() => revealingRef.current.delete(id))
  }
  const hideProperty = (id: string): void => {
    if (view.hidden_properties.includes(id)) return
    void persistView(hideShown(view, id))
  }

  const writer = useValueWriter({
    rowOf: (id) => rows.find((r) => r.id === id),
    setOverride: setValueOverride,
  })
  const commitValue = (
    row: ViewRow,
    column: ResolvedColumn,
    value: PropertyValue | null,
  ): Promise<boolean> | undefined => assignValue(writer, row, column, value)
  const overrideValues = (pageId: string, picked: Picked, write: Promise<boolean>): void =>
    patchOverride(setValueOverride, pageId, picked, write)
  const styleOf = (column: ResolvedColumn): ColumnStyle =>
    styleById.get(column.id) ?? styleFor(column, view, forms)

  if (!ctx || !tree) return null
  return {
    source: painted,
    view,
    plan,
    nests,
    columns,
    groups,
    rows,
    ctx,
    identity,
    sets,
    bands,
    rowById,
    rowBand,
    paintOrder,
    disclosure,
    groupPropId,
    groupPropType,
    canReassign,
    canRelocate,
    crossBand,
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
    styleOf,
    overrideValues,
    viewRootRef,
    naming,
    beginNaming,
    endNaming,
  }
}
