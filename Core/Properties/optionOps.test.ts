import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { chmod, mkdir, rm, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { noModeBits, seedSpaceSidecar, readJsonAt, tempRoot } from '../Testing/hostFs'
import { fault, ok } from '../Contract/result'
import { editOption, renameOption, removeOption, clearOption } from './optionOps'
import { createProperty, editProperty } from './registryProperty'
import { assignProperty } from './assignment'
import { createFolderEntity } from '../Nexus/folderEntity'
import { newId } from '../Nexus/ids'
import { updatePageProperty } from '../Nexus/page'
import { createTestPage } from '../Testing/createTestPage'
import { mutateRegistry, readRegistry, serializeSchemaOp } from './propertiesRegistry'

type PropDefLike = Record<string, unknown> & {
  select_options?: unknown[]
  status_groups?: { options: unknown[] }[]
  type?: string
}
type RegistryFile = { order: string[]; defs: Record<string, PropDefLike> }
import { readSchemaJournal } from './propertyJournal'
import { unsweptLine } from './governedSweep'
import { type ConfigSurfaces, seedConfigSurfaces, viewOn } from '../Testing/configSurfaces'
import { sidecarPath } from '../Paths/paths'
import { splitFrontmatter } from '../Files/pageFile'
import { type PropertyDefinition, SELECT_GROUP, type SelectOption } from './properties'
import { settleNow } from '../Nexus/settle'
import type { ValueChange } from '../Nexus/tree'
import type { Pushes } from '../Contract/bridge'
import { closeSession, openSession } from '../Nexus/session'
import { refreshTree } from '../Nexus/liveTree'

vi.mock('./propertiesRegistry', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./propertiesRegistry')>()
  return { ...mod, mutateRegistry: vi.fn(mod.mutateRegistry) }
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
  mkProperty({ name: 'Tags', type: 'select', select_options })

const mkStatus = (): Promise<string> => mkProperty({ name: 'Stage', type: 'status' })

async function pageHolding(id: string, value: string): Promise<string> {
  const col = await createFolderEntity(root, 'collection', 'Col', newId())
  if (!col.ok) throw new Error('folder failed')
  await assignProperty(root, col.value.path, id)
  const p = await createTestPage(col.value.path, 'One', { body: 'b' })
  if (!p.ok) throw new Error('page failed')
  const def = (await readRegistry(root)).defs[id]
  if (!def) throw new Error('definition missing')
  await updatePageProperty(p.value.path, def, { kind: 'select', value })
  return p.value.path
}

const spaceSidecar = (name: string, raw: Record<string, unknown>): Promise<string> =>
  seedSpaceSidecar(root, 'Projects', name, raw)

async function statusValues(id: string): Promise<string[]> {
  const def = (await readRegistry(root)).defs[id]
  return (def.status_groups ?? []).flatMap((g) => g.options.map((o) => o.value))
}

describe('editOption', () => {
  it('an emptied options list survives an unrelated property edit — no phantom re-seed', async () => {
    const id = await mkSelect([{ value: 'A' }])
    expect((await removeOption(root, id, 'A')).ok).toBe(true)
    expect((await readRegistry(root)).defs[id].select_options).toEqual([])
    await editProperty(root, id, { icon: 'tag' })
    expect((await readRegistry(root)).defs[id].select_options).toEqual([])
  })

  it('add refuses a title another option holds', async () => {
    const id = await mkSelect([{ value: 'A' }])
    const r = await editOption(root, id, { op: 'add', groupId: 'select', title: 'A' })
    expect(r.ok).toBe(false)
    expect((await readRegistry(root)).defs[id].select_options).toEqual([{ value: 'A' }])
  })

  it('fails for an unknown property id', async () => {
    expect((await editOption(root, 'prop_nope', { op: 'recolor', value: 'A' })).ok).toBe(false)
  })

  it('serializes on the schema lock — queues behind an in-flight schema op, never interleaving', async () => {
    const id = await mkSelect([{ value: 'A' }])
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
    const fast = editOption(root, id, { op: 'add', groupId: 'select', title: 'B' }).then(() =>
      order.push('editOption'),
    )
    await new Promise((r) => setTimeout(r, 50))
    release()
    await Promise.all([slow, fast])
    expect(order).toEqual(['schema-op', 'editOption'])
  })

  it('relabelGroup is refused on a Select', async () => {
    const id = await mkSelect([{ value: 'A' }])
    const r = await editOption(root, id, { op: 'relabelGroup', groupId: 'select', label: 'Named' })
    expect(r).toMatchObject({ ok: false, error: { code: 'not-found' } })
    expect((await readRegistry(root)).defs[id].select_options).toEqual([{ value: 'A' }])
  })

  it('add and move are refused for a group the definition lacks', async () => {
    const id = await mkStatus()
    const before = await statusValues(id)
    expect(await editOption(root, id, { op: 'add', groupId: 'nope', title: 'X' })).toMatchObject({
      ok: false,
      error: { code: 'not-found' },
    })
    expect(
      await editOption(root, id, { op: 'move', value: 'Open', groupId: 'nope', toIndex: 0 }),
    ).toMatchObject({ ok: false, error: { code: 'not-found' } })
    expect(await statusValues(id)).toEqual(before)
  })
})

describe('a definition stored with two options that fold alike', () => {
  it('takes an added option, written with the first of the pair alone', async () => {
    const id = await mkSelect([{ value: 'alpha' }])
    const file = join(root, '.nexus', 'properties.json')
    const raw = await readJsonAt<{ defs: Record<string, PropDefLike> }>(file)
    raw.defs[id].select_options = [{ value: 'alpha' }, { value: 'Alpha' }]
    await writeFile(file, JSON.stringify(raw))
    expect((await editOption(root, id, { op: 'add', groupId: 'select', title: 'beta' })).ok).toBe(
      true,
    )
    const after = await readJsonAt<{ defs: Record<string, PropDefLike> }>(file)
    expect(after.defs[id].select_options).toEqual([{ value: 'alpha' }, { value: 'beta' }])
  })
})

describe('a rename followed by a registry-only edit (F-134)', () => {
  it('an edit still addressed to the old value is refused, and the new title holds in the registry and on the page', async () => {
    const id = await mkSelect([{ value: 'Urgent' }])
    const page = await pageHolding(id, 'Urgent')
    const rename = renameOption(root, id, 'Urgent', 'Critical')
    const recolor = editOption(root, id, { op: 'recolor', value: 'Urgent', color: 'red' })
    const [renamed, recolored] = await Promise.all([rename, recolor])
    expect(renamed.ok).toBe(true)
    expect(recolored).toMatchObject({ ok: false, error: { code: 'not-found' } })
    expect((await readRegistry(root)).defs[id].select_options).toEqual([{ value: 'Critical' }])
    const content = await readFile(page, 'utf8')
    expect(content).toContain('Critical')
    expect(content).not.toContain('Urgent')
  })

  it('an edit addressed to the new title lands on it', async () => {
    const id = await mkSelect([{ value: 'Urgent' }])
    const page = await pageHolding(id, 'Urgent')
    const rename = renameOption(root, id, 'Urgent', 'Critical')
    const recolor = editOption(root, id, { op: 'recolor', value: 'Critical', color: 'red' })
    const [renamed, recolored] = await Promise.all([rename, recolor])
    expect(renamed.ok).toBe(true)
    expect(recolored.ok).toBe(true)
    expect((await readRegistry(root)).defs[id].select_options).toEqual([
      { value: 'Critical', color: 'red' },
    ])
    expect(await readFile(page, 'utf8')).toContain('Critical')
  })
})

describe('an option edit leaves every other stored entry as written (F-562)', () => {
  const selectSeed = [
    { value: 'A' },
    { value: 'B', appearance: 'outline', icon: 7, tint: 'x' },
    { value: 'C' },
  ]
  const statusSeed = [
    {
      id: 'g1',
      label: 'One',
      color: 'grey',
      options: [
        { value: 'X', group_id: 'g1' },
        { value: 'Y', group_id: 'g1', appearance: 'outline', icon: 7, tint: 'x' },
        { value: 'W', group_id: 'g1' },
      ],
    },
    { id: 'g2', label: 'Two', color: 42, options: [{ value: 'Z', group_id: 'g2' }] },
  ]
  const multiSeed = [{ value: 'a' }, { value: 'b', appearance: 'outline', icon: 7, tint: 'x' }]
  const registryFile = () => join(root, '.nexus', 'properties.json')
  const rawDefs = async () => (await readJsonAt<RegistryFile>(registryFile())).defs

  beforeEach(async () => {
    await mkdir(join(root, '.nexus'), { recursive: true })
    await writeFile(
      registryFile(),
      JSON.stringify({
        order: ['prop_sel', 'prop_st', 'prop_multi'],
        defs: {
          prop_sel: { id: 'prop_sel', name: 'Tags', type: 'select', select_options: selectSeed },
          prop_st: { id: 'prop_st', name: 'Stage', type: 'status', status_groups: statusSeed },
          prop_multi: {
            id: 'prop_multi',
            name: 'Labels',
            type: 'multiSelect',
            select_options: multiSeed,
          },
        },
      }),
    )
  })

  it('after a recolor, a rename, a remove, and an option add, the untouched entries deep-equal what was seeded', async () => {
    expect(
      (await editOption(root, 'prop_sel', { op: 'recolor', value: 'A', color: 'red' })).ok,
    ).toBe(true)
    expect(
      (await editOption(root, 'prop_st', { op: 'recolor', value: 'X', color: 'red' })).ok,
    ).toBe(true)
    expect((await renameOption(root, 'prop_sel', 'A', 'AA')).ok).toBe(true)
    expect((await renameOption(root, 'prop_st', 'X', 'XX')).ok).toBe(true)
    expect((await removeOption(root, 'prop_sel', 'C')).ok).toBe(true)
    expect((await removeOption(root, 'prop_st', 'W')).ok).toBe(true)
    expect(
      (await editOption(root, 'prop_multi', { op: 'add', groupId: SELECT_GROUP, title: 'c' })).ok,
    ).toBe(true)
    const defs = await rawDefs()
    expect(defs.prop_sel.select_options).toEqual([{ value: 'AA', color: 'red' }, selectSeed[1]])
    expect(defs.prop_st.status_groups).toEqual([
      {
        ...statusSeed[0],
        options: [{ value: 'XX', group_id: 'g1', color: 'red' }, statusSeed[0].options[1]],
      },
      statusSeed[1],
    ])
    expect(defs.prop_multi.select_options).toEqual([...multiSeed, { value: 'c' }])
  })

  it("a move keeps the moved option's own keys and the target group's color", async () => {
    expect(
      (await editOption(root, 'prop_st', { op: 'move', value: 'Y', groupId: 'g2', toIndex: 0 })).ok,
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
      { value: 'A', appearance: 'outline', color: 7, icon: 7 },
      { value: 'B', appearance: 'outline', color: 7, icon: 7 },
      { value: 'C' },
    ]
    file.defs.prop_multi.select_options = [{ value: 'a', appearance: 'outline' }]
    await writeFile(registryFile(), JSON.stringify(file))
    expect(
      (await editOption(root, 'prop_sel', { op: 'appearance', value: 'A', appearance: 'filled' }))
        .ok,
    ).toBe(true)
    expect((await editOption(root, 'prop_sel', { op: 'recolor', value: 'B' })).ok).toBe(true)
    expect(
      (await editOption(root, 'prop_multi', { op: 'appearance', value: 'a', appearance: 'filled' }))
        .ok,
    ).toBe(true)
    const defs = await rawDefs()
    expect(defs.prop_sel.select_options).toEqual([
      { value: 'A', color: 7, icon: 7 },
      { value: 'B', appearance: 'outline', icon: 7 },
      { value: 'C' },
    ])
    expect(defs.prop_multi.select_options).toEqual([{ value: 'a' }])
  })

  it('an entry stored under a legacy type spelling keeps that spelling and its neighbors through every writer', async () => {
    const file = await readJsonAt<RegistryFile>(registryFile())
    file.defs.prop_multi.type = 'multi_select'
    await writeFile(registryFile(), JSON.stringify(file))
    expect(
      (await editOption(root, 'prop_multi', { op: 'add', groupId: SELECT_GROUP, title: 'c' })).ok,
    ).toBe(true)
    expect(
      (await editOption(root, 'prop_multi', { op: 'recolor', value: 'a', color: 'red' })).ok,
    ).toBe(true)
    expect((await renameOption(root, 'prop_multi', 'a', 'aa')).ok).toBe(true)
    const defs = await rawDefs()
    expect(defs.prop_multi.type).toBe('multi_select')
    expect(defs.prop_multi.select_options).toEqual([
      { value: 'aa', color: 'red' },
      multiSeed[1],
      { value: 'c' },
    ])
  })
})

describe('an option write drops a stored label', () => {
  it("one option's rename clears the label from every option of its property, and another property's stays", async () => {
    const registryFile = join(root, '.nexus', 'properties.json')
    const other = [{ value: 'Q', label: 'Q' }]
    await mkdir(join(root, '.nexus'), { recursive: true })
    await writeFile(
      registryFile,
      JSON.stringify({
        order: ['prop_sel', 'prop_st', 'prop_other'],
        defs: {
          prop_sel: {
            id: 'prop_sel',
            name: 'Tags',
            type: 'select',
            select_options: [
              { value: 'A', label: 'A' },
              { value: 'B', label: 'B' },
            ],
          },
          prop_st: {
            id: 'prop_st',
            name: 'Stage',
            type: 'status',
            status_groups: [
              {
                id: 'g1',
                label: 'One',
                color: 'grey',
                options: [{ value: 'X', label: 'X', group_id: 'g1' }],
              },
              {
                id: 'g2',
                label: 'Two',
                color: 'blue',
                options: [{ value: 'Y', label: 'Y', group_id: 'g2' }],
              },
            ],
          },
          prop_other: { id: 'prop_other', name: 'Kind', type: 'select', select_options: other },
        },
      }),
    )
    expect((await renameOption(root, 'prop_sel', 'A', 'AA')).ok).toBe(true)
    expect((await renameOption(root, 'prop_st', 'X', 'XX')).ok).toBe(true)
    const defs = (await readJsonAt<RegistryFile>(registryFile)).defs
    expect(defs.prop_sel.select_options).toEqual([{ value: 'AA' }, { value: 'B' }])
    expect(defs.prop_st.status_groups!.map((g) => g.options)).toEqual([
      [{ value: 'XX', group_id: 'g1' }],
      [{ value: 'Y', group_id: 'g2' }],
    ])
    expect(defs.prop_other.select_options).toEqual(other)
  })
})

describe('option ops refuse a property without options', () => {
  const mkNumber = (): Promise<string> => mkProperty({ name: 'Count', type: 'number' })

  it('editOption', async () => {
    const id = await mkNumber()
    expect((await editOption(root, id, { op: 'recolor', value: 'A' })).ok).toBe(false)
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
    const id = await mkSelect([{ value: 'Urgent' }])
    const page = await pageHolding(id, 'Urgent')

    const r = await renameOption(root, id, 'Urgent', 'Critical')
    expect(r.ok).toBe(true)
    expect((await readRegistry(root)).defs[id].select_options).toEqual([{ value: 'Critical' }])
    const content = await readFile(page, 'utf8')
    expect(content).toContain('Critical')
    expect(content).not.toContain('Urgent')
  })

  it('rewrites the value under every spelling a page holds', async () => {
    const status = await mkProperty({
      name: 'Status',
      type: 'select',
      select_options: [{ value: 'Done' }],
    })
    const tags = await mkProperty({
      name: 'Tags',
      type: 'multiSelect',
      select_options: [{ value: 'Done' }],
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
      status: ['Finished'],
      Tags: ['Finished', 'Keep'],
      tags: ['Finished'],
    })
  })

  it('rejects a rename that collides with an existing title (no page writes)', async () => {
    const id = await mkSelect([{ value: 'A' }, { value: 'B' }])
    const page = await pageHolding(id, 'A')
    const r = await renameOption(root, id, 'A', 'B')
    expect(r.ok).toBe(false)
    expect(await readFile(page, 'utf8')).toContain('A')
  })

  it('fails for an unknown property id', async () => {
    expect((await renameOption(root, 'prop_nope', 'A', 'B')).ok).toBe(false)
  })

  it('is refused for a value the definition lacks, and rewrites no page', async () => {
    const id = await mkSelect([{ value: 'A' }])
    const page = await pageHolding(id, 'A')
    await updatePageProperty(page, (await readRegistry(root)).defs[id], {
      kind: 'select',
      value: 'Stray',
    })
    const stray = await readFile(page, 'utf8')
    expect(stray).toContain('Stray')
    expect(await renameOption(root, id, 'Stray', 'B')).toMatchObject({
      ok: false,
      error: { code: 'not-found' },
    })
    expect(await readFile(page, 'utf8')).toBe(stray)
  })

  it('notes every rewritten page once per container for the values:changed push', async () => {
    const id = await mkSelect([{ value: 'A' }])
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
        await updatePageProperty(p.value.path, def, { kind: 'select', value: 'A' })
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
    const id = await mkSelect([{ value: 'A' }, { value: 'B' }])
    const page = await pageHolding(id, 'A')

    const r = await removeOption(root, id, 'A')
    expect(r.ok).toBe(true)
    expect((await readRegistry(root)).defs[id].select_options).toEqual([{ value: 'B' }])
    expect(await readFile(page, 'utf8')).not.toContain(id)
  })

  it('fails for an unknown property id', async () => {
    expect((await removeOption(root, 'prop_nope', 'A')).ok).toBe(false)
  })
})

describe('remove and clear on a value the definition lacks', () => {
  const stray = async (): Promise<{ id: string; page: string; bytes: string }> => {
    const id = await mkSelect([{ value: 'A' }])
    const page = await pageHolding(id, 'A')
    await updatePageProperty(page, (await readRegistry(root)).defs[id], {
      kind: 'select',
      value: 'Stray',
    })
    return { id, page, bytes: await readFile(page, 'utf8') }
  }

  it('removeOption is refused, drops nothing, and rewrites no page', async () => {
    const { id, page, bytes } = await stray()
    expect(await removeOption(root, id, 'Stray')).toMatchObject({
      ok: false,
      error: { code: 'not-found' },
    })
    expect(await readFile(page, 'utf8')).toBe(bytes)
    expect((await readRegistry(root)).defs[id].select_options).toEqual([{ value: 'A' }])
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
    const id = await mkSelect([{ value: 'A' }])
    const page = await pageHolding(id, 'A')

    const r = await clearOption(root, id, 'A')
    expect(r.ok).toBe(true)
    expect((await readRegistry(root)).defs[id].select_options).toEqual([{ value: 'A' }])
    expect(await readFile(page, 'utf8')).not.toContain(id)
  })

  it('fails for an unknown property id', async () => {
    expect((await clearOption(root, 'prop_nope', 'A')).ok).toBe(false)
  })

  it.skipIf(noModeBits)('a clear that can’t write a holder faults', async () => {
    const id = await mkSelect([{ value: 'hi' }])
    await pageHolding(id, 'hi')
    const set = await createFolderEntity(join(root, 'Col'), 'set', 'Locked', newId())
    if (!set.ok) throw new Error('set failed')
    const p = await createTestPage(set.value.path, 'Two', { body: 'b' })
    if (!p.ok) throw new Error('page failed')
    const def = (await readRegistry(root)).defs[id]
    if (!def) throw new Error('definition missing')
    await updatePageProperty(p.value.path, def, { kind: 'select', value: 'hi' })
    await chmod(set.value.path, 0o555)
    try {
      const r = await clearOption(root, id, 'hi').catch(fault)
      expect(r.ok).toBe(false)
    } finally {
      await chmod(set.value.path, 0o755)
    }
  })
})

describe('option cascades reach a Space sidecar', () => {
  it('a rename rewrites a scalar value and a list element', async () => {
    const id = await mkSelect([{ value: 'Urgent' }])
    const scalar = await spaceSidecar('Pommora', { id: 'sp1', Tags: 'Urgent' })
    const list = await spaceSidecar('Sapphire', { id: 'sp2', Tags: ['Urgent', 'Keep'] })

    expect((await renameOption(root, id, 'Urgent', 'Critical')).ok).toBe(true)
    expect((await readJsonAt(scalar)).Tags).toEqual(['Critical'])
    expect((await readJsonAt(list)).Tags).toEqual(['Critical', 'Keep'])
  })

  it('a remove empties a one-element list and the key leaves the sidecar', async () => {
    const id = await mkSelect([{ value: 'A' }, { value: 'B' }])
    const file = await spaceSidecar('Pommora', { id: 'sp1', Tags: ['A'], icon: 'box' })

    expect((await removeOption(root, id, 'A')).ok).toBe(true)
    const raw = await readJsonAt(file)
    expect('Tags' in raw).toBe(false)
    expect(raw.icon).toBe('box')
  })

  it('a sidecar holding neither value is left byte-identical', async () => {
    const id = await mkSelect([{ value: 'A' }])
    const file = await spaceSidecar('Pommora', { id: 'sp1', Tags: ['B'] })
    const bytes = await readFile(file, 'utf8')
    const mtime = (await stat(file)).mtimeMs

    expect((await clearOption(root, id, 'A')).ok).toBe(true)
    expect(await readFile(file, 'utf8')).toBe(bytes)
    expect((await stat(file)).mtimeMs).toBe(mtime)
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
    const id = await mkSelect([{ value: 'Done' }, { value: 'Todo' }])
    const page = await pageHolding(id, 'Done')
    const col = join(page, '..')
    return { id, col, surfaces: await seedConfigSurfaces(root, col, viewOn(id, 'Done')) }
  }

  async function lockedHolder(id: string, col: string): Promise<string> {
    const set = await createFolderEntity(col, 'set', 'Locked', newId())
    if (!set.ok) throw new Error('set failed')
    const p = await createTestPage(set.value.path, 'Held', { body: 'b' })
    if (!p.ok) throw new Error('page failed')
    await updatePageProperty(p.value.path, (await readRegistry(root)).defs[id], {
      kind: 'select',
      value: 'Done',
    })
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
      filter: { match: 'all', rules: [] },
      sort: [{ property_id: id, direction: 'ascending', order: [] }],
      group: { ...(held.group as object), order: [] },
      hidden_groups: [],
      collapsed_groups: [],
    }
    const views = await surfaces.read()
    expect([views.collection, views.set, views.tile]).toEqual([want, want, want])
    expect(views.matrix).toEqual(want.filter)
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
            owed: { op: 'option-remove', id, value: 'Done' },
          }),
        )
      } finally {
        await chmod(locked, 0o755)
      }
      const views = await surfaces.read()
      const held = viewOn(id, 'Done')
      expect([views.collection, views.set, views.tile]).toEqual([held, held, held])
      expect(await readSchemaJournal(root)).toEqual({ op: 'option-remove', id, value: 'Done' })
      expect((await readRegistry(root)).defs[id].select_options?.map((o) => o.value)).toEqual([
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
            owed: { op: 'option-rename', id, from: 'Done', to: 'Closed' },
          }),
        )
      } finally {
        await chmod(locked, 0o755)
      }
      expect((await surfaces.read()).set).toEqual(viewOn(id, 'Closed'))
      expect((await readSchemaJournal(root))?.op).toBe('option-rename')
    },
  )

  it('a pass skip holds the drop and the journal', async () => {
    const { id, surfaces } = await seeded()
    const setFile = sidecarPath(surfaces.set, 'set')
    await rm(setFile)
    await mkdir(setFile)
    expect(await removeOption(root, id, 'Done')).toEqual(
      ok({
        cascade: { pages: [], hosts: [HOME], warning: unsweptLine(1) },
        owed: { op: 'option-remove', id, value: 'Done' },
      }),
    )
    expect(await readSchemaJournal(root)).toEqual({ op: 'option-remove', id, value: 'Done' })
    expect((await readRegistry(root)).defs[id].select_options?.map((o) => o.value)).toEqual([
      'Done',
      'Todo',
    ])
  })

  it('a failed drop keeps the journal', async () => {
    const { id } = await seeded()
    vi.mocked(mutateRegistry).mockResolvedValueOnce(fault('refused'))
    expect((await removeOption(root, id, 'Done')).ok).toBe(false)
    expect(await readSchemaJournal(root)).toEqual({ op: 'option-remove', id, value: 'Done' })
  })

  it('a clear reaches no view', async () => {
    const { id, surfaces } = await seeded()
    expect(await clearOption(root, id, 'Done')).toEqual(ok(null))
    const views = await surfaces.read()
    const held = viewOn(id, 'Done')
    expect([views.collection, views.set, views.tile]).toEqual([held, held, held])
    expect(views.matrix).toEqual(held.filter)
  })
})
