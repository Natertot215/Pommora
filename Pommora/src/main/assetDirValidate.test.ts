import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ASSETS_DIR_REL } from '@shared/nexusPaths'
import { validateAssetDir } from './assetDirValidate'
import { readSettingsLeaves } from './readNexus'

let root: string
let outside: string
const dir = async (...segs: string[]): Promise<string> => {
  const abs = join(root, ...segs)
  await mkdir(abs, { recursive: true })
  return abs
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-assetdir-'))
  outside = await mkdtemp(join(tmpdir(), 'pom-outside-'))
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
  await rm(outside, { recursive: true, force: true })
})

describe('validateAssetDir', () => {
  it('accepts an ordinary in-nexus folder, answering its nexus-relative POSIX path', async () => {
    const abs = await dir('file-assets', 'photos')
    expect(await validateAssetDir(root, abs)).toEqual({ ok: true, value: 'file-assets/photos' })
  })

  // A folder the chooser accepts and the reader coerces back to the default is a setting that
  // silently does nothing: the pick succeeds, the key is stored, and every asset resolves against
  // `.nexus/assets` anyway. One rule, asked of one owner.
  it('refuses exactly what the settings reader refuses, and accepts exactly what it keeps', async () => {
    for (const name of ['a\\b', '.nexus', '.trash']) {
      const abs = await dir(name)
      const r = await validateAssetDir(root, abs)
      expect(r.ok, `${name} should be refused`).toBe(false)
      expect(readSettingsLeaves({ asset_directory: name }).assetDirectory).toBe(ASSETS_DIR_REL)
    }
    const abs = await dir('shared-assets')
    const r = await validateAssetDir(root, abs)
    expect(r.ok).toBe(true)
    if (r.ok) expect(readSettingsLeaves({ asset_directory: r.value }).assetDirectory).toBe(r.value)
  })

  it('the negative control: a folder is refused for one .md and accepted without it', async () => {
    const abs = await dir('Media')
    await writeFile(join(abs, 'note.md'), 'text')
    expect((await validateAssetDir(root, abs)).ok).toBe(false)
    await rm(join(abs, 'note.md'))
    expect(await validateAssetDir(root, abs)).toEqual({ ok: true, value: 'Media' })
  })

  it('refuses a hidden page too — the cascade still sweeps one', async () => {
    const abs = await dir('Media')
    await writeFile(join(abs, '_draft.md'), 'text')
    expect((await validateAssetDir(root, abs)).ok).toBe(false)
  })

  it('refuses a folder carrying a sidecar', async () => {
    for (const sidecar of ['_pagecollection.json', '_pageset.json', '_space.json']) {
      const abs = await dir(`C-${sidecar}`)
      await writeFile(join(abs, sidecar), '{}')
      expect((await validateAssetDir(root, abs)).ok).toBe(false)
    }
  })

  it('refuses content NESTED under the folder, not only its own entries', async () => {
    // The asset root is pruned by segment prefix, so a Collection three levels down would vanish
    // from the tree and the index alongside it.
    const abs = await dir('Media')
    await dir('Media', 'a', 'b')
    await writeFile(join(root, 'Media', 'a', 'b', 'note.md'), 'text')
    expect((await validateAssetDir(root, abs)).ok).toBe(false)
    await rm(join(root, 'Media', 'a', 'b', 'note.md'))
    expect(await validateAssetDir(root, abs)).toEqual({ ok: true, value: 'Media' })
  })

  it('refuses a nested container too', async () => {
    const abs = await dir('Media')
    await dir('Media', 'deep')
    await writeFile(join(root, 'Media', 'deep', '_pagecollection.json'), '{}')
    expect((await validateAssetDir(root, abs)).ok).toBe(false)
  })

  it('refuses a file — a listing of one reads as an empty folder', async () => {
    await dir('Media')
    const file = join(root, 'Media', 'cover.png')
    await writeFile(file, 'bytes')
    expect((await validateAssetDir(root, file)).ok).toBe(false)
  })

  it('refuses the nexus root itself', async () => {
    expect((await validateAssetDir(root, root)).ok).toBe(false)
  })

  it('refuses a folder outside the nexus, symlinked or not', async () => {
    expect((await validateAssetDir(root, outside)).ok).toBe(false)
    await symlink(outside, join(root, 'link'))
    expect((await validateAssetDir(root, join(root, 'link'))).ok).toBe(false)
  })

  it('refuses the folders the app owns whole', async () => {
    for (const seg of [ASSETS_DIR_REL, '.nexus', '.trash/keep']) {
      const abs = await dir(...seg.split('/'))
      expect((await validateAssetDir(root, abs)).ok).toBe(false)
    }
  })

  it('a folder that vanished between pick and validate is not found', async () => {
    const r = await validateAssetDir(root, join(root, 'gone'))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe('not-found')
  })
})
