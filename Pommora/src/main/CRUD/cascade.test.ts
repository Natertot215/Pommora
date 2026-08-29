import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtemp, rm, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PAGE_ID_KEY } from '@shared/identity'
import { wrapKey } from '@shared/governedKeys'
import { renameCascade } from './cascade'
import { createPage } from './page'
import { splitFrontmatter } from '../readNexus'
import { mergeFrontmatter, splitEnvelope } from '../IO/pageFile'
import { rewritePageSerialized } from '../IO/atomicWrite'
import { openSessionDb, closeSessionDb } from '../sessionDb'
import { seedContentIndex } from '../indexSeed'

vi.mock('../IO/atomicWrite', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../IO/atomicWrite')>()
  return { ...mod, rewritePageSerialized: vi.fn(mod.rewritePageSerialized) }
})

const openSpy = vi.mocked(rewritePageSerialized)

let root: string
let dir: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-cascade-'))
  dir = join(root, 'Notes')
  await mkdir(dir, { recursive: true })
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

const bodyOf = async (p: string) => splitEnvelope(await readFile(p, 'utf8')).body
const fmOf = async (p: string) => splitFrontmatter(await readFile(p, 'utf8'))

describe('renameCascade', () => {
  it('rewrites inbound links nexus-wide (incl. nested), leaves frontmatter untouched', async () => {
    const a = await createPage(dir, 'A', { body: 'go to [[Target]] now' })
    const b = await createPage(dir, 'B', { body: '[[target]] and [[Other]]' })
    const c = await createPage(dir, 'C', { body: 'no links' })
    const sub = join(dir, 'Collection')
    await mkdir(sub, { recursive: true })
    const nested = await createPage(sub, 'Nested', { body: 'deep [[Target]]' })
    if (!a.ok || !b.ok || !c.ok || !nested.ok) throw new Error('setup failed')

    const before = await fmOf(a.value.path)
    const r = await renameCascade(root, 'Target', 'New Target')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.touched.sort()).toEqual([a.value.path, b.value.path, nested.value.path].sort())

    expect(await bodyOf(a.value.path)).toBe('go to [[New Target]] now')
    expect(await bodyOf(b.value.path)).toBe('[[New Target]] and [[Other]]')
    expect(await bodyOf(nested.value.path)).toBe('deep [[New Target]]')
    expect(await bodyOf(c.value.path)).toBe('no links')

    const after = await fmOf(a.value.path)
    expect(after[PAGE_ID_KEY]).toBe(a.value.id)
    expect(after.modified_at).toBe(before.modified_at) // derived edit ⇒ no modified bump
  })

  it('touches nothing when no page links the old title', async () => {
    await createPage(dir, 'Solo', { body: 'nothing here' })
    const r = await renameCascade(root, 'Ghost', 'Phantom')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.touched).toEqual([])
  })
})

describe('the cascade queries the index', () => {
  const hidden = (): string => join(root, 'Hidden', 'Secret.md')

  /** 40 pages, 3 of them mentioning — one in an un-adopted folder — plus an EXCLUDED note
   *  that also mentions and must stay unread and byte-untouched (Requirement 9). */
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
    closeSessionDb()
  })

  it('opens exactly the files whose rows name the title — the un-adopted note included', async () => {
    await seedFixture()
    openSessionDb(root)
    await seedContentIndex(root)
    openSpy.mockClear()
    const r = await renameCascade(root, 'Target', 'New Target')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.touched).toHaveLength(3)
    expect(openSpy).toHaveBeenCalledTimes(3)
    expect(await readFile(join(root, 'Loose', 'Note.md'), 'utf8')).toBe(
      'un-adopted [[New Target]]\n',
    )
    expect(await readFile(hidden(), 'utf8')).toBe('excluded [[Target]]\n')
  })

  it('a null index falls back to the corpus scan — excluded folders unreachable either way', async () => {
    await seedFixture()
    openSpy.mockClear()
    const r = await renameCascade(root, 'Target', 'New Target')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.touched).toHaveLength(3)
    // The fallback reads the whole corpus — every filler too — but never the excluded note.
    expect(openSpy).toHaveBeenCalledTimes(40)
    expect(openSpy.mock.calls.some(([file]) => (file as string).includes('Hidden'))).toBe(false)
    expect(await readFile(hidden(), 'utf8')).toBe('excluded [[Target]]\n')
  })
})

describe('renameCascade over frontmatter', () => {
  const SOURCE = wrapKey('property', 'Source')
  const SITE = wrapKey('property', 'Site')
  const setValue = (path: string, key: string, value: string) =>
    rewritePageSerialized(path, (content) =>
      mergeFrontmatter(content, { [key]: value }, [key], splitEnvelope(content).body),
    )

  it('moves a Link property naming the page, and the body’s links with it', async () => {
    const a = await createPage(dir, 'Cites', { body: 'see [[Target]]' })
    if (!a.ok) throw new Error('setup failed')
    await setValue(a.value.path, SOURCE, '[[Target|the brief]]')

    expect((await renameCascade(root, 'Target', 'New Target')).ok).toBe(true)
    expect(await bodyOf(a.value.path)).toContain('[[New Target]]')
    expect((await fmOf(a.value.path))[SOURCE]).toBe('[[New Target|the brief]]')
  })

  it('reaches a page whose ONLY reference is its frontmatter, through the index', async () => {
    const a = await createPage(dir, 'Only Frontmatter', { body: 'no links here' })
    if (!a.ok) throw new Error('setup failed')
    await setValue(a.value.path, SOURCE, '[[Target]]')
    openSessionDb(root)
    await seedContentIndex(root)

    const r = await renameCascade(root, 'Target', 'New Target')
    closeSessionDb()
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.touched).toEqual([a.value.path])
    expect((await fmOf(a.value.path))[SOURCE]).toBe('[[New Target]]')
  })

  it('leaves an address alone when its last segment happens to match', async () => {
    const a = await createPage(dir, 'Address', { body: 'no links here' })
    if (!a.ok) throw new Error('setup failed')
    await setValue(a.value.path, SITE, 'https://example.com/Target')

    await renameCascade(root, 'Target', 'New Target')
    expect((await fmOf(a.value.path))[SITE]).toBe('https://example.com/Target')
  })
})
