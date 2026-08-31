import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { useInsertionDrag } from '@renderer/DesignSystem/Interactions/insertionDrag'
import type { MeasuredRow } from '@renderer/Sidebar/sidebarDndModel'
import {
  type PaneDrop,
  type FrameRow,
  type FrameSlot,
  type Region,
  frameSlot,
} from './frameDndModel'
import * as s from './frames.css'

type Snapshot = {
  rows: MeasuredRow[]
  byId: Map<string, FrameRow>
  regions: { assigned: Region; all: Region }
  boxTop: number
}
type Slot = FrameSlot & { topInBox: number | null }

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
  const els = useRef(new Map<string, HTMLElement>())
  const regionEls = useRef<{ assigned: HTMLElement | null; all: HTMLElement | null }>({
    assigned: null,
    all: null,
  })
  const box = useRef<HTMLDivElement | null>(null)

  const drag = useInsertionDrag<Slot, Snapshot>({
    // Row geometry, the row set, and the region rects ride one snapshot. A vanished region fails
    // the resolve closed — a stale slot must not survive to the drop.
    take: () => {
      const boxEl = box.current
      const assignedEl = regionEls.current.assigned
      const allEl = regionEls.current.all
      if (!boxEl || !assignedEl || !allEl) return null
      const byId = new Map(rows.map((r) => [r.id, r]))
      const measured: MeasuredRow[] = []
      for (const row of rows) {
        const el = els.current.get(row.id)
        if (!el) continue
        const r = el.getBoundingClientRect()
        measured.push({ id: row.id, top: r.top, bottom: r.bottom, mid: r.top + r.height / 2 })
      }
      measured.sort((a, b) => a.top - b.top)
      const boxRect = boxEl.getBoundingClientRect()
      const assignedRect = assignedEl.getBoundingClientRect()
      const allRect = allEl.getBoundingClientRect()
      // Regions own their FIELD, not just their rendered rows: assigned runs down to the All
      // Properties heading, and the all region runs to the frame's bottom edge — the empty space
      // around short lists is a legal drop zone, never a dead no-op.
      return {
        rows: measured,
        byId,
        regions: {
          assigned: { top: assignedRect.top, bottom: allRect.top },
          all: { top: allRect.top, bottom: Math.max(allRect.bottom, boxRect.bottom) },
        },
        boxTop: boxRect.top,
      }
    },
    resolve: (id, point, snap) => {
      const liveSlot = slot(snap.rows, snap.byId, snap.regions, point.y, id)
      return liveSlot
        ? { ...liveSlot, topInBox: liveSlot.lineY != null ? liveSlot.lineY - snap.boxTop : null }
        : null
    },
    commit: (_id, slot) => onDrop(slot.drop),
    lineFor: (slot) => (slot.topInBox != null ? { top: slot.topInBox } : null),
    label: labelFor,
    rowEl: (id) => els.current.get(id),
    scrollTarget: () => box.current,
    armFrom: () => box.current,
    // `button` beyond the shared guard: a row's +, the outline, and rename inputs never arm a drag.
    alsoBlock: 'button',
    // An active drag's Escape must cancel the DRAG, not let the Toolbar's useDismiss close the
    // whole menu; a sub-threshold press leaves Escape to the host.
    swallowActiveEscape: true,
    watch: rows,
  })

  const registerRow = (id: string, el: HTMLElement | null): void => {
    if (el) els.current.set(id, el)
    else els.current.delete(id)
  }
  const registerRegion = (group: FrameRow['group'], el: HTMLElement | null): void => {
    regionEls.current[group] = el
  }

  const value = useMemo<Value>(
    () => ({
      draggingId: drag.dragging,
      allHighlighted: drag.slot?.highlightAll ?? false,
      registerRow,
      registerRegion,
      begin: drag.begin,
    }),
    [drag.dragging, drag.slot?.highlightAll, drag.begin],
  )

  return (
    <Ctx.Provider value={value}>
      <div ref={box} className={cx('drop-line-host', s.frameDnd)}>
        {children}
        {drag.line}
      </div>
      {drag.ghost}
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
