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
import type { ResolvedColumn, ViewRow } from '@pommora/core/Views/viewRow'
import type { SetNode } from '@pommora/core/Nexus/tree'
import { isBlankValue, type PropertyValue } from '@pommora/core/Properties/propertyValue'
import { type CardBanner, isCompact, type SavedView } from '@pommora/core/Views/views'
import type { ColumnStyle } from '@pommora/core/Properties/columnStyles'
import { isOptionsKind } from '@pommora/core/Properties/properties'
import { Icon } from '@pommora/uix/Symbols'
import { isCmd } from '@pommora/uix/Interactions/chords'
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
  reorder,
  SortableZone,
  useDragItem,
} from '@pommora/uix/Interactions/drag'
import { cx } from '@pommora/uix/Utilities/cx'
import { useElementZoom } from '@pommora/uix/Utilities/zoom'
import { useStableApi } from '@pommora/uix/Utilities/stableApi'
import { assetUrl } from '../../Platform/assetScheme'
import { useSession } from '../../Session/store'
import { glanceShown } from '../../Interface/Glance/glanceAction'
import { AssetImage } from '../../Assets/AssetImage'
import { ImagePicker } from '../../Assets/ImagePicker'
import { useBannerMenu } from '../../Interface/Header/useBannerMenu'
import { byOrder } from '@pommora/core/Nexus/treePatch'
import { thumbKey, thumbRel } from '@pommora/core/Paths/nexusPaths'
import { navKey } from '../../Navigation/navRecents'
import type { ViewHostApi } from '../Host/useViewHost'
import { GHOST_TRAVEL_HOLD_MS, GhostSuppress } from '@pommora/uix/Interactions/ghostCreate'
import { DEFAULT_FEEL } from '@pommora/uix/Animations/feel'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { columnLabel, useCapitalizeMetadata } from '../../Properties/Cells/columnLabel'
import { useColumnStyleMap } from '../Host/useColumnStyles'
import { ViewGroupBand } from '../Bands/ViewGroupBand'
import { BandDnd } from '../Bands/BandDnd'
import { rowHover, type TitleMenuContext, useViewInteractions } from '../Host/useViewInteractions'
import type { ValueContext } from '../../Properties/valueContext'
import { NO_TRAIL, type TrailSegment } from '@pommora/uix/Elements/NavTrail'
import { ancestryOf } from '../../Nexus/treeIndex'
import { TextPicker } from '@pommora/uix/Pickers/TextPicker'
import { solidColorCss } from '@pommora/uix/Theme/ramp'
import { type PickEntry, PropertyPicker } from '../../Properties/Pickers/PropertyPicker'
import { NumberValuePicker } from '../../Properties/Pickers/NumberValuePicker'
import { resolveFieldValue } from '../../Properties/value'
import { propertyIcon, propertyTypeIconName } from '../../Properties/Cells/PropertyTypes'
import { parseEditorValue } from '../../Properties/parseEditorValue'
import { linkEditText } from '@pommora/core/Connections/linkValue'
import { CardValue } from './CardValue'
import {
  type AddEntry,
  addColumn,
  addEntriesFor,
  orderAddableEntries,
  shownColumnsFor,
} from './cardValueInput'
import { RenamableTitle } from '../../Interface/RenamableTitle'
import { titleInput } from '@pommora/uix/Menus'
import { popMenu } from '../../Actions/menuActions'
import { cardMenuModel } from '@pommora/core/Actions/cardMenu'
import './cards-view.css'

// ── Types and constants ─────────────────────────────────────────────────────

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

/** What a card asks the one root banner seat to do. */
type BannerRequest = {
  id: string
  kind: 'page' | 'set'
  frame: HTMLElement
  mode: 'menu' | 'edit'
}

/** Every gesture a card hands back, as one identity-stable object. */
type CardApi = {
  commitValue: (row: ViewRow, column: ResolvedColumn, value: PropertyValue | null) => void
  setStyle: (colId: string, key: keyof ColumnStyle & string, value: string) => void
  open: (row: ViewRow, newTab: boolean) => void
  hide: (id: string) => void
  openValuePicker: (req: ValuePickerRequest) => void
  openAddPicker: (req: AddPickerRequest) => void
  hover: (id: string, entering: boolean) => void
  titleMenuContext: (row: ViewRow) => TitleMenuContext
  titleAction: (action: string, row: ViewRow, anchor: HTMLElement) => boolean
  addableFor: (row: ViewRow) => AddEntry[]
  openSet: (set: SetNode, newTab: boolean) => void
  banner: (req: BannerRequest) => void
}

type ValueApi = Pick<CardApi, 'commitValue' | 'setStyle' | 'hide' | 'openValuePicker'>

/** A card's preview image: the current thumbnail version, and the failure that falls the face back to its placeholder until the source changes. */
function useThumb(
  nexusId: string,
  rowId: string,
  banner: CardBanner,
): { src: string | undefined; onError: () => void } {
  const version = useSession((s) => s.thumbVersions[`page:${rowId}`] ?? 0)
  const [failed, setFailed] = useState(false)
  const lastSrc = useRef<string | undefined>(undefined)
  const src =
    banner === 'preview'
      ? `${assetUrl(thumbRel(nexusId, thumbKey(navKey({ kind: 'page', id: rowId }))))}?v=${version}`
      : undefined
  if (src !== lastSrc.current) {
    lastSrc.current = src
    if (failed) setFailed(false)
  }
  return { src: failed ? undefined : src, onError: useCallback(() => setFailed(true), []) }
}

const coverOf = (row: ViewRow): string | undefined =>
  typeof row.frontmatter.banner === 'string' ? row.frontmatter.banner : undefined

const CARDS_GHOST_GRACE_MS = 200 // KNOB

type DefaultIcons = Parameters<typeof entityIcon>[2]

const NOOP = (): void => {}

const INERT_API: ValueApi = {
  commitValue: NOOP,
  setStyle: NOOP,
  hide: NOOP,
  openValuePicker: NOOP,
}

// ── The view ────────────────────────────────────────────────────────────────

export function CardsView({ host }: { host: ViewHostApi }): React.JSX.Element {
  const {
    source,
    view,
    liveView,
    columns,
    groups,
    ctx,
    setNames,
    setIcons,
    setPaths,
    rowById,
    bandLabel,
    collapsed,
    toggleCollapse,
    structuralGrouping: structural,
    canReassign,
    canRelocate,
    dragDisabled,
    setStylePatch,
    hideProperty,
    revealProperty,
    commitValue,
    pickTarget,
    creation,
    mutate,
    select,
    tree,
  } = host
  const nexusId = useSession((s) => s.tree?.nexus.id ?? '')
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const beginRename = useSession((s) => s.beginRename)
  const anyNaming = useSession((s) => s.renamingPath !== null)

  // ── Set cards ─────────────────────────────────────────────────────────────

  const [setOrderOverride, setSetOrderOverride] = useState<string[] | null>(null)
  useEffect(() => setSetOrderOverride(null), [source])

  const baseSets = source.sets ?? []
  const sets = useMemo(
    () => (setOrderOverride ? byOrder(baseSets, setOrderOverride) : baseSets),
    [baseSets, setOrderOverride],
  )
  const showSetCards = (view.set_cards ?? true) && sets.length > 0
  const reorderSets = (activeId: string, overId: string): void => {
    const order = reorder(sets, activeId, overId).map((s) => s.id)
    const moved = sets.find((s) => s.id === activeId)
    if (!moved) return
    setSetOrderOverride(order)
    void mutate({ op: 'moveSet', path: moved.path, newParentPath: source.path, order }).then(
      (ok) => {
        if (!ok) setSetOrderOverride((cur) => (cur === order ? null : cur))
      },
    )
  }

  // ── Interactions ──────────────────────────────────────────────────────────

  const banner: CardBanner = view.card_banner ?? 'image'
  const shellClass = cx('cards-view', banner === 'none' && 'is-compact')
  const flatMode = view.group?.kind === 'flat'
  const hideLocation = view.hide_location ?? false

  const [pendingSeat, setPendingSeat] = useState<string | null>(null)
  const [valuePicker, setValuePicker] = useState<ValuePickerRequest | null>(null)
  const [addPicker, setAddPicker] = useState<AddPickerRequest | null>(null)
  const ghostRowmate = (enteringId: string): boolean => {
    const root = host.seam.viewRootRef.current
    const ghostEl = root?.querySelector('.ghost-card')
    const cardEl = root?.querySelector(`[data-rid="${CSS.escape(enteringId)}"]`)
    if (!ghostEl || !cardEl) return false
    const g = ghostEl.getBoundingClientRect()
    return Math.abs(g.top - cardEl.getBoundingClientRect().top) < g.height / 2
  }

  const interactions = useViewInteractions(host, {
    ghost: {
      graceMs: CARDS_GHOST_GRACE_MS,
      suppressed: () =>
        valuePicker !== null ||
        addPicker !== null ||
        useSession.getState().renamingPath !== null ||
        glanceShown(),
      travelHold: { inZone: ghostRowmate, holdMs: GHOST_TRAVEL_HOLD_MS },
    },
    rename: (target, fromCreate) => {
      if (fromCreate) setPendingSeat(null)
      beginRename(target.path, fromCreate, 'detail')
    },
  })
  const effectiveZoom = useElementZoom(host.seam.viewRootRef)

  // ── Value and add pickers ─────────────────────────────────────────────────

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

  const capitalize = useCapitalizeMetadata()
  const styleById = useColumnStyleMap(host)
  const pickerAnchorRef = useRef<HTMLElement | null>(null)
  pickerAnchorRef.current = (valuePicker ?? addPicker)?.anchor ?? null

  useEffect(() => {
    if (!valuePicker) return
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

  const valuePopup =
    valuePicker && valuePicker.kind !== 'link' && valuePicker.kind !== 'number' ? valuePicker : null
  const vRow = valuePicker && rowById.get(valuePicker.rowId)
  const vTarget = valuePicker && vRow ? pickTarget(vRow, valuePicker.column) : null
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

  const addRow = addPicker ? rowById.get(addPicker.rowId) : undefined
  const addEntries = addRow
    ? orderAddableEntries(addEntriesFor(addRow, liveView, ctx, columns, tree, capitalize))
    : []

  // ── The root banner seat ──────────────────────────────────────────────────

  const [bannerRequest, setBannerRequest] = useState<BannerRequest | null>(null)
  const bannerFrameRef = useRef<HTMLElement | null>(null)
  // Resolved every render rather than snapshotted into the request: a cover written while the seat is open must reach the editor, and a vanished owner closes it.
  const bannerOwner = ((): { path: string; value: string | undefined } | null => {
    if (!bannerRequest) return null
    if (bannerRequest.kind === 'set') {
      const set = sets.find((s) => s.id === bannerRequest.id)
      return set ? { path: set.path, value: set.banner } : null
    }
    const row = rowById.get(bannerRequest.id)
    return row ? { path: row.path, value: coverOf(row) } : null
  })()
  const {
    openMenu: openBannerMenu,
    editing: bannerEditing,
    openEditor: openBannerEditor,
    closeEditor: closeBannerEditor,
    boxAspect,
    onSave,
    onRepick,
  } = useBannerMenu(bannerOwner?.path ?? '', bannerRequest?.kind ?? 'page', {
    value: bannerOwner?.value,
    frame: bannerFrameRef,
    noun: bannerRequest?.kind === 'page' ? 'Banner' : undefined,
    autoEdit: true,
  })
  const bannerOrphaned = bannerRequest !== null && bannerOwner === null
  useEffect(() => {
    if (!bannerOrphaned) return
    setBannerRequest(null)
    closeBannerEditor()
  }, [bannerOrphaned])
  useEffect(() => {
    if (!bannerRequest) return
    bannerFrameRef.current = bannerRequest.frame
    // The seat sits above the ghost's Provider, so the hold is applied here rather than read from context.
    if (bannerRequest.mode === 'menu') void interactions.holdGhost(openBannerMenu)
    else openBannerEditor()
  }, [bannerRequest])

  // ── The card api ──────────────────────────────────────────────────────────

  const cardApi = useStableApi<CardApi>({
    commitValue,
    setStyle: setStylePatch,
    open: interactions.openPage,
    hide: hideProperty,
    openValuePicker,
    openAddPicker,
    hover: interactions.ghost.onHover,
    titleMenuContext: interactions.titleMenuContext,
    titleAction: interactions.runTitleAction,
    addableFor: (row) => addEntriesFor(row, liveView, ctx, columns, tree, capitalize),
    openSet: (set, newTab) => {
      void select(
        { kind: 'set', id: set.id, path: set.path },
        newTab ? { newTab: true } : undefined,
      )
    },
    banner: setBannerRequest,
  })
  const locByRow = useMemo(() => {
    const m = new Map<string, TrailSegment[]>()
    if (hideLocation) return m
    for (const r of rowById.values()) {
      if (!r.parentSetId) continue
      const chain = ancestryOf(tree, { kind: 'set', id: r.parentSetId })
      if (chain) m.set(r.id, chain.slice(structural ? 2 : 1))
    }
    return m
  }, [groups, tree, structural, hideLocation])

  // ── The ghost's seat and its FLIP ─────────────────────────────────────────

  const feel = DEFAULT_FEEL
  const flipPrev = useRef<Map<Element, DOMRect> | null>(null)
  // Kept mounted through `closing` so its Reveal can collapse it out, matching the sidebar and table ghosts; it leaves render only once the ghost is truly gone.
  const ghostLiveId =
    interactions.ghost.ghost && !anyNaming ? interactions.ghost.ghost.anchorId : null
  const [ghostShown, setGhostShown] = useState<string | null>(null)
  useLayoutEffect(() => {
    if (ghostLiveId === ghostShown) return
    const root = host.seam.viewRootRef.current
    const hardGone = ghostShown !== null && interactions.ghost.ghost === null
    const anchorId = ghostLiveId ?? ghostShown
    if (root && !hardGone && anchorId !== null) {
      // Only the grid holding the anchor reflows horizontally; cards in other grids move vertically alone, which the band rects already cover.
      const grid = root
        .querySelector(`[data-rid="${CSS.escape(anchorId)}"]`)
        ?.closest('.cards-grid')
      const m = new Map<Element, DOMRect>()
      for (const el of [
        ...(grid?.querySelectorAll('.card-displace') ?? []),
        ...root.querySelectorAll('.group-band'),
      ])
        m.set(el, el.getBoundingClientRect())
      flipPrev.current = m
    } else flipPrev.current = null
    setGhostShown(ghostLiveId)
  }, [ghostLiveId, ghostShown])
  useLayoutEffect(() => {
    const prev = flipPrev.current
    flipPrev.current = null
    if (!prev) return
    const z = effectiveZoom || 1
    for (const [el, before] of prev) {
      if (!el.isConnected) continue
      const after = el.getBoundingClientRect()
      const dx = (before.left - after.left) / z
      const dy = (before.top - after.top) / z
      if (dx !== 0 || dy !== 0)
        el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
          duration: feel.duration,
          easing: feel.easing,
        })
    }
  }, [ghostShown])
  const ghostCreate = (): void => {
    const seat = interactions.ghost.ghost?.anchorId ?? null
    const created = interactions.ghostCreate()
    if (!created) return
    setPendingSeat(seat)
    void created.then((ok) => {
      if (!ok) setPendingSeat(null)
    })
  }
  const ghostCard = (
    <GhostCard
      banner={banner}
      view={liveView}
      columns={columns}
      ctx={ctx}
      capitalize={capitalize}
      iconName={entityIcon('page', undefined, defaultIcons)}
      onEnter={interactions.ghost.onGhostEnter}
      onLeave={interactions.ghost.onGhostLeave}
      onCreate={ghostCreate}
    />
  )
  const onCardDrop = (activeId: string, toZone: string, toIndex: number): void =>
    interactions.onDrop(
      activeId,
      toZone,
      (groups.find((g) => g.key === toZone)?.items.filter((r) => r.id !== activeId) ?? [])[toIndex]
        ?.id ?? null,
    )

  return (
    <GhostSuppress.Provider value={interactions.holdGhost}>
      <div
        ref={(el) => {
          host.seam.viewRootRef.current = el
        }}
        className={shellClass}
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
                <DraggableSetCard key={s.id} set={s} defaultIcons={defaultIcons} api={cardApi} />
              ))}
            </SortableZone>
          </div>
        )}
        <DragGroup
          onCommit={onCardDrop}
          crossZone={canReassign || canRelocate}
          resolveIndex={interactions.structuralSlot}
          renderOverlay={(id, rect) => {
            const r = rowById.get(id)
            if (!r) return null
            return (
              <div
                className={shellClass}
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
                      capitalize={capitalize}
                      styleById={styleById}
                    />
                  </CardBody>
                </CardRoot>
              </div>
            )
          }}
        >
          <CardDropSlot />
          <BandDnd
            bands={interactions.bands}
            labelFor={bandLabel}
            onDrop={interactions.onBandDrop}
            nestable={!host.flat}
          >
            {groups.map((g) => {
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
                  onAdd={setPaths.has(g.key) ? () => creation.bandAdd(g.key) : undefined}
                  headless={flatMode || (g.kind === 'ungrouped' && structural)}
                  fill
                >
                  <SortableZone
                    id={g.key}
                    items={g.items.map((r) => r.id)}
                    getItemLabel={(id) => rowById.get(id)?.title ?? 'card'}
                    className="cards-grid card-grid is-fill"
                  >
                    {g.items.flatMap((row) => {
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
                          defaultIcons={defaultIcons}
                          capitalize={capitalize}
                          styleById={styleById}
                          draggable={!dragDisabled}
                          api={cardApi}
                          allowInlineRemove={effectiveZoom >= 0.8}
                        />
                      )
                      if (ghostShown !== row.id && pendingSeat !== row.id) return [card]
                      return [
                        card,
                        // FLIP seats the ghost among its neighbors on the way in; Reveal collapses it on the way out, so an aborted ghost animates away like the sidebar and table ones instead of vanishing.
                        <Reveal
                          key={`ghost-${row.id}`}
                          open={!interactions.ghost.ghost?.closing}
                          fill
                          onCollapsed={interactions.ghost.closed}
                        >
                          {ghostCard}
                        </Reveal>,
                      ]
                    })}
                  </SortableZone>
                </ViewGroupBand>
              )
            })}
          </BandDnd>
        </DragGroup>
        {interactions.ghostStanding && (
          <div className="cards-grid card-grid is-fill">{ghostCard}</div>
        )}
        {interactions.iconPicker}
        <ImagePicker
          open={bannerEditing}
          value={bannerOwner?.value ?? ''}
          shape="rect"
          boxAspect={boxAspect}
          onCancel={closeBannerEditor}
          onSave={onSave}
          onRepick={onRepick}
        />
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
        {vTarget && (
          <NumberValuePicker
            open={valuePicker?.kind === 'number'}
            triggerRef={pickerAnchorRef}
            def={vTarget.def}
            current={vTarget.current}
            onCommit={commitPicked}
            onDismiss={() => setValuePicker(null)}
          />
        )}
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
          resolveTarget={(e) => (addRow ? pickTarget(addRow, addColumn(e.id, tree)) : null)}
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
      </div>
    </GhostSuppress.Provider>
  )
}

// ── The ghost card ──────────────────────────────────────────────────────────

function GhostCard({
  banner,
  view,
  columns,
  ctx,
  capitalize,
  iconName,
  onEnter,
  onLeave,
  onCreate,
}: {
  banner: CardBanner
  view: SavedView
  columns: ResolvedColumn[]
  ctx: ValueContext
  capitalize: boolean
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
              <Icon name={iconName} size="titleMedium" />
            </CardPlaceholder>
          </CardThumb>
        )}
        <CardText>
          <CardTitle mode="static">
            <Icon name={iconName} className="card-title-icon" />
            <span>New Page</span>
          </CardTitle>
          {props.length > 0 && (
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

// ── The Set card ────────────────────────────────────────────────────────────

interface SetCardProps {
  set: SetNode
  defaultIcons: DefaultIcons
  api: Pick<CardApi, 'openSet' | 'banner'>
}

function DraggableSetCard(props: SetCardProps): React.JSX.Element {
  const drag = useDragItem(props.set.id)
  return <SetCard {...props} drag={drag} />
}

function SetCard({
  set,
  defaultIcons,
  api,
  drag,
}: SetCardProps & { drag?: DragItem }): React.JSX.Element {
  const iconName = entityIcon('set', set.icon, defaultIcons)
  const thumbRef = useRef<HTMLDivElement>(null)
  return (
    <CardRoot
      drag={drag}
      locked
      onClick={(e) => {
        if (!drag?.isDragging) api.openSet(set, isCmd(e))
      }}
    >
      <CardBody>
        <CardThumb
          ref={thumbRef}
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
            const frame = thumbRef.current ?? (e.currentTarget as HTMLElement)
            api.banner({ id: set.id, kind: 'set', frame, mode: 'menu' })
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

// ── A card's properties ─────────────────────────────────────────────────────

interface PageCardProps {
  row: ViewRow
  view: SavedView
  banner: CardBanner
  nexusId: string
  columns: ResolvedColumn[]
  ctx: ValueContext
  loc?: TrailSegment[]
  defaultIcons: DefaultIcons
  capitalize: boolean
  styleById: Map<string, ColumnStyle>
  api: CardApi
  draggable: boolean
  allowInlineRemove: boolean
}

function CardProperties({
  row,
  view,
  ctx,
  capitalize,
  styleById,
  shown,
  onZoneClick,
  api,
  allowInlineRemove,
}: Pick<
  PageCardProps,
  'row' | 'view' | 'ctx' | 'capitalize' | 'styleById' | 'allowInlineRemove'
> & {
  api: ValueApi
  shown: ResolvedColumn[]
  onZoneClick: (e: React.MouseEvent) => void
}): React.JSX.Element {
  const compact = isCompact(view)
  const zoneClick = (e: React.MouseEvent): void => {
    if (e.target === e.currentTarget) onZoneClick(e)
  }
  const value = (c: ResolvedColumn): React.JSX.Element => (
    <CardValue
      row={row}
      column={c}
      ctx={ctx}
      style={styleById.get(c.id)!}
      onCommit={(col, v) => api.commitValue(row, col, v)}
      onStyle={api.setStyle}
      onHide={api.hide}
      onOpenPicker={(column, kind, anchor, clickX) =>
        api.openValuePicker({ rowId: row.id, column, kind, anchor, clickX })
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

// ── A card's face ───────────────────────────────────────────────────────────

const CardFace = memo(function CardFace({
  row,
  view,
  banner,
  ctx,
  capitalize,
  styleById,
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
  api,
}: {
  row: ViewRow
  naming: boolean
  view: SavedView
  banner: CardBanner
  ctx: ValueContext
  capitalize: boolean
  styleById: Map<string, ColumnStyle>
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
  api: ValueApi
}): React.JSX.Element {
  const shown = useMemo(
    () => shownColumnsFor(row, columns, ctx, isCompact(view)),
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
            capitalize={capitalize}
            styleById={styleById}
            shown={shown}
            api={api}
            allowInlineRemove={allowInlineRemove}
            onZoneClick={onZoneClick ?? NOOP}
          />
        )}
        <CardTrail segments={crumbs} onClick={onZoneClick} />
      </CardText>
    </>
  )
})

// ── The drag overlay's face ─────────────────────────────────────────────────

function OverlayFace({
  row,
  view,
  banner,
  ctx,
  capitalize,
  styleById,
  crumbs,
  cover,
  iconName,
  columns,
  nexusId,
}: {
  row: ViewRow
  view: SavedView
  banner: CardBanner
  ctx: ValueContext
  capitalize: boolean
  styleById: Map<string, ColumnStyle>
  crumbs: TrailSegment[]
  cover?: string
  iconName: string
  columns: ResolvedColumn[]
  nexusId: string
}): React.JSX.Element {
  const { src } = useThumb(nexusId, row.id, banner)
  return (
    <CardFace
      row={row}
      view={view}
      banner={banner}
      ctx={ctx}
      capitalize={capitalize}
      styleById={styleById}
      crumbs={crumbs}
      src={src}
      cover={cover}
      iconName={iconName}
      columns={columns}
      allowInlineRemove={false}
      naming={false}
      api={INERT_API}
    />
  )
}

// ── A page card ─────────────────────────────────────────────────────────────

const PageCard = memo(function PageCard({
  row,
  view,
  banner,
  nexusId,
  columns,
  ctx,
  loc,
  defaultIcons,
  capitalize,
  styleById,
  api,
  draggable,
  allowInlineRemove,
}: PageCardProps): React.JSX.Element {
  const item = useDragItem(row.id)
  const drag = draggable ? item : null
  // The boolean, not the object: `item` is a fresh object per slot flip, so a handler keyed on it would rebuild on every drag frame — exactly when CardFace's memo has to hold.
  const isDragging = drag?.isDragging ?? false
  const naming = useSession((s) => s.renamingPath === row.path && s.renamingHost !== 'sidebar')
  const active = useSession((s) => s.selection.kind === 'page' && s.selection.id === row.id)
  const { src, onError } = useThumb(nexusId, row.id, banner)

  const textRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const openAdd = useCallback(
    (e: React.MouseEvent): void => {
      e.stopPropagation()
      if (!isDragging && api.addableFor(row).length > 0 && textRef.current)
        api.openAddPicker({ rowId: row.id, anchor: textRef.current, initialEntry: null })
    },
    [isDragging, api, row],
  )
  const holdGhost = useContext(GhostSuppress)
  const cover = coverOf(row)

  const requestBanner = (mode: 'menu' | 'edit', fallback: HTMLElement): void =>
    api.banner({ id: row.id, kind: 'page', frame: thumbRef.current ?? fallback, mode })
  const onCardContextMenu = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()
    if (drag?.isDragging) return
    const anchor = textRef.current ?? (e.currentTarget as HTMLElement)
    const action = await holdGhost(() =>
      popMenu(
        cardMenuModel({
          addable: api.addableFor(row).length > 0,
          editableImage: banner === 'image' && !!cover,
          ...api.titleMenuContext(row),
        }),
      ),
    )
    if (!action) return
    if (api.titleAction(action, row, anchor)) return
    if (action === 'image:edit') requestBanner('edit', anchor)
    else if (action === 'add' && textRef.current)
      api.openAddPicker({ rowId: row.id, anchor: textRef.current, initialEntry: null })
  }

  const iconName = entityIcon('page', row.icon, defaultIcons)

  return (
    <CardRoot
      drag={drag}
      active={active}
      data-rid={row.id}
      {...rowHover(row, api.hover)}
      onClick={(e) => {
        if (drag?.isDragging || naming) return
        const hit = document.elementFromPoint(e.clientX, e.clientY)
        if (hit && e.currentTarget.contains(hit) && hit.closest('.card-title, .card-thumb'))
          api.open(row, isCmd(e))
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
            capitalize={capitalize}
            styleById={styleById}
            crumbs={loc ?? NO_TRAIL}
            src={src}
            cover={cover}
            iconName={iconName}
            columns={columns}
            allowInlineRemove={allowInlineRemove}
            naming={naming}
            onImgError={onError}
            textRef={textRef}
            thumbRef={thumbRef}
            onThumbContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              requestBanner('menu', e.currentTarget as HTMLElement)
            }}
            onZoneClick={openAdd}
            api={api}
          />
        </CardBody>
      </div>
    </CardRoot>
  )
})
