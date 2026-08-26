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
import { DROP_LINE_INSET } from '@renderer/DesignSystem/Interactions/shared'
import { DropLine } from '@renderer/DesignSystem/Interactions/DropLine'
import { armAutoScroll } from '@renderer/DesignSystem/Interactions/autoscroll'

// Table row drag — the sidebar drop-line gesture: an accent insertion LINE marks the exact slot,
// the picked-up row mutes in place (--state-ghost), and NO row displaces. Where you drop disambiguates:
// a slot inside the dragged row's own group reorders it (viewOrders); a slot in another group
// reassigns the grouped property (setProperty). The commits live in TableView and are passed in — this
// file owns only the gesture + hit-testing + the line. The cursor ghost is omitted.

type Slot = { lineY: number; left: number; width: number; commit: () => void; noop: boolean }
type MeasuredRow = {
  id: string
  top: number
  bottom: number
  mid: number
  left: number
  contentRight: number
  group: string
}
type DragState = { id: string | null; slot: Slot | null }
const IDLE: DragState = { id: null, slot: null }

type Value = {
  draggingId: string | null
  registerRow: (id: string, el: HTMLElement | null) => void
  begin: (id: string, e: ReactPointerEvent) => void
}
const Ctx = createContext<Value | null>(null)

export function TableRowDnd({
  rows,
  disabled,
  canReorderWithin,
  canReassign,
  canRelocate = false,
  reorderTo,
  reassign,
  relocate = () => {},
  children,
}: {
  /** The flat visible data-row order + each row's group key. */
  rows: { id: string; groupKey: string }[]
  disabled: boolean
  canReorderWithin: boolean
  canReassign: boolean
  /** True under plain location grouping: the bands ARE folders, so a cross-band drop MOVES the page. */
  canRelocate?: boolean
  /** Commit a within-group reorder: the new flat order of row ids + the reordered group's key (so the
   *  caller can map a structural group to its on-disk container for the page_order write) + the dragged
   *  row's id (for callers whose commit is (active, over)-shaped). */
  reorderTo: (orderIds: string[], groupKey: string, activeId: string) => void
  reassign: (activeId: string, targetGroupKey: string) => void
  relocate?: (activeId: string, targetGroupKey: string) => void
  children: ReactNode
}): React.JSX.Element {
  const rowsRef = useRef(rows)
  rowsRef.current = rows
  // The context value memoizes on drag.id, freezing `begin` (and the gesture's whole closure chain)
  // at an old render — so the mutable config rides a per-render ref, the rowsRef/commitBandRef
  // discipline: a drop always commits through the CURRENT props, never a mount-time snapshot.
  const cfg = useRef({
    disabled,
    canReorderWithin,
    canReassign,
    canRelocate,
    reorderTo,
    reassign,
    relocate,
  })
  cfg.current = {
    disabled,
    canReorderWithin,
    canReassign,
    canRelocate,
    reorderTo,
    reassign,
    relocate,
  }
  const els = useRef(new Map<string, HTMLElement>())
  const content = useRef<HTMLDivElement | null>(null)
  const live = useRef<Slot | null>(null)
  // Cached row geometry for the active drag — never a rect read per pointer move.
  type Snapshot = { rows: MeasuredRow[]; boxTop: number; boxLeft: number }
  const lastPoint = useRef({ x: 0, y: 0 })
  const stopScroll = useRef<(() => void) | null>(null)
  const snap = useDragSnapshot(measure)
  // A rows change re-resolves immediately — a push followed by a release with no further move
  // must still commit against the live rows. resolveSlot no-ops while no drag is armed.
  useEffect(() => {
    snap.markDirty()
    resolveSlot(lastPoint.current.y)
  }, [rows])
  const [drag, setDrag] = useState<DragState>(IDLE)
  // Set at ACTIVATION (a tap never sets it) — the id the hit-test + commits run against.
  const dragId = useRef<string | null>(null)
  const beginGesture = usePointerGesture()

  const registerRow = (id: string, el: HTMLElement | null): void => {
    if (el) els.current.set(id, el)
    else els.current.delete(id)
  }

  // Snapshot every row's geometry ONCE — the drop-line DnD never displaces a row, so a live per-move
  // getBoundingClientRect over every row (a forced reflow × N rows per pointer event) is pure waste.
  // The dragged row is left out — it's never a drop target.
  function measure(): Snapshot | null {
    const box = content.current
    const excludeId = dragId.current
    if (!box || !excludeId) return null
    const boxRect = box.getBoundingClientRect()
    const rows: MeasuredRow[] = []
    for (const r of rowsRef.current) {
      if (r.id === excludeId) continue
      const el = els.current.get(r.id)
      if (!el) continue
      const rect = el.getBoundingClientRect()
      // End the line at the content edge (where the columns stop), not the full row — the row spans the
      // trailing 1fr filler too, so rect.right would run the line into the empty gutter past the last column.
      const filler = el.querySelector('.cell-filler')
      const contentRight = filler ? filler.getBoundingClientRect().left : rect.right
      rows.push({
        id: r.id,
        top: rect.top,
        bottom: rect.bottom,
        mid: rect.top + rect.height / 2,
        left: rect.left,
        contentRight,
        group: r.groupKey,
      })
    }
    rows.sort((a, b) => a.top - b.top)
    return { rows, boxTop: boxRect.top, boxLeft: boxRect.left }
  }

  // Hit-test the snapshot → the landing slot. The nearest row + which half the cursor is in fixes the
  // slot; that row's group is the target group (drop above row R or below it, the slot sits in R's group
  // either way).
  const computeSlot = (clientY: number): Slot | null => {
    const id = dragId.current
    const s = snap.get()
    if (!id || !s) return null
    const activeGroup = rowsRef.current.find((r) => r.id === id)?.groupKey
    if (activeGroup === undefined) return null
    const measured = s.rows
    if (measured.length === 0) return null

    let near = measured[0]
    for (const m of measured) {
      if (clientY >= m.top) near = m
      else break
    }
    const above = clientY < near.mid
    const targetGroup = near.group
    const lineY = (above ? near.top : near.bottom) - s.boxTop
    const left = near.left - s.boxLeft + DROP_LINE_INSET
    const width = near.contentRight - near.left - DROP_LINE_INSET * 2

    if (targetGroup === activeGroup) {
      if (!cfg.current.canReorderWithin) return null
      const order = rowsRef.current.map((x) => x.id)
      const beforeId = above ? near.id : (order[order.indexOf(near.id) + 1] ?? null)
      const without = order.filter((x) => x !== id)
      const idx = beforeId ? without.indexOf(beforeId) : without.length
      const next = [...without.slice(0, idx), id, ...without.slice(idx)]
      const noop = next.length === order.length && next.every((x, i) => x === order[i])
      return {
        lineY,
        left,
        width,
        noop,
        commit: () => cfg.current.reorderTo(next, activeGroup, id),
      }
    }
    // A drop in a DIFFERENT band: under location grouping the bands are folders (move the page);
    // under a reassignable property grouping it rewrites the grouped value; otherwise it's inert.
    if (cfg.current.canRelocate)
      return {
        lineY,
        left,
        width,
        noop: false,
        commit: () => cfg.current.relocate(id, targetGroup),
      }
    if (!cfg.current.canReassign) return null
    return {
      lineY,
      left,
      width,
      noop: false,
      commit: () => cfg.current.reassign(id, targetGroup),
    }
  }

  const reset = (): void => {
    dragId.current = null
    live.current = null
    snap.reset()
    setDrag(IDLE)
  }

  // Hit-test at a Y → the slot + line. Shared by pointer move and every re-resolve — a pointer
  // move reads the cache (rows don't displace mid-drag), an invalidation re-measures once.
  const resolveSlot = (clientY: number): void => {
    const id = dragId.current
    if (!id) return
    const slot = computeSlot(clientY)
    live.current = slot
    setDrag({ id, slot })
  }

  const begin = (id: string, e: ReactPointerEvent): void => {
    if (cfg.current.disabled) return
    const el = els.current.get(id)
    if (!el) return
    // The shared gesture listens on window, not the row: the grip sits out in the gutter, so a
    // first move drifting off the row must still activate. Capture defers to activation (a tap
    // keeps its row-select click).
    beginGesture({
      el,
      event: e,
      onActivate: (ev) => {
        dragId.current = id
        lastPoint.current = { x: ev.clientX, y: ev.clientY }
        announce('Picked up row.')
        // Auto-scroll the vertical scroller. findScroller('y') is load-bearing: it SKIPS the x-only
        // '.table-view' to reach '.detail-scroll'. No onScrolled — the window scroll hook below
        // already re-resolves off the module's scrollBy.
        stopScroll.current = armAutoScroll(el, () => lastPoint.current)
        return true
      },
      scrollTarget: () => content.current,
      onWindowScroll: () => {
        snap.markDirty()
        resolveSlot(lastPoint.current.y)
      },
      onDragMove: (ev) => {
        lastPoint.current = { x: ev.clientX, y: ev.clientY }
        resolveSlot(ev.clientY)
      },
      onDrop: () => {
        if (snap.isDirty()) resolveSlot(lastPoint.current.y)
        const slot = live.current
        if (slot && !slot.noop) {
          slot.commit()
          announce('Moved row.')
        }
        reset()
      },
      onAbort: reset,
      teardown: () => {
        stopScroll.current?.()
        stopScroll.current = null
      },
      // A dwelling drag springs a collapsed band open; its rows shift, so re-aim the drop geometry
      // against them, staying dirty through the reveal animation.
      onDisclose: () => {
        snap.markDirty()
        resolveSlot(lastPoint.current.y)
        snap.markDirty()
      },
    })
  }

  const value = useMemo<Value>(() => ({ draggingId: drag.id, registerRow, begin }), [drag.id])

  return (
    <Ctx.Provider value={value}>
      <div ref={content} className="drop-line-host">
        {children}
        {/* A noop slot draws nothing: the line promises a move, and the release commits only where the
            slot differs from the row's own position. */}
        {drag.slot && !drag.slot.noop && (
          <DropLine
            style={{
              top: drag.slot.lineY,
              left: drag.slot.left,
              width: drag.slot.width,
              right: 'auto',
            }}
          />
        )}
      </div>
    </Ctx.Provider>
  )
}

/** Make a data row draggable + registered for hit-testing: put `ref` on the row, spread `handle` on the
 *  grip. `isDragging` mutes the row in place. */
export function useTableRowDrag(id: string): {
  ref: (el: HTMLElement | null) => void
  handle: { onPointerDown: (e: ReactPointerEvent) => void }
  isDragging: boolean
} {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTableRowDrag must be used inside <TableRowDnd>')
  return {
    ref: (el) => ctx.registerRow(id, el),
    handle: { onPointerDown: (e) => ctx.begin(id, e) },
    isDragging: ctx.draggingId === id,
  }
}
