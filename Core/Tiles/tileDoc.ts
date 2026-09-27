import type { TileDoc } from './tiles'
import { fail, ok, type Result, fault } from '../Contract/result'
import { readAppFile, updateNexusFile } from '../Files/atomicWrite'
import { tileDocPath } from '../Paths/paths'

function coerceTileDoc(raw: Record<string, unknown>): TileDoc {
  return {
    layout: raw.layout,
    tiles: Array.isArray(raw.tiles) ? raw.tiles : [],
    locked: raw.locked === true,
  }
}

export async function readTileDocAt(dir: string): Promise<TileDoc> {
  return coerceTileDoc((await readAppFile(tileDocPath(dir))) ?? {})
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
    return written.ok
      ? ok(coerceTileDoc(written.value))
      : fail(written.error.code, written.error.message)
  } catch (e) {
    return fault(e)
  }
}
