import { clamp } from '@pommora/uix/Utilities/clamp'

// KNOBs — the zoom clamps and the padding a fit leaves around the graph.
export const ZOOM_MIN = 0.025
export const ZOOM_MAX = 2.5
const FIT_PADDING = 80

export interface Viewport {
  x: number
  y: number
  zoom: number
}

export const toScreen = (v: Viewport, wx: number, wy: number): [number, number] => [
  (wx - v.x) * v.zoom,
  (wy - v.y) * v.zoom,
]

export const toWorld = (v: Viewport, sx: number, sy: number): [number, number] => [
  sx / v.zoom + v.x,
  sy / v.zoom + v.y,
]

// The world rectangle a picture is framed on. Each surface fits this into its own box, so two of different sizes show the same picture, each at its own scale.
export interface Frame {
  cx: number
  cy: number
  w: number
  h: number
}

// A zero extent is the unset frame: nothing has been fitted yet, so a surface shows the world at life size.
export const DEFAULT_FRAME: Frame = { cx: 0, cy: 0, w: 0, h: 0 }

// The visible region of the canvas in screen px: the padded box the panes leave free, which the whole canvas runs under.
export interface Stage {
  x: number
  y: number
  width: number
  height: number
}

const centre = (stage: Stage): [number, number] => [
  stage.x + stage.width / 2,
  stage.y + stage.height / 2,
]

const scaleOf = (f: Frame, stage: Stage): number =>
  f.w > 0 && f.h > 0 ? Math.min(stage.width / f.w, stage.height / f.h) : 1

export function framed(f: Frame, stage: Stage): Viewport {
  const zoom = clamp(scaleOf(f, stage), ZOOM_MIN, ZOOM_MAX)
  const [mx, my] = centre(stage)
  return { zoom, x: f.cx - mx / zoom, y: f.cy - my / zoom }
}

// An unset frame takes the stage's own extent, which is the life-size picture it was already showing — a gesture on it moves something rather than multiplying a zero extent by itself.
const sized = (f: Frame, stage: Stage): Frame =>
  f.w > 0 && f.h > 0 ? f : { cx: f.cx, cy: f.cy, w: stage.width, h: stage.height }

// Pan and zoom move the frame itself. Deriving a viewport and converting it back would reshape the frame to the surface's own aspect, and the other surfaces would jump every time this one moved.
export function panFrame(f: Frame, stage: Stage, dx: number, dy: number): Frame {
  const seed = sized(f, stage)
  const { zoom } = framed(seed, stage)
  return { ...seed, cx: seed.cx - dx / zoom, cy: seed.cy - dy / zoom }
}

// The clamp is read off the frame's true scale, not the painted one: a surface already pinned at a clamp would otherwise keep reshaping the frame and zoom every other surface while its own picture held still.
export function zoomFrame(f: Frame, stage: Stage, sx: number, sy: number, factor: number): Frame {
  const seed = sized(f, stage)
  const scale = scaleOf(seed, stage)
  const zoom = clamp(scale * factor, ZOOM_MIN, ZOOM_MAX)
  if (zoom === scale) return f
  const [wx, wy] = toWorld(framed(seed, stage), sx, sy)
  const [mx, my] = centre(stage)
  const spread = scale / zoom
  return {
    w: seed.w * spread,
    h: seed.h * spread,
    cx: wx + (mx - sx) / zoom,
    cy: wy + (my - sy) / zoom,
  }
}

export function fit(bounds: { x0: number; y0: number; x1: number; y1: number }): Frame {
  return {
    cx: (bounds.x0 + bounds.x1) / 2,
    cy: (bounds.y0 + bounds.y1) / 2,
    w: Math.max(bounds.x1 - bounds.x0, 1) + FIT_PADDING * 2,
    h: Math.max(bounds.y1 - bounds.y0, 1) + FIT_PADDING * 2,
  }
}
