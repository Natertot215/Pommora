import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { usePointerGesture } from '@renderer/DesignSystem/Interactions/gesture'
import { useDragSnapshot } from '@renderer/DesignSystem/Interactions/snapshot'
import { EDITABLE_TARGETS } from '@renderer/DesignSystem/Interactions/shared'
import { DragGhost } from '@renderer/DesignSystem/Interactions/DragGhost'
import { DropLine } from '@renderer/DesignSystem/Interactions/DropLine'
import { armAutoScroll } from '@renderer/DesignSystem/Interactions/autoscroll'
import { sectionEnd, type OutlineHeading } from '@renderer/MarkdownPM/editor/folding'
import { moveHeadingSection } from '../Interface/pageEditor'

// A flat insertion line marks the drop; levels never change, so no depth-indented line — the outline
// re-nests the moved section by level once the document edit lands.
const LINE_INSET_RIGHT = 12
const LINE_INSET_LEFT = 8

const EMPTY_SECTION: ReadonlySet<string> = new Set()

type MeasuredRow = { key: string; top: number; bottom: number; mid: number }
type Snapshot = { contentTop: number; measured: MeasuredRow[] }
type DropTarget = { beforeKey: string | null; lineY: number; noop: boolean }
type DragState = {
  key: string | null
  ghostX: number
  ghostY: number
  label: string
  target: DropTarget | null
}
const IDLE: DragState = { key: null, ghostX: 0, ghostY: 0, label: '', target: null }

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
  const live = useRef<DropTarget | null>(null)
  const [drag, setDrag] = useState<DragState>(IDLE)
  const beginGesture = usePointerGesture()

  const dragged = useRef<{ key: string; grabX: number; section: Set<string> } | null>(null)
  const lastPoint = useRef({ x: 0, y: 0 })
  const stopScroll = useRef<(() => void) | null>(null)

  // Measured once at activation, re-taken only on scroll — never a rect read per pointer move. The
  // dragged section's own rows are excluded here so they never become their own drop target.
  const snap = useDragSnapshot<Snapshot>(() => {
    const content = contentRef.current
    const d = dragged.current
    if (!content || !d) return null
    const contentTop = content.getBoundingClientRect().top
    const measured: MeasuredRow[] = []
    for (const [key, el] of rows.current) {
      if (d.section.has(key)) continue
      const r = el.getBoundingClientRect()
      measured.push({ key, top: r.top, bottom: r.bottom, mid: r.top + r.height / 2 })
    }
    measured.sort((a, b) => a.top - b.top)
    return { contentTop, measured }
  })

  const registerRow = (key: string, el: HTMLElement | null): void => {
    if (el) rows.current.set(key, el)
    else rows.current.delete(key)
  }

  const labelOf = (key: string): string => flatRef.current.find((x) => x.key === key)?.text ?? ''

  const computeTarget = (clientY: number): DropTarget | null => {
    const d = dragged.current
    const s = snap.get()
    if (!d || !s || s.measured.length === 0) return null
    const flat = flatRef.current
    const h = flat.findIndex((x) => x.key === d.key)
    if (h < 0) return null
    const end = sectionEnd(flat, h)
    let over = s.measured[0]
    for (const m of s.measured) {
      if (clientY >= m.top) over = m
      else break
    }
    const o = flat.findIndex((x) => x.key === over.key)
    if (o < 0) return null
    const below = clientY >= over.mid
    // Insert index in the ORIGINAL flat coordinates. `over` is outside the section, so this lands on
    // one of the section's own edges (a no-op) or clear of it.
    const insertIdx = below ? o + 1 : o
    return {
      beforeKey: insertIdx < flat.length ? flat[insertIdx].key : null,
      lineY: (below ? over.bottom : over.top) - s.contentTop,
      noop: insertIdx === h || insertIdx === end,
    }
  }

  const reset = (): void => {
    dragged.current = null
    live.current = null
    snap.reset()
    setDrag(IDLE)
  }

  const resolveSlot = (): void => {
    const d = dragged.current
    if (!d) return
    const target = computeTarget(lastPoint.current.y)
    live.current = target
    setDrag({
      key: d.key,
      label: labelOf(d.key),
      ghostX: lastPoint.current.x - d.grabX,
      ghostY: lastPoint.current.y,
      target,
    })
  }

  const begin = (key: string, e: ReactPointerEvent): void => {
    if (e.button !== 0 || !e.isPrimary) return
    if ((e.target as HTMLElement).closest?.(EDITABLE_TARGETS)) return
    const el = rows.current.get(key)
    if (!el) return
    const grabX = e.clientX - el.getBoundingClientRect().left
    beginGesture({
      el,
      event: e,
      // The outline dropdown owns Escape (it stays open until Esc or a re-press) — swallow the
      // drag-cancel Escape so a mid-drag abort doesn't also close the pane.
      swallowActiveEscape: true,
      onActivate: (ev) => {
        dragged.current = { key, grabX, section: sectionKeys(flatRef.current, key) }
        lastPoint.current = { x: ev.clientX, y: ev.clientY }
        stopScroll.current = armAutoScroll(el, () => lastPoint.current, resolveSlot)
        resolveSlot()
        return true
      },
      onDragMove: (ev) => {
        lastPoint.current = { x: ev.clientX, y: ev.clientY }
        resolveSlot()
      },
      scrollTarget: () => contentRef.current,
      onWindowScroll: () => {
        snap.markDirty()
        resolveSlot()
      },
      onDrop: () => {
        if (snap.isDirty()) resolveSlot()
        const t = live.current
        if (t && !t.noop) moveHeadingSection(key, t.beforeKey)
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
    () => ({ section: dragged.current?.section ?? EMPTY_SECTION, registerRow, begin }),
    [drag.key],
  )

  return (
    <Ctx.Provider value={value}>
      <div ref={contentRef} className="drop-line-host">
        {children}
        {drag.target && !drag.target.noop && (
          <DropLine
            style={{ top: drag.target.lineY, left: LINE_INSET_LEFT, right: LINE_INSET_RIGHT }}
          />
        )}
      </div>
      <DragGhost
        x={drag.key ? drag.ghostX : null}
        y={drag.key ? drag.ghostY : null}
        label={drag.label}
      />
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
