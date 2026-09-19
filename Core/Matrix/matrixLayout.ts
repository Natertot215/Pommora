import { isFiniteNumber } from '../Contract/validators'
import { isPlainObject } from '../Properties/propertyValue'
import { type Viewport, ZOOM_MAX, ZOOM_MIN } from './Engine/viewport'

export type Positions = Record<string, [number, number]>

export interface MatrixLayout {
  positions: Positions
  viewport: Viewport | null
}

// The layout is machine-local and regenerative, so a row that no longer reads is dropped on its own rather than taking every other node's place with it.
export function readPositions(v: unknown): Positions {
  if (!isPlainObject(v)) return {}
  const out: Positions = {}
  for (const [id, p] of Object.entries(v))
    if (Array.isArray(p) && isFiniteNumber(p[0]) && isFiniteNumber(p[1])) out[id] = [p[0], p[1]]
  return out
}

export const isPositions = (v: unknown): v is Positions =>
  isPlainObject(v) &&
  Object.values(v).every(
    (p) => Array.isArray(p) && p.length === 2 && isFiniteNumber(p[0]) && isFiniteNumber(p[1]),
  )

export const isViewport = (v: unknown): v is Viewport =>
  isPlainObject(v) &&
  isFiniteNumber(v.x) &&
  isFiniteNumber(v.y) &&
  isFiniteNumber(v.zoom) &&
  v.zoom >= ZOOM_MIN &&
  v.zoom <= ZOOM_MAX

export const isLayoutPatch = (v: unknown): v is Partial<MatrixLayout> =>
  isPlainObject(v) &&
  (v.positions === undefined || isPositions(v.positions)) &&
  (v.viewport === undefined || isViewport(v.viewport)) &&
  (v.positions !== undefined || v.viewport !== undefined)
