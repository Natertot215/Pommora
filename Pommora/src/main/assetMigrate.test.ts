import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile, readFile, readdir, chmod } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openSession, closeSession, sessionRoot } from './session'
import { pathExists } from './IO/atomicWrite'
import { migrateAssets } from './assetMigrate'
import { liveAssetMap, resolveAssetName } from './assetMap'
import { parseConnectionText } from '@shared/connections'

let root: string
const read = async (rel: string): Promise<string> => readFile(join(root, rel), 'utf8')
const asset = async (rel: string, bytes: string): Promise<void> => {
  await mkdir(join(root, '.nexus/assets', ...rel.split('/').slice(0, -1)), { recursive: true })
  await writeFile(join(root, '.nexus/assets', rel), bytes)
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-migrate-'))
  await mkdir(join(root, '.nexus'), { recursive: true })
  await mkdir(join(root, 'Notes'), { recursive: true })
  await writeFile(join(root, '.nexus', 'nexus.json'), JSON.stringify({ id: 'nx' }))
  await writeFile(
    join(root, '.nexus', 'settings.json'),
    JSON.stringify({ asset_directory: 'file-assets' }),
  )
  await mkdir(join(root, 'file-assets'), { recursive: true })
  await openSession(root)
})
afterEach(async () => {
  closeSession()
  await rm(root, { recursive: true, force: true })
})

describe('migrateAssets', () => {
  it('does not run at all while the asset directory is unset', async () => {
    await writeFile(join(root, '.nexus', 'settings.json'), '{}')
    await asset('a/banner-abcdef12.png', 'bytes')
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'pt', banner: '.nexus/assets/a/banner-abcdef12.png' }),
    )
    expect(await migrateAssets(root)).toBeNull()
    expect(await pathExists(join(root, '.nexus/assets/a/banner-abcdef12.png'))).toBe(true)
  })

  it('collapses byte-identical files to one and rewrites every reference to it', async () => {
    for (const k of ['a', 'b', 'c']) await asset(`${k}/IMG_0073.jpeg`, 'same-photo')
    for (const [dir, key] of [
      ['Notes', 'a'],
      ['Ideas', 'b'],
      ['Studio', 'c'],
    ] as const) {
      await mkdir(join(root, dir), { recursive: true })
      await writeFile(
        join(root, dir, '_pagecollection.json'),
        JSON.stringify({ id: dir, banner: `.nexus/assets/${key}/IMG_0073.jpeg` }),
      )
    }
    const r = await migrateAssets(root)
    expect(r?.moved).toHaveLength(1)
    expect(r?.rewritten).toBe(3)
    expect(await readdir(join(root, 'file-assets'))).toEqual(['IMG_0073.jpeg'])
    for (const dir of ['Notes', 'Ideas', 'Studio'])
      expect(JSON.parse(await read(`${dir}/_pagecollection.json`)).banner).toBe('[[IMG_0073.jpeg]]')
  })

  it('keeps a real name and gives an invented one its owner’s', async () => {
    await asset('one/Purplish Dark Sky.png', 'real')
    await asset('two/banner-mxplrbde.jpg', 'invented')
    await writeFile(
      join(root, '.nexus', 'homepage.json'),
      JSON.stringify({ banner: '.nexus/assets/one/Purplish Dark Sky.png' }),
    )
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'pt', banner: '.nexus/assets/two/banner-mxplrbde.jpg' }),
    )
    await migrateAssets(root)
    expect(JSON.parse(await read('.nexus/homepage.json')).banner).toBe('[[Purplish Dark Sky.png]]')
    expect(JSON.parse(await read('Notes/_pagecollection.json')).banner).toBe('[[Notes Banner.jpg]]')
  })

  it('the nexus singletons take the nexus’s own names', async () => {
    await asset('banner-aaaaaa11.jpg', 'nav')
    await asset('id/profile-bbbbbb22.png', 'icon')
    await writeFile(
      join(root, '.nexus', 'navigation.json'),
      JSON.stringify({ banner: '.nexus/assets/banner-aaaaaa11.jpg' }),
    )
    await writeFile(
      join(root, '.nexus', 'settings.json'),
      JSON.stringify({
        asset_directory: 'file-assets',
        profile_image: '.nexus/assets/id/profile-bbbbbb22.png',
      }),
    )
    await migrateAssets(root)
    expect(JSON.parse(await read('.nexus/navigation.json')).banner).toBe('[[nexus-banner.jpg]]')
    expect(JSON.parse(await read('.nexus/settings.json')).profile_image).toBe('[[nexus-icon.png]]')
  })

  it('an orphan no store references is swept, never migrated — and a referenced twin still moves', async () => {
    await asset('dead/orphan.png', 'orphan-bytes')
    await asset('live/kept.png', 'kept-bytes')
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'pt', banner: '.nexus/assets/live/kept.png' }),
    )
    await migrateAssets(root)
    expect(await readdir(join(root, 'file-assets'))).toEqual(['kept.png'])
    expect(await pathExists(join(root, 'file-assets/orphan.png'))).toBe(false)
    const trashed = await readdir(join(root, '.trash'), { recursive: true })
    expect(trashed.some((n) => String(n).includes('orphan.png'))).toBe(true)
  })

  it('empties .nexus/assets outright, thumbnails included', async () => {
    await asset('thumbnails/abc.jpg', 'thumb')
    await asset('live/kept.png', 'kept')
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'pt', banner: '.nexus/assets/live/kept.png' }),
    )
    await migrateAssets(root)
    expect(await readdir(join(root, '.nexus/assets')).catch(() => [])).toEqual([])
  })

  it('a page cover migrates through the frontmatter, body and foreign keys intact', async () => {
    await asset('p/banner-cccccc33.png', 'cover')
    await writeFile(join(root, 'Notes', '_pagecollection.json'), JSON.stringify({ id: 'pt' }))
    await writeFile(
      join(root, 'Notes', 'Alpha.md'),
      '---\nPageID: 01KVGMT8BFG350FZZXAMG1QDRA\ncover: .nexus/assets/p/banner-cccccc33.png\n<Areas>:\n  - Work\n---\n\nthe body',
    )
    await migrateAssets(root)
    const after = await read('Notes/Alpha.md')
    expect(after).toMatch(/cover: ["']\[\[Alpha Banner\.png\]\]["']/)
    expect(after).toContain('the body')
    expect(after).toContain('<Areas>:')
  })

  it('re-keys a moved file’s crop to its new path', async () => {
    await asset('a/Photo.png', 'photo-bytes')
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'pt', banner: '.nexus/assets/a/Photo.png' }),
    )
    await writeFile(
      join(root, '.nexus', 'crops.json'),
      JSON.stringify({ byImage: { '.nexus/assets/a/Photo.png': { x: 0.3, y: 0.4, zoom: 2 } } }),
    )
    await migrateAssets(root)
    expect(JSON.parse(await read('.nexus/crops.json')).byImage).toEqual({
      'file-assets/Photo.png': { x: 0.3, y: 0.4, zoom: 2 },
    })
  })

  // A value the migration writes that the resolver cannot read is a silent blanking of every
  // banner at once, so the two mechanisms are crossed rather than each tested alone.
  it('every rewritten value resolves against the map main now holds', async () => {
    await asset('one/Sunset.png', 'a')
    await asset('two/banner-dddddd44.jpg', 'b')
    await writeFile(
      join(root, '.nexus', 'homepage.json'),
      JSON.stringify({ banner: '.nexus/assets/one/Sunset.png' }),
    )
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'pt', banner: '.nexus/assets/two/banner-dddddd44.jpg' }),
    )
    await migrateAssets(root)
    const map = await liveAssetMap(sessionRoot()!)
    for (const value of [
      JSON.parse(await read('.nexus/homepage.json')).banner,
      JSON.parse(await read('Notes/_pagecollection.json')).banner,
    ]) {
      const named = parseConnectionText(value)
      expect(named).not.toBeNull()
      const rel = resolveAssetName(map, named!.title)
      expect(rel).toBeTypeOf('string')
      expect(await pathExists(join(root, rel as string))).toBe(true)
    }
  })

  it('a second run does not apply at all — the gate is one readdir', async () => {
    await asset('one/Solo.png', 'bytes')
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'pt', banner: '.nexus/assets/one/Solo.png' }),
    )
    await migrateAssets(root)
    expect(await migrateAssets(root)).toBeNull()
    expect(JSON.parse(await read('Notes/_pagecollection.json')).banner).toBe('[[Solo.png]]')
    expect(await readdir(join(root, 'file-assets'))).toEqual(['Solo.png'])
  })

  it('a reference whose file is gone is reported as skipped, and the rest still migrate', async () => {
    await asset('live/kept.png', 'kept')
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'pt', banner: '.nexus/assets/live/kept.png' }),
    )
    await writeFile(
      join(root, '.nexus', 'homepage.json'),
      JSON.stringify({ banner: '.nexus/assets/gone/missing.png' }),
    )
    const r = await migrateAssets(root)
    expect(r?.skipped.map((s) => s.store)).toEqual(['homepage.json'])
    expect(JSON.parse(await read('Notes/_pagecollection.json')).banner).toBe('[[kept.png]]')
    // The sweep waits: the file a skipped reference still names is the only copy of it.
    expect(r?.trashed).toBe(0)
    expect(await pathExists(join(root, '.nexus/assets/live/kept.png'))).toBe(true)
  })

  it('a name several files answer to is reported, and neither file is trashed', async () => {
    await asset('a/Twin.png', 'one')
    await asset('b/Twin.png', 'two')
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'pt', banner: '[[Twin.png]]' }),
    )
    const r = await migrateAssets(root)
    expect(r?.skipped).toHaveLength(1)
    expect(r?.moved).toEqual([])
    expect(await pathExists(join(root, '.nexus/assets/a/Twin.png'))).toBe(true)
    expect(await pathExists(join(root, '.nexus/assets/b/Twin.png'))).toBe(true)
  })

  it('a store that refuses its write is reported, and the sweep is held', async () => {
    await asset('live/kept.png', 'kept')
    await writeFile(
      join(root, '.nexus', 'homepage.json'),
      JSON.stringify({ banner: '.nexus/assets/live/kept.png' }),
    )
    await mkdir(join(root, 'Locked'), { recursive: true })
    await writeFile(
      join(root, 'Locked', '_pagecollection.json'),
      JSON.stringify({ id: 'lk', banner: '.nexus/assets/live/kept.png' }),
    )
    await chmod(join(root, 'Locked'), 0o555)
    try {
      const r = await migrateAssets(root)
      expect(r?.rewritten).toBe(1)
      expect(r?.skipped.map((x) => x.store)).toEqual(['Locked/_pagecollection.json'])
      expect(r?.trashed).toBe(0)
      expect(JSON.parse(await read('.nexus/homepage.json')).banner).toBe('[[kept.png]]')
    } finally {
      await chmod(join(root, 'Locked'), 0o755)
    }
  })
})
