import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { STASHED_AT } from '../Testing/definitions'
import { rewriteRoot, rewriteRootAt } from '../Nexus/governedRoot'
import { landValue } from '../Files/rootValues'
import { chmod, mkdir, rm, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from '../Paths/posix'
import { noModeBits, putJson, seedSpaceSidecar, readJsonAt, tempRoot } from '../Testing/hostFs'
import { fail, fault, ok } from '../Contract/result'
import {
  editOption,
  optionHolders,
  registerHeldOptions,
  renameOption,
  deleteOption,
  clearOption,
  setValueFormat,
  unregisteredMembers,
  valueEditRewrite,
  valueFormatHolders,
} from './optionOps'
import type { KeyFormat } from './keyFormat'
import { createProperty, configureProperty } from './registryProperty'
import { assignProperty } from './assignment'
import { unassignProperty } from './unassignProperty'
import { createFolderEntity } from '../Nexus/folderEntity'
import { newContentId, newId } from '../Nexus/ids'
import { createTestPage } from '../Testing/createTestPage'
import { mutateRegistry, readRegistry, serializeSchemaOp } from './propertiesRegistry'

type PropDefLike = Record<string, unknown> & {
  select_options?: unknown[]
  status_groups?: { options: unknown[] }[]
  type?: string
}
type RegistryFile = { order: string[]; defs: Record<string, PropDefLike> }
import { OWED, readNotes, runNoted } from '../Nexus/owed'
import { finishOwed } from '../Nexus/finishOwed'
import { OWED_REL } from '../Paths/nexusPaths'
import type { TrashDeps } from '../Trash/discard'
import { unsweptLine } from '../Nexus/entities'
import { type ConfigSurfaces, seedConfigSurfaces, viewOn } from '../Testing/configSurfaces'
import { sidecarPath } from '../Paths/paths'
import { splitFrontmatter } from '../Files/pageFile'
import { optionsOf, type PropertyDefinition, SELECT_GROUP, type SelectOption } from './properties'
import { settleNow } from '../Nexus/settle'
import type { ValueChange } from '../Nexus/tree'
import type { Pushes } from '../Contract/bridge'
import { closeSession, openSession } from '../Nexus/session'
import { refreshTree } from '../Nexus/liveTree'
import type { Json } from '../Files/stableJson'
import { machine } from '../Platform/machine'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import { seedContentIndex } from '../Index/indexSeed'

vi.mock('./propertiesRegistry', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./propertiesRegistry')>()
  return { ...mod, mutateRegistry: vi.fn(mod.mutateRegistry) }
})

vi.mock('../Nexus/owed', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../Nexus/owed')>()
  return { ...mod, runNoted: vi.fn(mod.runNoted) }
})

const deps: TrashDeps = { trashMode: 'nexus', trashToSystem: (p) => rm(p, { force: true }) }
const seedNotes = (notes: Record<string, unknown>): Promise<void> =>
  putJson(join(root, OWED_REL), notes)

let root: string
beforeEach(async () => {
  root = tempRoot('pom-opt-')
})
afterEach(async () => {
  vi.restoreAllMocks()
  await rm(root, { recursive: true, force: true })
})

async function mkProperty(def: Omit<PropertyDefinition, 'id'>): Promise<string> {
  const c = await createProperty(root, { ...def })
  if (!c.ok) throw new Error('createProperty failed')
  return c.value.id
}

const mkSelect = (select_options: SelectOption[]): Promise<string> =>
  mkProperty({ label: 'Tags', key: 'Tags', type: 'select', select_options })

const mkStatus = (): Promise<string> => mkProperty({ label: 'Stage', key: 'Stage', type: 'status' })

async function pageHolding(id: string, value: string): Promise<string> {
  const col = await createFolderEntity(root, 'collection', 'Col', newId())
  if (!col.ok) throw new Error('folder failed')
  await assignProperty(root, col.value.path, id)
  const p = await createTestPage(col.value.path, 'One', { body: 'b' })
  if (!p.ok) throw new Error('page failed')
  const def = (await readRegistry(root)).defs[id]
  if (!def) throw new Error('definition missing')
  await rewriteRootAt(
    p.value.path,
    rewriteRoot((raw) => landValue(raw, def.key, [value])),
  )
  return p.value.path
}

// A page in a Set whose folder refuses writes, so a sweep misses it; answers the page and the Set.
async function lockedPage(
  col: string,
  id: string,
  word: string,
): Promise<{ page: string; set: string }> {
  const set = await createFolderEntity(col, 'set', 'Locked', newId())
  if (!set.ok) throw new Error('set failed')
  const p = await createTestPage(set.value.path, 'Held', { body: 'b' })
  if (!p.ok) throw new Error('page failed')
  const key = (await readRegistry(root)).defs[id].key
  await rewriteRootAt(
    p.value.path,
    rewriteRoot((raw) => landValue(raw, key, [word])),
  )
  await chmod(set.value.path, 0o555)
  return { page: p.value.path, set: set.value.path }
}

const spaceSidecar = (name: string, raw: Record<string, unknown>): Promise<string> =>
  seedSpaceSidecar(root, 'Projects', name, raw)

async function optionIdOf(id: string, label: string): Promise<string> {
  const option = optionsOf((await readRegistry(root)).defs[id]).find((o) => o.label === label)
  if (!option) throw new Error('option missing')
  return option.id
}

async function statusValues(id: string): Promise<string[]> {
  const def = (await readRegistry(root)).defs[id]
  return (def.status_groups ?? []).flatMap((g) => g.options.map((o) => o.label))
}

describe('editOption', () => {
  it('an emptied options list survives an unrelated property edit — no phantom re-seed', async () => {
    const id = await mkSelect([{ id: 'opt_A', key: 'A', label: 'A' }])
    expect((await deleteOption(root, id, 'opt_A')).ok).toBe(true)
    expect((await readRegistry(root)).defs[id].select_options).toEqual([])
    await configureProperty(root, id, { icon: 'tag' })
    expect((await readRegistry(root)).defs[id].select_options).toEqual([])
  })

  it('add keys the option from its title through the Value Format', async () => {
    const id = await mkProperty({
      label: 'Tags',
      key: 'Tags',
      type: 'select',
      value_format: 'kebab-case',
      select_options: [],
    })
    expect(
      await editOption(root, id, {
        op: 'add',
        groupId: 'select',
        id: 'opt_new',
        label: 'Light Blue',
      }),
    ).toEqual(ok(null))
    expect((await readRegistry(root)).defs[id].select_options).toEqual([
      { id: 'opt_new', key: 'light-blue', label: 'Light Blue' },
    ])
  })

  it('add refuses a title another option holds', async () => {
    const id = await mkSelect([{ id: 'opt_A', key: 'A', label: 'A' }])
    const r = await editOption(root, id, {
      op: 'add',
      groupId: 'select',
      id: 'opt_new',
      label: 'A',
    })
    expect(r.ok).toBe(false)
    expect((await readRegistry(root)).defs[id].select_options).toEqual([
      { id: 'opt_A', key: 'A', label: 'A' },
    ])
  })

  it('add refuses a blank or whitespace title', async () => {
    const id = await mkSelect([{ id: 'opt_A', key: 'A', label: 'A' }])
    for (const label of ['', '  ']) {
      const r = await editOption(root, id, {
        op: 'add',
        groupId: SELECT_GROUP,
        id: 'opt_new',
        label,
      })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.message).toBe('Option titles can’t be blank.')
    }
    expect((await readRegistry(root)).defs[id].select_options).toEqual([
      { id: 'opt_A', key: 'A', label: 'A' },
    ])
  })

  it('fails for an unknown property id', async () => {
    expect((await editOption(root, 'prop_nope', { op: 'recolor', optionId: 'opt_A' })).ok).toBe(
      false,
    )
  })

  it('serializes on the schema lock — queues behind an in-flight schema op, never interleaving', async () => {
    const id = await mkSelect([{ id: 'opt_A', key: 'A', label: 'A' }])
    const order: string[] = []
    let release!: () => void
    const gate = new Promise<void>((r) => {
      release = r
    })
    // Occupy the schema lock with a gated op, THEN fire editOption: on a different lock it would slip past the gate and land first.
    const slow = serializeSchemaOp(root, async () => {
      await gate
      order.push('schema-op')
    })
    const fast = editOption(root, id, {
      op: 'add',
      groupId: 'select',
      id: 'opt_B',
      label: 'B',
    }).then(() => order.push('editOption'))
    await new Promise((r) => setTimeout(r, 50))
    release()
    await Promise.all([slow, fast])
    expect(order).toEqual(['schema-op', 'editOption'])
  })

  it('relabelGroup refuses a whitespace label', async () => {
    const id = await mkStatus()
    const groupId = (await readRegistry(root)).defs[id].status_groups?.[0].id ?? ''
    const r = await editOption(root, id, { op: 'relabelGroup', groupId, label: '  ' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.message).toBe('Group labels can’t be blank.')
  })

  it('relabelGroup is refused on a Select', async () => {
    const id = await mkSelect([{ id: 'opt_A', key: 'A', label: 'A' }])
    const r = await editOption(root, id, { op: 'relabelGroup', groupId: 'select', label: 'Named' })
    expect(r).toMatchObject({ ok: false, error: { code: 'not-found' } })
    expect((await readRegistry(root)).defs[id].select_options).toEqual([
      { id: 'opt_A', key: 'A', label: 'A' },
    ])
  })

  it('a definition stored with a blank option takes an added option, written without the blank', async () => {
    const id = await mkSelect([{ id: 'opt_A', key: 'A', label: 'A' }])
    const file = join(root, '.nexus', 'properties.json')
    const raw = await readJsonAt<{ defs: Record<string, PropDefLike> }>(file)
    raw.defs[id].select_options = [
      { id: 'opt_A', key: 'A', label: 'A' },
      { key: ' ', label: ' ' },
    ]
    // Raw option shapes the decoder repairs are the case under test.
    await writeFile(file, JSON.stringify(raw))
    expect(
      (await editOption(root, id, { op: 'add', groupId: SELECT_GROUP, id: 'opt_B', label: 'B' }))
        .ok,
    ).toBe(true)
    expect(
      (await readJsonAt<{ defs: Record<string, PropDefLike> }>(file)).defs[id].select_options,
    ).toEqual([
      { id: 'opt_A', key: 'A', label: 'A' },
      { id: 'opt_B', key: 'B', label: 'B' },
    ])
  })

  it('add and move are refused for a group the definition lacks', async () => {
    const id = await mkStatus()
    const before = await statusValues(id)
    const open = await optionIdOf(id, 'Open')
    expect(
      await editOption(root, id, { op: 'add', groupId: 'nope', id: 'opt_X', label: 'X' }),
    ).toMatchObject({
      ok: false,
      error: { code: 'not-found' },
    })
    expect(
      await editOption(root, id, { op: 'move', optionId: open, groupId: 'nope', toIndex: 0 }),
    ).toMatchObject({ ok: false, error: { code: 'not-found' } })
    expect(await statusValues(id)).toEqual(before)
  })
})

describe('a definition stored with options that carry no id', () => {
  it('reads each option under the id its key derives, and an option edit stores every option of the property with that id', async () => {
    const id = await mkSelect([{ id: 'opt_x', key: 'x', label: 'x' }])
    const file = join(root, '.nexus', 'properties.json')
    const raw = await readJsonAt<{ defs: Record<string, PropDefLike> }>(file)
    raw.defs[id].select_options = [
      { key: 'Done', label: 'Done' },
      { key: 'Todo', label: 'Todo' },
    ]
    await writeFile(file, JSON.stringify(raw))
    const ids = async () =>
      ((await readRegistry(root)).defs[id].select_options ?? []).map((o) => o.id)
    expect(await ids()).toEqual(['opt_Done', 'opt_Todo'])
    expect(await ids()).toEqual(['opt_Done', 'opt_Todo'])
    raw.defs[id].select_options = [
      { id: '', key: 'Done', label: 'Done' },
      { key: 'Todo', label: 'Todo' },
    ]
    await writeFile(file, JSON.stringify(raw))
    expect(await ids()).toEqual(['opt_Done', 'opt_Todo'])
    expect(
      (await editOption(root, id, { op: 'recolor', optionId: 'opt_Todo', color: 'red' })).ok,
    ).toBe(true)
    expect(
      (await readJsonAt<{ defs: Record<string, PropDefLike> }>(file)).defs[id].select_options,
    ).toEqual([
      { id: 'opt_Done', key: 'Done', label: 'Done' },
      { id: 'opt_Todo', key: 'Todo', label: 'Todo', color: 'red' },
    ])
  })
})

describe('a definition stored with options that carry no label', () => {
  it('takes a recolor on a labelled option, storing every option with its label', async () => {
    const id = await mkSelect([{ id: 'opt_a', key: 'a', label: 'a' }])
    const file = join(root, '.nexus', 'properties.json')
    const raw = await readJsonAt<{ defs: Record<string, PropDefLike> }>(file)
    raw.defs[id].select_options = [{ key: 'a' }, { key: 'b' }, { key: 'c', label: 'C' }]
    await writeFile(file, JSON.stringify(raw))
    expect(
      (await editOption(root, id, { op: 'recolor', optionId: 'opt_c', color: 'red' })).ok,
    ).toBe(true)
    const after = await readJsonAt<{ defs: Record<string, PropDefLike> }>(file)
    expect(after.defs[id].select_options).toEqual([
      { id: 'opt_a', key: 'a', label: 'a' },
      { id: 'opt_b', key: 'b', label: 'b' },
      { id: 'opt_c', key: 'c', label: 'C', color: 'red' },
    ])
  })
})

describe('a definition stored with two options that fold alike', () => {
  it('takes an added option, written with the first of the pair alone', async () => {
    const id = await mkSelect([{ id: 'opt_alpha', key: 'alpha', label: 'alpha' }])
    const file = join(root, '.nexus', 'properties.json')
    const raw = await readJsonAt<{ defs: Record<string, PropDefLike> }>(file)
    raw.defs[id].select_options = [
      { key: 'alpha', label: 'alpha' },
      { key: 'Alpha', label: 'Alpha' },
    ]
    await writeFile(file, JSON.stringify(raw))
    expect(
      (await editOption(root, id, { op: 'add', groupId: 'select', id: 'opt_beta', label: 'beta' }))
        .ok,
    ).toBe(true)
    const after = await readJsonAt<{ defs: Record<string, PropDefLike> }>(file)
    expect(after.defs[id].select_options).toEqual([
      { id: 'opt_alpha', key: 'alpha', label: 'alpha' },
      { id: 'opt_beta', key: 'beta', label: 'beta' },
    ])
  })
})

describe('an option edit stores every other entry as the list decoded it, keeping keys it doesn’t read', () => {
  const selectSeed = [
    { id: 'opt_A', key: 'A', label: 'A' },
    { id: 'opt_B', key: 'B', label: 'B', appearance: 'outline', icon: 7, tint: 'x' },
    { id: 'opt_C', key: 'C', label: 'C' },
  ]
  const statusSeed = [
    {
      id: 'g1',
      label: 'One',
      color: 'grey',
      options: [
        { id: 'opt_X', key: 'X', label: 'X' },
        { id: 'opt_Y', key: 'Y', label: 'Y', appearance: 'outline', icon: 7, tint: 'x' },
        { id: 'opt_W', key: 'W', label: 'W' },
      ],
    },
    { id: 'g2', label: 'Two', color: 42, options: [{ id: 'opt_Z', key: 'Z', label: 'Z' }] },
  ]
  const multiSeed = [
    { id: 'opt_a', key: 'a', label: 'a' },
    { id: 'opt_b', key: 'b', label: 'b', appearance: 'outline', icon: 7, tint: 'x' },
  ]
  // The decoder drops a value it can't read (an unknown appearance, a numeric icon or color) and keeps a key it doesn't know.
  const decoded = (o: { id: string; key: string; label: string }) => ({ ...o, tint: 'x' })
  const registryFile = () => join(root, '.nexus', 'properties.json')
  const rawDefs = async () => (await readJsonAt<RegistryFile>(registryFile())).defs

  beforeEach(async () => {
    await mkdir(join(root, '.nexus'), { recursive: true })
    await writeFile(
      registryFile(),
      JSON.stringify({
        order: ['prop_sel', 'prop_st', 'prop_multi'],
        defs: {
          prop_sel: {
            id: 'prop_sel',
            label: 'Tags',
            key: 'Tags',
            type: 'select',
            select_options: selectSeed,
          },
          prop_st: {
            id: 'prop_st',
            label: 'Stage',
            key: 'Stage',
            type: 'status',
            status_groups: statusSeed,
          },
          prop_multi: {
            id: 'prop_multi',
            label: 'Labels',
            key: 'Labels',
            type: 'multiSelect',
            select_options: multiSeed,
          },
        },
      }),
    )
  })

  it('after a recolor, a rename, a remove, and an option add, the untouched entries deep-equal what was seeded', async () => {
    expect(
      (await editOption(root, 'prop_sel', { op: 'recolor', optionId: 'opt_A', color: 'red' })).ok,
    ).toBe(true)
    expect(
      (await editOption(root, 'prop_st', { op: 'recolor', optionId: 'opt_X', color: 'red' })).ok,
    ).toBe(true)
    expect((await renameOption(root, 'prop_sel', 'opt_A', 'AA')).ok).toBe(true)
    expect((await renameOption(root, 'prop_st', 'opt_X', 'XX')).ok).toBe(true)
    expect((await deleteOption(root, 'prop_sel', 'opt_C')).ok).toBe(true)
    expect((await deleteOption(root, 'prop_st', 'opt_W')).ok).toBe(true)
    expect(
      (
        await editOption(root, 'prop_multi', {
          op: 'add',
          groupId: SELECT_GROUP,
          id: 'opt_c',
          label: 'c',
        })
      ).ok,
    ).toBe(true)
    const defs = await rawDefs()
    expect(defs.prop_sel.select_options).toEqual([
      { id: 'opt_A', key: 'AA', label: 'AA', color: 'red' },
      decoded({ id: 'opt_B', key: 'B', label: 'B' }),
    ])
    expect(defs.prop_st.status_groups).toEqual([
      {
        ...statusSeed[0],
        options: [
          { id: 'opt_X', key: 'XX', label: 'XX', color: 'red' },
          decoded({ id: 'opt_Y', key: 'Y', label: 'Y' }),
        ],
      },
      { ...statusSeed[1], color: 'grey' },
    ])
    expect(defs.prop_multi.select_options).toEqual([
      multiSeed[0],
      decoded({ id: 'opt_b', key: 'b', label: 'b' }),
      { id: 'opt_c', key: 'c', label: 'c' },
    ])
  })

  it("a move keeps the moved option's own keys and the target group's color", async () => {
    expect(
      (
        await editOption(root, 'prop_st', {
          op: 'move',
          optionId: 'opt_Y',
          groupId: 'g2',
          toIndex: 0,
        })
      ).ok,
    ).toBe(true)
    const defs = await rawDefs()
    expect(defs.prop_st.status_groups![1]).toEqual({
      ...statusSeed[1],
      color: 'grey',
      options: [decoded({ id: 'opt_Y', key: 'Y', label: 'Y' }), ...statusSeed[1].options],
    })
    expect(defs.prop_st.status_groups![0].options).toEqual([
      statusSeed[0].options[0],
      statusSeed[0].options[2],
    ])
  })

  it('resetting a field to its default removes the stored value, whatever its neighbors hold', async () => {
    const file = await readJsonAt<RegistryFile>(registryFile())
    file.defs.prop_sel.select_options = [
      { id: 'opt_A', key: 'A', label: 'A', appearance: 'outline', color: 7, icon: 7 },
      { id: 'opt_B', key: 'B', label: 'B', appearance: 'outline', color: 7, icon: 7 },
      { id: 'opt_C', key: 'C', label: 'C' },
    ]
    file.defs.prop_multi.select_options = [
      { id: 'opt_a', key: 'a', label: 'a', appearance: 'outline' },
    ]
    await writeFile(registryFile(), JSON.stringify(file))
    expect(
      (
        await editOption(root, 'prop_sel', {
          op: 'appearance',
          optionId: 'opt_A',
          appearance: 'filled',
        })
      ).ok,
    ).toBe(true)
    expect((await editOption(root, 'prop_sel', { op: 'recolor', optionId: 'opt_B' })).ok).toBe(true)
    expect(
      (
        await editOption(root, 'prop_multi', {
          op: 'appearance',
          optionId: 'opt_a',
          appearance: 'filled',
        })
      ).ok,
    ).toBe(true)
    const defs = await rawDefs()
    expect(defs.prop_sel.select_options).toEqual([
      { id: 'opt_A', key: 'A', label: 'A' },
      { id: 'opt_B', key: 'B', label: 'B' },
      { id: 'opt_C', key: 'C', label: 'C' },
    ])
    expect(defs.prop_multi.select_options).toEqual([{ id: 'opt_a', key: 'a', label: 'a' }])
  })
})

describe('an option rename keeps every stored label', () => {
  it("one option's rename leaves every other option's label as stored", async () => {
    const registryFile = join(root, '.nexus', 'properties.json')
    await mkdir(join(root, '.nexus'), { recursive: true })
    await writeFile(
      registryFile,
      JSON.stringify({
        order: ['prop_sel', 'prop_st'],
        defs: {
          prop_sel: {
            id: 'prop_sel',
            label: 'Tags',
            key: 'Tags',
            type: 'select',
            select_options: [
              { key: 'a', label: 'A' },
              { key: 'b', label: 'B' },
            ],
          },
          prop_st: {
            id: 'prop_st',
            label: 'Stage',
            key: 'Stage',
            type: 'status',
            status_groups: [
              {
                id: 'g1',
                label: 'One',
                color: 'grey',
                options: [{ key: 'x', label: 'X' }],
              },
              {
                id: 'g2',
                label: 'Two',
                color: 'blue',
                options: [{ key: 'y', label: 'Y' }],
              },
            ],
          },
        },
      }),
    )
    expect((await renameOption(root, 'prop_sel', 'opt_a', 'AA')).ok).toBe(true)
    expect((await renameOption(root, 'prop_st', 'opt_x', 'XX')).ok).toBe(true)
    const defs = (await readJsonAt<RegistryFile>(registryFile)).defs
    expect(defs.prop_sel.select_options).toEqual([
      { id: 'opt_a', key: 'AA', label: 'AA' },
      { id: 'opt_b', key: 'b', label: 'B' },
    ])
    expect(defs.prop_st.status_groups!.map((g) => g.options)).toEqual([
      [{ id: 'opt_x', key: 'XX', label: 'XX' }],
      [{ id: 'opt_y', key: 'y', label: 'Y' }],
    ])
  })
})

describe('option ops refuse a property without options', () => {
  const mkNumber = (): Promise<string> =>
    mkProperty({ label: 'Count', key: 'Count', type: 'number' })

  it('editOption', async () => {
    const id = await mkNumber()
    expect((await editOption(root, id, { op: 'recolor', optionId: 'opt_A' })).ok).toBe(false)
  })
  it('renameOption', async () => {
    const id = await mkNumber()
    expect((await renameOption(root, id, 'opt_A', 'B')).ok).toBe(false)
  })
  it('deleteOption', async () => {
    const id = await mkNumber()
    expect((await deleteOption(root, id, 'opt_A')).ok).toBe(false)
  })
  it('clearOption', async () => {
    const id = await mkNumber()
    expect((await clearOption(root, id, 'opt_A')).ok).toBe(false)
  })
})

describe('renameOption', () => {
  it('an option rename names a page it can’t rewrite and lets it go', async () => {
    const id = await mkSelect([{ id: 'opt_Urgent', key: 'Urgent', label: 'Urgent' }])
    const page = await pageHolding(id, 'Urgent')
    const odd = join(dirname(page), 'Odd.md')
    const text = `---\nID: ${newContentId('page')}\nTags:\n\t- Urgent\n---\nb\n`
    await writeFile(odd, text)
    const r = await renameOption(root, id, 'opt_Urgent', 'Critical')
    if (!r.ok) throw new Error(r.error.message)
    expect(r.value.cascade?.warning).toBe('Couldn’t safely rewrite “Odd”.')
    expect(r.value.cascade).not.toHaveProperty('owed')
    expect(await readNotes(root)).toEqual({})
    expect(await readFile(odd, 'utf8')).toBe(text)
  })

  it('rewrites the def and cascades the value across pages', async () => {
    const id = await mkSelect([{ id: 'opt_Urgent', key: 'Urgent', label: 'Urgent' }])
    const page = await pageHolding(id, 'Urgent')

    const r = await renameOption(root, id, 'opt_Urgent', 'Critical')
    expect(r.ok).toBe(true)
    expect((await readRegistry(root)).defs[id].select_options).toEqual([
      { id: 'opt_Urgent', key: 'Critical', label: 'Critical' },
    ])
    const content = await readFile(page, 'utf8')
    expect(content).toContain('Critical')
    expect(content).not.toContain('Urgent')
  })

  it('writes the new key from the new label through the Value Format, rewriting the pages', async () => {
    const id = await mkProperty({
      label: 'Tags',
      key: 'Tags',
      type: 'select',
      value_format: 'kebab-case',
      select_options: [{ id: 'opt_light-blue', key: 'light-blue', label: 'Light Blue' }],
    })
    const page = await pageHolding(id, 'light-blue')
    expect(await readFile(page, 'utf8')).toContain('light-blue')

    expect((await renameOption(root, id, 'opt_light-blue', 'Dark Blue')).ok).toBe(true)
    expect((await readRegistry(root)).defs[id].select_options).toEqual([
      { id: 'opt_light-blue', key: 'dark-blue', label: 'Dark Blue' },
    ])
    const content = await readFile(page, 'utf8')
    expect(content).toContain('dark-blue')
    expect(content).not.toContain('light-blue')
  })

  it('an adopted word renamed onto the key its Value Format writes keeps its key, leaves its pages, and leaves the views as written', async () => {
    const id = await mkProperty({
      label: 'Tags',
      key: 'Tags',
      type: 'multiSelect',
      value_format: 'kebab-case',
      select_options: [{ id: 'opt_in-progress', key: 'in-progress', label: 'in-progress' }],
    })
    const col = await createFolderEntity(root, 'collection', 'Col', newId())
    if (!col.ok) throw new Error('folder failed')
    await assignProperty(root, col.value.path, id)
    const page = join(col.value.path, 'One.md')
    await writeFile(page, '---\nID: 01ARZ3NDEKPSV4RRFFQ69G5FAV\nTags: [in-progress]\n---\nb\n')
    const surfaces = await seedConfigSurfaces(root, col.value.path, viewOn(id, 'opt_in-progress'))
    const bytes = await readFile(page, 'utf8')
    const mtime = (await stat(page)).mtimeMs

    expect((await renameOption(root, id, 'opt_in-progress', 'In Progress')).ok).toBe(true)
    expect((await readRegistry(root)).defs[id].select_options).toEqual([
      { id: 'opt_in-progress', key: 'in-progress', label: 'In Progress' },
    ])
    expect(await readFile(page, 'utf8')).toBe(bytes)
    expect((await stat(page)).mtimeMs).toBe(mtime)
    expect((await surfaces.read()).collection).toEqual(viewOn(id, 'opt_in-progress'))
  })

  it('rejects a whitespace rename, leaving the option as it was', async () => {
    const id = await mkSelect([{ id: 'opt_Alpha', key: 'Alpha', label: 'Alpha' }])
    const r = await renameOption(root, id, 'opt_Alpha', '  ')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.message).toBe('Option titles can’t be blank.')
    expect((await readRegistry(root)).defs[id].select_options).toEqual([
      { id: 'opt_Alpha', key: 'Alpha', label: 'Alpha' },
    ])
  })

  it('rejects a rename that collides with an existing title (no page writes)', async () => {
    const id = await mkSelect([
      { id: 'opt_A', key: 'A', label: 'A' },
      { id: 'opt_B', key: 'B', label: 'B' },
    ])
    const page = await pageHolding(id, 'A')
    const r = await renameOption(root, id, 'opt_A', 'B')
    expect(r.ok).toBe(false)
    expect(await readFile(page, 'utf8')).toContain('A')
  })

  it('fails for an unknown property id', async () => {
    expect((await renameOption(root, 'prop_nope', 'opt_A', 'B')).ok).toBe(false)
  })

  it('is refused for a value the definition lacks, and rewrites no page', async () => {
    const id = await mkSelect([{ id: 'opt_A', key: 'A', label: 'A' }])
    const page = await pageHolding(id, 'A')
    const key = (await readRegistry(root)).defs[id].key
    await rewriteRootAt(
      page,
      rewriteRoot((raw) => landValue(raw, key, ['Stray'])),
    )
    const stray = await readFile(page, 'utf8')
    expect(stray).toContain('Stray')
    expect(await renameOption(root, id, 'opt_Stray', 'B')).toMatchObject({
      ok: false,
      error: { code: 'not-found' },
    })
    expect(await readFile(page, 'utf8')).toBe(stray)
  })

  it('is refused for an id no option holds', async () => {
    const id = await mkSelect([{ id: 'opt_A', key: 'A', label: 'A' }])
    expect(await renameOption(root, id, 'opt_Gone', 'X')).toMatchObject({
      ok: false,
      error: { code: 'not-found' },
    })
  })

  it('a rename runs on its property’s note, which a clean sweep clears', async () => {
    const id = await mkSelect([{ id: 'opt_Urgent', key: 'Urgent', label: 'Urgent' }])
    vi.mocked(runNoted).mockClear()
    expect((await renameOption(root, id, 'opt_Urgent', 'Critical')).ok).toBe(true)
    expect(runNoted).toHaveBeenCalledWith(root, id, expect.anything())
    expect(await readNotes(root)).toEqual({})
  })

  it('notes every rewritten page once per container for the values:changed push', async () => {
    const id = await mkSelect([{ id: 'opt_A', key: 'A', label: 'A' }])
    const def = (await readRegistry(root)).defs[id]
    for (const [folder, titles] of [
      ['Col', ['One', 'Two']],
      ['Col2', ['Three']],
    ] as const) {
      const col = await createFolderEntity(root, 'collection', folder, newId())
      if (!col.ok) throw new Error('folder failed')
      await assignProperty(root, col.value.path, id)
      for (const title of titles) {
        const p = await createTestPage(col.value.path, title, { body: 'b' })
        if (!p.ok) throw new Error('page failed')
        await rewriteRootAt(
          p.value.path,
          rewriteRoot((raw) => landValue(raw, def.key, ['A'])),
        )
      }
    }
    await openSession(root)
    await refreshTree(root)
    expect((await renameOption(root, id, 'opt_A', 'B')).ok).toBe(true)
    const rels: string[][] = []
    const push = (channel: keyof Pushes, value: unknown): void => {
      if (channel === 'values:changed') rels.push((value as ValueChange[]).map((c) => c.rel))
    }
    await settleNow({ push, watch: async () => {} }, root)
    await settleNow({ push, watch: async () => {} }, root)
    expect(rels).toEqual([['Col', 'Col2']])
    closeSession()
  })
})

describe('deleteOption', () => {
  it('deletes the def option and strips its value from pages', async () => {
    const id = await mkSelect([
      { id: 'opt_A', key: 'A', label: 'A' },
      { id: 'opt_B', key: 'B', label: 'B' },
    ])
    const page = await pageHolding(id, 'A')

    const r = await deleteOption(root, id, 'opt_A')
    expect(r.ok).toBe(true)
    expect((await readRegistry(root)).defs[id].select_options).toEqual([
      { id: 'opt_B', key: 'B', label: 'B' },
    ])
    expect(await readFile(page, 'utf8')).not.toContain(id)
  })

  it('fails for an unknown property id', async () => {
    expect((await deleteOption(root, 'prop_nope', 'opt_A')).ok).toBe(false)
  })
})

describe('each option change keeps its own note', () => {
  const twoOptions = (): Promise<string> =>
    mkSelect([
      { id: 'opt_A', key: 'A', label: 'A' },
      { id: 'opt_C', key: 'C', label: 'C' },
    ])
  const labels = async (id: string): Promise<string[] | undefined> =>
    (await readRegistry(root)).defs[id].select_options?.map((o) => o.label)

  it('an option rename runs while another property owes work', async () => {
    const id = await twoOptions()
    const page = await pageHolding(id, 'A')
    const other = { prop_x: { kind: 'property', rename: ['Old'] } }
    await seedNotes(other)
    expect((await renameOption(root, id, 'opt_A', 'B')).ok).toBe(true)
    expect(splitFrontmatter(await readFile(page, 'utf8')).Tags).toEqual(['B'])
    expect((await clearOption(root, id, 'opt_A')).ok).toBe(true)
    expect(splitFrontmatter(await readFile(page, 'utf8'))).not.toHaveProperty('Tags')
    expect((await deleteOption(root, id, 'opt_C')).ok).toBe(true)
    expect(await labels(id)).toEqual(['B'])
    expect(await readNotes(root)).toEqual(other)
  })

  it('an option rename keeps its part while its property’s rename is owed', async () => {
    const id = await twoOptions()
    await pageHolding(id, 'A')
    await seedNotes({ [id]: { kind: 'property', rename: ['Priority'] } })
    const r = await renameOption(root, id, 'opt_A', 'B')
    expect(r.ok && r.value.cascade?.owed).toBe(true)
    expect(await readNotes(root)).toEqual({
      [id]: { kind: 'property', rename: ['Priority'], options: { opt_A: { rename: ['A'] } } },
    })
  })

  it('Clear sweeps an owed option rename’s old word with its own', async () => {
    const id = await twoOptions()
    const page = await pageHolding(id, 'A')
    const old = await createTestPage(join(page, '..'), 'Old', { body: 'b' })
    if (!old.ok) throw new Error('page failed')
    await rewriteRootAt(
      old.value.path,
      rewriteRoot((raw) => landValue(raw, 'Tags', ['a'])),
    )
    await seedNotes({ [id]: { kind: 'property', options: { opt_A: { rename: ['a'] } } } })
    expect((await clearOption(root, id, 'opt_A')).ok).toBe(true)
    for (const p of [page, old.value.path])
      expect(splitFrontmatter(await readFile(p, 'utf8'))).not.toHaveProperty('Tags')
    expect(await readNotes(root)).toEqual({})
  })

  it.skipIf(noModeBits)('a Clear that misses a page owes it with Try Again', async () => {
    const id = await twoOptions()
    const col = join(await pageHolding(id, 'A'), '..')
    const { page, set } = await lockedPage(col, id, 'A')
    try {
      const r = await clearOption(root, id, 'opt_A')
      expect(r.ok && r.value.cascade?.owed).toBe(true)
    } finally {
      await chmod(set, 0o755)
    }
    expect(await readNotes(root)).toEqual({
      [id]: { kind: 'property', options: { opt_A: { strip: ['A'], kept: true } } },
    })
    await finishOwed(root, deps)
    expect(splitFrontmatter(await readFile(page, 'utf8'))).not.toHaveProperty('Tags')
    expect(await labels(id)).toEqual(['A', 'C'])
    expect(await readNotes(root)).toEqual({})
  })

  it.skipIf(noModeBits)('a Clear’s Try Again leaves a page picked to another option', async () => {
    const id = await twoOptions()
    const col = join(await pageHolding(id, 'A'), '..')
    const { page, set } = await lockedPage(col, id, 'A')
    try {
      await clearOption(root, id, 'opt_A')
    } finally {
      await chmod(set, 0o755)
    }
    await rewriteRootAt(
      page,
      rewriteRoot((raw) => landValue(raw, 'Tags', ['C'])),
    )
    await finishOwed(root, deps)
    expect(splitFrontmatter(await readFile(page, 'utf8')).Tags).toEqual(['C'])
    expect(await readNotes(root)).toEqual({})
  })

  it.skipIf(noModeBits)('registration skips an owed word', async () => {
    const id = await mkProperty({
      label: 'Tags',
      key: 'Tags',
      type: 'multiSelect',
      select_options: [
        { id: 'opt_A', key: 'A', label: 'A' },
        { id: 'opt_C', key: 'C', label: 'C' },
      ],
    })
    const col = join(await pageHolding(id, 'C'), '..')
    const { page, set } = await lockedPage(col, id, 'A')
    try {
      expect((await deleteOption(root, id, 'opt_A')).ok).toBe(true)
    } finally {
      await chmod(set, 0o755)
    }
    expect(splitFrontmatter(await readFile(page, 'utf8')).Tags).toEqual(['A'])
    await openSession(root)
    await refreshTree(root)
    try {
      await registerHeldOptions(root, [page.slice(root.length + 1)])
    } finally {
      closeSession()
    }
    expect(await labels(id)).toEqual(['C'])
  })

  it('renameOption, setValueFormat, and editOption refuse a landing on another option’s owed word', async () => {
    const id = await mkSelect([{ id: 'opt_LB', key: 'Light Blue', label: 'Light Blue' }])
    await seedNotes({
      [id]: { kind: 'property', options: { opt_gone: { strip: ['B', 'light-blue'] } } },
    })
    const def = (await readRegistry(root)).defs[id]
    expect(await renameOption(root, id, 'opt_LB', 'B')).toEqual(OWED)
    expect(await setValueFormat(root, id, 'kebab-case')).toEqual(OWED)
    expect(
      await editOption(root, id, { op: 'add', groupId: SELECT_GROUP, id: 'opt_new', label: 'B' }),
    ).toEqual(OWED)
    expect((await readRegistry(root)).defs[id]).toEqual(def)
  })

  it.skipIf(noModeBits)('an add taking back an owed delete’s word refuses', async () => {
    const id = await twoOptions()
    const col = join(await pageHolding(id, 'C'), '..')
    const { set } = await lockedPage(col, id, 'A')
    try {
      expect((await deleteOption(root, id, 'opt_A')).ok).toBe(true)
    } finally {
      await chmod(set, 0o755)
    }
    const add = { op: 'add' as const, groupId: SELECT_GROUP, id: 'opt_new', label: 'A' }
    expect(await editOption(root, id, add)).toEqual(OWED)
    expect(await labels(id)).toEqual(['C'])
  })

  it.skipIf(noModeBits)(
    'renaming an option whose Clear is owed is refused until the Clear finishes',
    async () => {
      const id = await mkSelect([{ id: 'opt_High', key: 'High', label: 'High' }])
      const col = join(await pageHolding(id, 'High'), '..')
      const { page, set } = await lockedPage(col, id, 'High')
      try {
        await clearOption(root, id, 'opt_High')
      } finally {
        await chmod(set, 0o755)
      }
      expect(await renameOption(root, id, 'opt_High', 'Urgent')).toEqual(OWED)
      expect(splitFrontmatter(await readFile(page, 'utf8')).Tags).toEqual(['High'])
      await finishOwed(root, deps)
      expect((await renameOption(root, id, 'opt_High', 'Urgent')).ok).toBe(true)
      expect(await readFile(page, 'utf8')).not.toContain('Urgent')
      expect(await labels(id)).toEqual(['Urgent'])
    },
  )
})

describe('remove and clear on a value the definition lacks', () => {
  const stray = async (): Promise<{ id: string; page: string; bytes: string }> => {
    const id = await mkSelect([{ id: 'opt_A', key: 'A', label: 'A' }])
    const page = await pageHolding(id, 'A')
    const key = (await readRegistry(root)).defs[id].key
    await rewriteRootAt(
      page,
      rewriteRoot((raw) => landValue(raw, key, ['Stray'])),
    )
    return { id, page, bytes: await readFile(page, 'utf8') }
  }

  it('deleteOption is refused, drops nothing, and rewrites no page', async () => {
    const { id, page, bytes } = await stray()
    expect(await deleteOption(root, id, 'opt_Stray')).toMatchObject({
      ok: false,
      error: { code: 'not-found' },
    })
    expect(await readFile(page, 'utf8')).toBe(bytes)
    expect((await readRegistry(root)).defs[id].select_options).toEqual([
      { id: 'opt_A', key: 'A', label: 'A' },
    ])
  })

  it('clearOption is refused and rewrites no page', async () => {
    const { id, page, bytes } = await stray()
    expect(await clearOption(root, id, 'opt_Stray')).toMatchObject({
      ok: false,
      error: { code: 'not-found' },
    })
    expect(await readFile(page, 'utf8')).toBe(bytes)
  })
})

describe('clearOption', () => {
  it('strips the value from pages but KEEPS the option', async () => {
    const id = await mkSelect([{ id: 'opt_A', key: 'A', label: 'A' }])
    const page = await pageHolding(id, 'A')

    const r = await clearOption(root, id, 'opt_A')
    expect(r.ok).toBe(true)
    expect((await readRegistry(root)).defs[id].select_options).toEqual([
      { id: 'opt_A', key: 'A', label: 'A' },
    ])
    expect(await readFile(page, 'utf8')).not.toContain(id)
  })

  it('fails for an unknown property id', async () => {
    expect((await clearOption(root, 'prop_nope', 'opt_A')).ok).toBe(false)
  })

  it("strips the option's key and leaves a word spelled as its label", async () => {
    const id = await mkSelect([{ id: 'opt_urgent', key: 'urgent', label: 'Urgent' }])
    const col = await createFolderEntity(root, 'collection', 'Col', newId())
    if (!col.ok) throw new Error('folder failed')
    await assignProperty(root, col.value.path, id)
    const keyed = join(col.value.path, 'One.md')
    const labelled = join(col.value.path, 'Two.md')
    await writeFile(keyed, '---\nID: 01ARZ3NDEKPSV4RRFFQ69G5FAV\nTags: urgent\n---\nb\n')
    await writeFile(labelled, '---\nID: 01ARZ3NDEKPSV4RRFFQ69G5FAW\nTags: Urgent\n---\nb\n')
    const before = await readFile(labelled, 'utf8')

    expect((await clearOption(root, id, 'opt_urgent')).ok).toBe(true)
    expect(splitFrontmatter(await readFile(keyed, 'utf8'))).toEqual({
      ID: '01ARZ3NDEKPSV4RRFFQ69G5FAV',
    })
    expect(await readFile(labelled, 'utf8')).toBe(before)
  })

  it.skipIf(noModeBits)('a clear that can’t write a holder warns', async () => {
    const id = await mkSelect([{ id: 'opt_hi', key: 'hi', label: 'hi' }])
    await pageHolding(id, 'hi')
    const set = await createFolderEntity(join(root, 'Col'), 'set', 'Locked', newId())
    if (!set.ok) throw new Error('set failed')
    const p = await createTestPage(set.value.path, 'Two', { body: 'b' })
    if (!p.ok) throw new Error('page failed')
    const def = (await readRegistry(root)).defs[id]
    if (!def) throw new Error('definition missing')
    await rewriteRootAt(
      p.value.path,
      rewriteRoot((raw) => landValue(raw, def.key, ['hi'])),
    )
    await chmod(set.value.path, 0o555)
    try {
      expect(await clearOption(root, id, 'opt_hi')).toEqual(
        ok({ cascade: { pages: [], hosts: [], warning: unsweptLine(1), owed: true } }),
      )
    } finally {
      await chmod(set.value.path, 0o755)
    }
  })
})

describe('optionHolders', () => {
  it('counts the pages and Spaces holding the value, and no holder of another', async () => {
    const id = await mkSelect([
      { id: 'opt_A', key: 'A', label: 'A' },
      { id: 'opt_B', key: 'B', label: 'B' },
    ])
    const files = [
      await pageHolding(id, 'A'),
      await spaceSidecar('Pommora', { id: 'sp1', Tags: ['A', 'B'] }),
      await spaceSidecar('Sapphire', { id: 'sp2', Tags: 'B' }),
    ]
    const before = await Promise.all(files.map((f) => readFile(f, 'utf8')))

    expect(await optionHolders(root, id, 'opt_A')).toEqual(ok(2))
    expect(await optionHolders(root, id, 'opt_B')).toEqual(ok(2))
    expect(await Promise.all(files.map((f) => readFile(f, 'utf8')))).toEqual(before)
  })

  it('is refused for a value the definition lacks', async () => {
    const id = await mkSelect([{ id: 'opt_A', key: 'A', label: 'A' }])
    expect((await optionHolders(root, id, 'opt_Stray')).ok).toBe(false)
  })
})

describe('option cascades reach a Space sidecar', () => {
  it('a rename rewrites a scalar value and a list element', async () => {
    const id = await mkSelect([{ id: 'opt_Urgent', key: 'Urgent', label: 'Urgent' }])
    const scalar = await spaceSidecar('Pommora', { id: 'sp1', Tags: 'Urgent' })
    const list = await spaceSidecar('Sapphire', { id: 'sp2', Tags: ['Urgent', 'Keep'] })

    expect((await renameOption(root, id, 'opt_Urgent', 'Critical')).ok).toBe(true)
    expect((await readJsonAt(scalar)).Tags).toEqual(['Critical'])
    expect((await readJsonAt(list)).Tags).toEqual(['Critical', 'Keep'])
  })

  it('a remove empties a one-element list and the key leaves the sidecar', async () => {
    const id = await mkSelect([
      { id: 'opt_A', key: 'A', label: 'A' },
      { id: 'opt_B', key: 'B', label: 'B' },
    ])
    const file = await spaceSidecar('Pommora', { id: 'sp1', Tags: ['A'], icon: 'box' })

    expect((await deleteOption(root, id, 'opt_A')).ok).toBe(true)
    const raw = await readJsonAt(file)
    expect('Tags' in raw).toBe(false)
    expect(raw.icon).toBe('box')
  })

  it('a sidecar holding neither value is left byte-identical', async () => {
    const id = await mkSelect([{ id: 'opt_A', key: 'A', label: 'A' }])
    const file = await spaceSidecar('Pommora', { id: 'sp1', Tags: ['B'] })
    const bytes = await readFile(file, 'utf8')
    const mtime = (await stat(file)).mtimeMs

    expect((await clearOption(root, id, 'opt_A')).ok).toBe(true)
    expect(await readFile(file, 'utf8')).toBe(bytes)
    expect((await stat(file)).mtimeMs).toBe(mtime)
  })
})

describe('the option cascades reach the Collection stashes', () => {
  async function stashed(): Promise<{
    id: string
    col: string
    pages: { id: string; path: string }[]
    stash: () => Promise<unknown>
  }> {
    const id = await mkSelect([
      { id: 'opt_A', key: 'A', label: 'A' },
      { id: 'opt_B', key: 'B', label: 'B' },
    ])
    const made = await createFolderEntity(root, 'collection', 'Col', newId())
    if (!made.ok) throw new Error('folder failed')
    const col = made.value.path
    await assignProperty(root, col, id)
    const pages = []
    for (const title of ['One', 'Two', 'Three']) {
      const p = await createTestPage(col, title, { body: 'b' })
      if (!p.ok) throw new Error('page failed')
      pages.push(p.value)
    }
    const [p1, p2, p3] = pages.map((p) => p.id)
    const file = sidecarPath(col, 'collection')
    await writeFile(
      file,
      JSON.stringify({
        ...(await readJsonAt(file)),
        property_stash: {
          [id]: { removed_at: STASHED_AT, values: { [p1]: ['A'], [p2]: ['A', 'B'], [p3]: 'B' } },
        },
      }),
    )
    const stash = async () => (await readJsonAt(file)).property_stash
    return { id, col, pages, stash }
  }

  const block = (id: string, values: Record<string, unknown>) => ({
    [id]: { removed_at: STASHED_AT, values },
  })

  it('a rename rewrites every stashed list', async () => {
    const { id, pages, stash } = await stashed()
    const [p1, p2, p3] = pages.map((p) => p.id)
    expect((await renameOption(root, id, 'opt_A', 'Z')).ok).toBe(true)
    expect(await stash()).toEqual(block(id, { [p1]: ['Z'], [p2]: ['Z', 'B'], [p3]: 'B' }))
  })

  it('a removal strips the option from every stashed list', async () => {
    const { id, pages, stash } = await stashed()
    const [, p2, p3] = pages.map((p) => p.id)
    expect((await deleteOption(root, id, 'opt_A')).ok).toBe(true)
    expect(await stash()).toEqual(block(id, { [p2]: ['B'], [p3]: 'B' }))
  })

  it('a removal strips the stash, so a reassign refills no page with the option', async () => {
    const { id, col, pages } = await stashed()
    expect((await deleteOption(root, id, 'opt_A')).ok).toBe(true)
    expect((await unassignProperty(root, col, id)).ok).toBe(true)
    expect((await assignProperty(root, col, id)).ok).toBe(true)
    for (const p of pages) expect(await readFile(p.path, 'utf8')).not.toMatch(/\bA\b/)
    expect(await readFile(pages[2].path, 'utf8')).toMatch(/\bB\b/)
  })

  it('a clear strips the stash, so a reassign refills no page with the option', async () => {
    const { id, col, pages, stash } = await stashed()
    const [, p2, p3] = pages.map((p) => p.id)
    expect(await clearOption(root, id, 'opt_A')).toEqual(ok({ cascade: { pages: [], hosts: [] } }))
    expect(await stash()).toEqual(block(id, { [p2]: ['B'], [p3]: 'B' }))
    expect((await unassignProperty(root, col, id)).ok).toBe(true)
    expect((await assignProperty(root, col, id)).ok).toBe(true)
    for (const p of pages) expect(await readFile(p.path, 'utf8')).not.toMatch(/\bA\b/)
  })

  it('a damaged Collection counts once, as the configuration pass skips it, and the entry stays owed', async () => {
    const { id } = await stashed()
    const other = await createFolderEntity(root, 'collection', 'Other', newId())
    if (!other.ok) throw new Error('folder failed')
    const file = sidecarPath(other.value.path, 'collection')
    await rm(file)
    await mkdir(file)
    const r = await deleteOption(root, id, 'opt_A')
    expect(r.ok && r.value.cascade?.warning).toBe(unsweptLine(1))
    expect(r.ok && r.value.cascade?.owed).toBe(true)
    expect(await readNotes(root)).toEqual({
      [id]: { kind: 'property', options: { opt_A: { strip: ['A'] } } },
    })
  })
})

describe('renameOption on a Status', () => {
  it('rewrites the group option and cascades the value onto assigning pages', async () => {
    const id = await mkStatus()
    const page = await pageHolding(id, 'Open')

    const r = await renameOption(root, id, await optionIdOf(id, 'Open'), 'Started')
    expect(r.ok).toBe(true)
    expect(await statusValues(id)).toContain('Started')
    expect(await statusValues(id)).not.toContain('Open')
    const content = await readFile(page, 'utf8')
    expect(content).toContain('Started')
    expect(content).not.toContain('Open')
  })

  it('rejects a rename colliding with another option value property-wide (no page writes)', async () => {
    const id = await mkStatus()
    const page = await pageHolding(id, 'Open')
    const r = await renameOption(root, id, await optionIdOf(id, 'Open'), 'Active')
    expect(r.ok).toBe(false)
    expect(await readFile(page, 'utf8')).toContain('Open')
  })
})

describe('deleteOption on a Status', () => {
  it('drops the option from its group and strips its value from pages', async () => {
    const id = await mkStatus()
    const page = await pageHolding(id, 'Active')

    const r = await deleteOption(root, id, await optionIdOf(id, 'Active'))
    expect(r.ok).toBe(true)
    expect(await statusValues(id)).not.toContain('Active')
    expect(await readFile(page, 'utf8')).not.toContain(id)
  })
})

describe('clearOption on a Status', () => {
  it('strips the value from pages but KEEPS the option in its group', async () => {
    const id = await mkStatus()
    const page = await pageHolding(id, 'Done')

    const r = await clearOption(root, id, await optionIdOf(id, 'Done'))
    expect(r.ok).toBe(true)
    expect(await statusValues(id)).toContain('Done')
    expect(await readFile(page, 'utf8')).not.toContain(id)
  })
})

describe('option cascades reach saved views', () => {
  const HOME = { host: { kind: 'space', id: 'sp_home' }, ids: [] }

  async function seeded(): Promise<{
    id: string
    col: string
    surfaces: ConfigSurfaces
  }> {
    const id = await mkSelect([
      { id: 'opt_Done', key: 'Done', label: 'Done' },
      { id: 'opt_Todo', key: 'Todo', label: 'Todo' },
    ])
    const page = await pageHolding(id, 'Done')
    const col = join(page, '..')
    return { id, col, surfaces: await seedConfigSurfaces(root, col, viewOn(id, 'opt_Done')) }
  }

  async function lockedHolder(id: string, col: string): Promise<string> {
    const set = await createFolderEntity(col, 'set', 'Locked', newId())
    if (!set.ok) throw new Error('set failed')
    const p = await createTestPage(set.value.path, 'Held', { body: 'b' })
    if (!p.ok) throw new Error('page failed')
    const key = (await readRegistry(root)).defs[id].key
    await rewriteRootAt(
      p.value.path,
      rewriteRoot((raw) => landValue(raw, key, ['Done'])),
    )
    await chmod(set.value.path, 0o555)
    return set.value.path
  }

  it('a rename leaves the Collection, the Set, the tile, and the Matrix as written, its sort order included', async () => {
    const { id, col, surfaces } = await seeded()
    const files = [sidecarPath(col, 'collection'), sidecarPath(surfaces.set, 'set'), surfaces.tiles]
    const before = await Promise.all(files.map((f) => readFile(f, 'utf8')))
    const mtimes = await Promise.all(files.map(async (f) => (await stat(f)).mtimeMs))
    expect(await renameOption(root, id, 'opt_Done', 'Closed')).toEqual(
      ok({ cascade: { pages: [], hosts: [] } }),
    )
    expect(await Promise.all(files.map((f) => readFile(f, 'utf8')))).toEqual(before)
    expect(await Promise.all(files.map(async (f) => (await stat(f)).mtimeMs))).toEqual(mtimes)
    expect((await surfaces.read()).matrix).toEqual(viewOn(id, 'opt_Done').filter)
  })

  const cleared = (id: string) => {
    const held = viewOn(id, 'opt_Done')
    return {
      ...held,
      filter: undefined,
      sort: [{ property_id: id, direction: 'ascending', order: [] }],
      group: { ...(held.group as object), order: [] },
      hidden_groups: [],
      collapsed_groups: [],
    }
  }

  it('a removal strips the value and drops the rule it emptied', async () => {
    const { id, surfaces } = await seeded()
    expect(await deleteOption(root, id, 'opt_Done')).toEqual(
      ok({ cascade: { pages: [], hosts: [HOME] } }),
    )
    const want = cleared(id)
    const views = await surfaces.read()
    expect([views.collection, views.set, views.tile]).toEqual([want, want, want])
    expect(views.matrix).toBeNull()
    expect(await readNotes(root)).toEqual({})
  })

  it.skipIf(noModeBits)(
    'a deletion with a page skip drops the option, clears every view, and owes the page',
    async () => {
      const { id, col, surfaces } = await seeded()
      const locked = await lockedHolder(id, col)
      try {
        expect(await deleteOption(root, id, 'opt_Done')).toEqual(
          ok({ cascade: { pages: [], hosts: [HOME], warning: unsweptLine(1), owed: true } }),
        )
      } finally {
        await chmod(locked, 0o755)
      }
      const views = await surfaces.read()
      const want = cleared(id)
      expect([views.collection, views.set, views.tile]).toEqual([want, want, want])
      expect(await readNotes(root)).toEqual({
        [id]: { kind: 'property', options: { opt_Done: { strip: ['Done'] } } },
      })
      expect((await readRegistry(root)).defs[id].select_options?.map((o) => o.label)).toEqual([
        'Todo',
      ])
    },
  )

  it.skipIf(noModeBits)(
    'a rename with a page skip answers the skip and owes the page, the views as written',
    async () => {
      const { id, col, surfaces } = await seeded()
      const locked = await lockedHolder(id, col)
      try {
        expect(await renameOption(root, id, 'opt_Done', 'Closed')).toEqual(
          ok({ cascade: { pages: [], hosts: [], warning: unsweptLine(1), owed: true } }),
        )
      } finally {
        await chmod(locked, 0o755)
      }
      expect((await surfaces.read()).set).toEqual(viewOn(id, 'opt_Done'))
      expect(await readNotes(root)).toEqual({
        [id]: { kind: 'property', options: { opt_Done: { rename: ['Done'] } } },
      })
    },
  )

  it('a rename to the option’s own key leaves its pages and its views, and notes nothing', async () => {
    const id = await mkSelect([{ id: 'opt_urgent', key: 'urgent', label: 'Urgent' }])
    const page = await pageHolding(id, 'Urgent')
    const surfaces = await seedConfigSurfaces(root, join(page, '..'), viewOn(id, 'opt_urgent'))
    const bytes = await readFile(page, 'utf8')
    vi.mocked(runNoted).mockClear()
    expect((await renameOption(root, id, 'opt_urgent', 'urgent')).ok).toBe(true)
    expect(await readFile(page, 'utf8')).toBe(bytes)
    expect((await surfaces.read()).set).toEqual(viewOn(id, 'opt_urgent'))
    expect(runNoted).not.toHaveBeenCalled()
  })

  it('a pass skip owes the page with the option already dropped', async () => {
    const { id, surfaces } = await seeded()
    const setFile = sidecarPath(surfaces.set, 'set')
    await rm(setFile)
    await mkdir(setFile)
    expect(await deleteOption(root, id, 'opt_Done')).toEqual(
      ok({ cascade: { pages: [], hosts: [HOME], warning: unsweptLine(1), owed: true } }),
    )
    expect(await readNotes(root)).toEqual({
      [id]: { kind: 'property', options: { opt_Done: { strip: ['Done'] } } },
    })
    expect((await readRegistry(root)).defs[id].select_options?.map((o) => o.label)).toEqual([
      'Todo',
    ])
  })

  it('a failed drop strips nothing and puts the entry back', async () => {
    const { id, col } = await seeded()
    const page = join(col, 'One.md')
    const bytes = await readFile(page, 'utf8')
    vi.mocked(mutateRegistry).mockResolvedValueOnce(fault('refused'))
    expect((await deleteOption(root, id, 'opt_Done')).ok).toBe(false)
    expect(await readFile(page, 'utf8')).toBe(bytes)
    expect(await readNotes(root)).toEqual({})
  })

  it('a clear reaches no view', async () => {
    const { id, surfaces } = await seeded()
    expect(await clearOption(root, id, 'opt_Done')).toEqual(
      ok({ cascade: { pages: [], hosts: [] } }),
    )
    const views = await surfaces.read()
    const held = viewOn(id, 'opt_Done')
    expect([views.collection, views.set, views.tile]).toEqual([held, held, held])
    expect(views.matrix).toEqual(held.filter)
  })

  it('a rename and a removal edit files by key and views by id', async () => {
    const id = await mkSelect([{ id: 'opt_urgent', key: 'urgent', label: 'Urgent' }])
    const col = await createFolderEntity(root, 'collection', 'Col', newId())
    if (!col.ok) throw new Error('folder failed')
    await assignProperty(root, col.value.path, id)
    const page = join(col.value.path, 'One.md')
    await writeFile(page, '---\nID: 01ARZ3NDEKPSV4RRFFQ69G5FAV\nTags: [urgent]\n---\nb\n')
    const surfaces = await seedConfigSurfaces(root, col.value.path, viewOn(id, 'opt_urgent'))

    expect((await renameOption(root, id, 'opt_urgent', 'Critical')).ok).toBe(true)
    expect(splitFrontmatter(await readFile(page, 'utf8')).Tags).toEqual(['Critical'])
    expect((await surfaces.read()).collection.filter).toEqual(viewOn(id, 'opt_urgent').filter)

    expect((await deleteOption(root, id, 'opt_urgent')).ok).toBe(true)
    expect(splitFrontmatter(await readFile(page, 'utf8'))).toEqual({
      ID: '01ARZ3NDEKPSV4RRFFQ69G5FAV',
    })
    expect((await surfaces.read()).collection.filter).toBeUndefined()
  })

  it('a removal leaves the views on another option', async () => {
    const id = await mkSelect([
      { id: 'opt_a', key: 'a', label: 'Z' },
      { id: 'opt_B2', key: 'B2', label: 'a' },
    ])
    const col = await createFolderEntity(root, 'collection', 'Col', newId())
    if (!col.ok) throw new Error('folder failed')
    await assignProperty(root, col.value.path, id)
    const surfaces = await seedConfigSurfaces(root, col.value.path, viewOn(id, 'opt_B2'))

    expect((await deleteOption(root, id, 'opt_a')).ok).toBe(true)
    const views = await surfaces.read()
    const held = viewOn(id, 'opt_B2')
    expect([views.collection, views.set, views.tile]).toEqual([held, held, held])
  })
})

const PAGE_ID = '01ARZ3NDEKPSV4RRFFQ69G5FAV'
const SAME_KEY = fail(
  'invalid-property',
  'This format would give two options the same key, please rename one first.',
)
const CROSSED = fail(
  'invalid-property',
  'This format would give one option the key another option writes now, please rename one first.',
)

async function toned(
  select_options: SelectOption[],
  value_format?: KeyFormat,
): Promise<{
  id: string
  page: string
  space: string
  stash: () => Promise<unknown>
  surfaces: ConfigSurfaces
}> {
  const id = await mkProperty({
    label: 'Tones',
    key: 'Tones',
    type: 'multiSelect',
    ...(value_format ? { value_format } : {}),
    select_options,
  })
  const made = await createFolderEntity(root, 'collection', 'Col', newId())
  if (!made.ok) throw new Error('folder failed')
  const col = made.value.path
  await assignProperty(root, col, id)
  const page = join(col, 'One.md')
  const words = select_options.map((o, i) => (i ? `"${o.key}"` : o.key)).join(', ')
  await writeFile(page, `---\nID: ${PAGE_ID}\nTones: [${words}]\n---\nb\n`)
  const file = sidecarPath(col, 'collection')
  await writeFile(
    file,
    JSON.stringify({
      ...(await readJsonAt(file)),
      property_stash: {
        [id]: { removed_at: STASHED_AT, values: { [PAGE_ID]: [select_options[0].key] } },
      },
    }),
  )
  const surfaces = await seedConfigSurfaces(root, col, viewOn(id, select_options[0].id))
  const space = await spaceSidecar('Pommora', { id: 'sp1', Tones: [select_options[0].key] })
  const stash = async () => (await readJsonAt(file)).property_stash
  return { id, page, space, stash, surfaces }
}

const tones = (): Promise<Awaited<ReturnType<typeof toned>>> =>
  toned([
    { id: 'opt_Light%20Blue', key: 'Light Blue', label: 'Light Blue' },
    { id: 'opt_Dark%20Red', key: 'Dark Red', label: 'Dark Red' },
  ])

describe('a Value Format change re-keys every option', () => {
  it('stores the format and every option’s new key, rewriting the files and stashes and leaving configuration', async () => {
    const { id, page, space, stash, surfaces } = await tones()
    const views = await surfaces.read()

    expect(await setValueFormat(root, id, 'kebab-case')).toEqual(
      ok({ cascade: { pages: [], hosts: [] } }),
    )
    const def = (await readRegistry(root)).defs[id]
    expect(def.value_format).toBe('kebab-case')
    expect(def.select_options).toEqual([
      { id: 'opt_Light%20Blue', key: 'light-blue', label: 'Light Blue' },
      { id: 'opt_Dark%20Red', key: 'dark-red', label: 'Dark Red' },
    ])
    expect(await readFile(page, 'utf8')).toContain('Tones: ["light-blue", "dark-red"]')
    expect((await readJsonAt(space)).Tones).toEqual(['light-blue'])
    expect(await stash()).toEqual({
      [id]: { removed_at: STASHED_AT, values: { [PAGE_ID]: ['light-blue'] } },
    })
    expect(await surfaces.read()).toEqual(views)
    expect(await readNotes(root)).toEqual({})
  })

  it('refuses two options the format gives one key, changing nothing', async () => {
    const { id, page } = await toned([
      { id: 'opt_Wifi%20Pro', key: 'Wifi Pro', label: 'Wifi Pro' },
      { id: 'opt_Wifi-Pro', key: 'Wifi-Pro', label: 'Wifi-Pro' },
    ])
    const def = (await readRegistry(root)).defs[id]
    const bytes = await readFile(page, 'utf8')

    expect(await setValueFormat(root, id, 'kebab-case')).toEqual(SAME_KEY)
    expect((await readRegistry(root)).defs[id]).toEqual(def)
    expect(await readFile(page, 'utf8')).toBe(bytes)
    expect(await readNotes(root)).toEqual({})
  })

  it('refuses an option taking the key another option writes now, changing nothing', async () => {
    const { id, page } = await toned(
      [
        { id: 'opt_wifipro', key: 'wifipro', label: 'WifiPro' },
        { id: 'opt_wifi-pro', key: 'wifi-pro', label: 'WiFi-Pro' },
      ],
      'lowercase',
    )
    const def = (await readRegistry(root)).defs[id]
    const bytes = await readFile(page, 'utf8')

    expect(await setValueFormat(root, id, 'kebab-case')).toEqual(CROSSED)
    expect((await readRegistry(root)).defs[id]).toEqual(def)
    expect(await readFile(page, 'utf8')).toBe(bytes)
    expect(await readNotes(root)).toEqual({})
  })

  it('an option whose new key differs from its old one only by padding isn’t a crossing', async () => {
    const { id } = await toned([{ id: 'opt_%20green%20', key: ' green ', label: ' green ' }])
    expect((await setValueFormat(root, id, 'kebab-case')).ok).toBe(true)
    expect((await readRegistry(root)).defs[id].select_options).toEqual([
      expect.objectContaining({ key: 'green', label: ' green ' }),
    ])
  })

  it.skipIf(noModeBits)(
    'an unreadable page owes each option its old word, and Try Again brings the page current',
    async () => {
      const { id, page } = await tones()
      await chmod(page, 0o000)
      try {
        const r = await setValueFormat(root, id, 'kebab-case')
        expect(r.ok && r.value.cascade?.owed).toBe(true)
      } finally {
        await chmod(page, 0o644)
      }
      expect(await readNotes(root)).toEqual({
        [id]: {
          kind: 'property',
          options: {
            'opt_Light%20Blue': { rename: ['Light Blue'] },
            'opt_Dark%20Red': { rename: ['Dark Red'] },
          },
        },
      })
      await finishOwed(root, deps)
      expect(splitFrontmatter(await readFile(page, 'utf8')).Tones).toEqual([
        'light-blue',
        'dark-red',
      ])
      expect(await readNotes(root)).toEqual({})
    },
  )

  it('Match Title over keys equal to their labels keeps every option and writes no holder', async () => {
    const { id, page, space } = await tones()
    const options = (await readRegistry(root)).defs[id].select_options
    const bytes = await Promise.all([page, space].map((f) => readFile(f, 'utf8')))
    const mtimes = await Promise.all([page, space].map(async (f) => (await stat(f)).mtimeMs))

    expect((await setValueFormat(root, id, 'Match Title')).ok).toBe(true)
    expect((await readRegistry(root)).defs[id]).toMatchObject({
      value_format: 'Match Title',
      select_options: options,
    })
    expect(await readNotes(root)).toEqual({})
    expect(await Promise.all([page, space].map((f) => readFile(f, 'utf8')))).toEqual(bytes)
    expect(await Promise.all([page, space].map(async (f) => (await stat(f)).mtimeMs))).toEqual(
      mtimes,
    )
  })

  it('refuses a property without options', async () => {
    const id = await mkProperty({ label: 'Notes', key: 'Notes', type: 'text' })
    expect(await setValueFormat(root, id, 'kebab-case')).toEqual(
      fail(
        'invalid-property',
        'Options can only be edited on a Select, Multi-Select, or Status property.',
      ),
    )
  })
})

describe('valueFormatHolders', () => {
  it('counts the page and the Space a format change rewrites, writing neither', async () => {
    const { id, page, space } = await tones()
    const bytes = await Promise.all([page, space].map((f) => readFile(f, 'utf8')))

    expect(await valueFormatHolders(root, id, 'kebab-case')).toEqual(ok(2))
    expect(await Promise.all([page, space].map((f) => readFile(f, 'utf8')))).toEqual(bytes)
  })

  it('answers the crossing refusal', async () => {
    const { id } = await toned(
      [
        { id: 'opt_wifipro', key: 'wifipro', label: 'WifiPro' },
        { id: 'opt_wifi-pro', key: 'wifi-pro', label: 'WiFi-Pro' },
      ],
      'lowercase',
    )
    expect(await valueFormatHolders(root, id, 'kebab-case')).toEqual(CROSSED)
  })

  it('counts nothing for Match Title over keys equal to their labels', async () => {
    const { id } = await tones()
    expect(await valueFormatHolders(root, id, 'Match Title')).toEqual(ok(0))
  })
})

describe('unregisteredMembers', () => {
  const def = (over: Partial<PropertyDefinition>): PropertyDefinition =>
    ({ id: 'p', label: 'P', key: 'P', type: 'select', ...over }) as PropertyDefinition
  const multiSelectOf = (...values: string[]): PropertyDefinition =>
    def({
      type: 'multiSelect',
      select_options: values.map((value) => ({ id: `opt_${value}`, key: value, label: value })),
    })
  const keyedMulti = def({
    type: 'multiSelect',
    select_options: [
      { id: 'opt_done', key: 'done', label: 'Done' },
      { id: 'opt_in-progress', key: 'in-progress', label: 'In Progress' },
    ],
  })
  const labels = def({
    type: 'multiSelect',
    select_options: [
      { id: 'opt_Claude', key: 'Claude', label: 'Claude' },
      { id: 'opt_Docs', key: 'Docs', label: 'Docs' },
    ],
  })

  it('unregisteredMembers answers each word no option claims without regard to case, once by fold', () => {
    expect(unregisteredMembers(labels, ['CLAUDE', 'Ideas', 'ideas'])).toEqual(['Ideas'])
    expect(unregisteredMembers(multiSelectOf('red', 'blue'), ['green', 'Red', 'PURPLE'])).toEqual([
      'green',
      'PURPLE',
    ])
  })

  it('unregisteredMembers subtracts every word whose fold an option’s label or key holds', () => {
    expect(unregisteredMembers(keyedMulti, ['IN-PROGRESS', 'done', 'DONE', 'new'])).toEqual(['new'])
  })

  it('unregisteredMembers answers only the words the Value Format could have written', () => {
    const under = (value_format: KeyFormat, ...values: string[]): PropertyDefinition => ({
      ...multiSelectOf(...values),
      value_format,
    })
    expect(
      unregisteredMembers(under('lowercase', 'red', 'blue'), ['green', 'PURPLE', 'Red']),
    ).toEqual(['green'])
    expect(unregisteredMembers(under('kebab-case'), ['due_date', 'in-progress'])).toEqual([
      'in-progress',
    ])
    expect(unregisteredMembers(under('PascalCase'), ['AB', 'J.Crew', 'Red'])).toEqual(['Red'])
    expect(unregisteredMembers(under('lowercase'), ['Green', 'green'])).toEqual(['green'])
    expect(unregisteredMembers(under('lowercase'), [' green '])).toEqual([' green '])
  })
})

describe('registerHeldOptions', () => {
  it('a settle registers the word an own write added from the index, reading no page', async () => {
    installStores(memoryStores().stores)
    const id = await mkProperty({
      label: 'Tags',
      key: 'Tags',
      type: 'multiSelect',
      select_options: [{ id: 'opt_A', key: 'A', label: 'A' }],
    })
    const page = await pageHolding(id, 'A')
    await openSession(root)
    await refreshTree(root)
    await seedContentIndex(root)
    try {
      await rewriteRootAt(
        page,
        rewriteRoot((raw) => landValue(raw, 'Tags', ['A', 'Fresh'])),
      )
      const reads = vi.spyOn(machine(), 'readText')
      await settleNow({ push: () => {}, watch: async () => {} }, root)
      expect(reads.mock.calls.filter(([path]) => path === page)).toEqual([])
    } finally {
      closeSession()
      installStores(NO_STORES)
    }
    expect(optionsOf((await readRegistry(root)).defs[id]).map((o) => o.label)).toEqual([
      'A',
      'Fresh',
    ])
  })
})

describe('an option rename with the index warm', () => {
  beforeEach(() => installStores(memoryStores().stores))
  afterEach(() => {
    closeSession()
    installStores(NO_STORES)
  })

  it('rewrites a page whose file took the word since the index read it', async () => {
    const id = await mkSelect([
      { id: 'opt_Urgent', key: 'Urgent', label: 'Urgent' },
      { id: 'opt_Other', key: 'Other', label: 'Other' },
    ])
    const col = await createFolderEntity(root, 'collection', 'Col', newId())
    if (!col.ok) throw new Error('folder failed')
    await assignProperty(root, col.value.path, id)
    const p = await createTestPage(col.value.path, 'P0', { body: 'b' })
    if (!p.ok) throw new Error('page failed')
    const page = p.value.path
    await rewriteRootAt(
      page,
      rewriteRoot((raw) => landValue(raw, 'Tags', ['Other'])),
    )
    await openSession(root)
    await refreshTree(root)
    await seedContentIndex(root)
    await writeFile(page, (await readFile(page, 'utf8')).replace('Other', 'Urgent'))
    expect((await renameOption(root, id, 'opt_Urgent', 'Critical')).ok).toBe(true)
    expect(await readFile(page, 'utf8')).toContain('Critical')
  })
})

const defOf = (key: string) => ({ key, type: key === 'M' ? 'multiSelect' : 'select' }) as const

const strip = (raw: Json, key: string, value: string): Json | null =>
  valueEditRewrite(defOf(key), new Map([[value, null]]))(raw, 'p.md')

const replace = (raw: Json, key: string, oldValue: string, newValue: string): Json | null =>
  valueEditRewrite(defOf(key), new Map([[oldValue, newValue]]))(raw, 'p.md')

describe('valueEditRewrite — strip', () => {
  it('select: deletes the key iff the value matches', () => {
    const hit = strip({ id: 'p1', S: 'Urgent' }, 'S', 'Urgent')
    expect(hit).toEqual({ id: 'p1' })
    expect(strip({ id: 'p1', S: 'Other' }, 'S', 'Urgent')).toBeNull()
  })

  it('multiSelect: filters the array, deletes the key only when empty', () => {
    expect(strip({ M: ['a', 'x', 'b'] }, 'M', 'x')).toEqual({ M: ['a', 'b'] })
    expect(strip({ M: ['x'] }, 'M', 'x')).toEqual({})
  })

  it('multiSelect: preserves foreign (non-string) array elements it never targeted', () => {
    expect(strip({ M: ['x', 5, 'keep'] }, 'M', 'x')).toEqual({ M: [5, 'keep'] })
  })
})

describe('the option list is the one shape', () => {
  it('a list-shaped Select or Status value is renamed and stripped in place', () => {
    expect(replace({ Status: ['Active'] }, 'Status', 'Active', 'Live')).toEqual({
      Status: ['Live'],
    })
    expect(strip({ Status: ['Active'] }, 'Status', 'Active')).toEqual({})
  })

  it('a YAML number names the option it spells, and the rewrite spells it back as a string', () => {
    expect(replace({ Year: [2024] }, 'Year', '2024', 'FY2024')).toEqual({ Year: ['FY2024'] })
    expect(strip({ Year: 2024 }, 'Year', '2024')).toEqual({})
    expect(strip({ Year: 2025 }, 'Year', '2024')).toBeNull()
  })

  it('a scalar written from outside rewrites to a list of one', () => {
    expect(replace({ Status: 'Active' }, 'Status', 'Active', 'Live')).toEqual({ Status: ['Live'] })
  })
})

describe('valueEditRewrite — replace (rename cascade)', () => {
  it('select: swaps the matching value', () => {
    expect(replace({ S: 'Urgent' }, 'S', 'Urgent', 'Critical')).toEqual({ S: ['Critical'] })
  })

  it('multiSelect: swaps one element in place', () => {
    expect(replace({ M: ['a', 'x'] }, 'M', 'x', 'y')).toEqual({ M: ['a', 'y'] })
  })

  it('multiSelect: preserves foreign elements when swapping', () => {
    expect(replace({ M: ['x', 5] }, 'M', 'x', 'y')).toEqual({ M: ['y', 5] })
  })

  it('multiSelect: renaming into a value already present merges, never duplicates', () => {
    expect(replace({ M: ['x', 'y'] }, 'M', 'x', 'y')).toEqual({ M: ['y'] })
  })

  it('returns null when the holder does not hold the value', () => {
    expect(replace({ S: 'Other' }, 'S', 'Urgent', 'Critical')).toBeNull()
  })
})
