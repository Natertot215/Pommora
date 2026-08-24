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
import { usePointerGesture } from '@renderer/DesignSystem/Interactions/gesture'
import { useDragSnapshot } from '@renderer/DesignSystem/Interactions/snapshot'
import { announce } from '@renderer/DesignSystem/Interactions/a11y'
import { EDITABLE_TARGETS, GHOST_OFFSET } from '@renderer/DesignSystem/Interactions/shared'
import { DragGhost } from '@renderer/DesignSystem/Interactions/DragGhost'
import { DropLine } from '@renderer/DesignSystem/Interactions/DropLine'
import { armAutoScroll } from '@renderer/DesignSystem/Interactions/autoscroll'
import type { MeasuredRow } from '@renderer/Sidebar/sidebarDndModel'
import { type Band, type BandIndex, type BandSlot, bandSlot, buildBandIndex } from './bandDndModel'

// Band drag — group headers reorder/reparent via the sidebar's insertion-line gesture.
// The GLYPH is the drag surface; this file owns only the gesture + the frozen snapshot +
// the line/ghost/nest chrome. The drop hands the view a CLASSIFIED commit (reorder vs reparent,
// routed by the slot's implied parent vs the dragged band's current parent) — the caller never
// re-derives it.

export type BandDrop =
  | { kind: 'reorder'; beforeId: string | null }
  | { kind: 'reparent'; targetParentId: string | null; beforeId: string | null }

type DragState = {
  id: string | null
  ghostX: number
  ghostY: number
  slot: BandSlot | null
  lineTop: number
}
const IDLE: DragState = { id: null, ghostX: 0, ghostY: 0, slot: null, lineTop: 0 }

type Value = {
  draggingId: string | null
  nestTargetId: string | null
  registerBand: (id: string, el: HTMLElement | null) => void
  begin: (id: string, e: ReactPointerEvent) => void
}
const Ctx = createContext<Value | null>(null)

export function BandDnd({
  bands,
  labelFor,
  onDrop,
  nestable = true,
  children,
}: {
  /** The visible band list (flattenBands over the live collapsed set) — snapshot state during a drag. */
  bands: Band[]
  labelFor: (id: string) => string
  onDrop: (draggedId: string, drop: BandDrop) => void
  /** Off for a surface that renders one flat level — every drop then resolves to a reorder. */
  nestable?: boolean
  children: ReactNode
}): React.JSX.Element {
  const bandsRef = useRef(bands)
  bandsRef.current = bands
  // The context memo freezes `begin` (and so the whole listener chain) from an early render — the
  // drop must reach the CALLER'S latest closure, not the one captured at bind time (the sidebar's
  // onCommitRef pattern).
  const onDropRef = useRef(onDrop)
  onDropRef.current = onDrop
  const labelForRef = useRef(labelFor)
  labelForRef.current = labelFor
  const nestableRef = useRef(nestable)
  nestableRef.current = nestable
  // Resolved ONCE at activation — labelFor walks the group tree, and the ghost re-renders per move.
  const ghostLabel = useRef('')
  const els = useRef(new Map<string, HTMLElement>())
  const box = useRef<HTMLDivElement | null>(null)
  const live = useRef<BandSlot | null>(null)
  const [drag, setDrag] = useState<DragState>(IDLE)
  // Set at ACTIVATION (a tap never sets it) — the id the hit-test + drop classification run against.
  const dragId = useRef<string | null>(null)
  const beginGesture = usePointerGesture()

  // Frozen at activation: geometry AND the band list ride one snapshot — a mid-drag tree
  // swap re-renders headers, so both go stale together and re-measure together, lazily.
  type Snapshot = { index: BandIndex; boxTop: number; boxBottom: number }
  const lastPoint = useRef({ x: 0, y: 0 })
  const stopScroll = useRef<(() => void) | null>(null)
  const snap = useDragSnapshot(takeSnapshot)
  useEffect(() => {
    snap.markDirty()
    resolveSlot()
  }, [bands])

  function takeSnapshot(): Snapshot | null {
    const el = box.current
    if (!el) return null
    const boxRect = el.getBoundingClientRect()
    const current = bandsRef.current
    const rows: MeasuredRow[] = []
    for (const b of current) {
      const headerEl = els.current.get(b.id)
      if (!headerEl) continue
      const r = headerEl.getBoundingClientRect()
      rows.push({ id: b.id, top: r.top, bottom: r.bottom, mid: r.top + r.height / 2 })
    }
    rows.sort((a, b) => a.top - b.top)
    return { index: buildBandIndex(current, rows), boxTop: boxRect.top, boxBottom: boxRect.bottom }
  }

  const registerBand = (id: string, el: HTMLElement | null): void => {
    if (el) els.current.set(id, el)
    else els.current.delete(id)
  }

  const reset = (): void => {
    dragId.current = null
    live.current = null
    snap.reset()
    setDrag(IDLE)
  }

  // Re-snapshot lazily (an invalidation dirties it) then hit-test the bands at the last point.
  // Shared by pointer move and every re-resolve, so a held-still drag keeps tracking.
  function resolveSlot(): void {
    const id = dragId.current
    if (!id) return
    const s = snap.get()
    if (!s) return
    const slot = bandSlot(s.index, lastPoint.current.y, id, s.boxBottom, nestableRef.current)
    live.current = slot
    setDrag({
      id,
      ghostX: lastPoint.current.x + GHOST_OFFSET.x,
      ghostY: lastPoint.current.y + GHOST_OFFSET.y,
      slot,
      lineTop: slot ? slot.lineY - s.boxTop : 0,
    })
  }

  const begin = (id: string, e: ReactPointerEvent): void => {
    if ((e.target as HTMLElement).closest?.(EDITABLE_TARGETS)) return
    const el = els.current.get(id)
    if (!el) return
    // The shared gesture: window listeners drive it (the glyph is small, the first move usually
    // leaves it); capture defers to activation so a sub-threshold press stays inert.
    beginGesture({
      el,
      event: e,
      onActivate: (ev) => {
        dragId.current = id
        lastPoint.current = { x: ev.clientX, y: ev.clientY }
        ghostLabel.current = labelForRef.current(id)
        announce(`Picked up ${ghostLabel.current}.`)
        // Auto-scroll the vertical scroller. findScroller('y') skips the x-only '.table-view' to
        // reach '.detail-scroll'; onScrolled re-resolves a held-still drag as the bands scroll.
        stopScroll.current = armAutoScroll(el, () => lastPoint.current, resolveSlot)
        return true
      },
      onDragMove: (ev) => {
        lastPoint.current = { x: ev.clientX, y: ev.clientY }
        resolveSlot()
      },
      scrollTarget: () => box.current,
      onWindowScroll: () => {
        snap.markDirty()
        resolveSlot()
      },
      onDrop: () => {
        if (snap.isDirty()) resolveSlot()
        const slot = live.current
        const dragged = snap.get()?.index.byId.get(id)
        if (slot && dragged) {
          const drop = onDropRef.current
          if (slot.nestInto)
            drop(id, { kind: 'reparent', targetParentId: slot.nestInto, beforeId: null })
          else if (slot.impliedParentId === dragged.parentId)
            drop(id, { kind: 'reorder', beforeId: slot.beforeId })
          else
            drop(id, {
              kind: 'reparent',
              targetParentId: slot.impliedParentId,
              beforeId: slot.beforeId,
            })
          announce(`Moved ${ghostLabel.current}.`)
        }
        reset()
      },
      onAbort: reset,
      teardown: () => {
        stopScroll.current?.()
        stopScroll.current = null
      },
      // Collapsed sibling bands (GroupBand registers each) spring open on a dwelling drag; their
      // rows shift, so re-aim the drop geometry, staying dirty through the reveal animation.
      onDisclose: () => {
        snap.markDirty()
        resolveSlot()
        snap.markDirty()
      },
    })
  }

  const value = useMemo<Value>(
    () => ({ draggingId: drag.id, nestTargetId: drag.slot?.nestInto ?? null, registerBand, begin }),
    [drag.id, drag.slot?.nestInto],
  )

  return (
    <Ctx.Provider value={value}>
      <div ref={box} className="drop-line-host">
        {children}
        {drag.slot && !drag.slot.nestInto && <DropLine style={{ top: drag.lineTop }} />}
      </div>
      <DragGhost
        x={drag.id ? drag.ghostX : null}
        y={drag.id ? drag.ghostY : null}
        label={ghostLabel.current}
      />
    </Ctx.Provider>
  )
}

/** Make a group header a band-drag participant: `ref` on the header (the measured row), `handle`
 *  spread on the GLYPH — the only drag surface. `isNestTarget` highlights a hovered nest zone. */
export function useBandDrag(id: string): {
  ref: (el: HTMLElement | null) => void
  handle: { onPointerDown: (e: ReactPointerEvent) => void }
  isDragging: boolean
  isNestTarget: boolean
} {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useBandDrag must be used inside <BandDnd>')
  return {
    ref: (el) => ctx.registerBand(id, el),
    handle: { onPointerDown: (e) => ctx.begin(id, e) },
    isDragging: ctx.draggingId === id,
    isNestTarget: ctx.nestTargetId === id,
  }
}
