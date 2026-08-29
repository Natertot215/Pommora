// The crash-window suite: each window is the exact on-disk state a killed op leaves — built by
// running the same internals the live op runs, stopped between steps — and the replay must land
// the same disk an uninterrupted op lands (modulo `modified_at` on the stamping ops).

import { describe, it, expect, afterEach } from 'vitest'
import { chmod, mkdtemp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { PropertyDefinition } from '@shared/properties'
import { closeSession, openSession } from '../session'
import { closeSessionDb, openSessionDb } from '../sessionDb'
import { dropLiveTree } from '../liveTree'
import { seedContentIndex } from '../indexSeed'
import { listBundles, writePropertyBundle } from '../provenance'
import { mutateRegistry, readRegistry } from '../IO/propertiesRegistry'
import { renameFrontmatterKey } from '../IO/pageFile'
import { readSidecar } from '../sidecarIO'
import { pageCollectionSidecar } from '@shared/schemas'
import { createProperty, editProperty } from './registryProperty'
import { deleteProperty } from './deleteProperty'
import { removeOption, renameOption } from './optionOps'
import { replacePageValue } from './pageValue'
import { readSchemaJournal, writeSchemaJournal } from './propertyJournal'
import { replaySchemaCascade } from './replaySchemaCascade'

const roots: string[] = []
afterEach(async () => {
  dropLiveTree()
  closeSessionDb()
  closeSession()
  for (const r of roots.splice(0)) await rm(r, { recursive: true, force: true })
})

const PAGE_IDS = ['01ARZ3NDEKTSV4RRFFQ69G5FAA', '01ARZ3NDEKTSV4RRFFQ69G5FAB']

/** A nexus with one Collection assigning `prop_s` (select Stage: Draft/Done) over two holder pages. */
async function seedNexus(): Promise<string> {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'pom-replay-')))
  roots.push(root)
  await mkdir(join(root, '.nexus'), { recursive: true })
  await writeFile(join(root, '.nexus', 'nexus.json'), JSON.stringify({ id: 'nx', createdAt: 'x' }))
  await writeFile(join(root, '.nexus', 'settings.json'), '{}')
  await mkdir(join(root, 'Col'), { recursive: true })
  await createProperty(root, {
    id: 'prop_s',
    name: 'Stage',
    type: 'select',
    select_options: [
      { value: 'Draft', label: 'Draft' },
      { value: 'Done', label: 'Done' },
    ],
  } as PropertyDefinition)
  await writeFile(
    join(root, 'Col', '_pagecollection.json'),
    JSON.stringify({ id: 'c1', properties: ['prop_s'] }),
  )
  await writeFile(
    join(root, 'Col', 'A.md'),
    `---\nPageID: ${PAGE_IDS[0]}\n<Stage>: Draft\n---\nbody\n`,
  )
  await writeFile(
    join(root, 'Col', 'B.md'),
    `---\nPageID: ${PAGE_IDS[1]}\n<Stage>: Draft\n---\nbody\n`,
  )
  return root
}

const page = (root: string, name: string): Promise<string> =>
  readFile(join(root, 'Col', `${name}.md`), 'utf8')

/** Page bytes with `modified_at` dropped — the stamping ops re-date by design. */
const unstamped = (content: string): string =>
  content
    .split('\n')
    .filter((l) => !l.startsWith('modified_at:'))
    .join('\n')

/** The post-commit pre-sweep crash state of a Stage→Phase rename, with page A already folded
 *  (the sweep died between its two files) — journal exactly as editProperty leaves it. */
async function renameCrashState(root: string): Promise<void> {
  await writeSchemaJournal(root, { op: 'rename', id: 'prop_s', from: 'Stage', to: 'Phase' })
  await mutateRegistry(root, (registry) => ({
    next: {
      ...registry,
      defs: { ...registry.defs, prop_s: { ...registry.defs.prop_s, name: 'Phase' } },
    },
    result: null,
  }))
  const half = renameFrontmatterKey(await page(root, 'A'), '<Stage>', '<Phase>', 'prefer-new')
  if (half === null) throw new Error('fixture: half-fold produced nothing')
  await writeFile(join(root, 'Col', 'A.md'), half)
}

describe('rename replay', () => {
  it('lands the exact disk an uninterrupted rename lands', async () => {
    const live = await seedNexus()
    await openSession(live)
    expect((await editProperty(live, 'prop_s', { name: 'Phase' })).ok).toBe(true)
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
    expect(await page(root, 'B')).toContain('<Stage>: Draft')
  })
})

describe('delete replay', () => {
  it('forward-completes the tail without minting a second bundle', async () => {
    const live = await seedNexus()
    await openSession(live)
    expect((await deleteProperty(live, 'prop_s')).ok).toBe(true)
    const wantA = unstamped(await page(live, 'A'))
    const wantB = unstamped(await page(live, 'B'))
    closeSession()
    dropLiveTree()

    // The crash state: bundle minted, journal written, page A stripped, then death — the def,
    // the assignment, and page B all still standing.
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
    await writeFile(join(crashed, 'Col', 'A.md'), `---\nPageID: ${PAGE_IDS[0]}\n---\nbody\n`)
    await openSession(crashed)
    await replaySchemaCascade(crashed)
    expect(unstamped(await page(crashed, 'A'))).toBe(wantA)
    expect(unstamped(await page(crashed, 'B'))).toBe(wantB)
    expect((await readRegistry(crashed)).defs.prop_s).toBeUndefined()
    const sidecar = await readSidecar(join(crashed, 'Col'), 'collection', pageCollectionSidecar)
    expect((sidecar?.properties as string[] | undefined) ?? []).toEqual([])
    expect(await listBundles(crashed)).toHaveLength(1)
    expect(await readSchemaJournal(crashed)).toBeNull()
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
    const wantA = unstamped(await page(live, 'A'))
    const wantB = unstamped(await page(live, 'B'))
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
            select_options: [
              { value: 'Queued', label: 'Queued' },
              { value: 'Done', label: 'Done' },
            ],
          },
        },
      },
      result: null,
    }))
    const half = replacePageValue(await page(crashed, 'A'), '<Stage>', 'Draft', 'Queued', 'select')
    if (half === null) throw new Error('fixture: half-cascade produced nothing')
    await writeFile(join(crashed, 'Col', 'A.md'), half)
    await openSession(crashed)
    await replaySchemaCascade(crashed)
    expect(unstamped(await page(crashed, 'A'))).toBe(wantA)
    expect(unstamped(await page(crashed, 'B'))).toBe(wantB)
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
    const wantA = unstamped(await page(live, 'A'))
    const wantB = unstamped(await page(live, 'B'))
    const wantOptions = (await readRegistry(live)).defs.prop_s?.select_options
    closeSession()
    dropLiveTree()

    // Pages-first order: the crash lands after A's strip, before the registry drop.
    const crashed = await seedNexus()
    await writeSchemaJournal(crashed, { op: 'option-remove', id: 'prop_s', value: 'Draft' })
    await writeFile(join(crashed, 'Col', 'A.md'), `---\nPageID: ${PAGE_IDS[0]}\n---\nbody\n`)
    await openSession(crashed)
    await replaySchemaCascade(crashed)
    expect(unstamped(await page(crashed, 'A'))).toBe(wantA)
    expect(unstamped(await page(crashed, 'B'))).toBe(wantB)
    expect((await readRegistry(crashed)).defs.prop_s?.select_options).toEqual(wantOptions)
    expect(await readSchemaJournal(crashed)).toBeNull()
  })

  it('a settled remove record — the value already off the def — clears without stripping', async () => {
    // The op finished (value dropped from the def) and only its clear failed; the user then
    // re-set the value on a page. The stale record must not take that value with it.
    const root = await seedNexus()
    await openSession(root)
    expect((await removeOption(root, 'prop_s', 'Draft')).ok).toBe(true)
    await writeFile(
      join(root, 'Col', 'A.md'),
      `---\nPageID: ${PAGE_IDS[0]}\n<Stage>: Draft\n---\nbody\n`,
    )
    await writeSchemaJournal(root, { op: 'option-remove', id: 'prop_s', value: 'Draft' })
    await replaySchemaCascade(root)
    expect(await page(root, 'A')).toContain('<Stage>: Draft')
    expect(await readSchemaJournal(root)).toBeNull()
  })
})

describe('unreadable holders hold the record', () => {
  it('a delete that cannot read one holder keeps its record, and the replay heals it later', async () => {
    const root = await seedNexus()
    await openSession(root)
    await chmod(join(root, 'Col', 'B.md'), 0o000)
    expect((await deleteProperty(root, 'prop_s')).ok).toBe(true)
    // The op finished its registry but held the record for the straggler.
    expect((await readRegistry(root)).defs.prop_s).toBeUndefined()
    expect(await readSchemaJournal(root)).toEqual({ op: 'delete', id: 'prop_s', name: 'Stage' })
    expect(await replaySchemaCascade(root).then(() => readSchemaJournal(root))).not.toBeNull()
    // The page becomes readable again — the next open finishes the job.
    await chmod(join(root, 'Col', 'B.md'), 0o644)
    await replaySchemaCascade(root)
    expect(await page(root, 'B')).not.toContain('<Stage>')
    expect(await readSchemaJournal(root)).toBeNull()
  })
})

describe('the index seam', () => {
  it('a warm index answers the replay — an unindexed holder is outside its sweep', async () => {
    const root = await seedNexus()
    await openSession(root)
    openSessionDb(root)
    await seedContentIndex(root)
    // C landed after the seed with no index row — the queried holder set cannot name it.
    await writeFile(
      join(root, 'Col', 'C.md'),
      '---\nPageID: 01ARZ3NDEKTSV4RRFFQ69G5FAC\n<Stage>: Draft\n---\nbody\n',
    )
    await renameCrashState(root)
    await replaySchemaCascade(root)
    expect(await page(root, 'A')).toContain('<Phase>: Draft')
    expect(await page(root, 'B')).toContain('<Phase>: Draft')
    expect(await page(root, 'C')).toContain('<Stage>: Draft')
    expect(await readSchemaJournal(root)).toBeNull()
  })

  it('cold, the corpus fallback reaches every holder', async () => {
    const root = await seedNexus()
    await writeFile(
      join(root, 'Col', 'C.md'),
      '---\nPageID: 01ARZ3NDEKTSV4RRFFQ69G5FAC\n<Stage>: Draft\n---\nbody\n',
    )
    await renameCrashState(root)
    await openSession(root)
    await replaySchemaCascade(root)
    expect(await page(root, 'C')).toContain('<Phase>: Draft')
    expect(await readSchemaJournal(root)).toBeNull()
  })
})
