// The pure model is SHARED (bandDndModel: slots, nest cycle-guard, order math); only the pointer
// wiring and the insertion line live here. paneDnd doesn't fit: its two-region assigned/all
// vocabulary has no parent/nest concept, and the hierarchy list needs reparent drops.
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { usePointerGesture } from '@renderer/design-system/interactions/gesture'
import { useDragSnapshot } from '@renderer/design-system/interactions/snapshot'
import { EDITABLE_TARGETS, GHOST_OFFSET } from '@renderer/design-system/interactions/shared'
import type { Band, BandIndex, BandSlot } from '../../Detail/Views/Table/bandDndModel'
import { bandSlot, buildBandIndex, canNest } from '../../Detail/Views/Table/bandDndModel'

export interface GroupingDrop {
  kind: 'reorder' | 'reparent'
  targetParentId: string | null
  beforeId: string | null
}

/** The list is small and single-instance, so rows register through props (a context-free API)
 *  rather than React Context. `bands` is the VISIBLE flat row list. */
export function useGroupingListDrag({
  bands,
  nestable,
  onDrop,
}: {
  bands: Band[]
  nestable: boolean
  onDrop: (draggedId: string, drop: GroupingDrop) => void
}): {
  containerRef: (el: HTMLDivElement | null) => void
  rowRef: (id: string) => (el: HTMLElement | null) => void
  rowHandle: (id: string) => { onPointerDown: (e: ReactPointerEvent) => void }
  draggingId: string | null
  line: { y: number } | null
  nestTarget: string | null
  /** The floating drag-chip coords (DragGhost) — null until the gesture activates. */
  ghost: { x: number; y: number } | null
} {
  const container = useRef<HTMLDivElement | null>(null)
  const els = useRef(new Map<string, HTMLElement>())
  const beginGesture = usePointerGesture()
  const live = useRef<BandSlot | null>(null)
  const cfg = useRef({ bands, nestable, onDrop })
  cfg.current = { bands, nestable, onDrop }
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [line, setLine] = useState<{ y: number } | null>(null)
  const [nestTarget, setNestTarget] = useState<string | null>(null)
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null)

  // The lists live in a scroll-capped region, so frozen rects go stale mid-drag. `bands` must be
  // identity-stable across the hook's own per-move re-renders — a caller building it inline would
  // turn every move into a full re-measure.
  type Snapshot = { index: BandIndex; boxTop: number; endY: number }
  const lastPoint = useRef({ x: 0, y: 0 })
  const snap = useDragSnapshot(takeSnapshot)
  useEffect(() => {
    snap.markDirty()
  }, [bands])

  function takeSnapshot(): Snapshot {
    const measured = cfg.current.bands.flatMap((b) => {
      const el = els.current.get(b.id)
      if (!el) return []
      const r = el.getBoundingClientRect()
      return [{ id: b.id, top: r.top, bottom: r.bottom, mid: r.top + r.height / 2 }]
    })
    const index = buildBandIndex(cfg.current.bands, measured)
    const box = container.current?.getBoundingClientRect()
    return {
      index,
      boxTop: box?.top ?? 0,
      endY: measured.at(-1)?.bottom ?? box?.bottom ?? 0,
    }
  }

  const reset = (): void => {
    live.current = null
    snap.reset()
    setDraggingId(null)
    setLine(null)
    setNestTarget(null)
    setGhost(null)
  }

  return {
    containerRef: (el) => {
      container.current = el
    },
    rowRef: (id) => (el) => {
      if (el) els.current.set(id, el)
      else els.current.delete(id)
    },
    rowHandle: (id) => ({
      onPointerDown: (e) => {
        const anchor = els.current.get(id) ?? (e.currentTarget as HTMLElement)
        const resolveAt = (y: number): void => {
          const s = snap.get()
          if (!s) return
          let slot = bandSlot(s.index, y, id, s.endY)
          // A non-nestable list (the flat Custom chips / flat sub-grouped sets) demotes a nest
          // slot to an after-slot at the same line; an illegal nest dies.
          if (slot?.nestInto) {
            if (!cfg.current.nestable || !canNest(id, slot.nestInto, cfg.current.bands)) slot = null
          }
          live.current = slot
          setLine(slot && !slot.nestInto ? { y: slot.lineY - s.boxTop } : null)
          setNestTarget(slot?.nestInto ?? null)
        }
        beginGesture({
          el: anchor,
          event: e,
          capture: false,
          onActivate: (ev) => {
            lastPoint.current = { x: ev.clientX, y: ev.clientY }
            snap.markDirty()
            setDraggingId(id)
            return true
          },
          scrollTarget: () => container.current,
          onWindowScroll: () => {
            snap.markDirty()
            resolveAt(lastPoint.current.y)
          },
          onDragMove: (ev) => {
            lastPoint.current = { x: ev.clientX, y: ev.clientY }
            setGhost({ x: ev.clientX + GHOST_OFFSET.x, y: ev.clientY + GHOST_OFFSET.y })
            resolveAt(ev.clientY)
          },
          onDrop: () => {
            if (snap.isDirty()) resolveAt(lastPoint.current.y)
            const slot = live.current
            if (slot) {
              cfg.current.onDrop(id, {
                kind: slot.nestInto
                  ? 'reparent'
                  : slot.impliedParentId === cfg.current.bands.find((b) => b.id === id)?.parentId
                    ? 'reorder'
                    : 'reparent',
                targetParentId: slot.nestInto ?? slot.impliedParentId,
                beforeId: slot.beforeId,
              })
            }
            reset()
          },
          onAbort: reset,
        })
      },
    }),
    draggingId,
    line,
    nestTarget,
    ghost,
  }
}
