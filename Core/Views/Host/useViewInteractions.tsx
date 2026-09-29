// Everything a row, a band, or a page does in answer to the pointer, defined once for every view kind: band drops, row drops and where the order lands, opening a page, the hover ghost, the title menu's page actions, and the icon picker seat. A kind supplies the policy below and its own presentation, nothing else.

import { useRef, useState } from 'react'
import { UNGROUPED } from '@pommora/core/Views/viewRow'
import type { ViewRow } from '@pommora/core/Views/viewRow'
import type { ViewPatch } from '@pommora/core/Views/views'
import type { Result } from '@pommora/core/Contract/result'
import type { CollectionNode, SetNode } from '@pommora/core/Nexus/tree'
import type { PageMenuContext } from '@pommora/core/Actions/pageMenu'
import { type PageTarget, selectTargetOf } from '@pommora/core/Navigation/navRef'
import { nextOrder } from '@pommora/uix/Utilities/moveItem'
import {
  type GhostAnchor,
  useClearStrandedGhost,
  useGhostAnchor,
} from '@pommora/uix/Interactions/ghostCreate'
import { REVEAL_DWELL_MS } from '@pommora/uix/Interactions/hoverReveal'
import { announceDrag } from '@pommora/uix/Interactions/a11y'
import { columnLabel, useCapitalizeMetadata } from '../../Properties/Cells/columnLabel'
import { notifyUndoable } from '../../Interface/Notifications/notifications'
import { useSession } from '../../Session/store'
import { hoverGlance, leaveGlance } from '../../Interface/Glance/glanceAction'
import { pageMoveContext, runPageAction } from '../../Interface/Menus/pageMenuActions'
import { propertyMenuBranches, runPropertyAction } from '../../Interface/Menus/propertyMenuActions'
import { findCollectionForSet } from '../../Nexus/treeIndex'
import { isOpenInTabs } from '../../Navigation/tabsModel'
import { IconChoice } from '../../Assets/IconChoice'
import { type BandNode, nodeLabel, springsInto } from '../Bands/bandModel'
import { type BandDrop, type BandRef, bucketValueAt, dropBand } from '../Bands/bandRouter'
import type { BandView } from '../Bands/GroupBand'
import { sameIds, tieOrderWith } from '../creationOrder'
import { useViewTileScope } from '../ViewTileScope'
import type { ViewHostApi } from './useViewHost'
import { useViewCreation } from './useViewCreation'
import { mutateAhead, refusedDrop, stageView, unstageView } from './pendingView'

interface ViewInteractionPolicy {
  ghost: {
    graceMs: number
    suppressed: () => boolean
    travelHold?: { inZone: (enteringId: string) => boolean; holdMs: number }
  }
  /** Opens the renderer's naming surface over a page that already exists on disk. */
  rename: (target: { id: string; path: string }, fromCreate: boolean) => void
}

export type TitleMenuContext = PageMenuContext & { alreadyOpen: boolean }

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

export function useViewInteractions(host: ViewHostApi, policy: ViewInteractionPolicy) {
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
    collapsed,
    toggleCollapse,
    schema,
    tree,
    ctx,
    groupPropId,
    groupPropType,
    canReassign,
    canRelocate,
    crossBand,
    reassignBySortRun,
    pageOrder,
    plan,
    persistView,
    commitValue,
    commitGroupValue,
    mutate,
    select,
    styleOf,
  } = host

  const capitalize = useCapitalizeMetadata()
  const tile = useViewTileScope()

  // ── Bands ─────────────────────────────────────────────────────────────────

  const valueAt = bucketValueAt(bands.byKey)
  const saveDrop = (
    patch: ViewPatch,
    name: string,
    opts?: { viewState?: boolean },
  ): Promise<Result<unknown>> =>
    persistView(patch, opts).then((r) => {
      refusedDrop(r.ok, name)
      return r
    })
  const bandDrop = (dragged: BandRef, drop: BandDrop): void => {
    const node = bands.byKey.get(dragged.key)
    const name = node ? nodeLabel(node) : (sets.node.get(dragged.key)?.title ?? '')
    void dropBand(
      bands,
      dragged,
      drop,
      { view, plan, schema, sets, sourcePath: source.path },
      {
        persistView: (patch) => saveDrop(patch, name),
        mutate: (req) => mutateAhead(req, name),
        switched: ({ propertyId, prior }) =>
          notifyUndoable(
            `Switched to custom ${columnLabel(propertyId, schema, ctx.contexts, capitalize)} order`,
            () =>
              void persistView(prior).then((r) => {
                if (r.ok) announceDrag('return', name)
              }),
          ),
      },
    )
  }
  const creation = useViewCreation(() => ({
    ...host,
    bandBucket: valueAt,
    onCreated: (created) => policy.rename(created, true),
  }))
  const bandView: BandView = {
    collapsed,
    toggle: toggleCollapse,
    add: (key) => void creation.bandAdd(key),
    open: (set) => void select(selectTargetOf(set)),
    springs: (dragged: string, node: BandNode) =>
      bands.byKey.has(dragged)
        ? springsInto(bands, dragged, node, nests)
        : rowById.has(dragged) && crossBand,
  }

  // ── Rows ──────────────────────────────────────────────────────────────────

  const bandRowIds = (bandKey: string, excludeId: string): string[] =>
    paintOrder.flatMap((r) => (r.groupKey === bandKey && r.id !== excludeId ? [r.id] : []))
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
    return sameIds(order, pages) ? undefined : order
  }
  const placeInView = (row: ViewRow, beforeId: string | null, landed?: Promise<boolean>): void => {
    if (pageOrder !== 'custom') return
    const patch = {
      manual_order: tieOrderWith(
        view.manual_order,
        rows.map((r) => r.id),
        row.id,
        beforeId,
        'above',
      ),
    }
    const save = (): void => void saveDrop(patch, row.title, { viewState: true })
    if (!landed) {
      save()
      return
    }
    stageView(source.id, view, patch)
    void landed.then((ok) => (ok ? save() : unstageView(source.id, view.id, patch)))
  }
  const moveTo = (
    row: ViewRow,
    dest: CollectionNode | SetNode,
    order: string[] | undefined,
  ): Promise<boolean> =>
    mutateAhead(
      { op: 'movePage', path: row.path, newParentPath: dest.path, ...(order ? { order } : {}) },
      row.title,
    )

  const reorderWithin = (bandKey: string, row: ViewRow, beforeId: string | null): void => {
    if (pageOrder === 'location') {
      const folder = folderOf(row.parentSetId)
      if (!folder) return
      const order = folderOrderAt(folder, bandKey, row.id, beforeId)
      if (order) void moveTo(row, folder, order)
      return
    }
    const current = paintOrder.flatMap((r) => (r.groupKey === bandKey ? [r.id] : []))
    const bandOrder = nextOrder(bandRowIds(bandKey, row.id), row.id, beforeId)
    if (sameIds(bandOrder, current)) return
    placeInView(row, beforeId)
    reassignBySortRun(bandOrder, bandKey, row.id)
  }

  const relocate = (row: ViewRow, toZone: string, beforeId: string | null): void => {
    const dest = destOf(toZone, row)
    if (!dest || dest === folderOf(row.parentSetId)) return
    placeInView(row, beforeId, moveTo(row, dest, folderOrderAt(dest, toZone, row.id, beforeId)))
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
      ? Promise.resolve(true)
      : (commitGroupValue(row.id, groupPropId, groupPropType, value ?? UNGROUPED) ??
        Promise.resolve(false))
    const moves = dest !== folderOf(row.parentSetId)
    const order =
      pageOrder === 'location' ? folderOrderAt(dest, toZone, row.id, beforeId) : undefined
    const landed = moves || order ? written.then((ok) => ok && moveTo(row, dest, order)) : written
    placeInView(row, beforeId, landed)
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
      const ids = bandRowIds(zone, activeId)
      let first = ids.length
      let count = 0
      ids.forEach((id, i) => {
        const setId = rowById.get(id)?.parentSetId
        if (setId === destId) count++
        if (first === ids.length && (rank.get(setId) ?? 0) >= destRank) first = i
      })
      r = { first, count }
      runs.set(zone, r)
    }
    return index >= r.first && index <= r.first + r.count ? index : null
  }

  // ── Carry ─────────────────────────────────────────────────────────────────

  const carry = (id: string): PageTarget | null => {
    const row = rowById.get(id)
    return row ? pageTarget(row) : null
  }

  // ── Pages ─────────────────────────────────────────────────────────────────

  const openPage = (row: ViewRow, newTab: boolean): void => {
    const target = pageTarget(row)
    // A plain click passes NO option, so the tab-open preference still decides; forcing `false` would override it.
    if (newTab) {
      void select(target, { newTab: true })
      return
    }
    // A tile that states its own route owns every page it opens; the container's Open In is the main pane's rule.
    if (tile?.openPage) {
      tile.openPage({ id: row.id, title: row.title, path: row.path })
      return
    }
    const owner = source.kind === 'collection' ? source : findCollectionForSet(tree, source.id)
    if (owner?.openIn === 'page-preview') useSession.getState().openWindowTab(target)
    else void select(target)
  }

  const [iconOpen, setIconOpen] = useState(false)
  const [iconTarget, setIconTarget] = useState<{ path: string; icon?: string } | null>(null)
  const iconAnchor = useRef<HTMLElement | null>(null)
  const openIconPicker = (row: ViewRow, anchor: HTMLElement): void => {
    iconAnchor.current = anchor
    setIconTarget({ path: row.path, icon: row.icon })
    setIconOpen(true)
  }
  const iconPicker = (
    <IconChoice
      key={iconTarget?.path}
      open={iconOpen}
      onClose={() => setIconOpen(false)}
      triggerRef={iconAnchor}
      value={iconTarget?.icon}
      onSelect={(icon) => {
        if (iconTarget) void mutate({ op: 'setIcon', path: iconTarget.path, kind: 'page', icon })
      }}
    />
  )

  const titleMenuContext = (row: ViewRow): TitleMenuContext => {
    const { tabs, pinned } = useSession.getState()
    return {
      alreadyOpen: isOpenInTabs(tabs, pinned, pageTarget(row)),
      ...pageMoveContext(tree, row.path),
      ...propertyMenuBranches({ tree, schema, row, capitalize }),
    }
  }
  /** The page half of any title menu; `anchor` seats the icon picker. Returns false for an action the caller owns. */
  const runTitleAction = (action: string, row: ViewRow, anchor: HTMLElement): boolean => {
    if (runPageAction(action, row)) return true
    if (
      runPropertyAction(action, {
        tree,
        schema,
        row,
        capitalize,
        trigger: anchor,
        commit: (column, value) => commitValue(row, column, value),
        styleOf,
      })
    )
      return true
    switch (action) {
      case 'title:rename':
        policy.rename(row, false)
        return true
      case 'title:icon':
        openIconPicker(row, anchor)
        return true
      case 'title:newabove':
        void creation.createAdjacent(row, 'above')
        return true
      case 'title:newbelow':
        void creation.createAdjacent(row, 'below')
        return true
      default:
        return false
    }
  }

  // ── Ghost ─────────────────────────────────────────────────────────────────

  const ghost = useGhostAnchor({
    dwellMs: REVEAL_DWELL_MS,
    graceMs: policy.ghost.graceMs,
    suppressed: () => iconOpen || policy.ghost.suppressed(),
    travelHold: policy.ghost.travelHold,
  })
  useClearStrandedGhost(ghost, rowById)
  // The container itself holds nothing, so the ghost stands on its own as its first New Page instead of waiting on a hover anchor. Reading the container rather than the pipeline keeps it off a view whose filter is what emptied the paint — there the create would land a page the filter hides again.
  const ghostStanding = rows.length === 0
  const standingFlight = useRef<Promise<boolean> | null>(null)
  /** Claims the ghost's anchor and creates below it, or creates the container's first page under a standing ghost; undefined when no ghost stands. */
  const ghostCreate = (): Promise<boolean> | undefined => {
    const anchorId = ghost.take()
    const anchor = anchorId ? rowById.get(anchorId) : undefined
    if (anchor) return creation.createAfter(anchor)
    if (!ghostStanding) return undefined
    // The standing ghost stays mounted until the row lands, so the create is claimed for its whole flight.
    if (standingFlight.current) return standingFlight.current
    const flight = creation.createFirst().finally(() => {
      standingFlight.current = null
    })
    standingFlight.current = flight
    return flight
  }

  return {
    bandView,
    bandDrop,
    onDrop,
    carry,
    folderSlot,
    openPage,
    titleMenuContext,
    runTitleAction,
    iconPicker,
    ghost,
    ghostStanding,
    ghostCreate,
    holdGhost: ghost.suppressWrap,
  }
}
