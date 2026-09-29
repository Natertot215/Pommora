// Everything a row, a band, or a page does in answer to the pointer, defined once for every view kind: band drops, row drops and where the order lands, opening a page, the hover ghost, the title menu's page actions, and the icon picker seat. A kind supplies the policy below and its own presentation, nothing else.

import { useRef, useState } from 'react'
import { UNGROUPED } from '@pommora/core/Views/viewRow'
import type { ViewRow } from '@pommora/core/Views/viewRow'
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
import { mutateAhead } from './pendingView'

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
  const bandDrop = (dragged: BandRef, drop: BandDrop): void => {
    const name = nodeLabel(bands.byKey.get(dragged.key))
    void dropBand(
      bands,
      dragged,
      drop,
      { view, plan, schema, sets, sourcePath: source.path },
      {
        persistView,
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
  const folderAt = (zone: string): CollectionNode | SetNode | undefined => {
    const node = bands.byKey.get(zone)
    return node?.kind === 'set' ? node.set : node?.parentKey === null ? source : undefined
  }
  const placeInView = (activeId: string, beforeId: string | null): void => {
    if (pageOrder !== 'custom') return
    const manual_order = tieOrderWith(
      view.manual_order,
      rows.map((r) => r.id),
      activeId,
      beforeId,
      'above',
    )
    void persistView({ manual_order }, { viewState: true })
  }

  const reorderWithin = (bandKey: string, activeId: string, beforeId: string | null): void => {
    const row = rowById.get(activeId)
    const bandOrder = nextOrder(bandRowIds(bandKey, activeId), activeId, beforeId)
    if (pageOrder === 'location') {
      const folder = folderOf(row?.parentSetId)
      if (!row || !folder) return
      const siblings = folder.pages.map((p) => p.id)
      const after = bandOrder
        .slice(bandOrder.indexOf(activeId) + 1)
        .find((id) => rowById.get(id)?.parentSetId === row.parentSetId)
      const order = nextOrder(siblings, activeId, after ?? null)
      if (!sameIds(order, siblings))
        void mutateAhead(
          { op: 'movePage', path: row.path, newParentPath: folder.path, order },
          row.title,
        )
      return
    }
    let placed = false
    const full = paintOrder.flatMap((r) => {
      if (r.groupKey !== bandKey) return r.id === activeId ? [] : [r.id]
      if (placed) return []
      placed = true
      return bandOrder
    })
    if (
      sameIds(
        full,
        paintOrder.map((r) => r.id),
      )
    )
      return
    void persistView({ manual_order: full }, { viewState: true })
    reassignBySortRun(full, bandKey, activeId)
  }

  const relocate = (activeId: string, toZone: string, beforeId: string | null): void => {
    const row = rowById.get(activeId)
    const dest = folderAt(toZone)
    if (!row || !dest) return
    const destSetId = dest === source ? undefined : dest.id
    if (destSetId === row.parentSetId) return
    const bandIds = bandRowIds(toZone, activeId)
    const at = beforeId === null ? bandIds.length : bandIds.indexOf(beforeId)
    const sibBefore = bandIds.slice(at).find((id) => rowById.get(id)?.parentSetId === destSetId)
    const order = nextOrder(
      dest.pages.map((p) => p.id),
      activeId,
      sibBefore ?? null,
    )
    placeInView(activeId, beforeId)
    void mutateAhead({ op: 'movePage', path: row.path, newParentPath: dest.path, order }, row.title)
  }

  const reassign = (activeId: string, toZone: string, beforeId: string | null): void => {
    const row = rowById.get(activeId)
    const to = bands.byKey.get(toZone)
    const from = bands.byKey.get(rowBand.get(activeId) ?? '')
    if (!groupPropId || !row || !to || !from || to.kind === 'set') return
    const value = valueAt(toZone)
    const write =
      value === valueAt(from.key)
        ? Promise.resolve(true)
        : commitGroupValue(activeId, groupPropId, groupPropType, value ?? UNGROUPED)
    placeInView(activeId, beforeId)
    const dest = folderOf(to.parentKey)
    if (to.parentKey === from.parentKey || !dest) return
    void write?.then((ok) =>
      ok
        ? mutateAhead({ op: 'movePage', path: row.path, newParentPath: dest.path }, row.title)
        : null,
    )
  }

  /** One entry for every row drop: a same-band slot reorders, a cross-band one moves the page or rewrites its group value. `beforeId` is null at the target band's end. */
  const onDrop = (activeId: string, toZone: string, beforeId: string | null): void => {
    const from = rowBand.get(activeId)
    if (from === undefined) return
    if (toZone === from) reorderWithin(toZone, activeId, beforeId)
    else if (canRelocate) relocate(activeId, toZone, beforeId)
    else if (canReassign) reassign(activeId, toZone, beforeId)
  }

  const siblingRuns = useRef<{
    order: typeof paintOrder
    id: string
    runs: Map<string, { first: number; count: number }>
  } | null>(null)
  const siblingSlot = (zone: string, index: number, activeId: string): number | null => {
    const own = rowBand.get(activeId) === zone
    if (pageOrder !== 'location' || !(own || canRelocate)) return index
    let held = siblingRuns.current
    if (!held || held.order !== paintOrder || held.id !== activeId) {
      held = { order: paintOrder, id: activeId, runs: new Map() }
      siblingRuns.current = held
    }
    let r = held.runs.get(zone)
    if (!r) {
      const parent = own
        ? rowById.get(activeId)?.parentSetId
        : bands.byKey.get(zone)?.kind === 'set'
          ? zone
          : undefined
      let first = -1
      let count = 0
      bandRowIds(zone, activeId).forEach((id, i) => {
        if (rowById.get(id)?.parentSetId !== parent) return
        if (first < 0) first = i
        count++
      })
      r = { first: first < 0 && !own ? 0 : first, count }
      held.runs.set(zone, r)
    }
    return r.first >= 0 && index >= r.first && index <= r.first + r.count ? index : null
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
    siblingSlot,
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
