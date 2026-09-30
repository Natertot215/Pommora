// A stored tree is what an op last wrote or what a hand edited since: a value off its type repairs, a band this build can't read drops alone, and the rest hold to the rules the ops keep, so one bad value doesn't blank the board.

import { z } from 'zod'
import { TILE_MIN_PX } from '@pommora/uix/Utilities/tileMetrics'
import { eachOf } from '../../Files/decoders'
import { storedNodeSchema } from '../tiles'
import type { TileLayout } from './model'
import { repairLayout } from './ops'

const storedLayout = z.object({ bands: eachOf(z.object({ node: storedNodeSchema })) })

export function decodeLayout(raw: unknown): TileLayout | null {
  const parsed = storedLayout.safeParse(raw)
  return parsed.success ? repairLayout(parsed.data as TileLayout, TILE_MIN_PX) : null
}
