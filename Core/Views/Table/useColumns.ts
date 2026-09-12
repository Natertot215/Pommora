// Everything a table column is: the width table and its clamp, the default alignment, the reorder helper, and the hook that resolves a view's columns into the per-index width, alignment and style the grid paints — plus the resize, hide, align and drag gestures that rewrite them.

import { useEffect, useMemo, useRef, useState } from 'react'
import { columnMenuItems, parseStyleAction } from '@pommora/core/Actions/columnMenu'
import { defaultStyleFor, type ColumnStyle } from '@pommora/core/Properties/columnStyles'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import { RESERVED_PROPERTY_ID } from '@pommora/core/Properties/properties'
import type { ColumnAlign, SavedView } from '@pommora/core/Views/views'
import { announce } from '@pommora/uix/Interactions/a11y'
import { findScroller, startAutoScroll } from '@pommora/uix/Interactions/autoscroll'
import { reorder } from '@pommora/uix/Interactions/drag'
import { usePointerGesture } from '@pommora/uix/Interactions/gesture'
import { ICON_PX } from '@pommora/uix/Theme/theme-vars.css'
import { readZoom } from '@pommora/uix/Utilities/zoom'
import { popMenu } from '../../Actions/menuActions'
import { numberDivisor } from '../../Properties/formatValue'
import { declaredType } from '../../Properties/value'
import { useColumnStyleMap } from '../Host/useColumnStyles'
import type { ViewHostApi } from '../Host/useViewHost'

// ── Widths ──────────────────────────────────────────────────────────────────

interface ColumnWidth {
  min: number
  default: number
  max: number
}

// Only `title` is UNCAPPED — a resize past the pane h-scrolls instead of hitting a wall. Mins stay so a stale saved value can't squash a column below legibility.
const UNCAPPED = Number.POSITIVE_INFINITY
const WIDTHS: Record<string, ColumnWidth> = {
  title: { min: 120, default: 280, max: UNCAPPED },
  context: { min: 80, default: 140, max: 350 },
  status: { min: 65, default: 120, max: 250 },
  select: { min: 65, default: 120, max: 350 },
  multi_select: { min: 65, default: 180, max: 350 },
  checkbox: { min: 45, default: 60, max: 80 },
  url: { min: 100, default: 140, max: 350 },
  file: { min: 100, default: 140, max: 250 },
  number: { min: 50, default: 100, max: 350 },
  datetime: { min: 90, default: 140, max: 250 },
  created_time: { min: 90, default: 120, max: 250 },
  last_edited_time: { min: 90, default: 120, max: 250 },
}

const FALLBACK: ColumnWidth = { min: 80, default: 140, max: UNCAPPED }

// Per-look min overrides replace the type's base min; status, select and multi-select are one option-chip family, so they share OPTION_MIN.
const OPTION_MIN = { compact: 65, standard: 80 } as const
const STYLE_MIN: Record<string, Partial<Record<string, number>>> = {
  checkbox: { switch: 70 },
  status: OPTION_MIN,
  select: OPTION_MIN,
  multi_select: OPTION_MIN,
}

const HEADER_ICON_BUMP = ICON_PX.body + 6

/** `contextIds` is what makes a Context column classify as such — omit it and one takes the fallback instead of the Context width. */
export function widthFor(
  columnId: string,
  schema: PropertyDefinition[],
  contextIds: readonly string[] = [],
): ColumnWidth {
  const t = declaredType(columnId, schema, contextIds)
  return (t !== undefined && WIDTHS[t]) || FALLBACK
}

/** `look` omitted resolves the type's DEFAULT look, so an unstyled option column reads its Standard min; reserved timestamp columns keep the base. */
export function minWidthFor(
  columnId: string,
  schema: PropertyDefinition[],
  look?: string,
  contextIds: readonly string[] = [],
  iconsShown = false,
): number {
  const bump = iconsShown ? HEADER_ICON_BUMP : 0
  const base = widthFor(columnId, schema, contextIds).min
  const t = declaredType(columnId, schema, contextIds)
  if (t === undefined) return base + bump
  const resolved = look ?? defaultStyleFor(t).look
  const override = resolved !== undefined ? STYLE_MIN[t]?.[resolved] : undefined
  return (override ?? base) + bump
}

export function clampWidth(
  width: number,
  columnId: string,
  schema: PropertyDefinition[],
  look?: string,
  contextIds: readonly string[] = [],
  iconsShown = false,
): number {
  const { max } = widthFor(columnId, schema, contextIds)
  return Math.max(minWidthFor(columnId, schema, look, contextIds, iconsShown), Math.min(max, width))
}

// ── Alignment ───────────────────────────────────────────────────────────────

// The chip- and box-shaped values center; so does a datetime, whose formatted value reads centered. The reserved Modified timestamp keeps Title's left metadata treatment.
const CENTERED = new Set(['checkbox', 'status', 'select', 'multi_select', 'context', 'datetime'])

/** `contextIds` is what makes a Context column classify as such — omit it and one reads as an unknown type. */
export function defaultAlignFor(
  columnId: string,
  schema: PropertyDefinition[],
  contextIds: readonly string[] = [],
): ColumnAlign {
  if (columnId === RESERVED_PROPERTY_ID.title) return 'left'
  const t = declaredType(columnId, schema, contextIds)
  return t !== undefined && CENTERED.has(t) ? 'center' : 'left'
}

export function alignFor(
  columnId: string,
  schema: PropertyDefinition[],
  view: SavedView,
  contextIds: readonly string[] = [],
): ColumnAlign {
  return view.column_alignments?.[columnId] ?? defaultAlignFor(columnId, schema, contextIds)
}

// ── Order ───────────────────────────────────────────────────────────────────

/** Any hidden property is preserved at the tail so a later hide/show toggle can't drop it, and the full visible order is written explicitly so default-on reserved columns persist the slot they were dragged to. */
export function reorderColumns(
  visibleIds: string[],
  propertyOrder: string[],
  activeId: string,
  overId: string,
): string[] {
  const next = reorder(
    visibleIds.map((id) => ({ id })),
    activeId,
    overId,
  ).map((o) => o.id)
  const hidden = propertyOrder.filter((id) => !visibleIds.includes(id))
  return [...next, ...hidden]
}

// ── The painted shift ───────────────────────────────────────────────────────

export type DragShift = { from: number; to: number; width: number }

export function gapShift(d: DragShift | null, ci: number): string | undefined {
  if (!d) return undefined
  if (d.to < d.from && ci >= d.to && ci < d.from) return `translateX(${d.width}px)`
  if (d.to > d.from && ci > d.from && ci <= d.to) return `translateX(${-d.width}px)`
  return undefined
}

/** A number column offers the Bar look only where a divisor gives the bar a ceiling to fill. */
export function numberBarCapable(schema: PropertyDefinition[], columnId: string): boolean {
  return (
    declaredType(columnId, schema) === 'number' &&
    numberDivisor(schema.find((d) => d.id === columnId)) !== undefined
  )
}

// TUNABLE — px past a column's edge the drag center must travel before the slot flips (sticky zone).
const COL_SHIFT_HYSTERESIS = 25

// ── The hook ────────────────────────────────────────────────────────────────

export function useColumns(host: ViewHostApi) {
  const {
    schema,
    view,
    liveView,
    columns,
    contextIds,
    persistView,
    setOrderOverride,
    setHiddenOverride,
    setStylePatch,
  } = host
  const beginGesture = usePointerGesture()
  // Local column layers stay OUT of `liveView` — a resize must not re-run the pipeline.
  const [widthOverride, setWidthOverride] = useState<Record<string, number>>({})
  const [alignOverride, setAlignOverride] = useState<Record<string, ColumnAlign>>({})
  const [collapsing, setCollapsing] = useState<string | null>(null)
  const [sliding, setSliding] = useState<ReadonlySet<string>>(() => new Set())
  const [colDrag, setColDrag] = useState<{ from: number; to: number; id: string } | null>(null)
  const [resizing, setResizing] = useState(false)
  const [overflowing, setOverflowing] = useState(false)
  // The column sum, read from here rather than scrollWidth: scrollWidth floors at clientWidth, so an is-content-bigger comparison built on it latches.
  const reflowRef = useRef(0)
  // Captured at resize start so an abort restores exactly — an entry absent before the drag is deleted, never written back as a width a later persist would carry to disk.
  const resizeBaseline = useRef<{ id: string; value: number | undefined } | null>(null)

  useEffect(() => {
    setWidthOverride({})
    setAlignOverride({})
    setCollapsing(null)
    setColDrag(null)
  }, [view.id])

  const iconsShown = !(liveView.hide_column_icons ?? true)
  const styleMap = useColumnStyleMap(host)
  const alignByCol = useMemo(
    () => columns.map((c) => alignOverride[c.id] ?? alignFor(c.id, schema, liveView, contextIds)),
    [columns, schema, liveView, alignOverride, contextIds],
  )
  const styleByCol = useMemo(() => columns.map((c) => styleMap.get(c.id)!), [columns, styleMap])
  const widthByCol = useMemo(
    () =>
      columns.map((c, i) =>
        clampWidth(
          widthOverride[c.id] ??
            liveView.column_widths?.[c.id] ??
            widthFor(c.id, schema, contextIds).default,
          c.id,
          schema,
          styleByCol[i].look,
          contextIds,
          iconsShown,
        ),
      ),
    [columns, schema, liveView, widthOverride, contextIds, styleByCol, iconsShown],
  )
  const indexOf = (id: string): number => columns.findIndex((c) => c.id === id)
  const colStyle = (id: string): ColumnStyle => styleByCol[indexOf(id)]
  const colWidth = (i: number): number => (collapsing === columns[i].id ? 0 : widthByCol[i])

  const [prevStyles, setPrevStyles] = useState(styleByCol)
  if (prevStyles !== styleByCol) {
    setPrevStyles(styleByCol)
    const widened: string[] = []
    columns.forEach((c, i) => {
      const look = styleByCol[i].look
      const prev = prevStyles[i]?.look
      if (prev === look) return
      const basis =
        widthOverride[c.id] ??
        liveView.column_widths?.[c.id] ??
        widthFor(c.id, schema, contextIds).default
      if (
        clampWidth(basis, c.id, schema, look, contextIds, iconsShown) >
        clampWidth(basis, c.id, schema, prev, contextIds, iconsShown)
      )
        widened.push(c.id)
    })
    if (widened.length) setSliding((s) => new Set([...s, ...widened]))
  }
  const dragShift = useMemo(() => {
    if (!colDrag) return null
    // A watcher or pane write can reshape `columns` mid-drag — a vanished source column ends the shift rather than painting a neighbor.
    const src = columns[colDrag.from]
    return src && src.id === colDrag.id
      ? { from: colDrag.from, to: colDrag.to, width: colWidth(colDrag.from) }
      : null
  }, [colDrag, columns, widthByCol, collapsing])

  const reflowWidth = columns.reduce((sum, _c, i) => sum + colWidth(i), 0)
  reflowRef.current = reflowWidth
  const cols = `${columns.map((_c, i) => `${colWidth(i)}px`).join(' ')} 1fr`

  useEffect(() => {
    const el = host.seam.viewRootRef.current
    if (!el) return
    const check = (): void => {
      const cs = getComputedStyle(el)
      const pads = Number.parseFloat(cs.paddingLeft) + Number.parseFloat(cs.paddingRight)
      const gridEl = el.querySelector('.table-grid')
      setOverflowing(
        reflowRef.current * (gridEl ? readZoom(gridEl) : 1) > el.clientWidth - pads + 1,
      )
    }
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    const grid = el.querySelector('.table-grid')
    if (grid) ro.observe(grid)
    return () => ro.disconnect()
  }, [])

  const reorderColumn = (activeId: string, overId: string): void => {
    const next = reorderColumns(
      columns.map((c) => c.id),
      liveView.property_order,
      activeId,
      overId,
    )
    setOrderOverride(next)
    persistView({ property_order: next })
  }
  const resizeColumn = (id: string, width: number): number => {
    const clamped = clampWidth(
      Math.round(width),
      id,
      schema,
      colStyle(id).look,
      contextIds,
      iconsShown,
    )
    setWidthOverride((prev) => ({ ...prev, [id]: clamped }))
    return clamped
  }
  const startResize = (id: string): void => {
    resizeBaseline.current = { id, value: widthOverride[id] }
    setResizing(true)
  }
  // Cleared by whichever end fires, never by teardown — the skeleton runs teardown BEFORE onAbort.
  const abortResize = (): void => {
    const b = resizeBaseline.current
    if (!b) return
    resizeBaseline.current = null
    setWidthOverride((prev) => {
      const next = { ...prev }
      if (b.value === undefined) delete next[b.id]
      else next[b.id] = b.value
      return next
    })
  }
  const endResize = (): void => {
    setResizing(false)
  }
  const commitResize = (id: string, width: number): void => {
    resizeBaseline.current = null
    persistView({
      column_widths: {
        ...liveView.column_widths,
        ...widthOverride,
        [id]: clampWidth(width, id, schema, colStyle(id).look, contextIds, iconsShown),
      },
    })
  }
  const hideColumn = (id: string): void => {
    setCollapsing(id)
  }
  const commitHide = (): void => {
    if (!collapsing) return
    const hidden = [...(liveView.hidden_properties ?? []), collapsing]
    setCollapsing(null)
    setHiddenOverride(hidden)
    persistView({ hidden_properties: hidden })
  }
  const setColumnAlign = (id: string, align: ColumnAlign): void => {
    setAlignOverride((prev) => ({ ...prev, [id]: align }))
    persistView({
      column_alignments: { ...liveView.column_alignments, ...alignOverride, [id]: align },
    })
  }
  const runStyleAction = (id: string, action: string): void => {
    const parsed = parseStyleAction(action)
    if (parsed) setStylePatch(id, parsed.key, parsed.value)
  }
  const openHeaderMenu = async (
    id: string,
    isTitle: boolean,
    e: React.MouseEvent,
  ): Promise<void> => {
    e.preventDefault()
    const t = declaredType(id, schema)
    const barCapable = numberBarCapable(schema, id)
    const style =
      t !== undefined && t !== 'title' && t !== 'context'
        ? { type: t, current: colStyle(id), ...(barCapable ? { barCapable: true } : {}) }
        : undefined
    const action = await popMenu(
      columnMenuItems({
        align: alignByCol[indexOf(id)],
        alignable: !isTitle,
        hideable: !isTitle,
        iconsShown,
        style,
      }),
    )
    if (action === 'column:hide') hideColumn(id)
    else if (action === 'column:toggle-icons') persistView({ hide_column_icons: iconsShown })
    else if (action?.startsWith('align:'))
      setColumnAlign(id, action.slice('align:'.length) as ColumnAlign)
    else if (action) runStyleAction(id, action)
  }
  const startColumnDrag = (e: React.PointerEvent, from: number): void => {
    if (e.button !== 0) return
    e.preventDefault()
    const header = e.currentTarget as HTMLElement
    const grid = header.closest('.table-grid') as HTMLElement | null
    if (!grid) return
    // Snapshot in the activation, not the press: a per-move rect loop forces layout in the drag hot path, and a pending-phase scroll would strand a press-time origin.
    let zoom = 1
    let startCenter = 0
    let startX = 0
    let gridLeft = 0
    let widths: number[] = []
    let lefts: number[] = []
    const dragId = columns[from].id
    let current: { from: number; to: number; id: string } | null = null
    let lastX = e.clientX
    let lastY = e.clientY
    let stopScroll: (() => void) | null = null
    const resolve = (): void => {
      const projected = startCenter + (lastX - startX)
      const cur = current?.to ?? from
      const curLeft = gridLeft + lefts[cur]
      const curRight = curLeft + widths[cur]
      let to = cur
      if (
        projected < curLeft - COL_SHIFT_HYSTERESIS ||
        projected > curRight + COL_SHIFT_HYSTERESIS
      ) {
        to = columns.length - 1
        for (let i = 0; i < columns.length; i++) {
          if (projected < gridLeft + lefts[i] + widths[i]) {
            to = i
            break
          }
        }
      }
      grid.style.setProperty(
        '--col-drag-x',
        `${(projected - (gridLeft + lefts[from] + widths[from] / 2)) / zoom}px`,
      )
      if (!current || current.to !== to) {
        current = { from, to, id: dragId }
        setColDrag(current)
      }
    }
    beginGesture({
      el: header,
      event: e,
      onActivate: (ev) => {
        // Read computed so a scaled tile's drag maps 1:1 — not the --zoom token alone, and never back-solved from rendered width ÷ track width (that bakes in layout slack).
        zoom = readZoom(grid)
        const hr = header.getBoundingClientRect()
        startCenter = hr.left + hr.width / 2
        startX = ev.clientX
        lastX = ev.clientX
        gridLeft = grid.getBoundingClientRect().left
        widths = columns.map((_c, i) => colWidth(i) * zoom)
        lefts = new Array(columns.length)
        let acc = 0
        for (let i = 0; i < columns.length; i++) {
          lefts[i] = acc
          acc += widths[i]
        }
        const sc = findScroller(grid, 'x')
        if (sc) {
          stopScroll = startAutoScroll({
            getPoint: () => ({ x: lastX, y: lastY }),
            scroller: sc,
            dragEl: grid,
            axis: 'x',
          })
        }
        announce('Picked up column.')
        return true
      },
      onDragMove: (ev) => {
        lastX = ev.clientX
        lastY = ev.clientY
        resolve()
      },
      scrollTarget: () => grid,
      onWindowScroll: () => {
        gridLeft = grid.getBoundingClientRect().left
        resolve()
      },
      onDrop: () => {
        if (current && current.to !== current.from) {
          reorderColumn(columns[current.from].id, columns[current.to].id)
          announce('Moved column.')
        }
      },
      teardown: () => {
        stopScroll?.()
        stopScroll = null
        grid.style.removeProperty('--col-drag-x')
        setColDrag(null)
      },
    })
  }
  /** The hide collapses the track to zero and the widen slides it out — both land on the same track transition. */
  const onTrackTransitionEnd = (e: React.TransitionEvent): void => {
    if (e.propertyName !== 'grid-template-columns') return
    commitHide()
    setSliding((s) => (s.size ? new Set() : s))
  }

  return {
    foldOverrides: (v: SavedView): SavedView => ({
      ...v,
      column_widths: { ...v.column_widths, ...widthOverride },
      column_alignments: { ...v.column_alignments, ...alignOverride },
    }),
    iconsShown,
    alignByCol,
    styleByCol,
    widthByCol,
    colStyle,
    dragShift,
    cols,
    reflowWidth,
    overflowing,
    hiding: collapsing !== null,
    sliding: sliding.size > 0,
    resizing,
    resizeColumn,
    startResize,
    abortResize,
    endResize,
    commitResize,
    openHeaderMenu,
    runStyleAction,
    startColumnDrag,
    onTrackTransitionEnd,
  }
}
