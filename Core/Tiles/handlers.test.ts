import { mkdir, readFile } from 'node:fs/promises'
import { pathExists } from '../Files/atomicWrite'
import { join } from '../Paths/posix'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HostContext } from '../Contract/handlers'
import { fail, fault } from '../Contract/result'
import { tileDocPath, tileHostDir } from '../Paths/paths'
import { tempRoot } from '../Testing/hostFs'
import { tileId } from '../Testing/tileLayouts'
import { readTileDocAt } from './tileDoc'

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
})

describe('the tile channels', () => {
  it('refuse a host the Nexus does not hold', async () => {
    expect(await tilesHandlers['tiles:get'](ctx, { kind: 'space', id: 'nope' })).toEqual(
      fail('not-found', 'Unknown tile host.'),
    )
  })

  it('refuse an id that is not ULID-shaped on every per-tile channel, before any file is named', async () => {
    const invalid = fail('not-found', 'Invalid tile id.')
    const id = '../../outside'
    expect(await tilesHandlers['tiles:readMarkdown'](ctx, homepage, id)).toEqual(invalid)
    expect(await tilesHandlers['tiles:writeMarkdown'](ctx, homepage, id, 'x', 'h')).toEqual(invalid)
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
    expect(JSON.parse(await readFile(tileDocPath(tileHostDir(root)), 'utf8'))).toEqual({
      locked: true,
      tiles: [],
    })
  })

  it('restore refuses an entry whose id could name a file outside the board', async () => {
    const removed = { entry: { id: '../../outside', type: 'markdown' }, body: 'x' }
    expect(await tilesHandlers['tiles:restoreTile'](ctx, homepage, removed)).toEqual(
      fault('Invalid tile.'),
    )
    expect(await tilesHandlers['tiles:restoreTile'](ctx, homepage, null)).toEqual(
      fault('Invalid tile.'),
    )
    expect((await readTileDocAt(tileHostDir(root))).tiles).toEqual([])
    expect(await pathExists(join(root, 'outside.md'))).toBe(false)
    await mkdir(tileHostDir(root), { recursive: true })
    const well = { entry: { id: tileId('a'), type: 'markdown' }, body: 'x' }
    expect((await tilesHandlers['tiles:restoreTile'](ctx, homepage, well)).ok).toBe(true)
  })
})
