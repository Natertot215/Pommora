import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rm, mkdir, writeFile, readFile, stat } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { tempRoot } from '../Testing/hostFs'
import { nexusDir, SIDECAR_FILENAME } from '../Paths/paths'
import { normalizeSavedViews } from './migrateConfig'

let root: string

const view = (id: string, banner?: string): Record<string, unknown> => ({
  id,
  name: id,
  type: 'cards',
  property_order: [],
  hidden_properties: [],
  ...(banner === undefined ? {} : { card_banner: banner }),
})

const sidecarAt = (dir: string): string => join(root, dir, SIDECAR_FILENAME.collection)

const seed = async (dir: string, views: Record<string, unknown>[]): Promise<void> => {
  await mkdir(join(root, dir), { recursive: true })
  await writeFile(sidecarAt(dir), JSON.stringify({ views }, null, 2))
}

const viewsIn = async (dir: string): Promise<Record<string, unknown>[]> =>
  JSON.parse(await readFile(sidecarAt(dir), 'utf8')).views

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
    await seed(join('Notes', 'Deep'), [view('view_c', 'image')])
    await normalizeSavedViews(root)
    expect((await viewsIn('Notes')).map((v) => v.card_banner)).toEqual(['banner', 'preview'])
    expect((await viewsIn(join('Notes', 'Deep')))[0].card_banner).toBe('banner')
  })

  it('leaves a sidecar it does not alter untouched, so a second open re-dates nothing', async () => {
    await seed('Notes', [view('view_a', 'banner'), view('view_b')])
    const before = (await stat(sidecarAt('Notes'))).mtimeMs
    await normalizeSavedViews(root)
    expect((await stat(sidecarAt('Notes'))).mtimeMs).toBe(before)
  })

  it('keeps every other field of the view it rewrites', async () => {
    await seed('Notes', [{ ...view('view_a', 'image'), card_size: 0.75, format: 'compact' }])
    const [only] = await viewsIn('Notes')
    expect(only).toMatchObject({ id: 'view_a', card_size: 0.75, format: 'compact' })
    await normalizeSavedViews(root)
    expect(await viewsIn('Notes')).toEqual([
      { ...view('view_a', 'banner'), card_size: 0.75, format: 'compact' },
    ])
  })

  it('passes over a sidecar whose views are absent or malformed', async () => {
    await mkdir(join(root, 'Notes'), { recursive: true })
    await writeFile(sidecarAt('Notes'), JSON.stringify({ icon: 'folder' }))
    await expect(normalizeSavedViews(root)).resolves.toBeUndefined()
  })
})
