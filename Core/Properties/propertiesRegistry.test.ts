import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rm, writeFile, mkdir } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { tempRoot, readJsonAt } from '../Testing/hostFs'
import { mutateRegistry, orderedDefs, readKeptRegistry, readRegistry } from './propertiesRegistry'
import type { PropertyDefinition } from './properties'

type RegistryFile = {
  order: string[]
  defs: Record<string, Record<string, unknown>>
  [key: string]: unknown
}

let root: string
beforeEach(async () => {
  root = tempRoot('pom-registry-')
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

const def = (id: string, name: string): PropertyDefinition =>
  ({
    id,
    label: name,
    key: name,
    type: 'select',
    select_options: [{ key: 'a', label: 'a', color: 'blue' }],
  }) as PropertyDefinition

describe('propertiesRegistry', () => {
  it('reads empty when the file is absent', async () => {
    expect(await readRegistry(root)).toEqual({ order: [], defs: {} })
  })

  it('refuses an unreadable file rather than answering "no properties"', async () => {
    await mkdir(join(root, '.nexus'), { recursive: true })
    await writeFile(join(root, '.nexus', 'properties.json'), '{nope')
    await expect(readRegistry(root)).rejects.toThrow()
    await expect(mutateRegistry(root, () => ({ result: undefined }))).rejects.toThrow()
  })

  it('a registry damaged after a write keeps that write for a read that writes nothing', async () => {
    const next = { order: ['prop_a'], defs: { prop_a: def('prop_a', 'Priority') } }
    await mutateRegistry(root, () => ({ next, result: undefined }))
    await writeFile(join(root, '.nexus', 'properties.json'), '{ corrupt')
    expect(await readKeptRegistry(root)).toEqual(next)
  })

  it('round-trips a registry written through the mutation chain', async () => {
    const reg = {
      order: ['prop_b', 'prop_a'],
      defs: { prop_a: def('prop_a', 'Priority'), prop_b: def('prop_b', 'Status') },
    }
    await mutateRegistry(root, () => ({ next: reg, result: undefined }))
    expect(await readRegistry(root)).toEqual(reg)
  })

  it('drops entries that fail the def schema, keeps valid ones', async () => {
    await mkdir(join(root, '.nexus'), { recursive: true })
    await writeFile(
      join(root, '.nexus', 'properties.json'),
      JSON.stringify({
        order: [],
        defs: { prop_a: def('prop_a', 'Priority'), prop_bad: { id: 'prop_bad' } },
      }),
    )
    expect(Object.keys((await readRegistry(root)).defs)).toEqual(['prop_a'])
  })

  it('reads two options that fold alike as the first, and two definitions whose names fold alike as the first', async () => {
    await mkdir(join(root, '.nexus'), { recursive: true })
    const options = [
      { key: 'alpha', label: 'alpha' },
      { key: 'Alpha', label: 'Alpha' },
      { key: 'beta', label: 'beta' },
      { key: 'x', label: 'Gamma' },
      { key: 'X', label: 'Delta' },
    ]
    const file = {
      order: ['prop_a', 'prop_b'],
      defs: {
        prop_a: {
          id: 'prop_a',
          label: 'Tags',
          key: 'Tags',
          type: 'multiSelect',
          select_options: options,
        },
        prop_b: { id: 'prop_b', label: 'tags', key: 'tags', type: 'number' },
      },
    }
    await writeFile(join(root, '.nexus', 'properties.json'), JSON.stringify(file))
    const { defs } = await readRegistry(root)
    expect(Object.keys(defs)).toEqual(['prop_a'])
    expect(defs.prop_a.select_options?.map((o) => o.label)).toEqual(['alpha', 'beta', 'Gamma'])
    await mutateRegistry(root, (registry) => ({ next: registry, result: undefined }))
    const kept = await readJsonAt<RegistryFile>(join(root, '.nexus', 'properties.json'))
    expect(kept.defs.prop_b).toEqual(file.defs.prop_b)
    expect(kept.defs.prop_a.select_options).toEqual(options)
  })

  it('admits the first definition by id to write a key in any casing, the same one after a write, and none whose key Pommora manages', async () => {
    await mkdir(join(root, '.nexus'), { recursive: true })
    const file = {
      order: ['prop_z', 'prop_b', 'prop_c'],
      defs: {
        prop_z: { id: 'prop_z', label: 'Zed', key: 'x', type: 'number' },
        prop_b: { id: 'prop_b', label: 'Bee', key: 'X', type: 'number' },
        prop_c: { id: 'prop_c', label: 'My Banner', key: 'banner', type: 'text' },
      },
    }
    await writeFile(join(root, '.nexus', 'properties.json'), JSON.stringify(file))
    expect(Object.keys((await readRegistry(root)).defs)).toEqual(['prop_b'])
    await mutateRegistry(root, (registry) => ({ next: registry, result: undefined }))
    expect(Object.keys((await readRegistry(root)).defs)).toEqual(['prop_b'])
    const kept = await readJsonAt<RegistryFile>(join(root, '.nexus', 'properties.json'))
    expect(kept.defs.prop_z).toEqual(file.defs.prop_z)
    expect(kept.defs.prop_c).toEqual(file.defs.prop_c)
  })
})

describe('a definition with no label (C-3)', () => {
  it('reads its key as its label, and a mutation of another definition leaves it as stored', async () => {
    await mkdir(join(root, '.nexus'), { recursive: true })
    const file = {
      order: ['prop_a', 'prop_b'],
      defs: {
        prop_a: { id: 'prop_a', key: 'Tags', type: 'text' },
        prop_b: { id: 'prop_b', label: 'Due', key: 'Due', type: 'number' },
      },
    }
    await writeFile(join(root, '.nexus', 'properties.json'), JSON.stringify(file))
    expect((await readRegistry(root)).defs.prop_a?.label).toBe('Tags')
    await mutateRegistry(root, (registry) => ({
      next: {
        ...registry,
        defs: { ...registry.defs, prop_b: { ...registry.defs.prop_b, icon: 'star' } },
      },
      result: undefined,
    }))
    const kept = await readJsonAt<RegistryFile>(join(root, '.nexus', 'properties.json'))
    expect(kept.defs.prop_a).toEqual(file.defs.prop_a)
    expect(kept.defs.prop_b?.icon).toBe('star')
  })
})

describe('hostile hand-edited files (breaker M-2/L-1)', () => {
  it('decodes an unknown Key Format as none', async () => {
    await mkdir(join(root, '.nexus'), { recursive: true })
    await writeFile(
      join(root, '.nexus', 'properties.json'),
      JSON.stringify({
        order: ['prop_a'],
        defs: { prop_a: { ...def('prop_a', 'Real'), key_format: 'Shouting' } },
      }),
    )
    const reg = await readRegistry(root)
    expect(reg.defs.prop_a).toBeDefined()
    expect(reg.defs.prop_a?.key_format).toBeUndefined()
  })

  it('decodes an unknown Value Format as none', async () => {
    await mkdir(join(root, '.nexus'), { recursive: true })
    await writeFile(
      join(root, '.nexus', 'properties.json'),
      JSON.stringify({
        order: ['prop_a'],
        defs: { prop_a: { ...def('prop_a', 'Real'), value_format: 'Shouting' } },
      }),
    )
    const reg = await readRegistry(root)
    expect(reg.defs.prop_a).toBeDefined()
    expect(reg.defs.prop_a?.value_format).toBeUndefined()
  })

  it('orderedDefs lists a key≠id desync exactly once', async () => {
    const desynced = { ...def('prop_b', 'Desync'), id: 'prop_b' }
    const reg = { order: ['prop_a'], defs: { prop_a: desynced } }
    expect(orderedDefs(reg)).toHaveLength(1)
  })

  it('orderedDefs lists an id the order repeats exactly once', () => {
    const reg = { order: ['prop_a', 'prop_a'], defs: { prop_a: def('prop_a', 'Twice') } }
    expect(orderedDefs(reg)).toHaveLength(1)
  })

  it('one junk entry inside a real file leaves every def visible', async () => {
    await mkdir(join(root, '.nexus'), { recursive: true })
    await writeFile(
      join(root, '.nexus', 'properties.json'),
      JSON.stringify({
        order: ['prop_a'],
        defs: { prop_a: def('prop_a', 'Real'), junk: 'a stray string' },
      }),
    )
    const reg = await readRegistry(root)
    expect(reg.defs.prop_a?.label).toBe('Real')
    expect(reg.order).toEqual(['prop_a'])
  })
})

describe('RegistryFile shape — { order, defs }', () => {
  it('element-filters junk order entries — non-strings and ids without defs dropped (B-3)', async () => {
    await mkdir(join(root, '.nexus'), { recursive: true })
    await writeFile(
      join(root, '.nexus', 'properties.json'),
      JSON.stringify({
        order: ['prop_a', 42, null, 'prop_gone'],
        defs: { prop_a: def('prop_a', 'Priority') },
      }),
    )
    expect((await readRegistry(root)).order).toEqual(['prop_a'])
  })
})

// The file is read-modify-written whole, under its own per-path lock, so neither of two overlapping mutations may drop the other's change.
describe('serialization', () => {
  it('concurrent mutations both land', async () => {
    await mutateRegistry(root, () => ({ next: { order: [], defs: {} }, result: undefined }))
    await Promise.all([
      mutateRegistry(root, (reg) => ({
        next: {
          order: [...reg.order, 'prop_a'],
          defs: { ...reg.defs, prop_a: def('prop_a', 'A') },
        },
        result: undefined,
      })),
      mutateRegistry(root, (reg) => ({
        next: {
          order: [...reg.order, 'prop_b'],
          defs: { ...reg.defs, prop_b: def('prop_b', 'B') },
        },
        result: undefined,
      })),
    ])
    const after = await readRegistry(root)
    expect(Object.keys(after.defs).sort()).toEqual(['prop_a', 'prop_b'])
    expect([...after.order].sort()).toEqual(['prop_a', 'prop_b'])
  })
})

describe('untouched definitions', () => {
  it('a write to one definition leaves every other one byte-for-byte as written', async () => {
    const future = {
      id: 'prop_f',
      label: 'Money',
      key: 'Money',
      type: 'number',
      number_family: 'crypto',
      number_denominator: 'sixteenths',
    }
    await mkdir(join(root, '.nexus'), { recursive: true })
    await writeFile(
      join(root, '.nexus', 'properties.json'),
      JSON.stringify({
        order: ['prop_f', 'prop_a'],
        defs: { prop_f: future, prop_a: def('prop_a', 'Priority') },
        plugin_top: { keep: 1 },
      }),
    )
    await mutateRegistry(root, (reg) => ({
      next: {
        ...reg,
        defs: { ...reg.defs, prop_a: { ...reg.defs.prop_a, label: 'Urgency', key: 'Urgency' } },
      },
      result: undefined,
    }))
    const after = await readJsonAt<RegistryFile>(join(root, '.nexus', 'properties.json'))
    expect(after.defs.prop_f).toEqual(future)
    expect(after.defs.prop_a.label).toBe('Urgency')
    expect(after.plugin_top).toEqual({ keep: 1 })
  })
})

describe('the edited definition', () => {
  it('keeps its own values this build does not recognize, and takes every key the edit changed', async () => {
    const stored = {
      id: 'prop_f',
      label: 'Money',
      key: 'Money',
      type: 'number',
      icon: 'coins',
      number_family: 'crypto',
      plugin_key: { keep: 1 },
    }
    await mkdir(join(root, '.nexus'), { recursive: true })
    await writeFile(
      join(root, '.nexus', 'properties.json'),
      JSON.stringify({ order: ['prop_f'], defs: { prop_f: stored } }),
    )
    await mutateRegistry(root, (reg) => {
      const { icon: _cleared, ...rest } = reg.defs.prop_f
      return {
        next: { ...reg, defs: { prop_f: { ...rest, label: 'Cash', key: 'Cash' } } },
        result: undefined,
      }
    })
    const after = await readJsonAt<RegistryFile>(join(root, '.nexus', 'properties.json'))
    expect(after.defs.prop_f).toEqual({
      id: 'prop_f',
      label: 'Cash',
      key: 'Cash',
      type: 'number',
      number_family: 'crypto',
      plugin_key: { keep: 1 },
    })
  })

  it('hands fn the stored definition with its unrecognized keys intact', async () => {
    const stored = {
      id: 'prop_f',
      label: 'Money',
      key: 'Money',
      type: 'number',
      number_family: 'crypto',
      plugin_key: { keep: 1 },
    }
    await mkdir(join(root, '.nexus'), { recursive: true })
    await writeFile(
      join(root, '.nexus', 'properties.json'),
      JSON.stringify({ order: ['prop_f'], defs: { prop_f: stored } }),
    )
    const seen = await mutateRegistry(root, (reg, raw) => ({
      result: { decoded: reg.defs.prop_f, raw: raw.prop_f },
    }))
    expect(seen.raw).toEqual(stored)
    expect(seen.decoded).toEqual({
      id: 'prop_f',
      label: 'Money',
      key: 'Money',
      type: 'number',
      plugin_key: { keep: 1 },
    })
  })
})
