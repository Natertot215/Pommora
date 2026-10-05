import { fault, ok } from '../Contract/result'
import { chmod, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { tempRoot, noModeBits, readJsonAt } from '../Testing/hostFs'
import { landedId, tileId } from '../Testing/tileLayouts'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { pathExists } from '../Files/atomicWrite'
import {
  convertTile,
  createTile,
  duplicateTile,
  readMarkdownTile,
  removeTile,
  restoreTile,
  rewriteTileConnections,
  tilesLinkHeading,
  writeMarkdownTile,
} from './tilesFile'
import { readTileDocAt, writeTileDocAt } from './tileDoc'
import type { TileDoc } from './tiles'
import { tileDocPath, tileFilePath, tileHostDir } from '../Paths/paths'
import { machine } from '../Platform/machine'
import { rewriteConnections } from '../Connections/rewrite'
import type { TrashDeps } from '../Trash/bundle'
import { dropLiveTree } from '../Nexus/liveTree'

const nexusDeps: TrashDeps = { trashMode: 'nexus', trashToSystem: async () => {} }

let root: string
const home = (): string => tileHostDir(root)
const spaceDir = (): string => join(root, '.nexus', 'contexts', 'Realms', 'Astral')
const spaceSidecar = (): string => join(spaceDir(), '_space.json')
const docAt = async (dir = home()): Promise<TileDoc> => {
  const doc = await readTileDocAt(dir)
  if (!doc.ok) throw new Error(doc.error.message)
  return doc.value
}
const entries = async (dir = home()): Promise<Array<Record<string, unknown>>> =>
  (await docAt(dir)).tiles as Array<Record<string, unknown>>
// Every write here lands on a freshly created, empty tile.
const write = (dir: string, id: string, body: string): Promise<unknown> =>
  writeMarkdownTile(dir, id, body, machine().sha256Hex(''))
const seed = (dir: string, tiles: unknown[]): Promise<unknown> =>
  writeTileDocAt(dir, (cur) => ({ ...cur, tiles }))

beforeEach(async () => {
  root = tempRoot('tiles-')
  await mkdir(spaceDir(), { recursive: true })
  await writeFile(
    join(root, '.nexus', 'contexts', 'contexts.json'),
    JSON.stringify({ contexts: [{ id: 'g1', title: 'Realms', singular: 'Realm' }] }),
  )
  await writeFile(spaceSidecar(), JSON.stringify({ id: 'sp1', color: 'mint' }))
})

afterEach(() => {
  dropLiveTree()
})

describe('the document', () => {
  it('opens empty when the host has none, and the read creates nothing', async () => {
    expect(await readTileDocAt(home())).toEqual(ok({ layout: undefined, tiles: [], locked: false }))
    expect(await pathExists(home())).toBe(false)
  })

  it('round-trips layout, entries, the lock, and a foreign key on an entry', async () => {
    await writeTileDocAt(home(), () => ({
      layout: { bands: [] },
      tiles: [{ id: tileId('a'), type: 'markdown', keep: 1 }],
      locked: true,
    }))
    expect(await readTileDocAt(home())).toEqual(
      ok({
        layout: { bands: [] },
        tiles: [{ id: tileId('a'), type: 'markdown', keep: 1 }],
        locked: true,
      }),
    )
    expect(await readJsonAt(tileDocPath(home()))).toEqual({
      layout: { bands: [] },
      tiles: [{ id: tileId('a'), type: 'markdown', keep: 1 }],
      locked: true,
    })
  })

  it('a mutation sees the current document and leaves the untouched fields alone', async () => {
    await writeTileDocAt(home(), (cur) => ({ ...cur, layout: { bands: [] } }))
    await writeTileDocAt(home(), (cur) => ({ ...cur, locked: true }))
    expect(await readTileDocAt(home())).toEqual(
      ok({ layout: { bands: [] }, tiles: [], locked: true }),
    )
  })

  it('hosts keep their own documents; the first write creates the homepage folder', async () => {
    await seed(home(), [{ id: tileId('h'), type: 'markdown' }])
    await seed(spaceDir(), [{ id: tileId('s'), type: 'markdown' }])
    expect((await entries())[0].id).toBe(tileId('h'))
    expect((await entries(spaceDir()))[0].id).toBe(tileId('s'))
  })

  it('never touches the host sidecar — a Space keeps its identity and color', async () => {
    const before = await readFile(spaceSidecar(), 'utf8')
    await writeTileDocAt(spaceDir(), (cur) => ({
      ...cur,
      tiles: [{ id: tileId('a') }],
      locked: true,
    }))
    expect(await readFile(spaceSidecar(), 'utf8')).toBe(before)
  })

  it('a top-level key this build does not model rides through a save', async () => {
    await mkdir(home(), { recursive: true })
    await writeFile(tileDocPath(home()), JSON.stringify({ tiles: [], note: 'mine' }))
    await seed(home(), [{ id: tileId('a'), type: 'markdown' }])
    expect((await readJsonAt(tileDocPath(home()))).note).toBe('mine')
  })

  it('a hand-edited shape coerces on read and inside a mutation', async () => {
    await mkdir(home(), { recursive: true })
    await writeFile(tileDocPath(home()), JSON.stringify({ tiles: {}, locked: 'yes', layout: 1 }))
    expect(await readTileDocAt(home())).toEqual(ok({ layout: 1, tiles: [], locked: false }))
    let seen: unknown
    await writeTileDocAt(home(), (cur) => {
      seen = cur
      return cur
    })
    expect(seen).toEqual({ layout: 1, tiles: [], locked: false })
  })

  it('a corrupt document never read cleanly reads empty untouched; the next write sets it aside under a hidden name and lands', async () => {
    await mkdir(home(), { recursive: true })
    await writeFile(tileDocPath(home()), '{ not json')
    expect(await readTileDocAt(home())).toEqual(ok({ layout: undefined, tiles: [], locked: false }))
    expect(await readFile(tileDocPath(home()), 'utf8')).toBe('{ not json')
    await seed(home(), [{ id: tileId('a'), type: 'markdown' }])
    expect((await entries())[0].id).toBe(tileId('a'))
    const bad = (await readdir(home())).filter((f) => f.startsWith('._tiles.json.bad-'))
    expect(bad).toHaveLength(1)
    expect(await readFile(join(home(), bad[0]), 'utf8')).toBe('{ not json')
    await writeFile(tileDocPath(home()), '[1, 2]')
    await seed(home(), [{ id: tileId('b'), type: 'markdown' }])
    expect((await readdir(home())).filter((f) => f.startsWith('._tiles.json.bad-'))).toHaveLength(2)
    expect((await entries())[0].id).toBe(tileId('b'))
  })

  it.skipIf(noModeBits)(
    'a document this session could never read fails, and a write leaves it alone',
    async () => {
      await mkdir(home(), { recursive: true })
      await writeFile(tileDocPath(home()), JSON.stringify({ tiles: [{ id: tileId('a') }] }))
      await chmod(tileDocPath(home()), 0o000)
      const refused = {
        error: {
          code: 'operation-failed',
          message: 'An error occurred while attempting to read this layout.',
        },
      }
      expect(await readTileDocAt(home())).toMatchObject(refused)
      expect(await createTile(home(), 'markdown')).toMatchObject(refused)
      expect((await readdir(home())).filter((f) => f.endsWith('.md'))).toEqual([])
      expect((await rewriteTileConnections(root, (body) => body)).failed).toBe(1)
      await chmod(tileDocPath(home()), 0o644)
      expect(await entries()).toEqual([{ id: tileId('a') }])
    },
  )

  it('a document damaged after a clean read reads as that read, and the next write rebuilds from it', async () => {
    await mkdir(home(), { recursive: true })
    await writeFile(tileDocPath(home()), JSON.stringify({ layout: 1, locked: true, tiles: [] }))
    expect(await readTileDocAt(home())).toEqual(ok({ layout: 1, tiles: [], locked: true }))
    await writeFile(tileDocPath(home()), '{ not json')
    expect(await readTileDocAt(home())).toEqual(ok({ layout: 1, tiles: [], locked: true }))
    await seed(home(), [{ id: tileId('a'), type: 'markdown' }])
    expect(await readTileDocAt(home())).toMatchObject(ok({ layout: 1, locked: true }))
    expect((await entries())[0].id).toBe(tileId('a'))
  })
})

describe('markdown tile lifecycle', () => {
  it.skipIf(noModeBits)(
    'an absent body is not-found; a body the read fails on is not an empty one',
    async () => {
      const id = await landedId(createTile(home(), 'markdown'))
      await write(home(), id, 'prose')
      expect((await readMarkdownTile(home(), 'x')).ok).toBe(false)
      expect(await readMarkdownTile(home(), 'x')).toMatchObject({ error: { code: 'not-found' } })
      await chmod(tileFilePath(home(), id), 0o000)
      expect(await readMarkdownTile(home(), id)).toMatchObject({
        error: { code: 'operation-failed' },
      })
      await chmod(tileFilePath(home(), id), 0o644)
      expect(await readMarkdownTile(home(), id)).toEqual(ok('prose'))
    },
  )

  it('create mints the dir + empty file + entry; the body round-trips pure (no frontmatter)', async () => {
    const id = await landedId(createTile(home(), 'markdown'))
    expect(await pathExists(tileFilePath(home(), id))).toBe(true)
    expect(await entries()).toEqual([{ id, type: 'markdown' }])

    await write(home(), id, '# Hi\n\n[[Some Page]]\n')
    expect(await readMarkdownTile(home(), id)).toEqual(ok('# Hi\n\n[[Some Page]]\n'))
    expect(await readFile(tileFilePath(home(), id), 'utf8')).not.toContain('---')
  })

  it('creates only a kind whose bare seed is a whole entry, and writes nothing for the rest', async () => {
    for (const type of ['page', 'view', 'widget', 'toString', undefined])
      expect(await createTile(home(), type)).toEqual(fault('That tile can’t be created.'))
    expect(await pathExists(tileDocPath(home()))).toBe(false)
  })

  it('refuses a write whose base the file moved past, and leaves the file alone', async () => {
    const id = await landedId(createTile(home(), 'markdown'))
    await write(home(), id, 'outside')
    expect(await writeMarkdownTile(home(), id, 'stale typing', machine().sha256Hex(''))).toEqual({
      stale: true,
    })
    expect(await readMarkdownTile(home(), id)).toEqual(ok('outside'))
    expect(await writeMarkdownTile(home(), id, 'typed', machine().sha256Hex('outside'))).toEqual({
      stale: false,
      hash: machine().sha256Hex('typed'),
    })
  })

  it('a markdown tile mints its file inside the Space folder', async () => {
    const id = await landedId(createTile(spaceDir(), 'markdown'))
    expect(await pathExists(join(spaceDir(), `${id}.md`))).toBe(true)
    await write(spaceDir(), id, 'body')
    expect(await readMarkdownTile(spaceDir(), id)).toEqual(ok('body'))
  })

  it('remove drops the entry and trashes the file; foreign entries survive', async () => {
    await seed(home(), [{ id: tileId('a'), type: 'widget', keep: true }])
    const id = await landedId(createTile(home(), 'markdown'))
    await write(home(), id, 'kept text')
    const removed = await removeTile(root, home(), id, nexusDeps)
    expect(removed).toEqual(
      ok({
        removed: { entry: { id, type: 'markdown' }, body: 'kept text' },
        landed: await docAt(),
      }),
    )
    expect(await entries()).toEqual([{ id: tileId('a'), type: 'widget', keep: true }])
    expect(await pathExists(tileFilePath(home(), id))).toBe(false)
    const trashed = await readdir(join(root, '.trash'), { recursive: true })
    expect(trashed.some((f) => f.includes(id))).toBe(true)
  })

  it('remove takes an entry this build doesn’t know, or none, with any file its id names', async () => {
    const [w, gone] = [tileId('w'), tileId('g')]
    await seed(home(), [{ id: w, type: 'widget' }])
    await write(home(), gone, 'orphaned')
    expect(await removeTile(root, home(), w, nexusDeps)).toMatchObject(
      ok({ removed: { entry: { id: w, type: 'widget' } } }),
    )
    expect(await entries()).toEqual([])
    expect(await removeTile(root, home(), gone, nexusDeps)).toMatchObject(
      ok({ removed: { entry: null, body: 'orphaned' } }),
    )
    expect(await pathExists(tileFilePath(home(), gone))).toBe(false)
    expect((await restoreTile(home(), { entry: { id: w, type: 'widget' }, body: 'kept' })).ok).toBe(
      true,
    )
    expect(await entries()).toEqual([{ id: w, type: 'widget' }])
    expect(await readMarkdownTile(home(), w)).toEqual(ok('kept'))
  })

  it('convert refuses an entry this build doesn’t know and leaves it alone', async () => {
    await seed(home(), [{ id: tileId('w'), type: 'widget' }])
    const pick = { kind: 'page', value: 'page-1' } as const
    expect(await convertTile(root, home(), tileId('w'), pick, nexusDeps)).toMatchObject({
      error: { code: 'not-found' },
    })
    expect(await entries()).toEqual([{ id: tileId('w'), type: 'widget' }])
  })

  it('a removed tile restores with its text, once, and never over a file already there', async () => {
    const id = await landedId(createTile(home(), 'markdown'))
    await write(home(), id, 'kept text')
    const removed = await removeTile(root, home(), id, nexusDeps)
    if (!removed.ok) throw new Error('remove refused')
    expect(await restoreTile(home(), removed.value.removed)).toEqual(ok({ landed: await docAt() }))
    expect(await readMarkdownTile(home(), id)).toEqual(ok('kept text'))
    expect(await entries()).toEqual([{ id, type: 'markdown' }])
    expect((await restoreTile(home(), { ...removed.value.removed, body: 'other' })).ok).toBe(true)
    expect(await readMarkdownTile(home(), id)).toEqual(ok('kept text'))
    expect(await entries()).toHaveLength(1)
  })

  it('a restored tile’s links count again for a heading renamed outside the app', async () => {
    const id = await landedId(createTile(home(), 'markdown'))
    await write(home(), id, 'see [[A#Keep]]')
    const removed = await removeTile(root, home(), id, nexusDeps)
    if (!removed.ok) throw new Error('remove refused')
    expect(await tilesLinkHeading(root, 'a', 'keep')).toBe(false)
    await restoreTile(home(), removed.value.removed)
    expect(await tilesLinkHeading(root, 'a', 'keep')).toBe(true)
  })

  it('a restore seats the tile in its band on disk, and leaves a board already holding it alone', async () => {
    const id = await landedId(createTile(home(), 'markdown'))
    const band = (tile: string) => ({ node: { kind: 'tile', id: tileId(tile), h: 80 } })
    await writeTileDocAt(home(), (cur) => ({ ...cur, layout: { bands: [band('a'), band('b')] } }))
    const removed = await removeTile(root, home(), id, nexusDeps)
    if (!removed.ok) throw new Error('remove refused')
    await restoreTile(home(), { ...removed.value.removed, at: { band: 1, h: 120 } })
    expect((await docAt()).layout).toEqual({
      bands: [band('a'), { node: { kind: 'tile', id, h: 120 } }, band('b')],
    })
    expect((await restoreTile(home(), { entry: { id: '../x', type: 'markdown' } })).ok).toBe(false)
  })

  it('a removed tile file goes to the system trash in System mode', async () => {
    const id = await landedId(createTile(home(), 'markdown'))
    const sent: string[] = []
    await removeTile(root, home(), id, {
      trashMode: 'system',
      trashToSystem: async (p) => {
        sent.push(p)
        await machine().remove(p)
      },
    })
    expect(sent).toEqual([tileFilePath(home(), id)])
    expect(await pathExists(join(root, '.trash'))).toBe(false)
  })

  it('an entry op leaves the layout and lock alone', async () => {
    await writeTileDocAt(home(), (cur) => ({ ...cur, layout: { bands: [] }, locked: true }))
    await landedId(createTile(home(), 'markdown'))
    const doc = await docAt()
    expect(doc.layout).toEqual({ bands: [] })
    expect(doc.locked).toBe(true)
  })

  it('convert to view copies the stored view under its own id and trashes the markdown file', async () => {
    const stored = {
      id: 'view_src',
      name: 'Board',
      type: 'cards',
      card_banner: 'poster',
      column_styles: { p1: { look: 'chips' } },
      group: { kind: 'property', property_id: 'p1', swimlanes: true },
      filter: { match: 'all', rules: [{ property_id: 'p1', op: 'is', value: 'x', negate: true }] },
    }
    await mkdir(join(root, 'Notes'), { recursive: true })
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'col-notes', views: [stored] }),
    )
    dropLiveTree()
    const id = await landedId(createTile(home(), 'markdown'))
    await seed(home(), [{ id, type: 'markdown', style: 'borderless', outside_key: 1 }])
    const pick = { kind: 'view', value: { source_id: 'col-notes', view_id: 'view_src' } } as const
    expect((await convertTile(root, home(), id, pick, nexusDeps)).ok).toBe(true)
    const entry = (await entries())[0]
    expect(entry).toMatchObject({ type: 'view', style: 'borderless', outside_key: 1, active: 0 })
    const view = (entry.views as Array<Record<string, unknown>>)[0]
    expect(view.source_id).toBe('col-notes')
    const { id: copyId, ...copied } = view.config as Record<string, unknown>
    expect(copied).toEqual((({ id: _, ...rest }) => rest)(stored))
    expect(copyId).not.toBe('view_src')
    expect(await pathExists(tileFilePath(home(), id))).toBe(false)
  })

  it('convert to view with no view named takes the container default', async () => {
    await mkdir(join(root, 'Notes'), { recursive: true })
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'col-notes' }),
    )
    dropLiveTree()
    const id = await landedId(createTile(home(), 'markdown'))
    const pick = { kind: 'view', value: { source_id: 'col-notes' } } as const
    expect((await convertTile(root, home(), id, pick, nexusDeps)).ok).toBe(true)
    const view = ((await entries())[0].views as Array<Record<string, unknown>>)[0]
    expect(view.config).toMatchObject({ name: 'Table', type: 'table' })
    expect((view.config as { id: string }).id).toMatch(/^view_/)
  })

  it('convert to page points the tile at the page and refuses a pick it cannot read', async () => {
    const id = await landedId(createTile(home(), 'markdown'))
    await seed(home(), [{ id, type: 'markdown', style: 'borderless' }])
    expect((await convertTile(root, home(), id, { kind: 'view', value: 3 }, nexusDeps)).ok).toBe(
      false,
    )
    expect((await entries())[0].type).toBe('markdown')
    const pick = { kind: 'page', value: 'page-1' } as const
    expect((await convertTile(root, home(), id, pick, nexusDeps)).ok).toBe(true)
    expect((await entries())[0]).toMatchObject({
      type: 'page',
      page_id: 'page-1',
      style: 'borderless',
    })
  })

  it('duplicate copies the raw entry + file; a view copy re-mints its config ids', async () => {
    const id = await landedId(createTile(home(), 'markdown'))
    await write(home(), id, 'body text')
    await seed(home(), [{ id, type: 'markdown', style: 'borderless', alien: 1 }])
    const dupId = await landedId(duplicateTile(home(), id))
    expect(dupId).toBeTruthy()
    expect(await readMarkdownTile(home(), dupId as string)).toEqual(ok('body text'))
    expect((await entries()).find((b) => b.id === dupId)).toMatchObject({
      type: 'markdown',
      style: 'borderless',
      alien: 1,
    })

    await seed(home(), [
      {
        id: tileId('v'),
        type: 'view',
        views: [{ source_id: 's', config: { id: 'cfg-a', name: 'T' } }],
      },
    ])
    const dupView = await landedId(duplicateTile(home(), tileId('v')))
    const after = await entries()
    const viewCopy = after.find((b) => b.id === dupView) as {
      views: Array<{ config: { id: string } }>
    }
    expect(viewCopy.views[0].config.id).not.toBe('cfg-a')
    expect(
      (after.find((b) => b.id === tileId('v')) as { views: Array<{ config: { id: string } }> })
        .views[0].config.id,
    ).toBe('cfg-a')
  })

  it.skipIf(noModeBits)(
    'duplicate answers the fault when the source body can’t be read',
    async () => {
      const id = await landedId(createTile(home(), 'markdown'))
      await write(home(), id, 'body text')
      await chmod(tileFilePath(home(), id), 0o000)
      try {
        expect(await duplicateTile(home(), id)).toMatchObject({
          ok: false,
          error: { code: 'operation-failed' },
        })
      } finally {
        await chmod(tileFilePath(home(), id), 0o644)
      }
      expect(await entries()).toHaveLength(1)
    },
  )

  it('removing a non-markdown tile touches no files', async () => {
    await seed(home(), [{ id: tileId('p'), type: 'page', page_id: 'x' }])
    await removeTile(root, home(), tileId('p'), nexusDeps)
    expect(await entries()).toEqual([])
    expect(await pathExists(join(root, '.trash'))).toBe(false)
  })
})

describe('rewriteTileConnections', () => {
  const rename = (body: string): string => rewriteConnections(body, 'Target', 'Renamed')

  it('rewrites [[oldTitle]] → [[newTitle]] in tile bodies, leaving non-matches untouched', async () => {
    const id = await landedId(createTile(home(), 'markdown'))
    await write(home(), id, 'see [[Target]] and [[Other]]')
    expect(await rewriteTileConnections(root, rename)).toEqual({
      hosts: [{ host: { kind: 'homepage' }, ids: [id] }],
      failed: 0,
    })
    expect(await readMarkdownTile(home(), id)).toEqual(ok('see [[Renamed]] and [[Other]]'))
  })

  it('leaves a body without the old title byte-identical (no needless write)', async () => {
    const id = await landedId(createTile(home(), 'markdown'))
    await write(home(), id, 'see [[Other]]')
    expect(await rewriteTileConnections(root, rename)).toEqual({ hosts: [], failed: 0 })
    expect(await readMarkdownTile(home(), id)).toEqual(ok('see [[Other]]'))
  })

  it.skipIf(noModeBits)('counts a tile it can’t write and still rewrites the rest', async () => {
    const locked = await landedId(createTile(home(), 'markdown'))
    await write(home(), locked, 'see [[Target]]')
    const open = await landedId(createTile(spaceDir(), 'markdown'))
    await write(spaceDir(), open, 'see [[Target]]')
    await chmod(home(), 0o555)
    try {
      expect(await rewriteTileConnections(root, rename)).toEqual({
        hosts: [{ host: { kind: 'space', id: 'sp1' }, ids: [open] }],
        failed: 1,
      })
    } finally {
      await chmod(home(), 0o755)
    }
    expect(await readMarkdownTile(spaceDir(), open)).toEqual(ok('see [[Renamed]]'))
  })

  it('rewrites the tiles of a Space whose sidecar can’t be read, pushing no host for it', async () => {
    const broken = join(root, '.nexus', 'contexts', 'Realms', 'Broken')
    await mkdir(broken, { recursive: true })
    const lost = await landedId(createTile(broken, 'markdown'))
    await write(broken, lost, 'see [[Target]]')
    await writeFile(join(broken, '_space.json'), '{ corrupt')
    const id = await landedId(createTile(spaceDir(), 'markdown'))
    await write(spaceDir(), id, 'see [[Target]]')
    expect(await rewriteTileConnections(root, rename)).toEqual({
      hosts: [{ host: { kind: 'space', id: 'sp1' }, ids: [id] }],
      failed: 0,
    })
    expect(await readMarkdownTile(spaceDir(), id)).toEqual(ok('see [[Renamed]]'))
    expect(await readMarkdownTile(broken, lost)).toEqual(ok('see [[Renamed]]'))
  })
})
