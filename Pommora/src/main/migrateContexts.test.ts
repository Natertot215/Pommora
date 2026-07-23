import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CONTEXTS_SCHEMA_VERSION, migrateContexts } from './migrateContexts'
import { contextsDir, contextsRegistryFile, nexusDir } from './paths'
import { pathExists } from './io/atomicWrite'
import { splitFrontmatter } from './readNexus'

let root: string
const nx = () => join(nexusDir(root), 'nexus.json')

/** Today's real pre-migration shape: tier dirs + bare-ULID tierN arrays everywhere. */
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-migrate-'))
  await mkdir(nexusDir(root), { recursive: true })
  await writeFile(nx(), JSON.stringify({ schemaVersion: 1, id: 'nx1', createdAt: '2026' }))
  await writeFile(
    join(nexusDir(root), 'settings.json'),
    JSON.stringify({ labels: { area: { singular: 'Area', plural: 'Areas' } } }),
  )
  await writeFile(
    join(nexusDir(root), 'state.json'),
    JSON.stringify({ area_order: ['a-work'], collection_order: ['c1'] }),
  )
  await mkdir(join(nexusDir(root), 'areas', 'Work'), { recursive: true })
  await writeFile(
    join(nexusDir(root), 'areas', 'Work', '_area.json'),
    JSON.stringify({ id: 'a-work', tier: 1, color: 'pink', foreign: true }),
  )
  await mkdir(join(nexusDir(root), 'projects', 'Pommora'), { recursive: true })
  await writeFile(
    join(nexusDir(root), 'projects', 'Pommora', '_project.json'),
    JSON.stringify({ id: 'p-pom', tier: 3 }),
  )
  await mkdir(join(root, 'Notes'), { recursive: true })
  await writeFile(
    join(root, 'Notes', '_pagecollection.json'),
    JSON.stringify({
      id: 'c1',
      views: [
        {
          id: 'view_1',
          name: 'Table',
          type: 'table',
          property_order: ['_title'],
          hidden_properties: ['_tier2', '_tier3'],
        },
      ],
    }),
  )
  await writeFile(
    join(root, 'Notes', 'A.md'),
    '---\nid: pg1\ntier1:\n  - a-work\ntier3:\n  - p-pom\n  - GHOST\n---\nbody',
  )
  await mkdir(join(root, 'Tasks'), { recursive: true })
  await writeFile(join(root, 'Tasks', '_taskconfig.json'), '{}')
  await writeFile(
    join(root, 'Tasks', 'T.task.json'),
    JSON.stringify({ id: 't1', tier1: ['a-work'] }),
  )
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

const readNx = async () => JSON.parse(await readFile(nx(), 'utf8'))

describe('migrateContexts', () => {
  it('runs the full H-5 contract end to end', async () => {
    await migrateContexts(root)

    // Registry minted with reserved ids, titled from labels.
    const reg = JSON.parse(await readFile(contextsRegistryFile(root), 'utf8'))
    expect(reg.contexts.map((c: { id: string }) => c.id)).toEqual(['_tier1', '_tier2', '_tier3'])
    expect(reg.contexts[0].title).toBe('Areas')

    // Folders moved; sidecars transformed (tier dropped, color mapped, foreign kept).
    expect(await pathExists(join(nexusDir(root), 'areas'))).toBe(false)
    const sc = JSON.parse(
      await readFile(join(contextsDir(root), 'Areas', 'Work', '_space.json'), 'utf8'),
    )
    expect(sc.id).toBe('a-work')
    expect('tier' in sc).toBe(false)
    expect(sc.color).toBe('lavender')
    expect(sc.foreign).toBe(true)
    expect(await pathExists(join(contextsDir(root), 'Areas', 'Work', '_area.json'))).toBe(false)

    // Member files rewrote tierN → bracketed titles; the unresolvable id dropped.
    const fm = splitFrontmatter(await readFile(join(root, 'Notes', 'A.md'), 'utf8'))
    expect(fm['[Areas]']).toEqual(['Work'])
    expect(fm['[Projects]']).toEqual(['Pommora'])
    expect('tier1' in fm).toBe(false)
    expect('tier3' in fm).toBe(false)
    const t = JSON.parse(await readFile(join(root, 'Tasks', 'T.task.json'), 'utf8'))
    expect(t['[Areas]']).toEqual(['Work'])
    expect('tier1' in t).toBe(false)

    // Orders generalized; legacy keys gone.
    const state = JSON.parse(await readFile(join(nexusDir(root), 'state.json'), 'utf8'))
    expect(state.space_orders._tier1).toEqual(['a-work'])
    expect('area_order' in state).toBe(false)
    expect(state.collection_order).toEqual(['c1'])

    // The view's VISIBLE tier column (_tier1) recorded into property_order; hidden ones not.
    const col = JSON.parse(await readFile(join(root, 'Notes', '_pagecollection.json'), 'utf8'))
    expect(col.views[0].property_order).toEqual(['_title', '_tier1'])

    // Version bumped last.
    expect((await readNx()).schemaVersion).toBe(CONTEXTS_SCHEMA_VERSION)
  })

  it('is idempotent — a second run is a no-op', async () => {
    await migrateContexts(root)
    const before = await readFile(join(root, 'Notes', 'A.md'), 'utf8')
    await migrateContexts(root)
    expect(await readFile(join(root, 'Notes', 'A.md'), 'utf8')).toBe(before)
  })

  it('resumes a run killed after the folder move (version un-bumped re-triggers)', async () => {
    // Simulate the partial state: registry minted + folders moved, nothing else done.
    const { seededRegistry } = await import('@shared/contexts')
    const { DEFAULT_LABELS } = await import('@shared/types')
    await writeFile(contextsRegistryFile(root), JSON.stringify(seededRegistry(DEFAULT_LABELS)))
    await mkdir(join(contextsDir(root), 'Areas', 'Work'), { recursive: true })
    await writeFile(
      join(contextsDir(root), 'Areas', 'Work', '_area.json'),
      JSON.stringify({ id: 'a-work', tier: 1 }),
    )
    await rm(join(nexusDir(root), 'areas'), { recursive: true })

    await migrateContexts(root)
    const fm = splitFrontmatter(await readFile(join(root, 'Notes', 'A.md'), 'utf8'))
    expect(fm['[Areas]']).toEqual(['Work'])
    expect((await readNx()).schemaVersion).toBe(CONTEXTS_SCHEMA_VERSION)
  })

  it('resumes when EVERY tier dir is already gone (version alone re-triggers)', async () => {
    // The worst crash window: registry minted + all folders moved + tier dirs removed,
    // but no sidecar transformed and no member file rewritten.
    const { seededRegistry } = await import('@shared/contexts')
    const { DEFAULT_LABELS } = await import('@shared/types')
    await writeFile(contextsRegistryFile(root), JSON.stringify(seededRegistry(DEFAULT_LABELS)))
    await mkdir(join(contextsDir(root), 'Areas', 'Work'), { recursive: true })
    await writeFile(
      join(contextsDir(root), 'Areas', 'Work', '_area.json'),
      JSON.stringify({ id: 'a-work', tier: 1 }),
    )
    await mkdir(join(contextsDir(root), 'Projects', 'Pommora'), { recursive: true })
    await writeFile(
      join(contextsDir(root), 'Projects', 'Pommora', '_project.json'),
      JSON.stringify({ id: 'p-pom', tier: 3 }),
    )
    await rm(join(nexusDir(root), 'areas'), { recursive: true })
    await rm(join(nexusDir(root), 'projects'), { recursive: true })

    await migrateContexts(root)
    expect(await pathExists(join(contextsDir(root), 'Areas', 'Work', '_space.json'))).toBe(true)
    expect(await pathExists(join(contextsDir(root), 'Projects', 'Pommora', '_space.json'))).toBe(
      true,
    )
    const fm = splitFrontmatter(await readFile(join(root, 'Notes', 'A.md'), 'utf8'))
    expect(fm['[Areas]']).toEqual(['Work'])
    expect((await readNx()).schemaVersion).toBe(CONTEXTS_SCHEMA_VERSION)
  })

  it('leaves an unreadable tier sidecar in place and withholds the version bump', async () => {
    await writeFile(join(nexusDir(root), 'areas', 'Work', '_area.json'), 'not-json{')

    await migrateContexts(root)
    // The corrupt sidecar survives untransformed for a later retry; the healthy one converts.
    const moved = join(contextsDir(root), 'Areas', 'Work', '_area.json')
    expect(await pathExists(moved)).toBe(true)
    expect(await pathExists(join(contextsDir(root), 'Areas', 'Work', '_space.json'))).toBe(false)
    expect(await pathExists(join(contextsDir(root), 'Projects', 'Pommora', '_space.json'))).toBe(
      true,
    )
    expect((await readNx()).schemaVersion).toBe(1)

    // Healed on disk → the next open completes the remainder and seals.
    await writeFile(moved, JSON.stringify({ id: 'a-work', tier: 1 }))
    await migrateContexts(root)
    expect(await pathExists(join(contextsDir(root), 'Areas', 'Work', '_space.json'))).toBe(true)
    expect(await pathExists(moved)).toBe(false)
    expect((await readNx()).schemaVersion).toBe(CONTEXTS_SCHEMA_VERSION)
  })

  it('skips a raw nexus (no nexus.json) and a current-version nexus', async () => {
    await rm(nx())
    await migrateContexts(root)
    expect(await pathExists(contextsRegistryFile(root))).toBe(false)

    await writeFile(
      nx(),
      JSON.stringify({ schemaVersion: CONTEXTS_SCHEMA_VERSION, id: 'nx1', createdAt: '2026' }),
    )
    await migrateContexts(root)
    expect(await pathExists(contextsRegistryFile(root))).toBe(false)
  })
})
