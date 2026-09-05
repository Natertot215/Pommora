import { mkdir, rename } from 'node:fs/promises'
import type { TileDoc } from '@shared/tiles'
import { errText, fail, ok, type Result } from '@shared/result'
import { newId } from './ids'
import { readJsonStrict, rmwJsonStrict } from './IO/atomicWrite'
import { tileDocPath } from './paths'

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
    await mkdir(dir, { recursive: true })
    const written = await rmwJsonStrict(
      tileDocPath(dir),
      // A key this build doesn't model rides through, like a foreign key on an entry.
      (cur) => ({ ...cur, ...mutate(coerceTileDoc(cur)) }),
      () => ({ ...EMPTY_DOC }),
      // A corrupt document moves aside under the lock so the write after the empty read lands.
      (bad) => rename(bad, `${bad}.bad-${newId()}`),
    )
    return written.ok ? ok(null) : fail(written.error.code, written.error.message)
  } catch (e) {
    return fail('operation-failed', errText(e))
  }
}
