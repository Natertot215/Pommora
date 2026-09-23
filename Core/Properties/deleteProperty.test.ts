import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ID_KEY } from '../Nexus/identityMark'
import { rm, readFile, readdir } from 'node:fs/promises'
import { dirname, join } from '../Paths/posix'
import { seedSpaceSidecar, readSpaceSidecar, tempRoot } from '../Testing/hostFs'
import { deleteProperty } from './deleteProperty'
import { createProperty } from './registryProperty'
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
  recordedBeforeScrub = undefined
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
      select_options: [{ value: 'hi', label: 'High', color: 'red' }],
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
      select_options: [{ value: 'hi', label: 'High', color: 'red' }],
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
      select_options: [{ value: 'hi', label: 'High' }],
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
      type: 'url',
    } as PropertyDefinition)
    if (!c.ok) throw new Error('setup failed')
    const pom = await seedSpace('Pommora', { id: 'sp1', $icon: 'box' })
    const atlas = await seedSpace('Atlas', {
      id: 'sp2',
      $icon: 'map',
      icon: 'https://draft.example',
    })

    const set = await setSpaceProperty(dirname(pom), await liveDef(c.value.id), {
      kind: 'url',
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
