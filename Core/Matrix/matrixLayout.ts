import { isFiniteNumber } from '../Contract/validators'
import { isPlainObject } from '../Properties/propertyValue'
import { type Viewport, ZOOM_MAX, ZOOM_MIN } from './Engine/viewport'

// A third slot marks the node as held where the user dropped it, so the pin outlives the session.
export type Positions = Record<string, [number, number] | [number, number, 1]>

export interface MatrixLayout {
  positions: Positions
  viewport: Viewport | null
}

export const isPositions = (v: unknown): v is Positions =>
  isPlainObject(v) &&
  Object.values(v).every(
    (p) =>
      Array.isArray(p) &&
      (p.length === 2 || (p.length === 3 && p[2] === 1)) &&
      isFiniteNumber(p[0]) &&
      isFiniteNumber(p[1]),
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
