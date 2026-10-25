import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { STASHED_AT } from '../Testing/definitions'
import { chmod, rm, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { noModeBits, seedNexus, tempRoot } from '../Testing/hostFs'
import { deleteCascade, renameCascade } from './cascade'
import { sweepGovernedRoots } from './governedSweep'
import { createTestPage } from '../Testing/createTestPage'
import { dropLiveTree, heldTreeOf, refreshTree } from './liveTree'
import { closeSession, openSession } from './session'
import { createProperty } from '../Properties/registryProperty'
import { mergeFrontmatter, splitEnvelope, splitFrontmatter } from '../Files/pageFile'
import { rewritePageSerialized } from '../Files/atomicWrite'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import { seedContentIndex } from '../Index/indexSeed'
import { queryMentions } from '../Index/contentIndex'
import { ok } from '../Contract/result'
import { machine } from '../Platform/machine'
import { contextsDir, contextsRegistryFile, tileFilePath, homepageDir } from '../Paths/paths'
import { createTile, readMarkdownTile, writeMarkdownTile } from '../Tiles/tilesFile'
import { landedId } from '../Testing/tileLayouts'
import { titled } from '../Testing/fixtures'

vi.mock('./governedSweep', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./governedSweep')>()
  return { ...mod, sweepGovernedRoots: vi.fn(mod.sweepGovernedRoots) }
})

vi.mock('../Files/atomicWrite', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../Files/atomicWrite')>()
  return { ...mod, rewritePageSerialized: vi.fn(mod.rewritePageSerialized) }
})

const sweepSpy = vi.mocked(sweepGovernedRoots)
const rewriteSpy = vi.mocked(rewritePageSerialized)
const sweptFiles = (): string[] => sweepSpy.mock.calls[0]?.[0] ?? []

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
    const a = await createTestPage(dir, 'A', { body: 'go to [[Target]] now' })
    const b = await createTestPage(dir, 'B', { body: '[[target]] and [[Other]]' })
    const c = await createTestPage(dir, 'C', { body: 'no links' })
    const sub = join(dir, 'Collection')
    await mkdir(sub, { recursive: true })
    const nested = await createTestPage(sub, 'Nested', { body: 'deep [[Target]]' })
    if (!a.ok || !b.ok || !c.ok || !nested.ok) throw new Error('setup failed')

    const before = await fmBytesOf(a.value.path)
    const r = await renameCascade(root, titled('Target', 'New Target'))
    expect(r.pages.sort()).toEqual([a.value.path, b.value.path, nested.value.path].map(rel).sort())

    expect(await bodyOf(a.value.path)).toBe('go to [[New Target]] now')
    expect(await bodyOf(b.value.path)).toBe('[[New Target]] and [[Other]]')
    expect(await bodyOf(nested.value.path)).toBe('deep [[New Target]]')
    expect(await bodyOf(c.value.path)).toBe('no links')

    expect(await fmBytesOf(a.value.path)).toBe(before)
  })

  it('touches nothing when no page links the old title', async () => {
    await createTestPage(dir, 'Solo', { body: 'nothing here' })
    const r = await renameCascade(root, titled('Ghost', 'Phantom'))
    expect(r.pages).toEqual([])
  })

  it('rewrites a markdown tile linking a mapped key', async () => {
    const tile = await landedId(createTile(root, homepageDir(root), { kind: 'append' }))
    await writeMarkdownTile(homepageDir(root), tile, 'see [[Target]]', machine().sha256Hex(''))
    const r = await renameCascade(root, titled('Target', 'Omega'))
    expect(r.hosts).toEqual([{ host: { kind: 'homepage' }, ids: [tile] }])
    expect(await readMarkdownTile(homepageDir(root), tile)).toEqual(ok('see [[Omega]]'))
  })

  it('locks and rewrites no tile file when no tile links a mapped key', async () => {
    const tile = await landedId(createTile(root, homepageDir(root), { kind: 'append' }))
    await writeMarkdownTile(homepageDir(root), tile, 'see [[Other]]', machine().sha256Hex(''))
    rewriteSpy.mockClear()
    const r = await renameCascade(root, titled('Target', 'Omega'))
    expect(r.hosts).toEqual([])
    expect(rewriteSpy.mock.calls.map(([file]) => file)).not.toContain(
      tileFilePath(homepageDir(root), tile),
    )
  })

  it.skipIf(noModeBits)(
    'a linker it can’t write is skipped, the rest still move, and the warning counts it',
    async () => {
      const cites = await createTestPage(dir, 'Cites', { body: 'see [[Target]]' })
      if (!cites.ok) throw new Error('setup failed')
      const locked = join(dir, 'Locked')
      await mkdir(locked, { recursive: true })
      await writeFile(join(locked, '_pageset.json'), JSON.stringify({ id: 'lk' }))
      await writeFile(join(locked, 'X.md'), 'see [[Target]]\n')
      await chmod(locked, 0o555)
      try {
        const r = await renameCascade(root, titled('Target', 'New Target'))
        expect(r.pages).toEqual(['Notes/Cites.md'])
        expect(r.warning).toBe('Couldn’t update links to “Target” in 1 Item.')
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
      const c = await createTestPage(dir, `Filler ${i}`, { body: 'no links here' })
      if (!c.ok) throw new Error('setup failed')
    }
    const a = await createTestPage(dir, 'Cites A', { body: 'see [[Target]]' })
    const b = await createTestPage(dir, 'Cites B', { body: '[[target]] again' })
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
    const r = await renameCascade(root, titled('Target', 'New Target'))
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
    const r = await renameCascade(root, titled('Target', 'New Target'))
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
    for (const name of [SOURCE, SITE]) await createProperty(root, { label: name, type: 'link' })
    await createProperty(root, { label: 'Notes', type: 'text' })
    await createProperty(root, { label: 'Files', type: 'file' })
  })
  it('moves a Link property naming the page, and the body’s links with it', async () => {
    const a = await createTestPage(dir, 'Cites', { body: 'see [[Target]]' })
    if (!a.ok) throw new Error('setup failed')
    await setValue(a.value.path, SOURCE, '[[Target|the brief]]')

    await renameCascade(root, titled('Target', 'New Target'))
    expect(await bodyOf(a.value.path)).toContain('[[New Target]]')
    expect((await fmOf(a.value.path))[SOURCE]).toBe('[[New Target|the brief]]')
  })

  it('reaches a page whose ONLY reference is its frontmatter, through the index', async () => {
    const a = await createTestPage(dir, 'Only Frontmatter', { body: 'no links here' })
    if (!a.ok) throw new Error('setup failed')
    await setValue(a.value.path, SOURCE, '[[Target]]')
    installStores(memoryStores().stores)
    await seedContentIndex(root)

    const r = await renameCascade(root, titled('Target', 'New Target'))
    installStores(NO_STORES)
    expect(r.pages).toEqual([rel(a.value.path)])
    expect((await fmOf(a.value.path))[SOURCE]).toBe('[[New Target]]')
  })

  it('moves a connection held under a key no property claims', async () => {
    const a = await createTestPage(dir, 'Lowercase', { body: 'no links here' })
    if (!a.ok) throw new Error('setup failed')
    await setValue(a.value.path, 'source', '[[Target]]')

    await renameCascade(root, titled('Target', 'New Target'))
    const fm = await fmOf(a.value.path)
    expect(fm.source).toBe('[[New Target]]')
    expect(fm).not.toHaveProperty(SOURCE)
  })

  it('moves an unquoted `[[Page]]` Link value, found through the index', async () => {
    const a = await createTestPage(dir, 'Unquoted', { body: 'no links here' })
    if (!a.ok) throw new Error('setup failed')
    await setValue(a.value.path, SOURCE, 'held')
    const bytes = await readFile(a.value.path, 'utf8')
    await writeFile(a.value.path, bytes.replace(`${SOURCE}: held`, `${SOURCE}: [[Target]]`))
    installStores(memoryStores().stores)
    await seedContentIndex(root)
    const mentions = queryMentions(['target'])
    await renameCascade(root, titled('Target', 'New'))
    installStores(NO_STORES)
    expect(mentions).toEqual([rel(a.value.path)])
    expect((await fmOf(a.value.path))[SOURCE]).toBe('[[New]]')
  })

  it('leaves an address alone when its last segment happens to match', async () => {
    const a = await createTestPage(dir, 'Address', { body: 'no links here' })
    if (!a.ok) throw new Error('setup failed')
    await setValue(a.value.path, SITE, 'https://example.com/Target')

    await renameCascade(root, titled('Target', 'New Target'))
    expect((await fmOf(a.value.path))[SITE]).toBe('https://example.com/Target')
  })

  it('rewrites a link inside a Text value as prose, alias kept, and drops a whole-value alias the new title repeats', async () => {
    const a = await createTestPage(dir, 'Prose', { body: 'no links here' })
    if (!a.ok) throw new Error('setup failed')
    await setValue(a.value.path, 'Notes', 'see [[Target|the brief]] here')
    const b = await createTestPage(dir, 'Whole', { body: 'no links here' })
    if (!b.ok) throw new Error('setup failed')
    await setValue(b.value.path, 'Notes', '[[Target|New Target]]')
    await renameCascade(root, titled('Target', 'New Target'))
    expect((await fmOf(a.value.path)).Notes).toBe('see [[New Target|the brief]] here')
    expect((await fmOf(b.value.path)).Notes).toBe('[[New Target]]')
  })

  it('leaves a File, a Select, and a Number value that read as connections', async () => {
    await createProperty(root, { label: 'Stage', type: 'select' })
    await createProperty(root, { label: 'Rank', type: 'number' })
    const a = await createTestPage(dir, 'Other', { body: 'no links here' })
    if (!a.ok) throw new Error('setup failed')
    await setValue(a.value.path, 'Files', '[[Target]]')
    await setValue(a.value.path, 'Stage', '[[Target]]')
    await setValue(a.value.path, 'Rank', '[[Target]]')
    await renameCascade(root, titled('Target', 'New Target'))
    const fm = await fmOf(a.value.path)
    expect(fm.Files).toBe('[[Target]]')
    expect(fm.Stage).toBe('[[Target]]')
    expect(fm.Rank).toBe('[[Target]]')
  })

  it('moves a whole-value link under a key the registry hasn’t typed', async () => {
    const a = await createTestPage(dir, 'Untyped', { body: 'no links here' })
    if (!a.ok) throw new Error('setup failed')
    await setValue(a.value.path, 'Related', '[[Target]]')
    await renameCascade(root, titled('Target', 'New Target'))
    expect((await fmOf(a.value.path)).Related).toBe('[[New Target]]')
  })
})

describe('renameCascade for a heading', () => {
  // The heading arm keys by the page's names in the tree, so its pages sit in Collections the tree holds.
  beforeEach(async () => {
    await writeFile(join(dir, '_pagecollection.json'), JSON.stringify({ id: 'col-notes' }))
  })

  const seedAB = async (): Promise<{ a: string; b: string }> => {
    const a = await createTestPage(dir, 'A', { body: '## Setup\n[[#Setup]]' })
    const b = await createTestPage(dir, 'B', { body: '[[A#Setup]]' })
    if (!a.ok || !b.ok) throw new Error('setup failed')
    return { a: a.value.path, b: b.value.path }
  }

  it('rewrites the other page and leaves the one the caller already rewrote (settled)', async () => {
    const { a, b } = await seedAB()
    installStores(memoryStores().stores)
    await seedContentIndex(root)
    const r = await renameCascade(root, { path: 'Notes/A.md', heading: 'Setup', to: 'Intro' }, true)
    installStores(NO_STORES)
    expect(r.pages).toEqual([rel(b)])
    expect(await bodyOf(b)).toBe('[[A#Intro]]')
    expect(await bodyOf(a)).toBe('## Setup\n[[#Setup]]')
  })

  it('rewrites both pages when no rel is skipped', async () => {
    const { a, b } = await seedAB()
    installStores(memoryStores().stores)
    await seedContentIndex(root)
    const r = await renameCascade(root, { path: 'Notes/A.md', heading: 'Setup', to: 'Intro' })
    installStores(NO_STORES)
    expect(r.pages.sort()).toEqual([rel(a), rel(b)].sort())
    // The cascade rewrites LINKS naming the heading, never the heading line itself — the editor or the outside writer already changed it.
    expect(await bodyOf(a)).toBe('## Setup\n[[#Intro]]')
    expect(await bodyOf(b)).toBe('[[A#Intro]]')
  })

  it('sweeps only the page itself when the index is not seeded', async () => {
    const { a, b } = await seedAB()
    const r = await renameCascade(root, { path: 'Notes/A.md', heading: 'Setup', to: 'Intro' })
    expect(r.pages).toEqual([rel(a)])
    expect(await bodyOf(a)).toBe('## Setup\n[[#Intro]]')
    expect(await bodyOf(b)).toBe('[[A#Setup]]')
  })

  it('an outside heading rename on a page nothing else links still rewrites that page’s own bare link', async () => {
    const a = await createTestPage(dir, 'A', { body: '## Intro\n[[#Setup]]' })
    if (!a.ok) throw new Error('setup failed')
    installStores(memoryStores().stores)
    await seedContentIndex(root)
    const r = await renameCascade(root, { path: rel(a.value.path), heading: 'Setup', to: 'Intro' })
    installStores(NO_STORES)
    expect(r.pages).toEqual([rel(a.value.path)])
    expect(await bodyOf(a.value.path)).toBe('## Intro\n[[#Intro]]')
  })

  it('rewrites a markdown tile’s heading link even when no page links the heading', async () => {
    const a = await createTestPage(dir, 'A', { body: '## Setup' })
    if (!a.ok) throw new Error('setup failed')
    installStores(memoryStores().stores)
    await seedContentIndex(root)
    const tile = await landedId(createTile(root, homepageDir(root), { kind: 'append' }))
    await writeMarkdownTile(homepageDir(root), tile, 'see [[A#Setup]]', machine().sha256Hex(''))
    const r = await renameCascade(root, { path: 'Notes/A.md', heading: 'Setup', to: 'Intro' })
    installStores(NO_STORES)
    expect(r.hosts).toEqual([{ host: { kind: 'homepage' }, ids: [tile] }])
    expect(await readMarkdownTile(homepageDir(root), tile)).toEqual(ok('see [[A#Intro]]'))
  })

  it('locks and rewrites no tile file when no tile links the heading', async () => {
    const a = await createTestPage(dir, 'A', { body: '## Setup\n## Other' })
    if (!a.ok) throw new Error('setup failed')
    installStores(memoryStores().stores)
    await seedContentIndex(root)
    const tile = await landedId(createTile(root, homepageDir(root), { kind: 'append' }))
    await writeMarkdownTile(homepageDir(root), tile, 'see [[A#Other]]', machine().sha256Hex(''))
    rewriteSpy.mockClear()
    const r = await renameCascade(root, { path: 'Notes/A.md', heading: 'Setup', to: 'Intro' })
    installStores(NO_STORES)
    expect(r.hosts).toEqual([])
    expect(rewriteSpy.mock.calls.map(([file]) => file)).not.toContain(
      tileFilePath(homepageDir(root), tile),
    )
    expect(await readMarkdownTile(homepageDir(root), tile)).toEqual(ok('see [[A#Other]]'))
  })

  it('moves a Link property aimed at the renamed heading, found through the index', async () => {
    await createProperty(root, { label: 'Source', type: 'link' })
    const a = await createTestPage(dir, 'A', { body: '## Setup' })
    const c = await createTestPage(dir, 'C', { body: 'no links' })
    if (!a.ok || !c.ok) throw new Error('setup failed')
    await setValue(c.value.path, 'Source', '[[A#Setup|the brief]]')
    installStores(memoryStores().stores)
    await seedContentIndex(root)
    const r = await renameCascade(root, { path: 'Notes/A.md', heading: 'Setup', to: 'Intro' }, true)
    installStores(NO_STORES)
    expect((await fmOf(c.value.path)).Source).toBe('[[A#Intro|the brief]]')
    expect(r.pages).toEqual(['Notes/C.md'])
  })

  it('reaches a page whose only reference is a heading embed', async () => {
    const a = await createTestPage(dir, 'A', { body: '## Setup' })
    const b = await createTestPage(dir, 'B', { body: '![[A#Setup]]' })
    if (!a.ok || !b.ok) throw new Error('setup failed')
    installStores(memoryStores().stores)
    await seedContentIndex(root)
    await renameCascade(root, { path: 'Notes/A.md', heading: 'Setup', to: 'Intro' }, true)
    installStores(NO_STORES)
    expect(await bodyOf(b.value.path)).toBe('![[A#Intro]]')
  })

  it('rewrites a `[[#Old]]` and a `§Old` run inside the page’s own Text value, with settled leaving its body alone', async () => {
    await mkdir(join(root, '.nexus'), { recursive: true })
    await writeFile(
      join(root, '.nexus', 'settings.json'),
      JSON.stringify({ personalization: { inPageHeadingResolution: 'automatic' } }),
    )
    await createProperty(root, { label: 'Notes', type: 'text' })
    const a = await createTestPage(dir, 'A', { body: '## Setup\n[[#Setup]]' })
    if (!a.ok) throw new Error('setup failed')
    await setValue(a.value.path, 'Notes', 'see [[#Setup]] and §Setup')
    installStores(memoryStores().stores)
    await seedContentIndex(root)
    const r = await renameCascade(root, { path: 'Notes/A.md', heading: 'Setup', to: 'Intro' }, true)
    installStores(NO_STORES)
    expect(await bodyOf(a.value.path)).toBe('## Setup\n[[#Setup]]')
    expect((await fmOf(a.value.path)).Notes).toBe('see [[#Intro]] and §Intro')
    expect(r.pages).toEqual([rel(a.value.path)])
  })

  it('reaches the page’s own Text value after its save re-indexed the new heading, where a `§Old` run is its only holder', async () => {
    await mkdir(join(root, '.nexus'), { recursive: true })
    await writeFile(
      join(root, '.nexus', 'settings.json'),
      JSON.stringify({ personalization: { inPageHeadingResolution: 'automatic' } }),
    )
    await createProperty(root, { label: 'Notes', type: 'text' })
    const a = await createTestPage(dir, 'A', { body: '## Intro' })
    if (!a.ok) throw new Error('setup failed')
    await setValue(a.value.path, 'Notes', 'see §Setup')
    installStores(memoryStores().stores)
    await seedContentIndex(root)
    await renameCascade(root, { path: 'Notes/A.md', heading: 'Setup', to: 'Intro' }, true)
    installStores(NO_STORES)
    expect((await fmOf(a.value.path)).Notes).toBe('see §Intro')
  })

  it('renaming a heading on one of two same-titled pages leaves the twin’s own fragment alone', async () => {
    for (const twin of ['A', 'B']) {
      await mkdir(join(root, twin))
      await writeFile(join(root, twin, '_pagecollection.json'), JSON.stringify({ id: twin }))
    }
    const a = await createTestPage(join(root, 'A'), 'Notes', { body: '## Setup\n[[#Setup]]' })
    const b = await createTestPage(join(root, 'B'), 'Notes', { body: '## Setup\n[[#Setup]]' })
    if (!a.ok || !b.ok) throw new Error('setup failed')
    installStores(memoryStores().stores)
    await seedContentIndex(root)
    await renameCascade(root, { path: 'A/Notes.md', heading: 'Setup', to: 'Intro' })
    installStores(NO_STORES)
    expect(await bodyOf(a.value.path)).toBe('## Setup\n[[#Intro]]')
    expect(await bodyOf(b.value.path)).toBe('## Setup\n[[#Setup]]')
  })

  it('renaming a heading on one of two twins rewrites only the links that resolve to it', async () => {
    for (const twin of ['A', 'B']) {
      await mkdir(join(root, twin))
      await writeFile(join(root, twin, '_pagecollection.json'), JSON.stringify({ id: twin }))
    }
    const a = await createTestPage(join(root, 'A'), 'Notes', { body: '## Setup\n[[#Setup]]' })
    await createTestPage(join(root, 'B'), 'Notes', { body: '## Setup' })
    const c = await createTestPage(dir, 'C', {
      body: '[[A/Notes#Setup]] [[Notes#Setup]] [[B/Notes#Setup]]',
    })
    if (!a.ok || !c.ok) throw new Error('setup failed')
    installStores(memoryStores().stores)
    await seedContentIndex(root)
    await renameCascade(root, { path: 'A/Notes.md', heading: 'Setup', to: 'Intro' })
    installStores(NO_STORES)
    expect(await bodyOf(a.value.path)).toBe('## Setup\n[[#Intro]]')
    expect(await bodyOf(c.value.path)).toBe('[[A/Notes#Intro]] [[Notes#Setup]] [[B/Notes#Setup]]')
  })

  it('moves a Link value `[[#Old]]` on its own page as a Text value moves', async () => {
    await createProperty(root, { label: 'Ref', type: 'link' })
    const a = await createTestPage(dir, 'A', { body: '## Intro' })
    if (!a.ok) throw new Error('setup failed')
    await setValue(a.value.path, 'Ref', '[[#Setup|the start]]')
    installStores(memoryStores().stores)
    await seedContentIndex(root)
    const holders = queryMentions([''], 'setup')
    await renameCascade(root, { path: 'Notes/A.md', heading: 'Setup', to: 'Intro' }, true)
    installStores(NO_STORES)
    expect(holders).toEqual([rel(a.value.path)])
    expect((await fmOf(a.value.path)).Ref).toBe('[[#Intro|the start]]')
  })
})

describe('deleteCascade', () => {
  let related: string
  const target = (): string => join(dir, 'Target.md')
  const set = async (parent: string, name: string): Promise<string> => {
    const folder = join(parent, name)
    await mkdir(folder, { recursive: true })
    await writeFile(join(folder, '_pageset.json'), JSON.stringify({ id: `set-${name}` }))
    return folder
  }
  const linker = async (
    name: string,
    value: string,
    parent = dir,
    key = 'Related',
  ): Promise<{ id: string; path: string }> => {
    const made = await createTestPage(parent, name, { body: 'see [[Target]]' })
    if (!made.ok) throw new Error('setup failed')
    await setValue(made.value.path, key, value)
    return made.value
  }

  beforeEach(async () => {
    await mkdir(join(root, '.nexus'), { recursive: true })
    await writeFile(
      join(root, '.nexus', 'nexus.json'),
      JSON.stringify({ id: 'nx', createdAt: '2026' }),
    )
    await writeFile(join(dir, '_pagecollection.json'), JSON.stringify({ id: 'col-notes' }))
    const link = await createProperty(root, {
      label: 'Related',
      type: 'link',
    })
    const select = await createProperty(root, {
      label: 'Kind',
      type: 'select',
    })
    if (!link.ok || !select.ok) throw new Error('setup failed')
    related = link.value.id
    await openSession(root)
  })
  afterEach(() => {
    dropLiveTree()
    closeSession()
    installStores(NO_STORES)
  })

  it('strips a Link property naming the page, keeps the body’s link, and records the value', async () => {
    const a = await linker('Cites', '[[Target]]')
    await refreshTree(root)
    const r = await deleteCascade(root, target(), ['Notes/Target.md'])
    expect(await fmOf(a.path)).not.toHaveProperty('Related')
    expect(await bodyOf(a.path)).toBe('see [[Target]]')
    expect(r).toEqual({
      reach: { skipped: 0, refused: [], hosts: [], pages: [rel(a.path)] },
      links: [{ page: a.id, property: related, value: '[[Target]]' }],
    })
  })

  it('strips a hand-written markdown Link value naming the page, recording it as written', async () => {
    const a = await linker('Cites', '[x](Target)')
    await refreshTree(root)
    const r = await deleteCascade(root, target(), ['Notes/Target.md'])
    expect(await fmOf(a.path)).not.toHaveProperty('Related')
    expect(r.links).toEqual([{ page: a.id, property: related, value: '[x](Target)' }])
  })

  it('strips an unquoted `[[Page]]` Link value, recording the link it spells', async () => {
    const a = await linker('Cites', 'held')
    const bytes = await readFile(a.path, 'utf8')
    await writeFile(a.path, bytes.replace('Related: held', 'Related: [[Target]]'))
    await refreshTree(root)
    const r = await deleteCascade(root, target(), ['Notes/Target.md'])
    expect(await fmOf(a.path)).not.toHaveProperty('Related')
    expect(r.links).toEqual([{ page: a.id, property: related, value: '[[Target]]' }])
  })

  it('leaves a Link value held under another casing of the Link property’s key, recording nothing', async () => {
    const a = await linker('Cites', '[[Target]]', dir, 'related')
    await refreshTree(root)
    const r = await deleteCascade(root, target(), ['Notes/Target.md'])
    expect((await fmOf(a.path)).related).toBe('[[Target]]')
    expect(r.links).toEqual([])
  })

  it('records an aliased heading value verbatim', async () => {
    const a = await linker('Cites', '[[Target#Intro|see]]')
    await refreshTree(root)
    const r = await deleteCascade(root, target(), ['Notes/Target.md'])
    expect(await fmOf(a.path)).not.toHaveProperty('Related')
    expect(r.links).toEqual([{ page: a.id, property: related, value: '[[Target#Intro|see]]' }])
  })

  it('leaves a non-Link property that reads as a connection', async () => {
    const a = await linker('Tagged', '[[Target]]', dir, 'Kind')
    const b = await linker('Cites', '[[Target]]')
    await refreshTree(root)
    const before = await readFile(a.path, 'utf8')
    const r = await deleteCascade(root, target(), ['Notes/Target.md'])
    expect(await readFile(a.path, 'utf8')).toBe(before)
    expect(r.reach.pages).toEqual([rel(b.path)])
  })

  it('never reaches a loose file outside every Collection', async () => {
    const loose = join(root, 'Note.md')
    const content = '---\nRelated: "[[Target]]"\n---\nloose\n'
    await writeFile(loose, content)
    const a = await linker('Cites', '[[Target]]')
    await refreshTree(root)
    sweepSpy.mockClear()
    const r = await deleteCascade(root, target(), ['Notes/Target.md'])
    expect(sweptFiles()).toEqual([a.path])
    expect(r.reach.pages).toEqual([rel(a.path)])
    expect(await readFile(loose, 'utf8')).toBe(content)
  })

  describe('reaches its linkers', () => {
    let a: { id: string; path: string }
    beforeEach(async () => {
      a = await linker('Cites', '[[Target]]')
      for (let i = 0; i < 3; i++) {
        const filler = await createTestPage(dir, `Filler ${i}`, { body: 'no links here' })
        if (!filler.ok) throw new Error('setup failed')
      }
      await refreshTree(root)
    })

    it('through the pages the index names', async () => {
      installStores(memoryStores().stores)
      await seedContentIndex(root)
      sweepSpy.mockClear()
      await deleteCascade(root, target(), ['Notes/Target.md'])
      expect(sweptFiles()).toEqual([a.path])
      expect(await fmOf(a.path)).not.toHaveProperty('Related')
    })

    it('through the corpus when there is no index', async () => {
      sweepSpy.mockClear()
      await deleteCascade(root, target(), ['Notes/Target.md'])
      expect(sweptFiles()).toHaveLength(4)
      expect(await fmOf(a.path)).not.toHaveProperty('Related')
    })
  })

  it('never sweeps the deleted page itself', async () => {
    const t = await linker('Target', '[[Target]]')
    const a = await linker('Cites', '[[Target]]')
    await refreshTree(root)
    const before = await readFile(t.path, 'utf8')
    sweepSpy.mockClear()
    await deleteCascade(root, t.path, ['Notes/Target.md'])
    expect(sweptFiles()).toEqual([a.path])
    expect(await readFile(t.path, 'utf8')).toBe(before)
  })

  it('keeps a value a same-titled page outside the delete still answers', async () => {
    const other = await set(dir, 'Other')
    if (!(await createTestPage(other, 'Target')).ok) throw new Error('setup failed')
    const a = await linker('Cites', '[[Target]]')
    await refreshTree(root)
    const r = await deleteCascade(root, target(), ['Notes/Target.md'])
    expect((await fmOf(a.path)).Related).toBe('[[Target]]')
    expect(r).toEqual({ reach: { skipped: 0, refused: [], hosts: [], pages: [] }, links: [] })
  })

  it('strips a value whose every same-titled page leaves with the delete', async () => {
    const other = await set(dir, 'Other')
    if (!(await createTestPage(other, 'Target')).ok) throw new Error('setup failed')
    if (!(await createTestPage(await set(other, 'Deep'), 'Target')).ok)
      throw new Error('setup failed')
    const a = await linker('Cites', '[[Target]]')
    await refreshTree(root)
    const r = await deleteCascade(root, other, [
      'Notes/Other/Target.md',
      'Notes/Other/Deep/Target.md',
    ])
    expect(await fmOf(a.path)).not.toHaveProperty('Related')
    expect(r.links).toEqual([{ page: a.id, property: related, value: '[[Target]]' }])
  })

  it('strips a path-form value naming the deleted page and keeps one naming its twin', async () => {
    const twin = await set(dir, 'B')
    if (!(await createTestPage(await set(dir, 'A'), 'Notes')).ok) throw new Error('setup failed')
    if (!(await createTestPage(twin, 'Notes')).ok) throw new Error('setup failed')
    const a = await linker('Cites A', '[[A/Notes]]')
    const b = await linker('Cites B', '[[B/Notes]]')
    const bare = await linker('Cites Bare', '[[Notes]]')
    await refreshTree(root)
    const r = await deleteCascade(root, join(dir, 'A', 'Notes.md'), ['Notes/A/Notes.md'])
    expect(await fmOf(a.path)).not.toHaveProperty('Related')
    expect((await fmOf(b.path)).Related).toBe('[[B/Notes]]')
    expect((await fmOf(bare.path)).Related).toBe('[[Notes]]')
    expect(r.links).toEqual([{ page: a.id, property: related, value: '[[A/Notes]]' }])
  })

  it('keeps a value whose path a live namesake answers by precedence', async () => {
    await mkdir(join(root, 'B'))
    await writeFile(join(root, 'B', '_pagecollection.json'), JSON.stringify({ id: 'col-b' }))
    if (!(await createTestPage(join(root, 'B'), 'Notes')).ok) throw new Error('setup failed')
    if (!(await createTestPage(await set(dir, 'B'), 'Notes')).ok) throw new Error('setup failed')
    const a = await linker('Cites', '[[B/Notes]]')
    await refreshTree(root)
    const r = await deleteCascade(root, join(dir, 'B', 'Notes.md'), ['Notes/B/Notes.md'])
    expect((await fmOf(a.path)).Related).toBe('[[B/Notes]]')
    expect(r.links).toEqual([])
  })

  it('sweeps a sibling whose name extends the deleted folder', async () => {
    const gone = await set(dir, 'Gone')
    await linker('Inner', '[[Other]]', gone)
    const sib = await linker('Sib', '[[Inner]]', await set(dir, 'Gone Archive'))
    await refreshTree(root)
    const r = await deleteCascade(root, gone, ['Notes/Gone/Inner.md'])
    expect(r.reach.pages).toEqual([rel(sib.path)])
  })

  it('sweeps nothing when no Link property is defined', async () => {
    await linker('Cites', '[[Target]]')
    await seedNexus(root, { defs: [] })
    await refreshTree(root)
    sweepSpy.mockClear()
    expect(await deleteCascade(root, target(), ['Notes/Target.md'])).toEqual({
      reach: { skipped: 0, hosts: [] },
      links: [],
    })
    expect(sweepSpy).not.toHaveBeenCalled()
  })

  it('an ID-less linker keeps its bytes and its value, counted among the links left in place', async () => {
    const loose = join(dir, 'Loose.md')
    const content = '---\nRelated: "[[Target]]"\n---\n'
    await writeFile(loose, content)
    await refreshTree(root)
    expect(heldTreeOf(root)?.unreadable).toContainEqual({
      path: rel(loose),
      kind: 'page',
      reason: 'missing',
    })
    const r = await deleteCascade(root, target(), ['Notes/Target.md'])
    expect(r.links).toEqual([])
    expect(r.reach.skipped).toBe(1)
    expect(await readFile(loose, 'utf8')).toBe(content)
  })

  it('strips an archived linker’s Link value naming the page and records it under its id', async () => {
    const id = '01KVGMT8BFP350FZZXAMG1QARC'
    const archived = join(
      root,
      '.nexus/archive/col-notes/Notes/2026-10-20T12-00-00-000Z__Old.md.archived/Old.md',
    )
    await mkdir(join(archived, '..'), { recursive: true })
    await writeFile(archived, `---\nID: ${id}\nRelated: "[[Target]]"\n---\nb\n`)
    await refreshTree(root)
    const r = await deleteCascade(root, target(), ['Notes/Target.md'])
    expect(await fmOf(archived)).not.toHaveProperty('Related')
    expect(r.links).toEqual([{ page: id, property: related, value: '[[Target]]' }])
  })

  it('strips an archived linker’s Link value and names the live linker alone in its pages', async () => {
    const a = await linker('Cites', '[[Target]]')
    const archived = join(
      root,
      '.nexus/archive/col-notes/Notes/2026-10-20T12-00-00-000Z__Old.md.archived/Old.md',
    )
    await mkdir(join(archived, '..'), { recursive: true })
    await writeFile(
      archived,
      `---\nID: 01KVGMT8BFP350FZZXAMG1QARC\nRelated: "[[Target]]"\n---\nb\n`,
    )
    await refreshTree(root)
    const r = await deleteCascade(root, target(), ['Notes/Target.md'])
    expect(await fmOf(archived)).not.toHaveProperty('Related')
    expect(r.reach.pages).toEqual([rel(a.path)])
  })

  it('still strips a linker inside a Collection whose sidecar doesn’t parse', async () => {
    const a = await linker('Cites', '[[Target]]')
    await writeFile(join(dir, '_pagecollection.json'), '{ not json')
    await refreshTree(root)
    const r = await deleteCascade(root, target(), ['Notes/Target.md'])
    expect(await fmOf(a.path)).not.toHaveProperty('Related')
    expect(r.links).toEqual([{ page: a.id, property: related, value: '[[Target]]' }])
  })

  it('never sweeps a page under a deleted folder', async () => {
    const gone = await set(dir, 'Gone')
    const inner = await linker('Inner', '[[Inner]]', gone)
    const deeper = await linker('Deeper', '[[Inner]]', await set(gone, 'Deep'))
    const a = await linker('Cites', '[[Inner]]')
    await refreshTree(root)
    const held = [await readFile(inner.path, 'utf8'), await readFile(deeper.path, 'utf8')]
    sweepSpy.mockClear()
    const r = await deleteCascade(root, gone, ['Notes/Gone/Inner.md', 'Notes/Gone/Deep/Deeper.md'])
    expect(sweptFiles()).toEqual([a.path])
    expect(r.reach.pages).toEqual([rel(a.path)])
    expect([await readFile(inner.path, 'utf8'), await readFile(deeper.path, 'utf8')]).toEqual(held)
  })

  it('strips a linker per title in one sweep', async () => {
    const a = await linker('Cites A', '[[Alpha]]')
    const b = await linker('Cites B', '[[Beta]]')
    await refreshTree(root)
    installStores(memoryStores().stores)
    await seedContentIndex(root)
    sweepSpy.mockClear()
    const r = await deleteCascade(root, join(dir, 'Gone'), [
      'Notes/Gone/Alpha.md',
      'Notes/Gone/Beta.md',
    ])
    expect(sweepSpy.mock.calls.length).toBe(1)
    expect(r.reach.pages?.sort()).toEqual([rel(a.path), rel(b.path)].sort())
    expect(r.links).toEqual(
      expect.arrayContaining([
        { page: a.id, property: related, value: '[[Alpha]]' },
        { page: b.id, property: related, value: '[[Beta]]' },
      ]),
    )
    expect(r.links).toHaveLength(2)
  })

  it.skipIf(noModeBits)(
    'a linker it can’t write is counted in the warning and recorded nowhere',
    async () => {
      const locked = await set(dir, 'Locked')
      const x = await linker('X', '[[Target]]', locked)
      await refreshTree(root)
      await chmod(locked, 0o555)
      try {
        const r = await deleteCascade(root, target(), ['Notes/Target.md'])
        expect(r).toEqual({
          reach: { skipped: 1, refused: [], hosts: [], pages: [] },
          links: [],
        })
      } finally {
        await chmod(locked, 0o755)
      }
      expect((await fmOf(x.path)).Related).toBe('[[Target]]')
    },
  )

  it('a linker whose frontmatter can’t round-trip is listed unparsed, refused by the sweep, and left as it is', async () => {
    const broken = join(dir, 'Broken.md')
    const content =
      '---\nID: 01KVGMT8BFP350FZZXAMG1QDVY\nRelated: "[[Target]]"\nsomething: *word\n---\nb'
    await writeFile(broken, content)
    await refreshTree(root)
    sweepSpy.mockClear()
    const r = await deleteCascade(root, target(), ['Notes/Target.md'])
    expect(heldTreeOf(root)?.unreadable).toContainEqual({
      path: rel(broken),
      kind: 'page',
      reason: 'unparsed',
    })
    expect((await sweepSpy.mock.results[0]?.value)?.skipped).toEqual([broken])
    expect(r).toEqual({
      reach: { skipped: 1, refused: [broken], hosts: [], pages: [] },
      links: [],
    })
    expect(await readFile(broken, 'utf8')).toBe(content)
  })
})

describe('the link cascades reach Spaces and stashes', () => {
  let related: string
  const LINKER = '01KVGMT8BFP350FZZXAMG1QDZZ'
  const OTHER = '01KVGMT8BFP350FZZXAMG1QDZY'
  const sidecar = (): string => join(contextsDir(root), 'Projects', 'Pommora', '_space.json')
  const collection = (): string => join(dir, '_pagecollection.json')
  const readJson = async (p: string) => JSON.parse(await readFile(p, 'utf8'))
  const space = (values: Record<string, unknown>) =>
    writeFile(sidecar(), JSON.stringify({ id: 'sp-pom', ...values }))
  const stash = (values: Record<string, unknown>) =>
    writeFile(
      collection(),
      JSON.stringify({
        id: 'col-notes',
        property_stash: { [related]: { removed_at: STASHED_AT, values } },
      }),
    )
  const stashed = async () => (await readJson(collection())).property_stash?.[related]?.values

  beforeEach(async () => {
    await mkdir(join(root, '.nexus'), { recursive: true })
    await writeFile(
      join(root, '.nexus', 'nexus.json'),
      JSON.stringify({ id: 'nx', createdAt: '2026' }),
    )
    await mkdir(join(contextsDir(root), 'Projects', 'Pommora'), { recursive: true })
    await writeFile(
      contextsRegistryFile(root),
      JSON.stringify({ contexts: [{ id: 'ctx_projects', title: 'Projects' }] }),
    )
    await writeFile(collection(), JSON.stringify({ id: 'col-notes' }))
    const link = await createProperty(root, {
      label: 'Related',
      type: 'link',
    })
    if (!link.ok) throw new Error('setup failed')
    related = link.value.id
    await openSession(root)
  })
  afterEach(() => {
    dropLiveTree()
    closeSession()
  })

  it('a delete strips a Space’s Link value naming the page, recording it by the Space’s id, and leaves the stash to its re-assign', async () => {
    await space({ Related: '[[Target]]' })
    await stash({ [LINKER]: '[[Target]]' })
    await refreshTree(root)
    const r = await deleteCascade(root, join(dir, 'Target.md'), ['Notes/Target.md'])
    expect(await readJson(sidecar())).toEqual({ id: 'sp-pom' })
    expect(await stashed()).toEqual({ [LINKER]: '[[Target]]' })
    expect(r.links).toEqual([{ page: 'sp-pom', property: related, value: '[[Target]]' }])
    expect(r.reach.pages).toEqual([sidecar().slice(root.length + 1)])
  })

  it('a title rename moves a Space’s and a stash’s Link value onto the new title', async () => {
    await space({ Related: '[[Target#Intro|see]]' })
    await stash({ [LINKER]: '[[Target]]', [OTHER]: '[[Other]]' })
    await refreshTree(root)
    await renameCascade(root, titled('Target', 'Omega'))
    expect((await readJson(sidecar())).Related).toBe('[[Omega#Intro|see]]')
    expect(await stashed()).toEqual({ [LINKER]: '[[Omega]]', [OTHER]: '[[Other]]' })
  })

  it('a heading rename moves a Space’s Link value naming the heading', async () => {
    await createTestPage(dir, 'Target', { body: '## Intro' })
    await space({ Related: '[[Target#Intro]]' })
    await refreshTree(root)
    const r = await renameCascade(root, {
      path: 'Notes/Target.md',
      heading: 'Intro',
      to: 'Overview',
    })
    expect((await readJson(sidecar())).Related).toBe('[[Target#Overview]]')
    expect(r.warning).toBeUndefined()
  })

  it('a title rename moves a Space’s Text value and a stashed Text value onto the new title', async () => {
    const notes = await createProperty(root, {
      label: 'Notes',
      type: 'text',
    })
    if (!notes.ok) throw new Error('setup failed')
    await space({ Notes: 'see [[Target]]' })
    await writeFile(
      collection(),
      JSON.stringify({
        id: 'col-notes',
        property_stash: {
          [notes.value.id]: { removed_at: STASHED_AT, values: { [LINKER]: 'see [[Target]]' } },
        },
      }),
    )
    await refreshTree(root)
    await renameCascade(root, titled('Target', 'New Target'))
    expect((await readJson(sidecar())).Notes).toBe('see [[New Target]]')
    expect((await readJson(collection())).property_stash[notes.value.id].values).toEqual({
      [LINKER]: 'see [[New Target]]',
    })
  })

  it('opens no Space sidecar, and no Collection the tree lists without a stash, for a title nothing there names', async () => {
    await space({ Related: '[[Other]]' })
    await refreshTree(root)
    await stash({ [LINKER]: '[[Target]]' })
    sweepSpy.mockClear()
    await deleteCascade(root, join(dir, 'Target.md'), ['Notes/Target.md'])
    await renameCascade(root, titled('Target', 'Omega'))
    for (const [files] of sweepSpy.mock.calls) expect(files).not.toContain(sidecar())
    expect(await stashed()).toEqual({ [LINKER]: '[[Target]]' })
  })
})
