import type { Crop } from './schemas'

export interface CoverStyle {
  backgroundSize: string
  backgroundPosition: string
  backgroundColor: string
}

export const DEFAULT_CROP: Crop = { x: 0.5, y: 0.5, zoom: 1 }
export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 4

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))
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

// The overhang reads the live zoom, so a pinch or slider move mid-drag reframes without reverting
// the pan; x/y anchor on the gesture-start crop so a clamp never accumulates.
export function panDelta(
  anchor: Crop,
  liveZoom: number,
  imageAspect: number,
  boxAspect: number,
  boxW: number,
  totalDx: number,
  totalDy: number,
): Crop {
  if (!usable(imageAspect) || !usable(boxAspect) || !usable(boxW)) return anchor
  const zoom = clampZoom(liveZoom)
  const boxH = boxW * boxAspect
  const widthFills = imageAspect > boxAspect
  const shownW = widthFills ? boxW * zoom : (boxH * zoom) / imageAspect
  const shownH = widthFills ? shownW * imageAspect : boxH * zoom
  const overhangX = shownW - boxW
  const overhangY = shownH - boxH
  return panToCrop(
    anchor,
    overhangX > 0 ? -totalDx / overhangX : 0,
    overhangY > 0 ? -totalDy / overhangY : 0,
  )
}
