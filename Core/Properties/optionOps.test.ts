import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { rewriteRaw, rewriteRootAt } from '../Nexus/governedRoot'
import { landValue } from '../Files/rootValues'
import { chmod, mkdir, rm, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { noModeBits, seedSpaceSidecar, readJsonAt, tempRoot } from '../Testing/hostFs'
import { fail, fault, ok } from '../Contract/result'
import {
  editOption,
  optionHolders,
  renameOption,
  removeOption,
  clearOption,
  setValueFormat,
  unregisteredMembers,
  valueEditRewrite,
  valueFormatHolders,
} from './optionOps'
import type { KeyFormat } from './keyFormat'
import { replaySchemaCascade } from './replaySchemaCascade'
import { createProperty, editProperty } from './registryProperty'
import { assignProperty } from './assignment'
import { removeProperty } from './removeProperty'
import { createFolderEntity } from '../Nexus/folderEntity'
import { newId } from '../Nexus/ids'
import { createTestPage } from '../Testing/createTestPage'
import { mutateRegistry, readRegistry, serializeSchemaOp } from './propertiesRegistry'

type PropDefLike = Record<string, unknown> & {
  select_options?: unknown[]
  status_groups?: { options: unknown[] }[]
  type?: string
}
type RegistryFile = { order: string[]; defs: Record<string, PropDefLike> }
import { readSchemaJournal, type SchemaJournal, writeSchemaJournal } from './propertyJournal'
import { unsweptLine } from '../Nexus/entities'
import { type ConfigSurfaces, seedConfigSurfaces, viewOn } from '../Testing/configSurfaces'
import { sidecarPath } from '../Paths/paths'
import { splitFrontmatter } from '../Files/pageFile'
import { type PropertyDefinition, SELECT_GROUP, type SelectOption } from './properties'
import { settleNow } from '../Nexus/settle'
import type { ValueChange } from '../Nexus/tree'
import type { Pushes } from '../Contract/bridge'
import { closeSession, openSession } from '../Nexus/session'
import { refreshTree } from '../Nexus/liveTree'
import type { Json } from '../Files/stableJson'

vi.mock('./propertiesRegistry', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./propertiesRegistry')>()
  return { ...mod, mutateRegistry: vi.fn(mod.mutateRegistry) }
})

vi.mock('./propertyJournal', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./propertyJournal')>()
  return { ...mod, writeSchemaJournal: vi.fn(mod.writeSchemaJournal) }
})

let root: string
beforeEach(async () => {
  root = tempRoot('pom-opt-')
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

async function mkProperty(def: Omit<PropertyDefinition, 'id'>): Promise<string> {
  const c = await createProperty(root, { id: '', ...def })
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
    rewriteRaw((raw) => landValue(raw, def.key, [value])),
  )
  return p.value.path
}

const spaceSidecar = (name: string, raw: Record<string, unknown>): Promise<string> =>
  seedSpaceSidecar(root, 'Projects', name, raw)

async function statusValues(id: string): Promise<string[]> {
  const def = (await readRegistry(root)).defs[id]
  return (def.status_groups ?? []).flatMap((g) => g.options.map((o) => o.label))
}

describe('editOption', () => {
  it('an emptied options list survives an unrelated property edit — no phantom re-seed', async () => {
    const id = await mkSelect([{ key: 'A', label: 'A' }])
    expect((await removeOption(root, id, 'A')).ok).toBe(true)
    expect((await readRegistry(root)).defs[id].select_options).toEqual([])
    await editProperty(root, id, { icon: 'tag' })
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
      await editOption(root, id, { op: 'add', groupId: 'select', label: 'Light Blue' }),
    ).toEqual(ok(null))
    expect((await readRegistry(root)).defs[id].select_options).toEqual([
      { key: 'light-blue', label: 'Light Blue' },
    ])
  })

  it('add refuses a title another option holds', async () => {
    const id = await mkSelect([{ key: 'A', label: 'A' }])
    const r = await editOption(root, id, { op: 'add', groupId: 'select', label: 'A' })
    expect(r.ok).toBe(false)
    expect((await readRegistry(root)).defs[id].select_options).toEqual([{ key: 'A', label: 'A' }])
  })

  it('add refuses a blank or whitespace title', async () => {
    const id = await mkSelect([{ key: 'A', label: 'A' }])
    for (const label of ['', '  ']) {
      const r = await editOption(root, id, { op: 'add', groupId: SELECT_GROUP, label })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.message).toBe('Option titles can’t be blank.')
    }
    expect((await readRegistry(root)).defs[id].select_options).toEqual([{ key: 'A', label: 'A' }])
  })

  it('fails for an unknown property id', async () => {
    expect((await editOption(root, 'prop_nope', { op: 'recolor', option: 'A' })).ok).toBe(false)
  })

  it('serializes on the schema lock — queues behind an in-flight schema op, never interleaving', async () => {
    const id = await mkSelect([{ key: 'A', label: 'A' }])
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
    const fast = editOption(root, id, { op: 'add', groupId: 'select', label: 'B' }).then(() =>
      order.push('editOption'),
    )
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
    const id = await mkSelect([{ key: 'A', label: 'A' }])
    const r = await editOption(root, id, { op: 'relabelGroup', groupId: 'select', label: 'Named' })
    expect(r).toMatchObject({ ok: false, error: { code: 'not-found' } })
    expect((await readRegistry(root)).defs[id].select_options).toEqual([{ key: 'A', label: 'A' }])
  })

  it('a definition stored with a blank option takes an added option, written without the blank', async () => {
    const id = await mkSelect([{ key: 'A', label: 'A' }])
    await mutateRegistry(root, (registry) => {
      ;(registry.defs[id] as PropDefLike).select_options = [
        { key: 'A', label: 'A' },
        { key: ' ', label: ' ' },
      ]
      return { registry, result: null }
    })
    expect((await editOption(root, id, { op: 'add', groupId: SELECT_GROUP, label: 'B' })).ok).toBe(
      true,
    )
    expect((await readRegistry(root)).defs[id].select_options).toEqual([
      { key: 'A', label: 'A' },
      { key: 'B', label: 'B' },
    ])
  })

  it('add and move are refused for a group the definition lacks', async () => {
    const id = await mkStatus()
    const before = await statusValues(id)
    expect(await editOption(root, id, { op: 'add', groupId: 'nope', label: 'X' })).toMatchObject({
      ok: false,
      error: { code: 'not-found' },
    })
    expect(
      await editOption(root, id, { op: 'move', option: 'Open', groupId: 'nope', toIndex: 0 }),
    ).toMatchObject({ ok: false, error: { code: 'not-found' } })
    expect(await statusValues(id)).toEqual(before)
  })
})

describe('a definition stored with options that carry no label', () => {
  it('takes a recolor on a labelled option, storing every option with its label', async () => {
    const id = await mkSelect([{ key: 'a', label: 'a' }])
    const file = join(root, '.nexus', 'properties.json')
    const raw = await readJsonAt<{ defs: Record<string, PropDefLike> }>(file)
    raw.defs[id].select_options = [{ key: 'a' }, { key: 'b' }, { key: 'c', label: 'C' }]
    await writeFile(file, JSON.stringify(raw))
    expect((await editOption(root, id, { op: 'recolor', option: 'C', color: 'red' })).ok).toBe(true)
    const after = await readJsonAt<{ defs: Record<string, PropDefLike> }>(file)
    expect(after.defs[id].select_options).toEqual([
      { key: 'a', label: 'a' },
      { key: 'b', label: 'b' },
      { key: 'c', label: 'C', color: 'red' },
    ])
  })
})

describe('a definition stored with two options that fold alike', () => {
  it('takes an added option, written with the first of the pair alone', async () => {
    const id = await mkSelect([{ key: 'alpha', label: 'alpha' }])
    const file = join(root, '.nexus', 'properties.json')
    const raw = await readJsonAt<{ defs: Record<string, PropDefLike> }>(file)
    raw.defs[id].select_options = [
      { key: 'alpha', label: 'alpha' },
      { key: 'Alpha', label: 'Alpha' },
    ]
    await writeFile(file, JSON.stringify(raw))
    expect((await editOption(root, id, { op: 'add', groupId: 'select', label: 'beta' })).ok).toBe(
      true,
    )
    const after = await readJsonAt<{ defs: Record<string, PropDefLike> }>(file)
    expect(after.defs[id].select_options).toEqual([
      { key: 'alpha', label: 'alpha' },
      { key: 'beta', label: 'beta' },
    ])
  })
})

describe('a rename followed by a registry-only edit', () => {
  it('an edit still addressed to the old value is refused, and the new title holds in the registry and on the page', async () => {
    const id = await mkSelect([{ key: 'Urgent', label: 'Urgent' }])
    const page = await pageHolding(id, 'Urgent')
    const rename = renameOption(root, id, 'Urgent', 'Critical')
    const recolor = editOption(root, id, { op: 'recolor', option: 'Urgent', color: 'red' })
    const [renamed, recolored] = await Promise.all([rename, recolor])
    expect(renamed.ok).toBe(true)
    expect(recolored).toMatchObject({ ok: false, error: { code: 'not-found' } })
    expect((await readRegistry(root)).defs[id].select_options).toEqual([
      { key: 'Critical', label: 'Critical' },
    ])
    const content = await readFile(page, 'utf8')
    expect(content).toContain('Critical')
    expect(content).not.toContain('Urgent')
  })

  it('an edit addressed to the new title lands on it', async () => {
    const id = await mkSelect([{ key: 'Urgent', label: 'Urgent' }])
    const page = await pageHolding(id, 'Urgent')
    const rename = renameOption(root, id, 'Urgent', 'Critical')
    const recolor = editOption(root, id, { op: 'recolor', option: 'Critical', color: 'red' })
    const [renamed, recolored] = await Promise.all([rename, recolor])
    expect(renamed.ok).toBe(true)
    expect(recolored.ok).toBe(true)
    expect((await readRegistry(root)).defs[id].select_options).toEqual([
      { key: 'Critical', label: 'Critical', color: 'red' },
    ])
    expect(await readFile(page, 'utf8')).toContain('Critical')
  })
})

describe('an option edit leaves every other stored entry as written', () => {
  const selectSeed = [
    { key: 'A', label: 'A' },
    { key: 'B', label: 'B', appearance: 'outline', icon: 7, tint: 'x' },
    { key: 'C', label: 'C' },
  ]
  const statusSeed = [
    {
      id: 'g1',
      label: 'One',
      color: 'grey',
      options: [
        { key: 'X', label: 'X', group_id: 'g1' },
        { key: 'Y', label: 'Y', group_id: 'g1', appearance: 'outline', icon: 7, tint: 'x' },
        { key: 'W', label: 'W', group_id: 'g1' },
      ],
    },
    { id: 'g2', label: 'Two', color: 42, options: [{ key: 'Z', label: 'Z', group_id: 'g2' }] },
  ]
  const multiSeed = [
    { key: 'a', label: 'a' },
    { key: 'b', label: 'b', appearance: 'outline', icon: 7, tint: 'x' },
  ]
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
      (await editOption(root, 'prop_sel', { op: 'recolor', option: 'A', color: 'red' })).ok,
    ).toBe(true)
    expect(
      (await editOption(root, 'prop_st', { op: 'recolor', option: 'X', color: 'red' })).ok,
    ).toBe(true)
    expect((await renameOption(root, 'prop_sel', 'A', 'AA')).ok).toBe(true)
    expect((await renameOption(root, 'prop_st', 'X', 'XX')).ok).toBe(true)
    expect((await removeOption(root, 'prop_sel', 'C')).ok).toBe(true)
    expect((await removeOption(root, 'prop_st', 'W')).ok).toBe(true)
    expect(
      (await editOption(root, 'prop_multi', { op: 'add', groupId: SELECT_GROUP, label: 'c' })).ok,
    ).toBe(true)
    const defs = await rawDefs()
    expect(defs.prop_sel.select_options).toEqual([
      { key: 'AA', label: 'AA', color: 'red' },
      selectSeed[1],
    ])
    expect(defs.prop_st.status_groups).toEqual([
      {
        ...statusSeed[0],
        options: [
          { key: 'XX', label: 'XX', group_id: 'g1', color: 'red' },
          statusSeed[0].options[1],
        ],
      },
      statusSeed[1],
    ])
    expect(defs.prop_multi.select_options).toEqual([...multiSeed, { key: 'c', label: 'c' }])
  })

  it("a move keeps the moved option's own keys and the target group's color", async () => {
    expect(
      (await editOption(root, 'prop_st', { op: 'move', option: 'Y', groupId: 'g2', toIndex: 0 }))
        .ok,
    ).toBe(true)
    const defs = await rawDefs()
    expect(defs.prop_st.status_groups![1]).toEqual({
      ...statusSeed[1],
      options: [{ ...statusSeed[0].options[1], group_id: 'g2' }, ...statusSeed[1].options],
    })
    expect(defs.prop_st.status_groups![0].options).toEqual([
      statusSeed[0].options[0],
      statusSeed[0].options[2],
    ])
  })

  it('resetting a field to its default removes the stored value, whatever its neighbors hold', async () => {
    const file = await readJsonAt<RegistryFile>(registryFile())
    file.defs.prop_sel.select_options = [
      { key: 'A', label: 'A', appearance: 'outline', color: 7, icon: 7 },
      { key: 'B', label: 'B', appearance: 'outline', color: 7, icon: 7 },
      { key: 'C', label: 'C' },
    ]
    file.defs.prop_multi.select_options = [{ key: 'a', label: 'a', appearance: 'outline' }]
    await writeFile(registryFile(), JSON.stringify(file))
    expect(
      (await editOption(root, 'prop_sel', { op: 'appearance', option: 'A', appearance: 'filled' }))
        .ok,
    ).toBe(true)
    expect((await editOption(root, 'prop_sel', { op: 'recolor', option: 'B' })).ok).toBe(true)
    expect(
      (
        await editOption(root, 'prop_multi', {
          op: 'appearance',
          option: 'a',
          appearance: 'filled',
        })
      ).ok,
    ).toBe(true)
    const defs = await rawDefs()
    expect(defs.prop_sel.select_options).toEqual([
      { key: 'A', label: 'A', color: 7, icon: 7 },
      { key: 'B', label: 'B', appearance: 'outline', icon: 7 },
      { key: 'C', label: 'C' },
    ])
    expect(defs.prop_multi.select_options).toEqual([{ key: 'a', label: 'a' }])
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
                options: [{ key: 'x', label: 'X', group_id: 'g1' }],
              },
              {
                id: 'g2',
                label: 'Two',
                color: 'blue',
                options: [{ key: 'y', label: 'Y', group_id: 'g2' }],
              },
            ],
          },
        },
      }),
    )
    expect((await renameOption(root, 'prop_sel', 'A', 'AA')).ok).toBe(true)
    expect((await renameOption(root, 'prop_st', 'X', 'XX')).ok).toBe(true)
    const defs = (await readJsonAt<RegistryFile>(registryFile)).defs
    expect(defs.prop_sel.select_options).toEqual([
      { key: 'AA', label: 'AA' },
      { key: 'b', label: 'B' },
    ])
    expect(defs.prop_st.status_groups!.map((g) => g.options)).toEqual([
      [{ key: 'XX', label: 'XX', group_id: 'g1' }],
      [{ key: 'y', label: 'Y', group_id: 'g2' }],
    ])
  })
})

describe('option ops refuse a property without options', () => {
  const mkNumber = (): Promise<string> =>
    mkProperty({ label: 'Count', key: 'Count', type: 'number' })

  it('editOption', async () => {
    const id = await mkNumber()
    expect((await editOption(root, id, { op: 'recolor', option: 'A' })).ok).toBe(false)
  })
  it('renameOption', async () => {
    const id = await mkNumber()
    expect((await renameOption(root, id, 'A', 'B')).ok).toBe(false)
  })
  it('removeOption', async () => {
    const id = await mkNumber()
    expect((await removeOption(root, id, 'A')).ok).toBe(false)
  })
  it('clearOption', async () => {
    const id = await mkNumber()
    expect((await clearOption(root, id, 'A')).ok).toBe(false)
  })
})

describe('renameOption', () => {
  it('rewrites the def and cascades the value across pages', async () => {
    const id = await mkSelect([{ key: 'Urgent', label: 'Urgent' }])
    const page = await pageHolding(id, 'Urgent')

    const r = await renameOption(root, id, 'Urgent', 'Critical')
    expect(r.ok).toBe(true)
    expect((await readRegistry(root)).defs[id].select_options).toEqual([
      { key: 'Critical', label: 'Critical' },
    ])
    const content = await readFile(page, 'utf8')
    expect(content).toContain('Critical')
    expect(content).not.toContain('Urgent')
  })

  it('rewrites only the exact keys, leaving another casing of each as written', async () => {
    const status = await mkProperty({
      label: 'Status',
      key: 'Status',
      type: 'select',
      select_options: [{ key: 'Done', label: 'Done' }],
    })
    const tags = await mkProperty({
      label: 'Tags',
      key: 'Tags',
      type: 'multiSelect',
      select_options: [{ key: 'Done', label: 'Done' }],
    })
    const col = await createFolderEntity(root, 'collection', 'Col', newId())
    if (!col.ok) throw new Error('folder failed')
    await assignProperty(root, col.value.path, status)
    await assignProperty(root, col.value.path, tags)
    const page = join(col.value.path, 'One.md')
    await writeFile(
      page,
      '---\nID: 01ARZ3NDEKPSV4RRFFQ69G5FAV\nstatus: Done\nTags: [Done, Keep]\ntags: [Done]\n---\nb\n',
    )

    expect((await renameOption(root, status, 'Done', 'Finished')).ok).toBe(true)
    expect((await renameOption(root, tags, 'Done', 'Finished')).ok).toBe(true)
    expect(splitFrontmatter(await readFile(page, 'utf8'))).toEqual({
      ID: '01ARZ3NDEKPSV4RRFFQ69G5FAV',
      status: 'Done',
      Tags: ['Finished', 'Keep'],
      tags: ['Done'],
    })
  })

  it('writes the new key from the new label through the Value Format, rewriting the pages', async () => {
    const id = await mkProperty({
      label: 'Tags',
      key: 'Tags',
      type: 'select',
      value_format: 'kebab-case',
      select_options: [{ key: 'light-blue', label: 'Light Blue' }],
    })
    const page = await pageHolding(id, 'light-blue')
    expect(await readFile(page, 'utf8')).toContain('light-blue')

    expect((await renameOption(root, id, 'Light Blue', 'Dark Blue')).ok).toBe(true)
    expect((await readRegistry(root)).defs[id].select_options).toEqual([
      { key: 'dark-blue', label: 'Dark Blue' },
    ])
    const content = await readFile(page, 'utf8')
    expect(content).toContain('dark-blue')
    expect(content).not.toContain('light-blue')
  })

  it('an adopted word renamed onto the key its Value Format writes keeps its key, leaves its pages, and relabels the views', async () => {
    const id = await mkProperty({
      label: 'Tags',
      key: 'Tags',
      type: 'multiSelect',
      value_format: 'kebab-case',
      select_options: [{ key: 'in-progress', label: 'in-progress' }],
    })
    const col = await createFolderEntity(root, 'collection', 'Col', newId())
    if (!col.ok) throw new Error('folder failed')
    await assignProperty(root, col.value.path, id)
    const page = join(col.value.path, 'One.md')
    await writeFile(page, '---\nID: 01ARZ3NDEKPSV4RRFFQ69G5FAV\nTags: [in-progress]\n---\nb\n')
    const surfaces = await seedConfigSurfaces(root, col.value.path, viewOn(id, 'in-progress'))
    const bytes = await readFile(page, 'utf8')
    const mtime = (await stat(page)).mtimeMs

    expect((await renameOption(root, id, 'in-progress', 'In Progress')).ok).toBe(true)
    expect((await readRegistry(root)).defs[id].select_options).toEqual([
      { key: 'in-progress', label: 'In Progress' },
    ])
    expect(await readFile(page, 'utf8')).toBe(bytes)
    expect((await stat(page)).mtimeMs).toBe(mtime)
    expect((await surfaces.read()).collection).toEqual(viewOn(id, 'In Progress'))
  })

  it('rejects a whitespace rename, leaving the option as it was', async () => {
    const id = await mkSelect([{ key: 'Alpha', label: 'Alpha' }])
    const r = await renameOption(root, id, 'Alpha', '  ')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.message).toBe('Option titles can’t be blank.')
    expect((await readRegistry(root)).defs[id].select_options).toEqual([
      { key: 'Alpha', label: 'Alpha' },
    ])
  })

  it('rejects a rename that collides with an existing title (no page writes)', async () => {
    const id = await mkSelect([
      { key: 'A', label: 'A' },
      { key: 'B', label: 'B' },
    ])
    const page = await pageHolding(id, 'A')
    const r = await renameOption(root, id, 'A', 'B')
    expect(r.ok).toBe(false)
    expect(await readFile(page, 'utf8')).toContain('A')
  })

  it('fails for an unknown property id', async () => {
    expect((await renameOption(root, 'prop_nope', 'A', 'B')).ok).toBe(false)
  })

  it('is refused for a value the definition lacks, and rewrites no page', async () => {
    const id = await mkSelect([{ key: 'A', label: 'A' }])
    const page = await pageHolding(id, 'A')
    const key = (await readRegistry(root)).defs[id].key
    await rewriteRootAt(
      page,
      rewriteRaw((raw) => landValue(raw, key, ['Stray'])),
    )
    const stray = await readFile(page, 'utf8')
    expect(stray).toContain('Stray')
    expect(await renameOption(root, id, 'Stray', 'B')).toMatchObject({
      ok: false,
      error: { code: 'not-found' },
    })
    expect(await readFile(page, 'utf8')).toBe(stray)
  })

  it('is refused for a label no option holds', async () => {
    const id = await mkSelect([{ key: 'A', label: 'A' }])
    expect(await renameOption(root, id, 'Gone', 'X')).toMatchObject({
      ok: false,
      error: { code: 'not-found' },
    })
  })

  it('notes every rewritten page once per container for the values:changed push', async () => {
    const id = await mkSelect([{ key: 'A', label: 'A' }])
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
          rewriteRaw((raw) => landValue(raw, def.key, ['A'])),
        )
      }
    }
    await openSession(root)
    await refreshTree(root)
    expect((await renameOption(root, id, 'A', 'B')).ok).toBe(true)
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

describe('removeOption', () => {
  it('deletes the def option and strips its value from pages', async () => {
    const id = await mkSelect([
      { key: 'A', label: 'A' },
      { key: 'B', label: 'B' },
    ])
    const page = await pageHolding(id, 'A')

    const r = await removeOption(root, id, 'A')
    expect(r.ok).toBe(true)
    expect((await readRegistry(root)).defs[id].select_options).toEqual([{ key: 'B', label: 'B' }])
    expect(await readFile(page, 'utf8')).not.toContain(id)
  })

  it('fails for an unknown property id', async () => {
    expect((await removeOption(root, 'prop_nope', 'A')).ok).toBe(false)
  })
})

describe('an owed record holds option changes', () => {
  const OWED_MESSAGE = 'An earlier change hasn’t reached every file yet.'
  const held = { op: 'rename', id: 'prop_x', from: 'Old', to: 'New' } as const
  const owing = async (): Promise<{ id: string; page: string; bytes: string }> => {
    const id = await mkSelect([
      { key: 'A', label: 'A' },
      { key: 'C', label: 'C' },
    ])
    const page = await pageHolding(id, 'A')
    await writeSchemaJournal(root, held)
    return { id, page, bytes: await readFile(page, 'utf8') }
  }

  it.each([
    ['renameOption', (id: string) => renameOption(root, id, 'A', 'B')],
    ['removeOption', (id: string) => removeOption(root, id, 'A')],
  ])('%s refuses, leaving the registry, every holder, and the held record', async (_, run) => {
    const { id, page, bytes } = await owing()
    expect(await run(id)).toEqual(fail('owed', OWED_MESSAGE))
    expect((await readRegistry(root)).defs[id].select_options?.map((o) => o.label)).toEqual([
      'A',
      'C',
    ])
    expect(await readFile(page, 'utf8')).toBe(bytes)
    expect(await readSchemaJournal(root)).toEqual(held)
  })

  it.skipIf(noModeBits)(
    'an add taking back an owed rename’s old key refuses, leaving the record',
    async () => {
      const id = await mkSelect([
        { key: 'A', label: 'A' },
        { key: 'C', label: 'C' },
      ])
      await pageHolding(id, 'A')
      const set = await createFolderEntity(join(root, 'Col'), 'set', 'Locked', newId())
      if (!set.ok) throw new Error('set failed')
      const p = await createTestPage(set.value.path, 'Two', { body: 'b' })
      if (!p.ok) throw new Error('page failed')
      const key = (await readRegistry(root)).defs[id].key
      await rewriteRootAt(
        p.value.path,
        rewriteRaw((raw) => landValue(raw, key, ['A'])),
      )
      await chmod(set.value.path, 0o555)
      try {
        expect((await renameOption(root, id, 'A', 'Z')).ok).toBe(true)
      } finally {
        await chmod(set.value.path, 0o755)
      }
      const record = { op: 'option-rename', id, keys: [['A', 'Z']], labels: ['A', 'Z'] }
      expect(await readSchemaJournal(root)).toEqual(record)
      const add = { op: 'add' as const, groupId: SELECT_GROUP, label: 'A' }
      expect(await editOption(root, id, add)).toEqual(fail('owed', OWED_MESSAGE))
      expect((await readRegistry(root)).defs[id].select_options?.map((o) => o.label)).toEqual([
        'Z',
        'C',
      ])
      expect(await readSchemaJournal(root)).toEqual(record)
    },
  )

  it('clearOption strips while another property’s rename record is owed, leaving the record held', async () => {
    const { id, page, bytes } = await owing()
    expect(splitFrontmatter(bytes)).toHaveProperty('Tags')
    expect(await clearOption(root, id, 'A')).toEqual(ok(null))
    expect(splitFrontmatter(await readFile(page, 'utf8'))).not.toHaveProperty('Tags')
    expect(await readSchemaJournal(root)).toEqual(held)
  })

  it.skipIf(noModeBits)(
    'clearOption refuses while the same property’s option record is owed, writing nothing',
    async () => {
      const id = await mkSelect([{ key: 'In Progress', label: 'In Progress' }])
      const one = await pageHolding(id, 'In Progress')
      const set = await createFolderEntity(join(root, 'Col'), 'set', 'Locked', newId())
      if (!set.ok) throw new Error('set failed')
      const p = await createTestPage(set.value.path, 'Two', { body: 'b' })
      if (!p.ok) throw new Error('page failed')
      const two = p.value.path
      const key = (await readRegistry(root)).defs[id].key
      await rewriteRootAt(
        two,
        rewriteRaw((raw) => landValue(raw, key, ['In Progress'])),
      )
      await chmod(set.value.path, 0o555)
      try {
        expect((await setValueFormat(root, id, 'kebab-case')).ok).toBe(true)
      } finally {
        await chmod(set.value.path, 0o755)
      }
      const record = { op: 'option-rename', id, keys: [['In Progress', 'in-progress']] }
      expect(await readSchemaJournal(root)).toEqual(record)
      const def = (await readRegistry(root)).defs[id]
      const bytes = [await readFile(one, 'utf8'), await readFile(two, 'utf8')]

      expect(await clearOption(root, id, 'In Progress')).toEqual(fail('owed', OWED_MESSAGE))
      expect((await readRegistry(root)).defs[id]).toEqual(def)
      expect([await readFile(one, 'utf8'), await readFile(two, 'utf8')]).toEqual(bytes)
      expect(await readSchemaJournal(root)).toEqual(record)
    },
  )

  it('clearOption strips while another property’s option record is owed', async () => {
    const id = await mkSelect([{ key: 'A', label: 'A' }])
    const page = await pageHolding(id, 'A')
    const other = { op: 'option-remove', id: 'prop_x', key: 'A' } as const
    await writeSchemaJournal(root, other)
    expect(await clearOption(root, id, 'A')).toEqual(ok(null))
    expect(splitFrontmatter(await readFile(page, 'utf8'))).not.toHaveProperty('Tags')
    expect(await readSchemaJournal(root)).toEqual(other)
  })

  it('a held record identical to the one the op writes runs the op', async () => {
    const id = await mkSelect([
      { key: 'A', label: 'A' },
      { key: 'C', label: 'C' },
    ])
    await writeSchemaJournal(root, {
      op: 'option-rename',
      id,
      keys: [['A', 'B']],
      labels: ['A', 'B'],
    })
    expect((await renameOption(root, id, 'A', 'B')).ok).toBe(true)
    await writeSchemaJournal(root, { op: 'option-remove', id, key: 'C' })
    expect((await removeOption(root, id, 'C')).ok).toBe(true)
    expect((await readRegistry(root)).defs[id].select_options?.map((o) => o.label)).toEqual(['B'])
    expect(await readSchemaJournal(root)).toBeNull()
  })
})

describe('remove and clear on a value the definition lacks', () => {
  const stray = async (): Promise<{ id: string; page: string; bytes: string }> => {
    const id = await mkSelect([{ key: 'A', label: 'A' }])
    const page = await pageHolding(id, 'A')
    const key = (await readRegistry(root)).defs[id].key
    await rewriteRootAt(
      page,
      rewriteRaw((raw) => landValue(raw, key, ['Stray'])),
    )
    return { id, page, bytes: await readFile(page, 'utf8') }
  }

  it('removeOption is refused, drops nothing, and rewrites no page', async () => {
    const { id, page, bytes } = await stray()
    expect(await removeOption(root, id, 'Stray')).toMatchObject({
      ok: false,
      error: { code: 'not-found' },
    })
    expect(await readFile(page, 'utf8')).toBe(bytes)
    expect((await readRegistry(root)).defs[id].select_options).toEqual([{ key: 'A', label: 'A' }])
  })

  it('clearOption is refused and rewrites no page', async () => {
    const { id, page, bytes } = await stray()
    expect(await clearOption(root, id, 'Stray')).toMatchObject({
      ok: false,
      error: { code: 'not-found' },
    })
    expect(await readFile(page, 'utf8')).toBe(bytes)
  })
})

describe('clearOption', () => {
  it('strips the value from pages but KEEPS the option', async () => {
    const id = await mkSelect([{ key: 'A', label: 'A' }])
    const page = await pageHolding(id, 'A')

    const r = await clearOption(root, id, 'A')
    expect(r.ok).toBe(true)
    expect((await readRegistry(root)).defs[id].select_options).toEqual([{ key: 'A', label: 'A' }])
    expect(await readFile(page, 'utf8')).not.toContain(id)
  })

  it('fails for an unknown property id', async () => {
    expect((await clearOption(root, 'prop_nope', 'A')).ok).toBe(false)
  })

  it("strips the option's key and leaves a word spelled as its label", async () => {
    const id = await mkSelect([{ key: 'urgent', label: 'Urgent' }])
    const col = await createFolderEntity(root, 'collection', 'Col', newId())
    if (!col.ok) throw new Error('folder failed')
    await assignProperty(root, col.value.path, id)
    const keyed = join(col.value.path, 'One.md')
    const labelled = join(col.value.path, 'Two.md')
    await writeFile(keyed, '---\nID: 01ARZ3NDEKPSV4RRFFQ69G5FAV\nTags: urgent\n---\nb\n')
    await writeFile(labelled, '---\nID: 01ARZ3NDEKPSV4RRFFQ69G5FAW\nTags: Urgent\n---\nb\n')
    const before = await readFile(labelled, 'utf8')

    expect((await clearOption(root, id, 'Urgent')).ok).toBe(true)
    expect(splitFrontmatter(await readFile(keyed, 'utf8'))).toEqual({
      ID: '01ARZ3NDEKPSV4RRFFQ69G5FAV',
    })
    expect(await readFile(labelled, 'utf8')).toBe(before)
  })

  it.skipIf(noModeBits)('a clear that can’t write a holder faults', async () => {
    const id = await mkSelect([{ key: 'hi', label: 'hi' }])
    await pageHolding(id, 'hi')
    const set = await createFolderEntity(join(root, 'Col'), 'set', 'Locked', newId())
    if (!set.ok) throw new Error('set failed')
    const p = await createTestPage(set.value.path, 'Two', { body: 'b' })
    if (!p.ok) throw new Error('page failed')
    const def = (await readRegistry(root)).defs[id]
    if (!def) throw new Error('definition missing')
    await rewriteRootAt(
      p.value.path,
      rewriteRaw((raw) => landValue(raw, def.key, ['hi'])),
    )
    await chmod(set.value.path, 0o555)
    try {
      const r = await clearOption(root, id, 'hi').catch(fault)
      expect(r.ok).toBe(false)
    } finally {
      await chmod(set.value.path, 0o755)
    }
  })
})

describe('optionHolders', () => {
  it('counts the pages and Spaces holding the value, and no holder of another', async () => {
    const id = await mkSelect([
      { key: 'A', label: 'A' },
      { key: 'B', label: 'B' },
    ])
    const files = [
      await pageHolding(id, 'A'),
      await spaceSidecar('Pommora', { id: 'sp1', Tags: ['A', 'B'] }),
      await spaceSidecar('Sapphire', { id: 'sp2', Tags: 'B' }),
    ]
    const before = await Promise.all(files.map((f) => readFile(f, 'utf8')))

    expect(await optionHolders(root, id, 'A')).toEqual(ok(2))
    expect(await optionHolders(root, id, 'B')).toEqual(ok(2))
    expect(await Promise.all(files.map((f) => readFile(f, 'utf8')))).toEqual(before)
  })

  it('is refused for a value the definition lacks', async () => {
    const id = await mkSelect([{ key: 'A', label: 'A' }])
    expect((await optionHolders(root, id, 'Stray')).ok).toBe(false)
  })
})

describe('option cascades reach a Space sidecar', () => {
  it('a rename rewrites a scalar value and a list element', async () => {
    const id = await mkSelect([{ key: 'Urgent', label: 'Urgent' }])
    const scalar = await spaceSidecar('Pommora', { id: 'sp1', Tags: 'Urgent' })
    const list = await spaceSidecar('Sapphire', { id: 'sp2', Tags: ['Urgent', 'Keep'] })

    expect((await renameOption(root, id, 'Urgent', 'Critical')).ok).toBe(true)
    expect((await readJsonAt(scalar)).Tags).toEqual(['Critical'])
    expect((await readJsonAt(list)).Tags).toEqual(['Critical', 'Keep'])
  })

  it('a remove empties a one-element list and the key leaves the sidecar', async () => {
    const id = await mkSelect([
      { key: 'A', label: 'A' },
      { key: 'B', label: 'B' },
    ])
    const file = await spaceSidecar('Pommora', { id: 'sp1', Tags: ['A'], icon: 'box' })

    expect((await removeOption(root, id, 'A')).ok).toBe(true)
    const raw = await readJsonAt(file)
    expect('Tags' in raw).toBe(false)
    expect(raw.icon).toBe('box')
  })

  it('a sidecar holding neither value is left byte-identical', async () => {
    const id = await mkSelect([{ key: 'A', label: 'A' }])
    const file = await spaceSidecar('Pommora', { id: 'sp1', Tags: ['B'] })
    const bytes = await readFile(file, 'utf8')
    const mtime = (await stat(file)).mtimeMs

    expect((await clearOption(root, id, 'A')).ok).toBe(true)
    expect(await readFile(file, 'utf8')).toBe(bytes)
    expect((await stat(file)).mtimeMs).toBe(mtime)
  })
})

describe('the option cascades reach the Collection caches', () => {
  async function cached(): Promise<{
    id: string
    col: string
    pages: { id: string; path: string }[]
    cache: () => Promise<unknown>
  }> {
    const id = await mkSelect([
      { key: 'A', label: 'A' },
      { key: 'B', label: 'B' },
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
        property_cache: { [id]: { values: { [p1]: ['A'], [p2]: ['A', 'B'], [p3]: 'B' } } },
      }),
    )
    const cache = async () => (await readJsonAt(file)).property_cache
    return { id, col, pages, cache }
  }

  const block = (id: string, values: Record<string, unknown>) => ({ [id]: { values } })

  it('a rename rewrites every cached list', async () => {
    const { id, pages, cache } = await cached()
    const [p1, p2, p3] = pages.map((p) => p.id)
    expect((await renameOption(root, id, 'A', 'Z')).ok).toBe(true)
    expect(await cache()).toEqual(block(id, { [p1]: ['Z'], [p2]: ['Z', 'B'], [p3]: 'B' }))
  })

  it('a removal strips the option from every cached list', async () => {
    const { id, pages, cache } = await cached()
    const [, p2, p3] = pages.map((p) => p.id)
    expect((await removeOption(root, id, 'A')).ok).toBe(true)
    expect(await cache()).toEqual(block(id, { [p2]: ['B'], [p3]: 'B' }))
  })

  it('a clear strips the cache, so a reassign refills no page with the option', async () => {
    const { id, col, pages, cache } = await cached()
    const [, p2, p3] = pages.map((p) => p.id)
    expect(await clearOption(root, id, 'A')).toEqual(ok(null))
    expect(await cache()).toEqual(block(id, { [p2]: ['B'], [p3]: 'B' }))
    expect((await removeProperty(root, col, id)).ok).toBe(true)
    expect((await assignProperty(root, col, id)).ok).toBe(true)
    for (const p of pages) expect(await readFile(p.path, 'utf8')).not.toMatch(/\bA\b/)
  })

  it('a damaged Collection counts once, as the configuration pass skips it, and the record stays owed', async () => {
    const { id } = await cached()
    const other = await createFolderEntity(root, 'collection', 'Other', newId())
    if (!other.ok) throw new Error('folder failed')
    const file = sidecarPath(other.value.path, 'collection')
    await rm(file)
    await mkdir(file)
    const r = await renameOption(root, id, 'A', 'Z')
    expect(r.ok && r.value.cascade.warning).toBe(unsweptLine(1))
    expect(r.ok && r.value.owed).toEqual({
      op: 'option-rename',
      id,
      keys: [['A', 'Z']],
      labels: ['A', 'Z'],
    })
    expect(await readSchemaJournal(root)).toEqual({
      op: 'option-rename',
      id,
      keys: [['A', 'Z']],
      labels: ['A', 'Z'],
    })
  })
})

describe('renameOption on a Status', () => {
  it('rewrites the group option and cascades the value onto assigning pages', async () => {
    const id = await mkStatus()
    const page = await pageHolding(id, 'Open')

    const r = await renameOption(root, id, 'Open', 'Started')
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
    const r = await renameOption(root, id, 'Open', 'Active')
    expect(r.ok).toBe(false)
    expect(await readFile(page, 'utf8')).toContain('Open')
  })
})

describe('removeOption on a Status', () => {
  it('drops the option from its group and strips its value from pages', async () => {
    const id = await mkStatus()
    const page = await pageHolding(id, 'Active')

    const r = await removeOption(root, id, 'Active')
    expect(r.ok).toBe(true)
    expect(await statusValues(id)).not.toContain('Active')
    expect(await readFile(page, 'utf8')).not.toContain(id)
  })
})

describe('clearOption on a Status', () => {
  it('strips the value from pages but KEEPS the option in its group', async () => {
    const id = await mkStatus()
    const page = await pageHolding(id, 'Done')

    const r = await clearOption(root, id, 'Done')
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
      { key: 'Done', label: 'Done' },
      { key: 'Todo', label: 'Todo' },
    ])
    const page = await pageHolding(id, 'Done')
    const col = join(page, '..')
    return { id, col, surfaces: await seedConfigSurfaces(root, col, viewOn(id, 'Done')) }
  }

  async function lockedHolder(id: string, col: string): Promise<string> {
    const set = await createFolderEntity(col, 'set', 'Locked', newId())
    if (!set.ok) throw new Error('set failed')
    const p = await createTestPage(set.value.path, 'Held', { body: 'b' })
    if (!p.ok) throw new Error('page failed')
    const key = (await readRegistry(root)).defs[id].key
    await rewriteRootAt(
      p.value.path,
      rewriteRaw((raw) => landValue(raw, key, ['Done'])),
    )
    await chmod(set.value.path, 0o555)
    return set.value.path
  }

  it('a rename reaches the Collection, the Set, the tile, and the Matrix', async () => {
    const { id, surfaces } = await seeded()
    expect(await renameOption(root, id, 'Done', 'Closed')).toEqual(
      ok({ cascade: { pages: [], hosts: [HOME] } }),
    )
    const views = await surfaces.read()
    const want = viewOn(id, 'Closed')
    expect([views.collection, views.set, views.tile]).toEqual([want, want, want])
    expect(views.matrix).toEqual(want.filter)
  })

  it('a removal strips the value and drops the rule it emptied', async () => {
    const { id, surfaces } = await seeded()
    expect(await removeOption(root, id, 'Done')).toEqual(
      ok({ cascade: { pages: [], hosts: [HOME] } }),
    )
    const held = viewOn(id, 'Done')
    const want = {
      ...held,
      filter: undefined,
      sort: [{ property_id: id, direction: 'ascending', order: [] }],
      group: { ...(held.group as object), order: [] },
      hidden_groups: [],
      collapsed_groups: [],
    }
    const views = await surfaces.read()
    expect([views.collection, views.set, views.tile]).toEqual([want, want, want])
    expect(views.matrix).toBeNull()
    expect(await readSchemaJournal(root)).toBeNull()
  })

  it.skipIf(noModeBits)(
    'a removal with a page skip leaves every view holding the option and the journal held',
    async () => {
      const { id, col, surfaces } = await seeded()
      const locked = await lockedHolder(id, col)
      try {
        expect(await removeOption(root, id, 'Done')).toEqual(
          ok({
            cascade: { pages: [], hosts: [], warning: unsweptLine(1) },
            owed: { op: 'option-remove', id, key: 'Done' },
          }),
        )
      } finally {
        await chmod(locked, 0o755)
      }
      const views = await surfaces.read()
      const held = viewOn(id, 'Done')
      expect([views.collection, views.set, views.tile]).toEqual([held, held, held])
      expect(await readSchemaJournal(root)).toEqual({ op: 'option-remove', id, key: 'Done' })
      expect((await readRegistry(root)).defs[id].select_options?.map((o) => o.label)).toEqual([
        'Done',
        'Todo',
      ])
    },
  )

  it.skipIf(noModeBits)(
    'a rename with a page skip still reaches the views, answers the skip, and holds the journal',
    async () => {
      const { id, col, surfaces } = await seeded()
      const locked = await lockedHolder(id, col)
      try {
        expect(await renameOption(root, id, 'Done', 'Closed')).toEqual(
          ok({
            cascade: { pages: [], hosts: [HOME], warning: unsweptLine(1) },
            owed: {
              op: 'option-rename',
              id,
              keys: [['Done', 'Closed']],
              labels: ['Done', 'Closed'],
            },
          }),
        )
      } finally {
        await chmod(locked, 0o755)
      }
      expect((await surfaces.read()).set).toEqual(viewOn(id, 'Closed'))
      expect((await readSchemaJournal(root))?.op).toBe('option-rename')
    },
  )

  it('a rename to the option’s own key leaves its pages, relabels the views, and journals no key', async () => {
    const id = await mkSelect([{ key: 'urgent', label: 'Urgent' }])
    const page = await pageHolding(id, 'Urgent')
    const surfaces = await seedConfigSurfaces(root, join(page, '..'), viewOn(id, 'Urgent'))
    const bytes = await readFile(page, 'utf8')
    expect((await renameOption(root, id, 'Urgent', 'urgent')).ok).toBe(true)
    expect(await readFile(page, 'utf8')).toBe(bytes)
    expect((await surfaces.read()).set).toEqual(viewOn(id, 'urgent'))
    expect(writeSchemaJournal).toHaveBeenCalledWith(root, {
      op: 'option-rename',
      id,
      keys: [],
      labels: ['Urgent', 'urgent'],
    })
  })

  it('a pass skip holds the drop and the journal', async () => {
    const { id, surfaces } = await seeded()
    const setFile = sidecarPath(surfaces.set, 'set')
    await rm(setFile)
    await mkdir(setFile)
    expect(await removeOption(root, id, 'Done')).toEqual(
      ok({
        cascade: { pages: [], hosts: [HOME], warning: unsweptLine(1) },
        owed: { op: 'option-remove', id, key: 'Done' },
      }),
    )
    expect(await readSchemaJournal(root)).toEqual({ op: 'option-remove', id, key: 'Done' })
    expect((await readRegistry(root)).defs[id].select_options?.map((o) => o.label)).toEqual([
      'Done',
      'Todo',
    ])
  })

  it('a failed drop keeps the journal', async () => {
    const { id } = await seeded()
    vi.mocked(mutateRegistry).mockResolvedValueOnce(fault('refused'))
    expect((await removeOption(root, id, 'Done')).ok).toBe(false)
    expect(await readSchemaJournal(root)).toEqual({ op: 'option-remove', id, key: 'Done' })
  })

  it('a clear reaches no view', async () => {
    const { id, surfaces } = await seeded()
    expect(await clearOption(root, id, 'Done')).toEqual(ok(null))
    const views = await surfaces.read()
    const held = viewOn(id, 'Done')
    expect([views.collection, views.set, views.tile]).toEqual([held, held, held])
    expect(views.matrix).toEqual(held.filter)
  })

  it('a rename and a removal edit files by key and views by label', async () => {
    const id = await mkSelect([{ key: 'urgent', label: 'Urgent' }])
    const col = await createFolderEntity(root, 'collection', 'Col', newId())
    if (!col.ok) throw new Error('folder failed')
    await assignProperty(root, col.value.path, id)
    const page = join(col.value.path, 'One.md')
    await writeFile(page, '---\nID: 01ARZ3NDEKPSV4RRFFQ69G5FAV\nTags: [urgent]\n---\nb\n')
    const surfaces = await seedConfigSurfaces(root, col.value.path, viewOn(id, 'Urgent'))

    expect((await renameOption(root, id, 'Urgent', 'Critical')).ok).toBe(true)
    expect(splitFrontmatter(await readFile(page, 'utf8')).Tags).toEqual(['Critical'])
    expect((await surfaces.read()).collection.filter).toEqual(viewOn(id, 'Critical').filter)

    expect((await removeOption(root, id, 'Critical')).ok).toBe(true)
    expect(splitFrontmatter(await readFile(page, 'utf8'))).toEqual({
      ID: '01ARZ3NDEKPSV4RRFFQ69G5FAV',
    })
    expect((await surfaces.read()).collection.filter).toBeUndefined()
  })

  it("a removal leaves the views on another option whose label is the removed one's key", async () => {
    const id = await mkSelect([
      { key: 'a', label: 'Z' },
      { key: 'B2', label: 'a' },
    ])
    const col = await createFolderEntity(root, 'collection', 'Col', newId())
    if (!col.ok) throw new Error('folder failed')
    await assignProperty(root, col.value.path, id)
    const surfaces = await seedConfigSurfaces(root, col.value.path, viewOn(id, 'a'))

    expect((await removeOption(root, id, 'Z')).ok).toBe(true)
    const views = await surfaces.read()
    const held = viewOn(id, 'a')
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
  cache: () => Promise<unknown>
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
  const space = await spaceSidecar('Pommora', { id: 'sp1', Tones: [select_options[0].key] })
  const file = sidecarPath(col, 'collection')
  await writeFile(
    file,
    JSON.stringify({
      ...(await readJsonAt(file)),
      property_cache: { [id]: { values: { [PAGE_ID]: [select_options[0].key] } } },
    }),
  )
  const surfaces = await seedConfigSurfaces(root, col, viewOn(id, select_options[0].label))
  const cache = async () => (await readJsonAt(file)).property_cache
  return { id, page, space, cache, surfaces }
}

const tones = (): Promise<Awaited<ReturnType<typeof toned>>> =>
  toned([
    { key: 'Light Blue', label: 'Light Blue' },
    { key: 'Dark Red', label: 'Dark Red' },
  ])

describe('a Value Format change re-keys every option', () => {
  it('stores the format and every option’s new key, rewriting the files and caches and leaving configuration', async () => {
    const { id, page, space, cache, surfaces } = await tones()
    const views = await surfaces.read()

    expect(await setValueFormat(root, id, 'kebab-case')).toEqual(
      ok({ cascade: { pages: [], hosts: [] } }),
    )
    const def = (await readRegistry(root)).defs[id]
    expect(def.value_format).toBe('kebab-case')
    expect(def.select_options).toEqual([
      { key: 'light-blue', label: 'Light Blue' },
      { key: 'dark-red', label: 'Dark Red' },
    ])
    expect(await readFile(page, 'utf8')).toContain('Tones: ["light-blue", "dark-red"]')
    expect((await readJsonAt(space)).Tones).toEqual(['light-blue'])
    expect(await cache()).toEqual({ [id]: { values: { [PAGE_ID]: ['light-blue'] } } })
    expect(await surfaces.read()).toEqual(views)
    expect(await readSchemaJournal(root)).toBeNull()
  })

  it('refuses two options the format gives one key, changing nothing', async () => {
    const { id, page } = await toned([
      { key: 'Wifi Pro', label: 'Wifi Pro' },
      { key: 'Wifi-Pro', label: 'Wifi-Pro' },
    ])
    const def = (await readRegistry(root)).defs[id]
    const bytes = await readFile(page, 'utf8')

    expect(await setValueFormat(root, id, 'kebab-case')).toEqual(SAME_KEY)
    expect((await readRegistry(root)).defs[id]).toEqual(def)
    expect(await readFile(page, 'utf8')).toBe(bytes)
    expect(await readSchemaJournal(root)).toBeNull()
  })

  it('refuses an option taking the key another option writes now, changing nothing', async () => {
    const { id, page } = await toned(
      [
        { key: 'wifipro', label: 'WifiPro' },
        { key: 'wifi-pro', label: 'WiFi-Pro' },
      ],
      'lowercase',
    )
    const def = (await readRegistry(root)).defs[id]
    const bytes = await readFile(page, 'utf8')

    expect(await setValueFormat(root, id, 'kebab-case')).toEqual(CROSSED)
    expect((await readRegistry(root)).defs[id]).toEqual(def)
    expect(await readFile(page, 'utf8')).toBe(bytes)
    expect(await readSchemaJournal(root)).toBeNull()
  })

  it('an option whose new key differs from its old one only by padding isn’t a crossing', async () => {
    const { id } = await toned([{ key: ' green ', label: ' green ' }])
    expect((await setValueFormat(root, id, 'kebab-case')).ok).toBe(true)
    expect((await readRegistry(root)).defs[id].select_options).toEqual([
      expect.objectContaining({ key: 'green', label: ' green ' }),
    ])
  })

  it('waits for an owed record, changing nothing', async () => {
    const { id, page } = await tones()
    const held = { op: 'rename', id: 'prop_other', from: 'A', to: 'B' } as const
    await writeSchemaJournal(root, held)
    const def = (await readRegistry(root)).defs[id]
    const bytes = await readFile(page, 'utf8')

    expect(await setValueFormat(root, id, 'kebab-case')).toEqual(
      fail('owed', 'An earlier change hasn’t reached every file yet.'),
    )
    expect((await readRegistry(root)).defs[id]).toEqual(def)
    expect(await readFile(page, 'utf8')).toBe(bytes)
    expect(await readSchemaJournal(root)).toEqual(held)
  })

  it.skipIf(noModeBits)(
    'an unreadable page owes one key-only record, and its replay brings the page current',
    async () => {
      const { id, page } = await tones()
      const owed: SchemaJournal = {
        op: 'option-rename',
        id,
        keys: [
          ['Light Blue', 'light-blue'],
          ['Dark Red', 'dark-red'],
        ],
      }
      await chmod(page, 0o000)
      try {
        const r = await setValueFormat(root, id, 'kebab-case')
        expect(r.ok && r.value.owed).toEqual(owed)
      } finally {
        await chmod(page, 0o644)
      }
      expect((await replaySchemaCascade(root, owed))?.ok).toBe(true)
      expect(splitFrontmatter(await readFile(page, 'utf8')).Tones).toEqual([
        'light-blue',
        'dark-red',
      ])
      expect(await readSchemaJournal(root)).toBeNull()
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
    expect(await readSchemaJournal(root)).toBeNull()
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
        { key: 'wifipro', label: 'WifiPro' },
        { key: 'wifi-pro', label: 'WiFi-Pro' },
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
      select_options: values.map((value) => ({ key: value, label: value })),
    })
  const keyedMulti = def({
    type: 'multiSelect',
    select_options: [
      { key: 'done', label: 'Done' },
      { key: 'in-progress', label: 'In Progress' },
    ],
  })
  const labels = def({
    type: 'multiSelect',
    select_options: [
      { key: 'Claude', label: 'Claude' },
      { key: 'Docs', label: 'Docs' },
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
