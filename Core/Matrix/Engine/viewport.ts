import { clamp } from '@pommora/uix/Utilities/clamp'

// KNOBs — initial values; tuned by eye in the iteration pass (Task 8.3), never exposed.
export const ZOOM_MIN = 0.025
export const ZOOM_MAX = 2.5
const FIT_PADDING = 80

export interface Viewport {
  x: number
  y: number
  zoom: number
}

export const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 }

export const toScreen = (v: Viewport, wx: number, wy: number): [number, number] => [
  (wx - v.x) * v.zoom,
  (wy - v.y) * v.zoom,
]

export const toWorld = (v: Viewport, sx: number, sy: number): [number, number] => [
  sx / v.zoom + v.x,
  sy / v.zoom + v.y,
]

export function zoomAt(v: Viewport, sx: number, sy: number, factor: number): Viewport {
  const zoom = clamp(v.zoom * factor, ZOOM_MIN, ZOOM_MAX)
  const [wx, wy] = toWorld(v, sx, sy)
  return { zoom, x: wx - sx / zoom, y: wy - sy / zoom }
}

export const panBy = (v: Viewport, dx: number, dy: number): Viewport => ({
  ...v,
  x: v.x - dx / v.zoom,
  y: v.y - dy / v.zoom,
})

/** The visible region of the canvas in screen px: the padded box the panes leave free, which the whole canvas runs under. */
export interface Stage {
  x: number
  y: number
  width: number
  height: number
}

export function fit(
  bounds: { x0: number; y0: number; x1: number; y1: number },
  stage: Stage,
): Viewport {
  const w = Math.max(bounds.x1 - bounds.x0, 1) + FIT_PADDING * 2
  const h = Math.max(bounds.y1 - bounds.y0, 1) + FIT_PADDING * 2
  const zoom = clamp(Math.min(stage.width / w, stage.height / h), ZOOM_MIN, ZOOM_MAX)
  const cx = (bounds.x0 + bounds.x1) / 2
  const cy = (bounds.y0 + bounds.y1) / 2
  return {
    zoom,
    x: cx - (stage.x + stage.width / 2) / zoom,
    y: cy - (stage.y + stage.height / 2) / zoom,
  }
}
