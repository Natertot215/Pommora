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

const widthMeets = (imageAspect: number, boxAspect: number): boolean => imageAspect > boxAspect

export function coverStyle(crop: Crop, imageAspect: number, boxAspect: number): CoverStyle | null {
  if (!usable(imageAspect) || !usable(boxAspect)) return null
  const zoom = clampZoom(Number.isFinite(crop.zoom) ? crop.zoom : 1)
  return {
    backgroundSize: widthMeets(imageAspect, boxAspect) ? `${pct(zoom)} auto` : `auto ${pct(zoom)}`,
    backgroundPosition: `${pct(clamp(crop.x, 0, 1))} ${pct(clamp(crop.y, 0, 1))}`,
    backgroundColor: crop.color ?? '',
  }
}

export function panToCrop(crop: Crop, dx: number, dy: number): Crop {
  return { ...crop, x: clamp(crop.x + dx, 0, 1), y: clamp(crop.y + dy, 0, 1) }
}

export interface CoverRect {
  left: number
  top: number
  width: number
  height: number
}

// The pixel form of the background-size/-position pair `coverStyle` hands a seat, for surfaces that
// draw the image as an element instead.
export function coverRect(
  crop: Crop,
  imageAspect: number,
  boxW: number,
  boxH: number,
): CoverRect | null {
  if (!usable(imageAspect) || !usable(boxW) || !usable(boxH)) return null
  const z = clampZoom(Number.isFinite(crop.zoom) ? crop.zoom : 1)
  const width = widthMeets(imageAspect, boxH / boxW) ? z * boxW : (z * boxH) / imageAspect
  const height = width * imageAspect
  return {
    left: (boxW - width) * clamp(crop.x, 0, 1),
    top: (boxH - height) * clamp(crop.y, 0, 1),
    width,
    height,
  }
}

// The room on an axis is signed, so one expression carries both regimes: an image wider than its
// seat pans beneath it, a smaller one slides across it, each following the pointer. Anchored on the
// gesture-start crop so a clamp never accumulates.
export function dragRect(
  anchor: Crop,
  imageAspect: number,
  boxW: number,
  boxH: number,
  totalDx: number,
  totalDy: number,
): Crop {
  const rect = coverRect(anchor, imageAspect, boxW, boxH)
  if (!rect) return anchor
  const roomX = boxW - rect.width
  const roomY = boxH - rect.height
  return panToCrop(anchor, roomX === 0 ? 0 : totalDx / roomX, roomY === 0 ? 0 : totalDy / roomY)
}
