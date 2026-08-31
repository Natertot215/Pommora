// biome-ignore-all lint/suspicious/noArrayIndexKey: a Markdown table's rows, columns, and cells are
// plain strings with no identity but their position — the index IS the key.
import './widget.css'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { usePointerGesture } from '@renderer/DesignSystem/Interactions/gesture'
import { resolveScroller, startAutoScroll } from '@renderer/DesignSystem/Interactions/autoscroll'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { closeActiveHoverCard } from '@renderer/Links/PanePresenter'
import type { Align, TableModel } from './model'
import type { TableMenuContext } from '@shared/tableMenu'
import { CellEditor } from './CellEditor'
import { StaticCell } from './cellStatic'
import { cellToDisplay } from './codec'
import { foldLabel } from '../Detect'
import { clamp } from '@renderer/DesignSystem/Util/clamp'
import { nextCell, type NavDir } from './navigate'
import type { ConnectionsApi } from '../Connections'
import { hoverIntent } from '../Editor/pointerPath'

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

export function MarkdownTable({
  model,
  cites,
  headingColumn = false,
  onCellCommit,
  onSettled,
  onExit,
  onReorder,
  onResize,
  onAppend,
  onMenu,
  onTableDrag,
  onCite,
  onUndo,
  onRedo,
  connections,
}: {
  model: TableModel
  /** The document's footnote numbering, serialized as `LABEL=n` pairs. A resting cell's marker is
   *  drawn from this rather than from its own text, which never holds the number. */
  cites?: string
  headingColumn?: boolean
  onCellCommit: (row: number, col: number, text: string) => void
  /** Fired when the cell editor demotes — the moment the static cells have to draw what was typed. */
  onSettled?: () => void
  onExit: (dir: 'before' | 'after') => void
  onReorder: (axis: Axis, from: number, to: number) => boolean
  onResize: (widths: number[]) => boolean
  onAppend: (axis: Axis) => void
  onMenu: (ctx: TableMenuContext) => void
  onTableDrag: (e: PointerEvent) => void
  /** Go to the citation a marker in a cell binds to — the page around the table owns it. */
  onCite?: (label: string) => void
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

  // One hover intent for the whole table, handed to every resting cell — the same delay the
  // editor's own links use, and one arming at a time across the grid. A cell that has become an
  // editor carries its own.
  const intent = useMemo(hoverIntent, [])
  useEffect(() => intent.cancel, [intent])
  /** Whatever the hover was about to show, or is showing, goes away — the pair every gesture that
   *  replaces the pointer's meaning owes it. */
  const dismissHoverCard = (): void => {
    intent.cancel()
    closeActiveHoverCard()
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
  // The other way a cell can be entered with a position already in mind: a link menu's Rename or
  // Edit Link, which enter it only to put the caret over what you came to replace.
  const initialSelect = useRef<[number, number] | null>(null)
  // A selection swept in from outside the table lands here rather than in the page's document: the
  // two are separate documents, so the half that reached the cell is the half a shortcut can act on.
  // Which end of the cell it anchors at is the direction the sweep came from.
  const sweepFrom = useRef<'start' | 'end' | null>(null)

  // The numbering, read back into a lookup once per change rather than per cell.
  const ordinalOf = useMemo(() => {
    const map = new Map(
      (cites ?? '')
        .split(';')
        .filter(Boolean)
        .map((pair) => {
          const [label, ordinal] = pair.split('=')
          return [label, Number(ordinal)] as const
        }),
    )
    return (label: string): number | null => map.get(foldLabel(label)) ?? null
  }, [cites])

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

  // The widget's source is rebuilt when a cell stops being the live one, never per keystroke: a live
  // cell owns its own text, and replacing the block decoration on every character makes CodeMirror
  // re-measure a block whose React content hasn't rendered yet. A cell demotes whether the table lost
  // the caret entirely or handed it to a sibling, and either way this is the first moment its static
  // form has to draw what was typed — a sibling move that skipped it would redraw the pre-edit text.
  const wasActive = useRef<{ row: number; col: number } | null>(null)
  useEffect(() => {
    const prev = wasActive.current
    wasActive.current = active
    if (prev && (prev.row !== active?.row || prev.col !== active?.col)) onSettled?.()
  }, [active, onSettled])

  // One editor at a time: a pointer-down anywhere outside the table demotes the active cell back to
  // static. Cell↔cell moves go through `navigate`/`onActivate` (which set a new active), so this only
  // fires on a genuine click-away — no blur/focus race.
  useEffect(() => {
    if (!active) return
    const onDown = (e: PointerEvent): void => {
      const wrap = wrapRef.current
      if (!wrap || wrap.contains(e.target as Node)) return
      // The autocomplete pane is a body-level portal, so it is "outside" by DOM and inside by
      // intent. Demoting the cell on a pointerdown there tears the editor down before the press
      // that picked a suggestion can reach it, and the typed characters are left dangling.
      if ((e.target as HTMLElement).closest?.('.mdpm-ac')) return
      setActive(null)
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

  // Preview is pixel-exact (override both <col> widths in px); on release the whole row is re-expressed
  // as its share of the dash scale, so the boundary keeps the pixels it was dropped on.
  const startResize = (e: React.PointerEvent<HTMLDivElement>, boundaryIndex: number): void => {
    if (e.button !== 0) return
    e.preventDefault()
    const i = boundaryIndex
    const widths = geom.cols.map((c) => c.width)
    const combinedDashes =
      Math.max(1, model.columns[i].dashes) + Math.max(1, model.columns[i + 1].dashes)
    const startLeftPx = widths[i] ?? 0
    const startRightPx = widths[i + 1] ?? 0
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
        setResize({ boundaryIndex: i, leftPx, rightPx: combinedPx - leftPx })
      },
      onDrop: () => {
        const next = widths.map((w, ci) =>
          ci === i ? leftPx : ci === i + 1 ? combinedPx - leftPx : w,
        )
        // A no-op commit won't re-render → clear the preview here, like reorder's onDrop.
        if (!onResize(next)) setResize(null)
      },
      onAbort: () => setResize(null),
      activation: 0, // a resize arms on the first move, the SurfacePM edge precedent
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
    initialSelect.current = null
    sweepFrom.current = null
    setActive({ row: target.row, col: target.col })
  }

  const cell = (row: number, col: number, text: string): React.JSX.Element => {
    const display = cellToDisplay(text)
    if (active?.row === row && active.col === col) {
      return (
        <CellEditor
          initial={display}
          connections={connections}
          ordinalOf={ordinalOf}
          caretCoords={caretCoords.current}
          initialSelect={initialSelect.current}
          sweepFrom={sweepFrom.current}
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
        cites={cites}
        ordinalOf={ordinalOf}
        connections={connections}
        onCite={onCite}
        onActivate={(coords, sweep) => {
          // Activation swaps the cell into its editor — a pending or open hover preview over the
          // cell must not hang above the editing seat.
          dismissHoverCard()
          caretCoords.current = coords
          initialSelect.current = null
          sweepFrom.current = sweep ?? null
          setActive({ row, col })
        }}
        onCommit={(t) => {
          onCellCommit(row, col, t)
          // Settling is what a demoting cell editor does, and a resting cell never had one to demote
          // — without this the widget keeps drawing the pre-edit text until something else enters and
          // leaves a cell. A menu action is one discrete edit, so it costs none of the per-keystroke
          // re-measure the deferral exists to avoid.
          onSettled?.()
        }}
        onSelect={(range) => {
          dismissHoverCard()
          caretCoords.current = null
          initialSelect.current = range
          sweepFrom.current = null
          setActive({ row, col })
        }}
        onHoverArm={intent.arm}
        onHoverLeave={intent.cancel}
        onHoverEnd={dismissHoverCard}
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
    <div
      className={`mdpm-tbl-wrap${drag ? ' mdpm-tbl-dragging' : ''}${resize ? ' mdpm-tbl-resizing' : ''}`}
      ref={wrapRef}
      // A menu is opening, so whatever the pointer was about to raise must not arrive behind it.
      // Captured, because a cell's own menu handler claims the event before it could bubble here.
      onContextMenuCapture={dismissHoverCard}
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
          <Icon name="grip-horizontal" className="mdpm-tbl-grip" size="body" strokeWidth={2} />
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
          <Icon name="grip-vertical" className="mdpm-tbl-grip" size="body" strokeWidth={2} />
        </div>
      ))}
      <button
        type="button"
        className="mdpm-tbl-add mdpm-tbl-add-col"
        style={{ top: tableTop, height: tableHeight }}
        data-create
        aria-label="Add Column"
        onMouseDown={swallowCaret}
        onClick={() => onAppend('col')}
      >
        <Icon name="plus" size="body" />
      </button>
      <button
        type="button"
        className="mdpm-tbl-add mdpm-tbl-add-row"
        data-create
        aria-label="Add Row"
        onMouseDown={swallowCaret}
        onClick={() => onAppend('row')}
      >
        <Icon name="plus" size="body" />
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
