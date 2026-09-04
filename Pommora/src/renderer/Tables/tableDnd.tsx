import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { nearestByTop, useInsertionDrag } from '@renderer/Interactions/insertionDrag'
import { DROP_LINE_INSET } from '@renderer/Interactions/shared'

// Table row drag — the sidebar drop-line gesture: an insertion line marks the slot, the picked-up
// row mutes in place, no row displaces. A slot in the dragged row's own group reorders it; a slot
// in another group reassigns the grouped property. Commits live in TableView and are passed in —
// this file owns only the hit-testing.

type Slot = { lineY: number; left: number; width: number; commit: () => void }
type MeasuredRow = {
  id: string
  top: number
  bottom: number
  mid: number
  left: number
  contentRight: number
  group: string
}
type Snapshot = { rows: MeasuredRow[]; boxTop: number; boxLeft: number }

type Value = {
  draggingId: string | null
  registerRow: (id: string, el: HTMLElement | null) => void
  begin: (id: string, e: ReactPointerEvent) => void
}
const Ctx = createContext<Value | null>(null)

export function TableRowDnd({
  rows,
  disabled,
  canReorderWithin,
  canReassign,
  canRelocate = false,
  reorderTo,
  reassign,
  relocate = () => {},
  children,
}: {
  /** The flat visible data-row order + each row's group key. */
  rows: { id: string; groupKey: string }[]
  disabled: boolean
  canReorderWithin: boolean
  canReassign: boolean
  /** True under plain location grouping: the bands ARE folders, so a cross-band drop MOVES the page. */
  canRelocate?: boolean
  /** Commit a within-group reorder: the new flat order of row ids + the reordered group's key (so the
   *  caller can map a structural group to its on-disk container for the page_order write) + the dragged
   *  row's id (for callers whose commit is (active, over)-shaped). */
  reorderTo: (orderIds: string[], groupKey: string, activeId: string) => void
  reassign: (activeId: string, targetGroupKey: string) => void
  relocate?: (activeId: string, targetGroupKey: string) => void
  children: ReactNode
}): React.JSX.Element {
  const els = useRef(new Map<string, HTMLElement>())
  const content = useRef<HTMLDivElement | null>(null)

  const drag = useInsertionDrag<Slot, Snapshot>({
    // The dragged row is left out — it's never a drop target.
    take: (excludeId) => {
      const box = content.current
      if (!box) return null
      const boxRect = box.getBoundingClientRect()
      const measured: MeasuredRow[] = []
      for (const r of rows) {
        if (r.id === excludeId) continue
        const el = els.current.get(r.id)
        if (!el) continue
        const rect = el.getBoundingClientRect()
        // End the line at the content edge (where the columns stop), not the full row — the row spans the
        // trailing 1fr filler too, so rect.right would run the line into the empty gutter past the last column.
        const filler = el.querySelector('.cell-filler')
        const contentRight = filler ? filler.getBoundingClientRect().left : rect.right
        measured.push({
          id: r.id,
          top: rect.top,
          bottom: rect.bottom,
          mid: rect.top + rect.height / 2,
          left: rect.left,
          contentRight,
          group: r.groupKey,
        })
      }
      measured.sort((a, b) => a.top - b.top)
      return { rows: measured, boxTop: boxRect.top, boxLeft: boxRect.left }
    },
    // The nearest row + which half the cursor is in fixes the slot; that row's group is the target
    // group (drop above row R or below it, the slot sits in R's group either way).
    resolve: (id, point, s) => {
      const activeGroup = rows.find((r) => r.id === id)?.groupKey
      if (activeGroup === undefined || s.rows.length === 0) return null
      const near = nearestByTop(s.rows, point.y)
      const above = point.y < near.mid
      const targetGroup = near.group
      const lineY = (above ? near.top : near.bottom) - s.boxTop
      const left = near.left - s.boxLeft + DROP_LINE_INSET
      const width = near.contentRight - near.left - DROP_LINE_INSET * 2

      if (targetGroup === activeGroup) {
        if (!canReorderWithin) return null
        const order = rows.map((x) => x.id)
        const beforeId = above ? near.id : (order[order.indexOf(near.id) + 1] ?? null)
        const without = order.filter((x) => x !== id)
        const idx = beforeId ? without.indexOf(beforeId) : without.length
        const next = [...without.slice(0, idx), id, ...without.slice(idx)]
        // A slot that reproduces the standing order is a noop — no line, no commit.
        if (next.length === order.length && next.every((x, i) => x === order[i])) return null
        return { lineY, left, width, commit: () => reorderTo(next, activeGroup, id) }
      }
      // A drop in a DIFFERENT band: under location grouping the bands are folders (move the page);
      // under a reassignable property grouping it rewrites the grouped value; otherwise it's inert.
      if (canRelocate) return { lineY, left, width, commit: () => relocate(id, targetGroup) }
      if (!canReassign) return null
      return { lineY, left, width, commit: () => reassign(id, targetGroup) }
    },
    commit: (_id, slot) => slot.commit(),
    lineFor: (slot) => ({ top: slot.lineY, left: slot.left, width: slot.width, right: 'auto' }),
    label: () => 'row',
    ghost: 'none',
    rowEl: (id) => els.current.get(id),
    scrollTarget: () => content.current,
    disabled: () => disabled,
    disclose: true,
    watch: rows,
  })

  const registerRow = (id: string, el: HTMLElement | null): void => {
    if (el) els.current.set(id, el)
    else els.current.delete(id)
  }

  const value = useMemo<Value>(
    () => ({ draggingId: drag.dragging, registerRow, begin: drag.begin }),
    [drag.dragging, drag.begin],
  )

  return (
    <Ctx.Provider value={value}>
      <div ref={content} className="drop-line-host">
        {children}
        {drag.line}
      </div>
    </Ctx.Provider>
  )
}

/** Make a data row draggable + registered for hit-testing: put `ref` on the row, spread `handle` on the
 *  grip. `isDragging` mutes the row in place. */
export function useTableRowDrag(id: string): {
  ref: (el: HTMLElement | null) => void
  handle: { onPointerDown: (e: ReactPointerEvent) => void }
  isDragging: boolean
} {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTableRowDrag must be used inside <TableRowDnd>')
  return {
    ref: (el) => ctx.registerRow(id, el),
    handle: { onPointerDown: (e) => ctx.begin(id, e) },
    isDragging: ctx.draggingId === id,
  }
}
