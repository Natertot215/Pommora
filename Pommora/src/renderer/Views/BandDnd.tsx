import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { useInsertionDrag } from '@renderer/DesignSystem/Interactions/insertionDrag'
import type { MeasuredRow } from '@renderer/Sidebar/sidebarDndModel'
import { type Band, type BandIndex, type BandSlot, bandSlot, buildBandIndex } from './bandDndModel'

// Band drag — group headers reorder/reparent via the shared insertion-line frame. The GLYPH is the
// drag surface; this file owns only the snapshot and the drop classification (reorder vs reparent,
// routed by the slot's implied parent vs the dragged band's current parent) — the caller never
// re-derives it.

export type BandDrop =
  | { kind: 'reorder'; beforeId: string | null }
  | { kind: 'reparent'; targetParentId: string | null; beforeId: string | null }

type Snapshot = { index: BandIndex; boxTop: number; boxBottom: number }
type Slot = BandSlot & { topInBox: number }

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
  const els = useRef(new Map<string, HTMLElement>())
  const box = useRef<HTMLDivElement | null>(null)

  const drag = useInsertionDrag<Slot, Snapshot>({
    // Geometry AND the band list ride one snapshot — a mid-drag tree swap re-renders headers, so
    // both go stale together and re-measure together, lazily.
    take: () => {
      const el = box.current
      if (!el) return null
      const boxRect = el.getBoundingClientRect()
      const rows: MeasuredRow[] = []
      for (const b of bands) {
        const headerEl = els.current.get(b.id)
        if (!headerEl) continue
        const r = headerEl.getBoundingClientRect()
        rows.push({ id: b.id, top: r.top, bottom: r.bottom, mid: r.top + r.height / 2 })
      }
      rows.sort((a, b) => a.top - b.top)
      return {
        index: buildBandIndex(bands, rows),
        boxTop: boxRect.top,
        boxBottom: boxRect.bottom,
      }
    },
    resolve: (id, point, s) => {
      const slot = bandSlot(s.index, point.y, id, s.boxBottom, nestable)
      return slot ? { ...slot, topInBox: slot.lineY - s.boxTop } : null
    },
    commit: (id, slot) => {
      const dragged = bands.find((b) => b.id === id)
      if (!dragged) return
      const drop = onDrop
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
    },
    lineFor: (slot) => (slot.nestInto ? null : { top: slot.topInBox }),
    label: labelFor,
    rowEl: (id) => els.current.get(id),
    scrollTarget: () => box.current,
    disclose: true,
    watch: bands,
  })

  const registerBand = (id: string, el: HTMLElement | null): void => {
    if (el) els.current.set(id, el)
    else els.current.delete(id)
  }

  const value = useMemo<Value>(
    () => ({
      draggingId: drag.dragging,
      nestTargetId: drag.slot?.nestInto ?? null,
      registerBand,
      begin: drag.begin,
    }),
    [drag.dragging, drag.slot?.nestInto, drag.begin],
  )

  return (
    <Ctx.Provider value={value}>
      <div ref={box} className="drop-line-host">
        {children}
        {drag.line}
      </div>
      {drag.ghost}
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
