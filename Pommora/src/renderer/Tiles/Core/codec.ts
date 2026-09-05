// The layout is app-owned and lives in nexus.db, so decoding is a parse rather than a repair:
// ops.ts renormalizes ratios and collapses single-child splits on every mutation, and
// tilePatchProblem gates the shape at the IPC boundary, so anything that reached storage is
// already the tree validateLayout describes.

import { rawLayoutSchema } from '@shared/tiles'
import type { TileLayout } from './model'

/** A stored layout, or null when absent or malformed (the host opens empty). */
export function decodeLayout(raw: unknown): TileLayout | null {
  const parsed = rawLayoutSchema.safeParse(raw)
  return parsed.success ? (parsed.data as TileLayout) : null
}

export function encodeLayout(layout: TileLayout): unknown {
  return JSON.parse(JSON.stringify(layout))
}
