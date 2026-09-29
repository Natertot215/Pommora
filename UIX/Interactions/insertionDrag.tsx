import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { stack } from '../Theme/stack'
import { usePointerGesture } from './gesture'
import { EDITABLE_TARGETS } from './shared'
import { DragGhost } from './DragGhost'
import { DropLine } from './DropLine'
import { armAutoScroll } from './autoscroll'
import { announce } from './a11y'
import { useLatest, useStableApi } from '../Utilities/stableApi'

interface InsertionDragSpec<Slot, Snap> {
  /** Taken at activation, retaken lazily after an invalidation. Null fails the resolve closed. */
  take: (id: string) => Snap | null
  resolve: (id: string, point: { x: number; y: number }, snap: Snap) => Slot | null
  commit: (id: string, slot: Slot, snap: Snap) => void
  lineFor?: (slot: Slot, snap: Snap) => CSSProperties | null
  label: (id: string) => string
  ghostLabel?: (id: string) => ReactNode
  rowEl: (id: string) => HTMLElement | null | undefined
  scrollTarget: () => Element | null
  armFrom?: () => HTMLElement | null
  alsoBlock?: string
  disabled?: () => boolean
  disclose?: boolean
  capture?: boolean
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
  const specRef = useLatest(spec)
  const beginGesture = usePointerGesture()
  const dragged = useRef<{ id: string; grabX: number; label: string } | null>(null)
  const lastPoint = useRef({ x: 0, y: 0 })
  const stopScroll = useRef<(() => void) | null>(null)
  const live = useRef<Slot | null>(null)
  const [drag, setDrag] = useState<DragState<Slot> | null>(null)
  const snap = useRef<Snap | null>(null)
  // The drop re-resolves while dirty, so a commit is never built against moved geometry.
  const dirty = useRef(false)

  function snapshot(): Snap | null {
    if (dirty.current || snap.current === null) {
      const next = dragged.current ? specRef.current.take(dragged.current.id) : null
      if (next === null) return null
      snap.current = next
      dirty.current = false
    }
    return snap.current
  }

  function resolveSlot(): void {
    const d = dragged.current
    if (!d) return
    const cfg = specRef.current
    const s = snapshot()
    const slot = s ? cfg.resolve(d.id, lastPoint.current, s) : null
    live.current = slot
    setDrag({
      id: d.id,
      slot,
      line: slot !== null && s !== null ? (cfg.lineFor?.(slot, s) ?? null) : null,
      ghost: { x: lastPoint.current.x - d.grabX, y: lastPoint.current.y },
    })
  }

  const invalidate = (): void => {
    dirty.current = true
    resolveSlot()
  }

  // A mid-drag list change re-renders rows; a release with no further move must still commit against the fresh slot.
  useEffect(() => {
    dirty.current = true
    if (dragged.current) resolveSlot()
  }, [spec.watch])

  const reset = (): void => {
    dragged.current = null
    live.current = null
    snap.current = null
    dirty.current = false
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
      onActivate: (ev) => {
        dragged.current = { id, grabX, label: cfg.label(id) }
        lastPoint.current = { x: ev.clientX, y: ev.clientY }
        announce(`Picked up ${dragged.current.label}.`)
        // No re-resolve callback: the loop's scrollBy raises the window scroll `onWindowScroll` already answers.
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
        if (dirty.current) resolveSlot()
        const d = dragged.current
        const slot = live.current
        const s = snapshot()
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
            dirty.current = true
          }
        : undefined,
    })
  }

  const stable = useStableApi({ begin })

  return {
    begin: stable.begin,
    dragging: drag?.id ?? null,
    slot: drag?.slot ?? null,
    line: drag?.line != null ? <DropLine style={drag.line} /> : null,
    ghost:
      drag?.ghost != null && dragged.current
        ? createPortal(
            <div
              style={{
                position: 'fixed',
                left: drag.ghost.x,
                top: drag.ghost.y,
                pointerEvents: 'none',
                zIndex: stack.top.dragOverlay,
              }}
            >
              <DragGhost>
                {specRef.current.ghostLabel?.(dragged.current.id) ?? dragged.current.label}
              </DragGhost>
            </div>,
            document.body,
          )
        : null,
  }
}
