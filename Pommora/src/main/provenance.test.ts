import { mkdir, mkdtemp, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pathExists } from './io/atomicWrite'
import { handleMutate, type MutateDeps } from './mutate'
import { contextsDir, contextsRegistryFile } from './paths'
import {
  bundleArtifact,
  listBundles,
  readRecord,
  resolveRecord,
  writePropertyBundle,
} from './provenance'
import { readNexus, splitFrontmatter } from './readNexus'
import { closeSession, openSession } from './session'

const PAGE_A = '01KVGMT8BFG350FZZXAMG1QDVA'
const nexusDeps: MutateDeps = { trashMode: 'nexus', trashToSystem: async () => {} }

let root: string

/** Every bundle directory under .trash, recursively — never descending into one, exactly as
 *  the listing walks. */
async function bundleDirs(dir: string): Promise<string[]> {
  const out: string[] = []
  let entries: import('node:fs').Dirent[]
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue
    const abs = join(dir, e.name)
    if (e.name.endsWith('.deleted')) out.push(abs)
    else out.push(...(await bundleDirs(abs)))
  }
  return out
}

const onlyBundle = async (): Promise<{ dir: string; record: unknown }> => {
  const dirs = await bundleDirs(join(root, '.trash'))
  expect(dirs).toHaveLength(1)
  return { dir: dirs[0], record: await readRecord(dirs[0]) }
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-prov-'))
  await mkdir(join(root, '.nexus'), { recursive: true })
  await writeFile(
    join(root, '.nexus', 'nexus.json'),
    JSON.stringify({ id: 'nx', createdAt: '2026' }),
  )
  await writeFile(
    contextsRegistryFile(root),
    JSON.stringify({
      contexts: [{ id: 'ctx_projects', title: 'Projects', singular: 'Project', icon: 'target' }],
    }),
  )
  await mkdir(join(contextsDir(root), 'Projects', 'Pommora'), { recursive: true })
  await writeFile(
    join(contextsDir(root), 'Projects', 'Pommora', '_space.json'),
    JSON.stringify({ id: 'sp-pom' }),
  )
  await mkdir(join(contextsDir(root), 'Projects', 'Sapphire'), { recursive: true })
  await writeFile(
    join(contextsDir(root), 'Projects', 'Sapphire', '_space.json'),
    JSON.stringify({ id: 'sp-sap', '(Projects)': ['Pommora'] }),
  )
  await mkdir(join(root, 'Notes', 'Daily'), { recursive: true })
  await writeFile(join(root, 'Notes', '_pagecollection.json'), JSON.stringify({ id: 'col-notes' }))
  await writeFile(
    join(root, 'Notes', 'Daily', '_pageset.json'),
    JSON.stringify({ id: 'set-daily' }),
  )
  await writeFile(
    join(root, 'Notes', 'Daily', 'Alpha.md'),
    `---\nPageID: ${PAGE_A}\n(Projects):\n  - Pommora\n---\nbody`,
  )
  await openSession(root)
})

afterEach(async () => {
  closeSession()
  await rm(root, { recursive: true, force: true })
})

describe('the bundle — one folder per deletion, holding the artifact and its record', () => {
  it('a page delete records identity + its parent container by the id the walk assigns', async () => {
    const tree = await readNexus(root)
    const dailyId = tree.collections[0].sets[0].id
    expect(dailyId).toBe('set-daily')

    const r = await handleMutate(
      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const { dir, record } = await onlyBundle()
    expect(basename(dir).endsWith('__Alpha.md.deleted')).toBe(true)
    // The artifact keeps the name it always had — there is no stamped leaf to parse back.
    expect(await bundleArtifact(dir)).toBe(join(dir, 'Alpha.md'))
    expect(record).toMatchObject({
      entity: 'page',
      id: PAGE_A,
      parent: { kind: 'container', id: dailyId },
    })
  })

  it('a root Collection delete records parent root; the folder sits inside the bundle', async () => {
    const r = await handleMutate({ op: 'delete', path: 'Notes', kind: 'collection' }, nexusDeps)
    expect(r.ok).toBe(true)
    const { dir, record } = await onlyBundle()
    expect(await bundleArtifact(dir)).toBe(join(dir, 'Notes'))
    expect(record).toMatchObject({
      entity: 'collection',
      id: 'col-notes',
      parent: { kind: 'root' },
    })
  })

  it('a Space delete records its context parent and the id-bearing roots that tagged it', async () => {
    const r = await handleMutate(
      { op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const { record } = await onlyBundle()
    expect(record).toMatchObject({
      entity: 'space',
      id: 'sp-pom',
      parent: { kind: 'context', id: 'ctx_projects' },
    })
    const members = (record as { members: { id: string; kind: string }[] }).members
    expect(members).toContainEqual({ id: PAGE_A, kind: 'page' })
    expect(members).toContainEqual({ id: 'sp-sap', kind: 'space' })
    expect(members).toHaveLength(2)
  })

  it('a Context delete records its registry entry and the outside membership map, spaces as {id, title}', async () => {
    const r = await handleMutate(
      { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const { record } = await onlyBundle()
    expect(record).toMatchObject({
      entity: 'context',
      registry: { id: 'ctx_projects', title: 'Projects', singular: 'Project', icon: 'target' },
    })
    const membership = (
      record as {
        membership: {
          root: { id?: string; kind: string }
          spaces: { id?: string; title: string }[]
        }[]
      }
    ).membership
    // The outside page is the only membership root — the in-Context Sapphire is a passenger
    // whose own links ride the trash intact.
    expect(membership).toHaveLength(1)
    expect(membership[0].root).toEqual({ id: PAGE_A, kind: 'page' })
    expect(membership[0].spaces).toEqual([{ id: 'sp-pom', title: 'Pommora' }])
  })

  it('system trash mode writes no bundle — the artifact leaves the nexus entirely', async () => {
    const systemDeps: MutateDeps = { trashMode: 'system', trashToSystem: async () => {} }
    const r = await handleMutate(
      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
      systemDeps,
    )
    expect(r.ok).toBe(true)
    expect(await bundleDirs(join(root, '.trash'))).toHaveLength(0)
  })

  it('all-or-nothing: an unreadable registry means a Context delete records nothing, and the delete still lands', async () => {
    await writeFile(contextsRegistryFile(root), '{corrupt')
    const r = await handleMutate(
      { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    // A recordless folder is not a bundle — the listing never offers it, and it degrades to
    // hand-restore rather than to a record restore would trust.
    expect(await listBundles(root)).toHaveLength(0)
    // The artifact itself still trashed recoverably.
    expect(await pathExists(join(contextsDir(root), 'Projects'))).toBe(false)
  })

  it('writeRecord → readRecord round-trips exactly; a malformed record reads null', async () => {
    await handleMutate({ op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' }, nexusDeps)
    const { dir, record } = await onlyBundle()
    expect(await readRecord(dir)).toEqual(record)
    await writeFile(join(dir, '_record.json'), '{not a record')
    expect(await readRecord(dir)).toBeNull()
    await writeFile(join(dir, '_record.json'), JSON.stringify({ hello: 'world' }))
    expect(await readRecord(dir)).toBeNull()
  })

  it('an unreadable parent sidecar degrades to unaddressable — the record is still written', async () => {
    await writeFile(join(root, 'Notes', 'Daily', '_pageset.json'), '{corrupt')
    const r = await handleMutate(
      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const { record } = await onlyBundle()
    expect(record).toMatchObject({ entity: 'page', id: PAGE_A, parent: { kind: 'unaddressable' } })
  })

  it('a refused root marks the Space record partial — the members list is thinner than the truth', async () => {
    await writeFile(
      join(root, 'Notes', 'Daily', 'Dual.md'),
      '---\nPageID: 01KVGMT8BFG350FZZXAMG1QDVB\nTaskID: 01KVGMT8BFG350FZZXAMG1QDVC\n(Projects):\n  - Pommora\n---\n',
    )
    await handleMutate(
      { op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' },
      nexusDeps,
    )
    const { record } = await onlyBundle()
    expect(record).toMatchObject({ entity: 'space', partial: true })
  })

  it('an id-less tagging root marks the Space record partial — its membership is unrestorable', async () => {
    await writeFile(join(root, 'Notes', 'Daily', 'NoId.md'), '---\n(Projects):\n  - Pommora\n---\n')
    await handleMutate(
      { op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' },
      nexusDeps,
    )
    const { record } = await onlyBundle()
    expect(record).toMatchObject({ entity: 'space', partial: true })
    const members = (record as { members: { id: string }[] }).members
    expect(members.every((m) => typeof m.id === 'string')).toBe(true)
  })

  it('an unreadable Space sidecar inside the Context marks its record partial', async () => {
    await mkdir(join(contextsDir(root), 'Projects', 'Broken'), { recursive: true })
    await writeFile(join(contextsDir(root), 'Projects', 'Broken', '_space.json'), '{corrupt')
    await handleMutate(
      { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
      nexusDeps,
    )
    const { record } = await onlyBundle()
    expect(record).toMatchObject({ entity: 'context', partial: true })
  })
})

describe('writePropertyBundle — the artifact-less shape', () => {
  it('de-collides within one timestamp — a same-stamp double delete keeps both records', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-01T12:00:00.000Z'))
    try {
      const record = {
        entity: 'property' as const,
        id: 'prop_x',
        def: { id: 'prop_x' },
        values: { a: 1 },
      }
      const first = await writePropertyBundle(root, record)
      const second = await writePropertyBundle(root, { ...record, values: { a: 2 } })
      expect(second).not.toBe(first)
      expect(await readRecord(first)).toMatchObject({ values: { a: 1 } })
      expect(await readRecord(second)).toMatchObject({ values: { a: 2 } })
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('listBundles — what the trash offers', () => {
  it('an incomplete deletion is skipped, and left on disk as evidence', async () => {
    await handleMutate({ op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' }, nexusDeps)
    const [dir] = await bundleDirs(join(root, '.trash'))
    await rm(join(dir, 'Alpha.md'), { force: true })
    await writePropertyBundle(root, {
      entity: 'property',
      id: 'prop_x',
      def: { id: 'prop_x' },
      values: {},
    })
    for (let n = 0; n < 3; n++) {
      const listed = await listBundles(root)
      expect(listed).toHaveLength(1)
      expect(listed[0].record.entity).toBe('property')
    }
    // Never pruned — the record is the only evidence that destruction happened.
    expect(await pathExists(join(dir, '_record.json'))).toBe(true)
  })

  it('the record shares a folder with the artifact and can never collide with it', async () => {
    // The one name that would collide if the record wore a plain one. `invalidName` lets a user
    // choose it; the record's `_` prefix is what keeps the two namespaces apart.
    await mkdir(join(root, 'record.json'), { recursive: true })
    await writeFile(
      join(root, 'record.json', '_pagecollection.json'),
      JSON.stringify({ id: 'col-odd' }),
    )
    const r = await handleMutate(
      { op: 'delete', path: 'record.json', kind: 'collection' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const [listed] = await listBundles(root)
    expect(listed.record).toMatchObject({ entity: 'collection', id: 'col-odd' })
    const restored = await handleMutate({ op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(restored.ok).toBe(true)
    expect(await pathExists(join(root, 'record.json', '_pagecollection.json'))).toBe(true)
  })

  it('Finder litter beside the artifact changes nothing', async () => {
    await handleMutate({ op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' }, nexusDeps)
    const [dir] = await bundleDirs(join(root, '.trash'))
    await writeFile(join(dir, '.DS_Store'), 'junk')
    expect(await bundleArtifact(dir)).toBe(join(dir, 'Alpha.md'))
    expect(await listBundles(root)).toHaveLength(1)
  })

  it('a bundle’s interior is trashed content, never trash structure', async () => {
    await handleMutate({ op: 'delete', path: 'Notes', kind: 'collection' }, nexusDeps)
    const [dir] = await bundleDirs(join(root, '.trash'))
    // A user's own folder named like a bundle, riding inside the trashed Collection.
    const phantom = join(dir, 'Notes', 'Archive.deleted')
    await mkdir(phantom, { recursive: true })
    await writeFile(
      join(phantom, '_record.json'),
      JSON.stringify({ entity: 'page', parent: { kind: 'root' } }),
    )
    const listed = await listBundles(root)
    expect(listed).toHaveLength(1)
    expect(listed[0].record.entity).toBe('collection')
  })

  it('a chain folder that merely wears the name is walked through, not read as a deletion', async () => {
    // A Collection a user genuinely named "Archive.deleted" — its mirrored chain folder in
    // .trash carries the same name and holds the real bundle.
    await mkdir(join(root, 'Archive.deleted'), { recursive: true })
    await writeFile(
      join(root, 'Archive.deleted', '_pagecollection.json'),
      JSON.stringify({ id: 'col-archive' }),
    )
    await writeFile(
      join(root, 'Archive.deleted', 'Beta.md'),
      '---\nPageID: 01KVGMT8BFG350FZZXAMG1QDVF\n---\nbody',
    )
    const r = await handleMutate(
      { op: 'delete', path: 'Archive.deleted/Beta.md', kind: 'page' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const listed = await listBundles(root)
    expect(listed).toHaveLength(1)
    expect(listed[0].record).toMatchObject({ entity: 'page' })
  })

  it('old-format trash entries are invisible', async () => {
    // Both shapes the retired primitive left: a stamped file with a sibling pair, and a stamped
    // FOLDER for a container delete.
    const old = join(root, '.trash', 'Notes')
    await mkdir(join(old, '2026-01-01T00-00-00-000Z__Journal'), { recursive: true })
    await writeFile(join(old, '2026-01-01T00-00-00-000Z__Old.md'), 'body')
    await writeFile(
      join(old, '2026-01-01T00-00-00-000Z__Old.md.provenance.json'),
      JSON.stringify({ entity: 'page', id: 'old', parent: { kind: 'root' } }),
    )
    await writeFile(
      join(old, '2026-01-01T00-00-00-000Z__Journal.provenance.json'),
      JSON.stringify({ entity: 'set', id: 'old-set', parent: { kind: 'root' } }),
    )
    expect(await listBundles(root)).toHaveLength(0)
  })
})

describe('resolveRecord — a placement with final names, or a typed refusal', () => {
  const P = (over: Partial<import('@shared/types').PageNode> = {}) =>
    ({
      kind: 'page',
      id: 'page-x',
      title: 'X',
      path: 'Notes/X.md',
      ...over,
    }) as import('@shared/types').PageNode
  const treeOf = (
    contexts: import('@shared/types').ContextGroup[],
    collections: Partial<import('@shared/types').CollectionNode>[],
  ) => ({ contexts, collections }) as unknown as import('@shared/types').NexusTree

  const journal = (over: Partial<import('@shared/types').SetNode> = {}) =>
    ({
      kind: 'set',
      id: 'set-daily',
      title: 'Journal',
      path: 'Notes/Journal',
      pages: [],
      sets: [],
      ...over,
    }) as import('@shared/types').SetNode

  const notes = (
    sets: import('@shared/types').SetNode[] = [journal()],
    pages: import('@shared/types').PageNode[] = [],
  ) => ({
    kind: 'collection' as const,
    id: 'col-notes',
    title: 'Notes',
    path: 'Notes',
    sets,
    pages,
  })

  const pageRecord = {
    entity: 'page' as const,
    id: PAGE_A,
    parent: { kind: 'container' as const, id: 'set-daily' },
  }

  it('places a page into its parent container at the container’s CURRENT path', () => {
    const r = resolveRecord(pageRecord, 'Alpha.md', treeOf([], [notes()]))
    expect(r).toEqual({ place: { dir: 'Notes/Journal', finalName: 'Alpha.md' } })
  })

  it('disambiguates a taken title, matching the create convention', () => {
    const taken = journal({
      pages: [P({ id: 'page-o', title: 'Alpha', path: 'Notes/Journal/Alpha.md' })],
    })
    const r = resolveRecord(pageRecord, 'Alpha.md', treeOf([], [notes([taken])]))
    expect(r).toEqual({ place: { dir: 'Notes/Journal', finalName: 'Alpha 2.md' } })
  })

  it('a set title also blocks a page name — one folder cannot hold both', () => {
    const inner = journal({
      sets: [journal({ id: 'set-inner', title: 'Alpha', path: 'Notes/Journal/Alpha' })],
    })
    const r = resolveRecord(pageRecord, 'Alpha.md', treeOf([], [notes([inner])]))
    expect(r).toEqual({ place: { dir: 'Notes/Journal', finalName: 'Alpha 2.md' } })
  })

  it('refuses when the parent is gone — a still-trashed parent is the same answer', () => {
    expect(resolveRecord(pageRecord, 'Alpha.md', treeOf([], [notes([])]))).toEqual({
      refuse: 'parent-gone',
    })
  })

  it('refuses when the parent id resolves to a kind that cannot hold this one', () => {
    const tree = treeOf(
      [
        {
          def: { id: 'ctx_a', title: 'Areas' },
          spaces: [
            {
              kind: 'space',
              id: 'set-daily',
              title: 'S',
              path: '.nexus/contexts/Areas/S',
              contextId: 'ctx_a',
            } as import('@shared/types').SpaceNode,
          ],
        },
      ],
      [notes([])],
    )
    expect(resolveRecord(pageRecord, 'Alpha.md', tree)).toEqual({ refuse: 'cannot-hold' })
  })

  it('a live id refuses, and it outranks every other answer', () => {
    const tree = treeOf(
      [],
      [notes([], [P({ id: PAGE_A, title: 'Elsewhere', path: 'Notes/Elsewhere.md' })])],
    )
    expect(resolveRecord(pageRecord, 'Alpha.md', tree)).toEqual({ refuse: 'id-live' })
  })

  it('an unaddressable parent refuses', () => {
    const record = {
      entity: 'page' as const,
      id: PAGE_A,
      parent: { kind: 'unaddressable' as const },
    }
    expect(resolveRecord(record, 'Alpha.md', treeOf([], [notes()]))).toEqual({
      refuse: 'unaddressable',
    })
  })

  it('a collection returns to the root, disambiguated against its siblings', () => {
    const record = {
      entity: 'collection' as const,
      id: 'col-back',
      parent: { kind: 'root' as const },
    }
    const r = resolveRecord(record, 'Notes', treeOf([], [notes()]))
    expect(r).toEqual({ place: { dir: '', finalName: 'Notes 2' } })
  })

  it('a Space follows its Context to the Context’s CURRENT title, colliding titles disambiguated', () => {
    const tree = treeOf(
      [
        {
          def: { id: 'ctx_projects', title: 'Ventures' },
          spaces: [
            {
              kind: 'space',
              id: 'sp-other',
              title: 'Pommora',
              path: '.nexus/contexts/Ventures/Pommora',
              contextId: 'ctx_projects',
            } as import('@shared/types').SpaceNode,
          ],
        },
      ],
      [],
    )
    const record = {
      entity: 'space' as const,
      id: 'sp-pom',
      parent: { kind: 'context' as const, id: 'ctx_projects' },
      members: [],
    }
    const r = resolveRecord(record, 'Pommora', tree)
    expect(r).toEqual({
      place: { dir: '.nexus/contexts/Ventures', finalName: 'Pommora 2', finalTitle: 'Pommora 2' },
    })
  })

  it('a Context re-enters the registry under a disambiguated final title', () => {
    const tree = treeOf([{ def: { id: 'ctx_new', title: 'Projects' }, spaces: [] }], [])
    const record = {
      entity: 'context' as const,
      registry: { id: 'ctx_projects', title: 'Projects' },
      membership: [],
    }
    const r = resolveRecord(record, 'Projects', tree)
    expect(r).toEqual({
      place: { dir: '.nexus/contexts', finalName: 'Projects 2', finalTitle: 'Projects 2' },
    })
  })

  it('a Context whose registry id is already live refuses', () => {
    const tree = treeOf([{ def: { id: 'ctx_projects', title: 'Elsewhere' }, spaces: [] }], [])
    const record = {
      entity: 'context' as const,
      registry: { id: 'ctx_projects', title: 'Projects' },
      membership: [],
    }
    expect(resolveRecord(record, 'Projects', tree)).toEqual({ refuse: 'id-live' })
  })
})

describe('restore — the record spends, headless', () => {
  it('a page returns into its since-renamed parent', async () => {
    await handleMutate({ op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' }, nexusDeps)
    await rename(join(root, 'Notes', 'Daily'), join(root, 'Notes', 'Journal'))
    const [listed] = await listBundles(root)
    const r = await handleMutate({ op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(r.ok).toBe(true)
    expect(await readFile(join(root, 'Notes', 'Journal', 'Alpha.md'), 'utf8')).toContain(PAGE_A)
    // The spent bundle leaves nothing behind.
    expect(await bundleDirs(join(root, '.trash'))).toHaveLength(0)
  })

  it('a Space round-trips: the surviving roots carry its tag again', async () => {
    await handleMutate(
      { op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' },
      nexusDeps,
    )
    expect(
      splitFrontmatter(await readFile(join(root, 'Notes', 'Daily', 'Alpha.md'), 'utf8'))[
        '(Projects)'
      ],
    ).toBeUndefined()

    const [listed] = await listBundles(root)
    const r = await handleMutate({ op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(r.ok).toBe(true)
    expect(await pathExists(join(contextsDir(root), 'Projects', 'Pommora', '_space.json'))).toBe(
      true,
    )
    expect(
      splitFrontmatter(await readFile(join(root, 'Notes', 'Daily', 'Alpha.md'), 'utf8'))[
        '(Projects)'
      ],
    ).toEqual(['Pommora'])
    const sap = JSON.parse(
      await readFile(join(contextsDir(root), 'Projects', 'Sapphire', '_space.json'), 'utf8'),
    )
    expect(sap['(Projects)']).toEqual(['Pommora'])
  })

  it('a Context round-trips: the registry entry appends and membership re-applies', async () => {
    await handleMutate(
      { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
      nexusDeps,
    )
    const [listed] = await listBundles(root)
    const r = await handleMutate({ op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(r.ok).toBe(true)
    const reg = JSON.parse(await readFile(contextsRegistryFile(root), 'utf8'))
    expect(reg.contexts).toContainEqual({
      id: 'ctx_projects',
      title: 'Projects',
      singular: 'Project',
      icon: 'target',
    })
    expect(
      splitFrontmatter(await readFile(join(root, 'Notes', 'Daily', 'Alpha.md'), 'utf8'))[
        '(Projects)'
      ],
    ).toEqual(['Pommora'])
    // The passenger Space returned intact, its own links untouched by the round-trip.
    const sap = JSON.parse(
      await readFile(join(contextsDir(root), 'Projects', 'Sapphire', '_space.json'), 'utf8'),
    )
    expect(sap['(Projects)']).toEqual(['Pommora'])
  })

  it('the resolver re-runs inside the op — a parent gone between list and restore refuses', async () => {
    await handleMutate({ op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' }, nexusDeps)
    const [listed] = await listBundles(root)
    await handleMutate({ op: 'delete', path: 'Notes/Daily', kind: 'set' }, nexusDeps)
    const r = await handleMutate({ op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(r.ok).toBe(false)
  })

  it('an incomplete deletion refuses, and its record stays put', async () => {
    await handleMutate({ op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' }, nexusDeps)
    const [dir] = await bundleDirs(join(root, '.trash'))
    await rm(join(dir, 'Alpha.md'), { force: true })
    const r = await handleMutate(
      { op: 'restore', bundlePath: join('.trash', 'Notes', 'Daily', basename(dir)) },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
    expect(await pathExists(join(dir, '_record.json'))).toBe(true)
  })
})

describe('restore — the gate-four pins', () => {
  it('a corrupt registry refuses a Context restore with the bundle intact', async () => {
    await handleMutate(
      { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
      nexusDeps,
    )
    await writeFile(contextsRegistryFile(root), '{corrupt')
    const [listed] = await listBundles(root)
    const r = await handleMutate({ op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(r.ok).toBe(false)
    // Nothing moved and the evidence survives — the restore is retryable once the registry heals.
    expect(await bundleDirs(join(root, '.trash'))).toHaveLength(1)
    expect(await pathExists(join(contextsDir(root), 'Projects'))).toBe(false)
  })

  it('a Context restore under a title collision lands the FINAL title everywhere', async () => {
    await handleMutate(
      { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
      nexusDeps,
    )
    // An impostor mints the freed title while the original sits in trash.
    const reg = JSON.parse(await readFile(contextsRegistryFile(root), 'utf8'))
    reg.contexts.push({ id: 'ctx_impostor', title: 'Projects' })
    await writeFile(contextsRegistryFile(root), JSON.stringify(reg))
    await mkdir(join(contextsDir(root), 'Projects'), { recursive: true })

    const [listed] = await listBundles(root)
    const r = await handleMutate({ op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(r.ok).toBe(true)
    // Folder, registry entry, and membership key all wear the resolver's final title.
    expect(await pathExists(join(contextsDir(root), 'Projects 2', 'Pommora', '_space.json'))).toBe(
      true,
    )
    const after = JSON.parse(await readFile(contextsRegistryFile(root), 'utf8'))
    expect(after.contexts).toContainEqual({
      id: 'ctx_projects',
      title: 'Projects 2',
      singular: 'Project',
      icon: 'target',
    })
    const fm = splitFrontmatter(await readFile(join(root, 'Notes', 'Daily', 'Alpha.md'), 'utf8'))
    expect(fm['(Projects 2)']).toEqual(['Pommora'])
    expect(fm['(Projects)']).toBeUndefined()
  })

  it('an occupant the tree cannot see refuses the restore — never a clobber', async () => {
    await handleMutate({ op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' }, nexusDeps)
    // An Unknown squatter takes the resolved target: same name, contradicting kind key.
    await writeFile(
      join(root, 'Notes', 'Daily', 'Alpha.md'),
      '---\nTaskID: 01KVGMT8BFG350FZZXAMG1QDVD\n---\nsquatter',
    )
    const [listed] = await listBundles(root)
    const r = await handleMutate({ op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(r.ok).toBe(false)
    expect(await readFile(join(root, 'Notes', 'Daily', 'Alpha.md'), 'utf8')).toContain('squatter')
    expect(await bundleDirs(join(root, '.trash'))).toHaveLength(1)
  })

  it('only a trash bundle restores — an in-nexus path refuses', async () => {
    await mkdir(join(root, 'Notes', 'fake.deleted'), { recursive: true })
    await writeFile(
      join(root, 'Notes', 'fake.deleted', '_record.json'),
      JSON.stringify({ entity: 'page', id: 'x', parent: { kind: 'root' } }),
    )
    const r = await handleMutate({ op: 'restore', bundlePath: 'Notes/fake.deleted' }, nexusDeps)
    expect(r.ok).toBe(false)
    expect(await pathExists(join(root, 'Notes', 'fake.deleted', '_record.json'))).toBe(true)
  })

  it('a property whose definition can no longer stand does not return, and its record stays', async () => {
    // A record the registry refuses — here a definition with no name at all.
    const bundle = await writePropertyBundle(root, {
      entity: 'property',
      id: 'prop_x',
      def: { id: 'prop_x' },
      values: {},
    })
    const [listed] = await listBundles(root)
    const r = await handleMutate({ op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(r.ok).toBe(false)
    expect(await pathExists(join(bundle, '_record.json'))).toBe(true)
  })
})

describe('restore — the attack folds', () => {
  it('a record cannot steer the artifact outside the nexus', async () => {
    await handleMutate(
      { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
      nexusDeps,
    )
    const [dir] = await bundleDirs(join(root, '.trash'))
    const record = JSON.parse(await readFile(join(dir, '_record.json'), 'utf8'))
    record.registry.title = '../../../escape-target'
    await writeFile(join(dir, '_record.json'), JSON.stringify(record))
    const [listed] = await listBundles(root)
    const r = await handleMutate({ op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(r.ok).toBe(false)
    expect(await pathExists(join(root, '..', 'escape-target'))).toBe(false)
  })

  it('a numeric-prefixed filename round-trips intact — the artifact keeps its real name', async () => {
    await writeFile(
      join(root, 'Notes', 'Daily', '12__Notes.md'),
      '---\nPageID: 01KVGMT8BFG350FZZXAMG1QDVE\n---\nbody',
    )
    await handleMutate({ op: 'delete', path: 'Notes/Daily/12__Notes.md', kind: 'page' }, nexusDeps)
    const [listed] = await listBundles(root)
    const r = await handleMutate({ op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(r.ok).toBe(true)
    expect(await pathExists(join(root, 'Notes', 'Daily', '12__Notes.md'))).toBe(true)
    expect(await pathExists(join(root, 'Notes', 'Daily', 'Notes.md'))).toBe(false)
  })

  it('a failed move rolls the registry re-entry back — the restore stays retryable', async () => {
    const { chmod } = await import('node:fs/promises')
    await handleMutate(
      { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
      nexusDeps,
    )
    await chmod(join(root, '.nexus', 'contexts'), 0o555)
    try {
      const [listed] = await listBundles(root)
      const failed = await handleMutate({ op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
      expect(failed.ok).toBe(false)
      // No ghost entry: the append reversed when the move refused.
      const reg = JSON.parse(await readFile(contextsRegistryFile(root), 'utf8'))
      expect(reg.contexts.some((c: { id: string }) => c.id === 'ctx_projects')).toBe(false)
    } finally {
      await chmod(join(root, '.nexus', 'contexts'), 0o755)
    }
    const [listed] = await listBundles(root)
    const retried = await handleMutate({ op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(retried.ok).toBe(true)
    expect(await pathExists(join(contextsDir(root), 'Projects', 'Pommora'))).toBe(true)
  })

  it('a disambiguated Context restore re-keys its own passengers to the final title', async () => {
    // Sapphire tags Pommora INSIDE Projects — a passenger link the delete never strips.
    await handleMutate(
      { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
      nexusDeps,
    )
    const reg = JSON.parse(await readFile(contextsRegistryFile(root), 'utf8'))
    reg.contexts.push({ id: 'ctx_impostor', title: 'Projects' })
    await writeFile(contextsRegistryFile(root), JSON.stringify(reg))
    await mkdir(join(contextsDir(root), 'Projects'), { recursive: true })

    const [listed] = await listBundles(root)
    const r = await handleMutate({ op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(r.ok).toBe(true)
    const sap = JSON.parse(
      await readFile(join(contextsDir(root), 'Projects 2', 'Sapphire', '_space.json'), 'utf8'),
    )
    // The passenger's key follows the final title — never left pointing at the impostor.
    expect(sap['(Projects 2)']).toEqual(['Pommora'])
    expect('(Projects)' in sap).toBe(false)
  })
})

describe('emptyBundle — giving a bundle up for good', () => {
  it('hands the artifact to the system trash and removes the spent bundle behind it', async () => {
    const handed: string[] = []
    const deps: MutateDeps = { ...nexusDeps, trashToSystem: async (p) => void handed.push(p) }
    await handleMutate({ op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' }, nexusDeps)
    const [listed] = await listBundles(root)
    const r = await handleMutate({ op: 'emptyBundle', bundlePath: listed.bundlePath }, deps)
    expect(r.ok).toBe(true)
    // The artifact leaves under its own name — never a stamped folder wrapping it.
    expect(handed).toHaveLength(1)
    expect(handed[0].endsWith(join(listed.bundlePath, 'Alpha.md'))).toBe(true)
    expect(await pathExists(join(root, listed.bundlePath))).toBe(false)
    expect(await listBundles(root)).toHaveLength(0)
  })

  it('with the switch on the artifact never reaches the system trash at all', async () => {
    const handed: string[] = []
    const deps: MutateDeps = {
      ...nexusDeps,
      permanentDelete: true,
      trashToSystem: async (p) => void handed.push(p),
    }
    await handleMutate({ op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' }, nexusDeps)
    const [listed] = await listBundles(root)
    const r = await handleMutate({ op: 'emptyBundle', bundlePath: listed.bundlePath }, deps)
    expect(r.ok).toBe(true)
    expect(handed).toEqual([])
    expect(await pathExists(join(root, listed.bundlePath))).toBe(false)
  })

  it('refuses a chain folder that merely wears the suffix, bundles and all', async () => {
    // `.trash` mirrors the nexus, so a user's own folder can wear the bundle name anywhere in the
    // chain. Path, root and suffix all pass here; only the record test refuses it.
    await handleMutate({ op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' }, nexusDeps)
    const [listed] = await listBundles(root)
    const chain = join(root, '.trash', 'Archive.deleted')
    await mkdir(chain, { recursive: true })
    await rename(join(root, listed.bundlePath), join(chain, basename(listed.bundlePath)))
    const r = await handleMutate(
      { op: 'emptyBundle', bundlePath: '.trash/Archive.deleted' },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
    // The real bundle inside it is untouched — it would have gone with the folder.
    expect(await listBundles(root)).toHaveLength(1)
  })

  it('refuses a path inside the nexus but outside the trash, and one that escapes the root', async () => {
    expect((await handleMutate({ op: 'emptyBundle', bundlePath: 'Notes' }, nexusDeps)).ok).toBe(
      false,
    )
    expect(await pathExists(join(root, 'Notes'))).toBe(true)
    const out = await handleMutate({ op: 'emptyBundle', bundlePath: '../escape' }, nexusDeps)
    expect(out.ok).toBe(false)
  })

  it('a spent bundle refuses rather than reporting success twice', async () => {
    await handleMutate({ op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' }, nexusDeps)
    const [listed] = await listBundles(root)
    expect(
      (await handleMutate({ op: 'emptyBundle', bundlePath: listed.bundlePath }, nexusDeps)).ok,
    ).toBe(true)
    expect(
      (await handleMutate({ op: 'emptyBundle', bundlePath: listed.bundlePath }, nexusDeps)).ok,
    ).toBe(false)
  })

  it('refuses when the bundle holds more than the artifact, rather than erasing it', async () => {
    // `bundleArtifact` answers only for exactly one visible entry, so a sync client's conflict copy
    // reads as no artifact at all. Removing the folder anyway would destroy the file with the
    // switch OFF — the setting that promises the operating system keeps the last undo.
    const handed: string[] = []
    const deps: MutateDeps = { ...nexusDeps, trashToSystem: async (p) => void handed.push(p) }
    await handleMutate({ op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' }, nexusDeps)
    const [listed] = await listBundles(root)
    const bundlePath = listed.bundlePath
    await writeFile(join(root, bundlePath, 'Alpha 2.md'), 'conflict copy')
    const r = await handleMutate({ op: 'emptyBundle', bundlePath }, deps)
    expect(r.ok).toBe(false)
    expect(handed).toEqual([])
    expect(await pathExists(join(root, bundlePath, 'Alpha.md'))).toBe(true)
  })

  it('a system-trash handoff that rejects leaves the bundle whole', async () => {
    const deps: MutateDeps = {
      ...nexusDeps,
      trashToSystem: async () => {
        throw new Error('nope')
      },
    }
    await handleMutate({ op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' }, nexusDeps)
    const [listed] = await listBundles(root)
    const r = await handleMutate({ op: 'emptyBundle', bundlePath: listed.bundlePath }, deps)
    expect(r.ok).toBe(false)
    expect(await listBundles(root)).toHaveLength(1)
  })
})

describe('restore — into a chosen destination', () => {
  /** The bundle for the one thing deleted last. */
  const lastBundle = async (name: string): Promise<string> => {
    const hit = (await listBundles(root)).find((b) => b.artifactName === name)
    expect(hit).toBeDefined()
    return (hit as { bundlePath: string }).bundlePath
  }

  it('a page whose Set is gone lands in the Collection the user picks', async () => {
    await handleMutate({ op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' }, nexusDeps)
    await handleMutate({ op: 'delete', path: 'Notes/Daily', kind: 'set' }, nexusDeps)
    const bundlePath = await lastBundle('Alpha.md')
    // Nothing climbs on its own: the plain restore refuses first.
    expect((await handleMutate({ op: 'restore', bundlePath }, nexusDeps)).ok).toBe(false)
    const r = await handleMutate(
      { op: 'restore', bundlePath, destination: { kind: 'container', id: 'col-notes' } },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(await pathExists(join(root, 'Notes', 'Alpha.md'))).toBe(true)
  })

  it('a page lands in a Set, and a Set lands in a Collection', async () => {
    await mkdir(join(root, 'Notes', 'Weekly'), { recursive: true })
    await writeFile(
      join(root, 'Notes', 'Weekly', '_pageset.json'),
      JSON.stringify({ id: 'set-week' }),
    )
    await handleMutate({ op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' }, nexusDeps)
    const pageBundle = await lastBundle('Alpha.md')
    expect(
      (
        await handleMutate(
          {
            op: 'restore',
            bundlePath: pageBundle,
            destination: { kind: 'container', id: 'set-week' },
          },
          nexusDeps,
        )
      ).ok,
    ).toBe(true)
    expect(await pathExists(join(root, 'Notes', 'Weekly', 'Alpha.md'))).toBe(true)

    await handleMutate({ op: 'delete', path: 'Notes/Weekly', kind: 'set' }, nexusDeps)
    const setBundle = await lastBundle('Weekly')
    expect(
      (
        await handleMutate(
          {
            op: 'restore',
            bundlePath: setBundle,
            destination: { kind: 'container', id: 'col-notes' },
          },
          nexusDeps,
        )
      ).ok,
    ).toBe(true)
    expect(await pathExists(join(root, 'Notes', 'Weekly', 'Alpha.md'))).toBe(true)
  })

  it('a Space whose Context is gone lands in the Context the user picks', async () => {
    const reg = JSON.parse(await readFile(contextsRegistryFile(root), 'utf8'))
    reg.contexts.push({ id: 'ctx_areas', title: 'Areas' })
    await writeFile(contextsRegistryFile(root), JSON.stringify(reg))
    await mkdir(join(contextsDir(root), 'Areas'), { recursive: true })

    await handleMutate(
      { op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' },
      nexusDeps,
    )
    await handleMutate(
      { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
      nexusDeps,
    )
    const bundlePath = await lastBundle('Pommora')
    expect((await handleMutate({ op: 'restore', bundlePath }, nexusDeps)).ok).toBe(false)
    const r = await handleMutate(
      { op: 'restore', bundlePath, destination: { kind: 'context', id: 'ctx_areas' } },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(await pathExists(join(contextsDir(root), 'Areas', 'Pommora', '_space.json'))).toBe(true)
  })

  it('refuses the destination the move check would refuse — a Space is not a container', async () => {
    await handleMutate({ op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' }, nexusDeps)
    await handleMutate({ op: 'delete', path: 'Notes/Daily', kind: 'set' }, nexusDeps)
    const bundlePath = await lastBundle('Alpha.md')
    // The Space's own id, offered as a container — the same answer `movesInto` gives a page
    // dragged onto a Space folder.
    const r = await handleMutate(
      { op: 'restore', bundlePath, destination: { kind: 'container', id: 'sp-pom' } },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
    const moved = await handleMutate(
      {
        op: 'movePage',
        path: 'Notes/Daily/Alpha.md',
        newParentPath: '.nexus/contexts/Projects/Pommora',
      },
      nexusDeps,
    )
    expect(moved.ok).toBe(false)
  })

  it('refuses a destination whose own label contradicts the id it carries', async () => {
    // A live Context id, arriving labelled as a container. Honouring it would place the Space
    // correctly by accident on a message that is malformed — the label is the sender's claim, and
    // a claim that disagrees with its own id is not a claim this path acts on.
    await handleMutate(
      { op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' },
      nexusDeps,
    )
    const bundlePath = await lastBundle('Pommora')
    const r = await handleMutate(
      { op: 'restore', bundlePath, destination: { kind: 'container', id: 'ctx_projects' } },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
    expect(await pathExists(join(contextsDir(root), 'Projects', 'Pommora'))).toBe(false)
  })

  it('refuses a Space offered a container, and a container id naming nothing', async () => {
    await handleMutate(
      { op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' },
      nexusDeps,
    )
    const spaceBundle = await lastBundle('Pommora')
    expect(
      (
        await handleMutate(
          {
            op: 'restore',
            bundlePath: spaceBundle,
            destination: { kind: 'container', id: 'col-notes' },
          },
          nexusDeps,
        )
      ).ok,
    ).toBe(false)
    // Never falls back to the recorded parent when the pick names nothing.
    expect(
      (
        await handleMutate(
          {
            op: 'restore',
            bundlePath: spaceBundle,
            destination: { kind: 'context', id: 'ctx_nope' },
          },
          nexusDeps,
        )
      ).ok,
    ).toBe(false)
    expect(await listBundles(root)).toHaveLength(1)
  })

  it('refuses a destination for a kind that cannot be homeless', async () => {
    await handleMutate({ op: 'delete', path: 'Notes', kind: 'collection' }, nexusDeps)
    const bundlePath = await lastBundle('Notes')
    const r = await handleMutate(
      { op: 'restore', bundlePath, destination: { kind: 'container', id: 'col-notes' } },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
  })

  it('a live identity still refuses, destination or not', async () => {
    await handleMutate({ op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' }, nexusDeps)
    const bundlePath = await lastBundle('Alpha.md')
    // The same PageID back in the tree under another name.
    await writeFile(join(root, 'Notes', 'Twin.md'), `---\nPageID: ${PAGE_A}\n---\nbody`)
    const r = await handleMutate(
      { op: 'restore', bundlePath, destination: { kind: 'container', id: 'col-notes' } },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
  })

  it('a relocation is reconciled against the schema it lands in, not the one it left', async () => {
    // Two Collections, only one of which assigns the property the page carries.
    await writeFile(
      join(root, '.nexus', 'properties.json'),
      JSON.stringify({
        order: ['prop_status'],
        defs: {
          prop_status: {
            id: 'prop_status',
            name: 'Status',
            type: 'select',
            select_options: [{ value: 'live', label: 'Live', color: 'green' }],
          },
        },
      }),
    )
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'col-notes', properties: ['prop_status'] }),
    )
    await mkdir(join(root, 'Plain'), { recursive: true })
    await writeFile(
      join(root, 'Plain', '_pagecollection.json'),
      JSON.stringify({ id: 'col-plain' }),
    )
    await writeFile(
      join(root, 'Notes', 'Daily', 'Beta.md'),
      '---\nPageID: 01KVGMT8BFG350FZZXAMG1QDVB\n<Status>: live\n---\nbody',
    )
    await handleMutate({ op: 'delete', path: 'Notes/Daily/Beta.md', kind: 'page' }, nexusDeps)
    await handleMutate({ op: 'delete', path: 'Notes/Daily', kind: 'set' }, nexusDeps)
    const bundlePath = await lastBundle('Beta.md')
    const r = await handleMutate(
      { op: 'restore', bundlePath, destination: { kind: 'container', id: 'col-plain' } },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const landed = await readFile(join(root, 'Plain', 'Beta.md'), 'utf8')
    // The value travelled; the destination's configuration decided it could not stay.
    expect(landed.includes('<Status>')).toBe(false)
    expect(landed.includes('PageID:')).toBe(true)
  })

  it('the same page restored to a Collection that DOES assign it keeps the value', async () => {
    await writeFile(
      join(root, '.nexus', 'properties.json'),
      JSON.stringify({
        order: ['prop_status'],
        defs: {
          prop_status: {
            id: 'prop_status',
            name: 'Status',
            type: 'select',
            select_options: [{ value: 'live', label: 'Live', color: 'green' }],
          },
        },
      }),
    )
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'col-notes', properties: ['prop_status'] }),
    )
    await writeFile(
      join(root, 'Notes', 'Daily', 'Beta.md'),
      '---\nPageID: 01KVGMT8BFG350FZZXAMG1QDVB\n<Status>: live\n---\nbody',
    )
    await handleMutate({ op: 'delete', path: 'Notes/Daily/Beta.md', kind: 'page' }, nexusDeps)
    await handleMutate({ op: 'delete', path: 'Notes/Daily', kind: 'set' }, nexusDeps)
    const bundlePath = await lastBundle('Beta.md')
    const r = await handleMutate(
      { op: 'restore', bundlePath, destination: { kind: 'container', id: 'col-notes' } },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(
      (await readFile(join(root, 'Notes', 'Beta.md'), 'utf8')).includes('<Status>: live'),
    ).toBe(true)
  })
})
