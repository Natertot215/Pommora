import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { nearestByTop, useInsertionDrag } from '@renderer/DesignSystem/Interactions/insertionDrag'
import { sectionEnd, type OutlineHeading } from '@renderer/MarkdownPM/Editor/folding'
import { moveHeadingSection } from '../Interface/pageEditor'

// A flat insertion line marks the drop — the outline re-nests the moved section by level once the
// document edit lands, so no depth-indented line is needed.
const LINE_INSET_RIGHT = 12
const LINE_INSET_LEFT = 8

const EMPTY_SECTION: ReadonlySet<string> = new Set()

type MeasuredRow = { key: string; top: number; bottom: number; mid: number }
type Snapshot = { contentTop: number; measured: MeasuredRow[] }
type Slot = { beforeKey: string | null; lineY: number }

type Value = {
  section: ReadonlySet<string>
  registerRow: (key: string, el: HTMLElement | null) => void
  begin: (key: string, e: ReactPointerEvent) => void
}
const Ctx = createContext<Value | null>(null)

/** The section (in document order) a heading owns: itself plus every heading down to the next one of
 *  equal-or-higher level — the run that moves as one and is excluded from the drop hit-test. */
function sectionKeys(flat: OutlineHeading[], key: string): Set<string> {
  const h = flat.findIndex((x) => x.key === key)
  if (h < 0) return new Set([key])
  return new Set(flat.slice(h, sectionEnd(flat, h)).map((x) => x.key))
}

export function OutlineDnd({
  flat,
  children,
}: {
  flat: OutlineHeading[]
  children: ReactNode
}): React.JSX.Element {
  const flatRef = useRef(flat)
  flatRef.current = flat
  const rows = useRef(new Map<string, HTMLElement>())
  const contentRef = useRef<HTMLDivElement | null>(null)

  const drag = useInsertionDrag<Slot, Snapshot>({
    // The dragged section's own rows are excluded so they never become their own drop target.
    take: (key) => {
      const content = contentRef.current
      if (!content) return null
      const section = sectionKeys(flatRef.current, key)
      const contentTop = content.getBoundingClientRect().top
      const measured: MeasuredRow[] = []
      for (const [rowKey, el] of rows.current) {
        if (section.has(rowKey)) continue
        const r = el.getBoundingClientRect()
        measured.push({ key: rowKey, top: r.top, bottom: r.bottom, mid: r.top + r.height / 2 })
      }
      measured.sort((a, b) => a.top - b.top)
      return { contentTop, measured }
    },
    resolve: (key, point, s) => {
      if (s.measured.length === 0) return null
      const flat = flatRef.current
      const h = flat.findIndex((x) => x.key === key)
      if (h < 0) return null
      const end = sectionEnd(flat, h)
      const over = nearestByTop(s.measured, point.y)
      const o = flat.findIndex((x) => x.key === over.key)
      if (o < 0) return null
      const below = point.y >= over.mid
      // Insert index in the ORIGINAL flat coordinates. `over` is outside the section, so this lands
      // on one of the section's own edges (a no-op, declined here) or clear of it.
      const insertIdx = below ? o + 1 : o
      if (insertIdx === h || insertIdx === end) return null
      return {
        beforeKey: insertIdx < flat.length ? flat[insertIdx].key : null,
        lineY: (below ? over.bottom : over.top) - s.contentTop,
      }
    },
    commit: (key, slot) => moveHeadingSection(key, slot.beforeKey),
    lineFor: (slot) => ({ top: slot.lineY, left: LINE_INSET_LEFT, right: LINE_INSET_RIGHT }),
    label: (key) => flatRef.current.find((x) => x.key === key)?.text ?? '',
    ghost: 'grab',
    rowEl: (key) => rows.current.get(key),
    scrollTarget: () => contentRef.current,
    // The outline dropdown owns Escape (it stays open until Esc or a re-press) — swallow the
    // drag-cancel Escape so a mid-drag abort doesn't also close the pane.
    swallowActiveEscape: true,
    watch: flat,
  })

  const registerRow = (key: string, el: HTMLElement | null): void => {
    if (el) rows.current.set(key, el)
    else rows.current.delete(key)
  }

  const value = useMemo<Value>(
    () => ({
      section: drag.dragging ? sectionKeys(flatRef.current, drag.dragging) : EMPTY_SECTION,
      registerRow,
      begin: drag.begin,
    }),
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

/** Put `ref` on the row element and spread `handle` on it — a press starts the section drag; a click
 *  or a right-press falls through to the row's own jump / rename. */
export function useOutlineDrag(key: string): {
  ref: (el: HTMLElement | null) => void
  handle: { onPointerDown: (e: ReactPointerEvent) => void }
  isDragging: boolean
} {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useOutlineDrag must be used inside <OutlineDnd>')
  return {
    ref: (el) => ctx.registerRow(key, el),
    handle: { onPointerDown: (e) => ctx.begin(key, e) },
    isDragging: ctx.section.has(key),
  }
}
