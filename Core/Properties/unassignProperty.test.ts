import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { rewriteRaw, rewriteRootAt } from '../Nexus/governedRoot'
import { landValue } from '../Files/rootValues'
import { ID_KEY } from '../Nexus/identityMark'
import { chmod, mkdir, rename, rm, readFile, stat, utimes, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from '../Paths/posix'
import { noModeBits, tempRoot, readJsonAt } from '../Testing/hostFs'
import { ok } from '../Contract/result'
import { editJsonStrict, readJsonObject } from '../Files/atomicWrite'
import { seedConfigSurfaces, viewOn } from '../Testing/configSurfaces'
import { sidecarPath } from '../Paths/paths'
import { settleNow } from '../Nexus/settle'
import type { ValueChange } from '../Nexus/tree'
import type { Pushes } from '../Contract/bridge'
import { unassignProperty } from './unassignProperty'
import { unsweptLine } from '../Nexus/entities'
import { assignProperty } from './assignment'
import { assignedIds } from '../Nexus/containerFields'
import { createProperty } from './registryProperty'
import { createFolderEntity } from '../Nexus/folderEntity'
import { newContentId, newId } from '../Nexus/ids'
import { createTestPage } from '../Testing/createTestPage'
import { patchSidecar } from '../Files/sidecar'
import { mutateRegistry, readRegistry } from './propertiesRegistry'
import { splitFrontmatter } from '../Files/pageFile'
import { closeSession, openSession } from '../Nexus/session'
import { heldTreeOf, refreshTree } from '../Nexus/liveTree'
import type { PropertyDefinition } from './properties'
import type { StashBlock } from './propertyStash'
import { readNotes } from '../Nexus/owed'
import { finishOwed } from '../Nexus/finishOwed'
import { OWED_REL } from '../Paths/nexusPaths'
import { putJson } from '../Testing/hostFs'
import { settledMutate } from '../Testing/settledMutate'
import { listBundles } from '../Bundles/bundle'
import { deleteProperty } from './deleteProperty'
import type { TrashDeps } from '../Trash/discard'

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
  label: 'Stage',
  key: 'Stage',
  type: 'status',
  status_groups: [
    {
      id: 'upcoming',
      label: 'To-do',
      color: 'gray',
      options: [{ key: 'active', label: 'active' }],
    },
    {
      id: 'done',
      label: 'Done',
      color: 'green',
      options: [{ key: 'done', label: 'done' }],
    },
  ],
} as PropertyDefinition

beforeEach(async () => {
  root = tempRoot('pom-remove-')
  const c = await createFolderEntity(root, 'collection', 'Notes', newId())
  const p = await createProperty(root, stageDef)
  if (!c.ok || !p.ok) throw new Error('setup failed')
  folder = c.value.path
  propId = p.value.id
  liveDef = { ...stageDef, id: propId } as PropertyDefinition
  await assignProperty(root, folder, propId)
  const a = await createTestPage(folder, 'A', { body: 'b' })
  const b = await createTestPage(folder, 'B', { body: 'b' })
  if (!a.ok || !b.ok) throw new Error('setup failed')
  pageA = a.value.path
  pageB = b.value.path
  await rewriteRootAt(
    pageA,
    rewriteRaw((raw) => landValue(raw, liveDef.key, ['active'])),
  )
  await rewriteRootAt(
    pageB,
    rewriteRaw((raw) => landValue(raw, liveDef.key, ['done'])),
  )
})
afterEach(async () => {
  closeSession()
  await rm(root, { recursive: true, force: true })
})

const deps: TrashDeps = { trashMode: 'nexus', trashToSystem: async () => {} }
const collectionId = async (): Promise<string> => (await sidecar())?.id as string
const pageValue = async (path: string): Promise<unknown> =>
  splitFrontmatter(await readFile(path, 'utf8'))[liveDef.key]
const sidecar = (): Promise<Record<string, unknown> | null> =>
  readJsonObject(sidecarPath(folder, 'collection'))
const stashBlock = async (): Promise<StashBlock | undefined> =>
  ((await sidecar())?.property_stash as Record<string, StashBlock> | undefined)?.[propId]

const idOf = async (path: string): Promise<string> =>
  splitFrontmatter(await readFile(path, 'utf8'))[ID_KEY] as string
const tasksCollection = async (): Promise<void> => {
  const made = await createFolderEntity(root, 'collection', 'Tasks', newId())
  if (!made.ok) throw new Error('setup failed')
  await refreshTree(root)
}

describe('unassignProperty — strip + stash', () => {
  it('strips the value from every member page, stashes {pageId: raw}, and unassigns — one transaction', async () => {
    await openSession(root)
    await refreshTree(root)
    const r = await unassignProperty(root, folder, propId)
    const rels: string[] = []
    const push = (channel: keyof Pushes, value: unknown): void => {
      if (channel === 'values:changed') rels.push(...(value as ValueChange[]).map((c) => c.rel))
    }
    await settleNow({ push, watch: async () => {} }, root)
    expect(rels).toEqual(['Notes'])
    expect(r.ok).toBe(true)
    expect(await pageValue(pageA)).toBeUndefined()
    expect(await pageValue(pageB)).toBeUndefined()
    const sc = await sidecar()
    expect((sc?.properties as string[] | undefined) ?? []).not.toContain(propId)
    expect('modified_at' in (sc ?? {})).toBe(false)
    const block = await stashBlock()
    expect(Object.keys(block ?? {})).toEqual(['removed_at', 'values'])
    const vals = Object.values(block?.values ?? {})
    expect(vals).toHaveLength(2)
    expect(vals).toEqual(expect.arrayContaining([['active'], ['done']]))
  })

  it('a holder with no id keeps the Collection owed', async () => {
    const raw = await readFile(pageA, 'utf8')
    const bare = raw.replace(new RegExp(`^${ID_KEY}:.*\\n`, 'm'), '')
    await writeFile(pageA, bare)
    await openSession(root)
    await refreshTree(root)
    expect(heldTreeOf(root)?.unreadable).toContainEqual({
      path: relative(root, pageA),
      kind: 'page',
      reason: 'missing',
    })

    const r = await unassignProperty(root, folder, propId)
    if (!r.ok) throw new Error(r.error.message)
    expect(r.value.cascade).toMatchObject({ warning: unsweptLine(1), owed: true })
    expect(await readFile(pageA, 'utf8')).toBe(bare)
    expect(await readNotes(root)).toEqual({
      [propId]: { kind: 'property', collections: [await collectionId()] },
    })
    const id = newContentId('page')
    await writeFile(pageA, bare.replace('---\n', `---\n${ID_KEY}: ${id}\n`))
    await refreshTree(root)
    await finishOwed(root, deps)
    expect(await pageValue(pageA)).toBeUndefined()
    expect((await stashBlock())?.values[id]).toEqual(['active'])
    expect(await readNotes(root)).toEqual({})
    closeSession()
  })

  it('a page and its copy sharing one id both keep their values through Remove, so re-assigning has nothing to fill', async () => {
    const copy = join(folder, 'A copy.md')
    const raw = await readFile(pageA, 'utf8')
    await writeFile(copy, raw.replace('- active', '- done'))
    await unassignProperty(root, folder, propId)
    expect([await pageValue(pageA), await pageValue(copy)]).toEqual([['active'], ['done']])
    await assignProperty(root, folder, propId)
    expect([await pageValue(pageA), await pageValue(copy)]).toEqual([['active'], ['done']])
    expect(await stashBlock()).toBeUndefined()
  })

  it('a Remove strips its own Collection’s archived holder and stashes its value, and leaves another Collection’s', async () => {
    const other = await createFolderEntity(root, 'collection', 'Other', newId())
    if (!other.ok) throw new Error('setup failed')
    const archivedUnder = async (collection: string): Promise<{ file: string; id: string }> => {
      const cid = (await readJsonObject(sidecarPath(collection, 'collection')))?.id as string
      const file = join(
        root,
        '.nexus/archive',
        cid,
        'Notes/2026-10-20T12-00-00-000Z__Old.md.archived/Old.md',
      )
      const id = newContentId('page')
      await mkdir(dirname(file), { recursive: true })
      await writeFile(file, `---\n${ID_KEY}: ${id}\nStage:\n  - done\n---\nb\n`)
      return { file, id }
    }
    const own = await archivedUnder(folder)
    const theirs = await archivedUnder(other.value.path)
    expect((await unassignProperty(root, folder, propId)).ok).toBe(true)
    expect(await pageValue(own.file)).toBeUndefined()
    expect((await stashBlock())?.values[own.id]).toEqual(['done'])
    expect(await pageValue(theirs.file)).toEqual(['done'])
  })

  it('is a no-op when the property is not assigned — never overwrites a stash with emptiness', async () => {
    await unassignProperty(root, folder, propId)
    const before = await stashBlock()
    const again = await unassignProperty(root, folder, propId)
    expect(again.ok).toBe(true)
    expect(await stashBlock()).toEqual(before)
  })

  it.skipIf(noModeBits)(
    'a holder it can’t write is answered as a skip its cascade warns of',
    async () => {
      const set = await createFolderEntity(folder, 'set', 'Locked', newId())
      if (!set.ok) throw new Error('setup failed')
      const held = await createTestPage(set.value.path, 'C', { body: 'b' })
      if (!held.ok) throw new Error('setup failed')
      await rewriteRootAt(
        held.value.path,
        rewriteRaw((raw) => landValue(raw, liveDef.key, ['done'])),
      )
      await chmod(set.value.path, 0o555)
      try {
        expect(await unassignProperty(root, folder, propId)).toEqual(
          ok({ cascade: { pages: [], hosts: [], warning: unsweptLine(1), owed: true } }),
        )
      } finally {
        await chmod(set.value.path, 0o755)
      }
    },
  )

  it.skipIf(noModeBits)('a holder it can’t read is answered as a skip, not left out', async () => {
    const held = await createTestPage(folder, 'C', { body: 'b' })
    if (!held.ok) throw new Error('setup failed')
    await rewriteRootAt(
      held.value.path,
      rewriteRaw((raw) => landValue(raw, liveDef.key, ['done'])),
    )
    await chmod(held.value.path, 0o000)
    try {
      expect(await unassignProperty(root, folder, propId)).toEqual(
        ok({ cascade: { pages: [], hosts: [], warning: unsweptLine(1), owed: true } }),
      )
    } finally {
      await chmod(held.value.path, 0o644)
    }
  })
})

describe('a Remove on the notes', () => {
  const shut = async <T>(file: string, run: () => Promise<T>): Promise<T> => {
    await chmod(file, 0o000)
    try {
      return await run()
    } finally {
      await chmod(file, 0o644)
    }
  }

  it.skipIf(noModeBits)(
    'a Remove that missed a page notes the Collection and offers Try Again',
    async () => {
      const r = await shut(pageB, () => unassignProperty(root, folder, propId))
      if (!r.ok) throw new Error(r.error.message)
      expect(r.value.cascade?.owed).toBe(true)
      expect(await readNotes(root)).toEqual({
        [propId]: { kind: 'property', collections: [await collectionId()] },
      })
      await finishOwed(root, deps)
      expect(await pageValue(pageB)).toBeUndefined()
      expect(Object.values((await stashBlock())?.values ?? {})).toContainEqual(['done'])
      expect(await readNotes(root)).toEqual({})
    },
  )

  it('a page the sweep refuses is named once and let go', async () => {
    const odd = join(folder, 'Odd.md')
    const text = `---\n${ID_KEY}: ${newContentId('page')}\nStage:\n\t- done\n---\nb\n`
    await writeFile(odd, text)
    const r = await unassignProperty(root, folder, propId)
    if (!r.ok) throw new Error(r.error.message)
    expect(r.value.cascade?.warning).toBe('Couldn’t safely rewrite “Odd”.')
    expect(r.value.cascade).not.toHaveProperty('owed')
    expect(await readNotes(root)).toEqual({})
    expect(await readFile(odd, 'utf8')).toBe(text)
  })

  it.skipIf(noModeBits)('re-adding the property cancels what its Remove owed there', async () => {
    await shut(pageB, () => unassignProperty(root, folder, propId))
    expect(await readNotes(root)).not.toEqual({})
    await assignProperty(root, folder, propId)
    await finishOwed(root, deps)
    expect(await pageValue(pageB)).toEqual(['done'])
    expect(await readNotes(root)).toEqual({})
  })

  it('a Remove under an owed rename keeps its Collection owed', async () => {
    await putJson(join(root, OWED_REL), { [propId]: { kind: 'property', rename: ['Priority'] } })
    const r = await unassignProperty(root, folder, propId)
    expect(r.ok && r.value.cascade?.owed).toBe(true)
    expect(await readNotes(root)).toEqual({
      [propId]: { kind: 'property', rename: ['Priority'], collections: [await collectionId()] },
    })
  })

  it.skipIf(noModeBits)('a delete subsumes an owed Remove', async () => {
    await shut(pageB, async () => {
      await unassignProperty(root, folder, propId)
      expect((await deleteProperty(root, propId)).ok).toBe(true)
    })
    expect(await readNotes(root)).toEqual({ [propId]: { kind: 'property', strip: ['Stage'] } })
  })

  it.skipIf(noModeBits)(
    'a note that can’t be written refuses the Remove with nothing changed',
    async () => {
      const before = [
        await readFile(sidecarPath(folder, 'collection'), 'utf8'),
        await readFile(pageA, 'utf8'),
      ]
      const notes = join(root, OWED_REL)
      await putJson(notes, { prop_other: { kind: 'property', rename: ['Elsewhere'] } })
      await chmod(notes, 0o000)
      const r = await unassignProperty(root, folder, propId).finally(() => chmod(notes, 0o644))
      expect(r.ok).toBe(false)
      expect([
        await readFile(sidecarPath(folder, 'collection'), 'utf8'),
        await readFile(pageA, 'utf8'),
      ]).toEqual(before)
    },
  )
})

describe('unassignProperty reaches saved views', () => {
  const cleared = {
    ...viewOn('', ''),
    property_order: ['_title'],
    hidden_properties: [],
    column_widths: {},
    filter: undefined,
    sort: [],
    group: { kind: 'structural' },
    hidden_groups: [],
    collapsed_groups: [],
  }

  it('clears its own views in the one sidecar write, then its Set and the tile sourcing it, and leaves another source and the Matrix', async () => {
    const held = viewOn(propId, 'done')
    const surfaces = await seedConfigSurfaces(root, folder, held)
    const otherId = newId()
    const other = await createFolderEntity(root, 'collection', 'Other', otherId)
    if (!other.ok) throw new Error('setup failed')
    type TileDoc = {
      tiles: { id: string; type: string; views: { source_id: string; config: unknown }[] }[]
    }
    const doc = await readJsonAt<TileDoc>(surfaces.tiles)
    doc.tiles.push({ id: 'u', type: 'view', views: [{ source_id: otherId, config: held }] })
    await writeFile(surfaces.tiles, JSON.stringify(doc))
    vi.mocked(editJsonStrict).mockClear()

    expect(await unassignProperty(root, folder, propId)).toEqual(
      ok({ cascade: { pages: [], hosts: [{ host: { kind: 'space', id: 'sp_home' }, ids: [] }] } }),
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
    expect(Object.keys((await stashBlock())?.values ?? {})).toHaveLength(2)
  })
})

describe('restore on re-assign — per-value schema-currency reconciliation', () => {
  const redefine = (patch: Partial<PropertyDefinition>) =>
    mutateRegistry(root, (r) => ({
      next: { ...r, defs: { ...r.defs, [propId]: { ...r.defs[propId], ...patch } } },
      result: ok(null),
    }))

  it('removing and re-assigning leaves every page’s modification time where it was', async () => {
    const then = new Date('2020-01-01T00:00:00Z')
    for (const page of [pageA, pageB]) await utimes(page, then, then)
    await unassignProperty(root, folder, propId)
    await assignProperty(root, folder, propId)
    expect(await pageValue(pageA)).toEqual(['active'])
    for (const page of [pageA, pageB]) expect((await stat(page)).mtimeMs).toBe(then.getTime())
  })

  it('pages swapped behind the held tree each take back their own value', async () => {
    await refreshTree(root)
    await unassignProperty(root, folder, propId)
    const tmp = join(folder, 'tmp.md')
    await rename(pageA, tmp)
    await rename(pageB, pageA)
    await rename(tmp, pageB)
    await assignProperty(root, folder, propId)
    expect(await pageValue(pageA)).toEqual(['done'])
    expect(await pageValue(pageB)).toEqual(['active'])
    expect(await stashBlock()).toBeUndefined()
  })

  it('restores stashed values to pages still present and clears the block', async () => {
    await unassignProperty(root, folder, propId)
    const r = await assignProperty(root, folder, propId)
    expect(r.ok).toBe(true)
    expect(await pageValue(pageA)).toEqual(['active'])
    expect(await pageValue(pageB)).toEqual(['done'])
    expect(await stashBlock()).toBeUndefined()
    expect((await sidecar())?.properties).toContain(propId)
  })

  it('a Remove after a refill that didn’t reach every page keeps the stashed values, so the next Assign leaves every page its value', async () => {
    await unassignProperty(root, folder, propId)
    await patchSidecar(folder, 'collection', (cur) => ({
      ...cur,
      properties: [...assignedIds(cur), propId],
    }))
    await rewriteRootAt(
      pageA,
      rewriteRaw((raw) => landValue(raw, liveDef.key, ['active'])),
    )
    await unassignProperty(root, folder, propId)
    await assignProperty(root, folder, propId)
    expect(await pageValue(pageA)).toEqual(['active'])
    expect(await pageValue(pageB)).toEqual(['done'])
  })

  it('a Remove stamps its block with the time it set the values aside, and a second Remove restarts the clock', async () => {
    vi.setSystemTime(new Date('2026-10-20T08:00:00.000Z'))
    try {
      await unassignProperty(root, folder, propId)
      expect(await stashBlock()).toEqual({
        removed_at: '2026-10-20T08:00:00.000Z',
        values: { [await idOf(pageA)]: ['active'], [await idOf(pageB)]: ['done'] },
      })
      const raw = await readFile(pageA, 'utf8')
      await writeFile(pageA, raw.replace(/^---\n/, `---\n${liveDef.key}:\n  - done\n`))
      await assignProperty(root, folder, propId)
      expect(Object.keys((await stashBlock())?.values ?? {})).toEqual([await idOf(pageA)])
      vi.setSystemTime(new Date('2026-10-21T08:00:00.000Z'))
      await unassignProperty(root, folder, propId)
      expect((await stashBlock())?.removed_at).toBe('2026-10-21T08:00:00.000Z')
    } finally {
      vi.useRealTimers()
    }
  })

  it('a page that regained the key itself keeps its own value; a page without it still gets the stashed one', async () => {
    await unassignProperty(root, folder, propId)
    const raw = await readFile(pageA, 'utf8')
    await writeFile(pageA, raw.replace(/^---\n/, `---\n${liveDef.key}:\n  - done\n`))

    const r = await assignProperty(root, folder, propId)
    expect(r.ok).toBe(true)
    expect(await pageValue(pageA)).toEqual(['done'])
    expect(await pageValue(pageB)).toEqual(['done'])
    const block = (await stashBlock()) as { values: Record<string, unknown> }
    expect(Object.values(block.values)).toEqual([['active']])
  })

  it('a value whose option no longer exists comes back as written beside its conforming siblings', async () => {
    await unassignProperty(root, folder, propId)
    await redefine({
      status_groups: [
        {
          id: 'done',
          label: 'Done',
          color: 'green',
          options: [{ id: 'opt_done', key: 'done', label: 'done' }],
        },
      ],
    })
    await assignProperty(root, folder, propId)
    expect(await pageValue(pageA)).toEqual(['active'])
    expect(await pageValue(pageB)).toEqual(['done'])
    expect(await stashBlock()).toBeUndefined()
  })

  it('a page deleted since its Remove leaves the stash at the re-add', async () => {
    await unassignProperty(root, folder, propId)
    const gone = await idOf(pageA)
    await rm(pageA)
    const r = await assignProperty(root, folder, propId)
    expect(r.ok).toBe(true)
    expect(await pageValue(pageB)).toEqual(['done'])
    expect((await stashBlock())?.values ?? {}).not.toHaveProperty(gone)
  })

  it('a page moved to another Collection since its Remove leaves the stash, and the other Collection gains nothing', async () => {
    await tasksCollection()
    await unassignProperty(root, folder, propId)
    const moved = await idOf(pageA)
    await settledMutate(root, { op: 'movePage', path: 'Notes/A.md', newParentPath: 'Tasks' }, deps)
    await assignProperty(root, folder, propId)
    expect((await stashBlock())?.values ?? {}).not.toHaveProperty(moved)
    expect(await pageValue(join(root, 'Tasks', 'A.md'))).toBeUndefined()
  })

  it('a page trashed from this Collection takes its value into its Trash copy where it stood, and restoring it brings the value back', async () => {
    const placed = `---\nID: ${await idOf(pageA)}\nNote: a\n${liveDef.key}:\n  - active\nZed: z\n---\nb\n`
    await writeFile(pageA, placed)
    await unassignProperty(root, folder, propId)
    await settledMutate(root, { op: 'delete', path: 'Notes/A.md', kind: 'page' }, deps)
    await assignProperty(root, folder, propId)
    const [bundle] = await listBundles(root, { kind: 'trash' })
    expect(await readFile(join(root, bundle.bundlePath, 'A.md'), 'utf8')).toBe(placed)
    expect(await stashBlock()).toBeUndefined()
    await settledMutate(root, { op: 'restore', bundlePath: bundle.bundlePath }, deps)
    expect(await pageValue(pageA)).toEqual(['active'])
  })

  it('a page trashed from another Collection takes nothing', async () => {
    await tasksCollection()
    await unassignProperty(root, folder, propId)
    const moved = await idOf(pageA)
    await settledMutate(root, { op: 'movePage', path: 'Notes/A.md', newParentPath: 'Tasks' }, deps)
    await settledMutate(root, { op: 'delete', path: 'Tasks/A.md', kind: 'page' }, deps)
    await assignProperty(root, folder, propId)
    const [bundle] = await listBundles(root, { kind: 'trash' })
    expect(
      splitFrontmatter(await readFile(join(root, bundle.bundlePath, 'A.md'), 'utf8')),
    ).not.toHaveProperty(liveDef.key)
    expect((await stashBlock())?.values ?? {}).not.toHaveProperty(moved)
  })

  it('a re-added property’s value lands at its old place', async () => {
    const id = await idOf(pageA)
    const bytes = (rest: string): string => `---\nID: ${id}\nNote: a\n${rest}---\nb\n`
    const placed = bytes(`${liveDef.key}:\n  - active\nZed: z\n`)
    await writeFile(pageA, placed)
    await unassignProperty(root, folder, propId)
    await assignProperty(root, folder, propId)
    expect(await readFile(pageA, 'utf8')).toBe(placed)
    await unassignProperty(root, folder, propId)
    await writeFile(pageA, bytes(''))
    await assignProperty(root, folder, propId)
    expect(await readFile(pageA, 'utf8')).toBe(bytes(`${liveDef.key}:\n  - active\n`))
  })

  it('restores select values whose STRINGS look like dates or URLs — type-directed, never shape-inferred', async () => {
    const sel = await createProperty(root, {
      label: 'Milestone',
      type: 'select',
      select_options: [
        { id: 'opt_2024-01-01', key: '2024-01-01', label: '2024-01-01' },
        { id: 'opt_https%3A%2F%2Facme.io', key: 'https://acme.io', label: 'https://acme.io' },
        { id: 'opt_note%3Adraft', key: 'note:draft', label: 'note:draft' },
      ],
    })
    if (!sel.ok) throw new Error('setup failed')
    const id = sel.value.id
    await assignProperty(root, folder, id)
    const c = await createTestPage(folder, 'C', { body: 'b' })
    if (!c.ok) throw new Error('setup failed')
    const selDef = (await readRegistry(root)).defs[id]
    await rewriteRootAt(
      c.value.path,
      rewriteRaw((raw) => landValue(raw, selDef.key, ['2024-01-01'])),
    )
    await unassignProperty(root, folder, id)
    await assignProperty(root, folder, id)
    const root2 = splitFrontmatter(await readFile(c.value.path, 'utf8'))
    expect(root2[selDef.key]).toEqual(['2024-01-01'])
  })

  it('a Multi-Select re-add keeps the words no option names beside its options', async () => {
    const tags = await createProperty(root, {
      label: 'Tags',
      type: 'multiSelect',
      select_options: [{ id: 'opt_alpha', key: 'alpha', label: 'alpha' }],
    })
    if (!tags.ok) throw new Error('setup failed')
    await assignProperty(root, folder, tags.value.id)
    const p = await createTestPage(folder, 'T', { body: 'b' })
    if (!p.ok) throw new Error('setup failed')
    const key = (await readRegistry(root)).defs[tags.value.id].key
    await rewriteRootAt(
      p.value.path,
      rewriteRaw((raw) => landValue(raw, key, ['alpha', 'zeta'])),
    )
    await unassignProperty(root, folder, tags.value.id)
    await assignProperty(root, folder, tags.value.id)
    const fm = splitFrontmatter(await readFile(p.value.path, 'utf8'))
    expect(fm.Tags).toEqual(['alpha', 'zeta'])
    const def = (await readRegistry(root)).defs[tags.value.id]
    expect(def.select_options?.map((o) => o.label)).toEqual(['alpha'])
  })
})
