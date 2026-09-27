import type { Result } from '../Contract/result'
import { getTile, type TileLayout } from '../Tiles/Layout/model'
import { attachBelow, insertBand, moveTile } from '../Tiles/Layout/ops'

export function splitTile(
  layout: TileLayout,
  targetId: string,
  edge: 'e' | 's',
  newId: string,
): TileLayout {
  if (edge === 'e')
    return moveTile(insertBand(layout, layout.bands.length, newId, 1), newId, targetId, 'e')
  const h = getTile(layout, targetId)?.h ?? 0
  const below = Math.round(h / 2)
  const next = attachBelow(layout, targetId, newId, below)
  const target = getTile(next, targetId)
  if (target) target.h = Math.max(1, h - below)
  return next
}

/** A ULID-shaped id a fixture can spell by one Crockford letter (not i, l, o or u), so entries decode the way minted ones do. */
export const tileId = (letter: string): string => letter.toUpperCase().padStart(26, '0')

/** The id a create or duplicate minted, for a fixture that needs the write to land. */
export async function landedId(sent: Promise<Result<{ id: string }>>): Promise<string> {
  const r = await sent
  if (!r.ok) throw new Error(r.error.message)
  return r.value.id
}
