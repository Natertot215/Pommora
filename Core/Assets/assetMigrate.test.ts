import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rm, mkdir, writeFile, readFile, readdir, chmod } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { tempRoot, noModeBits, readJsonAt } from '../Testing/hostFs'
import { openSession, closeSession } from '../Nexus/session'
import { refreshTree } from '../Nexus/liveTree'
import '../Nexus/settle'
import { writeAssetDirectory } from '../Settings/settings'
import { pathExists } from '../Files/atomicWrite'
import { migrateAssets } from './assetMigrate'
import { liveAssetMap, resolveAssetName } from './assetMap'
import { parseConnectionText } from '../Connections/connections'
import { splitFrontmatter } from '../Files/pageFile'
import { contextsDir } from '../Paths/paths'
import { SPACE_SIDECAR } from '../Paths/nexusPaths'
import type { TrashDeps } from '../Trash/bundle'

const nexusDeps: TrashDeps = { trashMode: 'nexus', trashToSystem: async () => {} }

let root: string
const read = async (rel: string): Promise<string> => readFile(join(root, rel), 'utf8')
const readJson = <T = Record<string, unknown>>(rel: string): Promise<T> =>
  readJsonAt<T>(join(root, rel))
const asset = async (rel: string, bytes: string): Promise<void> => {
  await mkdir(join(root, '.nexus/assets', ...rel.split('/').slice(0, -1)), { recursive: true })
  await writeFile(join(root, '.nexus/assets', rel), bytes)
}

beforeEach(async () => {
  root = tempRoot('pom-migrate-')
  await mkdir(join(root, '.nexus', 'assets'), { recursive: true })
  await mkdir(join(root, '.nexus', 'homepage'), { recursive: true })
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
    expect(await migrateAssets(root, nexusDeps)).toBeNull()
    expect(await pathExists(join(root, '.nexus/assets/a/banner-abcdef12.png'))).toBe(true)
  })

  it('runs against the asset directory just written while a tree is held', async () => {
    await writeFile(join(root, '.nexus', 'settings.json'), '{}')
    await asset('a/banner-abcdef12.png', 'bytes')
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'pt', banner: '.nexus/assets/a/banner-abcdef12.png' }),
    )
    await refreshTree(root)
    await writeAssetDirectory(root, 'file-assets')
    expect((await migrateAssets(root, nexusDeps))?.rewritten).toBe(1)
    expect((await readJson('Notes/_pagecollection.json')).banner).toBe('[[Notes Banner.png]]')
  })

  it('rewrites the links inside excluded folders before the sweep trashes the legacy folder', async () => {
    await writeFile(
      join(root, '.nexus', 'settings.json'),
      JSON.stringify({ asset_directory: 'file-assets', excluded_folders: ['Vault'] }),
    )
    await asset('a/Cover.png', 'cover')
    await mkdir(join(root, 'Vault'), { recursive: true })
    await writeFile(
      join(root, 'Vault', '_pagecollection.json'),
      JSON.stringify({ id: 'vt', banner: '.nexus/assets/a/Cover.png' }),
    )
    await writeFile(join(root, 'Vault', 'Old.md'), '---\nbanner: "[[Cover.png]]"\n---\n\nbody')
    const r = await migrateAssets(root, nexusDeps)
    expect(r?.rewritten).toBe(2)
    expect(r?.trashed).toBe(1)
    expect((await readJson('Vault/_pagecollection.json')).banner).toBe('[[Cover.png]]')
    expect(await pathExists(join(root, 'file-assets', 'Cover.png'))).toBe(true)
  })

  it('holds the sweep when a store can’t be read', async () => {
    await asset('a/Cover.png', 'cover')
    await writeFile(join(root, 'Notes', '_pagecollection.json'), '{ not json')
    const r = await migrateAssets(root, nexusDeps)
    expect(r?.skipped).toEqual([
      { store: 'Notes/_pagecollection.json', why: 'it could not be read' },
    ])
    expect(r?.trashed).toBe(0)
    expect(await pathExists(join(root, '.nexus/assets/a/Cover.png'))).toBe(true)
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
    const r = await migrateAssets(root, nexusDeps)
    expect(r?.moved).toHaveLength(1)
    expect(r?.rewritten).toBe(3)
    expect(await readdir(join(root, 'file-assets'))).toEqual(['IMG_0073.jpeg'])
    for (const dir of ['Notes', 'Ideas', 'Studio'])
      expect((await readJson(`${dir}/_pagecollection.json`)).banner).toBe('[[IMG_0073.jpeg]]')
  })

  it('keeps a real name and gives an invented one its owner’s', async () => {
    await asset('one/Purplish Dark Sky.png', 'real')
    await asset('two/banner-mxplrbde.jpg', 'invented')
    await writeFile(
      join(root, '.nexus', 'homepage', 'homepage.json'),
      JSON.stringify({ banner: '.nexus/assets/one/Purplish Dark Sky.png' }),
    )
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'pt', banner: '.nexus/assets/two/banner-mxplrbde.jpg' }),
    )
    await migrateAssets(root, nexusDeps)
    expect((await readJson('.nexus/homepage/homepage.json')).banner).toBe(
      '[[Purplish Dark Sky.png]]',
    )
    expect((await readJson('Notes/_pagecollection.json')).banner).toBe('[[Notes Banner.jpg]]')
  })

  it('the nexus singletons take the nexus’s own names', async () => {
    await asset('banner-aaaaaa11.jpg', 'nav')
    await asset('id/profile-bbbbbb22.png', 'icon')
    await writeFile(
      join(root, '.nexus', 'state.json'),
      JSON.stringify({ navigation: { banner: '.nexus/assets/banner-aaaaaa11.jpg' } }),
    )
    await writeFile(
      join(root, '.nexus', 'settings.json'),
      JSON.stringify({
        asset_directory: 'file-assets',
        profile_image: '.nexus/assets/id/profile-bbbbbb22.png',
      }),
    )
    await migrateAssets(root, nexusDeps)
    expect(
      (await readJson<{ navigation?: { banner?: string } }>('.nexus/state.json')).navigation
        ?.banner,
    ).toBe('[[nexus-banner.jpg]]')
    expect((await readJson('.nexus/settings.json')).profile_image).toBe('[[nexus-icon.png]]')
  })

  it('an orphan no store references is swept, never migrated — and a referenced twin still moves', async () => {
    await asset('dead/orphan.png', 'orphan-bytes')
    await asset('live/kept.png', 'kept-bytes')
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'pt', banner: '.nexus/assets/live/kept.png' }),
    )
    await migrateAssets(root, nexusDeps)
    expect(await readdir(join(root, 'file-assets'))).toEqual(['kept.png'])
    expect(await pathExists(join(root, 'file-assets/orphan.png'))).toBe(false)
    const trashed = await readdir(join(root, '.trash'), { recursive: true })
    expect(trashed.some((n) => String(n).includes('orphan.png'))).toBe(true)
  })

  it('trashes a leftover the map never indexed rather than deleting it', async () => {
    await asset('_private/contract.pdf', 'contract-bytes')
    await asset('live/kept.png', 'kept')
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'pt', banner: '.nexus/assets/live/kept.png' }),
    )
    await migrateAssets(root, nexusDeps)
    const trashed = await readdir(join(root, '.trash'), { recursive: true })
    expect(trashed.some((n) => String(n).includes('contract.pdf'))).toBe(true)
  })

  it('sends swept leftovers to the system trash in System mode', async () => {
    await asset('dead/orphan.png', 'orphan-bytes')
    const sent: string[] = []
    await migrateAssets(root, {
      trashMode: 'system',
      trashToSystem: async (p) => {
        sent.push(p)
        await rm(p)
      },
    })
    expect(sent).toEqual([join(root, '.nexus/assets/dead/orphan.png')])
    expect(await pathExists(join(root, '.trash'))).toBe(false)
  })

  it('empties .nexus/assets of images and thumbnails, keeping only its own crops config', async () => {
    await asset('thumbnails/abc.jpg', 'thumb')
    await asset('live/kept.png', 'kept')
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'pt', banner: '.nexus/assets/live/kept.png' }),
    )
    await migrateAssets(root, nexusDeps)
    expect(await readdir(join(root, '.nexus/assets')).catch(() => [])).toEqual(['crops.json'])
  })

  it('a page banner migrates through the frontmatter, body and foreign keys intact', async () => {
    await asset('p/banner-cccccc33.png', 'cover')
    await writeFile(join(root, 'Notes', '_pagecollection.json'), JSON.stringify({ id: 'pt' }))
    await writeFile(
      join(root, 'Notes', 'Alpha.md'),
      '---\nID: 01KVGMT8BFP350FZZXAMG1QDRA\nbanner: .nexus/assets/p/banner-cccccc33.png\n<Areas>:\n  - Work\n---\n\nthe body',
    )
    await migrateAssets(root, nexusDeps)
    const after = await read('Notes/Alpha.md')
    expect(after).toMatch(/banner: ["']\[\[Alpha Banner\.png\]\]["']/)
    expect(after).toContain('the body')
    expect(after).toContain('<Areas>:')
  })

  it('File property attachments move with the migration and are rewritten where they sit', async () => {
    await asset('Spec.pdf', 'spec')
    await asset('Plan.pdf', 'plan')
    await writeFile(join(root, 'Notes', '_pagecollection.json'), JSON.stringify({ id: 'pt' }))
    await writeFile(
      join(root, 'Notes', 'Alpha.md'),
      '---\nID: 01KVGMT8BFP350FZZXAMG1QDRA\nAttachment: "[[Spec.pdf]]"\nFiles:\n  - "[[Plan.pdf]]"\n  - "[[Beta]]"\nRelated: "[[Beta]]"\n---\n\nthe body',
    )
    const space = join(contextsDir(root), 'Areas', 'Home')
    await mkdir(space, { recursive: true })
    await writeFile(
      join(space, SPACE_SIDECAR),
      JSON.stringify({ id: 'sp', Attachment: '[[Spec.pdf]]' }),
    )
    const r = await migrateAssets(root, nexusDeps)
    expect(r?.skipped).toEqual([])
    expect((await readdir(join(root, 'file-assets'))).sort()).toEqual(['Plan.pdf', 'Spec.pdf'])
    const fm = splitFrontmatter(await read('Notes/Alpha.md'))
    expect(fm.Attachment).toBe('[[Spec.pdf]]')
    expect(fm.Files).toEqual(['[[Plan.pdf]]', '[[Beta]]'])
    expect(fm.Related).toBe('[[Beta]]')
    expect((await readJsonAt(join(space, SPACE_SIDECAR))).Attachment).toBe('[[Spec.pdf]]')
    expect(resolveAssetName(await liveAssetMap(root), 'Spec.pdf')).toBe('file-assets/Spec.pdf')
  })

  it('re-keys a moved file’s crop to its new path', async () => {
    await asset('a/Photo.png', 'photo-bytes')
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'pt', banner: '.nexus/assets/a/Photo.png' }),
    )
    await writeFile(
      join(root, '.nexus', 'assets', 'crops.json'),
      JSON.stringify({ byImage: { '.nexus/assets/a/Photo.png': { x: 0.3, y: 0.4, zoom: 2 } } }),
    )
    await migrateAssets(root, nexusDeps)
    expect((await readJson('.nexus/assets/crops.json')).byImage).toEqual({
      'file-assets/Photo.png': { x: 0.3, y: 0.4, zoom: 2 },
    })
  })

  it('every rewritten value resolves against the map main now holds', async () => {
    await asset('one/Sunset.png', 'a')
    await asset('two/banner-dddddd44.jpg', 'b')
    await writeFile(
      join(root, '.nexus', 'homepage', 'homepage.json'),
      JSON.stringify({ banner: '.nexus/assets/one/Sunset.png' }),
    )
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'pt', banner: '.nexus/assets/two/banner-dddddd44.jpg' }),
    )
    await migrateAssets(root, nexusDeps)
    const map = await liveAssetMap(root)
    for (const value of [
      (await readJson<{ banner: string }>('.nexus/homepage/homepage.json')).banner,
      (await readJson<{ banner: string }>('Notes/_pagecollection.json')).banner,
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
    await migrateAssets(root, nexusDeps)
    expect(await migrateAssets(root, nexusDeps)).toBeNull()
    expect((await readJson('Notes/_pagecollection.json')).banner).toBe('[[Solo.png]]')
    expect(await readdir(join(root, 'file-assets'))).toEqual(['Solo.png'])
  })

  it('a reference whose file is gone is reported as skipped, and the rest still migrate', async () => {
    await asset('live/kept.png', 'kept')
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'pt', banner: '.nexus/assets/live/kept.png' }),
    )
    await writeFile(
      join(root, '.nexus', 'homepage', 'homepage.json'),
      JSON.stringify({ banner: '.nexus/assets/gone/missing.png' }),
    )
    const r = await migrateAssets(root, nexusDeps)
    expect(r?.skipped.map((s) => s.store)).toEqual(['homepage.json'])
    expect((await readJson('Notes/_pagecollection.json')).banner).toBe('[[kept.png]]')
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
    const r = await migrateAssets(root, nexusDeps)
    expect(r?.skipped).toHaveLength(1)
    expect(r?.moved).toEqual([])
    expect(await pathExists(join(root, '.nexus/assets/a/Twin.png'))).toBe(true)
    expect(await pathExists(join(root, '.nexus/assets/b/Twin.png'))).toBe(true)
  })

  it.skipIf(noModeBits)(
    'a store that refuses its write is reported, and the sweep is held',
    async () => {
      await asset('live/kept.png', 'kept')
      await writeFile(
        join(root, '.nexus', 'homepage', 'homepage.json'),
        JSON.stringify({ banner: '.nexus/assets/live/kept.png' }),
      )
      await mkdir(join(root, 'Locked'), { recursive: true })
      await writeFile(
        join(root, 'Locked', '_pagecollection.json'),
        JSON.stringify({ id: 'lk', banner: '.nexus/assets/live/kept.png' }),
      )
      await chmod(join(root, 'Locked'), 0o555)
      try {
        const r = await migrateAssets(root, nexusDeps)
        expect(r?.rewritten).toBe(1)
        expect(r?.skipped.map((x) => x.store)).toEqual(['Locked/_pagecollection.json'])
        expect(r?.trashed).toBe(0)
        expect((await readJson('.nexus/homepage/homepage.json')).banner).toBe('[[kept.png]]')
      } finally {
        await chmod(join(root, 'Locked'), 0o755)
      }
    },
  )
})
