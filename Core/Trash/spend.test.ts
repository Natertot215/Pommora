import { applyEvents } from '../Nexus/fileEvents'
import * as liveTree from '../Nexus/liveTree'
import { settleNow } from '../Nexus/settle'
import { handleMutate } from '../Nexus/mutate'
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { splitFrontmatter } from '../Files/pageFile'
import { basename, dirname, join, relative } from '../Paths/posix'
import { tempRoot, noModeBits, readJsonAt } from '../Testing/hostFs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as atomicWrite from '../Files/atomicWrite'
import { pathExists } from '../Files/atomicWrite'
import { settledMutate } from '../Testing/settledMutate'
import { contextsDir, contextsRegistryFile } from '../Paths/paths'
import { bundleArtifact, listBundles, mintBundle } from '../Bundles/bundle'
import { readRecord, writeRecord } from '../Bundles/record'
import { writePropertyBundle } from '../Properties/deleteProperty'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import { seedContentIndex } from '../Index/indexSeed'
import { readNexus } from '../Nexus/readNexus'
import { setCollectionOrder, setPanelContextOrder, setSpaceOrder } from '../Nexus/reorder'
import { closeSession, openSession } from '../Nexus/session'
import { readShard, updatePageMetadata } from '../Nexus/pageMetadata'
import { shardOf } from '../Nexus/ids'
import { dropLiveTree, refreshTree } from '../Nexus/liveTree'
import type { TrashDeps } from './discard'
import type { ContextsRegistry } from '../Contexts/contexts'
import type { RestoreDestination } from '../Nexus/mutateRequest'

const PAGE_A = '01KVGMT8BFP350FZZXAMG1QDVA'
const PAGE_B = '01KVGMT8BFP350FZZXAMG1QDVB'
const PAGE_C = '01KVGMT8BFP350FZZXAMG1QDVC'
const nexusDeps: TrashDeps = { trashMode: 'nexus', trashToSystem: async () => {} }

let root: string

/** Every bundle directory under .trash, recursively — never descending into one, exactly as the listing walks. */
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
  root = tempRoot('pom-prov-')
  await mkdir(join(root, '.nexus'), { recursive: true })
  await mkdir(contextsDir(root), { recursive: true })
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
    JSON.stringify({ id: 'sp-sap', '<Projects>': ['Pommora'] }),
  )
  await mkdir(join(root, 'Notes', 'Daily'), { recursive: true })
  await writeFile(join(root, 'Notes', '_pagecollection.json'), JSON.stringify({ id: 'col-notes' }))
  await writeFile(
    join(root, 'Notes', 'Daily', '_pageset.json'),
    JSON.stringify({ id: 'set-daily' }),
  )
  await writeFile(
    join(root, 'Notes', 'Daily', 'Alpha.md'),
    `---\nID: ${PAGE_A}\n<Projects>:\n  - Pommora\n---\nbody`,
  )
  await openSession(root)
})

afterEach(async () => {
  dropLiveTree()
  closeSession()
  await rm(root, { recursive: true, force: true })
})

describe('the bundle — one folder per deletion, holding the artifact and its record', () => {
  it('a page delete records identity + its parent container by the id the walk assigns', async () => {
    const tree = await readNexus(root)
    const dailyId = tree.collections[0].sets[0].id
    expect(dailyId).toBe('set-daily')

    const r = await settledMutate(
      root,
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
      trail: ['col-notes'],
    })
  })

  it('a root Collection delete records parent root; the folder sits inside the bundle', async () => {
    const r = await settledMutate(
      root,
      { op: 'delete', path: 'Notes', kind: 'collection' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const { dir, record } = await onlyBundle()
    expect(await bundleArtifact(dir)).toBe(join(dir, 'Notes'))
    expect(record).toMatchObject({
      entity: 'collection',
      id: 'col-notes',
      parent: { kind: 'root' },
    })
    expect(record).not.toHaveProperty('trail')
  })

  it('a Space delete records its context parent and the id-bearing roots that tagged it', async () => {
    const r = await settledMutate(
      root,
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
    const r = await settledMutate(
      root,
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
    // The outside page is the only membership root — the in-Context Sapphire is a passenger whose own links ride the trash intact.
    expect(membership).toHaveLength(1)
    expect(membership[0].root).toEqual({ id: PAGE_A, kind: 'page' })
    expect(membership[0].spaces).toEqual([{ id: 'sp-pom', title: 'Pommora' }])
  })

  const placeOfOnly = async (): Promise<unknown> =>
    ((await onlyBundle()).record as { place?: unknown }).place

  it('a page records its place between its neighbours as the tree shows them', async () => {
    await writeFile(join(root, 'Notes', 'Daily', 'Beta.md'), `---\nID: ${PAGE_B}\n---\nbody`)
    await writeFile(join(root, 'Notes', 'Daily', 'Gamma.md'), `---\nID: ${PAGE_C}\n---\nbody`)
    await writeFile(
      join(root, 'Notes', 'Daily', '_pageset.json'),
      JSON.stringify({ id: 'set-daily', page_order: [PAGE_C, PAGE_A, PAGE_B] }),
    )
    await refreshTree(root)
    await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    expect(await placeOfOnly()).toEqual({ above: PAGE_B, below: PAGE_C })
  })

  it('a Set records its place in its container’s set_order', async () => {
    for (const [name, id] of [
      ['Weekly', 'set-week'],
      ['Monthly', 'set-month'],
    ]) {
      await mkdir(join(root, 'Notes', name), { recursive: true })
      await writeFile(join(root, 'Notes', name, '_pageset.json'), JSON.stringify({ id }))
    }
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'col-notes', set_order: ['set-week', 'set-daily', 'set-month'] }),
    )
    await refreshTree(root)
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily', kind: 'set' }, nexusDeps)
    expect(await placeOfOnly()).toEqual({ above: 'set-month', below: 'set-week' })
  })

  it('a Collection records its place among the root’s Collections', async () => {
    for (const [name, id] of [
      ['Plain', 'col-plain'],
      ['Zed', 'col-zed'],
    ]) {
      await mkdir(join(root, name), { recursive: true })
      await writeFile(join(root, name, '_pagecollection.json'), JSON.stringify({ id }))
    }
    await setCollectionOrder(root, ['col-zed', 'col-notes', 'col-plain'])
    await refreshTree(root)
    await settledMutate(root, { op: 'delete', path: 'Notes', kind: 'collection' }, nexusDeps)
    expect(await placeOfOnly()).toEqual({ above: 'col-plain', below: 'col-zed' })
  })

  it('a Space records its place in its Context’s order', async () => {
    await setSpaceOrder(root, 'ctx_projects', ['sp-sap', 'sp-pom'])
    await refreshTree(root)
    await settledMutate(
      root,
      { op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' },
      nexusDeps,
    )
    expect(await placeOfOnly()).toEqual({ below: 'sp-sap' })
  })

  describe('a Context’s place', () => {
    const stateOrder = async (): Promise<unknown> =>
      (await readJsonAt(join(root, '.nexus', 'state.json'))).order
    const registryIds = async (): Promise<string[]> =>
      (await readJsonAt<ContextsRegistry>(contextsRegistryFile(root))).contexts.map((c) => c.id)
    const seeded = {
      spaces: { ctx_projects: ['sp-sap', 'sp-pom'], ctx_areas: ['sp-home'] },
      contexts: ['ctx_projects', 'ctx_areas'],
    }
    const deleteProjects = (deps: TrashDeps) =>
      settledMutate(root, { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' }, deps)

    beforeEach(async () => {
      await writeFile(
        contextsRegistryFile(root),
        JSON.stringify({
          contexts: [
            { id: 'ctx_areas', title: 'Areas' },
            { id: 'ctx_projects', title: 'Projects' },
            { id: 'ctx_zeta', title: 'Zeta' },
          ],
        }),
      )
      await setSpaceOrder(root, 'ctx_projects', ['sp-sap', 'sp-pom'])
      await setSpaceOrder(root, 'ctx_areas', ['sp-home'])
      await setPanelContextOrder(root, ['ctx_projects', 'ctx_areas'])
    })

    it('a Context in the Trash keeps its order, and its restore returns to its sidebar place', async () => {
      const r = await deleteProjects(nexusDeps)
      expect(r.ok).toBe(true)
      expect(await stateOrder()).toEqual(seeded)
      const listed = r.ok ? r.value.bundled : undefined
      expect(
        (await settledMutate(root, { op: 'restore', bundlePath: listed!.bundlePath }, nexusDeps))
          .ok,
      ).toBe(true)
      expect(await registryIds()).toEqual(['ctx_areas', 'ctx_projects', 'ctx_zeta'])
      const tree = await readNexus(root)
      expect(tree.contexts[1].spaces.map((sp) => sp.id)).toEqual(['sp-sap', 'sp-pom'])
      expect(tree.config.order.contexts).toEqual(['ctx_projects', 'ctx_areas'])
    })

    it('a record from before the place was kept restores its Context at the end', async () => {
      const r = await deleteProjects(nexusDeps)
      const bundlePath = r.ok ? r.value.bundled!.bundlePath : ''
      const recordFile = join(root, bundlePath, '_record.json')
      const { at: _, ...older } = await readJsonAt(recordFile)
      await writeFile(recordFile, JSON.stringify(older))
      expect((await settledMutate(root, { op: 'restore', bundlePath }, nexusDeps)).ok).toBe(true)
      expect(await registryIds()).toEqual(['ctx_areas', 'ctx_zeta', 'ctx_projects'])
    })

    it('emptying a Context’s bundle drops its panel id and its Space order', async () => {
      const r = await deleteProjects(nexusDeps)
      const listed = r.ok ? r.value.bundled : undefined
      expect(
        (
          await settledMutate(
            root,
            { op: 'emptyBundle', bundlePath: listed!.bundlePath },
            nexusDeps,
          )
        ).ok,
      ).toBe(true)
      expect(await stateOrder()).toEqual({
        spaces: { ctx_areas: ['sp-home'] },
        contexts: ['ctx_areas'],
      })
    })

    it('a system-trash Context delete drops its panel id and its Space order at once', async () => {
      const r = await deleteProjects({ trashMode: 'system', trashToSystem: async () => {} })
      expect(r.ok).toBe(true)
      expect(await stateOrder()).toEqual({
        spaces: { ctx_areas: ['sp-home'] },
        contexts: ['ctx_areas'],
      })
    })
  })

  it('system trash mode writes no bundle — the artifact leaves the nexus entirely', async () => {
    const systemDeps: TrashDeps = {
      trashMode: 'system',
      trashToSystem: (p) => rm(p, { recursive: true, force: true }),
    }
    const r = await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
      systemDeps,
    )
    expect(r.ok).toBe(true)
    expect(await bundleDirs(join(root, '.trash'))).toHaveLength(0)
  })

  it('an unreadable registry refuses a Context delete before anything moves', async () => {
    await writeFile(contextsRegistryFile(root), '{corrupt')
    const r = await settledMutate(
      root,
      { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(0)
    expect(await pathExists(join(contextsDir(root), 'Projects'))).toBe(true)
  })

  it.skipIf(noModeBits)(
    'a member sweep cut short puts the registry entry back, so the Context can be deleted again',
    async () => {
      const { chmod } = await import('node:fs/promises')
      const around = {
        contexts: [
          { id: 'ctx_a', title: 'A' },
          { id: 'ctx_z', title: 'Z' },
        ],
      }
      const seeded = await readJsonAt<ContextsRegistry>(contextsRegistryFile(root))
      await writeFile(
        contextsRegistryFile(root),
        JSON.stringify({ contexts: [around.contexts[0], ...seeded.contexts, around.contexts[1]] }),
      )
      await chmod(join(root, 'Notes', 'Daily'), 0o555)
      try {
        const r = await settledMutate(
          root,
          { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
          nexusDeps,
        )
        expect(r.ok).toBe(false)
      } finally {
        await chmod(join(root, 'Notes', 'Daily'), 0o755)
      }
      const reg = await readJsonAt<ContextsRegistry>(contextsRegistryFile(root))
      expect(reg.contexts.map((c) => c.id)).toEqual(['ctx_a', 'ctx_projects', 'ctx_z'])
      const retried = await settledMutate(
        root,
        { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
        nexusDeps,
      )
      expect(retried.ok).toBe(true)
    },
  )

  // Each file sits outside the locked folder, so the sweep rewrites it before refusing on Alpha.
  const refusable: Record<string, string> = {
    'Notes/Beta.md': `---\n<Projects>:\n  - Pommora\n  - Sapphire\nID: ${PAGE_B}\n---\nbody`,
    'Notes/Gamma.md': '---\n<Projects>: Other\nID: 01KVGMT8BFP350FZZXAMG1QDVC\n---\nbody',
    '.nexus/contexts/Areas/Health/_space.json': JSON.stringify({
      id: 'sp-health',
      '<Projects>': ['Pommora', 'Sapphire'],
      $order: ['ctx_projects'],
    }),
  }
  const watched = [
    ...Object.keys(refusable),
    'Notes/Daily/Alpha.md',
    '.nexus/contexts/Projects/Sapphire/_space.json',
  ]
  const texts = (): Promise<string[]> =>
    Promise.all(watched.map((rel) => readFile(join(root, rel), 'utf8')))

  // The retry runs on the index the refusal left, so a restored file the index forgot would keep its tag.
  const refuseThenRetry = async (path: string, kind: 'context' | 'space'): Promise<void> => {
    installStores(memoryStores().stores)
    const { chmod } = await import('node:fs/promises')
    try {
      for (const [rel, text] of Object.entries(refusable)) {
        await mkdir(dirname(join(root, rel)), { recursive: true })
        await writeFile(join(root, rel), text)
      }
      await seedContentIndex(root)
      const before = await texts()
      await chmod(join(root, 'Notes', 'Daily'), 0o555)
      const r = await settledMutate(root, { op: 'delete', path, kind }, nexusDeps)
      await chmod(join(root, 'Notes', 'Daily'), 0o755)
      expect(r.ok).toBe(false)
      expect(await texts()).toEqual(before)
      expect(await pathExists(join(root, path))).toBe(true)
      expect(await bundleDirs(join(root, '.trash'))).toEqual([])
      const retried = await settledMutate(root, { op: 'delete', path, kind }, nexusDeps)
      expect(retried.ok).toBe(true)
    } finally {
      await chmod(join(root, 'Notes', 'Daily'), 0o755)
      installStores(NO_STORES)
    }
  }
  const projectsOf = async (rel: string): Promise<unknown> =>
    splitFrontmatter(await readFile(join(root, rel), 'utf8'))['<Projects>']

  it.skipIf(noModeBits)(
    'a refused Context delete returns every file it swept byte-for-byte, leaves no bundle, and can be retried, the retry dropping its id from a Space’s $order',
    async () => {
      await refuseThenRetry('.nexus/contexts/Projects', 'context')
      expect(await projectsOf('Notes/Beta.md')).toBeUndefined()
      expect(await projectsOf('Notes/Gamma.md')).toBeUndefined()
      const health = await readJsonAt(join(root, '.nexus/contexts/Areas/Health/_space.json'))
      expect('$order' in health).toBe(false)
    },
  )

  it.skipIf(noModeBits)(
    'a refused Space delete returns every file it swept byte-for-byte, leaves no bundle, and can be retried',
    async () => {
      await refuseThenRetry('.nexus/contexts/Projects/Pommora', 'space')
      expect(await projectsOf('Notes/Beta.md')).toEqual(['Sapphire'])
    },
  )

  it('system trash mode refuses the same Context delete', async () => {
    await writeFile(contextsRegistryFile(root), '{corrupt')
    const trashToSystem = vi.fn(async () => {})
    const r = await settledMutate(
      root,
      { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
      { trashMode: 'system', trashToSystem },
    )
    expect(r.ok).toBe(false)
    expect(trashToSystem).not.toHaveBeenCalled()
    expect(await pathExists(join(contextsDir(root), 'Projects'))).toBe(true)
  })

  it('writeRecord → readRecord round-trips exactly; a malformed record reads null', async () => {
    await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    const { dir, record } = await onlyBundle()
    expect(await readRecord(dir)).toEqual(record)
    await writeFile(join(dir, '_record.json'), '{not a record')
    expect(await readRecord(dir)).toBeNull()
    await writeFile(join(dir, '_record.json'), JSON.stringify({ hello: 'world' }))
    expect(await readRecord(dir)).toBeNull()
  })

  it('a page beneath an unreadable parent sidecar refuses the delete and leaves its bytes', async () => {
    await writeFile(join(root, 'Notes', 'Daily', '_pageset.json'), '{corrupt')
    await refreshTree(root)
    const before = await readFile(join(root, 'Notes', 'Daily', 'Alpha.md'), 'utf8')
    const r = await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
    expect(await listBundles(root, { kind: 'trash' })).toEqual([])
    expect(await readFile(join(root, 'Notes', 'Daily', 'Alpha.md'), 'utf8')).toBe(before)
  })

  it('a refused root marks the Space record partial — the members list is thinner than the truth', async () => {
    await writeFile(
      join(root, 'Notes', 'Daily', 'Alien.md'),
      '---\nID: 01KVGMT8BFT350FZZXAMG1QDVB\n<Projects>:\n  - Pommora\n---\n',
    )
    await settledMutate(
      root,
      { op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' },
      nexusDeps,
    )
    const { record } = await onlyBundle()
    expect(record).toMatchObject({ entity: 'space', partial: true })
  })

  it('an id-less tagging root marks the Space record partial — its membership is unrestorable', async () => {
    await writeFile(join(root, 'Notes', 'Daily', 'NoId.md'), '---\n<Projects>:\n  - Pommora\n---\n')
    await settledMutate(
      root,
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
    const r = await settledMutate(
      root,
      { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const { record } = await onlyBundle()
    expect(record).toMatchObject({ entity: 'context', partial: true })
  })

  it.each([
    ['context', '.nexus/contexts/Projects'],
    ['space', '.nexus/contexts/Projects/Pommora'],
  ] as const)('an unreadable Space sidecar in another Context leaves a %s deletable, partial, and the sidecar byte-identical', async (kind, path) => {
    const broken = join(contextsDir(root), 'Areas', 'Broken', '_space.json')
    await mkdir(dirname(broken), { recursive: true })
    await writeFile(broken, '{ corrupt')
    const r = await settledMutate(root, { op: 'delete', path, kind }, nexusDeps)
    expect(r.ok).toBe(true)
    const { record } = await onlyBundle()
    expect(record).toMatchObject({ entity: kind, partial: true })
    expect(await readFile(broken, 'utf8')).toBe('{ corrupt')
  })
})

describe('the bundle records the page each outbound link named', () => {
  const NOTES = '01KVGMT8BFP350FZZXAMG1QDVN'
  const GAMMA = '01KVGMT8BFP350FZZXAMG1QDVG'
  const page = (rel: string, id: string, text = '') =>
    writeFile(join(root, rel), `---\nID: ${id}\n---\n${text}`)

  beforeEach(async () => {
    installStores(memoryStores().stores)
    await mkdir(join(root, 'Notes', 'B'), { recursive: true })
    await writeFile(join(root, 'Notes', 'B', '_pageset.json'), JSON.stringify({ id: 'set-b' }))
    await page('Notes/B/Notes.md', NOTES)
    await page('Notes/Beta.md', PAGE_B)
    await page('Notes/Gamma.md', GAMMA)
    await page('Notes/Twin.md', '01KVGMT8BFP350FZZXAMG1QDVT')
    await page('Notes/B/Twin.md', '01KVGMT8BFP350FZZXAMG1QDVW')
    await writeFile(
      join(root, 'Notes', 'Daily', 'Alpha.md'),
      `---\nID: ${PAGE_A}\nRelated: "[[Gamma]]"\n---\n[[B/Notes]] [[Notes]] ![[Beta]] [[Twin]] [[Ghost]]`,
    )
    await page('Notes/Daily/Delta.md', '01KVGMT8BFP350FZZXAMG1QDVD', '[[Gamma]]')
    await refreshTree(root)
    await seedContentIndex(root)
  })
  afterEach(() => installStores(NO_STORES))

  const ALPHA_TARGETS = {
    'b/notes': { id: NOTES, path: 'Notes/B/Notes.md' },
    notes: { id: NOTES, path: 'Notes/B/Notes.md' },
    beta: { id: PAGE_B, path: 'Notes/Beta.md' },
    gamma: { id: GAMMA, path: 'Notes/Gamma.md' },
  }

  it('a page delete records each key, embeds included, resolved alone, and none ambiguous or phantom', async () => {
    const r = await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const { record } = await onlyBundle()
    expect((record as { targets?: unknown }).targets).toEqual(ALPHA_TARGETS)
  })

  it('a page delete with no index records the same keys, read from its file', async () => {
    installStores(NO_STORES)
    const r = await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const { record } = await onlyBundle()
    expect((record as { targets?: unknown }).targets).toEqual(ALPHA_TARGETS)
  })

  it('a Set delete records them bundle-wide from the index, reading none of its pages', async () => {
    const reads = vi.spyOn(atomicWrite, 'readTextOrNull')
    try {
      const r = await settledMutate(
        root,
        { op: 'delete', path: 'Notes/Daily', kind: 'set' },
        nexusDeps,
      )
      expect(r.ok).toBe(true)
      const { record } = await onlyBundle()
      expect((record as { targets?: unknown }).targets).toEqual(ALPHA_TARGETS)
      const pageReads = reads.mock.calls.filter(
        ([file]) => file.includes('/Notes/Daily/') && file.endsWith('.md'),
      )
      expect(pageReads).toEqual([])
    } finally {
      reads.mockRestore()
    }
  })

  it('a Space delete records the targets of its values', async () => {
    await writeFile(
      join(contextsDir(root), 'Projects', 'Pommora', '_space.json'),
      JSON.stringify({ id: 'sp-pom', Related: '[[Gamma]]' }),
    )
    await refreshTree(root)
    const r = await settledMutate(
      root,
      { op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const { record } = await onlyBundle()
    expect((record as { targets?: unknown }).targets).toEqual({
      gamma: { id: GAMMA, path: 'Notes/Gamma.md' },
    })
  })

  it('a record with targets round-trips, and one without them still reads', async () => {
    await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    const { dir, record } = await onlyBundle()
    expect(await readRecord(dir)).toEqual(record)
    const { targets: _, ...without } = record as { targets?: unknown }
    await writeFile(join(dir, '_record.json'), JSON.stringify(without))
    expect(await readRecord(dir)).toEqual(without)
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
    await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    const [dir] = await bundleDirs(join(root, '.trash'))
    await rm(join(dir, 'Alpha.md'), { force: true })
    await writePropertyBundle(root, {
      entity: 'property',
      id: 'prop_x',
      def: { id: 'prop_x' },
      values: {},
    })
    for (let n = 0; n < 3; n++) {
      const listed = await listBundles(root, { kind: 'trash' })
      expect(listed).toHaveLength(1)
      expect(listed[0].record.entity).toBe('property')
    }
    // Never pruned — the record is the only evidence that destruction happened.
    expect(await pathExists(join(dir, '_record.json'))).toBe(true)
  })

  it('the record shares a folder with the artifact and can never collide with it', async () => {
    // The one name that would collide if the record wore a plain one. A folder arriving on disk from outside the app can carry it; the record's `_` prefix is what keeps the two namespaces apart.
    await mkdir(join(root, 'record.json'), { recursive: true })
    await writeFile(
      join(root, 'record.json', '_pagecollection.json'),
      JSON.stringify({ id: 'col-odd' }),
    )
    const r = await settledMutate(
      root,
      { op: 'delete', path: 'record.json', kind: 'collection' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const [listed] = await listBundles(root, { kind: 'trash' })
    expect(listed.record).toMatchObject({ entity: 'collection', id: 'col-odd' })
    const restored = await settledMutate(
      root,
      { op: 'restore', bundlePath: listed.bundlePath },
      nexusDeps,
    )
    expect(restored.ok).toBe(true)
    expect(await pathExists(join(root, 'record.json', '_pagecollection.json'))).toBe(true)
  })

  it('Finder litter beside the artifact changes nothing', async () => {
    await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    const [dir] = await bundleDirs(join(root, '.trash'))
    await writeFile(join(dir, '.DS_Store'), 'junk')
    expect(await bundleArtifact(dir)).toBe(join(dir, 'Alpha.md'))
    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(1)
  })

  it('a bundle’s interior is trashed content, never trash structure', async () => {
    await settledMutate(root, { op: 'delete', path: 'Notes', kind: 'collection' }, nexusDeps)
    const [dir] = await bundleDirs(join(root, '.trash'))
    const phantom = join(dir, 'Notes', 'Archive.deleted')
    await mkdir(phantom, { recursive: true })
    await writeFile(
      join(phantom, '_record.json'),
      JSON.stringify({ entity: 'page', parent: { kind: 'root' } }),
    )
    const listed = await listBundles(root, { kind: 'trash' })
    expect(listed).toHaveLength(1)
    expect(listed[0].record.entity).toBe('collection')
  })

  it('a chain folder that merely wears the name is walked through, not read as a deletion', async () => {
    // A Collection a user genuinely named "Archive.deleted" — its mirrored chain folder in .trash carries the same name and holds the real bundle.
    await mkdir(join(root, 'Archive.deleted'), { recursive: true })
    await writeFile(
      join(root, 'Archive.deleted', '_pagecollection.json'),
      JSON.stringify({ id: 'col-archive' }),
    )
    await writeFile(
      join(root, 'Archive.deleted', 'Beta.md'),
      '---\nID: 01KVGMT8BFP350FZZXAMG1QDVF\n---\nbody',
    )
    const r = await settledMutate(
      root,
      { op: 'delete', path: 'Archive.deleted/Beta.md', kind: 'page' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const listed = await listBundles(root, { kind: 'trash' })
    expect(listed).toHaveLength(1)
    expect(listed[0].record).toMatchObject({ entity: 'page' })
  })

  it('old-format trash entries are invisible', async () => {
    // Both shapes the retired primitive left: a stamped file with a sibling pair, and a stamped FOLDER for a container delete.
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
    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(0)
  })
})

describe('restore — the record spends, headless', () => {
  it('a page returns into its since-renamed parent', async () => {
    await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    await rename(join(root, 'Notes', 'Daily'), join(root, 'Notes', 'Journal'))
    await refreshTree(root)
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(r.ok).toBe(true)
    expect(await readFile(join(root, 'Notes', 'Journal', 'Alpha.md'), 'utf8')).toContain(PAGE_A)
    expect(await bundleDirs(join(root, '.trash'))).toHaveLength(0)
  })

  it('a Space round-trips: the surviving roots carry its tag again', async () => {
    await settledMutate(
      root,
      { op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' },
      nexusDeps,
    )
    expect(
      splitFrontmatter(await readFile(join(root, 'Notes', 'Daily', 'Alpha.md'), 'utf8'))[
        '<Projects>'
      ],
    ).toBeUndefined()

    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(r.ok).toBe(true)
    expect(await pathExists(join(contextsDir(root), 'Projects', 'Pommora', '_space.json'))).toBe(
      true,
    )
    expect(
      splitFrontmatter(await readFile(join(root, 'Notes', 'Daily', 'Alpha.md'), 'utf8'))[
        '<Projects>'
      ],
    ).toEqual(['Pommora'])
    const sap = await readJsonAt(join(contextsDir(root), 'Projects', 'Sapphire', '_space.json'))
    expect(sap['<Projects>']).toEqual(['Pommora'])
  })

  describe('a Space’s tags go back under its Context’s exact key', () => {
    const alpha = (): string => join(root, 'Notes', 'Daily', 'Alpha.md')
    const restoredPommora = async (keys: string): Promise<Record<string, unknown>> => {
      await settledMutate(
        root,
        { op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' },
        nexusDeps,
      )
      await writeFile(alpha(), `---\nID: ${PAGE_A}\n${keys}\n---\nbody`)
      await refreshTree(root)
      const [listed] = await listBundles(root, { kind: 'trash' })
      const r = await settledMutate(
        root,
        { op: 'restore', bundlePath: listed.bundlePath },
        nexusDeps,
      )
      expect(r.ok).toBe(true)
      return splitFrontmatter(await readFile(alpha(), 'utf8'))
    }

    it('lands the exact key beside another casing, which keeps its members', async () => {
      const fm = await restoredPommora('<projects>:\n  - sapphire')
      expect(fm['<projects>']).toEqual(['sapphire'])
      expect(fm['<Projects>']).toEqual(['Pommora'])
    })
  })

  it('a Space restored during its Context’s rename lands in the renamed Context, its tags under the new key', async () => {
    await settledMutate(
      root,
      { op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' },
      nexusDeps,
    )
    const [listed] = await listBundles(root, { kind: 'trash' })
    const [renamed, restored] = await Promise.all([
      settledMutate(
        root,
        { op: 'renameContext', contextId: 'ctx_projects', newName: 'Ventures' },
        nexusDeps,
      ),
      settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps),
    ])
    expect(renamed.ok && restored.ok).toBe(true)
    expect(await pathExists(join(contextsDir(root), 'Ventures', 'Pommora', '_space.json'))).toBe(
      true,
    )
    expect(await pathExists(join(contextsDir(root), 'Projects'))).toBe(false)
    const fm = splitFrontmatter(await readFile(join(root, 'Notes', 'Daily', 'Alpha.md'), 'utf8'))
    expect(fm['<Ventures>']).toEqual(['Pommora'])
    expect('<Projects>' in fm).toBe(false)
  })

  it('a tag that can’t go back is named, and the record stays', async () => {
    await settledMutate(
      root,
      { op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' },
      nexusDeps,
    )
    const alpha = join(root, 'Notes', 'Daily', 'Alpha.md')
    await writeFile(alpha, `---\nID: ${PAGE_A}\nbroken: [\n---\nbody`)
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(r).toEqual({ ok: true, value: { unrestored: ['Alpha'] } })
    expect(await pathExists(join(root, listed.bundlePath, '_record.json'))).toBe(true)
  })

  it('a tag neither of two pages claiming one id takes back is named, and the record stays', async () => {
    await settledMutate(
      root,
      { op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' },
      nexusDeps,
    )
    const copy = join(root, 'Notes', 'Daily', 'Alpha copy.md')
    await writeFile(copy, `---\nID: ${PAGE_A}\n---\ncopy`)
    await refreshTree(root)
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(r).toEqual({ ok: true, value: { unrestored: ['Alpha copy'] } })
    expect(await pathExists(join(root, listed.bundlePath, '_record.json'))).toBe(true)
    for (const file of [join(root, 'Notes', 'Daily', 'Alpha.md'), copy])
      expect(splitFrontmatter(await readFile(file, 'utf8'))).not.toHaveProperty('<Projects>')
  })

  it('a root gone since is no reason to keep the record', async () => {
    await settledMutate(
      root,
      { op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' },
      nexusDeps,
    )
    await rm(join(root, 'Notes', 'Daily', 'Alpha.md'))
    await refreshTree(root)
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(r).toEqual({ ok: true, value: {} })
    expect(await pathExists(join(root, listed.bundlePath))).toBe(false)
  })

  it('a Context round-trips: the registry entry appends and membership re-applies', async () => {
    await settledMutate(
      root,
      { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
      nexusDeps,
    )
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(r.ok).toBe(true)
    const reg = await readJsonAt<ContextsRegistry>(contextsRegistryFile(root))
    expect(reg.contexts).toContainEqual({
      id: 'ctx_projects',
      title: 'Projects',
      singular: 'Project',
      icon: 'target',
    })
    expect(
      splitFrontmatter(await readFile(join(root, 'Notes', 'Daily', 'Alpha.md'), 'utf8'))[
        '<Projects>'
      ],
    ).toEqual(['Pommora'])
    const sap = await readJsonAt(join(contextsDir(root), 'Projects', 'Sapphire', '_space.json'))
    expect(sap['<Projects>']).toEqual(['Pommora'])
  })

  it('a Context restore leaves a member written in another casing than its Space off the page', async () => {
    const alpha = join(root, 'Notes', 'Daily', 'Alpha.md')
    await writeFile(alpha, `---\nID: ${PAGE_A}\n<Projects>:\n  - pommora\n---\nbody`)
    await refreshTree(root)
    await settledMutate(
      root,
      { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
      nexusDeps,
    )
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(r).toEqual({ ok: true, value: {} })
    expect('<Projects>' in splitFrontmatter(await readFile(alpha, 'utf8'))).toBe(false)
  })

  it('the resolver re-runs inside the op — a parent gone between list and restore refuses', async () => {
    await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    const [listed] = await listBundles(root, { kind: 'trash' })
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily', kind: 'set' }, nexusDeps)
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(r.ok).toBe(false)
  })

  it('an incomplete deletion refuses, and its record stays put', async () => {
    await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    const [dir] = await bundleDirs(join(root, '.trash'))
    await rm(join(dir, 'Alpha.md'), { force: true })
    const r = await settledMutate(
      root,
      { op: 'restore', bundlePath: join('.trash', 'Notes', 'Daily', basename(dir)) },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
    expect(await pathExists(join(dir, '_record.json'))).toBe(true)
  })
})

describe('a Link value refilled into a trashed copy', () => {
  const beta = (): string => join(root, 'Notes', 'Beta.md')
  const restore = async (name: string): Promise<void> => {
    const listed = (await listBundles(root, { kind: 'trash' })).find((b) => b.artifactName === name)
    const r = await settledMutate(
      root,
      { op: 'restore', bundlePath: listed?.bundlePath ?? '' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
  }

  beforeEach(async () => {
    await writeFile(
      join(root, '.nexus', 'properties.json'),
      JSON.stringify({
        order: ['prop_related'],
        defs: {
          prop_related: { id: 'prop_related', label: 'Related', key: 'Related', type: 'link' },
        },
      }),
    )
    await writeFile(beta(), `---\nID: ${PAGE_B}\nRelated: "[[Alpha]]"\n---\nlinker`)
    await refreshTree(root)
  })

  it('fills the exact key, leaving another casing the copy holds blank', async () => {
    await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    await writeFile(beta(), `---\nID: ${PAGE_B}\nrelated:\n---\nlinker`)
    await refreshTree(root)
    await settledMutate(root, { op: 'delete', path: 'Notes/Beta.md', kind: 'page' }, nexusDeps)
    await restore('Alpha.md')
    await restore('Beta.md')
    const fm = splitFrontmatter(await readFile(beta(), 'utf8'))
    expect(fm.Related).toBe('[[Alpha]]')
    expect(fm.related).toBeNull()
  })
})

describe('restore — the returning page’s links follow the pages they named', () => {
  const ALPHA = join('Notes', 'Daily', 'Alpha.md')
  const text = (rel: string): Promise<string> => readFile(join(root, rel), 'utf8')
  const write = (rel: string, id: string, fm: string, body: string): Promise<void> =>
    writeFile(join(root, rel), `---\nID: ${id}\n${fm}---\n${body}`)
  const reseed = async (): Promise<void> => {
    await refreshTree(root)
    await seedContentIndex(root)
  }
  const del = async (path: string, kind: 'page' | 'set' = 'page'): Promise<void> => {
    expect((await settledMutate(root, { op: 'delete', path, kind }, nexusDeps)).ok).toBe(true)
  }
  const restore = async (name: string, destination?: RestoreDestination) => {
    const bundles = await listBundles(root, { kind: 'trash' })
    const listed = bundles.filter((b) => b.artifactName === name).at(-1)
    const r = await settledMutate(
      root,
      {
        op: 'restore',
        bundlePath: listed?.bundlePath ?? '',
        ...(destination ? { destination } : {}),
      },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    return r.ok ? r.value : undefined
  }

  beforeEach(async () => {
    installStores(memoryStores().stores)
    await writeFile(
      join(root, '.nexus', 'properties.json'),
      JSON.stringify({
        order: ['prop_related'],
        defs: {
          prop_related: { id: 'prop_related', label: 'Related', key: 'Related', type: 'link' },
        },
      }),
    )
    await mkdir(join(root, 'Notes', 'Other'), { recursive: true })
    await writeFile(
      join(root, 'Notes', 'Other', '_pageset.json'),
      JSON.stringify({ id: 'set-other' }),
    )
    await write(ALPHA, PAGE_A, 'Related: "[[Beta]]"\n', '[[Beta]] ![[Beta]]')
    await write('Notes/Beta.md', PAGE_B, '', 'beta')
    await reseed()
  })
  afterEach(() => installStores(NO_STORES))

  it('follows a page renamed meanwhile, in its body, its embed, and its value', async () => {
    await del(ALPHA)
    const renamed = await settledMutate(
      root,
      { op: 'rename', path: 'Notes/Beta.md', kind: 'page', newName: 'Gamma' },
      nexusDeps,
    )
    expect(renamed.ok).toBe(true)
    await restore('Alpha.md')
    expect(await text(ALPHA)).toBe(
      `---\nID: ${PAGE_A}\nRelated: "[[Gamma]]"\n---\n[[Gamma]] ![[Gamma]]`,
    )
  })

  it('keeps every link byte for byte when nothing it named changed meanwhile', async () => {
    const written = `---\nID: ${PAGE_A}\nRelated: "[[beta]]"\n---\n[[beta]] [[notes/beta]] [b](beta)`
    await writeFile(join(root, ALPHA), written)
    await reseed()
    await del(ALPHA)
    await restore('Alpha.md')
    expect(await text(ALPHA)).toBe(written)
  })

  it('follows a case-only rename meanwhile, leaving a link to an unchanged page that carries .md as written', async () => {
    await write(ALPHA, PAGE_A, 'Related: "[[beta]]"\n', '[[beta]] [[Gamma.md]]')
    await write('Notes/Gamma.md', '01KVGMT8BFP350FZZXAMG1QDVG', '', 'gamma')
    await reseed()
    await del(ALPHA)
    const renamed = await settledMutate(
      root,
      { op: 'rename', path: 'Notes/Beta.md', kind: 'page', newName: 'BETA' },
      nexusDeps,
    )
    expect(renamed.ok).toBe(true)
    await restore('Alpha.md')
    expect(await text(ALPHA)).toBe(
      `---\nID: ${PAGE_A}\nRelated: "[[BETA]]"\n---\n[[BETA]] [[Gamma.md]]`,
    )
  })

  it('leaves its links as written to a page moved meanwhile', async () => {
    await del(ALPHA)
    const moved = await settledMutate(
      root,
      { op: 'movePage', path: 'Notes/Beta.md', newParentPath: 'Notes/Other' },
      nexusDeps,
    )
    expect(moved.ok).toBe(true)
    await restore('Alpha.md')
    expect(await text(ALPHA)).toBe(
      `---\nID: ${PAGE_A}\nRelated: "[[Beta]]"\n---\n[[Beta]] ![[Beta]]`,
    )
  })

  const ARCHIVED = (name: string): string =>
    `.nexus/archive/col-notes/Notes/2026-10-20T12-00-00-000Z__${name}.md.archived/${name}.md`

  it('a restore keeps the returning page’s Link value naming an archived page', async () => {
    await del(ALPHA)
    await mkdir(dirname(join(root, ARCHIVED('Beta'))), { recursive: true })
    await rename(join(root, 'Notes', 'Beta.md'), join(root, ARCHIVED('Beta')))
    await reseed()
    await restore('Alpha.md')
    expect(splitFrontmatter(await text(ALPHA)).Related).toBe('[[Beta]]')
  })

  it('a restore puts a stripped Link value back into the archived page that held it', async () => {
    await mkdir(dirname(join(root, ARCHIVED('Old'))), { recursive: true })
    await write(ARCHIVED('Old'), PAGE_C, 'Related: "[[Alpha]]"\n', 'old')
    await reseed()
    await del(ALPHA)
    expect(splitFrontmatter(await text(ARCHIVED('Old')))).not.toHaveProperty('Related')
    await restore('Alpha.md')
    expect(splitFrontmatter(await text(ARCHIVED('Old'))).Related).toBe('[[Alpha]]')
  })

  it('a restore leaves a stripped Link value out of both pages claiming its holder’s id, and names it', async () => {
    await write('Notes/Gamma.md', PAGE_C, 'Related: "[[Alpha]]"\n', 'gamma')
    await reseed()
    await del(ALPHA)
    await write('Notes/Other/Gamma.md', PAGE_C, '', 'copy')
    await reseed()
    expect(await restore('Alpha.md')).toEqual({ unrestored: ['Gamma'] })
    for (const rel of ['Notes/Gamma.md', 'Notes/Other/Gamma.md'])
      expect(splitFrontmatter(await text(rel))).not.toHaveProperty('Related')
  })

  it('keeps its body and parks its value for a page deleted meanwhile', async () => {
    await del(ALPHA)
    await del('Notes/Beta.md')
    await restore('Alpha.md')
    const restored = await text(ALPHA)
    expect(restored).toContain('[[Beta]] ![[Beta]]')
    expect(splitFrontmatter(restored)).not.toHaveProperty('Related')
    const beta = (await listBundles(root, { kind: 'trash' })).find(
      (b) => b.artifactName === 'Beta.md',
    )
    expect(beta?.record).toMatchObject({
      links: [{ page: PAGE_A, property: 'prop_related', value: '[[Beta]]' }],
    })
  })

  it('a page landing in the Collection once its Set is gone re-spells a live path link to it, and leaves a bare one', async () => {
    await write(
      'Notes/Linker.md',
      '01KVGMT8BFP350FZZXAMG1QDVK',
      '',
      '[[Daily/Alpha]] and [[Alpha]]',
    )
    await reseed()
    await del(ALPHA)
    await del('Notes/Daily', 'set')
    const reply = await restore('Alpha.md', { kind: 'container', id: 'col-notes' })
    expect(await pathExists(join(root, 'Notes', 'Alpha.md'))).toBe(true)
    expect(await text('Notes/Linker.md')).toContain('[[Notes/Alpha|Alpha]] and [[Alpha]]')
    expect(reply?.cascade?.pages).toEqual(['Notes/Linker.md'])
  })

  it('a twin made meanwhile elsewhere: its bare linkers gain its path, and a stripped bare link refills with the returning page’s', async () => {
    await write(ALPHA, PAGE_A, '', 'alpha')
    await write('Notes/Beta.md', PAGE_B, 'Related: "[[Alpha]]"\n', 'beta')
    await reseed()
    await del(ALPHA)
    const created = await settledMutate(
      root,
      {
        op: 'createPage',
        id: '01KVGMT8BFP350FZZXAMG1QDVM',
        parentPath: 'Notes/Other',
        name: 'Alpha',
      },
      nexusDeps,
    )
    expect(created.ok).toBe(true)
    await write('Notes/Third.md', '01KVGMT8BFP350FZZXAMG1QDVR', '', 'see [[Alpha]]')
    await reseed()
    const reply = await restore('Alpha.md')
    expect(reply?.unrestored).toBeUndefined()
    expect(await text('Notes/Third.md')).toContain('see [[Notes/Other/Alpha|Alpha]]')
    expect(splitFrontmatter(await text('Notes/Beta.md')).Related).toBe(
      '[[Notes/Daily/Alpha|Alpha]]',
    )
  })

  it('a bundle without targets restores by the name', async () => {
    await del(ALPHA)
    const [listed] = await listBundles(root, { kind: 'trash' })
    const recordFile = join(root, listed.bundlePath, '_record.json')
    const { targets: _, ...without } = JSON.parse(await readFile(recordFile, 'utf8'))
    await writeFile(recordFile, JSON.stringify(without))
    const renamed = await settledMutate(
      root,
      { op: 'rename', path: 'Notes/Beta.md', kind: 'page', newName: 'Gamma' },
      nexusDeps,
    )
    expect(renamed.ok).toBe(true)
    await restore('Alpha.md')
    expect(await text(ALPHA)).toBe(`---\nID: ${PAGE_A}\n---\n[[Beta]] ![[Beta]]`)
  })

  it('a Set restore keeps a value naming a page it holds that carries no ID', async () => {
    const gamma = 'Notes/Daily/Gamma.md'
    await write(gamma, '01KVGMT8BFP350FZZXAMG1QDVG', 'Related: "[[Omega]]"\n', 'gamma')
    await writeFile(join(root, 'Notes', 'Daily', 'Omega.md'), 'omega')
    await reseed()
    await del('Notes/Daily', 'set')
    const [listed] = await listBundles(root, { kind: 'trash' })
    // Unsettled: a relocate stamps no page, so the held tree leaves the ID-less one out where a fresh read lists it.
    const r = await handleMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(r).toEqual({ ok: true, value: {} })
    expect(splitFrontmatter(await text(gamma)).Related).toBe('[[Omega]]')
    expect(await listBundles(root, { kind: 'trash' })).toEqual([])
  })

  it('a page returning beside a new namesake in its own folder refills its stripped link under its new name, and leaves the namesake’s linkers be', async () => {
    await write('Notes/Beta.md', PAGE_B, 'Related: "[[Alpha]]"\n', 'beta')
    await reseed()
    await del(ALPHA)
    const created = await settledMutate(
      root,
      {
        op: 'createPage',
        id: '01KVGMT8BFP350FZZXAMG1QDVM',
        parentPath: 'Notes/Daily',
        name: 'Alpha',
      },
      nexusDeps,
    )
    expect(created.ok).toBe(true)
    await write(
      'Notes/Third.md',
      '01KVGMT8BFP350FZZXAMG1QDVR',
      'Related: "[[Alpha]]"\n',
      'see [[Alpha]]',
    )
    await reseed()
    const third = await text('Notes/Third.md')
    const reply = await restore('Alpha.md')
    expect(await pathExists(join(root, 'Notes', 'Daily', 'Alpha (2).md'))).toBe(true)
    expect(reply?.unrestored).toBeUndefined()
    expect(splitFrontmatter(await text('Notes/Beta.md')).Related).toBe('[[Alpha (2)]]')
    expect(await text('Notes/Third.md')).toBe(third)
  })

  it('a Set returning beside a twin made meanwhile gives that twin’s bare linkers its path', async () => {
    await del('Notes/Daily', 'set')
    const created = await settledMutate(
      root,
      {
        op: 'createPage',
        id: '01KVGMT8BFP350FZZXAMG1QDVM',
        parentPath: 'Notes/Other',
        name: 'Alpha',
      },
      nexusDeps,
    )
    expect(created.ok).toBe(true)
    await write('Notes/Third.md', '01KVGMT8BFP350FZZXAMG1QDVR', '', 'see [[Alpha]]')
    await reseed()
    await restore('Daily')
    expect(await text('Notes/Third.md')).toContain('see [[Notes/Other/Alpha|Alpha]]')
  })

  describe('a namesake made meanwhile leaves the returning files’ own links on their own pages', () => {
    const namesake = async (): Promise<void> => {
      const created = await settledMutate(
        root,
        {
          op: 'createPage',
          id: '01KVGMT8BFP350FZZXAMG1QDVM',
          parentPath: 'Notes/Other',
          name: 'Alpha',
        },
        nexusDeps,
      )
      expect(created.ok).toBe(true)
      await reseed()
    }

    it('a page’s link to itself', async () => {
      await write(ALPHA, PAGE_A, '', 'me: [[Alpha]]')
      await reseed()
      await del(ALPHA)
      await namesake()
      await restore('Alpha.md')
      expect(await text(ALPHA)).toBe(`---\nID: ${PAGE_A}\n---\nme: [[Notes/Daily/Alpha|Alpha]]`)
    })

    it('a Set’s link to its returning sibling', async () => {
      await write('Notes/Daily/Gamma.md', PAGE_C, '', 'see [[Alpha]]')
      await reseed()
      await del('Notes/Daily', 'set')
      await namesake()
      await restore('Daily')
      expect(await text('Notes/Daily/Gamma.md')).toBe(
        `---\nID: ${PAGE_C}\n---\nsee [[Notes/Daily/Alpha|Alpha]]`,
      )
    })

    it('a Set’s Link value and body link to its returning sibling, the namesake in another Collection', async () => {
      await write('Notes/Daily/Gamma.md', PAGE_C, 'Related: "[[Alpha]]"\n', 'see [[Alpha]]')
      await reseed()
      await del('Notes/Daily', 'set')
      await mkdir(join(root, 'Plain'))
      await writeFile(
        join(root, 'Plain', '_pagecollection.json'),
        JSON.stringify({ id: 'col-plain' }),
      )
      await write('Plain/Alpha.md', '01KVGMT8BFP350FZZXAMG1QDVM', '', 'new')
      await reseed()
      await restore('Daily')
      expect(await text('Notes/Daily/Gamma.md')).toBe(
        `---\nID: ${PAGE_C}\nRelated: "[[Notes/Daily/Alpha|Alpha]]"\n---\nsee [[Notes/Daily/Alpha|Alpha]]`,
      )
    })
  })

  it('a restore that finds no settled world says its links weren’t updated', async () => {
    await del(ALPHA)
    const unsettled = vi.spyOn(liveTree, 'heldTreeOf').mockReturnValue(null)
    try {
      const reply = await restore('Alpha.md')
      expect(reply?.cascade?.warning).toBe("Links to “Alpha” weren't updated.")
    } finally {
      unsettled.mockRestore()
    }
  })

  describe('a Space’s values follow the pages they named', () => {
    const sidecar = () => join(contextsDir(root), 'Projects', 'Pommora', '_space.json')
    const renameBeta = async (): Promise<void> => {
      const renamed = await settledMutate(
        root,
        { op: 'rename', path: 'Notes/Beta.md', kind: 'page', newName: 'Gamma' },
        nexusDeps,
      )
      expect(renamed.ok).toBe(true)
    }
    beforeEach(async () => {
      await writeFile(sidecar(), JSON.stringify({ id: 'sp-pom', Related: '[[Beta]]' }))
      await reseed()
    })

    it('a Space restored on its own re-spells a value whose page was renamed meanwhile', async () => {
      expect(
        (
          await settledMutate(
            root,
            { op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' },
            nexusDeps,
          )
        ).ok,
      ).toBe(true)
      await renameBeta()
      await restore('Pommora')
      expect((await readJsonAt(sidecar())).Related).toBe('[[Gamma]]')
    })

    it('a Context records its Spaces’ value targets, and its restore re-spells a value whose page was renamed meanwhile', async () => {
      expect(
        (
          await settledMutate(
            root,
            { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
            nexusDeps,
          )
        ).ok,
      ).toBe(true)
      const [listed] = await listBundles(root, { kind: 'trash' })
      expect(listed.record).toMatchObject({
        targets: { beta: { id: PAGE_B, path: 'Notes/Beta.md' } },
      })
      await renameBeta()
      await restore('Projects')
      expect((await readJsonAt(sidecar())).Related).toBe('[[Gamma]]')
    })
  })
})

describe('restore — the gate-four pins', () => {
  it('a corrupt registry refuses a Context restore with the bundle intact', async () => {
    await settledMutate(
      root,
      { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
      nexusDeps,
    )
    await writeFile(contextsRegistryFile(root), '{corrupt')
    await applyEvents(root, [
      { event: 'change', absPath: contextsRegistryFile(root), origin: 'watched' },
    ])
    await settleNow({ push: () => {}, watch: async () => {} }, root)
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(r.ok).toBe(false)
    // Nothing moved and the evidence survives — the restore is retryable once the registry heals.
    expect(await bundleDirs(join(root, '.trash'))).toHaveLength(1)
    expect(await pathExists(join(contextsDir(root), 'Projects'))).toBe(false)
  })

  it('a Context restore under a title collision lands the FINAL title everywhere', async () => {
    await settledMutate(
      root,
      { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
      nexusDeps,
    )
    // An impostor mints the freed title while the original sits in trash.
    const reg = await readJsonAt<ContextsRegistry>(contextsRegistryFile(root))
    reg.contexts.push({ id: 'ctx_impostor', title: 'Projects' })
    await writeFile(contextsRegistryFile(root), JSON.stringify(reg))
    await mkdir(join(contextsDir(root), 'Projects'), { recursive: true })
    await refreshTree(root)

    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(r.ok).toBe(true)
    // Folder, registry entry, and membership key all wear the resolver's final title.
    expect(
      await pathExists(join(contextsDir(root), 'Projects (2)', 'Pommora', '_space.json')),
    ).toBe(true)
    const after = await readJsonAt<ContextsRegistry>(contextsRegistryFile(root))
    expect(after.contexts).toContainEqual({
      id: 'ctx_projects',
      title: 'Projects (2)',
      singular: 'Project',
      icon: 'target',
    })
    const fm = splitFrontmatter(await readFile(join(root, 'Notes', 'Daily', 'Alpha.md'), 'utf8'))
    expect(fm['<Projects (2)>']).toEqual(['Pommora'])
    expect(fm['<Projects>']).toBeUndefined()
  })

  it('an occupant the tree cannot see is stepped around — never a clobber', async () => {
    await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    // An Unknown squatter takes the resolved target: same name, contradicting kind key.
    const squatter = '---\nID: 01KVGMT8BFT350FZZXAMG1QDVD\n---\nsquatter'
    await writeFile(join(root, 'Notes', 'Daily', 'Alpha.md'), squatter)
    await applyEvents(root, [
      { event: 'add', absPath: join(root, 'Notes', 'Daily', 'Alpha.md'), origin: 'watched' },
    ])
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(r).toMatchObject({ ok: true, value: { landedAs: 'Alpha (2)' } })
    expect(await readFile(join(root, 'Notes', 'Daily', 'Alpha (2).md'), 'utf8')).toContain(PAGE_A)
    expect(await readFile(join(root, 'Notes', 'Daily', 'Alpha.md'), 'utf8')).toBe(squatter)
    expect(await bundleDirs(join(root, '.trash'))).toHaveLength(0)
  })

  it('a Set restored onto a folder Settings excludes steps aside, the excluded entry untouched', async () => {
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily', kind: 'set' }, nexusDeps)
    const settings = JSON.stringify({ excluded_folders: ['Notes/Daily'] })
    await writeFile(join(root, '.nexus', 'settings.json'), settings)
    await refreshTree(root)
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(r).toMatchObject({ ok: true, value: { landedAs: 'Daily (2)' } })
    expect(await pathExists(join(root, 'Notes', 'Daily (2)', '_pageset.json'))).toBe(true)
    expect(await readFile(join(root, '.nexus', 'settings.json'), 'utf8')).toBe(settings)
  })

  it('a restore whose title the tree already holds answers the title it took', async () => {
    await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    await writeFile(join(root, 'Notes', 'Daily', 'Alpha.md'), `---\nID: ${PAGE_B}\n---\nlive`)
    await applyEvents(root, [
      { event: 'add', absPath: join(root, 'Notes', 'Daily', 'Alpha.md'), origin: 'watched' },
    ])
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(r).toMatchObject({ ok: true, value: { landedAs: 'Alpha (2)' } })
  })

  it('a restore landing on its own title answers no landedAs', async () => {
    await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(r.ok).toBe(true)
    expect(r.ok && 'landedAs' in r.value).toBe(false)
  })

  it('a Space steps past a folder its Context holds that the tree doesn’t', async () => {
    await settledMutate(
      root,
      { op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' },
      nexusDeps,
    )
    await mkdir(join(contextsDir(root), 'Projects', 'Pommora'))
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(r).toMatchObject({ ok: true, value: { landedAs: 'Pommora (2)' } })
    expect(
      await pathExists(join(contextsDir(root), 'Projects', 'Pommora (2)', '_space.json')),
    ).toBe(true)
  })

  it('a Context steps past a folder under .nexus/contexts the registry doesn’t name, and the registry takes the stepped title', async () => {
    await settledMutate(
      root,
      { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
      nexusDeps,
    )
    await mkdir(join(contextsDir(root), 'Projects'))
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(r).toMatchObject({ ok: true, value: { landedAs: 'Projects (2)' } })
    expect(
      await pathExists(join(contextsDir(root), 'Projects (2)', 'Pommora', '_space.json')),
    ).toBe(true)
    const registry = await readJsonAt<ContextsRegistry>(contextsRegistryFile(root))
    expect(registry.contexts).toContainEqual(
      expect.objectContaining({ id: 'ctx_projects', title: 'Projects (2)' }),
    )
  })

  it('a path neither store holds refuses to restore', async () => {
    await mkdir(join(root, 'Notes', 'fake.deleted'), { recursive: true })
    await writeFile(
      join(root, 'Notes', 'fake.deleted', '_record.json'),
      JSON.stringify({ entity: 'page', id: 'x', parent: { kind: 'root' } }),
    )
    const r = await settledMutate(
      root,
      { op: 'restore', bundlePath: 'Notes/fake.deleted' },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
    expect(await pathExists(join(root, 'Notes', 'fake.deleted', '_record.json'))).toBe(true)
  })

  it('an Archive bundle isn’t emptied as a Trash one', async () => {
    const bundle = await mintBundle(
      root,
      { kind: 'archive', id: '01KVGMT8BFP350FZZXAMG1QDVC' },
      join(root, 'Notes', 'Beta.md'),
    )
    await writeFile(join(bundle, 'Beta.md'), 'body')
    await writeRecord(bundle, { entity: 'page', parent: { kind: 'root' } })
    const bundlePath = relative(root, bundle)
    const emptied = await settledMutate(root, { op: 'emptyBundle', bundlePath }, nexusDeps)
    expect(emptied.ok ? '' : emptied.error.message).toBe('Only a trash record can be emptied.')
    expect(await pathExists(join(bundle, 'Beta.md'))).toBe(true)
    expect(await readRecord(bundle)).toEqual({ entity: 'page', parent: { kind: 'root' } })
  })

  it('a property whose definition can no longer stand does not return, and its record stays', async () => {
    const bundle = await writePropertyBundle(root, {
      entity: 'property',
      id: 'prop_x',
      def: { id: 'prop_x' },
      values: {},
    })
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(r.ok).toBe(false)
    expect(await pathExists(join(bundle, '_record.json'))).toBe(true)
    expect(await pathExists(join(root, '.nexus', 'properties.json'))).toBe(false)
  })
})

describe('restore — the attack folds', () => {
  it('a bundle path that escapes the Nexus refuses before anything opens', async () => {
    const r = await settledMutate(root, { op: 'restore', bundlePath: '../x' }, nexusDeps)
    expect(r.ok ? '' : r.error.message).toBe('Path escapes the nexus root.')
  })

  it('a record cannot steer the artifact outside the nexus', async () => {
    await settledMutate(
      root,
      { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
      nexusDeps,
    )
    const [dir] = await bundleDirs(join(root, '.trash'))
    const record = await readJsonAt<{ registry: Record<string, unknown> }>(
      join(dir, '_record.json'),
    )
    record.registry.title = '../../../escape-target'
    await writeFile(join(dir, '_record.json'), JSON.stringify(record))
    expect(await listBundles(root, { kind: 'trash' })).toEqual([])
    const r = await settledMutate(
      root,
      { op: 'restore', bundlePath: relative(root, dir) },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
    expect(await pathExists(join(root, '..', 'escape-target'))).toBe(false)
  })

  it('a numeric-prefixed filename round-trips intact — the artifact keeps its real name', async () => {
    await writeFile(
      join(root, 'Notes', 'Daily', '12__Notes.md'),
      '---\nID: 01KVGMT8BFP350FZZXAMG1QDVE\n---\nbody',
    )
    await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/12__Notes.md', kind: 'page' },
      nexusDeps,
    )
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(r.ok).toBe(true)
    expect(await pathExists(join(root, 'Notes', 'Daily', '12__Notes.md'))).toBe(true)
    expect(await pathExists(join(root, 'Notes', 'Daily', 'Notes.md'))).toBe(false)
  })

  it.skipIf(noModeBits)(
    'a failed move rolls the registry re-entry back — the restore stays retryable',
    async () => {
      const { chmod } = await import('node:fs/promises')
      await settledMutate(
        root,
        { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
        nexusDeps,
      )
      await chmod(join(root, '.nexus', 'contexts'), 0o555)
      try {
        const [listed] = await listBundles(root, { kind: 'trash' })
        const failed = await settledMutate(
          root,
          { op: 'restore', bundlePath: listed.bundlePath },
          nexusDeps,
        )
        expect(failed.ok).toBe(false)
        // No ghost entry: the append reversed when the move refused.
        const reg = await readJsonAt<ContextsRegistry>(contextsRegistryFile(root))
        expect(reg.contexts.some((c) => c.id === 'ctx_projects')).toBe(false)
      } finally {
        await chmod(join(root, '.nexus', 'contexts'), 0o755)
      }
      const [listed] = await listBundles(root, { kind: 'trash' })
      const retried = await settledMutate(
        root,
        { op: 'restore', bundlePath: listed.bundlePath },
        nexusDeps,
      )
      expect(retried.ok).toBe(true)
      expect(await pathExists(join(contextsDir(root), 'Projects', 'Pommora'))).toBe(true)
    },
  )

  it('a disambiguated Context restore re-keys its own passengers to the final title', async () => {
    // Sapphire tags Pommora INSIDE Projects — a passenger link the delete never strips.
    await settledMutate(
      root,
      { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
      nexusDeps,
    )
    const reg = await readJsonAt<ContextsRegistry>(contextsRegistryFile(root))
    reg.contexts.push({ id: 'ctx_impostor', title: 'Projects' })
    await writeFile(contextsRegistryFile(root), JSON.stringify(reg))
    await mkdir(join(contextsDir(root), 'Projects'), { recursive: true })
    await refreshTree(root)

    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
    expect(r.ok).toBe(true)
    const sap = await readJsonAt(join(contextsDir(root), 'Projects (2)', 'Sapphire', '_space.json'))
    // The passenger's key follows the final title — never left pointing at the impostor.
    expect(sap['<Projects (2)>']).toEqual(['Pommora'])
    expect('<Projects>' in sap).toBe(false)
  })
})

describe('emptyBundle — giving a bundle up for good', () => {
  it('hands the artifact to the system trash and removes the spent bundle behind it', async () => {
    const handed: string[] = []
    const deps: TrashDeps = { ...nexusDeps, trashToSystem: async (p) => void handed.push(p) }
    await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'emptyBundle', bundlePath: listed.bundlePath }, deps)
    expect(r.ok).toBe(true)
    // The artifact leaves under its own name — never a stamped folder wrapping it.
    expect(handed).toHaveLength(1)
    expect(handed[0].endsWith(join(listed.bundlePath, 'Alpha.md'))).toBe(true)
    expect(await pathExists(join(root, listed.bundlePath))).toBe(false)
    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(0)
  })

  it('with the switch on the artifact never reaches the system trash at all', async () => {
    const handed: string[] = []
    const deps: TrashDeps = { ...nexusDeps, trashToSystem: async (p) => void handed.push(p) }
    await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    await writeFile(
      join(root, '.nexus', 'settings.json'),
      JSON.stringify({ personalization: { permanentDelete: true } }),
    )
    await refreshTree(root)
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'emptyBundle', bundlePath: listed.bundlePath }, deps)
    expect(r.ok).toBe(true)
    expect(handed).toEqual([])
    expect(await pathExists(join(root, listed.bundlePath))).toBe(false)
  })

  it.each([
    false,
    true,
  ])('emptying a Set’s bundle drops both its pages’ entries (permanentDelete %s); trash alone keeps them', async (permanentDelete) => {
    await writeFile(join(root, 'Notes', 'Daily', 'Beta.md'), `---\nID: ${PAGE_B}\n---\nbeta`)
    await updatePageMetadata(root, PAGE_A, { icon: 'star' })
    await updatePageMetadata(root, PAGE_B, { locked: true })
    const pages = async () => {
      const month = await readShard(root, shardOf(PAGE_A)!)
      return month.kind === 'ok' ? month.pages : null
    }
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily', kind: 'set' }, nexusDeps)
    await refreshTree(root)
    expect(await pages()).toEqual({ [PAGE_A]: { icon: 'star' }, [PAGE_B]: { locked: true } })
    const [listed] = await listBundles(root, { kind: 'trash' })
    await writeFile(
      join(root, '.nexus', 'settings.json'),
      JSON.stringify({ personalization: { permanentDelete: permanentDelete } }),
    )
    await refreshTree(root)
    const r = await settledMutate(
      root,
      { op: 'emptyBundle', bundlePath: listed.bundlePath },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(await pages()).toEqual({})
  })

  it('a Set deleted to the system trash drops its pages’ entries with the delete, and keeps another page’s', async () => {
    const PAGE_G = '01KVGMT8BFP350FZZXAMG1QDVG'
    await writeFile(join(root, 'Notes', 'Daily', 'Beta.md'), `---\nID: ${PAGE_B}\n---\nbeta`)
    await writeFile(join(root, 'Notes', 'Gamma.md'), `---\nID: ${PAGE_G}\n---\ngamma`)
    await updatePageMetadata(root, PAGE_A, { icon: 'star' })
    await updatePageMetadata(root, PAGE_B, { locked: true })
    await updatePageMetadata(root, PAGE_G, { icon: 'moon' })
    await refreshTree(root)
    const r = await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Daily', kind: 'set' },
      { trashMode: 'system', trashToSystem: (p) => rm(p, { recursive: true }) },
    )
    expect(r.ok).toBe(true)
    const month = await readShard(root, shardOf(PAGE_A)!)
    expect(month.kind === 'ok' && month.pages).toEqual({ [PAGE_G]: { icon: 'moon' } })
  })

  describe('a Collection emptied for good', () => {
    const ARCHIVED = join('.nexus', 'archive', 'col-notes')

    beforeEach(async () => {
      await writeFile(
        join(root, '.nexus', 'properties.json'),
        JSON.stringify({
          order: ['prop_related'],
          defs: {
            prop_related: { id: 'prop_related', label: 'Related', key: 'Related', type: 'link' },
          },
        }),
      )
      await mkdir(join(root, 'Other'), { recursive: true })
      await writeFile(
        join(root, 'Other', '_pagecollection.json'),
        JSON.stringify({ id: 'col-other' }),
      )
      await refreshTree(root)
    })

    const emptyNotes = async (deps: TrashDeps) => {
      await settledMutate(root, { op: 'delete', path: 'Notes', kind: 'collection' }, nexusDeps)
      const [listed] = await listBundles(root, { kind: 'trash' })
      return settledMutate(root, { op: 'emptyBundle', bundlePath: listed.bundlePath }, deps)
    }

    it.each([
      false,
      true,
    ])('a Collection emptied for good empties its Archive, its pages’ links stripped and their metadata dropped (permanentDelete %s)', async (permanentDelete) => {
      await writeFile(join(root, 'Notes', 'Daily', 'Beta.md'), `---\nID: ${PAGE_B}\n---\nbeta`)
      const linker = join(root, 'Other', 'Linker.md')
      await writeFile(linker, `---\nID: ${PAGE_C}\nRelated: "[[Beta]]"\n---\nlinker`)
      await refreshTree(root)
      await settledMutate(
        root,
        { op: 'archive', path: 'Notes/Daily/Beta.md', kind: 'page' },
        nexusDeps,
      )
      await updatePageMetadata(root, PAGE_B, { icon: 'star' })
      await writeFile(
        join(root, '.nexus', 'settings.json'),
        JSON.stringify({ personalization: { permanentDelete: permanentDelete } }),
      )
      await refreshTree(root)
      const handed: string[] = []
      const r = await emptyNotes({
        ...nexusDeps,
        trashToSystem: async (p) => {
          handed.push(p)
          await rm(p, { recursive: true })
        },
      })
      expect(r.ok).toBe(true)
      if (permanentDelete) expect(await pathExists(join(root, ARCHIVED))).toBe(false)
      else expect(handed).toContain(join(root, ARCHIVED))
      expect(splitFrontmatter(await readFile(linker, 'utf8')).Related).toBeUndefined()
      const month = await readShard(root, shardOf(PAGE_B)!)
      expect(month.kind === 'ok' && month.pages).toEqual({})
    })

    it('a Collection emptied for good takes the saved views naming the Sets in its Archive', async () => {
      const sidecar = join(root, 'Other', '_pagecollection.json')
      const located = (values: string[]) => [
        {
          id: 'view_1',
          name: 'V',
          type: 'table',
          filter: { match: 'all', rules: [{ property_id: '_location', op: 'is', values }] },
        },
      ]
      await writeFile(
        sidecar,
        JSON.stringify({ id: 'col-other', views: located(['set-daily', 'col-other']) }),
      )
      await refreshTree(root)
      await settledMutate(root, { op: 'archive', path: 'Notes/Daily', kind: 'set' }, nexusDeps)
      expect((await emptyNotes(nexusDeps)).ok).toBe(true)
      expect((await readJsonAt(sidecar)).views).toEqual(located(['col-other']))
    })
  })

  it('emptying a copy’s bundle keeps the entry of the live page sharing its ID', async () => {
    await updatePageMetadata(root, PAGE_A, { icon: 'star' })
    await writeFile(join(root, 'Notes', 'Daily', 'Alpha copy.md'), `---\nID: ${PAGE_A}\n---\ncopy`)
    await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Alpha copy.md', kind: 'page' },
      nexusDeps,
    )
    await refreshTree(root)
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(
      root,
      { op: 'emptyBundle', bundlePath: listed.bundlePath },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const month = await readShard(root, shardOf(PAGE_A)!)
    expect(month.kind === 'ok' && month.pages).toEqual({ [PAGE_A]: { icon: 'star' } })
  })

  it('refuses a chain folder that merely wears the suffix, bundles and all', async () => {
    // `.trash` mirrors the nexus, so a user's own folder can wear the bundle name anywhere in the chain. Path, root and suffix all pass here; only the record test refuses it.
    await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    const [listed] = await listBundles(root, { kind: 'trash' })
    const chain = join(root, '.trash', 'Archive.deleted')
    await mkdir(chain, { recursive: true })
    await rename(join(root, listed.bundlePath), join(chain, basename(listed.bundlePath)))
    const r = await settledMutate(
      root,
      { op: 'emptyBundle', bundlePath: '.trash/Archive.deleted' },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
    // The real bundle inside it is untouched — it would have gone with the folder.
    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(1)
  })

  it('refuses a path inside the nexus but outside the trash, and one that escapes the root', async () => {
    expect(
      (await settledMutate(root, { op: 'emptyBundle', bundlePath: 'Notes' }, nexusDeps)).ok,
    ).toBe(false)
    expect(await pathExists(join(root, 'Notes'))).toBe(true)
    const out = await settledMutate(root, { op: 'emptyBundle', bundlePath: '../escape' }, nexusDeps)
    expect(out.ok).toBe(false)
  })

  it('a spent bundle refuses rather than reporting success twice', async () => {
    await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    const [listed] = await listBundles(root, { kind: 'trash' })
    expect(
      (await settledMutate(root, { op: 'emptyBundle', bundlePath: listed.bundlePath }, nexusDeps))
        .ok,
    ).toBe(true)
    expect(
      (await settledMutate(root, { op: 'emptyBundle', bundlePath: listed.bundlePath }, nexusDeps))
        .ok,
    ).toBe(false)
  })

  it('refuses when the bundle holds more than the artifact, rather than erasing it', async () => {
    // `bundleArtifact` answers only for exactly one visible entry, so a sync client's conflict copy reads as no artifact at all. Removing the folder anyway would destroy the file with the switch OFF — the setting that promises the operating system keeps the last undo.
    const handed: string[] = []
    const deps: TrashDeps = { ...nexusDeps, trashToSystem: async (p) => void handed.push(p) }
    await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    const [listed] = await listBundles(root, { kind: 'trash' })
    const bundlePath = listed.bundlePath
    await writeFile(join(root, bundlePath, 'Alpha 2.md'), 'conflict copy')
    const r = await settledMutate(root, { op: 'emptyBundle', bundlePath }, deps)
    expect(r.ok).toBe(false)
    expect(handed).toEqual([])
    expect(await pathExists(join(root, bundlePath, 'Alpha.md'))).toBe(true)
  })

  it('a system-trash handoff that rejects leaves the bundle whole', async () => {
    const deps: TrashDeps = {
      ...nexusDeps,
      trashToSystem: async () => {
        throw new Error('nope')
      },
    }
    await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    const [listed] = await listBundles(root, { kind: 'trash' })
    const r = await settledMutate(root, { op: 'emptyBundle', bundlePath: listed.bundlePath }, deps)
    expect(r.ok).toBe(false)
    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(1)
  })
})

describe('restore — into a chosen destination', () => {
  const lastBundle = async (name: string): Promise<string> => {
    const hit = (await listBundles(root, { kind: 'trash' })).find((b) => b.artifactName === name)
    expect(hit).toBeDefined()
    return (hit as { bundlePath: string }).bundlePath
  }

  it('a page whose Set is gone lands in the Collection the user picks', async () => {
    await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily', kind: 'set' }, nexusDeps)
    const bundlePath = await lastBundle('Alpha.md')
    // Nothing climbs on its own: the plain restore refuses first.
    expect((await settledMutate(root, { op: 'restore', bundlePath }, nexusDeps)).ok).toBe(false)
    const r = await settledMutate(
      root,
      { op: 'restore', bundlePath, destination: { kind: 'container', id: 'col-notes' } },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(await pathExists(join(root, 'Notes', 'Alpha.md'))).toBe(true)
  })

  it('a picked destination lands last in the destination’s order', async () => {
    await writeFile(join(root, 'Notes', 'Beta.md'), `---\nID: ${PAGE_B}\n---\nbody`)
    await writeFile(join(root, 'Notes', 'Gamma.md'), `---\nID: ${PAGE_C}\n---\nbody`)
    await refreshTree(root)
    await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    const r = await settledMutate(
      root,
      {
        op: 'restore',
        bundlePath: await lastBundle('Alpha.md'),
        destination: { kind: 'container', id: 'col-notes' },
      },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect((await readJsonAt(join(root, 'Notes', '_pagecollection.json'))).page_order).toEqual([
      PAGE_B,
      PAGE_C,
      PAGE_A,
    ])
  })

  it('a page lands in a Set, and a Set lands in a Collection', async () => {
    await mkdir(join(root, 'Notes', 'Weekly'), { recursive: true })
    await writeFile(
      join(root, 'Notes', 'Weekly', '_pageset.json'),
      JSON.stringify({ id: 'set-week' }),
    )
    await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    const pageBundle = await lastBundle('Alpha.md')
    expect(
      (
        await settledMutate(
          root,
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

    await settledMutate(root, { op: 'delete', path: 'Notes/Weekly', kind: 'set' }, nexusDeps)
    const setBundle = await lastBundle('Weekly')
    expect(
      (
        await settledMutate(
          root,
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
    const reg = await readJsonAt<ContextsRegistry>(contextsRegistryFile(root))
    reg.contexts.push({ id: 'ctx_areas', title: 'Areas' })
    await writeFile(contextsRegistryFile(root), JSON.stringify(reg))
    await mkdir(join(contextsDir(root), 'Areas'), { recursive: true })

    await settledMutate(
      root,
      { op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' },
      nexusDeps,
    )
    await settledMutate(
      root,
      { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
      nexusDeps,
    )
    const bundlePath = await lastBundle('Pommora')
    expect((await settledMutate(root, { op: 'restore', bundlePath }, nexusDeps)).ok).toBe(false)
    const r = await settledMutate(
      root,
      { op: 'restore', bundlePath, destination: { kind: 'context', id: 'ctx_areas' } },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(await pathExists(join(contextsDir(root), 'Areas', 'Pommora', '_space.json'))).toBe(true)
  })

  it('refuses the Archive as a destination for a record that left none, a Space’s among them', async () => {
    await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    await settledMutate(
      root,
      { op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' },
      nexusDeps,
    )
    for (const name of ['Alpha.md', 'Pommora']) {
      const r = await settledMutate(
        root,
        { op: 'restore', bundlePath: await lastBundle(name), destination: { kind: 'archive' } },
        nexusDeps,
      )
      expect(r.ok ? '' : r.error.message).toBe('That kind cannot be given a destination.')
    }
  })

  it('refuses an Undo whose record names a path outside the Archive', async () => {
    await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    const bundlePath = await lastBundle('Alpha.md')
    await writeRecord(join(root, bundlePath), {
      entity: 'page',
      id: PAGE_A,
      parent: { kind: 'container', id: 'set-daily' },
      archive: '../Notes/Beta.md.archived',
    })
    const r = await settledMutate(
      root,
      { op: 'restore', bundlePath, destination: { kind: 'archive' } },
      nexusDeps,
    )
    expect(r.ok ? '' : r.error.message).toBe('That kind cannot be given a destination.')
    expect(await pathExists(join(root, bundlePath, 'Alpha.md'))).toBe(true)
    expect(await pathExists(join(root, 'Notes', 'Daily', 'Alpha.md'))).toBe(false)
  })

  it('refuses the destination the move check would refuse — a Space is not a container', async () => {
    await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily', kind: 'set' }, nexusDeps)
    const bundlePath = await lastBundle('Alpha.md')
    // The Space's own id, offered as a container — the same answer the move check gives a page dragged onto a Space folder.
    const r = await settledMutate(
      root,
      { op: 'restore', bundlePath, destination: { kind: 'container', id: 'sp-pom' } },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
    const moved = await settledMutate(
      root,
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
    // A live Context id, arriving labeled as a container. Honoring it would place the Space correctly by accident on a message that is malformed — a claim that disagrees with its own id is not a claim this path acts on.
    await settledMutate(
      root,
      { op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' },
      nexusDeps,
    )
    const bundlePath = await lastBundle('Pommora')
    const r = await settledMutate(
      root,
      { op: 'restore', bundlePath, destination: { kind: 'container', id: 'ctx_projects' } },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
    expect(await pathExists(join(contextsDir(root), 'Projects', 'Pommora'))).toBe(false)
  })

  it('refuses a Space offered a container, and a container id naming nothing', async () => {
    await settledMutate(
      root,
      { op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' },
      nexusDeps,
    )
    const spaceBundle = await lastBundle('Pommora')
    expect(
      (
        await settledMutate(
          root,
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
        await settledMutate(
          root,
          {
            op: 'restore',
            bundlePath: spaceBundle,
            destination: { kind: 'context', id: 'ctx_nope' },
          },
          nexusDeps,
        )
      ).ok,
    ).toBe(false)
    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(1)
  })

  it('refuses a destination for a kind that cannot be homeless', async () => {
    await settledMutate(root, { op: 'delete', path: 'Notes', kind: 'collection' }, nexusDeps)
    const bundlePath = await lastBundle('Notes')
    const r = await settledMutate(
      root,
      { op: 'restore', bundlePath, destination: { kind: 'container', id: 'col-notes' } },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
  })

  it('a live identity still refuses, destination or not', async () => {
    await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    const bundlePath = await lastBundle('Alpha.md')
    await writeFile(join(root, 'Notes', 'Twin.md'), `---\nID: ${PAGE_A}\n---\nbody`)
    await refreshTree(root)
    const r = await settledMutate(
      root,
      { op: 'restore', bundlePath, destination: { kind: 'container', id: 'col-notes' } },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
  })

  it('a relocation is reconciled against the schema it lands in, not the one it left', async () => {
    await writeFile(
      join(root, '.nexus', 'properties.json'),
      JSON.stringify({
        order: ['prop_status'],
        defs: {
          prop_status: {
            id: 'prop_status',
            label: 'Status',
            key: 'Status',
            type: 'select',
            select_options: [{ key: 'live', label: 'live', color: 'green' }],
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
      '---\nID: 01KVGMT8BFP350FZZXAMG1QDVB\nStatus: live\n---\nbody',
    )
    await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Beta.md', kind: 'page' },
      nexusDeps,
    )
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily', kind: 'set' }, nexusDeps)
    const bundlePath = await lastBundle('Beta.md')
    const r = await settledMutate(
      root,
      { op: 'restore', bundlePath, destination: { kind: 'container', id: 'col-plain' } },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const landed = await readFile(join(root, 'Plain', 'Beta.md'), 'utf8')
    // The value traveled as the page's own frontmatter; the destination's schema decides only what it displays.
    expect(landed.includes('Status: live')).toBe(true)
    expect(landed.includes('ID:')).toBe(true)
  })

  it('the same page restored to a Collection that DOES assign it keeps the value', async () => {
    await writeFile(
      join(root, '.nexus', 'properties.json'),
      JSON.stringify({
        order: ['prop_status'],
        defs: {
          prop_status: {
            id: 'prop_status',
            label: 'Status',
            key: 'Status',
            type: 'select',
            select_options: [{ key: 'live', label: 'live', color: 'green' }],
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
      '---\nID: 01KVGMT8BFP350FZZXAMG1QDVB\nStatus: live\n---\nbody',
    )
    await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Beta.md', kind: 'page' },
      nexusDeps,
    )
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily', kind: 'set' }, nexusDeps)
    const bundlePath = await lastBundle('Beta.md')
    const r = await settledMutate(
      root,
      { op: 'restore', bundlePath, destination: { kind: 'container', id: 'col-notes' } },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect((await readFile(join(root, 'Notes', 'Beta.md'), 'utf8')).includes('- live')).toBe(true)
  })

  it('a Collection comes back reconciled against the definitions its own sidecar assigns', async () => {
    await writeFile(
      join(root, '.nexus', 'properties.json'),
      JSON.stringify({
        order: ['prop_tags'],
        defs: {
          prop_tags: {
            id: 'prop_tags',
            label: 'Tags',
            key: 'Tags',
            type: 'multiSelect',
            select_options: [{ key: 'alpha', label: 'alpha' }],
          },
        },
      }),
    )
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'col-notes', properties: ['prop_tags'] }),
    )
    await writeFile(
      join(root, 'Notes', 'Daily', 'Beta.md'),
      `---\nID: ${PAGE_B}\nTags: alpha\n---\nbody`,
    )
    await settledMutate(root, { op: 'delete', path: 'Notes', kind: 'collection' }, nexusDeps)
    const r = await settledMutate(
      root,
      { op: 'restore', bundlePath: await lastBundle('Notes') },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const landed = splitFrontmatter(await readFile(join(root, 'Notes', 'Daily', 'Beta.md'), 'utf8'))
    expect(landed.Tags).toEqual(['alpha'])
  })
})
