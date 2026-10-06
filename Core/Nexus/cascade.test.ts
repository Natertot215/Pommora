import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { chmod, rm, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { noModeBits, tempRoot } from '../Testing/hostFs'
import type { PropertyDefinition } from '../Properties/properties'
import { deleteCascade, renameCascade } from './cascade'
import { sweepGovernedRoots, unsweptLine } from '../Properties/governedSweep'
import { createTestPage } from '../Testing/createTestPage'
import { dropLiveTree, heldTreeOf, refreshTree } from './liveTree'
import { closeSession, openSession } from './session'
import { createProperty } from '../Properties/registryProperty'

import { mergeFrontmatter, splitEnvelope, splitFrontmatter } from '../Files/pageFile'
import { rewritePageSerialized } from '../Files/atomicWrite'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import { seedContentIndex } from '../Index/indexSeed'
import { ok } from '../Contract/result'
import { machine } from '../Platform/machine'
import { contextsDir, contextsRegistryFile, tileFilePath, homepageDir } from '../Paths/paths'
import { createTile, readMarkdownTile, writeMarkdownTile } from '../Tiles/tilesFile'
import { landedId } from '../Testing/tileLayouts'

vi.mock('../Properties/governedSweep', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../Properties/governedSweep')>()
  return { ...mod, sweepGovernedRoots: vi.fn(mod.sweepGovernedRoots) }
})

vi.mock('../Files/atomicWrite', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../Files/atomicWrite')>()
  return { ...mod, rewritePageSerialized: vi.fn(mod.rewritePageSerialized) }
})

const sweepSpy = vi.mocked(sweepGovernedRoots)
const rewriteSpy = vi.mocked(rewritePageSerialized)
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
    const a = await createTestPage(dir, 'A', { body: 'go to [[Target]] now' })
    const b = await createTestPage(dir, 'B', { body: '[[target]] and [[Other]]' })
    const c = await createTestPage(dir, 'C', { body: 'no links' })
    const sub = join(dir, 'Collection')
    await mkdir(sub, { recursive: true })
    const nested = await createTestPage(sub, 'Nested', { body: 'deep [[Target]]' })
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
    await createTestPage(dir, 'Solo', { body: 'nothing here' })
    const r = await renameCascade(root, 'Ghost', { title: 'Phantom' })
    expect(r.pages).toEqual([])
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
    const a = await createTestPage(dir, 'Cites', { body: 'see [[Target]]' })
    if (!a.ok) throw new Error('setup failed')
    await setValue(a.value.path, SOURCE, '[[Target|the brief]]')

    await renameCascade(root, 'Target', { title: 'New Target' })
    expect(await bodyOf(a.value.path)).toContain('[[New Target]]')
    expect((await fmOf(a.value.path))[SOURCE]).toBe('[[New Target|the brief]]')
  })

  it('reaches a page whose ONLY reference is its frontmatter, through the index', async () => {
    const a = await createTestPage(dir, 'Only Frontmatter', { body: 'no links here' })
    if (!a.ok) throw new Error('setup failed')
    await setValue(a.value.path, SOURCE, '[[Target]]')
    installStores(memoryStores().stores)
    await seedContentIndex(root)

    const r = await renameCascade(root, 'Target', { title: 'New Target' })
    installStores(NO_STORES)
    expect(r.pages).toEqual([rel(a.value.path)])
    expect((await fmOf(a.value.path))[SOURCE]).toBe('[[New Target]]')
  })

  it('moves a connection held under a key spelled in another case', async () => {
    const a = await createTestPage(dir, 'Lowercase', { body: 'no links here' })
    if (!a.ok) throw new Error('setup failed')
    await setValue(a.value.path, 'source', '[[Target]]')

    await renameCascade(root, 'Target', { title: 'New Target' })
    const fm = await fmOf(a.value.path)
    expect(fm.source).toBe('[[New Target]]')
    expect(fm).not.toHaveProperty(SOURCE)
  })

  it('leaves an address alone when its last segment happens to match', async () => {
    const a = await createTestPage(dir, 'Address', { body: 'no links here' })
    if (!a.ok) throw new Error('setup failed')
    await setValue(a.value.path, SITE, 'https://example.com/Target')

    await renameCascade(root, 'Target', { title: 'New Target' })
    expect((await fmOf(a.value.path))[SITE]).toBe('https://example.com/Target')
  })
})

describe('renameCascade for a heading', () => {
  const seedAB = async (): Promise<{ a: string; b: string }> => {
    const a = await createTestPage(dir, 'A', { body: '## Setup\n[[#Setup]]' })
    const b = await createTestPage(dir, 'B', { body: '[[A#Setup]]' })
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
    const a = await createTestPage(dir, 'A', { body: '## Setup' })
    if (!a.ok) throw new Error('setup failed')
    installStores(memoryStores().stores)
    await seedContentIndex(root)
    const tile = await landedId(createTile(root, homepageDir(root), { kind: 'append' }))
    await writeMarkdownTile(homepageDir(root), tile, 'see [[A#Setup]]', machine().sha256Hex(''))
    const r = await renameCascade(root, 'A', { heading: 'Setup', to: 'Intro' })
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
    const r = await renameCascade(root, 'A', { heading: 'Setup', to: 'Intro' })
    installStores(NO_STORES)
    expect(r.hosts).toEqual([])
    expect(rewriteSpy.mock.calls.map(([file]) => file)).not.toContain(
      tileFilePath(homepageDir(root), tile),
    )
    expect(await readMarkdownTile(homepageDir(root), tile)).toEqual(ok('see [[A#Other]]'))
  })

  it('moves a Link property aimed at the renamed heading, found through the index', async () => {
    await createProperty(root, { id: '', name: 'Source', type: 'link' } as PropertyDefinition)
    const a = await createTestPage(dir, 'A', { body: '## Setup' })
    const c = await createTestPage(dir, 'C', { body: 'no links' })
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
    const a = await createTestPage(dir, 'A', { body: '## Setup' })
    const b = await createTestPage(dir, 'B', { body: '![[A#Setup]]' })
    if (!a.ok || !b.ok) throw new Error('setup failed')
    installStores(memoryStores().stores)
    await seedContentIndex(root)
    await renameCascade(root, 'A', { heading: 'Setup', to: 'Intro' }, 'Notes/A.md')
    installStores(NO_STORES)
    expect(await bodyOf(b.value.path)).toBe('![[A#Intro]]')
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
      id: '',
      name: 'Related',
      type: 'link',
    } as PropertyDefinition)
    const select = await createProperty(root, {
      id: '',
      name: 'Kind',
      type: 'select',
    } as PropertyDefinition)
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
    const r = await deleteCascade(root, target(), ['Target'])
    expect(await fmOf(a.path)).not.toHaveProperty('Related')
    expect(await bodyOf(a.path)).toBe('see [[Target]]')
    expect(r).toEqual({
      cascade: { pages: [rel(a.path)], hosts: [] },
      links: [{ page: a.id, property: related, value: '[[Target]]' }],
    })
  })

  it('strips a Link value held under a key spelled in another case, recording it', async () => {
    const a = await linker('Cites', '[[Target]]', dir, 'related')
    await refreshTree(root)
    const r = await deleteCascade(root, target(), ['Target'])
    expect(await fmOf(a.path)).not.toHaveProperty('related')
    expect(r.links).toEqual([{ page: a.id, property: related, value: '[[Target]]' }])
  })

  it('records an aliased heading value verbatim', async () => {
    const a = await linker('Cites', '[[Target#Intro|see]]')
    await refreshTree(root)
    const r = await deleteCascade(root, target(), ['Target'])
    expect(await fmOf(a.path)).not.toHaveProperty('Related')
    expect(r.links).toEqual([{ page: a.id, property: related, value: '[[Target#Intro|see]]' }])
  })

  it('leaves a non-Link property that reads as a connection', async () => {
    const a = await linker('Tagged', '[[Target]]', dir, 'Kind')
    const b = await linker('Cites', '[[Target]]')
    await refreshTree(root)
    const before = await readFile(a.path, 'utf8')
    const r = await deleteCascade(root, target(), ['Target'])
    expect(await readFile(a.path, 'utf8')).toBe(before)
    expect(r.cascade.pages).toEqual([rel(b.path)])
  })

  it('never reaches a loose file outside every Collection', async () => {
    const loose = join(root, 'Note.md')
    const content = '---\nRelated: "[[Target]]"\n---\nloose\n'
    await writeFile(loose, content)
    const a = await linker('Cites', '[[Target]]')
    await refreshTree(root)
    sweepSpy.mockClear()
    const r = await deleteCascade(root, target(), ['Target'])
    expect(sweptFiles()).toEqual([a.path])
    expect(r.cascade.pages).toEqual([rel(a.path)])
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
      await deleteCascade(root, target(), ['Target'])
      expect(sweptFiles()).toEqual([a.path])
      expect(await fmOf(a.path)).not.toHaveProperty('Related')
    })

    it('through the corpus when there is no index', async () => {
      sweepSpy.mockClear()
      await deleteCascade(root, target(), ['Target'])
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
    await deleteCascade(root, t.path, ['Target'])
    expect(sweptFiles()).toEqual([a.path])
    expect(await readFile(t.path, 'utf8')).toBe(before)
  })

  it('keeps a value a same-titled page outside the delete still answers', async () => {
    const other = await set(dir, 'Other')
    if (!(await createTestPage(other, 'Target')).ok) throw new Error('setup failed')
    const a = await linker('Cites', '[[Target]]')
    await refreshTree(root)
    const r = await deleteCascade(root, target(), ['Target'])
    expect((await fmOf(a.path)).Related).toBe('[[Target]]')
    expect(r).toEqual({ cascade: { pages: [], hosts: [] }, links: [] })
  })

  it('strips a value whose every same-titled page leaves with the delete', async () => {
    const other = await set(dir, 'Other')
    if (!(await createTestPage(other, 'Target')).ok) throw new Error('setup failed')
    if (!(await createTestPage(await set(other, 'Deep'), 'Target')).ok)
      throw new Error('setup failed')
    const a = await linker('Cites', '[[Target]]')
    await refreshTree(root)
    const r = await deleteCascade(root, other, ['Target', 'Target'])
    expect(await fmOf(a.path)).not.toHaveProperty('Related')
    expect(r.links).toEqual([{ page: a.id, property: related, value: '[[Target]]' }])
  })

  it('sweeps a sibling whose name extends the deleted folder', async () => {
    const gone = await set(dir, 'Gone')
    await linker('Inner', '[[Other]]', gone)
    const sib = await linker('Sib', '[[Inner]]', await set(dir, 'Gone Archive'))
    await refreshTree(root)
    const r = await deleteCascade(root, gone, ['Inner'])
    expect(r.cascade.pages).toEqual([rel(sib.path)])
  })

  it('sweeps nothing when no Link property is defined', async () => {
    await linker('Cites', '[[Target]]')
    await writeFile(
      join(root, '.nexus', 'properties.json'),
      JSON.stringify({ order: [], defs: {} }),
    )
    await refreshTree(root)
    sweepSpy.mockClear()
    expect(await deleteCascade(root, target(), ['Target'])).toEqual({
      cascade: { pages: [], hosts: [] },
      links: [],
    })
    expect(sweepSpy).not.toHaveBeenCalled()
  })

  it('an ID-less linker isn’t held, isn’t stamped by the sweep, and keeps its bytes', async () => {
    const loose = join(dir, 'Loose.md')
    const content = '---\nRelated: "[[Target]]"\n---\n'
    await writeFile(loose, content)
    await refreshTree(root)
    expect(heldTreeOf(root)?.unreadable).toContainEqual({
      path: rel(loose),
      kind: 'page',
      reason: 'missing',
    })
    const r = await deleteCascade(root, target(), ['Target'])
    expect(r.links).toEqual([])
    expect(await readFile(loose, 'utf8')).toBe(content)
  })

  it('never sweeps a page under a deleted folder', async () => {
    const gone = await set(dir, 'Gone')
    const inner = await linker('Inner', '[[Inner]]', gone)
    const deeper = await linker('Deeper', '[[Inner]]', await set(gone, 'Deep'))
    const a = await linker('Cites', '[[Inner]]')
    await refreshTree(root)
    const held = [await readFile(inner.path, 'utf8'), await readFile(deeper.path, 'utf8')]
    sweepSpy.mockClear()
    const r = await deleteCascade(root, gone, ['Inner', 'Deeper'])
    expect(sweptFiles()).toEqual([a.path])
    expect(r.cascade.pages).toEqual([rel(a.path)])
    expect([await readFile(inner.path, 'utf8'), await readFile(deeper.path, 'utf8')]).toEqual(held)
  })

  it('strips a linker per title in one sweep', async () => {
    const a = await linker('Cites A', '[[Alpha]]')
    const b = await linker('Cites B', '[[Beta]]')
    await refreshTree(root)
    installStores(memoryStores().stores)
    await seedContentIndex(root)
    sweepSpy.mockClear()
    const r = await deleteCascade(root, join(dir, 'Gone'), ['Alpha', 'Beta'])
    expect(sweepSpy.mock.calls.length).toBe(1)
    expect(r.cascade.pages.sort()).toEqual([rel(a.path), rel(b.path)].sort())
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
        const r = await deleteCascade(root, target(), ['Target'])
        expect(r).toEqual({
          cascade: { pages: [], hosts: [], warning: unsweptLine(1, 'links in ') },
          links: [],
        })
      } finally {
        await chmod(locked, 0o755)
      }
      expect((await fmOf(x.path)).Related).toBe('[[Target]]')
    },
  )

  it('a linker whose frontmatter can’t round-trip is listed unparsed, never swept, and left as it is', async () => {
    const broken = join(dir, 'Broken.md')
    const content =
      '---\nID: 01KVGMT8BFP350FZZXAMG1QDVY\nRelated: "[[Target]]"\nsomething: *word\n---\nb'
    await writeFile(broken, content)
    await refreshTree(root)
    sweepSpy.mockClear()
    const r = await deleteCascade(root, target(), ['Target'])
    expect(heldTreeOf(root)?.unreadable).toContainEqual({
      path: rel(broken),
      kind: 'page',
      reason: 'unparsed',
    })
    expect(sweptFiles()).not.toContain(broken)
    expect(r).toEqual({ cascade: { pages: [], hosts: [] }, links: [] })
    expect(await readFile(broken, 'utf8')).toBe(content)
  })
})

describe('the link cascades reach Spaces and caches', () => {
  let related: string
  const LINKER = '01KVGMT8BFP350FZZXAMG1QDZZ'
  const OTHER = '01KVGMT8BFP350FZZXAMG1QDZY'
  const sidecar = (): string => join(contextsDir(root), 'Projects', 'Pommora', '_space.json')
  const collection = (): string => join(dir, '_pagecollection.json')
  const readJson = async (p: string) => JSON.parse(await readFile(p, 'utf8'))
  const space = (values: Record<string, unknown>) =>
    writeFile(sidecar(), JSON.stringify({ id: 'sp-pom', ...values }))
  const cache = (values: Record<string, unknown>) =>
    writeFile(
      collection(),
      JSON.stringify({ id: 'col-notes', property_cache: { [related]: { values } } }),
    )
  const cached = async () => (await readJson(collection())).property_cache?.[related]?.values

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
      id: '',
      name: 'Related',
      type: 'link',
    } as PropertyDefinition)
    if (!link.ok) throw new Error('setup failed')
    related = link.value.id
    await openSession(root)
  })
  afterEach(() => {
    dropLiveTree()
    closeSession()
  })

  it('a delete strips a Space’s Link value naming the page, recording it by the Space’s id, and leaves the cache to its re-assign', async () => {
    await space({ Related: '[[Target]]' })
    await cache({ [LINKER]: '[[Target]]' })
    await refreshTree(root)
    const r = await deleteCascade(root, join(dir, 'Target.md'), ['Target'])
    expect(await readJson(sidecar())).toEqual({ id: 'sp-pom' })
    expect(await cached()).toEqual({ [LINKER]: '[[Target]]' })
    expect(r.links).toEqual([{ page: 'sp-pom', property: related, value: '[[Target]]' }])
    expect(r.cascade.pages).toEqual([sidecar().slice(root.length + 1)])
  })

  it('a title rename moves a Space’s and a cache’s Link value onto the new title', async () => {
    await space({ Related: '[[Target#Intro|see]]' })
    await cache({ [LINKER]: '[[Target]]', [OTHER]: '[[Other]]' })
    await refreshTree(root)
    await renameCascade(root, 'Target', { title: 'Omega' })
    expect((await readJson(sidecar())).Related).toBe('[[Omega#Intro|see]]')
    expect(await cached()).toEqual({ [LINKER]: '[[Omega]]', [OTHER]: '[[Other]]' })
  })

  it('a heading rename moves a Space’s Link value naming the heading', async () => {
    await space({ Related: '[[Target#Intro]]' })
    await refreshTree(root)
    await renameCascade(root, 'Target', { heading: 'Intro', to: 'Overview' })
    expect((await readJson(sidecar())).Related).toBe('[[Target#Overview]]')
  })

  it('opens no Space sidecar, and no Collection the tree lists without a cache, for a title nothing there names', async () => {
    await space({ Related: '[[Other]]' })
    await refreshTree(root)
    await cache({ [LINKER]: '[[Target]]' })
    sweepSpy.mockClear()
    await deleteCascade(root, join(dir, 'Target.md'), ['Target'])
    await renameCascade(root, 'Target', { title: 'Omega' })
    for (const [, , plan] of sweepSpy.mock.calls) expect(plan).not.toHaveProperty('sidecars')
    expect(await cached()).toEqual({ [LINKER]: '[[Target]]' })
  })
})
