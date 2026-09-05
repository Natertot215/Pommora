// Moves every legacy `blockDoc` row — the per-machine home the tile document had before it became
// `_tiles.json` in its host's folder — into that file, once. File-wins: a host whose file already
// exists (another device arranged it) keeps the file and the row is dropped. Rows for hosts the
// registry no longer names are dropped unwritten. Runs beside the asset migration on open; a
// registry that fails to load drops nothing, so the next open retries.

import { isPlainObject } from '@shared/propertyValue'
import { readScope, writeKey } from './Database/localState'
import { loadContextWorld } from './CRUD/contextWrite'
import { pathExists } from './IO/atomicWrite'
import { tileDocPath, tileHostDir } from './paths'
import { writeTileDocAt } from './tileDoc'

interface LegacyRow {
  layout?: unknown
  blocks?: unknown
  locked?: unknown
}

export interface TileMigration {
  written: number
  dropped: number
  /** Hosts whose row lost to a file that already existed. */
  divergent: string[]
}

export async function migrateTileRows(root: string): Promise<TileMigration> {
  const result: TileMigration = { written: 0, dropped: 0, divergent: [] }
  const rows = readScope<unknown>('blockDoc')
  const keys = Object.keys(rows)
  if (keys.length === 0) return result
  const world = await loadContextWorld(root)
  if (!world.ok) return result
  const dirs = new Map<string, string>([['homepage', tileHostDir(root)]])
  for (const [id, ref] of world.value.spaceById) dirs.set(`space:${id}`, ref.dir)
  for (const key of keys) {
    const dir = dirs.get(key)
    if (dir) {
      if (await pathExists(tileDocPath(dir))) result.divergent.push(key)
      else {
        // A row that decoded to anything but an object says nothing about the host's tiles; it
        // seeds an empty document rather than failing the open.
        const row: LegacyRow = isPlainObject(rows[key]) ? rows[key] : {}
        const landed = await writeTileDocAt(dir, () => ({
          layout: row.layout,
          tiles: Array.isArray(row.blocks) ? row.blocks : [],
          locked: row.locked === true,
        }))
        if (!landed.ok) continue
        result.written++
      }
    }
    writeKey('blockDoc', key, null)
    result.dropped++
  }
  return result
}
