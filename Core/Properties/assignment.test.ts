import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { tempRoot } from '../Testing/hostFs'
import { assignProperty, reorderAssignment, collectionFolders } from './assignment'
import { dropLiveTree } from '../Nexus/liveTree'
import { createFolderEntity } from '../Nexus/folderEntity'
import { newId } from '../Nexus/ids'
import { createTestPage } from '../Testing/createTestPage'
import { sidecarPath } from '../Paths/paths'
import { readJsonObject } from '../Files/atomicWrite'
import type { PropertyDefinition } from './properties'
import { splitFrontmatter } from '../Files/pageFile'
import { createProperty } from './registryProperty'
import { removeProperty } from './removeProperty'
import { refreshTree } from '../Nexus/liveTree'

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

it('collectionFolders lists every collection folder from the live tree', async () => {
  const t = await createFolderEntity(root, 'collection', 'Tasks', newId())
  if (!t.ok) throw new Error('setup failed')
  expect((await collectionFolders(root)).sort()).toEqual([notes, t.value.path].sort())
})

it('a Remove racing an Assign on ONE collection never loses either write (breaker H-2)', async () => {
  const { createProperty } = await import('./registryProperty')
  const { removeProperty } = await import('./removeProperty')
  const { updatePageProperty } = await import('../Nexus/page')
  const { readFile } = await import('node:fs/promises')
  const { splitFrontmatter } = await import('../Files/pageFile')
  const mk = async (name: string): Promise<string> => {
    const r = await createProperty(root, { id: '', name, type: 'number' } as never)
    if (!r.ok) throw new Error('setup failed')
    return r.value.id
  }
  const pC = await mk('Gone')
  const pB = await mk('Incoming')
  await assignProperty(root, notes, pC)
  const page = await createTestPage(notes, 'A', { body: 'b' })
  if (!page.ok) throw new Error('setup failed')
  await updatePageProperty(
    page.value.path,
    { id: pC, name: 'Gone', type: 'number' } as PropertyDefinition,
    { kind: 'number', value: 7 },
  )

  // Interleave 20 rounds — under the serialized chain the end state is always coherent: pC unassigned WITH its cache block intact, pB assigned.
  for (let round = 0; round < 20; round++) {
    await Promise.all([removeProperty(root, notes, pC), assignProperty(root, notes, pB)])
    const sc = (await readJsonObject(sidecarPath(notes, 'collection'))) as Record<string, unknown>
    const assigned = (sc.properties as string[]) ?? []
    const cached = (
      sc.property_cache as Record<string, { values: Record<string, unknown> }> | undefined
    )?.[pC]
    expect(assigned).toContain(pB)
    expect(assigned).not.toContain(pC)
    expect(Object.values(cached?.values ?? {})).toEqual([7])
    const fm = splitFrontmatter(await readFile(page.value.path, 'utf8'))
    expect(fm.Gone).toBeUndefined()
    await assignProperty(root, notes, pC)
    await removeProperty(root, notes, pB)
  }
})

describe('a re-assign puts a cached value back', () => {
  const status: Omit<PropertyDefinition, 'id'> = {
    name: 'Status',
    type: 'select',
    select_options: [{ value: 'hi', color: 'red' }],
  }
  const reassigned = async (
    held = '\nstatus:',
    property: Omit<PropertyDefinition, 'id'> = status,
    cached = 'Status: hi',
  ): Promise<Record<string, unknown>> => {
    const made = await createProperty(root, { id: '', ...property })
    if (!made.ok) throw new Error('setup failed')
    await assignProperty(root, notes, made.value.id)
    const page = await createTestPage(notes, 'A', { body: 'b' })
    if (!page.ok) throw new Error('setup failed')
    await writeFile(page.value.path, `---\nID: ${page.value.id}\n${cached}\n---\nb`)
    await refreshTree(root)
    expect((await removeProperty(root, notes, made.value.id)).ok).toBe(true)
    await writeFile(page.value.path, `---\nID: ${page.value.id}${held}\n---\nb`)
    expect((await assignProperty(root, notes, made.value.id)).ok).toBe(true)
    return splitFrontmatter(await readFile(page.value.path, 'utf8'))
  }

  it('fills the registered key on a root holding none', async () => {
    expect((await reassigned('')).Status).toEqual(['hi'])
  })

  it('fills a blank key spelled in another case where it sits', async () => {
    const fm = await reassigned()
    expect(fm.status).toEqual(['hi'])
    expect(fm).not.toHaveProperty('Status')
  })

  const tags: Omit<PropertyDefinition, 'id'> = {
    name: 'Tags',
    type: 'multiSelect',
    select_options: [{ value: 'Claude', color: 'red' }],
  }

  it('keeps a cached Multi-Select member’s spelling', async () => {
    expect((await reassigned('', tags, 'Tags: [claude]')).Tags).toEqual(['claude'])
  })

  it('collapses blank spellings of a list under the registered key', async () => {
    expect(await reassigned('\ntags:\nTAGS:', tags, 'Tags: [claude]')).toEqual({
      ID: expect.any(String),
      Tags: ['claude'],
    })
  })

  it('leaves a list whose second spelling holds a value untouched', async () => {
    const fm = await reassigned('\ntags:\nTAGS: [Claude]', tags, 'Tags: [claude]')
    expect(fm.TAGS).toEqual(['Claude'])
    expect(fm).not.toHaveProperty('Tags')
  })
})
