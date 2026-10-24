import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { StashBlock } from './propertyStash'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from '../Paths/posix'
import { tempRoot } from '../Testing/hostFs'
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
import { rewriteRaw, rewriteRootAt } from '../Nexus/governedRoot'
import { landValue } from '../Files/rootValues'
import { refreshTree } from '../Nexus/liveTree'
import { machine } from '../Platform/machine'
import { ok } from '../Contract/result'
import { readRegistry } from './propertiesRegistry'

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

it('reorder moves within the assignment array', async () => {
  await assignProperty(root, notes, 'prop_a')
  await assignProperty(root, notes, 'prop_b')
  await assignProperty(root, notes, 'prop_c')
  await reorderAssignment(root, notes, 'prop_c', 0)
  expect(await ids(notes)).toEqual(['prop_c', 'prop_a', 'prop_b'])
})

it('a Remove racing an Assign on ONE collection never loses either write', async () => {
  const mk = async (name: string): Promise<string> => {
    const r = await createProperty(root, { id: '', label: name, type: 'number' } as never)
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
    rewriteRaw((raw) => landValue(raw, 'Gone', 7)),
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
    const made = await createProperty(root, { id: '', ...property })
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
    expect((await reassigned('')).Status).toEqual(['hi'])
  })

  it('fills the exact key beside a blank key in another casing, which stays', async () => {
    const fm = await reassigned()
    expect(fm.Status).toEqual(['hi'])
    expect(fm.status).toBeNull()
  })

  const tags: Omit<PropertyDefinition, 'id'> = {
    label: 'Tags',
    key: 'Tags',
    type: 'multiSelect',
    select_options: [{ id: 'opt_Claude', key: 'Claude', label: 'Claude', color: 'red' }],
  }

  it("a stashed member naming no option exactly doesn't come back", async () => {
    expect((await reassigned('', tags, 'Tags: [claude]')).Tags).toBeUndefined()
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
    const made = await createProperty(root, { id: '', ...status })
    if (!made.ok) throw new Error('setup failed')
    await assignProperty(root, notes, made.value.id)
    const old = await archivedPage('Status: hi\n')
    await refreshTree(root)
    expect((await unassignProperty(root, notes, made.value.id)).ok).toBe(true)
    expect(splitFrontmatter(await readFile(old, 'utf8')).Status).toBeUndefined()
    expect((await assignProperty(root, notes, made.value.id)).ok).toBe(true)
    expect(splitFrontmatter(await readFile(old, 'utf8')).Status).toEqual(['hi'])
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

describe('addProperty', () => {
  const schemaHolds = () => {
    const lock = vi.spyOn(machine(), 'lock')
    return () => lock.mock.calls.filter(([key]) => key === nexusDir(root)).length
  }
  const labels = async (): Promise<string[]> =>
    Object.values((await readRegistry(root)).defs).map((d) => d.label)
  afterEach(() => vi.restoreAllMocks())

  it('lands the property created and assigned in one hold of the schema lock', async () => {
    const holds = schemaHolds()
    const r = await addProperty(root, notes, { label: 'Due', type: 'text' })
    expect(holds()).toBe(1)
    expect(await labels()).toContain('Due')
    expect(r).toEqual(ok({ created: { propertyId: (await ids(notes)).at(-1) } }))
  })

  it('a failed assign takes the create back inside the same hold', async () => {
    await writeFile(sidecarPath(notes, 'collection'), '{ not json')
    const holds = schemaHolds()
    const r = await addProperty(root, notes, { label: 'Due', type: 'text' })
    expect(r.ok).toBe(false)
    expect(await labels()).not.toContain('Due')
    expect(holds()).toBe(1)
  })
})
