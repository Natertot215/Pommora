import { useState, type PointerEvent as ReactPointerEvent } from 'react'
import { cx } from '../Utilities/cx'
import { usePointerGesture } from './gesture'
import './resize-frame.css'
import { clamp } from '../Utilities/clamp'

export type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
export type ResizeGrip = ResizeEdge | 'move'
type ResizePhase = 'move' | 'drop' | 'abort'

export interface Size {
  w: number
  h: number
}
export interface Rect extends Size {
  x: number
  y: number
}

export const CORNERS: readonly ResizeEdge[] = ['nw', 'ne', 'sw', 'se']

const MOVE_KEEP: Size = { w: 80, h: 40 }

export interface ResizeFrameSpec<R extends Partial<Rect>> {
  /** Read at press when given as a function — for a box whose size is measured, not held. */
  rect: R | (() => R)
  min?: Partial<Size>
  /** Read live per move when given as a function; the viewport otherwise. */
  max?: Partial<Size> | (() => Partial<Size>)
  /** Holds its origin and grows equally from either side; otherwise a north or west pull carries the origin. */
  equilateral?: boolean
  outlined?: boolean
  onChange: (next: R, phase: ResizePhase, grip: ResizeGrip) => void
}

interface ResizeFrameHandle {
  start: (grip: ResizeGrip) => (e: ReactPointerEvent<HTMLElement>) => void
  active: ResizeGrip | null
  /** Rendered as direct children of the box they resize. */
  edges: (edges: readonly ResizeEdge[]) => React.JSX.Element[]
}

/** A grab's worth of the frame is kept on screen. */
export function onScreen(r: Rect): Rect {
  const w = Math.min(r.w, window.innerWidth)
  const h = Math.min(r.h, window.innerHeight)
  return {
    w,
    h,
    x: clamp(r.x, 0, Math.max(0, window.innerWidth - MOVE_KEEP.w)),
    y: clamp(r.y, 0, Math.max(0, window.innerHeight - MOVE_KEEP.h)),
  }
}

function pull<R extends Partial<Rect>>(
  spec: ResizeFrameSpec<R>,
  from: R,
  grip: ResizeGrip,
  dx: number,
  dy: number,
): R {
  const x = from.x ?? 0
  const y = from.y ?? 0
  const w = from.w ?? 0
  const h = from.h ?? 0
  if (grip === 'move') return { ...from, ...onScreen({ x: x + dx, y: y + dy, w, h }) }
  const cap = typeof spec.max === 'function' ? spec.max() : spec.max
  const minW = spec.min?.w ?? 0
  const minH = spec.min?.h ?? 0
  const capW = cap?.w ?? window.innerWidth
  const capH = cap?.h ?? window.innerHeight
  const east = grip.includes('e')
  const west = grip.includes('w')
  const south = grip.includes('s')
  const north = grip.includes('n')
  const next = { ...from }
  if (spec.equilateral) {
    if (east || west) next.w = clamp(w + (east ? dx : -dx), minW, capW)
    if (south || north) next.h = clamp(h + (south ? dy : -dy), minH, capH)
    return next
  }
  if (east) next.w = clamp(w + dx, minW, Math.min(capW, window.innerWidth - x))
  if (west) {
    next.w = clamp(w - dx, minW, Math.min(capW, x + w))
    next.x = x + w - next.w
  }
  if (south) next.h = clamp(h + dy, minH, Math.min(capH, window.innerHeight - y))
  if (north) {
    next.h = clamp(h - dy, minH, Math.min(capH, y + h))
    next.y = y + h - next.h
  }
  return next
}

/** The host owns the rect; the frame clamps, reports each move, and hands back the start rect on Escape. */
export function useResizeFrame<R extends Partial<Rect>>(
  spec: ResizeFrameSpec<R>,
): ResizeFrameHandle {
  const begin = usePointerGesture()
  const [active, setActive] = useState<ResizeGrip | null>(null)

  const start =
    (grip: ResizeGrip) =>
    (e: ReactPointerEvent<HTMLElement>): void => {
      const from = { ...(typeof spec.rect === 'function' ? spec.rect() : spec.rect) }
      let last = from
      const sx = e.clientX
      const sy = e.clientY
      const started = begin({
        el: e.currentTarget,
        event: e,
        activation: 0,
        capture: true,
        swallowActiveEscape: true,
        onActivate: () => {
          setActive(grip)
          return true
        },
        onDragMove: (ev) => {
          const dx = ev.clientX - sx
          const dy = ev.clientY - sy
          const next = dx === 0 && dy === 0 ? from : pull(spec, from, grip, dx, dy)
          if (next === last) return
          last = next
          spec.onChange(last, 'move', grip)
        },
        teardown: () => setActive(null),
        // A release that moved nothing is a click, not a size the host should remember.
        onDrop: () => {
          if (Object.keys(from).some((k) => last[k as keyof R] !== from[k as keyof R]))
            spec.onChange(last, 'drop', grip)
        },
        onAbort: () => spec.onChange(from, 'abort', grip),
      })
      // A press that took the gesture is not a selection, focus change, or native drag.
      if (started) e.preventDefault()
    }

  const edges = (list: readonly ResizeEdge[]): React.JSX.Element[] =>
    list.map((edge) => (
      <div
        key={edge}
        className={cx(
          'resize-edge',
          `resize-edge-${edge}`,
          spec.outlined && 'resize-outlined',
          active === edge && 'is-active',
        )}
        aria-hidden="true"
        onPointerDown={start(edge)}
      />
    ))

  return { start, active, edges }
}
