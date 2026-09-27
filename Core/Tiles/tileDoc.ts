import type { TileDoc } from './tiles'
import { fail, ok, type Result, fault } from '../Contract/result'
import { readAppFileKnown, updateNexusFile } from '../Files/atomicWrite'
import { sessionRoot } from '../Nexus/session'
import { tileDocPath } from '../Paths/paths'
import { relative } from '../Paths/posix'

function coerceTileDoc(raw: Record<string, unknown>): TileDoc {
  return {
    layout: raw.layout,
    tiles: Array.isArray(raw.tiles) ? raw.tiles : [],
    locked: raw.locked === true,
  }
}

// Every read or write this file refuses is one it couldn't read: a corrupt file rebuilds and an absent one starts empty.
function unreadable(dir: string): Result<never> {
  const file = tileDocPath(dir)
  const root = sessionRoot()
  const shown = root ? relative(root, file) : file
  return fail('operation-failed', `This Layout defined at “${shown}” cannot be read.`)
}

export async function readTileDocAt(dir: string): Promise<Result<TileDoc>> {
  const read = await readAppFileKnown(tileDocPath(dir))
  return read === undefined ? unreadable(dir) : ok(coerceTileDoc(read ?? {}))
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
    return written.ok ? ok(coerceTileDoc(written.value)) : unreadable(dir)
  } catch (e) {
    return fault(e)
  }
}
