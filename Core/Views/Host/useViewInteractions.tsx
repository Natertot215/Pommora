// Everything a row, a band, or a page does in answer to the pointer, defined once for every view kind: band drops, row drops and where the order lands, opening a page, the value seat, the hover ghost, and the page menu. A kind supplies the policy below and its own presentation, nothing else.

import { useMemo, useRef, useState } from 'react'
import { type StableHandlers, useLatest, useStableApi } from '@pommora/uix/Utilities/stableApi'
import { UNGROUPED, type ViewRow } from '../viewRow'
import type { CollectionNode, SetNode } from '../../Nexus/tree'
import type { NewPageRows } from '../../Actions/pageMenu'
import { type PageTarget, selectTargetOf } from '../../Navigation/navRef'
import { nextOrder } from '@pommora/uix/Utilities/moveItem'
import {
  type GhostAnchor,
  ghostRootProps,
  useClearStrandedGhost,
  useGhostAnchor,
} from '@pommora/uix/Interactions/ghostCreate'
import { REVEAL_DWELL_MS } from '@pommora/uix/Interactions/hoverReveal'
import { announceDrag } from '@pommora/uix/Interactions/a11y'
import { carries, groupedLine, lineList, rowLine, rowStep } from '@pommora/uix/Interactions/drag'
import { rowIndent } from '@pommora/uix/Table/rowIndent'
import type { Geometry, Row } from '@pommora/uix/Interactions/reorderModel'
import { TAB_FAMILY } from '../../Navigation/tabRows'
import { EntityIcon } from '../../Assets/EntityIcon'
import { columnLabel } from '../../Properties/columnDisplay'
import { addColumns, itemColumns, resolveColumn } from '../Pipeline/columns'
import { isBlankValue } from '../../Properties/propertyValue'
import type { ResolvedColumn } from '../../Properties/properties'
import { notify } from '../../Interface/Notifications/notifications'
import { useSession } from '../../Session/store'
import { pickOpen } from '../../Session/chromeSlice'
import { glanceShown, hoverGlance, leaveGlance } from '../../Interface/Glance/glanceAction'
import { showPageMenu } from '../../Interface/Menus/pageMenuActions'
import { type SeatHost, useValueSeat, type ValueSeatApi } from '../../Properties/Pickers/ValueSeat'
import { holderOf } from '../../Properties/valueContext'
import {
  type BandNode,
  bucketValueAt,
  memberIndent,
  nodeLabel,
  springsInto,
} from '../Bands/bandModel'
import { bandRouting } from '../Bands/bandRouter'
import { bucketKey } from '../Pipeline/group'
import { groupKeyToValue, reassignable } from '../valueKinds'
import { type BandView, bandSpec } from '../Bands/GroupBand'
import { sameItems } from '@pommora/uix/Utilities/same'
import { useViewTileScope } from '../ViewTileScope'
import type { ViewHostApi } from './useViewHost'
import { mergedRanking, tieOrderWith, useViewCreation } from './useViewCreation'
import { dropIO } from './liveView'
import { mutateAhead, refusedDrop } from './paintAhead'

export type ItemApi = {
  click: ValueSeatApi['click']
  menu: ValueSeatApi['menu']
  pane: ValueSeatApi['pane']
  editor: ValueSeatApi['editor']
  openAdd: ValueSeatApi['openAdd']
  commit: SeatHost['commit']
  open: (row: ViewRow, newTab: boolean) => void
  openSet: (set: SetNode, newTab: boolean) => void
  hover: GhostAnchor['onHover']
  pageMenu: (
    row: ViewRow,
    e: React.MouseEvent,
    anchor?: HTMLElement,
    editImage?: () => void,
  ) => Promise<void>
  endNaming: () => void
}

interface ViewInteractionPolicy<Own extends StableHandlers> {
  ghost: {
    graceMs: number
    travelHold?: { inZone: (enteringId: string) => boolean; holdMs: number }
  }
  seat: Pick<SeatHost, 'anchor'> &
    Partial<Pick<SeatHost, 'centered' | 'onClose'>> & {
      /** What an item draws of the view's columns, from a kind whose items add, show, and hide properties themselves. */
      drawn?: (row: ViewRow) => ResolvedColumn[]
    }
  newPages: NewPageRows
  item: Own
}

/** The neighbor rule keeps a drop to a run's edge — a seam, or either end of the list — from rewriting anything. */
export function reassignTarget(
  order: string[],
  draggedId: string,
  keyOf: (id: string) => string,
): string | undefined {
  const i = order.indexOf(draggedId)
  if (i <= 0 || i >= order.length - 1) return undefined
  const key = keyOf(order[i - 1])
  if (key !== keyOf(order[i + 1]) || key === keyOf(draggedId)) return undefined
  return key
}

function pageTarget(row: ViewRow): PageTarget {
  return { kind: 'page', id: row.id, path: row.path }
}

/** The pointer handlers every row uses: the ghost's hover and the location glance. */
export function rowHover(
  row: ViewRow,
  onHover: GhostAnchor['onHover'],
): {
  onPointerEnter: (e: React.PointerEvent<HTMLElement>) => void
  onPointerLeave: () => void
} {
  return {
    onPointerEnter: (e) => {
      onHover(row.id, true)
      hoverGlance(pageTarget(row), e.currentTarget, 'location', e.shiftKey)
    },
    onPointerLeave: () => {
      onHover(row.id, false)
      leaveGlance()
    },
  }
}

export type ViewInteractions = ReturnType<typeof useViewInteractions>

export function useViewInteractions<Own extends StableHandlers>(
  host: ViewHostApi,
  policy: ViewInteractionPolicy<Own>,
) {
  const {
    source,
    view,
    rows,
    rowById,
    rowBand,
    paintOrder,
    sets,
    bands,
    nests,
    disclosure,
    identity,
    ctx,
    groupPropId,
    canReassign,
    canRelocate,
    crossBand,
    searching,
    columns,
    sortKeys,
    pageOrder,
    plan,
    persistView,
    commitValue,
    styleOf,
    setStylePatch,
    revealProperty,
    hideProperty,
  } = host

  const { schema } = ctx
  const commitGroupValue = (
    pageId: string,
    propertyId: string,
    groupKey: string,
  ): Promise<boolean> | undefined => {
    const row = rowById.get(pageId)
    const column = resolveColumn(propertyId, schema, identity.contextIds)
    return row && column && commitValue(row, column, groupKeyToValue(groupKey, column.type))
  }
  const openTarget = useSession((s) => s.openTarget)
  const tree = useSession((s) => s.tree)
  const tile = useViewTileScope()

  // A single-sorted view lays its rows out in value RUNS, so a reorder landing one strictly inside another run rewrites the sorted property. Armed only when the column is shown — an unrendered property leaves the run boundaries unreadable.
  const sortReassign = useMemo(() => {
    if (groupPropId !== undefined || sortKeys !== 1) return undefined
    for (const c of view.sort ?? []) {
      const column = columns.find((col) => col.id === c.property_id)
      if (column && reassignable(column.type)) return column
    }
    return undefined
  }, [groupPropId, sortKeys, view.sort, columns])
  const reassignBySortRun = (orderIds: string[], groupKey: string, activeId: string): void => {
    if (!sortReassign) return
    const keyOf = (id: string): string => {
      const row = rowById.get(id)
      return (row ? bucketKey(row, sortReassign, 'day') : null) ?? UNGROUPED
    }
    const band = orderIds.filter((id) => rowBand.get(id) === groupKey)
    const target = reassignTarget(band, activeId, keyOf)
    if (target === undefined) return
    commitGroupValue(activeId, sortReassign.id, target)
  }

  // ── Bands ─────────────────────────────────────────────────────────────────

  const valueAt = bucketValueAt(bands.byKey)
  const bandRoutes = bandRouting(
    { view, plan, sets, sourcePath: source.path, bands },
    (dragged, prior) => {
      const node = bands.byKey.get(dragged.key)
      const name = node ? nodeLabel(node) : (sets.node.get(dragged.key)?.title ?? '')
      return {
        ...dropIO({ id: dragged.key, name, prior }, host),
        switched: ({ propertyId, prior: undo }) =>
          notify(
            `Switched to custom ${columnLabel(resolveColumn(propertyId, schema, identity.contextIds)!, ctx.contexts)} order`,
            () =>
              void persistView(undo).then((r) => {
                if (r.ok) announceDrag('return', name)
              }),
          ),
      }
    },
  )
  const creation = useViewCreation(() => ({ ...host, bandBucket: valueAt }))
  const openSet = (set: SetNode, newTab: boolean): void => {
    openTarget(selectTargetOf(set), { newTab })
  }
  const bandView: BandView = {
    ...disclosure,
    add: creation.bandAdd,
    open: openSet,
    springs: (dragged: string, node: BandNode) =>
      bands.byKey.has(dragged)
        ? springsInto(bands, dragged, node, nests)
        : rowById.has(dragged) && crossBand,
    immovable: searching,
  }

  const bandZone = (indent?: (depth: number) => string) =>
    bandSpec({
      bands,
      disclosure,
      nests,
      routing: bandRoutes,
      indent: indent && ((depth) => ({ left: `calc(var(--drop-line-inset) + ${indent(depth)})` })),
    })

  // ── Rows ──────────────────────────────────────────────────────────────────

  const bandRowIds = (groupKey: string, excludeId: string): string[] =>
    paintOrder.flatMap((r) => (r.groupKey === groupKey && r.id !== excludeId ? [r.id] : []))
  const folderOf = (setId: string | null | undefined): CollectionNode | SetNode | undefined =>
    setId == null ? source : sets.node.get(setId)
  const destOf = (zone: string, row: ViewRow): CollectionNode | SetNode | undefined => {
    const from = bands.byKey.get(rowBand.get(row.id) ?? '')
    const to = bands.byKey.get(zone)
    if (!to || !from || to === from) return folderOf(row.parentSetId)
    if (canRelocate) return to.kind === 'set' ? to.set : to.parentKey === null ? source : undefined
    return to.parentKey === from.parentKey ? folderOf(row.parentSetId) : folderOf(to.parentKey)
  }
  const folderOrderAt = (
    dest: CollectionNode | SetNode,
    zone: string,
    activeId: string,
    beforeId: string | null,
  ): string[] | undefined => {
    const destSetId = dest === source ? undefined : dest.id
    const bandIds = bandRowIds(zone, activeId)
    const at = beforeId === null ? bandIds.length : bandIds.indexOf(beforeId)
    const sibBefore = bandIds.slice(at).find((id) => rowById.get(id)?.parentSetId === destSetId)
    const pages = dest.pages.map((p) => p.id)
    const order = nextOrder(pages, activeId, sibBefore ?? null)
    return sameItems(order, pages) ? undefined : order
  }
  const placeInView = (row: ViewRow, beforeId: string | null, landed?: Promise<boolean>): void => {
    if (pageOrder !== 'custom') return
    const ranked = mergedRanking(
      view.manual_order,
      rows.map((r) => r.id),
    )
    const patch = { manual_order: tieOrderWith(ranked, ranked, row.id, beforeId, 'above') }
    const io = dropIO({ id: row.id, name: row.title, prior: { manual_order: ranked } }, host)
    if (landed) io.persistAfter(patch, landed, { viewState: true })
    else void io.persistView(patch, { viewState: true })
  }
  const moveTo = (
    row: ViewRow,
    dest: CollectionNode | SetNode,
    order: string[] | undefined,
    after?: Promise<boolean>,
  ): Promise<boolean> =>
    mutateAhead(
      { op: 'movePage', path: row.path, newParentPath: dest.path, ...(order ? { order } : {}) },
      row.title,
      after,
    )

  const reorderWithin = (groupKey: string, row: ViewRow, beforeId: string | null): void => {
    if (pageOrder === 'location') {
      const folder = folderOf(row.parentSetId)
      if (!folder) return
      const order = folderOrderAt(folder, groupKey, row.id, beforeId)
      if (order) void moveTo(row, folder, order)
      return
    }
    const current = paintOrder.flatMap((r) => (r.groupKey === groupKey ? [r.id] : []))
    const bandOrder = nextOrder(bandRowIds(groupKey, row.id), row.id, beforeId)
    if (sameItems(bandOrder, current)) return
    placeInView(row, beforeId)
    reassignBySortRun(bandOrder, groupKey, row.id)
  }

  const land = (
    row: ViewRow,
    dest: CollectionNode | SetNode,
    toZone: string,
    beforeId: string | null,
    written?: Promise<boolean>,
  ): void => {
    const order =
      pageOrder === 'location' ? folderOrderAt(dest, toZone, row.id, beforeId) : undefined
    if (dest === folderOf(row.parentSetId) && !order) {
      placeInView(row, beforeId, written)
      return
    }
    placeInView(row, beforeId, moveTo(row, dest, order, written))
  }

  const relocate = (row: ViewRow, toZone: string, beforeId: string | null): void => {
    const dest = destOf(toZone, row)
    if (dest && dest !== folderOf(row.parentSetId)) land(row, dest, toZone, beforeId)
  }

  const reassign = (row: ViewRow, toZone: string, beforeId: string | null): void => {
    const to = bands.byKey.get(toZone)
    const from = bands.byKey.get(rowBand.get(row.id) ?? '')
    const dest = destOf(toZone, row)
    if (!groupPropId || !to || !from || to.kind === 'set' || !dest) return
    const value = valueAt(toZone)
    const keeps =
      value === valueAt(from.key) ||
      (to.kind === 'tail' && to.parentKey === null && plan.kind === 'sets')
    const written = keeps
      ? undefined
      : (commitGroupValue(row.id, groupPropId, value ?? UNGROUPED) ?? Promise.resolve(false)).then(
          (ok) => refusedDrop(ok, row.title),
        )
    land(row, dest, toZone, beforeId, written)
  }

  /** One entry for every row drop: a same-band slot reorders, a cross-band one moves the page or rewrites its group value. `beforeId` is null at the target band's end. */
  const onDrop = (activeId: string, toZone: string, beforeId: string | null): void => {
    const row = rowById.get(activeId)
    const from = rowBand.get(activeId)
    if (!row || from === undefined) return
    if (toZone === from) reorderWithin(toZone, row, beforeId)
    else if (canRelocate) relocate(row, toZone, beforeId)
    else if (canReassign) reassign(row, toZone, beforeId)
  }

  const folderRuns = useRef<{
    order: typeof paintOrder
    id: string
    rank: ReadonlyMap<string | undefined, number>
    runs: Map<string, { first: number; count: number }>
  } | null>(null)
  const folderSlot = (zone: string, index: number, activeId: string): number | null => {
    const row = rowById.get(activeId)
    if (pageOrder !== 'location' || !row) return index
    let held = folderRuns.current
    if (!held || held.order !== paintOrder || held.id !== activeId) {
      const rank = new Map<string | undefined, number>([[undefined, -1]])
      for (const [i, id] of sets.preorder.entries()) rank.set(id, i)
      held = { order: paintOrder, id: activeId, rank, runs: new Map() }
      folderRuns.current = held
    }
    const { rank, runs } = held
    let r = runs.get(zone)
    if (!r) {
      const dest = destOf(zone, row)
      const destId = dest === source ? undefined : dest?.id
      const destRank = rank.get(destId) ?? Number.POSITIVE_INFINITY
      const ids = paintOrder.flatMap((p) => (p.groupKey === zone ? [p.id] : []))
      let first = -1
      let past = -1
      let count = 0
      let seen = 0
      ids.forEach((id, i) => {
        const at = i - seen
        if (id === activeId) seen = 1
        const setId = rowById.get(id)?.parentSetId
        if (setId === destId) {
          if (first < 0) first = at
          if (id !== activeId) count++
        } else if (past < 0 && (rank.get(setId) ?? 0) > destRank) past = at
      })
      r = { first: first >= 0 ? first : past >= 0 ? past : ids.length - seen, count }
      runs.set(zone, r)
    }
    return index >= r.first && index <= r.first + r.count ? index : null
  }

  const vacantHeads = (g: Geometry): Map<string, Row> => {
    const held = new Set(rowBand.values())
    const heads = new Map<string, Row>()
    for (const r of g.rows) {
      const node = bands.byKey.get(r.id)
      if (!node || held.has(r.id)) continue
      if (node.kind === 'set' ? canRelocate : node.kind === 'bucket' && canReassign)
        heads.set(r.id, { ...r, top: r.bottom })
    }
    return heads
  }
  const listZone = () =>
    groupedLine(
      (id) => rowById.has(id),
      lineList({
        laneOf: () => (id) => rowBand.get(id),
        across: crossBand,
        boxes: vacantHeads,
        accepts: (slot, id) => folderSlot(slot.lane, slot.index, id) !== null,
        commit: (id, slot) => onDrop(id, slot.lane, slot.before),
        line: (slot, s) => {
          const node = bands.byKey.get(slot.lane)!
          return rowLine(slot, s, memberIndent(node.kind, node.depth))
        },
        step: (slot, s) => rowStep(slot, s, bands.byKey.get(slot.lane)?.kind !== 'tail'),
        label: (id) => rowById.get(id)?.title ?? '',
        glyph: (id) => <EntityIcon kind="page" icon={rowById.get(id)?.icon} />,
        carry: [carries(TAB_FAMILY, carry)],
        disclose: crossBand,
        watch: [rowBand],
      }),
      bandZone(rowIndent),
    )

  // ── Carry ─────────────────────────────────────────────────────────────────

  const carry = (id: string): PageTarget | null => {
    const row = rowById.get(id)
    return row ? pageTarget(row) : null
  }

  // ── Pages ─────────────────────────────────────────────────────────────────

  const openPage = (row: ViewRow, newTab: boolean): void => {
    // A tile that states its own route owns every plain open.
    if (!newTab && tile?.openPage) tile.openPage({ id: row.id, title: row.title, path: row.path })
    else openTarget(pageTarget(row), { newTab })
  }

  const liveRows = useLatest(rowById)
  const pageMenu = (
    row: ViewRow,
    e: React.MouseEvent,
    anchor = e.currentTarget as HTMLElement,
    editImage?: () => void,
  ): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()
    return ghost.suppressWrap(() =>
      showPageMenu(row, {
        trigger: anchor,
        rename: () => host.beginNaming(row.id),
        newPage: {
          rows: policy.newPages,
          create: (where) => void creation.createAdjacent(row, where),
        },
        editImage,
        values: {
          row,
          schema,
          rowOf: () => liveRows.current.get(row.id) ?? row,
          commit: (column, value) => void commitValue(row, column, value),
          trigger: anchor,
          styleOf,
        },
      }),
    )
  }

  // ── Ghost ─────────────────────────────────────────────────────────────────

  const ghost = useGhostAnchor({
    dwellMs: REVEAL_DWELL_MS,
    graceMs: policy.ghost.graceMs,
    suppressed: () =>
      pickOpen(useSession.getState()) ||
      glanceShown() ||
      seat.open !== null ||
      host.naming !== null,
    travelHold: policy.ghost.travelHold,
  })
  const { drawn, ...seatPolicy } = policy.seat
  // A value from an item's Add shows its property; a right-click pick runs through `MenuSeat` and leaves the view alone.
  const adds: Pick<SeatHost, 'commit' | 'hide' | 'add'> | undefined = drawn && {
    commit: (row, column, value) => {
      if (!isBlankValue(value)) revealProperty(column.id)
      commitValue(row, column, value)
    },
    hide: { from: 'view', run: (_, column) => hideProperty(column.id) },
    add: {
      columns: (row) => addColumns(itemColumns(tree, schema, row.id), row, drawn(row)),
      show: (column) => revealProperty(column.id),
    },
  }
  const seat = useValueSeat({
    rowOf: (id) => rowById.get(id),
    columnOf: (id) => resolveColumn(id, schema, identity.contextIds),
    commit: commitValue,
    holder: (row) => holderOf(row, ctx),
    connections: ctx.connections,
    style: styleOf,
    setStyle: setStylePatch,
    hold: ghost.suppressWrap,
    ...seatPolicy,
    ...adds,
  })
  useClearStrandedGhost(ghost, rowById)
  // The container itself holds nothing, so the ghost stands on its own as its first New Page instead of waiting on a hover anchor. Reading the container rather than the pipeline keeps it off a view whose filter is what emptied the paint — there the create would land a page the filter hides again.
  const ghostStanding = rows.length === 0
  // The ghost holds its place for its create's whole flight, until the newborn's row lands there; a click on it meanwhile creates nothing.
  const [held, setHeld] = useState<{ anchorId: string | null; id: string } | null>(null)
  const ghostCreate = (): void => {
    if (held) return
    const anchorId = ghost.take()
    const anchor = anchorId ? rowById.get(anchorId) : undefined
    if (!anchor && !ghostStanding) return
    const flight = anchor ? creation.createAfter(anchor) : creation.createFirst()
    setHeld({ anchorId: anchor?.id ?? null, id: flight.id })
    void flight.path.finally(() => setHeld((h) => (h?.id === flight.id ? null : h)))
  }
  const heldAt = held && !rowById.has(held.id) ? held.anchorId : null

  const item = useStableApi<ItemApi & Own>({
    click: seat.click,
    menu: seat.menu,
    pane: seat.pane,
    editor: seat.editor,
    openAdd: seat.openAdd,
    commit: seat.commit,
    open: openPage,
    openSet,
    hover: ghost.onHover,
    pageMenu,
    endNaming: host.endNaming,
    ...policy.item,
  })

  return {
    item,
    bandView,
    bandDrop: bandRoutes.drop,
    bandZone,
    listZone,
    onDrop,
    carry,
    folderSlot,
    seat,
    ghostAt: heldAt ?? ghost.ghost?.anchorId ?? null,
    ghostClosing: heldAt === null && ghost.ghost?.closing === true,
    onGhostClosed: ghost.closed,
    holdGhost: ghost.suppressWrap,
    ghostRootProps: { ...ghostRootProps(ghost), onClick: ghostCreate },
    ghostStanding,
  }
}
