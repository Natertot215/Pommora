import type { TileDoc } from './tiles'
import { fail, ok, type Result, fault } from '../Contract/result'
import { readAppFileKnown, updateNexusFile } from '../Files/atomicWrite'
import { tileDocPath } from '../Paths/paths'

function coerceTileDoc(raw: Record<string, unknown>): TileDoc {
  return {
    layout: raw.layout,
    tiles: Array.isArray(raw.tiles) ? raw.tiles : [],
    locked: raw.locked === true,
  }
}

// Every read or write this file refuses is one it couldn't read: a corrupt file rebuilds and an absent one starts empty.
const UNREADABLE = fail(
  'operation-failed',
  'An error occurred while attempting to read this layout.',
)

export async function readTileDocAt(dir: string): Promise<Result<TileDoc>> {
  const read = await readAppFileKnown(tileDocPath(dir))
  return read === undefined ? UNREADABLE : ok(coerceTileDoc(read ?? {}))
}

export async function writeTileDocAt(
  dir: string,
  mutate: (cur: TileDoc) => TileDoc,
): Promise<Result<TileDoc>> {
  try {
    const written = await updateNexusFile(
      tileDocPath(dir),
      // A key this build doesn't model rides through, like a foreign key on an entry.
      (cur) => ({ ...cur, ...mutate(coerceTileDoc(cur)) }),
      true,
    )
    return written.ok ? ok(coerceTileDoc(written.value)) : UNREADABLE
  } catch (e) {
    return fault(e)
  }
}
