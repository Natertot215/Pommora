import { type CSSProperties, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { findScroller, startAutoScroll } from '@renderer/Interactions/autoscroll'
import { GLIDE_FEEL } from '@renderer/Animation/feel'
import { usePointerGesture } from '@renderer/Interactions/gesture'
import { SETTLE_FALLBACK } from '@renderer/Interactions/shared'
import { TILE_MIN_PX } from '@renderer/DesignSystem/Tokens/size.css'
import { findTile } from './Core/model'
import type { DividerRef, Edge, TileLayout } from './Core/model'
import { resolveEdge } from './Core/edges'
import { hitTest, type DropTarget } from './Core/hitTest'
import {
  moveTile,
  moveTileToBand,
  resizeBandPair,
  resizeDivider,
  resizeStackPair,
  stretchTileHeight,
} from './Core/ops'
import { computeGeometry, type Rect } from './Core/rects'
import { snapAxis, xCandidates, yCandidates } from './Core/snap'
import './tile-base.css'
import './tile-grid.css'

// Every gesture is snapshot → preview → commit/abort against the frozen drag-origin layout;
// releasing settles the tile and the layout commits on transitionend.

export interface TileGridProps {
  layout: TileLayout
  onLayoutChange: (layout: TileLayout) => void
  /** Must be identity-stable and must not close over mutable per-tile data — tiles memoize on it. */
  renderTile: (id: string, rect: Rect) => React.ReactNode
  tileClassName?: (id: string) => string | undefined
  /** Inline style on the tile itself; identity-stable per value, the tile memoizes on it. */
  tileStyle?: (id: string) => CSSProperties | undefined
  onBusyChange?: (busy: boolean) => void
  /** Freezes drag + resize; the handle still opens the menu. */
  isTileStatic?: (id: string) => boolean
  onHandleMenu?: (id: string, e: React.MouseEvent) => void
  onBackdrop?: (target: BackdropTarget, e: React.MouseEvent) => void
}

export type BackdropTarget = { kind: 'append' } | { kind: 'wedge'; above: string; fillPx: number }

type TilePhase = 'idle' | 'reflow' | 'lifted' | 'settling'

interface TileDrag {
  id: string
  lift: Rect
}

interface Settle {
  id: string
  to: Rect
  next: TileLayout | null
}

const HANDLE_REVEAL_PX = 240
const TRACK_SETTLE_MS = 160
// KNOB — grid gutter, drop-band zone, snap radius, and the append space under the last band.
const GAP = 8
const BAND_ZONE_PX = 10
const SNAP_PX = 9
const BOTTOM_PAD_PX = 28
const SHELL_TRANSITION = `${GLIDE_FEEL.duration}ms ${GLIDE_FEEL.easing}`

const EDGE_ZONES: Edge[][] = [
  ['n'],
  ['s'],
  ['e'],
  ['w'],
  ['n', 'e'],
  ['n', 'w'],
  ['s', 'e'],
  ['s', 'w'],
]

const refKey = (ref: { band: number; path: number[]; index: number }): string =>
  `${ref.band}|${ref.path.join('.')}|${ref.index}`

const TileShell = memo(
  function TileShell({
    id,
    rect,
    phase,
    resizing,
    extraClass,
    extraStyle,
    renderTile,
    onHandleDown,
    onHandleMenu,
    onEdgeDown,
    onSettled,
  }: {
    id: string
    rect: Rect
    phase: TilePhase
    resizing: boolean
    extraClass?: string
    extraStyle?: CSSProperties
    renderTile: (id: string, rect: Rect) => React.ReactNode
    onHandleDown: (id: string, e: React.PointerEvent<HTMLElement>) => void
    onHandleMenu?: (id: string, e: React.MouseEvent) => void
    onEdgeDown: (id: string, edges: Edge[], e: React.PointerEvent<HTMLElement>) => void
    onSettled: (id: string) => void
  }) {
    const transition =
      phase === 'lifted'
        ? 'none'
        : phase === 'reflow' || phase === 'settling'
          ? `transform ${SHELL_TRANSITION}, width ${SHELL_TRANSITION}, height ${SHELL_TRANSITION}`
          : undefined
    // Rect cached on enter (no per-move layout reads); state flips only on threshold crossing.
    const [handleNear, setHandleNear] = useState(false)
    const cornerRef = useRef<{ x: number; y: number } | null>(null)
    return (
      <div
        className={`tile tile-base${phase === 'lifted' || phase === 'settling' ? ' is-lifted' : ''}${
          resizing ? ' is-resizing' : ''
        }${extraClass ? ` ${extraClass}` : ''}${handleNear ? ' handle-near' : ''}`}
        onPointerEnter={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          cornerRef.current = { x: r.left, y: r.top }
        }}
        onPointerMove={(e) => {
          const c = cornerRef.current
          if (!c) return
          const near = Math.hypot(e.clientX - c.x, e.clientY - c.y) < HANDLE_REVEAL_PX
          if (near !== handleNear) setHandleNear(near)
        }}
        onPointerLeave={() => {
          cornerRef.current = null
          if (handleNear) setHandleNear(false)
        }}
        style={{
          ...extraStyle,
          transform: `translate(${rect.x}px, ${rect.y}px)`,
          width: rect.w,
          height: rect.h,
          transition,
        }}
        onTransitionEnd={(e) => {
          // Target-guarded: tile CONTENT animating a transform bubbles its
          // transitionend up here — only the shell's own settle may commit.
          if (
            phase === 'settling' &&
            e.target === e.currentTarget &&
            e.propertyName === 'transform'
          )
            onSettled(id)
        }}
      >
        {/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a pointer-only drag affordance; keyboard reordering is not implemented */}
        <div
          className="tile-handle"
          onPointerDown={(e) => onHandleDown(id, e)}
          onClick={(e) => onHandleMenu?.(id, e)}
          onContextMenu={(e) => {
            e.preventDefault()
            onHandleMenu?.(id, e)
          }}
        />
        {EDGE_ZONES.map((edges) => (
          <div
            key={edges.join('')}
            className={`tile-edge resize-edge resize-edge-${edges.join('')}`}
            onPointerDown={(e) => onEdgeDown(id, edges, e)}
          />
        ))}
        <div className="tile-base-body">{renderTile(id, rect)}</div>
      </div>
    )
  },
  (a, b) =>
    a.id === b.id &&
    a.phase === b.phase &&
    a.resizing === b.resizing &&
    a.extraClass === b.extraClass &&
    a.extraStyle === b.extraStyle &&
    a.renderTile === b.renderTile &&
    a.onHandleDown === b.onHandleDown &&
    a.onHandleMenu === b.onHandleMenu &&
    a.onEdgeDown === b.onEdgeDown &&
    a.onSettled === b.onSettled &&
    a.rect.x === b.rect.x &&
    a.rect.y === b.rect.y &&
    a.rect.w === b.rect.w &&
    a.rect.h === b.rect.h,
)

export function TileGrid({
  layout,
  onLayoutChange,
  renderTile,
  tileClassName,
  tileStyle,
  onBusyChange,
  isTileStatic,
  onHandleMenu,
  onBackdrop,
}: TileGridProps): React.JSX.Element {
  const gridRef = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(0)
  const [draft, setDraft] = useState<TileLayout | null>(null)
  const [tileDrag, setTileDrag] = useState<TileDrag | null>(null)
  const [settle, setSettle] = useState<Settle | null>(null)
  const [resizingId, setResizingId] = useState<string | null>(null)
  // A handle press owns the layout from the press, before the lift: the drag reads what was there.
  const [pressedId, setPressedId] = useState<string | null>(null)
  const begin = usePointerGesture()

  // While the surface WIDTH is animating, tiles must track 1:1 — their own width transition
  // would lag the pane. `tracking` holds until the observer goes quiet.
  const [tracking, setTracking] = useState(false)
  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    setWidth(el.clientWidth)
    let settleTimer: ReturnType<typeof setTimeout> | null = null
    const ro = new ResizeObserver(() => {
      setWidth(el.clientWidth)
      setTracking(true)
      if (settleTimer) clearTimeout(settleTimer)
      settleTimer = setTimeout(() => setTracking(false), TRACK_SETTLE_MS)
    })
    ro.observe(el)
    return () => {
      ro.disconnect()
      if (settleTimer) clearTimeout(settleTimer)
    }
  }, [])

  // Hit-testing and boundary extents run against the frozen origin's geometry —
  // a preview shifting under the pointer must never retarget the gesture.
  const originGeometry = useMemo(
    () => computeGeometry(layout, Math.max(0, width), GAP),
    [layout, width],
  )
  const geometry = useMemo(
    () => (draft ? computeGeometry(draft, Math.max(0, width), GAP) : originGeometry),
    [draft, originGeometry, width],
  )

  const now = {
    layout,
    originGeometry,
    onLayoutChange,
    isTileStatic,
  }
  const live = useRef(now)
  live.current = now

  // The ref mirrors the state so the commit runs as a plain event side effect — never inside a
  // state updater (React forbids cross-component updates there).
  const settleRef = useRef<Settle | null>(null)
  const finishSettle = useCallback((id: string) => {
    const s = settleRef.current
    if (!s || s.id !== id) return
    settleRef.current = null
    setSettle(null)
    setDraft(null)
    if (s.next && s.next !== live.current.layout) live.current.onLayoutChange(s.next)
  }, [])

  useEffect(() => {
    if (!settle) return
    const t = setTimeout(() => finishSettle(settle.id), GLIDE_FEEL.duration + SETTLE_FALLBACK)
    return () => clearTimeout(t)
  }, [settle, finishSettle])
  // A decided move outlives the grid: navigating away mid-settle still commits it.
  useEffect(
    () => () => {
      if (settleRef.current) finishSettle(settleRef.current.id)
    },
    [finishSettle],
  )

  // Left in, the boundary's own edge magnetizes the drag back to its start, making
  // sub-snapPx adjustment impossible — filter it per action.
  const withoutOwn = (candidates: number[], start: number): number[] =>
    candidates.filter((c) => Math.abs(c - start) > 0.5)

  const gestureOrigin = (id: string, e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0 || live.current.isTileStatic?.(id)) return null
    e.preventDefault()
    e.stopPropagation()
    // A gesture starting during a live settle takes over: finalize the pending commit NOW — the
    // parent hasn't re-rendered yet, so live.current still holds the pre-commit origin, and a
    // gesture built on that stale origin would silently erase the just-dropped move.
    const settling = settleRef.current
    if (settling) finishSettle(settling.id)
    const pending = settling?.next ?? null
    const grid = gridRef.current
    const g =
      pending && grid
        ? computeGeometry(pending, Math.max(0, grid.clientWidth), GAP)
        : live.current.originGeometry
    const rect = g.tiles.get(id)
    return rect ? { origin: pending ?? live.current.layout, g, grid, rect } : null
  }

  const onEdgeDown = useCallback(
    (id: string, edges: Edge[], e: React.PointerEvent<HTMLElement>) => {
      const from = gestureOrigin(id, e)
      if (!from) return
      const { origin, g, rect: ownRect } = from
      const dividers = new Map(g.dividers.map((d) => [refKey(d.ref), d]))
      const snapX = xCandidates(g)
      const snapY = yCandidates(g)
      type Action =
        | { kind: 'stretch'; start: number; cands: number[] }
        | { kind: 'divider'; ref: DividerRef; start: number; cands: number[] }
        | { kind: 'stack'; ref: DividerRef; start: number; cands: number[] }
        | { kind: 'bandpair'; above: number; start: number; cands: number[] }
      const actions: Action[] = []
      for (const edge of edges) {
        if (edge === 's') {
          const start = ownRect.y + ownRect.h
          actions.push({ kind: 'stretch', start, cands: withoutOwn(snapY, start) })
          continue
        }
        const boundary = resolveEdge(origin, id, edge)
        if (!boundary) continue
        if (boundary.kind === 'bandpair') {
          const start = ownRect.y
          actions.push({
            kind: 'bandpair',
            above: boundary.above,
            start,
            cands: withoutOwn(snapY, start),
          })
          continue
        }
        const start =
          boundary.kind === 'divider'
            ? (dividers.get(refKey(boundary.ref))?.x ?? ownRect.x)
            : ownRect.y
        const axis = boundary.kind === 'divider' ? snapX : snapY
        actions.push({
          kind: boundary.kind,
          ref: boundary.ref,
          start,
          cands: withoutOwn(axis, start),
        })
      }
      if (actions.length === 0) return

      let latest: TileLayout = origin
      const sx = e.clientX
      const sy = e.clientY
      const started = begin({
        el: e.currentTarget,
        event: e,
        activation: 0,
        capture: true,
        swallowActiveEscape: true,
        onActivate: () => true,
        onDragMove: (ev) => {
          const dx = ev.clientX - sx
          const dy = ev.clientY - sy
          latest = actions.reduce((acc, action) => {
            const raw = action.kind === 'divider' ? dx : dy
            const delta = snapAxis(action.start + raw, action.cands, SNAP_PX) - action.start
            if (action.kind === 'stretch') return stretchTileHeight(acc, id, delta, TILE_MIN_PX)
            if (action.kind === 'stack') return resizeStackPair(acc, action.ref, delta, TILE_MIN_PX)
            if (action.kind === 'bandpair')
              return resizeBandPair(acc, action.above, delta, TILE_MIN_PX)
            const extent = dividers.get(refKey(action.ref))?.extentPx ?? 0
            return resizeDivider(acc, action.ref, delta, extent, TILE_MIN_PX)
          }, origin)
          setDraft(latest)
        },
        onDrop: () => {
          if (latest !== origin) live.current.onLayoutChange(latest)
        },
        teardown: () => {
          setResizingId(null)
          setDraft(null)
        },
      })
      if (started) setResizingId(id)
    },
    [begin],
  )

  const onHandleDown = useCallback(
    (id: string, e: React.PointerEvent<HTMLElement>) => {
      const from = gestureOrigin(id, e)
      if (!from) return
      const { origin, g, grid, rect } = from
      if (!grid) return
      const downBox = grid.getBoundingClientRect()
      // The grab offset is frozen at the down event — recomputing it per move would
      // cancel the pointer delta and pin the lifted tile to its origin.
      const grab = {
        x: e.clientX - downBox.left - rect.x,
        y: e.clientY - downBox.top - rect.y,
      }
      // Reads the REAL scroll ancestor's delta (the grid never scrolls itself), folding
      // our own autoscroll back into the pointer math.
      const scroller = findScroller(grid, 'xy')
      const scroll0 = { x: scroller?.scrollLeft ?? 0, y: scroller?.scrollTop ?? 0 }
      let latest: TileLayout = origin
      let target: DropTarget = null
      let moved = false
      const lastPoint = { x: e.clientX, y: e.clientY }
      let stopScroll: (() => void) | null = null

      const resolve = (clientX: number, clientY: number): void => {
        const dsx = (scroller?.scrollLeft ?? 0) - scroll0.x
        const dsy = (scroller?.scrollTop ?? 0) - scroll0.y
        const px = clientX - downBox.left + dsx
        const py = clientY - downBox.top + dsy
        setTileDrag({ id, lift: { x: px - grab.x, y: py - grab.y, w: rect.w, h: rect.h } })
        target = hitTest(g, origin, id, px, py, BAND_ZONE_PX, target)
        latest = applyTarget(origin, id, target)
        setDraft(latest === origin ? null : latest)
      }

      const settleInto = (decided: TileLayout | null): void => {
        const finalGeometry = decided
          ? computeGeometry(decided, Math.max(0, grid.clientWidth), GAP)
          : g
        const to = finalGeometry.tiles.get(id) ?? rect
        setTileDrag(null)
        if (!decided) setDraft(null)
        const s: Settle = { id, to, next: decided }
        settleRef.current = s
        setSettle(s)
      }

      const started = begin({
        el: e.currentTarget,
        event: e,
        capture: true,
        swallowActiveEscape: true,
        onActivate: () => true,
        onDragMove: (ev) => {
          moved = true
          lastPoint.x = ev.clientX
          lastPoint.y = ev.clientY
          // The instance-scoped stopper (not the global) is what teardown calls, so no teardown can
          // cross drags.
          if (!stopScroll && scroller) {
            stopScroll = startAutoScroll({
              getPoint: () => lastPoint,
              scroller,
              dragEl: grid,
              axis: 'xy',
              onScrolled: () => resolve(lastPoint.x, lastPoint.y),
            })
          }
          resolve(ev.clientX, ev.clientY)
        },
        onDrop: () => settleInto(target && latest !== origin ? latest : null),
        onAbort: () => {
          if (moved) settleInto(null)
        },
        teardown: () => {
          stopScroll?.()
          setPressedId(null)
        },
      })
      if (started) setPressedId(id)
    },
    [begin],
  )

  const busy = pressedId !== null || resizingId !== null || tileDrag !== null || settle !== null
  useEffect(() => {
    onBusyChange?.(busy)
    return () => onBusyChange?.(false)
  }, [busy, onBusyChange])

  const interacting = resizingId !== null || tracking
  const dropSlot = tileDrag && draft ? geometry.tiles.get(tileDrag.id) : null

  const onGridContextMenu = (e: React.MouseEvent): void => {
    if (!onBackdrop || e.target !== e.currentTarget) return
    e.preventDefault()
    const grid = gridRef.current
    if (!grid) return
    const box = grid.getBoundingClientRect()
    const px = e.clientX - box.left
    const py = e.clientY - box.top
    const g = live.current.originGeometry
    let above: { id: string; bottom: number; band: number } | null = null
    for (const [id, r] of g.tiles) {
      const bottom = r.y + r.h
      if (px >= r.x && px <= r.x + r.w && py >= bottom && (!above || bottom > above.bottom)) {
        const at = findTile(live.current.layout, id)
        if (at) above = { id, bottom, band: at.band }
      }
    }
    if (!above) {
      onBackdrop({ kind: 'append' }, e)
      return
    }
    const seam = g.bandEdges[above.band]
    const bandBottom = seam ? seam.y - GAP / 2 : g.totalHeight
    const fillPx = bandBottom - above.bottom - GAP
    if (fillPx < TILE_MIN_PX || py > bandBottom) onBackdrop({ kind: 'append' }, e)
    else onBackdrop({ kind: 'wedge', above: above.id, fillPx }, e)
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics
    <div
      ref={gridRef}
      className={`tile-grid${interacting ? ' is-interacting' : ''}`}
      style={{ height: geometry.totalHeight + BOTTOM_PAD_PX }}
      onContextMenu={onGridContextMenu}
    >
      {/* Tiles render in STABLE id order, never tree order — a mid-drag preview reorders the
          tree, and React moving the keyed DOM nodes to match would remount every reflowing tile
          mid-transition. Position is absolute; DOM order is moot. */}
      {[...geometry.tiles.entries()]
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([id, rect]) => {
          const lifted = tileDrag?.id === id ? tileDrag : null
          const settling = settle?.id === id ? settle : null
          const phase: TilePhase = lifted
            ? 'lifted'
            : settling
              ? 'settling'
              : tileDrag || settle
                ? 'reflow'
                : 'idle'
          return (
            <TileShell
              key={id}
              id={id}
              rect={lifted?.lift ?? settling?.to ?? rect}
              phase={phase}
              resizing={resizingId === id}
              extraClass={tileClassName?.(id)}
              extraStyle={tileStyle?.(id)}
              renderTile={renderTile}
              onHandleDown={onHandleDown}
              onHandleMenu={onHandleMenu}
              onEdgeDown={onEdgeDown}
              onSettled={finishSettle}
            />
          )
        })}

      {dropSlot && (
        <div
          className="tile-placement drop-slot"
          style={{
            transform: `translate(${dropSlot.x}px, ${dropSlot.y}px)`,
            width: dropSlot.w,
            height: dropSlot.h,
          }}
        />
      )}
    </div>
  )
}

function applyTarget(origin: TileLayout, id: string, target: DropTarget): TileLayout {
  if (!target) return origin
  if (target.kind === 'band') return moveTileToBand(origin, id, target.index)
  return moveTile(origin, id, target.id, target.edge)
}
