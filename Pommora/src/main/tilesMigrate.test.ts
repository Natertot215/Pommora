import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readScope, writeKey } from './Database/localState'
import { pathExists } from './IO/atomicWrite'
import { contextsRegistryFile, tileDocPath, tileHostDir } from './paths'
import { closeSessionDb, openSessionDb } from './sessionDb'
import { readTileDocAt } from './tileDoc'
import { migrateTileRows } from './tilesMigrate'

let root: string
const space = (name: string): string => join(root, '.nexus', 'contexts', 'Realms', name)
const seedRow = (key: string, blocks: unknown[]): void => {
  writeKey('blockDoc', key, { layout: { bands: [] }, blocks, locked: false })
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'tiles-migrate-'))
  await mkdir(space('Astral'), { recursive: true })
  await mkdir(space('Beta'), { recursive: true })
  await writeFile(
    contextsRegistryFile(root),
    JSON.stringify({ contexts: [{ id: 'g1', title: 'Realms', singular: 'Realm' }] }),
  )
  await writeFile(join(space('Astral'), '_space.json'), JSON.stringify({ id: 'sp1' }))
  await writeFile(join(space('Beta'), '_space.json'), JSON.stringify({ id: 'sp4' }))
  openSessionDb(root)
})
afterEach(() => closeSessionDb())

describe('the one-time move of the tile rows', () => {
  it('writes each live host its file, drops every row, and lets an existing file win', async () => {
    seedRow('space:sp1', [{ id: 'a', type: 'markdown' }])
    seedRow('space:sp-gone', [{ id: 'g', type: 'markdown' }])
    seedRow('homepage', [{ id: 'h', type: 'markdown', keep: true }])
    seedRow('space:sp4', [{ id: 'row', type: 'markdown' }])
    const existing = JSON.stringify({ layout: null, tiles: [{ id: 'file', type: 'markdown' }] })
    await writeFile(tileDocPath(space('Beta')), existing)

    expect(await migrateTileRows(root)).toEqual({
      written: 2,
      dropped: 4,
      divergent: ['space:sp4'],
    })
    expect((await readTileDocAt(space('Astral'))).tiles).toEqual([{ id: 'a', type: 'markdown' }])
    expect((await readTileDocAt(tileHostDir(root))).tiles).toEqual([
      { id: 'h', type: 'markdown', keep: true },
    ])
    expect(await readFile(tileDocPath(space('Beta')), 'utf8')).toBe(existing)
    expect(await pathExists(join(root, '.nexus', 'contexts', 'Realms', 'sp-gone'))).toBe(false)
    expect(readScope('blockDoc')).toEqual({})

    expect(await migrateTileRows(root)).toEqual({ written: 0, dropped: 0, divergent: [] })
  })

  it('drops nothing when the registry cannot be read', async () => {
    seedRow('space:sp1', [{ id: 'a', type: 'markdown' }])
    await writeFile(contextsRegistryFile(root), '{ broken')
    expect(await migrateTileRows(root)).toEqual({ written: 0, dropped: 0, divergent: [] })
    expect(Object.keys(readScope('blockDoc'))).toEqual(['space:sp1'])
    expect(await pathExists(tileDocPath(space('Astral')))).toBe(false)
  })
})
