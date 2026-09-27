import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { chmod, rm, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { noModeBits, tempRoot } from '../Testing/hostFs'
import type { PropertyDefinition } from '../Properties/properties'
import { renameCascade } from './cascade'
import { sweepGovernedRoots } from '../Properties/governedSweep'
import { createPage } from './page'
import { createProperty } from '../Properties/registryProperty'

import { mergeFrontmatter, splitEnvelope, splitFrontmatter } from '../Files/pageFile'
import { rewritePageSerialized } from '../Files/atomicWrite'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import { seedContentIndex } from '../Index/indexSeed'
import { ok } from '../Contract/result'
import { machine } from '../Platform/machine'
import { tileHostDir } from '../Paths/paths'
import { createMarkdownTile, readMarkdownTile, writeMarkdownTile } from '../Tiles/tilesFile'
import { landedId } from '../Testing/tileLayouts'

vi.mock('../Properties/governedSweep', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../Properties/governedSweep')>()
  return { ...mod, sweepGovernedRoots: vi.fn(mod.sweepGovernedRoots) }
})

const sweepSpy = vi.mocked(sweepGovernedRoots)
const sweptFiles = (): string[] => sweepSpy.mock.calls[0]?.[1] ?? []

let root: string
let dir: string
beforeEach(async () => {
  root = tempRoot('pom-cascade-')
  dir = join(root, 'Notes')
  await mkdir(dir, { recursive: true })
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

const bodyOf = async (p: string) => splitEnvelope(await readFile(p, 'utf8')).body
const fmBytesOf = async (p: string) => splitEnvelope(await readFile(p, 'utf8')).frontmatter
const fmOf = async (p: string) => splitFrontmatter(await readFile(p, 'utf8'))
const rel = (p: string): string => p.slice(root.length + 1)
const setValue = (path: string, key: string, value: string) =>
  rewritePageSerialized(path, (content) =>
    mergeFrontmatter(content, { [key]: value }, [key], splitEnvelope(content).body),
  )

describe('renameCascade', () => {
  it('rewrites inbound links nexus-wide (incl. nested), leaves frontmatter untouched', async () => {
    const a = await createPage(dir, 'A', { body: 'go to [[Target]] now' })
    const b = await createPage(dir, 'B', { body: '[[target]] and [[Other]]' })
    const c = await createPage(dir, 'C', { body: 'no links' })
    const sub = join(dir, 'Collection')
    await mkdir(sub, { recursive: true })
    const nested = await createPage(sub, 'Nested', { body: 'deep [[Target]]' })
    if (!a.ok || !b.ok || !c.ok || !nested.ok) throw new Error('setup failed')

    const before = await fmBytesOf(a.value.path)
    const r = await renameCascade(root, 'Target', { title: 'New Target' })
    expect(r.pages.sort()).toEqual([a.value.path, b.value.path, nested.value.path].map(rel).sort())

    expect(await bodyOf(a.value.path)).toBe('go to [[New Target]] now')
    expect(await bodyOf(b.value.path)).toBe('[[New Target]] and [[Other]]')
    expect(await bodyOf(nested.value.path)).toBe('deep [[New Target]]')
    expect(await bodyOf(c.value.path)).toBe('no links')

    expect(await fmBytesOf(a.value.path)).toBe(before)
  })

  it('touches nothing when no page links the old title', async () => {
    await createPage(dir, 'Solo', { body: 'nothing here' })
    const r = await renameCascade(root, 'Ghost', { title: 'Phantom' })
    expect(r.pages).toEqual([])
  })

  it.skipIf(noModeBits)(
    'a linker it can’t write is skipped, the rest still move, and the warning counts it',
    async () => {
      const cites = await createPage(dir, 'Cites', { body: 'see [[Target]]' })
      if (!cites.ok) throw new Error('setup failed')
      const locked = join(dir, 'Locked')
      await mkdir(locked, { recursive: true })
      await writeFile(join(locked, '_pageset.json'), JSON.stringify({ id: 'lk' }))
      await writeFile(join(locked, 'X.md'), 'see [[Target]]\n')
      await chmod(locked, 0o555)
      try {
        const r = await renameCascade(root, 'Target', { title: 'New Target' })
        expect(r.pages).toEqual(['Notes/Cites.md'])
        expect(r.warning).toBe('Couldn’t update links to “Target” in 1 file.')
      } finally {
        await chmod(locked, 0o755)
      }
      expect(await bodyOf(cites.value.path)).toBe('see [[New Target]]')
      expect(await readFile(join(locked, 'X.md'), 'utf8')).toBe('see [[Target]]\n')
    },
  )
})

describe('the cascade queries the index', () => {
  const hidden = (): string => join(root, 'Hidden', 'Secret.md')

  /** 40 pages, 3 of them mentioning — one in an un-adopted folder — plus an EXCLUDED note that also mentions and must stay unread and byte-untouched. */
  const seedFixture = async (): Promise<void> => {
    await mkdir(join(root, '.nexus'), { recursive: true })
    await writeFile(
      join(root, '.nexus', 'settings.json'),
      JSON.stringify({ excluded_folders: ['Hidden'] }),
    )
    for (let i = 0; i < 37; i++) {
      const c = await createPage(dir, `Filler ${i}`, { body: 'no links here' })
      if (!c.ok) throw new Error('setup failed')
    }
    const a = await createPage(dir, 'Cites A', { body: 'see [[Target]]' })
    const b = await createPage(dir, 'Cites B', { body: '[[target]] again' })
    if (!a.ok || !b.ok) throw new Error('setup failed')
    await mkdir(join(root, 'Loose'), { recursive: true })
    await writeFile(join(root, 'Loose', 'Note.md'), 'un-adopted [[Target]]\n')
    await mkdir(join(root, 'Hidden'), { recursive: true })
    await writeFile(hidden(), 'excluded [[Target]]\n')
  }

  afterEach(() => {
    installStores(NO_STORES)
  })

  it('opens exactly the files whose rows name the title — the un-adopted note included', async () => {
    await seedFixture()
    installStores(memoryStores().stores)
    await seedContentIndex(root)
    sweepSpy.mockClear()
    const r = await renameCascade(root, 'Target', { title: 'New Target' })
    expect(r.pages).toHaveLength(3)
    expect(sweptFiles()).toHaveLength(3)
    expect(await readFile(join(root, 'Loose', 'Note.md'), 'utf8')).toBe(
      'un-adopted [[New Target]]\n',
    )
    expect(await readFile(hidden(), 'utf8')).toBe('excluded [[Target]]\n')
  })

  it('a null index falls back to the corpus scan — excluded folders unreachable either way', async () => {
    await seedFixture()
    sweepSpy.mockClear()
    const r = await renameCascade(root, 'Target', { title: 'New Target' })
    expect(r.pages).toHaveLength(3)
    // The fallback reads the whole corpus — every filler too — but never the excluded note.
    expect(sweptFiles()).toHaveLength(40)
    expect(sweptFiles().some((file) => file.includes('Hidden'))).toBe(false)
    expect(await readFile(hidden(), 'utf8')).toBe('excluded [[Target]]\n')
  })
})

describe('renameCascade over frontmatter', () => {
  const SOURCE = 'Source'
  const SITE = 'Site'
  beforeEach(async () => {
    for (const name of [SOURCE, SITE]) {
      await createProperty(root, { id: '', name, type: 'link' } as PropertyDefinition)
    }
  })
  it('moves a Link property naming the page, and the body’s links with it', async () => {
    const a = await createPage(dir, 'Cites', { body: 'see [[Target]]' })
    if (!a.ok) throw new Error('setup failed')
    await setValue(a.value.path, SOURCE, '[[Target|the brief]]')

    await renameCascade(root, 'Target', { title: 'New Target' })
    expect(await bodyOf(a.value.path)).toContain('[[New Target]]')
    expect((await fmOf(a.value.path))[SOURCE]).toBe('[[New Target|the brief]]')
  })

  it('reaches a page whose ONLY reference is its frontmatter, through the index', async () => {
    const a = await createPage(dir, 'Only Frontmatter', { body: 'no links here' })
    if (!a.ok) throw new Error('setup failed')
    await setValue(a.value.path, SOURCE, '[[Target]]')
    installStores(memoryStores().stores)
    await seedContentIndex(root)

    const r = await renameCascade(root, 'Target', { title: 'New Target' })
    installStores(NO_STORES)
    expect(r.pages).toEqual([rel(a.value.path)])
    expect((await fmOf(a.value.path))[SOURCE]).toBe('[[New Target]]')
  })

  it('leaves an address alone when its last segment happens to match', async () => {
    const a = await createPage(dir, 'Address', { body: 'no links here' })
    if (!a.ok) throw new Error('setup failed')
    await setValue(a.value.path, SITE, 'https://example.com/Target')

    await renameCascade(root, 'Target', { title: 'New Target' })
    expect((await fmOf(a.value.path))[SITE]).toBe('https://example.com/Target')
  })
})

describe('renameCascade for a heading', () => {
  const seedAB = async (): Promise<{ a: string; b: string }> => {
    const a = await createPage(dir, 'A', { body: '## Setup\n[[#Setup]]' })
    const b = await createPage(dir, 'B', { body: '[[A#Setup]]' })
    if (!a.ok || !b.ok) throw new Error('setup failed')
    return { a: a.value.path, b: b.value.path }
  }

  it('rewrites the other page and leaves the one the caller already rewrote (skipRel)', async () => {
    const { a, b } = await seedAB()
    installStores(memoryStores().stores)
    await seedContentIndex(root)
    const r = await renameCascade(root, 'A', { heading: 'Setup', to: 'Intro' }, rel(a))
    installStores(NO_STORES)
    expect(r.pages).toEqual([rel(b)])
    expect(await bodyOf(b)).toBe('[[A#Intro]]')
    expect(await bodyOf(a)).toBe('## Setup\n[[#Setup]]')
  })

  it('rewrites both pages when no rel is skipped', async () => {
    const { a, b } = await seedAB()
    installStores(memoryStores().stores)
    await seedContentIndex(root)
    const r = await renameCascade(root, 'A', { heading: 'Setup', to: 'Intro' })
    installStores(NO_STORES)
    expect(r.pages.sort()).toEqual([rel(a), rel(b)].sort())
    // The cascade rewrites LINKS naming the heading, never the heading line itself — the editor or the outside writer already changed it.
    expect(await bodyOf(a)).toBe('## Setup\n[[#Intro]]')
    expect(await bodyOf(b)).toBe('[[A#Intro]]')
  })

  it('touches nothing when the index is not seeded', async () => {
    const { a, b } = await seedAB()
    const r = await renameCascade(root, 'A', { heading: 'Setup', to: 'Intro' })
    expect(r.pages).toEqual([])
    expect(await bodyOf(a)).toBe('## Setup\n[[#Setup]]')
    expect(await bodyOf(b)).toBe('[[A#Setup]]')
  })

  it('rewrites a markdown tile’s heading link even when no page links the heading', async () => {
    const a = await createPage(dir, 'A', { body: '## Setup' })
    if (!a.ok) throw new Error('setup failed')
    installStores(memoryStores().stores)
    await seedContentIndex(root)
    const tile = await landedId(createMarkdownTile(tileHostDir(root)))
    await writeMarkdownTile(
      root,
      tileHostDir(root),
      tile,
      'see [[A#Setup]]',
      machine().sha256Hex(''),
    )
    const r = await renameCascade(root, 'A', { heading: 'Setup', to: 'Intro' })
    installStores(NO_STORES)
    expect(r.hosts).toEqual([{ kind: 'homepage' }])
    expect(await readMarkdownTile(tileHostDir(root), tile)).toEqual(ok('see [[A#Intro]]'))
  })

  it('moves a Link property aimed at the renamed heading, found through the index', async () => {
    await createProperty(root, { id: '', name: 'Source', type: 'link' } as PropertyDefinition)
    const a = await createPage(dir, 'A', { body: '## Setup' })
    const c = await createPage(dir, 'C', { body: 'no links' })
    if (!a.ok || !c.ok) throw new Error('setup failed')
    await setValue(c.value.path, 'Source', '[[A#Setup|the brief]]')
    installStores(memoryStores().stores)
    await seedContentIndex(root)
    const r = await renameCascade(root, 'A', { heading: 'Setup', to: 'Intro' }, 'Notes/A.md')
    installStores(NO_STORES)
    expect((await fmOf(c.value.path)).Source).toBe('[[A#Intro|the brief]]')
    expect(r.pages).toEqual(['Notes/C.md'])
  })

  it('reaches a page whose only reference is a heading embed', async () => {
    const a = await createPage(dir, 'A', { body: '## Setup' })
    const b = await createPage(dir, 'B', { body: '![[A#Setup]]' })
    if (!a.ok || !b.ok) throw new Error('setup failed')
    installStores(memoryStores().stores)
    await seedContentIndex(root)
    await renameCascade(root, 'A', { heading: 'Setup', to: 'Intro' }, 'Notes/A.md')
    installStores(NO_STORES)
    expect(await bodyOf(b.value.path)).toBe('![[A#Intro]]')
  })
})
