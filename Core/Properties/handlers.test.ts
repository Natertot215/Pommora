import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { relative } from '../Paths/posix'
import { noModeBits, readJsonAt, tempRoot } from '../Testing/hostFs'
import { type ConfigSurfaces, seedConfigSurfaces, viewOn } from '../Testing/configSurfaces'
import type { HostContext } from '../Contract/handlers'
import { fault, ok } from '../Contract/result'
import { sidecarPath } from '../Paths/paths'
import { closeSession, openSession } from '../Nexus/session'
import { dropLiveTree, getLiveTree, refreshTree } from '../Nexus/liveTree'
import { findContainerWhere } from '../Nexus/treePatch'
import { createFolderEntity } from '../Nexus/folderEntity'
import { newId } from '../Nexus/ids'
import { updatePageProperty } from '../Nexus/page'
import { createTestPage } from '../Testing/createTestPage'
import { createProperty } from './registryProperty'
import { assignProperty } from './assignment'
import { mutateRegistry, readRegistry } from './propertiesRegistry'
import { unsweptLine } from './governedSweep'
import { readSchemaJournal, writeSchemaJournal } from './propertyJournal'
import { propertiesHandlers } from './handlers'

vi.mock('./propertiesRegistry', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./propertiesRegistry')>()
  return { ...mod, mutateRegistry: vi.fn(mod.mutateRegistry) }
})

const HOME = { kind: 'space', id: 'sp_home' }

let root: string
let col: string
let propId: string
let surfaces: ConfigSurfaces
let pushes: { channel: string; payload: unknown }[]

const ctx = {
  push: (channel: string, payload: unknown) => {
    pushes.push({ channel, payload })
  },
} as unknown as HostContext

const tilePushes = (): unknown[] =>
  pushes.filter((p) => p.channel === 'tiles:changed').map((p) => p.payload)

const liveViewAt = (abs: string): unknown =>
  findContainerWhere(getLiveTree()!, (c) => c.path === relative(root, abs))?.views?.[0]

beforeEach(async () => {
  pushes = []
  root = tempRoot('pom-prop-handlers-')
  const c = await createFolderEntity(root, 'collection', 'Notes', newId())
  const p = await createProperty(root, {
    id: '',
    name: 'Stage',
    type: 'select',
    select_options: [{ value: 'Done' }, { value: 'Todo' }],
  })
  if (!c.ok || !p.ok) throw new Error('setup failed')
  col = c.value.path
  propId = p.value.id
  await assignProperty(root, col, propId)
  const page = await createTestPage(col, 'A', { body: 'b' })
  if (!page.ok) throw new Error('setup failed')
  await updatePageProperty(page.value.path, (await readRegistry(root)).defs[propId], {
    kind: 'select',
    value: 'Done',
  })
  surfaces = await seedConfigSurfaces(root, col, viewOn(propId, 'Done'))
  await openSession(root)
})

afterEach(async () => {
  closeSession()
  dropLiveTree()
  await rm(root, { recursive: true, force: true })
})

describe('the property channels', () => {
  it('a rename pushes each board it wrote once, and the held tree holds the containers it wrote', async () => {
    const r = await propertiesHandlers['property:renameOption'](ctx, propId, 'Done', 'Closed')
    expect(r).toEqual(ok({ cascade: { pages: [], hosts: [HOME] } }))
    expect(tilePushes()).toEqual([HOME])
    expect(liveViewAt(surfaces.set)).toEqual(viewOn(propId, 'Closed'))
  })

  it.skipIf(noModeBits)(
    'an unassign with a skipped page still lands the Set it cleared in the held tree, then answers the fault',
    async () => {
      const locked = await createFolderEntity(col, 'set', 'Locked', newId())
      if (!locked.ok) throw new Error('setup failed')
      const held = await createTestPage(locked.value.path, 'C', { body: 'b' })
      if (!held.ok) throw new Error('setup failed')
      await updatePageProperty(held.value.path, (await readRegistry(root)).defs[propId], {
        kind: 'select',
        value: 'Done',
      })
      await chmod(locked.value.path, 0o555)
      try {
        const r = await propertiesHandlers['schema:unassign'](ctx, relative(root, col), propId)
        expect(r).toEqual(fault(unsweptLine(1)))
      } finally {
        await chmod(locked.value.path, 0o755)
      }
      expect((liveViewAt(surfaces.set) as { group: unknown }).group).toEqual({ kind: 'structural' })
      expect(tilePushes()).toEqual([HOME])
    },
  )

  it('an option rename held by an unreadable Set sidecar warns with a replay that heals it once the file reads', async () => {
    const setFile = sidecarPath(surfaces.set, 'set')
    const held = await readFile(setFile, 'utf8')
    await rm(setFile)
    await mkdir(setFile)
    const r = await propertiesHandlers['property:renameOption'](ctx, propId, 'Done', 'Closed')
    expect(r.ok && r.value.cascade.warning).toBe(unsweptLine(1))
    expect(r.ok && r.value.replayable).toBe(true)
    expect((liveViewAt(col) as { filter: unknown }).filter).toEqual(viewOn(propId, 'Closed').filter)
    await rm(setFile, { recursive: true })
    await writeFile(setFile, held)
    await refreshTree(root)
    expect(await propertiesHandlers['property:replay'](ctx, propId)).toEqual(ok(null))
    expect((await readJsonAt(setFile)).views).toEqual([viewOn(propId, 'Closed')])
    expect(await readSchemaJournal(root)).toBeNull()
  })

  it('an option removal held by an unreadable Set sidecar keeps the option and offers the replay', async () => {
    const setFile = sidecarPath(surfaces.set, 'set')
    await rm(setFile)
    await mkdir(setFile)
    const r = await propertiesHandlers['property:removeOption'](ctx, propId, 'Done')
    expect(r.ok && r.value.cascade.warning).toBe(unsweptLine(1))
    expect(r.ok && r.value.replayable).toBe(true)
    expect((liveViewAt(col) as { filter: unknown }).filter).toEqual({ match: 'all', rules: [] })
    expect(tilePushes()).toEqual([HOME])
  })

  it('a delete held by an unreadable Set sidecar warns, and the replay channel heals it once the file reads', async () => {
    const setFile = sidecarPath(surfaces.set, 'set')
    const held = await readFile(setFile, 'utf8')
    await rm(setFile)
    await mkdir(setFile)
    const r = await propertiesHandlers['property:delete'](ctx, propId)
    expect(r.ok && r.value.cascade?.warning).toBe(unsweptLine(1))
    expect(r.ok && r.value.replayable).toBe(true)
    expect(tilePushes()).toEqual([HOME])
    expect(await propertiesHandlers['property:replay'](ctx, propId)).toEqual(fault(unsweptLine(1)))
    await rm(setFile, { recursive: true })
    await writeFile(setFile, held)
    await refreshTree(root)
    expect(await propertiesHandlers['property:replay'](ctx, propId)).toEqual({
      ok: true,
      value: null,
    })
    const views = (await readJsonAt(setFile)).views as { filter: unknown }[]
    expect(views[0].filter).toEqual({ match: 'all', rules: [] })
  })

  it('a delete that finds another operation owed in the journal offers no replay of its own', async () => {
    const owed = { op: 'rename' as const, id: 'prop_other', from: 'A', to: 'B' }
    await writeSchemaJournal(root, owed)
    const setFile = sidecarPath(surfaces.set, 'set')
    await rm(setFile)
    await mkdir(setFile)
    const r = await propertiesHandlers['property:delete'](ctx, propId)
    expect(r.ok && r.value.cascade.warning).toBe(unsweptLine(1))
    expect(r.ok && r.value.replayable).toBeUndefined()
    expect(await propertiesHandlers['property:replay'](ctx, propId)).toEqual({
      ok: true,
      value: null,
    })
    expect(await readSchemaJournal(root)).toEqual(owed)
  })

  it('an option removal that finds another operation owed in the journal offers no replay of its own', async () => {
    const owed = { op: 'rename' as const, id: 'prop_other', from: 'A', to: 'B' }
    await writeSchemaJournal(root, owed)
    const setFile = sidecarPath(surfaces.set, 'set')
    await rm(setFile)
    await mkdir(setFile)
    const r = await propertiesHandlers['property:removeOption'](ctx, propId, 'Done')
    expect(r.ok && r.value.cascade.warning).toBe(unsweptLine(1))
    expect(r.ok && r.value.replayable).toBeUndefined()
    expect(await readSchemaJournal(root)).toEqual(owed)
  })

  it('a removal whose drop fails still lands the Set it wrote in the held tree', async () => {
    vi.mocked(mutateRegistry).mockResolvedValueOnce(fault('refused'))
    const r = await propertiesHandlers['property:removeOption'](ctx, propId, 'Done')
    expect(r.ok).toBe(false)
    expect((liveViewAt(surfaces.set) as { filter: unknown }).filter).toEqual({
      match: 'all',
      rules: [],
    })
  })
})
