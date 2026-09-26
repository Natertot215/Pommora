import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { rowDropLine } from '@pommora/uix/Menus'
import { useInsertionDrag } from '@pommora/uix/Interactions/insertionDrag'
import { toBox, useEscort } from '@pommora/uix/Interactions/drag'
import type { MeasuredRow } from '@pommora/uix/Interactions/reorderModel'
import { TAB_FAMILY } from '@pommora/core/Navigation/navRef'
import { titleFromPath } from '@pommora/core/Paths/posix'
import { useSession } from '../../Session/store'
import type { MutateRequest } from '@pommora/core/Nexus/mutateRequest'
import {
  sidebarSlot,
  sidebarSnapshot,
  type Index,
  type SidebarSlot,
  type SidebarSnapshot,
} from './sidebarDndModel'

type Snapshot = SidebarSnapshot & { boxTop: number }

type Value = {
  draggingId: string | null
  registerRow: (id: string, el: HTMLElement | null) => void
  rowEl: (id: string) => HTMLElement | undefined
  begin: (id: string, e: ReactPointerEvent) => void
}
const Ctx = createContext<Value | null>(null)

export function SidebarDnd({
  index,
  onCommit,
  children,
}: {
  index: Index
  onCommit: (commit: MutateRequest, id: string) => void
  children: ReactNode
}): React.JSX.Element {
  const rows = useRef(new Map<string, HTMLElement>())
  const rowEl = (id: string): HTMLElement | undefined => rows.current.get(id)
  const contentRef = useRef<HTMLDivElement | null>(null)

  const escort = useEscort()

  const drag = useInsertionDrag<SidebarSlot, Snapshot>({
    // Measured once at drag activation, not per pointermove: no row displaces mid-drag, so frozen rects stay valid until a scroll or tree swap invalidates.
    take: (excludeId) => {
      const content = contentRef.current
      if (!content) return null
      const boxTop = content.getBoundingClientRect().top
      const measured: MeasuredRow[] = []
      let draggedRow: MeasuredRow | undefined
      for (const [rowId, el] of rows.current) {
        const r = el.getBoundingClientRect()
        const top = r.top - boxTop
        const row = { id: rowId, top, bottom: top + r.height, mid: top + r.height / 2 }
        if (rowId === excludeId) draggedRow = row
        else measured.push(row)
      }
      measured.sort((a, b) => a.top - b.top)
      const prefs = useSession.getState().personalization
      const snapshot = sidebarSnapshot(index, prefs, excludeId, measured, draggedRow)
      return snapshot && { ...snapshot, boxTop }
    },
    resolve: (_id, point, s) => sidebarSlot(s, point.y - s.boxTop),
    escort,
    escortSpec: (id, rect) => {
      const entry = index.byId.get(id)
      const content = contentRef.current
      const item =
        entry?.kind === 'page'
          ? { kind: 'page', id, path: entry.path }
          : entry?.kind === 'space'
            ? { kind: 'space', id }
            : null
      return item && content ? { id, family: TAB_FAMILY, item, rect, home: toBox(content) } : null
    },
    commit: (id, slot) => onCommit(slot.commit, id),
    lineFor: (slot) => ({ top: slot.lineY, ...rowDropLine(slot.depth) }),
    label: (rowId) => titleFromPath(index.byId.get(rowId)?.path ?? ''),
    ghost: 'grab',
    rowEl,
    scrollTarget: () => contentRef.current,
    disclose: true,
    watch: index,
  })

  const registerRow = (id: string, el: HTMLElement | null): void => {
    if (el) rows.current.set(id, el)
    else rows.current.delete(id)
  }

  const value = useMemo<Value>(
    () => ({ draggingId: drag.dragging, registerRow, rowEl, begin: drag.begin }),
    [drag.dragging, drag.begin],
  )

  return (
    <Ctx.Provider value={value}>
      <div ref={contentRef} className="drop-line-host">
        {children}
        {drag.line}
      </div>
      {drag.ghost}
    </Ctx.Provider>
  )
}

export function useSidebarRowEl(): (id: string) => HTMLElement | undefined {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSidebarRowEl must be used inside <SidebarDnd>')
  return ctx.rowEl
}

export function useSidebarDrag(id: string): {
  ref: (el: HTMLElement | null) => void
  handle: { onPointerDown: (e: ReactPointerEvent) => void }
  isDragging: boolean
} {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSidebarDrag must be used inside <SidebarDnd>')
  return {
    ref: (el) => ctx.registerRow(id, el),
    handle: { onPointerDown: (e) => ctx.begin(id, e) },
    isDragging: ctx.draggingId === id,
  }
}
