// The layout is app-owned and lives in nexus.db, so decoding is a parse rather than a repair:
// ops.ts renormalizes ratios and collapses single-child splits on every mutation, and
// blockPatchProblem gates the shape at the IPC boundary, so anything that reached storage is
// already the tree validateLayout describes.

import { rawLayoutSchema } from '@shared/blocks'
import type { SurfaceLayout } from './model'

/** A stored layout, or null when absent or malformed (the host opens empty). */
export function decodeLayout(raw: unknown): SurfaceLayout | null {
  const parsed = rawLayoutSchema.safeParse(raw)
  return parsed.success ? (parsed.data as SurfaceLayout) : null
}

export function encodeLayout(layout: SurfaceLayout): unknown {
  return JSON.parse(JSON.stringify(layout))
}
