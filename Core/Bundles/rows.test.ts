import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { tempRoot } from '../Testing/hostFs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { dropLiveTree } from '../Nexus/liveTree'
import type { MutateReply } from '../Nexus/mutateRequest'
import type { NexusTree } from '../Nexus/tree'
import type { BundleRow } from './rows'
import { settledMutate } from '../Testing/settledMutate'
import { contextsDir, contextsRegistryFile } from '../Paths/paths'
import { writePropertyBundle } from '../Properties/deleteProperty'
import { listBundles } from './bundle'
import { readNexus } from '../Nexus/readNexus'
import { nexusPages } from '../Nexus/heldPages'
import { closeSession, openSession } from '../Nexus/session'
import { bundleRowOf, bundleRows } from './rows'
import type { TrashDeps } from '../Trash/discard'

const PAGE_A = '01KVGMT8BFP350FZZXAMG1QDVA'
const ARCHIVE_ID = '01KVGMT8BFP350FZZXAMG1QDVB'
const nexusDeps: TrashDeps = { trashMode: 'nexus', trashToSystem: async () => {} }

let root: string

const rows = async (): Promise<BundleRow[]> => {
  const tree = await readNexus(root)
  const { byId } = await nexusPages(root, tree)
  return bundleRows(root, await listBundles(root, { kind: 'trash' }), { kind: 'trash' }, tree, byId)
}
const del = (
  path: string,
  kind: 'page' | 'collection' | 'set' | 'space' | 'context',
): Promise<MutateReply> => settledMutate(root, { op: 'delete', path, kind }, nexusDeps)

beforeEach(async () => {
  root = tempRoot('pom-rows-')
  await mkdir(join(root, '.nexus'), { recursive: true })
  await mkdir(contextsDir(root), { recursive: true })
  await writeFile(
    join(root, '.nexus', 'nexus.json'),
    JSON.stringify({ id: 'nx', createdAt: '2026' }),
  )
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
  await writeFile(
    join(root, 'Notes', 'Daily', '_pageset.json'),
    JSON.stringify({ id: 'set-daily' }),
  )
  await writeFile(join(root, 'Notes', 'Daily', 'Alpha.md'), `---\nID: ${PAGE_A}\n---\nbody`)
  await openSession(root)
})

afterEach(async () => {
  dropLiveTree()
  closeSession()
  await rm(root, { recursive: true, force: true })
})

describe('bundleRows — a bundle as the browser reads it', () => {
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
    const renamed = await settledMutate(
      root,
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
    const archived = await bundleRowOf(
      root,
      {
        bundlePath: `.nexus/archive/${ARCHIVE_ID}/Notes/Daily/2026-10-20T00-00-00-000Z__Alpha.md.archived`,
        artifactName: 'Alpha.md',
        record: { entity: 'page', id: PAGE_A, parent: { kind: 'container', id: 'set-daily' } },
      },
      { kind: 'archive', id: ARCHIVE_ID },
      await readNexus(root),
      new Map(),
    )
    expect(archived).toMatchObject({
      historical: true,
      crumbs: [{ title: 'Notes' }, { title: 'Daily' }],
    })
  })

  it('a Space whose Context is gone reads its location, not the folders it was kept in', async () => {
    await del('.nexus/contexts/Projects/Pommora', 'space')
    await del('.nexus/contexts/Projects', 'context')
    const space = (await rows()).find((r) => r.kind === 'space')
    // `.trash` mirrors the nexus faithfully — the internal chain is not a location a user has.
    expect(space).toMatchObject({ historical: true, crumbs: [{ title: 'Projects' }] })
  })

  it('a property record lists under its name, with nowhere to be placed and a home to return to', async () => {
    await writePropertyBundle(root, {
      entity: 'property',
      id: 'prop_x',
      def: { id: 'prop_x', label: 'Stage', key: 'Stage' },
      values: {},
    })
    await del('Notes/Daily/Alpha.md', 'page')
    const property = (await rows()).find((r) => r.kind === 'property')
    expect(property).toMatchObject({ title: 'Stage', crumbs: [], homeResolves: true })
    expect(property?.storedAt).toEqual(expect.any(Number))
  })

  it('a property record with no readable name lists under its id', async () => {
    expect(
      (
        await bundleRowOf(
          root,
          {
            bundlePath: '.trash/s__property-prop_x.deleted',
            record: { entity: 'property', id: 'prop_x', def: { id: 'prop_x' }, values: {} },
          },
          { kind: 'trash' },
          { collections: [], contexts: [] } as unknown as NexusTree,
          new Map(),
        )
      )?.title,
    ).toBe('prop_x')
  })

  it('reads the deletion time out of the bundle stamp, newest first', async () => {
    await del('Notes/Daily/Alpha.md', 'page')
    await new Promise((r) => setTimeout(r, 5))
    await del('Notes/Daily', 'set')
    const listed = await rows()
    expect(listed.map((r) => r.kind)).toEqual(['set', 'page'])
    const [newest, oldest] = listed
    expect(newest.storedAt).not.toBeNull()
    expect(newest.storedAt).toBeGreaterThanOrEqual(oldest.storedAt as number)
    expect(Math.abs(Date.now() - (newest.storedAt as number))).toBeLessThan(60_000)
  })

  it('a hand-made bundle name still lists, dateless, and sorts last', async () => {
    await del('Notes/Daily/Alpha.md', 'page')
    await del('Notes/Daily', 'set')
    const stamped = (await listBundles(root, { kind: 'trash' })).find(
      (b) => b.artifactName === 'Alpha.md',
    )
    const handMade = (stamped as { bundlePath: string }).bundlePath.replace(
      /[^/]+$/,
      'Alpha.md.deleted',
    )
    await rename(join(root, (stamped as { bundlePath: string }).bundlePath), join(root, handMade))
    const listed = await rows()
    expect(listed.find((r) => r.kind === 'page')).toMatchObject({ title: 'Alpha', storedAt: null })
    expect(listed.at(-1)?.kind).toBe('page')
  })

  it('a record carrying no id still shapes a row', async () => {
    const row = await bundleRowOf(
      root,
      {
        bundlePath: '.trash/Notes/s__Alpha.md.deleted',
        artifactName: 'Alpha.md',
        record: { entity: 'page', parent: { kind: 'container', id: 'set-daily' } },
      },
      { kind: 'trash' },
      { collections: [], contexts: [] } as unknown as NexusTree,
      new Map(),
    )
    expect(row).toMatchObject({ kind: 'page', title: 'Alpha', historical: true })
  })

  it('a page row carries the metadata’s icon and its stored id and path, and a Set row its sidecar’s icon', async () => {
    const bundlePath = '.trash/Notes/Daily/s__Alpha.md.deleted'
    const page = await bundleRowOf(
      root,
      {
        bundlePath,
        artifactName: 'Alpha.md',
        record: { entity: 'page', id: PAGE_A, parent: { kind: 'container', id: 'set-daily' } },
      },
      { kind: 'trash' },
      {
        collections: [],
        contexts: [],
        config: { pageMetadata: { [PAGE_A]: { icon: 'hash' } } },
      } as unknown as NexusTree,
      new Map(),
    )
    expect(page).toMatchObject({
      icon: 'hash',
      stored: { id: PAGE_A, path: `${bundlePath}/Alpha.md` },
    })
    await writeFile(
      join(root, 'Notes', 'Daily', '_pageset.json'),
      JSON.stringify({ id: 'set-daily', icon: 'folder-heart' }),
    )
    await del('Notes/Daily', 'set')
    const [set] = await rows()
    expect(set).toMatchObject({
      kind: 'set',
      icon: 'folder-heart',
      stored: { id: 'set-daily', path: `${set.bundlePath}/Daily` },
    })
  })
})

describe('bundleRows — a container’s and a Space’s own icons', () => {
  it('a Collection row and a Space row carry their sidecars’ icons, and a row with none carries no icon', async () => {
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'col-notes', icon: 'book' }),
    )
    await writeFile(
      join(contextsDir(root), 'Projects', 'Pommora', '_space.json'),
      JSON.stringify({ id: 'sp-pom', icon: 'rocket' }),
    )
    await del('Notes/Daily/Alpha.md', 'page')
    await del('Notes', 'collection')
    await del('.nexus/contexts/Projects/Pommora', 'space')
    const byKind = Object.fromEntries((await rows()).map((r) => [r.kind, r]))
    expect(byKind.collection.icon).toBe('book')
    expect(byKind.space.icon).toBe('rocket')
    expect('icon' in byKind.page).toBe(false)
  })
})

describe('bundleRows — `homeResolves` agrees with the resolver', () => {
  it('a row it calls resolvable restores with no destination asked for', async () => {
    await del('Notes/Daily/Alpha.md', 'page')
    const [row] = await rows()
    expect(row.homeResolves).toBe(true)
    const restored = await settledMutate(
      root,
      { op: 'restore', bundlePath: row.bundlePath },
      nexusDeps,
    )
    expect(restored.ok).toBe(true)
    expect((await readNexus(root)).collections[0].sets[0].pages[0].title).toBe('Alpha')
  })

  it('a row it calls homeless refuses the plain restore, which is why it must be asked', async () => {
    await del('Notes/Daily/Alpha.md', 'page')
    await del('Notes/Daily', 'set')
    const page = (await rows()).find((r) => r.kind === 'page') as BundleRow
    expect(page.homeResolves).toBe(false)
    const restored = await settledMutate(
      root,
      { op: 'restore', bundlePath: page.bundlePath },
      nexusDeps,
    )
    expect(restored.ok).toBe(false)
  })
})
