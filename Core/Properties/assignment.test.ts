import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { StashBlock } from './propertyStash'
import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from '../Paths/posix'
import { noModeBits, putJson, tempRoot } from '../Testing/hostFs'
import { addProperty, assignProperty, reorderAssignment } from './assignment'
import { dropLiveTree } from '../Nexus/liveTree'
import { createFolderEntity } from '../Nexus/folderEntity'
import { newContentId, newId } from '../Nexus/ids'
import { createTestPage } from '../Testing/createTestPage'
import { nexusDir, sidecarPath } from '../Paths/paths'
import { readJsonObject } from '../Files/atomicWrite'
import type { PropertyDefinition } from './properties'
import { splitFrontmatter } from '../Files/pageFile'
import { createProperty } from './registryProperty'
import { unassignProperty } from './unassignProperty'
import { rewriteRoot, rewriteRootAt } from '../Nexus/governedRoot'
import { landValue } from '../Files/rootValues'
import { refreshTree } from '../Nexus/liveTree'
import { machine } from '../Platform/machine'
import { ok } from '../Contract/result'
import { readRegistry } from './propertiesRegistry'
import { handleMutate } from '../Nexus/mutate'
import { readNotes } from '../Nexus/owed'
import { finishOwed } from '../Nexus/finishOwed'
import { closeSession, openSession } from '../Nexus/session'
import { OWED_REL } from '../Paths/nexusPaths'
import { patchSidecar } from '../Files/sidecar'
import type { TrashDeps } from '../Trash/discard'

let root: string
let notes: string
beforeEach(async () => {
  root = tempRoot('pom-assign-')
  const c = await createFolderEntity(root, 'collection', 'Notes', newId())
  if (!c.ok) throw new Error('setup failed')
  notes = c.value.path
})
afterEach(async () => {
  dropLiveTree()
  await rm(root, { recursive: true, force: true })
})

const ids = async (folder: string): Promise<string[]> =>
  ((await readJsonObject(sidecarPath(folder, 'collection')))?.properties as string[]) ?? []

it('assign appends + is idempotent', async () => {
  await assignProperty(root, notes, 'prop_x')
  await assignProperty(root, notes, 'prop_x')
  expect(await ids(notes)).toEqual(['prop_x'])
})

const held = async (...labels: string[]): Promise<string[]> => {
  const made: string[] = []
  for (const label of labels) {
    const r = await createProperty(root, { label, type: 'number' })
    if (!r.ok) throw new Error('setup failed')
    made.push(r.value.id)
  }
  return made
}

it('reorder moves within the assignment array', async () => {
  const [a, b, c] = await held('A', 'B', 'C')
  for (const id of [a, b, c]) await assignProperty(root, notes, id)
  await reorderAssignment(root, notes, c, 0)
  expect(await ids(notes)).toEqual([c, a, b])
})

it('reorder places by the ids the registry holds, leaving one it no longer holds where it sits', async () => {
  const [a, b, c] = await held('A', 'B', 'C')
  for (const id of ['prop_gone', a, b, c]) await assignProperty(root, notes, id)
  await reorderAssignment(root, notes, a, 1)
  expect(await ids(notes)).toEqual(['prop_gone', b, a, c])
})

it('a Remove racing an Assign on ONE collection never loses either write', async () => {
  const mk = async (name: string): Promise<string> => {
    const r = await createProperty(root, { label: name, type: 'number' } as never)
    if (!r.ok) throw new Error('setup failed')
    return r.value.id
  }
  const pC = await mk('Gone')
  const pB = await mk('Incoming')
  await assignProperty(root, notes, pC)
  const page = await createTestPage(notes, 'A', { body: 'b' })
  if (!page.ok) throw new Error('setup failed')
  await rewriteRootAt(
    page.value.path,
    rewriteRoot((raw) => landValue(raw, 'Gone', 7)),
  )

  // Interleave 20 rounds — under the serialized chain the end state is always coherent: pC unassigned WITH its stash block intact, pB assigned.
  for (let round = 0; round < 20; round++) {
    await Promise.all([unassignProperty(root, notes, pC), assignProperty(root, notes, pB)])
    const sc = (await readJsonObject(sidecarPath(notes, 'collection'))) as Record<string, unknown>
    const assigned = (sc.properties as string[]) ?? []
    const stashed = (sc.property_stash as Record<string, StashBlock> | undefined)?.[pC]
    expect(assigned).toContain(pB)
    expect(assigned).not.toContain(pC)
    expect(Object.values(stashed?.values ?? {})).toEqual([7])
    const fm = splitFrontmatter(await readFile(page.value.path, 'utf8'))
    expect(fm.Gone).toBeUndefined()
    await assignProperty(root, notes, pC)
    await unassignProperty(root, notes, pB)
  }
})

describe('a re-assign puts a stashed value back', () => {
  const status: Omit<PropertyDefinition, 'id'> = {
    label: 'Status',
    key: 'Status',
    type: 'select',
    select_options: [{ id: 'opt_hi', key: 'hi', label: 'hi', color: 'red' }],
  }
  const reassigned = async (
    held = '\nstatus:',
    property: Omit<PropertyDefinition, 'id'> = status,
    stashed = 'Status: hi',
  ): Promise<Record<string, unknown>> => {
    const made = await createProperty(root, { ...property })
    if (!made.ok) throw new Error('setup failed')
    await assignProperty(root, notes, made.value.id)
    const page = await createTestPage(notes, 'A', { body: 'b' })
    if (!page.ok) throw new Error('setup failed')
    await writeFile(page.value.path, `---\nID: ${page.value.id}\n${stashed}\n---\nb`)
    await refreshTree(root)
    expect((await unassignProperty(root, notes, made.value.id)).ok).toBe(true)
    await writeFile(page.value.path, `---\nID: ${page.value.id}${held}\n---\nb`)
    expect((await assignProperty(root, notes, made.value.id)).ok).toBe(true)
    return splitFrontmatter(await readFile(page.value.path, 'utf8'))
  }

  it('fills the registered key on a root holding none', async () => {
    expect((await reassigned('')).Status).toBe('hi')
  })

  it('fills the exact key beside a blank key in another casing, which stays', async () => {
    const fm = await reassigned()
    expect(fm.Status).toBe('hi')
    expect(fm.status).toBeNull()
  })

  const tags: Omit<PropertyDefinition, 'id'> = {
    label: 'Tags',
    key: 'Tags',
    type: 'multiSelect',
    select_options: [{ id: 'opt_Claude', key: 'Claude', label: 'Claude', color: 'red' }],
  }

  it('a stashed member naming no option exactly comes back as written', async () => {
    expect((await reassigned('', tags, 'Tags: [claude]')).Tags).toEqual(['claude'])
  })

  it('a stashed Status word naming no option comes back as written', async () => {
    const stage: Omit<PropertyDefinition, 'id'> = {
      label: 'Stage',
      key: 'Stage',
      type: 'status',
      select_options: [{ id: 'opt_done', key: 'Done', label: 'Done', color: 'red' }],
    }
    expect((await reassigned('', stage, 'Stage: Draft')).Stage).toBe('Draft')
  })

  it('leaves a root whose key holds only words no option names as it is', async () => {
    expect((await reassigned('\nTags: [ideas]', tags, 'Tags: [Claude]')).Tags).toEqual(['ideas'])
  })

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

  it('refills an archived member of the Collection where the Archive holds it', async () => {
    const made = await createProperty(root, { ...status })
    if (!made.ok) throw new Error('setup failed')
    await assignProperty(root, notes, made.value.id)
    const old = await archivedPage('Status: hi\n')
    await refreshTree(root)
    expect((await unassignProperty(root, notes, made.value.id)).ok).toBe(true)
    expect(splitFrontmatter(await readFile(old, 'utf8')).Status).toBeUndefined()
    expect((await assignProperty(root, notes, made.value.id)).ok).toBe(true)
    expect(splitFrontmatter(await readFile(old, 'utf8')).Status).toBe('hi')
  })

  it('keeps a stashed Link value naming an archived page', async () => {
    await archivedPage('')
    const fm = await reassigned(
      '',
      { label: 'Related', key: 'Related', type: 'link' },
      'Related: "[[Old]]"',
    )
    expect(fm.Related).toBe('[[Old]]')
  })
})

describe('a re-assign that can’t refill a page', () => {
  let propertyId: string
  let page: string
  let collectionId: string
  const deps: TrashDeps = { trashMode: 'nexus', trashToSystem: async () => {} }
  const priority = async (): Promise<unknown> =>
    splitFrontmatter(await readFile(page, 'utf8')).Priority
  const stash = async (): Promise<unknown> =>
    (await readJsonObject(sidecarPath(notes, 'collection')))?.property_stash

  // The session holds the tree, so a page that can't be written still reads as the Collection's.
  beforeEach(async () => {
    await openSession(root)
    const c = await createProperty(root, { label: 'Priority', type: 'number' } as never)
    const p = await createTestPage(notes, 'A', { body: 'b' })
    if (!c.ok || !p.ok) throw new Error('setup failed')
    propertyId = c.value.id
    page = p.value.path
    collectionId = (await readJsonObject(sidecarPath(notes, 'collection')))?.id as string
    await assignProperty(root, notes, propertyId)
    await rewriteRootAt(
      page,
      rewriteRoot((raw) => landValue(raw, 'Priority', 7)),
    )
    await refreshTree(root)
    await unassignProperty(root, notes, propertyId)
  })
  afterEach(() => closeSession())

  it.skipIf(noModeBits)(
    'answers Couldn’t update 1 Item with Try Again, and Try Again refills it',
    async () => {
      await chmod(page, 0o000)
      const r = await handleMutate(
        root,
        { op: 'assignProperty', containerPath: 'Notes', propertyId },
        deps,
      ).finally(() => chmod(page, 0o644))
      expect(r).toEqual(
        ok({
          cascade: { pages: [], hosts: [], warning: 'Couldn’t update 1 Item.', owed: true },
        }),
      )
      expect((await readNotes(root))[propertyId]).toMatchObject({ collections: [collectionId] })
      expect((await handleMutate(root, { op: 'finishOwed' }, deps)).ok).toBe(true)
      expect(await priority()).toBe(7)
      expect(await stash()).toBeUndefined()
      expect(await readNotes(root)).toEqual({})
    },
  )

  it.skipIf(noModeBits)(
    'keeps the value of a page unreadable at the re-add, and Try Again refills it once it reads',
    async () => {
      await chmod(page, 0o000)
      const r = await refreshTree(root)
        .then(() =>
          handleMutate(root, { op: 'assignProperty', containerPath: 'Notes', propertyId }, deps),
        )
        .finally(() => chmod(page, 0o644))
      expect(r).toEqual(
        ok({
          cascade: { pages: [], hosts: [], warning: 'Couldn’t update 1 Item.', owed: true },
        }),
      )
      const kept = ((await stash()) as Record<string, StashBlock>)[propertyId]
      expect(Object.values(kept.values)).toEqual([7])
      expect((await readNotes(root))[propertyId]).toMatchObject({ collections: [collectionId] })
      await refreshTree(root)
      expect((await handleMutate(root, { op: 'finishOwed' }, deps)).ok).toBe(true)
      expect(await priority()).toBe(7)
      expect(await stash()).toBeUndefined()
      expect(await readNotes(root)).toEqual({})
    },
  )

  it('drops the value of a page gone from the tree and the Trash', async () => {
    await rm(page)
    await refreshTree(root)
    expect((await assignProperty(root, notes, propertyId)).ok).toBe(true)
    expect(await stash()).toBeUndefined()
    expect(await readNotes(root)).toEqual({})
  })

  it('a crash between the assignment and the refill finishes at the next open', async () => {
    await patchSidecar(notes, 'collection', (cur) => ({
      ...cur,
      properties: [...((cur.properties as string[]) ?? []), propertyId],
    }))
    await putJson(join(root, OWED_REL), {
      [propertyId]: { kind: 'property', collections: [collectionId] },
    })
    await finishOwed(root, deps)
    expect(await priority()).toBe(7)
    expect(await readNotes(root)).toEqual({})
  })

  it.skipIf(noModeBits)(
    'a re-add whose note can’t be written refuses with nothing assigned',
    async () => {
      const file = join(root, OWED_REL)
      await putJson(file, { prop_other: { kind: 'property', rename: ['Elsewhere'] } })
      await chmod(file, 0o000)
      const r = await assignProperty(root, notes, propertyId).finally(() => chmod(file, 0o644))
      expect(r.ok).toBe(false)
      expect(await ids(notes)).not.toContain(propertyId)
      expect(await priority()).toBeUndefined()
    },
  )
})

describe('addProperty', () => {
  const schemaHolds = () => {
    const lock = vi.spyOn(machine(), 'lock')
    return () => lock.mock.calls.filter(([key]) => key === nexusDir(root)).length
  }
  const labels = async (): Promise<string[]> =>
    Object.values((await readRegistry(root)).defs).map((d) => d.label)
  afterEach(() => vi.restoreAllMocks())

  it('a failed assign takes the create back inside the same hold', async () => {
    await writeFile(sidecarPath(notes, 'collection'), '{ not json')
    const holds = schemaHolds()
    const r = await addProperty(root, notes, { label: 'Due', type: 'text' })
    expect(r.ok).toBe(false)
    expect(await labels()).not.toContain('Due')
    expect(holds()).toBe(1)
  })
})
