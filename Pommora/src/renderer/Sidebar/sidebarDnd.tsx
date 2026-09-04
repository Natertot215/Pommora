import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { DISCLOSURE_INDENT } from '@renderer/DesignSystem/Tokens/size.css'
import { nearestByTop, useInsertionDrag } from '@renderer/Interactions/insertionDrag'
import { titleFromPath } from '@shared/connections'
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

const LINE_INSET_RIGHT = 12
const BASE_INDENT = 8 // MenuItem's base left padding
const STEP_INDENT = DISCLOSURE_INDENT // MenuItem's per-depth inset — the shared disclosure step

type Slot = {
  depth: number
  lineY: number // relative to the content wrapper
  commit: MutateRequest // handed straight to store.mutate
}

type Snapshot = { contentTop: number; measured: MeasuredRow[]; siblings: MeasuredRow[] }

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
  const rows = useRef(new Map<string, HTMLElement>())
  const contentRef = useRef<HTMLDivElement | null>(null)

  const labelOf = (rowId: string): string => titleFromPath(index.byId.get(rowId)?.path ?? '')

  const computeTarget = (id: string, clientY: number, s: Snapshot): Slot | null => {
    const draggedEntry = index.byId.get(id)
    if (!draggedEntry) return null
    const { contentTop, measured } = s
    if (measured.length === 0) return null
    // A slot that reproduces where the row already sits is declined — the line promises a move.
    const unless = (noop: boolean, slot: Slot): Slot | null => (noop ? null : slot)

    if (draggedEntry.kind === 'page') {
      const over = nearestByTop(measured, clientY)
      const entry = index.byId.get(over.id)
      if (!entry) return null
      if (entry.kind === 'page') {
        const container = entry.parentId ? index.byId.get(entry.parentId) : null
        if (!container || !entry.parentId || !entry.parentPath) return null
        const { beforeId, edge } = slotInGroup(container.pageIds, over, clientY, id)
        const order = nextOrder(container.pageIds, id, beforeId)
        return unless(
          entry.parentId === draggedEntry.parentId && sameOrder(order, container.pageIds),
          {
            depth: entry.depth,
            lineY: edge - contentTop,
            commit: {
              op: 'movePage',
              path: draggedEntry.path,
              newParentPath: entry.parentPath,
              order,
            },
          },
        )
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
        const container = index.byId.get(draggedEntry.parentId)
        const below = (container?.kind === 'set' ? subSetPlacement : setPlacement) === 'bottom'
        const pageIds = container?.pageIds ?? []
        // Sets below the pages → the page joins at the end; sets above → at the start.
        const before = below ? null : (pageIds.find((x) => x !== id) ?? null)
        const order = nextOrder(pageIds, id, before)
        return unless(sameOrder(order, pageIds), {
          depth: draggedEntry.depth,
          lineY: (below ? over.top : over.bottom) - contentTop,
          commit: {
            op: 'movePage',
            path: draggedEntry.path,
            newParentPath: draggedEntry.parentPath,
            order,
          },
        })
      }
      const beforeId = entry.pageIds.find((x) => x !== id) ?? null
      const order = nextOrder(entry.pageIds, id, beforeId)
      // Derived from the slot the drop resolves to, never the row under the pointer — with folders
      // first, a container's first page sits below its entire Sets block.
      const firstRow = beforeId ? measured.find((m) => m.id === beforeId) : undefined
      return unless(over.id === draggedEntry.parentId && sameOrder(order, entry.pageIds), {
        depth: entry.depth + 1,
        lineY: (firstRow ? firstRow.top : over.bottom) - contentTop,
        commit: { op: 'movePage', path: draggedEntry.path, newParentPath: entry.path, order },
      })
    }

    // A Set may never land on a context or the top level; dropping into its own subtree is
    // blocked as a cycle.
    if (draggedEntry.kind === 'set') {
      const over = nearestByTop(measured, clientY)
      const overEntry = index.byId.get(over.id)
      if (!overEntry) return null
      const target = setContainerOf(overEntry, index)
      if (!target) return null
      if (isSelfOrDescendant(target.id, id, index)) return null // no cycles
      const group = target.containerIds // the target container's child Sets, in order
      let beforeId: string | null
      let lineY: number
      if (overEntry.kind === 'set') {
        const slot = slotInGroup(group, over, clientY, id)
        beforeId = slot.beforeId
        lineY = slot.edge - contentTop
      } else {
        // Derived from real geometry: an existing block's first-row top (correct either way), else
        // — an empty block — just under the header (top) or after the container's last page (bottom).
        beforeId = group.find((x) => x !== id) ?? null
        const headerRect = measured.find((m) => m.id === target.id)
        const headEdge = headerRect ? headerRect.bottom : over.bottom
        if (beforeId) {
          const firstRow = measured.find((m) => m.id === beforeId)
          lineY = (firstRow ? firstRow.top : headEdge) - contentTop
        } else {
          const placement = target.kind === 'collection' ? setPlacement : subSetPlacement
          const pageBottoms = target.pageIds
            .map((x) => measured.find((m) => m.id === x)?.bottom)
            .filter((b): b is number => b != null)
          const edge =
            placement === 'bottom' && pageBottoms.length ? Math.max(...pageBottoms) : headEdge
          lineY = edge - contentTop
        }
      }
      const order = nextOrder(group, id, beforeId)
      return unless(target.id === draggedEntry.parentId && sameOrder(order, group), {
        depth: target.depth + 1,
        lineY,
        commit: { op: 'moveSet', path: draggedEntry.path, newParentPath: target.path, order },
      })
    }

    const { siblings } = s
    if (siblings.length === 0) return null
    const over = nearestByTop(siblings, clientY)
    const overEntry = index.byId.get(over.id)
    if (!overEntry) return null
    const group = siblingGroup(draggedEntry, index)
    const { beforeId, edge } = slotInGroup(group, over, clientY, id)
    const order = nextOrder(group, id, beforeId)
    const commit = reorderCommit(draggedEntry, order)
    if (!commit) return null
    return unless(sameOrder(order, group), {
      depth: overEntry.depth,
      lineY: edge - contentTop,
      commit,
    })
  }

  const drag = useInsertionDrag<Slot, Snapshot>({
    // Measured once at drag activation, not per pointermove: no row displaces mid-drag, so frozen
    // rects stay valid until a scroll or tree swap invalidates.
    take: (excludeId) => {
      const content = contentRef.current
      if (!content) return null
      const contentTop = content.getBoundingClientRect().top
      const measured: MeasuredRow[] = []
      for (const [rowId, el] of rows.current) {
        if (rowId === excludeId) continue
        const r = el.getBoundingClientRect()
        measured.push({ id: rowId, top: r.top, bottom: r.bottom, mid: r.top + r.height / 2 })
      }
      measured.sort((a, b) => a.top - b.top)
      const entry = index.byId.get(excludeId)
      const siblings =
        entry && entry.kind !== 'page' && entry.kind !== 'set'
          ? measured.filter((m) => {
              const e = index.byId.get(m.id)
              return e !== undefined && e.kind === entry.kind && e.parentId === entry.parentId
            })
          : []
      return { contentTop, measured, siblings }
    },
    resolve: (id, point, s) => computeTarget(id, point.y, s),
    commit: (_id, slot) => onCommit(slot.commit),
    lineFor: (slot) => ({
      top: slot.lineY,
      left: BASE_INDENT + slot.depth * STEP_INDENT,
      right: LINE_INSET_RIGHT,
    }),
    label: labelOf,
    ghost: 'grab',
    rowEl: (id) => rows.current.get(id),
    scrollTarget: () => contentRef.current,
    disclose: true,
    watch: index,
  })

  const registerRow = (id: string, el: HTMLElement | null): void => {
    if (el) rows.current.set(id, el)
    else rows.current.delete(id)
  }

  const value = useMemo<Value>(
    () => ({ draggingId: drag.dragging, registerRow, begin: drag.begin }),
    [drag.dragging, drag.begin],
  )

  return (
    <Ctx.Provider value={value}>
      <div ref={contentRef} className="drop-line-host">
        {children}
        {drag.line}
      </div>
      {drag.ghost}
    </Ctx.Provider>
  )
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
function reorderCommit(draggedEntry: Entry, order: string[]): MutateRequest | null {
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
