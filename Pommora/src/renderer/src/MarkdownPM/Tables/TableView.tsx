// biome-ignore-all lint/suspicious/noArrayIndexKey: a Markdown table's rows, columns, and cells are
// plain strings with no identity but their position — the index IS the key.
import './widget.css'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { usePointerGesture } from '@renderer/design-system/interactions/gesture'
import { resolveScroller, startAutoScroll } from '@renderer/design-system/interactions/autoscroll'
import { Icon } from '@renderer/design-system/symbols'
import { closeActiveHoverCard } from '@renderer/Embeds/ConnectionHoverCard'
import type { Align, TableModel } from './model'
import type { TableMenuContext } from '@shared/tableMenu'
import { CellEditor } from './CellEditor'
import { StaticCell } from './cellStatic'
import { cellToDisplay } from './codec'
import { clamp } from './operations'
import { nextCell, type NavDir } from './navigate'
import type { ConnectionsApi } from '../connections'
import { hoverIntent } from '../editor/connections'

function alignClass(align: Align): string {
  return `mdpm-tbl-align-${align ?? 'left'}`
}

const RESIZE_HIT = 10

interface Geom {
  cols: { left: number; width: number }[]
  rows: { top: number; height: number }[]
}

type Axis = 'col' | 'row'
interface Drag {
  axis: Axis
  from: number
  to: number
  delta: number
}

// A live column-boundary resize: pixel-exact preview of the two adjacent columns while dragging; the dash
// counts are only recomputed + committed on release.
interface Resize {
  boundaryIndex: number
  leftPx: number
  rightPx: number
}

function shift(drag: Drag | null, axis: Axis, index: number, size: number): string | undefined {
  if (!drag || drag.axis !== axis) return undefined
  const { from, to, delta } = drag
  const t = axis === 'col' ? 'translateX' : 'translateY'
  if (index === from) return `${t}(${delta}px)`
  if (to < from && index >= to && index < from) return `${t}(${size}px)`
  if (to > from && index > from && index <= to) return `${t}(${-size}px)`
  return undefined
}

function slotAt(axis: Axis, geom: Geom, rel: number): number {
  const spans = axis === 'col' ? geom.cols : geom.rows
  for (let i = 0; i < spans.length; i++) {
    const s =
      axis === 'col'
        ? geom.cols[i].left + geom.cols[i].width
        : geom.rows[i].top + geom.rows[i].height
    if (rel < s) return i
  }
  return spans.length - 1
}

export function TableView({
  model,
  headingColumn = false,
  onCellCommit,
  onExit,
  onReorder,
  onResize,
  onAppend,
  onMenu,
  onTableDrag,
  onUndo,
  onRedo,
  connections,
}: {
  model: TableModel
  headingColumn?: boolean
  onCellCommit: (row: number, col: number, text: string) => void
  onExit: (dir: 'before' | 'after') => void
  onReorder: (axis: Axis, from: number, to: number) => boolean
  onResize: (boundaryIndex: number, dashDelta: number) => boolean
  onAppend: (axis: Axis) => void
  onMenu: (ctx: TableMenuContext) => void
  onTableDrag: (e: PointerEvent) => void
  onUndo: () => void
  onRedo: () => void
  connections?: () => ConnectionsApi | undefined
}): React.JSX.Element {
  const total =
    model.columns.reduce((sum, c) => sum + Math.max(1, c.dashes), 0) || model.columns.length
  const totalRows = model.rows.length + 1
  const cols = model.columns.length

  const wrapRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)

  // Resting cells raise the hover card — the same intent delay as the editor's own links, armed
  // by delegation off the wrap (the class gate first, per the every-mouseover hard rule). Only
  // static cells: the live cell editor carries no link behavior.
  const intent = useMemo(hoverIntent, [])
  useEffect(() => intent.cancel, [intent])
  const onLinkOver = (e: React.MouseEvent): void => {
    const api = connections?.()
    if (!api?.hover) return
    intent.cancel()
    const el = (e.target as HTMLElement).closest?.('.md-connection-resolved')
    if (!el?.closest('.mdpm-tbl-cell-static')) return
    // The rendered text is the alias when there is one, so the key comes off the span's own
    // stamp rather than from what it displays.
    const title = (el as HTMLElement).dataset.connTitle
    if (!title) return
    const res = api.resolve(title)
    if (res.status !== 'resolved' || !res.page) return
    const page = res.page
    intent.arm(() => api.hover?.(page, el))
  }
  const [geom, setGeom] = useState<Geom>({ cols: [], rows: [] })
  // A live gesture reads geometry through this ref — a mid-drag re-measure must reach it, and a
  // state binding would freeze at the pointerdown render (the cfg-ref discipline).
  const geomRef = useRef(geom)
  geomRef.current = geom
  const [drag, setDrag] = useState<Drag | null>(null)
  const [resize, setResize] = useState<Resize | null>(null)
  // `caretCoords` carries a click point to the editor so it lands the caret where you clicked (null → caret at end).
  const [active, setActive] = useState<{ row: number; col: number } | null>(null)
  const caretCoords = useRef<{ x: number; y: number } | null>(null)

  // The measure sweep reads a rect per column and per row, so it runs on the table's SHAPE, never on the
  // model's identity: a cell keystroke rebuilds the model every character, and re-measuring there is an
  // O(rows) forced layout on the highest-frequency trigger there is. Text that reflows a row still lands —
  // it changes the table's own box, which the observer below catches.
  const shape = `${model.rows.length}x${model.columns.map((c) => `${c.align}:${c.dashes}`).join('|')}`
  const measure = useCallback((): void => {
    const table = tableRef.current
    const wrap = wrapRef.current
    if (!table || !wrap) return
    const w = wrap.getBoundingClientRect()
    const headerCells = table.tHead?.rows[0]?.cells
    const colGeom = headerCells
      ? Array.from(headerCells).map((c) => {
          const b = c.getBoundingClientRect()
          return { left: b.left - w.left, width: b.width }
        })
      : []
    const allRows = [...(table.tHead?.rows ?? []), ...(table.tBodies[0]?.rows ?? [])]
    const rowGeom = allRows.map((r) => {
      const b = r.getBoundingClientRect()
      return { top: b.top - w.top, height: b.height }
    })
    setGeom({ cols: colGeom, rows: rowGeom })
  }, [])
  useLayoutEffect(() => {
    measure()
    const ro = new ResizeObserver(measure)
    if (tableRef.current) ro.observe(tableRef.current)
    return () => ro.disconnect()
  }, [shape, measure])

  // A reorder permutes row heights while leaving both the shape and the table's own box untouched, so
  // neither the sweep above nor the observer would fire — the grips and the next drop's slot math would
  // keep measuring the pre-drop rows. The drop arms this; the model landing spends it.
  const remeasure = useRef(false)

  // updateDOM re-renders in place (no re-mount), so a live drag survives the model update.
  // Clear when the model changes so the dropped item settles without holding its drag transform.
  useLayoutEffect(() => {
    setDrag(null)
    setResize(null)
    if (!remeasure.current) return
    remeasure.current = false
    measure()
  }, [model, measure])

  // One editor at a time: a pointer-down anywhere outside the table demotes the active cell back to
  // static. Cell↔cell moves go through `navigate`/`onActivate` (which set a new active), so this only
  // fires on a genuine click-away — no blur/focus race.
  useEffect(() => {
    if (!active) return
    const onDown = (e: PointerEvent): void => {
      const wrap = wrapRef.current
      if (wrap && !wrap.contains(e.target as Node)) setActive(null)
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [active])

  // Both grips ride the shared gesture skeleton: activation gate, window-bound listener trio,
  // deferred capture, Escape/pointercancel abort, teardown. The grip element is re-rendered mid-drag
  // (setDrag + the ResizeObserver on the transform reflow), which is exactly why the skeleton binds
  // its listeners on window — a capture-released grip can't strand the drag.
  const beginGesture = usePointerGesture()

  const startDrag = (e: React.PointerEvent<HTMLDivElement>, axis: Axis, index: number): void => {
    if (e.button !== 0) return // only the left button drags; a right-press falls through to the context menu
    e.preventDefault()
    const wrap = wrapRef.current
    if (!wrap) return
    // `geom` is wrap-relative and scroll-immune; the pointer is viewport-relative — so the whole
    // drag runs in wrap space. Re-basing the origin on scroll then corrects the slot AND the
    // preview delta together, and a release with no further move still resolves fresh.
    let origin = 0
    const reOrigin = (): void => {
      const b = wrap.getBoundingClientRect()
      origin = axis === 'col' ? b.left : b.top
    }
    reOrigin()
    const startRel = (axis === 'col' ? e.clientX : e.clientY) - origin
    let last = { x: e.clientX, y: e.clientY }
    let stopScroll: (() => void) | null = null
    let current: Drag = { axis, from: index, to: index, delta: 0 }
    const resolve = (): void => {
      const rel = (axis === 'col' ? last.x : last.y) - origin
      let to = slotAt(axis, geomRef.current, rel)
      if (axis === 'row') to = Math.max(1, to)
      current = { axis, from: index, to, delta: rel - startRel }
      setDrag(current)
    }
    beginGesture({
      el: e.currentTarget,
      event: e,
      onActivate: () => {
        // The scroll hook serves only the active gesture — a pending-phase scroll (trackpad
        // inertia settling under a fresh press) is caught up here, like the Detail sibling.
        reOrigin()
        setDrag(current)
        // A tall or wide table scrolls inside the editor — the edge loop reaches slots past the
        // fold, axis-matched, and the window scroll hook re-bases off its scrollBy.
        stopScroll = startAutoScroll({
          getPoint: () => last,
          scroller: resolveScroller(wrap, axis === 'col' ? 'x' : 'y'),
          dragEl: wrap,
          axis: axis === 'col' ? 'x' : 'y',
        })
        return undefined
      },
      scrollTarget: () => wrap,
      onWindowScroll: () => {
        reOrigin()
        resolve()
      },
      onDragMove: (ev) => {
        last = { x: ev.clientX, y: ev.clientY }
        resolve()
      },
      // A real reorder clears drag via the model-change effect; a no-op (same serialization) won't re-render, so clear here.
      onDrop: () => {
        if (current.to === current.from || !onReorder(axis, current.from, current.to)) setDrag(null)
        else remeasure.current = true
      },
      onAbort: () => setDrag(null),
      teardown: () => {
        stopScroll?.()
        stopScroll = null
      },
    })
  }

  // Preview is pixel-exact (override both <col> widths in px); on release we quantize the new left width
  // to whole dashes and commit one resizeColumn.
  const startResize = (e: React.PointerEvent<HTMLDivElement>, boundaryIndex: number): void => {
    if (e.button !== 0) return
    e.preventDefault()
    const i = boundaryIndex
    const leftDashes = Math.max(1, model.columns[i].dashes)
    const rightDashes = Math.max(1, model.columns[i + 1].dashes)
    const combinedDashes = leftDashes + rightDashes
    const startLeftPx = geom.cols[i]?.width ?? 0
    const startRightPx = geom.cols[i + 1]?.width ?? 0
    const combinedPx = startLeftPx + startRightPx
    if (combinedPx === 0) return
    const oneDashPx = combinedPx / combinedDashes
    const startX = e.clientX
    let leftPx = startLeftPx
    beginGesture({
      el: e.currentTarget,
      event: e,
      onActivate: () => {
        setResize({ boundaryIndex: i, leftPx: startLeftPx, rightPx: startRightPx })
        return undefined
      },
      onDragMove: (ev) => {
        const delta = clamp(
          ev.clientX - startX,
          -(startLeftPx - oneDashPx),
          startRightPx - oneDashPx,
        )
        leftPx = startLeftPx + delta
        setResize({ boundaryIndex: i, leftPx, rightPx: startRightPx - delta })
      },
      onDrop: () => {
        const newLeftDashes = clamp(Math.round(leftPx / oneDashPx), 1, combinedDashes - 1)
        const dashDelta = newLeftDashes - leftDashes
        // No change (or a no-op commit) won't re-render → clear the preview here, like reorder's onDrop.
        if (dashDelta === 0 || !onResize(i, dashDelta)) setResize(null)
      },
      onAbort: () => setResize(null),
    })
  }

  const navigate = (row: number, col: number, dir: NavDir): void => {
    const target = nextCell(totalRows, cols, row, col, dir)
    if (target === 'before' || target === 'after') {
      setActive(null)
      onExit(target)
      return
    }
    caretCoords.current = null // keyboard nav lands the caret at the end of the target cell
    setActive({ row: target.row, col: target.col })
  }

  const cell = (row: number, col: number, text: string): React.JSX.Element => {
    const display = cellToDisplay(text)
    if (active?.row === row && active.col === col) {
      return (
        <CellEditor
          initial={display}
          connections={connections}
          caretCoords={caretCoords.current}
          onCommit={(t) => onCellCommit(row, col, t)}
          onNavigate={(dir) => navigate(row, col, dir)}
          onUndo={onUndo}
          onRedo={onRedo}
        />
      )
    }
    return (
      <StaticCell
        text={display}
        connections={connections}
        onActivate={(coords) => {
          // Activation swaps the cell into its editor — a pending or open hover card over the
          // cell must not hang above the editing seat.
          intent.cancel()
          closeActiveHoverCard()
          caretCoords.current = coords
          setActive({ row, col })
        }}
      />
    )
  }

  // Grips swallow mousedown so a click on one (to drag or open the right-click menu) never pulls focus or
  // moves the editor caret to the click point — the grip is a control, not a text position.
  const swallowCaret = (e: React.MouseEvent): void => e.preventDefault()

  const colDragged = (ci: number): boolean => drag?.axis === 'col' && drag.from === ci
  const colW = (ci: number): number => geom.cols[ci]?.width ?? 0
  const rowH = (ri: number): number => geom.rows[ri]?.height ?? 0

  // While resizing, every column is sized in px (the two at the boundary from the live preview, the rest
  // from their measured widths) so the table total stays fixed; otherwise columns are dash-proportional %.
  const colWidth = (ci: number): string => {
    if (resize) {
      if (ci === resize.boundaryIndex) return `${resize.leftPx}px`
      if (ci === resize.boundaryIndex + 1) return `${resize.rightPx}px`
      return `${colW(ci)}px`
    }
    return `${(Math.max(1, model.columns[ci].dashes) / total) * 100}%`
  }

  const tableTop = geom.rows[0]?.top ?? 0
  const lastRow = geom.rows[geom.rows.length - 1]
  const tableHeight = lastRow ? lastRow.top + lastRow.height - tableTop : 0

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover-intent delegation on a container — the cells carry their own semantics
    // biome-ignore lint/a11y/useKeyWithMouseEvents: a pointer-only hover affordance; keyboard focus never reaches a resting cell
    <div
      className={`mdpm-tbl-wrap${drag ? ' mdpm-tbl-dragging' : ''}${resize ? ' mdpm-tbl-resizing' : ''}`}
      ref={wrapRef}
      onMouseOver={onLinkOver}
      onMouseOut={intent.cancel}
    >
      <table className="mdpm-tbl" ref={tableRef}>
        <colgroup>
          {model.columns.map((_, i) => (
            <col key={i} style={{ width: colWidth(i) }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {model.header.map((text, ci) => (
              <th
                key={ci}
                className={`mdpm-tbl-cell ${alignClass(model.columns[ci]?.align ?? null)}${colDragged(ci) ? ' mdpm-tbl-subject' : ''}`}
                style={{ transform: shift(drag, 'col', ci, colW(ci)) }}
              >
                {cell(0, ci, text)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {model.rows.map((row, ri) => (
            <tr
              key={ri}
              className={drag?.axis === 'row' && drag.from === ri + 1 ? 'mdpm-tbl-subject' : ''}
              style={{ transform: shift(drag, 'row', ri + 1, rowH(ri + 1)) }}
            >
              {row.map((text, ci) => (
                <td
                  key={ci}
                  className={`mdpm-tbl-cell ${alignClass(model.columns[ci]?.align ?? null)}${colDragged(ci) ? ' mdpm-tbl-subject' : ''}${headingColumn && ci === 0 ? ' mdpm-tbl-heading-col' : ''}`}
                  style={{ transform: shift(drag, 'col', ci, colW(ci)) }}
                >
                  {cell(ri + 1, ci, text)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {geom.cols.map((c, i) => (
        // biome-ignore lint/a11y/noStaticElementInteractions: a pointer-only drag affordance; keyboard reordering is not implemented
        <div
          key={`col-${i}`}
          className="mdpm-tbl-grip-zone mdpm-tbl-grip-col"
          style={{ left: c.left, width: c.width }}
          onMouseDown={swallowCaret}
          onPointerDown={(e) => startDrag(e, 'col', i)}
          onContextMenu={(e) => {
            e.preventDefault()
            onMenu({
              kind: 'column',
              index: i,
              align: model.columns[i]?.align ?? null,
              headingColumn,
            })
          }}
        >
          <Icon name="grip-horizontal" className="mdpm-tbl-grip" size="sm" strokeWidth={2} />
        </div>
      ))}
      {geom.rows.map((r, j) => (
        // biome-ignore lint/a11y/noStaticElementInteractions: a pointer-only drag affordance; keyboard reordering is not implemented
        <div
          key={`row-${j}`}
          className="mdpm-tbl-grip-zone mdpm-tbl-grip-row"
          style={{ top: r.top, height: r.height }}
          onMouseDown={swallowCaret}
          onPointerDown={(e) => (j === 0 ? onTableDrag(e.nativeEvent) : startDrag(e, 'row', j))}
          onContextMenu={(e) => {
            e.preventDefault()
            onMenu(j === 0 ? { kind: 'header', index: 0 } : { kind: 'row', index: j })
          }}
        >
          <Icon name="grip-vertical" className="mdpm-tbl-grip" size="sm" strokeWidth={2} />
        </div>
      ))}
      <button
        type="button"
        className="mdpm-tbl-add mdpm-tbl-add-col"
        style={{ top: tableTop, height: tableHeight }}
        aria-label="Add Column"
        onMouseDown={swallowCaret}
        onClick={() => onAppend('col')}
      >
        <Icon name="plus" size={14} />
      </button>
      <button
        type="button"
        className="mdpm-tbl-add mdpm-tbl-add-row"
        aria-label="Add Row"
        onMouseDown={swallowCaret}
        onClick={() => onAppend('row')}
      >
        <Icon name="plus" size={14} />
      </button>
      {geom.cols.slice(0, -1).map((c, i) => (
        // biome-ignore lint/a11y/noStaticElementInteractions: a pointer-only drag affordance; keyboard reordering is not implemented
        <div
          key={`resize-${i}`}
          className="mdpm-tbl-resize-zone"
          style={{
            left: c.left + c.width - RESIZE_HIT / 2,
            top: tableTop,
            height: tableHeight,
            width: RESIZE_HIT,
          }}
          onMouseDown={swallowCaret}
          onPointerDown={(e) => startResize(e, i)}
        />
      ))}
    </div>
  )
}
