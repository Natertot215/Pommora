// A stored tree is what an op last wrote or what a hand edited since: a value off its type repairs, a band this build can't read drops alone, and the rest hold to the rules the ops keep, so one bad value doesn't blank the board.

import { z } from 'zod'
import { TILE_MIN_PX } from '@pommora/uix/Utilities/tileMetrics'
import { eachOf } from '../../Files/decoders'
import type { LayoutNode, TileLayout } from './model'
import { repairLayout } from './ops'

// The write gate takes a node as an op shaped it; a stored one takes what a hand may have left for repairLayout to finish: a height or share off its type reads as 0, a container may hold one child, and a row's shares may run short.
const layoutNode = (stored: boolean): z.ZodType<LayoutNode> => {
  const num = stored ? z.number().catch(0) : z.number()
  const children = z.lazy(() => z.array(node).min(stored ? 1 : 2))
  const tile = z.object({ kind: z.literal('tile'), id: z.string().min(1), h: num })
  const row = z
    .object({ kind: z.literal('row'), ratios: z.array(num), children })
    .refine((r) => stored || r.ratios.length === r.children.length)
  const column = z.object({ kind: z.literal('column'), children })
  const node: z.ZodType<LayoutNode> = z.union([tile, row, column])
  return node
}

export const rawLayoutSchema = z.object({
  bands: z.array(z.object({ node: layoutNode(false) })),
})

const storedLayout = z.object({ bands: eachOf(z.object({ node: layoutNode(true) })) })

export function decodeLayout(raw: unknown): TileLayout | null {
  const parsed = storedLayout.safeParse(raw)
  return parsed.success ? repairLayout(parsed.data, TILE_MIN_PX) : null
}
