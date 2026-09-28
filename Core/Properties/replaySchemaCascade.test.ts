// The crash-window suite: each window is the exact on-disk state a killed op leaves, and the replay must land the same disk an uninterrupted op lands.

import { describe, it, expect, afterEach } from 'vitest'
import { chmod, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { tempRoot, noModeBits, seedSpaceSidecar, readJsonAt } from '../Testing/hostFs'
import type { PropertyDefinition } from './properties'
import { closeSession, openSession } from '../Nexus/session'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import { dropLiveTree } from '../Nexus/liveTree'
import { indexWrittenPage, seedContentIndex } from '../Index/indexSeed'
import { readRecord, writePropertyBundle } from '../Trash/record'
import { listBundles } from '../Trash/holdings'
import { mutateRegistry, readRegistry } from './propertiesRegistry'
import { renameFrontmatterKey } from '../Files/pageFile'
import { readSidecar } from '../Files/sidecar'
import { pageCollectionSidecar } from '../Nexus/schemas'
import { createProperty, renameProperty } from './registryProperty'
import { deleteProperty } from './deleteProperty'
import { removeOption, renameOption } from './optionOps'
import { readSchemaJournal, writeSchemaJournal } from './propertyJournal'
import { replaySchemaCascade } from './replaySchemaCascade'
import { unsweptLine } from './governedSweep'
import { ensureContextsRegistry } from '../Contexts/contextsRegistry'
import { seedConfigSurfaces, viewOn } from '../Testing/configSurfaces'

const roots: string[] = []
afterEach(async () => {
  dropLiveTree()
  installStores(NO_STORES)
  closeSession()
  for (const r of roots.splice(0)) await rm(r, { recursive: true, force: true })
})

const PAGE_IDS = ['01ARZ3NDEKPSV4RRFFQ69G5FAA', '01ARZ3NDEKPSV4RRFFQ69G5FAB']

async function seedNexus(): Promise<string> {
  const root = tempRoot('pom-replay-')
  roots.push(root)
  await mkdir(join(root, '.nexus'), { recursive: true })
  await writeFile(join(root, '.nexus', 'nexus.json'), JSON.stringify({ id: 'nx', createdAt: 'x' }))
  await writeFile(join(root, '.nexus', 'settings.json'), '{}')
  await mkdir(join(root, 'Col'), { recursive: true })
  await createProperty(root, {
    id: 'prop_s',
    name: 'Stage',
    type: 'select',
    select_options: [{ value: 'Draft' }, { value: 'Done' }],
  } as PropertyDefinition)
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

async function renameCrashState(root: string): Promise<void> {
  await writeSchemaJournal(root, { op: 'rename', id: 'prop_s', from: 'Stage', to: 'Phase' })
  await mutateRegistry(root, (registry) => ({
    next: {
      ...registry,
      defs: { ...registry.defs, prop_s: { ...registry.defs.prop_s, name: 'Phase' } },
    },
    result: null,
  }))
  const half = renameFrontmatterKey(await page(root, 'A'), 'Stage', 'Phase', 'prefer-new')
  if (half === null) throw new Error('fixture: half-fold produced nothing')
  await writeFile(join(root, 'Col', 'A.md'), half)
}

describe('rename replay', () => {
  it('lands the exact disk an uninterrupted rename lands', async () => {
    const live = await seedNexus()
    await openSession(live)
    expect((await renameProperty(live, 'prop_s', 'Phase')).ok).toBe(true)
    const wantA = await page(live, 'A')
    const wantB = await page(live, 'B')
    closeSession()
    dropLiveTree()

    const crashed = await seedNexus()
    await renameCrashState(crashed)
    await openSession(crashed)
    await replaySchemaCascade(crashed)
    expect(await page(crashed, 'A')).toBe(wantA)
    expect(await page(crashed, 'B')).toBe(wantB)
    expect(await readSchemaJournal(crashed)).toBeNull()
  })

  it('a record whose commit never landed clears with every page byte untouched', async () => {
    const root = await seedNexus()
    const beforeA = await page(root, 'A')
    const beforeB = await page(root, 'B')
    await writeSchemaJournal(root, { op: 'rename', id: 'prop_s', from: 'Stage', to: 'Phase' })
    await openSession(root)
    await replaySchemaCascade(root)
    expect(await page(root, 'A')).toBe(beforeA)
    expect(await page(root, 'B')).toBe(beforeB)
    expect(await readSchemaJournal(root)).toBeNull()
  })

  it('replaying a re-planted record changes nothing — twice equals once', async () => {
    const root = await seedNexus()
    await renameCrashState(root)
    await openSession(root)
    await replaySchemaCascade(root)
    const onceA = await page(root, 'A')
    const onceB = await page(root, 'B')
    await writeSchemaJournal(root, { op: 'rename', id: 'prop_s', from: 'Stage', to: 'Phase' })
    await replaySchemaCascade(root)
    expect(await page(root, 'A')).toBe(onceA)
    expect(await page(root, 'B')).toBe(onceB)
    expect(await readSchemaJournal(root)).toBeNull()
  })

  it('the divergence persists without the replay — the fixture is not self-healing', async () => {
    const root = await seedNexus()
    await renameCrashState(root)
    expect((await readRegistry(root)).defs.prop_s?.name).toBe('Phase')
    expect(await page(root, 'B')).toContain('Stage: Draft')
  })
})

describe('delete replay', () => {
  it('forward-completes the tail without minting a second bundle', async () => {
    const live = await seedNexus()
    await openSession(live)
    expect((await deleteProperty(live, 'prop_s')).ok).toBe(true)
    const wantA = await page(live, 'A')
    const wantB = await page(live, 'B')
    closeSession()
    dropLiveTree()

    // The crash state: bundle minted, journal written, page A stripped, then death — the def, the assignment, and page B all still standing.
    const crashed = await seedNexus()
    const def = (await readRegistry(crashed)).defs.prop_s
    await writePropertyBundle(crashed, {
      entity: 'property',
      id: 'prop_s',
      def,
      values: { [PAGE_IDS[0]]: 'Draft', [PAGE_IDS[1]]: 'Draft' },
      assignments: ['c1'],
    })
    await writeSchemaJournal(crashed, { op: 'delete', id: 'prop_s', name: 'Stage' })
    await writeFile(join(crashed, 'Col', 'A.md'), `---\nID: ${PAGE_IDS[0]}\n---\nbody\n`)
    await openSession(crashed)
    await replaySchemaCascade(crashed)
    expect(await page(crashed, 'A')).toBe(wantA)
    expect(await page(crashed, 'B')).toBe(wantB)
    expect((await readRegistry(crashed)).defs.prop_s).toBeUndefined()
    const sidecar = await readSidecar(join(crashed, 'Col'), 'collection', pageCollectionSidecar)
    expect((sidecar?.properties as string[] | undefined) ?? []).toEqual([])
    expect(await listBundles(crashed)).toHaveLength(1)
    expect(await readSchemaJournal(crashed)).toBeNull()
  })

  it('the delete arm, replayed, reaches a Space sidecar', async () => {
    const root = await seedNexus()
    const file = await seedSpace(root, {
      id: 'sp1',
      Stage: ['Draft'],
      $order: { properties: ['Stage'] },
    })
    await writeSchemaJournal(root, { op: 'delete', id: 'prop_s', name: 'Stage' })
    await openSession(root)
    await replaySchemaCascade(root)
    const raw = await readJsonAt(file)
    expect('Stage' in raw).toBe(false)
    expect(raw.$order).toEqual({ properties: [] })
  })

  it('a record meeting the id under another name clears untouched', async () => {
    const root = await seedNexus()
    await writeSchemaJournal(root, { op: 'delete', id: 'prop_s', name: 'Priority' })
    const before = await page(root, 'A')
    await openSession(root)
    await replaySchemaCascade(root)
    expect(await page(root, 'A')).toBe(before)
    expect((await readRegistry(root)).defs.prop_s).toBeDefined()
    expect(await readSchemaJournal(root)).toBeNull()
  })

  it('a record whose name a different def now wears clears untouched', async () => {
    const root = await seedNexus()
    await writeSchemaJournal(root, { op: 'delete', id: 'prop_gone', name: 'Stage' })
    const before = await page(root, 'A')
    await openSession(root)
    await replaySchemaCascade(root)
    expect(await page(root, 'A')).toBe(before)
    expect((await readRegistry(root)).defs.prop_s).toBeDefined()
    expect(await readSchemaJournal(root)).toBeNull()
  })
})

describe('option replay', () => {
  it('option-rename lands the disk an uninterrupted rename lands', async () => {
    const live = await seedNexus()
    await openSession(live)
    expect((await renameOption(live, 'prop_s', 'Draft', 'Queued')).ok).toBe(true)
    const wantA = await page(live, 'A')
    const wantB = await page(live, 'B')
    closeSession()
    dropLiveTree()

    const crashed = await seedNexus()
    await writeSchemaJournal(crashed, {
      op: 'option-rename',
      id: 'prop_s',
      from: 'Draft',
      to: 'Queued',
    })
    await mutateRegistry(crashed, (registry) => ({
      next: {
        ...registry,
        defs: {
          ...registry.defs,
          prop_s: {
            ...registry.defs.prop_s,
            select_options: [{ value: 'Queued' }, { value: 'Done' }],
          },
        },
      },
      result: null,
    }))
    await writeFile(join(crashed, 'Col', 'A.md'), wantA)
    await openSession(crashed)
    await replaySchemaCascade(crashed)
    expect(await page(crashed, 'A')).toBe(wantA)
    expect(await page(crashed, 'B')).toBe(wantB)
    expect(await readSchemaJournal(crashed)).toBeNull()
  })

  it('a refused rename’s residue — the def holding both values — clears untouched', async () => {
    const root = await seedNexus()
    await writeSchemaJournal(root, { op: 'option-rename', id: 'prop_s', from: 'Draft', to: 'Done' })
    const before = await page(root, 'A')
    await openSession(root)
    await replaySchemaCascade(root)
    expect(await page(root, 'A')).toBe(before)
    expect(await readSchemaJournal(root)).toBeNull()
  })

  it('option-remove forward-completes the strip and the registry drop', async () => {
    const live = await seedNexus()
    await openSession(live)
    expect((await removeOption(live, 'prop_s', 'Draft')).ok).toBe(true)
    const wantA = await page(live, 'A')
    const wantB = await page(live, 'B')
    const wantOptions = (await readRegistry(live)).defs.prop_s?.select_options
    closeSession()
    dropLiveTree()

    // Pages-first order: the crash lands after A's strip, before the registry drop.
    const crashed = await seedNexus()
    await writeSchemaJournal(crashed, { op: 'option-remove', id: 'prop_s', value: 'Draft' })
    await writeFile(join(crashed, 'Col', 'A.md'), `---\nID: ${PAGE_IDS[0]}\n---\nbody\n`)
    await openSession(crashed)
    await replaySchemaCascade(crashed)
    expect(await page(crashed, 'A')).toBe(wantA)
    expect(await page(crashed, 'B')).toBe(wantB)
    expect((await readRegistry(crashed)).defs.prop_s?.select_options).toEqual(wantOptions)
    expect(await readSchemaJournal(crashed)).toBeNull()
  })

  it('a settled remove record — the value already off the def — clears without stripping', async () => {
    // The op finished and only its clear failed; the user then re-set the value on a page, and the stale record must not take that value with it.
    const root = await seedNexus()
    await openSession(root)
    expect((await removeOption(root, 'prop_s', 'Draft')).ok).toBe(true)
    await writeFile(join(root, 'Col', 'A.md'), `---\nID: ${PAGE_IDS[0]}\nStage: Draft\n---\nbody\n`)
    await writeSchemaJournal(root, { op: 'option-remove', id: 'prop_s', value: 'Draft' })
    await replaySchemaCascade(root)
    expect(await page(root, 'A')).toContain('Stage: Draft')
    expect(await readSchemaJournal(root)).toBeNull()
  })

  it('option-rename, replayed, reaches a Space sidecar', async () => {
    const root = await seedNexus()
    const file = await seedSpace(root, { id: 'sp1', Stage: ['Draft'] })
    await writeSchemaJournal(root, {
      op: 'option-rename',
      id: 'prop_s',
      from: 'Draft',
      to: 'Queued',
    })
    await mutateRegistry(root, (registry) => ({
      next: {
        ...registry,
        defs: {
          ...registry.defs,
          prop_s: {
            ...registry.defs.prop_s,
            select_options: [{ value: 'Queued' }, { value: 'Done' }],
          },
        },
      },
      result: null,
    }))
    await openSession(root)
    await replaySchemaCascade(root)
    expect((await readJsonAt(file)).Stage).toEqual(['Queued'])
  })

  it('option-remove, replayed, reaches a Space sidecar', async () => {
    const root = await seedNexus()
    const file = await seedSpace(root, { id: 'sp1', Stage: ['Draft'] })
    await writeSchemaJournal(root, { op: 'option-remove', id: 'prop_s', value: 'Draft' })
    await openSession(root)
    await replaySchemaCascade(root)
    expect('Stage' in (await readJsonAt(file))).toBe(false)
  })
})

describe('option replay reaches saved views', () => {
  const renamedDef = (root: string): Promise<null> =>
    mutateRegistry(root, (registry) => ({
      next: {
        ...registry,
        defs: {
          ...registry.defs,
          prop_s: {
            ...registry.defs.prop_s,
            select_options: [{ value: 'Queued' }, { value: 'Done' }],
          },
        },
      },
      result: null,
    }))

  it('option-rename rewrites a view still holding the old value, and replaying twice equals once', async () => {
    const root = await seedNexus()
    const surfaces = await seedConfigSurfaces(root, join(root, 'Col'), viewOn('prop_s', 'Draft'))
    const record = { op: 'option-rename', id: 'prop_s', from: 'Draft', to: 'Queued' } as const
    await writeSchemaJournal(root, record)
    await renamedDef(root)
    await openSession(root)
    await replaySchemaCascade(root)
    const once = await surfaces.read()
    const want = viewOn('prop_s', 'Queued')
    expect([once.collection, once.set, once.tile]).toEqual([want, want, want])
    expect(once.matrix).toEqual(want.filter)
    expect(await readSchemaJournal(root)).toBeNull()
    const tilesAt = (await stat(surfaces.tiles)).mtimeMs
    await writeSchemaJournal(root, record)
    await replaySchemaCascade(root)
    expect(await surfaces.read()).toEqual(once)
    expect((await stat(surfaces.tiles)).mtimeMs).toBe(tilesAt)
    expect(await readSchemaJournal(root)).toBeNull()
  })

  it('option-remove with clean pages strips a view still holding the value, then drops the option', async () => {
    const root = await seedNexus()
    const surfaces = await seedConfigSurfaces(root, join(root, 'Col'), viewOn('prop_s', 'Draft'))
    await writeFile(join(root, 'Col', 'A.md'), `---\nID: ${PAGE_IDS[0]}\n---\nbody\n`)
    await writeFile(join(root, 'Col', 'B.md'), `---\nID: ${PAGE_IDS[1]}\n---\nbody\n`)
    await writeSchemaJournal(root, { op: 'option-remove', id: 'prop_s', value: 'Draft' })
    await openSession(root)
    await replaySchemaCascade(root)
    const views = await surfaces.read()
    expect(views.set.filter).toEqual({ match: 'all', rules: [] })
    expect(views.tile.hidden_groups).toEqual([])
    expect(views.matrix).toEqual({ match: 'all', rules: [] })
    expect((await readRegistry(root)).defs.prop_s?.select_options).toEqual([{ value: 'Done' }])
    expect(await readSchemaJournal(root)).toBeNull()
  })
})

describe('an unreadable registry holds the record', () => {
  it('a delete record does not sweep when the registry cannot be read', async () => {
    const root = await seedNexus()
    await openSession(root)
    await writeSchemaJournal(root, { op: 'delete', id: 'prop_s', name: 'Stage' })
    await writeFile(join(root, '.nexus', 'properties.json'), '{nope')
    await replaySchemaCascade(root)
    expect(await page(root, 'A')).toContain('Stage: Draft')
    expect(await page(root, 'B')).toContain('Stage: Draft')
    expect(await readSchemaJournal(root)).toEqual({ op: 'delete', id: 'prop_s', name: 'Stage' })
  })
})

describe('a slot the replay cannot read is left as it lies', () => {
  const slot = (root: string): string => join(root, '.nexus', 'property-cascade.json')

  it('an unreadable slot answers nothing owed and stays in place', async () => {
    const root = await seedNexus()
    await openSession(root)
    await mkdir(slot(root))
    expect(await replaySchemaCascade(root)).toBeNull()
    expect((await stat(slot(root))).isDirectory()).toBe(true)
    expect(await readdir(slot(root))).toEqual([])
  })

  it.each([
    '{nope',
    '{ "op": "bogus", "id": "x" }',
  ])('a corrupt slot (%s) answers nothing owed, byte-identical', async (bad) => {
    const root = await seedNexus()
    await openSession(root)
    await writeFile(slot(root), bad)
    expect(await replaySchemaCascade(root)).toBeNull()
    expect(await readFile(slot(root), 'utf8')).toBe(bad)
    expect((await readdir(join(root, '.nexus'))).some((f) => f.includes('.bad-'))).toBe(false)
  })
})

describe('unreadable holders hold the record', () => {
  it.skipIf(noModeBits)(
    'a delete that cannot read one holder keeps its record, and the replay heals it later',
    async () => {
      const root = await seedNexus()
      await openSession(root)
      await chmod(join(root, 'Col', 'B.md'), 0o000)
      expect((await deleteProperty(root, 'prop_s')).ok).toBe(true)
      expect((await readRegistry(root)).defs.prop_s).toBeUndefined()
      expect(await readSchemaJournal(root)).toEqual({ op: 'delete', id: 'prop_s', name: 'Stage' })
      expect(await replaySchemaCascade(root).then(() => readSchemaJournal(root))).not.toBeNull()
      await chmod(join(root, 'Col', 'B.md'), 0o644)
      await replaySchemaCascade(root)
      expect(await page(root, 'B')).not.toContain('Stage')
      expect(await readSchemaJournal(root)).toBeNull()
    },
  )

  it.skipIf(noModeBits)(
    'with a warm index, a holder the watcher found unreadable still holds the record, and its bundle says it is partial',
    async () => {
      const root = await seedNexus()
      await openSession(root)
      installStores(memoryStores().stores)
      await seedContentIndex(root)
      const b = join(root, 'Col', 'B.md')
      await chmod(b, 0o000)
      await indexWrittenPage(root, b)
      const deleted = await deleteProperty(root, 'prop_s')
      await chmod(b, 0o644)
      if (!deleted.ok) throw new Error('delete refused')
      expect(deleted.value.replayable).toBe(true)
      expect(deleted.value.cascade.warning).toBeDefined()
      expect(await readRecord(join(root, deleted.value.trashed.bundlePath))).toMatchObject({
        partial: true,
      })
      await indexWrittenPage(root, b)
      await replaySchemaCascade(root)
      expect(await page(root, 'B')).not.toContain('Stage')
      expect(await readSchemaJournal(root)).toBeNull()
    },
  )
})

describe('an unreadable Space sidecar', () => {
  it.skipIf(noModeBits)(
    'is counted once by a delete, though its board is reached too',
    async () => {
      const root = await seedNexus()
      await mkdir(join(root, '.nexus', 'contexts'), { recursive: true })
      await ensureContextsRegistry(root)
      const sidecar = await seedSpace(root, { id: 'sp_1', Stage: 'Draft' })
      await chmod(sidecar, 0o000)
      try {
        await openSession(root)
        const deleted = await deleteProperty(root, 'prop_s')
        expect(deleted.ok && deleted.value.cascade.warning).toBe(unsweptLine(1))
      } finally {
        await chmod(sidecar, 0o644)
      }
    },
  )
})

describe('the index seam', () => {
  it('a warm index answers the replay — an unindexed holder is outside its sweep', async () => {
    const root = await seedNexus()
    await openSession(root)
    installStores(memoryStores().stores)
    await seedContentIndex(root)
    // C landed after the seed with no index row — the queried holder set cannot name it.
    await writeFile(
      join(root, 'Col', 'C.md'),
      '---\nID: 01ARZ3NDEKPSV4RRFFQ69G5FAC\nStage: Draft\n---\nbody\n',
    )
    await renameCrashState(root)
    await replaySchemaCascade(root)
    expect(await page(root, 'A')).toContain('Phase: Draft')
    expect(await page(root, 'B')).toContain('Phase: Draft')
    expect(await page(root, 'C')).toContain('Stage: Draft')
    expect(await readSchemaJournal(root)).toBeNull()
  })

  it('cold, the corpus fallback reaches every holder', async () => {
    const root = await seedNexus()
    await writeFile(
      join(root, 'Col', 'C.md'),
      '---\nID: 01ARZ3NDEKPSV4RRFFQ69G5FAC\nStage: Draft\n---\nbody\n',
    )
    await renameCrashState(root)
    await openSession(root)
    await replaySchemaCascade(root)
    expect(await page(root, 'C')).toContain('Phase: Draft')
    expect(await readSchemaJournal(root)).toBeNull()
  })
})
