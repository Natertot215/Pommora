import { mkdir, rename, writeFile } from 'node:fs/promises'
import { pathExists } from '../Files/atomicWrite'
import { join } from '../Paths/posix'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HostContext } from '../Contract/handlers'
import { fail, fault, ok } from '../Contract/result'
import { tileDocPath, tileFilePath, homepageDir } from '../Paths/paths'
import { dropLiveTree, liveTreeOf } from '../Nexus/liveTree'
import { tempRoot, readJsonAt } from '../Testing/hostFs'
import { tileId } from '../Testing/tileLayouts'
import { readTileDocAt, writeTileDocAt } from './tileDoc'

const { sessionRoot } = vi.hoisted(() => ({ sessionRoot: vi.fn() }))
vi.mock('../Nexus/session', () => ({ sessionRoot, adopting: () => false }))

const { tilesHandlers } = await import('./handlers')

const ctx = {} as HostContext
const homepage = { kind: 'homepage' }
let root = ''

beforeEach(() => {
  root = tempRoot('tile-handlers-')
  sessionRoot.mockReturnValue(root)
})

afterEach(() => {
  sessionRoot.mockReset()
  dropLiveTree()
})

describe('the tile channels', () => {
  it('refuse a host the Nexus does not hold', async () => {
    expect(await tilesHandlers['tiles:get'](ctx, { kind: 'space', id: 'nope' })).toEqual(
      fail('not-found', 'Unknown tile host.'),
    )
  })

  it('resolve a Space through the held tree, and refuse one whose folder a rename just moved', async () => {
    const dir = join(root, '.nexus', 'contexts', 'Realms', 'Astral')
    await mkdir(dir, { recursive: true })
    await writeFile(
      join(root, '.nexus', 'contexts', 'contexts.json'),
      JSON.stringify({ contexts: [{ id: 'g1', title: 'Realms', singular: 'Realm' }] }),
    )
    await writeFile(join(dir, '_space.json'), JSON.stringify({ id: 'sp1' }))
    await liveTreeOf(root)
    const space = { kind: 'space', id: 'sp1' }
    const made = await tilesHandlers['tiles:create'](ctx, space, 'markdown')
    expect(made.ok && (await pathExists(tileFilePath(dir, made.value.id)))).toBe(true)
    await rename(dir, join(root, '.nexus', 'contexts', 'Realms', 'Moved'))
    expect(await tilesHandlers['tiles:get'](ctx, space)).toEqual(
      fail('not-found', 'Unknown tile host.'),
    )
  })

  it('refuse an id that is not ULID-shaped on every per-tile channel, before any file is named', async () => {
    const invalid = fail('not-found', 'Invalid tile id.')
    const id = '../../outside'
    expect(await tilesHandlers['tiles:readMarkdown'](ctx, homepage, id)).toEqual(invalid)
    expect(await tilesHandlers['tiles:writeMarkdown'](ctx, homepage, id, 'x', 'h')).toEqual(invalid)
    expect(await tilesHandlers['tiles:captureMarkdown'](ctx, homepage, id, 'x')).toEqual(invalid)
    expect(await tilesHandlers['tiles:removeTile'](ctx, homepage, id)).toEqual(invalid)
    expect(await tilesHandlers['tiles:duplicateTile'](ctx, homepage, id)).toEqual(invalid)
    expect(
      await tilesHandlers['tiles:convert'](ctx, homepage, id, { kind: 'page', value: 'p' }),
    ).toEqual(invalid)
    expect(await pathExists(join(root, 'outside.md'))).toBe(false)
  })

  it('save keeps the three document keys as sent and refuses a malformed layout', async () => {
    expect(await tilesHandlers['tiles:save'](ctx, homepage, { layout: 'garbage' })).toEqual(
      fault('Malformed layout.'),
    )
    const saved = await tilesHandlers['tiles:save'](ctx, homepage, { locked: true, extra: 1 })
    expect(saved.ok).toBe(true)
    expect(await readJsonAt(tileDocPath(homepageDir(root)))).toEqual({
      locked: true,
      tiles: [],
    })
  })

  it('save merges an entry patch into that entry alone and answers with the document it left', async () => {
    const [a, b] = [tileId('a'), tileId('b')]
    await writeTileDocAt(homepageDir(root), (cur) => ({
      ...cur,
      tiles: [
        { id: a, type: 'markdown', zoom: 1.2, foreign: 1 },
        { id: b, type: 'markdown' },
      ],
    }))
    const saved = await tilesHandlers['tiles:save'](ctx, homepage, {
      entry: { id: a, patch: { style: 'borderless', zoom: null } },
    })
    const read = await readTileDocAt(homepageDir(root))
    if (!read.ok) throw new Error(read.error.message)
    const disk = read.value
    expect(disk.tiles).toEqual([
      { id: a, type: 'markdown', foreign: 1, style: 'borderless' },
      { id: b, type: 'markdown' },
    ])
    expect(saved).toEqual(ok({ landed: disk }))
  })

  it('restore refuses an entry whose id could name a file outside the board', async () => {
    const removed = { entry: { id: '../../outside', type: 'markdown' }, body: 'x' }
    expect(await tilesHandlers['tiles:restoreTile'](ctx, homepage, removed)).toEqual(
      fault('Invalid tile.'),
    )
    expect(await tilesHandlers['tiles:restoreTile'](ctx, homepage, null)).toEqual(
      fault('Invalid tile.'),
    )
    expect(await readTileDocAt(homepageDir(root))).toMatchObject(ok({ tiles: [] }))
    expect(await pathExists(join(root, 'outside.md'))).toBe(false)
    await mkdir(homepageDir(root), { recursive: true })
    const well = { entry: { id: tileId('a'), type: 'markdown' }, body: 'x' }
    expect((await tilesHandlers['tiles:restoreTile'](ctx, homepage, well)).ok).toBe(true)
  })
})
