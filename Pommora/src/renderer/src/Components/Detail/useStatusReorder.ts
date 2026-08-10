import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { usePointerGesture } from '@renderer/design-system/interactions/gesture'

// The multi-region cousin of useOptionReorder. A drag can reorder within a group OR cross into
// another group (including an empty one); on drop it calls onMove(value, toGroupId, toIndex) —
// toIndex in the target group's without-the-dragged space, matching optionModel.moveStatusOption.
// Row geometry is snapshotted at drag-start (no rect-read per move — the hard rule); an
// invalidating scroll re-resolves from the last point.

type SnapRow = { value: string; top: number; bottom: number }
type SnapGroup = { id: string; top: number; bottom: number; containerTop: number; rows: SnapRow[] }

/** Passing `order` keeps the hook's geometry snapshot aligned with what's actually rendered. */
export function useStatusReorder(
  order: { id: string; values: string[] }[],
  onMove: (value: string, toGroupId: string, toIndex: number) => void,
): {
  registerGroup: (groupId: string, el: HTMLElement | null) => void
  registerRow: (value: string, el: HTMLElement | null) => void
  onRowPointerDown: (value: string, e: ReactPointerEvent) => void
  dragging: string | null
  drop: { groupId: string; top: number } | null
  /** The floating drag-chip coords (DragGhost) — null until the gesture activates. */
  ghost: { x: number; y: number } | null
} {
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

  const snapshot = useRef<SnapGroup[] | null>(null)
  const snapshotDirty = useRef(false)
  const takeSnapshot = (): SnapGroup[] => {
    snapshotDirty.current = false
    return orderRef.current.map((grp) => {
      const container = groupEls.current.get(grp.id)
      const cRect = container?.getBoundingClientRect()
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
        containerTop: cRect?.top ?? 0,
        rows: rowRects,
      }
    })
  }

  // Groups partition the pointer axis by boundary midpoints, so every clientY (gaps + empty
  // groups included) resolves to exactly one group.
  const locate = (clientY: number): { groupId: string; index: number; top: number } | null => {
    const snap = snapshot.current
    if (!snap || snap.length === 0) return null
    let gi = snap.length - 1
    for (let i = 0; i < snap.length - 1; i++) {
      const boundary = (snap[i].bottom + snap[i + 1].top) / 2
      if (clientY < boundary) {
        gi = i
        break
      }
    }
    const grp = snap[gi]
    let index = grp.rows.length
    for (let i = 0; i < grp.rows.length; i++) {
      if (clientY < (grp.rows[i].top + grp.rows[i].bottom) / 2) {
        index = i
        break
      }
    }
    const lineY =
      index >= grp.rows.length
        ? (grp.rows[grp.rows.length - 1]?.bottom ?? grp.containerTop)
        : index === 0
          ? grp.rows[0].top
          : (grp.rows[index - 1].bottom + grp.rows[index].top) / 2
    return { groupId: grp.id, index, top: lineY - grp.containerTop }
  }

  const resolveAt = (clientY: number): void => {
    const d = dragged.current
    if (!d) return
    if (snapshotDirty.current || !snapshot.current) snapshot.current = takeSnapshot()
    const hit = locate(clientY)
    if (!hit) return
    d.toGroupId = hit.groupId
    d.toIndex = hit.index
    // The line mirrors the release's own condition — a same-group slot resolving to the value's current
    // position draws nothing rather than promising a move the drop then declines.
    const fromGroup = orderRef.current.find((grp) => grp.values.includes(d.value))
    const fromIndex = fromGroup?.values.indexOf(d.value) ?? -1
    const sameGroup = fromGroup?.id === hit.groupId
    const toIndex = sameGroup && hit.index > fromIndex ? hit.index - 1 : hit.index
    setDrop(sameGroup && toIndex === fromIndex ? null : { groupId: hit.groupId, top: hit.top })
  }

  const clear = (): void => {
    dragged.current = null
    snapshot.current = null
    snapshotDirty.current = false
    setDragging(null)
    setGhost(null)
    setDrop(null)
  }

  const onRowPointerDown = (value: string, e: ReactPointerEvent): void => {
    if ((e.target as HTMLElement).closest?.('button, input, [contenteditable="true"]')) return
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
        return true
      },
      onDragMove: (ev) => {
        lastPoint.current = { x: ev.clientX, y: ev.clientY }
        setGhost({ x: ev.clientX + 12, y: ev.clientY + 8 })
        resolveAt(ev.clientY)
      },
      onWindowScroll: (ev) => {
        const first = groupEls.current.values().next().value ?? null
        if (ev.target instanceof Element && first && !ev.target.contains(first)) return
        snapshotDirty.current = true
        resolveAt(lastPoint.current.y)
      },
      onDrop: () => {
        if (snapshotDirty.current) resolveAt(lastPoint.current.y)
        const d = dragged.current
        if (d) {
          const fromGroup = orderRef.current.find((grp) => grp.values.includes(d.value))
          const fromIndex = fromGroup?.values.indexOf(d.value) ?? -1
          const sameGroup = fromGroup?.id === d.toGroupId
          // d.toIndex is in the WITH-dragged snapshot space; moveStatusOption inserts in the WITHOUT
          // space, so a same-group drop past the original slot shifts down by one. Cross-group needs
          // no shift.
          const toIndex = sameGroup && d.toIndex > fromIndex ? d.toIndex - 1 : d.toIndex
          if (!(sameGroup && toIndex === fromIndex)) onMoveRef.current(d.value, d.toGroupId, toIndex)
        }
        clear()
      },
      onAbort: clear,
    })
  }

  return { registerGroup, registerRow, onRowPointerDown, dragging, drop, ghost }
}
