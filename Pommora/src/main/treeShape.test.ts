import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { NexusTree } from '@shared/types'
import { insertCreatedInTree } from '@shared/treePatch'
import { stabilize } from '@shared/treeStabilize'
import { readNexus } from './readNexus'

const PAGE_ULID = '01ARZ3NDEKTSV4RRFFQ69G5FAV'

let root: string

// A sidecar-mode nexus with one Collection and one Context group — the "before" state the
// create transforms are applied against. The entities the second walk finds on disk are
// written between the walks by the test itself.
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-shape-'))
  await mkdir(join(root, '.nexus'), { recursive: true })
  await writeFile(join(root, '.nexus', 'nexus.json'), JSON.stringify({ id: 'nx1' }))
  await writeFile(
    join(root, '.nexus', 'contexts.json'),
    JSON.stringify({ contexts: [{ id: 'ctx1', title: 'Areas' }] }),
  )
  await mkdir(join(root, 'Notes'), { recursive: true })
  await writeFile(join(root, 'Notes', '_pagecollection.json'), JSON.stringify({ id: 'c1' }))
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('transform-built nodes carry the walk key shape', () => {
  it('a created page, set, collection, and space are stabilize-identical to their walked selves', async () => {
    const before = await readNexus(root)

    await writeFile(join(root, 'Notes', 'A.md'), `---\nPageID: ${PAGE_ULID}\n---\n\nbody\n`)
    await mkdir(join(root, 'Notes', 'Sub'), { recursive: true })
    await writeFile(join(root, 'Notes', 'Sub', '_pageset.json'), JSON.stringify({ id: 's1' }))
    await mkdir(join(root, 'Ideas'), { recursive: true })
    await writeFile(join(root, 'Ideas', '_pagecollection.json'), JSON.stringify({ id: 'c2' }))
    await mkdir(join(root, '.nexus', 'contexts', 'Areas', 'Home'), { recursive: true })
    await writeFile(
      join(root, '.nexus', 'contexts', 'Areas', 'Home', '_space.json'),
      JSON.stringify({ id: 'sp1' }),
    )
    const walked = await readNexus(root)

    let patched: NexusTree | null = before
    patched = insertCreatedInTree(
      patched,
      { op: 'createPage', parentPath: 'Notes', name: 'A' },
      { id: PAGE_ULID, path: 'Notes/A.md' },
    )
    expect(patched).not.toBeNull()
    patched = insertCreatedInTree(
      patched as NexusTree,
      { op: 'createContainer', parentPath: 'Notes', kind: 'set', name: 'Sub' },
      { id: 's1', path: 'Notes/Sub' },
    )
    expect(patched).not.toBeNull()
    patched = insertCreatedInTree(
      patched as NexusTree,
      { op: 'createContainer', parentPath: '', kind: 'collection', name: 'Ideas' },
      { id: 'c2', path: 'Ideas' },
    )
    expect(patched).not.toBeNull()
    patched = insertCreatedInTree(
      patched as NexusTree,
      { op: 'createSpace', contextId: 'ctx1', name: 'Home' },
      { id: 'sp1', path: '.nexus/contexts/Areas/Home' },
    )
    expect(patched).not.toBeNull()

    // Deep-equality alone is not the claim — stabilize must return the PATCHED tree object
    // itself, which requires every key set to match the walk's literals exactly.
    expect(stabilize(walked, patched)).toBe(patched)
  })
})
