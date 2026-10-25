import { chmod, readFile, rename, rm, mkdir, stat, utimes, writeFile } from 'node:fs/promises'
import { rewriteRoot, rewriteRootAt } from '../Nexus/governedRoot'
import { patchSidecar } from '../Files/sidecar'
import { landValue } from '../Files/rootValues'
import { dirname, join } from '../Paths/posix'
import { contextsDir, contextsRegistryFile, sidecarPath } from '../Paths/paths'
import { noModeBits, tempRoot, readJsonAt } from '../Testing/hostFs'
import { readNotes } from '../Nexus/owed'
import { finishOwed } from '../Nexus/finishOwed'
import { createContextGroup, createSpace } from '../Contexts/contextWrite'
import { newContentId, newId } from '../Nexus/ids'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PropertyDefinition } from '../Properties/properties'
import { handleMutate } from '../Nexus/mutate'
import { settledMutate } from '../Testing/settledMutate'
import { readRegistry } from '../Properties/propertiesRegistry'
import { listBundles } from '../Bundles/bundle'
import { patchRecord } from '../Bundles/record'
import { splitFrontmatter } from '../Files/pageFile'
import { readJsonObject } from '../Files/atomicWrite'
import { closeSession, openSession } from '../Nexus/session'
import { refreshTree } from '../Nexus/liveTree'
import { assignProperty } from '../Properties/assignment'
import { createFolderEntity } from '../Nexus/folderEntity'
import { createTestPage } from '../Testing/createTestPage'
import { deleteProperty } from '../Properties/deleteProperty'
import { unassignProperty } from '../Properties/unassignProperty'
import { createProperty } from '../Properties/registryProperty'
import type { TrashDeps } from './discard'
import { STASHED_AT } from '../Testing/definitions'

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
  const sc = await readJsonObject(sidecarPath(folder, 'collection'))
  return (((sc?.properties as string[]) ?? []) as string[]).includes(id)
}

const valueOn = async (absPage: string, name: string): Promise<unknown> =>
  splitFrontmatter(await readFile(absPage, 'utf8'))[name]

async function seedPriority(): Promise<string> {
  const c = await createProperty(root, {
    label: 'Priority',
    type: 'select',
    select_options: [
      { id: 'opt_hi', key: 'hi', label: 'hi', color: 'red' },
      { id: 'opt_lo', key: 'lo', label: 'lo', color: 'blue' },
    ],
  })
  if (!c.ok) throw new Error('seed failed')
  await assignProperty(root, notes, c.value.id)
  await assignProperty(root, tasks, c.value.id)
  return c.value.id
}

const archivedPage = async (fm: string): Promise<string> => {
  const cid = (await readJsonObject(sidecarPath(notes, 'collection')))?.id as string
  const file = join(
    root,
    '.nexus/archive',
    cid,
    'Notes/2026-10-20T12-00-00-000Z__Old.md.archived/Old.md',
  )
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, `---\nID: ${newContentId('page')}\n${fm}---\nb\n`)
  return file
}

const onlyBundlePath = async (): Promise<string> => {
  const listed = await listBundles(root, { kind: 'trash' })
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
    const key = (await liveDef(id)).key
    await rewriteRootAt(
      p1.value.path,
      rewriteRoot((raw) => landValue(raw, key, ['hi'])),
    )
    await rewriteRootAt(
      p2.value.path,
      rewriteRoot((raw) => landValue(raw, key, ['lo'])),
    )
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
    const key = (await liveDef(id)).key
    await rewriteRootAt(
      p1.value.path,
      rewriteRoot((raw) => landValue(raw, key, ['hi'])),
    )
    await rewriteRootAt(
      p2.value.path,
      rewriteRoot((raw) => landValue(raw, key, ['lo'])),
    )

    expect((await deleteProperty(root, id)).ok).toBe(true)
    expect((await readRegistry(root)).defs[id]).toBeUndefined()
    expect(await assigns(notes, id)).toBe(false)
    expect(await valueOn(p1.value.path, 'Priority')).toBeUndefined()

    const r = await handleMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    expect(r.ok).toBe(true)

    const def = (await readRegistry(root)).defs[id]
    expect(def).toMatchObject({ id, label: 'Priority', key: 'Priority', type: 'select' })
    expect(await assigns(notes, id)).toBe(true)
    expect(await assigns(tasks, id)).toBe(true)
    expect(await valueOn(p1.value.path, 'Priority')).toEqual(['hi'])
    expect(await valueOn(p2.value.path, 'Priority')).toEqual(['lo'])
    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(0)
  })

  it.skipIf(noModeBits)('a restore turns the delete’s owed strip into renames', async () => {
    const id = await seedPriority()
    const p1 = await createTestPage(notes, 'A', { body: 'b' })
    const set = await createFolderEntity(tasks, 'set', 'Locked', newId())
    if (!set.ok) throw new Error('set failed')
    const p2 = await createTestPage(set.value.path, 'B', { body: 'b' })
    if (!p1.ok || !p2.ok) throw new Error('pages failed')
    for (const [page, word] of [
      [p1.value.path, 'hi'],
      [p2.value.path, 'lo'],
    ])
      await rewriteRootAt(
        page,
        rewriteRoot((raw) => landValue(raw, 'Priority', [word])),
      )
    await chmod(set.value.path, 0o555)
    try {
      const r = await deleteProperty(root, id)
      expect(r.ok && r.value.cascade?.owed).toBe(true)
    } finally {
      await chmod(set.value.path, 0o755)
    }
    expect(await readNotes(root)).toEqual({ [id]: { kind: 'property', strip: ['Priority'] } })

    const r = await handleMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    expect(r.ok).toBe(true)
    // The re-assigns' refills settle once the rename they sit under does.
    const ids = await Promise.all(
      [notes, tasks].map(async (f) => (await readJsonObject(sidecarPath(f, 'collection')))?.id),
    )
    expect(await readNotes(root)).toEqual({
      [id]: { kind: 'property', rename: ['Priority'], collections: ids },
    })
    await finishOwed(root, deps)
    expect((await readRegistry(root)).defs[id]).toMatchObject({ key: 'Priority' })
    expect(await valueOn(p2.value.path, 'Priority')).toEqual(['lo'])
    expect(await readNotes(root)).toEqual({})
  })

  it('comes back with the option keys its record holds, refilling the pages that held them', async () => {
    const c = await createProperty(root, {
      label: 'Phase',
      type: 'select',
      value_format: 'Match Title',
      select_options: [{ id: 'opt_wip', key: 'wip', label: 'In Progress' }],
    })
    if (!c.ok) throw new Error('seed failed')
    await assignProperty(root, notes, c.value.id)
    const page = await createTestPage(notes, 'P', { body: 'b' })
    if (!page.ok) throw new Error('page failed')
    const key = (await liveDef(c.value.id)).key
    await rewriteRootAt(
      page.value.path,
      rewriteRoot((raw) => landValue(raw, key, ['wip'])),
    )
    expect(await valueOn(page.value.path, 'Phase')).toEqual(['wip'])
    expect((await deleteProperty(root, c.value.id)).ok).toBe(true)

    const r = await handleMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    expect(r.ok).toBe(true)
    expect((await liveDef(c.value.id)).select_options).toEqual([
      { id: 'opt_wip', key: 'wip', label: 'In Progress' },
    ])
    expect(await valueOn(page.value.path, 'Phase')).toEqual(['wip'])
  })

  it('refills a page whose key holds only spaces, as it fills a blank one', async () => {
    const c = await createProperty(root, {
      label: 'Phase',
      type: 'select',
      select_options: [{ id: 'opt_wip', key: 'wip', label: 'wip' }],
    })
    if (!c.ok) throw new Error('seed failed')
    await assignProperty(root, notes, c.value.id)
    const page = await createTestPage(notes, 'P', { body: 'b' })
    if (!page.ok) throw new Error('page failed')
    const key = (await liveDef(c.value.id)).key
    await rewriteRootAt(
      page.value.path,
      rewriteRoot((raw) => landValue(raw, key, ['wip'])),
    )
    expect((await deleteProperty(root, c.value.id)).ok).toBe(true)
    await rewriteRootAt(
      page.value.path,
      rewriteRoot((raw) => landValue(raw, key, '   ')),
    )

    const r = await handleMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    expect(r.ok).toBe(true)
    expect(await valueOn(page.value.path, 'Phase')).toEqual(['wip'])
  })

  it('a restore under a label taken since lands numbered and says so', async () => {
    const id = await seedPriority()
    expect((await deleteProperty(root, id)).ok).toBe(true)
    const impostor = await createProperty(root, {
      label: 'Priority',
      type: 'number',
    })
    expect(impostor.ok).toBe(true)

    const r = await settledMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    expect(r.ok && r.value.landedAs).toBe('Priority (2)')
    expect((await readRegistry(root)).defs[id]).toMatchObject({
      label: 'Priority (2)',
      key: 'Priority (2)',
    })
    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(0)
  })

  it('refuses when the property id is live again', async () => {
    const id = await seedPriority()
    expect((await deleteProperty(root, id)).ok).toBe(true)
    const back = await createProperty(root, {
      id,
      label: 'Urgency',
      type: 'select',
      select_options: [{ id: 'opt_hi', key: 'hi', label: 'hi', color: 'red' }],
    })
    expect(back.ok).toBe(true)

    const r = await handleMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    expect(r.ok).toBe(false)
    expect((await readRegistry(root)).defs[id]).toMatchObject({ label: 'Urgency', key: 'Urgency' })
    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(1)
  })

  it('a value naming no option comes back as written', async () => {
    const id = await seedPriority()
    const page = await createTestPage(notes, 'A', { body: 'b' })
    const good = await createTestPage(notes, 'B', { body: 'b' })
    if (!page.ok || !good.ok) throw new Error('pages failed')
    const def = await liveDef(id)
    await rewriteRootAt(
      good.value.path,
      rewriteRoot((raw) => landValue(raw, def.key, ['hi'])),
    )
    // A hand-written value naming an option the definition never had.
    await rewriteRootAt(
      page.value.path,
      rewriteRoot((raw) => landValue(raw, def.key, 'nonsense')),
    )
    expect(await valueOn(page.value.path, 'Priority')).toBe('nonsense')

    expect((await deleteProperty(root, id)).ok).toBe(true)
    const r = await handleMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    expect(r).toEqual({ ok: true, value: {} })
    expect(await valueOn(good.value.path, 'Priority')).toEqual(['hi'])
    expect(await valueOn(page.value.path, 'Priority')).toBe('nonsense')
  })

  it('a value a Remove had stashed goes back to its stash with its removal time, and re-assigning brings it home', async () => {
    const id = await seedPriority()
    const page = await createTestPage(tasks, 'A', { body: 'b' })
    if (!page.ok) throw new Error('page failed')
    const key = (await liveDef(id)).key
    await rewriteRootAt(
      page.value.path,
      rewriteRoot((raw) => landValue(raw, key, ['lo'])),
    )
    vi.setSystemTime(new Date('2026-10-01T08:00:00.000Z'))
    try {
      expect((await unassignProperty(root, tasks, id)).ok).toBe(true)
      expect(await valueOn(page.value.path, 'Priority')).toBeUndefined()

      vi.setSystemTime(new Date('2026-10-15T08:00:00.000Z'))
      const deleted = await deleteProperty(root, id)
      expect(deleted.ok && deleted.value.bundled?.bundlePath).toBe(await onlyBundlePath())
      await handleMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    } finally {
      vi.useRealTimers()
    }
    expect(await assigns(tasks, id)).toBe(false)
    const stash = (await readJsonObject(sidecarPath(tasks, 'collection')))?.property_stash
    expect((stash as Record<string, { removed_at: string }>)[id].removed_at).toBe(
      '2026-10-01T08:00:00.000Z',
    )
    expect(await valueOn(page.value.path, 'Priority')).toBeUndefined()
    await assignProperty(root, tasks, id)
    expect(await valueOn(page.value.path, 'Priority')).toEqual(['lo'])
  })

  it('a page in a stash and in the record takes the value it held at the delete, and isn’t named unrestored', async () => {
    const id = await seedPriority()
    const page = await createTestPage(notes, 'A', { body: 'b' })
    if (!page.ok) throw new Error('page failed')
    const key = (await liveDef(id)).key
    await rewriteRootAt(
      page.value.path,
      rewriteRoot((raw) => landValue(raw, key, ['hi'])),
    )
    expect((await unassignProperty(root, notes, id)).ok).toBe(true)
    await rewriteRootAt(
      page.value.path,
      rewriteRoot((raw) => landValue(raw, key, ['lo'])),
    )
    await assignProperty(root, notes, id)
    expect((await deleteProperty(root, id)).ok).toBe(true)

    const r = await handleMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    expect(r.ok && r.value.unrestored).toBeUndefined()
    expect(await valueOn(page.value.path, 'Priority')).toEqual(['lo'])
    const stash = (await readJsonObject(sidecarPath(notes, 'collection')))?.property_stash as
      | Record<string, { values: Record<string, unknown> }>
      | undefined
    expect(stash?.[id]?.values[page.value.id]).toBeUndefined()
  })

  it('a restored property’s value lands at its old place', async () => {
    const c = await createProperty(root, {
      label: 'Stage',
      type: 'multiSelect',
      select_options: [{ id: 'opt_x', key: 'x', label: 'x' }],
    })
    if (!c.ok) throw new Error('seed failed')
    await assignProperty(root, notes, c.value.id)
    const kept = await createTestPage(notes, 'A', { body: 'b' })
    const moved = await createTestPage(notes, 'B', { body: 'b' })
    if (!kept.ok || !moved.ok) throw new Error('pages failed')
    const bytes = (pageId: string, rest: string): string =>
      `---\nID: ${pageId}\nNote: a\n${rest}---\nb\n`
    await writeFile(kept.value.path, bytes(kept.value.id, 'Stage:\n  - x\nZed: z\n'))
    await writeFile(moved.value.path, bytes(moved.value.id, 'Stage:\n  - x\nZed: z\n'))
    expect((await deleteProperty(root, c.value.id)).ok).toBe(true)
    await writeFile(moved.value.path, bytes(moved.value.id, ''))

    await handleMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    expect(await readFile(kept.value.path, 'utf8')).toBe(
      bytes(kept.value.id, 'Stage:\n  - x\nZed: z\n'),
    )
    expect(await readFile(moved.value.path, 'utf8')).toBe(bytes(moved.value.id, 'Stage:\n  - x\n'))
  })

  it('a property deleted while its Collection sits in the Trash switches back on there when both return', async () => {
    const id = await seedPriority()
    const page = await createTestPage(tasks, 'A', { body: 'b' })
    if (!page.ok) throw new Error('page failed')
    const key = (await liveDef(id)).key
    await rewriteRootAt(
      page.value.path,
      rewriteRoot((raw) => landValue(raw, key, ['hi'])),
    )
    await refreshTree(root)
    expect(
      (await settledMutate(root, { op: 'delete', path: 'Tasks', kind: 'collection' }, deps)).ok,
    ).toBe(true)
    expect((await deleteProperty(root, id)).ok).toBe(true)
    const [collection, property] = await Promise.all(
      ['collection', 'property'].map(async (entity) =>
        (await listBundles(root, { kind: 'trash' })).find((b) => b.record.entity === entity),
      ),
    )
    await settledMutate(root, { op: 'restore', bundlePath: collection?.bundlePath ?? '' }, deps)
    expect(await assigns(tasks, id)).toBe(true)
    await settledMutate(root, { op: 'restore', bundlePath: property?.bundlePath ?? '' }, deps)
    expect(await assigns(tasks, id)).toBe(true)
    expect(await valueOn(page.value.path, 'Priority')).toEqual(['hi'])
  })

  it.skipIf(noModeBits)(
    'a restore that can’t refill a page from its stash says so with Try Again',
    async () => {
      const id = await seedPriority()
      const page = await createTestPage(tasks, 'A', { body: 'b' })
      if (!page.ok) throw new Error('page failed')
      await patchSidecar(tasks, 'collection', (cur) => ({
        ...cur,
        property_stash: { [id]: { removed_at: STASHED_AT, values: { [page.value.id]: ['hi'] } } },
      }))
      expect((await deleteProperty(root, id)).ok).toBe(true)
      await refreshTree(root)
      await chmod(page.value.path, 0o000)
      const r = await handleMutate(
        root,
        { op: 'restore', bundlePath: await onlyBundlePath() },
        deps,
      ).finally(() => chmod(page.value.path, 0o644))
      expect(r.ok && r.value.cascade).toEqual({
        pages: [],
        hosts: [],
        warning: 'Couldn’t update 1 Item.',
        owed: true,
      })
    },
  )

  it('a partly recorded property’s restore says so', async () => {
    const id = await seedPriority()
    const restore = async (partial: boolean): Promise<string | undefined> => {
      expect((await deleteProperty(root, id)).ok).toBe(true)
      const bundlePath = await onlyBundlePath()
      if (partial) await patchRecord(join(root, bundlePath), (raw) => ({ ...raw, partial: true }))
      const r = await handleMutate(root, { op: 'restore', bundlePath }, deps)
      if (!r.ok) throw new Error('restore refused')
      return r.value.cascade?.warning
    }
    expect(await restore(false)).toBeUndefined()
    expect(await restore(true)).toContain(
      '“Priority” was recorded partly, so some of what it held may not come back.',
    )
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
    await rewriteRootAt(
      p1.value.path,
      rewriteRoot((raw) => landValue(raw, def.key, ['hi'])),
    )
    await rewriteRootAt(
      doomed.value.path,
      rewriteRoot((raw) => landValue(raw, def.key, ['lo'])),
    )

    expect((await deleteProperty(root, id)).ok).toBe(true)
    await rm(tasks, { recursive: true, force: true })

    const r = await handleMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    expect(r.ok).toBe(true)
    expect(await assigns(notes, id)).toBe(true)
    expect(await valueOn(p1.value.path, 'Priority')).toEqual(['hi'])
    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(0)
  })

  it('a Space value comes back on its sidecar and decodes', async () => {
    await mkdir(contextsDir(root), { recursive: true })
    await writeFile(contextsRegistryFile(root), JSON.stringify({ contexts: [] }))
    const groupId = newId()
    const group = await createContextGroup(root, 'Projects', groupId)
    if (!group.ok) throw new Error('context failed')
    const space = await createSpace(root, groupId, 'Pommora', newId())
    if (!space.ok) throw new Error('space failed')
    const sidecarFile = join(root, space.value.path, '_space.json')
    const sidecar = async (): Promise<Record<string, unknown>> => await readJsonAt(sidecarFile)

    const id = await seedPriority()
    const key = (await liveDef(id)).key
    expect(
      (
        await patchSidecar(join(root, space.value.path), 'space', (raw) =>
          landValue(raw, key, ['hi']),
        )
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
    const groupId = newId()
    const group = await createContextGroup(root, 'Projects', groupId)
    if (!group.ok) throw new Error('context failed')
    const space = await createSpace(root, groupId, 'Pommora', newId())
    if (!space.ok) throw new Error('space failed')
    await rename(join(contextsDir(root), 'Projects'), join(contextsDir(root), 'moved'))
    await rename(join(contextsDir(root), 'moved'), join(contextsDir(root), 'projects'))
    const sidecarFile = join(contextsDir(root), 'projects', 'Pommora', '_space.json')
    const id = await seedPriority()
    const key = (await liveDef(id)).key
    await patchSidecar(join(root, space.value.path), 'space', (raw) => landValue(raw, key, ['hi']))
    expect((await deleteProperty(root, id)).ok).toBe(true)

    const r = await handleMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    expect(r).toEqual({ ok: true, value: {} })
    expect((await readJsonAt(sidecarFile)).Priority).toEqual(['hi'])
  })

  it('a Link value naming a page gone since comes back nowhere', async () => {
    const c = await createProperty(root, {
      label: 'Related',
      type: 'link',
    })
    if (!c.ok) throw new Error('seed failed')
    await assignProperty(root, notes, c.value.id)
    const target = await createTestPage(notes, 'Target', { body: 'b' })
    const live = await createTestPage(notes, 'Live', { body: 'b' })
    const dead = await createTestPage(notes, 'Dead', { body: 'b' })
    if (!target.ok || !live.ok || !dead.ok) throw new Error('pages failed')
    const def = await liveDef(c.value.id)
    await rewriteRootAt(
      live.value.path,
      rewriteRoot((raw) => landValue(raw, def.key, '[[Target]]')),
    )
    await rewriteRootAt(
      dead.value.path,
      rewriteRoot((raw) => landValue(raw, def.key, '[[Gone]]')),
    )
    expect((await deleteProperty(root, c.value.id)).ok).toBe(true)
    const r = await handleMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    expect(r).toEqual({ ok: true, value: {} })
    expect(await valueOn(live.value.path, 'Related')).toBe('[[Target]]')
    expect(await valueOn(dead.value.path, 'Related')).toBeUndefined()
  })

  it('a value whose page shares its id with a copy goes back to neither, and is named', async () => {
    const id = await seedPriority()
    const page = await createTestPage(notes, 'A', { body: 'b' })
    if (!page.ok) throw new Error('page failed')
    const key = (await liveDef(id)).key
    await rewriteRootAt(
      page.value.path,
      rewriteRoot((raw) => landValue(raw, key, ['hi'])),
    )
    expect((await deleteProperty(root, id)).ok).toBe(true)
    const copy = join(notes, 'A copy.md')
    await writeFile(copy, await readFile(page.value.path, 'utf8'))
    await refreshTree(root)
    const r = await handleMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    expect(r).toEqual({ ok: true, value: { unrestored: ['A copy'] } })
    for (const file of [page.value.path, copy])
      expect(await valueOn(file, 'Priority')).toBeUndefined()
  })

  it('a value comes back on an archived page, written where the Archive holds it', async () => {
    const id = await seedPriority()
    const old = await archivedPage('Priority: hi\n')
    expect((await deleteProperty(root, id)).ok).toBe(true)
    expect(await valueOn(old, 'Priority')).toBeUndefined()
    const r = await handleMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    expect(r).toEqual({ ok: true, value: {} })
    expect(await valueOn(old, 'Priority')).toBe('hi')
  })

  it('a Link value naming an archived page comes back', async () => {
    const c = await createProperty(root, {
      label: 'Related',
      type: 'link',
    })
    if (!c.ok) throw new Error('seed failed')
    await assignProperty(root, notes, c.value.id)
    await archivedPage('')
    const live = await createTestPage(notes, 'Live', { body: 'b' })
    if (!live.ok) throw new Error('page failed')
    const key = (await liveDef(c.value.id)).key
    await rewriteRootAt(
      live.value.path,
      rewriteRoot((raw) => landValue(raw, key, '[[Old]]')),
    )
    expect((await deleteProperty(root, c.value.id)).ok).toBe(true)
    const r = await handleMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    expect(r).toEqual({ ok: true, value: {} })
    expect(await valueOn(live.value.path, 'Related')).toBe('[[Old]]')
  })

  it('a stashed Link value naming no page stays out when the property is assigned again', async () => {
    const c = await createProperty(root, {
      label: 'Related',
      type: 'link',
    })
    if (!c.ok) throw new Error('seed failed')
    await assignProperty(root, tasks, c.value.id)
    const target = await createTestPage(tasks, 'Target', { body: 'b' })
    const live = await createTestPage(tasks, 'Live', { body: 'b' })
    const dead = await createTestPage(tasks, 'Dead', { body: 'b' })
    if (!target.ok || !live.ok || !dead.ok) throw new Error('pages failed')
    const def = await liveDef(c.value.id)
    await rewriteRootAt(
      live.value.path,
      rewriteRoot((raw) => landValue(raw, def.key, '[[Target]]')),
    )
    await rewriteRootAt(
      dead.value.path,
      rewriteRoot((raw) => landValue(raw, def.key, '[[Gone]]')),
    )
    expect((await unassignProperty(root, tasks, c.value.id)).ok).toBe(true)
    expect((await assignProperty(root, tasks, c.value.id)).ok).toBe(true)
    expect(await valueOn(live.value.path, 'Related')).toBe('[[Target]]')
    expect(await valueOn(dead.value.path, 'Related')).toBeUndefined()
  })

  it('a Multi-Select value comes back keeping the words no option names', async () => {
    const c = await createProperty(root, {
      label: 'Tags',
      type: 'multiSelect',
      select_options: [{ id: 'opt_alpha', key: 'alpha', label: 'alpha' }],
    })
    if (!c.ok) throw new Error('seed failed')
    await assignProperty(root, notes, c.value.id)
    const page = await createTestPage(notes, 'T', { body: 'b' })
    if (!page.ok) throw new Error('page failed')
    const key = (await liveDef(c.value.id)).key
    await rewriteRootAt(
      page.value.path,
      rewriteRoot((raw) => landValue(raw, key, ['alpha', 'zeta'])),
    )
    expect((await deleteProperty(root, c.value.id)).ok).toBe(true)
    const r = await handleMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
    expect(r.ok).toBe(true)
    expect(await valueOn(page.value.path, 'Tags')).toEqual(['alpha', 'zeta'])
    expect((await liveDef(c.value.id)).select_options?.map((o) => o.label)).toEqual(['alpha'])
  })
})
