import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { usePointerGesture } from '@renderer/DesignSystem/Interactions/gesture'
import { useDragSnapshot } from '@renderer/DesignSystem/Interactions/snapshot'
import { EDITABLE_TARGETS, GHOST_OFFSET } from '@renderer/DesignSystem/Interactions/shared'
import { DragGhost } from '@renderer/DesignSystem/Interactions/DragGhost'
import { DropLine } from '@renderer/DesignSystem/Interactions/DropLine'
import { armAutoScroll } from '@renderer/DesignSystem/Interactions/autoscroll'
import { announce } from '@renderer/DesignSystem/Interactions/a11y'
import type { MeasuredRow } from '@renderer/Sidebar/sidebarDndModel'
import {
  type PaneDrop,
  type FrameRow,
  type FrameSlot,
  type Region,
  frameSlot,
} from './frameDndModel'
import * as s from './frames.css'

// The capped slot auto-scrolls at the edges, and any scroll dirties the frozen snapshot.

type DragState = {
  id: string | null
  ghostX: number
  ghostY: number
  slot: FrameSlot | null
  lineTop: number
}
const IDLE: DragState = { id: null, ghostX: 0, ghostY: 0, slot: null, lineTop: 0 }

type Value = {
  draggingId: string | null
  allHighlighted: boolean
  registerRow: (id: string, el: HTMLElement | null) => void
  registerRegion: (group: FrameRow['group'], el: HTMLElement | null) => void
  begin: (id: string, e: ReactPointerEvent) => void
}
const Ctx = createContext<Value | null>(null)

export function FrameDnd({
  rows,
  labelFor,
  onDrop,
  slot = frameSlot,
  children,
}: {
  rows: FrameRow[]
  labelFor: (id: string) => string
  onDrop: (drop: PaneDrop) => void
  /** The region/slot semantics — defaults to the Properties frame's; the Visibility frame injects
   *  its own (hidden region inert, drag-in unhides). */
  slot?: typeof frameSlot
  children: ReactNode
}): React.JSX.Element {
  const rowsRef = useRef(rows)
  rowsRef.current = rows
  // The context memo freezes `begin` from an early render — the drop must reach the CALLER'S
  // latest closure (the onCommitRef pattern).
  const onDropRef = useRef(onDrop)
  onDropRef.current = onDrop
  const labelForRef = useRef(labelFor)
  labelForRef.current = labelFor
  const ghostLabel = useRef('')
  const els = useRef(new Map<string, HTMLElement>())
  const regionEls = useRef<{ assigned: HTMLElement | null; all: HTMLElement | null }>({
    assigned: null,
    all: null,
  })
  const box = useRef<HTMLDivElement | null>(null)
  const lastPoint = useRef({ x: 0, y: 0 })
  const stopScroll = useRef<(() => void) | null>(null)
  const live = useRef<FrameSlot | null>(null)
  const [drag, setDrag] = useState<DragState>(IDLE)
  const beginGesture = usePointerGesture()

  // Frozen at activation: row geometry, the row set, and the region rects ride one snapshot;
  // an invalidating scroll or rows change re-resolves from the last point.
  type Snapshot = {
    rows: MeasuredRow[]
    byId: Map<string, FrameRow>
    regions: { assigned: Region; all: Region }
    boxTop: number
  }
  const draggedId = useRef<string | null>(null)
  const snap = useDragSnapshot(takeSnapshot)
  useEffect(() => {
    snap.markDirty()
    if (draggedId.current) resolveSlot(draggedId.current, lastPoint.current.y)
  }, [rows])

  function takeSnapshot(): Snapshot | null {
    const boxEl = box.current
    const assignedEl = regionEls.current.assigned
    const allEl = regionEls.current.all
    if (!boxEl || !assignedEl || !allEl) return null
    const byId = new Map(rowsRef.current.map((r) => [r.id, r]))
    const measured: MeasuredRow[] = []
    for (const row of rowsRef.current) {
      const el = els.current.get(row.id)
      if (!el) continue
      const r = el.getBoundingClientRect()
      measured.push({ id: row.id, top: r.top, bottom: r.bottom, mid: r.top + r.height / 2 })
    }
    measured.sort((a, b) => a.top - b.top)
    const boxRect = boxEl.getBoundingClientRect()
    const assignedRect = assignedEl.getBoundingClientRect()
    const allRect = allEl.getBoundingClientRect()
    // Regions own their FIELD, not just their rendered rows: assigned runs down
    // to the All Properties heading, and the all region runs to the frame's bottom edge — the
    // empty space around short lists is a legal drop zone, never a dead no-op.
    return {
      rows: measured,
      byId,
      regions: {
        assigned: { top: assignedRect.top, bottom: allRect.top },
        all: { top: allRect.top, bottom: Math.max(allRect.bottom, boxRect.bottom) },
      },
      boxTop: boxRect.top,
    }
  }

  const registerRow = (id: string, el: HTMLElement | null): void => {
    if (el) els.current.set(id, el)
    else els.current.delete(id)
  }
  const registerRegion = (group: FrameRow['group'], el: HTMLElement | null): void => {
    regionEls.current[group] = el
  }

  const reset = (): void => {
    live.current = null
    draggedId.current = null
    snap.reset()
    setDrag(IDLE)
  }

  // Snapshot (lazily, when an invalidation dirtied it) then hit-test the frame at a Y. Shared by
  // pointer move and every re-resolve, so a held-still drag keeps updating as content moves.
  const resolveSlot = (id: string, clientY: number): void => {
    const s = snap.get()
    if (!s) {
      // Nothing measurable — a region unmounted mid-drag. A stale slot must not survive to the
      // drop, so the resolve fails closed.
      live.current = null
      return
    }
    const liveSlot = slot(s.rows, s.byId, s.regions, clientY, id)
    live.current = liveSlot
    setDrag({
      id,
      ghostX: lastPoint.current.x + GHOST_OFFSET.x,
      ghostY: clientY + GHOST_OFFSET.y,
      slot: liveSlot,
      lineTop: liveSlot?.lineY != null ? liveSlot.lineY - s.boxTop : 0,
    })
  }

  const begin = (id: string, e: ReactPointerEvent): void => {
    // `button` beyond the band guard: a row's +, the outline, and rename inputs never arm a drag.
    if ((e.target as HTMLElement).closest?.(`button, ${EDITABLE_TARGETS}`)) return
    const el = els.current.get(id)
    if (!el) return
    // swallowActiveEscape: an active drag's Escape must cancel the DRAG, not let the Toolbar's
    // useDismiss close the whole menu; a sub-threshold press leaves Escape to the host.
    beginGesture({
      el,
      event: e,
      swallowActiveEscape: true,
      onActivate: (ev) => {
        draggedId.current = id
        lastPoint.current = { x: ev.clientX, y: ev.clientY }
        ghostLabel.current = labelForRef.current(id)
        announce(`Picked up ${ghostLabel.current}.`)
        stopScroll.current = armAutoScroll(
          box.current,
          () => lastPoint.current,
          () => resolveSlot(id, lastPoint.current.y),
        )
        return true
      },
      scrollTarget: () => box.current,
      onWindowScroll: () => {
        snap.markDirty()
        resolveSlot(id, lastPoint.current.y)
      },
      onDragMove: (ev) => {
        lastPoint.current = { x: ev.clientX, y: ev.clientY }
        resolveSlot(id, ev.clientY)
      },
      onDrop: () => {
        if (snap.isDirty()) resolveSlot(id, lastPoint.current.y)
        const liveSlot = live.current
        if (liveSlot) {
          onDropRef.current(liveSlot.drop)
          announce(`Moved ${ghostLabel.current}.`)
        }
        reset()
      },
      onAbort: reset,
      teardown: () => {
        stopScroll.current?.()
        stopScroll.current = null
      },
    })
  }

  const value = useMemo<Value>(
    () => ({
      draggingId: drag.id,
      allHighlighted: drag.slot?.highlightAll ?? false,
      registerRow,
      registerRegion,
      begin,
    }),
    [drag.id, drag.slot?.highlightAll],
  )

  return (
    <Ctx.Provider value={value}>
      <div ref={box} className={cx('drop-line-host', s.frameDnd)}>
        {children}
        {drag.slot && drag.slot.lineY != null && <DropLine style={{ top: drag.lineTop }} />}
      </div>
      <DragGhost
        x={drag.id ? drag.ghostX : null}
        y={drag.id ? drag.ghostY : null}
        label={ghostLabel.current}
      />
    </Ctx.Provider>
  )
}

/** One draggable property row — the WHOLE row is the drag surface (buttons inside never arm one). */
export function RowShell({ id, children }: { id: string; children: ReactNode }): React.JSX.Element {
  const { ref, handle, isDragging } = usePaneDrag(id)
  return (
    <div ref={ref} {...handle} data-prop={id} className={cx(isDragging && s.rowDragging)}>
      {children}
    </div>
  )
}

/** `ref` + `handle` spread on the row wrapper — the WHOLE row drags (buttons/inputs inside never arm one). */
export function usePaneDrag(id: string): {
  ref: (el: HTMLElement | null) => void
  handle: { onPointerDown: (e: ReactPointerEvent) => void }
  isDragging: boolean
} {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('usePaneDrag must be used inside <FrameDnd>')
  return {
    ref: (el) => ctx.registerRow(id, el),
    handle: { onPointerDown: (e) => ctx.begin(id, e) },
    isDragging: ctx.draggingId === id,
  }
}

export function useFrameRegions(): {
  assignedRef: (el: HTMLElement | null) => void
  allRef: (el: HTMLElement | null) => void
  allHighlighted: boolean
} {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useFrameRegions must be used inside <FrameDnd>')
  return {
    assignedRef: (el) => ctx.registerRegion('assigned', el),
    allRef: (el) => ctx.registerRegion('all', el),
    allHighlighted: ctx.allHighlighted,
  }
}
