import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rm, mkdir, writeFile, stat } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { tempRoot, readJsonAt } from '../Testing/hostFs'
import { nexusDir } from '../Paths/paths'
import { SIDECAR_FILENAME, TILE_DOC_FILENAME } from '../Paths/nexusPaths'
import { normalizeSavedViews } from './migrateConfig'
import { stampAdopted } from './adopt'

let root: string

const view = (id: string, banner?: string): Record<string, unknown> => ({
  id,
  name: id,
  type: 'cards',
  property_order: [],
  hidden_properties: [],
  ...(banner === undefined ? {} : { card_banner: banner }),
})

type Kind = 'collection' | 'set'

const sidecarAt = (dir: string, kind: Kind = 'collection'): string =>
  join(root, dir, SIDECAR_FILENAME[kind])

const seed = async (
  dir: string,
  views: Record<string, unknown>[],
  kind: Kind = 'collection',
): Promise<void> => {
  await mkdir(join(root, dir), { recursive: true })
  await writeFile(sidecarAt(dir, kind), JSON.stringify({ id: `id-${dir}`, views }, null, 2))
}

const viewsIn = async (
  dir: string,
  kind: Kind = 'collection',
): Promise<Record<string, unknown>[]> =>
  (await readJsonAt<{ views: Record<string, unknown>[] }>(sidecarAt(dir, kind))).views

// The open sequence: the walk covers the Trash and tile documents, and adoption every container in scope.
const open = async (): Promise<void> => {
  await normalizeSavedViews(root)
  await stampAdopted(root)
}

beforeEach(async () => {
  root = tempRoot('pom-normalize-')
  await mkdir(nexusDir(root), { recursive: true })
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('normalizeSavedViews', () => {
  it("rewrites the banner mode's first spelling wherever it is still written down", async () => {
    await seed('Notes', [view('view_a', 'image'), view('view_b', 'preview')])
    await seed(join('Notes', 'Deep'), [view('view_c', 'image')], 'set')
    await open()
    expect((await viewsIn('Notes')).map((v) => v.card_banner)).toEqual(['banner', 'preview'])
    expect((await viewsIn(join('Notes', 'Deep'), 'set'))[0].card_banner).toBe('banner')
  })

  it('leaves a sidecar it does not alter untouched, so a second open re-dates nothing', async () => {
    await seed('Notes', [view('view_a', 'banner'), view('view_b')])
    const before = (await stat(sidecarAt('Notes'))).mtimeMs
    await open()
    expect((await stat(sidecarAt('Notes'))).mtimeMs).toBe(before)
  })

  it('keeps every other field of the view it rewrites', async () => {
    await seed('Notes', [{ ...view('view_a', 'image'), card_size: 0.75, format: 'compact' }])
    const [only] = await viewsIn('Notes')
    expect(only).toMatchObject({ id: 'view_a', card_size: 0.75, format: 'compact' })
    await open()
    expect(await viewsIn('Notes')).toEqual([
      { ...view('view_a', 'banner'), card_size: 0.75, format: 'compact' },
    ])
  })

  it("renames the Table view's old glyph key in sidecars, trashed sidecars, and every tile document", async () => {
    await seed('Notes', [
      { ...view('view_a'), icon: 'table' },
      { ...view('view_b'), icon: 'star' },
    ])
    const trashed = join('.trash', 'Old.deleted', 'Old')
    await seed(trashed, [{ ...view('view_t'), icon: 'table' }])
    const tileDoc = join(nexusDir(root), 'contexts', 'Areas', 'A', TILE_DOC_FILENAME)
    await mkdir(join(tileDoc, '..'), { recursive: true })
    const tile = (icon: string) => ({ config: { ...view('embed'), icon }, source_id: 's' })
    await writeFile(
      tileDoc,
      JSON.stringify({
        layout: [],
        tiles: [
          { id: 't', type: 'view', views: [tile('table'), tile('star')] },
          { id: 'u', views: [tile('table')] },
        ],
      }),
    )
    await open()
    expect((await viewsIn('Notes')).map((v) => v.icon)).toEqual(['view-table', 'star'])
    expect((await viewsIn(trashed))[0].icon).toBe('view-table')
    type TileDoc = { tiles: { views: { config: { icon: string } }[] }[] }
    const doc = await readJsonAt<TileDoc>(tileDoc)
    expect(doc.tiles[0].views.map((e) => e.config.icon)).toEqual(['view-table', 'star'])
    expect(doc.tiles[1].views[0].config.icon).toBe('table')
  })

  it('stamps an id and rewrites the spelling together on a first adoption', async () => {
    await mkdir(join(root, 'Notes'), { recursive: true })
    await writeFile(sidecarAt('Notes'), JSON.stringify({ views: [view('view_a', 'image')] }))
    await writeFile(join(root, 'Notes', 'Page.md'), 'body\n')
    await open()
    const meta = await readJsonAt<{ id: unknown; views: { card_banner: unknown }[] }>(
      sidecarAt('Notes'),
    )
    expect(typeof meta.id).toBe('string')
    expect(meta.views[0].card_banner).toBe('banner')
  })

  it('rewrites a sidecar adoption renames to its folder’s kind', async () => {
    await seed('Notes', [view('view_a', 'image')], 'set')
    await writeFile(join(root, 'Notes', 'Page.md'), 'body\n')
    await open()
    expect((await viewsIn('Notes'))[0].card_banner).toBe('banner')
  })

  it('leaves excluded and hidden folders unread', async () => {
    await writeFile(
      join(nexusDir(root), 'settings.json'),
      JSON.stringify({ excluded_folders: ['Archive'] }),
    )
    for (const dir of ['Archive', '_Drafts', '.obsidian']) await seed(dir, [view('v', 'image')])
    await open()
    for (const dir of ['Archive', '_Drafts', '.obsidian'])
      expect((await viewsIn(dir))[0].card_banner).toBe('image')
  })

  it('passes over a sidecar whose views are absent or malformed', async () => {
    await mkdir(join(root, 'Notes'), { recursive: true })
    await writeFile(sidecarAt('Notes'), JSON.stringify({ icon: 'folder' }))
    await expect(normalizeSavedViews(root)).resolves.toBeUndefined()
  })
})
