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

// The world rectangle a picture shows, its lens. Each surface fits this into its own box, so two of different sizes show the same picture, each at its own scale.
export interface Lens {
  cx: number
  cy: number
  w: number
  h: number
}

// The lens a surface's own box makes, which is the world at life size — what a picture shows before anything has been fitted.
export const lifeSize = (stage: Stage): Lens => ({
  cx: 0,
  cy: 0,
  w: stage.width,
  h: stage.height,
})

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

// A surface that has not been measured has no scale to speak of; every lens carries a real extent, made from the first box to arrive.
const scaleOf = (lens: Lens, stage: Stage): number =>
  stage.width > 0 ? Math.min(stage.width / lens.w, stage.height / lens.h) : 1

export function lensViewport(lens: Lens, stage: Stage): Viewport {
  const zoom = clamp(scaleOf(lens, stage), ZOOM_MIN, ZOOM_MAX)
  const [mx, my] = centre(stage)
  return { zoom, x: lens.cx - mx / zoom, y: lens.cy - my / zoom }
}

// Pan and zoom move the lens itself. Deriving a viewport and converting it back would reshape the lens to the surface's own aspect, and the other surfaces would jump every time this one moved.
export function panLens(lens: Lens, stage: Stage, dx: number, dy: number): Lens {
  const { zoom } = lensViewport(lens, stage)
  return { ...lens, cx: lens.cx - dx / zoom, cy: lens.cy - dy / zoom }
}

// The clamp is read off the lens's true scale, not the painted one: a surface already pinned at a clamp would otherwise keep reshaping the lens and zoom every other surface while its own picture held still.
export function zoomLens(lens: Lens, stage: Stage, sx: number, sy: number, factor: number): Lens {
  const scale = scaleOf(lens, stage)
  const zoom = clamp(scale * factor, ZOOM_MIN, ZOOM_MAX)
  if (zoom === scale) return lens
  const [wx, wy] = toWorld(lensViewport(lens, stage), sx, sy)
  const [mx, my] = centre(stage)
  const spread = scale / zoom
  return {
    w: lens.w * spread,
    h: lens.h * spread,
    cx: wx + (mx - sx) / zoom,
    cy: wy + (my - sy) / zoom,
  }
}

export function fit(bounds: { x0: number; y0: number; x1: number; y1: number }): Lens {
  return {
    cx: (bounds.x0 + bounds.x1) / 2,
    cy: (bounds.y0 + bounds.y1) / 2,
    w: Math.max(bounds.x1 - bounds.x0, 1) + FIT_PADDING * 2,
    h: Math.max(bounds.y1 - bounds.y0, 1) + FIT_PADDING * 2,
  }
}
