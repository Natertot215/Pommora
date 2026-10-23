import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { rewriteRaw, rewriteRootAt } from '../Nexus/governedRoot'
import { landValue } from '../Files/rootValues'
import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { relative } from '../Paths/posix'
import { noModeBits, readJsonAt, tempRoot } from '../Testing/hostFs'
import { type ConfigSurfaces, seedConfigSurfaces, viewOn } from '../Testing/configSurfaces'
import type { HostContext } from '../Contract/handlers'
import { fail, fault, ok } from '../Contract/result'
import { sidecarPath } from '../Paths/paths'
import { closeSession, openSession } from '../Nexus/session'
import { dropLiveTree, heldTreeOf, refreshTree } from '../Nexus/liveTree'
import { containerAt } from '../Nexus/treePatch'
import { createFolderEntity } from '../Nexus/folderEntity'
import { newId } from '../Nexus/ids'
import { createTestPage } from '../Testing/createTestPage'
import { createProperty } from './registryProperty'
import { assignProperty } from './assignment'
import { mutateRegistry, readRegistry } from './propertiesRegistry'
import { unsweptLine } from '../Nexus/entities'
import { readSchemaJournal, writeSchemaJournal } from './propertyJournal'
import { propertiesHandlers } from './handlers'
import { nexusHandlers } from '../Nexus/handlers'
import type { MutateRequest } from '../Nexus/mutateRequest'
import { replaySchemaCascade } from './replaySchemaCascade'
import { handleMutate } from '../Nexus/mutate'
import type { TrashDeps } from '../Trash/discard'

vi.mock('./propertiesRegistry', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./propertiesRegistry')>()
  return { ...mod, mutateRegistry: vi.fn(mod.mutateRegistry) }
})

const HOME = { host: { kind: 'space', id: 'sp_home' }, ids: [] }
const deps: TrashDeps = { trashMode: 'nexus', trashToSystem: async () => {} }

let root: string
let col: string
let propId: string
let surfaces: ConfigSurfaces
let pushes: { channel: string; payload: unknown }[]

const ctx = {
  push: (channel: string, payload: unknown) => {
    pushes.push({ channel, payload })
  },
  trashMode: async () => 'nexus',
} as unknown as HostContext

const send = (req: MutateRequest) => nexusHandlers.mutate(ctx, req)
const FINISH = { op: 'finishOwed' as const }

const tilePushes = (): unknown[] =>
  pushes.filter((p) => p.channel === 'tiles:changed').map((p) => p.payload)

const liveViewAt = (abs: string): unknown =>
  containerAt(heldTreeOf(root)!, relative(root, abs))?.views?.[0]

beforeEach(async () => {
  pushes = []
  root = tempRoot('pom-prop-handlers-')
  const c = await createFolderEntity(root, 'collection', 'Notes', newId())
  const p = await createProperty(root, {
    id: '',
    label: 'Stage',
    type: 'select',
    select_options: [
      { key: 'Done', label: 'Done' },
      { key: 'Todo', label: 'Todo' },
    ],
  })
  if (!c.ok || !p.ok) throw new Error('setup failed')
  col = c.value.path
  propId = p.value.id
  await assignProperty(root, col, propId)
  const page = await createTestPage(col, 'A', { body: 'b' })
  if (!page.ok) throw new Error('setup failed')
  const key = (await readRegistry(root)).defs[propId].key
  await rewriteRootAt(
    page.value.path,
    rewriteRaw((raw) => landValue(raw, key, ['Done'])),
  )
  surfaces = await seedConfigSurfaces(root, col, viewOn(propId, 'Done'))
  await openSession(root)
})

afterEach(async () => {
  closeSession()
  dropLiveTree()
  await rm(root, { recursive: true, force: true })
})

describe('the property ops', () => {
  it('addProperty writes the key from the label, replacing a key the payload carries', async () => {
    const draft = { label: 'Due Date', key: 'whatever', type: 'text' as const }
    const r = await send({ op: 'addProperty', containerPath: relative(root, col), draft })
    if (!r.ok || !r.value.created || !('propertyId' in r.value.created))
      throw new Error('add failed')
    expect((await readRegistry(root)).defs[r.value.created.propertyId]?.key).toBe('Due Date')
  })

  it('a rename pushes each board it wrote once, and the held tree holds the containers it wrote', async () => {
    const r = await send({ op: 'renameOption', propertyId: propId, from: 'Done', to: 'Closed' })
    expect(r).toEqual(ok({ cascade: { pages: [], hosts: [HOME] } }))
    expect(tilePushes()).toEqual([HOME])
    expect(liveViewAt(surfaces.set)).toEqual(viewOn(propId, 'Closed'))
  })

  it.skipIf(noModeBits)(
    'an unassign with a skipped page still lands the Set it cleared in the held tree, then answers the skip on its cascade',
    async () => {
      const locked = await createFolderEntity(col, 'set', 'Locked', newId())
      if (!locked.ok) throw new Error('setup failed')
      const held = await createTestPage(locked.value.path, 'C', { body: 'b' })
      if (!held.ok) throw new Error('setup failed')
      const key = (await readRegistry(root)).defs[propId].key
      await rewriteRootAt(
        held.value.path,
        rewriteRaw((raw) => landValue(raw, key, ['Done'])),
      )
      await chmod(locked.value.path, 0o555)
      try {
        const r = await send({
          op: 'unassignProperty',
          containerPath: relative(root, col),
          propertyId: propId,
        })
        expect(r).toEqual(ok({ cascade: { pages: [], hosts: [HOME], warning: unsweptLine(1) } }))
      } finally {
        await chmod(locked.value.path, 0o755)
      }
      expect((liveViewAt(surfaces.set) as { group: unknown }).group).toEqual({ kind: 'structural' })
      expect(tilePushes()).toEqual([HOME])
    },
  )

  it('an option rename held by an unreadable Set sidecar warns with a Try Again that heals it once the file reads', async () => {
    const setFile = sidecarPath(surfaces.set, 'set')
    const held = await readFile(setFile, 'utf8')
    await rm(setFile)
    await mkdir(setFile)
    const r = await send({ op: 'renameOption', propertyId: propId, from: 'Done', to: 'Closed' })
    expect(r.ok && r.value.cascade?.warning).toBe(unsweptLine(1))
    expect(r.ok && r.value.retry).toEqual(FINISH)
    expect(await readSchemaJournal(root)).toEqual({
      op: 'option-rename',
      id: propId,
      keys: [['Done', 'Closed']],
      labels: ['Done', 'Closed'],
    })
    expect((liveViewAt(col) as { filter: unknown }).filter).toEqual(viewOn(propId, 'Closed').filter)
    await rm(setFile, { recursive: true })
    await writeFile(setFile, held)
    await refreshTree(root)
    expect(await send(FINISH)).toMatchObject(ok({ cascade: { pages: [] } }))
    expect((await readJsonAt(setFile)).views).toEqual([viewOn(propId, 'Closed')])
    expect(await readSchemaJournal(root)).toBeNull()
  })

  it('an option delete held by an unreadable Set sidecar keeps the option and offers Try Again', async () => {
    const setFile = sidecarPath(surfaces.set, 'set')
    await rm(setFile)
    await mkdir(setFile)
    const r = await send({ op: 'deleteOption', propertyId: propId, label: 'Done' })
    expect(r.ok && r.value.cascade?.warning).toBe(unsweptLine(1))
    expect(r.ok && r.value.retry).toEqual(FINISH)
    expect(await readSchemaJournal(root)).toEqual({ op: 'option-remove', id: propId, key: 'Done' })
    expect(liveViewAt(col)).not.toHaveProperty('filter')
    expect(tilePushes()).toEqual([HOME])
  })

  it('a delete held by an unreadable Set sidecar warns, and Try Again heals it once the file reads', async () => {
    const setFile = sidecarPath(surfaces.set, 'set')
    const held = await readFile(setFile, 'utf8')
    await rm(setFile)
    await mkdir(setFile)
    const r = await send({ op: 'deleteProperty', propertyId: propId })
    expect(r.ok && r.value.cascade?.warning).toBe(unsweptLine(1))
    expect(r.ok && r.value.retry).toEqual(FINISH)
    expect(await readSchemaJournal(root)).toEqual({ op: 'delete', id: propId, key: 'Stage' })
    expect(tilePushes()).toEqual([HOME])
    expect(await send(FINISH)).toMatchObject(
      ok({ cascade: { pages: [], warning: unsweptLine(1) }, retry: FINISH }),
    )
    await rm(setFile, { recursive: true })
    await writeFile(setFile, held)
    await refreshTree(root)
    const finished = await send(FINISH)
    expect(finished).toMatchObject(ok({ cascade: { pages: [] } }))
    expect(finished.ok && finished.value.retry).toBeUndefined()
    const views = (await readJsonAt(setFile)).views as { filter: unknown }[]
    expect(views[0]).not.toHaveProperty('filter')
  })

  it('a delete’s record replayed after the property is restored leaves the restored property as it is', async () => {
    const setFile = sidecarPath(surfaces.set, 'set')
    const held = await readFile(setFile, 'utf8')
    await rm(setFile)
    await mkdir(setFile)
    const r = await send({ op: 'deleteProperty', propertyId: propId })
    const record = await readSchemaJournal(root)
    if (!r.ok || !record || !r.value.bundled) throw new Error('setup failed')
    expect(await replaySchemaCascade(root, record)).toMatchObject(ok({ skipped: 1 }))
    await rm(setFile, { recursive: true })
    await writeFile(setFile, held)
    await refreshTree(root)
    const bundlePath = r.value.bundled.bundlePath
    expect((await handleMutate(root, { op: 'restore', bundlePath }, deps)).ok).toBe(true)
    const page = await readFile(`${col}/A.md`, 'utf8')
    expect(await replaySchemaCascade(root, record)).toMatchObject(ok({ skipped: 0 }))
    expect((await readRegistry(root)).defs[propId]?.label).toBe('Stage')
    expect(await readFile(`${col}/A.md`, 'utf8')).toBe(page)
  })

  it('a delete that finds another operation owed in the journal leaves the journal’s, and its own record’s replay leaves it too', async () => {
    const owed = { op: 'rename' as const, id: 'prop_other', from: 'A', to: 'B' }
    await writeSchemaJournal(root, owed)
    const setFile = sidecarPath(surfaces.set, 'set')
    await rm(setFile)
    await mkdir(setFile)
    const r = await send({ op: 'deleteProperty', propertyId: propId })
    expect(r.ok && r.value.cascade?.warning).toBe(unsweptLine(1))
    expect(r.ok && r.value.retry).toEqual(FINISH)
    expect(
      await replaySchemaCascade(root, { op: 'delete', id: propId, key: 'Stage' }),
    ).toMatchObject(ok({ skipped: 1 }))
    expect(await readSchemaJournal(root)).toEqual(owed)
  })

  it('an option delete that finds another operation owed in the journal is refused, keeping the option', async () => {
    const owed = { op: 'rename' as const, id: 'prop_other', from: 'A', to: 'B' }
    await writeSchemaJournal(root, owed)
    expect(await send({ op: 'deleteOption', propertyId: propId, label: 'Done' })).toEqual(
      fail('owed', 'An earlier change hasn’t reached every file yet.'),
    )
    expect((await readRegistry(root)).defs[propId]?.select_options).toContainEqual({
      key: 'Done',
      label: 'Done',
    })
    expect(await readSchemaJournal(root)).toEqual(owed)
  })

  it('an option delete’s record replayed after the option is deleted and added again leaves the option and its values', async () => {
    const setFile = sidecarPath(surfaces.set, 'set')
    const held = await readFile(setFile, 'utf8')
    await rm(setFile)
    await mkdir(setFile)
    expect((await send({ op: 'deleteOption', propertyId: propId, label: 'Done' })).ok).toBe(true)
    const record = await readSchemaJournal(root)
    if (!record) throw new Error('setup failed')
    await rm(setFile, { recursive: true })
    await writeFile(setFile, held)
    await refreshTree(root)
    expect((await send({ op: 'deleteOption', propertyId: propId, label: 'Done' })).ok).toBe(true)
    const add = { op: 'add' as const, groupId: 'select', label: 'Done' }
    expect((await send({ op: 'editOption', propertyId: propId, edit: add })).ok).toBe(true)
    const page = `${col}/A.md`
    const def = (await readRegistry(root)).defs[propId]
    await rewriteRootAt(
      page,
      rewriteRaw((raw) => landValue(raw, def.key, ['Done'])),
    )
    const before = await readFile(page, 'utf8')
    expect(await replaySchemaCascade(root, record)).toMatchObject(ok({ skipped: 0 }))
    expect(await readFile(page, 'utf8')).toBe(before)
    expect((await readRegistry(root)).defs[propId]?.select_options).toContainEqual({
      key: 'Done',
      label: 'Done',
    })
  })

  it('a format change that isn’t a Key Format is refused as malformed', async () => {
    for (const change of [{ key_format: 'Shouting' }, { value_format: 'Shouting' }])
      expect(
        await nexusHandlers.mutate(ctx, { op: 'setFormat', propertyId: propId, change }),
      ).toEqual(fault('Malformed request.'))
  })

  it('property:holders counts the Items each change it names rewrites, and refuses a change it can’t read', async () => {
    const holders = (change?: unknown) =>
      propertiesHandlers['property:holders'](ctx, propId, change)
    expect(await holders({ of: 'property' })).toEqual(ok(1))
    expect(await holders({ of: 'option', label: 'Done' })).toEqual(ok(1))
    expect(await holders({ of: 'format', change: { value_format: 'kebab-case' } })).toEqual(ok(1))
    expect(await holders({ of: 'format', change: { key_format: 'lowercase' } })).toEqual(ok(1))
    for (const change of [{ of: 'format', change: { key_format: 'Shouting' } }, undefined])
      expect(await holders(change)).toEqual(fault('A property id and value are required.'))
  })

  it('a delete whose drop fails still lands the Set it wrote in the held tree', async () => {
    vi.mocked(mutateRegistry).mockResolvedValueOnce(fault('refused'))
    const r = await send({ op: 'deleteOption', propertyId: propId, label: 'Done' })
    expect(r.ok).toBe(false)
    expect(liveViewAt(surfaces.set)).not.toHaveProperty('filter')
  })
})

describe('a schema op started while another operation’s record holds the journal', () => {
  const other = { op: 'rename' as const, id: 'prop_other', from: 'A', to: 'B' }
  const pageA = (): string => `${col}/A.md`
  const unreadable = async <T>(fn: () => T): Promise<Awaited<T>> => {
    await chmod(pageA(), 0o000)
    try {
      return await fn()
    } finally {
      await chmod(pageA(), 0o644)
    }
  }
  const fm = async (): Promise<string> => readFile(pageA(), 'utf8')
  beforeEach(async () => {
    await writeSchemaJournal(root, other)
  })

  it.each<[string, MutateRequest]>([
    ['an option rename', { op: 'renameOption', propertyId: '', from: 'Done', to: 'Closed' }],
    ['an option delete', { op: 'deleteOption', propertyId: '', label: 'Done' }],
  ])('%s is refused, leaving every holder', async (_, req) => {
    const before = await fm()
    expect(await send({ ...req, propertyId: propId } as MutateRequest)).toEqual(
      fail('owed', 'An earlier change hasn’t reached every file yet.'),
    )
    expect(await fm()).toBe(before)
    expect(await readSchemaJournal(root)).toEqual(other)
  })

  it.skipIf(noModeBits)('a property delete', async () => {
    const record = { op: 'delete' as const, id: propId, key: 'Stage' }
    const r = await unreadable(() => send({ op: 'deleteProperty', propertyId: propId }))
    expect(r.ok && r.value.cascade?.warning).toBe(unsweptLine(1))
    expect(r.ok && r.value.retry).toEqual(FINISH)
    expect(await replaySchemaCascade(root, record)).toMatchObject(ok({ skipped: 0 }))
    expect(await fm()).not.toContain('Stage')
    expect(await readSchemaJournal(root)).toEqual(other)
  })

  describe('a property rename', () => {
    const renamed = async () => {
      const r = await unreadable(() =>
        send({ op: 'renameProperty', propertyId: propId, label: 'Phase' }),
      )
      expect(r.ok && r.value.cascade?.warning).toBe(unsweptLine(1))
      expect(r.ok && r.value.retry).toEqual(FINISH)
      return { op: 'rename' as const, id: propId, from: 'Stage', to: 'Phase' }
    }

    it.skipIf(noModeBits)('replays its record once the holder reads', async () => {
      const owed = await renamed()
      expect(await replaySchemaCascade(root, owed)).toMatchObject(ok({ skipped: 0 }))
      expect(await fm()).toContain('Phase:\n  - Done')
      expect(await fm()).not.toContain('Stage')
      expect(await readSchemaJournal(root)).toEqual(other)
    })

    it.skipIf(noModeBits)(
      'sweeps to the current name once the property is renamed again',
      async () => {
        const owed = await renamed()
        expect(
          (await send({ op: 'renameProperty', propertyId: propId, label: 'Phase 2' })).ok,
        ).toBe(true)
        expect(await replaySchemaCascade(root, owed)).toMatchObject(ok({ skipped: 0 }))
        expect(await fm()).toContain('Phase 2:\n  - Done')
        expect(await fm()).not.toContain('Stage')
      },
    )

    it.skipIf(noModeBits)('changes nothing once another property takes the old name', async () => {
      const owed = await renamed()
      expect((await createProperty(root, { id: '', label: 'Stage', type: 'number' })).ok).toBe(true)
      const before = await fm()
      expect(await replaySchemaCascade(root, owed)).toMatchObject(ok({ skipped: 0 }))
      expect(await fm()).toBe(before)
    })
  })
})

describe('a Collection whose sidecar doesn’t parse', () => {
  const colFile = (): string => sidecarPath(col, 'collection')
  const damaged = async (): Promise<string> => {
    const held = await readFile(colFile(), 'utf8')
    await writeFile(colFile(), '{corrupt')
    await refreshTree(root)
    return held
  }
  const repaired = async (held: string): Promise<void> => {
    await writeFile(colFile(), held)
    await refreshTree(root)
  }

  it('an option rename holds nothing owed, and the Collection keeps the old label once it reads', async () => {
    const held = await damaged()
    const r = await send({ op: 'renameOption', propertyId: propId, from: 'Done', to: 'Closed' })
    expect(r).toEqual(ok({ cascade: { pages: [], hosts: [HOME] } }))
    expect(await readSchemaJournal(root)).toBeNull()
    await repaired(held)
    expect((await readJsonAt(colFile())).views).toEqual([viewOn(propId, 'Done')])
  })

  it('an option delete holds nothing owed and drops the option, and the Collection keeps its filter once it reads', async () => {
    const held = await damaged()
    const r = await send({ op: 'deleteOption', propertyId: propId, label: 'Done' })
    expect(r).toEqual(ok({ cascade: { pages: [], hosts: [HOME] } }))
    expect(await readSchemaJournal(root)).toBeNull()
    await repaired(held)
    expect((await readJsonAt(colFile())).views).toEqual([viewOn(propId, 'Done')])
    const options = (await readRegistry(root)).defs[propId].select_options?.map((o) => o.label)
    expect(options).toEqual(['Todo'])
  })
})
