import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { nearestByTop, useInsertionDrag } from './insertionDrag'
import { type MeasuredRow, nextOrder, slotInGroup } from './reorderModel'
import { DROP_LINE_INSET } from './shared'

type Slot = { lineY: number; left: number; width: number; group: string; beforeId: string | null }
type TableRow = MeasuredRow & { left: number; contentRight: number; group: string }
type Snapshot = { rows: TableRow[]; boxTop: number; boxLeft: number }

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
  crossZone,
  onDrop,
  children,
}: {
  rows: { id: string; groupKey: string }[]
  disabled: boolean
  canReorderWithin: boolean
  /** Whether a drop onto another group is offered at all — the caller decides whether it relocates the page or rewrites its group value. */
  crossZone: boolean
  /** `beforeId` is null at the target group's end. The caller routes a same-group drop to a reorder and a cross-group one to a relocate or a reassign. */
  onDrop: (activeId: string, toGroup: string, beforeId: string | null) => void
  children: ReactNode
}): React.JSX.Element {
  const els = useRef(new Map<string, HTMLElement>())
  const content = useRef<HTMLDivElement | null>(null)

  const drag = useInsertionDrag<Slot, Snapshot>({
    take: (excludeId) => {
      const box = content.current
      if (!box) return null
      const boxRect = box.getBoundingClientRect()
      const measured: TableRow[] = []
      for (const r of rows) {
        if (r.id === excludeId) continue
        const el = els.current.get(r.id)
        if (!el) continue
        const rect = el.getBoundingClientRect()
        // The row spans a trailing 1fr filler, so rect.right would run the line into the empty gutter past the last column.
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
    resolve: (id, point, s) => {
      const activeGroup = rows.find((r) => r.id === id)?.groupKey
      if (activeGroup === undefined || s.rows.length === 0) return null
      const near = nearestByTop(s.rows, point.y)
      const group = near.group
      const crossing = group !== activeGroup
      if (crossing ? !crossZone : !canReorderWithin) return null
      const groupOrder = rows.flatMap((r) => (r.groupKey === group ? [r.id] : []))
      const { beforeId } = slotInGroup(groupOrder, near, point.y, id)
      // A slot reproducing the standing order is a noop — no line, no commit.
      if (!crossing && nextOrder(groupOrder, id, beforeId).every((x, i) => x === groupOrder[i]))
        return null
      const above = point.y < near.mid
      return {
        lineY: (above ? near.top : near.bottom) - s.boxTop,
        left: near.left - s.boxLeft + DROP_LINE_INSET,
        width: near.contentRight - near.left - DROP_LINE_INSET * 2,
        group,
        beforeId,
      }
    },
    commit: (id, slot) => onDrop(id, slot.group, slot.beforeId),
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

/** `ref` on the row, `handle` spread on the grip. `isDragging` mutes the row in place. */
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
