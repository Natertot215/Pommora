// Decoding is a parse rather than a repair: ops.ts renormalizes on every mutation and tilePatchProblem gates the shape at the IPC boundary, so anything that reached storage is already the tree validateLayout describes.

import { rawLayoutSchema } from '@pommora/core/Tiles/tiles'
import type { TileLayout } from './model'

export function decodeLayout(raw: unknown): TileLayout | null {
  const parsed = rawLayoutSchema.safeParse(raw)
  return parsed.success ? (parsed.data as TileLayout) : null
}

export function encodeLayout(layout: TileLayout): unknown {
  return JSON.parse(JSON.stringify(layout))
}
