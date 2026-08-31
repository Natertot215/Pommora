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

// The one insertion-line drag frame: every surface that marks its drop with a line (no
// displacement) rides this over the pointer-gesture skeleton. The frame owns the shared
// lifecycle — point tracking, the frozen snapshot and its invalidations, autoscroll,
// ghost and line chrome, announcements — and the adapter passes only its drop model:
// how to measure, how a point becomes a slot, what a slot commits, and its wording.

export interface InsertionDragSpec<Slot, Snap> {
  /** Frozen geometry for the drag of `id` — taken at activation, retaken lazily after an
   *  invalidation. Null fails the resolve closed: no slot survives a vanished surface. */
  take: (id: string) => Snap | null
  /** Hit-test the snapshot at the pointer → the live slot. Null is inert — no line, no commit —
   *  which is also how a would-be noop drop declines. */
  resolve: (id: string, point: { x: number; y: number }, snap: Snap) => Slot | null
  /** The drop's effect — runs only for a live slot. */
  commit: (id: string, slot: Slot, snap: Snap) => void
  /** The insertion line's host-relative style, or null for a slot that draws none (a nest
   *  target). Omit entirely for a surface that renders its own line off `slot`. */
  lineFor?: (slot: Slot, snap: Snap) => CSSProperties | null
  /** A surface-owned inset class worn on top of the shared line chrome. */
  lineClassName?: string
  /** Ghost + announcement text, resolved once at activation. */
  label: (id: string) => string
  /** The ghost's seat: hanging at the cursor offset, anchored at the grab point, or none. */
  ghost?: 'offset' | 'grab' | 'none'
  /** The measured row for `id` — the gesture element, the grab anchor, and autoscroll's walk root. */
  rowEl: (id: string) => HTMLElement | null | undefined
  /** The gesture's scroll-invalidation target — the host the rows live in. */
  scrollTarget: () => Element | null
  /** Autoscroll's walk root where the row's own ancestry can't reach the right scroller. */
  armFrom?: () => HTMLElement | null
  /** A press on these never arms a drag, on top of the editable-core guard. */
  alsoBlock?: string
  disabled?: () => boolean
  /** A collapsed group springs open on dwell — re-aim against its shifted rows. */
  disclose?: boolean
  capture?: boolean
  swallowActiveEscape?: boolean
  /** The live list the snapshot mirrors — a change re-aims the drop mid-drag. */
  watch: unknown
}

/** The row the pointer sits on or below — the last one whose top it has passed, the first row when
 *  it sits above them all. Callers hold the non-empty precondition. */
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
  /** The frame's chrome — the line goes inside the surface's `drop-line-host`, the ghost anywhere. */
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

  // Identity-stable so a consumer's context memo doesn't churn per drag frame.
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
