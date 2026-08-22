import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ASSETS_DIR_REL, THUMBNAILS_SEGMENT } from '@shared/nexusPaths'
import { buildAssetMap, patchAssetMap, resolveAssetName } from './assetMap'

let root: string
const put = async (...segs: string[]): Promise<void> => {
  await mkdir(join(root, ...segs.slice(0, -1)), { recursive: true })
  await writeFile(join(root, ...segs), 'bytes')
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-assetmap-'))
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('buildAssetMap', () => {
  it('indexes every file by name whatever its extension, keyed nexus-relative POSIX', async () => {
    await put('file-assets', 'Banner.png')
    await put('file-assets', 'nested', 'Deep.HEIC')
    await put('file-assets', 'notes.md')
    const map = await buildAssetMap(root, 'file-assets')
    expect(map.files['banner.png']).toEqual(['file-assets/Banner.png'])
    expect(map.files['deep.heic']).toEqual(['file-assets/nested/Deep.HEIC'])
    expect(map.files['notes.md']).toEqual(['file-assets/notes.md'])
  })

  it('skips the thumbnail folder at any depth, and OS cruft the watcher never delivers', async () => {
    await put('file-assets', THUMBNAILS_SEGMENT, 'nx-home.jpg')
    await put('file-assets', 'nested', THUMBNAILS_SEGMENT, 'nx-work.jpg')
    await put('file-assets', '.DS_Store')
    await put('file-assets', 'node_modules', 'pkg.png')
    await put('file-assets', 'Keep.png')
    const map = await buildAssetMap(root, 'file-assets')
    expect(Object.keys(map.files)).toEqual(['keep.png'])
  })

  it('a missing or empty directory is an empty map, never a throw', async () => {
    await expect(buildAssetMap(root, 'nope')).resolves.toEqual({ files: {}, version: 0 })
    await mkdir(join(root, 'file-assets'), { recursive: true })
    expect((await buildAssetMap(root, 'file-assets')).files).toEqual({})
  })

  it('serves the default root as readily as a configured one', async () => {
    await put(...ASSETS_DIR_REL.split('/'), 'Old.png')
    expect((await buildAssetMap(root, ASSETS_DIR_REL)).files['old.png']).toEqual([
      `${ASSETS_DIR_REL}/Old.png`,
    ])
  })

  it('a name several files answer to holds every one of them, sorted', async () => {
    await put('file-assets', 'b', 'IMG.png')
    await put('file-assets', 'a', 'IMG.png')
    await put('file-assets', 'c', 'IMG.png')
    await put('file-assets', 'Solo.png')
    const map = await buildAssetMap(root, 'file-assets')
    expect(map.files['img.png']).toEqual([
      'file-assets/a/IMG.png',
      'file-assets/b/IMG.png',
      'file-assets/c/IMG.png',
    ])
    expect(map.files['solo.png']).toHaveLength(1)
  })

  it('a name differing only by case or Unicode form is one entry', async () => {
    await put('file-assets', 'Café.png')
    await put('file-assets', 'sub', 'CAFÉ.png')
    const map = await buildAssetMap(root, 'file-assets')
    expect(Object.keys(map.files)).toHaveLength(1)
    expect(map.files['café.png']).toHaveLength(2)
  })
})

describe('resolveAssetName', () => {
  const map = {
    files: {
      'a.png': ['file-assets/a.png'],
      'dup.png': ['file-assets/x/dup.png', 'file-assets/y/dup.png'],
    },
    version: 0,
  }
  it('answers a path, nothing, or a refusal to choose', () => {
    expect(resolveAssetName(map, 'A.png')).toBe('file-assets/a.png')
    expect(resolveAssetName(map, 'missing.png')).toBeNull()
    expect(resolveAssetName(map, 'dup.png')).toBe('ambiguous')
    expect(resolveAssetName(map, '')).toBeNull()
  })
})

describe('patchAssetMap', () => {
  it('an add and an unlink land without re-listing', async () => {
    await put('file-assets', 'a.png')
    const built = await buildAssetMap(root, 'file-assets')
    const added = patchAssetMap(built, 'file-assets/b.png', 'add')
    expect(added.files['b.png']).toEqual(['file-assets/b.png'])
    expect(patchAssetMap(added, 'file-assets/b.png', 'unlink').files['b.png']).toBeUndefined()
  })

  it('a re-save under an unchanged name bumps the version so the image is re-requested', async () => {
    await put('file-assets', 'a.png')
    const built = await buildAssetMap(root, 'file-assets')
    const changed = patchAssetMap(built, 'file-assets/a.png', 'change')
    expect(changed.files).toEqual(built.files)
    expect(changed.version).toBeGreaterThan(built.version)
  })

  it('an unlink of one duplicate promotes the next, and clears the name once alone', async () => {
    await put('file-assets', 'a', 'IMG.png')
    await put('file-assets', 'b', 'IMG.png')
    const built = await buildAssetMap(root, 'file-assets')
    expect(resolveAssetName(built, 'IMG.png')).toBe('ambiguous')
    const gone = patchAssetMap(built, 'file-assets/a/IMG.png', 'unlink')
    expect(gone.files['img.png']).toEqual(['file-assets/b/IMG.png'])
    expect(resolveAssetName(gone, 'IMG.png')).toBe('file-assets/b/IMG.png')
  })

  it('an add of a colliding name joins it, and a delete then refuses to choose', async () => {
    await put('file-assets', 'b', 'IMG.png')
    const built = await buildAssetMap(root, 'file-assets')
    expect(resolveAssetName(built, 'IMG.png')).toBe('file-assets/b/IMG.png')
    const dup = patchAssetMap(built, 'file-assets/a/IMG.png', 'add')
    expect(dup.files['img.png']).toEqual(['file-assets/a/IMG.png', 'file-assets/b/IMG.png'])
    expect(resolveAssetName(dup, 'IMG.png')).toBe('ambiguous')
  })

  it('a thumbnail or a cruft path patches nothing', async () => {
    const built = await buildAssetMap(root, 'file-assets')
    for (const rel of [`file-assets/${THUMBNAILS_SEGMENT}/x.jpg`, 'file-assets/.DS_Store'])
      expect(patchAssetMap(built, rel, 'add')).toBe(built)
  })
})
