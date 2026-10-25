import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { rewriteRaw, rewriteRootAt } from '../Nexus/governedRoot'
import { landValue } from '../Files/rootValues'
import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join, relative } from '../Paths/posix'
import { OWED_REL } from '../Paths/nexusPaths'
import { noModeBits, putJson, readJsonAt, tempRoot } from '../Testing/hostFs'
import { type ConfigSurfaces, seedConfigSurfaces, viewOn } from '../Testing/configSurfaces'
import type { HostContext } from '../Contract/handlers'
import { fault, ok } from '../Contract/result'
import { sidecarPath } from '../Paths/paths'
import { readJsonObject } from '../Files/atomicWrite'
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
import { readNotes } from '../Nexus/owed'
import { propertiesHandlers } from './handlers'
import { nexusHandlers } from '../Nexus/handlers'
import type { MutateRequest } from '../Nexus/mutateRequest'
import type { FormatChange } from './keyFormat'
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
      { id: 'opt_Done', key: 'Done', label: 'Done' },
      { id: 'opt_Todo', key: 'Todo', label: 'Todo' },
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
  surfaces = await seedConfigSurfaces(root, col, viewOn(propId, 'opt_Done'))
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

  it('an option delete pushes each board it wrote once, and the held tree holds the containers it wrote', async () => {
    const r = await send({ op: 'deleteOption', propertyId: propId, optionId: 'opt_Done' })
    expect(r).toEqual(ok({ cascade: { pages: [], hosts: [HOME] } }))
    expect(tilePushes()).toEqual([HOME])
    expect(liveViewAt(surfaces.set)).not.toHaveProperty('filter')
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
        expect(r).toEqual(
          ok({ cascade: { pages: [], hosts: [HOME], warning: unsweptLine(1), owed: true } }),
        )
      } finally {
        await chmod(locked.value.path, 0o755)
      }
      expect((liveViewAt(surfaces.set) as { group: unknown }).group).toEqual({ kind: 'structural' })
      expect(tilePushes()).toEqual([HOME])
    },
  )

  it('an option delete held by an unreadable Set sidecar drops the option and offers Try Again', async () => {
    const setFile = sidecarPath(surfaces.set, 'set')
    await rm(setFile)
    await mkdir(setFile)
    const r = await send({ op: 'deleteOption', propertyId: propId, optionId: 'opt_Done' })
    expect(r.ok && r.value.cascade).toMatchObject({ warning: unsweptLine(1), owed: true })
    expect(await readNotes(root)).toEqual({
      [propId]: { kind: 'property', options: { opt_Done: { strip: ['Done'] } } },
    })
    const options = (await readRegistry(root)).defs[propId].select_options?.map((o) => o.label)
    expect(options).toEqual(['Todo'])
    expect(liveViewAt(col)).not.toHaveProperty('filter')
    expect(tilePushes()).toEqual([HOME])
  })

  it('a delete held by an unreadable Set sidecar warns, and Try Again heals it once the file reads', async () => {
    const setFile = sidecarPath(surfaces.set, 'set')
    const held = await readFile(setFile, 'utf8')
    await rm(setFile)
    await mkdir(setFile)
    const r = await send({ op: 'deleteProperty', propertyId: propId })
    expect(r.ok && r.value.cascade).toMatchObject({ warning: unsweptLine(1), owed: true })
    expect(await readNotes(root)).toEqual({ [propId]: { kind: 'property', strip: ['Stage'] } })
    expect(tilePushes()).toEqual([HOME])
    expect(await send(FINISH)).toMatchObject(
      ok({ cascade: { pages: [], warning: unsweptLine(1), owed: true } }),
    )
    await rm(setFile, { recursive: true })
    await writeFile(setFile, held)
    await refreshTree(root)
    const finished = await send(FINISH)
    expect(finished).toMatchObject(ok({ cascade: { pages: [] } }))
    expect(finished.ok && finished.value.cascade?.owed).toBeUndefined()
    expect(await readNotes(root)).toEqual({})
    const views = (await readJsonAt(setFile)).views as { filter: unknown }[]
    expect(views[0]).not.toHaveProperty('filter')
  })

  it('a delete finished after the property is restored leaves the restored property as it is', async () => {
    const setFile = sidecarPath(surfaces.set, 'set')
    const held = await readFile(setFile, 'utf8')
    await rm(setFile)
    await mkdir(setFile)
    const r = await send({ op: 'deleteProperty', propertyId: propId })
    if (!r.ok || !r.value.bundled) throw new Error('setup failed')
    await rm(setFile, { recursive: true })
    await writeFile(setFile, held)
    await refreshTree(root)
    const bundlePath = r.value.bundled.bundlePath
    expect((await handleMutate(root, { op: 'restore', bundlePath }, deps)).ok).toBe(true)
    // The re-assign's refill settles once the rename it sits under does.
    const collectionId = (await readJsonObject(sidecarPath(col, 'collection')))?.id
    expect(await readNotes(root)).toEqual({
      [propId]: { kind: 'property', rename: ['Stage'], collections: [collectionId] },
    })
    const page = await readFile(`${col}/A.md`, 'utf8')
    expect(await send(FINISH)).toMatchObject(ok({ cascade: { pages: [] } }))
    expect((await readRegistry(root)).defs[propId]?.label).toBe('Stage')
    expect(await readFile(`${col}/A.md`, 'utf8')).toBe(page)
    expect(await readNotes(root)).toEqual({})
  })

  it('an option delete runs while another property owes work, leaving its entry as it stood', async () => {
    const other = { prop_other: { kind: 'property', rename: ['A'] } }
    await putJson(join(root, OWED_REL), other)
    expect(await send({ op: 'deleteOption', propertyId: propId, optionId: 'opt_Done' })).toEqual(
      ok({ cascade: { pages: [], hosts: [HOME] } }),
    )
    const options = (await readRegistry(root)).defs[propId].select_options?.map((o) => o.label)
    expect(options).toEqual(['Todo'])
    expect(await readNotes(root)).toEqual(other)
  })

  it('an option delete finished by Try Again leaves an option added again under its word, and its values', async () => {
    const setFile = sidecarPath(surfaces.set, 'set')
    const held = await readFile(setFile, 'utf8')
    await rm(setFile)
    await mkdir(setFile)
    expect((await send({ op: 'deleteOption', propertyId: propId, optionId: 'opt_Done' })).ok).toBe(
      true,
    )
    await rm(setFile, { recursive: true })
    await writeFile(setFile, held)
    await refreshTree(root)
    expect((await send(FINISH)).ok).toBe(true)
    expect(await readNotes(root)).toEqual({})
    const add = { op: 'add' as const, groupId: 'select', id: 'opt_Again', label: 'Done' }
    expect((await send({ op: 'editOption', propertyId: propId, edit: add })).ok).toBe(true)
    const page = `${col}/A.md`
    const def = (await readRegistry(root)).defs[propId]
    await rewriteRootAt(
      page,
      rewriteRaw((raw) => landValue(raw, def.key, ['Done'])),
    )
    const before = await readFile(page, 'utf8')
    expect((await send(FINISH)).ok).toBe(true)
    expect(await readFile(page, 'utf8')).toBe(before)
    expect((await readRegistry(root)).defs[propId]?.select_options).toContainEqual({
      id: 'opt_Again',
      key: 'Done',
      label: 'Done',
    })
  })

  it('property:holders counts the Items each change it names rewrites, and refuses a change it can’t read', async () => {
    const holders = (change?: unknown) =>
      propertiesHandlers['property:holders'](ctx, propId, change)
    expect(await holders({ of: 'property' })).toEqual(ok(1))
    expect(await holders({ of: 'option', optionId: 'opt_Done' })).toEqual(ok(1))
    expect(await holders({ of: 'format', change: { value_format: 'kebab-case' } })).toEqual(ok(1))
    expect(await holders({ of: 'format', change: { key_format: 'lowercase' } })).toEqual(ok(1))
    for (const change of [{ of: 'format', change: { key_format: 'Shouting' } }, undefined])
      expect(await holders(change)).toEqual(fault('A property id and value are required.'))
  })

  it('property:holders counts what a rename rewrites', async () => {
    const holders = (change: unknown) => propertiesHandlers['property:holders'](ctx, propId, change)
    const format = (change: FormatChange) => send({ op: 'setFormat', propertyId: propId, change })
    expect(await holders({ of: 'rename', label: 'Phase' })).toEqual(ok(1))
    expect((await format({ key_format: 'lowercase' })).ok).toBe(true)
    expect(await holders({ of: 'rename', label: 'STAGE' })).toEqual(ok(0))
    expect(await holders({ of: 'rename', label: 'Closed', optionId: 'opt_Done' })).toEqual(ok(1))
    expect((await format({ value_format: 'lowercase' })).ok).toBe(true)
    expect(await holders({ of: 'rename', label: 'DONE', optionId: 'opt_Done' })).toEqual(ok(0))
  })

  it('a delete whose drop fails writes no Set and owes nothing', async () => {
    vi.mocked(mutateRegistry).mockResolvedValueOnce(fault('refused'))
    const r = await send({ op: 'deleteOption', propertyId: propId, optionId: 'opt_Done' })
    expect(r.ok).toBe(false)
    const views = (await readJsonAt(sidecarPath(surfaces.set, 'set'))).views as unknown[]
    expect(views[0]).toHaveProperty('filter')
    expect(await readNotes(root)).toEqual({})
  })
})

describe('a schema op started while another property owes work', () => {
  const other = { prop_other: { kind: 'property', rename: ['A'] } }
  beforeEach(async () => {
    await putJson(join(root, OWED_REL), other)
  })

  it.each<[string, MutateRequest]>([
    [
      'an option rename',
      { op: 'renameOption', propertyId: '', optionId: 'opt_Done', label: 'Closed' },
    ],
    ['an option delete', { op: 'deleteOption', propertyId: '', optionId: 'opt_Done' }],
    ['a property rename', { op: 'renameProperty', propertyId: '', label: 'Phase' }],
    ['a property delete', { op: 'deleteProperty', propertyId: '' }],
  ])('%s lands, leaving the other entry as it stood', async (_, req) => {
    expect((await send({ ...req, propertyId: propId } as MutateRequest)).ok).toBe(true)
    expect(await readNotes(root)).toEqual(other)
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

  it('an option rename holds nothing owed, and the Collection reads as written', async () => {
    const held = await damaged()
    const r = await send({
      op: 'renameOption',
      propertyId: propId,
      optionId: 'opt_Done',
      label: 'Closed',
    })
    expect(r).toEqual(ok({ cascade: { pages: [], hosts: [] } }))
    expect(await readNotes(root)).toEqual({})
    await repaired(held)
    expect((await readJsonAt(colFile())).views).toEqual([viewOn(propId, 'opt_Done')])
  })

  it('an option delete holds nothing owed and drops the option, and the Collection keeps its filter once it reads', async () => {
    const held = await damaged()
    const r = await send({ op: 'deleteOption', propertyId: propId, optionId: 'opt_Done' })
    expect(r).toEqual(ok({ cascade: { pages: [], hosts: [HOME] } }))
    expect(await readNotes(root)).toEqual({})
    await repaired(held)
    expect((await readJsonAt(colFile())).views).toEqual([viewOn(propId, 'opt_Done')])
    const options = (await readRegistry(root)).defs[propId].select_options?.map((o) => o.label)
    expect(options).toEqual(['Todo'])
  })
})
