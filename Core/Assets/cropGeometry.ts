import type { Crop } from '../Nexus/schemas'
import { clamp, type NumberRange } from '@pommora/uix/Utilities/clamp'

interface CoverStyle {
  backgroundSize: string
  backgroundPosition: string
  backgroundColor: string
}

export const DEFAULT_CROP: Crop = { x: 0.5, y: 0.5, zoom: 1 }
export const CROP_ZOOM: NumberRange = { min: 0.25, max: 2 }
export const CROP_POINT: NumberRange = { min: 0, max: 1 }

const usable = (n: number): boolean => Number.isFinite(n) && n > 0
const pct = (n: number): string => `${Number((n * 100).toFixed(4))}%`

const widthMeets = (imageAspect: number, boxAspect: number): boolean => imageAspect > boxAspect

export function coverStyle(crop: Crop, imageAspect: number, boxAspect: number): CoverStyle | null {
  if (!usable(imageAspect) || !usable(boxAspect)) return null
  const { zoom } = crop
  return {
    backgroundSize: widthMeets(imageAspect, boxAspect) ? `${pct(zoom)} auto` : `auto ${pct(zoom)}`,
    backgroundPosition: `${pct(crop.x)} ${pct(crop.y)}`,
    backgroundColor: crop.color ?? '',
  }
}

export function panToCrop(crop: Crop, dx: number, dy: number): Crop {
  const { min, max } = CROP_POINT
  return { ...crop, x: clamp(crop.x + dx, min, max), y: clamp(crop.y + dy, min, max) }
}

interface CoverRect {
  left: number
  top: number
  width: number
  height: number
}

export function coverRect(
  crop: Crop,
  imageAspect: number,
  boxW: number,
  boxH: number,
): CoverRect | null {
  if (!usable(imageAspect) || !usable(boxW) || !usable(boxH)) return null
  const { zoom } = crop
  const width = widthMeets(imageAspect, boxH / boxW) ? zoom * boxW : (zoom * boxH) / imageAspect
  const height = width * imageAspect
  return {
    left: (boxW - width) * crop.x,
    top: (boxH - height) * crop.y,
    width,
    height,
  }
}

// The room on an axis is signed, so one expression carries both regimes; anchored on the gesture-start crop so a clamp never accumulates.
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
