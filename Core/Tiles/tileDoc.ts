import type { TileDoc } from './tiles'
import { fail, ok, type Result, fault } from '../Contract/result'
import { readJsonStrict, updateNexusFile } from '../Files/atomicWrite'
import { tileDocPath } from '../Paths/paths'

const EMPTY_DOC: TileDoc = { layout: undefined, tiles: [], locked: false }

function coerceTileDoc(raw: Record<string, unknown>): TileDoc {
  return {
    layout: raw.layout,
    tiles: Array.isArray(raw.tiles) ? raw.tiles : [],
    locked: raw.locked === true,
  }
}

export async function readTileDocAt(dir: string): Promise<TileDoc> {
  const read = await readJsonStrict(tileDocPath(dir))
  if (read.ok) return coerceTileDoc(read.value)
  if (read.error.code !== 'not-found') console.error(`tiles: ${read.error.message}`)
  return EMPTY_DOC
}

export async function writeTileDocAt(
  dir: string,
  mutate: (cur: TileDoc) => TileDoc,
): Promise<Result<null>> {
  try {
    const written = await updateNexusFile(
      tileDocPath(dir),
      // A key this build doesn't model rides through, like a foreign key on an entry.
      (cur) => ({ ...cur, ...mutate(coerceTileDoc(cur)) }),
      true,
    )
    return written.ok ? ok(null) : fail(written.error.code, written.error.message)
  } catch (e) {
    return fault(e)
  }
}
