import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mutateRegistry, orderedDefs, readRegistry } from './propertiesRegistry'
import type { PropertyDefinition } from '@shared/properties'
import {
  ensureContextsRegistry,
  mutateRegistryFile,
  readRegistry as readRegistry2,
} from '../contextsRegistry'
import { DEFAULT_LABELS } from '@shared/types'

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-registry-'))
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

const def = (id: string, name: string): PropertyDefinition =>
  ({
    id,
    name,
    type: 'select',
    select_options: [{ value: 'a', label: 'A', color: 'blue' }],
  }) as PropertyDefinition

describe('propertiesRegistry', () => {
  it('reads empty when the file is absent', async () => {
    expect(await readRegistry(root)).toEqual({ order: [], defs: {} })
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
      JSON.stringify({ prop_a: def('prop_a', 'Priority'), prop_bad: { id: 'prop_bad' } }),
    )
    expect(Object.keys((await readRegistry(root)).defs)).toEqual(['prop_a'])
  })
})

describe('hostile hand-edited files (breaker M-2/L-1)', () => {
  it('a LEGACY file with a def literally keyed "defs" still reads as legacy — nothing vanishes', async () => {
    await mkdir(join(root, '.nexus'), { recursive: true })
    await writeFile(
      join(root, '.nexus', 'properties.json'),
      JSON.stringify({ defs: def('prop_hostile', 'Hostile'), prop_a: def('prop_a', 'Real') }),
    )
    const reg = await readRegistry(root)
    expect(reg.defs.prop_a?.name).toBe('Real')
  })

  it('a LEGACY file with junk keyed "order" keeps its real defs', async () => {
    await mkdir(join(root, '.nexus'), { recursive: true })
    await writeFile(
      join(root, '.nexus', 'properties.json'),
      JSON.stringify({ order: ['garbage'], prop_a: def('prop_a', 'Real') }),
    )
    expect((await readRegistry(root)).defs.prop_a?.name).toBe('Real')
  })

  it('orderedDefs lists a key≠id desync exactly once', async () => {
    const desynced = { ...def('prop_b', 'Desync'), id: 'prop_b' }
    const reg = { order: ['prop_a'], defs: { prop_a: desynced } } // map key prop_a, internal id prop_b
    expect(orderedDefs(reg)).toHaveLength(1)
  })

  it('one junk entry inside a real file never flips it to legacy — every def stays visible', async () => {
    await mkdir(join(root, '.nexus'), { recursive: true })
    await writeFile(
      join(root, '.nexus', 'properties.json'),
      JSON.stringify({
        order: ['prop_a'],
        defs: { prop_a: def('prop_a', 'Real'), junk: 'a stray string' },
      }),
    )
    const reg = await readRegistry(root)
    expect(reg.defs.prop_a?.name).toBe('Real')
    expect(reg.order).toEqual(['prop_a'])
  })
})

describe('RegistryFile shape — { order, defs } with legacy migration', () => {
  it('reads a legacy bare-Record file as { order: [], defs }', async () => {
    await mkdir(join(root, '.nexus'), { recursive: true })
    await writeFile(
      join(root, '.nexus', 'properties.json'),
      JSON.stringify({ prop_a: def('prop_a', 'Priority') }),
    )
    const reg = await readRegistry(root)
    expect(reg.defs.prop_a?.id).toBe('prop_a')
    expect(reg.order).toEqual([])
  })

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

// Both registry files are read-modify-written whole, and both now take the same per-path lock
// rather than one taking a private chain of its own. This crosses the two: neither may drop a
// concurrent sibling's change, and the answer must be the same on each side.
describe('the two registries serialize the same way', () => {
  it('concurrent property-registry mutations both land', async () => {
    await mutateRegistry(root, () => ({ next: { order: [], defs: {} }, result: undefined }))
    await Promise.all([
      mutateRegistry(root, (reg) => ({
        next: { order: [...reg.order, 'prop_a'], defs: { ...reg.defs, prop_a: def('prop_a', 'A') } },
        result: undefined,
      })),
      mutateRegistry(root, (reg) => ({
        next: { order: [...reg.order, 'prop_b'], defs: { ...reg.defs, prop_b: def('prop_b', 'B') } },
        result: undefined,
      })),
    ])
    const after = await readRegistry(root)
    expect(Object.keys(after.defs).sort()).toEqual(['prop_a', 'prop_b'])
    expect([...after.order].sort()).toEqual(['prop_a', 'prop_b'])
  })

  it('concurrent contexts-registry mutations both land', async () => {
    await mkdir(join(root, '.nexus'), { recursive: true })
    await ensureContextsRegistry(root)
    await Promise.all([
      mutateRegistryFile(root, (cur) => ({
        ...cur,
        contexts: [...cur.contexts, { id: 'ctx_x', title: 'X', singular: 'X' }],
      })),
      mutateRegistryFile(root, (cur) => ({
        ...cur,
        contexts: [...cur.contexts, { id: 'ctx_y', title: 'Y', singular: 'Y' }],
      })),
    ])
    const after = await readRegistry2(root, DEFAULT_LABELS)
    expect(after.ok).toBe(true)
    if (!after.ok) return
    const titles = after.value.contexts.map((c) => c.title)
    expect(titles).toContain('X')
    expect(titles).toContain('Y')
  })
})
