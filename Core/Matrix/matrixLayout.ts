import { isFiniteNumber, isPlainObject } from '../Contract/validators'
import type { Lens } from './Engine/viewport'

export type Positions = Record<string, [number, number]>

export interface MatrixLayout {
  positions: Positions
  lens: Lens | null
}

// Positions are one row per node, so a save sends only the nodes that moved; a null clears a node the tree has lost.
export type PositionRows = Record<string, [number, number] | null>

export interface LayoutPatch {
  positions?: PositionRows
  lens?: Lens
}

const isPoint = (p: unknown): p is [number, number] =>
  Array.isArray(p) && p.length === 2 && isFiniteNumber(p[0]) && isFiniteNumber(p[1])

// The layout is machine-local and regenerative, so a row that no longer reads is dropped on its own rather than taking every other node's place with it.
export function readPositions(rows: Record<string, unknown>): Positions {
  const out: Positions = {}
  for (const [id, p] of Object.entries(rows)) if (isPoint(p)) out[id] = p
  return out
}

const isPositionRows = (v: unknown): v is PositionRows =>
  isPlainObject(v) && Object.values(v).every((p) => p === null || isPoint(p))

export const isLens = (v: unknown): v is Lens =>
  isPlainObject(v) &&
  isFiniteNumber(v.cx) &&
  isFiniteNumber(v.cy) &&
  isFiniteNumber(v.w) &&
  isFiniteNumber(v.h) &&
  v.w > 0 &&
  v.h > 0

export const isLayoutPatch = (v: unknown): v is LayoutPatch =>
  isPlainObject(v) &&
  (v.positions === undefined || isPositionRows(v.positions)) &&
  (v.lens === undefined || isLens(v.lens)) &&
  (v.positions !== undefined || v.lens !== undefined)
