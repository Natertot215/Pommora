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
import type { ResolvedColumn, ResolvedGroup, ViewRow } from '@pommora/core/Views/viewRow'
import type { SetNode } from '@pommora/core/Nexus/tree'
import { UNGROUPED } from '@pommora/core/Views/viewRow'
import { isBlankValue, type PropertyValue } from '@pommora/core/Properties/propertyValue'
import { type CardBanner, isCompact, type SavedView } from '@pommora/core/Views/views'
import type { ColumnStyle } from '@pommora/core/Properties/columnStyles'
import { isOptionsKind } from '@pommora/core/Properties/properties'
import { confirmDelete } from '../../Interface/Confirm/confirmations'
import { Icon } from '@pommora/uix/Symbols'
import { entityIcon } from '../../Assets/entityIconPolicy'
import { text } from '@pommora/uix/Theme/typography.css'
import {
  CardBody,
  CardDropSlot,
  CardPlaceholder,
  CardRoot,
  CardText,
  CardThumb,
  CardTitle,
  CardTrail,
} from '@pommora/uix/Cards/Card'
import {
  DragGroup,
  type DragItem,
  SortableZone,
  useDragItem,
  useGroupedDragItem,
} from '@pommora/uix/Interactions/drag'
import { cx } from '@pommora/uix/Utilities/cx'
import { assetUrl } from '../../Platform/assetScheme'
import { useSession } from '../../Session/store'
import { hoverGlance, leaveGlance } from '../../Interface/Glance/glanceLink'
import { glanceShown } from '../../Interface/Glance/glanceAction'
import { AssetImage } from '../../Assets/AssetImage'
import { ImagePicker } from '../../Assets/ImagePicker'
import { useBannerMenu } from '../../Interface/Header/useBannerMenu'
import { byOrder, parentOf } from '@pommora/core/Nexus/treePatch'
import { thumbKey, thumbRel } from '@pommora/core/Paths/nexusPaths'
import { navKey } from '../../Navigation/navRecents'
import { findCollectionForSet } from '../../Nexus/treeIndex'
import { sameIds, spliceBeside, tieOrderWith } from '../creationOrder'
import type { ViewHostApi } from '../Host/useViewHost'
import { subtreeIds } from '../Pipeline/group'
import {
  GHOST_DWELL_MS,
  GHOST_TRAVEL_HOLD_MS,
  GhostSuppress,
  useClearStrandedGhost,
  useGhostAnchor,
} from '@pommora/uix/Interactions/ghostCreate'
import { DEFAULT_FEEL } from '@pommora/uix/Animations/feel'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { columnLabel, useCapitalizeMetadata } from '../../Properties/Cells/columnLabel'
import { useStyleFor } from '../Host/useColumnStyles'
import { ViewGroupBand } from '../Bands/ViewGroupBand'
import { BandDnd, type BandDrop } from '../Bands/BandDnd'
import { flattenBands } from '../Bands/bandDndModel'
import { bandReorderPatch } from '../Bands/useBandOrdering'
import { nextOrder } from '@pommora/uix/Interactions/reorderModel'
import type { ValueContext } from '../../Properties/valueContext'
import { NO_TRAIL, type TrailSegment } from '@pommora/uix/Elements/NavTrail'
import { ancestryOf } from '../../Nexus/treeIndex'

import { TextPicker } from '@pommora/uix/Pickers/TextPicker'
import { solidColorCss } from '@pommora/uix/Theme/ramp'
import {
  type PickEntry,
  type PickTarget,
  PropertyPicker,
  syntheticContextDef,
} from '../../Properties/Pickers/PropertyPicker'
import { resolveFieldValue } from '../../Properties/value'
import {
  numberFormatGlyph,
  propertyIcon,
  propertyTypeIconName,
} from '../../Properties/Cells/PropertyTypes'
import { parseEditorValue } from '../../Properties/parseEditorValue'
import { linkEditText } from '@pommora/core/Connections/linkValue'
import { CardValue } from './CardValue'
import { reorderIds } from './cardsOrder'
import {
  type AddEntry,
  addColumn,
  addEntriesFor,
  orderAddableEntries,
  shownColumnsFor,
} from './cardValueInput'
import { pageMoveContext, runPageSendAction } from '../../Interface/Menus/pageMenuActions'
import { IconChoice } from '../../Assets/IconChoice'
import { RenamableTitle } from '../../Interface/RenamableTitle'
import { titleInput } from '@pommora/uix/Menus'
import { isOpenInTabs } from '../../Navigation/tabsModel'
import { popMenu } from '../../Actions/menuActions'
import { cardMenuModel } from '@pommora/core/Actions/cardMenu'
import './cards-view.css'
import { clamp } from '@pommora/uix/Utilities/clamp'

type ValuePickerRequest = {
  rowId: string
  column: ResolvedColumn
  kind: 'picker' | 'datetime' | 'link' | 'number' | 'file'
  anchor: HTMLElement
  clickX?: number
  revealOnCommit?: boolean
}

type AddPickerRequest = {
  rowId: string
  anchor: HTMLElement
  initialEntry: AddEntry | null
}

const thumbSrc = (nexusId: string, pageId: string, v: number): string =>
  `${assetUrl(thumbRel(nexusId, thumbKey(navKey({ kind: 'page', id: pageId }))))}?v=${v}`

const coverOf = (row: ViewRow): string | undefined =>
  typeof row.frontmatter.banner === 'string' ? row.frontmatter.banner : undefined

const CARDS_GHOST_GRACE_MS = 200 // KNOB

export function CardsView({ host }: { host: ViewHostApi }): React.JSX.Element {
  const {
    source,
    view,
    liveView,
    columns,
    groups,
    setTree,
    rows,
    ctx,
    setNames,
    setIcons,
    setPaths,
    rowById,
    rowBand,
    bandLabel,
    collapsed,
    toggleCollapse,
    structuralGrouping: structural,
    groupPropId,
    groupPropType,
    canReassign,
    canReorderWithin,
    canRelocate,
    reassignBySortRun,
    structuralOrder,
    dragDisabled,
    setManualOverride,
    persistView,
    setStylePatch,
    hideProperty,
    revealProperty,
    commitBand,
    commitValue,
    commitGroupValue,
    contextOptionsFor,
    creation,
    mutate,
    select,
    tree,
  } = host
  const openWindow = useSession((s) => s.openWindow)
  const nexusId = useSession((s) => s.tree?.nexus.id ?? '')

  const [setOrderOverride, setSetOrderOverride] = useState<string[] | null>(null)
  useEffect(() => setSetOrderOverride(null), [source])

  const reorderSets = (activeId: string, overId: string): void => {
    const order = reorderIds(
      sets.map((s) => s.id),
      activeId,
      overId,
    )
    const moved = sets.find((s) => s.id === activeId)
    if (!moved) return
    setSetOrderOverride(order)
    void mutate({ op: 'moveSet', path: moved.path, newParentPath: source.path, order }).then(
      (ok) => {
        if (!ok) setSetOrderOverride((cur) => (cur === order ? null : cur))
      },
    )
  }

  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const flatMode = view.group?.kind === 'flat'

  const banner: CardBanner = view.card_banner ?? 'image'
  const baseSets = source.sets ?? []
  const sets = useMemo(
    () => (setOrderOverride ? byOrder(baseSets, setOrderOverride) : baseSets),
    [baseSets, setOrderOverride],
  )
  const showSetCards = (view.set_cards ?? true) && sets.length > 0
  const hideLocation = view.hide_location ?? false
  const owner =
    source.kind === 'collection' ? source : tree ? findCollectionForSet(tree, source.id) : undefined
  const openPage = (row: ViewRow, newTab: boolean): void => {
    if (owner?.openIn === 'page-preview' && !newTab) openWindow({ id: row.id, path: row.path })
    else void select({ kind: 'page', id: row.id, path: row.path }, { newTab })
  }

  const openValuePicker = (req: ValuePickerRequest): void => setValuePicker(req)
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
  const pickersOpenRef = useRef(false)
  const iconPickersOpen = useRef(0)
  const holdForIconPicker = (open: boolean): void => {
    iconPickersOpen.current += open ? 1 : -1
  }
  const ghostRowmate = (enteringId: string): boolean => {
    const root = host.seam.viewRootRef.current
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
      useSession.getState().renamingPath !== null ||
      glanceShown(),
    travelHold: { inZone: ghostRowmate, holdMs: GHOST_TRAVEL_HOLD_MS },
  })
  const beginRename = useSession((s) => s.beginRename)
  const { bandAdd, createAfter } = creation
  host.seam.foldOverrides.current = (v) => v
  host.seam.bandBucket.current = (key) => key
  host.seam.onCreated.current = (created) => {
    setPendingSeat(null)
    beginRename(created.path, true, 'detail')
  }
  const handlers = {
    commitValue,
    setStylePatch,
    contextOptionsFor,
    openPage,
    revealProperty,
    hideProperty,
    openValuePicker,
    openAddPicker,
    newPageBelow: createAfter,
  }
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers
  const cardApi = useMemo(
    () => ({
      onCommitValue: (row: ViewRow, column: ResolvedColumn, value: PropertyValue | null) =>
        handlersRef.current.commitValue(row, column, value),
      onStyle: (colId: string, key: keyof ColumnStyle & string, value: string) =>
        handlersRef.current.setStylePatch(colId, key, value),
      contextOptionsFor: (column: ResolvedColumn) => handlersRef.current.contextOptionsFor(column),
      onOpen: (row: ViewRow, newTab: boolean) => handlersRef.current.openPage(row, newTab),
      onReveal: (id: string) => handlersRef.current.revealProperty(id),
      onHide: (id: string) => handlersRef.current.hideProperty(id),
      onOpenValuePicker: (req: ValuePickerRequest) => handlersRef.current.openValuePicker(req),
      onOpenAddPicker: (req: AddPickerRequest) => handlersRef.current.openAddPicker(req),
      onNewBelow: (row: ViewRow) => handlersRef.current.newPageBelow(row),
      onHover: ghostApi.onHover,
      onIconPicker: holdForIconPicker,
    }),
    [],
  )
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

  const [valuePicker, setValuePicker] = useState<ValuePickerRequest | null>(null)
  const [addPicker, setAddPicker] = useState<AddPickerRequest | null>(null)
  pickersOpenRef.current = valuePicker !== null || addPicker !== null

  const styleFor = useStyleFor()
  const capitalize = useCapitalizeMetadata()
  const pickerAnchorRef = useRef<HTMLElement | null>(null)
  pickerAnchorRef.current = (valuePicker ?? addPicker)?.anchor ?? null

  useEffect(() => {
    if (!valuePicker || !ctx) return
    const row = rowById.get(valuePicker.rowId)
    if (!row) return setValuePicker(null)
    if (valuePicker.revealOnCommit) return
    const cur = resolveFieldValue(row, valuePicker.column.id, ctx.schema)
    const isCheckbox = ctx.schema.find((d) => d.id === valuePicker.column.id)?.type === 'checkbox'
    if (isCompact(liveView) && isBlankValue(cur) && !isCheckbox) setValuePicker(null)
  }, [valuePicker, rowById, ctx, liveView])
  useEffect(() => {
    if (addPicker && !rowById.get(addPicker.rowId)) setAddPicker(null)
  }, [addPicker, rowById])

  const pickTargetFor = (
    rowId: string,
    column: ResolvedColumn,
    kind: PickTarget['kind'],
  ): PickTarget | null => {
    const row = rowById.get(rowId)
    if (!row || !ctx) return null
    const current = resolveFieldValue(row, column.id, ctx.schema)
    const def = ctx.schema.find((d) => d.id === column.id) ?? syntheticContextDef(column.id)
    const style = styleFor(column.id, ctx.schema, liveView)
    if (kind === 'datetime') return { kind, def, current, dateFormat: style.date_format }
    if (kind === 'file') return { kind, def, current }
    return {
      kind: 'options',
      def,
      current,
      look: style.look,
      contextOptions: contextOptionsFor(column) ?? undefined,
    }
  }

  const valuePopup =
    valuePicker && valuePicker.kind !== 'link' && valuePicker.kind !== 'number' ? valuePicker : null
  const vTarget = valuePicker
    ? pickTargetFor(
        valuePicker.rowId,
        valuePicker.column,
        valuePicker.kind === 'datetime'
          ? 'datetime'
          : valuePicker.kind === 'file'
            ? 'file'
            : 'options',
      )
    : null
  const vRaw = vTarget?.current?.kind === 'url' ? vTarget.current.value : undefined
  const commitPicked = (v: PropertyValue | null, entry?: PickEntry): void => {
    const req = valuePicker ?? addPicker
    const row = req && rowById.get(req.rowId)
    if (!row) return
    const column = valuePicker ? valuePicker.column : addColumn(entry?.id ?? '', tree)
    const creating = entry !== undefined || (valuePicker?.revealOnCommit ?? false)
    if (creating && !isBlankValue(v)) revealProperty(column.id)
    commitValue(row, column, v)
  }

  const addRow = addPicker && ctx ? rowById.get(addPicker.rowId) : undefined
  const addEntries =
    addRow && ctx
      ? orderAddableEntries(addEntriesFor(addRow, liveView, ctx, columns, tree, capitalize))
      : []

  const feel = DEFAULT_FEEL
  const anyNaming = useSession((s) => s.renamingPath !== null)
  const flipPrev = useRef<Map<Element, DOMRect> | null>(null)
  // Kept mounted through `closing` so its Reveal can collapse it out, matching the sidebar and table ghosts; it leaves render only once the ghost is truly gone.
  const ghostLiveId = ghostApi.ghost && !anyNaming ? ghostApi.ghost.anchorId : null
  const [ghostShown, setGhostShown] = useState<string | null>(null)
  useLayoutEffect(() => {
    if (ghostLiveId === ghostShown) return
    const root = host.seam.viewRootRef.current
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
    const root = host.seam.viewRootRef.current
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
  }, [ghostShown])
  useClearStrandedGhost(ghostApi, rowBand)
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

  const bands = useMemo(
    () => (flatMode ? [] : flattenBands(groups, collapsed)),
    [flatMode, groups, collapsed],
  )
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
  const bandRowsWithout = (bandKey: string, activeId: string): ViewRow[] =>
    flattenGroups(groups.filter((g) => g.key === bandKey)).filter((r) => r.id !== activeId)
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
  const reorderInBandByIndex = (bandKey: string, activeId: string, toIndex: number): void => {
    const full: string[] = []
    for (const g of groups) {
      const ids = flattenGroups([g]).map((r) => r.id)
      if (g.key !== bandKey) {
        full.push(...ids)
        continue
      }
      const without = ids.filter((id) => id !== activeId)
      const at = clamp(toIndex, 0, without.length)
      full.push(...without.slice(0, at), activeId, ...without.slice(at))
    }
    if (structuralOrder) {
      const painted = flattenGroups(groups).map((r) => r.id)
      if (sameIds(full, painted)) return
      const row = rowById.get(activeId)
      if (!row) return
      const parent = parentOf(row.path)
      const sibAfter = bandRowsWithout(bandKey, activeId)
        .slice(toIndex)
        .find((r) => parentOf(r.path) === parent)
      const current = rows.filter((r) => parentOf(r.path) === parent).map((r) => r.id)
      const sibIds = current.filter((id) => id !== activeId)
      const order = spliceBeside(sibIds, sibAfter?.id ?? null, activeId, 'above')
      setManualOverride(full)
      if (!sameIds(order, current))
        void mutate({ op: 'movePage', path: row.path, newParentPath: parent, order })
      return
    }
    setManualOverride(full)
    persistView({ manual_order: full }, { viewState: true })
    reassignBySortRun(full, bandKey, activeId)
  }
  const onCardDrop = (activeId: string, toZone: string, toIndex: number): void => {
    const from = groups.find((g) => flattenGroups([g]).some((r) => r.id === activeId))?.key
    if (from == null) return
    if (toZone === from) {
      if (canReorderWithin) reorderInBandByIndex(toZone, activeId, toIndex)
      return
    }
    if (canRelocate) {
      const row = rowById.get(activeId)
      const destPath = toZone === UNGROUPED ? source.path : setPaths.get(toZone)
      if (row && destPath && destPath !== parentOf(row.path)) {
        const isDestSibling = (r: ViewRow): boolean =>
          parentOf(r.path) === destPath && r.id !== activeId
        const destIds = rows.filter(isDestSibling).map((r) => r.id)
        const bandRows = flattenGroups(groups.filter((g) => g.key === toZone))
        const beforeId = bandRows[toIndex]?.id ?? null
        const sibBefore = bandRows.slice(toIndex).find(isDestSibling)?.id ?? null
        const order = spliceBeside(destIds, sibBefore, activeId, 'above')
        const allIds = rows.map((r) => r.id)
        const spliceLive = (existing: string[] | undefined): string[] =>
          tieOrderWith(existing, allIds, activeId, beforeId, 'above')
        setManualOverride((m) => (m ? spliceLive(m) : m))
        if (liveView.manual_order)
          persistView({ manual_order: spliceLive(liveView.manual_order) }, { viewState: true })
        void mutate({ op: 'movePage', path: row.path, newParentPath: destPath, order })
      }
      return
    }
    if (!canReassign || !groupPropId) return
    commitGroupValue(activeId, groupPropId, groupPropType, toZone)
  }

  const [effectiveZoom, setEffectiveZoom] = useState(1)
  useEffect(() => {
    const el = host.seam.viewRootRef.current
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
    <GhostSuppress.Provider value={ghostApi.suppressWrap}>
      <div
        ref={(el) => {
          host.seam.viewRootRef.current = el
        }}
        className={cx('cards-view', banner === 'none' && 'is-compact')}
        data-view-id={view.id}
        style={{ '--card-scale': view.card_size ?? 1 } as React.CSSProperties}
      >
        {showSetCards && (
          <div className="set-cards-row">
            <SortableZone
              items={sets.map((s) => s.id)}
              onReorder={reorderSets}
              getItemLabel={(id) => sets.find((s) => s.id === id)?.title ?? id}
            >
              <CardDropSlot />
              {sets.map((s) => (
                <DraggableSetCard key={s.id} set={s} />
              ))}
            </SortableZone>
          </div>
        )}
        <DragGroup
          onCommit={onCardDrop}
          zoom={effectiveZoom}
          crossZone={canReassign || canRelocate}
          resolveIndex={structuralSlotFor}
          renderOverlay={(id, rect) => {
            const r = rowById.get(id)
            if (!r || !ctx) return null
            return (
              <div
                className={cx('cards-view', banner === 'none' && 'is-compact')}
                style={
                  {
                    zoom: effectiveZoom,
                    '--card-scale': view.card_size ?? 1,
                    width: `${rect.width / effectiveZoom}px`,
                    height: `${rect.height / effectiveZoom}px`,
                  } as React.CSSProperties
                }
              >
                <CardRoot
                  dragging
                  className="card-overlay"
                  style={{ width: '100%', height: '100%' }}
                >
                  <CardBody pop={false}>
                    <OverlayFace
                      row={r}
                      view={liveView}
                      banner={banner}
                      ctx={ctx}
                      crumbs={locByRow.get(id) ?? NO_TRAIL}
                      cover={coverOf(r)}
                      iconName={entityIcon('page', r.icon, defaultIcons)}
                      columns={columns}
                      nexusId={nexusId}
                    />
                  </CardBody>
                </CardRoot>
              </div>
            )
          }}
        >
          <BandDnd bands={bands} labelFor={bandLabel} onDrop={onBandDrop} nestable={false}>
            {groups.map((g) => {
              const rows = flattenGroups([g])
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
                          draggable={!dragDisabled}
                          onCommitValue={cardApi.onCommitValue}
                          onStyle={cardApi.onStyle}
                          onOpen={cardApi.onOpen}
                          onReveal={cardApi.onReveal}
                          onHide={cardApi.onHide}
                          onOpenValuePicker={cardApi.onOpenValuePicker}
                          onOpenAddPicker={cardApi.onOpenAddPicker}
                          onNewBelow={cardApi.onNewBelow}
                          onHover={cardApi.onHover}
                          onIconPicker={cardApi.onIconPicker}
                          allowInlineRemove={effectiveZoom >= 0.8}
                        />
                      )
                      if (ghostShown !== row.id && pendingSeat !== row.id) return [card]
                      return [
                        card,
                        // FLIP seats the ghost among its neighbors on the way in; Reveal collapses it on the way out, so an aborted ghost animates away like the sidebar and table ones instead of vanishing.
                        <Reveal
                          key={`ghost-${row.id}`}
                          open={!ghostApi.ghost?.closing}
                          fill
                          onCollapsed={ghostApi.closed}
                        >
                          <GhostCard
                            banner={banner}
                            view={liveView}
                            columns={columns}
                            ctx={ctx}
                            iconName={entityIcon('page', undefined, defaultIcons)}
                            onEnter={ghostApi.onGhostEnter}
                            onLeave={ghostApi.onGhostLeave}
                            onCreate={ghostCreate}
                          />
                        </Reveal>,
                      ]
                    })}
                  </SortableZone>
                </ViewGroupBand>
              )
            })}
          </BandDnd>
        </DragGroup>
        {ctx && (
          <>
            <TextPicker
              open={valuePicker?.kind === 'link'}
              onDismiss={() => setValuePicker(null)}
              triggerRef={pickerAnchorRef}
              value={vRaw ? linkEditText(vRaw) : ''}
              accent={solidColorCss(vTarget?.def.link_color)}
              onCommit={(raw) => {
                const nv = parseEditorValue('url', raw, vTarget?.current)
                if (nv !== undefined && (nv !== null || vRaw)) commitPicked(nv)
                setValuePicker(null)
              }}
            />
            <TextPicker
              open={valuePicker?.kind === 'number'}
              onDismiss={() => setValuePicker(null)}
              triggerRef={pickerAnchorRef}
              value={vTarget?.current?.kind === 'number' ? String(vTarget.current.value) : ''}
              leading={vTarget ? numberFormatGlyph(vTarget.def) : undefined}
              onCommit={(raw) => {
                const nv = parseEditorValue('number', raw)
                if (nv != null) commitPicked(nv)
                setValuePicker(null)
              }}
            />
            <PropertyPicker
              target={valuePopup ? vTarget : null}
              chooser={
                addPicker
                  ? addEntries.map(
                      (e): PickEntry => ({
                        id: e.id,
                        name: e.name,
                        icon: e.def
                          ? propertyIcon(e.def)
                          : (propertyTypeIconName(e.type) ?? 'square-dashed'),
                        revealOnly: e.revealOnly,
                        drillable: !e.revealOnly && isOptionsKind(e.type),
                      }),
                    )
                  : undefined
              }
              chooserInitial={addPicker?.initialEntry?.id}
              resolveTarget={(e) =>
                addPicker ? pickTargetFor(addPicker.rowId, addColumn(e.id, tree), 'options') : null
              }
              open={valuePopup !== null || addPicker !== null}
              triggerRef={pickerAnchorRef}
              anchorX={valuePicker?.kind === 'picker' ? valuePicker.clickX : undefined}
              onCommit={commitPicked}
              onReveal={(entry) => {
                if (!addPicker) return
                if (entry.revealOnly) return revealProperty(entry.id)
                const src = addEntries.find((e) => e.id === entry.id)
                setAddPicker(null)
                setValuePicker({
                  rowId: addPicker.rowId,
                  column: addColumn(entry.id, tree),
                  kind:
                    src && (src.type === 'datetime' || src.type === 'number' || src.type === 'file')
                      ? src.type
                      : 'link',
                  anchor: addPicker.anchor,
                  revealOnCommit: true,
                })
              }}
              onDismiss={() => {
                setValuePicker(null)
                setAddPicker(null)
              }}
            />
          </>
        )}
      </div>
    </GhostSuppress.Provider>
  )
}

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
  ctx: ValueContext | null
  iconName: string
  onEnter: () => void
  onLeave: () => void
  onCreate: () => void
}): React.JSX.Element {
  const capitalize = useCapitalizeMetadata()
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
              <Icon name={iconName} size="titleMedium" />
            </CardPlaceholder>
          </CardThumb>
        )}
        <CardText>
          <CardTitle mode="static">
            <Icon name={iconName} className="card-title-icon" />
            <span>New Page</span>
          </CardTitle>
          {props.length > 0 && ctx && (
            <div className="card-props">
              {props.map((c) => (
                <div key={c.id} className="card-prop-row">
                  <span className={cx('card-prop-label', text.caption.emphasized)}>
                    {columnLabel(c.id, ctx.schema, ctx.contexts, capitalize)}
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
                <Icon name={iconName} size="titleLarge" />
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
            <span>{set.title}</span>
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
  ctx: ValueContext | null
  loc?: TrailSegment[]
  onCommitValue: (row: ViewRow, column: ResolvedColumn, value: PropertyValue | null) => void
  onStyle: (colId: string, key: keyof ColumnStyle & string, value: string) => void
  onOpen: (row: ViewRow, newTab: boolean) => void
  onReveal: (id: string) => void
  onHide: (id: string) => void
  onOpenValuePicker: (req: ValuePickerRequest) => void
  onOpenAddPicker: (req: AddPickerRequest) => void
  onNewBelow: (row: ViewRow) => void
  onHover: (id: string, entering: boolean) => void
  onIconPicker: (open: boolean) => void
  draggable: boolean
  allowInlineRemove: boolean
}

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
  const capitalize = useCapitalizeMetadata()
  const styleFor = useStyleFor()
  if (!ctx) return null
  const compact = isCompact(view)
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
            {columnLabel(c.id, ctx.schema, ctx.contexts, capitalize)}
          </span>
          {value(c)}
        </div>
      ))}
    </div>
  )
}

const NOOP = (): void => {}

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
  ctx: ValueContext | null
  crumbs: TrailSegment[]
  src: string | undefined
  cover?: string
  iconName: string
  columns: ResolvedColumn[]
  allowInlineRemove: boolean
  onImgError?: () => void
  textRef?: React.Ref<HTMLDivElement>
  thumbRef?: React.Ref<HTMLDivElement>
  onThumbContextMenu?: (e: React.MouseEvent) => void
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
      <span>{row.title}</span>
    </CardTitle>
  )
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
      <Icon name={iconName} size="titleMedium" />
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
          {banner === 'image' ? (
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
        <CardTrail segments={crumbs} onClick={onZoneClick} />
      </CardText>
    </>
  )
})

function OverlayFace({
  row,
  view,
  banner,
  ctx,
  crumbs,
  cover,
  iconName,
  columns,
  nexusId,
}: {
  row: ViewRow
  view: SavedView
  banner: CardBanner
  ctx: ValueContext | null
  crumbs: TrailSegment[]
  cover?: string
  iconName: string
  columns: ResolvedColumn[]
  nexusId: string
}): React.JSX.Element {
  const version = useSession((s) => s.thumbVersions[`page:${row.id}`] ?? 0)
  const [failed, setFailed] = useState(false)
  const src = banner === 'preview' ? thumbSrc(nexusId, row.id, version) : undefined
  return (
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
      allowInlineRemove={false}
      naming={false}
      onImgError={() => setFailed(true)}
      onCommitValue={NOOP}
      onStyle={NOOP}
      onHide={NOOP}
      onOpenValuePicker={NOOP}
    />
  )
}

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
  onNewBelow,
  onHover,
  onIconPicker,
  draggable,
  allowInlineRemove,
}: PageCardProps): React.JSX.Element {
  const capitalize = useCapitalizeMetadata()
  const gdrag = useGroupedDragItem(row.id)
  const drag = draggable ? gdrag : null
  // The boolean, not the object: `gdrag` is a fresh object per slot flip, so a handler keyed on it would rebuild on every drag frame — exactly when CardFace's memo has to hold.
  const isDragging = drag?.isDragging ?? false
  const version = useSession((s) => s.thumbVersions[`page:${row.id}`] ?? 0)
  const tree = useSession((s) => s.tree)
  const [failed, setFailed] = useState(false)
  const lastSrc = useRef<string | undefined>(undefined)

  const textRef = useRef<HTMLDivElement>(null)
  const addableNow = (): AddEntry[] =>
    ctx ? addEntriesFor(row, view, ctx, columns, tree, capitalize) : []
  const openAdd = useCallback(
    (e: React.MouseEvent): void => {
      e.stopPropagation()
      if (!isDragging && addableNow().length > 0 && textRef.current)
        onOpenAddPicker({ rowId: row.id, anchor: textRef.current, initialEntry: null })
    },
    [isDragging, onOpenAddPicker, row, ctx, view, columns, tree],
  )
  const mutate = useSession((s) => s.mutate)
  const naming = useSession((s) => s.renamingPath === row.path && s.renamingHost !== 'sidebar')
  const holdGhost = useContext(GhostSuppress)
  const [iconOpen, setIconOpen] = useState(false)
  useEffect(() => {
    if (!iconOpen) return
    onIconPicker(true)
    return () => onIconPicker(false)
  }, [iconOpen, onIconPicker])
  const onCardContextMenu = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()
    if (!ctx || drag?.isDragging) return
    const { tabs, pinned, tree } = useSession.getState()
    const alreadyOpen = isOpenInTabs(tabs, pinned, { kind: 'page', id: row.id, path: row.path })
    const addable = addableNow()
    const menuAddable = orderAddableEntries(addable).map((e) => ({ id: e.id, name: e.name }))
    const action = await holdGhost(() =>
      popMenu(
        cardMenuModel({
          addable: menuAddable,
          alreadyOpen,
          editableImage: banner === 'image' && !!cover,
          ...pageMoveContext(tree, row.path),
        }),
      ),
    )
    if (!action) return
    if (runPageSendAction(action, row)) return
    if (action === 'image:edit') openEditor()
    else if (action === 'title:newtab') onOpen(row, true)
    else if (action === 'title:rename') useSession.getState().beginRename(row.path, false, 'detail')
    else if (action === 'title:icon') setIconOpen(true)
    else if (action === 'title:newbelow') onNewBelow(row)
    else if (action === 'title:delete')
      void confirmDelete({ path: row.path, kind: 'page', title: row.title })
    else if (action.startsWith('add:')) {
      const entry = addable.find((e) => e.id === action.slice(4))
      if (!entry) return
      if (entry.revealOnly) onReveal(entry.id)
      else if (textRef.current)
        onOpenAddPicker({ rowId: row.id, anchor: textRef.current, initialEntry: entry })
    }
  }
  const crumbs = loc ?? NO_TRAIL

  const cover = coverOf(row)
  const onImgError = useCallback(() => setFailed(true), [])
  const thumbRef = useRef<HTMLDivElement>(null)
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
    noun: 'Banner',
    autoEdit: true,
  })
  const src = banner === 'preview' ? thumbSrc(nexusId, row.id, version) : undefined
  if (src !== lastSrc.current) {
    lastSrc.current = src
    if (failed) setFailed(false)
  }
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const active = useSession((s) => s.selection.kind === 'page' && s.selection.id === row.id)
  const iconName = entityIcon('page', row.icon, defaultIcons)

  return (
    <CardRoot
      drag={drag}
      active={active}
      data-rid={row.id}
      onPointerEnter={(e) => {
        onHover(row.id, true)
        hoverGlance(
          { kind: 'page', id: row.id, path: row.path },
          e.currentTarget,
          'views',
          e.shiftKey,
        )
      }}
      onPointerLeave={() => {
        onHover(row.id, false)
        leaveGlance()
      }}
      onClick={(e) => {
        if (drag?.isDragging || naming) return
        const hit = document.elementFromPoint(e.clientX, e.clientY)
        if (hit && e.currentTarget.contains(hit) && hit.closest('.card-title, .card-thumb'))
          onOpen(row, e.metaKey)
      }}
      onContextMenu={onCardContextMenu}
    >
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
      <IconChoice
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
