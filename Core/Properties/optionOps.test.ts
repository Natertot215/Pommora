import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { chmod, mkdir, rm, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { noModeBits, seedSpaceSidecar, readSpaceSidecar, tempRoot } from '../Testing/hostFs'
import { fault } from '../Contract/result'
import {
  editOption,
  renameOption,
  removeOption,
  clearOption,
  addOptionToDef,
  applyAdoptions,
} from './optionOps'
import { createProperty, editProperty } from './registryProperty'
import { assignProperty } from './assignment'
import { createFolderEntity } from '../Nexus/folderEntity'
import { createPage, updatePageProperty } from '../Nexus/page'
import { serializeSchemaOp } from './schemaChain'
import { machine } from '../Platform/machine'
import { readRegistry } from './propertiesRegistry'
import type { PropertyDefinition, SelectOption } from './properties'
import { flushValueWrites } from '../Nexus/valuesChanged'

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
  const col = await createFolderEntity(root, 'collection', 'Col')
  if (!col.ok) throw new Error('folder failed')
  await assignProperty(root, col.value.path, id)
  const p = await createPage(col.value.path, 'One', { body: 'b' })
  if (!p.ok) throw new Error('page failed')
  const def = (await readRegistry(root)).defs[id]
  if (!def) throw new Error('definition missing')
  await updatePageProperty(root, p.value.path, def, { kind: 'select', value })
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
    const id = await mkSelect([{ value: 'A', label: 'A' }])
    expect((await removeOption(root, id, 'A')).ok).toBe(true)
    expect((await readRegistry(root)).defs[id].select_options).toEqual([])
    await editProperty(root, id, { icon: 'tag' })
    expect((await readRegistry(root)).defs[id].select_options).toEqual([])
  })

  it('add refuses a title another option holds', async () => {
    const id = await mkSelect([{ value: 'A', label: 'A' }])
    const r = await editOption(root, id, { op: 'add', groupId: 'select', title: 'A' })
    expect(r.ok).toBe(false)
    expect((await readRegistry(root)).defs[id].select_options).toEqual([{ value: 'A', label: 'A' }])
  })

  it('fails for an unknown property id', async () => {
    expect((await editOption(root, 'prop_nope', { op: 'recolor', value: 'A' })).ok).toBe(false)
  })

  it('serializes on the schema chain — queues behind an in-flight schema op, never interleaving', async () => {
    const id = await mkSelect([{ value: 'A', label: 'A' }])
    const order: string[] = []
    let release!: () => void
    const gate = new Promise<void>((r) => {
      release = r
    })
    // Occupy the shared schema chain with a gated op, THEN fire editOption: on a different lock it would slip past the gate and land first.
    const slow = serializeSchemaOp(async () => {
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
    const id = await mkSelect([{ value: 'A', label: 'A' }])
    const r = await editOption(root, id, { op: 'relabelGroup', groupId: 'select', label: 'Named' })
    expect(r).toMatchObject({ ok: false, error: { code: 'not-found' } })
    expect((await readRegistry(root)).defs[id].select_options).toEqual([{ value: 'A', label: 'A' }])
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

describe('a rename followed by a registry-only edit (F-134)', () => {
  it('an edit still addressed to the old value is refused, and the new title holds in the registry and on the page', async () => {
    const id = await mkSelect([{ value: 'Urgent', label: 'Urgent' }])
    const page = await pageHolding(id, 'Urgent')
    const rename = renameOption(root, id, 'Urgent', 'Critical')
    const recolor = editOption(root, id, { op: 'recolor', value: 'Urgent', color: 'red' })
    const [renamed, recolored] = await Promise.all([rename, recolor])
    expect(renamed.ok).toBe(true)
    expect(recolored).toMatchObject({ ok: false, error: { code: 'not-found' } })
    expect((await readRegistry(root)).defs[id].select_options).toEqual([
      { value: 'Critical', label: 'Critical' },
    ])
    const content = await readFile(page, 'utf8')
    expect(content).toContain('Critical')
    expect(content).not.toContain('Urgent')
  })

  it('an edit addressed to the new title lands on it', async () => {
    const id = await mkSelect([{ value: 'Urgent', label: 'Urgent' }])
    const page = await pageHolding(id, 'Urgent')
    const rename = renameOption(root, id, 'Urgent', 'Critical')
    const recolor = editOption(root, id, { op: 'recolor', value: 'Critical', color: 'red' })
    const [renamed, recolored] = await Promise.all([rename, recolor])
    expect(renamed.ok).toBe(true)
    expect(recolored.ok).toBe(true)
    expect((await readRegistry(root)).defs[id].select_options).toEqual([
      { value: 'Critical', label: 'Critical', color: 'red' },
    ])
    expect(await readFile(page, 'utf8')).toContain('Critical')
  })
})

describe('an option edit leaves every other stored entry as written (F-562)', () => {
  const selectSeed = [
    { value: 'A', label: 'A' },
    { value: 'B', label: 'B', appearance: 'outline', icon: 7, tint: 'x' },
    { value: 'C', label: 'C' },
  ]
  const statusSeed = [
    {
      id: 'g1',
      label: 'One',
      color: 'grey',
      options: [
        { value: 'X', label: 'X', group_id: 'g1' },
        { value: 'Y', label: 'Y', group_id: 'g1', appearance: 'outline', icon: 7, tint: 'x' },
        { value: 'W', label: 'W', group_id: 'g1' },
      ],
    },
    { id: 'g2', label: 'Two', color: 42, options: [{ value: 'Z', label: 'Z', group_id: 'g2' }] },
  ]
  const multiSeed = [
    { value: 'a', label: 'a' },
    { value: 'b', label: 'b', appearance: 'outline', icon: 7, tint: 'x' },
  ]
  const registryFile = () => join(root, '.nexus', 'properties.json')
  const rawDefs = async () => JSON.parse(await readFile(registryFile(), 'utf8')).defs

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

  it('after a recolor, a rename, a remove, and an adoption, the untouched entries deep-equal what was seeded', async () => {
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
    expect((await addOptionToDef(root, 'prop_multi', 'c')).ok).toBe(true)
    const defs = await rawDefs()
    expect(defs.prop_sel.select_options).toEqual([
      { value: 'AA', label: 'AA', color: 'red' },
      selectSeed[1],
    ])
    expect(defs.prop_st.status_groups).toEqual([
      {
        ...statusSeed[0],
        options: [
          { value: 'XX', label: 'XX', group_id: 'g1', color: 'red' },
          statusSeed[0].options[1],
        ],
      },
      statusSeed[1],
    ])
    expect(defs.prop_multi.select_options).toEqual([...multiSeed, { value: 'c', label: 'c' }])
  })

  it("a move keeps the moved option's own keys and the target group's color", async () => {
    expect(
      (await editOption(root, 'prop_st', { op: 'move', value: 'Y', groupId: 'g2', toIndex: 0 })).ok,
    ).toBe(true)
    const defs = await rawDefs()
    expect(defs.prop_st.status_groups[1]).toEqual({
      ...statusSeed[1],
      options: [{ ...statusSeed[0].options[1], group_id: 'g2' }, ...statusSeed[1].options],
    })
    expect(defs.prop_st.status_groups[0].options).toEqual([
      statusSeed[0].options[0],
      statusSeed[0].options[2],
    ])
  })

  it('an entry stored under a legacy type spelling keeps that spelling and its neighbors through every writer', async () => {
    const file = JSON.parse(await readFile(registryFile(), 'utf8'))
    file.defs.prop_multi.type = 'multi_select'
    await writeFile(registryFile(), JSON.stringify(file))
    expect((await addOptionToDef(root, 'prop_multi', 'c')).ok).toBe(true)
    expect(
      (await editOption(root, 'prop_multi', { op: 'recolor', value: 'a', color: 'red' })).ok,
    ).toBe(true)
    expect((await renameOption(root, 'prop_multi', 'a', 'aa')).ok).toBe(true)
    const defs = await rawDefs()
    expect(defs.prop_multi.type).toBe('multi_select')
    expect(defs.prop_multi.select_options).toEqual([
      { value: 'aa', label: 'aa', color: 'red' },
      multiSeed[1],
      { value: 'c', label: 'c' },
    ])
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
    const id = await mkSelect([{ value: 'Urgent', label: 'Urgent' }])
    const page = await pageHolding(id, 'Urgent')

    const r = await renameOption(root, id, 'Urgent', 'Critical')
    expect(r.ok).toBe(true)
    expect((await readRegistry(root)).defs[id].select_options).toEqual([
      { value: 'Critical', label: 'Critical' },
    ])
    const content = await readFile(page, 'utf8')
    expect(content).toContain('Critical')
    expect(content).not.toContain('Urgent')
  })

  it('rejects a rename that collides with an existing title (no page writes)', async () => {
    const id = await mkSelect([
      { value: 'A', label: 'A' },
      { value: 'B', label: 'B' },
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
    const id = await mkSelect([{ value: 'A', label: 'A' }])
    const page = await pageHolding(id, 'A')
    await updatePageProperty(root, page, (await readRegistry(root)).defs[id], {
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
    const id = await mkSelect([{ value: 'A', label: 'A' }])
    const def = (await readRegistry(root)).defs[id]
    for (const [folder, titles] of [
      ['Col', ['One', 'Two']],
      ['Col2', ['Three']],
    ] as const) {
      const col = await createFolderEntity(root, 'collection', folder)
      if (!col.ok) throw new Error('folder failed')
      await assignProperty(root, col.value.path, id)
      for (const title of titles) {
        const p = await createPage(col.value.path, title, { body: 'b' })
        if (!p.ok) throw new Error('page failed')
        await updatePageProperty(root, p.value.path, def, { kind: 'select', value: 'A' })
      }
    }
    flushValueWrites(root)
    expect((await renameOption(root, id, 'A', 'B')).ok).toBe(true)
    expect(flushValueWrites(root).map((c) => c.rel)).toEqual(['Col', 'Col2'])
    expect(flushValueWrites(root)).toEqual([])
  })
})

describe('removeOption', () => {
  it('deletes the def option and strips its value from pages', async () => {
    const id = await mkSelect([
      { value: 'A', label: 'A' },
      { value: 'B', label: 'B' },
    ])
    const page = await pageHolding(id, 'A')

    const r = await removeOption(root, id, 'A')
    expect(r.ok).toBe(true)
    expect((await readRegistry(root)).defs[id].select_options).toEqual([{ value: 'B', label: 'B' }])
    expect(await readFile(page, 'utf8')).not.toContain(id)
  })

  it('fails for an unknown property id', async () => {
    expect((await removeOption(root, 'prop_nope', 'A')).ok).toBe(false)
  })
})

describe('remove and clear on a value the definition lacks', () => {
  const stray = async (): Promise<{ id: string; page: string; bytes: string }> => {
    const id = await mkSelect([{ value: 'A', label: 'A' }])
    const page = await pageHolding(id, 'A')
    await updatePageProperty(root, page, (await readRegistry(root)).defs[id], {
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
    expect((await readRegistry(root)).defs[id].select_options).toEqual([{ value: 'A', label: 'A' }])
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
    const id = await mkSelect([{ value: 'A', label: 'A' }])
    const page = await pageHolding(id, 'A')

    const r = await clearOption(root, id, 'A')
    expect(r.ok).toBe(true)
    expect((await readRegistry(root)).defs[id].select_options).toEqual([{ value: 'A', label: 'A' }])
    expect(await readFile(page, 'utf8')).not.toContain(id)
  })

  it('fails for an unknown property id', async () => {
    expect((await clearOption(root, 'prop_nope', 'A')).ok).toBe(false)
  })

  it.skipIf(noModeBits)('a clear that can’t write a holder faults', async () => {
    const id = await mkSelect([{ value: 'hi', label: 'hi' }])
    await pageHolding(id, 'hi')
    const set = await createFolderEntity(join(root, 'Col'), 'set', 'Locked')
    if (!set.ok) throw new Error('set failed')
    const p = await createPage(set.value.path, 'Two', { body: 'b' })
    if (!p.ok) throw new Error('page failed')
    const def = (await readRegistry(root)).defs[id]
    if (!def) throw new Error('definition missing')
    await updatePageProperty(root, p.value.path, def, { kind: 'select', value: 'hi' })
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
    const id = await mkSelect([{ value: 'Urgent', label: 'Urgent' }])
    const scalar = await spaceSidecar('Pommora', { id: 'sp1', Tags: 'Urgent' })
    const list = await spaceSidecar('Sapphire', { id: 'sp2', Tags: ['Urgent', 'Keep'] })

    expect((await renameOption(root, id, 'Urgent', 'Critical')).ok).toBe(true)
    expect((await readSpaceSidecar(scalar)).Tags).toEqual(['Critical'])
    expect((await readSpaceSidecar(list)).Tags).toEqual(['Critical', 'Keep'])
  })

  it('a remove empties a one-element list and the key leaves the sidecar', async () => {
    const id = await mkSelect([
      { value: 'A', label: 'A' },
      { value: 'B', label: 'B' },
    ])
    const file = await spaceSidecar('Pommora', { id: 'sp1', Tags: ['A'], icon: 'box' })

    expect((await removeOption(root, id, 'A')).ok).toBe(true)
    const raw = await readSpaceSidecar(file)
    expect('Tags' in raw).toBe(false)
    expect(raw.icon).toBe('box')
  })

  it('a sidecar holding neither value is left byte-identical', async () => {
    const id = await mkSelect([{ value: 'A', label: 'A' }])
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

describe('adoption — a Multi-Select registers an option a page already holds', () => {
  const mkMulti = (): Promise<string> =>
    mkProperty({
      name: 'Labels',
      type: 'multiSelect',
      select_options: [{ value: 'alpha', label: 'alpha' }],
    })
  const values = async (id: string) =>
    ((await readRegistry(root)).defs[id].select_options ?? []).map((o) => o.value)

  it('adds the option once across concurrent calls, and is a no-op when present', async () => {
    const id = await mkMulti()
    const both = await Promise.all([
      addOptionToDef(root, id, 'zeta'),
      addOptionToDef(root, id, 'zeta'),
    ])
    expect(both.every((r) => r.ok)).toBe(true)
    expect(await values(id)).toEqual(['alpha', 'zeta'])
    expect((await addOptionToDef(root, id, 'alpha')).ok).toBe(true)
    expect(await values(id)).toEqual(['alpha', 'zeta'])
  })

  it('refuses a Select — only a Multi-Select adopts', async () => {
    const sel = await mkSelect([{ value: 'a', label: 'A' }])
    expect((await addOptionToDef(root, sel, 'b')).ok).toBe(false)
    expect((await readRegistry(root)).defs[sel].select_options?.map((o) => o.value)).toEqual(['a'])
  })

  it('applyAdoptions resolves from inside a page lock and from inside the schema chain', async () => {
    const id = await mkMulti()
    await machine().lock(join(root, 'any.md'), () =>
      applyAdoptions(root, [
        { propertyId: id, value: 'beta' },
        { propertyId: id, value: 'beta' },
      ]),
    )
    await serializeSchemaOp(() => applyAdoptions(root, [{ propertyId: id, value: 'gamma' }]))
    await applyAdoptions(root, [])
    expect(await values(id)).toEqual(['alpha', 'beta', 'gamma'])
  })
})
