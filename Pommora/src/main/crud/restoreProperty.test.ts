import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { pageCollectionSidecar } from '@shared/schemas'
import type { PropertyDefinition } from '@shared/properties'
import { handleMutate, type MutateDeps } from '../mutate'
import { readRegistry } from '../io/propertiesRegistry'
import { listBundles } from '../provenance'
import { readFrontmatterFields } from '../io/pageFile'
import { readSidecar } from '../sidecarIO'
import { closeSession, openSession } from '../session'
import { assignProperty } from './assignment'
import { createFolderEntity } from './folderEntity'
import { createPage, updatePageProperty } from './page'
import { deleteProperty } from './deleteProperty'
import { createProperty } from './registryProperty'

const deps: MutateDeps = { trashMode: 'nexus', trashToSystem: async () => {} }

let root: string
let notes: string
let tasks: string

const liveDef = async (id: string): Promise<PropertyDefinition> => {
  const def = (await readRegistry(root)).defs[id]
  if (!def) throw new Error(`no registry def for ${id}`)
  return def
}

const assigns = async (folder: string, id: string): Promise<boolean> => {
  const sc = await readSidecar(folder, 'collection', pageCollectionSidecar)
  return (((sc?.properties as string[]) ?? []) as string[]).includes(id)
}

const valueOn = async (absPage: string, name: string): Promise<unknown> =>
  readFrontmatterFields(await readFile(absPage, 'utf8'))[`<${name}>`]

/** Create Priority, assign it to both collections, and return its id. */
async function seedPriority(): Promise<string> {
  const c = await createProperty(root, {
    id: '',
    name: 'Priority',
    type: 'select',
    select_options: [
      { value: 'hi', label: 'High', color: 'red' },
      { value: 'lo', label: 'Low', color: 'blue' },
    ],
  } as PropertyDefinition)
  if (!c.ok) throw new Error('seed failed')
  await assignProperty(root, notes, c.value.id)
  await assignProperty(root, tasks, c.value.id)
  return c.value.id
}

const onlyBundlePath = async (): Promise<string> => {
  const listed = await listBundles(root)
  expect(listed).toHaveLength(1)
  return listed[0].bundlePath
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-restoreprop-'))
  const a = await createFolderEntity(root, 'collection', 'Notes')
  const b = await createFolderEntity(root, 'collection', 'Tasks')
  if (!a.ok || !b.ok) throw new Error('setup failed')
  notes = a.value.path
  tasks = b.value.path
  await openSession(root)
})
afterEach(async () => {
  closeSession()
  await rm(root, { recursive: true, force: true })
})

describe('restoring a deleted property', () => {
  it('comes back defined, assigned where it was, and holding its values', async () => {
    const id = await seedPriority()
    const p1 = await createPage(notes, 'A', { body: 'b' })
    const p2 = await createPage(tasks, 'B', { body: 'b' })
    if (!p1.ok || !p2.ok) throw new Error('pages failed')
    await updatePageProperty(p1.value.path, await liveDef(id), { kind: 'select', value: 'hi' })
    await updatePageProperty(p2.value.path, await liveDef(id), { kind: 'select', value: 'lo' })

    expect((await deleteProperty(root, id)).ok).toBe(true)
    expect((await readRegistry(root)).defs[id]).toBeUndefined()
    expect(await assigns(notes, id)).toBe(false)
    expect(await valueOn(p1.value.path, 'Priority')).toBeUndefined()

    const r = await handleMutate({ op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    expect(r.ok).toBe(true)

    const def = (await readRegistry(root)).defs[id]
    expect(def).toMatchObject({ id, name: 'Priority', type: 'select' })
    expect(await assigns(notes, id)).toBe(true)
    expect(await assigns(tasks, id)).toBe(true)
    expect(await valueOn(p1.value.path, 'Priority')).toBe('hi')
    expect(await valueOn(p2.value.path, 'Priority')).toBe('lo')
    // The bundle is spent.
    expect(await listBundles(root)).toHaveLength(0)
  })

  it('refuses when the name has been taken since, and keeps the record', async () => {
    const id = await seedPriority()
    expect((await deleteProperty(root, id)).ok).toBe(true)
    const impostor = await createProperty(root, {
      id: '',
      name: 'Priority',
      type: 'number',
    } as PropertyDefinition)
    expect(impostor.ok).toBe(true)

    const r = await handleMutate({ op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    expect(r.ok).toBe(false)
    expect((await readRegistry(root)).defs[id]).toBeUndefined()
    // Still spendable once the live one is renamed.
    expect(await listBundles(root)).toHaveLength(1)
  })

  it('refuses when the property id is live again', async () => {
    const id = await seedPriority()
    expect((await deleteProperty(root, id)).ok).toBe(true)
    const back = await createProperty(root, {
      id,
      name: 'Urgency',
      type: 'select',
      select_options: [{ value: 'hi', label: 'High', color: 'red' }],
    } as PropertyDefinition)
    expect(back.ok).toBe(true)

    const r = await handleMutate({ op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    expect(r.ok).toBe(false)
    expect((await readRegistry(root)).defs[id]).toMatchObject({ name: 'Urgency' })
    expect(await listBundles(root)).toHaveLength(1)
  })

  it('a value that no longer validates does not return', async () => {
    const id = await seedPriority()
    const page = await createPage(notes, 'A', { body: 'b' })
    const good = await createPage(notes, 'B', { body: 'b' })
    if (!page.ok || !good.ok) throw new Error('pages failed')
    const def = await liveDef(id)
    await updatePageProperty(good.value.path, def, { kind: 'select', value: 'hi' })
    // A hand-written value naming an option the definition never had.
    await updatePageProperty(page.value.path, { ...def, type: 'url' } as PropertyDefinition, {
      kind: 'url',
      value: 'nonsense',
    })
    expect(await valueOn(page.value.path, 'Priority')).toBe('nonsense')

    expect((await deleteProperty(root, id)).ok).toBe(true)
    const r = await handleMutate({ op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    expect(r.ok).toBe(true)
    // The valid one returns; the one that can't be a Priority does not.
    expect(await valueOn(good.value.path, 'Priority')).toBe('hi')
    expect(await valueOn(page.value.path, 'Priority')).toBeUndefined()
  })

  it('a page and a collection gone since the delete are skipped, and the rest still lands', async () => {
    const id = await seedPriority()
    const p1 = await createPage(notes, 'A', { body: 'b' })
    const doomed = await createPage(tasks, 'B', { body: 'b' })
    if (!p1.ok || !doomed.ok) throw new Error('pages failed')
    const def = await liveDef(id)
    await updatePageProperty(p1.value.path, def, { kind: 'select', value: 'hi' })
    await updatePageProperty(doomed.value.path, def, { kind: 'select', value: 'lo' })

    expect((await deleteProperty(root, id)).ok).toBe(true)
    await rm(tasks, { recursive: true, force: true })

    const r = await handleMutate({ op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    expect(r.ok).toBe(true)
    expect(await assigns(notes, id)).toBe(true)
    expect(await valueOn(p1.value.path, 'Priority')).toBe('hi')
    expect(await listBundles(root)).toHaveLength(0)
  })
})
