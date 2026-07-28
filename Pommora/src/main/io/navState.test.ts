import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { NavFavorite, RecentEntry } from '@shared/types'
import { openSessionDb, closeSessionDb } from '../sessionDb'
import { writeValue } from '../db/localState'
import { readNavState, writeFavorites, writeRecents } from './navState'

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-navstate-'))
  openSessionDb(root)
})
afterEach(async () => {
  closeSessionDb()
  await rm(root, { recursive: true, force: true })
})

const readRaw = async (file: string): Promise<unknown> =>
  JSON.parse(await readFile(join(root, '.nexus', file), 'utf8'))

describe('reads', () => {
  it('reads empty with no database rows and no favorites file', async () => {
    expect(await readNavState(root)).toEqual({ recents: [], favorites: [] })
  })
})

describe('recents — one row in nexus.db', () => {
  it('round-trips, preserving order and the id-less homepage entry', async () => {
    const recents: RecentEntry[] = [
      { kind: 'homepage' },
      { kind: 'context', id: 'c1' },
      { kind: 'set', id: 's1', path: 's/x' },
    ]
    writeRecents(recents)
    expect((await readNavState(root)).recents).toEqual(recents)
  })

  it('drops junk elements — loadOrMigratePins reads .pinned off every entry', async () => {
    const good = { kind: 'page', id: 'p1', path: 'a/b.md', pinned: true } as const
    writeValue('recents', [
      good,
      null,
      42,
      { kind: 'notakind', id: 'x' },
      { kind: 'page', id: 'p2' },
      { kind: 'page', id: 'p3', path: 'c.md', pinned: 'yes' },
    ])
    expect((await readNavState(root)).recents).toEqual([good])
  })

  it('the latest write wins outright — no coalescing window to lose one in', async () => {
    writeRecents([{ kind: 'page', id: 'p1', path: 'a.md' }])
    writeRecents([{ kind: 'page', id: 'p2', path: 'b.md' }])
    expect((await readNavState(root)).recents).toEqual([{ kind: 'page', id: 'p2', path: 'b.md' }])
  })
})

describe('favorites — still a file, still validated on read', () => {
  it('round-trips to .nexus/navFavorites.json', async () => {
    const favorites: NavFavorite[] = [{ kind: 'collection', id: 'c1' }, { kind: 'homepage' }]
    await writeFavorites(root, favorites)
    expect(await readRaw('navFavorites.json')).toEqual(favorites)
    expect((await readNavState(root)).favorites).toEqual(favorites)
  })

  it('drops malformed entries (bad kind, missing id, missing path)', async () => {
    const good: NavFavorite = { kind: 'page', id: 'p1', path: 'a/b.md' }
    await mkdir(join(root, '.nexus'), { recursive: true })
    await writeFile(
      join(root, '.nexus', 'navFavorites.json'),
      JSON.stringify([
        good,
        { kind: 'nope', id: 'x' },
        { kind: 'collection' },
        { kind: 'page', id: 'p2' },
        'garbage',
      ]),
    )
    expect((await readNavState(root)).favorites).toEqual([good])
  })
})
