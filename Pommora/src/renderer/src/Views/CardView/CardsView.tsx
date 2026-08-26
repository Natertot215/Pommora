import {
  memo,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { CollectionNode, ResolvedColumn, ResolvedGroup, SetNode, ViewRow } from '@shared/types'
import { UNGROUPED } from '@shared/types'
import type { PageFrontmatter } from '@shared/schemas'
import { applyValueAtRoot, type PropertyValue } from '@shared/propertyValue'
import { type CardBanner, isCompact, isLocationFsOrder, type SavedView } from '@shared/views'
import type { ColumnStyle } from '@shared/columnStyles'
import { entityIcon, Icon } from '@renderer/DesignSystem/Symbols'
import { text } from '@renderer/DesignSystem/Tokens/typography.css'
import {
  CardBody,
  CardPlaceholder,
  CardRoot,
  CardText,
  CardThumb,
  CardTitle,
  CardTrail,
} from '@renderer/Cards/Card'
import {
  DragGroup,
  type DragItem,
  SortableZone,
  useDragItem,
  useGroupedDragItem,
} from '@renderer/DesignSystem/Interactions/drag'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { assetUrl } from '../../assetUrl'
import { useSession } from '../../store'
import { AssetImage } from '@renderer/DesignSystem/Components/AssetImage/AssetImage'
import { ImagePicker } from '@renderer/DesignSystem/Components/Pickers/ImagePicker/ImagePicker'
import { useBannerMenu } from '@renderer/Detail/Banner/useBannerMenu'
import { byOrder, parentOf } from '@shared/treePatch'
import { thumbKey, thumbRel } from '@shared/nexusPaths'
import { navKey } from '@renderer/Navigation/navRecents'
import { findCollectionForSet } from '@renderer/Detail/Scope'
import { useSaveView } from '@renderer/Embeds/ViewEmbedScope'
import { sameIds, spliceBeside, tieOrderWith } from '../creationOrder'
import { mergeStyleRecords } from '../TableView/viewMerge'
import { resolveColumns } from '../pipeline/columns'
import {
  contextOptionsFor as contextOptionsForSpaces,
  type ContextOption,
} from '../pipeline/contextOptions'
import { flattenContainer, groupsStructurally, subtreeIds } from '../pipeline/group'
import { resolvedSortCount, resolveManualOrder } from '../pipeline/sort'
import {
  GHOST_DWELL_MS,
  GHOST_TRAVEL_HOLD_MS,
  GhostSuppress,
  useClearStrandedGhost,
  useGhostAnchor,
} from '../useGhostAnchor'
import { DEFAULT_FEEL } from '@renderer/DesignSystem/Animation/feel'
import { useViewCreation } from '../useViewCreation'
import { declaredType } from '../pipeline/value'
import { resolveView } from '../pipeline/resolveView'
import { useValuesEpoch } from '../useValuesEpoch'
import { useActiveView } from '../useActiveView'
import { useViewOrders } from '../useViewOrders'
import { columnLabel } from '../TableView/columnLabel'
import { contextIdsOf } from '../pipeline/contextIdentity'
import { resolveContainerSchema } from '../pipeline/pickView'
import { useStyleFor } from '../TableView/columnStyles'
import { writeContextValue } from '../contextCellWrite'
import { groupKeyToValue, REASSIGNABLE_GROUP_TYPES } from '../TableView/reassign'
import { buildSetIcons, buildSetNames, buildSetPaths } from '../TableView/cellResolve'
import { resolveBandHead } from '../GroupBand'
import { ViewGroupBand } from '../ViewGroupBand'
import { BandDnd, type BandDrop } from '../BandDnd'
import { flattenBands } from '../bandDndModel'
import { bandReorderPatch, groupingKeyOf, useBandOrdering } from '../useBandOrdering'
import { nextOrder } from '@renderer/Sidebar/sidebarDndModel'
import { buildResolveContext, type ResolveContext } from '../TableView/resolveContext'
import type { TrailSegment } from '@renderer/DesignSystem/Elements/NavTrail'
import { ancestryOf } from '../../treeIndex'

/** One identity for "no location trail", so a trail-less card's CardFace can still compare equal. */
const NO_TRAIL: TrailSegment[] = []
import { type AddPickerRequest, CardPickerHost, type ValuePickerRequest } from './CardPickerHost'
import { CardValue } from './CardValue'
import { reorderIds } from './cardsOrder'
import {
  type AddEntry,
  addColumn,
  addEntriesFor,
  orderAddableEntries,
  shownColumnsFor,
} from './cardValueInput'
import { pageMoveContext, runPageSendAction } from '@renderer/pageMenuActions'
import { hideShown, unhide } from '@renderer/Components/Detail/hiddenPaneModel'
import { IconPicker } from '@renderer/Settings/IconPicker'
import { RenamableTitle } from '@renderer/Components/RenamableTitle'
import { titleInput } from '@renderer/DesignSystem/Components/Menu'
import { isOpenInTabs } from '../../Tabs/tabsModel'
import './CardsView.css'

const thumbSrc = (nexusId: string, pageId: string, v: number): string =>
  `${assetUrl(thumbRel(nexusId, thumbKey(navKey({ kind: 'page', id: pageId }))))}?v=${v}`

// ── TUNABLE ── how long a left ghost card survives before it collapses — unlike the table's
// flush ghost, the pointer must cross the grid gap to reach it, so zero would kill it mid-travel.
// The dwell is the shared GHOST_DWELL_MS in useGhostAnchor.
const CARDS_GHOST_GRACE_MS = 200 // KNOB

/** The Cards renderer — the container's Pages as a resizable card grid over the same pipeline the
 *  table reads. Cards never indent — descendants roll up under their top-level band; ungrouped
 *  pages band under the container's own heading. */
export function CardsView({ source }: { source: CollectionNode | SetNode }): React.JSX.Element {
  const tree = useSession((s) => s.tree)
  const assetMap = useSession((s) => s.assetMap)
  const select = useSession((s) => s.select)
  const openPreview = useSession((s) => s.openPreview)
  const nexusId = useSession((s) => s.tree?.nexus.id ?? '')
  const [values, setValues] = useState<Record<string, PageFrontmatter>>({})

  // Lazy value load on container open — the same batch IPC the table rides.
  useEffect(() => {
    let canceled = false
    setValueOverride(null)
    void window.nexus.loadValues(source.path).then((v) => {
      if (!canceled) setValues(v)
    })
    return () => {
      canceled = true
    }
  }, [source.path])

  const schema = useMemo(() => (tree ? resolveContainerSchema(tree, source) : []), [tree, source])
  const { view } = useActiveView(source, schema)
  // The band drop's optimistic order, on the layer both views share.
  const { bandPatch, commitBand, resetBand } = useBandOrdering(
    (patch) => persistView(patch),
    groupingKeyOf(view),
  )
  // The Style menu's optimistic layer (the table's pattern): the patch shows the moment it is
  // chosen, and the confirming push lands the same values underneath it.
  const [stylePatch, setStylePatch] = useState<Record<string, ColumnStyle> | null>(null)
  useEffect(() => setStylePatch(null), [source.path, view.id])
  const liveView = useMemo(() => {
    const banded = bandPatch ? { ...view, ...bandPatch } : view
    return stylePatch
      ? { ...banded, column_styles: mergeStyleRecords(view.column_styles, stylePatch) }
      : banded
  }, [view, bandPatch, stylePatch])
  const saveView = useSaveView(source)
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
  // Every view write goes out over the LIVE view, so one persist can't fold a band drop's unsaved
  // order back to what disk still says (the table's law).
  const persistView = (patch: Partial<SavedView>, opts?: { viewState?: boolean }): void => {
    void saveView({ ...liveView, ...patch }, opts)
  }
  // One card-value Style key — applies live via the patch, persists per-key into column_styles;
  // the explicit patch carries the not-yet-committed value so a state-batch can't drop it.
  const setColumnStyle = (colId: string, key: keyof ColumnStyle & string, value: string): void => {
    const merged = { ...stylePatch?.[colId], [key]: value } as ColumnStyle
    setStylePatch((prev) => ({ ...prev, [colId]: merged }))
    persistView({
      column_styles: mergeStyleRecords(view.column_styles, { ...stylePatch, [colId]: merged }),
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
    void saveView({ ...liveView, ...unhide(view, id) }).finally(() =>
      revealingRef.current.delete(id),
    )
  }
  // Right-click ▸ Remove on a card value — drop the property from this view (its property_order slot
  // stays as a remembered spot, so a later reveal restores it in place). The inverse of revealProperty.
  const hideProperty = (id: string): void => {
    if (view.hidden_properties.includes(id)) return
    persistView(hideShown(view, id))
  }

  // Manual card order — the per-machine viewOrders tiebreaker the table's sorter reads; the
  // override gives instant feedback on a drop. Two+ effective sort criteria retire the drag, the
  // table's law.
  const { viewOrders, persistViewOrder } = useViewOrders(source.path, view.id)
  const [manualOverride, setManualOverride] = useState<string[] | null>(null)
  // The set-cards row's twin of manualOverride — a confirmed tree carries the canonical
  // set_order, so a fresh `source` identity drops it.
  const [setOrderOverride, setSetOrderOverride] = useState<string[] | null>(null)
  useEffect(() => setSetOrderOverride(null), [source])
  useEffect(() => setManualOverride(null), [source.path])
  const sortKeys = useMemo(() => resolvedSortCount(view.sort, schema), [view.sort, schema])
  const sortedOrGrouped = sortKeys > 0 || view.group != null
  const groupPropId = view.group?.kind === 'property' ? view.group.property_id : undefined
  // Structural is the table's law: with no property grouping and no sort the pipeline paints tree
  // order, so a reorder must write its page_order slot — viewOrders is only the sorted tiebreaker.
  const structuralOrder = groupPropId === undefined && sortKeys === 0
  // Sort By: Location on its Location order is a computed filesystem order (drag off); Custom falls to
  // the manual order (drag on). In Location order the per-machine manual order must NOT feed the sorter,
  // or a prior Custom drag persists as the shown order and filesystem order never appears. A held
  // viewOrder mask never feeds a structural paint either — it interleaves locations, and the drag
  // boundary only exists over contiguous runs.
  const locationFsOrder = isLocationFsOrder(view)
  const manualOrder = locationFsOrder
    ? undefined
    : resolveManualOrder(
        sortedOrGrouped,
        manualOverride,
        structuralOrder ? undefined : viewOrders[view.id],
      )

  const contextIds = contextIdsOf(tree)
  const { groups, setTree } = useMemo(() => {
    const { rows, setTree } = flattenContainer(source, effectiveValues)
    return {
      groups: resolveView({
        rows,
        setTree,
        view: liveView,
        schema,
        manualOrder,
        flattenStructural: true,
        contextIds,
      }).groups,
      setTree,
    }
  }, [source, effectiveValues, liveView, schema, manualOrder, contextIds])

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
    // A failed write clears only ITS OWN order — a stale failure must not wipe a newer drag's
    // optimistic paint.
    setSetOrderOverride(order)
    void mutate({ op: 'moveSet', path: moved.path, newParentPath: source.path, order }).then(
      (ok) => {
        if (!ok) setSetOrderOverride((cur) => (cur === order ? null : cur))
      },
    )
  }

  const setNames = useMemo(() => buildSetNames(source), [source])
  const setIcons = useMemo(() => buildSetIcons(source), [source])
  const ctx = useMemo(
    () => (tree ? buildResolveContext(tree, schema, assetMap) : null),
    // buildResolveContext reads only contexts and the asset map — keying on those slices keeps ctx identity across unrelated tree pushes, so memoized cards hold.
    [tree?.contexts, schema, assetMap],
  )
  // Raw `view`: resolveColumns never reads column_styles, and liveView identity would break the
  // per-card memo on every band drop.
  const columns = useMemo(
    () => resolveColumns(view, schema, contextIds),
    [view, schema, contextIds],
  )
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
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
    resetBand()
  }, [view.id, resetBand])
  const toggleCollapse = (key: string): void => {
    const next = new Set(collapsed)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setCollapsed(next)
    // The local `collapsed` state already shows the toggle — skip the refetch's redundant full walk.
    persistView({ collapsed_groups: [...next] }, { viewState: true })
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
  // The hover ghost card on the shared mechanism — a naming session or an open picker
  // (the grid-level pair and any card's icon picker alike) suppresses the dwell, re-read at
  // fire time.
  const pickersOpenRef = useRef(false)
  const iconPickersOpen = useRef(0)
  const holdForIconPicker = (open: boolean): void => {
    iconPickersOpen.current += open ? 1 : -1
  }
  // A ghost that wrapped onto the next grid row is reached by crossing that row's other cards —
  // those row-mates are travel territory, not rival anchors. Geometric: grid row-mates share a
  // top edge. One rect read per card-enter, never per pointer-move.
  const ghostRowmate = (enteringId: string): boolean => {
    const root = rootRef.current
    const ghostEl = root?.querySelector('.ghost-card')
    const cardEl = root?.querySelector(`[data-rid="${CSS.escape(enteringId)}"]`)
    if (!ghostEl || !cardEl) return false
    const g = ghostEl.getBoundingClientRect()
    return Math.abs(g.top - cardEl.getBoundingClientRect().top) < g.height / 2
  }
  const ghostApi = useGhostAnchor({
    dwellMs: GHOST_DWELL_MS,
    graceMs: CARDS_GHOST_GRACE_MS,
    suppressed: () =>
      pickersOpenRef.current ||
      iconPickersOpen.current > 0 ||
      useSession.getState().renamingPath !== null,
    travelHold: { inZone: ghostRowmate, holdMs: GHOST_TRAVEL_HOLD_MS },
  })
  // The shared creation engine. The config getter runs only at gesture time, so it may close
  // over consts declared further down.
  const beginRename = useSession((s) => s.beginRename)
  const { bandAdd, createAfter } = useViewCreation(() => ({
    source,
    view,
    schema,
    values,
    setValueOverride,
    effectiveValues,
    structuralOrder,
    viewOrders,
    persistViewOrder,
    setManualOverride,
    rowBand,
    bandBucket: (key: string) => key,
    canReassign,
    groupPropId,
    groupPropType,
    setPaths,
    collapsed,
    toggleCollapse,
    viewRootRef: rootRef,
    onCreated: (created) => {
      // Runs ahead of the optimistic tree apply — the seat release, the order splice, and the
      // naming state all land in the commit that mounts the newborn.
      setPendingSeat(null)
      beginRename(created.path, true, 'detail')
    },
  }))
  const handlers = {
    commitValue,
    setColumnStyle,
    contextOptionsFor,
    openPage,
    revealProperty,
    hideProperty,
    openValuePicker,
    openAddPicker,
    refreshValues,
    newPageBelow: createAfter,
  }
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers
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
      onNewBelow: (row: ViewRow) => handlersRef.current.newPageBelow(row),
      // Identity-stable straight off the hook — no ref detour needed.
      onHover: ghostApi.onHover,
      onIconPicker: holdForIconPicker,
    }),
    [],
  )
  // Per-card location trail, resolved ONCE per grouping/location change — built as a map (not
  // called inline), since chain.slice allocates and a fresh array per render would defeat each
  // card's memo.
  const locByRow = useMemo(() => {
    const m = new Map<string, TrailSegment[]>()
    if (hideLocation || !tree) return m
    for (const r of flattenGroups(groups)) {
      if (!r.parentSetId) continue
      const chain = ancestryOf(tree, { kind: 'set', id: r.parentSetId })
      if (chain) m.set(r.id, chain.slice(structural ? 2 : 1))
    }
    return m
  }, [groups, tree, structural, hideLocation])

  // The grid-level picker requests — ONE host owns the portal pickers so card remounts (regroup,
  // re-sort, collapse) can never tear an open picker out mid-flight (CardPickerHost).
  const [valuePicker, setValuePicker] = useState<ValuePickerRequest | null>(null)
  const [addPicker, setAddPicker] = useState<AddPickerRequest | null>(null)
  pickersOpenRef.current = valuePicker !== null || addPicker !== null
  // One walk fills both: row id → row, and row id → TOP band key (the creation engine's
  // group-seed source — Cards flattens its groups, so no per-row group index exists elsewhere).
  // Per top-level group, so a sub-grouped descendant still reports the band it lives under.
  const { rowById, rowBand } = useMemo(() => {
    const byId = new Map<string, ViewRow>()
    const band = new Map<string, string>()
    for (const g of groups)
      for (const r of flattenGroups([g])) {
        byId.set(r.id, r)
        band.set(r.id, g.key)
      }
    return { rowById: byId, rowBand: band }
  }, [groups])

  // ── The ghost card's entry/exit displacement: neighbors make room on the cards' own move
  // feel. Two-phase commit — snapshot the displacement wrappers BEFORE the ghost enters or
  // leaves the grid, insert/remove it on the next commit, then animate each element from its
  // old seat (FLIP, deltas in local px — the grid lives under a CSS zoom). The layout read is
  // dwell-gated, never per-pointer-move; a create skips the exit animation outright, since the
  // real card takes the ghost's seat frames later.
  const feel = DEFAULT_FEEL
  const anyNaming = useSession((s) => s.renamingPath !== null)
  const flipPrev = useRef<Map<Element, DOMRect> | null>(null)
  const ghostLiveId =
    ghostApi.ghost && !ghostApi.ghost.closing && !anyNaming ? ghostApi.ghost.anchorId : null
  const [ghostShown, setGhostShown] = useState<string | null>(null)
  useLayoutEffect(() => {
    if (ghostLiveId === ghostShown) return
    const root = rootRef.current
    // A hard-gone ghost (take() creating, a pointerdown clear ahead of a drag) skips the exit
    // animation outright — the real card takes the seat, or the drag engine measures a grid
    // that must already be still. Only a graceful close (the hook still holds `closing`) and
    // the entry animate.
    const hardGone = ghostShown !== null && ghostApi.ghost === null
    if (root && !hardGone) {
      const m = new Map<Element, DOMRect>()
      for (const el of root.querySelectorAll('.card-displace, .group-band'))
        m.set(el, el.getBoundingClientRect())
      flipPrev.current = m
    } else flipPrev.current = null
    setGhostShown(ghostLiveId)
  }, [ghostLiveId, ghostShown])
  useLayoutEffect(() => {
    const prev = flipPrev.current
    flipPrev.current = null
    const root = rootRef.current
    if (prev && root) {
      const z = effectiveZoom || 1
      for (const el of root.querySelectorAll('.card-displace, .group-band')) {
        const before = prev.get(el)
        if (!before) continue
        const after = el.getBoundingClientRect()
        const dx = (before.left - after.left) / z
        const dy = (before.top - after.top) / z
        if (dx !== 0 || dy !== 0)
          el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
            duration: feel.duration,
            easing: feel.easing,
          })
      }
    }
    if (ghostApi.ghost?.closing && ghostShown === null) ghostApi.closed()
  }, [ghostShown])
  useClearStrandedGhost(ghostApi, rowBand)
  // The seat held across the create's round trip — take() empties the hook's ghost, but the
  // skeleton stays mounted on this id so the grid never closes the gap and reopens it; the
  // newborn replaces the skeleton in place, in the very commit that mounts it.
  const [pendingSeat, setPendingSeat] = useState<string | null>(null)
  const ghostCreate = (): void => {
    const anchorId = ghostApi.take()
    const anchor = anchorId ? rowById.get(anchorId) : undefined
    if (!anchor) return
    setPendingSeat(anchor.id)
    void createAfter(anchor).then((ok) => {
      if (!ok) setPendingSeat(null)
    })
  }

  // Cross-band card drag → property reassignment. Only a status/select/checkbox property grouping
  // maps a band key back to a settable value; a cross-band drop there reassigns the property. Under
  // LOCATION grouping the bands are folders, so a cross-band drop MOVES the page into that Set.
  // Within-band reorder holds whenever the order is manually meaningful.
  const groupPropType = groupPropId ? declaredType(groupPropId, schema) : undefined
  const canReassign = groupPropType !== undefined && REASSIGNABLE_GROUP_TYPES.has(groupPropType)
  const canRelocate = structural
  const setPaths = useMemo(() => buildSetPaths(source), [source])
  const canReorderWithin = sortKeys < 2 && !locationFsOrder

  // The band list Cards hit-tests: one flat level, since a top set's whole subtree rolls into a
  // single band here. Flat mode's one headless band has no header to grab, so it offers none.
  const bands = useMemo(
    () => (flatMode ? [] : flattenBands(groups, collapsed)),
    [flatMode, groups, collapsed],
  )
  const bandLabel = (id: string): string => {
    const g = groups.find((x) => x.key === id)
    return g && ctx ? resolveBandHead(g, liveView, ctx, setNames, setIcons, source).label : id
  }
  // A band drop on one flat level is always a reorder. What it writes turns on the GROUPING's own
  // order mode, never the sort's — the table's law: under Location the filesystem is the order, so
  // the container's set_order takes the write; anywhere else the view's band order does, and a
  // write to the wrong one of the two is discarded by the resolver that ignores it.
  const onBandDrop = (draggedId: string, drop: BandDrop): void => {
    if (drop.kind !== 'reorder') return
    const dragged = bands.find((b) => b.id === draggedId)
    if (!dragged) return
    if (dragged.kind === 'set' && structural && liveView.structural_order_mode === 'location') {
      void mutate({
        op: 'reorderChildren',
        parentPath: source.path,
        key: 'set_order',
        order: nextOrder(
          setTree.map((n) => n.id),
          draggedId,
          drop.beforeId,
        ),
      })
      return
    }
    const patch = bandReorderPatch({
      dragged,
      beforeId: drop.beforeId,
      view: liveView,
      structuralIds: setTree.flatMap(subtreeIds),
      propertyKeys: groups.filter((g) => g.kind === 'property').map((g) => g.key),
    })
    if (patch) commitBand(patch)
  }
  const cardDragEnabled = canReorderWithin || canReassign || canRelocate
  // The band as the drag sees it — the landing index the resolver ranges over and the one the
  // reorder splices against are both indices into THIS list.
  const bandRowsWithout = (bandKey: string, activeId: string): ViewRow[] =>
    flattenGroups(groups.filter((g) => g.key === bandKey)).filter((r) => r.id !== activeId)
  // A band rolls whole subtrees flat, so structurally a card ranks only among its own folder's direct
  // children — a landing among another location's cards is refused. Cross-band stays a relocate.
  const structuralSlotFor = (zoneId: string, index: number, activeId: string): number | null => {
    if (!structuralOrder) return index
    if (rowBand.get(activeId) !== zoneId) return index
    const row = rowById.get(activeId)
    if (!row) return null
    const parent = parentOf(row.path)
    const without = bandRowsWithout(zoneId, activeId)
    let first = -1
    let count = 0
    without.forEach((r, i) => {
      if (parentOf(r.path) !== parent) return
      if (first < 0) first = i
      count++
    })
    if (first < 0) return null
    return index >= first && index <= first + count ? index : null
  }
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
    if (structuralOrder) {
      // The canonical write ranks over FULL membership — hidden rows keep their page_order rank. A
      // held viewOrder mask is what paints, so the drag maintains it too or the file re-ranks unseen.
      const painted = flattenGroups(groups).map((r) => r.id)
      if (sameIds(full, painted)) return
      const row = rowById.get(activeId)
      if (!row) return
      const parent = parentOf(row.path)
      const sibAfter = bandRowsWithout(bandKey, activeId)
        .slice(toIndex)
        .find((r) => parentOf(r.path) === parent)
      const all = flattenContainer(source, effectiveValues).rows
      const current = all.filter((r) => parentOf(r.path) === parent).map((r) => r.id)
      const sibIds = current.filter((id) => id !== activeId)
      const order = spliceBeside(sibIds, sibAfter?.id ?? null, activeId, 'above')
      setManualOverride(full)
      if (!sameIds(order, current))
        void mutate({ op: 'movePage', path: row.path, newParentPath: parent, order })
      return
    }
    setManualOverride(full)
    persistViewOrder(full)
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
      if (row && destPath && destPath !== parentOf(row.path)) {
        // A row page_order can actually rank against: a direct child of the destination that
        // isn't the card being moved.
        const isDestSibling = (r: ViewRow): boolean =>
          parentOf(r.path) === destPath && r.id !== activeId
        const all = flattenContainer(source, effectiveValues).rows
        const destIds = all.filter(isDestSibling).map((r) => r.id)
        const bandRows = flattenGroups(groups.filter((g) => g.key === toZone))
        // The visual landing row — any card in the band, rolled-up descendants included.
        const beforeId = bandRows[toIndex]?.id ?? null
        // A rolled-up descendant as the landing degrades to append on the canonical channel —
        // walk forward to the first true sibling so the write lands as close to the drop slot
        // as page_order can express.
        const sibBefore = bandRows.slice(toIndex).find(isDestSibling)?.id ?? null
        const order = spliceBeside(destIds, sibBefore, activeId, 'above')
        // The live arrays hold the moved card's OLD rank as the sole comparator on a grouped
        // view, and nothing re-emits them on a tree push — splice them in the drop's own act
        // (the creation settle's law), rebuilt over full membership so a landing row a stale
        // array never listed still anchors the slot instead of degrading to append.
        const allIds = all.map((r) => r.id)
        const spliceLive = (existing: string[] | undefined): string[] =>
          tieOrderWith(existing, allIds, activeId, beforeId, 'above')
        setManualOverride((m) => (m ? spliceLive(m) : m))
        if (viewOrders[view.id]) persistViewOrder(spliceLive(viewOrders[view.id]))
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
    // The suppress handle travels by context — the memoized cards pop native menus themselves,
    // where caller-side wrapping can't reach.
    <GhostSuppress.Provider value={ghostApi.suppressWrap}>
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
          resolveIndex={structuralSlotFor}
          // The lifted card IS the whole card (the nav-gallery drag look), not a partial glyph — the same
          // CardFace the live card renders, at is-dragging opacity, floating under the pointer while its
          // slot reflows to show the landing. The `.cards-view` carrier re-declares the knob vars +
          // view zoom that the body-portaled overlay would otherwise lose (thumb/scale/compact reserve).
          renderOverlay={(id) => {
            const r = rowById.get(id)
            if (!r || !ctx) return null
            const oCover = typeof r.frontmatter.cover === 'string' ? r.frontmatter.cover : undefined
            const oSrc = banner === 'preview' ? thumbSrc(nexusId, r.id, 0) : undefined
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
                <CardRoot
                  dragging
                  className="card-overlay"
                  style={{ width: '100%', height: '100%' }}
                >
                  <CardBody pop={false}>
                    <CardFace
                      row={r}
                      view={liveView}
                      banner={banner}
                      ctx={ctx}
                      crumbs={locByRow.get(id) ?? NO_TRAIL}
                      src={oSrc}
                      cover={oCover}
                      iconName={entityIcon('page', r.icon, defaultIcons)}
                      columns={columns}
                      allowInlineRemove={false}
                      naming={false}
                      onCommitValue={NOOP}
                      onStyle={NOOP}
                      onHide={NOOP}
                      onOpenValuePicker={NOOP}
                    />
                  </CardBody>
                </CardRoot>
              </div>
            )
          }}
        >
          {/* One flat level of bands, so a drop is always a reorder — a top set's whole subtree
            already rolls into its own band here, leaving no depth for a nest to land in. */}
          <BandDnd bands={bands} labelFor={bandLabel} onDrop={onBandDrop} nestable={false}>
            {groups.map((g) => {
              const rows = flattenGroups([g])
              // Group By: None is one headerless, force-open band — a stale collapse from another grouping
              // would otherwise hide every card with no head to toggle.
              const isCollapsed = !flatMode && collapsed.has(g.key)
              return (
                <ViewGroupBand
                  key={g.key}
                  group={g}
                  view={liveView}
                  ctx={ctx}
                  setNames={setNames}
                  setIcons={setIcons}
                  source={source}
                  collapsed={isCollapsed}
                  onToggle={() => toggleCollapse(g.key)}
                  onAdd={setPaths.has(g.key) ? () => bandAdd(g.key) : undefined}
                  headless={flatMode}
                  fill
                >
                  <SortableZone
                    group="cards"
                    id={g.key}
                    items={rows.map((r) => r.id)}
                    className="cards-grid card-grid is-fill"
                  >
                    {rows.flatMap((row) => {
                      const card = (
                        <PageCard
                          key={row.id}
                          row={row}
                          view={liveView}
                          banner={banner}
                          nexusId={nexusId}
                          columns={columns}
                          ctx={ctx}
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
                          onNewBelow={cardApi.onNewBelow}
                          onHover={cardApi.onHover}
                          onIconPicker={cardApi.onIconPicker}
                          allowInlineRemove={effectiveZoom >= 0.8}
                        />
                      )
                      if (ghostShown !== row.id && pendingSeat !== row.id) return [card]
                      return [
                        card,
                        <GhostCard
                          key={`ghost-${row.id}`}
                          banner={banner}
                          view={liveView}
                          columns={columns}
                          ctx={ctx}
                          iconName={entityIcon('page', undefined, defaultIcons)}
                          onEnter={ghostApi.onGhostEnter}
                          onLeave={ghostApi.onGhostLeave}
                          onCreate={ghostCreate}
                        />,
                      ]
                    })}
                  </SortableZone>
                </ViewGroupBand>
              )
            })}
          </BandDnd>
        </DragGroup>
        {ctx && (
          <CardPickerHost
            value={valuePicker}
            add={addPicker}
            rowById={rowById}
            view={liveView}
            ctx={ctx}
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
    </GhostSuppress.Provider>
  )
}

/** The hover ghost card — the card's own skeleton at the inactive dim: the unloaded-cover
 *  placeholder in the image band, the card's image-to-text divider, an (icon)(New Page) title
 *  row, and — in a Standard layout with visible properties — their ghosted label rows. Pure
 *  chrome: no page until the click, which runs the same immediate-create act as the card
 *  menu's New Page. Never a drag member. */
function GhostCard({
  banner,
  view,
  columns,
  ctx,
  iconName,
  onEnter,
  onLeave,
  onCreate,
}: {
  banner: CardBanner
  view: SavedView
  columns: ResolvedColumn[]
  ctx: ResolveContext | null
  iconName: string
  onEnter: () => void
  onLeave: () => void
  onCreate: () => void
}): React.JSX.Element {
  const props = isCompact(view) ? [] : columns.filter((c) => c.kind !== 'title')
  return (
    <CardRoot
      data-ghost-root
      className="ghost-card"
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onClick={onCreate}
    >
      <CardBody pop={false} className="ghost-worn">
        {banner !== 'none' && (
          <CardThumb>
            <CardPlaceholder>
              <Icon name={iconName} size="title1" />
            </CardPlaceholder>
          </CardThumb>
        )}
        <CardText>
          <CardTitle mode="static">
            <Icon name={iconName} className="card-title-icon" />
            <span className="card-title-text">New Page</span>
          </CardTitle>
          {props.length > 0 && ctx && (
            <div className="card-props">
              {props.map((c) => (
                <div key={c.id} className="card-prop-row">
                  <span className={cx('card-prop-label', text.caption.emphasized)}>
                    {columnLabel(c.id, ctx.schema, ctx.contexts)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardText>
      </CardBody>
    </CardRoot>
  )
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
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const iconName = entityIcon('set', set.icon, defaultIcons)
  const thumbRef = useRef<HTMLDivElement>(null)
  const { openMenu, editing, closeEditor, boxAspect, onSave, onRepick } = useBannerMenu(
    set.path,
    'set',
    { value: set.banner, frame: thumbRef, autoEdit: true },
  )
  return (
    <CardRoot
      drag={drag}
      locked
      onClick={(e) => {
        if (!drag?.isDragging)
          void select({ kind: 'set', id: set.id, path: set.path }, { newTab: e.metaKey })
      }}
    >
      <CardBody>
        <CardThumb
          ref={thumbRef}
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
            void openMenu()
          }}
        >
          <AssetImage
            value={set.banner}
            fallback={
              <CardPlaceholder>
                <Icon name={iconName} size="largeTitle" />
              </CardPlaceholder>
            }
          />
          <ImagePicker
            open={editing}
            value={set.banner ?? ''}
            shape="rect"
            boxAspect={boxAspect}
            onCancel={closeEditor}
            onSave={onSave}
            onRepick={onRepick}
          />
        </CardThumb>
        <CardText>
          <CardTitle>
            <Icon name={iconName} className="card-title-icon" />
            <span className="card-title-text">{set.title}</span>
          </CardTitle>
        </CardText>
      </CardBody>
    </CardRoot>
  )
}

interface PageCardProps {
  row: ViewRow
  view: SavedView
  banner: CardBanner
  nexusId: string
  columns: ResolvedColumn[]
  ctx: ResolveContext | null
  loc?: TrailSegment[]
  onCommitValue: (row: ViewRow, column: ResolvedColumn, value: PropertyValue | null) => void
  onStyle: (colId: string, key: keyof ColumnStyle & string, value: string) => void
  onOpen: (row: ViewRow, newTab: boolean) => void
  onReveal: (id: string) => void
  onHide: (id: string) => void
  onOpenValuePicker: (req: ValuePickerRequest) => void
  onOpenAddPicker: (req: AddPickerRequest) => void
  onRefreshValues: () => void
  onNewBelow: (row: ViewRow) => void
  onHover: (id: string, entering: boolean) => void
  onIconPicker: (open: boolean) => void
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
  | 'onCommitValue'
  | 'onStyle'
  | 'onHide'
  | 'onOpenValuePicker'
  | 'allowInlineRemove'
> & {
  shown: ResolvedColumn[]
  onZoneClick: (e: React.MouseEvent) => void
}): React.JSX.Element | null {
  const styleFor = useStyleFor()
  if (!ctx) return null
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
  crumbs,
  src,
  cover,
  iconName,
  columns,
  allowInlineRemove,
  naming,
  onImgError,
  textRef,
  thumbRef,
  onThumbContextMenu,
  onZoneClick,
  onCommitValue,
  onStyle,
  onHide,
  onOpenValuePicker,
}: {
  row: ViewRow
  naming: boolean
  view: SavedView
  banner: CardBanner
  ctx: ResolveContext | null
  crumbs: TrailSegment[]
  src: string | undefined
  /** The page's `cover` value — Cover mode frames it through AssetImage; Preview uses `src`. */
  cover?: string
  iconName: string
  columns: ResolvedColumn[]
  allowInlineRemove: boolean
  onImgError?: () => void
  textRef?: React.Ref<HTMLDivElement>
  thumbRef?: React.Ref<HTMLDivElement>
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
  const titleIcon = !(view.hide_page_icons ?? false) && (
    <Icon name={iconName} className="card-title-icon" />
  )
  const titleRow = (
    <CardTitle mode={(view.wrap_titles ?? false) ? 'wrap' : 'scroll'}>
      {titleIcon}
      <span className="card-title-text">{row.title}</span>
    </CardTitle>
  )
  // While this card is the naming target the whole title row swaps for the fenced field —
  // outside the OverScroll clip, the glyph staying put, pointerdown stopped against the
  // whole-surface drag handle.
  const namingRow = naming && (
    <CardTitle mode="static" onPointerDown={(e) => e.stopPropagation()}>
      {titleIcon}
      <RenamableTitle
        path={row.path}
        kind="page"
        title={row.title}
        className={cx(titleInput, 'card-title-input')}
        host="detail"
      />
    </CardTitle>
  )
  const ph = (
    <CardPlaceholder>
      <Icon name={iconName} size="title1" />
    </CardPlaceholder>
  )
  return (
    <>
      {banner !== 'none' && (
        <CardThumb
          ref={thumbRef}
          capture={banner === 'preview'}
          onContextMenu={onThumbContextMenu ? (e) => void onThumbContextMenu(e) : undefined}
        >
          {banner === 'cover' ? (
            <AssetImage value={cover} fallback={ph} />
          ) : src ? (
            <img src={src} alt="" onError={onImgError} />
          ) : (
            ph
          )}
        </CardThumb>
      )}
      <CardText
        ref={textRef}
        onClick={
          onZoneClick
            ? (e) => {
                if (e.target === e.currentTarget) onZoneClick(e)
              }
            : undefined
        }
      >
        {namingRow || titleRow}
        {shown.length > 0 && (
          <CardProperties
            row={row}
            view={view}
            ctx={ctx}
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
          <div className="card-loc-zone" onClick={onZoneClick}>
            <CardTrail segments={crumbs} />
          </div>
        )}
      </CardText>
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
  loc,
  onCommitValue,
  onStyle,
  onOpen,
  onReveal,
  onHide,
  onOpenValuePicker,
  onOpenAddPicker,
  onRefreshValues,
  onNewBelow,
  onHover,
  onIconPicker,
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
  const addableNow = (): AddEntry[] => (ctx ? addEntriesFor(row, view, ctx, columns, tree) : [])
  const openAdd = useCallback(
    (e: React.MouseEvent): void => {
      e.stopPropagation()
      // Nothing addable → don't pop a dead-end empty picker (the native menu already omits its submenu).
      if (!isDragging && addableNow().length > 0 && textRef.current)
        onOpenAddPicker({ rowId: row.id, anchor: textRef.current, initialEntry: null })
    },
    [isDragging, onOpenAddPicker, row, ctx, view, columns, tree],
  )
  const mutate = useSession((s) => s.mutate)
  // The card is the live naming target — creation and menu Rename both open the fenced inline
  // field (cards were the odd surface out; the popover rename retired with it). A session the
  // gesture declared for the sidebar stays the sidebar's: the card keeps its title row and its
  // click-to-open rather than swapping in a field the fence will never award it.
  const naming = useSession((s) => s.renamingPath === row.path && s.renamingHost !== 'sidebar')
  // The view's ghost stands down while any of this card's native menus own the pointer.
  const holdGhost = useContext(GhostSuppress)
  const [iconOpen, setIconOpen] = useState(false)
  // The icon picker holds the dwell for its whole life (the menus above only cover their own
  // pop) — effect-paired so an unmount with the picker open can never leak the hold.
  useEffect(() => {
    if (!iconOpen) return
    onIconPicker(true)
    return () => onIconPicker(false)
  }, [iconOpen, onIconPicker])
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
    const action = await holdGhost(() =>
      window.nexus.cardMenu({
        addable: menuAddable,
        alreadyOpen,
        editableImage: banner === 'cover' && !!cover,
        ...pageMoveContext(tree, row.path),
      }),
    )
    if (!action) return
    if (runPageSendAction(action, row.path)) return
    if (action === 'image:edit') openEditor()
    else if (action === 'title:newtab') onOpen(row, true)
    else if (action === 'title:rename') useSession.getState().beginRename(row.path, false, 'detail')
    else if (action === 'title:icon') setIconOpen(true)
    else if (action === 'title:newbelow') onNewBelow(row)
    else if (action === 'title:delete') void mutate({ op: 'delete', path: row.path, kind: 'page' })
    else if (action.startsWith('add:')) {
      const entry = addable.find((e) => e.id === action.slice(4))
      if (!entry) return
      if (entry.revealOnly) onReveal(entry.id)
      else if (textRef.current)
        onOpenAddPicker({ rowId: row.id, anchor: textRef.current, initialEntry: entry })
    }
  }
  const crumbs = loc ?? NO_TRAIL

  const cover = typeof row.frontmatter.cover === 'string' ? row.frontmatter.cover : undefined
  const onImgError = useCallback(() => setFailed(true), [])
  const thumbRef = useRef<HTMLDivElement>(null)
  // The image band's banner menu (the PageHeader flow), worded for the view's display config —
  // Cover mode says Cover, Preview says Banner (both edit the page's one settable image; a Preview
  // thumb is a capture, not a pickable file). Edit joins it; onSave frames the cover.
  const {
    openMenu: openBannerMenu,
    editing,
    openEditor,
    closeEditor,
    boxAspect,
    onSave,
    onRepick,
  } = useBannerMenu(row.path, 'page', {
    value: cover,
    frame: thumbRef,
    noun: banner === 'cover' ? 'Cover' : 'Banner',
    onDone: onRefreshValues,
    autoEdit: true,
  })
  // Only Preview's capture thumbnail rides `src`; a Cover is framed by AssetImage from `cover`.
  const src = banner === 'preview' ? thumbSrc(nexusId, row.id, version) : undefined
  if (src !== lastSrc.current) {
    lastSrc.current = src
    if (failed) setFailed(false)
  }
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const active = useSession((s) => s.selection.kind === 'page' && s.selection.id === row.id)
  const iconName = entityIcon('page', row.icon, defaultIcons)

  // The drag engine fires a synthesized click after a pointer drag — a reorder-drop must not
  // navigate (NavGallery's `!isDragging` guard).
  return (
    <CardRoot
      drag={drag}
      active={active}
      data-rid={row.id}
      onPointerEnter={() => onHover(row.id, true)}
      onPointerLeave={() => onHover(row.id, false)}
      onClick={(e) => {
        if (drag?.isDragging || naming) return
        // Only the title + banner open the page. A click landing anywhere else — a value's picker that
        // just dismissed, the reflowed compact flow, the close-animation window — must not navigate.
        // elementFromPoint reads the real element under the pointer, robust to whatever moved between
        // press and release (a value's own click stops propagation, so it never reaches here).
        const hit = document.elementFromPoint(e.clientX, e.clientY)
        if (hit && e.currentTarget.contains(hit) && hit.closest('.card-title, .card-thumb'))
          onOpen(row, e.metaKey)
      }}
      onContextMenu={onCardContextMenu}
    >
      {/* The displacement wrapper — the ghost's FLIP rides it: the root's transform belongs to
          the drag engine, and the body is hover-pop's surface whose stylesheet transitions
          transform (an inverse transform there would animate — a wrong-direction hop). */}
      <div className="card-displace">
        <CardBody>
          <CardFace
            row={row}
            view={view}
            banner={banner}
            ctx={ctx}
            crumbs={crumbs}
            src={failed ? undefined : src}
            cover={cover}
            iconName={iconName}
            columns={columns}
            allowInlineRemove={allowInlineRemove}
            naming={naming}
            onImgError={onImgError}
            textRef={textRef}
            thumbRef={thumbRef}
            onThumbContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              void openBannerMenu()
            }}
            onZoneClick={openAdd}
            onCommitValue={onCommitValue}
            onStyle={onStyle}
            onHide={onHide}
            onOpenValuePicker={onOpenValuePicker}
          />
        </CardBody>
      </div>
      {/* A persistent mount riding `open` — the Bloom-out plays on dismiss (a conditional mount
          tears the instance out mid-exit). The add-picker lives at the grid-level host, not here. */}
      <IconPicker
        open={iconOpen}
        triggerRef={textRef}
        value={typeof row.icon === 'string' ? row.icon : undefined}
        onSelect={(icon) => void mutate({ op: 'setIcon', path: row.path, kind: 'page', icon })}
        onClose={() => setIconOpen(false)}
      />
      <ImagePicker
        open={editing}
        value={cover ?? ''}
        shape="rect"
        boxAspect={boxAspect}
        onCancel={closeEditor}
        onSave={onSave}
        onRepick={onRepick}
      />
    </CardRoot>
  )
})
