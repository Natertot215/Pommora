import type { Crop } from './schemas'

export interface CoverStyle {
  backgroundSize: string
  backgroundPosition: string
  backgroundColor: string
}

export const DEFAULT_CROP: Crop = { x: 0.5, y: 0.5, zoom: 1 }
export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 2

export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))
const usable = (n: number): boolean => Number.isFinite(n) && n > 0
const pct = (n: number): string => `${Number((n * 100).toFixed(4))}%`

export const clampZoom = (zoom: number): number => clamp(zoom, MIN_ZOOM, MAX_ZOOM)

export function coverStyle(crop: Crop, imageAspect: number, boxAspect: number): CoverStyle | null {
  if (!usable(imageAspect) || !usable(boxAspect)) return null
  const zoom = clampZoom(Number.isFinite(crop.zoom) ? crop.zoom : 1)
  const widthFills = imageAspect > boxAspect
  return {
    backgroundSize: widthFills ? `${pct(zoom)} auto` : `auto ${pct(zoom)}`,
    backgroundPosition: `${pct(clamp(crop.x, 0, 1))} ${pct(clamp(crop.y, 0, 1))}`,
    backgroundColor: crop.color ?? '',
  }
}

export function panToCrop(crop: Crop, dx: number, dy: number): Crop {
  return { ...crop, x: clamp(crop.x + dx, 0, 1), y: clamp(crop.y + dy, 0, 1) }
}

export interface CropWindow {
  left: number
  top: number
  width: number
  height: number
}

// The sub-rectangle of the shown image (fractions, 0..1) that a seat of `boxAspect` displays under
// this crop — the sharp window drawn over the full, dimmed image. width/height shrink with zoom;
// left/top place the window from the focal point across the room the zoom leaves.
export function cropWindow(crop: Crop, imageAspect: number, boxAspect: number): CropWindow {
  if (!usable(imageAspect) || !usable(boxAspect)) return { left: 0, top: 0, width: 1, height: 1 }
  const z = clampZoom(Number.isFinite(crop.zoom) ? crop.zoom : 1)
  const widthFills = imageAspect > boxAspect
  const width = clamp(widthFills ? 1 / z : imageAspect / (z * boxAspect), 0, 1)
  const height = clamp(widthFills ? boxAspect / (z * imageAspect) : 1 / z, 0, 1)
  return {
    left: clamp(crop.x, 0, 1) * (1 - width),
    top: clamp(crop.y, 0, 1) * (1 - height),
    width,
    height,
  }
}

// Move the crop window across the shown image by a pixel delta — the focal point walks the room the
// window leaves on each axis. Anchored on the gesture-start crop so a clamp never accumulates.
export function dragWindow(
  anchor: Crop,
  imageAspect: number,
  boxAspect: number,
  imgW: number,
  imgH: number,
  totalDx: number,
  totalDy: number,
): Crop {
  if (!usable(imageAspect) || !usable(boxAspect) || !usable(imgW) || !usable(imgH)) return anchor
  const win = cropWindow(anchor, imageAspect, boxAspect)
  const travelX = imgW * (1 - win.width)
  const travelY = imgH * (1 - win.height)
  return panToCrop(anchor, travelX > 0 ? totalDx / travelX : 0, travelY > 0 ? totalDy / travelY : 0)
}
