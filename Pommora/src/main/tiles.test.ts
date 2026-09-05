import { ok } from '@shared/result'
import { chmod, mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { pathExists } from './IO/atomicWrite'
import { openSessionDb, closeSessionDb } from './sessionDb'
import {
  convertTileToView,
  copyEntry,
  createMarkdownTile,
  duplicateTile,
  readMarkdownTile,
  removeTile,
  rewriteTileConnections,
  TILE_COPY,
  writeMarkdownTile,
} from './tiles'
import { readTileDocAt, writeTileDocAt } from './tileDoc'
import { tileDocPath, tileFilePath, tileHostDir } from './paths'

let root: string
const home = (): string => tileHostDir(root)
const spaceDir = (): string => join(root, '.nexus', 'contexts', 'Realms', 'Astral')
const spaceSidecar = (): string => join(spaceDir(), '_space.json')
const entries = async (dir = home()): Promise<Array<Record<string, unknown>>> =>
  (await readTileDocAt(dir)).tiles as Array<Record<string, unknown>>
const seed = (dir: string, tiles: unknown[]): Promise<unknown> =>
  writeTileDocAt(dir, (cur) => ({ ...cur, tiles }))

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'tiles-'))
  await mkdir(spaceDir(), { recursive: true })
  await writeFile(
    join(root, '.nexus', 'contexts.json'),
    JSON.stringify({ contexts: [{ id: 'g1', title: 'Realms', singular: 'Realm' }] }),
  )
  await writeFile(spaceSidecar(), JSON.stringify({ id: 'sp1', color: 'mint' }))
  openSessionDb(root)
})

afterEach(() => {
  closeSessionDb()
})

describe('the document', () => {
  it('opens empty when the host has none, and the read creates nothing', async () => {
    expect(await readTileDocAt(home())).toEqual({ layout: undefined, tiles: [], locked: false })
    expect(await pathExists(home())).toBe(false)
  })

  it('round-trips layout, entries, the lock, and a foreign key on an entry', async () => {
    await writeTileDocAt(home(), () => ({
      layout: { bands: [] },
      tiles: [{ id: 'a', type: 'markdown', keep: 1 }],
      locked: true,
    }))
    expect(await readTileDocAt(home())).toEqual({
      layout: { bands: [] },
      tiles: [{ id: 'a', type: 'markdown', keep: 1 }],
      locked: true,
    })
    expect(JSON.parse(await readFile(tileDocPath(home()), 'utf8'))).toEqual({
      layout: { bands: [] },
      tiles: [{ id: 'a', type: 'markdown', keep: 1 }],
      locked: true,
    })
  })

  it('a mutation sees the current document and leaves the untouched fields alone', async () => {
    await writeTileDocAt(home(), (cur) => ({ ...cur, layout: { bands: [] } }))
    await writeTileDocAt(home(), (cur) => ({ ...cur, locked: true }))
    expect(await readTileDocAt(home())).toEqual({ layout: { bands: [] }, tiles: [], locked: true })
  })

  it('hosts keep their own documents; the first write creates the homepage folder', async () => {
    await seed(home(), [{ id: 'home', type: 'markdown' }])
    await seed(spaceDir(), [{ id: 'space', type: 'markdown' }])
    expect((await entries())[0].id).toBe('home')
    expect((await entries(spaceDir()))[0].id).toBe('space')
  })

  it('never touches the host sidecar — a Space keeps its identity and color', async () => {
    const before = await readFile(spaceSidecar(), 'utf8')
    await writeTileDocAt(spaceDir(), (cur) => ({ ...cur, tiles: [{ id: 'a' }], locked: true }))
    expect(await readFile(spaceSidecar(), 'utf8')).toBe(before)
  })

  it('a top-level key this build does not model rides through a save', async () => {
    await mkdir(home(), { recursive: true })
    await writeFile(tileDocPath(home()), JSON.stringify({ tiles: [], note: 'mine' }))
    await seed(home(), [{ id: 'a', type: 'markdown' }])
    expect(JSON.parse(await readFile(tileDocPath(home()), 'utf8')).note).toBe('mine')
  })

  it('a top-level key this build does not model rides through a save', async () => {
    await mkdir(home(), { recursive: true })
    await writeFile(tileDocPath(home()), JSON.stringify({ tiles: [], note: 'mine' }))
    await seed(home(), [{ id: 'a', type: 'markdown' }])
    expect(JSON.parse(await readFile(tileDocPath(home()), 'utf8')).note).toBe('mine')
  })

  it('a hand-edited shape coerces on read and inside a mutation', async () => {
    await mkdir(home(), { recursive: true })
    await writeFile(tileDocPath(home()), JSON.stringify({ tiles: {}, locked: 'yes', layout: 1 }))
    expect(await readTileDocAt(home())).toEqual({ layout: 1, tiles: [], locked: false })
    let seen: unknown
    await writeTileDocAt(home(), (cur) => {
      seen = cur
      return cur
    })
    expect(seen).toEqual({ layout: 1, tiles: [], locked: false })
  })

  it('a corrupt document reads empty untouched; the next write quarantines it under a fresh name and lands', async () => {
    await mkdir(home(), { recursive: true })
    await writeFile(tileDocPath(home()), '{ not json')
    expect(await readTileDocAt(home())).toEqual({ layout: undefined, tiles: [], locked: false })
    expect(await readFile(tileDocPath(home()), 'utf8')).toBe('{ not json')
    await seed(home(), [{ id: 'a', type: 'markdown' }])
    expect((await entries())[0].id).toBe('a')
    const bad = (await readdir(home())).filter((f) => f.startsWith('_tiles.json.bad-'))
    expect(bad).toHaveLength(1)
    expect(await readFile(join(home(), bad[0]), 'utf8')).toBe('{ not json')
    await writeFile(tileDocPath(home()), '[1, 2]')
    await seed(home(), [{ id: 'b', type: 'markdown' }])
    expect((await readdir(home())).filter((f) => f.startsWith('_tiles.json.bad-'))).toHaveLength(2)
    expect((await entries())[0].id).toBe('b')
  })
})

describe('markdown tile lifecycle', () => {
  it('an absent body is not-found; a body the read fails on is not an empty one', async () => {
    const id = await createMarkdownTile(home())
    await writeMarkdownTile(home(), id, 'prose')
    expect((await readMarkdownTile(home(), 'x')).ok).toBe(false)
    expect(await readMarkdownTile(home(), 'x')).toMatchObject({ error: { code: 'not-found' } })
    await chmod(tileFilePath(home(), id), 0o000)
    expect(await readMarkdownTile(home(), id)).toMatchObject({
      error: { code: 'operation-failed' },
    })
    await chmod(tileFilePath(home(), id), 0o644)
    expect(await readMarkdownTile(home(), id)).toEqual(ok('prose'))
  })

  it('create mints the dir + empty file + entry; the body round-trips pure (no frontmatter)', async () => {
    const id = await createMarkdownTile(home())
    expect(await pathExists(tileFilePath(home(), id))).toBe(true)
    expect(await entries()).toEqual([{ id, type: 'markdown' }])

    await writeMarkdownTile(home(), id, '# Hi\n\n[[Some Page]]\n')
    expect(await readMarkdownTile(home(), id)).toEqual(ok('# Hi\n\n[[Some Page]]\n'))
    expect(await readFile(tileFilePath(home(), id), 'utf8')).not.toContain('---')
  })

  it('a markdown tile mints its file inside the Space folder', async () => {
    const id = await createMarkdownTile(spaceDir())
    expect(await pathExists(join(spaceDir(), `${id}.md`))).toBe(true)
    await writeMarkdownTile(spaceDir(), id, 'body')
    expect(await readMarkdownTile(spaceDir(), id)).toEqual(ok('body'))
  })

  it('remove drops the entry and trashes the file; foreign entries survive', async () => {
    await seed(home(), [{ id: 'alien', type: 'widget', keep: true }])
    const id = await createMarkdownTile(home())
    await removeTile(root, home(), id)
    expect(await entries()).toEqual([{ id: 'alien', type: 'widget', keep: true }])
    expect(await pathExists(tileFilePath(home(), id))).toBe(false)
    const trashed = await readdir(join(root, '.trash'), { recursive: true })
    expect(trashed.some((f) => f.includes(id))).toBe(true)
  })

  it('an entry op leaves the layout and lock alone', async () => {
    await writeTileDocAt(home(), (cur) => ({ ...cur, layout: { bands: [] }, locked: true }))
    await createMarkdownTile(home())
    const doc = await readTileDocAt(home())
    expect(doc.layout).toEqual({ bands: [] })
    expect(doc.locked).toBe(true)
  })

  it('convert to view stamps a payload-local config id and trashes the markdown file', async () => {
    const id = await createMarkdownTile(home())
    await seed(home(), [{ id, type: 'markdown', style: 'borderless', outside_key: 1 }])
    await convertTileToView(root, home(), id, [
      { source_id: 'src1', config: { id: 'source-view-id', name: 'Table', foreign: true } },
    ])
    const entry = (await entries())[0]
    expect(entry.type).toBe('view')
    expect(entry.style).toBe('borderless')
    expect(entry.outside_key).toBe(1)
    expect(entry.active).toBe(0)
    const view = (entry.views as Array<Record<string, unknown>>)[0]
    expect(view.source_id).toBe('src1')
    const config = view.config as Record<string, unknown>
    expect(config.name).toBe('Table')
    expect(config.foreign).toBe(true)
    expect(config.id).not.toBe('source-view-id')
    expect(await pathExists(tileFilePath(home(), id))).toBe(false)
  })

  it('duplicate copies the raw entry + file; a view copy re-mints its config ids', async () => {
    const id = await createMarkdownTile(home())
    await writeMarkdownTile(home(), id, 'body text')
    await seed(home(), [{ id, type: 'markdown', style: 'borderless', alien: 1 }])
    const dupId = await duplicateTile(home(), id)
    expect(dupId).toBeTruthy()
    expect(await readMarkdownTile(home(), dupId as string)).toEqual(ok('body text'))
    expect((await entries()).find((b) => b.id === dupId)).toMatchObject({
      type: 'markdown',
      style: 'borderless',
      alien: 1,
    })

    await seed(home(), [
      { id: 'v1', type: 'view', views: [{ source_id: 's', config: { id: 'cfg-a', name: 'T' } }] },
    ])
    const dupView = await duplicateTile(home(), 'v1')
    const after = await entries()
    const viewCopy = after.find((b) => b.id === dupView) as {
      views: Array<{ config: { id: string } }>
    }
    expect(viewCopy.views[0].config.id).not.toBe('cfg-a')
    expect(
      (after.find((b) => b.id === 'v1') as { views: Array<{ config: { id: string } }> }).views[0]
        .config.id,
    ).toBe('cfg-a')
  })

  it('removing a non-markdown tile touches no files', async () => {
    await seed(home(), [{ id: 'p1', type: 'page', page_id: 'x' }])
    await removeTile(root, home(), 'p1')
    expect(await entries()).toEqual([])
    expect(await pathExists(join(root, '.trash'))).toBe(false)
  })
})

describe('rewriteTileConnections', () => {
  it('rewrites [[oldTitle]] → [[newTitle]] in tile bodies, leaving non-matches untouched', async () => {
    const id = await createMarkdownTile(home())
    await writeMarkdownTile(home(), id, 'see [[Target]] and [[Other]]')
    await rewriteTileConnections(root, 'Target', 'Renamed')
    expect(await readMarkdownTile(home(), id)).toEqual(ok('see [[Renamed]] and [[Other]]'))
  })

  it('leaves a body without the old title byte-identical (no needless write)', async () => {
    const id = await createMarkdownTile(home())
    await writeMarkdownTile(home(), id, 'see [[Other]]')
    await rewriteTileConnections(root, 'Target', 'Renamed')
    expect(await readMarkdownTile(home(), id)).toEqual(ok('see [[Other]]'))
  })
})

describe('the copy arm', () => {
  it("re-mints a view entry's config ids and keeps its foreign keys; other kinds have no arm", () => {
    const raw = {
      id: 'v',
      type: 'view',
      alien: 1,
      views: [{ source_id: 's', config: { id: 'old' } }],
    }
    const copy = TILE_COPY.view?.(raw) as typeof raw
    expect(copy.alien).toBe(1)
    expect(copy.views[0].config.id).not.toBe('old')
    expect(raw.views[0].config.id).toBe('old')
    expect(TILE_COPY.markdown).toBeUndefined()
    expect(TILE_COPY.page).toBeUndefined()
  })

  it("copyEntry dispatches by the entry's own kind and passes everything else through", () => {
    const view = { id: 'v', type: 'view', views: [{ config: { id: 'old' } }] }
    expect((copyEntry(view) as typeof view).views[0].config.id).not.toBe('old')
    for (const raw of [
      null,
      7,
      { id: 'm', type: 'markdown' },
      { id: 'x', type: 'toString' },
      { id: 'y', type: '__proto__' },
    ])
      expect(copyEntry(raw)).toBe(raw)
  })
})
