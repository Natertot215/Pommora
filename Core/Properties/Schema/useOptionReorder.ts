import { useMemo, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { useStatusReorder } from './useStatusReorder'

// An adapter, not a second implementation: the single group's element IS the container, which makes the grouped hook's group-relative drop line the container-relative line a flat list wants.
const FLAT_GROUP = 'flat'

export function useOptionReorder(
  order: string[],
  labelFor: (value: string) => string,
  onReorder: (value: string, toIndex: number) => void,
): {
  containerRef: (el: HTMLDivElement | null) => void
  registerRow: (value: string, el: HTMLElement | null) => void
  onRowPointerDown: (value: string, e: ReactPointerEvent) => void
  dragging: string | null
  lineTop: number | null
  ghost: ReactNode
} {
  // Identity-stable for as long as `order` is, which is the grouped hook's re-snapshot trigger.
  const groups = useMemo(() => [{ id: FLAT_GROUP, values: order }], [order])
  const grouped = useStatusReorder(groups, labelFor, (value, _toGroupId, toIndex) =>
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
