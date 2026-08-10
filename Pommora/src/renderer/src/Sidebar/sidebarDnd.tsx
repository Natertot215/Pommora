import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { DISCLOSURE_INDENT } from '@renderer/design-system/tokens/size.css'
import { usePointerGesture } from '@renderer/design-system/interactions/gesture'
import { useDragSnapshot } from '@renderer/design-system/interactions/snapshot'
import { EDITABLE_TARGETS } from '@renderer/design-system/interactions/shared'
import { DragGhost } from '../Components/Detail/DragGhost'
import { announce } from '@renderer/design-system/interactions/a11y'
import { findScroller, startAutoScroll } from '@renderer/design-system/interactions/autoscroll'
import type { FolderPlacement } from '@shared/types'
import type { MutateRequest } from '@shared/mutate'
import {
  nextOrder,
  setContainerOf,
  isSelfOrDescendant,
  slotInGroup,
  type Entry,
  type Index,
  type MeasuredRow,
} from './sidebarDndModel'

// An Apple-style insertion line marks the drop; no row displacement.

const LINE_INSET_RIGHT = 12
const BASE_INDENT = 8 // MenuItem's base left padding
const STEP_INDENT = DISCLOSURE_INDENT // MenuItem's per-depth inset — the shared disclosure step

type DropTarget = {
  depth: number // indent depth of the landing slot (the line)
  lineY: number // relative to the content wrapper
  commit: MutateRequest // the write this drop resolves to — handed straight to store.mutate
  noop: boolean // the drop wouldn't change anything → skip the write
}

type DragState = { id: string | null; ghostX: number; ghostY: number; target: DropTarget | null }
const IDLE: DragState = { id: null, ghostX: 0, ghostY: 0, target: null }

type Value = {
  draggingId: string | null
  registerRow: (id: string, el: HTMLElement | null) => void
  begin: (id: string, e: ReactPointerEvent) => void
}
const Ctx = createContext<Value | null>(null)

export function SidebarDnd({
  index,
  onCommit,
  setPlacement = 'top',
  subSetPlacement = 'top',
  children,
}: {
  /** The tree-keyed drag index — built once by the host, shared across every mounted layer. */
  index: Index
  onCommit: (commit: MutateRequest) => void
  setPlacement?: FolderPlacement
  subSetPlacement?: FolderPlacement
  children: ReactNode
}): React.JSX.Element {
  const indexRef = useRef(index)
  indexRef.current = index
  // Ref'd so the frozen-snapshot resolver reads current placement, not a captured prop.
  const placements = useRef({ set: setPlacement, subSet: subSetPlacement })
  placements.current = { set: setPlacement, subSet: subSetPlacement }
  const onCommitRef = useRef(onCommit)
  onCommitRef.current = onCommit

  const rows = useRef(new Map<string, HTMLElement>())
  const contentRef = useRef<HTMLDivElement | null>(null)
  const live = useRef<DropTarget | null>(null)
  const [drag, setDrag] = useState<DragState>(IDLE)
  const beginGesture = usePointerGesture()

  // Set at activation (a tap never sets it) — the id the hit-test and commit run against, and the
  // grab offset the ghost anchors to.
  const dragged = useRef<{ id: string; grabX: number } | null>(null)

  // Measured ONCE at drag activation, not per pointermove — no row displaces mid-drag, so frozen
  // rects stay valid until a scroll or tree swap invalidates. Never O(rows) rect reads on a
  // high-frequency trigger. The dragged row's sibling group is snapshot state too — invariant
  // mid-drag, so it's filtered here once rather than per move.
  type Snapshot = { contentTop: number; measured: MeasuredRow[]; siblings: MeasuredRow[] }
  const lastPoint = useRef({ x: 0, y: 0 })
  const stopScroll = useRef<(() => void) | null>(null)
  const snap = useDragSnapshot(() => {
    const d = dragged.current
    return d ? takeSnapshot(d.id) : null
  })

  const takeSnapshot = (excludeId: string): Snapshot | null => {
    const content = contentRef.current
    if (!content) return null
    const contentTop = content.getBoundingClientRect().top
    const measured: MeasuredRow[] = []
    for (const [id, el] of rows.current) {
      if (id === excludeId) continue
      const r = el.getBoundingClientRect()
      measured.push({ id, top: r.top, bottom: r.bottom, mid: r.top + r.height / 2 })
    }
    measured.sort((a, b) => a.top - b.top)
    const idx = indexRef.current
    const entry = idx.byId.get(excludeId)
    const siblings =
      entry && entry.kind !== 'page' && entry.kind !== 'set'
        ? measured.filter((m) => {
            const e = idx.byId.get(m.id)
            return e !== undefined && e.kind === entry.kind && e.parentId === entry.parentId
          })
        : []
    return { contentTop, measured, siblings }
  }

  const registerRow = (id: string, el: HTMLElement | null): void => {
    if (el) rows.current.set(id, el)
    else rows.current.delete(id)
  }

  const computeTarget = (clientY: number): DropTarget | null => {
    const d = dragged.current
    if (!d) return null
    const idx = indexRef.current
    const draggedEntry = idx.byId.get(d.id)
    if (!draggedEntry) return null
    const s = snap.get()
    if (!s) return null
    const { contentTop, measured } = s
    if (measured.length === 0) return null
    const nearest = (rowsByTop: MeasuredRow[]): MeasuredRow => {
      let over = rowsByTop[0]
      for (const m of rowsByTop) {
        if (clientY >= m.top) over = m
        else break
      }
      return over
    }

    if (draggedEntry.kind === 'page') {
      const over = nearest(measured)
      const entry = idx.byId.get(over.id)
      if (!entry) return null
      if (entry.kind === 'page') {
        const container = entry.parentId ? idx.byId.get(entry.parentId) : null
        if (!container || !entry.parentId || !entry.parentPath) return null
        const { beforeId, edge } = slotInGroup(container.pageIds, over, clientY, d.id)
        const order = nextOrder(container.pageIds, d.id, beforeId)
        return {
          depth: entry.depth,
          lineY: edge - contentTop,
          commit: { op: 'movePage', path: draggedEntry.path, newParentPath: entry.parentPath, order },
          noop: entry.parentId === draggedEntry.parentId && sameOrder(order, container.pageIds),
        }
      }
      // A Set that's a sibling of the dragged page is the page↔Set boundary, not a reparent target —
      // grazing it reorders the page to its group's edge, never drops it into the Set (that happens
      // via the Set's expanded pages instead).
      if (
        entry.kind === 'set' &&
        draggedEntry.parentId &&
        draggedEntry.parentId === entry.parentId &&
        draggedEntry.parentPath
      ) {
        const container = idx.byId.get(draggedEntry.parentId)
        const below =
          (container?.kind === 'set' ? placements.current.subSet : placements.current.set) ===
          'bottom'
        const pageIds = container?.pageIds ?? []
        // Sets below the pages → the page joins at the end; sets above → at the start.
        const before = below ? null : (pageIds.find((id) => id !== d.id) ?? null)
        const order = nextOrder(pageIds, d.id, before)
        return {
          depth: draggedEntry.depth,
          lineY: (below ? over.top : over.bottom) - contentTop,
          commit: { op: 'movePage', path: draggedEntry.path, newParentPath: draggedEntry.parentPath, order },
          noop: sameOrder(order, pageIds),
        }
      }
      const beforeId = entry.pageIds.find((id) => id !== d.id) ?? null
      const order = nextOrder(entry.pageIds, d.id, beforeId)
      // Derived from the slot the drop resolves to, never from the row under the pointer — with
      // folders first, a container's first page sits below its entire Sets block. Same rule the
      // Set branch below already follows.
      const firstRow = beforeId ? measured.find((m) => m.id === beforeId) : undefined
      return {
        depth: entry.depth + 1,
        lineY: (firstRow ? firstRow.top : over.bottom) - contentTop,
        commit: { op: 'movePage', path: draggedEntry.path, newParentPath: entry.path, order },
        noop: over.id === draggedEntry.parentId && sameOrder(order, entry.pageIds),
      }
    }

    // A Set may never land on a context or the top level; dropping into its own subtree is
    // blocked as a cycle.
    if (draggedEntry.kind === 'set') {
      const over = nearest(measured)
      const overEntry = idx.byId.get(over.id)
      if (!overEntry) return null
      const target = setContainerOf(overEntry, idx)
      if (!target) return null
      if (isSelfOrDescendant(target.id, d.id, idx)) return null // no cycles
      const group = target.containerIds // the target container's child Sets, in order
      let beforeId: string | null
      let lineY: number
      if (overEntry.kind === 'set') {
        const slot = slotInGroup(group, over, clientY, d.id)
        beforeId = slot.beforeId
        lineY = slot.edge - contentTop
      } else {
        // Derived from real geometry: an existing block's first-row top (correct either way), else
        // — an empty block — just under the header (top) or after the container's last page (bottom).
        beforeId = group.find((id) => id !== d.id) ?? null
        const headerRect = measured.find((m) => m.id === target.id)
        const headEdge = headerRect ? headerRect.bottom : over.bottom
        if (beforeId) {
          const firstRow = measured.find((m) => m.id === beforeId)
          lineY = (firstRow ? firstRow.top : headEdge) - contentTop
        } else {
          const placement =
            target.kind === 'collection' ? placements.current.set : placements.current.subSet
          const pageBottoms = target.pageIds
            .map((id) => measured.find((m) => m.id === id)?.bottom)
            .filter((b): b is number => b != null)
          const edge =
            placement === 'bottom' && pageBottoms.length ? Math.max(...pageBottoms) : headEdge
          lineY = edge - contentTop
        }
      }
      const order = nextOrder(group, d.id, beforeId)
      return {
        depth: target.depth + 1,
        lineY,
        commit: { op: 'moveSet', path: draggedEntry.path, newParentPath: target.path, order },
        noop: target.id === draggedEntry.parentId && sameOrder(order, group),
      }
    }

    const { siblings } = s
    if (siblings.length === 0) return null
    const over = nearest(siblings)
    const overEntry = idx.byId.get(over.id)
    if (!overEntry) return null
    const group = siblingGroup(draggedEntry, idx)
    const { beforeId, edge } = slotInGroup(group, over, clientY, d.id)
    const order = nextOrder(group, d.id, beforeId)
    const commit = reorderCommit(draggedEntry, idx, order)
    if (!commit) return null
    return {
      depth: overEntry.depth,
      lineY: edge - contentTop,
      commit,
      noop: sameOrder(order, group),
    }
  }

  const reset = (): void => {
    dragged.current = null
    live.current = null
    snap.reset()
    setDrag(IDLE)
  }

  // Shared by pointer move, the auto-scroll re-resolve, and every invalidation, so a held-still
  // drag keeps re-targeting as the rows move under it.
  function resolveSlot(): void {
    const d = dragged.current
    if (!d) return
    const target = computeTarget(lastPoint.current.y)
    live.current = target
    setDrag({
      id: d.id,
      ghostX: lastPoint.current.x - d.grabX,
      ghostY: lastPoint.current.y,
      target,
    })
  }

  // A mid-drag tree swap (watcher push) can re-render rows — stale rects must not survive it,
  // and a release with no further move must still commit against the fresh slot.
  useEffect(() => {
    snap.markDirty()
    resolveSlot()
  }, [index])

  const labelOf = (rowId: string): string => base(indexRef.current.byId.get(rowId)?.path ?? '')

  const begin = (id: string, e: ReactPointerEvent): void => {
    // The cheap refusals come before the layout read — a right-press or a busy gesture costs no rect.
    if (e.button !== 0 || !e.isPrimary) return
    if ((e.target as HTMLElement).closest?.(EDITABLE_TARGETS)) return
    const el = rows.current.get(id)
    if (!el) return
    const grabX = e.clientX - el.getBoundingClientRect().left
    beginGesture({
      el,
      event: e,
      onActivate: (ev) => {
        dragged.current = { id, grabX }
        lastPoint.current = { x: ev.clientX, y: ev.clientY }
        // onScrolled re-resolves a held-still drag as the auto-scroll moves the rows.
        const sc = findScroller(el, 'y')
        if (sc) {
          stopScroll.current = startAutoScroll({
            getPoint: () => lastPoint.current,
            scroller: sc,
            dragEl: el,
            axis: 'y',
            onScrolled: resolveSlot,
          })
        }
        announce(`Picked up ${labelOf(id)}.`)
        return true
      },
      onDragMove: (ev) => {
        lastPoint.current = { x: ev.clientX, y: ev.clientY }
        resolveSlot()
      },
      scrollTarget: () => contentRef.current,
      onWindowScroll: () => {
        snap.markDirty()
        resolveSlot()
      },
      onDrop: () => {
        if (snap.isDirty()) resolveSlot()
        const t = live.current
        if (t && !t.noop) {
          onCommitRef.current(t.commit)
          announce(`Moved ${labelOf(id)}.`)
        }
        reset()
      },
      onAbort: reset,
      teardown: () => {
        stopScroll.current?.()
        stopScroll.current = null
      },
    })
  }

  const value = useMemo<Value>(() => ({ draggingId: drag.id, registerRow, begin }), [drag.id])

  const draggedLabel = drag.id ? base(index.byId.get(drag.id)?.path ?? '') : ''

  return (
    <Ctx.Provider value={value}>
      <div ref={contentRef} style={{ position: 'relative' }}>
        {children}
        {/* A noop target draws nothing: the line promises a move, and the drop commits only when the
            slot differs from where the row already sits. */}
        {drag.target && !drag.target.noop && (
          <div
            className="table-drop-line"
            aria-hidden
            style={{
              top: drag.target.lineY,
              left: BASE_INDENT + drag.target.depth * STEP_INDENT,
              right: LINE_INSET_RIGHT,
            }}
          >
            <span className="table-drop-dot" />
          </div>
        )}
      </div>
      <DragGhost
        x={drag.id ? drag.ghostX : null}
        y={drag.id ? drag.ghostY : null}
        label={draggedLabel}
      />
    </Ctx.Provider>
  )
}

const base = (p: string): string => {
  const n = p.slice(p.lastIndexOf('/') + 1)
  return n.endsWith('.md') ? n.slice(0, -3) : n
}
const sameOrder = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((x, i) => x === b[i])

// All top-level groups held in `.nexus/state.json`. Sets have their own reparent-aware branch in
// computeTarget and never reach here.
function siblingGroup(draggedEntry: Entry, idx: Index): string[] {
  switch (draggedEntry.kind) {
    case 'collection':
      return idx.collectionIds
    case 'space':
      return draggedEntry.parentId ? (idx.spaceIdsByContext.get(draggedEntry.parentId) ?? []) : []
    case 'contextGroup':
      return idx.contextGroupIds
    default:
      return []
  }
}

// Sets reorder/move via the moveSet branch in computeTarget, not here.
function reorderCommit(draggedEntry: Entry, _idx: Index, order: string[]): MutateRequest | null {
  switch (draggedEntry.kind) {
    case 'collection':
      return { op: 'reorderTop', key: 'collection_order', order }
    case 'space':
      // A Space reorders within its Context group — `space_orders[contextId]` in state.json.
      return draggedEntry.parentId
        ? { op: 'reorderSpaces', contextId: draggedEntry.parentId, ids: order }
        : null
    case 'contextGroup':
      // Registry array position IS the display order.
      return { op: 'reorderContexts', ids: order }
    default:
      return null
  }
}

/** Spread `handle`, put `ref` on the row element — the engine decides what the drop means from
 *  the row's kind. */
export function useSidebarDrag(id: string): {
  ref: (el: HTMLElement | null) => void
  handle: { onPointerDown: (e: ReactPointerEvent) => void }
  isDragging: boolean
} {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSidebarDrag must be used inside <SidebarDnd>')
  return {
    ref: (el) => ctx.registerRow(id, el),
    handle: { onPointerDown: (e) => ctx.begin(id, e) },
    isDragging: ctx.draggingId === id,
  }
}
