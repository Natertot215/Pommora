import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { chmod, mkdir, rm } from 'node:fs/promises'
import { relative } from '../Paths/posix'
import { noModeBits, tempRoot } from '../Testing/hostFs'
import { seedConfigSurfaces, viewOn } from '../Testing/configSurfaces'
import type { HostContext } from '../Contract/handlers'
import { fault } from '../Contract/result'
import { sidecarPath } from '../Paths/paths'
import { closeSession, openSession } from '../Nexus/session'
import { dropLiveTree, getLiveTree } from '../Nexus/liveTree'
import { findContainerWhere } from '../Nexus/treePatch'
import { createFolderEntity } from '../Nexus/folderEntity'
import { createPage, updatePageProperty } from '../Nexus/page'
import { createProperty } from './registryProperty'
import { assignProperty } from './assignment'
import { mutateRegistry, readRegistry } from './propertiesRegistry'
import { unsweptLine } from './governedSweep'
import { propertiesHandlers } from './handlers'

vi.mock('./propertiesRegistry', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./propertiesRegistry')>()
  return { ...mod, mutateRegistry: vi.fn(mod.mutateRegistry) }
})

const HOME = { kind: 'space', id: 'sp_home' }

let root: string
let col: string
let propId: string
let surfaces: Awaited<ReturnType<typeof seedConfigSurfaces>>
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
  const c = await createFolderEntity(root, 'collection', 'Notes')
  const p = await createProperty(root, {
    id: '',
    name: 'Stage',
    type: 'select',
    select_options: [
      { value: 'Done', label: 'Done' },
      { value: 'Todo', label: 'Todo' },
    ],
  })
  if (!c.ok || !p.ok) throw new Error('setup failed')
  col = c.value.path
  propId = p.value.id
  await assignProperty(root, col, propId)
  const page = await createPage(col, 'A', { body: 'b' })
  if (!page.ok) throw new Error('setup failed')
  await updatePageProperty(root, page.value.path, (await readRegistry(root)).defs[propId], {
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
  it('a rename pushes each board it wrote once and confirms the containers', async () => {
    const r = await propertiesHandlers['property:renameOption'](ctx, propId, 'Done', 'Closed')
    expect(r).toEqual({ ok: true, value: null })
    expect(tilePushes()).toEqual([HOME])
    expect(liveViewAt(surfaces.set)).toEqual(viewOn(propId, 'Closed'))
  })

  it.skipIf(noModeBits)(
    'an unassign with a skipped page still confirms the Set it cleared, then answers the fault',
    async () => {
      const locked = await createFolderEntity(col, 'set', 'Locked')
      if (!locked.ok) throw new Error('setup failed')
      const held = await createPage(locked.value.path, 'C', { body: 'b' })
      if (!held.ok) throw new Error('setup failed')
      await updatePageProperty(root, held.value.path, (await readRegistry(root)).defs[propId], {
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

  it('a removal held by an unreadable Set sidecar confirms what it wrote and answers the fault', async () => {
    const setFile = sidecarPath(surfaces.set, 'set')
    await rm(setFile)
    await mkdir(setFile)
    const r = await propertiesHandlers['property:removeOption'](ctx, propId, 'Done')
    expect(r).toEqual(fault(unsweptLine(1)))
    expect((liveViewAt(col) as { filter: unknown }).filter).toEqual({ match: 'all', rules: [] })
    expect(tilePushes()).toEqual([HOME])
  })

  it('a removal whose drop fails still confirms the Set it wrote', async () => {
    vi.mocked(mutateRegistry).mockResolvedValueOnce(fault('refused'))
    const r = await propertiesHandlers['property:removeOption'](ctx, propId, 'Done')
    expect(r.ok).toBe(false)
    expect((liveViewAt(surfaces.set) as { filter: unknown }).filter).toEqual({
      match: 'all',
      rules: [],
    })
  })
})
