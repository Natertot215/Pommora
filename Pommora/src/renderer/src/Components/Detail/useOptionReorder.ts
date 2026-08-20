import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { usePointerGesture } from '@renderer/design-system/interactions/gesture'
import { useDragSnapshot } from '@renderer/design-system/interactions/snapshot'
import { EDITABLE_TARGETS, GHOST_OFFSET } from '@renderer/design-system/interactions/shared'
import { announce } from '@renderer/design-system/interactions/a11y'
import { armAutoScroll } from '@renderer/design-system/interactions/autoscroll'

// The flat cousin of the two-region paneDnd. The drop calls onReorder(value, toIndex) where
// toIndex is in the without-the-dragged coordinate space (matching optionModel.reorderOption).

export function useOptionReorder(
  order: string[],
  onReorder: (value: string, toIndex: number) => void,
): {
  containerRef: (el: HTMLDivElement | null) => void
  registerRow: (value: string, el: HTMLElement | null) => void
  onRowPointerDown: (value: string, e: ReactPointerEvent) => void
  dragging: string | null
  lineTop: number | null
  /** The floating drag-chip coords (DragGhost) — null until the gesture activates. */
  ghost: { x: number; y: number } | null
} {
  const container = useRef<HTMLElement | null>(null)
  const rows = useRef(new Map<string, HTMLElement>())
  const orderRef = useRef(order)
  orderRef.current = order
  const onReorderRef = useRef(onReorder)
  onReorderRef.current = onReorder
  const beginGesture = usePointerGesture()
  // Set at activation (a tap never sets it) — the dragged value and its live target slot; a null
  // index means nothing is aimed yet, and the drop declines rather than guessing.
  const dragged = useRef<{ value: string; index: number | null } | null>(null)
  const lastPoint = useRef({ x: 0, y: 0 })
  const stopScroll = useRef<(() => void) | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null)
  const [lineTop, setLineTop] = useState<number | null>(null)

  const containerRef = (el: HTMLDivElement | null): void => {
    container.current = el
  }
  const registerRow = (value: string, el: HTMLElement | null): void => {
    if (el) rows.current.set(value, el)
    else rows.current.delete(value)
  }

  // Row geometry frozen at drag-start: reading a rect per row on every pointermove is layout-thrash
  // on a high-frequency trigger (the paneDnd snapshot pattern). An invalidating scroll re-resolves
  // from the last point, so a release without another move still commits fresh.
  type Snapshot = { rects: Array<{ top: number; bottom: number }>; containerTop: number }
  const snap = useDragSnapshot(takeSnapshot)
  // `order` must be identity-stable across the hook's own per-move re-renders (the caller memoizes
  // it), so this fires only on a real list change — a watcher push mid-drag re-aims the line.
  useEffect(() => {
    snap.markDirty()
    if (dragged.current) resolveAt(lastPoint.current.y)
  }, [order])
  function takeSnapshot(): Snapshot | null {
    const cEl = container.current
    if (!cEl) return null
    const rects: Snapshot['rects'] = []
    for (const value of orderRef.current) {
      const el = rows.current.get(value)
      if (el) {
        const r = el.getBoundingClientRect()
        rects.push({ top: r.top, bottom: r.bottom })
      }
    }
    return { rects, containerTop: cEl.getBoundingClientRect().top }
  }

  // The drop index (0…n) the pointer is over, and the drop-line's Y within the container — read off
  // the frozen snapshot, never the live DOM.
  const locate = (clientY: number): { index: number; top: number } | null => {
    const rowsSnap = snap.get()
    // Nothing measurable — fail closed so a dead snapshot never aims a commit at slot 0.
    if (!rowsSnap || rowsSnap.rects.length === 0) return null
    const { rects, containerTop } = rowsSnap
    let index = rects.length
    for (let i = 0; i < rects.length; i++) {
      if (clientY < (rects[i].top + rects[i].bottom) / 2) {
        index = i
        break
      }
    }
    const top =
      index >= rects.length
        ? (rects[rects.length - 1]?.bottom ?? containerTop) - containerTop
        : (index === 0 ? rects[0].top : (rects[index - 1].bottom + rects[index].top) / 2) -
          containerTop
    return { index, top }
  }

  // The slot in the without-the-dragged space plus whether it actually moves — the ONE reading the
  // line and the release both take, so the line never promises a move the drop then declines.
  const destination = (value: string, index: number): { to: number; moves: boolean } => {
    const from = orderRef.current.indexOf(value)
    const to = index > from ? index - 1 : index
    return { to, moves: from >= 0 && to !== from }
  }

  const resolveAt = (clientY: number): void => {
    const d = dragged.current
    if (!d) return
    const hit = locate(clientY)
    if (!hit) {
      d.index = null
      setLineTop(null)
      return
    }
    d.index = hit.index
    setLineTop(destination(d.value, hit.index).moves ? hit.top : null)
  }

  const clear = (): void => {
    dragged.current = null
    snap.reset()
    setDragging(null)
    setGhost(null)
    setLineTop(null)
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
        dragged.current = { value, index: null }
        lastPoint.current = { x: ev.clientX, y: ev.clientY }
        setDragging(value)
        // The options list lives in a height-capped menu frame — the edge loop reaches past its
        // fold, and the window scroll hook re-aims off the loop's own scrollBy.
        stopScroll.current = armAutoScroll(container.current, () => lastPoint.current)
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
        if (d && d.index !== null) {
          const { to, moves } = destination(d.value, d.index)
          if (moves) {
            onReorderRef.current(d.value, to)
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

  return { containerRef, registerRow, onRowPointerDown, dragging, lineTop, ghost }
}
