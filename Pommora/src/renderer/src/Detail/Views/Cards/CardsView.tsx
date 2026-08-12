import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  CollectionNode,
  NexusLabels,
  ResolvedColumn,
  ResolvedGroup,
  SetNode,
  ViewRow,
} from '@shared/types'
import { UNGROUPED } from '@shared/types'
import type { PageFrontmatter } from '@shared/schemas'
import { applyValueAtRoot, type PropertyValue } from '@shared/propertyValue'
import { type CardBanner, isCompact, isLocationFsOrder, type SavedView } from '@shared/views'
import type { ColumnStyle } from '@shared/columnStyles'
import { entityIcon, Icon } from '@renderer/design-system/symbols'
import { text } from '@renderer/design-system/tokens/typography.css'
import { OverflowScroll } from '@renderer/design-system/components/OverflowScroll'
import {
  DragGroup,
  type DragItem,
  SortableZone,
  useDragItem,
  useGroupedDragItem,
} from '@renderer/design-system/interactions/drag'
import { cx } from '@renderer/design-system/cx'
import { assetUrl } from '../../../assetUrl'
import { useSession } from '../../../store'
import { byOrder } from '../../../treeMove'
import { findCollectionForSet } from '@renderer/Detail/Scope'
import { useSaveView } from '@renderer/Embeds/ViewEmbedScope'
import { spliceBeside } from '../creationOrder'
import { resolveColumns } from '../pipeline/columns'
import {
  contextOptionsFor as contextOptionsForSpaces,
  type ContextOption,
} from '../pipeline/contextOptions'
import { flattenContainer, groupsStructurally } from '../pipeline/group'
import { resolvedSortCount, resolveManualOrder } from '../pipeline/sort'
import { declaredType } from '../pipeline/value'
import { resolveView } from '../pipeline/resolveView'
import { useValuesEpoch } from '../useValuesEpoch'
import { useActiveView } from '../useActiveView'
import { columnLabel } from '../Table/columnLabel'
import { contextIdsOf } from '../pipeline/contextIdentity'
import { resolveContainerSchema } from '../Table/TableView'
import { styleFor } from '../Table/columnStyles'
import { writeContextValue } from '../contextCellWrite'
import { groupKeyToValue, REASSIGNABLE_GROUP_TYPES } from '../Table/reassign'
import { buildSetIcons, buildSetNames, buildSetPaths } from '../Table/cellResolve'
import { GroupBand, resolveBandHead } from '../GroupBand'
import { buildResolveContext, type ResolveContext } from '../Table/resolveContext'
import { NavCrumbs } from '../../../Navigation/NavList'
import type { PathCrumb } from '../../../Navigation/navResolve'

/** One identity for "no location trail", so a crumb-less card's CardFace can still compare equal. */
const NO_CRUMBS: PathCrumb[] = []
import { type AddPickerRequest, CardPickerHost, type ValuePickerRequest } from './CardPickerHost'
import { CardValue } from './CardValue'
import { bandShowsAdd } from './cardsBand'
import { reorderIds } from './cardsOrder'
import {
  type AddEntry,
  addColumn,
  addEntriesFor,
  orderAddableEntries,
  shownColumnsFor,
} from './cardValueInput'
import type { MoveTarget } from '@shared/cardMenu'
import { hideShown, unhide } from '@renderer/Components/Detail/hiddenPaneModel'
import { IconPicker } from '@renderer/Components/IconPicker'
import { TextPicker } from '@renderer/design-system/components/TextPicker'
import { isOpenInTabs } from '../../../Tabs/tabsModel'
import './CardsView.css'

// A page's thumbnail file — navKey's `page:<id>` flips its colon to a dash on disk (io/thumbnails).
const thumbSrc = (nexusId: string, pageId: string, v: number): string =>
  `nexus-asset://nexus/.nexus/assets/${nexusId}/thumbnails/page-${pageId}.jpg?v=${v}`

const cardTitleType = text.body.semibold

/** The Cards renderer — the container's Pages as a resizable card grid over the same pipeline the
 *  table reads. Cards never indent — descendants roll up under their top-level band; ungrouped
 *  pages band under the container's own heading. */
export function CardsView({ source }: { source: CollectionNode | SetNode }): React.JSX.Element {
  const tree = useSession((s) => s.tree)
  const select = useSession((s) => s.select)
  const openPreview = useSession((s) => s.openPreview)
  const load = useSession((s) => s.load)
  const nexusId = useSession((s) => s.tree?.nexus.id ?? '')
  const [values, setValues] = useState<Record<string, PageFrontmatter>>({})

  // Lazy value load on container open — the same batch IPC the table rides.
  useEffect(() => {
    let cancelled = false
    setValueOverride(null)
    void window.nexus.loadValues(source.path).then((v) => {
      if (!cancelled) setValues(v)
    })
    return () => {
      cancelled = true
    }
  }, [source.path])

  const schema = useMemo(() => (tree ? resolveContainerSchema(tree, source) : []), [tree, source])
  const { view } = useActiveView(source, schema)
  const saveView = useSaveView(source, load)
  const mutate = useSession((s) => s.mutate)

  // Optimistic property patches keyed by page id (the table's pattern): loadValues never re-reads
  // mid-session, so an add-picker commit re-renders only because this patch feeds the pipeline.
  const [valueOverride, setValueOverride] = useState<Record<string, PageFrontmatter> | null>(null)
  useValuesEpoch(source.path, setValues, setValueOverride)
  const effectiveValues = useMemo(
    () => (valueOverride ? { ...values, ...valueOverride } : values),
    [values, valueOverride],
  )
  const setProperty = (row: ViewRow, propertyId: string, value: PropertyValue | null): void => {
    const def = schema.find((d) => d.id === propertyId)
    if (!def) return
    const prior = effectiveValues[row.id]
    const patched = applyValueAtRoot(
      (prior ?? { id: row.id }) as Record<string, unknown>,
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
        effectiveValues[row.id] ?? { id: row.id },
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
  // One card-value Style key — persists per-key into the view's column_styles (the table's writer
  // minus its live override, so a style change flashes through a load() round-trip: v1-acceptable).
  const setColumnStyle = (colId: string, key: keyof ColumnStyle & string, value: string): void => {
    void saveView({
      ...view,
      column_styles: {
        ...view.column_styles,
        [colId]: { ...view.column_styles?.[colId], [key]: value },
      },
    })
  }
  // Adding a property from a card reveals it (place in order + clear the hidden flag), else the allowlist
  // keeps it hidden and the value the user just set never shows. Dedup a reveal already in flight — a
  // multi-select fills per toggle, and the view is stale until the first refetch, so each would re-walk.
  const revealingRef = useRef<Set<string>>(new Set())
  const revealProperty = (id: string): void => {
    if (revealingRef.current.has(id)) return
    if (view.property_order.includes(id) && !view.hidden_properties.includes(id)) return
    revealingRef.current.add(id)
    void saveView({ ...view, ...unhide(view, id) }).finally(() => revealingRef.current.delete(id))
  }
  // Right-click ▸ Remove on a card value — drop the property from this view (its property_order slot
  // stays as a remembered spot, so a later reveal restores it in place). The inverse of revealProperty.
  const hideProperty = (id: string): void => {
    if (view.hidden_properties.includes(id)) return
    void saveView({ ...view, ...hideShown(view, id) })
  }

  // Manual card order — the per-machine viewOrders tiebreaker the table's sorter reads; the
  // override gives instant feedback on a drop. Two+ effective sort criteria retire the drag, the
  // table's law.
  const [viewOrders, setViewOrders] = useState<Record<string, string[]>>({})
  const [manualOverride, setManualOverride] = useState<string[] | null>(null)
  // The set-cards row's twin of manualOverride — a confirmed tree carries the canonical
  // set_order, so a fresh `source` identity drops it.
  const [setOrderOverride, setSetOrderOverride] = useState<string[] | null>(null)
  useEffect(() => setSetOrderOverride(null), [source])
  useEffect(() => {
    let cancelled = false
    setManualOverride(null)
    void window.nexus.viewOrders.get().then((m) => {
      if (!cancelled) setViewOrders(m)
    })
    return () => {
      cancelled = true
    }
  }, [source.path])
  const sortKeys = useMemo(() => resolvedSortCount(view.sort, schema), [view.sort, schema])
  const sortedOrGrouped = sortKeys > 0 || view.group != null
  // Sort By: Location on its Location order is a computed filesystem order (drag off); Custom falls to
  // the manual order (drag on). In Location order the per-machine manual order must NOT feed the sorter,
  // or a prior Custom drag persists as the shown order and filesystem order never appears.
  const locationFsOrder = isLocationFsOrder(view)
  const manualOrder = locationFsOrder
    ? undefined
    : resolveManualOrder(sortedOrGrouped, manualOverride, viewOrders[view.id])

  const contextIds = contextIdsOf(tree)
  const groups = useMemo(() => {
    const { rows, setTree } = flattenContainer(source, effectiveValues)
    return resolveView({
      rows,
      setTree,
      view,
      schema,
      manualOrder,
      flattenStructural: true,
      contextIds,
    }).groups
  }, [source, effectiveValues, view, schema, manualOrder, contextIds])

  // Set-Card reorder — writes the container's set_order via moveSet (the sidebar's mechanism); the
  // dragged set stays under the same parent (a pure reorder, not a reparent), and the store's
  // moveSet arm shows the new order optimistically until the confirm walk lands.
  const reorderSets = (activeId: string, overId: string): void => {
    const order = reorderIds(
      sets.map((s) => s.id),
      activeId,
      overId,
    )
    const moved = sets.find((s) => s.id === activeId)
    if (!moved) return
    // Synchronous — the zone's shift transforms release on this very render, and the tree patch
    // waits on the IPC reply; without the override the row snaps back for the gap between them.
    setSetOrderOverride(order)
    void mutate({ op: 'moveSet', path: moved.path, newParentPath: source.path, order })
  }

  const setNames = useMemo(() => buildSetNames(source), [source])
  const setIcons = useMemo(() => buildSetIcons(source), [source])
  const ctx = useMemo(
    () => (tree ? buildResolveContext(tree, schema) : null),
    // buildResolveContext reads only contexts + labels — keying on those slices keeps ctx identity across unrelated tree pushes, so memoized cards hold.
    [tree?.contexts, tree?.labels, schema],
  )
  const columns = useMemo(
    () => resolveColumns(view, schema, contextIds),
    [view, schema, contextIds],
  )
  const labels = tree?.labels
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  // Set id → its within-container location trail (Set › Sub-set crumbs) — one walk, read per card.
  const setChains = useMemo(() => {
    const m = new Map<string, PathCrumb[]>()
    const walk = (sets: SetNode[] | undefined, trail: PathCrumb[]): void => {
      for (const s of sets ?? []) {
        const t = [...trail, { icon: entityIcon('set', s.icon, defaultIcons), title: s.title }]
        m.set(s.id, t)
        walk(s.sets, t)
      }
    }
    walk(source.sets, [])
    return m
  }, [source])
  // Under location (structural) grouping the band header IS the top-level set, so the breadcrumb
  // drops that leading crumb and starts at the next set down — the band already shows it.
  // Property/flat grouping keeps the full chain (the band is a bucket, not a location).
  const structural = useMemo(() => groupsStructurally(view.group, schema), [view.group, schema])
  const flatMode = view.group?.kind === 'flat'

  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(view.collapsed_groups ?? []),
  )
  useEffect(() => {
    setCollapsed(new Set(view.collapsed_groups ?? []))
    // Two cards views on one container share this instance (keyed by source.id), so the [source.path]
    // reset above never fires on a cards→cards switch — drop the drag override here too, or view B
    // renders in view A's manual order (the table resets manualOverride on its own [view.id] effect).
    setManualOverride(null)
  }, [view.id])
  const toggleCollapse = (key: string): void => {
    const next = new Set(collapsed)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setCollapsed(next)
    // The local `collapsed` state already shows the toggle — skip the refetch's redundant full walk.
    void saveView({ ...view, collapsed_groups: [...next] }, { skipRefetch: true, viewState: true })
  }

  const banner: CardBanner = view.card_banner ?? 'cover'
  const baseSets = source.sets ?? []
  const sets = useMemo(
    () => (setOrderOverride ? byOrder(baseSets, setOrderOverride) : baseSets),
    [baseSets, setOrderOverride],
  )
  const showSetCards = (view.set_cards ?? true) && sets.length > 0
  const hideLocation = view.hide_location ?? false
  // A page card honors the Collection's Open In (like the table's title-click): a page-preview owner
  // opens the floating preview; ⌘ (or a full-page owner) routes to a tab. Sets always open the set.
  const owner =
    source.kind === 'collection' ? source : tree ? findCollectionForSet(tree, source.id) : undefined
  const openPage = (row: ViewRow, newTab: boolean): void => {
    if (owner?.openIn === 'page-preview' && !newTab) openPreview({ id: row.id, path: row.path })
    else void select({ kind: 'page', id: row.id, path: row.path }, { newTab })
  }

  // Card handlers handed to memoized cards as ONE identity-stable object (the table's cellApi idiom):
  // a ref carries the live closures, the memo wrapper never changes reference. So a card bails on a
  // parent re-render that leaves its own inputs untouched — chiefly a band collapse in a large
  // container, which then repaints its header, not every card.
  const openValuePicker = (req: ValuePickerRequest): void => setValuePicker(req)
  // A native Add Property ▸ pick of a DEPENDENT kind (datetime/url) routes straight to the value's
  // own dropdown — the add menu is never opened just to exit it.
  const openAddPicker = (req: AddPickerRequest): void => {
    const t = req.initialEntry?.def?.type
    if (req.initialEntry && !req.initialEntry.revealOnly && (t === 'datetime' || t === 'url')) {
      setValuePicker({
        rowId: req.rowId,
        column: addColumn(req.initialEntry.id, tree),
        kind: t === 'datetime' ? 'datetime' : 'link',
        anchor: req.anchor,
        revealOnCommit: true,
      })
      return
    }
    setAddPicker(req)
  }
  // Re-pull the value batch (a cover write lands in page frontmatter, which loadValues never re-reads
  // mid-session — without this the card's thumb waits for a container reopen).
  const refreshValues = (): void => {
    void window.nexus.loadValues(source.path).then((v) => setValues(v))
  }
  const handlersRef = useRef({
    commitValue,
    setColumnStyle,
    contextOptionsFor,
    openPage,
    revealProperty,
    hideProperty,
    openValuePicker,
    openAddPicker,
    refreshValues,
  })
  handlersRef.current = {
    commitValue,
    setColumnStyle,
    contextOptionsFor,
    openPage,
    revealProperty,
    hideProperty,
    openValuePicker,
    openAddPicker,
    refreshValues,
  }
  const cardApi = useMemo(
    () => ({
      onCommitValue: (row: ViewRow, column: ResolvedColumn, value: PropertyValue | null) =>
        handlersRef.current.commitValue(row, column, value),
      onStyle: (colId: string, key: keyof ColumnStyle & string, value: string) =>
        handlersRef.current.setColumnStyle(colId, key, value),
      contextOptionsFor: (column: ResolvedColumn) => handlersRef.current.contextOptionsFor(column),
      onOpen: (row: ViewRow, newTab: boolean) => handlersRef.current.openPage(row, newTab),
      onReveal: (id: string) => handlersRef.current.revealProperty(id),
      onHide: (id: string) => handlersRef.current.hideProperty(id),
      onOpenValuePicker: (req: ValuePickerRequest) => handlersRef.current.openValuePicker(req),
      onOpenAddPicker: (req: AddPickerRequest) => handlersRef.current.openAddPicker(req),
      onRefreshValues: () => handlersRef.current.refreshValues(),
    }),
    [],
  )
  // Per-card location trail, resolved ONCE per grouping/location change — built as a map (not
  // called inline), since chain.slice allocates and a fresh array per render would defeat each
  // card's memo.
  const locByRow = useMemo(() => {
    const m = new Map<string, PathCrumb[]>()
    if (hideLocation) return m
    for (const r of flattenGroups(groups)) {
      if (!r.parentSetId) continue
      const chain = setChains.get(r.parentSetId)
      if (chain) m.set(r.id, structural ? chain.slice(1) : chain)
    }
    return m
  }, [groups, setChains, structural, hideLocation])

  // The grid-level picker requests — ONE host owns the portal pickers so card remounts (regroup,
  // re-sort, collapse) can never tear an open picker out mid-flight (CardPickerHost).
  const [valuePicker, setValuePicker] = useState<ValuePickerRequest | null>(null)
  const [addPicker, setAddPicker] = useState<AddPickerRequest | null>(null)
  const rowById = useMemo(() => {
    const m = new Map<string, ViewRow>()
    for (const r of flattenGroups(groups)) m.set(r.id, r)
    return m
  }, [groups])

  // Cross-band card drag → property reassignment. Only a status/select/checkbox property grouping
  // maps a band key back to a settable value; a cross-band drop there reassigns the property. Under
  // LOCATION grouping the bands are folders, so a cross-band drop MOVES the page into that Set.
  // Within-band reorder holds whenever the order is manually meaningful.
  const groupPropId = view.group?.kind === 'property' ? view.group.property_id : undefined
  const groupPropType = groupPropId ? declaredType(groupPropId, schema) : undefined
  const canReassign = groupPropType !== undefined && REASSIGNABLE_GROUP_TYPES.has(groupPropType)
  const canRelocate = structural
  const setPaths = useMemo(() => buildSetPaths(source), [source])
  const canReorderWithin = sortKeys < 2 && !locationFsOrder
  const cardDragEnabled = canReorderWithin || canReassign || canRelocate
  // Move the dragged card to `toIndex` within its band — the group engine reports a landing index,
  // not an over-id. Writes the full flattened order so the manual order stays one coherent global list.
  const reorderInBandByIndex = (bandKey: string, activeId: string, toIndex: number): void => {
    const full: string[] = []
    for (const g of groups) {
      const ids = flattenGroups([g]).map((r) => r.id)
      if (g.key !== bandKey) {
        full.push(...ids)
        continue
      }
      const without = ids.filter((id) => id !== activeId)
      const at = Math.max(0, Math.min(toIndex, without.length))
      full.push(...without.slice(0, at), activeId, ...without.slice(at))
    }
    setManualOverride(full)
    // The wire write lands in the local copy too — nothing re-reads viewOrders mid-session, so
    // a stale local array outlives the override that masks it (TableView.persistViewOrder's law).
    setViewOrders((m) => ({ ...m, [view.id]: full }))
    void window.nexus.viewOrders.set(view.id, full)
  }
  const onCardDrop = (activeId: string, toZone: string, toIndex: number): void => {
    const from = groups.find((g) => flattenGroups([g]).some((r) => r.id === activeId))?.key
    if (from == null) return
    if (toZone === from) {
      if (canReorderWithin) reorderInBandByIndex(toZone, activeId, toIndex)
      return
    }
    if (canRelocate) {
      // A cross-band drop under location grouping moves the page into that band's Set (root → the
      // container). The order carries the landing: the destination's FULL membership (hidden rows
      // keep their rank) with the drop spliced before the visible card it landed on.
      const row = rowById.get(activeId)
      const destPath = toZone === UNGROUPED ? source.path : setPaths.get(toZone)
      if (row && destPath && destPath !== row.path.slice(0, row.path.lastIndexOf('/'))) {
        const destIds = flattenContainer(source, effectiveValues)
          .rows.filter(
            (r) => r.path.slice(0, r.path.lastIndexOf('/')) === destPath && r.id !== activeId,
          )
          .map((r) => r.id)
        const band = groups.find((g) => g.key === toZone)
        const beforeId = band ? (flattenGroups([band])[toIndex]?.id ?? null) : null
        const order = spliceBeside(destIds, beforeId, activeId, 'above')
        void mutate({ op: 'movePage', path: row.path, newParentPath: destPath, order })
      }
      return
    }
    if (!canReassign || !groupPropId) return
    const row = rowById.get(activeId)
    if (row) setProperty(row, groupPropId, groupKeyToValue(toZone, groupPropType))
  }

  // The grid's EFFECTIVE zoom (embed zoom × block-zoom; 1 full-screen) — chips scale with it, not with
  // card_size, so the ×-drop gate keys on it. Measured off computed style; RO catches block-zoom steps.
  const rootRef = useRef<HTMLDivElement>(null)
  const [effectiveZoom, setEffectiveZoom] = useState(1)
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const measure = (): void => {
      setEffectiveZoom(Number.parseFloat(getComputedStyle(el).zoom) || 1)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      ref={rootRef}
      className={cx('cards-view', banner === 'none' && 'is-compact')}
      data-view-id={view.id}
      style={{ '--card-scale': view.card_size ?? 1 } as React.CSSProperties}
    >
      {showSetCards && (
        <div className="set-cards-row">
          <SortableZone
            items={sets.map((s) => s.id)}
            layout="grid"
            onReorder={reorderSets}
            getItemLabel={(id) => sets.find((s) => s.id === id)?.title ?? id}
          >
            {sets.map((s) => (
              <DraggableSetCard key={s.id} set={s} />
            ))}
          </SortableZone>
        </div>
      )}
      {/* One DragGroup spans every band so a card can be dragged ACROSS bands. The lifted card floats
          as a portal overlay while the columns reflow to show its landing. */}
      <DragGroup
        onCommit={onCardDrop}
        crossZone={canReassign || canRelocate}
        // The lifted card IS the whole card (the nav-gallery drag look), not a partial glyph — the same
        // CardFace the live card renders, at is-dragging opacity, floating under the pointer while its
        // slot reflows to show the landing. The `.cards-view` carrier re-declares the knob vars +
        // view zoom that the body-portaled overlay would otherwise lose (thumb/scale/compact reserve).
        renderOverlay={(id) => {
          const r = rowById.get(id)
          if (!r || !ctx) return null
          const oCover = typeof r.frontmatter.cover === 'string' ? r.frontmatter.cover : undefined
          const oSrc =
            banner === 'cover'
              ? oCover
                ? assetUrl(oCover)
                : undefined
              : banner === 'preview'
                ? thumbSrc(nexusId, r.id, 0)
                : undefined
          return (
            <div
              className={cx('cards-view', banner === 'none' && 'is-compact')}
              style={
                {
                  zoom: effectiveZoom,
                  '--card-scale': view.card_size ?? 1,
                  width: '100%',
                  height: '100%',
                } as React.CSSProperties
              }
            >
              <div
                className="page-card is-dragging page-card-ghost"
                style={{ width: '100%', height: '100%' }}
              >
                <div className="page-card-body">
                  <CardFace
                    row={r}
                    view={view}
                    banner={banner}
                    ctx={ctx}
                    labels={labels}
                    crumbs={locByRow.get(id) ?? NO_CRUMBS}
                    src={oSrc}
                    iconName={entityIcon('page', r.icon, defaultIcons)}
                    columns={columns}
                    allowInlineRemove={false}
                    onCommitValue={NOOP}
                    onStyle={NOOP}
                    onHide={NOOP}
                    onOpenValuePicker={NOOP}
                  />
                </div>
              </div>
            </div>
          )
        }}
      >
        {groups.map((g) => {
          const rows = flattenGroups([g])
          // Group By: None is one headerless, force-open band — a stale collapse from another grouping
          // would otherwise hide every card with no head to toggle.
          const isCollapsed = !flatMode && collapsed.has(g.key)
          const head = ctx ? resolveBandHead(g, view, ctx, setNames, setIcons, source) : null
          return (
            <GroupBand
              key={g.key}
              glyph={head?.glyph}
              collapsed={isCollapsed}
              onToggle={() => toggleCollapse(g.key)}
              showAdd={bandShowsAdd(g.kind)}
              headless={flatMode}
              fill
            >
              <SortableZone
                group="cards"
                id={g.key}
                items={rows.map((r) => r.id)}
                className="cards-grid"
              >
                {rows.map((row) => (
                  <PageCard
                    key={row.id}
                    row={row}
                    view={view}
                    banner={banner}
                    nexusId={nexusId}
                    columns={columns}
                    ctx={ctx}
                    labels={labels}
                    loc={locByRow.get(row.id)}
                    draggable={cardDragEnabled}
                    onCommitValue={cardApi.onCommitValue}
                    onStyle={cardApi.onStyle}
                    onOpen={cardApi.onOpen}
                    onReveal={cardApi.onReveal}
                    onHide={cardApi.onHide}
                    onOpenValuePicker={cardApi.onOpenValuePicker}
                    onOpenAddPicker={cardApi.onOpenAddPicker}
                    onRefreshValues={cardApi.onRefreshValues}
                    allowInlineRemove={effectiveZoom >= 0.8}
                  />
                ))}
              </SortableZone>
            </GroupBand>
          )
        })}
      </DragGroup>
      {ctx && (
        <CardPickerHost
          value={valuePicker}
          add={addPicker}
          rowById={rowById}
          view={view}
          ctx={ctx}
          labels={labels}
          columns={columns}
          commitValue={commitValue}
          contextOptionsFor={contextOptionsFor}
          onReveal={revealProperty}
          onOpenValue={setValuePicker}
          onDismissValue={() => setValuePicker(null)}
          onDismissAdd={() => setAddPicker(null)}
        />
      )}
    </div>
  )
}

// The Move To ▸ tree: every Collection and its nested Sets as relocation targets (movePage's
// newParentPath is a container path).
function buildMoveTargets(collections: CollectionNode[]): MoveTarget[] {
  const walkSets = (sets: SetNode[] | undefined): MoveTarget[] =>
    (sets ?? []).map((set) => ({ label: set.title, path: set.path, children: walkSets(set.sets) }))
  return collections.map((c) => ({ label: c.title, path: c.path, children: walkSets(c.sets) }))
}

function flattenGroups(groups: ResolvedGroup[]): ViewRow[] {
  const out: ViewRow[] = []
  const walk = (gs: ResolvedGroup[]): void => {
    for (const g of gs) {
      out.push(...g.items)
      if (g.children) walk(g.children)
    }
  }
  walk(groups)
  return out
}

function DraggableSetCard({ set }: { set: SetNode }): React.JSX.Element {
  const drag = useDragItem(set.id)
  return <SetCard set={set} drag={drag} />
}

function SetCard({ set, drag }: { set: SetNode; drag?: DragItem }): React.JSX.Element {
  const select = useSession((s) => s.select)
  const mutate = useSession((s) => s.mutate)
  const load = useSession((s) => s.load)
  const [failed, setFailed] = useState(false)
  const src = set.banner ? assetUrl(set.banner) : undefined
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const iconName = entityIcon('set', set.icon, defaultIcons)
  // Right-click the set's image band → the native banner menu (Add when unset, Change/Remove when
  // set), the same setBanner flow the page cards use — kind 'set', reloading the tree on the write.
  const onThumbContextMenu = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()
    const action = await window.nexus.bannerMenu(set.banner ? {} : { add: true })
    if (!action) return
    const dataUrl = action === 'remove' ? null : await window.nexus.pickImage()
    if (action === 'remove' || dataUrl) {
      if (await mutate({ op: 'setBanner', path: set.path, kind: 'set', dataUrl })) void load()
    }
  }
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a grid cell — per-cell tab stops are the wrong pattern; the grid wants roving tabindex, which is a feature rather than a lint fix
    <div
      ref={drag?.setNodeRef}
      style={drag?.style}
      {...(drag?.handle ?? { role: 'button', tabIndex: 0 })}
      className={cx('set-card', drag?.isDragging && 'is-dragging')}
      onClick={(e) => {
        if (!drag?.isDragging)
          void select({ kind: 'set', id: set.id, path: set.path }, { newTab: e.metaKey })
      }}
    >
      <div className="page-card-body hover-pop">
        {/* biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics */}
        <div className="page-card-thumb" onContextMenu={(e) => void onThumbContextMenu(e)}>
          {src && !failed ? (
            <img src={src} alt="" onError={() => setFailed(true)} />
          ) : (
            <span className="page-card-ph">
              <Icon name={iconName} size={26} />
            </span>
          )}
        </div>
        <div className="page-card-text">
          <OverflowScroll className={cx('page-card-title', cardTitleType)}>
            <Icon name={iconName} className="page-card-title-icon" />
            <span className="page-card-title-text">{set.title}</span>
          </OverflowScroll>
        </div>
      </div>
    </div>
  )
}

interface PageCardProps {
  row: ViewRow
  view: SavedView
  banner: CardBanner
  nexusId: string
  columns: ResolvedColumn[]
  ctx: ResolveContext | null
  labels: NexusLabels | undefined
  loc?: PathCrumb[]
  onCommitValue: (row: ViewRow, column: ResolvedColumn, value: PropertyValue | null) => void
  onStyle: (colId: string, key: keyof ColumnStyle & string, value: string) => void
  onOpen: (row: ViewRow, newTab: boolean) => void
  onReveal: (id: string) => void
  onHide: (id: string) => void
  onOpenValuePicker: (req: ValuePickerRequest) => void
  onOpenAddPicker: (req: AddPickerRequest) => void
  onRefreshValues: () => void
  draggable: boolean
  /** False when the embed zoom shrinks chips too far — drops multi-select's inline ×. */
  allowInlineRemove: boolean
}

/** The card's property body: the visible, non-blank columns (`shown`), each an interactive
 *  CardValue. Only rendered when there ARE properties (no empty reserve gap) — an empty card's
 *  add-input is the breadcrumb instead. Clicking the flow's empty space adds another. */
function CardProperties({
  row,
  view,
  ctx,
  labels,
  shown,
  onZoneClick,
  onCommitValue,
  onStyle,
  onHide,
  onOpenValuePicker,
  allowInlineRemove,
}: Pick<
  PageCardProps,
  | 'row'
  | 'view'
  | 'ctx'
  | 'labels'
  | 'onCommitValue'
  | 'onStyle'
  | 'onHide'
  | 'onOpenValuePicker'
  | 'allowInlineRemove'
> & {
  shown: ResolvedColumn[]
  onZoneClick: (e: React.MouseEvent) => void
}): React.JSX.Element | null {
  if (!ctx || !labels) return null
  const compact = isCompact(view)
  // The RESOLVED style (type defaults under the saved entry) — the table's shared resolver, so the
  // Style menu's checked radio reflects what actually renders (a raw entry leaves defaults unchecked).
  const style = (id: string): ColumnStyle => styleFor(id, ctx.schema, view)
  const zoneClick = (e: React.MouseEvent): void => {
    if (e.target === e.currentTarget) onZoneClick(e)
  }
  const value = (c: ResolvedColumn): React.JSX.Element => (
    <CardValue
      row={row}
      column={c}
      ctx={ctx}
      style={style(c.id)}
      onCommit={(col, v) => onCommitValue(row, col, v)}
      onStyle={onStyle}
      onHide={onHide}
      onOpenPicker={(column, kind, anchor, clickX) =>
        onOpenValuePicker({ rowId: row.id, column, kind, anchor, clickX })
      }
      allowInlineRemove={allowInlineRemove}
    />
  )
  return compact ? (
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a grid cell — per-cell tab stops are the wrong pattern; the grid wants roving tabindex, which is a feature rather than a lint fix
    <div className="card-props is-flow" onClick={zoneClick}>
      {shown.map((c) => (
        <span key={c.id}>{value(c)}</span>
      ))}
    </div>
  ) : (
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a grid cell — per-cell tab stops are the wrong pattern; the grid wants roving tabindex, which is a feature rather than a lint fix
    <div className="card-props" onClick={zoneClick}>
      {shown.map((c) => (
        <div key={c.id} className="card-prop-row">
          <span className={cx('card-prop-label', text.caption.emphasized)}>
            {columnLabel(c.id, ctx.schema, ctx.contexts)}
          </span>
          {value(c)}
        </div>
      ))}
    </div>
  )
}

// A no-op for the drag-ghost's inert handlers (the overlay is pointer-events:none, so nothing fires).
const NOOP = (): void => {}

/** The card's inner face — the image band + the title/property/breadcrumb column. ONE source
 *  shared by the live PageCard and the drag-ghost overlay, so the lifted card is the whole faithful
 *  card, not a hand-built partial. Memoized so the per-move overlay re-render is a no-op. */
const CardFace = memo(function CardFace({
  row,
  view,
  banner,
  ctx,
  labels,
  crumbs,
  src,
  iconName,
  columns,
  allowInlineRemove,
  onImgError,
  textRef,
  onThumbContextMenu,
  onZoneClick,
  onCommitValue,
  onStyle,
  onHide,
  onOpenValuePicker,
}: {
  row: ViewRow
  view: SavedView
  banner: CardBanner
  ctx: ResolveContext | null
  labels: NexusLabels | undefined
  crumbs: PathCrumb[]
  src: string | undefined
  iconName: string
  columns: ResolvedColumn[]
  allowInlineRemove: boolean
  onImgError?: () => void
  textRef?: React.Ref<HTMLDivElement>
  onThumbContextMenu?: (e: React.MouseEvent) => void
  /** The add-property action (empty-flow / breadcrumb / text-zone empty space). Absent on the ghost. */
  onZoneClick?: (e: React.MouseEvent) => void
  onCommitValue: (row: ViewRow, column: ResolvedColumn, value: PropertyValue | null) => void
  onStyle: (colId: string, key: keyof ColumnStyle & string, value: string) => void
  onHide: (colId: string) => void
  onOpenValuePicker: (req: ValuePickerRequest) => void
}): React.JSX.Element {
  const shown = useMemo(
    () => (ctx ? shownColumnsFor(row, columns, ctx, isCompact(view)) : []),
    [ctx, columns, row, view],
  )
  const titleBody = (
    <>
      {!(view.hide_page_icons ?? false) && (
        <Icon name={iconName} className="page-card-title-icon" />
      )}
      <span className="page-card-title-text">{row.title}</span>
    </>
  )
  return (
    <>
      {banner !== 'none' && (
        // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics
        <div
          className="page-card-thumb"
          onContextMenu={onThumbContextMenu ? (e) => void onThumbContextMenu(e) : undefined}
        >
          {src ? (
            <img src={src} alt="" onError={onImgError} />
          ) : (
            <span className="page-card-ph">
              <Icon name={iconName} size={22} />
            </span>
          )}
        </div>
      )}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a grid cell — per-cell tab stops are the wrong pattern; the grid wants roving tabindex, which is a feature rather than a lint fix */}
      <div
        className="page-card-text"
        ref={textRef}
        onClick={
          onZoneClick
            ? (e) => {
                if (e.target === e.currentTarget) onZoneClick(e)
              }
            : undefined
        }
      >
        {(view.wrap_titles ?? false) ? (
          <span className={cx('page-card-title is-wrap', cardTitleType)}>{titleBody}</span>
        ) : (
          <OverflowScroll className={cx('page-card-title', cardTitleType)}>
            {titleBody}
          </OverflowScroll>
        )}
        {shown.length > 0 && (
          <CardProperties
            row={row}
            view={view}
            ctx={ctx}
            labels={labels}
            shown={shown}
            onCommitValue={onCommitValue}
            onStyle={onStyle}
            onHide={onHide}
            onOpenValuePicker={onOpenValuePicker}
            allowInlineRemove={allowInlineRemove}
            onZoneClick={onZoneClick ?? NOOP}
          />
        )}
        {crumbs.length > 0 && (
          // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a grid cell — per-cell tab stops are the wrong pattern; the grid wants roving tabindex, which is a feature rather than a lint fix
          <div className="page-card-loc-zone" onClick={onZoneClick}>
            <NavCrumbs path={crumbs} className="page-card-loc" iconSize={11} />
          </div>
        )}
      </div>
    </>
  )
})

// One card into its band's SortableZone — the drag shell rides the card root (NavGallery's DraggableCard
// split: the engine owns the root's transform; hover-pop lives on the body inside). Memoized (the table's
// DataRow idiom) so a card bails on a parent re-render its inputs didn't touch; the drag hook lives inside,
// so the dragging band still repaints per frame via its Zone.
const PageCard = memo(function PageCard({
  row,
  view,
  banner,
  nexusId,
  columns,
  ctx,
  labels,
  loc,
  onCommitValue,
  onStyle,
  onOpen,
  onReveal,
  onHide,
  onOpenValuePicker,
  onOpenAddPicker,
  onRefreshValues,
  draggable,
  allowInlineRemove,
}: PageCardProps): React.JSX.Element {
  // The card is a member of the grid-level DragGroup (cross-band). `draggable` is off when neither
  // within-band reorder nor cross-band reassign applies (a multi-key sort, computed location order),
  // so the card renders inert — no handle armed.
  const gdrag = useGroupedDragItem(row.id)
  const drag = draggable ? gdrag : null
  // The boolean, not the object: `gdrag` is a fresh object per slot flip, so a handler keyed on it
  // would rebuild on every drag frame — which is exactly when CardFace's memo has to hold.
  const isDragging = drag?.isDragging ?? false
  const version = useSession((s) => s.thumbVersions[`page:${row.id}`] ?? 0)
  const tree = useSession((s) => s.tree)
  const [failed, setFailed] = useState(false)
  // A broken image latches `failed` — a cover change must retry the NEW src, not keep the placeholder.
  const lastSrc = useRef<string | undefined>(undefined)

  // This card's text-area ref anchors the add-picker for both the property zone's empty space
  // and the location row.
  const textRef = useRef<HTMLDivElement>(null)
  // Built where it's read — both consumers are event handlers, and computing it in render walked
  // the schema per card for a list only a click ever looks at. The grid-level host builds its own.
  const addableNow = (): AddEntry[] =>
    ctx && labels ? addEntriesFor(row, view, ctx, columns, tree) : []
  const openAdd = useCallback(
    (e: React.MouseEvent): void => {
      e.stopPropagation()
      // Nothing addable → don't pop a dead-end empty picker (the native menu already omits its submenu).
      if (!isDragging && addableNow().length > 0 && textRef.current)
        onOpenAddPicker({ rowId: row.id, anchor: textRef.current, initialEntry: null })
    },
    [isDragging, onOpenAddPicker, row, ctx, labels, view, columns, tree],
  )
  const mutate = useSession((s) => s.mutate)
  const [renameOpen, setRenameOpen] = useState(false)
  const [iconOpen, setIconOpen] = useState(false)
  // The card's native right-click menu handles page meta + an Add Property ▸ submenu — the add
  // path for cards with no in-body add surface. A value right-click is caught by CardValue's own
  // menu (it stops propagation), so this handles the empty/title/thumb.
  const onCardContextMenu = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()
    if (!ctx || drag?.isDragging) return
    const { tabs, pinned, tree } = useSession.getState()
    const alreadyOpen = isOpenInTabs(tabs, pinned, { kind: 'page', id: row.id, path: row.path })
    const addable = addableNow()
    const menuAddable = orderAddableEntries(addable).map((e) => ({ id: e.id, name: e.name }))
    const currentParentPath = row.path.slice(0, row.path.lastIndexOf('/'))
    const moveTargets = tree ? buildMoveTargets(tree.collections) : []
    const action = await window.nexus.cardMenu({
      addable: menuAddable,
      alreadyOpen,
      moveTargets,
      currentParentPath,
    })
    if (!action) return
    if (action === 'title:newtab') onOpen(row, true)
    else if (action === 'title:rename') setRenameOpen(true)
    else if (action === 'title:icon') setIconOpen(true)
    else if (action === 'title:delete') void mutate({ op: 'delete', path: row.path, kind: 'page' })
    else if (action.startsWith('move:'))
      void mutate({ op: 'movePage', path: row.path, newParentPath: action.slice(5) })
    else if (action.startsWith('add:')) {
      const entry = addable.find((e) => e.id === action.slice(4))
      if (!entry) return
      if (entry.revealOnly) onReveal(entry.id)
      else if (textRef.current)
        onOpenAddPicker({ rowId: row.id, anchor: textRef.current, initialEntry: entry })
    }
  }
  const crumbs = loc ?? NO_CRUMBS

  const cover = typeof row.frontmatter.cover === 'string' ? row.frontmatter.cover : undefined
  const onImgError = useCallback(() => setFailed(true), [])
  // Right-click the image band → the page-banner menu (the PageHeader flow), worded for the view's
  // display config: Cover mode says Cover, Preview says Banner (it edits the page banner either way —
  // the one settable image; a Preview thumb itself is a capture, not a pickable file).
  const onThumbContextMenu = useCallback(
    async (e: React.MouseEvent): Promise<void> => {
      e.preventDefault()
      e.stopPropagation()
      const noun = banner === 'cover' ? 'Cover' : 'Banner'
      const action = await window.nexus.bannerMenu(cover ? { noun } : { noun, add: true })
      if (!action) return
      if (action === 'remove') {
        if (await mutate({ op: 'setBanner', path: row.path, kind: 'page', dataUrl: null }))
          onRefreshValues()
        return
      }
      const dataUrl = await window.nexus.pickImage()
      if (dataUrl && (await mutate({ op: 'setBanner', path: row.path, kind: 'page', dataUrl })))
        onRefreshValues()
    },
    [banner, cover, mutate, row.path, onRefreshValues],
  )
  const src =
    banner === 'cover'
      ? cover && assetUrl(cover)
      : banner === 'preview'
        ? thumbSrc(nexusId, row.id, version)
        : undefined
  if (src !== lastSrc.current) {
    lastSrc.current = src
    if (failed) setFailed(false)
  }
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const iconName = entityIcon('page', row.icon, defaultIcons)

  // The drag engine fires a synthesized click after a pointer drag — a reorder-drop must not
  // navigate (NavGallery's `!isDragging` guard).
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a grid cell — per-cell tab stops are the wrong pattern; the grid wants roving tabindex, which is a feature rather than a lint fix
    <div
      ref={drag?.setNodeRef}
      style={drag?.style}
      {...(drag?.handle ?? { role: 'button', tabIndex: 0 })}
      className={cx('page-card', drag?.isDragging && 'is-dragging')}
      onClick={(e) => {
        if (drag?.isDragging) return
        // Only the title + banner open the page. A click landing anywhere else — a value's picker that
        // just dismissed, the reflowed compact flow, the close-animation window — must not navigate.
        // elementFromPoint reads the real element under the pointer, robust to whatever moved between
        // press and release (a value's own click stops propagation, so it never reaches here).
        const hit = document.elementFromPoint(e.clientX, e.clientY)
        if (
          hit &&
          e.currentTarget.contains(hit) &&
          hit.closest('.page-card-title, .page-card-thumb')
        )
          onOpen(row, e.metaKey)
      }}
      onContextMenu={onCardContextMenu}
    >
      <div className="page-card-body hover-pop">
        <CardFace
          row={row}
          view={view}
          banner={banner}
          ctx={ctx}
          labels={labels}
          crumbs={crumbs}
          src={failed ? undefined : src}
          iconName={iconName}
          columns={columns}
          allowInlineRemove={allowInlineRemove}
          onImgError={onImgError}
          textRef={textRef}
          onThumbContextMenu={onThumbContextMenu}
          onZoneClick={openAdd}
          onCommitValue={onCommitValue}
          onStyle={onStyle}
          onHide={onHide}
          onOpenValuePicker={onOpenValuePicker}
        />
      </div>
      {/* Persistent mounts riding `open` — the Bloom-out plays on dismiss (conditional mounts tear
          the instance out mid-exit). The add-picker lives at the grid-level host, not here. */}
      <TextPicker
        open={renameOpen}
        triggerRef={textRef}
        value={row.title}
        onCommit={(name) => {
          setRenameOpen(false)
          const t = name.trim()
          if (t && t !== row.title)
            void mutate({ op: 'rename', path: row.path, kind: 'page', newName: t })
        }}
        onDismiss={() => setRenameOpen(false)}
      />
      <IconPicker
        open={iconOpen}
        triggerRef={textRef}
        value={typeof row.icon === 'string' ? row.icon : undefined}
        onSelect={(icon) => void mutate({ op: 'setIcon', path: row.path, kind: 'page', icon })}
        onClose={() => setIconOpen(false)}
      />
    </div>
  )
})
