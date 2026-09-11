// Everything a row, a band, or a page does in answer to the pointer, defined once for every view kind: band drops, row drops and where the order lands, opening a page, the hover ghost, the title menu's page actions, and the icon picker seat. A kind supplies the policy below and its own presentation, nothing else.

import { useMemo, useRef, useState } from 'react'
import { UNGROUPED } from '@pommora/core/Views/viewRow'
import type { ViewRow } from '@pommora/core/Views/viewRow'
import type { SavedView } from '@pommora/core/Views/views'
import type { PageMoveContext } from '@pommora/core/Actions/pageMenu'
import { relDirname } from '@pommora/core/Paths/posix'
import { nextOrder } from '@pommora/uix/Interactions/reorderModel'
import {
  GHOST_DWELL_MS,
  type GhostAnchor,
  useClearStrandedGhost,
  useGhostAnchor,
} from '@pommora/uix/Interactions/ghostCreate'
import { useSession } from '../../Session/store'
import { confirmDelete } from '../../Interface/Confirm/confirmations'
import { hoverGlance, leaveGlance } from '../../Interface/Glance/glanceLink'
import { pageMoveContext, runPageSendAction } from '../../Interface/Menus/pageMenuActions'
import { findCollectionForSet } from '../../Nexus/treeIndex'
import { isOpenInTabs } from '../../Navigation/tabsModel'
import { IconChoice } from '../../Assets/IconChoice'
import type { BandDrop } from '../Bands/BandDnd'
import {
  childIdsOf,
  flattenBands,
  reparentFsOrder,
  subGroupOrderPatch,
} from '../Bands/bandDndModel'
import { bandReorderPatch } from '../Bands/useBandOrdering'
import { subtreeIds } from '../Pipeline/group'
import { sameIds, spliceBeside, tieOrderWith } from '../creationOrder'
import type { ViewHostApi } from './useViewHost'

export interface ViewInteractionPolicy {
  ghost: {
    graceMs: number
    suppressed: () => boolean
    travelHold?: { inZone: (enteringId: string) => boolean; holdMs: number }
  }
  /** Layers the renderer keeps out of `liveView` and folds into every persist. */
  foldOverrides?: (v: SavedView) => SavedView
  /** Opens the renderer's naming surface over a page that already exists on disk. */
  rename: (target: { id: string; path: string }, fromCreate: boolean) => void
}

export type ViewDrop = { activeId: string; toZone: string; beforeId: string | null }

export type TitleMenuContext = PageMoveContext & { alreadyOpen: boolean }

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
      hoverGlance(
        { kind: 'page', id: row.id, path: row.path },
        e.currentTarget,
        'location',
        e.shiftKey,
      )
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
    liveView,
    groups,
    setTree,
    rows,
    rowById,
    rowBand,
    paintOrder,
    setPaths,
    collapsed,
    tree,
    structuralGrouping,
    subGrouped,
    groupPropId,
    groupPropType,
    canReassign,
    canReorderWithin,
    canRelocate,
    reassignBySortRun,
    structuralOrder,
    setManualOverride,
    persistView,
    commitBand,
    commitGroupValue,
    creation,
    mutate,
    select,
  } = host

  // ── Bands ─────────────────────────────────────────────────────────────────

  const bands = useMemo(() => flattenBands(groups, collapsed), [groups, collapsed])
  const onBandDrop = (draggedId: string, drop: BandDrop): void => {
    const dragged = bands.find((b) => b.id === draggedId)
    if (!dragged) return
    if (dragged.kind === 'property') {
      if (liveView.group?.kind === 'property') {
        if (drop.kind !== 'reorder') return
        const patch = bandReorderPatch({
          dragged,
          beforeId: drop.beforeId,
          view: liveView,
          structuralIds: [],
          propertyKeys: groups.filter((g) => g.kind === 'property').map((g) => g.key),
        })
        if (patch) commitBand(patch)
        return
      }
      if (!subGrouped || !liveView.sub_group || liveView.sub_group.order_mode !== 'manual') return
      const sub = subGroupOrderPatch(groups, liveView.sub_group, draggedId, drop.beforeId)
      if (sub) commitBand(sub)
      return
    }
    // The id universe is the set tree, never the rendered groups — a filter prunes emptied bands out of `groups`, and merging against that drops their stored order.
    const structural = bandReorderPatch({
      dragged,
      beforeId: drop.beforeId,
      view: liveView,
      structuralIds: setTree.flatMap(subtreeIds),
      propertyKeys: [],
    })
    if (!structural) return
    if (drop.kind === 'reorder') {
      if (structuralGrouping && liveView.structural_order_mode === 'location') {
        const parentPath = dragged.parentId === null ? source.path : setPaths.get(dragged.parentId)
        const siblingIds =
          dragged.parentId === null
            ? setTree.map((n) => n.id)
            : (childIdsOf(setTree, dragged.parentId) ?? [])
        if (!parentPath) return
        void mutate({
          op: 'reorderChildren',
          parentPath,
          key: 'set_order',
          order: nextOrder(siblingIds, draggedId, drop.beforeId),
        })
        return
      }
      commitBand(structural)
      return
    }
    const path = setPaths.get(draggedId)
    const destPath = drop.targetParentId === null ? source.path : setPaths.get(drop.targetParentId)
    const destChildIds =
      drop.targetParentId === null
        ? setTree.map((n) => n.id)
        : childIdsOf(setTree, drop.targetParentId)
    if (!path || !destPath || !destChildIds) return
    // The fs move lands before the view write: views.save and set_order are both read-modify-writes on the container sidecar, so a failed move commits nothing.
    void (async () => {
      if (
        !(await mutate({
          op: 'moveSet',
          path,
          newParentPath: destPath,
          order: reparentFsOrder(destChildIds, draggedId),
        }))
      )
        return
      commitBand(structural)
    })()
  }

  // Which Set and which bucket a nested band names — the create engine seeds from it, and a reassign moves across it.
  const subTargets = useMemo(() => {
    const m = new Map<string, { setId: string | null; bucket: string | null }>()
    for (const g of groups) {
      if (g.kind === 'structural-set') {
        for (const c of g.children ?? []) m.set(c.key, { setId: g.key, bucket: c.bucket ?? null })
      } else if (g.kind === 'ungrouped') m.set(g.key, { setId: null, bucket: null })
    }
    return m
  }, [groups])

  // ── Rows ──────────────────────────────────────────────────────────────────

  const bandRowIds = (bandKey: string, excludeId: string): string[] =>
    paintOrder.flatMap((r) => (r.groupKey === bandKey && r.id !== excludeId ? [r.id] : []))
  const isSiblingOf = (parent: string, id: string): boolean => {
    const path = rowById.get(id)?.path
    return path !== undefined && relDirname(path) === parent
  }
  const idsUnder = (dir: string): string[] =>
    rows.flatMap((r) => (relDirname(r.path) === dir ? [r.id] : []))

  const reorderWithin = (bandKey: string, activeId: string, beforeId: string | null): void => {
    const bandOrder = nextOrder(bandRowIds(bandKey, activeId), activeId, beforeId)
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
    setManualOverride(full)
    if (structuralOrder) {
      const row = rowById.get(activeId)
      if (!row) return
      const parent = relDirname(row.path)
      // The band may gather a whole subtree, so the on-disk order is built from the dragged page's true siblings alone.
      const after = bandOrder
        .slice(bandOrder.indexOf(activeId) + 1)
        .find((id) => isSiblingOf(parent, id))
      const siblings = idsUnder(parent)
      const order = spliceBeside(
        siblings.filter((id) => id !== activeId),
        after ?? null,
        activeId,
        'above',
      )
      if (!sameIds(order, siblings))
        void mutate({ op: 'movePage', path: row.path, newParentPath: parent, order })
      return
    }
    persistView({ manual_order: full }, { viewState: true })
    reassignBySortRun(full, bandKey, activeId)
  }

  const relocate = (activeId: string, toZone: string, beforeId: string | null): void => {
    const row = rowById.get(activeId)
    const destPath = toZone === UNGROUPED ? source.path : setPaths.get(toZone)
    if (!row || !destPath || destPath === relDirname(row.path)) return
    const destIds = idsUnder(destPath)
    const bandIds = bandRowIds(toZone, activeId)
    const at = beforeId === null ? bandIds.length : bandIds.indexOf(beforeId)
    const sibBefore = bandIds.slice(at).find((id) => isSiblingOf(destPath, id))
    const order = spliceBeside(destIds, sibBefore ?? null, activeId, 'above')
    const allIds = rows.map((r) => r.id)
    const spliceLive = (existing: string[] | undefined): string[] =>
      tieOrderWith(existing, allIds, activeId, beforeId, 'above')
    setManualOverride((m) => (m ? spliceLive(m) : m))
    if (liveView.manual_order)
      persistView({ manual_order: spliceLive(liveView.manual_order) }, { viewState: true })
    void mutate({ op: 'movePage', path: row.path, newParentPath: destPath, order })
  }

  const reassign = (activeId: string, toZone: string): void => {
    if (!groupPropId) return
    if (!subGrouped) {
      commitGroupValue(activeId, groupPropId, groupPropType, toZone)
      return
    }
    const path = rowById.get(activeId)?.path
    const dest = subTargets.get(toZone)
    if (!path || !dest) return
    const destPath = dest.setId === null ? source.path : setPaths.get(dest.setId)
    if (!destPath) return
    const cur = subTargets.get(rowBand.get(activeId) ?? '')
    const write =
      dest.bucket === (cur?.bucket ?? null)
        ? Promise.resolve(true)
        : commitGroupValue(activeId, groupPropId, groupPropType, dest.bucket ?? UNGROUPED)
    if (dest.setId !== (cur?.setId ?? null))
      void write?.then((ok) => ok && mutate({ op: 'movePage', path, newParentPath: destPath }))
  }

  /** One entry for every row drop: a same-band slot reorders, a cross-band one moves the page or rewrites its group value. */
  const onDrop = ({ activeId, toZone, beforeId }: ViewDrop): void => {
    const from = rowBand.get(activeId)
    if (from === undefined) return
    if (toZone === from) {
      if (canReorderWithin) reorderWithin(toZone, activeId, beforeId)
      return
    }
    if (canRelocate) relocate(activeId, toZone, beforeId)
    else if (canReassign) reassign(activeId, toZone)
  }

  /** A structural reorder may only land inside the dragged page's own sibling run: a flattened band gathers a whole subtree. Null refuses the slot. */
  const structuralSlot = (zoneId: string, index: number, activeId: string): number | null => {
    if (!structuralOrder || rowBand.get(activeId) !== zoneId) return index
    const row = rowById.get(activeId)
    if (!row) return null
    const parent = relDirname(row.path)
    let first = -1
    let count = 0
    bandRowIds(zoneId, activeId).forEach((id, i) => {
      if (!isSiblingOf(parent, id)) return
      if (first < 0) first = i
      count++
    })
    if (first < 0) return null
    return index >= first && index <= first + count ? index : null
  }

  // ── Pages ─────────────────────────────────────────────────────────────────

  const openPage = (row: ViewRow, newTab: boolean): void => {
    const target = { kind: 'page', id: row.id, path: row.path } as const
    // A plain click passes NO option, so the tab-open preference still decides; forcing `false` would override it.
    if (newTab) {
      void select(target, { newTab: true })
      return
    }
    const owner = source.kind === 'collection' ? source : findCollectionForSet(tree, source.id)
    if (owner?.openIn === 'page-preview') useSession.getState().openWindow(target)
    else void select(target)
  }

  const [iconOpen, setIconOpen] = useState(false)
  const [iconTarget, setIconTarget] = useState<{ path: string; icon?: string } | null>(null)
  const iconAnchor = useRef<HTMLElement | null>(null)
  const openIconPicker = (row: ViewRow, anchor: HTMLElement): void => {
    iconAnchor.current = anchor
    setIconTarget({ path: row.path, icon: typeof row.icon === 'string' ? row.icon : undefined })
    setIconOpen(true)
  }
  const iconPicker = (
    <IconChoice
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
      alreadyOpen: isOpenInTabs(tabs, pinned, { kind: 'page', id: row.id, path: row.path }),
      ...pageMoveContext(tree, row.path),
    }
  }
  /** The page half of any title menu; `anchor` seats the icon picker. Returns false for an action the caller owns. */
  const runTitleAction = (action: string, row: ViewRow, anchor: HTMLElement): boolean => {
    if (runPageSendAction(action, row)) return true
    switch (action) {
      case 'title:window':
        useSession.getState().openWindow({ id: row.id, path: row.path })
        return true
      case 'title:newtab':
        openPage(row, true)
        return true
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
      case 'title:delete':
        void confirmDelete({ path: row.path, kind: 'page', title: row.title })
        return true
      default:
        return false
    }
  }

  // ── Ghost ─────────────────────────────────────────────────────────────────

  const ghost = useGhostAnchor({
    dwellMs: GHOST_DWELL_MS,
    graceMs: policy.ghost.graceMs,
    suppressed: () => iconOpen || policy.ghost.suppressed(),
    travelHold: policy.ghost.travelHold,
  })
  useClearStrandedGhost(ghost, rowById)
  /** Claims the ghost's anchor and creates below it; undefined when no ghost stands. */
  const ghostCreate = (): Promise<boolean> | undefined => {
    const anchorId = ghost.take()
    const anchor = anchorId ? rowById.get(anchorId) : undefined
    return anchor && creation.createAfter(anchor)
  }

  // ── What the create engine reads at fire time ─────────────────────────────

  host.seam.foldOverrides.current = policy.foldOverrides ?? ((v) => v)
  host.seam.bandBucket.current = (key) => (subGrouped ? (subTargets.get(key)?.bucket ?? null) : key)
  host.seam.onCreated.current = (created) => policy.rename(created, true)

  return {
    bands,
    onBandDrop,
    onDrop,
    structuralSlot,
    openPage,
    titleMenuContext,
    runTitleAction,
    iconPicker,
    ghost,
    ghostCreate,
    holdGhost: ghost.suppressWrap,
  }
}
