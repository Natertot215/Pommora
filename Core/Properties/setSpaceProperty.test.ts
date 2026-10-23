import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rm, readFile, stat, mkdir, utimes, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { tempRoot, readJsonAt } from '../Testing/hostFs'
import { contextsDir, contextsRegistryFile, nexusDir } from '../Paths/paths'
import { createContextGroup, createSpace } from '../Contexts/contextWrite'
import { newId } from '../Nexus/ids'
import { createProperty } from './registryProperty'
import { readRegistry } from './propertiesRegistry'
import { setSpacePropertyOp } from './setProperty'
import type { MutateContext } from '../Nexus/mutate'
import type { TrashDeps } from '../Trash/discard'
import type { PropertyDraft } from './properties'
import type { PropertyValue } from './propertyValue'
import { closeSession, openSession } from '../Nexus/session'
import { dropLiveTree, refreshTree } from '../Nexus/liveTree'
import { settledMutate } from '../Testing/settledMutate'
import { deleteOption } from './optionOps'

let root: string
let spaceRel: string
let statusId: string

const deps: TrashDeps = { trashMode: 'system', trashToSystem: async () => {} }
const ctx = (): MutateContext => ({ root, deps })

const def = (over: Partial<PropertyDraft> & { label: string; type: PropertyDraft['type'] }) =>
  ({ id: '', ...over }) as PropertyDraft

beforeEach(async () => {
  root = tempRoot('pom-spaceprop-')
  await mkdir(contextsDir(root), { recursive: true })
  await mkdir(nexusDir(root), { recursive: true })
  await writeFile(contextsRegistryFile(root), JSON.stringify({ contexts: [] }))
  const groupId = newId()
  const group = await createContextGroup(root, 'Projects', groupId)
  if (!group.ok) throw new Error('setup failed')
  const space = await createSpace(root, groupId, 'Pommora', newId())
  if (!space.ok) throw new Error('setup failed')
  spaceRel = space.value.path
  const made = await createProperty(
    root,
    def({
      label: 'Status',
      type: 'select',
      select_options: [
        { id: 'opt_Option%201', key: 'Option 1', label: 'Option 1' },
        { id: 'opt_Option%202', key: 'Option 2', label: 'Option 2' },
        { id: 'opt_Doing', key: 'Doing', label: 'Doing' },
        { id: 'opt_Shipped', key: 'Shipped', label: 'Shipped' },
      ],
    }),
  )
  if (!made.ok) throw new Error('setup failed')
  statusId = made.value.id
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

const sidecarFile = (): string => join(root, spaceRel, '_space.json')
const sidecar = async (): Promise<Record<string, unknown>> => await readJsonAt(sidecarFile())

const write = (value: PropertyValue | null) =>
  setSpacePropertyOp(ctx(), { op: 'setProperty', path: spaceRel, propertyId: statusId, value })

describe('setProperty on a Space path', () => {
  it('lands a bare root key and moves nothing else', async () => {
    const before = await sidecar()
    const r = await write({ kind: 'select', value: 'opt_Doing' })
    expect(r.ok).toBe(true)
    const after = await sidecar()
    expect(after.Status).toEqual(['Doing'])
    delete after.Status
    expect(after).toEqual(before)
  })

  it('deletes the key on null and on a blank value', async () => {
    expect((await write({ kind: 'select', value: 'opt_Doing' })).ok).toBe(true)
    expect((await write(null)).ok).toBe(true)
    expect('Status' in (await sidecar())).toBe(false)
    expect((await write({ kind: 'select', value: 'opt_Doing' })).ok).toBe(true)
    expect((await write({ kind: 'multiSelect', value: [] })).ok).toBe(true)
    expect('Status' in (await sidecar())).toBe(false)
  })

  it('leaves the file untouched when clearing a key it never held', async () => {
    const bytes = await readFile(sidecarFile(), 'utf8')
    const before = (await stat(sidecarFile())).mtimeMs
    const r = await write(null)
    expect(r.ok).toBe(true)
    expect(await readFile(sidecarFile(), 'utf8')).toBe(bytes)
    expect((await stat(sidecarFile())).mtimeMs).toBe(before)
  })

  it('re-picking the value a Space holds leaves the file, and its modification time, alone', async () => {
    expect((await write({ kind: 'select', value: 'opt_Doing' })).ok).toBe(true)
    const past = new Date('2020-06-01T12:00:00Z')
    await utimes(sidecarFile(), past, past)
    const bytes = await readFile(sidecarFile(), 'utf8')
    const before = Math.floor((await stat(sidecarFile())).mtimeMs / 1000)
    expect((await write({ kind: 'select', value: 'opt_Doing' })).ok).toBe(true)
    expect(await readFile(sidecarFile(), 'utf8')).toBe(bytes)
    expect(Math.floor((await stat(sidecarFile())).mtimeMs / 1000)).toBe(before)
  })

  it('writes a property no Collection assigns', async () => {
    expect(Object.keys((await readRegistry(root)).defs)).toContain(statusId)
    const r = await write({ kind: 'select', value: 'opt_Shipped' })
    expect(r.ok).toBe(true)
    expect((await sidecar()).Status).toEqual(['Shipped'])
  })
})

describe('a value write reconciles the Space it lands on', () => {
  const settled: TrashDeps = { trashMode: 'nexus', trashToSystem: async () => {} }
  let priorityId: string
  let tagsId: string

  beforeEach(async () => {
    await writeFile(
      join(nexusDir(root), 'nexus.json'),
      JSON.stringify({ id: 'nx', createdAt: 'x' }),
    )
    const priority = await createProperty(root, def({ label: 'Priority', type: 'number' }))
    const tags = await createProperty(
      root,
      def({
        label: 'Tags',
        type: 'multiSelect',
        select_options: [
          { id: 'opt_alpha', key: 'alpha', label: 'alpha' },
          { id: 'opt_beta', key: 'beta', label: 'beta' },
        ],
      }),
    )
    if (!priority.ok || !tags.ok) throw new Error('setup failed')
    priorityId = priority.value.id
    tagsId = tags.value.id
    await openSession(root)
  })
  afterEach(() => {
    dropLiveTree()
    closeSession()
  })

  const seed = async (values: Record<string, unknown>): Promise<void> => {
    await writeFile(sidecarFile(), JSON.stringify({ ...(await sidecar()), ...values }))
    await refreshTree(root)
  }
  const set = (propertyId: string, value: PropertyValue | null) =>
    settledMutate(root, { op: 'setProperty', path: spaceRel, propertyId, value }, settled)

  it('writes a scalar Select back as a list', async () => {
    await seed({ Status: 'Option 1' })
    expect((await set(priorityId, { kind: 'number', value: 3 })).ok).toBe(true)
    expect(await sidecar()).toMatchObject({ Priority: 3, Status: ['Option 1'] })
  })

  it('clearing a key the Space never held still tidies its other values', async () => {
    await seed({ Status: 'Option 1' })
    expect((await set(priorityId, null)).ok).toBe(true)
    expect((await sidecar()).Status).toEqual(['Option 1'])
  })

  it('leaves a value it can’t place as written', async () => {
    await seed({ Status: { not: 'a select' } })
    expect((await set(priorityId, { kind: 'number', value: 3 })).ok).toBe(true)
    expect(await sidecar()).toMatchObject({ Priority: 3, Status: { not: 'a select' } })
  })

  it('clearing a Multi-Select registers none of the old value’s options', async () => {
    await seed({ Tags: ['alpha', 'zeta'] })
    expect((await set(tagsId, null)).ok).toBe(true)
    expect('Tags' in (await sidecar())).toBe(false)
    const options = (await readRegistry(root)).defs[tagsId].select_options?.map((o) => o.label)
    expect(options).toEqual(['alpha', 'beta'])
  })

  it('a restored Space loses an option deleted while it sat in the Trash', async () => {
    await seed({ Tags: ['alpha', 'beta'] })
    const deleted = await settledMutate(
      root,
      { op: 'delete', path: spaceRel, kind: 'space' },
      settled,
    )
    if (!deleted.ok || !deleted.value.bundled) throw new Error('delete failed')
    expect((await deleteOption(root, tagsId, 'beta')).ok).toBe(true)
    const { bundlePath } = deleted.value.bundled
    expect((await settledMutate(root, { op: 'restore', bundlePath }, settled)).ok).toBe(true)
    expect((await sidecar()).Tags).toEqual(['alpha'])
  })

  it('writes the exact key, leaving another casing of it as written', async () => {
    await seed({ status: 'Option 1' })
    expect((await set(statusId, { kind: 'select', value: 'opt_Option%202' })).ok).toBe(true)
    const after = await sidecar()
    expect(after.status).toBe('Option 1')
    expect(after.Status).toEqual(['Option 2'])
  })

  it('lands a number 0', async () => {
    expect((await set(priorityId, { kind: 'number', value: 0 })).ok).toBe(true)
    expect((await sidecar()).Priority).toBe(0)
  })
})
