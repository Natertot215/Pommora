import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { chmod, rm, mkdir, readFile, stat, utimes, writeFile } from 'node:fs/promises'
import { dirname, join } from '../Paths/posix'
import { noModeBits, seedSpaceSidecar, tempRoot } from '../Testing/hostFs'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import { indexWrittenPage, nexusCorpus, seedContentIndex } from './indexSeed'
import { dropLiveTree, liveTreeOf } from '../Nexus/liveTree'
import { nexusPages } from '../Nexus/heldPages'
import { createFolderEntity } from '../Nexus/folderEntity'
import { newId } from '../Nexus/ids'
import { createProperty, renameProperty } from '../Properties/registryProperty'
import { renameOption } from '../Properties/optionOps'
import { deleteProperty } from '../Properties/deleteProperty'
import { findHolders, keyedHolders } from './keyHolders'
import { collectionFolders, sweepGovernedRoots } from '../Nexus/governedSweep'
import { splitFrontmatter } from '../Files/pageFile'

vi.mock('../Nexus/governedSweep', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../Nexus/governedSweep')>()
  return { ...mod, sweepGovernedRoots: vi.fn(mod.sweepGovernedRoots) }
})

const sweepSpy = vi.mocked(sweepGovernedRoots)

let root: string
const abs = (...segs: string[]): string => join(root, ...segs)
const stage = async (): Promise<string[]> =>
  (await findHolders(root, { keys: ['Stage'], reach: 'governed' })).pages
const sidecar = (context: string, space: string): string =>
  abs('.nexus', 'contexts', context, space, '_space.json')
const corpus = async (): Promise<string[]> => (await nexusCorpus(root)).map((rel) => abs(rel))
const pageText = (n: string, fm: string): string =>
  `---\nID: 01ARZ3NDEKPSV4RRFFQ69G5${n.padStart(3, 'F').slice(-3).toUpperCase()}\n${fm}---\n\nbody\n`
const page = (n: string, fm: string): Promise<void> =>
  writeFile(abs('Notes', `${n}.md`), pageText(n, fm))
const archived = async (name: string, fm: string, collection = 'c1'): Promise<string> => {
  const file = abs(
    '.nexus',
    'archive',
    collection,
    'Notes',
    `2026-10-20T12-00-00-000Z__${name}.md.archived`,
    `${name}.md`,
  )
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, pageText(name, fm))
  await indexWrittenPage(root, file)
  return file
}

beforeEach(async () => {
  root = tempRoot('pom-keyh-')
  await mkdir(abs('.nexus'), { recursive: true })
  await writeFile(abs('.nexus', 'nexus.json'), JSON.stringify({ id: 'nx', createdAt: 'x' }))
  await writeFile(abs('.nexus', 'settings.json'), '{}')
  await mkdir(abs('Notes'), { recursive: true })
  await createProperty(root, {
    id: 'prop_s',
    label: 'Stage',
    type: 'select',
    select_options: [{ id: 'opt_Draft', key: 'Draft', label: 'Draft' }],
  })
  await writeFile(
    abs('Notes', '_pagecollection.json'),
    JSON.stringify({ id: 'c1', properties: ['prop_s'] }),
  )
  for (let i = 0; i < 28; i++) await page(`P${i}`, '')
  await page('HolderA', 'Stage: Draft\n')
  await page('HolderB', 'Stage: Draft\n')
  await mkdir(abs('Loose'), { recursive: true })
  await writeFile(abs('Loose', 'Note.md'), '---\nStage: Draft\n---\n\nun-governed\n')
  installStores(memoryStores().stores)
  await seedContentIndex(root)
  sweepSpy.mockClear()
})
afterEach(async () => {
  dropLiveTree()
  installStores(NO_STORES)
  await rm(root, { recursive: true, force: true })
})

describe('findHolders', () => {
  it('answers the queried holders inside every Collection and the Archive', async () => {
    const old = await archived('Q9C', 'Stage: Draft\n')
    const { pages, spaces } = await findHolders(root, { keys: ['Stage'], reach: 'governed' })
    expect(pages.sort()).toEqual(
      [abs('Notes', 'HolderA.md'), abs('Notes', 'HolderB.md'), old].sort(),
    )
    expect(spaces).toEqual([])
  })

  it('a name registered after the seed finds the pages already holding it, with no re-read', async () => {
    await page('Late', 'Notes: x\n')
    await seedContentIndex(root)
    await createProperty(root, { id: 'prop_n', label: 'Notes', type: 'link' })
    expect((await findHolders(root, { keys: ['Notes'], reach: 'governed' })).pages).toEqual([
      abs('Notes', 'Late.md'),
    ])
  })

  it('a rename onto a key a page holds beside the old one is refused through the index, and the un-governed note never counts', async () => {
    await page('Q9X', 'Stage: s\nPhase: x\n')
    await writeFile(abs('Loose', 'Other.md'), '---\nStage: s\nStep: y\n---\n\nun-governed\n')
    await seedContentIndex(root)
    const refused = await renameProperty(root, 'prop_s', 'Phase')
    expect(refused.ok).toBe(false)
    expect((await renameProperty(root, 'prop_s', 'Step')).ok).toBe(true)
  })

  it.skipIf(noModeBits)(
    'a holder that stops reading keeps its row, whether the watcher or the next seed reads it',
    async () => {
      const a = abs('Notes', 'HolderA.md')
      const b = abs('Notes', 'HolderB.md')
      try {
        await chmod(a, 0o000)
        await indexWrittenPage(root, a)
        await page('HolderB', 'Stage: Done\n')
        await chmod(b, 0o000)
        await seedContentIndex(root)
        expect((await stage()).sort()).toEqual([a, b])
      } finally {
        await chmod(a, 0o644)
        await chmod(b, 0o644)
      }
    },
  )

  it.skipIf(noModeBits)(
    'a rename onto a key an unreadable page was last read holding beside the old one is refused, and only that key',
    async () => {
      const q = abs('Notes', 'Q9X.md')
      await page('Q9X', 'Stage: s\nPhase: x\n')
      await seedContentIndex(root)
      try {
        await chmod(q, 0o000)
        await indexWrittenPage(root, q)
        expect((await renameProperty(root, 'prop_s', 'Phase')).ok).toBe(false)
        expect((await renameProperty(root, 'prop_s', 'Step')).ok).toBe(true)
      } finally {
        await chmod(q, 0o644)
      }
    },
  )

  it.skipIf(noModeBits)(
    'a change of case alone over an unreadable holder is not refused as holding both keys',
    async () => {
      const a = abs('Notes', 'HolderA.md')
      try {
        await chmod(a, 0o000)
        await indexWrittenPage(root, a)
        expect((await renameProperty(root, 'prop_s', 'STAGE')).ok).toBe(true)
      } finally {
        await chmod(a, 0o644)
      }
    },
  )

  it('a holder is the exact key, never a page or a Space holding another casing', async () => {
    const phase = async (): Promise<string[]> =>
      (await findHolders(root, { keys: ['Phase'], reach: 'governed' }, 'values')).held.map(
        (h) => h.file,
      )
    await page('Q9X', 'phase: x\n')
    await seedSpaceSidecar(root, 'Projects', 'Pommora', { id: 'sp1', PHASE: 'y' })
    dropLiveTree()
    await seedContentIndex(root)
    expect(await phase()).toEqual([])
    await page('Q9Y', 'Phase: x\n')
    await seedContentIndex(root)
    expect(await phase()).toEqual([abs('Notes', 'Q9Y.md')])
  })

  it('with no index it answers the corpus intersected the same way', async () => {
    installStores(NO_STORES)
    const files = await stage()
    expect(files).toHaveLength(30)
    expect(files.some((f) => f.includes('Loose'))).toBe(false)
  })

  it('`{ collection }` reaches one Collection folder and its own Archive, and no Space', async () => {
    await mkdir(abs('Other'), { recursive: true })
    await writeFile(
      abs('Other', '_pagecollection.json'),
      JSON.stringify({ id: 'c2', properties: ['prop_s'] }),
    )
    await writeFile(abs('Other', 'Elsewhere.md'), pageText('Elsewhere', 'Stage: Draft\n'))
    await indexWrittenPage(root, abs('Other', 'Elsewhere.md'))
    const own = await archived('Q9D', 'Stage: Draft\n')
    await archived('Q9E', 'Stage: Draft\n', 'c2')
    await seedSpaceSidecar(root, 'Projects', 'Pommora', { id: 'sp1', Stage: 'Draft' })
    dropLiveTree()
    const { pages, spaces } = await findHolders(root, {
      keys: ['Stage'],
      reach: { collection: abs('Notes') },
    })
    expect(pages.sort()).toEqual(
      [abs('Notes', 'HolderA.md'), abs('Notes', 'HolderB.md'), own].sort(),
    )
    expect(spaces).toEqual([])
  })

  it('reaches an Archive whose Collection the tree no longer holds', async () => {
    const orphan = await archived('Orphan', 'Stage: Draft\n', 'c9')
    expect(await stage()).toContain(orphan)
  })

  it('a property key reaches the pages of Collections and the Archive, and a Context key reaches a loose page too', async () => {
    await writeFile(
      abs('Loose', 'Note.md'),
      '---\nStage: Draft\n<Areas>: [Home]\n---\n\nun-governed\n',
    )
    await page('HolderA', 'Stage: Draft\n<Areas>: [Home]\n')
    await seedContentIndex(root)
    expect(
      (await findHolders(root, { keys: ['<Areas>'], reach: 'anywhere' })).pages.sort(),
    ).toEqual([abs('Loose', 'Note.md'), abs('Notes', 'HolderA.md')].sort())
    expect(await stage()).not.toContain(abs('Loose', 'Note.md'))
  })

  it('finds a Space by its property values or its Context keys, and every Space the tree couldn’t read', async () => {
    await seedSpaceSidecar(root, 'Projects', 'Pommora', { id: 'sp1', Stage: 'Draft' })
    await seedSpaceSidecar(root, 'Projects', 'Sapphire', { id: 'sp2', '<Areas>': ['Home'] })
    await seedSpaceSidecar(root, 'Projects', 'Quiet', { id: 'sp3' })
    await writeFile(await seedSpaceSidecar(root, 'Projects', 'Broken', {}), '{ not json')
    dropLiveTree()
    const spaces = async (key: string, reach: 'governed' | 'anywhere'): Promise<string[]> =>
      (await findHolders(root, { keys: [key], reach })).spaces.sort()
    const broken = sidecar('Projects', 'Broken')
    expect(await spaces('Stage', 'governed')).toEqual(
      [sidecar('Projects', 'Pommora'), broken].sort(),
    )
    expect(await spaces('<Areas>', 'anywhere')).toEqual(
      [sidecar('Projects', 'Sapphire'), broken].sort(),
    )
    expect(await spaces('Phase', 'governed')).toEqual([broken])
  })

  it('candidates come from every key', async () => {
    await page('HolderB', 'Phase: x\n')
    await seedContentIndex(root)
    await seedSpaceSidecar(root, 'Projects', 'Pommora', { id: 'sp1', Stage: 'Draft' })
    await seedSpaceSidecar(root, 'Projects', 'Sapphire', { id: 'sp2', Phase: 'x' })
    dropLiveTree()
    const { pages, spaces } = await findHolders(root, {
      keys: ['Stage', 'Phase'],
      reach: 'governed',
    })
    expect(pages.sort()).toEqual([abs('Notes', 'HolderA.md'), abs('Notes', 'HolderB.md')])
    expect(spaces.sort()).toEqual([sidecar('Projects', 'Pommora'), sidecar('Projects', 'Sapphire')])
  })

  it('`id` adds a Space whose row order lists it', async () => {
    await seedSpaceSidecar(root, 'Projects', 'Quiet', { id: 'sp3', $order: ['prop_s'] })
    dropLiveTree()
    const quiet = sidecar('Projects', 'Quiet')
    expect(
      (await findHolders(root, { keys: ['Stage'], reach: 'governed', id: 'prop_s' })).spaces,
    ).toEqual([quiet])
    expect((await findHolders(root, { keys: ['Stage'], reach: 'governed' })).spaces).toEqual([])
  })

  it('`moved` points a Space under the moved folder at where it went', async () => {
    await seedSpaceSidecar(root, 'Projects', 'Pommora', { id: 'sp1', Stage: 'Draft' })
    dropLiveTree()
    const { spaces } = await findHolders(root, {
      keys: ['Stage'],
      reach: 'governed',
      moved: { from: '.nexus/contexts/Projects', to: '.nexus/contexts/Ventures' },
    })
    expect(spaces).toEqual([join(root, '.nexus/contexts/Ventures/Pommora/_space.json')])
  })

  it('a rename onto a key an archived page holds beside the old one goes through, the archived page keeping the new key’s value', async () => {
    const held = await archived('Q9A', 'Stage: s\nPhase: x\n')
    expect((await renameProperty(root, 'prop_s', 'Phase')).ok).toBe(true)
    const fm = splitFrontmatter(await readFile(held, 'utf8'))
    expect(fm.Phase).toBe('x')
    expect(fm).not.toHaveProperty('Stage')
  })

  it('an option rename rewrites an archived holder', async () => {
    const held = await archived('Q9B', 'Stage: Draft\n')
    expect((await renameOption(root, 'prop_s', 'opt_Draft', 'Sketch')).ok).toBe(true)
    expect(await readFile(held, 'utf8')).toContain('Sketch')
    expect(await readFile(abs('Loose', 'Note.md'), 'utf8')).toContain('Draft')
  })

  it('collectionFolders lists every collection folder from the live tree', async () => {
    const t = await createFolderEntity(root, 'collection', 'Tasks', newId())
    if (!t.ok) throw new Error('setup failed')
    expect(collectionFolders(root, await liveTreeOf(root)).sort()).toEqual(
      [abs('Notes'), t.value.path].sort(),
    )
  })
})

describe('keyedHolders', () => {
  it('files no value for a page holding another casing of the key', async () => {
    await page('K1', 'tags: [a]\n')
    const file = abs('Notes', 'K1.md')
    expect(await keyedHolders([file], 'Tags', new Map())).toEqual({
      values: {},
      strip: [file],
      partial: false,
    })
  })

  it('keeps both claimants of an id the map marks null out of the strip', async () => {
    const a = abs('Notes', 'HolderA.md')
    const copy = abs('Notes', 'HolderA copy.md')
    await writeFile(copy, await readFile(a, 'utf8'))
    const id = '01ARZ3NDEKPSV4RRFFQ69G5ERA'
    expect(await keyedHolders([a, copy], 'Stage', new Map([[id, null]]))).toEqual({
      values: {},
      strip: [],
      partial: true,
    })
  })

  it('files and strips an archived holder by its id', async () => {
    const old = await archived('Q9F', 'Stage: Draft\n')
    const { byId } = await nexusPages(root, await liveTreeOf(root))
    expect(await keyedHolders([old], 'Stage', byId)).toEqual({
      values: { '01ARZ3NDEKPSV4RRFFQ69G5Q9F': 'Draft' },
      strip: [old],
      partial: false,
    })
  })
})

describe('the property cascades open only the holders', () => {
  it('an option rename opens exactly the 2 holders, and the un-governed note keeps its value', async () => {
    const r = await renameOption(root, 'prop_s', 'opt_Draft', 'Sketch')
    expect(r.ok).toBe(true)
    expect(sweepSpy.mock.calls[0]?.[0]).toHaveLength(2)
    expect(await readFile(abs('Notes', 'HolderA.md'), 'utf8')).toContain('Sketch')
    expect(await readFile(abs('Loose', 'Note.md'), 'utf8')).toContain('Draft')
  })

  it("a property rename reaches the holders of a Collection whose sidecar doesn't parse, and the un-governed note keeps its key", async () => {
    await writeFile(abs('Notes', '_pagecollection.json'), '{ not json')
    dropLiveTree()
    const r = await renameProperty(root, 'prop_s', 'Phase')
    expect(r.ok).toBe(true)
    expect(await readFile(abs('Notes', 'HolderA.md'), 'utf8')).toContain('Phase: Draft')
    expect(await readFile(abs('Loose', 'Note.md'), 'utf8')).toContain('Stage: Draft')
  })

  it('a corpus-wide governed sweep cannot reach an excluded folder', async () => {
    await writeFile(abs('.nexus', 'settings.json'), JSON.stringify({ excluded_folders: ['Vault'] }))
    await mkdir(abs('Vault'), { recursive: true })
    const excludedPage = `---\nID: 01ARZ3NDEKPSV4RRFFQ69G5XYZ\n<Areas>:\n  - Home\n---\n\nbody\n`
    await writeFile(abs('Vault', 'Tagged.md'), excludedPage)
    const swept = await sweepGovernedRoots(await corpus(), {
      raw: (raw) => {
        if (!('<Areas>' in raw)) return null
        const next = { ...raw }
        delete next['<Areas>']
        return next
      },
    })
    expect(swept.touched.size).toBe(0)
    expect(await readFile(abs('Vault', 'Tagged.md'), 'utf8')).toBe(excludedPage)
  })

  it("a sweep keeps every holder's modification time", async () => {
    const past = new Date('2020-06-01T12:00:00Z')
    await utimes(abs('Notes', 'HolderA.md'), past, past)
    const swept = await sweepGovernedRoots(await corpus(), {
      raw: (raw) => {
        if (!('Stage' in raw)) return null
        const next = { ...raw }
        delete next.Stage
        return next
      },
    })
    expect(swept.touched.has(abs('Notes', 'HolderA.md'))).toBe(true)
    expect(Math.floor((await stat(abs('Notes', 'HolderA.md'))).mtimeMs / 1000)).toBe(
      Math.floor(past.getTime() / 1000),
    )
  })

  it('a delete snapshots and strips exactly the scoped holders — the un-governed note untouched', async () => {
    const before = await readFile(abs('Loose', 'Note.md'), 'utf8')
    const r = await deleteProperty(root, 'prop_s')
    expect(r.ok).toBe(true)
    expect(await readFile(abs('Notes', 'HolderA.md'), 'utf8')).not.toContain('Stage')
    expect(await readFile(abs('Notes', 'HolderB.md'), 'utf8')).not.toContain('Stage')
    expect(await readFile(abs('Loose', 'Note.md'), 'utf8')).toBe(before)
  })
})
