import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PropertyDefinition } from '@shared/properties'
import type { NexusTree } from '@shared/types'
import * as atomicWrite from '../IO/atomicWrite'
import { handleMutate, type MutateDeps } from '../mutate'
import { contextsDir, contextsRegistryFile } from '../paths'
import { splitFrontmatter } from '../readNexus'
import { closeSession, openSession } from '../session'
import { refreshTree } from '../liveTree'
import { readRegistry } from '../IO/propertiesRegistry'
import { assignProperty } from './assignment'
import { contextDriftPresent } from './contextWrite'
import { createFolderEntity } from './folderEntity'
import { createPage } from './page'
import { createProperty } from './registryProperty'

vi.mock('../IO/atomicWrite', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../IO/atomicWrite')>()
  return { ...mod, readJsonStrict: vi.fn(mod.readJsonStrict) }
})
const sidecarReads = vi.mocked(atomicWrite.readJsonStrict)
const spaceReads = () =>
  sidecarReads.mock.calls.filter(([p]) => String(p).endsWith('_space.json')).length

const deps: MutateDeps = { trashMode: 'nexus', trashToSystem: async () => {} }
let root: string
let notes: string
let statusId: string
let priorityId: string

const fm = async (abs: string) => splitFrontmatter(await readFile(abs, 'utf8'))
const rel = (abs: string) => abs.slice(root.length + 1)

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-gworld-'))
  await mkdir(join(root, '.nexus'), { recursive: true })
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
  const col = await createFolderEntity(root, 'collection', 'Notes')
  if (!col.ok) throw new Error('setup')
  notes = col.value.path
  const status = await createProperty(root, {
    id: '',
    name: 'Status',
    type: 'select',
    select_options: [{ value: 'Open', label: 'Open' }],
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
  sidecarReads.mockClear()
})
afterEach(async () => {
  closeSession()
  await rm(root, { recursive: true, force: true })
})

const tree = (): NexusTree =>
  ({
    contexts: [
      {
        def: { id: 'ctx_areas', title: 'Areas' },
        spaces: [
          { kind: 'space', id: 'sp-work', title: 'Work', path: 'x', contextId: 'ctx_areas' },
        ],
      },
    ],
  }) as unknown as NexusTree

describe('contextDriftPresent', () => {
  it('is false only when every registered Context key holds exact Space titles', () => {
    expect(contextDriftPresent({ '<Areas>': ['Work'] }, tree())).toBe(false)
    expect(contextDriftPresent({ '<Areas>': ['work'] }, tree())).toBe(true)
    expect(contextDriftPresent({ '<Areas>': [] }, tree())).toBe(true)
    expect(contextDriftPresent({ '<Notes>': ['x'] }, tree())).toBe(false)
    expect(contextDriftPresent({ '<Areas>': ['Work'] }, null)).toBe(true)
    expect(contextDriftPresent({ '<Areas>': 'Work' }, tree())).toBe(true)
  })
})

describe('a property write reconciles the whole file', () => {
  it('setting Priority on a page holding a scalar Status rewrites Status to a list', async () => {
    const page = await createPage(notes, 'A', { body: 'b' })
    if (!page.ok) throw new Error('setup')
    await writeFile(
      page.value.path,
      `---\nPageID: 01ARZ3NDEKTSV4RRFFQ69G5FAV\nStatus: Open\n---\nb\n`,
    )
    const r = await handleMutate(
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

  it('a clean page pays no Space read; a drifted one loads the strict world and repairs', async () => {
    const clean = await createPage(notes, 'Clean', { body: 'b' })
    const drifted = await createPage(notes, 'Drifted', { body: 'b' })
    if (!clean.ok || !drifted.ok) throw new Error('setup')
    await writeFile(
      clean.value.path,
      `---\nPageID: 01ARZ3NDEKTSV4RRFFQ69G5FAA\n<Areas>:\n  - Work\n---\nb\n`,
    )
    await writeFile(
      drifted.value.path,
      `---\nPageID: 01ARZ3NDEKTSV4RRFFQ69G5FAB\n<Areas>:\n  - work\n---\nb\n`,
    )
    const set = (path: string) =>
      handleMutate(
        {
          op: 'setProperty',
          path: rel(path),
          propertyId: priorityId,
          value: { kind: 'number', value: 1 },
        },
        deps,
      )
    await refreshTree(root)
    sidecarReads.mockClear()
    expect((await set(clean.value.path)).ok).toBe(true)
    expect(spaceReads()).toBe(0)
    expect((await fm(clean.value.path))['<Areas>']).toEqual(['Work'])

    expect((await set(drifted.value.path)).ok).toBe(true)
    expect(spaceReads()).toBeGreaterThan(0)
    expect((await fm(drifted.value.path))['<Areas>']).toEqual(['Work'])
  })

  it('a corrupt Space sidecar skips the context arm on a property write and refuses a context write', async () => {
    const page = await createPage(notes, 'B', { body: 'b' })
    if (!page.ok) throw new Error('setup')
    await writeFile(
      page.value.path,
      `---\nPageID: 01ARZ3NDEKTSV4RRFFQ69G5FAC\n<Areas>:\n  - work\n---\nb\n`,
    )
    await writeFile(join(contextsDir(root), 'Areas', 'Work', '_space.json'), '{corrupt')
    const r = await handleMutate(
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
    const ctx = await handleMutate(
      {
        op: 'setContext',
        path: rel(page.value.path),
        contextId: 'ctx_areas',
        spaceIds: ['sp-work'],
      },
      deps,
    )
    expect(ctx.ok).toBe(false)
  })

  it('a Multi-Select value the page holds is adopted by the write that finds it', async () => {
    const tags = await createProperty(root, {
      id: '',
      name: 'Tags',
      type: 'multi_select',
      select_options: [{ value: 'alpha', label: 'alpha' }],
    } as PropertyDefinition)
    if (!tags.ok) throw new Error('setup')
    await assignProperty(root, notes, tags.value.id)
    const page = await createPage(notes, 'C', { body: 'b' })
    if (!page.ok) throw new Error('setup')
    await writeFile(
      page.value.path,
      `---\nPageID: 01ARZ3NDEKTSV4RRFFQ69G5FAD\nTags:\n  - alpha\n  - zeta\n---\nb\n`,
    )
    await handleMutate(
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
