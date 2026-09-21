import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rm, readFile, stat, mkdir, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { tempRoot } from '../Testing/hostFs'
import { contextsDir, contextsRegistryFile, nexusDir } from '../Paths/paths'
import { createContextGroup, createSpace } from '../Contexts/contextWrite'
import { createProperty } from './registryProperty'
import { readRegistry } from './propertiesRegistry'
import { setPropertyOp } from './setProperty'
import type { MutateContext, MutateDeps } from '../Nexus/mutate'
import type { PropertyDefinition } from './properties'
import type { PropertyValue } from './propertyValue'

let root: string
let spaceRel: string
let statusId: string

const deps: MutateDeps = { trashMode: 'system', trashToSystem: async () => {} }
const ctx = (): MutateContext => ({ root, deps })

const def = (
  over: Partial<PropertyDefinition> & { name: string; type: PropertyDefinition['type'] },
) => ({ id: '', ...over }) as PropertyDefinition

beforeEach(async () => {
  root = tempRoot('pom-spaceprop-')
  await mkdir(contextsDir(root), { recursive: true })
  await mkdir(nexusDir(root), { recursive: true })
  await writeFile(contextsRegistryFile(root), JSON.stringify({ contexts: [] }))
  const group = await createContextGroup(root, 'Projects')
  if (!group.ok) throw new Error('setup failed')
  const space = await createSpace(root, group.value.id, 'Pommora')
  if (!space.ok) throw new Error('setup failed')
  spaceRel = space.value.path
  const made = await createProperty(root, def({ name: 'Status', type: 'select' }))
  if (!made.ok) throw new Error('setup failed')
  statusId = made.value.id
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

const sidecarFile = (): string => join(root, spaceRel, '_space.json')
const sidecar = async (): Promise<Record<string, unknown>> =>
  JSON.parse(await readFile(sidecarFile(), 'utf8'))

const write = (value: PropertyValue | null) =>
  setPropertyOp(ctx(), { op: 'setProperty', path: spaceRel, propertyId: statusId, value })

describe('setProperty on a Space path', () => {
  it('lands a bare root key and moves nothing else', async () => {
    const before = await sidecar()
    const r = await write({ kind: 'select', value: 'Doing' })
    expect(r.ok).toBe(true)
    const after = await sidecar()
    expect(after.Status).toEqual(['Doing'])
    delete after.Status
    expect(after).toEqual(before)
  })

  it('deletes the key on null and on a blank value', async () => {
    expect((await write({ kind: 'select', value: 'Doing' })).ok).toBe(true)
    expect((await write(null)).ok).toBe(true)
    expect('Status' in (await sidecar())).toBe(false)
    expect((await write({ kind: 'select', value: 'Doing' })).ok).toBe(true)
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

  it('writes a property no Collection assigns (A-2)', async () => {
    expect(Object.keys((await readRegistry(root)).defs)).toContain(statusId)
    const r = await write({ kind: 'select', value: 'Shipped' })
    expect(r.ok).toBe(true)
    expect((await sidecar()).Status).toEqual(['Shipped'])
  })
})
