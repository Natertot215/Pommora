// A host's tile document on disk — read-only reads, one locked writer, corrupt bytes quarantined
// by that writer alone.

import { mkdir, rename } from 'node:fs/promises'
import type { TileDoc } from '@shared/tiles'
import { errText, fail, ok, type Result } from '@shared/result'
import { newId } from './ids'
import { readJsonStrict, rmwJsonStrict } from './IO/atomicWrite'
import { tileDocPath } from './paths'

export const EMPTY_DOC: TileDoc = { layout: undefined, tiles: [], locked: false }

/** The shape the document guarantees and a hand-edited file does not — the layout stays raw for
 *  the codec. */
function coerceTileDoc(raw: Record<string, unknown>): TileDoc {
  return {
    layout: raw.layout,
    tiles: Array.isArray(raw.tiles) ? raw.tiles : [],
    locked: raw.locked === true,
  }
}

/** Read-only by construction: absent or corrupt reads as the empty document, never a write. */
export async function readTileDocAt(dir: string): Promise<TileDoc> {
  const read = await readJsonStrict(tileDocPath(dir))
  if (read.ok) return coerceTileDoc(read.value)
  if (read.error.code !== 'not-found') console.error(`tiles: ${read.error.message}`)
  return EMPTY_DOC
}

/** The document's only writer — a read-modify-write under the file's own lock. */
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
      // A corrupt document is adjudicated by its one writer under the lock: the bytes move aside
      // under a fresh name and the mutation starts from the empty document, so the read that showed
      // the host empty is followed by a write that lands.
      (bad) => rename(bad, `${bad}.bad-${newId()}`),
    )
    return written.ok ? ok(null) : fail(written.error.code, written.error.message)
  } catch (e) {
    return fail('operation-failed', errText(e))
  }
}
