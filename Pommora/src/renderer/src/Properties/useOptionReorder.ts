import { useMemo, type PointerEvent as ReactPointerEvent } from 'react'
import { useStatusReorder } from './useStatusReorder'

// The flat list is the one-group case of the grouped one — same gesture, same frozen-geometry
// snapshot, same drop arithmetic — so this is an adapter rather than a second implementation. The
// single group's element IS the container, which is what makes the grouped hook's group-relative
// drop line the container-relative line a flat list wants.
const FLAT_GROUP = 'flat'

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
  // Identity-stable for as long as `order` is, which is the grouped hook's re-snapshot trigger.
  const groups = useMemo(() => [{ id: FLAT_GROUP, values: order }], [order])
  const grouped = useStatusReorder(groups, (value, _toGroupId, toIndex) =>
    onReorder(value, toIndex),
  )

  return {
    containerRef: (el) => {
      grouped.containerRef(el)
      grouped.registerGroup(FLAT_GROUP, el)
    },
    registerRow: grouped.registerRow,
    onRowPointerDown: grouped.onRowPointerDown,
    dragging: grouped.dragging,
    lineTop: grouped.drop?.top ?? null,
    ghost: grouped.ghost,
  }
}
