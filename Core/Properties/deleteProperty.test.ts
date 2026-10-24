import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { STASHED_AT } from '../Testing/definitions'
import { rewriteRaw, rewriteRootAt } from '../Nexus/governedRoot'
import { patchSidecar } from '../Files/sidecar'
import { landValue } from '../Files/rootValues'
import { ID_KEY } from '../Nexus/identityMark'
import { chmod, mkdir, rm, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join } from '../Paths/posix'
import { noModeBits, putJson, seedSpaceSidecar, readJsonAt, tempRoot } from '../Testing/hostFs'
import { deleteProperty, propertyHolders } from './deleteProperty'
import { createProperty, removeFromRegistry, renameProperty } from './registryProperty'
import { fault, ok } from '../Contract/result'
import { readNotes } from '../Nexus/owed'
import { finishOwed } from '../Nexus/finishOwed'
import { OWED_REL } from '../Paths/nexusPaths'
import type { TrashDeps } from '../Trash/discard'
import { type ConfigSurfaces, seedConfigSurfaces, viewOn } from '../Testing/configSurfaces'
import { assignProperty } from './assignment'
import { unassignProperty } from './unassignProperty'
import { createFolderEntity } from '../Nexus/folderEntity'
import { newContentId, newId } from '../Nexus/ids'
import { dropLiveTree } from '../Nexus/liveTree'
import { createTestPage } from '../Testing/createTestPage'
import { splitFrontmatter } from '../Files/pageFile'
import { readRegistry } from './propertiesRegistry'
import { readRecord } from '../Bundles/record'
import { sidecarPath } from '../Paths/paths'
import { readJsonObject, readTextOrNull } from '../Files/atomicWrite'
import type { PropertyDefinition } from './properties'
import { installMachine, machine } from '../Platform/machine'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import { seedContentIndex } from '../Index/indexSeed'

vi.mock('./registryProperty', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./registryProperty')>()
  return { ...mod, removeFromRegistry: vi.fn(mod.removeFromRegistry) }
})
vi.mock('../Files/atomicWrite', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../Files/atomicWrite')>()
  return { ...mod, readTextOrNull: vi.fn(mod.readTextOrNull) }
})

const deps: TrashDeps = { trashMode: 'nexus', trashToSystem: (p) => rm(p, { force: true }) }

/** The registry's copy is the ONLY def that addresses the same key the strip path resolves — one invented here would write somewhere no cascade ever looks. */
const liveDef = async (id: string): Promise<PropertyDefinition> => {
  const def = (await readRegistry(root)).defs[id]
  if (!def) throw new Error(`no registry def for ${id}`)
  return def
}

let root: string
let notes: string
let tasks: string
let recordedBeforeScrub: boolean | undefined

const base = machine()
installMachine({
  ...base,
  async lock(key, fn) {
    // Page locks only: an assignment during setup would otherwise pin this before the act under test has begun.
    if (key.endsWith('.md'))
      recordedBeforeScrub ??= (await readdir(join(root, '.trash')).catch(() => [])).length > 0
    return base.lock(key, fn)
  },
})

beforeEach(async () => {
  root = tempRoot('pom-del-')
  const a = await createFolderEntity(root, 'collection', 'Notes', newId())
  const b = await createFolderEntity(root, 'collection', 'Tasks', newId())
  if (!a.ok || !b.ok) throw new Error('setup failed')
  notes = a.value.path
  tasks = b.value.path
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('deleteProperty', () => {
  it('scrubs the value from every assigner, drops the def + all assignments, and snapshots', async () => {
    const c = await createProperty(root, {
      id: '',
      label: 'Priority',
      type: 'select',
      select_options: [{ id: 'opt_hi', key: 'hi', label: 'hi', color: 'red' }],
    })
    expect(c.ok).toBe(true)
    if (!c.ok) return
    const id = c.value.id
    await assignProperty(root, notes, id)
    await assignProperty(root, tasks, id)
    const p1 = await createTestPage(notes, 'A', { body: 'b' })
    const p2 = await createTestPage(tasks, 'B', { body: 'b' })
    if (!p1.ok || !p2.ok) return
    const key = (await liveDef(id)).key
    await rewriteRootAt(
      p1.value.path,
      rewriteRaw((raw) => landValue(raw, key, ['hi'])),
    )
    await rewriteRootAt(
      p2.value.path,
      rewriteRaw((raw) => landValue(raw, key, ['hi'])),
    )

    recordedBeforeScrub = undefined
    expect((await deleteProperty(root, id)).ok).toBe(true)

    expect((await readRegistry(root)).defs[id]).toBeUndefined()
    for (const folder of [notes, tasks]) {
      const sc = await readJsonObject(sidecarPath(folder, 'collection'))
      expect(((sc?.properties as string[]) ?? []).includes(id)).toBe(false)
      expect('modified_at' in (sc ?? {})).toBe(false)
    }
    for (const path of [p1.value.path, p2.value.path]) {
      const content = await readFile(path, 'utf8')
      expect(content).not.toContain('Priority')
      expect(content).toContain(`${ID_KEY}:`)
    }
    const trashed = await readdir(join(root, '.trash'))
    const name = trashed.find((f) => f.includes(`property-${id}`))
    expect(name?.endsWith('.deleted')).toBe(true)
    const record = await readRecord(join(root, '.trash', name ?? ''))
    expect(record).toMatchObject({ entity: 'property', id })
    // Write-ahead: the recovery net existed before the scrub stripped its first value.
    expect(recordedBeforeScrub).toBe(true)
    const values = (record as { values: Record<string, unknown> }).values
    for (const path of [p1.value.path, p2.value.path]) {
      const pid = splitFrontmatter(await readFile(path, 'utf8'))[ID_KEY] as string
      expect(values[pid]).toEqual(['hi'])
    }
  })

  it('a delete’s record holds the key each value’s line stood above', async () => {
    const c = await createProperty(root, {
      id: '',
      label: 'Stage',
      type: 'multiSelect',
      select_options: [{ id: 'opt_x', key: 'x', label: 'x' }],
    })
    if (!c.ok) throw new Error('setup failed')
    await assignProperty(root, notes, c.value.id)
    const ids: string[] = []
    for (const [title, rest] of [
      ['A', 'Stage: [x]\nZed: z'],
      ['B', 'Zed: z\nStage: [x]'],
    ]) {
      const p = await createTestPage(notes, title, { body: 'b' })
      if (!p.ok) throw new Error('setup failed')
      ids.push(p.value.id)
      await writeFile(p.value.path, `---\n${ID_KEY}: ${p.value.id}\n${rest}\n---\nb\n`)
    }

    const r = await deleteProperty(root, c.value.id)
    if (!r.ok) throw new Error('delete failed')
    const record = await readRecord(join(root, r.value.bundled?.bundlePath ?? ''))
    expect(record).toMatchObject({ entity: 'property', above: { [ids[0]]: 'Zed' } })
    expect((record as { above: Record<string, string> }).above).not.toHaveProperty(ids[1])
  })

  it('fails for an unknown property id', async () => {
    expect((await deleteProperty(root, 'prop_nope')).ok).toBe(false)
  })

  it('purges the property_stash block in every sidecar — even non-assigners', async () => {
    const c = await createProperty(root, {
      id: '',
      label: 'Priority',
      type: 'select',
      select_options: [{ id: 'opt_hi', key: 'hi', label: 'hi', color: 'red' }],
    })
    if (!c.ok) return
    const id = c.value.id
    await assignProperty(root, notes, id)
    const p = await createTestPage(notes, 'A', { body: 'b' })
    if (!p.ok) return
    const key = (await liveDef(id)).key
    await rewriteRootAt(
      p.value.path,
      rewriteRaw((raw) => landValue(raw, key, ['hi'])),
    )
    await unassignProperty(root, notes, id)
    const before = await readJsonObject(sidecarPath(notes, 'collection'))
    expect((before?.property_stash as Record<string, unknown>)[id]).toBeDefined()

    expect((await deleteProperty(root, id)).ok).toBe(true)

    const sc = await readJsonObject(sidecarPath(notes, 'collection'))
    expect((sc?.property_stash as Record<string, unknown> | undefined)?.[id]).toBeUndefined()
    expect(sc?.property_stash).toBeUndefined()
    expect((await readRegistry(root)).defs[id]).toBeUndefined()
  })
})

describe('propertyHolders', () => {
  it('counts the pages and Spaces holding the property', async () => {
    const c = await createProperty(root, {
      id: '',
      label: 'Priority',
      type: 'select',
      select_options: [{ id: 'opt_hi', key: 'hi', label: 'hi' }],
    })
    if (!c.ok) throw new Error('setup failed')
    await assignProperty(root, notes, c.value.id)
    const page = await createTestPage(notes, 'A', { body: 'b' })
    await createTestPage(notes, 'B', { body: 'b' })
    if (!page.ok) throw new Error('setup failed')
    const key = (await liveDef(c.value.id)).key
    await rewriteRootAt(
      page.value.path,
      rewriteRaw((raw) => landValue(raw, key, ['hi'])),
    )
    await seedSpaceSidecar(root, 'Projects', 'Pommora', { id: 'sp1', Priority: ['hi'] })

    expect(await propertyHolders(root, c.value.id)).toEqual(ok(2))
    expect((await propertyHolders(root, 'prop_nope')).ok).toBe(false)
  })

  it('counts what the delete strips, holding out an ID-less page and both claimants of one id, and writes nothing', async () => {
    const c = await createProperty(root, {
      id: '',
      label: 'Priority',
      type: 'select',
      select_options: [{ id: 'opt_hi', key: 'hi', label: 'hi' }],
    })
    if (!c.ok) throw new Error('setup failed')
    await assignProperty(root, notes, c.value.id)
    const page = await createTestPage(notes, 'A', { body: 'b' })
    if (!page.ok) throw new Error('setup failed')
    const key = (await liveDef(c.value.id)).key
    await rewriteRootAt(
      page.value.path,
      rewriteRaw((raw) => landValue(raw, key, ['hi'])),
    )
    const pid = splitFrontmatter(await readFile(page.value.path, 'utf8'))[ID_KEY] as string
    const idless = join(notes, 'Loose.md')
    await writeFile(idless, '---\nPriority: [hi]\n---\nb\n')
    const copy = join(notes, 'Copy.md')
    await writeFile(copy, `---\n${ID_KEY}: ${pid}\nPriority: hi\n---\nb\n`)
    const files = [
      page.value.path,
      idless,
      copy,
      await seedSpaceSidecar(root, 'Projects', 'Pommora', { id: 'sp1', Priority: ['hi'] }),
      await seedSpaceSidecar(root, 'Projects', 'Sapphire', { id: 'sp2', $order: [c.value.id] }),
    ]
    const before = await Promise.all(files.map((f) => readFile(f, 'utf8')))

    expect(await propertyHolders(root, c.value.id)).toEqual(ok(2))
    expect(await Promise.all(files.map((f) => readFile(f, 'utf8')))).toEqual(before)
  })

  it('a property delete strips an archived holder and files its value under its id', async () => {
    const c = await createProperty(root, {
      id: '',
      label: 'Priority',
      type: 'select',
      select_options: [{ id: 'opt_hi', key: 'hi', label: 'hi' }],
    })
    if (!c.ok) throw new Error('setup failed')
    const notesId = (await readJsonObject(sidecarPath(notes, 'collection')))?.id as string
    const held = join(
      root,
      '.nexus/archive',
      notesId,
      'Notes/2026-10-20T12-00-00-000Z__Old.md.archived/Old.md',
    )
    const pid = newContentId('page')
    await mkdir(dirname(held), { recursive: true })
    await writeFile(held, `---\n${ID_KEY}: ${pid}\nPriority: hi\n---\nb\n`)

    expect((await deleteProperty(root, c.value.id)).ok).toBe(true)

    expect(await readFile(held, 'utf8')).not.toContain('Priority')
    const name = (await readdir(join(root, '.trash'))).find((f) => f.includes(c.value.id))
    const record = await readRecord(join(root, '.trash', name ?? ''))
    expect((record as { values: Record<string, unknown> }).values).toEqual({ [pid]: 'hi' })
  })
})

describe('a global delete reaches a Space sidecar', () => {
  const seedSpace = (name: string, raw: Record<string, unknown>): Promise<string> =>
    seedSpaceSidecar(root, 'Projects', name, raw)

  const mkProperty = async (): Promise<string> => {
    const c = await createProperty(root, {
      id: '',
      label: 'Priority',
      type: 'select',
      select_options: [{ id: 'opt_hi', key: 'hi', label: 'hi' }],
    })
    if (!c.ok) throw new Error('setup failed')
    return c.value.id
  }

  const bundle = async (
    id: string,
  ): Promise<{ values: Record<string, unknown>; partial?: true }> => {
    const trashed = await readdir(join(root, '.trash'))
    const name = trashed.find((f) => f.includes(`property-${id}`))
    const record = await readRecord(join(root, '.trash', name ?? ''))
    return record as unknown as { values: Record<string, unknown>; partial?: true }
  }

  it('captures the value under the sidecar id and strips the key and its $order id', async () => {
    const id = await mkProperty()
    const file = await seedSpace('Pommora', {
      id: 'sp1',
      Priority: ['hi'],
      $icon: 'box',
      $order: [id, 'prop_other'],
    })
    const listing = await seedSpace('Sapphire', { id: 'sp2', $order: [id] })

    expect((await deleteProperty(root, id)).ok).toBe(true)

    expect((await bundle(id)).values.sp1).toEqual(['hi'])
    const raw = await readJsonAt(file)
    expect('Priority' in raw).toBe(false)
    expect(raw.$icon).toBe('box')
    expect(raw.$order).toEqual(['prop_other'])
    expect('$order' in (await readJsonAt(listing))).toBe(false)
  })

  it('strips the key from a page and a Space and records both values', async () => {
    const c = await createProperty(root, {
      id: '',
      label: 'Tags',
      type: 'multiSelect',
      select_options: [
        { id: 'opt_a', key: 'a', label: 'a' },
        { id: 'opt_b', key: 'b', label: 'b' },
      ],
    })
    if (!c.ok) throw new Error('setup failed')
    await assignProperty(root, notes, c.value.id)
    const p = await createTestPage(notes, 'A', { body: 'b' })
    if (!p.ok) throw new Error('setup failed')
    const pid = '01ARZ3NDEKPSV4RRFFQ69G5FAV'
    await writeFile(p.value.path, `---\n${ID_KEY}: ${pid}\nTags: [a]\n---\nb\n`)
    const file = await seedSpace('Pommora', { id: 'sp1', Tags: ['b'] })

    expect((await deleteProperty(root, c.value.id)).ok).toBe(true)

    expect(await readFile(p.value.path, 'utf8')).toBe(`---\n${ID_KEY}: ${pid}\n---\nb\n`)
    expect(await readJsonAt(file)).toEqual({ id: 'sp1' })
    expect((await bundle(c.value.id)).values).toEqual({ [pid]: ['a'], sp1: ['b'] })
  })

  it('a property named icon sets and deletes as a value, leaving every Space its glyph', async () => {
    const c = await createProperty(root, {
      id: '',
      label: 'icon',
      type: 'link',
    })
    if (!c.ok) throw new Error('setup failed')
    const pom = await seedSpace('Pommora', { id: 'sp1', $icon: 'box' })
    const atlas = await seedSpace('Atlas', {
      id: 'sp2',
      $icon: 'map',
      icon: 'https://draft.example',
    })

    const key = (await liveDef(c.value.id)).key
    const set = await patchSidecar(dirname(pom), 'space', (raw) =>
      landValue(raw, key, 'https://final.example'),
    )
    expect(set.ok).toBe(true)
    expect(await readJsonAt(pom)).toEqual({
      id: 'sp1',
      $icon: 'box',
      icon: 'https://final.example',
    })

    expect((await deleteProperty(root, c.value.id)).ok).toBe(true)
    expect(await readJsonAt(pom)).toEqual({ id: 'sp1', $icon: 'box' })
    expect((await readJsonAt(atlas)).$icon).toBe('map')
    expect('icon' in (await readJsonAt(atlas))).toBe(false)
  })

  it('marks the record partial for a sidecar holding the key with no id', async () => {
    const id = await mkProperty()
    await seedSpace('Nameless', { Priority: ['hi'] })

    expect((await deleteProperty(root, id)).ok).toBe(true)

    const record = await bundle(id)
    expect(record.partial).toBe(true)
    expect(Object.keys(record.values)).toHaveLength(0)
  })

  it("marks the record partial for a Collection whose sidecar doesn't parse", async () => {
    const id = await mkProperty()
    await writeFile(join(notes, '_pagecollection.json'), '{ not json')
    dropLiveTree()

    expect((await deleteProperty(root, id)).ok).toBe(true)

    expect((await bundle(id)).partial).toBe(true)
  })
})

describe('a delete reaches saved views', () => {
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

  async function seeded(): Promise<{
    id: string
    surfaces: ConfigSurfaces
  }> {
    const c = await createProperty(root, {
      id: '',
      label: 'Priority',
      type: 'select',
      select_options: [{ id: 'opt_hi', key: 'hi', label: 'hi' }],
    })
    if (!c.ok) throw new Error('setup failed')
    await assignProperty(root, notes, c.value.id)
    return {
      id: c.value.id,
      surfaces: await seedConfigSurfaces(root, notes, viewOn(c.value.id, 'hi')),
    }
  }

  const expectCleared = async (surfaces: ConfigSurfaces): Promise<void> => {
    const views = await surfaces.read()
    expect([views.collection, views.set, views.tile]).toEqual([cleared, cleared, cleared])
    expect(views.matrix).toBeNull()
    expect(views.preview).toBeUndefined()
  }

  it('clears every field that names the property on the Collection, the Set, the tile, and the Matrix', async () => {
    const { id, surfaces } = await seeded()
    const r = await deleteProperty(root, id)
    expect(r.ok && r.value.cascade?.hosts).toEqual([
      { host: { kind: 'space', id: 'sp_home' }, ids: [] },
    ])
    await expectCleared(surfaces)
  })

  it('a finished delete clears the views the same way', async () => {
    const { id, surfaces } = await seeded()
    await putJson(join(root, OWED_REL), { [id]: { kind: 'property', strip: ['Priority'] } })
    await finishOwed(root, deps)
    await expectCleared(surfaces)
    expect((await readRegistry(root)).defs[id]).toBeUndefined()
    expect(await readNotes(root)).toEqual({})
  })

  it('a delete whose registry write fails strips nothing and leaves no bundle', async () => {
    const { id, surfaces } = await seeded()
    const before = await surfaces.read()
    const registry = join(root, '.nexus', 'properties.json')
    vi.mocked(removeFromRegistry).mockImplementationOnce(async (...args) => {
      await writeFile(registry, '{nope')
      const real = await vi.importActual<typeof import('./registryProperty')>('./registryProperty')
      return real.removeFromRegistry(...args)
    })
    expect((await deleteProperty(root, id)).ok).toBe(false)
    expect(await surfaces.read()).toEqual(before)
    expect(await readFile(registry, 'utf8')).toBe('{nope')
    const trashed = await readdir(join(root, '.trash')).catch(() => [])
    expect(trashed.filter((f) => f.includes(`property-${id}`))).toEqual([])
    expect(
      ((await readJsonObject(sidecarPath(notes, 'collection')))?.properties as string[]) ?? [],
    ).toContain(id)
    expect(await readNotes(root)).toEqual({})
  })

  it('a refused list step removes the bundle and puts the entry back', async () => {
    const { id } = await seeded()
    const owed = { [id]: { kind: 'property', rename: ['Old'] } }
    await putJson(join(root, OWED_REL), owed)
    vi.mocked(removeFromRegistry).mockResolvedValueOnce(fault('refused'))
    expect((await deleteProperty(root, id)).ok).toBe(false)
    const trashed = await readdir(join(root, '.trash')).catch(() => [])
    expect(trashed.filter((f) => f.includes(`property-${id}`))).toEqual([])
    expect(await readNotes(root)).toEqual(owed)
  })

  it('a finish after the list step with a clean sweep clears the entry', async () => {
    const { id } = await seeded()
    await putJson(join(root, OWED_REL), { [id]: { kind: 'property', strip: ['Priority'] } })
    await removeFromRegistry(root, id)
    await finishOwed(root, deps)
    expect(await readNotes(root)).toEqual({})
  })
})

describe('the delete’s list step and its keys', () => {
  async function held(): Promise<{ id: string; pages: string[] }> {
    const c = await createProperty(root, { id: '', label: 'Priority', type: 'text' })
    if (!c.ok) throw new Error('setup failed')
    await assignProperty(root, notes, c.value.id)
    await assignProperty(root, tasks, c.value.id)
    const pages: string[] = []
    for (const [folder, title] of [
      [notes, 'A'],
      [tasks, 'B'],
    ]) {
      const p = await createTestPage(folder, title, { body: 'b' })
      if (!p.ok) throw new Error('setup failed')
      await rewriteRootAt(
        p.value.path,
        rewriteRaw((raw) => landValue(raw, 'Priority', 'hi')),
      )
      pages.push(p.value.path)
    }
    return { id: c.value.id, pages }
  }

  it('takes the definition off the list before it strips a page', async () => {
    const { id, pages } = await held()
    let atList = ''
    vi.mocked(removeFromRegistry).mockImplementationOnce(async (r, pid) => {
      atList = await readFile(pages[0], 'utf8')
      const real = await vi.importActual<typeof import('./registryProperty')>('./registryProperty')
      return real.removeFromRegistry(r, pid)
    })
    expect((await deleteProperty(root, id)).ok).toBe(true)
    expect(atList).toContain('Priority: hi')
    expect(await readFile(pages[0], 'utf8')).not.toContain('Priority')
  })

  it.skipIf(noModeBits)('a delete after an owed rename strips both keys', async () => {
    const { id, pages } = await held()
    await chmod(tasks, 0o555)
    try {
      expect((await renameProperty(root, id, 'Urgency')).ok).toBe(true)
    } finally {
      await chmod(tasks, 0o755)
    }
    expect(await readNotes(root)).toEqual({ [id]: { kind: 'property', rename: ['Priority'] } })
    expect((await deleteProperty(root, id)).ok).toBe(true)
    for (const page of pages) {
      const content = await readFile(page, 'utf8')
      expect(content).not.toContain('Priority:')
      expect(content).not.toContain('Urgency:')
    }
    expect(await readNotes(root)).toEqual({})
  })

  it.skipIf(noModeBits)('a delete that missed a page still records its value', async () => {
    installStores(memoryStores().stores)
    const { id, pages } = await held()
    const [shut] = pages as [string]
    const pid = splitFrontmatter(await readFile(shut, 'utf8'))[ID_KEY] as string
    await seedContentIndex(root)
    await chmod(shut, 0o000)
    try {
      expect((await deleteProperty(root, id)).ok).toBe(true)
    } finally {
      await chmod(shut, 0o644)
      installStores(NO_STORES)
    }
    const name = (await readdir(join(root, '.trash'))).find((f) => f.includes(`property-${id}`))
    const record = await readRecord(join(root, '.trash', name ?? ''))
    expect((record as { values: Record<string, unknown> }).values[pid]).toBe('hi')
    expect(await readNotes(root)).toEqual({ [id]: { kind: 'property', strip: ['Priority'] } })
  })

  it.skipIf(noModeBits)(
    "a Collection settings file the delete couldn't purge keeps the delete owed",
    async () => {
      const { id } = await held()
      const file = sidecarPath(tasks, 'collection')
      await putJson(file, {
        ...(await readJsonObject(file)),
        property_stash: {
          [id]: { removed_at: STASHED_AT, values: { [newContentId('page')]: 'hi' } },
        },
      })
      dropLiveTree()
      await chmod(file, 0o000)
      try {
        const r = await deleteProperty(root, id)
        expect(r.ok && r.value.cascade?.owed).toBe(true)
        expect(await readNotes(root)).toEqual({ [id]: { kind: 'property', strip: ['Priority'] } })
      } finally {
        await chmod(file, 0o644)
      }
      await finishOwed(root, deps)
      const sc = await readJsonObject(file)
      expect(sc?.properties ?? []).not.toContain(id)
      expect(sc).not.toHaveProperty('property_stash')
      expect(await readNotes(root)).toEqual({})
    },
  )

  it('a holder with no id keeps the delete owed', async () => {
    const { id } = await held()
    const bare = join(notes, 'Bare.md')
    await writeFile(bare, '---\nPriority: hi\n---\nb\n')
    dropLiveTree()
    const r = await deleteProperty(root, id)
    if (!r.ok) throw new Error(r.error.message)
    expect(r.value.cascade?.owed).toBe(true)
    expect(await readFile(bare, 'utf8')).toContain('Priority: hi')
    expect(await readRecord(join(root, r.value.bundled?.bundlePath ?? ''))).toMatchObject({
      partial: true,
    })
    await writeFile(bare, `---\n${ID_KEY}: ${newContentId('page')}\nPriority: hi\n---\nb\n`)
    dropLiveTree()
    await finishOwed(root, deps)
    expect(await readFile(bare, 'utf8')).not.toContain('Priority')
    expect(await readNotes(root)).toEqual({})
  })

  it('a delete reads each holder once per key it holds', async () => {
    const { id, pages } = await held()
    vi.mocked(readTextOrNull).mockClear()
    // Counted at the list step, after the find and the snapshot and before the strip's own read.
    let found: unknown[][] = []
    vi.mocked(removeFromRegistry).mockImplementationOnce(async (r, pid) => {
      found = [...vi.mocked(readTextOrNull).mock.calls]
      const real = await vi.importActual<typeof import('./registryProperty')>('./registryProperty')
      return real.removeFromRegistry(r, pid)
    })
    expect((await deleteProperty(root, id)).ok).toBe(true)
    for (const page of pages) expect(found.filter(([p]) => p === page)).toHaveLength(1)
  })
})
