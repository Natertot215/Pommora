import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ViewRow } from '../viewRow'
import type { SetNode } from '../../Nexus/tree'
import { isBlankValue, type PropertyValue } from '../../Properties/propertyValue'
import { type CardBanner, isCompact, type SavedView, viewOption } from '../views'
import type { ColumnStyle } from '../../Properties/columnStyles'
import { Icon } from '@pommora/uix/Symbols'
import { isCmd } from '@pommora/uix/Interactions/chords'
import { entityIcon } from '../../Assets/entityIconPolicy'
import { text } from '@pommora/uix/Theme/typography.css'
import {
  CardBody,
  CardPlaceholder,
  CardRoot,
  CardText,
  CardThumb,
  CardTitle,
  CardTrail,
} from '@pommora/uix/Cards/Card'
import {
  type Box,
  carries,
  DropSlot,
  type Family,
  LineZone,
  SortableZone,
  useDragItem,
} from '@pommora/uix/Interactions/drag'
import { cx } from '@pommora/uix/Utilities/cx'
import { useElementZoom } from '@pommora/uix/Utilities/zoom'
import { useStableApi } from '@pommora/uix/Utilities/stableApi'
import { EmptyValue } from '@pommora/uix/Elements/EmptyValue'
import { useThumb } from '../../Assets/useThumb'
import { coverOf } from '../../Pages/pageDetail'
import { useSession } from '../../Session/store'
import { personalizationOf } from '../../Session/configSlice'
import { AssetImage } from '../../Assets/AssetImage'
import { useBannerMenu } from '../../Interface/Header/useBannerMenu'
import { navKey, selectTargetOf } from '../../Navigation/navRef'
import { TAB_FAMILY } from '../../Navigation/tabRows'
import type { ViewHostApi } from '../Host/useViewHost'
import { GHOST_TRAVEL_HOLD_MS } from '@pommora/uix/Interactions/ghostCreate'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { columnLabel } from '../../Properties/columnDisplay'
import { GroupBand } from '../Bands/GroupBand'
import { orderedChildren } from '../Pipeline/group'
import { rowHover, useViewInteractions } from '../Host/useViewInteractions'
import type { ValueContext } from '../../Properties/valueContext'
import { NO_TRAIL, type TrailSegment } from '@pommora/uix/Elements/NavTrail'
import { ancestryOf } from '../../Nexus/treeIndex'
import { stabilize } from '../../Nexus/treeStabilize'
import { Cell } from '../../Properties/Cells/Cell'
import { useValueSeat, ValueSeat, type ValueSeatApi } from '../../Properties/Pickers/ValueSeat'
import { borderedField } from '@pommora/uix/Fields/fields.css'
import { overScrollEllipsis } from '@pommora/uix/Interactions/OverScroll'
import { type Personalization, TENTHS_SCALE } from '../../Settings/personalization'
import { cardAddColumns, fillsBlank, shownColumnsFor } from './cardColumns'
import { itemColumns } from '../Pipeline/columns'
import { RenamableName } from '../../Interface/RenamableTitle'
import { titleInput } from '@pommora/uix/Menus/menu-row.css'
import { useGhostFlip } from './useGhostFlip'
import './cards-view.css'
import type { ResolvedColumn } from '../../Properties/properties'

// ── Types and constants ─────────────────────────────────────────────────────

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
  click: ValueSeatApi['click']
  menu: ValueSeatApi['menu']
  pane: ValueSeatApi['pane']
  editor: ValueSeatApi['editor']
  open: (row: ViewRow, newTab: boolean) => void
  openAdd: ValueSeatApi['openAdd']
  hover: (id: string, entering: boolean) => void
  pageMenu: (row: ViewRow, anchor: HTMLElement, editImage?: () => void) => Promise<void>
  endNaming: () => void
  openSet: (set: SetNode, newTab: boolean) => void
  banner: (req: BannerRequest) => void
}

type ValueApi = Pick<
  CardApi,
  'commitValue' | 'click' | 'menu' | 'pane' | 'editor' | 'banner' | 'endNaming'
>

const previewKeyOf = (row: ViewRow, banner: CardBanner): string | undefined =>
  banner === 'preview' ? navKey({ kind: 'page', id: row.id }) : undefined

const CARDS_GHOST_GRACE_MS = 200 // KNOB

const NOOP = (): void => {}
const OVERLAY_FILL = { width: '100%', height: '100%' }

const INERT_API: ValueApi = {
  commitValue: NOOP,
  click: NOOP,
  menu: () => Promise.resolve(),
  pane: NOOP,
  editor: () => null,
  banner: NOOP,
  endNaming: NOOP,
}

// ── The view ────────────────────────────────────────────────────────────────

export function CardsView({ host }: { host: ViewHostApi }): React.JSX.Element {
  const {
    view,
    columns,
    groups,
    ctx,
    rowById,
    bands,
    crossBand,
    searching,
    hideProperty,
    revealProperty,
    commitValue,
    tree,
    styleById,
  } = host
  const nexusId = useSession((s) => s.tree?.nexus.id ?? '')
  const defaultIcons = useSession((s) => personalizationOf(s).defaultIcons)

  // ── Set cards ─────────────────────────────────────────────────────────────

  const sets = useMemo(
    () => orderedChildren(host.sets, null, host.plan, view).map((id) => host.sets.node.get(id)!),
    [host.sets, host.plan, view],
  )
  const showSetCards = viewOption(view, 'set_cards') && sets.length > 0

  // ── Interactions ──────────────────────────────────────────────────────────

  const banner = viewOption(view, 'card_banner')
  const shellClass = cx('cards-view', banner === 'none' && 'is-compact')
  const hideLocation = viewOption(view, 'hide_location')

  const [pendingSeat, setPendingSeat] = useState<{ anchor: string; id: string } | null>(null)
  const ghostRowmate = (enteringId: string): boolean => {
    const root = host.viewRootRef.current
    const ghostEl = root?.querySelector('.ghost-card')
    const cardEl = root?.querySelector(`[data-rid="${CSS.escape(enteringId)}"]`)
    if (!ghostEl || !cardEl) return false
    const g = ghostEl.getBoundingClientRect()
    return Math.abs(g.top - cardEl.getBoundingClientRect().top) < g.height / 2
  }

  const interactions = useViewInteractions(host, {
    ghost: {
      graceMs: CARDS_GHOST_GRACE_MS,
      suppressed: () => seat.open !== null || host.naming !== null,
      travelHold: { inZone: ghostRowmate, holdMs: GHOST_TRAVEL_HOLD_MS },
    },
    newPages: 'single',
  })
  const effectiveZoom = useElementZoom(host.viewRootRef)
  const reorderSets = (id: string, beforeId: string | null): boolean =>
    interactions.bandDrop(
      { kind: 'set', key: id, depth: 0, parentKey: null },
      { kind: 'before', beforeKey: beforeId, parentKey: null },
    )

  // ── The value seat ────────────────────────────────────────────────────────

  // A value from a card's Add shows its property; a right-click pick runs through `MenuSeat` and leaves the view alone.
  const commitOnCard = (row: ViewRow, column: ResolvedColumn, v: PropertyValue | null): void => {
    if (!isBlankValue(v)) revealProperty(column.id)
    commitValue(row, column, v)
  }
  const seat = useValueSeat({
    ...host.seatHost,
    commit: commitOnCard,
    anchor: (el) => el.closest<HTMLElement>('.value-seat') ?? el,
    centered: true,
    hold: interactions.ghost.suppressWrap,
    hide: { from: 'view', run: (_, column) => hideProperty(column.id) },
    add: {
      columns: (row) =>
        cardAddColumns(
          itemColumns(tree, ctx.schema, row.id),
          row,
          shownColumnsFor(row, columns, isCompact(view)),
        ),
      show: (column) => revealProperty(column.id),
    },
  })
  // The ghost stands down while a value's inline field owns the pointer.
  const inline = seat.open?.mode === 'editor'
  useEffect(() => {
    if (!inline) return
    let done = (): void => {}
    void interactions.ghost.suppressWrap(() => new Promise<void>((settle) => (done = settle)))
    return () => done()
  }, [inline])

  // ── The root banner seat ──────────────────────────────────────────────────

  const [bannerRequest, setBannerRequest] = useState<BannerRequest | null>(null)
  const bannerFrameRef = useRef<HTMLElement | null>(null)
  // Resolved every render rather than snapshotted into the request: a cover written while the seat is open must reach the editor, and a vanished owner closes it.
  const bannerOwner = ((): { path: string; value: string | undefined } | null => {
    if (!bannerRequest) return null
    if (bannerRequest.kind === 'set') {
      const set = host.sets.node.get(bannerRequest.id)
      return set ? { path: set.path, value: set.banner } : null
    }
    const row = rowById.get(bannerRequest.id)
    return row ? { path: row.path, value: coverOf(row) } : null
  })()
  const {
    openMenu: openBannerMenu,
    openEditor: openBannerEditor,
    closeEditor: closeBannerEditor,
    editor: bannerEditor,
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
    if (bannerRequest.mode === 'menu') void interactions.ghost.suppressWrap(openBannerMenu)
    else openBannerEditor()
  }, [bannerRequest])

  // ── The card api ──────────────────────────────────────────────────────────

  const cardApi = useStableApi<CardApi>({
    commitValue: commitOnCard,
    click: seat.click,
    menu: seat.menu,
    pane: seat.pane,
    editor: seat.editor,
    open: interactions.openPage,
    openAdd: seat.openAdd,
    hover: interactions.ghost.onHover,
    pageMenu: interactions.pageMenu,
    endNaming: host.endNaming,
    openSet: interactions.openSet,
    banner: setBannerRequest,
  })
  const trailHeld = useRef<Record<string, TrailSegment[]>>({})
  const trailBySet = useMemo(() => {
    const m: Record<string, TrailSegment[]> = {}
    if (!hideLocation)
      for (const { parentSetId } of rowById.values()) {
        if (!parentSetId || parentSetId in m) continue
        const chain = ancestryOf(tree, { kind: 'set', id: parentSetId })
        if (chain) m[parentSetId] = chain.slice(host.plan.kind === 'sets' ? 2 : 1)
      }
    trailHeld.current = stabilize(m, trailHeld.current)
    return trailHeld.current
  }, [groups, tree, host.plan.kind, hideLocation])

  // ── The ghost's seat and its FLIP ─────────────────────────────────────────

  const ghostShown = useGhostFlip(
    host.viewRootRef,
    interactions.ghost.ghost && !host.naming ? interactions.ghost.ghost.anchorId : null,
    interactions.ghost.ghost === null,
    effectiveZoom,
  )
  const ghostCreate = (): void => {
    const anchor = interactions.ghost.ghost?.anchorId
    const flight = interactions.ghostCreate()
    if (!flight || !anchor) return
    setPendingSeat({ anchor, id: flight.id })
    void flight.path.finally(() => setPendingSeat(null))
  }
  const ghostSeat = pendingSeat && !rowById.has(pendingSeat.id) ? pendingSeat.anchor : null
  const ghostCard = (
    <GhostCard
      banner={banner}
      view={view}
      columns={columns}
      ctx={ctx}
      iconName={entityIcon('page', undefined, defaultIcons)}
      onEnter={interactions.ghost.onGhostEnter}
      onLeave={interactions.ghost.onGhostLeave}
      onCreate={ghostCreate}
    />
  )
  const cardScale = view.card_size ?? TENTHS_SCALE.default
  const [scope] = useState((): Family<string> => ({ name: 'cards' }))
  const cardCarry = [carries(scope, (id) => id), carries(TAB_FAMILY, interactions.carry)]
  const overlayShell = (rect: Box, card: React.ReactNode): React.ReactNode => (
    <div
      className={shellClass}
      style={
        {
          zoom: effectiveZoom,
          '--card-scale': cardScale,
          width: `${rect.width / effectiveZoom}px`,
          height: `${rect.height / effectiveZoom}px`,
          padding: 0,
        } as React.CSSProperties
      }
    >
      {card}
    </div>
  )
  const cardOverlay = (id: string, rect: Box): React.ReactNode => {
    const r = rowById.get(id)
    if (!r) return null
    return overlayShell(
      rect,
      <CardRoot className="card-overlay" style={OVERLAY_FILL}>
        <CardBody pop={false}>
          <OverlayFace
            row={r}
            view={view}
            banner={banner}
            ctx={ctx}
            crumbs={trailBySet[r.parentSetId ?? ''] ?? NO_TRAIL}
            cover={coverOf(r)}
            iconName={entityIcon('page', r.icon, defaultIcons)}
            columns={columns}
            nexusId={nexusId}
            styleById={styleById}
          />
        </CardBody>
      </CardRoot>,
    )
  }
  const setOverlay = (id: string, rect: Box): React.ReactNode => {
    const set = host.sets.node.get(id)
    if (!set) return null
    return overlayShell(
      rect,
      <CardRoot className="card-overlay" locked style={OVERLAY_FILL}>
        <SetFace set={set} defaultIcons={defaultIcons} />
      </CardRoot>,
    )
  }

  return (
    <div
      ref={(el) => {
        host.viewRootRef.current = el
      }}
      className={shellClass}
      data-view-id={view.id}
      style={{ '--card-scale': cardScale } as React.CSSProperties}
    >
      {showSetCards && (
        <div className="set-cards-row">
          <SortableZone
            items={sets.map((s) => s.id)}
            fixed={searching}
            label={(id) => host.sets.node.get(id)?.title ?? ''}
            carry={[
              carries(TAB_FAMILY, (id) => {
                const set = host.sets.node.get(id)
                return set ? selectTargetOf(set) : null
              }),
            ]}
            onMove={reorderSets}
            renderOverlay={setOverlay}
          >
            <DropSlot />
            {sets.map((s) => (
              <SetCard key={s.id} set={s} defaultIcons={defaultIcons} api={cardApi} />
            ))}
          </SortableZone>
        </div>
      )}
      <LineZone {...interactions.bandZone()}>
        {groups.map((g) => (
          <GroupBand key={g.key} node={bands.byKey.get(g.key)} bands={interactions.bandView} fill>
            <SortableZone
              items={g.items.map((r) => r.id)}
              label={(id) => rowById.get(id)?.title ?? ''}
              fixed={host.dragDisabled}
              family={crossBand ? scope : undefined}
              disclose={crossBand}
              carry={cardCarry}
              resolveIndex={(index, id) => interactions.folderSlot(g.key, index, id)}
              onMove={(id, beforeId) => interactions.onDrop(id, g.key, beforeId)}
              receive={(item, beforeId) => interactions.onDrop(item, g.key, beforeId)}
              renderOverlay={cardOverlay}
              className="cards-grid card-grid is-fill"
            >
              <DropSlot />
              {g.items.flatMap((row) => {
                const card = (
                  <PageCard
                    key={row.id}
                    row={row}
                    view={view}
                    banner={banner}
                    nexusId={nexusId}
                    columns={columns}
                    ctx={ctx}
                    loc={trailBySet[row.parentSetId ?? '']}
                    defaultIcons={defaultIcons}
                    styleById={styleById}
                    api={cardApi}
                    allowInlineRemove={effectiveZoom >= 0.8}
                    naming={host.naming?.id === row.id ? host.naming : null}
                    editing={
                      seat.open?.mode === 'editor' && seat.open.rowId === row.id
                        ? seat.open.columnId
                        : null
                    }
                  />
                )
                if (ghostShown !== row.id && ghostSeat !== row.id) return [card]
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
          </GroupBand>
        ))}
      </LineZone>
      {interactions.ghostStanding && (
        <div className="cards-grid card-grid is-fill">{ghostCard}</div>
      )}
      {bannerEditor}
      <ValueSeat seat={seat} />
    </div>
  )
}

// ── The ghost card ──────────────────────────────────────────────────────────

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
  ctx: ValueContext
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
                  <span
                    className={cx('card-prop-label', text.caption.emphasized, overScrollEllipsis)}
                  >
                    {columnLabel(c, ctx.contexts)}
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
  defaultIcons: Personalization['defaultIcons']
  api: Pick<CardApi, 'openSet' | 'banner'>
}

function SetCard({ set, defaultIcons, api }: SetCardProps): React.JSX.Element {
  const drag = useDragItem(set.id, { open: () => api.openSet(set, false) })
  return (
    <CardRoot drag={drag} locked onClick={(e) => api.openSet(set, isCmd(e))}>
      <SetFace
        set={set}
        defaultIcons={defaultIcons}
        onThumbMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          api.banner({ id: set.id, kind: 'set', frame: e.currentTarget, mode: 'menu' })
        }}
      />
    </CardRoot>
  )
}

function SetFace({
  set,
  defaultIcons,
  onThumbMenu,
}: {
  set: SetNode
  defaultIcons: Personalization['defaultIcons']
  onThumbMenu?: (e: React.MouseEvent<HTMLDivElement>) => void
}): React.JSX.Element {
  const iconName = entityIcon('set', set.icon, defaultIcons)
  return (
    <CardBody>
      <CardThumb onContextMenu={onThumbMenu}>
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
  defaultIcons: Personalization['defaultIcons']
  styleById: Map<string, ColumnStyle>
  api: CardApi
  allowInlineRemove: boolean
  naming: ViewHostApi['naming']
  editing: string | null
}

function CardProperties({
  row,
  view,
  ctx,
  styleById,
  shown,
  onZoneClick,
  api,
  allowInlineRemove,
  editing,
}: Pick<PageCardProps, 'row' | 'view' | 'ctx' | 'styleById' | 'allowInlineRemove' | 'editing'> & {
  api: ValueApi
  shown: ResolvedColumn[]
  onZoneClick: (e: React.MouseEvent) => void
}): React.JSX.Element {
  const compact = isCompact(view)
  const zoneClick = (e: React.MouseEvent): void => {
    if (e.target === e.currentTarget) onZoneClick(e)
  }
  const value = (c: ResolvedColumn): React.JSX.Element => (
    // data-drag-slop: the whole card is a drag handle, so a press beginning on a value gets a larger activation threshold — a tap-wobble opens the picker instead of lifting the card.
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a grid cell — per-cell tab stops are the wrong pattern; the grid wants roving tabindex, which is a feature rather than a lint fix
    <span
      className="card-value value-seat"
      data-drag-slop=""
      onClick={(e) => api.click(row, c, e)}
      onContextMenu={(e) => void api.menu(row, c, e)}
    >
      {(editing === c.id && api.editor(row, c)) || (
        <Cell
          row={row}
          column={c}
          ctx={ctx}
          style={styleById.get(c.id)!}
          empty={
            fillsBlank(c.type) ? (
              <EmptyValue className={cx('cell-empty', text.caption.emphasized)} />
            ) : undefined
          }
          commit={(v) => api.commitValue(row, c, v)}
          hideRemove={!allowInlineRemove}
          onPane={(anchor) => api.pane(row, c, anchor)}
        />
      )}
    </span>
  )
  return compact ? (
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a grid cell — per-cell tab stops are the wrong pattern; the grid wants roving tabindex, which is a feature rather than a lint fix
    <div className="card-props is-flow" onClick={zoneClick}>
      {shown.map((c) => (
        <span
          key={c.id}
          className={c.type === 'text' ? cx('card-text-value', borderedField) : undefined}
        >
          {value(c)}
        </span>
      ))}
    </div>
  ) : (
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a grid cell — per-cell tab stops are the wrong pattern; the grid wants roving tabindex, which is a feature rather than a lint fix
    <div className="card-props" onClick={zoneClick}>
      {shown.map((c) => (
        <div key={c.id} className="card-prop-row">
          <span className={cx('card-prop-label', text.caption.emphasized, overScrollEllipsis)}>
            {columnLabel(c, ctx.contexts)}
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
  onZoneClick,
  api,
  editing,
}: {
  row: ViewRow
  naming: ViewHostApi['naming']
  view: SavedView
  banner: CardBanner
  ctx: ValueContext
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
  onZoneClick?: (e: React.MouseEvent) => void
  api: ValueApi
  /** The column whose inline field is open on this card. */
  editing: string | null
}): React.JSX.Element {
  const shown = useMemo(() => shownColumnsFor(row, columns, isCompact(view)), [columns, row, view])
  const titleIcon = !viewOption(view, 'hide_page_icons') && (
    <Icon name={iconName} className="card-title-icon" />
  )
  const titleRow = (
    <CardTitle
      mode={naming ? 'static' : viewOption(view, 'wrap_titles') ? 'wrap' : 'scroll'}
      onPointerDown={naming ? (e) => e.stopPropagation() : undefined}
    >
      {titleIcon}
      <RenamableName
        title={row.title}
        kind="page"
        rename={{ path: row.path, editing: naming !== null, onEnd: api.endNaming }}
        create={naming?.create}
        className={cx(titleInput, 'card-title-input')}
      >
        {(shown) => <span>{shown}</span>}
      </RenamableName>
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
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
            api.banner({ id: row.id, kind: 'page', frame: e.currentTarget, mode: 'menu' })
          }}
        >
          {banner === 'banner' ? (
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
        {titleRow}
        {shown.length > 0 && (
          <CardProperties
            row={row}
            view={view}
            ctx={ctx}
            styleById={styleById}
            shown={shown}
            api={api}
            allowInlineRemove={allowInlineRemove}
            editing={editing}
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
  styleById: Map<string, ColumnStyle>
  crumbs: TrailSegment[]
  cover?: string
  iconName: string
  columns: ResolvedColumn[]
  nexusId: string
}): React.JSX.Element {
  const { src } = useThumb(nexusId, previewKeyOf(row, banner))
  return (
    <CardFace
      row={row}
      view={view}
      banner={banner}
      ctx={ctx}
      styleById={styleById}
      crumbs={crumbs}
      src={src}
      cover={cover}
      iconName={iconName}
      columns={columns}
      allowInlineRemove={false}
      naming={null}
      api={INERT_API}
      editing={null}
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
  styleById,
  api,
  allowInlineRemove,
  naming,
  editing,
}: PageCardProps): React.JSX.Element {
  const drag = useDragItem(row.id, { open: () => api.open(row, false) })
  const active = useSession((s) => s.selection.kind === 'page' && s.selection.id === row.id)
  const { src, onError } = useThumb(nexusId, previewKeyOf(row, banner))

  const textRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const openAdd = useCallback(
    (e: React.MouseEvent): void => {
      e.stopPropagation()
      api.openAdd(row, textRef.current)
    },
    [api, row],
  )
  const cover = coverOf(row)

  const onCardContextMenu = (e: React.MouseEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    if (drag.isDragging) return
    const anchor = textRef.current ?? (e.currentTarget as HTMLElement)
    void api.pageMenu(
      row,
      anchor,
      banner === 'banner' && cover
        ? () =>
            api.banner({
              id: row.id,
              kind: 'page',
              frame: thumbRef.current ?? anchor,
              mode: 'edit',
            })
        : undefined,
    )
  }

  const iconName = entityIcon('page', row.icon, defaultIcons)

  return (
    <CardRoot
      drag={drag}
      active={active}
      data-rid={row.id}
      {...rowHover(row, api.hover)}
      onClick={(e) => {
        if (naming) return
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
            onZoneClick={openAdd}
            api={api}
            editing={editing}
          />
        </CardBody>
      </div>
    </CardRoot>
  )
})
