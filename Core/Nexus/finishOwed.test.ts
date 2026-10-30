// The crash-window suite: each window is the exact on-disk state a killed op leaves with its note, and the finish must land the same disk an uninterrupted op lands.

import { describe, it, expect, afterEach, vi } from 'vitest'
import { chmod, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { tempRoot, noModeBits, putJson, seedSpaceSidecar, readJsonAt } from '../Testing/hostFs'
import { seedPropertyBundle } from '../Testing/fixtures'
import { STASHED_AT } from '../Testing/definitions'
import { closeSession, openSession } from './session'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import { dropLiveTree, refreshTree } from './liveTree'
import { indexWrittenPages, seedContentIndex } from '../Index/indexSeed'
import { readRecord } from '../Bundles/record'
import { listBundles } from '../Bundles/bundle'
import { mutateRegistry, readRegistry } from '../Properties/propertiesRegistry'
import { sweepParse } from '../Files/pageFile'
import type { KeyCollision } from '../Files/rootValues'
import { contextsDir, contextsRegistryFile, nexusConfig, sidecarPath } from '../Paths/paths'
import { NEXUS_CONFIG_FILES, OWED_REL } from '../Paths/nexusPaths'
import { readJsonObject } from '../Files/atomicWrite'
import * as registryModule from '../Properties/registryProperty'
import { createProperty, renameProperty } from '../Properties/registryProperty'
import { mutateRegistryFile } from '../Contexts/contextsRegistry'
import { splitFrontmatter } from '../Files/pageFile'
import { deleteProperty } from '../Properties/deleteProperty'
import { deleteOption, renameOption } from '../Properties/optionOps'
import { unsweptLine } from './entities'
import { ensureContextsRegistry } from '../Contexts/contextsRegistry'
import { seedConfigSurfaces, viewOn } from '../Testing/configSurfaces'
import { finishOwed } from './finishOwed'
import { handleMutate } from './mutate'
import { readNotes, type Notes } from './owed'
import { ok } from '../Contract/result'
import * as reorder from './reorder'
import { setPanelContextOrder, setSpaceOrder } from './reorder'

vi.mock('../Properties/registryProperty', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../Properties/registryProperty')>()
  return { ...mod, removeFromRegistry: vi.fn(mod.removeFromRegistry) }
})

const roots: string[] = []
afterEach(async () => {
  dropLiveTree()
  installStores(NO_STORES)
  closeSession()
  for (const r of roots.splice(0)) {
    await chmod(join(r, 'Col'), 0o755).catch(() => {})
    await rm(r, { recursive: true, force: true })
  }
})

const PAGE_IDS = ['01ARZ3NDEKPSV4RRFFQ69G5FAA', '01ARZ3NDEKPSV4RRFFQ69G5FAB']
const TASK_PAGE = '01ARZ3NDEKPSV4RRFFQ69G5FAC'

async function seededRoot(): Promise<string> {
  const root = tempRoot('pom-finish-')
  roots.push(root)
  await mkdir(join(root, '.nexus'), { recursive: true })
  await writeFile(join(root, '.nexus', 'nexus.json'), JSON.stringify({ id: 'nx', createdAt: 'x' }))
  await writeFile(join(root, '.nexus', 'settings.json'), '{}')
  await mkdir(join(root, 'Col'), { recursive: true })
  await createProperty(root, {
    id: 'prop_s',
    label: 'Stage',
    type: 'select',
    select_options: [
      { id: 'opt_Draft', key: 'Draft', label: 'Draft' },
      { id: 'opt_Done', key: 'Done', label: 'Done' },
    ],
  })
  await writeFile(
    join(root, 'Col', '_pagecollection.json'),
    JSON.stringify({ id: 'c1', properties: ['prop_s'] }),
  )
  await writeFile(join(root, 'Col', 'A.md'), `---\nID: ${PAGE_IDS[0]}\nStage: Draft\n---\nbody\n`)
  await writeFile(join(root, 'Col', 'B.md'), `---\nID: ${PAGE_IDS[1]}\nStage: Draft\n---\nbody\n`)
  return root
}

const page = (root: string, name: string): Promise<string> =>
  readFile(join(root, 'Col', `${name}.md`), 'utf8')

const seedSpace = (root: string, raw: Record<string, unknown>): Promise<string> =>
  seedSpaceSidecar(root, 'Projects', 'Pommora', raw)

const seedNotes = (root: string, notes: Notes): Promise<void> =>
  putJson(join(root, OWED_REL), notes)

const RENAMED: Notes = { prop_s: { kind: 'property', rename: ['Stage'] } }
const DELETED: Notes = { prop_s: { kind: 'property', strip: ['Stage'] } }
const optionNote = (part: Record<string, unknown>): Notes =>
  ({ prop_s: { kind: 'property', options: part } }) as Notes

const relistOptions = (root: string, options: unknown[]) =>
  mutateRegistry(root, (registry) => ({
    next: {
      ...registry,
      defs: {
        ...registry.defs,
        prop_s: { ...registry.defs.prop_s, select_options: options },
      } as typeof registry.defs,
    },
    result: ok(null),
  }))

const relabel = (root: string, label: string, key = label, over: Record<string, unknown> = {}) =>
  mutateRegistry(root, (registry) => ({
    next: {
      ...registry,
      defs: { ...registry.defs, prop_s: { ...registry.defs.prop_s, label, key, ...over } },
    },
    result: ok(null),
  }))

const rekey = (content: string, from: string, to: string, collision: KeyCollision): string | null =>
  sweepParse(content)?.rekey(from, to, collision) ?? null

async function renameCrashState(root: string): Promise<void> {
  await seedNotes(root, RENAMED)
  await relabel(root, 'Phase')
  const half = rekey(await page(root, 'A'), 'Stage', 'Phase', 'prefer-new')
  if (half === null) throw new Error('fixture: half-fold produced nothing')
  await writeFile(join(root, 'Col', 'A.md'), half)
}

describe('the rename arm', () => {
  it('lands the exact disk an uninterrupted rename lands', async () => {
    const live = await seededRoot()
    await openSession(live)
    expect((await renameProperty(live, 'prop_s', 'Phase')).ok).toBe(true)
    const wantA = await page(live, 'A')
    const wantB = await page(live, 'B')
    closeSession()
    dropLiveTree()

    const crashed = await seededRoot()
    await renameCrashState(crashed)
    await openSession(crashed)
    await finishOwed(crashed)
    expect(await page(crashed, 'A')).toBe(wantA)
    expect(await page(crashed, 'B')).toBe(wantB)
    expect(await readNotes(crashed)).toEqual({})
  })

  it('a crash between a rename’s note and its list step owes nothing', async () => {
    const root = await seededRoot()
    const beforeA = await page(root, 'A')
    const beforeB = await page(root, 'B')
    await seedNotes(root, RENAMED)
    await openSession(root)
    await finishOwed(root)
    expect(await page(root, 'A')).toBe(beforeA)
    expect(await page(root, 'B')).toBe(beforeB)
    expect(await readNotes(root)).toEqual({})
  })

  it('finishing a re-planted entry changes nothing — twice equals once', async () => {
    const root = await seededRoot()
    await renameCrashState(root)
    await openSession(root)
    await finishOwed(root)
    const onceA = await page(root, 'A')
    const onceB = await page(root, 'B')
    await seedNotes(root, RENAMED)
    await finishOwed(root)
    expect(await page(root, 'A')).toBe(onceA)
    expect(await page(root, 'B')).toBe(onceB)
    expect(await readNotes(root)).toEqual({})
  })

  it('an entry finishes to the name the definition holds after a chained rename', async () => {
    const root = await seededRoot()
    for (const [name, id] of [
      ['A', PAGE_IDS[0]],
      ['B', PAGE_IDS[1]],
    ])
      await writeFile(join(root, 'Col', `${name}.md`), `---\nID: ${id}\nStatus: Draft\n---\nbody\n`)
    await relabel(root, 'Phase')
    await seedNotes(root, { prop_s: { kind: 'property', rename: ['Status', 'Stage'] } })
    await openSession(root)
    await finishOwed(root)
    expect(await page(root, 'A')).toBe(`---\nID: ${PAGE_IDS[0]}\nPhase: Draft\n---\nbody\n`)
    expect(await page(root, 'B')).toBe(`---\nID: ${PAGE_IDS[1]}\nPhase: Draft\n---\nbody\n`)
    expect(await readNotes(root)).toEqual({})
  })

  it('an owed case-only rename sweeps its holders and clears', async () => {
    const root = await seededRoot()
    await relabel(root, 'stage')
    await seedNotes(root, RENAMED)
    await openSession(root)
    await finishOwed(root)
    expect(await page(root, 'A')).toBe(`---\nID: ${PAGE_IDS[0]}\nstage: Draft\n---\nbody\n`)
    expect(await page(root, 'B')).toBe(`---\nID: ${PAGE_IDS[1]}\nstage: Draft\n---\nbody\n`)
    expect(await readNotes(root)).toEqual({})
  })

  it('an owed Key Format change sweeps its holders from the label onto the key and clears', async () => {
    const root = await seededRoot()
    for (const [name, id] of [
      ['A', PAGE_IDS[0]],
      ['B', PAGE_IDS[1]],
    ])
      await writeFile(join(root, 'Col', `${name}.md`), `---\nID: ${id}\nTags: Draft\n---\nbody\n`)
    await relabel(root, 'Tags', 'tags', { key_format: 'lowercase' })
    await seedNotes(root, { prop_s: { kind: 'property', rename: ['Tags'] } })
    await openSession(root)
    await finishOwed(root)
    expect(await page(root, 'A')).toBe(`---\nID: ${PAGE_IDS[0]}\ntags: Draft\n---\nbody\n`)
    expect(await page(root, 'B')).toBe(`---\nID: ${PAGE_IDS[1]}\ntags: Draft\n---\nbody\n`)
    expect(await readNotes(root)).toEqual({})
  })

  it('the divergence persists without the finish — the fixture is not self-healing', async () => {
    const root = await seededRoot()
    await renameCrashState(root)
    expect((await readRegistry(root)).defs.prop_s?.label).toBe('Phase')
    expect(await page(root, 'B')).toContain('Stage: Draft')
  })
})

describe('the delete arm', () => {
  it('a crash between the delete’s note and its list step finishes the delete', async () => {
    const live = await seededRoot()
    await openSession(live)
    expect((await deleteProperty(live, 'prop_s')).ok).toBe(true)
    const wantA = await page(live, 'A')
    const wantB = await page(live, 'B')
    closeSession()
    dropLiveTree()

    // The crash state: bundle minted and note written, then death before the list step — the def, the assignment, and both pages still standing.
    const crashed = await seededRoot()
    const def = (await readRegistry(crashed)).defs.prop_s
    await seedPropertyBundle(crashed, {
      entity: 'property',
      id: 'prop_s',
      def,
      values: { [PAGE_IDS[0]]: 'Draft', [PAGE_IDS[1]]: 'Draft' },
      assignments: ['c1'],
    })
    await seedNotes(crashed, DELETED)
    await openSession(crashed)
    await finishOwed(crashed)
    expect(await page(crashed, 'A')).toBe(wantA)
    expect(await page(crashed, 'B')).toBe(wantB)
    expect((await readRegistry(crashed)).defs.prop_s).toBeUndefined()
    const sidecar = await readJsonObject(sidecarPath(join(crashed, 'Col'), 'collection'))
    expect((sidecar?.properties as string[] | undefined) ?? []).toEqual([])
    expect(await listBundles(crashed, { kind: 'trash' })).toHaveLength(1)
    expect(await readNotes(crashed)).toEqual({})
  })

  it('the delete arm reaches a Space sidecar', async () => {
    const root = await seededRoot()
    const file = await seedSpace(root, { id: 'sp1', Stage: ['Draft'], $order: ['prop_s'] })
    await seedNotes(root, DELETED)
    await openSession(root)
    await finishOwed(root)
    const raw = await readJsonAt(file)
    expect('Stage' in raw).toBe(false)
    expect('$order' in raw).toBe(false)
  })

  it('strips the pages the live delete strips, leaving an ID-less holder byte-identical', async () => {
    const root = await seededRoot()
    const idless = '---\nStage: Draft\n---\nbody\n'
    await writeFile(join(root, 'Col', 'C.md'), idless)
    await seedNotes(root, DELETED)
    await openSession(root)
    await finishOwed(root)
    expect(await page(root, 'A')).toBe(`---\nID: ${PAGE_IDS[0]}\n---\nbody\n`)
    expect(await page(root, 'B')).toBe(`---\nID: ${PAGE_IDS[1]}\n---\nbody\n`)
    expect(await page(root, 'C')).toBe(idless)
  })

  it('an entry left beside a create in another casing strips its own key, leaving that casing’s holders byte-identical', async () => {
    const root = await seededRoot()
    await writeFile(join(root, 'Col', 'A.md'), `---\nID: ${PAGE_IDS[0]}\nExample: 1\n---\nbody\n`)
    await writeFile(join(root, 'Col', 'B.md'), `---\nID: ${PAGE_IDS[1]}\nexample: 2\n---\nbody\n`)
    expect((await createProperty(root, { label: 'example', type: 'number' })).ok).toBe(true)
    await seedNotes(root, { prop_gone: { kind: 'property', strip: ['Example'] } })
    const before = await page(root, 'B')
    await openSession(root)
    await finishOwed(root)
    expect(await page(root, 'A')).toBe(`---\nID: ${PAGE_IDS[0]}\n---\nbody\n`)
    expect(await page(root, 'B')).toBe(before)
    expect(await readNotes(root)).toEqual({})
  })

  it('a live definition holding a strip part keeps its Collections', async () => {
    const root = await seededRoot()
    await seedNotes(root, { prop_s: { kind: 'property', strip: ['Priority'] } })
    const before = await page(root, 'A')
    await openSession(root)
    await finishOwed(root)
    expect(await page(root, 'A')).toBe(before)
    expect((await readRegistry(root)).defs.prop_s).toBeDefined()
    const sidecar = await readJsonObject(sidecarPath(join(root, 'Col'), 'collection'))
    expect(sidecar?.properties).toEqual(['prop_s'])
    expect(await readNotes(root)).toEqual({})
  })

  it('a name a live definition holds is skipped and dropped', async () => {
    const root = await seededRoot()
    await seedNotes(root, { prop_gone: { kind: 'property', strip: ['Stage'] } })
    const before = await page(root, 'A')
    await openSession(root)
    await finishOwed(root)
    expect(await page(root, 'A')).toBe(before)
    expect((await readRegistry(root)).defs.prop_s).toBeDefined()
    expect(await readNotes(root)).toEqual({})
  })

  it.skipIf(noModeBits)('a registry that can’t be written counts one missed file', async () => {
    const root = await seededRoot()
    await openSession(root)
    await readRegistry(root)
    await seedNotes(root, DELETED)
    const registry = join(root, '.nexus', 'properties.json')
    // An unreadable list is the case under test.
    await chmod(registry, 0o000)
    try {
      const report = await finishOwed(root)
      expect(report).toMatchObject({ owed: true, warning: unsweptLine(1) })
    } finally {
      await chmod(registry, 0o644)
    }
    expect(await page(root, 'A')).toContain('Stage: Draft')
    expect(await page(root, 'B')).toContain('Stage: Draft')
    expect(await readNotes(root)).toEqual(DELETED)
  })

  it('an entry whose finish throws counts as missed', async () => {
    const root = await seededRoot()
    await seedNotes(root, DELETED)
    await openSession(root)
    vi.mocked(registryModule.removeFromRegistry).mockRejectedValueOnce(new Error('boom'))
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    const report = await finishOwed(root)
    logged.mockRestore()
    expect(report).toMatchObject({ owed: true, warning: 'Couldn’t update 1 Item.' })
    expect(await readNotes(root)).toEqual(DELETED)
  })
})

describe('the option arms', () => {
  it('an option rename lands the disk an uninterrupted rename lands', async () => {
    const live = await seededRoot()
    await openSession(live)
    expect((await renameOption(live, 'prop_s', 'opt_Draft', 'Queued')).ok).toBe(true)
    const wantA = await page(live, 'A')
    const wantB = await page(live, 'B')
    closeSession()
    dropLiveTree()

    const crashed = await seededRoot()
    await seedNotes(crashed, optionNote({ opt_Draft: { rename: ['Draft'] } }))
    await relistOptions(crashed, [
      { id: 'opt_Draft', key: 'Queued', label: 'Queued' },
      { id: 'opt_Done', key: 'Done', label: 'Done' },
    ])
    await writeFile(join(crashed, 'Col', 'A.md'), wantA)
    await openSession(crashed)
    await finishOwed(crashed)
    expect(await page(crashed, 'A')).toBe(wantA)
    expect(await page(crashed, 'B')).toBe(wantB)
    expect(await readNotes(crashed)).toEqual({})
  })

  it('an option rename whose list step never landed clears untouched', async () => {
    const root = await seededRoot()
    await seedNotes(root, optionNote({ opt_Draft: { rename: ['Draft'] } }))
    const before = await page(root, 'A')
    await openSession(root)
    await finishOwed(root)
    expect(await page(root, 'A')).toBe(before)
    expect(await readNotes(root)).toEqual({})
  })

  it('a word another option holds now is skipped and dropped', async () => {
    const root = await seededRoot()
    await relistOptions(root, [
      { id: 'opt_Draft', key: 'Queued', label: 'Queued' },
      { id: 'opt_Done', key: 'Done', label: 'Done' },
    ])
    await seedNotes(root, optionNote({ opt_Draft: { rename: ['Done'] } }))
    const before = await page(root, 'A')
    await openSession(root)
    await finishOwed(root)
    expect(await page(root, 'A')).toBe(before)
    expect(await readNotes(root)).toEqual({})
  })

  it('an option delete whose list step never landed drops the option and strips its pages', async () => {
    const live = await seededRoot()
    await openSession(live)
    expect((await deleteOption(live, 'prop_s', 'opt_Draft')).ok).toBe(true)
    const wantA = await page(live, 'A')
    const wantB = await page(live, 'B')
    const wantOptions = (await readRegistry(live)).defs.prop_s?.select_options
    closeSession()
    dropLiveTree()

    const crashed = await seededRoot()
    await seedNotes(crashed, optionNote({ opt_Draft: { strip: ['Draft'] } }))
    await openSession(crashed)
    await finishOwed(crashed)
    expect(await page(crashed, 'A')).toBe(wantA)
    expect(await page(crashed, 'B')).toBe(wantB)
    expect((await readRegistry(crashed)).defs.prop_s?.select_options).toEqual(wantOptions)
    expect(await readNotes(crashed)).toEqual({})
  })

  it('an option rename reaches a Space sidecar', async () => {
    const root = await seededRoot()
    const file = await seedSpace(root, { id: 'sp1', Stage: ['Draft'] })
    await seedNotes(root, optionNote({ opt_Draft: { rename: ['Draft'] } }))
    await relistOptions(root, [
      { id: 'opt_Draft', key: 'Queued', label: 'Queued' },
      { id: 'opt_Done', key: 'Done', label: 'Done' },
    ])
    await openSession(root)
    await finishOwed(root)
    expect((await readJsonAt(file)).Stage).toEqual(['Queued'])
  })

  it('an option delete reaches a Space sidecar', async () => {
    const root = await seededRoot()
    const file = await seedSpace(root, { id: 'sp1', Stage: ['Draft'] })
    await seedNotes(root, optionNote({ opt_Draft: { strip: ['Draft'] } }))
    await openSession(root)
    await finishOwed(root)
    expect('Stage' in (await readJsonAt(file))).toBe(false)
  })

  it.skipIf(noModeBits)(
    'an option part sweeps while its property’s rename is owed and stays whole',
    async () => {
      const root = await seededRoot()
      await writeFile(join(root, 'Col', 'A.md'), `---\nID: ${PAGE_IDS[0]}\nStage: Old\n---\nbody\n`)
      await mkdir(join(root, 'Col', 'Locked'))
      await writeFile(
        join(root, 'Col', 'Locked', '_pageset.json'),
        JSON.stringify({ id: 'set_locked' }),
      )
      await rm(join(root, 'Col', 'B.md'))
      const locked = join(root, 'Col', 'Locked', 'B.md')
      await writeFile(locked, `---\nID: ${PAGE_IDS[1]}\nStatus: Old\n---\nbody\n`)
      const owed: Notes = {
        prop_s: {
          kind: 'property',
          rename: ['Status'],
          options: { opt_Draft: { rename: ['Old'] } },
        },
      }
      await seedNotes(root, owed)
      await openSession(root)
      await chmod(join(root, 'Col', 'Locked'), 0o555)
      try {
        expect((await finishOwed(root)).owed).toBe(true)
      } finally {
        await chmod(join(root, 'Col', 'Locked'), 0o755)
      }
      expect(await page(root, 'A')).toContain('Draft')
      expect(await page(root, 'A')).not.toContain('Old')
      expect(await readNotes(root)).toEqual(owed)
      await finishOwed(root)
      expect(await readFile(locked, 'utf8')).toContain('Stage:')
      expect(await readFile(locked, 'utf8')).toContain('Draft')
      expect(await readNotes(root)).toEqual({})
    },
  )
})

describe('the option arms reach saved views', () => {
  it('an entry of two words rewrites both on every page and leaves the views as written', async () => {
    const root = await seededRoot()
    const surfaces = await seedConfigSurfaces(
      root,
      join(root, 'Col'),
      viewOn('prop_s', 'opt_Draft'),
    )
    await writeFile(join(root, 'Col', 'B.md'), `---\nID: ${PAGE_IDS[1]}\nStage: Todo\n---\nbody\n`)
    await seedNotes(
      root,
      optionNote({ opt_Draft: { rename: ['Draft'] }, opt_Done: { rename: ['Todo'] } }),
    )
    await relistOptions(root, [
      { id: 'opt_Draft', key: 'Queued', label: 'Queued' },
      { id: 'opt_Done', key: 'Later', label: 'Later' },
    ])
    const before = await surfaces.read()
    await openSession(root)
    await finishOwed(root)
    expect(await page(root, 'A')).toBe(`---\nID: ${PAGE_IDS[0]}\nStage:\n  - Queued\n---\nbody\n`)
    expect(await page(root, 'B')).toBe(`---\nID: ${PAGE_IDS[1]}\nStage:\n  - Later\n---\nbody\n`)
    expect(await surfaces.read()).toEqual(before)
    expect(await readNotes(root)).toEqual({})
  })

  it('an option delete with clean pages strips a view still holding the option, then drops it', async () => {
    const root = await seededRoot()
    const surfaces = await seedConfigSurfaces(
      root,
      join(root, 'Col'),
      viewOn('prop_s', 'opt_Draft'),
    )
    await writeFile(join(root, 'Col', 'A.md'), `---\nID: ${PAGE_IDS[0]}\n---\nbody\n`)
    await writeFile(join(root, 'Col', 'B.md'), `---\nID: ${PAGE_IDS[1]}\n---\nbody\n`)
    await seedNotes(root, optionNote({ opt_Draft: { strip: ['Draft'] } }))
    await openSession(root)
    await finishOwed(root)
    const views = await surfaces.read()
    expect(views.set).not.toHaveProperty('filter')
    expect(views.tile.hidden_groups).toEqual([])
    expect(views.matrix).toBeNull()
    expect((await readRegistry(root)).defs.prop_s?.select_options).toEqual([
      { id: 'opt_Done', key: 'Done', label: 'Done' },
    ])
    expect(await readNotes(root)).toEqual({})
  })
})

describe('unreadable holders keep the entry', () => {
  it.skipIf(noModeBits)(
    'a delete that cannot read one holder keeps its entry, and the finish heals it later',
    async () => {
      const root = await seededRoot()
      await openSession(root)
      await chmod(join(root, 'Col', 'B.md'), 0o000)
      expect((await deleteProperty(root, 'prop_s')).ok).toBe(true)
      expect((await readRegistry(root)).defs.prop_s).toBeUndefined()
      expect(await readNotes(root)).toEqual(DELETED)
      await finishOwed(root)
      expect(await readNotes(root)).toEqual(DELETED)
      await chmod(join(root, 'Col', 'B.md'), 0o644)
      await finishOwed(root)
      expect(await page(root, 'B')).not.toContain('Stage')
      expect(await readNotes(root)).toEqual({})
    },
  )

  it.skipIf(noModeBits)(
    'with a warm index, a holder the watcher found unreadable still keeps the entry, and its bundle holds its value from the index',
    async () => {
      const root = await seededRoot()
      await openSession(root)
      installStores(memoryStores().stores)
      await seedContentIndex(root)
      const b = join(root, 'Col', 'B.md')
      await chmod(b, 0o000)
      await indexWrittenPages(root, [{ absPath: b }])
      const deleted = await deleteProperty(root, 'prop_s')
      await chmod(b, 0o644)
      if (!deleted.ok) throw new Error('delete refused')
      expect(deleted.value.cascade).toMatchObject({ owed: true })
      expect(await readNotes(root)).toEqual(DELETED)
      const record = await readRecord(join(root, deleted.value.bundled?.bundlePath ?? ''))
      expect(record).toMatchObject({ values: { [PAGE_IDS[1]]: 'Draft' } })
      expect(record).not.toHaveProperty('partial')
      await indexWrittenPages(root, [{ absPath: b }])
      await finishOwed(root)
      expect(await page(root, 'B')).not.toContain('Stage')
      expect(await readNotes(root)).toEqual({})
    },
  )
})

describe('an owed Collection', () => {
  it.skipIf(noModeBits)(
    'an owed Collection refills while it assigns the property and is stashed and stripped while it doesn’t',
    async () => {
      const root = await seededRoot()
      await writeFile(
        join(root, 'Col', '_pagecollection.json'),
        JSON.stringify({
          id: 'c1',
          properties: ['prop_s'],
          property_stash: {
            prop_s: { removed_at: STASHED_AT, values: { [PAGE_IDS[0]]: 'Done' } },
          },
        }),
      )
      await writeFile(join(root, 'Col', 'A.md'), `---\nID: ${PAGE_IDS[0]}\n---\nbody\n`)
      await mkdir(join(root, 'Tasks'))
      await writeFile(join(root, 'Tasks', '_pagecollection.json'), JSON.stringify({ id: 'c2' }))
      await writeFile(
        join(root, 'Tasks', 'T.md'),
        `---\nID: ${TASK_PAGE}\nStage: Draft\n---\nbody\n`,
      )
      await seedNotes(root, { prop_s: { kind: 'property', collections: ['c1', 'c2'] } })
      await openSession(root)
      await refreshTree(root)
      await chmod(join(root, 'Col', 'A.md'), 0o000)
      const first = await finishOwed(root).finally(() => chmod(join(root, 'Col', 'A.md'), 0o644))
      expect(first.owed).toBe(true)
      expect(await readFile(join(root, 'Tasks', 'T.md'), 'utf8')).not.toContain('Stage')
      expect(
        (await readJsonAt(join(root, 'Tasks', '_pagecollection.json'))).property_stash,
      ).toMatchObject({ prop_s: { values: { [TASK_PAGE]: 'Draft' } } })
      expect(await readNotes(root)).toEqual({ prop_s: { kind: 'property', collections: ['c1'] } })
      await finishOwed(root)
      expect(splitFrontmatter(await page(root, 'A')).Stage).toBe('Done')
      expect(await readNotes(root)).toEqual({})
    },
  )
})

describe('an unreadable Space sidecar', () => {
  it.skipIf(noModeBits)(
    'is counted once by a delete, though its board is reached too',
    async () => {
      const root = await seededRoot()
      await mkdir(join(root, '.nexus', 'contexts'), { recursive: true })
      await ensureContextsRegistry(root)
      const sidecar = await seedSpace(root, { id: 'sp_1', Stage: 'Draft' })
      await chmod(sidecar, 0o000)
      try {
        await openSession(root)
        const deleted = await deleteProperty(root, 'prop_s')
        expect(deleted.ok && deleted.value.cascade?.warning).toBe(unsweptLine(1))
      } finally {
        await chmod(sidecar, 0o644)
      }
    },
  )
})

describe('the index seam', () => {
  it('the open finishes an owed rename once the index is seeded, and an unindexed holder is outside its sweep', async () => {
    const root = await seededRoot()
    await openSession(root)
    installStores(memoryStores().stores)
    await seedContentIndex(root)
    // C landed after the seed with no index row — the queried holder set cannot name it.
    await writeFile(
      join(root, 'Col', 'C.md'),
      '---\nID: 01ARZ3NDEKPSV4RRFFQ69G5FAC\nStage: Draft\n---\nbody\n',
    )
    await renameCrashState(root)
    await finishOwed(root)
    expect(await page(root, 'A')).toContain('Phase: Draft')
    expect(await page(root, 'B')).toContain('Phase: Draft')
    expect(await page(root, 'C')).toContain('Stage: Draft')
    expect(await readNotes(root)).toEqual({})
  })

  it('cold, the corpus fallback reaches every holder', async () => {
    const root = await seededRoot()
    await writeFile(
      join(root, 'Col', 'C.md'),
      '---\nID: 01ARZ3NDEKPSV4RRFFQ69G5FAC\nStage: Draft\n---\nbody\n',
    )
    await renameCrashState(root)
    await openSession(root)
    await finishOwed(root)
    expect(await page(root, 'C')).toContain('Phase: Draft')
    expect(await readNotes(root)).toEqual({})
  })
})

describe('Try Again', () => {
  it.skipIf(noModeBits)(
    'Try Again finishes every entry and reports one combined count',
    async () => {
      const root = await seededRoot()
      await createProperty(root, { id: 'prop_t', label: 'New', type: 'text' })
      await relabel(root, 'Phase')
      await writeFile(join(root, 'Col', 'B.md'), `---\nID: ${PAGE_IDS[1]}\nOld: x\n---\nbody\n`)
      const owed: Notes = {
        prop_s: { kind: 'property', rename: ['Stage'] },
        prop_t: { kind: 'property', rename: ['Old'] },
      }
      await seedNotes(root, owed)
      await openSession(root)
      await chmod(join(root, 'Col'), 0o555)
      try {
        const missed = await handleMutate(root, { op: 'finishOwed' })
        expect(missed.ok && missed.value.cascade).toMatchObject({
          owed: true,
          warning: unsweptLine(2),
        })
      } finally {
        await chmod(join(root, 'Col'), 0o755)
      }
      expect(await readNotes(root)).toEqual(owed)
      const done = await handleMutate(root, { op: 'finishOwed' })
      expect(done.ok && done.value.cascade?.owed).toBeFalsy()
      expect(await page(root, 'A')).toContain('Phase: Draft')
      expect(await page(root, 'B')).toContain('New: x')
      expect(await readNotes(root)).toEqual({})
    },
  )
})

describe('the Context and Space rename arms', () => {
  const ventures = { ctx_projects: { kind: 'context', rename: ['Projects'] } }
  const spaceOwed = (old: string) => ({
    'sp-pom': { kind: 'space', contextId: 'ctx_projects', rename: [old] },
  })

  async function seedContexts(): Promise<string> {
    const root = tempRoot('pom-finish-ctx-')
    roots.push(root)
    await mkdir(contextsDir(root), { recursive: true })
    await writeFile(
      contextsRegistryFile(root),
      JSON.stringify({
        contexts: [{ id: 'ctx_projects', title: 'Projects', singular: 'Project' }],
      }),
    )
    await mkdir(join(contextsDir(root), 'Projects', 'Pommora'), { recursive: true })
    await writeFile(
      join(contextsDir(root), 'Projects', 'Pommora', '_space.json'),
      JSON.stringify({ id: 'sp-pom' }),
    )
    await mkdir(join(root, 'Notes'), { recursive: true })
    await writeFile(join(root, 'Notes', '_pagecollection.json'), JSON.stringify({ id: 'c-notes' }))
    await writeFile(join(root, 'Notes', 'A.md'), '---\nid: p1\n<Projects>:\n  - Pommora\n---\nbody')
    await openSession(root)
    return root
  }
  const tags = async (root: string): Promise<Record<string, unknown>> =>
    splitFrontmatter(await readFile(join(root, 'Notes', 'A.md'), 'utf8')) as Record<string, unknown>
  const titleOf = async (root: string): Promise<string | undefined> =>
    (
      await readJsonAt<{ contexts: { id: string; title: string }[] }>(contextsRegistryFile(root))
    ).contexts.find((c) => c.id === 'ctx_projects')?.title
  const retitle = (root: string, title: string) =>
    mutateRegistryFile(root, (cur) => ({
      ...cur,
      contexts: cur.contexts.map((c) => (c.id === 'ctx_projects' ? { ...c, title } : c)),
    }))
  const finishSeeded = async (root: string, notes: Record<string, unknown>) => {
    await putJson(join(root, OWED_REL), notes)
    await refreshTree(root)
    return finishOwed(root)
  }

  it('a crash after a Context rename’s list step moves the folder and every holder takes the new key', async () => {
    const root = await seedContexts()
    await retitle(root, 'Ventures')
    await finishSeeded(root, ventures)
    expect(await readdir(contextsDir(root))).toContain('Ventures')
    expect((await tags(root))['<Ventures>']).toEqual(['Pommora'])
    expect(await titleOf(root)).toBe('Ventures')
    expect(await readNotes(root)).toEqual({})
  })

  it('finishing twice equals once', async () => {
    const root = await seedContexts()
    await retitle(root, 'Ventures')
    await finishSeeded(root, ventures)
    await finishOwed(root)
    expect((await tags(root))['<Ventures>']).toEqual(['Pommora'])
    expect(await readNotes(root)).toEqual({})
  })

  it('a Context whose new title’s folder is taken keeps its folder and owes its rename', async () => {
    const root = await seedContexts()
    await retitle(root, 'Ventures')
    await mkdir(join(contextsDir(root), 'Ventures', 'Stray'), { recursive: true })
    await finishSeeded(root, ventures)
    expect(await readdir(join(contextsDir(root), 'Projects'))).toEqual(['Pommora'])
    expect(await readNotes(root)).toEqual(ventures)
  })

  it('a crash between a Context rename’s note and its list step owes nothing', async () => {
    const root = await seedContexts()
    const before = await readFile(join(root, 'Notes', 'A.md'), 'utf8')
    await finishSeeded(root, ventures)
    expect(await readFile(join(root, 'Notes', 'A.md'), 'utf8')).toBe(before)
    expect(await titleOf(root)).toBe('Projects')
    expect(await readNotes(root)).toEqual({})
  })

  it('an old title no file holds clears, every page as it was', async () => {
    const root = await seedContexts()
    const before = await readFile(join(root, 'Notes', 'A.md'), 'utf8')
    await finishSeeded(root, { ctx_projects: { kind: 'context', rename: ['SomethingElse'] } })
    expect(await readFile(join(root, 'Notes', 'A.md'), 'utf8')).toBe(before)
    expect(await titleOf(root)).toBe('Projects')
    expect(await readNotes(root)).toEqual({})
  })

  it('an absent Context registry drops the entry', async () => {
    const root = await seedContexts()
    await rm(contextsRegistryFile(root))
    await finishSeeded(root, ventures)
    expect(await readNotes(root)).toEqual({})
  })

  it('a Space title another Space holds now is skipped and dropped', async () => {
    const root = await seedContexts()
    const projects = (title: string) => join(contextsDir(root), 'Projects', title)
    await rename(projects('Pommora'), projects('Pommora 2'))
    await mkdir(projects('Pommora'), { recursive: true })
    await writeFile(join(projects('Pommora'), '_space.json'), JSON.stringify({ id: 'sp-new' }))
    await finishSeeded(root, spaceOwed('Pommora'))
    expect((await tags(root))['<Projects>']).toEqual(['Pommora'])
    expect(await readNotes(root)).toEqual({})
  })

  it('a Space rename crashed before its sweep finishes onto the title the Space holds', async () => {
    const root = await seedContexts()
    const projects = (title: string) => join(contextsDir(root), 'Projects', title)
    await rename(projects('Pommora'), projects('Pommora 2'))
    await finishSeeded(root, spaceOwed('Pommora'))
    expect((await tags(root))['<Projects>']).toEqual(['Pommora 2'])
    expect(await readNotes(root)).toEqual({})
  })

  it('a Space already moved in another case has its holders retitled', async () => {
    const root = await seedContexts()
    const projects = (title: string) => join(contextsDir(root), 'Projects', title)
    await rename(projects('Pommora'), projects('pommora'))
    await finishSeeded(root, spaceOwed('Pommora'))
    expect((await tags(root))['<Projects>']).toEqual(['pommora'])
    expect(await readNotes(root)).toEqual({})
  })

  it('a Context committed and moved in another case has its key rewritten', async () => {
    const root = await seedContexts()
    await retitle(root, 'projects')
    await rename(join(contextsDir(root), 'Projects'), join(contextsDir(root), 'projects'))
    await finishSeeded(root, ventures)
    expect(await readdir(contextsDir(root))).toContain('projects')
    expect(Object.keys(await tags(root))).toEqual(['id', '<projects>'])
    expect(await readNotes(root)).toEqual({})
  })

  it('a case-only Space or Context rename crashed before its list step owes nothing', async () => {
    const root = await seedContexts()
    await finishSeeded(root, {
      ...spaceOwed('pommora'),
      ctx_projects: { kind: 'context', rename: ['projects'] },
    })
    expect(Object.keys(await tags(root))).toEqual(['id', '<Projects>'])
    expect((await tags(root))['<Projects>']).toEqual(['Pommora'])
    expect(await readNotes(root)).toEqual({})
  })

  it('a Context delete whose order drop failed after its folder moved drops it at the finish', async () => {
    const root = await seedContexts()
    await setPanelContextOrder(root, ['ctx_projects', 'ctx_other'])
    await setSpaceOrder(root, 'ctx_projects', ['sp-pom'])
    await refreshTree(root)
    vi.spyOn(reorder, 'dropDeparture').mockRejectedValueOnce(new Error('the order write failed'))
    const r = await handleMutate(root, {
      op: 'delete',
      path: '.nexus/contexts/Projects',
      kind: 'context',
    })
    expect(r.ok).toBe(false)
    expect(await readdir(contextsDir(root))).not.toContain('Projects')
    await finishOwed(root)
    expect(
      (
        await readJsonAt<{ order: Record<string, unknown> }>(
          nexusConfig(root, NEXUS_CONFIG_FILES.state),
        )
      ).order,
    ).toEqual({ contexts: ['ctx_other'], spaces: {} })
    expect(await readNotes(root)).toEqual({})
  })

  it('a Space delete whose order drop failed after its folder moved drops it at the finish', async () => {
    const root = await seedContexts()
    await setSpaceOrder(root, 'ctx_projects', ['sp-pom', 'sp-other'])
    await refreshTree(root)
    vi.spyOn(reorder, 'dropDeparture').mockRejectedValueOnce(new Error('the order write failed'))
    const r = await handleMutate(root, {
      op: 'delete',
      path: '.nexus/contexts/Projects/Pommora',
      kind: 'space',
    })
    expect(r.ok).toBe(false)
    expect(await readdir(join(contextsDir(root), 'Projects'))).not.toContain('Pommora')
    await finishOwed(root)
    expect(
      (
        await readJsonAt<{ order: Record<string, unknown> }>(
          nexusConfig(root, NEXUS_CONFIG_FILES.state),
        )
      ).order,
    ).toEqual({ spaces: { ctx_projects: ['sp-other'] } })
    expect(await readNotes(root)).toEqual({})
  })
})

describe('a page only a fix by hand reaches', () => {
  it.skipIf(noModeBits)(
    'a finish that missed only refused pages lets the entry go, and one that missed an unreadable page doesn’t',
    async () => {
      const root = await seededRoot()
      const odd = join(root, 'Col', 'Odd.md')
      const text = '---\nID: 01ARZ3NDEKPSV4RRFFQ69G5FAC\nPhase:\n\t- Draft\n---\nbody\n'
      await writeFile(odd, text)
      await openSession(root)
      await putJson(join(root, OWED_REL), { prop_s: { kind: 'property', rename: ['Phase'] } })
      const report = await finishOwed(root)
      expect(report.warning).toBe('Couldn’t safely rewrite “Odd”.')
      expect(report).not.toHaveProperty('owed')
      expect(await readNotes(root)).toEqual({})
      expect(await readFile(odd, 'utf8')).toBe(text)

      const shut = join(root, 'Col', 'C.md')
      await writeFile(shut, '---\nID: 01ARZ3NDEKPSV4RRFFQ69G5FAD\nPhase: Draft\n---\nbody\n')
      await putJson(join(root, OWED_REL), { prop_s: { kind: 'property', rename: ['Phase'] } })
      await chmod(shut, 0o000)
      try {
        expect((await finishOwed(root)).owed).toBe(true)
        expect(await readNotes(root)).toEqual({ prop_s: { kind: 'property', rename: ['Phase'] } })
      } finally {
        await chmod(shut, 0o644)
      }
    },
  )
})
