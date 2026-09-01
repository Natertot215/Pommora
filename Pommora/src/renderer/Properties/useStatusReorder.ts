import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { useInsertionDrag } from '@renderer/DesignSystem/Interactions/insertionDrag'

// The one reorder implementation under both option editors — `useOptionReorder` adapts it to a flat
// list. A drag can reorder within a group OR cross into another group (including an empty one); on
// drop it calls onMove(value, toGroupId, toIndex) — toIndex in the target group's
// without-the-dragged space, matching optionModel.moveStatusOption.

type SnapRow = { value: string; top: number; bottom: number }
type SnapGroup = { id: string; top: number; bottom: number; rows: SnapRow[] }
type Slot = { groupId: string; top: number; to: number }

/** Passing `order` keeps the hook's geometry snapshot aligned with what's actually rendered;
 *  it must be identity-stable across the hook's own per-move re-renders. */
export function useStatusReorder(
  order: { id: string; values: string[] }[],
  labelFor: (value: string) => string,
  onMove: (value: string, toGroupId: string, toIndex: number) => void,
): {
  /** The groups' shared wrapper — the scroll-invalidation target. */
  containerRef: (el: HTMLDivElement | null) => void
  registerGroup: (groupId: string, el: HTMLElement | null) => void
  registerRow: (value: string, el: HTMLElement | null) => void
  onRowPointerDown: (value: string, e: ReactPointerEvent) => void
  dragging: string | null
  /** The landing slot's group and its group-relative line seat — the editors draw the line
   *  inside the group it lands in, not on the shared host. */
  drop: { groupId: string; top: number } | null
  ghost: ReactNode
} {
  const container = useRef<HTMLElement | null>(null)
  const groupEls = useRef(new Map<string, HTMLElement>())
  const rows = useRef(new Map<string, HTMLElement>())

  // Groups partition the pointer axis by boundary midpoints, so every clientY resolves to exactly
  // one group. A destination that wouldn't move resolves to null, so the line never promises a
  // move the drop then declines.
  const drag = useInsertionDrag<Slot, SnapGroup[]>({
    take: () =>
      order.map((grp) => {
        const cRect = groupEls.current.get(grp.id)?.getBoundingClientRect()
        const rowRects: SnapRow[] = []
        for (const value of grp.values) {
          const el = rows.current.get(value)
          if (el) {
            const r = el.getBoundingClientRect()
            rowRects.push({ value, top: r.top, bottom: r.bottom })
          }
        }
        return { id: grp.id, top: cRect?.top ?? 0, bottom: cRect?.bottom ?? 0, rows: rowRects }
      }),
    resolve: (value, point, groups) => {
      if (groups.length === 0) return null
      let gi = groups.length - 1
      for (let i = 0; i < groups.length - 1; i++) {
        if (point.y < (groups[i].bottom + groups[i + 1].top) / 2) {
          gi = i
          break
        }
      }
      const grp = groups[gi]
      let index = grp.rows.length
      for (let i = 0; i < grp.rows.length; i++) {
        if (point.y < (grp.rows[i].top + grp.rows[i].bottom) / 2) {
          index = i
          break
        }
      }
      const lineY =
        index >= grp.rows.length
          ? (grp.rows[grp.rows.length - 1]?.bottom ?? grp.top)
          : index === 0
            ? grp.rows[0].top
            : (grp.rows[index - 1].bottom + grp.rows[index].top) / 2
      // A same-group drop past the original slot shifts down by one (moveStatusOption inserts in
      // the WITHOUT space while the snapshot indexes the WITH space); cross-group needs no shift.
      // A value the live order no longer holds has no move to make — a delete landing mid-drag
      // leaves the gesture aimed at a row that is gone, and the drop declines rather than guessing.
      const fromGroup = order.find((grp) => grp.values.includes(value))
      if (!fromGroup) return null
      const fromIndex = fromGroup.values.indexOf(value)
      const sameGroup = fromGroup.id === grp.id
      const to = sameGroup && index > fromIndex ? index - 1 : index
      if (sameGroup && to === fromIndex) return null
      return { groupId: grp.id, top: lineY - grp.top, to }
    },
    commit: (value, slot) => onMove(value, slot.groupId, slot.to),
    label: labelFor,
    rowEl: (value) => rows.current.get(value),
    scrollTarget: () => container.current,
    // The groups live in a height-capped menu frame — the edge loop reaches past its fold.
    armFrom: () => container.current,
    alsoBlock: 'button',
    // An active drag's Escape must cancel the DRAG, not dismiss the hosting dropdown.
    swallowActiveEscape: true,
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
