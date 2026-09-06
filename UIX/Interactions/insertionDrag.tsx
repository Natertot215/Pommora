import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { usePointerGesture } from './gesture'
import { useDragSnapshot } from './snapshot'
import { EDITABLE_TARGETS, GHOST_OFFSET } from './shared'
import { DragGhost } from './DragGhost'
import { DropLine } from './DropLine'
import { armAutoScroll } from './autoscroll'
import { announce } from './a11y'

export interface InsertionDragSpec<Slot, Snap> {
  /** Frozen geometry for the drag of `id` — taken at activation, retaken lazily after an
   *  invalidation. Null fails the resolve closed: no slot survives a vanished surface. */
  take: (id: string) => Snap | null
  resolve: (id: string, point: { x: number; y: number }, snap: Snap) => Slot | null
  commit: (id: string, slot: Slot, snap: Snap) => void
  lineFor?: (slot: Slot, snap: Snap) => CSSProperties | null
  lineClassName?: string
  label: (id: string) => string
  ghost?: 'offset' | 'grab' | 'none'
  rowEl: (id: string) => HTMLElement | null | undefined
  scrollTarget: () => Element | null
  armFrom?: () => HTMLElement | null
  alsoBlock?: string
  disabled?: () => boolean
  disclose?: boolean
  capture?: boolean
  swallowActiveEscape?: boolean
  watch: unknown
}

export function nearestByTop<Row extends { top: number }>(rows: Row[], y: number): Row {
  let over = rows[0]
  for (const row of rows) {
    if (y >= row.top) over = row
    else break
  }
  return over
}

interface DragState<Slot> {
  id: string
  slot: Slot | null
  line: CSSProperties | null
  ghost: { x: number; y: number } | null
}

export function useInsertionDrag<Slot, Snap>(
  spec: InsertionDragSpec<Slot, Snap>,
): {
  begin: (id: string, e: ReactPointerEvent) => void
  dragging: string | null
  slot: Slot | null
  line: ReactNode
  ghost: ReactNode
} {
  const specRef = useRef(spec)
  specRef.current = spec
  const beginGesture = usePointerGesture()
  const dragged = useRef<{ id: string; grabX: number; label: string } | null>(null)
  const lastPoint = useRef({ x: 0, y: 0 })
  const stopScroll = useRef<(() => void) | null>(null)
  const live = useRef<Slot | null>(null)
  const [drag, setDrag] = useState<DragState<Slot> | null>(null)
  const snap = useDragSnapshot<Snap>(() =>
    dragged.current ? specRef.current.take(dragged.current.id) : null,
  )

  function resolveSlot(): void {
    const d = dragged.current
    if (!d) return
    const cfg = specRef.current
    const s = snap.get()
    const slot = s ? cfg.resolve(d.id, lastPoint.current, s) : null
    live.current = slot
    const mode = cfg.ghost ?? 'offset'
    setDrag({
      id: d.id,
      slot,
      line: slot !== null && s !== null ? (cfg.lineFor?.(slot, s) ?? null) : null,
      ghost:
        mode === 'none'
          ? null
          : mode === 'grab'
            ? { x: lastPoint.current.x - d.grabX, y: lastPoint.current.y }
            : { x: lastPoint.current.x + GHOST_OFFSET.x, y: lastPoint.current.y + GHOST_OFFSET.y },
    })
  }

  const invalidate = (): void => {
    snap.markDirty()
    resolveSlot()
  }

  // A mid-drag list change (a watcher push) re-renders rows — stale rects must not survive it,
  // and a release with no further move must still commit against the fresh slot.
  useEffect(() => {
    if (dragged.current) invalidate()
    else snap.markDirty()
  }, [spec.watch])

  const reset = (): void => {
    dragged.current = null
    live.current = null
    snap.reset()
    setDrag(null)
  }

  const begin = (id: string, e: ReactPointerEvent): void => {
    const cfg = specRef.current
    if (cfg.disabled?.()) return
    const blocked = cfg.alsoBlock ? `${cfg.alsoBlock}, ${EDITABLE_TARGETS}` : EDITABLE_TARGETS
    if ((e.target as HTMLElement).closest?.(blocked)) return
    const el = cfg.rowEl(id) ?? (e.currentTarget as HTMLElement)
    const grabX = e.clientX - el.getBoundingClientRect().left
    beginGesture({
      el,
      event: e,
      capture: cfg.capture,
      swallowActiveEscape: cfg.swallowActiveEscape,
      onActivate: (ev) => {
        dragged.current = { id, grabX, label: cfg.label(id) }
        lastPoint.current = { x: ev.clientX, y: ev.clientY }
        announce(`Picked up ${dragged.current.label}.`)
        // No re-resolve callback: the loop's own scrollBy raises the window scroll the
        // invalidation hook below already answers — one path, never a stale-rect re-aim.
        stopScroll.current = armAutoScroll(cfg.armFrom?.() ?? el, () => lastPoint.current)
        resolveSlot()
        return true
      },
      onDragMove: (ev) => {
        lastPoint.current = { x: ev.clientX, y: ev.clientY }
        resolveSlot()
      },
      scrollTarget: cfg.scrollTarget,
      onWindowScroll: invalidate,
      onDrop: () => {
        if (snap.isDirty()) resolveSlot()
        const d = dragged.current
        const slot = live.current
        const s = snap.get()
        if (d && slot !== null && s !== null) {
          specRef.current.commit(d.id, slot, s)
          announce(`Moved ${d.label}.`)
        }
        reset()
      },
      onAbort: reset,
      teardown: () => {
        stopScroll.current?.()
        stopScroll.current = null
      },
      // Staying dirty through the reveal animation — the sprung-open rows keep shifting.
      onDisclose: cfg.disclose
        ? () => {
            invalidate()
            snap.markDirty()
          }
        : undefined,
    })
  }

  const beginRef = useRef(begin)
  beginRef.current = begin
  const beginStable = useCallback((id: string, e: ReactPointerEvent) => {
    beginRef.current(id, e)
  }, [])

  return {
    begin: beginStable,
    dragging: drag?.id ?? null,
    slot: drag?.slot ?? null,
    line: drag?.line != null ? <DropLine style={drag.line} className={spec.lineClassName} /> : null,
    ghost:
      drag?.ghost != null ? (
        <DragGhost x={drag.ghost.x} y={drag.ghost.y} label={dragged.current?.label ?? ''} />
      ) : null,
  }
}
