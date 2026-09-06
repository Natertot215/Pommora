// biome-ignore-all lint/suspicious/noArrayIndexKey: a Markdown table's rows, columns, and cells are plain strings with no identity but their position — the index IS the key.
import '../markdown-tables.css'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { usePointerGesture } from '@pommora/uix/Interactions/gesture'
import { resolveScroller, startAutoScroll } from '@pommora/uix/Interactions/autoscroll'
import { Icon } from '@pommora/uix/Symbols'
import type { Align, TableModel } from '../Engine/Tables/model'
import type { TableMenuContext } from '@pommora/core/Actions/tableMenu'
import { CellEditor } from './CellEditor'
import { StaticCell } from './cellStatic'
import { cellToDisplay, cellToSource } from '../Engine/Tables/codec'
import { decodePayload, encodeRect, rectGrid, type TablePayload } from '../Engine/Tables/clipboard'
import { foldLabel } from '../Engine/detect'
import { nextCell, type NavDir } from '../Engine/Tables/navigate'
import type { ConnectionsApi } from '../Links/connectionsApi'
import type { EditorHost } from '../api'
import { clamp } from '@pommora/uix/Utilities/clamp'

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

interface GridPos {
  r: number
  c: number
}
interface Rect {
  r0: number
  c0: number
  r1: number
  c1: number
}
const normRect = (a: GridPos, h: GridPos): Rect => ({
  r0: Math.min(a.r, h.r),
  c0: Math.min(a.c, h.c),
  r1: Math.max(a.r, h.r),
  c1: Math.max(a.c, h.c),
})

function cellPosOf(target: EventTarget | null): GridPos | null {
  const cell = (target as HTMLElement | null)?.closest?.('td, th') as HTMLTableCellElement | null
  const tr = cell?.parentElement as HTMLTableRowElement | null
  if (!cell || !tr) return null
  return { r: tr.rowIndex, c: cell.cellIndex }
}

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
  host,
  model,
  cites,
  headingColumn = false,
  onCellCommit,
  onSettled,
  onExit,
  onReorder,
  onResize,
  onAppend,
  onClearCells,
  onFill,
  onCopyText,
  readClipboard,
  onMenu,
  onTableDrag,
  onCite,
  onUndo,
  onRedo,
  connections,
  readOnly,
}: {
  host: EditorHost
  model: TableModel
  cites?: string
  headingColumn?: boolean
  onCellCommit: (row: number, col: number, text: string) => void
  onSettled?: () => void
  onExit: (dir: 'before' | 'after') => void
  onReorder: (axis: Axis, from: number, to: number) => boolean
  onResize: (widths: number[]) => boolean
  onAppend: (axis: Axis) => void
  onClearCells?: (r0: number, c0: number, r1: number, c1: number) => void
  onFill?: (row: number, col: number, payload: TablePayload) => void
  onCopyText?: (text: string) => void
  readClipboard?: () => Promise<string>
  onMenu: (ctx: TableMenuContext) => void
  onTableDrag: (e: PointerEvent) => void
  onCite?: (label: string) => void
  onUndo: () => void
  onRedo: () => void
  connections?: () => ConnectionsApi | undefined
  readOnly?: () => boolean
}): React.JSX.Element {
  const total =
    model.columns.reduce((sum, c) => sum + Math.max(1, c.dashes), 0) || model.columns.length
  const totalRows = model.rows.length + 1
  const cols = model.columns.length

  const wrapRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)

  const [geom, setGeom] = useState<Geom>({ cols: [], rows: [] })
  // A mid-drag re-measure must reach this; a state binding would freeze at the pointerdown render (the cfg-ref discipline).
  const geomRef = useRef(geom)
  geomRef.current = geom
  const [drag, setDrag] = useState<Drag | null>(null)
  const [resize, setResize] = useState<Resize | null>(null)
  const [active, setActive] = useState<{ row: number; col: number } | null>(null)
  const caretCoords = useRef<{ x: number; y: number } | null>(null)
  const initialSelect = useRef<[number, number] | null>(null)
  const sweepFrom = useRef<'start' | 'end' | null>(null)

  const [sel, setSel] = useState<{ a: GridPos; h: GridPos } | null>(null)
  const [sweeping, setSweeping] = useState(false)
  const suppressClick = useRef(false)
  const [hover, setHover] = useState<GridPos | null>(null)

  const startSweep = (e: React.PointerEvent<HTMLTableElement>): void => {
    if (e.button !== 0) return
    const start = cellPosOf(e.target)
    const wrap = wrapRef.current
    if (!start || !wrap) return
    if (active) setAddsHidden(true)
    let b = wrap.getBoundingClientRect()
    let engaged = false
    let head = start
    let last = { x: e.clientX, y: e.clientY }
    let stopScroll: (() => void) | null = null
    const resolveAt = (): void => {
      const at: GridPos = {
        r: slotAt('row', geomRef.current, last.y - b.top),
        c: slotAt('col', geomRef.current, last.x - b.left),
      }
      if (!engaged) {
        if (at.r === start.r && at.c === start.c) return
        engaged = true
        setActive(null)
        window.getSelection()?.removeAllRanges()
        setSweeping(true)
        stopScroll = startAutoScroll({
          getPoint: () => last,
          scroller: resolveScroller(wrap, 'xy'),
          dragEl: wrap,
          axis: 'xy',
          onScrolled: () => {
            b = wrap.getBoundingClientRect()
            resolveAt()
          },
        })
      }
      if (at.r !== head.r || at.c !== head.c) {
        head = at
        setSel({ a: start, h: at })
      }
    }
    const onMove = (ev: PointerEvent): void => {
      last = { x: ev.clientX, y: ev.clientY }
      resolveAt()
    }
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      stopScroll?.()
      setSweeping(false)
      if (engaged) suppressClick.current = true
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const [addsHidden, setAddsHidden] = useState(false)

  useEffect(() => {
    if (!active) return
    setSel(null)
    setAddsHidden(true)
  }, [active])

  useEffect(() => {
    if (!sel) return
    const onDown = (e: PointerEvent): void => {
      if (wrapRef.current?.contains(e.target as Node)) return
      setSel(null)
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [sel])

  const rect = useMemo(() => (sel ? normRect(sel.a, sel.h) : null), [sel])

  useEffect(() => {
    if (!rect) return
    const claim = (e: KeyboardEvent): void => {
      e.preventDefault()
      e.stopPropagation()
    }
    const clear = (): void => onClearCells?.(rect.r0, rect.c0, rect.r1, rect.c1)
    const onKey = (e: KeyboardEvent): void => {
      const mod = e.metaKey || e.ctrlKey
      if (e.key === 'Escape') {
        claim(e)
        setSel(null)
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        claim(e)
        clear()
      } else if (mod && (e.key === 'c' || e.key === 'x')) {
        claim(e)
        onCopyText?.(encodeRect(rectGrid(model, rect.r0, rect.c0, rect.r1, rect.c1)))
        if (e.key === 'x') clear()
      } else if (mod && e.key === 'v') {
        claim(e)
        void readClipboard?.().then((text) => {
          if (!text) return
          const payload = decodePayload(text) ?? {
            kind: 'rect' as const,
            grid: [[cellToSource(text)]],
          }
          if (payload.kind !== 'table') onFill?.(rect.r0, rect.c0, payload)
        })
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [rect, model, onClearCells, onCopyText, onFill, readClipboard])

  const selected = (r: number, c: number): boolean =>
    rect !== null && r >= rect.r0 && r <= rect.r1 && c >= rect.c0 && c <= rect.c1

  const trackHover = (e: React.MouseEvent): void => {
    const at = cellPosOf(e.target)
    if (at) setHover((cur) => (cur && cur.r === at.r && cur.c === at.c ? cur : at))
  }

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

  // The measure sweep runs on the table's SHAPE, never the model's identity — re-measuring per keystroke is an O(rows) forced layout.
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

  // A reorder permutes row heights while leaving the shape and the table's box untouched, so neither the sweep nor the observer fires.
  const remeasure = useRef(false)

  useLayoutEffect(() => {
    setDrag(null)
    setResize(null)
    if (!remeasure.current) return
    remeasure.current = false
    measure()
  }, [model, measure])

  // Rebuilt when a cell stops being the live one, never per keystroke: CM would re-measure a block whose React content hasn't rendered.
  const wasActive = useRef<{ row: number; col: number } | null>(null)
  useEffect(() => {
    const prev = wasActive.current
    wasActive.current = active
    if (prev && (prev.row !== active?.row || prev.col !== active?.col)) onSettled?.()
  }, [active, onSettled])

  useEffect(() => {
    if (!active) return
    const onDown = (e: PointerEvent): void => {
      const wrap = wrapRef.current
      if (!wrap || wrap.contains(e.target as Node)) return
      // The autocomplete pane is a body-level portal — demoting there tears the editor down before the press that picked reaches it.
      if ((e.target as HTMLElement).closest?.('.mdpm-ac')) return
      setActive(null)
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [active])

  // The grip is re-rendered mid-drag, which is why the shared skeleton binds its listeners on window.
  const beginGesture = usePointerGesture()

  const startDrag = (e: React.PointerEvent<HTMLDivElement>, axis: Axis, index: number): void => {
    if (e.button !== 0) return
    e.preventDefault()
    const wrap = wrapRef.current
    if (!wrap) return
    // `geom` is wrap-relative and scroll-immune, the pointer viewport-relative, so the drag runs in wrap space.
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
        reOrigin()
        setDrag(current)
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
        if (!onResize(next)) setResize(null)
      },
      onAbort: () => setResize(null),
      activation: 0,
    })
  }

  const navigate = (row: number, col: number, dir: NavDir): void => {
    const target = nextCell(totalRows, cols, row, col, dir)
    if (target === 'before' || target === 'after') {
      setActive(null)
      onExit(target)
      return
    }
    caretCoords.current = null
    initialSelect.current = null
    sweepFrom.current = null
    setActive({ row: target.row, col: target.col })
  }

  const cell = (row: number, col: number, text: string): React.JSX.Element => {
    const display = cellToDisplay(text)
    if (active?.row === row && active.col === col) {
      return (
        <CellEditor
          host={host}
          initial={display}
          connections={connections}
          ordinalOf={ordinalOf}
          caretCoords={caretCoords.current}
          initialSelect={initialSelect.current}
          sweepFrom={sweepFrom.current}
          onCommit={(t) => {
            setAddsHidden(true)
            onCellCommit(row, col, t)
          }}
          onNavigate={(dir) => navigate(row, col, dir)}
          onTablePaste={(text) => {
            const payload = decodePayload(text)
            if (!payload) return false
            if (payload.kind !== 'table') onFill?.(row, col, payload)
            return true
          }}
          onUndo={onUndo}
          onRedo={onRedo}
        />
      )
    }
    return (
      <StaticCell
        host={host}
        text={display}
        cites={cites}
        ordinalOf={ordinalOf}
        connections={connections}
        readOnly={readOnly}
        onCite={onCite}
        onActivate={(coords, sweep) => {
          host.glance?.close()
          caretCoords.current = coords
          initialSelect.current = null
          sweepFrom.current = sweep ?? null
          setActive({ row, col })
        }}
        onCommit={(t) => {
          onCellCommit(row, col, t)
          // A resting cell never had an editor to demote, so without this the widget keeps drawing the pre-edit text.
          onSettled?.()
        }}
        onSelect={(range) => {
          host.glance?.close()
          caretCoords.current = null
          initialSelect.current = range
          sweepFrom.current = null
          setActive({ row, col })
        }}
      />
    )
  }

  const swallowCaret = (e: React.MouseEvent): void => e.preventDefault()

  const colDragged = (ci: number): boolean => drag?.axis === 'col' && drag.from === ci
  const colW = (ci: number): number => geom.cols[ci]?.width ?? 0
  const rowH = (ri: number): number => geom.rows[ri]?.height ?? 0

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
    // biome-ignore lint/a11y/noStaticElementInteractions: pointer-only affordances — grip reveal and the rectangle sweep; the keyboard's route into the grid is its cells.
    // biome-ignore lint/a11y/useKeyWithMouseEvents: hover only steers which grip shows; keyboard focus never rests on the wrap
    <div
      className={`mdpm-tbl-wrap${drag ? ' mdpm-tbl-dragging' : ''}${resize ? ' mdpm-tbl-resizing' : ''}${sweeping ? ' mdpm-tbl-sweeping' : ''}${addsHidden ? ' mdpm-tbl-adds-off' : ''}`}
      ref={wrapRef}
      // Captured, because a cell's own menu handler claims the event before it could bubble here.
      onContextMenuCapture={(e) => {
        if (!host.glance?.contains(e.currentTarget)) host.glance?.close()
      }}
      onMouseOver={trackHover}
      onMouseLeave={() => {
        setHover(null)
        setAddsHidden(false)
      }}
      onClickCapture={(e) => {
        if (!suppressClick.current) return
        suppressClick.current = false
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      <table className="mdpm-tbl" ref={tableRef} onPointerDownCapture={startSweep}>
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
                className={`mdpm-tbl-cell ${alignClass(model.columns[ci]?.align ?? null)}${colDragged(ci) ? ' mdpm-tbl-subject' : ''}${selected(0, ci) ? ' mdpm-tbl-selected' : ''}`}
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
                  className={`mdpm-tbl-cell ${alignClass(model.columns[ci]?.align ?? null)}${colDragged(ci) ? ' mdpm-tbl-subject' : ''}${headingColumn && ci === 0 ? ' mdpm-tbl-heading-col' : ''}${selected(ri + 1, ci) ? ' mdpm-tbl-selected' : ''}`}
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
          className={`mdpm-tbl-grip-zone mdpm-tbl-grip-col${hover?.r === 0 && hover.c === i ? ' mdpm-tbl-grip-hot' : ''}`}
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
          className={`mdpm-tbl-grip-zone mdpm-tbl-grip-row${hover?.r === j ? ' mdpm-tbl-grip-hot' : ''}`}
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
