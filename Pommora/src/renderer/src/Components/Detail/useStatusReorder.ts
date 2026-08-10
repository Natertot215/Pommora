import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { usePointerGesture } from '@renderer/design-system/interactions/gesture'
import { useDragSnapshot } from '@renderer/design-system/interactions/snapshot'
import { EDITABLE_TARGETS, GHOST_OFFSET } from '@renderer/design-system/interactions/shared'
import { announce } from '@renderer/design-system/interactions/a11y'
import { findScroller, startAutoScroll } from '@renderer/design-system/interactions/autoscroll'

// The multi-region cousin of useOptionReorder. A drag can reorder within a group OR cross into
// another group (including an empty one); on drop it calls onMove(value, toGroupId, toIndex) —
// toIndex in the target group's without-the-dragged space, matching optionModel.moveStatusOption.
// Row geometry is snapshotted at drag-start (no rect-read per move — the hard rule); an
// invalidating scroll re-resolves from the last point.

type SnapRow = { value: string; top: number; bottom: number }
type SnapGroup = { id: string; top: number; bottom: number; rows: SnapRow[] }

/** Passing `order` keeps the hook's geometry snapshot aligned with what's actually rendered. */
export function useStatusReorder(
  order: { id: string; values: string[] }[],
  onMove: (value: string, toGroupId: string, toIndex: number) => void,
): {
  /** The groups' shared wrapper — the scroll-invalidation target. */
  containerRef: (el: HTMLDivElement | null) => void
  registerGroup: (groupId: string, el: HTMLElement | null) => void
  registerRow: (value: string, el: HTMLElement | null) => void
  onRowPointerDown: (value: string, e: ReactPointerEvent) => void
  dragging: string | null
  drop: { groupId: string; top: number } | null
  /** The floating drag-chip coords (DragGhost) — null until the gesture activates. */
  ghost: { x: number; y: number } | null
} {
  const container = useRef<HTMLElement | null>(null)
  const groupEls = useRef(new Map<string, HTMLElement>())
  const rows = useRef(new Map<string, HTMLElement>())
  const orderRef = useRef(order)
  orderRef.current = order
  const onMoveRef = useRef(onMove)
  onMoveRef.current = onMove
  const beginGesture = usePointerGesture()
  // Set at activation (a tap never sets it) — the dragged value and its live target slot.
  const dragged = useRef<{ value: string; toGroupId: string; toIndex: number } | null>(null)
  const lastPoint = useRef({ x: 0, y: 0 })
  const stopScroll = useRef<(() => void) | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null)
  const [drop, setDrop] = useState<{ groupId: string; top: number } | null>(null)

  const registerGroup = (groupId: string, el: HTMLElement | null): void => {
    if (el) groupEls.current.set(groupId, el)
    else groupEls.current.delete(groupId)
  }
  const registerRow = (value: string, el: HTMLElement | null): void => {
    if (el) rows.current.set(value, el)
    else rows.current.delete(value)
  }

  const snap = useDragSnapshot(takeSnapshot)
  // `order` must be identity-stable across the hook's own per-move re-renders (the caller memoizes
  // it), so this fires only on a real list change — a watcher push mid-drag re-aims the line.
  useEffect(() => {
    snap.markDirty()
    if (dragged.current) resolveAt(lastPoint.current.y)
  }, [order])
  function takeSnapshot(): SnapGroup[] {
    return orderRef.current.map((grp) => {
      const cRect = groupEls.current.get(grp.id)?.getBoundingClientRect()
      const rowRects: SnapRow[] = []
      for (const value of grp.values) {
        const el = rows.current.get(value)
        if (el) {
          const r = el.getBoundingClientRect()
          rowRects.push({ value, top: r.top, bottom: r.bottom })
        }
      }
      return {
        id: grp.id,
        top: cRect?.top ?? 0,
        bottom: cRect?.bottom ?? 0,
        rows: rowRects,
      }
    })
  }

  // Groups partition the pointer axis by boundary midpoints, so every clientY (gaps + empty
  // groups included) resolves to exactly one group.
  const locate = (clientY: number): { groupId: string; index: number; top: number } | null => {
    const groupsSnap = snap.get()
    if (!groupsSnap || groupsSnap.length === 0) return null
    let gi = groupsSnap.length - 1
    for (let i = 0; i < groupsSnap.length - 1; i++) {
      const boundary = (groupsSnap[i].bottom + groupsSnap[i + 1].top) / 2
      if (clientY < boundary) {
        gi = i
        break
      }
    }
    const grp = groupsSnap[gi]
    let index = grp.rows.length
    for (let i = 0; i < grp.rows.length; i++) {
      if (clientY < (grp.rows[i].top + grp.rows[i].bottom) / 2) {
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
    return { groupId: grp.id, index, top: lineY - grp.top }
  }

  // The slot in the target group's without-the-dragged space plus whether it actually moves — the
  // ONE reading the line and the release both take, so the line never promises a move the drop then
  // declines. A same-group drop past the original slot shifts down by one (moveStatusOption inserts
  // in the WITHOUT space while the snapshot indexes the WITH space); cross-group needs no shift.
  const destination = (
    value: string,
    groupId: string,
    index: number,
  ): { to: number; moves: boolean } => {
    const fromGroup = orderRef.current.find((grp) => grp.values.includes(value))
    const fromIndex = fromGroup?.values.indexOf(value) ?? -1
    const sameGroup = fromGroup?.id === groupId
    const to = sameGroup && index > fromIndex ? index - 1 : index
    return { to, moves: !(sameGroup && to === fromIndex) }
  }

  const resolveAt = (clientY: number): void => {
    const d = dragged.current
    if (!d) return
    const hit = locate(clientY)
    if (!hit) return
    d.toGroupId = hit.groupId
    d.toIndex = hit.index
    const { moves } = destination(d.value, hit.groupId, hit.index)
    setDrop(moves ? { groupId: hit.groupId, top: hit.top } : null)
  }

  const clear = (): void => {
    dragged.current = null
    snap.reset()
    setDragging(null)
    setGhost(null)
    setDrop(null)
  }

  const onRowPointerDown = (value: string, e: ReactPointerEvent): void => {
    if ((e.target as HTMLElement).closest?.(`button, ${EDITABLE_TARGETS}`)) return
    const el = rows.current.get(value) ?? (e.currentTarget as HTMLElement)
    beginGesture({
      el,
      event: e,
      // An active drag's Escape must cancel the DRAG, not dismiss the hosting dropdown.
      swallowActiveEscape: true,
      onActivate: (ev) => {
        dragged.current = { value, toGroupId: '', toIndex: 0 }
        lastPoint.current = { x: ev.clientX, y: ev.clientY }
        setDragging(value)
        // The groups live in a height-capped menu frame — the edge loop reaches past its fold,
        // and the window scroll hook re-aims off the loop's own scrollBy.
        const sc = findScroller(container.current, 'y')
        if (sc) {
          stopScroll.current = startAutoScroll({
            getPoint: () => lastPoint.current,
            scroller: sc,
            dragEl: container.current,
            axis: 'y',
          })
        }
        announce(`Picked up ${value}.`)
        return true
      },
      onDragMove: (ev) => {
        lastPoint.current = { x: ev.clientX, y: ev.clientY }
        setGhost({ x: ev.clientX + GHOST_OFFSET.x, y: ev.clientY + GHOST_OFFSET.y })
        resolveAt(ev.clientY)
      },
      scrollTarget: () => container.current,
      onWindowScroll: () => {
        snap.markDirty()
        resolveAt(lastPoint.current.y)
      },
      onDrop: () => {
        if (snap.isDirty()) resolveAt(lastPoint.current.y)
        const d = dragged.current
        if (d && d.toGroupId !== '') {
          const { to, moves } = destination(d.value, d.toGroupId, d.toIndex)
          if (moves) {
            onMoveRef.current(d.value, d.toGroupId, to)
            announce(`Moved ${d.value}.`)
          }
        }
        clear()
      },
      onAbort: clear,
      teardown: () => {
        stopScroll.current?.()
        stopScroll.current = null
      },
    })
  }

  return {
    containerRef: (el) => {
      container.current = el
    },
    registerGroup,
    registerRow,
    onRowPointerDown,
    dragging,
    drop,
    ghost,
  }
}
