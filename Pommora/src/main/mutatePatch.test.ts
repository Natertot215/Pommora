import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdir, mkdtemp, rename, rm, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { stabilize } from '@shared/treeStabilize'
import { dropLiveTree, getLiveTree, refreshTree } from './liveTree'
import { readNexus } from './readNexus'
import { confirmBy, confirmMutation, confirmRegistry } from './mutatePatch'
import { patchContainerFromDisk } from './watchPatch'

vi.mock('./readNexus', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./readNexus')>()
  return { ...mod, readNexus: vi.fn(mod.readNexus) }
})

const walkSpy = vi.mocked(readNexus)

const ULID_A = '01ARZ3NDEKTSV4RRFFQ69G5FAV'
const ULID_B = '01BX5ZZKBKACTAV9WEVGEMMVRZ'

let root: string
const abs = (...segs: string[]): string => join(root, ...segs)

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-mutpatch-'))
  await mkdir(abs('.nexus', 'contexts', 'Areas', 'Home'), { recursive: true })
  await writeFile(abs('.nexus', 'nexus.json'), JSON.stringify({ id: 'nx1' }))
  await writeFile(
    abs('.nexus', 'contexts.json'),
    JSON.stringify({ contexts: [{ id: 'ctx1', title: 'Areas' }] }),
  )
  await writeFile(
    abs('.nexus', 'contexts', 'Areas', 'Home', '_space.json'),
    JSON.stringify({ id: 'sp1' }),
  )
  await writeFile(
    abs('.nexus', 'properties.json'),
    JSON.stringify({
      order: ['prop_a'],
      defs: { prop_a: { id: 'prop_a', name: 'Status', type: 'select' } },
    }),
  )
  await mkdir(abs('Notes'), { recursive: true })
  await writeFile(
    abs('Notes', '_pagecollection.json'),
    JSON.stringify({ id: 'c1', properties: ['prop_a'] }),
  )
  await writeFile(abs('Notes', 'A.md'), `---\nPageID: ${ULID_A}\n---\n\nalpha\n`)
  await refreshTree(root)
  walkSpy.mockClear()
})
afterEach(async () => {
  dropLiveTree()
  await rm(root, { recursive: true, force: true })
})

describe('confirmMutation', () => {
  it('a rename patches by transform, walk-identically and walk-free', async () => {
    await rename(abs('Notes', 'A.md'), abs('Notes', 'Alpha.md'))
    const pushed = await confirmMutation(
      root,
      { op: 'rename', path: 'Notes/A.md', kind: 'page', newName: 'Alpha' },
      { renamed: { path: 'Notes/Alpha.md', name: 'Alpha' } },
    )
    expect(pushed).not.toBeNull()
    expect(walkSpy).not.toHaveBeenCalled()
    const live = getLiveTree()
    expect(live?.collections[0]?.pages[0]?.path).toBe('Notes/Alpha.md')
    expect(stabilize(await readNexus(root), live)).toBe(live)
  })

  it('a delete patches by transform; a create pins its order from the parent sidecar', async () => {
    await writeFile(abs('Notes', 'B.md'), `---\nPageID: ${ULID_B}\n---\n\nbeta\n`)
    const created = await confirmMutation(
      root,
      { op: 'createPage', parentPath: 'Notes', name: 'B' },
      { created: { id: ULID_B, path: 'Notes/B.md' } },
    )
    expect(created).not.toBeNull()
    expect(walkSpy).not.toHaveBeenCalled()
    await unlink(abs('Notes', 'A.md'))
    const deleted = await confirmMutation(
      root,
      { op: 'delete', path: 'Notes/A.md', kind: 'page' },
      {},
    )
    expect(deleted).not.toBeNull()
    const live = getLiveTree()
    expect(live?.collections[0]?.pages.map((p) => p.id)).toEqual([ULID_B])
    expect(stabilize(await readNexus(root), live)).toBe(live)
  })

  it('the no-change arm: a cell edit costs zero walks AND zero pushes', async () => {
    const before = getLiveTree()
    const pushed = await confirmMutation(
      root,
      { op: 'setProperty', path: 'Notes/A.md', propertyId: 'prop_a', value: null },
      {},
    )
    expect(pushed).toBeNull()
    expect(getLiveTree()).toBe(before)
    expect(walkSpy).not.toHaveBeenCalled()
  })

  it('setContext confirms by one page read — zero walks, contextValues patched', async () => {
    await writeFile(
      abs('Notes', 'A.md'),
      `---\nPageID: ${ULID_A}\n(Areas):\n  - Home\n---\n\nalpha\n`,
    )
    const pushed = await confirmMutation(
      root,
      { op: 'setContext', path: 'Notes/A.md', contextId: 'ctx1', spaceIds: ['sp1'] },
      {},
    )
    expect(pushed).not.toBeNull()
    expect(walkSpy).not.toHaveBeenCalled()
    const live = getLiveTree()
    expect(live?.collections[0]?.pages[0]?.contextValues).toEqual({ ctx1: ['sp1'] })
    expect(stabilize(await readNexus(root), live)).toBe(live)
  })
})

describe('confirmRegistry', () => {
  it('patches the disk-normalized def into BOTH homes, reference-identically', async () => {
    await writeFile(
      abs('.nexus', 'properties.json'),
      JSON.stringify({
        order: ['prop_a'],
        defs: { prop_a: { id: 'prop_a', name: 'Stage', type: 'select' } },
      }),
    )
    const pushed = await confirmRegistry(root)
    expect(pushed).not.toBeNull()
    expect(walkSpy).not.toHaveBeenCalled()
    const live = getLiveTree()
    expect(live?.registry[0]?.name).toBe('Stage')
    expect(live?.collections[0]?.properties?.[0]).toBe(live?.registry[0])
    expect(stabilize(await readNexus(root), live)).toBe(live)
  })
})

describe('confirmBy over the container patcher', () => {
  it('a view save and a container configure land in the node without a walk', async () => {
    await writeFile(
      abs('Notes', '_pagecollection.json'),
      JSON.stringify({
        id: 'c1',
        properties: ['prop_a'],
        open_in: 'page-preview',
        views: [{ id: 'view_1', name: 'All', type: 'table' }],
      }),
    )
    const pushed = await confirmBy(root, () => patchContainerFromDisk(root, 'Notes'))
    expect(pushed).not.toBeNull()
    expect(walkSpy).not.toHaveBeenCalled()
    const live = getLiveTree()
    expect(live?.collections[0]?.openIn).toBe('page-preview')
    expect(live?.collections[0]?.views?.[0]?.name).toBe('All')
    expect(stabilize(await readNexus(root), live)).toBe(live)
  })
})
