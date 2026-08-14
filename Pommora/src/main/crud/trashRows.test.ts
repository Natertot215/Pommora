import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { MutateReply } from '@shared/mutate'
import type { NexusTree, TrashRow } from '@shared/types'
import { handleMutate, type MutateDeps } from '../mutate'
import { contextsDir, contextsRegistryFile } from '../paths'
import { listBundles, writePropertyBundle } from '../provenance'
import { readNexus } from '../readNexus'
import { closeSession, openSession } from '../session'
import { trashRowOf, trashRows } from './trashRows'

const PAGE_A = '01KVGMT8BFG350FZZXAMG1QDVA'
const nexusDeps: MutateDeps = { trashMode: 'nexus', trashToSystem: async () => {} }

let root: string

const rows = async (): Promise<TrashRow[]> =>
  trashRows(await listBundles(root), await readNexus(root))
const del = (
  path: string,
  kind: 'page' | 'collection' | 'set' | 'space' | 'context',
): Promise<MutateReply> => handleMutate({ op: 'delete', path, kind }, nexusDeps)

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-rows-'))
  await mkdir(join(root, '.nexus'), { recursive: true })
  await writeFile(join(root, '.nexus', 'nexus.json'), JSON.stringify({ id: 'nx', createdAt: '2026' }))
  await writeFile(
    contextsRegistryFile(root),
    JSON.stringify({ contexts: [{ id: 'ctx_projects', title: 'Projects', singular: 'Project' }] }),
  )
  await mkdir(join(contextsDir(root), 'Projects', 'Pommora'), { recursive: true })
  await writeFile(
    join(contextsDir(root), 'Projects', 'Pommora', '_space.json'),
    JSON.stringify({ id: 'sp-pom' }),
  )
  await mkdir(join(root, 'Notes', 'Daily'), { recursive: true })
  await writeFile(join(root, 'Notes', '_pagecollection.json'), JSON.stringify({ id: 'col-notes' }))
  await writeFile(join(root, 'Notes', 'Daily', '_pageset.json'), JSON.stringify({ id: 'set-daily' }))
  await writeFile(join(root, 'Notes', 'Daily', 'Alpha.md'), `---\nPageID: ${PAGE_A}\n---\nbody`)
  await openSession(root)
})

afterEach(async () => {
  closeSession()
  await rm(root, { recursive: true, force: true })
})

describe('trashRows — a bundle as the browser reads it', () => {
  it('a page keeps its title without the extension, and its live container chain', async () => {
    await del('Notes/Daily/Alpha.md', 'page')
    const [row] = await rows()
    expect(row).toMatchObject({
      kind: 'page',
      title: 'Alpha',
      crumbs: [
        { kind: 'collection', title: 'Notes' },
        { kind: 'set', title: 'Daily' },
      ],
      homeResolves: true,
    })
    expect(row.historical).toBeUndefined()
    expect(row.bundlePath.startsWith('.trash/')).toBe(true)
  })

  it('a Set reads its Collection; a Collection sits at a root and wears no crumb', async () => {
    await del('Notes/Daily', 'set')
    expect((await rows())[0]).toMatchObject({
      kind: 'set',
      title: 'Daily',
      crumbs: [{ kind: 'collection', title: 'Notes' }],
      homeResolves: true,
    })
    await del('Notes', 'collection')
    const collection = (await rows()).find((r) => r.kind === 'collection')
    expect(collection).toMatchObject({ title: 'Notes', crumbs: [], homeResolves: true })
  })

  it('a Space reads its Context, and a Context answers to no parent at all', async () => {
    await del('.nexus/contexts/Projects/Pommora', 'space')
    expect((await rows())[0]).toMatchObject({
      kind: 'space',
      title: 'Pommora',
      crumbs: [{ kind: 'context', title: 'Projects' }],
      homeResolves: true,
    })
    await del('.nexus/contexts/Projects', 'context')
    const context = (await rows()).find((r) => r.kind === 'context')
    expect(context).toMatchObject({ title: 'Projects', crumbs: [], homeResolves: true })
  })

  it('a renamed ancestor reads true, because the crumb resolves by id', async () => {
    await del('Notes/Daily/Alpha.md', 'page')
    const renamed = await handleMutate(
      { op: 'rename', path: 'Notes', kind: 'collection', newName: 'Journals' },
      nexusDeps,
    )
    expect(renamed.ok).toBe(true)
    expect((await rows())[0].crumbs).toEqual([
      { kind: 'collection', title: 'Journals' },
      { kind: 'set', title: 'Daily' },
    ])
  })

  it('a missing parent falls back to the frozen chain and says its home is gone', async () => {
    await del('Notes/Daily/Alpha.md', 'page')
    await del('Notes/Daily', 'set')
    const page = (await rows()).find((r) => r.kind === 'page')
    expect(page).toMatchObject({
      homeResolves: false,
      historical: true,
      crumbs: [{ title: 'Notes' }, { title: 'Daily' }],
    })
    // Nothing climbs: the page is never re-homed into the Set's own Collection.
    expect(page?.crumbs.every((c) => c.kind === undefined)).toBe(true)
  })

  it('a Space whose Context is gone reads its location, not the folders it was kept in', async () => {
    await del('.nexus/contexts/Projects/Pommora', 'space')
    await del('.nexus/contexts/Projects', 'context')
    const space = (await rows()).find((r) => r.kind === 'space')
    // `.trash` mirrors the nexus faithfully — the internal chain is not a location a user has.
    expect(space).toMatchObject({ historical: true, crumbs: [{ title: 'Projects' }] })
  })

  it('a property record becomes no row at all', async () => {
    await writePropertyBundle(root, {
      entity: 'property',
      id: 'prop_x',
      def: { id: 'prop_x' },
      values: {},
    })
    await del('Notes/Daily/Alpha.md', 'page')
    const listed = await listBundles(root)
    expect(listed).toHaveLength(2)
    expect((await rows()).map((r) => r.kind)).toEqual(['page'])
  })

  // The discriminator does the excluding, not the missing artifact — a property bundle holds no
  // artifact today, so a filter keyed on that would pass this test while excluding nothing.
  it('excludes a property record even when something sits beside it', () => {
    expect(
      trashRowOf(
        {
          bundlePath: '.trash/s__property-prop_x.deleted',
          artifactName: 'anything',
          record: { entity: 'property', id: 'prop_x', def: { id: 'prop_x' }, values: {} },
        },
        { collections: [], contexts: [] } as unknown as NexusTree,
      ),
    ).toBeNull()
  })

  it('reads the deletion time out of the bundle stamp, newest first', async () => {
    await del('Notes/Daily/Alpha.md', 'page')
    await new Promise((r) => setTimeout(r, 5))
    await del('Notes/Daily', 'set')
    const listed = await rows()
    expect(listed.map((r) => r.kind)).toEqual(['set', 'page'])
    const [newest, oldest] = listed
    expect(newest.deletedAt).not.toBeNull()
    expect(newest.deletedAt).toBeGreaterThanOrEqual(oldest.deletedAt as number)
    expect(Math.abs(Date.now() - (newest.deletedAt as number))).toBeLessThan(60_000)
  })

  it('a hand-made bundle name still lists, dateless, and sorts last', async () => {
    await del('Notes/Daily/Alpha.md', 'page')
    await del('Notes/Daily', 'set')
    const stamped = (await listBundles(root)).find((b) => b.artifactName === 'Alpha.md')
    const handMade = (stamped as { bundlePath: string }).bundlePath.replace(
      /[^/]+$/,
      'Alpha.md.deleted',
    )
    await rename(join(root, (stamped as { bundlePath: string }).bundlePath), join(root, handMade))
    const listed = await rows()
    expect(listed.find((r) => r.kind === 'page')).toMatchObject({ title: 'Alpha', deletedAt: null })
    expect(listed.at(-1)?.kind).toBe('page')
  })

  it('a record carrying no id still shapes a row', () => {
    const row = trashRowOf(
      {
        bundlePath: '.trash/Notes/s__Alpha.md.deleted',
        artifactName: 'Alpha.md',
        record: { entity: 'page', parent: { kind: 'container', id: 'set-daily' } },
      },
      { collections: [], contexts: [] } as unknown as NexusTree,
    )
    expect(row).toMatchObject({ kind: 'page', title: 'Alpha', historical: true })
  })
})

describe('trashRows — `homeResolves` agrees with the resolver', () => {
  it('a row it calls resolvable restores with no destination asked for', async () => {
    await del('Notes/Daily/Alpha.md', 'page')
    const [row] = await rows()
    expect(row.homeResolves).toBe(true)
    const restored = await handleMutate({ op: 'restore', bundlePath: row.bundlePath }, nexusDeps)
    expect(restored.ok).toBe(true)
    expect((await readNexus(root)).collections[0].sets[0].pages[0].title).toBe('Alpha')
  })

  it('a row it calls homeless refuses the plain restore, which is why it must be asked', async () => {
    await del('Notes/Daily/Alpha.md', 'page')
    await del('Notes/Daily', 'set')
    const page = (await rows()).find((r) => r.kind === 'page') as TrashRow
    expect(page.homeResolves).toBe(false)
    const restored = await handleMutate({ op: 'restore', bundlePath: page.bundlePath }, nexusDeps)
    expect(restored.ok).toBe(false)
  })
})
