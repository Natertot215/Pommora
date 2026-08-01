import { mkdir, mkdtemp, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pathExists } from './io/atomicWrite'
import { handleMutate, type MutateDeps } from './mutate'
import { contextsDir, contextsRegistryFile } from './paths'
import { artifactBaseName, listPairs, readPair, resolvePair, writePropertyPair } from './provenance'
import { readNexus, splitFrontmatter } from './readNexus'
import { closeSession, openSession } from './session'

const PAGE_A = '01KVGMT8BFG350FZZXAMG1QDVA'
const nexusDeps: MutateDeps = { trashMode: 'nexus', trashToSystem: async () => {} }

let root: string

/** Every pair file under .trash, recursively. */
async function pairFiles(dir: string): Promise<string[]> {
  const out: string[] = []
  let entries: import('node:fs').Dirent[]
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    const abs = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await pairFiles(abs)))
    else if (e.name.endsWith('.provenance.json')) out.push(abs)
  }
  return out
}

const onlyPair = async (): Promise<{ file: string; pair: unknown }> => {
  const files = await pairFiles(join(root, '.trash'))
  expect(files).toHaveLength(1)
  return { file: files[0], pair: await readPair(files[0]) }
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-prov-'))
  await mkdir(join(root, '.nexus'), { recursive: true })
  await writeFile(join(root, '.nexus', 'nexus.json'), JSON.stringify({ id: 'nx', createdAt: '2026' }))
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
  await writeFile(join(root, 'Notes', 'Daily', '_pageset.json'), JSON.stringify({ id: 'set-daily' }))
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

describe('the pair — one JSON beside every nexus-trashed artifact', () => {
  it('a page delete records identity + its parent container by the id the walk assigns', async () => {
    const tree = await readNexus(root)
    const dailyId = tree.collections[0].sets[0].id
    expect(dailyId).toBe('set-daily')

    const r = await handleMutate({ op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' }, nexusDeps)
    expect(r.ok).toBe(true)
    const { file, pair } = await onlyPair()
    expect(file.endsWith('Alpha.md.provenance.json')).toBe(true)
    expect(pair).toMatchObject({
      entity: 'page',
      id: PAGE_A,
      parent: { kind: 'container', id: dailyId },
    })
  })

  it('a root Collection delete records parent root; the pair sits beside the folder artifact', async () => {
    const r = await handleMutate({ op: 'delete', path: 'Notes', kind: 'collection' }, nexusDeps)
    expect(r.ok).toBe(true)
    const { pair } = await onlyPair()
    expect(pair).toMatchObject({ entity: 'collection', id: 'col-notes', parent: { kind: 'root' } })
  })

  it('a Space delete records its context parent and the id-bearing roots that tagged it', async () => {
    const r = await handleMutate(
      { op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const { pair } = await onlyPair()
    expect(pair).toMatchObject({
      entity: 'space',
      id: 'sp-pom',
      parent: { kind: 'context', id: 'ctx_projects' },
    })
    const members = (pair as { members: { id: string; kind: string }[] }).members
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
    const { pair } = await onlyPair()
    expect(pair).toMatchObject({
      entity: 'context',
      registry: { id: 'ctx_projects', title: 'Projects', singular: 'Project', icon: 'target' },
    })
    const membership = (
      pair as {
        membership: { root: { id?: string; kind: string }; spaces: { id?: string; title: string }[] }[]
      }
    ).membership
    // The outside page is the only membership root — the in-Context Sapphire is a passenger
    // whose own links ride the trash intact.
    expect(membership).toHaveLength(1)
    expect(membership[0].root).toEqual({ id: PAGE_A, kind: 'page' })
    expect(membership[0].spaces).toEqual([{ id: 'sp-pom', title: 'Pommora' }])
  })

  it('system trash mode writes no pair — there is nowhere valid for it to point', async () => {
    const systemDeps: MutateDeps = { trashMode: 'system', trashToSystem: async () => {} }
    const r = await handleMutate({ op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' }, systemDeps)
    expect(r.ok).toBe(true)
    expect(await pairFiles(join(root, '.trash'))).toHaveLength(0)
  })

  it('all-or-nothing: an unreadable registry means a Context delete writes NO pair, and the delete still lands', async () => {
    await writeFile(contextsRegistryFile(root), '{corrupt')
    const r = await handleMutate(
      { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(await pairFiles(join(root, '.trash'))).toHaveLength(0)
    // The artifact itself still trashed recoverably.
    expect(await pathExists(join(contextsDir(root), 'Projects'))).toBe(false)
  })

  it('writePair → readPair round-trips exactly; a malformed pair file reads null', async () => {
    await handleMutate({ op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' }, nexusDeps)
    const { file, pair } = await onlyPair()
    expect(await readPair(file)).toEqual(pair)
    await writeFile(file, '{not a pair')
    expect(await readPair(file)).toBeNull()
    await writeFile(file, JSON.stringify({ hello: 'world' }))
    expect(await readPair(file)).toBeNull()
  })

  it('an unreadable parent sidecar degrades to unaddressable — the pair is still written', async () => {
    await writeFile(join(root, 'Notes', 'Daily', '_pageset.json'), '{corrupt')
    const r = await handleMutate({ op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' }, nexusDeps)
    expect(r.ok).toBe(true)
    const { pair } = await onlyPair()
    expect(pair).toMatchObject({ entity: 'page', id: PAGE_A, parent: { kind: 'unaddressable' } })
  })

  it('a refused root marks the Space pair partial — the members list is thinner than the truth', async () => {
    await writeFile(
      join(root, 'Notes', 'Daily', 'Dual.md'),
      '---\nPageID: 01KVGMT8BFG350FZZXAMG1QDVB\nTaskID: 01KVGMT8BFG350FZZXAMG1QDVC\n(Projects):\n  - Pommora\n---\n',
    )
    await handleMutate({ op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' }, nexusDeps)
    const { pair } = await onlyPair()
    expect(pair).toMatchObject({ entity: 'space', partial: true })
  })

  it('an id-less tagging root marks the Space pair partial — its membership is unrestorable', async () => {
    await writeFile(join(root, 'Notes', 'Daily', 'NoId.md'), '---\n(Projects):\n  - Pommora\n---\n')
    await handleMutate({ op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' }, nexusDeps)
    const { pair } = await onlyPair()
    expect(pair).toMatchObject({ entity: 'space', partial: true })
    const members = (pair as { members: { id: string }[] }).members
    expect(members.every((m) => typeof m.id === 'string')).toBe(true)
  })

  it('an unreadable Space sidecar inside the Context marks its pair partial', async () => {
    await mkdir(join(contextsDir(root), 'Projects', 'Broken'), { recursive: true })
    await writeFile(join(contextsDir(root), 'Projects', 'Broken', '_space.json'), '{corrupt')
    await handleMutate({ op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' }, nexusDeps)
    const { pair } = await onlyPair()
    expect(pair).toMatchObject({ entity: 'context', partial: true })
  })
})

describe('writePropertyPair', () => {
  it('de-collides within one timestamp — a same-stamp double delete keeps both pairs', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-01T12:00:00.000Z'))
    try {
      const pair = {
        entity: 'property' as const,
        id: 'prop_x',
        def: { id: 'prop_x' },
        values: { a: 1 },
      }
      const first = await writePropertyPair(root, pair)
      const second = await writePropertyPair(root, { ...pair, values: { a: 2 } })
      expect(second).not.toBe(first)
      expect(await readPair(first)).toMatchObject({ values: { a: 1 } })
      expect(await readPair(second)).toMatchObject({ values: { a: 2 } })
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('resolvePair — a placement with final names, or a typed refusal', () => {
  const P = (over: Partial<import('@shared/types').PageNode> = {}) =>
    ({ kind: 'page', id: 'page-x', title: 'X', path: 'Notes/X.md', ...over }) as import('@shared/types').PageNode
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

  const notes = (sets: import('@shared/types').SetNode[] = [journal()], pages: import('@shared/types').PageNode[] = []) => ({
    kind: 'collection' as const,
    id: 'col-notes',
    title: 'Notes',
    path: 'Notes',
    sets,
    pages,
  })

  const pagePair = { entity: 'page' as const, id: PAGE_A, parent: { kind: 'container' as const, id: 'set-daily' } }

  it('places a page into its parent container at the container’s CURRENT path', () => {
    const r = resolvePair(pagePair, 'Alpha.md', treeOf([], [notes()]))
    expect(r).toEqual({ place: { dir: 'Notes/Journal', finalName: 'Alpha.md' } })
  })

  it('disambiguates a taken title, matching the create convention', () => {
    const taken = journal({ pages: [P({ id: 'page-o', title: 'Alpha', path: 'Notes/Journal/Alpha.md' })] })
    const r = resolvePair(pagePair, 'Alpha.md', treeOf([], [notes([taken])]))
    expect(r).toEqual({ place: { dir: 'Notes/Journal', finalName: 'Alpha 2.md' } })
  })

  it('a set title also blocks a page name — one folder cannot hold both', () => {
    const inner = journal({ sets: [journal({ id: 'set-inner', title: 'Alpha', path: 'Notes/Journal/Alpha' })] })
    const r = resolvePair(pagePair, 'Alpha.md', treeOf([], [notes([inner])]))
    expect(r).toEqual({ place: { dir: 'Notes/Journal', finalName: 'Alpha 2.md' } })
  })

  it('refuses when the parent is gone — a still-trashed parent is the same answer', () => {
    expect(resolvePair(pagePair, 'Alpha.md', treeOf([], [notes([])]))).toEqual({ refuse: 'parent-gone' })
  })

  it('refuses when the parent id resolves to a kind that cannot hold this one', () => {
    const tree = treeOf(
      [{ def: { id: 'ctx_a', title: 'Areas' }, spaces: [{ kind: 'space', id: 'set-daily', title: 'S', path: '.nexus/contexts/Areas/S', contextId: 'ctx_a' } as import('@shared/types').SpaceNode] }],
      [notes([])],
    )
    expect(resolvePair(pagePair, 'Alpha.md', tree)).toEqual({ refuse: 'cannot-hold' })
  })

  it('a live id refuses, and it outranks every other answer', () => {
    const tree = treeOf([], [notes([], [P({ id: PAGE_A, title: 'Elsewhere', path: 'Notes/Elsewhere.md' })])])
    expect(resolvePair(pagePair, 'Alpha.md', tree)).toEqual({ refuse: 'id-live' })
  })

  it('an unaddressable parent refuses', () => {
    const pair = { entity: 'page' as const, id: PAGE_A, parent: { kind: 'unaddressable' as const } }
    expect(resolvePair(pair, 'Alpha.md', treeOf([], [notes()]))).toEqual({ refuse: 'unaddressable' })
  })

  it('a collection returns to the root, disambiguated against its siblings', () => {
    const pair = { entity: 'collection' as const, id: 'col-back', parent: { kind: 'root' as const } }
    const r = resolvePair(pair, 'Notes', treeOf([], [notes()]))
    expect(r).toEqual({ place: { dir: '', finalName: 'Notes 2' } })
  })

  it('a Space follows its Context to the Context’s CURRENT title, colliding titles disambiguated', () => {
    const tree = treeOf(
      [
        {
          def: { id: 'ctx_projects', title: 'Ventures' },
          spaces: [
            { kind: 'space', id: 'sp-other', title: 'Pommora', path: '.nexus/contexts/Ventures/Pommora', contextId: 'ctx_projects' } as import('@shared/types').SpaceNode,
          ],
        },
      ],
      [],
    )
    const pair = {
      entity: 'space' as const,
      id: 'sp-pom',
      parent: { kind: 'context' as const, id: 'ctx_projects' },
      members: [],
    }
    const r = resolvePair(pair, 'Pommora', tree)
    expect(r).toEqual({
      place: { dir: '.nexus/contexts/Ventures', finalName: 'Pommora 2', finalTitle: 'Pommora 2' },
    })
  })

  it('a Context re-enters the registry under a disambiguated final title', () => {
    const tree = treeOf([{ def: { id: 'ctx_new', title: 'Projects' }, spaces: [] }], [])
    const pair = {
      entity: 'context' as const,
      registry: { id: 'ctx_projects', title: 'Projects' },
      membership: [],
    }
    const r = resolvePair(pair, 'Projects', tree)
    expect(r).toEqual({
      place: { dir: '.nexus/contexts', finalName: 'Projects 2', finalTitle: 'Projects 2' },
    })
  })

  it('a Context whose registry id is already live refuses', () => {
    const tree = treeOf([{ def: { id: 'ctx_projects', title: 'Elsewhere' }, spaces: [] }], [])
    const pair = {
      entity: 'context' as const,
      registry: { id: 'ctx_projects', title: 'Projects' },
      membership: [],
    }
    expect(resolvePair(pair, 'Projects', tree)).toEqual({ refuse: 'id-live' })
  })
})

describe('artifactBaseName', () => {
  it('strips the stamp, the de-collision counter, and nothing else', () => {
    expect(artifactBaseName('2026-08-01T12-00-00-000Z__Alpha.md')).toBe('Alpha.md')
    expect(artifactBaseName('2026-08-01T12-00-00-000Z__3__Alpha.md')).toBe('Alpha.md')
    expect(artifactBaseName('2026-08-01T12-00-00-000Z__My__Odd__Name.md')).toBe('My__Odd__Name.md')
    expect(artifactBaseName('2026-08-01T12-00-00-000Z__2')).toBe('2')
    expect(artifactBaseName('2026-08-01T12-00-00-000Z__1__2')).toBe('2')
  })
})

describe('restore — the pair spends, headless', () => {
  it('a page returns into its since-renamed parent', async () => {
    await handleMutate({ op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' }, nexusDeps)
    await rename(join(root, 'Notes', 'Daily'), join(root, 'Notes', 'Journal'))
    const [listed] = await listPairs(root)
    const r = await handleMutate({ op: 'restore', pairPath: listed.pairPath }, nexusDeps)
    expect(r.ok).toBe(true)
    expect(await readFile(join(root, 'Notes', 'Journal', 'Alpha.md'), 'utf8')).toContain(PAGE_A)
    expect(await pairFiles(join(root, '.trash'))).toHaveLength(0)
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

    const [listed] = await listPairs(root)
    const r = await handleMutate({ op: 'restore', pairPath: listed.pairPath }, nexusDeps)
    expect(r.ok).toBe(true)
    expect(await pathExists(join(contextsDir(root), 'Projects', 'Pommora', '_space.json'))).toBe(true)
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
    await handleMutate({ op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' }, nexusDeps)
    const [listed] = await listPairs(root)
    const r = await handleMutate({ op: 'restore', pairPath: listed.pairPath }, nexusDeps)
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
    const [listed] = await listPairs(root)
    await handleMutate({ op: 'delete', path: 'Notes/Daily', kind: 'set' }, nexusDeps)
    const r = await handleMutate({ op: 'restore', pairPath: listed.pairPath }, nexusDeps)
    expect(r.ok).toBe(false)
  })

  it('listPairs prunes an orphaned pair as encountered, but never the artifact-less variant', async () => {
    await handleMutate({ op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' }, nexusDeps)
    const files = await pairFiles(join(root, '.trash'))
    await rm(files[0].slice(0, -'.provenance.json'.length), { force: true })
    await writePropertyPair(root, {
      entity: 'property',
      id: 'prop_x',
      def: { id: 'prop_x' },
      values: {},
    })
    const listed = await listPairs(root)
    expect(listed).toHaveLength(1)
    expect(listed[0].pair.entity).toBe('property')
    expect(await pairFiles(join(root, '.trash'))).toHaveLength(1)
  })
})
