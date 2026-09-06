import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ID_KEY } from '../Nexus/identityMark'
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { deleteProperty } from './deleteProperty'
import { createProperty } from './registryProperty'
import { assignProperty } from './assignment'
import { removeProperty } from './removeProperty'
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
  root = await mkdtemp(join(tmpdir(), 'pom-del-'))
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
