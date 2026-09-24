import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { tempRoot } from '../Testing/hostFs'
import { ASSETS_DIR_REL } from '../Paths/nexusPaths'
import { assetFilePath, assetSubfolder, underAssetRoot, validPropertyDir } from './assetRoots'
import { isAssetPath } from '../Navigation/navigationFile'

describe('underAssetRoot', () => {
  const dir = 'file-assets'
  it('accepts a file under either root', () => {
    expect(underAssetRoot('file-assets/a.png', dir)).toBe(true)
    expect(underAssetRoot('file-assets/deep/a.png', dir)).toBe(true)
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

describe('assetFilePath', () => {
  let root: string
  const put = async (...segs: string[]): Promise<void> => {
    await mkdir(join(root, ...segs.slice(0, -1)), { recursive: true })
    await writeFile(join(root, ...segs), 'bytes')
  }
  beforeEach(async () => {
    root = tempRoot('pom-assetroots-')
    await mkdir(join(root, '.nexus'), { recursive: true })
    await writeFile(
      join(root, '.nexus', 'settings.json'),
      JSON.stringify({ asset_directory: 'file-assets' }),
    )
  })
  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('resolves a raw path under an asset root', async () => {
    expect(await assetFilePath(root, `${ASSETS_DIR_REL}/nx/b.jpg`)).toBe(
      `${ASSETS_DIR_REL}/nx/b.jpg`,
    )
  })

  it('resolves a wikilink inside the default root, before one is configured', async () => {
    await writeFile(join(root, '.nexus', 'settings.json'), JSON.stringify({}))
    await put(...ASSETS_DIR_REL.split('/'), 'Minted.png')
    expect(await assetFilePath(root, '[[Minted.png]]')).toBe(`${ASSETS_DIR_REL}/Minted.png`)
  })

  it("resolves a file in the user's own asset folder", async () => {
    await put('file-assets', 'Theirs.png')
    expect(await assetFilePath(root, '[[Theirs.png]]')).toBe('file-assets/Theirs.png')
    expect(await assetFilePath(root, 'file-assets/Theirs.png')).toBe('file-assets/Theirs.png')
  })

  it('a wikilink several files answer to resolves to nothing', async () => {
    await writeFile(join(root, '.nexus', 'settings.json'), JSON.stringify({}))
    await put(...ASSETS_DIR_REL.split('/'), 'a', 'IMG.png')
    await put(...ASSETS_DIR_REL.split('/'), 'b', 'IMG.png')
    expect(await assetFilePath(root, '[[IMG.png]]')).toBeNull()
  })

  it('a wikilink naming nothing, or a path outside every root, resolves to nothing', async () => {
    expect(await assetFilePath(root, '[[Gone.png]]')).toBeNull()
    expect(await assetFilePath(root, 'Notes/a.png')).toBeNull()
    expect(await assetFilePath(root, 'file-assets/../out.png')).toBeNull()
  })

  it('a non-string or empty value resolves to nothing', async () => {
    for (const v of [null, undefined, 42, '', '   '])
      expect(await assetFilePath(root, v)).toBeNull()
  })
})

describe('validPropertyDir — a file property names where its files land', () => {
  const DIR = 'file-assets'

  it('accepts a subfolder under the asset root, and the root itself', () => {
    expect(validPropertyDir('Attachments', DIR)).toBe(true)
    expect(validPropertyDir('Attachments/Specs', DIR)).toBe(true)
    expect(validPropertyDir('', DIR)).toBe(true)
  })

  it('refuses a climb, an absolute path, and a Windows separator', () => {
    for (const bad of ['..', '../..', 'a/../..', '/etc', 'a\\b'])
      expect(validPropertyDir(bad, DIR)).toBe(false)
  })

  it('refuses a folder the map could never index — containment alone would admit it', () => {
    expect(underAssetRoot(`${DIR}/.private`, DIR)).toBe(true)
    expect(validPropertyDir('.private', DIR)).toBe(false)
    expect(validPropertyDir('Specs/.private', DIR)).toBe(false)
    expect(validPropertyDir('node_modules', DIR)).toBe(false)
  })

  it("a dot in the ROOT's own name is the root's business, not a subfolder's", () => {
    expect(validPropertyDir('Specs', '.attachments')).toBe(true)
    expect(validPropertyDir('.hidden', '.attachments')).toBe(false)
  })
})

describe('assetSubfolder — the part below the asset root', () => {
  it('answers the position under the root, and empty for the root itself', () => {
    expect(assetSubfolder('file-assets/Attachments', 'file-assets')).toBe('Attachments')
    expect(assetSubfolder('file-assets/a/b', 'file-assets')).toBe('a/b')
    expect(assetSubfolder('file-assets', 'file-assets')).toBe('')
  })

  it('refuses a path outside the root rather than slicing it into a plausible one', () => {
    // Without the prefix check, `Notes/Daily` under a one-segment root would slice to `Daily` and read back as a subfolder of the asset root the user never picked.
    expect(assetSubfolder('Notes/Daily', 'file-assets')).toBeNull()
    expect(assetSubfolder('', 'file-assets')).toBeNull()
  })

  it('matches the root case-insensitively, like every other root test', () => {
    expect(assetSubfolder('File-Assets/Specs', 'file-assets')).toBe('Specs')
  })
})
