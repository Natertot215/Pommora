import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { stack } from '../Theme/stack'
import { DEFAULT_FEEL } from '../Animations/feel'
import { clamp } from '../Utilities/clamp'
import { announce } from './a11y'
import { findScroller, startAutoScroll } from './autoscroll'
import { usePointerGesture } from './gesture'
import {
  ACTIVATION,
  HYSTERESIS,
  SETTLE_FALLBACK,
  px,
  toBox,
  type Box,
  type DragItem,
  type DropState,
} from './shared'

// Extra travel on an interactive control, so a tap-wobble opens it instead of lifting the card.
const INTERACTIVE_ACTIVATION = 12

type ZoneReg = { ids: string[]; els: Map<string, HTMLElement>; container: HTMLElement | null }
type ActiveDrag = { id: string; zone: string; srcIdx: number; pitch: number; rect: Box }

type GroupValue = {
  active: ActiveDrag | null
  overZone: string | null
  overIndex: number
  dropState: DropState
  setZoneIds: (zoneId: string, ids: string[]) => void
  registerContainer: (zoneId: string, el: HTMLElement | null) => void
  registerItem: (zoneId: string, id: string, el: HTMLElement | null) => void
  begin: (zoneId: string, id: string, e: ReactPointerEvent) => void
  itemState: (
    zoneId: string,
    id: string,
  ) => { transform: string; hidden: boolean; animate: boolean }
}
const GroupCtx = createContext<GroupValue | null>(null)

// Banded by span overlap: cards top-align at unequal heights, so a center split would flip-flop.
type ZoneRows = Array<{ top: number; bottom: number; items: Array<{ i: number; cx: number }> }>
function rowsOf(rects: Box[], skip: number): ZoneRows {
  const items = rects
    .map((b, i) => ({ i, top: b.top, bottom: b.top + b.height, cx: b.cx }))
    .filter((it) => it.i !== skip)
    .sort((a, b) => a.top - b.top || a.cx - b.cx)
  const rows: ZoneRows = []
  for (const it of items) {
    const row = rows.find((r) => it.top < r.bottom && it.bottom > r.top)
    if (row) {
      row.items.push({ i: it.i, cx: it.cx })
      row.top = Math.min(row.top, it.top)
      row.bottom = Math.max(row.bottom, it.bottom)
    } else rows.push({ top: it.top, bottom: it.bottom, items: [{ i: it.i, cx: it.cx }] })
  }
  for (const r of rows) r.items.sort((a, b) => a.cx - b.cx)
  return rows
}

// Auto-fill keeps empty tracks, so the column count comes from width, not from the cards present.
type ColumnModel = { lefts: number[]; stride: number; cols: number }
function columnModelOf(rects: Box[], containerWidth: number): ColumnModel {
  const lefts = [...new Set(rects.map((r) => Math.round(r.left)))].sort((a, b) => a - b)
  const stride = lefts.length >= 2 ? lefts[1] - lefts[0] : (rects[0]?.width ?? 1) + 1
  const cols = Math.max(
    lefts.length,
    containerWidth > 0 ? Math.round(containerWidth / stride) : 1,
    1,
  )
  return { lefts, stride, cols }
}

// Array identity is the cache key: a writer that shifts rects in place would serve stale rows.
const zoneGeometry = new WeakMap<
  Box[],
  { rows: Map<number, ZoneRows>; models: Map<number, ColumnModel> }
>()
function geometryOf(rects: Box[]): {
  rows: Map<number, ZoneRows>
  models: Map<number, ColumnModel>
} {
  let g = zoneGeometry.get(rects)
  if (!g) {
    g = { rows: new Map(), models: new Map() }
    zoneGeometry.set(rects, g)
  }
  return g
}
function rowsOfCached(rects: Box[], skip: number): ZoneRows {
  const g = geometryOf(rects)
  let rows = g.rows.get(skip)
  if (!rows) {
    rows = rowsOf(rects, skip)
    g.rows.set(skip, rows)
  }
  return rows
}
function columnModelCached(rects: Box[], containerWidth: number): ColumnModel {
  const g = geometryOf(rects)
  let model = g.models.get(containerWidth)
  if (!model) {
    model = columnModelOf(rects, containerWidth)
    g.models.set(containerWidth, model)
  }
  return model
}

// Walked by grid columns past the last card; a linear extrapolation would wrap a half-full row.
function cellAt(
  rects: Box[],
  slot: number,
  pitch: number,
  containerWidth: number,
): { x: number; y: number } {
  if (slot < rects.length) return { x: rects[slot].left, y: rects[slot].top }
  if (rects.length === 0) return { x: 0, y: 0 }
  const { lefts, stride, cols } = columnModelCached(rects, containerWidth)
  const last = rects[rects.length - 1]
  let col = Math.max(0, Math.round((last.left - lefts[0]) / stride))
  let top = last.top
  for (let sInc = rects.length; sInc <= slot; sInc++) {
    col++
    if (col >= cols) {
      col = 0
      top += pitch
    }
  }
  return { x: lefts[0] + col * stride, y: top }
}
const ZoneIdCtx = createContext<string | null>(null)

export type DragGroupProps = {
  onCommit: (activeId: string, toZone: string, toIndex: number) => void
  renderOverlay?: (activeId: string, rect: Box) => ReactNode
  zoom?: number
  /** False pins the drag to its source zone — for a band that can't receive foreign cards. */
  crossZone?: boolean
  /** Null refuses the landing. Must be idempotent: an index it returned maps to itself. */
  resolveIndex?: (zoneId: string, index: number, activeId: string) => number | null
  children: ReactNode
}

export function DragGroup({
  onCommit,
  renderOverlay,
  zoom = 1,
  crossZone = true,
  resolveIndex,
  children,
}: DragGroupProps): React.JSX.Element {
  const feel = DEFAULT_FEEL
  const onCommitRef = useRef(onCommit)
  onCommitRef.current = onCommit
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom || 1
  const crossZoneRef = useRef(crossZone)
  crossZoneRef.current = crossZone
  const resolveIndexRef = useRef(resolveIndex)
  resolveIndexRef.current = resolveIndex

  const zones = useRef(new Map<string, ZoneReg>())
  const frozen = useRef(new Map<string, Box[]>())

  const [active, setActive] = useState<ActiveDrag | null>(null)
  const [overZone, setOverZone] = useState<string | null>(null)
  const [overIndex, setOverIndex] = useState(-1)
  const [delta, setDelta] = useState({ x: 0, y: 0 })
  const [dropState, setDropState] = useState<DropState>('idle')
  const [dropTarget, setDropTarget] = useState<{ x: number; y: number } | null>(null)

  const drag = useRef({
    id: '',
    zone: '',
    el: null as HTMLElement | null,
    rect: null as Box | null,
    startX: 0,
    startY: 0,
    active: false,
    srcIdx: -1,
    pitch: 0,
    overZone: '',
    overIndex: -1,
    lastX: 0,
    lastY: 0,
    interactive: false,
    idxAnchorX: 0,
    idxAnchorY: 0,
  })

  const beginGesture = usePointerGesture()
  const commitRef = useRef<(() => void) | null>(null)
  const timerRef = useRef<number | null>(null)
  const stopScroll = useRef<(() => void) | null>(null)

  const ensure = (zoneId: string): ZoneReg => {
    let z = zones.current.get(zoneId)
    if (!z) {
      z = { ids: [], els: new Map(), container: null }
      zones.current.set(zoneId, z)
    }
    return z
  }
  const setZoneIds = (zoneId: string, ids: string[]): void => {
    ensure(zoneId).ids = ids
  }
  const registerContainer = (zoneId: string, el: HTMLElement | null): void => {
    ensure(zoneId).container = el
  }
  const registerItem = (zoneId: string, id: string, el: HTMLElement | null): void => {
    const z = ensure(zoneId)
    if (el) z.els.set(id, el)
    else z.els.delete(id)
  }

  const measure = (zoneId: string): Box[] => {
    const z = zones.current.get(zoneId)
    if (!z) return []
    const out: Box[] = []
    for (const id of z.ids) {
      const el = z.els.get(id)
      if (!el) continue
      out.push(toBox(el))
    }
    return out
  }

  // Snapshotted at activation and on scroll, never per pointermove — that read is the lag source.
  const bounds = useRef(
    new Map<string, { left: number; right: number; top: number; bottom: number }>(),
  )
  const measureBounds = (): void => {
    bounds.current.clear()
    for (const [zid, z] of zones.current) {
      if (!z.container) continue
      const r = z.container.getBoundingClientRect()
      bounds.current.set(zid, { left: r.left, right: r.right, top: r.top, bottom: r.bottom })
    }
  }
  // Toggled synchronously on band-entry, never per-move, so frozen rects can't go stale under it.
  const padded = useRef<string | null>(null)
  const setPad = (zid: string | null): void => {
    if (padded.current === zid) return
    const prev = padded.current && zones.current.get(padded.current)?.container
    if (prev) prev.style.paddingBottom = ''
    const next = zid && zones.current.get(zid)?.container
    if (next) next.style.paddingBottom = `${drag.current.pitch / zoomRef.current}px`
    padded.current = zid
  }
  const zoneWidth = (zid: string): number => {
    const b = bounds.current.get(zid)
    return b ? b.right - b.left : 0
  }
  // Shifted by the container delta, not re-measured: a live read would catch the drag's transforms.
  const onScroll = (): void => {
    for (const [zid, z] of zones.current) {
      if (!z.container) continue
      const r = z.container.getBoundingClientRect()
      const prev = bounds.current.get(zid)
      const f = frozen.current.get(zid)
      if (prev && f && (r.top !== prev.top || r.left !== prev.left)) {
        const shx = r.left - prev.left
        const shy = r.top - prev.top
        frozen.current.set(
          zid,
          f.map((b) => ({
            ...b,
            left: b.left + shx,
            top: b.top + shy,
            cx: b.cx + shx,
            cy: b.cy + shy,
          })),
        )
      }
      bounds.current.set(zid, { left: r.left, right: r.right, top: r.top, bottom: r.bottom })
    }
  }
  const zoneAt = (x: number, y: number): string | null => {
    for (const [zid, r] of bounds.current)
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return zid
    return null
  }

  const indexAt = (zoneId: string, x: number, y: number): number => {
    const rects = frozen.current.get(zoneId)
    if (!rects) return 0
    const skip = zoneId === drag.current.zone ? drag.current.srcIdx : -1
    const rows = rowsOfCached(rects, skip)
    let idx = 0
    for (const row of rows) {
      if (y >= row.bottom) {
        idx += row.items.length
        continue
      }
      if (y < row.top) break
      if (row.items.length === 1) idx += y > (row.top + row.bottom) / 2 ? 1 : 0
      else for (const it of row.items) if (x > it.cx) idx++
      return idx
    }
    return idx
  }

  // Shared with the auto-scroll loop: content moves under a held-still pointer.
  const trackAt = (cx: number, cy: number): void => {
    const d = drag.current
    const dx = cx - d.startX
    const dy = cy - d.startY
    let zid = crossZoneRef.current ? (zoneAt(cx, cy) ?? d.overZone) : d.zone
    if (zid !== d.overZone) {
      setPad(zid && zid !== d.zone ? zid : null)
      measureBounds()
    }
    if (zid && !frozen.current.has(zid)) frozen.current.set(zid, measure(zid))
    let idx = zid ? indexAt(zid, cx, cy) : d.overIndex
    if (zid && resolveIndexRef.current) {
      const mapped = resolveIndexRef.current(zid, idx, d.id)
      if (mapped === null) {
        zid = d.zone
        idx = d.srcIdx
      } else idx = mapped
    }
    if (zid === d.overZone && idx !== d.overIndex) {
      if (Math.hypot(cx - d.idxAnchorX, cy - d.idxAnchorY) < HYSTERESIS) idx = d.overIndex
      else {
        d.idxAnchorX = cx
        d.idxAnchorY = cy
      }
    } else if (zid !== d.overZone) {
      d.idxAnchorX = cx
      d.idxAnchorY = cy
    }
    if (zid === d.overZone && idx === d.overIndex) {
      setDelta({ x: dx, y: dy })
      return
    }
    d.overZone = zid
    d.overIndex = idx
    setDelta({ x: dx, y: dy })
    setOverZone(zid)
    setOverIndex(idx)
  }

  const onActivate = (): boolean => {
    const d = drag.current
    measureBounds()
    const rects = measure(d.zone)
    const z = zones.current.get(d.zone)
    const srcIdx = z ? z.ids.indexOf(d.id) : -1
    const rect = srcIdx >= 0 ? rects[srcIdx] : undefined
    if (!rect) return false
    frozen.current.set(d.zone, rects)
    d.active = true
    d.rect = rect
    d.srcIdx = srcIdx
    // Smallest positive vertical step, not rects[1]-rects[0]: a grid's first two items share a row.
    const vgaps = rects.map((b) => b.top - rect.top).filter((d) => d > 1)
    d.pitch = vgaps.length ? Math.min(...vgaps) : rect.height + 8
    d.overZone = d.zone
    d.overIndex = srcIdx
    setActive({ id: d.id, zone: d.zone, srcIdx, pitch: d.pitch, rect })
    setDropState('dragging')
    setOverZone(d.zone)
    setOverIndex(srcIdx)
    const scroller = findScroller(d.el, 'xy')
    if (scroller) {
      stopScroll.current = startAutoScroll({
        getPoint: () => ({ x: drag.current.lastX, y: drag.current.lastY }),
        scroller,
        dragEl: d.el,
        axis: 'xy',
        onScrolled: onScrollTracked,
      })
    }
    announce('Picked up card.')
    return true
  }

  const onDragMove = (e: PointerEvent): void => {
    const d = drag.current
    d.lastX = e.clientX
    d.lastY = e.clientY
    trackAt(e.clientX, e.clientY)
  }

  const detach = (): void => {
    stopScroll.current?.()
    stopScroll.current = null
  }

  const reset = (): void => {
    setPad(null)
    drag.current.active = false
    frozen.current.clear()
    setActive(null)
    setOverZone(null)
    setOverIndex(-1)
    setDelta({ x: 0, y: 0 })
    setDropState('idle')
    setDropTarget(null)
  }

  const arm = (fn: () => void): void => {
    let done = false
    const once = (): void => {
      if (done) return
      done = true
      commitRef.current = null
      if (timerRef.current != null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      fn()
    }
    commitRef.current = once
    timerRef.current = window.setTimeout(once, DEFAULT_FEEL.duration + SETTLE_FALLBACK)
  }

  // Slot-indexed: indexing the filtered frozen array is off-by-one for within-zone trailing drops.
  const targetXY = (zoneId: string, idx: number): { x: number; y: number } => {
    const rects = frozen.current.get(zoneId) ?? []
    if (rects.length === 0) {
      const c = zones.current.get(zoneId)?.container?.getBoundingClientRect()
      return { x: c ? c.left + 10 : 0, y: c ? c.top + 10 : 0 }
    }
    const slot = clamp(idx, 0, rects.length)
    return cellAt(rects, slot, drag.current.pitch, zoneWidth(zoneId))
  }

  const onDrop = (): void => {
    const d = drag.current
    if (!d.rect) return
    // Cleared here, not in reset, so a press during the settle can fast-forward the armed commit.
    d.active = false
    const rect = d.rect
    // The true zone under the drop point: d.overZone sticks to the last zone crossed.
    const dropZone = crossZoneRef.current ? zoneAt(d.lastX, d.lastY) : d.zone
    if (!dropZone) {
      setDropState('dropping')
      setDropTarget({ x: 0, y: 0 })
      arm(reset)
      return
    }
    if (!frozen.current.has(dropZone)) frozen.current.set(dropZone, measure(dropZone))
    // The hysteresis-smoothed index, so the card commits to the slot the preview showed.
    const rawIndex = dropZone === d.overZone ? d.overIndex : indexAt(dropZone, d.lastX, d.lastY)
    const toIndex = resolveIndexRef.current
      ? resolveIndexRef.current(dropZone, rawIndex, d.id)
      : rawIndex
    if (toIndex === null) {
      setDropState('dropping')
      setDropTarget({ x: 0, y: 0 })
      arm(reset)
      return
    }
    const tgt = targetXY(dropZone, toIndex)
    setDropState('dropping')
    setDropTarget({ x: tgt.x - rect.left, y: tgt.y - rect.top })
    arm(() => {
      onCommitRef.current(d.id, dropZone, toIndex)
      announce('Moved card.')
      reset()
    })
  }

  const onAbort = (): void => {
    if (!drag.current.active) return
    drag.current.active = false
    setDropState('dropping')
    setDropTarget({ x: 0, y: 0 })
    arm(reset)
  }

  const onScrollTracked = (): void => {
    onScroll()
    if (drag.current.active) trackAt(drag.current.lastX, drag.current.lastY)
  }

  const begin = (zoneId: string, id: string, e: ReactPointerEvent): void => {
    if (drag.current.active) return
    if (commitRef.current) commitRef.current()
    const z = zones.current.get(zoneId)
    const el = z?.els.get(id) ?? null
    if (!el) return
    const interactive = !!(e.target as Element)?.closest?.(
      '[data-drag-slop], button, input, textarea, select, a[href], [contenteditable]',
    )
    drag.current = {
      id,
      zone: zoneId,
      el,
      rect: null,
      startX: e.clientX,
      startY: e.clientY,
      active: false,
      srcIdx: -1,
      pitch: 0,
      overZone: '',
      overIndex: -1,
      lastX: e.clientX,
      lastY: e.clientY,
      interactive,
      idxAnchorX: e.clientX,
      idxAnchorY: e.clientY,
    }
    beginGesture({
      el,
      event: e,
      activation: interactive ? INTERACTIVE_ACTIVATION : ACTIVATION,
      // Not pointer capture: it would retarget a no-move tap's click onto the handle.
      capture: false,
      onActivate,
      onDragMove,
      onDrop,
      onAbort,
      onWindowScroll: onScrollTracked,
      onDisclose: measureBounds,
      teardown: detach,
    })
  }

  const itemState = (
    zoneId: string,
    id: string,
  ): { transform: string; hidden: boolean; animate: boolean } => {
    if (!active) return { transform: 'translate3d(0,0,0)', hidden: false, animate: false }
    if (id === active.id) return { transform: 'translate3d(0,0,0)', hidden: true, animate: false }
    const z = zones.current.get(zoneId)
    const rects = frozen.current.get(zoneId)
    const oi = z?.ids.indexOf(id) ?? -1
    if (!z || !rects || oi === -1 || !rects[oi])
      return { transform: 'translate3d(0,0,0)', hidden: false, animate: dropState !== 'idle' }
    const order = z.ids.filter((x) => x !== active.id)
    if (zoneId === overZone) order.splice(clamp(overIndex, 0, order.length), 0, active.id)
    const slot = order.indexOf(id)
    const base = rects[oi]
    const tgt = cellAt(rects, slot, active.pitch, zoneWidth(zoneId))
    const zf = zoomRef.current
    return {
      transform: `translate3d(${px((tgt.x - base.left) / zf)}, ${px((tgt.y - base.top) / zf)}, 0)`,
      hidden: false,
      animate: dropState !== 'idle',
    }
  }

  useEffect(
    () => () => {
      detach()
      if (timerRef.current != null) clearTimeout(timerRef.current)
    },
    [],
  )

  const value = useMemo<GroupValue>(
    () => ({
      active,
      overZone,
      overIndex,
      dropState,
      setZoneIds,
      registerContainer,
      registerItem,
      begin,
      itemState,
    }),
    [active, overZone, overIndex, dropState],
  )

  const overlayStyle: CSSProperties | null =
    active && dropState !== 'idle'
      ? {
          position: 'fixed',
          left: active.rect.left,
          top: active.rect.top,
          width: active.rect.width,
          height: active.rect.height,
          transform:
            dropState === 'dropping' && dropTarget
              ? `translate3d(${px(dropTarget.x)}, ${px(dropTarget.y)}, 0)`
              : `translate3d(${px(delta.x)}, ${px(delta.y)}, 0)`,
          transition:
            dropState === 'dropping' ? `transform ${feel.duration}ms ${feel.easing}` : 'none',
          pointerEvents: 'none',
          zIndex: stack.top.floating,
        }
      : null

  const placeSlot =
    active && dropState === 'dragging' && overZone ? targetXY(overZone, overIndex) : null

  return (
    <GroupCtx.Provider value={value}>
      {children}
      {placeSlot &&
        active &&
        createPortal(
          <div
            className="drop-slot"
            style={{
              position: 'fixed',
              left: placeSlot.x,
              top: placeSlot.y,
              width: active.rect.width,
              height: active.rect.height,
              zIndex: stack.top.dropPreview,
            }}
          />,
          document.body,
        )}
      {overlayStyle &&
        active &&
        createPortal(
          <div
            style={overlayStyle}
            onTransitionEnd={(e) => {
              if (e.propertyName === 'transform' && dropState === 'dropping') commitRef.current?.()
            }}
          >
            {renderOverlay?.(active.id, active.rect)}
          </div>,
          document.body,
        )}
    </GroupCtx.Provider>
  )
}

export function GroupZone({
  id,
  items,
  className,
  children,
}: {
  id: string
  items: string[]
  className?: string
  children: ReactNode
}): React.JSX.Element {
  const group = useContext(GroupCtx)
  if (!group) throw new Error('A grouped SortableZone must be inside a <DragGroup>')
  group.setZoneIds(id, items)
  return (
    <ZoneIdCtx.Provider value={id}>
      <ul ref={(el) => group.registerContainer(id, el)} className={className}>
        {children}
      </ul>
    </ZoneIdCtx.Provider>
  )
}

export function useGroupedDragItem(id: string): DragItem {
  const group = useContext(GroupCtx)
  const zoneId = useContext(ZoneIdCtx)
  if (!group || zoneId == null)
    throw new Error('useGroupedDragItem must be used inside a grouped <SortableZone>')
  const { transform, hidden, animate } = group.itemState(zoneId, id)
  const feel = DEFAULT_FEEL
  const isDragging = group.active?.id === id
  return {
    setNodeRef: (el) => group.registerItem(zoneId, id, el),
    style: {
      transform,
      transition: animate ? `transform ${feel.duration}ms ${feel.easing}` : 'none',
      visibility: hidden ? 'hidden' : undefined,
      position: 'relative',
      touchAction: 'none',
    },
    handle: {
      onPointerDown: (e: ReactPointerEvent) => group.begin(zoneId, id, e),
      'aria-roledescription': 'sortable',
      'aria-pressed': isDragging || undefined,
    },
    isDragging,
  }
}
