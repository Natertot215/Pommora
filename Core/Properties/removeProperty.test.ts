import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ID_KEY } from '../Nexus/identityMark'
import { chmod, rename, rm, readFile, stat, utimes, writeFile } from 'node:fs/promises'
import { join, relative } from '../Paths/posix'
import { noModeBits, tempRoot, readJsonAt } from '../Testing/hostFs'
import { fault, ok } from '../Contract/result'
import { editJsonStrict } from '../Files/atomicWrite'
import { seedConfigSurfaces, viewOn } from '../Testing/configSurfaces'
import { sidecarPath } from '../Paths/paths'
import { flushValueWrites } from '../Nexus/valuesChanged'
import { removeProperty } from './removeProperty'
import { assignProperty } from './assignment'
import { createProperty, editProperty } from './registryProperty'
import { createFolderEntity } from '../Nexus/folderEntity'
import { createPage, updatePageProperty } from '../Nexus/page'
import { readSidecar } from '../Files/sidecar'
import { readRegistry } from './propertiesRegistry'
import { splitFrontmatter } from '../Files/pageFile'
import { pageCollectionSidecar } from '../Nexus/schemas'
import { closeSession, openSession } from '../Nexus/session'
import { getLiveTree, refreshTree } from '../Nexus/liveTree'
import { pageAt } from '../Nexus/treePatch'
import type { PropertyDefinition } from './properties'

vi.mock('../Files/atomicWrite', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../Files/atomicWrite')>()
  return { ...mod, editJsonStrict: vi.fn(mod.editJsonStrict) }
})

let root: string
let folder: string
let liveDef: PropertyDefinition
let propId: string
let pageA: string
let pageB: string

const stageDef = {
  id: '',
  name: 'Stage',
  type: 'status',
  status_groups: [
    {
      id: 'upcoming',
      label: 'To-do',
      color: 'gray',
      options: [{ value: 'active', group_id: 'upcoming' }],
    },
    {
      id: 'done',
      label: 'Done',
      color: 'green',
      options: [{ value: 'done', group_id: 'done' }],
    },
  ],
} as PropertyDefinition

beforeEach(async () => {
  root = tempRoot('pom-remove-')
  const c = await createFolderEntity(root, 'collection', 'Notes')
  const p = await createProperty(root, stageDef)
  if (!c.ok || !p.ok) throw new Error('setup failed')
  folder = c.value.path
  propId = p.value.id
  liveDef = { ...stageDef, id: propId } as PropertyDefinition
  await assignProperty(root, folder, propId)
  const a = await createPage(folder, 'A', { body: 'b' })
  const b = await createPage(folder, 'B', { body: 'b' })
  if (!a.ok || !b.ok) throw new Error('setup failed')
  pageA = a.value.path
  pageB = b.value.path
  await updatePageProperty(root, pageA, liveDef, { kind: 'select', value: 'active' })
  await updatePageProperty(root, pageB, liveDef, { kind: 'select', value: 'done' })
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

const pageValue = async (path: string): Promise<unknown> =>
  (splitFrontmatter(await readFile(path, 'utf8')) as Record<string, unknown>)[liveDef.name]
const sidecar = async (): Promise<Record<string, unknown> | null> =>
  (await readSidecar(folder, 'collection', pageCollectionSidecar)) as Record<string, unknown> | null
const cacheBlock = async (): Promise<{ values: Record<string, unknown> } | undefined> =>
  (
    (await sidecar())?.property_cache as
      | Record<string, { values: Record<string, unknown> }>
      | undefined
  )?.[propId]

describe('removeProperty — strip + cache (C-3/C-6)', () => {
  it('strips the value from every member page, caches {pageId: raw}, and unassigns — one transaction', async () => {
    flushValueWrites(root)
    const r = await removeProperty(root, folder, propId)
    expect(flushValueWrites(root).map((c) => c.rel)).toEqual(['Notes'])
    expect(r.ok).toBe(true)
    expect(await pageValue(pageA)).toBeUndefined()
    expect(await pageValue(pageB)).toBeUndefined()
    const sc = await sidecar()
    expect((sc?.properties as string[] | undefined) ?? []).not.toContain(propId)
    expect('modified_at' in (sc ?? {})).toBe(false)
    const block = await cacheBlock()
    expect(Object.keys(block ?? {})).toEqual(['values'])
    const vals = Object.values(block?.values ?? {})
    expect(vals).toHaveLength(2)
    expect(vals).toEqual(expect.arrayContaining([['active'], ['done']]))
  })

  it('stamps an identity-less holder before caching it, so re-assigning brings its value back', async () => {
    const raw = await readFile(pageA, 'utf8')
    await writeFile(pageA, raw.replace(new RegExp(`^${ID_KEY}:.*\\n`, 'm'), ''))
    await openSession(root)
    await refreshTree(root)
    await writeFile(join(folder, 'Late.md'), `---\n${liveDef.name}: done\n---\n`)

    expect((await removeProperty(root, folder, propId)).ok).toBe(true)
    expect(await pageValue(pageA)).toBeUndefined()
    const stamped = String(splitFrontmatter(await readFile(pageA, 'utf8'))[ID_KEY])
    expect(pageAt(getLiveTree()!, relative(root, pageA))?.id).toBe(stamped)
    // A page the tree hasn't listed yet keeps its value where it is.
    expect(await pageValue(join(folder, 'Late.md'))).toBe('done')
    await assignProperty(root, folder, propId)
    expect(await pageValue(pageA)).toEqual(['active'])
    expect(await pageValue(pageB)).toEqual(['done'])
    closeSession()
  })

  it('a copy sharing an id keeps its own value, and re-assigning fills the one Remove stripped', async () => {
    const copy = join(folder, 'A copy.md')
    const raw = await readFile(pageA, 'utf8')
    await writeFile(copy, raw.replace('- active', '- done'))
    await removeProperty(root, folder, propId)
    const [a, c] = [await pageValue(pageA), await pageValue(copy)]
    expect([a, c].filter((v) => v === undefined)).toHaveLength(1)
    await assignProperty(root, folder, propId)
    expect([await pageValue(pageA), await pageValue(copy)]).toEqual([['active'], ['done']])
    expect(await cacheBlock()).toBeUndefined()
  })

  it('is a no-op when the property is not assigned — never overwrites a cache with emptiness (E-6)', async () => {
    await removeProperty(root, folder, propId)
    const before = await cacheBlock()
    const again = await removeProperty(root, folder, propId)
    expect(again.ok).toBe(true)
    expect(await cacheBlock()).toEqual(before)
  })

  it.skipIf(noModeBits)(
    'a holder it can’t write is answered as a skip, which the channel turns into the fault',
    async () => {
      const set = await createFolderEntity(folder, 'set', 'Locked')
      if (!set.ok) throw new Error('setup failed')
      const held = await createPage(set.value.path, 'C', { body: 'b' })
      if (!held.ok) throw new Error('setup failed')
      await updatePageProperty(root, held.value.path, liveDef, { kind: 'select', value: 'done' })
      await chmod(set.value.path, 0o555)
      try {
        const r = await removeProperty(root, folder, propId).catch(fault)
        expect(r).toEqual(ok({ skipped: 1, hosts: [] }))
      } finally {
        await chmod(set.value.path, 0o755)
      }
    },
  )

  it.skipIf(noModeBits)('a holder it can’t read is answered as a skip, not left out', async () => {
    const held = await createPage(folder, 'C', { body: 'b' })
    if (!held.ok) throw new Error('setup failed')
    await updatePageProperty(root, held.value.path, liveDef, { kind: 'select', value: 'done' })
    await chmod(held.value.path, 0o000)
    try {
      expect(await removeProperty(root, folder, propId)).toEqual(ok({ skipped: 1, hosts: [] }))
    } finally {
      await chmod(held.value.path, 0o644)
    }
  })
})

describe('removeProperty reaches saved views (B-6)', () => {
  const cleared = {
    ...viewOn('', ''),
    property_order: ['_title'],
    hidden_properties: [],
    column_widths: {},
    filter: { match: 'all', rules: [] },
    sort: [],
    group: { kind: 'structural' },
    hidden_groups: [],
    collapsed_groups: [],
  }

  it('clears its own views in the one sidecar write, then its Set and the tile sourcing it, and leaves another source and the Matrix', async () => {
    const held = viewOn(propId, 'done')
    const surfaces = await seedConfigSurfaces(root, folder, held)
    const other = await createFolderEntity(root, 'collection', 'Other')
    if (!other.ok) throw new Error('setup failed')
    type TileDoc = {
      tiles: { id: string; type: string; views: { source_id: string; config: unknown }[] }[]
    }
    const doc = await readJsonAt<TileDoc>(surfaces.tiles)
    doc.tiles.push({ id: 'u', type: 'view', views: [{ source_id: other.value.id, config: held }] })
    await writeFile(surfaces.tiles, JSON.stringify(doc))
    vi.mocked(editJsonStrict).mockClear()

    expect(await removeProperty(root, folder, propId)).toEqual(
      ok({ skipped: 0, hosts: [{ kind: 'space', id: 'sp_home' }] }),
    )
    const { calls, results } = vi.mocked(editJsonStrict).mock
    const own = calls.flatMap(([path], i) =>
      path === sidecarPath(folder, 'collection') ? [results[i].value] : [],
    )
    expect(await Promise.all(own)).toEqual(['unchanged'])
    const views = await surfaces.read()
    expect([views.collection, views.set, views.tile]).toEqual([cleared, cleared, cleared])
    expect((await readJsonAt<TileDoc>(surfaces.tiles)).tiles[1].views[0].config).toEqual(held)
    expect(views.matrix).toEqual(held.filter)
    expect((await sidecar())?.properties).toEqual([])
    expect(Object.keys((await cacheBlock())?.values ?? {})).toHaveLength(2)
  })
})

describe('restore on re-assign — per-value schema-currency reconciliation (C-3)', () => {
  it('removing and re-assigning leaves every page’s modification time where it was', async () => {
    const then = new Date('2020-01-01T00:00:00Z')
    for (const page of [pageA, pageB]) await utimes(page, then, then)
    await removeProperty(root, folder, propId)
    await assignProperty(root, folder, propId)
    expect(await pageValue(pageA)).toEqual(['active'])
    for (const page of [pageA, pageB]) expect((await stat(page)).mtimeMs).toBe(then.getTime())
  })

  it('pages swapped behind the held tree each take back their own value', async () => {
    await refreshTree(root)
    await removeProperty(root, folder, propId)
    const tmp = join(folder, 'tmp.md')
    await rename(pageA, tmp)
    await rename(pageB, pageA)
    await rename(tmp, pageB)
    await assignProperty(root, folder, propId)
    expect(await pageValue(pageA)).toEqual(['done'])
    expect(await pageValue(pageB)).toEqual(['active'])
    expect(await cacheBlock()).toBeUndefined()
  })

  it('restores cached values to pages still present and clears the block', async () => {
    await removeProperty(root, folder, propId)
    const r = await assignProperty(root, folder, propId)
    expect(r.ok).toBe(true)
    expect(await pageValue(pageA)).toEqual(['active'])
    expect(await pageValue(pageB)).toEqual(['done'])
    expect(await cacheBlock()).toBeUndefined()
    expect((await sidecar())?.properties).toContain(propId)
  })

  it('a page that regained the key itself keeps its own value; a page without it still gets the cached one', async () => {
    await removeProperty(root, folder, propId)
    const raw = await readFile(pageA, 'utf8')
    await writeFile(pageA, raw.replace(/^---\n/, `---\n${liveDef.name}:\n  - done\n`))

    const r = await assignProperty(root, folder, propId)
    expect(r.ok).toBe(true)
    expect(await pageValue(pageA)).toEqual(['done'])
    expect(await pageValue(pageB)).toEqual(['done'])
    const block = (await cacheBlock()) as { values: Record<string, unknown> }
    expect(Object.values(block.values)).toEqual([['active']])
  })

  it('a value whose option no longer exists stays cached; conforming siblings restore', async () => {
    await removeProperty(root, folder, propId)
    await editProperty(root, propId, {
      status_groups: [
        {
          id: 'done',
          label: 'Done',
          color: 'green',
          options: [{ value: 'done', group_id: 'done' }],
        },
      ],
    } as Partial<PropertyDefinition>)
    await assignProperty(root, folder, propId)
    expect(await pageValue(pageA)).toBeUndefined()
    expect(await pageValue(pageB)).toEqual(['done'])
    // The entry leaves the cache only by restoring — a rejected value waits for its option to come back rather than being spent on a restore that never happened.
    const block = (await cacheBlock()) as { values: Record<string, unknown> }
    expect(Object.keys(block.values)).toHaveLength(1)
    expect(Object.values(block.values)).toEqual([['active']])
  })

  it('a value whose def type changed stays cached, restoring nothing', async () => {
    await removeProperty(root, folder, propId)
    await editProperty(root, propId, { type: 'number' })
    await assignProperty(root, folder, propId)
    expect(await pageValue(pageA)).toBeUndefined()
    expect(await pageValue(pageB)).toBeUndefined()
    const block = (await cacheBlock()) as { values: Record<string, unknown> }
    expect(Object.keys(block.values)).toHaveLength(2)
  })

  it('a page deleted while cached is skipped — its entry stays cached, no error', async () => {
    await removeProperty(root, folder, propId)
    await rm(pageA)
    const r = await assignProperty(root, folder, propId)
    expect(r.ok).toBe(true)
    expect(await pageValue(pageB)).toEqual(['done'])
    const block = (await cacheBlock()) as { values: Record<string, unknown> }
    expect(Object.keys(block.values)).toHaveLength(1)
  })

  it('restores select values whose STRINGS look like dates or URLs — type-directed, never shape-inferred (breaker H-1)', async () => {
    const sel = await createProperty(root, {
      id: '',
      name: 'Milestone',
      type: 'select',
      select_options: [
        { value: '2024-01-01' },
        { value: 'https://acme.io' },
        { value: 'note:draft' },
      ],
    } as PropertyDefinition)
    if (!sel.ok) throw new Error('setup failed')
    const id = sel.value.id
    await assignProperty(root, folder, id)
    const c = await createPage(folder, 'C', { body: 'b' })
    if (!c.ok) throw new Error('setup failed')
    const selDef = (await readRegistry(root)).defs[id]
    await updatePageProperty(root, c.value.path, selDef, { kind: 'select', value: '2024-01-01' })
    await removeProperty(root, folder, id)
    await assignProperty(root, folder, id)
    const root2 = splitFrontmatter(await readFile(c.value.path, 'utf8')) as Record<string, unknown>
    expect(root2[selDef.name]).toEqual(['2024-01-01'])
  })

  it('a Multi-Select restore keeps only the options the definition still offers — a deleted option never returns', async () => {
    const tags = await createProperty(root, {
      id: '',
      name: 'Tags',
      type: 'multiSelect',
      select_options: [{ value: 'alpha' }],
    } as PropertyDefinition)
    if (!tags.ok) throw new Error('setup failed')
    await assignProperty(root, folder, tags.value.id)
    const p = await createPage(folder, 'T', { body: 'b' })
    if (!p.ok) throw new Error('setup failed')
    await updatePageProperty(root, p.value.path, (await readRegistry(root)).defs[tags.value.id], {
      kind: 'multiSelect',
      value: ['alpha', 'zeta'],
    })
    await removeProperty(root, folder, tags.value.id)
    await assignProperty(root, folder, tags.value.id)
    const fm = splitFrontmatter(await readFile(p.value.path, 'utf8'))
    expect(fm.Tags).toEqual(['alpha'])
    const def = (await readRegistry(root)).defs[tags.value.id]
    expect(def.select_options?.map((o) => o.value)).toEqual(['alpha'])
  })
})
