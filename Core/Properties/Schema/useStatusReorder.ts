import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { useInsertionDrag } from '@pommora/uix/Interactions/insertionDrag'
import {
  type GroupedSlot,
  type MeasuredGroup,
  type MeasuredRow,
  resolveGroupedSlot,
} from '@pommora/uix/Interactions/reorderModel'

/** `order` must be identity-stable across the hook's own per-move re-renders — it is the geometry snapshot's alignment. */
export function useStatusReorder(
  order: { id: string; values: string[] }[],
  labelFor: (value: string) => string,
  onMove: (value: string, toGroupId: string, toIndex: number) => void,
): {
  containerRef: (el: HTMLDivElement | null) => void
  registerGroup: (groupId: string, el: HTMLElement | null) => void
  registerRow: (value: string, el: HTMLElement | null) => void
  onRowPointerDown: (value: string, e: ReactPointerEvent) => void
  dragging: string | null
  drop: { groupId: string; top: number } | null
  ghost: ReactNode
} {
  const container = useRef<HTMLElement | null>(null)
  const groupEls = useRef(new Map<string, HTMLElement>())
  const rows = useRef(new Map<string, HTMLElement>())

  const drag = useInsertionDrag<GroupedSlot, MeasuredGroup[]>({
    take: () =>
      order.map((grp) => {
        const cRect = groupEls.current.get(grp.id)?.getBoundingClientRect()
        const rowRects: MeasuredRow[] = []
        for (const value of grp.values) {
          const r = rows.current.get(value)?.getBoundingClientRect()
          if (r)
            rowRects.push({ id: value, top: r.top, bottom: r.bottom, mid: r.top + r.height / 2 })
        }
        return { id: grp.id, top: cRect?.top ?? 0, bottom: cRect?.bottom ?? 0, rows: rowRects }
      }),
    resolve: (value, point, groups) => resolveGroupedSlot(value, point.y, groups),
    commit: (value, slot) => onMove(value, slot.groupId, slot.to),
    label: labelFor,
    rowEl: (value) => rows.current.get(value),
    scrollTarget: () => container.current,
    // The groups live in a height-capped menu frame — the edge loop reaches past its fold.
    armFrom: () => container.current,
    alsoBlock: 'button',
    watch: order,
  })

  return {
    containerRef: (el) => {
      container.current = el
    },
    registerGroup: (groupId, el) => {
      if (el) groupEls.current.set(groupId, el)
      else groupEls.current.delete(groupId)
    },
    registerRow: (value, el) => {
      if (el) rows.current.set(value, el)
      else rows.current.delete(value)
    },
    onRowPointerDown: drag.begin,
    dragging: drag.dragging,
    drop: drag.slot ? { groupId: drag.slot.groupId, top: drag.slot.top } : null,
    ghost: drag.ghost,
  }
}
