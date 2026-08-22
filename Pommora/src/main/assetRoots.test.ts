import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ASSETS_DIR_REL } from '@shared/nexusPaths'
import { assetFileToDelete, underAssetRoot } from './assetRoots'
import { isAssetPath } from './io/navigationFile'

describe('underAssetRoot', () => {
  const dir = 'file-assets'
  it('accepts a file under either root', () => {
    expect(underAssetRoot('file-assets/a.png', dir)).toBe(true)
    expect(underAssetRoot('file-assets/deep/a.png', dir)).toBe(true)
    // `.nexus/assets` keeps serving thumbnails and anything a migration has not moved.
    expect(underAssetRoot(`${ASSETS_DIR_REL}/nx/thumbnails/a.jpg`, dir)).toBe(true)
  })

  it('refuses the root itself, an escape, an absolute path, and a backslash', () => {
    expect(underAssetRoot('file-assets', dir)).toBe(false)
    expect(underAssetRoot('file-assets/../secrets.txt', dir)).toBe(false)
    expect(underAssetRoot('file-assets/./a.png', dir)).toBe(false)
    expect(underAssetRoot('/file-assets/a.png', dir)).toBe(false)
    expect(underAssetRoot('file-assets\\a.png', dir)).toBe(false)
    expect(underAssetRoot('', dir)).toBe(false)
  })

  it('refuses a sibling whose name merely extends the root', () => {
    expect(underAssetRoot('file-assets-old/a.png', dir)).toBe(false)
    expect(underAssetRoot('Notes/a.png', dir)).toBe(false)
  })

  it('agrees with the banner gate over the same strings', () => {
    // The protocol serves what the gate admits; a disagreement is a hole neither test sees.
    for (const rel of [
      'file-assets/a.png',
      `${ASSETS_DIR_REL}/nx/banner.jpg`,
      'file-assets/../out.png',
      '/abs/a.png',
      'Notes/a.png',
    ])
      expect(isAssetPath(rel, dir)).toBe(underAssetRoot(rel, dir))
  })

  it('the gate additionally admits a wikilink, which names a file rather than a path', () => {
    expect(isAssetPath('[[Banner.png]]', dir)).toBe(true)
    expect(underAssetRoot('[[Banner.png]]', dir)).toBe(false)
    expect(isAssetPath(42, dir)).toBe(false)
  })
})

describe('assetFileToDelete', () => {
  let root: string
  const put = async (...segs: string[]): Promise<void> => {
    await mkdir(join(root, ...segs.slice(0, -1)), { recursive: true })
    await writeFile(join(root, ...segs), 'bytes')
  }
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'pom-assetroots-'))
    await mkdir(join(root, '.nexus'), { recursive: true })
    await writeFile(
      join(root, '.nexus', 'settings.json'),
      JSON.stringify({ asset_directory: 'file-assets' }),
    )
  })
  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('deletes what Pommora minted, by raw path', async () => {
    expect(await assetFileToDelete(root, `${ASSETS_DIR_REL}/nx/b.jpg`)).toBe(
      `${ASSETS_DIR_REL}/nx/b.jpg`,
    )
  })

  it('deletes a wikilink resolving inside the default root, before one is configured', async () => {
    // The wikilink arm is live exactly while the asset root IS `.nexus/assets` — the migration
    // window. Once it points at the user's folder, every name resolves to a file that is theirs.
    await writeFile(join(root, '.nexus', 'settings.json'), JSON.stringify({}))
    await put(...ASSETS_DIR_REL.split('/'), 'Minted.png')
    expect(await assetFileToDelete(root, '[[Minted.png]]')).toBe(`${ASSETS_DIR_REL}/Minted.png`)
  })

  it("never deletes a file in the user's own asset folder", async () => {
    // The folder is shared: a file there may be referenced from an Obsidian note this app cannot
    // see, and replacing a banner is not consent to destroy it. Nothing is trashed on this path.
    await put('file-assets', 'Theirs.png')
    expect(await assetFileToDelete(root, '[[Theirs.png]]')).toBeNull()
    expect(await assetFileToDelete(root, 'file-assets/Theirs.png')).toBeNull()
  })

  it('a wikilink several files answer to deletes nothing', async () => {
    await writeFile(join(root, '.nexus', 'settings.json'), JSON.stringify({}))
    await put(...ASSETS_DIR_REL.split('/'), 'a', 'IMG.png')
    await put(...ASSETS_DIR_REL.split('/'), 'b', 'IMG.png')
    expect(await assetFileToDelete(root, '[[IMG.png]]')).toBeNull()
  })

  it('a wikilink naming nothing, or a path outside every root, deletes nothing', async () => {
    expect(await assetFileToDelete(root, '[[Gone.png]]')).toBeNull()
    expect(await assetFileToDelete(root, 'Notes/a.png')).toBeNull()
    expect(await assetFileToDelete(root, 'file-assets/../out.png')).toBeNull()
  })

  it('a non-string or empty value deletes nothing', async () => {
    for (const v of [null, undefined, 42, '', '   '])
      expect(await assetFileToDelete(root, v)).toBeNull()
  })
})
