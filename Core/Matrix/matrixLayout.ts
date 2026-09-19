import { isFiniteNumber } from '../Contract/validators'
import { isPlainObject } from '../Properties/propertyValue'
import { type Viewport, ZOOM_MAX, ZOOM_MIN } from './Engine/viewport'

export type Positions = Record<string, [number, number]>

export interface MatrixLayout {
  positions: Positions
  viewport: Viewport | null
}

const isPositions = (v: unknown): v is Positions =>
  isPlainObject(v) &&
  Object.values(v).every(
    (p) => Array.isArray(p) && p.length === 2 && isFiniteNumber(p[0]) && isFiniteNumber(p[1]),
  )

const isViewport = (v: unknown): v is Viewport =>
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
