import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ID_KEY } from '../Nexus/identityMark'
import { rm, readFile, readdir } from 'node:fs/promises'
import { dirname, join } from '../Paths/posix'
import { seedSpaceSidecar, readSpaceSidecar, tempRoot } from '../Testing/hostFs'
import { deleteProperty } from './deleteProperty'
import { createProperty, removeFromRegistry } from './registryProperty'
import { fault } from '../Contract/result'
import { readSchemaJournal, writeSchemaJournal } from './propertyJournal'
import { replaySchemaCascade } from './replaySchemaCascade'
import { type ConfigSurfaces, seedConfigSurfaces, viewOn } from '../Testing/configSurfaces'
import { assignProperty } from './assignment'
import { removeProperty } from './removeProperty'
import { setSpaceProperty } from './setProperty'
import { spaceFieldsFrom } from '../Contexts/spaceSidecar'
import { createFolderEntity } from '../Nexus/folderEntity'
import { createPage, updatePageProperty } from '../Nexus/page'
import { splitFrontmatter } from '../Files/pageFile'
import { readRegistry } from './propertiesRegistry'
import { readRecord } from '../Trash/record'
import { readSidecar } from '../Files/sidecar'
import { pageCollectionSidecar } from '../Nexus/schemas'
import type { PropertyDefinition } from './properties'
import { installMachine, machine } from '../Platform/machine'

vi.mock('./registryProperty', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./registryProperty')>()
  return { ...mod, removeFromRegistry: vi.fn(mod.removeFromRegistry) }
})

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
    if (key.endsWith('.md')) {
      recordedBeforeScrub ??= (await readdir(join(root, '.trash')).catch(() => [])).length > 0
    }
    return base.lock(key, fn)
  },
})

beforeEach(async () => {
  root = tempRoot('pom-del-')
  const a = await createFolderEntity(root, 'collection', 'Notes')
  const b = await createFolderEntity(root, 'collection', 'Tasks')
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
      name: 'Priority',
      type: 'select',
      select_options: [{ value: 'hi', color: 'red' }],
    } as PropertyDefinition)
    expect(c.ok).toBe(true)
    if (!c.ok) return
    const id = c.value.id
    await assignProperty(root, notes, id)
    await assignProperty(root, tasks, id)
    const p1 = await createPage(notes, 'A', { body: 'b' })
    const p2 = await createPage(tasks, 'B', { body: 'b' })
    if (!p1.ok || !p2.ok) return
    await updatePageProperty(root, p1.value.path, await liveDef(id), {
      kind: 'select',
      value: 'hi',
    })
    await updatePageProperty(root, p2.value.path, await liveDef(id), {
      kind: 'select',
      value: 'hi',
    })

    recordedBeforeScrub = undefined
    expect((await deleteProperty(root, id)).ok).toBe(true)

    expect((await readRegistry(root)).defs[id]).toBeUndefined()
    for (const folder of [notes, tasks]) {
      const sc = await readSidecar(folder, 'collection', pageCollectionSidecar)
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

  it('fails for an unknown property id', async () => {
    expect((await deleteProperty(root, 'prop_nope')).ok).toBe(false)
  })

  it('purges the property_cache block in every sidecar — even non-assigners (D-6)', async () => {
    const c = await createProperty(root, {
      id: '',
      name: 'Priority',
      type: 'select',
      select_options: [{ value: 'hi', color: 'red' }],
    } as PropertyDefinition)
    if (!c.ok) return
    const id = c.value.id
    await assignProperty(root, notes, id)
    const p = await createPage(notes, 'A', { body: 'b' })
    if (!p.ok) return
    await updatePageProperty(root, p.value.path, await liveDef(id), { kind: 'select', value: 'hi' })
    await removeProperty(root, notes, id)
    const before = await readSidecar(notes, 'collection', pageCollectionSidecar)
    expect((before?.property_cache as Record<string, unknown>)[id]).toBeDefined()

    expect((await deleteProperty(root, id)).ok).toBe(true)

    const sc = await readSidecar(notes, 'collection', pageCollectionSidecar)
    expect((sc?.property_cache as Record<string, unknown> | undefined)?.[id]).toBeUndefined()
    expect(sc?.property_cache).toBeUndefined()
    expect((await readRegistry(root)).defs[id]).toBeUndefined()
  })
})

describe('a global delete reaches a Space sidecar', () => {
  const seedSpace = (name: string, raw: Record<string, unknown>): Promise<string> =>
    seedSpaceSidecar(root, 'Projects', name, raw)

  const mkProperty = async (): Promise<string> => {
    const c = await createProperty(root, {
      id: '',
      name: 'Priority',
      type: 'select',
      select_options: [{ value: 'hi' }],
    } as PropertyDefinition)
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

  it('captures the value under the sidecar id and strips the key and its $order entry', async () => {
    const id = await mkProperty()
    const file = await seedSpace('Pommora', {
      id: 'sp1',
      Priority: ['hi'],
      $icon: 'box',
      $order: { properties: ['Priority', 'Other'] },
    })

    expect((await deleteProperty(root, id)).ok).toBe(true)

    expect((await bundle(id)).values.sp1).toEqual(['hi'])
    const raw = await readSpaceSidecar(file)
    expect('Priority' in raw).toBe(false)
    expect(raw.$icon).toBe('box')
    expect(raw.$order).toEqual({ properties: ['Other'] })
  })

  it('a property named icon sets and deletes as a value, leaving every Space its glyph', async () => {
    const c = await createProperty(root, {
      id: '',
      name: 'icon',
      type: 'link',
    } as PropertyDefinition)
    if (!c.ok) throw new Error('setup failed')
    const pom = await seedSpace('Pommora', { id: 'sp1', $icon: 'box' })
    const atlas = await seedSpace('Atlas', {
      id: 'sp2',
      $icon: 'map',
      icon: 'https://draft.example',
    })

    const set = await setSpaceProperty(dirname(pom), await liveDef(c.value.id), {
      kind: 'link',
      value: 'https://final.example',
    })
    expect(set.ok).toBe(true)
    const pomFields = spaceFieldsFrom(await readSpaceSidecar(pom))
    expect(pomFields.icon).toBe('box')
    expect(pomFields.values).toEqual({ icon: 'https://final.example' })

    expect((await deleteProperty(root, c.value.id)).ok).toBe(true)
    expect(await readSpaceSidecar(pom)).toEqual({ id: 'sp1', $icon: 'box' })
    expect(spaceFieldsFrom(await readSpaceSidecar(atlas)).icon).toBe('map')
    expect('icon' in (await readSpaceSidecar(atlas))).toBe(false)
  })

  it('marks the record partial for a sidecar holding the key with no id', async () => {
    const id = await mkProperty()
    await seedSpace('Nameless', { Priority: ['hi'] })

    expect((await deleteProperty(root, id)).ok).toBe(true)

    const record = await bundle(id)
    expect(record.partial).toBe(true)
    expect(Object.keys(record.values)).toHaveLength(0)
  })
})

describe('a delete reaches saved views', () => {
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

  async function seeded(): Promise<{
    id: string
    surfaces: ConfigSurfaces
  }> {
    const c = await createProperty(root, {
      id: '',
      name: 'Priority',
      type: 'select',
      select_options: [{ value: 'hi' }],
    } as PropertyDefinition)
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
    expect(views.matrix).toEqual({ match: 'all', rules: [] })
  }

  it('clears every field that names the property on the Collection, the Set, the tile, and the Matrix', async () => {
    const { id, surfaces } = await seeded()
    const r = await deleteProperty(root, id)
    expect(r.ok && r.value.hosts).toEqual([{ kind: 'space', id: 'sp_home' }])
    await expectCleared(surfaces)
  })

  it('the replayed delete clears the views the same way', async () => {
    const { id, surfaces } = await seeded()
    await writeSchemaJournal(root, { op: 'delete', id, name: 'Priority' })
    await replaySchemaCascade(root)
    await expectCleared(surfaces)
    expect((await readRegistry(root)).defs[id]).toBeUndefined()
    expect(await readSchemaJournal(root)).toBeNull()
  })

  it('a delete whose registry write fails keeps its record, and the next replay heals it', async () => {
    const { id, surfaces } = await seeded()
    vi.mocked(removeFromRegistry).mockResolvedValueOnce(fault('refused'))
    expect((await deleteProperty(root, id)).ok).toBe(false)
    expect(await readSchemaJournal(root)).toEqual({ op: 'delete', id, name: 'Priority' })
    await expectCleared(surfaces)
    await replaySchemaCascade(root)
    expect((await readRegistry(root)).defs[id]).toBeUndefined()
    expect(await readSchemaJournal(root)).toBeNull()
  })

  it('a replay in the freed state with a clean sweep clears the record', async () => {
    const { id } = await seeded()
    await writeSchemaJournal(root, { op: 'delete', id, name: 'Priority' })
    await removeFromRegistry(root, id)
    await replaySchemaCascade(root)
    expect(await readSchemaJournal(root)).toBeNull()
  })
})
