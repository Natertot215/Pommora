import { readFile, rename, rm, mkdir, stat, utimes, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { contextsDir, contextsRegistryFile } from '../Paths/paths'
import { tempRoot, readJsonAt } from '../Testing/hostFs'
import { createContextGroup, createSpace } from '../Contexts/contextWrite'
import { newId } from '../Nexus/ids'
import { setSpaceProperty } from '../Properties/setProperty'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { pageCollectionSidecar } from '../Nexus/schemas'
import type { PropertyDefinition } from '../Properties/properties'
import { handleMutate } from '../Nexus/mutate'
import { readRegistry } from '../Properties/propertiesRegistry'
import { listBundles } from './holdings'
import { splitFrontmatter } from '../Files/pageFile'
import { readSidecar } from '../Files/sidecar'
import { closeSession, openSession } from '../Nexus/session'
import { assignProperty } from '../Properties/assignment'
import { createFolderEntity } from '../Nexus/folderEntity'
import { updatePageProperty } from '../Nexus/page'
import { createTestPage } from '../Testing/createTestPage'
import { deleteProperty } from '../Properties/deleteProperty'
import { removeProperty } from '../Properties/removeProperty'
import { createProperty } from '../Properties/registryProperty'
import type { TrashDeps } from './bundle'

const deps: TrashDeps = { trashMode: 'nexus', trashToSystem: async () => {} }

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
  splitFrontmatter(await readFile(absPage, 'utf8'))[name]

async function seedPriority(): Promise<string> {
  const c = await createProperty(root, {
    id: '',
    name: 'Priority',
    type: 'select',
    select_options: [
      { value: 'hi', color: 'red' },
      { value: 'lo', color: 'blue' },
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
  root = tempRoot('pom-restoreprop-')
  const a = await createFolderEntity(root, 'collection', 'Notes', newId())
  const b = await createFolderEntity(root, 'collection', 'Tasks', newId())
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
  it('reassigns a Collection holding a view this build cannot decode', async () => {
    const id = await seedPriority()
    expect((await deleteProperty(root, id)).ok).toBe(true)
    const file = join(notes, '_pagecollection.json')
    const raw = await readJsonAt(file)
    raw.views = [
      { id: 'view_x', name: 'X', type: 'table', sort: [{ property_id: 'p', direction: 'random' }] },
    ]
    await writeFile(file, JSON.stringify(raw))
    const r = await handleMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    expect(r.ok).toBe(true)
    expect((await readJsonAt(file)).properties).toEqual([id])
  })

  it('fills only pages that hold no value, names the one that kept its own, and re-dates none', async () => {
    const id = await seedPriority()
    const p1 = await createTestPage(notes, 'A', { body: 'b' })
    const p2 = await createTestPage(tasks, 'B', { body: 'b' })
    if (!p1.ok || !p2.ok) throw new Error('pages failed')
    await updatePageProperty(p1.value.path, await liveDef(id), {
      kind: 'select',
      value: 'hi',
    })
    await updatePageProperty(p2.value.path, await liveDef(id), {
      kind: 'select',
      value: 'lo',
    })
    expect((await deleteProperty(root, id)).ok).toBe(true)
    await writeFile(
      p2.value.path,
      (await readFile(p2.value.path, 'utf8')).replace(/\n---\n/, '\nPriority: hi\n---\n'),
    )
    const then = new Date('2020-01-01T00:00:00Z')
    for (const page of [p1.value.path, p2.value.path]) await utimes(page, then, then)

    const r = await handleMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    expect(r).toMatchObject({ ok: true, value: { unrestored: ['B'] } })
    expect(await valueOn(p1.value.path, 'Priority')).toEqual(['hi'])
    expect(await valueOn(p2.value.path, 'Priority')).toBe('hi')
    for (const page of [p1.value.path, p2.value.path])
      expect((await stat(page)).mtimeMs).toBe(then.getTime())
  })

  it('comes back defined, assigned where it was, and holding its values', async () => {
    const id = await seedPriority()
    const p1 = await createTestPage(notes, 'A', { body: 'b' })
    const p2 = await createTestPage(tasks, 'B', { body: 'b' })
    if (!p1.ok || !p2.ok) throw new Error('pages failed')
    await updatePageProperty(p1.value.path, await liveDef(id), {
      kind: 'select',
      value: 'hi',
    })
    await updatePageProperty(p2.value.path, await liveDef(id), {
      kind: 'select',
      value: 'lo',
    })

    expect((await deleteProperty(root, id)).ok).toBe(true)
    expect((await readRegistry(root)).defs[id]).toBeUndefined()
    expect(await assigns(notes, id)).toBe(false)
    expect(await valueOn(p1.value.path, 'Priority')).toBeUndefined()

    const r = await handleMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    expect(r.ok).toBe(true)

    const def = (await readRegistry(root)).defs[id]
    expect(def).toMatchObject({ id, name: 'Priority', type: 'select' })
    expect(await assigns(notes, id)).toBe(true)
    expect(await assigns(tasks, id)).toBe(true)
    expect(await valueOn(p1.value.path, 'Priority')).toEqual(['hi'])
    expect(await valueOn(p2.value.path, 'Priority')).toEqual(['lo'])
    expect(await listBundles(root)).toHaveLength(0)
  })

  it('steps aside when the name has been taken since', async () => {
    const id = await seedPriority()
    expect((await deleteProperty(root, id)).ok).toBe(true)
    const impostor = await createProperty(root, {
      id: '',
      name: 'Priority',
      type: 'number',
    } as PropertyDefinition)
    expect(impostor.ok).toBe(true)

    const r = await handleMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    expect(r.ok).toBe(true)
    expect((await readRegistry(root)).defs[id]?.name).toBe('Priority (2)')
    expect(await listBundles(root)).toHaveLength(0)
  })

  it('refuses when the property id is live again', async () => {
    const id = await seedPriority()
    expect((await deleteProperty(root, id)).ok).toBe(true)
    const back = await createProperty(root, {
      id,
      name: 'Urgency',
      type: 'select',
      select_options: [{ value: 'hi', color: 'red' }],
    } as PropertyDefinition)
    expect(back.ok).toBe(true)

    const r = await handleMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    expect(r.ok).toBe(false)
    expect((await readRegistry(root)).defs[id]).toMatchObject({ name: 'Urgency' })
    expect(await listBundles(root)).toHaveLength(1)
  })

  it('a value that no longer validates does not return', async () => {
    const id = await seedPriority()
    const page = await createTestPage(notes, 'A', { body: 'b' })
    const good = await createTestPage(notes, 'B', { body: 'b' })
    if (!page.ok || !good.ok) throw new Error('pages failed')
    const def = await liveDef(id)
    await updatePageProperty(good.value.path, def, { kind: 'select', value: 'hi' })
    // A hand-written value naming an option the definition never had.
    await updatePageProperty(page.value.path, { ...def, type: 'link' } as PropertyDefinition, {
      kind: 'link',
      value: 'nonsense',
    })
    expect(await valueOn(page.value.path, 'Priority')).toBe('nonsense')

    expect((await deleteProperty(root, id)).ok).toBe(true)
    const r = await handleMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    expect(r).toEqual({ ok: true, value: { unrestored: ['A'] } })
    expect(await valueOn(good.value.path, 'Priority')).toEqual(['hi'])
    expect(await valueOn(page.value.path, 'Priority')).toBeUndefined()
  })

  it('a value a Remove had cached goes back to its cache, and re-assigning brings it home', async () => {
    const id = await seedPriority()
    const page = await createTestPage(tasks, 'A', { body: 'b' })
    if (!page.ok) throw new Error('page failed')
    await updatePageProperty(page.value.path, await liveDef(id), {
      kind: 'select',
      value: 'lo',
    })
    expect((await removeProperty(root, tasks, id)).ok).toBe(true)
    expect(await valueOn(page.value.path, 'Priority')).toBeUndefined()

    const deleted = await deleteProperty(root, id)
    expect(deleted.ok && deleted.value.trashed?.bundlePath).toBe(await onlyBundlePath())
    await handleMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    expect(await assigns(tasks, id)).toBe(false)
    expect(await valueOn(page.value.path, 'Priority')).toBeUndefined()
    await assignProperty(root, tasks, id)
    expect(await valueOn(page.value.path, 'Priority')).toEqual(['lo'])
  })

  it('a page that held the key blank neither returns a value nor is named', async () => {
    const id = await seedPriority()
    const blank = await createTestPage(notes, 'Blank', { body: 'b' })
    if (!blank.ok) throw new Error('page failed')
    await writeFile(
      blank.value.path,
      (await readFile(blank.value.path, 'utf8')).replace(/^---\n/, '---\nPriority:\n'),
    )
    expect((await deleteProperty(root, id)).ok).toBe(true)
    const r = await handleMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    expect(r).toEqual({ ok: true, value: {} })
  })

  it('a page and a collection gone since the delete are skipped, and the rest still lands', async () => {
    const id = await seedPriority()
    const p1 = await createTestPage(notes, 'A', { body: 'b' })
    const doomed = await createTestPage(tasks, 'B', { body: 'b' })
    if (!p1.ok || !doomed.ok) throw new Error('pages failed')
    const def = await liveDef(id)
    await updatePageProperty(p1.value.path, def, { kind: 'select', value: 'hi' })
    await updatePageProperty(doomed.value.path, def, { kind: 'select', value: 'lo' })

    expect((await deleteProperty(root, id)).ok).toBe(true)
    await rm(tasks, { recursive: true, force: true })

    const r = await handleMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    expect(r.ok).toBe(true)
    expect(await assigns(notes, id)).toBe(true)
    expect(await valueOn(p1.value.path, 'Priority')).toEqual(['hi'])
    expect(await listBundles(root)).toHaveLength(0)
  })

  it('a Space value comes back on its sidecar and decodes', async () => {
    await mkdir(contextsDir(root), { recursive: true })
    await writeFile(contextsRegistryFile(root), JSON.stringify({ contexts: [] }))
    const group = await createContextGroup(root, 'Projects', newId())
    if (!group.ok) throw new Error('context failed')
    const space = await createSpace(root, group.value.id, 'Pommora', newId())
    if (!space.ok) throw new Error('space failed')
    const sidecarFile = join(root, space.value.path, '_space.json')
    const sidecar = async (): Promise<Record<string, unknown>> => await readJsonAt(sidecarFile)

    const id = await seedPriority()
    expect(
      (
        await setSpaceProperty(root, join(root, space.value.path), await liveDef(id), {
          kind: 'select',
          value: 'hi',
        })
      ).ok,
    ).toBe(true)
    expect((await sidecar()).Priority).toEqual(['hi'])

    expect((await deleteProperty(root, id)).ok).toBe(true)
    expect('Priority' in (await sidecar())).toBe(false)

    const r = await handleMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    expect(r.ok).toBe(true)
    expect((await sidecar()).Priority).toEqual(['hi'])
  })

  it('a Space whose Context folder differs in case from its title still takes its value back', async () => {
    await mkdir(contextsDir(root), { recursive: true })
    await writeFile(contextsRegistryFile(root), JSON.stringify({ contexts: [] }))
    const group = await createContextGroup(root, 'Projects', newId())
    if (!group.ok) throw new Error('context failed')
    const space = await createSpace(root, group.value.id, 'Pommora', newId())
    if (!space.ok) throw new Error('space failed')
    await rename(join(contextsDir(root), 'Projects'), join(contextsDir(root), 'moved'))
    await rename(join(contextsDir(root), 'moved'), join(contextsDir(root), 'projects'))
    const sidecarFile = join(contextsDir(root), 'projects', 'Pommora', '_space.json')
    const id = await seedPriority()
    await setSpaceProperty(root, join(root, space.value.path), await liveDef(id), {
      kind: 'select',
      value: 'hi',
    })
    expect((await deleteProperty(root, id)).ok).toBe(true)

    const r = await handleMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    expect(r).toEqual({ ok: true, value: {} })
    expect((await readJsonAt(sidecarFile)).Priority).toEqual(['hi'])
  })

  it('a Link value naming a page gone since comes back nowhere', async () => {
    const c = await createProperty(root, {
      id: '',
      name: 'Related',
      type: 'link',
    } as PropertyDefinition)
    if (!c.ok) throw new Error('seed failed')
    await assignProperty(root, notes, c.value.id)
    const target = await createTestPage(notes, 'Target', { body: 'b' })
    const live = await createTestPage(notes, 'Live', { body: 'b' })
    const dead = await createTestPage(notes, 'Dead', { body: 'b' })
    if (!target.ok || !live.ok || !dead.ok) throw new Error('pages failed')
    const def = await liveDef(c.value.id)
    await updatePageProperty(live.value.path, def, { kind: 'link', value: '[[Target]]' })
    await updatePageProperty(dead.value.path, def, { kind: 'link', value: '[[Gone]]' })
    expect((await deleteProperty(root, c.value.id)).ok).toBe(true)
    const r = await handleMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    expect(r).toEqual({ ok: true, value: {} })
    expect(await valueOn(live.value.path, 'Related')).toBe('[[Target]]')
    expect(await valueOn(dead.value.path, 'Related')).toBeUndefined()
  })

  it('a cached Link value naming no page stays out when the property is assigned again', async () => {
    const c = await createProperty(root, {
      id: '',
      name: 'Related',
      type: 'link',
    } as PropertyDefinition)
    if (!c.ok) throw new Error('seed failed')
    await assignProperty(root, tasks, c.value.id)
    const target = await createTestPage(tasks, 'Target', { body: 'b' })
    const live = await createTestPage(tasks, 'Live', { body: 'b' })
    const dead = await createTestPage(tasks, 'Dead', { body: 'b' })
    if (!target.ok || !live.ok || !dead.ok) throw new Error('pages failed')
    const def = await liveDef(c.value.id)
    await updatePageProperty(live.value.path, def, { kind: 'link', value: '[[Target]]' })
    await updatePageProperty(dead.value.path, def, { kind: 'link', value: '[[Gone]]' })
    expect((await removeProperty(root, tasks, c.value.id)).ok).toBe(true)
    expect((await assignProperty(root, tasks, c.value.id)).ok).toBe(true)
    expect(await valueOn(live.value.path, 'Related')).toBe('[[Target]]')
    expect(await valueOn(dead.value.path, 'Related')).toBeUndefined()
  })

  it('a Multi-Select value comes back holding only the options the definition still offers', async () => {
    const c = await createProperty(root, {
      id: '',
      name: 'Tags',
      type: 'multiSelect',
      select_options: [{ value: 'alpha' }],
    } as PropertyDefinition)
    if (!c.ok) throw new Error('seed failed')
    await assignProperty(root, notes, c.value.id)
    const page = await createTestPage(notes, 'T', { body: 'b' })
    if (!page.ok) throw new Error('page failed')
    await updatePageProperty(page.value.path, await liveDef(c.value.id), {
      kind: 'multiSelect',
      value: ['alpha', 'zeta'],
    })
    expect((await deleteProperty(root, c.value.id)).ok).toBe(true)
    const r = await handleMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    expect(r.ok).toBe(true)
    expect(await valueOn(page.value.path, 'Tags')).toEqual(['alpha'])
    expect((await liveDef(c.value.id)).select_options?.map((o) => o.value)).toEqual(['alpha'])
  })
})
