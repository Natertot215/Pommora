import {
  type CSSProperties,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { findScroller, scrollContainer } from '@pommora/uix/Interactions/autoscroll'
import { GLIDE_FEEL } from '@pommora/uix/Animations/feel'
import { ADD_STRIP_PX } from '@pommora/uix/Theme/theme-vars.css'
import { useHeldPresence, useSettleFallback } from '@pommora/uix/Animations/useExitPresence'
import { usePointerGesture } from '@pommora/uix/Interactions/gesture'
import { HYSTERESIS } from '@pommora/uix/Interactions/shared'
import { TILE_MIN_PX } from '@pommora/uix/Utilities/tileMetrics'
import {
  ghostAnchorProps,
  useClearStrandedGhost,
  useGhostAnchor,
} from '@pommora/uix/Interactions/ghostCreate'
import {
  type Reach,
  REVEAL_GRACE_MS,
  trackNear,
  withinReach,
} from '@pommora/uix/Interactions/hoverReveal'
import { revealTarget } from '@pommora/uix/Interactions/hover-reveal.css'
import { cx } from '@pommora/uix/Utilities/cx'
import { Icon } from '@pommora/uix/Symbols'
import { text } from '@pommora/uix/Theme'
import { type DividerRef, type Edge, NEW_TILE_H, TILE_GAP, type TileLayout } from './Layout/model'
import { resolveEdge } from './Layout/edges'
import { hitTest, type DropTarget, sameTarget } from './Layout/hitTest'
import {
  moveTile,
  moveTileToBand,
  resizeBandPair,
  resizeDivider,
  resizeStackPair,
  stretchTileHeight,
} from './Layout/ops'
import { computeGeometry, type Placement, pinned, placeTiles, wedgeFills } from './Layout/rects'
import { snapAxis, xCandidates, yCandidates } from './Layout/snap'
import { stackLayout, stackedAt } from './Layout/stack'
import { useLatest } from '@pommora/uix/Utilities/stableApi'
import './tile-base.css'
import './tile-grid.css'

interface TileGridProps {
  layout: TileLayout
  onLayoutChange: (layout: TileLayout) => void
  renderTile: (id: string) => React.ReactNode
  tileClassName: (id: string) => string | undefined
  editingId: string | null
  menuOpenId: string | null
  inserting: Inserting | null
  tileStyle: (id: string) => CSSProperties | undefined
  onBusyChange: (busy: boolean) => void
  locked: boolean
  isTileLocked: (id: string) => boolean
  onHandleMenu: (id: string, e: React.MouseEvent) => void
  onInsert: (target: InsertTarget, e: React.MouseEvent) => void
}

/** Where a new tile lands: as the board's last band, at the height the room below the board gave its ghost or else the default, or flush in the wedge under a tile. */
export type InsertTarget = { kind: 'append'; h?: number } | { kind: 'wedge'; above: string }

/** The Insert Menu a ghost or the add strip opened, held while the menu is open and then through its create's flight. */
export interface Inserting {
  target: InsertTarget
  phase: 'menu' | 'flight'
}

type TilePhase = 'idle' | 'reflow' | 'lifted' | 'settling'

interface TileDrag {
  id: string
  lift: Placement
}

interface Settle {
  id: string
  to: Placement
  next: TileLayout | null
}

const HANDLE_REACH: Reach = { size: 'corner', toward: { x: 1, y: 1 } }
// KNOB — drop-band zone and snap radius.
const BAND_ZONE_PX = 10
const SNAP_PX = 9
// The clearance under the last band is the add strip's seat: a gutter and the strip, so the board ends where the strip does.
const BOTTOM_PAD_PX = TILE_GAP + ADD_STRIP_PX
// KNOB — a wedge's dwell, and the least a bottom ghost may fill before the bottom offers the strip instead.
const WEDGE_DWELL_MS = 1000
const BOTTOM_FILL_MIN_PX = 80
/** The bottom zone's anchor on the ghost hook; a tile's id is a ULID, so the two never meet. */
const APPEND = 'append'
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

// The share rides `left` and `width` as percentages, so the browser lays the board out at whatever width the grid has, the frame it has it; the pixels ride the transform with y, so every move transitions `transform`, the property a settle commits on.
const placementStyle = (p: Placement): CSSProperties => ({
  left: `${p.x.share * 100}%`,
  transform: `translate(${p.x.px}px, ${p.y}px)`,
  width: `calc(${p.w.share * 100}% ${p.w.px < 0 ? '-' : '+'} ${Math.abs(p.w.px)}px)`,
  height: p.h,
})

/** The height a bottom ghost fills: the pane's room from the last band down to its own end, less what the pane keeps under the board and the gutter the ghost sits behind, so the board's growth while the ghost shows gives the pane no scroll. Read from the band, so the ghost's own growth never feeds it; null where it is less than a tile worth offering. */
const fillBelow = (grid: HTMLElement, totalHeight: number): number | null => {
  const pane = scrollContainer(grid, 'y')
  if (!pane) return NEW_TILE_H
  const box = grid.getBoundingClientRect()
  const trailing = (pane.lastElementChild ?? grid).getBoundingClientRect().bottom - box.bottom
  const fill =
    Math.floor(pane.getBoundingClientRect().bottom - box.top - trailing) - totalHeight - TILE_GAP
  return fill >= BOTTOM_FILL_MIN_PX ? fill : null
}

const TileShell = memo(
  function TileShell({
    id,
    place,
    phase,
    resizing,
    editing,
    menuOpen,
    extraClass,
    extraStyle,
    renderTile,
    onHandleDown,
    onHandleMenu,
    onEdgeDown,
    onSettled,
  }: {
    id: string
    place: Placement
    phase: TilePhase
    resizing: boolean
    editing: boolean
    menuOpen: boolean
    extraClass?: string
    extraStyle?: CSSProperties
    renderTile: (id: string) => React.ReactNode
    onHandleDown: (id: string, e: React.PointerEvent<HTMLElement>) => void
    onHandleMenu: (id: string, e: React.MouseEvent) => void
    onEdgeDown: (id: string, edges: Edge[], e: React.PointerEvent<HTMLElement>) => void
    onSettled: (id: string) => void
  }) {
    const transition =
      phase === 'lifted'
        ? 'none'
        : phase === 'reflow' || phase === 'settling'
          ? `left ${SHELL_TRANSITION}, transform ${SHELL_TRANSITION}, width ${SHELL_TRANSITION}, height ${SHELL_TRANSITION}`
          : undefined
    const [handleNear, setHandleNear] = useState(false)
    const tileRef = useRef<HTMLDivElement>(null)
    const handleRef = useRef<HTMLDivElement>(null)
    // The reach runs from the tile's top edge at the handle's left; a press holds the reveal where it stands, since the handle is what a drag grips.
    useEffect(() => {
      const tile = tileRef.current
      if (!editing || !tile) return
      const handle = handleRef.current ?? tile
      return trackNear({
        anchor: handle,
        scope: tile,
        measure: () => {
          const top = tile.getBoundingClientRect().top
          const left = handle.getBoundingClientRect().left
          const corner = { left, top, right: left, bottom: top }
          return (x, y) => withinReach(corner, HANDLE_REACH, x, y)
        },
        report: (at) => {
          if (at !== 'held') setHandleNear(at === 'near')
        },
      }).stop
    }, [editing])
    return (
      <div
        ref={tileRef}
        className={cx(
          'tile tile-base',
          (phase === 'lifted' || phase === 'settling') && 'is-lifted',
          resizing && 'is-resizing',
          editing && 'is-editing-tile',
          menuOpen && 'handle-pinned',
          extraClass,
        )}
        data-reveal-host={editing ? (handleNear ? 'on' : 'off') : ''}
        style={{
          ...extraStyle,
          ...placementStyle(place),
          transition,
        }}
        onTransitionEnd={(e) => {
          // Target-guarded: tile CONTENT animating a transform bubbles its transitionend up here — only the shell's own settle may commit.
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
          ref={handleRef}
          className={cx('tile-handle', revealTarget)}
          data-reveal-held={menuOpen || undefined}
          onPointerDown={(e) => onHandleDown(id, e)}
          onClick={(e) => onHandleMenu(id, e)}
          onContextMenu={(e) => {
            e.preventDefault()
            onHandleMenu(id, e)
          }}
        />
        {EDGE_ZONES.map((edges) => (
          <div
            key={edges.join('')}
            className={`tile-edge resize-edge resize-edge-${edges.join('')}`}
            onPointerDown={(e) => onEdgeDown(id, edges, e)}
          />
        ))}
        <div className="tile-base-body">{renderTile(id)}</div>
      </div>
    )
  },
  (a, b) =>
    a.id === b.id &&
    a.phase === b.phase &&
    a.resizing === b.resizing &&
    a.editing === b.editing &&
    a.menuOpen === b.menuOpen &&
    a.extraClass === b.extraClass &&
    a.extraStyle === b.extraStyle &&
    a.renderTile === b.renderTile &&
    a.onHandleDown === b.onHandleDown &&
    a.onHandleMenu === b.onHandleMenu &&
    a.onEdgeDown === b.onEdgeDown &&
    a.onSettled === b.onSettled &&
    a.place.x.share === b.place.x.share &&
    a.place.x.px === b.place.x.px &&
    a.place.y === b.place.y &&
    a.place.w.share === b.place.w.share &&
    a.place.w.px === b.place.w.px &&
    a.place.h === b.place.h,
)

export function TileGrid({
  layout,
  onLayoutChange,
  renderTile,
  tileClassName,
  editingId,
  menuOpenId,
  inserting,
  tileStyle,
  onBusyChange,
  locked,
  isTileLocked,
  onHandleMenu,
  onInsert,
}: TileGridProps): React.JSX.Element {
  const gridRef = useRef<HTMLDivElement | null>(null)
  const [stacked, setStacked] = useState(false)
  const [draft, setDraft] = useState<TileLayout | null>(null)
  const [tileDrag, setTileDrag] = useState<TileDrag | null>(null)
  const [settle, setSettle] = useState<Settle | null>(null)
  const [resizingId, setResizingId] = useState<string | null>(null)
  // A handle press owns the layout from the press, before the lift: the drag reads what was there.
  const [pressedId, setPressedId] = useState<string | null>(null)
  const begin = usePointerGesture()

  // Under the stacking width the board is DRAWN as one column; the tree the grid was handed is still the tree it hands back.
  const view = useMemo(() => (stacked ? stackLayout(layout) : layout), [layout, stacked])
  const placed = useMemo(() => placeTiles(draft ?? view, TILE_GAP), [draft, view])
  // Keyed on the drawn tree, so it never recomputes under a gesture's draft; the stacked view is one bare tile per band and so has no wedge.
  const wedges = useMemo(() => wedgeFills(view, TILE_GAP, TILE_MIN_PX), [view])

  const boardStatic = locked || stacked
  const busy = pressedId !== null || resizingId !== null || tileDrag !== null || settle !== null
  // A board with tiles offers its wedge ghosts and its add strip while it is unlocked and at rest; a stacked board has no wedge and keeps the strip.
  const zones = !locked && !busy && view.bands.length > 0
  const live = useLatest({ view, onLayoutChange, boardStatic, isTileLocked, placed })

  // The ref mirrors the state so the commit runs as a plain event side effect, never inside a state updater (React forbids cross-component updates there).
  const settleRef = useRef<Settle | null>(null)
  const finishSettle = useCallback((id: string) => {
    const s = settleRef.current
    if (!s || s.id !== id) return
    settleRef.current = null
    setSettle(null)
    setDraft(null)
    if (s.next && s.next !== live.current.view) live.current.onLayoutChange(s.next)
  }, [])

  useSettleFallback(settle !== null, 'slow', () => {
    if (settleRef.current) finishSettle(settleRef.current.id)
  })
  useEffect(
    () => () => {
      if (settleRef.current) finishSettle(settleRef.current.id)
    },
    [finishSettle],
  )

  // Left in, the boundary's own edge magnetizes the drag back to its start, making sub-snapPx adjustment impossible.
  const withoutOwn = (candidates: number[], start: number): number[] =>
    candidates.filter((c) => Math.abs(c - start) > 0.5)

  const gestureOrigin = (id: string, e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0 || live.current.boardStatic || live.current.isTileLocked(id)) return null
    e.preventDefault()
    e.stopPropagation()
    // A gesture starting during a live settle finalizes the pending commit NOW: the parent hasn't re-rendered, so a gesture built on the stale origin would erase the just-dropped move.
    const settling = settleRef.current
    if (settling) finishSettle(settling.id)
    const grid = gridRef.current
    if (!grid) return null
    const origin = settling?.next ?? live.current.view
    // Hit-testing and boundary extents run against the origin measured at the press — a preview shifting under the pointer must never retarget the gesture.
    const g = computeGeometry(origin, grid.clientWidth, TILE_GAP)
    const rect = g.tiles.get(id)
    return rect ? { origin, g, grid, rect } : null
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
      const downBox = grid.getBoundingClientRect()
      // The grab offset is frozen at the down event — recomputing it per move would cancel the pointer delta and pin the lifted tile to its origin.
      const grab = {
        x: e.clientX - downBox.left - rect.x,
        y: e.clientY - downBox.top - rect.y,
      }
      // Reads the REAL scroll ancestor's delta (the grid never scrolls itself), folding our own autoscroll back into the pointer math.
      const scroller = findScroller(grid, 'xy')
      const scroll0 = { x: scroller?.scrollLeft ?? 0, y: scroller?.scrollTop ?? 0 }
      let latest: TileLayout = origin
      let target: DropTarget = null
      let moved = false
      const lastPoint = { x: e.clientX, y: e.clientY }

      const resolve = (clientX: number, clientY: number): void => {
        const dsx = (scroller?.scrollLeft ?? 0) - scroll0.x
        const dsy = (scroller?.scrollTop ?? 0) - scroll0.y
        const px = clientX - downBox.left + dsx
        const py = clientY - downBox.top + dsy
        setTileDrag({ id, lift: pinned({ x: px - grab.x, y: py - grab.y, w: rect.w, h: rect.h }) })
        const next = hitTest(g, origin, id, px, py, BAND_ZONE_PX, target, HYSTERESIS)
        if (sameTarget(next, target)) return
        target = next
        latest = applyTarget(origin, id, target)
        setDraft(latest === origin ? null : latest)
      }

      const settleInto = (decided: TileLayout | null): void => {
        const to = placeTiles(decided ?? origin, TILE_GAP).tiles.get(id) ?? pinned(rect)
        setTileDrag(null)
        if (!decided) setDraft(null)
        const s: Settle = { id, to, next: decided }
        settleRef.current = s
        setSettle(s)
      }

      const started = begin({
        el: e.currentTarget,
        event: e,
        cursor: 'grabbing',
        autoScroll: { from: grid, axis: 'xy' },
        onDragMove: (ev) => {
          moved = true
          lastPoint.x = ev.clientX
          lastPoint.y = ev.clientY
          resolve(ev.clientX, ev.clientY)
        },
        scrollTarget: () => grid,
        onWindowScroll: () => resolve(lastPoint.x, lastPoint.y),
        onDrop: () => settleInto(target && latest !== origin ? latest : null),
        onAbort: () => {
          if (moved) settleInto(null)
        },
        teardown: () => setPressedId(null),
      })
      if (started) setPressedId(id)
    },
    [begin],
  )

  useEffect(() => {
    if (!busy) return
    onBusyChange(true)
    return () => onBusyChange(false)
  }, [busy, onBusyChange])

  const ghostApi = useGhostAnchor({
    dwellMs: WEDGE_DWELL_MS,
    graceMs: REVEAL_GRACE_MS,
    suppressed: () => inserting !== null,
  })
  useClearStrandedGhost(ghostApi, { has: (id) => zones && (id === APPEND || wedges.has(id)) })
  // The bottom zone is the room under the last band: with a tile's worth it is a ghost's zone that fills it, with less the clearance alone, a hover host revealing the strip; the shape holds through the menu it opened.
  const [fill, setFill] = useState<number | null>(null)

  // Sampled only between gestures and only off a measured width, before paint: a crossing under a held pointer would re-lay the board mid-drag, and a narrow mount must never paint two-across first. The room under the last band rides the same sample, since the pane's height and the board's are what move it.
  useLayoutEffect(() => {
    const grid = gridRef.current
    if (busy || !grid) return
    const sample = (): void => {
      const width = grid.clientWidth
      if (width > 0) setStacked((was) => stackedAt(width, was))
      setFill(fillBelow(grid, live.current.placed.totalHeight))
    }
    sample()
    const ro = new ResizeObserver(sample)
    ro.observe(grid)
    return () => ro.disconnect()
  }, [busy])

  // Tiles render in STABLE id order, never tree order — React moving the keyed DOM nodes to match a mid-drag preview would remount every reflowing tile mid-transition.
  const order = useMemo(
    () => [...placed.tiles].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    [placed],
  )

  const dropSlot = tileDrag && draft ? placed.tiles.get(tileDrag.id) : null

  // A wedge's ghost fills the wedge; an append's is the next band's box, which on an empty board is the first tile's.
  const boxOf = (target: InsertTarget): Placement | null => {
    if (target.kind === 'append')
      return {
        x: { share: 0, px: 0 },
        y: view.bands.length === 0 ? 0 : placed.totalHeight + TILE_GAP,
        w: { share: 1, px: 0 },
        h: target.h ?? NEW_TILE_H,
      }
    const above = placed.tiles.get(target.above)
    const h = wedges.get(target.above)
    return above && h !== undefined
      ? { x: above.x, y: above.y + above.h + TILE_GAP, w: above.w, h }
      : null
  }

  // The open menu's ghost draws from the live value, so the hovered ghost becomes the held one in place; only a dismissed one waits on the presence.
  const seat = useHeldPresence(inserting, 'base')
  const hovered = ghostApi.ghost
  // A bottom row the strip offers has no ghost to hold or fade; the strip holds instead.
  const stripped = (target: InsertTarget): boolean =>
    target.kind === 'append' && view.bands.length > 0 && target.h === undefined
  const shownGhost = (): { target: InsertTarget; closing: boolean } | null => {
    if (locked) return null
    if (inserting)
      return stripped(inserting.target) ? null : { target: inserting.target, closing: false }
    if (hovered) {
      const target: InsertTarget =
        hovered.anchorId === APPEND
          ? { kind: 'append', h: fill ?? undefined }
          : { kind: 'wedge', above: hovered.anchorId }
      return { target, closing: hovered.closing }
    }
    if (view.bands.length === 0) return { target: { kind: 'append' }, closing: false }
    // A dismissed menu's ghost fades where it stood; a landed create's is already its tile.
    return seat?.held.phase === 'menu' && !stripped(seat.held.target)
      ? { target: seat.held.target, closing: true }
      : null
  }
  const ghost = shownGhost()
  const ghostBox = ghost && boxOf(ghost.target)

  return (
    <div
      ref={gridRef}
      className={cx(
        'tile-grid',
        resizingId !== null && 'is-interacting',
        tileDrag !== null && 'is-dragging',
        boardStatic && 'is-static',
      )}
      style={{
        // The clearance under the last band, or a bottom ghost's own end, which takes the clearance as its own.
        height: Math.max(
          placed.totalHeight + BOTTOM_PAD_PX,
          ghostBox ? ghostBox.y + ghostBox.h : 0,
        ),
      }}
    >
      {zones &&
        [...wedges.keys()].map((id) => {
          const box = boxOf({ kind: 'wedge', above: id })
          return (
            box && (
              <div
                key={`zone-${id}`}
                className="tile-zone"
                style={placementStyle(box)}
                {...ghostAnchorProps(ghostApi, id)}
              />
            )
          )
        })}

      {zones && (
        <div
          className="tile-add"
          data-reveal-host={fill === null ? '' : 'off'}
          style={placementStyle({
            x: { share: 0, px: 0 },
            y: placed.totalHeight,
            w: { share: 1, px: 0 },
            h: fill === null ? BOTTOM_PAD_PX : TILE_GAP + fill,
          })}
          onPointerEnter={() => {
            if (fill !== null) ghostApi.onHover(APPEND, true)
          }}
          onPointerLeave={() => ghostApi.onHover(APPEND, false)}
        >
          <button
            type="button"
            className={cx('add-strip', revealTarget)}
            data-create
            data-reveal-held={(inserting !== null && stripped(inserting.target)) || undefined}
            aria-label="New Tile"
            style={{ top: TILE_GAP }}
            onClick={(e) => {
              if (inserting === null) onInsert({ kind: 'append' }, e)
            }}
          >
            <Icon name="plus" size="body" />
          </button>
        </div>
      )}

      {order.map(([id, place]) => {
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
            place={lifted?.lift ?? settling?.to ?? place}
            phase={phase}
            resizing={resizingId === id}
            editing={editingId === id}
            menuOpen={menuOpenId === id}
            extraClass={tileClassName(id)}
            extraStyle={tileStyle(id)}
            renderTile={renderTile}
            onHandleDown={onHandleDown}
            onHandleMenu={onHandleMenu}
            onEdgeDown={onEdgeDown}
            onSettled={finishSettle}
          />
        )
      })}

      {dropSlot && <div className="tile-placement drop-slot" style={placementStyle(dropSlot)} />}

      {ghost && ghostBox && (
        <button
          type="button"
          data-ghost-root
          data-reveal-held={inserting !== null || undefined}
          className={cx('tile-ghost tile-base ghost-worn', ghost.closing && 'is-closing')}
          style={placementStyle(ghostBox)}
          onPointerEnter={ghostApi.onGhostEnter}
          onPointerLeave={ghostApi.onGhostLeave}
          onTransitionEnd={(e) => {
            if (ghost.closing && e.target === e.currentTarget && e.propertyName === 'opacity')
              ghostApi.closed()
          }}
          onClick={(e) => {
            if (inserting !== null) return
            ghostApi.take()
            onInsert(ghost.target, e)
          }}
        >
          {/* A button, so an empty board can be given its first tile from the keyboard; the tile base's border and radius are its chrome. */}
          <Icon name="layout-dashboard" size="titleMedium" />
          <span className={text.footnote.standard}>New Tile</span>
        </button>
      )}
    </div>
  )
}

function applyTarget(origin: TileLayout, id: string, target: DropTarget): TileLayout {
  if (!target) return origin
  if (target.kind === 'band') return moveTileToBand(origin, id, target.index)
  return moveTile(origin, id, target.id, target.edge)
}
