import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { splitFrontmatter } from '../Files/pageFile'
import { join } from '../Paths/posix'
import { tempRoot } from '../Testing/hostFs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { PropertyDefinition } from './properties'
import { handleMutate } from '../Nexus/mutate'
import { contextsDir, contextsRegistryFile } from '../Paths/paths'

import { closeSession, openSession } from '../Nexus/session'
import { refreshTree, dropLiveTree } from '../Nexus/liveTree'
import { readRegistry } from './propertiesRegistry'
import { assignProperty } from './assignment'
import { newId } from '../Nexus/ids'
import { createFolderEntity } from '../Nexus/folderEntity'
import { createTestPage } from '../Testing/createTestPage'
import { createProperty } from './registryProperty'
import type { TrashDeps } from '../Trash/bundle'

const deps: TrashDeps = { trashMode: 'nexus', trashToSystem: async () => {} }
let root: string
let notes: string
let statusId: string
let priorityId: string

const fm = async (abs: string) => splitFrontmatter(await readFile(abs, 'utf8'))
const rel = (abs: string) => abs.slice(root.length + 1)

beforeEach(async () => {
  root = tempRoot('pom-gworld-')
  await mkdir(join(root, '.nexus'), { recursive: true })
  await mkdir(contextsDir(root), { recursive: true })
  await writeFile(join(root, '.nexus', 'nexus.json'), JSON.stringify({ id: 'nx', createdAt: 'x' }))
  await writeFile(
    contextsRegistryFile(root),
    JSON.stringify({ contexts: [{ id: 'ctx_areas', title: 'Areas' }] }),
  )
  await mkdir(join(contextsDir(root), 'Areas', 'Work'), { recursive: true })
  await writeFile(
    join(contextsDir(root), 'Areas', 'Work', '_space.json'),
    JSON.stringify({ id: 'sp-work' }),
  )
  const col = await createFolderEntity(root, 'collection', 'Notes', newId())
  if (!col.ok) throw new Error('setup')
  notes = col.value.path
  const status = await createProperty(root, {
    id: '',
    name: 'Status',
    type: 'select',
    select_options: [{ value: 'Open' }],
  } as PropertyDefinition)
  const priority = await createProperty(root, {
    id: '',
    name: 'Priority',
    type: 'number',
  } as PropertyDefinition)
  if (!status.ok || !priority.ok) throw new Error('setup')
  statusId = status.value.id
  priorityId = priority.value.id
  await assignProperty(root, notes, statusId)
  await assignProperty(root, notes, priorityId)
  await openSession(root)
})
afterEach(async () => {
  dropLiveTree()
  closeSession()
  await rm(root, { recursive: true, force: true })
})

describe('a property write reconciles the whole file', () => {
  it('setting Priority on a page holding a scalar Status rewrites Status to a list', async () => {
    const page = await createTestPage(notes, 'A', { body: 'b' })
    if (!page.ok) throw new Error('setup')
    await writeFile(page.value.path, `---\nID: 01ARZ3NDEKPSV4RRFFQ69G5FAV\nStatus: Open\n---\nb\n`)
    const r = await handleMutate(
      root,
      {
        op: 'setProperty',
        path: rel(page.value.path),
        propertyId: priorityId,
        value: { kind: 'number', value: 3 },
      },
      deps,
    )
    expect(r.ok).toBe(true)
    const out = await fm(page.value.path)
    expect(out.Priority).toBe(3)
    expect(out.Status).toEqual(['Open'])
  })

  it('a Space the tree doesn’t hold leaves a property write’s tags naming it as written', async () => {
    const page = await createTestPage(notes, 'B', { body: 'b' })
    if (!page.ok) throw new Error('setup')
    await writeFile(
      page.value.path,
      `---\nID: 01ARZ3NDEKPSV4RRFFQ69G5FAC\n<Areas>:\n  - work\n---\nb\n`,
    )
    await writeFile(join(contextsDir(root), 'Areas', 'Work', '_space.json'), '{corrupt')
    await refreshTree(root)
    const r = await handleMutate(
      root,
      {
        op: 'setProperty',
        path: rel(page.value.path),
        propertyId: priorityId,
        value: { kind: 'number', value: 2 },
      },
      deps,
    )
    expect(r.ok).toBe(true)
    const out = await fm(page.value.path)
    expect(out.Priority).toBe(2)
    expect(out['<Areas>']).toEqual(['work'])
  })

  it('a Context write that targets a Space the tree doesn’t hold answers not-found', async () => {
    const sidecar = join(contextsDir(root), 'Areas', 'Work', '_space.json')
    await writeFile(sidecar, '{corrupt')
    await refreshTree(root)
    const r = await handleMutate(
      root,
      { op: 'setSpaceColor', spaceId: 'sp-work', color: 'cyan' },
      deps,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe('not-found')
    expect(await readFile(sidecar, 'utf8')).toBe('{corrupt')
  })

  it('a Multi-Select value the page holds is adopted by the write that finds it', async () => {
    const tags = await createProperty(root, {
      id: '',
      name: 'Tags',
      type: 'multiSelect',
      select_options: [{ value: 'alpha' }],
    } as PropertyDefinition)
    if (!tags.ok) throw new Error('setup')
    await assignProperty(root, notes, tags.value.id)
    const page = await createTestPage(notes, 'C', { body: 'b' })
    if (!page.ok) throw new Error('setup')
    await writeFile(
      page.value.path,
      `---\nID: 01ARZ3NDEKPSV4RRFFQ69G5FAD\nTags:\n  - alpha\n  - zeta\n---\nb\n`,
    )
    await handleMutate(
      root,
      {
        op: 'setProperty',
        path: rel(page.value.path),
        propertyId: priorityId,
        value: { kind: 'number', value: 1 },
      },
      deps,
    )
    expect(
      (await readRegistry(root)).defs[tags.value.id].select_options?.map((o) => o.value),
    ).toEqual(['alpha', 'zeta'])
  })
})
