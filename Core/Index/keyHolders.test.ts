import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { chmod, rm, mkdir, readFile, stat, utimes, writeFile } from 'node:fs/promises'
import { dirname, join } from '../Paths/posix'
import { noModeBits, seedSpaceSidecar, tempRoot } from '../Testing/hostFs'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import { indexWrittenPages, nexusCorpus, seedContentIndex } from './indexSeed'
import { dropLiveTree, liveTreeOf } from '../Nexus/liveTree'
import { createFolderEntity } from '../Nexus/folderEntity'
import { newId } from '../Nexus/ids'
import { createProperty, renameProperty } from '../Properties/registryProperty'
import { renameOption } from '../Properties/optionOps'
import { deleteProperty } from '../Properties/deleteProperty'
import { findHolders, heldValues } from './keyHolders'
import { readPageRelations } from './contentIndex'
import { collectionFolders, sweepGovernedRoots } from '../Nexus/governedSweep'
import { splitFrontmatter } from '../Files/pageFile'
import { closeSession, openSession } from '../Nexus/session'
import { settledMutate } from '../Testing/settledMutate'
import type { MutateRequest } from '../Nexus/mutateRequest'
import { listBundles } from '../Bundles/bundle'
import { writeRecord } from '../Bundles/record'

vi.mock('../Nexus/governedSweep', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../Nexus/governedSweep')>()
  return { ...mod, sweepGovernedRoots: vi.fn(mod.sweepGovernedRoots) }
})

const sweepSpy = vi.mocked(sweepGovernedRoots)

let root: string
const abs = (...segs: string[]): string => join(root, ...segs)
const stage = async (): Promise<string[]> =>
  (await findHolders(root, { keys: ['Stage'], reach: 'governed' })).files
const sidecar = (context: string, space: string): string =>
  abs('.nexus', 'contexts', context, space, '_space.json')
const sidecarsOf = (files: string[]): string[] => files.filter((f) => f.endsWith('_space.json'))
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
  await indexWrittenPages(root, [{ absPath: file }])
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
    const { files } = await findHolders(root, { keys: ['Stage'], reach: 'governed' })
    expect(files.sort()).toEqual(
      [abs('Notes', 'HolderA.md'), abs('Notes', 'HolderB.md'), old].sort(),
    )
  })

  it('a name registered after the seed finds the pages already holding it, with no re-read', async () => {
    await page('Late', 'Notes: x\n')
    await seedContentIndex(root)
    await createProperty(root, { id: 'prop_n', label: 'Notes', type: 'link' })
    expect((await findHolders(root, { keys: ['Notes'], reach: 'governed' })).files).toEqual([
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
        await indexWrittenPages(root, [{ absPath: a }])
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
        await indexWrittenPages(root, [{ absPath: q }])
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
        await indexWrittenPages(root, [{ absPath: a }])
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
    await indexWrittenPages(root, [{ absPath: abs('Other', 'Elsewhere.md') }])
    const own = await archived('Q9D', 'Stage: Draft\n')
    await archived('Q9E', 'Stage: Draft\n', 'c2')
    await seedSpaceSidecar(root, 'Projects', 'Pommora', { id: 'sp1', Stage: 'Draft' })
    dropLiveTree()
    const { files } = await findHolders(root, {
      keys: ['Stage'],
      reach: { collection: abs('Notes') },
    })
    expect(files.sort()).toEqual(
      [abs('Notes', 'HolderA.md'), abs('Notes', 'HolderB.md'), own].sort(),
    )
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
      (await findHolders(root, { keys: ['<Areas>'], reach: 'anywhere' })).files.sort(),
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
      sidecarsOf((await findHolders(root, { keys: [key], reach })).files).sort()
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
    const { files } = await findHolders(root, {
      keys: ['Stage', 'Phase'],
      reach: 'governed',
    })
    expect(files.sort()).toEqual(
      [
        abs('Notes', 'HolderA.md'),
        abs('Notes', 'HolderB.md'),
        sidecar('Projects', 'Pommora'),
        sidecar('Projects', 'Sapphire'),
      ].sort(),
    )
  })

  it('`id` adds a Space whose row order lists it', async () => {
    await seedSpaceSidecar(root, 'Projects', 'Quiet', { id: 'sp3', $order: ['prop_s'] })
    dropLiveTree()
    const quiet = sidecar('Projects', 'Quiet')
    expect(
      sidecarsOf(
        (await findHolders(root, { keys: ['Stage'], reach: 'governed', id: 'prop_s' })).files,
      ),
    ).toEqual([quiet])
    expect(sidecarsOf(await stage())).toEqual([])
  })

  it('`moved` points a Space under the moved folder at where it went', async () => {
    await seedSpaceSidecar(root, 'Projects', 'Pommora', { id: 'sp1', Stage: 'Draft' })
    dropLiveTree()
    const { files } = await findHolders(root, {
      keys: ['Stage'],
      reach: 'governed',
      moved: { from: '.nexus/contexts/Projects', to: '.nexus/contexts/Ventures' },
    })
    expect(sidecarsOf(files)).toEqual([join(root, '.nexus/contexts/Ventures/Pommora/_space.json')])
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

  it('a governed reach takes a trashed page and a trashed Collection’s pages by their record, a Collection renamed since included, and leaves one that left no Collection', async () => {
    await mkdir(abs('Tasks'))
    await writeFile(
      abs('Tasks', '_pagecollection.json'),
      JSON.stringify({ id: 'c2', properties: ['prop_s'] }),
    )
    await writeFile(abs('Tasks', 'Task.md'), pageText('T', 'Stage: Draft\n'))
    const rootLeft = abs('.trash', '2026-10-20T12-00-00-000Z__Note.md.deleted')
    await mkdir(rootLeft, { recursive: true })
    await writeFile(join(rootLeft, 'Note.md'), pageText('N', 'Stage: Draft\n'))
    await writeRecord(rootLeft, { entity: 'page', parent: { kind: 'root' } })
    await openSession(root)
    try {
      const reqs: MutateRequest[] = [
        { op: 'delete', path: 'Notes/HolderA.md', kind: 'page' },
        { op: 'rename', path: 'Notes', kind: 'collection', newName: 'Journal' },
        { op: 'delete', path: 'Tasks', kind: 'collection' },
      ]
      for (const req of reqs) expect((await settledMutate(root, req)).ok).toBe(true)
    } finally {
      closeSession()
    }
    await seedContentIndex(root)
    const trashed = await listBundles(root, { kind: 'trash' })
    const at = (file: string): string =>
      abs(trashed.find((b) => b.artifactName === file.split('/')[0])!.bundlePath, file)
    const trashOnly = (files: string[]): string[] => files.filter((f) => f.includes('/.trash/'))
    expect(trashOnly(await stage()).sort()).toEqual([at('HolderA.md'), at('Tasks/Task.md')].sort())
    const journal = await findHolders(root, {
      keys: ['Stage'],
      reach: { collection: abs('Journal') },
    })
    expect(trashOnly(journal.files)).toEqual([at('HolderA.md')])
  })

  it('collectionFolders lists every collection folder from the live tree', async () => {
    const t = await createFolderEntity(root, 'collection', 'Tasks', newId())
    if (!t.ok) throw new Error('setup failed')
    expect(collectionFolders(root, await liveTreeOf(root)).sort()).toEqual(
      [abs('Notes'), t.value.path].sort(),
    )
  })
})

describe('findHolders, reading', () => {
  const stageHeld = (): ReturnType<typeof findHolders> =>
    findHolders(root, { keys: ['Stage'], reach: 'governed' }, 'values')

  it('keeps both claimants of one id out of the strip and files neither', async () => {
    const a = abs('Notes', 'HolderA.md')
    const copy = abs('Notes', 'HolderA copy.md')
    await writeFile(copy, await readFile(a, 'utf8'))
    await indexWrittenPages(root, [{ absPath: copy }])
    dropLiveTree()
    const { files, held } = await stageHeld()
    expect(files).not.toContain(a)
    expect(files).not.toContain(copy)
    expect(held.filter((h) => h.file === a || h.file === copy).map((h) => h.id)).toEqual([
      null,
      null,
    ])
  })

  it('files and strips an archived holder by its id', async () => {
    const old = await archived('Q9F', 'Stage: Draft\n')
    const { files, held } = await stageHeld()
    expect(files).toContain(old)
    expect(heldValues(held, 'Stage')).toMatchObject({ '01ARZ3NDEKPSV4RRFFQ69G5Q9F': 'Draft' })
  })

  it('files a Space’s value by its id from the same read that confirms it', async () => {
    const file = await seedSpaceSidecar(root, 'Projects', 'Pommora', { id: 'sp1', Stage: 'Draft' })
    dropLiveTree()
    expect((await stageHeld()).held).toContainEqual({
      file,
      id: 'sp1',
      keys: ['Stage'],
      values: { Stage: 'Draft' },
      above: { Stage: undefined },
    })
  })

  const typed: [string, string][] = [
    ['Text', 'Text: hello\n'],
    ['Count', 'Count: 3\n'],
    ['Done', 'Done: true\n'],
    ['When', 'When: 2026-10-24\n'],
    ['Stage', 'Stage: Draft\n'],
    ['Tags', 'Tags:\n  - a\n  - b\n'],
    ['Phase', 'Phase: Doing\n'],
    ['Site', 'Site: https://example.com\n'],
    ['Attachment', 'Attachment: notes.pdf\n'],
    ['<Areas>', '<Areas>:\n  - Home\n'],
  ]
  const typedHeld = async (): Promise<string[]> => {
    for (const [i, [, fm]] of typed.entries()) await page(`V0${i}`, fm)
    await seedContentIndex(root)
    dropLiveTree()
    return typed.map((_, i) => abs('Notes', `V0${i}.md`))
  }
  const typedQuery = (): ReturnType<typeof findHolders> =>
    findHolders(root, { keys: typed.map(([k]) => k), reach: 'anywhere' }, 'values')

  it.skipIf(noModeBits)(
    'a holder’s values come from its file, and from the index only when the file can’t be read',
    async () => {
      const files = await typedHeld()
      const shut = files.filter((_, i) => i % 2 === 1)
      try {
        for (const f of shut) await chmod(f, 0o000)
        const { held } = await typedQuery()
        for (const [i, [key]] of typed.entries()) {
          const file = files[i] as string
          const rel = file.slice(root.length + 1)
          const want = shut.includes(file)
            ? readPageRelations([rel])?.pages[rel]?.values[key]
            : splitFrontmatter(pageText(`V0${i}`, typed[i]?.[1] ?? ''))[key]
          expect(held.find((h) => h.file === file)).toEqual({
            file,
            id: `01ARZ3NDEKPSV4RRFFQ69G5V0${i}`,
            keys: [key],
            values: { [key]: want },
            above: { [key]: undefined },
          })
        }
      } finally {
        for (const f of shut) await chmod(f, 0o644)
      }
    },
  )

  it.skipIf(noModeBits)(
    'a holder neither its file nor the index answers keeps no values',
    async () => {
      const mem = memoryStores()
      installStores(mem.stores)
      const [file] = await typedHeld()
      const rel = (file as string).slice(root.length + 1)
      mem.index.stats.delete(rel)
      try {
        await chmod(file as string, 0o000)
        const { held, files } = await typedQuery()
        expect(held).toContainEqual({
          file,
          id: null,
          keys: ['Text'],
          values: null,
          above: { Text: undefined },
        })
        expect(files).toContain(file)
      } finally {
        await chmod(file as string, 0o644)
      }
    },
  )
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
