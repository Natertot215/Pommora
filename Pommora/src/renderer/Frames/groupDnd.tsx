// The pure model is shared (bandDndModel: slots, nest cycle-guard, order math); only the drop
// semantics live here. frameDnd doesn't fit: its two-region assigned/all vocabulary has no
// parent/nest concept, and the hierarchy list needs reparent drops.
import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { useInsertionDrag } from '@renderer/Interactions/insertionDrag'
import type { Band, BandIndex, BandSlot } from '@renderer/Views/bandDndModel'
import { bandSlot, buildBandIndex, canNest } from '@renderer/Views/bandDndModel'

export interface GroupingDrop {
  kind: 'reorder' | 'reparent'
  targetParentId: string | null
  beforeId: string | null
}

type Snapshot = { index: BandIndex; boxTop: number; endY: number }
type Slot = BandSlot & { topInBox: number }

/** The list is small and single-instance, so rows register through props rather than React
 *  Context. `bands` is the visible flat row list, identity-stable across per-move re-renders. */
export function useGroupingListDrag({
  bands,
  nestable,
  labelFor,
  lineClassName,
  onDrop,
}: {
  bands: Band[]
  nestable: boolean
  labelFor: (id: string) => string
  lineClassName?: string
  onDrop: (draggedId: string, drop: GroupingDrop) => void
}): {
  containerRef: (el: HTMLDivElement | null) => void
  rowRef: (id: string) => (el: HTMLElement | null) => void
  rowHandle: (id: string) => { onPointerDown: (e: ReactPointerEvent) => void }
  draggingId: string | null
  line: ReactNode
  nestTarget: string | null
  ghost: ReactNode
} {
  const container = useRef<HTMLDivElement | null>(null)
  const els = useRef(new Map<string, HTMLElement>())

  const drag = useInsertionDrag<Slot, Snapshot>({
    take: () => {
      const measured = bands.flatMap((b) => {
        const el = els.current.get(b.id)
        if (!el) return []
        const r = el.getBoundingClientRect()
        return [{ id: b.id, top: r.top, bottom: r.bottom, mid: r.top + r.height / 2 }]
      })
      const box = container.current?.getBoundingClientRect()
      return {
        index: buildBandIndex(bands, measured),
        boxTop: box?.top ?? 0,
        endY: measured.at(-1)?.bottom ?? box?.bottom ?? 0,
      }
    },
    resolve: (id, point, s) => {
      const slot = bandSlot(s.index, point.y, id, s.endY)
      // A nest slot on a non-nestable list (the flat Custom chips / flat sub-grouped sets) or an
      // illegal nest resolves to nothing — no line, no commit.
      if (slot?.nestInto && (!nestable || !canNest(id, slot.nestInto, bands))) return null
      return slot ? { ...slot, topInBox: slot.lineY - s.boxTop } : null
    },
    commit: (id, slot) => {
      // The same classification bandDnd runs — the caller never re-derives it.
      const parentId = bands.find((b) => b.id === id)?.parentId
      const reorders = !slot.nestInto && slot.impliedParentId === parentId
      onDrop(id, {
        kind: reorders ? 'reorder' : 'reparent',
        targetParentId: slot.nestInto ?? slot.impliedParentId,
        beforeId: slot.beforeId,
      })
    },
    lineFor: (slot) => (slot.nestInto ? null : { top: slot.topInBox }),
    lineClassName,
    label: labelFor,
    rowEl: (id) => els.current.get(id),
    scrollTarget: () => container.current,
    // The frame's order region is scroll-capped — the edge loop reaches past its fold.
    armFrom: () => container.current,
    // A row's hide-eye is a button inside the drag surface — a shaky press on it must stay a click.
    alsoBlock: 'button',
    capture: false,
    // An active drag's Escape must cancel the DRAG, not dismiss the hosting settings menu.
    swallowActiveEscape: true,
    disclose: true,
    watch: bands,
  })

  return {
    containerRef: (el) => {
      container.current = el
    },
    rowRef: (id) => (el) => {
      if (el) els.current.set(id, el)
      else els.current.delete(id)
    },
    rowHandle: (id) => ({ onPointerDown: (e) => drag.begin(id, e) }),
    draggingId: drag.dragging,
    line: drag.line,
    nestTarget: drag.slot?.nestInto ?? null,
    ghost: drag.ghost,
  }
}
