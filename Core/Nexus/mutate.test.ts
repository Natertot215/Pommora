import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as liveTree from './liveTree'
import { dropLiveTree, getLiveTree, refreshTree } from './liveTree'
import { splitFrontmatter } from '../Files/pageFile'
import { ID_KEY } from './identityMark'
import { rm, mkdir, writeFile, readFile, readdir, chmod, symlink, stat } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { readJsonAt, seedSpaceSidecar, tempRoot, noModeBits, windows } from '../Testing/hostFs'
import { adoptFile } from '../Assets/adoptFile'
import { confirmedMutate } from '../Testing/confirmedMutate'
import { handleMutate } from './mutate'
import { machine } from '../Platform/machine'
import { contextsDir, nexusConfig, sidecarPath, tileHostDir } from '../Paths/paths'
import { resolveUnderRoot } from '../Paths/pathSafety'
import { NEW_SLOT, type MutateRequest, mutateRequest } from './mutateRequest'
import type { Crop } from './schemas'
import { cropKeyFor, NEXUS_CONFIG_FILES } from '../Paths/nexusPaths'
import { assetFilePath } from '../Assets/assetRoots'
import { shardOf } from './ids'

const A_ID = '01KVGMT8BFP350FZZXAMG1QDRA'
const B_ID = '01KVGMT8BFP350FZZXAMG1QDRB'
const G_ID = '01KVGMT8BFP350FZZXAMG1QDRG'
import { openSession, closeSession } from './session'
import { flushValueWrites } from './valuesChanged'
import { readNexus } from './readNexus'
import { forgetLastReads, pathExists } from '../Files/atomicWrite'
import { captureWriteTap } from '../Testing/writeTap'
import { setWriteTap } from '../Files/writeEcho'
import { readFileSync } from 'node:fs'
import { createProperty } from '../Properties/registryProperty'
import { liveAssetMap, resolveAssetName, takeAssetMapPush } from '../Assets/assetMap'
import type { TrashDeps } from '../Trash/bundle'
import type { HostContext } from '../Contract/handlers'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import * as indexSeed from '../Index/indexSeed'
import * as assignment from '../Properties/assignment'
import * as contextCascade from '../Contexts/contextCascade'
import * as atomicWrite from '../Files/atomicWrite'
import { seedContentIndex } from '../Index/indexSeed'
import { createMarkdownTile, readMarkdownTile, writeMarkdownTile } from '../Tiles/tilesFile'
import { landedId } from '../Testing/tileLayouts'
import { lockContention } from '../Testing/machines'
import { ok } from '../Contract/result'
import { nexusHandlers } from './handlers'

let root: string
const nexusDeps: TrashDeps = { trashMode: 'nexus', trashToSystem: (p) => rm(p, { force: true }) }

const read = async (rel: string): Promise<string> => readFile(join(root, rel), 'utf8')
const readJson = <T = Record<string, unknown>>(rel: string): Promise<T> =>
  readJsonAt<T>(join(root, rel))

beforeEach(async () => {
  root = tempRoot('pom-mutate-')
  await mkdir(join(root, '.nexus', 'assets'), { recursive: true })
  await mkdir(join(root, '.nexus', 'homepage'), { recursive: true })
  await mkdir(join(root, 'Notes', 'Daily'), { recursive: true })
  await writeFile(
    join(root, '.nexus', 'nexus.json'),
    JSON.stringify({ id: 'nx', createdAt: '2026' }),
  )
  await writeFile(join(root, '.nexus', 'settings.json'), '{}')
  await writeFile(join(root, 'Notes', '_pagecollection.json'), JSON.stringify({ id: 'pt' }))
  await writeFile(join(root, 'Notes', 'Daily', '_pageset.json'), JSON.stringify({ id: 'col' }))
  await writeFile(
    join(root, 'Notes', 'Daily', 'Alpha.md'),
    '---\nID: 01KVGMT8BFP350FZZXAMG1QDRA\n<Areas>:\n  - Work\n---\n\nSee [[Beta]] for more.',
  )
  await writeFile(
    join(root, 'Notes', 'Daily', 'Beta.md'),
    '---\nID: 01KVGMT8BFP350FZZXAMG1QDRB\n---\n\nbody',
  )
  await openSession(root)
})
afterEach(async () => {
  dropLiveTree()
  closeSession()
  await rm(root, { recursive: true, force: true })
})

describe('handleMutate — create', () => {
  it('createPage writes a .md in the resolved container + returns its relative path', async () => {
    const r = await confirmedMutate(
      root,
      { op: 'createPage', parentPath: 'Notes/Daily', name: 'New' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.created?.path).toBe('Notes/Daily/New.md')
    expect(await pathExists(join(root, 'Notes/Daily/New.md'))).toBe(true)
  })

  it('createContainer makes a set folder + sidecar', async () => {
    const r = await confirmedMutate(
      root,
      { op: 'createContainer', parentPath: 'Notes', kind: 'set', name: 'Weekly' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.created?.path).toBe('Notes/Weekly')
    expect(await pathExists(join(root, 'Notes/Weekly/_pageset.json'))).toBe(true)
  })

  it('disambiguates a colliding create name (Untitled → Untitled (2))', async () => {
    const first = await confirmedMutate(
      root,
      { op: 'createPage', parentPath: 'Notes/Daily', name: 'Untitled' },
      nexusDeps,
    )
    const second = await confirmedMutate(
      root,
      { op: 'createPage', parentPath: 'Notes/Daily', name: 'Untitled' },
      nexusDeps,
    )
    expect(first.ok && first.value.created?.path).toBe('Notes/Daily/Untitled.md')
    expect(second.ok && second.value.created?.path).toBe('Notes/Daily/Untitled (2).md')
    expect(await pathExists(join(root, 'Notes/Daily/Untitled (2).md'))).toBe(true)
  })

  it('createPage writes its seeds in the birth write; a dead-property seed drops; a blank seed writes no key', async () => {
    await createProperty(root, { id: 'prop_stage', name: 'Stage', type: 'select' })
    const r = await confirmedMutate(
      root,
      {
        op: 'createPage',
        parentPath: 'Notes/Daily',
        name: 'Seeded',
        seeds: {
          prop_stage: { kind: 'select', value: 'doing' },
          prop_gone: { kind: 'select', value: 'x' },
        },
      },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const fm = splitFrontmatter(await read('Notes/Daily/Seeded.md'))
    expect(fm.Stage).toEqual(['doing'])
    expect(Object.keys(fm).some((k) => k.includes('gone'))).toBe(false)

    const blank = await confirmedMutate(
      root,
      {
        op: 'createPage',
        parentPath: 'Notes/Daily',
        name: 'Blank Seed',
        seeds: { prop_stage: { kind: 'select', value: '' } },
      },
      nexusDeps,
    )
    expect(blank.ok).toBe(true)
    expect('Stage' in splitFrontmatter(await read('Notes/Daily/Blank Seed.md'))).toBe(false)
  })

  it('createPage lands a Context seed through the Context writer; an unknown Space refuses the create', async () => {
    await seedSpaceSidecar(root, 'Areas', 'Work', { id: 'sp-work' })
    await writeFile(
      join(root, '.nexus', 'contexts', 'contexts.json'),
      JSON.stringify({ contexts: [{ id: 'ctxA', title: 'Areas', singular: 'Area' }] }),
    )
    const seeded = (name: string, spaceId: string): MutateRequest => ({
      op: 'createPage',
      parentPath: 'Notes/Daily',
      name,
      seeds: { ctxA: { kind: 'context', value: [spaceId] } },
    })
    expect((await confirmedMutate(root, seeded('In Work', 'sp-work'), nexusDeps)).ok).toBe(true)
    expect(splitFrontmatter(await read('Notes/Daily/In Work.md'))['<Areas>']).toEqual(['Work'])
    expect((await confirmedMutate(root, seeded('Stale', 'sp-gone'), nexusDeps)).ok).toBe(false)
    expect(await pathExists(join(root, 'Notes/Daily/Stale.md'))).toBe(false)
  })

  it('createPage order substitutes NEW_SLOT with the minted id and persists page_order', async () => {
    const r = await confirmedMutate(
      root,
      {
        op: 'createPage',
        parentPath: 'Notes/Daily',
        name: 'Ordered',
        order: [NEW_SLOT, A_ID, B_ID],
      },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const sidecar = await readJson<{ page_order?: string[] }>('Notes/Daily/_pageset.json')
    expect(sidecar.page_order).toEqual([r.value.created?.id, A_ID, B_ID])
    const tree = await readNexus(root)
    const daily = tree.collections.flatMap((c) => c.sets).find((s) => s.path === 'Notes/Daily')
    expect(daily?.pages.map((p) => p.title).slice(0, 3)).toEqual(['Ordered', 'Alpha', 'Beta'])
  })

  it('createContainer order substitutes NEW_SLOT with the minted id and persists set_order', async () => {
    const before = await readNexus(root)
    const siblings = before.collections.find((c) => c.path === 'Notes')?.sets.map((s) => s.id) ?? []
    const r = await confirmedMutate(
      root,
      {
        op: 'createContainer',
        parentPath: 'Notes',
        kind: 'set',
        name: 'Leading',
        order: [NEW_SLOT, ...siblings],
      },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const tree = await readNexus(root)
    expect(tree.collections.find((c) => c.path === 'Notes')?.sets[0]?.title).toBe('Leading')
  })

  it('movePage notes the moved page under its destination for the values push', async () => {
    await mkdir(join(root, 'Notes', 'Archive'), { recursive: true })
    await writeFile(
      join(root, 'Notes', 'Archive', '_pageset.json'),
      JSON.stringify({ id: 'set-archive' }),
    )
    flushValueWrites(root)
    const r = await confirmedMutate(
      root,
      { op: 'movePage', path: 'Notes/Daily/Beta.md', newParentPath: 'Notes/Archive' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(flushValueWrites(root).map((c) => c.rel)).toEqual(['Notes/Archive'])
  })

  it('createPage notes the new page for the values push', async () => {
    flushValueWrites(root)
    const r = await confirmedMutate(
      root,
      { op: 'createPage', parentPath: 'Notes/Daily', name: 'Noted' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(flushValueWrites(root).map((c) => c.rel)).toEqual(['Notes/Daily'])
  })
})

describe('handleMutate — rename', () => {
  it('page rename renames the file AND cascades inbound [[links]], reporting the landed name', async () => {
    const r = await confirmedMutate(
      root,
      { op: 'rename', path: 'Notes/Daily/Beta.md', kind: 'page', newName: 'Gamma' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.renamed).toEqual({ path: 'Notes/Daily/Gamma.md', name: 'Gamma' })
    expect(await pathExists(join(root, 'Notes/Daily/Gamma.md'))).toBe(true)
    expect(await pathExists(join(root, 'Notes/Daily/Beta.md'))).toBe(false)
    expect(await read('Notes/Daily/Alpha.md')).toContain('[[Gamma]]')
  })

  it('a fromCreate rename disambiguates a collision instead of rejecting, and reports what landed', async () => {
    await confirmedMutate(
      root,
      { op: 'createPage', parentPath: 'Notes/Daily', name: 'Untitled' },
      nexusDeps,
    )
    await refreshTree(root)
    const r = await confirmedMutate(
      root,
      {
        op: 'rename',
        path: 'Notes/Daily/Untitled.md',
        kind: 'page',
        newName: 'Beta',
        fromCreate: true,
      },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.renamed).toEqual({ path: 'Notes/Daily/Beta (2).md', name: 'Beta (2)' })
    expect(await pathExists(join(root, 'Notes/Daily/Beta (2).md'))).toBe(true)
    expect(await pathExists(join(root, 'Notes/Daily/Beta.md'))).toBe(true)
  })

  it('a fromCreate rename skips the link cascade — inbound [[links]] to the old title stay put', async () => {
    // Alpha links [[Beta]]; a from-create rename of Beta must NOT rewrite it (an ordinary rename does — the test above goes red if the skip were unconditional).
    const r = await confirmedMutate(
      root,
      {
        op: 'rename',
        path: 'Notes/Daily/Beta.md',
        kind: 'page',
        newName: 'Delta',
        fromCreate: true,
      },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(await pathExists(join(root, 'Notes/Daily/Delta.md'))).toBe(true)
    expect(await read('Notes/Daily/Alpha.md')).toContain('[[Beta]]')
  })

  it('a rename of one of two same-titled pages leaves the title’s links to the other', async () => {
    await mkdir(join(root, 'Notes', 'Other'), { recursive: true })
    await writeFile(join(root, 'Notes', 'Other', '_pageset.json'), JSON.stringify({ id: 'other' }))
    await writeFile(join(root, 'Notes', 'Other', 'Beta.md'), `---\nID: ${G_ID}\n---\n`)
    await refreshTree(root)
    const r = await confirmedMutate(
      root,
      { op: 'rename', path: 'Notes/Daily/Beta.md', kind: 'page', newName: 'Gamma' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(await pathExists(join(root, 'Notes/Daily/Gamma.md'))).toBe(true)
    expect(await read('Notes/Daily/Alpha.md')).toContain('[[Beta]]')
  })

  it('container rename renames the folder (no cascade)', async () => {
    const r = await confirmedMutate(
      root,
      { op: 'rename', path: 'Notes/Daily', kind: 'set', newName: 'Journal' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(await pathExists(join(root, 'Notes/Journal/_pageset.json'))).toBe(true)
    expect(await pathExists(join(root, 'Notes/Daily'))).toBe(false)
  })

  it('rejects a duplicate name', async () => {
    const r = await confirmedMutate(
      root,
      { op: 'rename', path: 'Notes/Daily/Beta.md', kind: 'page', newName: 'Alpha' },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.code).toBe('exists')
  })
})

describe('handleMutate — delete', () => {
  it('nexus mode moves a page into .trash under the folders it was deleted from', async () => {
    const r = await confirmedMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Beta.md', kind: 'page' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(await pathExists(join(root, 'Notes/Daily/Beta.md'))).toBe(false)
    // .trash mirrors the nexus, so a deleted page shows where it lived; the stamped leaf is a bundle folder, and the artifact sits inside it under the name it always had.
    const trashed = await readdir(join(root, '.trash', 'Notes', 'Daily'))
    const bundle = trashed.find((f) => f.endsWith('__Beta.md.deleted'))
    expect(bundle).toBeDefined()
    expect(await readdir(join(root, '.trash', 'Notes', 'Daily', bundle ?? ''))).toContain('Beta.md')
  })

  it('system mode delegates to the injected OS-trash fn (not the .trash)', async () => {
    const trashToSystem = vi.fn((p: string) => rm(p, { recursive: true, force: true }))
    const r = await confirmedMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Beta.md', kind: 'page' },
      { trashMode: 'system', trashToSystem },
    )
    expect(r.ok).toBe(true)
    expect(trashToSystem).toHaveBeenCalledOnce()
    expect(trashToSystem.mock.calls[0][0]).toContain('Beta.md')
  })
})

describe('handleMutate — sync tap', () => {
  const tap = captureWriteTap()

  it('reports a page rename and a page move to the sync tap', async () => {
    await mkdir(join(root, 'Notes', 'Archive'), { recursive: true })
    await writeFile(join(root, 'Notes', 'Archive', '_pageset.json'), JSON.stringify({ id: 'arc' }))

    await confirmedMutate(
      root,
      { op: 'rename', path: 'Notes/Daily/Beta.md', kind: 'page', newName: 'Gamma' },
      nexusDeps,
    )
    await refreshTree(root)
    await confirmedMutate(
      root,
      { op: 'movePage', path: 'Notes/Daily/Gamma.md', newParentPath: 'Notes/Archive' },
      nexusDeps,
    )

    expect(tap.renames).toEqual([
      [join(root, 'Notes/Daily/Beta.md'), join(root, 'Notes/Daily/Gamma.md')],
      [join(root, 'Notes/Daily/Gamma.md'), join(root, 'Notes/Archive/Gamma.md')],
    ])
  })

  it('reports a Collection rename and a Set move once each', async () => {
    await mkdir(join(root, 'Archive'), { recursive: true })
    await writeFile(join(root, 'Archive', '_pagecollection.json'), JSON.stringify({ id: 'arc' }))
    await refreshTree(root)

    await confirmedMutate(
      root,
      { op: 'rename', path: 'Notes', kind: 'collection', newName: 'Journal' },
      nexusDeps,
    )
    await refreshTree(root)
    await confirmedMutate(
      root,
      { op: 'moveSet', path: 'Journal/Daily', newParentPath: 'Archive', order: ['col'] },
      nexusDeps,
    )

    expect(tap.renames).toEqual([
      [join(root, 'Notes'), join(root, 'Journal')],
      [join(root, 'Journal/Daily'), join(root, 'Archive/Daily')],
    ])
  })

  it('reports a from-create rename where it landed', async () => {
    await writeFile(
      join(root, 'Notes', 'Daily', 'Fresh.md'),
      '---\nID: 01KVGMT8BFP350FZZXAMG1QDRG\n---\n',
    )
    const r = await confirmedMutate(
      root,
      {
        op: 'rename',
        path: 'Notes/Daily/Beta.md',
        kind: 'page',
        newName: 'Fresh',
        fromCreate: true,
      },
      nexusDeps,
    )
    expect(r.ok && r.value.renamed?.name).toBe('Fresh (2)')
    expect(tap.renames).toEqual([
      [join(root, 'Notes/Daily/Beta.md'), join(root, 'Notes/Daily/Fresh (2).md')],
    ])
  })

  it('a Set or a page moved onto its own parent writes the order alone', async () => {
    await mkdir(join(root, 'Notes', 'Daily', 'SetA'), { recursive: true })
    await writeFile(
      join(root, 'Notes', 'Daily', 'SetA', '_pageset.json'),
      JSON.stringify({ id: 'sa' }),
    )
    await refreshTree(root)
    const indexMoves = vi.spyOn(indexSeed, 'moveIndexPaths')
    flushValueWrites(root)
    const set = await confirmedMutate(
      root,
      { op: 'moveSet', path: 'Notes/Daily/SetA', newParentPath: 'Notes/Daily', order: ['sa'] },
      nexusDeps,
    )
    const moved = await confirmedMutate(
      root,
      {
        op: 'movePage',
        path: 'Notes/Daily/Beta.md',
        newParentPath: 'Notes/Daily',
        order: [B_ID, A_ID],
      },
      nexusDeps,
    )
    expect(set.ok && moved.ok).toBe(true)
    const sidecar = await readJson('Notes/Daily/_pageset.json')
    expect([sidecar.set_order, sidecar.page_order]).toEqual([['sa'], [B_ID, A_ID]])
    expect(tap.renames).toEqual([])
    expect(indexMoves).not.toHaveBeenCalled()
    expect(flushValueWrites(root)).toEqual([])
    indexMoves.mockRestore()
  })
})

describe('handleMutate — move + guards', () => {
  it('movePage relocates the file to another container', async () => {
    await mkdir(join(root, 'Notes', 'Archive'), { recursive: true })
    await writeFile(join(root, 'Notes', 'Archive', '_pageset.json'), JSON.stringify({ id: 'arc' }))
    const r = await confirmedMutate(
      root,
      { op: 'movePage', path: 'Notes/Daily/Beta.md', newParentPath: 'Notes/Archive' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(await pathExists(join(root, 'Notes/Archive/Beta.md'))).toBe(true)
    expect(await pathExists(join(root, 'Notes/Daily/Beta.md'))).toBe(false)
  })

  it('movePage with order persists the destination page_order (same-parent reorder, no file move)', async () => {
    const r = await confirmedMutate(
      root,
      {
        op: 'movePage',
        path: 'Notes/Daily/Beta.md',
        newParentPath: 'Notes/Daily',
        order: ['b', 'a'],
      },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(await pathExists(join(root, 'Notes/Daily/Beta.md'))).toBe(true)
    expect((await readJson('Notes/Daily/_pageset.json')).page_order).toEqual(['b', 'a'])
  })

  it('movePage with order reparents the file AND seeds the destination page_order', async () => {
    const r = await confirmedMutate(
      root,
      { op: 'movePage', path: 'Notes/Daily/Beta.md', newParentPath: 'Notes', order: ['b'] },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(await pathExists(join(root, 'Notes/Beta.md'))).toBe(true)
    expect(await pathExists(join(root, 'Notes/Daily/Beta.md'))).toBe(false)
    expect((await readJson('Notes/_pagecollection.json')).page_order).toEqual(['b'])
  })

  it("movePage drops the page's id from the source folder's page_order", async () => {
    await writeFile(
      join(root, 'Notes', 'Daily', '_pageset.json'),
      JSON.stringify({ id: 'col', page_order: [B_ID, A_ID] }),
    )
    await refreshTree(root)
    const r = await confirmedMutate(
      root,
      { op: 'movePage', path: 'Notes/Daily/Beta.md', newParentPath: 'Notes', order: [B_ID] },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect((await readJson('Notes/Daily/_pageset.json')).page_order).toEqual([A_ID])
  })

  it("moveSet drops the Set's id from the source container's set_order", async () => {
    await mkdir(join(root, 'Notes', 'Weekly'), { recursive: true })
    await writeFile(join(root, 'Notes', 'Weekly', '_pageset.json'), JSON.stringify({ id: 'wk' }))
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'pt', set_order: ['wk', 'col'] }),
    )
    await refreshTree(root)
    const r = await confirmedMutate(
      root,
      { op: 'moveSet', path: 'Notes/Daily', newParentPath: 'Notes/Weekly', order: ['col'] },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect((await readJson('Notes/_pagecollection.json')).set_order).toEqual(['wk'])
  })

  it('round-trip: in-set reorder writes page_order to a foreign-keyed sidecar AND readNexus applies it', async () => {
    await writeFile(
      join(root, 'Notes', 'Daily', '_pageset.json'),
      JSON.stringify({
        id: 'col',
        outside_field: 0,
        views: [{ id: 'v1', type: 'table' }],
      }),
    )
    await writeFile(
      join(root, 'Notes', 'Daily', 'Gamma.md'),
      '---\nID: 01KVGMT8BFP350FZZXAMG1QDRG\n---\n\nbody',
    )
    const r = await confirmedMutate(
      root,
      {
        op: 'movePage',
        path: 'Notes/Daily/Gamma.md',
        newParentPath: 'Notes/Daily',
        order: [G_ID, B_ID, A_ID],
      },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const sc = await readJson('Notes/Daily/_pageset.json')
    expect(sc.page_order).toEqual([G_ID, B_ID, A_ID])
    expect(sc.views).toHaveLength(1)
    expect(await pathExists(join(root, 'Notes/Daily/Gamma.md'))).toBe(true)
    const tree = await readNexus(root)
    const daily = tree.collections
      .find((c) => c.title === 'Notes')
      ?.sets.find((s) => s.title === 'Daily')
    expect(daily?.pages.map((p) => p.id)).toEqual([G_ID, B_ID, A_ID])
  })

  it('reorderChildren persists set_order on the collection sidecar', async () => {
    await mkdir(join(root, 'Notes', 'Weekly'), { recursive: true })
    await writeFile(join(root, 'Notes', 'Weekly', '_pageset.json'), JSON.stringify({ id: 'wk' }))
    const r = await confirmedMutate(
      root,
      { op: 'reorderChildren', parentPath: 'Notes', key: 'set_order', order: ['wk', 'col'] },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect((await readJson('Notes/_pagecollection.json')).set_order).toEqual(['wk', 'col'])
  })

  it('reorderTop persists order.collections to .nexus/state.json', async () => {
    const r = await confirmedMutate(root, { op: 'reorderTop', order: ['v2', 'v1'] }, nexusDeps)
    expect(r.ok).toBe(true)
    expect(
      (await readJson<{ order: { collections: string[] } }>('.nexus/state.json')).order.collections,
    ).toEqual(['v2', 'v1'])
  })

  it('moveSet relocates a set folder (with its pages) to another collection AND writes the destination set_order', async () => {
    await mkdir(join(root, 'Notes', 'Daily', 'SetX'), { recursive: true })
    await writeFile(
      join(root, 'Notes', 'Daily', 'SetX', '_pageset.json'),
      JSON.stringify({ id: 'sx' }),
    )
    await writeFile(
      join(root, 'Notes', 'Daily', 'SetX', 'Inner.md'),
      '---\nID: 01KVGMT8BFP350FZZXAMG1QDRN\n---\n\nbody',
    )
    await mkdir(join(root, 'Notes', 'Weekly'), { recursive: true })
    await writeFile(join(root, 'Notes', 'Weekly', '_pageset.json'), JSON.stringify({ id: 'wk' }))
    const r = await confirmedMutate(
      root,
      { op: 'moveSet', path: 'Notes/Daily/SetX', newParentPath: 'Notes/Weekly', order: ['sx'] },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(await pathExists(join(root, 'Notes/Weekly/SetX/_pageset.json'))).toBe(true)
    expect(await pathExists(join(root, 'Notes/Weekly/SetX/Inner.md'))).toBe(true)
    expect(await pathExists(join(root, 'Notes/Daily/SetX'))).toBe(false)
    expect((await readJson('Notes/Weekly/_pageset.json')).set_order).toEqual(['sx'])
    const tree = await readNexus(root)
    const weekly = tree.collections
      .find((c) => c.title === 'Notes')
      ?.sets.find((s) => s.title === 'Weekly')
    expect(weekly?.sets?.map((s) => s.id)).toEqual(['sx'])
  })

  describe('a Set that leaves a container', () => {
    const located = (ids: string[]) => ({
      id: 'v',
      name: 'V',
      type: 'table',
      filter: { match: 'all', rules: [{ property_id: '_location', op: 'is', values: ids }] },
      group_order: ids,
    })
    const seedSet = async (rel: string, id: string, extra: object = {}): Promise<void> => {
      await mkdir(join(root, rel), { recursive: true })
      await writeFile(join(root, rel, '_pageset.json'), JSON.stringify({ id, ...extra }))
    }
    const viewsAt = async (rel: string): Promise<unknown> => (await readJson(rel)).views
    const matrix = (): string => nexusConfig(root, NEXUS_CONFIG_FILES.matrix)
    const moveSet = (path: string, newParentPath: string) =>
      confirmedMutate(root, { op: 'moveSet', path, newParentPath, order: [] }, nexusDeps)

    it('strips a Set moved to another Collection, and its Sets, from the Collection it left', async () => {
      const all = ['col', 'ch', 'wk']
      await writeFile(
        join(root, 'Notes', '_pagecollection.json'),
        JSON.stringify({ id: 'pt', views: [located(all)] }),
      )
      await seedSet('Notes/Daily/Child', 'ch')
      await seedSet('Notes/Weekly', 'wk', { views: [located(all)] })
      await mkdir(join(root, 'Other'))
      await writeFile(join(root, 'Other', '_pagecollection.json'), JSON.stringify({ id: 'ot' }))
      const rules = { match: 'all', rules: [{ property_id: '_location', op: 'is', values: all }] }
      await writeFile(matrix(), JSON.stringify({ filter: { rules, enabled: true } }))
      const r = await moveSet('Notes/Daily', 'Other')
      expect(r.ok && r.value.cascade).toEqual({ pages: [], hosts: [] })
      expect(await viewsAt('Notes/_pagecollection.json')).toEqual([located(['wk'])])
      expect(await viewsAt('Notes/Weekly/_pageset.json')).toEqual([located(['wk'])])
      expect((await readJsonAt<{ filter: { rules: unknown } }>(matrix())).filter.rules).toEqual(
        rules,
      )
    })

    it('strips a Set moved out of its parent Set from that Set, and leaves the Collection', async () => {
      await writeFile(
        join(root, 'Notes', '_pagecollection.json'),
        JSON.stringify({ id: 'pt', views: [located(['sa', 'sb'])] }),
      )
      await seedSet('Notes/A', 'sa', { views: [located(['sb', 'x'])] })
      await seedSet('Notes/A/B', 'sb')
      const r = await moveSet('Notes/A/B', 'Notes')
      expect(r.ok && r.value.cascade).toEqual({ pages: [], hosts: [] })
      expect(await viewsAt('Notes/A/_pageset.json')).toEqual([located(['x'])])
      expect(await viewsAt('Notes/_pagecollection.json')).toEqual([located(['sa', 'sb'])])
    })

    it('edits nothing for a Set moved deeper under its own parent', async () => {
      await writeFile(
        join(root, 'Notes', '_pagecollection.json'),
        JSON.stringify({ id: 'pt', views: [located(['col', 'wk'])] }),
      )
      await seedSet('Notes/Weekly', 'wk', { views: [located(['col', 'wk'])] })
      const r = await moveSet('Notes/Daily', 'Notes/Weekly')
      expect(r.ok && 'cascade' in r.value).toBe(false)
      expect(await viewsAt('Notes/_pagecollection.json')).toEqual([located(['col', 'wk'])])
      expect(await viewsAt('Notes/Weekly/_pageset.json')).toEqual([located(['col', 'wk'])])
    })
  })

  it('moveSet into its current collection is an in-place reorder (no folder move)', async () => {
    await mkdir(join(root, 'Notes', 'Daily', 'SetA'), { recursive: true })
    await mkdir(join(root, 'Notes', 'Daily', 'SetB'), { recursive: true })
    await writeFile(
      join(root, 'Notes', 'Daily', 'SetA', '_pageset.json'),
      JSON.stringify({ id: 'sa' }),
    )
    await writeFile(
      join(root, 'Notes', 'Daily', 'SetB', '_pageset.json'),
      JSON.stringify({ id: 'sb' }),
    )
    const r = await confirmedMutate(
      root,
      {
        op: 'moveSet',
        path: 'Notes/Daily/SetA',
        newParentPath: 'Notes/Daily',
        order: ['sb', 'sa'],
      },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(await pathExists(join(root, 'Notes/Daily/SetA/_pageset.json'))).toBe(true)
    expect((await readJson('Notes/Daily/_pageset.json')).set_order).toEqual(['sb', 'sa'])
  })

  it('rejects a path that escapes the nexus root', async () => {
    const r = await confirmedMutate(
      root,
      { op: 'rename', path: '../evil', kind: 'page', newName: 'x' },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.code).toBe('invalid-path')
  })
})

describe('handleMutate — targets the tree doesn’t hold', () => {
  it.each([
    { op: 'setDisclosureLock', path: '.nexus/assets', kind: 'collection', locked: true },
    { op: 'setActiveView', path: 'Notes', kind: 'set', viewId: 'v' },
    { op: 'setPageMeta', path: '.trash/Alpha.md', patch: {} },
    { op: 'setProperty', path: '', propertyId: 'p', value: null },
    { op: 'createPage', parentPath: '.nexus', name: 'X' },
    { op: 'createContainer', parentPath: '', kind: 'set', name: 'X' },
    { op: 'movePage', path: 'Notes/_pagecollection.json', newParentPath: 'Notes/Daily' },
    { op: 'movePage', path: 'Notes/Daily/Beta.md', newParentPath: '.nexus' },
    { op: 'moveSet', path: 'Notes', newParentPath: 'Notes/Daily', order: [] },
  ] as MutateRequest[])('refuses $op on $path$parentPath', async (req) => {
    const r = await confirmedMutate(root, req, nexusDeps)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.message).toBe('That item can’t be changed.')
  })

  it('refuses a Collection anywhere but the top of the Nexus', async () => {
    const r = await confirmedMutate(
      root,
      { op: 'createContainer', parentPath: 'Notes', kind: 'collection', name: 'X' },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
    expect(await pathExists(join(root, 'Notes', 'X'))).toBe(false)
  })
})

describe('handleMutate — review-round hardening', () => {
  it('creates a collection at the nexus root (parentPath "")', async () => {
    const r = await confirmedMutate(
      root,
      { op: 'createContainer', parentPath: '', kind: 'collection', name: 'Inbox' },
      nexusDeps,
    )
    expect(r.ok && r.value.created?.path).toBe('Inbox')
    expect(await pathExists(join(root, 'Inbox/_pagecollection.json'))).toBe(true)
  })

  it('refuses to delete the .nexus machinery, leaving it intact', async () => {
    const r = await confirmedMutate(
      root,
      { op: 'delete', path: '.nexus', kind: 'collection' },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
    expect(await pathExists(join(root, '.nexus'))).toBe(true)
  })

  it('rejects a name containing a NUL byte as invalid-name (not a throw)', async () => {
    const r = await confirmedMutate(
      root,
      {
        op: 'createPage',
        parentPath: 'Notes/Daily',
        name: `bad${String.fromCharCode(0)}name`,
      },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.code).toBe('invalid-name')
  })

  it('rename to the current name is a no-op success', async () => {
    const r = await confirmedMutate(
      root,
      { op: 'rename', path: 'Notes/Daily/Beta.md', kind: 'page', newName: 'Beta' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(await pathExists(join(root, 'Notes/Daily/Beta.md'))).toBe(true)
  })

  it('delete of an already-gone path answers invalid-path (no throw)', async () => {
    await confirmedMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Beta.md', kind: 'page' },
      nexusDeps,
    )
    const again = await confirmedMutate(
      root,
      { op: 'delete', path: 'Notes/Daily/Beta.md', kind: 'page' },
      nexusDeps,
    )
    expect(again.ok).toBe(false)
    if (again.ok) return
    expect(again.error.code).toBe('invalid-path')
  })

  it('movePage into the current folder is a no-op success; a name collision fails + leaves the source', async () => {
    const noop = await confirmedMutate(
      root,
      { op: 'movePage', path: 'Notes/Daily/Beta.md', newParentPath: 'Notes/Daily' },
      nexusDeps,
    )
    expect(noop.ok).toBe(true)
    expect(await pathExists(join(root, 'Notes/Daily/Beta.md'))).toBe(true)
    await mkdir(join(root, 'Notes', 'Other'), { recursive: true })
    await writeFile(join(root, 'Notes', 'Other', '_pageset.json'), JSON.stringify({ id: 'oth' }))
    await writeFile(
      join(root, 'Notes', 'Other', 'Beta.md'),
      '---\nID: 01KVGMT8BFP350FZZXAMG1QDRZ\n---\n',
    )
    await refreshTree(root)
    const clash = await confirmedMutate(
      root,
      { op: 'movePage', path: 'Notes/Daily/Beta.md', newParentPath: 'Notes/Other' },
      nexusDeps,
    )
    expect(clash.ok).toBe(false)
    if (clash.ok) return
    expect(clash.error.code).toBe('exists')
    expect(await pathExists(join(root, 'Notes/Daily/Beta.md'))).toBe(true)
  })

  const pickImage = async (name: string, body = 'img-bytes'): Promise<string> => {
    await mkdir(join(root, '_picks'), { recursive: true })
    const p = join(root, '_picks', name)
    await writeFile(p, body)
    return p
  }

  it('adopts a picked image under the asset root and names it by wikilink', async () => {
    const r = await confirmedMutate(
      root,
      { op: 'setProfileImage', source: await pickImage('Photo.png') },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect((await readJson('.nexus/settings.json')).profile_image).toBe('[[Photo.png]]')
    expect(await pathExists(join(root, '.nexus/assets/Photo.png'))).toBe(true)
  })

  it('a replaced photo stays where it is, under either asset root', async () => {
    await confirmedMutate(
      root,
      { op: 'setProfileImage', source: await pickImage('First.png') },
      nexusDeps,
    )
    await confirmedMutate(
      root,
      { op: 'setProfileImage', source: await pickImage('Second.png') },
      nexusDeps,
    )
    expect(await pathExists(join(root, '.nexus/assets/First.png'))).toBe(true)
    await writeFile(
      join(root, '.nexus', 'settings.json'),
      JSON.stringify({ asset_directory: 'file-assets' }),
    )
    await mkdir(join(root, 'file-assets'), { recursive: true })
    await confirmedMutate(
      root,
      { op: 'setProfileImage', source: await pickImage('Kept.png') },
      nexusDeps,
    )
    await confirmedMutate(
      root,
      { op: 'setProfileImage', source: await pickImage('Next.png') },
      nexusDeps,
    )
    expect(await pathExists(join(root, 'file-assets/Kept.png'))).toBe(true)
  })

  it('setProfileImage null clears the field and leaves the image', async () => {
    await confirmedMutate(
      root,
      { op: 'setProfileImage', source: await pickImage('Held.png') },
      nexusDeps,
    )
    const r = await confirmedMutate(root, { op: 'setProfileImage', source: null }, nexusDeps)
    expect(r.ok).toBe(true)
    expect((await readJson('.nexus/settings.json')).profile_image).toBeUndefined()
    expect(await pathExists(join(root, '.nexus/assets/Held.png'))).toBe(true)
  })

  it('a non-image source is refused, writing nothing', async () => {
    const r = await confirmedMutate(
      root,
      { op: 'setProfileImage', source: await pickImage('Notes.txt') },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
    expect((await readJson('.nexus/settings.json')).profile_image).toBeUndefined()
  })

  it('adopts a real local image source the renderer named (no picked-path gate)', async () => {
    const r = await confirmedMutate(
      root,
      { op: 'setProfileImage', source: await pickImage('Real.png') },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect((await readJson('.nexus/settings.json')).profile_image).toBe('[[Real.png]]')
  })

  it('stores an http(s) source by reference', async () => {
    const url = 'https://example.com/photo.png'
    const r = await confirmedMutate(root, { op: 'setProfileImage', source: url }, nexusDeps)
    expect(r.ok).toBe(true)
    expect((await readJson('.nexus/settings.json')).profile_image).toBe(url)
  })

  it('a source that resolves to no image faults and leaves the prior photo untouched', async () => {
    await confirmedMutate(
      root,
      { op: 'setProfileImage', source: await pickImage('First.png') },
      nexusDeps,
    )
    expect((await readJson('.nexus/settings.json')).profile_image).toBe('[[First.png]]')
    // A file: URL — like any non-image string — dies in adoptFile with no extension it can show.
    const r = await confirmedMutate(
      root,
      { op: 'setProfileImage', source: 'file:///etc/passwd' },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
    expect((await readJson('.nexus/settings.json')).profile_image).toBe('[[First.png]]')
  })

  it('a replaced photo reaches no trash', async () => {
    const trashToSystem = vi.fn(async (_p: string) => {})
    const deps: TrashDeps = { trashMode: 'system', trashToSystem }
    await confirmedMutate(root, { op: 'setProfileImage', source: await pickImage('Old.png') }, deps)
    await confirmedMutate(root, { op: 'setProfileImage', source: await pickImage('New.png') }, deps)
    expect(trashToSystem).not.toHaveBeenCalled()
  })

  it('homepage setBanner preserves blocks/icon/foreign keys (read-merge-write)', async () => {
    await writeFile(
      join(root, '.nexus', 'homepage', 'homepage.json'),
      JSON.stringify({ outside_field: 2, icon: 'house', blocks: [{ t: 'x' }] }),
    )
    const src = join(root, 'Pick.png')
    await writeFile(src, 'bytes')
    const r = await confirmedMutate(
      root,
      { op: 'setBanner', kind: 'homepage', path: '', source: src },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const cfg = await readJson('.nexus/homepage/homepage.json')
    expect(cfg.banner).toBe('[[Pick.png]]')
    expect(cfg.blocks).toEqual([{ t: 'x' }])
    expect(cfg.icon).toBe('house')
    expect(cfg.outside_field).toBe(2)
  })

  it('navview setBanner writes + clears the state.json navigation banner, never homepage.json', async () => {
    const src = join(root, 'Nav.png')
    await writeFile(src, 'bytes')
    const r = await confirmedMutate(
      root,
      { op: 'setBanner', kind: 'navview', path: '', source: src },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(
      (await readJson<{ navigation?: { banner?: string } }>('.nexus/state.json')).navigation
        ?.banner,
    ).toBe('[[Nav.png]]')
    const clear = await confirmedMutate(
      root,
      { op: 'setBanner', kind: 'navview', path: '', source: null },
      nexusDeps,
    )
    expect(clear.ok).toBe(true)
    expect(
      (await readJson<{ navigation?: { banner?: string } }>('.nexus/state.json')).navigation
        ?.banner,
    ).toBeUndefined()
  })

  it('a malformed op returns a clean fault, not a throw', async () => {
    const bogus = { op: 'bogus' } as unknown as MutateRequest
    const r = await confirmedMutate(root, bogus, nexusDeps)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.code).toBe('operation-failed')
  })

  it.skipIf(noModeBits)(
    'finishes a page rename forward when one linker can’t be written, and warns',
    async () => {
      // A page linking [[Beta]] in a read-only dir → the cascade's rewrite commit throws.
      await mkdir(join(root, 'Notes', 'Locked'), { recursive: true })
      await writeFile(join(root, 'Notes', 'Locked', '_pageset.json'), JSON.stringify({ id: 'lk' }))
      await writeFile(
        join(root, 'Notes', 'Locked', 'Linker.md'),
        '---\nID: 01KVGMT8BFP350FZZXAMG1QDRK\n---\n\nSee [[Beta]].',
      )
      await chmod(join(root, 'Notes', 'Locked'), 0o555)
      try {
        const r = await confirmedMutate(
          root,
          { op: 'rename', path: 'Notes/Daily/Beta.md', kind: 'page', newName: 'Gamma' },
          nexusDeps,
        )
        expect(r.ok && r.value.cascade?.warning).toBe('Couldn’t update links to “Beta” in 1 file.')
        expect(await pathExists(join(root, 'Notes/Daily/Gamma.md'))).toBe(true)
        expect(await pathExists(join(root, 'Notes/Daily/Beta.md'))).toBe(false)
        const alpha = await read('Notes/Daily/Alpha.md')
        expect(alpha).toContain('See [[Gamma]] for more.')
        expect(alpha).not.toContain('[[Beta]]')
        expect(await read('Notes/Locked/Linker.md')).toContain('See [[Beta]].')
      } finally {
        await chmod(join(root, 'Notes', 'Locked'), 0o755)
      }
    },
  )

  it('keeps a page rename whose cascade can’t start, and warns', async () => {
    await refreshTree(root)
    forgetLastReads()
    await writeFile(join(root, '.nexus', 'properties.json'), '{ not json')
    const r = await handleMutate(
      root,
      { op: 'rename', path: 'Notes/Daily/Beta.md', kind: 'page', newName: 'Gamma' },
      nexusDeps,
    )
    expect(r.ok && r.value.cascade?.warning).toMatch(/^Links to “Beta” weren't updated: /)
    expect(await pathExists(join(root, 'Notes/Daily/Gamma.md'))).toBe(true)
  })
})

describe('handleMutate — renameHeading', () => {
  const req: MutateRequest = {
    op: 'renameHeading',
    path: 'Notes/Daily/Beta.md',
    heading: 'Setup',
    to: 'Intro',
  }
  let tile: string

  beforeEach(async () => {
    installStores(memoryStores().stores)
    await writeFile(
      join(root, 'Notes', 'Daily', 'Alpha.md'),
      `---\nID: ${A_ID}\n---\n\nSee [[Beta#Setup]].`,
    )
    await writeFile(
      join(root, 'Notes', 'Daily', 'Beta.md'),
      `---\nID: ${B_ID}\n---\n\n## Setup\n\n[[#Setup]]`,
    )
    await seedContentIndex(root)
    tile = await landedId(createMarkdownTile(tileHostDir(root)))
    await writeMarkdownTile(
      root,
      tileHostDir(root),
      tile,
      '[[Beta#Setup]]',
      machine().sha256Hex(''),
    )
  })
  afterEach(() => installStores(NO_STORES))

  const handlerCtx = (push: HostContext['push']): HostContext =>
    ({ push, trashMode: async () => 'nexus' }) as unknown as HostContext

  it('rewrites what the index and the tile walk name, leaves the renamed page to its editor, and pushes it ahead of values:changed', async () => {
    const push = vi.fn()
    const r = await nexusHandlers.mutate(handlerCtx(push), req)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(r.ok && r.value.cascade).toEqual({
      pages: ['Notes/Daily/Alpha.md'],
      hosts: [{ kind: 'homepage' }],
      warning: undefined,
    })
    const names = push.mock.calls.map(([name]) => name)
    expect(push.mock.calls).toContainEqual(['pages:changed', ['Notes/Daily/Alpha.md']])
    expect(push.mock.calls).toContainEqual(['tiles:changed', { kind: 'homepage' }])
    expect(names).toContain('values:changed')
    expect(names.indexOf('pages:changed')).toBeLessThan(names.indexOf('values:changed'))
    expect(await read('Notes/Daily/Alpha.md')).toContain('See [[Beta#Intro]].')
    expect(await read('Notes/Daily/Beta.md')).toContain('[[#Setup]]')
    expect(await readMarkdownTile(tileHostDir(root), tile)).toEqual(ok('[[Beta#Intro]]'))
  })

  it('answers a heading rename whose cascade can’t start with a warning, not a fault', async () => {
    await writeFile(join(root, '.nexus', 'properties.json'), '{ not json')
    const r = await confirmedMutate(root, req, nexusDeps)
    expect(r.ok && r.value.cascade?.warning).toMatch(/^Links to “Beta#Setup” weren't updated: /)
    expect(await read('Notes/Daily/Alpha.md')).toContain('See [[Beta#Setup]].')
  })
})

describe('handleMutate — a page delete’s linkers', () => {
  it('pushes their values but not their bodies, since only frontmatter moved', async () => {
    await writeFile(
      join(root, '.nexus', 'properties.json'),
      JSON.stringify({
        order: ['prop_related'],
        defs: { prop_related: { id: 'prop_related', name: 'Related', type: 'link' } },
      }),
    )
    await writeFile(
      join(root, 'Notes', 'Daily', 'Alpha.md'),
      `---\nID: ${A_ID}\nRelated: "[[Beta]]"\n---\n`,
    )
    await refreshTree(root)
    const push = vi.fn()
    const ctx = { push, trashMode: async () => 'nexus' } as unknown as HostContext
    const r = await nexusHandlers.mutate(ctx, {
      op: 'delete',
      path: 'Notes/Daily/Beta.md',
      kind: 'page',
    })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(r.ok && r.value.cascade?.pages).toEqual(['Notes/Daily/Alpha.md'])
    const names = push.mock.calls.map(([name]) => name)
    expect(names).toContain('values:changed')
    expect(names).not.toContain('pages:changed')
  })
})

describe('handleMutate — a page delete reaches the pages beneath a Set whose sidecar doesn’t parse', () => {
  const sidecar = (): string => join(root, 'Notes', 'Archive', '_pageset.json')
  beforeEach(async () => {
    await writeFile(
      join(root, '.nexus', 'properties.json'),
      JSON.stringify({
        order: ['prop_related'],
        defs: { prop_related: { id: 'prop_related', name: 'Related', type: 'link' } },
      }),
    )
    await mkdir(join(root, 'Notes', 'Archive'))
    await writeFile(sidecar(), JSON.stringify({ id: 'set-archive' }))
    await writeFile(
      join(root, 'Notes', 'Archive', 'Gamma.md'),
      `---\nID: ${G_ID}\nRelated: "[[Beta]]"\n---\n`,
    )
  })
  const deleteBeta = () =>
    confirmedMutate(root, { op: 'delete', path: 'Notes/Daily/Beta.md', kind: 'page' }, nexusDeps)

  it('corrupted mid-session: the delete strips links from its pages', async () => {
    await refreshTree(root)
    await writeFile(sidecar(), '{corrupt')
    await refreshTree(root)
    expect(getLiveTree()?.unreadable).toEqual([{ path: 'Notes/Archive', reason: 'unparsed' }])
    expect((await deleteBeta()).ok).toBe(true)
    expect(splitFrontmatter(await read('Notes/Archive/Gamma.md'))).not.toHaveProperty('Related')
  })

  it('already corrupt at the open: the delete strips links from its pages', async () => {
    await writeFile(sidecar(), '{corrupt')
    await refreshTree(root)
    expect((await deleteBeta()).ok).toBe(true)
    expect(splitFrontmatter(await read('Notes/Archive/Gamma.md'))).not.toHaveProperty('Related')
  })
})

describe('nexusHandlers.mutate — retryUnreadable', () => {
  const TASK_ID = '01KVGMT8BFT350FZZXAMG1QDRT'
  const ctx = { push: vi.fn(), trashMode: async () => 'nexus' } as unknown as HostContext
  const retry = (path: string) => nexusHandlers.mutate(ctx, { op: 'retryUnreadable', path })
  const held = (rel: string): boolean =>
    getLiveTree()?.collections.some((c) =>
      [c, ...(c.sets ?? [])].some((n) => n.path === rel || n.pages.some((p) => p.path === rel)),
    ) ?? false

  it('writes a Pommora ID over an ID: 42 page, and the page is held', async () => {
    await writeFile(join(root, 'Notes', 'Foreign.md'), '---\nID: 42\n---\nbody')
    await refreshTree(root)
    expect(getLiveTree()?.unreadable).toEqual([{ path: 'Notes/Foreign.md', reason: 'malformed' }])
    expect((await retry('Notes/Foreign.md')).ok).toBe(true)
    const id = splitFrontmatter(await read('Notes/Foreign.md'))[ID_KEY]
    expect(id).not.toBe(42)
    expect(getLiveTree()?.collections[0].pages.find((p) => p.path === 'Notes/Foreign.md')?.id).toBe(
      id,
    )
    expect(getLiveTree()?.unreadable).toBeUndefined()
  })

  it('over one of two ID: 42 pages rewrites only the one it names', async () => {
    await writeFile(join(root, 'Notes', 'One.md'), '---\nID: 42\n---\nbody')
    await writeFile(join(root, 'Notes', 'Two.md'), '---\nID: 42\n---\nbody')
    await refreshTree(root)
    expect((await retry('Notes/One.md')).ok).toBe(true)
    expect(splitFrontmatter(await read('Notes/One.md'))[ID_KEY]).not.toBe(42)
    expect(await read('Notes/Two.md')).toBe('---\nID: 42\n---\nbody')
    expect(held('Notes/One.md')).toBe(true)
    expect(getLiveTree()?.unreadable).toEqual([{ path: 'Notes/Two.md', reason: 'malformed' }])
  })

  it('writes nothing for a Task’s file in a Collection', async () => {
    const bytes = `---\nID: ${TASK_ID}\n---\nbody`
    await writeFile(join(root, 'Notes', 'Task.md'), bytes)
    await refreshTree(root)
    expect(getLiveTree()?.unreadable).toEqual([{ path: 'Notes/Task.md', reason: 'contradicting' }])
    expect((await retry('Notes/Task.md')).ok).toBe(true)
    expect(await read('Notes/Task.md')).toBe(bytes)
    expect(getLiveTree()?.unreadable).toEqual([{ path: 'Notes/Task.md', reason: 'contradicting' }])
  })

  it('writes nothing for a Set whose corrupt sidecar has since been fixed, and the Set is held', async () => {
    const sidecar = join(root, 'Notes', 'Daily', '_pageset.json')
    await writeFile(sidecar, '{corrupt')
    await refreshTree(root)
    expect(getLiveTree()?.unreadable).toEqual([{ path: 'Notes/Daily', reason: 'unparsed' }])
    const fixed = JSON.stringify({ id: 'col' })
    await writeFile(sidecar, fixed)
    expect((await retry('Notes/Daily')).ok).toBe(true)
    expect(await readFile(sidecar, 'utf8')).toBe(fixed)
    expect(held('Notes/Daily')).toBe(true)
    expect(held('Notes/Daily/Alpha.md')).toBe(true)
    expect(getLiveTree()?.unreadable).toBeUndefined()
  })
})

describe('handleMutate — setBanner', () => {
  let outside: string
  beforeEach(async () => {
    outside = tempRoot('pom-pick-')
  })
  afterEach(async () => {
    await rm(outside, { recursive: true, force: true })
  })

  const pick = async (name: string, body = 'image-bytes'): Promise<string> => {
    const p = join(outside, name)
    await writeFile(p, body)
    return p
  }
  /** Point the nexus at a shared asset folder and seed it, the way an Obsidian vault arrives. */
  const withAssetDir = async (files: string[][] = []): Promise<string> => {
    await writeFile(
      join(root, '.nexus', 'settings.json'),
      JSON.stringify({ asset_directory: 'file-assets' }),
    )
    const assets = join(root, 'file-assets')
    await mkdir(assets, { recursive: true })
    for (const segs of files) {
      await mkdir(join(assets, ...segs.slice(0, -1)), { recursive: true })
      await writeFile(join(assets, ...segs), 'held-bytes')
    }
    return assets
  }
  const bannerOf = async (): Promise<string | undefined> =>
    (await readJson<{ banner?: string }>('Notes/_pagecollection.json')).banner
  const setBanner = (source: string | null) =>
    confirmedMutate(root, { op: 'setBanner', path: 'Notes', kind: 'collection', source }, nexusDeps)

  it('adopts a picked file under its own name and names it by wikilink', async () => {
    const assets = await withAssetDir()
    const r = await setBanner(await pick('Sunset.png'))
    expect(r.ok).toBe(true)
    expect(await bannerOf()).toBe('[[Sunset.png]]')
    expect(await pathExists(join(assets, 'Sunset.png'))).toBe(true)
    expect((await readJson('Notes/_pagecollection.json')).id).toBe('pt')
  })

  it('a file already inside the asset root is referenced, never copied', async () => {
    const assets = await withAssetDir([['Held.png']])
    const r = await setBanner(join(assets, 'Held.png'))
    expect(r.ok).toBe(true)
    expect(await bannerOf()).toBe('[[Held.png]]')
    expect(await readdir(assets)).toEqual(['Held.png'])
  })

  it('a name several files inside the asset root answer to is refused, writing nothing', async () => {
    const assets = await withAssetDir([
      ['a', 'Twin.png'],
      ['b', 'Twin.png'],
    ])
    const r = await setBanner(join(assets, 'a', 'Twin.png'))
    expect(r.ok).toBe(false)
    expect(await bannerOf()).toBeUndefined()
  })

  it('a basename colliding with a DIFFERENT file steps aside rather than overwriting it', async () => {
    const assets = await withAssetDir([['Sunset.png']])
    const r = await setBanner(await pick('Sunset.png', 'picked-bytes'))
    expect(r.ok).toBe(true)
    expect(await bannerOf()).toBe('[[Sunset (2).png]]')
    expect(await readFile(join(assets, 'Sunset.png'), 'utf8')).toBe('held-bytes')
    expect(await readFile(join(assets, 'Sunset (2).png'), 'utf8')).toBe('picked-bytes')
  })

  it('a basename colliding with BYTE-IDENTICAL content is referenced, not copied twice', async () => {
    const assets = await withAssetDir([['Same.png']])
    const r = await setBanner(await pick('Same.png', 'held-bytes'))
    expect(r.ok).toBe(true)
    expect(await bannerOf()).toBe('[[Same.png]]')
    expect(await readdir(assets)).toEqual(['Same.png'])
  })

  it('a name no wikilink can spell is refused', async () => {
    // `[[…]]` carries no escape for a `]`, so the reference has no spelling at all.
    await withAssetDir()
    const r = await setBanner(await pick('Bad]Name.png'))
    expect(r.ok).toBe(false)
    expect(await bannerOf()).toBeUndefined()
  })

  it('a name held ANYWHERE under the root steps aside, not just one in the same folder', async () => {
    // A basename answers nexus-wide, so landing a second `Sunset.png` at the root would make the stored link ambiguous — the very reference adoption refuses to author.
    const assets = await withAssetDir([['sub', 'Sunset.png']])
    const r = await setBanner(await pick('Sunset.png', 'picked-bytes'))
    expect(r.ok).toBe(true)
    expect(await bannerOf()).toBe('[[Sunset (2).png]]')
    expect(await pathExists(join(assets, 'Sunset (2).png'))).toBe(true)
  })

  it('a file that is not an image Pommora can show is refused', async () => {
    await withAssetDir()
    const r = await setBanner(await pick('Notes.txt'))
    expect(r.ok).toBe(false)
    expect(await bannerOf()).toBeUndefined()
  })

  it('a name carrying an alias separator is refused', async () => {
    await withAssetDir()
    const r = await setBanner(await pick('Sun|set.png'))
    expect(r.ok).toBe(false)
    expect(await bannerOf()).toBeUndefined()
  })

  it('a dot-prefixed name the map would never hold is refused', async () => {
    await withAssetDir()
    const r = await setBanner(await pick('.hidden.png'))
    expect(r.ok).toBe(false)
    expect(await bannerOf()).toBeUndefined()
  })

  it('an unreadable source fails and leaves the store untouched', async () => {
    await withAssetDir()
    const r = await setBanner(join(outside, 'Missing.png'))
    expect(r.ok).toBe(false)
    expect(await bannerOf()).toBeUndefined()
  })

  // `atomicWriteBinary` records its own write and the watcher drops the echo, so a test that rebuilds the map from the directory passes while the app renders blank. The adopted value must resolve against the map main is HOLDING.
  it('the adopted value resolves against the map main holds, and that map is owed a push', async () => {
    await withAssetDir()
    await liveAssetMap(root)
    const r = await setBanner(await pick('Live.png'))
    expect(r.ok).toBe(true)
    const pushed = takeAssetMapPush(root)
    expect(pushed).not.toBeNull()
    expect(resolveAssetName(pushed!, 'Live.png')).toBe('file-assets/Live.png')
  })

  it("a replaced banner in the user's own asset folder is never deleted", async () => {
    // The folder is shared — a file there may be referenced from an Obsidian note this app cannot see, and nothing on this path is trashed. Replacing a banner is not consent to destroy it.
    const assets = await withAssetDir([['Solo.png']])
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'pt', banner: '[[Solo.png]]' }),
    )
    expect((await setBanner(await pick('Next.png'))).ok).toBe(true)
    expect(await pathExists(join(assets, 'Solo.png'))).toBe(true)
  })

  it('a replaced banner several files answer to deletes none of them', async () => {
    // Rendering the wrong image is recoverable; deleting one is not.
    const assets = await withAssetDir([
      ['a', 'Twin.png'],
      ['b', 'Twin.png'],
    ])
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'pt', banner: '[[Twin.png]]' }),
    )
    expect((await setBanner(await pick('Next.png'))).ok).toBe(true)
    expect(await pathExists(join(assets, 'a', 'Twin.png'))).toBe(true)
    expect(await pathExists(join(assets, 'b', 'Twin.png'))).toBe(true)
  })

  it('a replaced banner leaves the image it stops naming in place', async () => {
    expect((await setBanner(await pick('First.png'))).ok).toBe(true)
    expect((await setBanner(await pick('Second.png'))).ok).toBe(true)
    expect(await pathExists(join(root, '.nexus/assets/First.png'))).toBe(true)
  })

  it('clearing one banner leaves an image another banner still shows', async () => {
    expect((await setBanner(await pick('Same.png'))).ok).toBe(true)
    const set = await confirmedMutate(
      root,
      { op: 'setBanner', path: 'Notes/Daily', kind: 'set', source: await pick('Same.png') },
      nexusDeps,
    )
    expect(set.ok).toBe(true)
    expect((await setBanner(null)).ok).toBe(true)
    expect(await pathExists(join(root, '.nexus/assets/Same.png'))).toBe(true)
    expect((await readJson('Notes/Daily/_pageset.json')).banner).toBe('[[Same.png]]')
  })

  it('sets a banner on a set sidecar', async () => {
    await withAssetDir()
    const r = await confirmedMutate(
      root,
      { op: 'setBanner', path: 'Notes/Daily', kind: 'set', source: await pick('Set.png') },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect((await readJson('Notes/Daily/_pageset.json')).banner).toBe('[[Set.png]]')
  })

  it('readNexus surfaces the banner value on collection + set nodes', async () => {
    await withAssetDir()
    await setBanner(await pick('Coll.png'))
    await confirmedMutate(
      root,
      { op: 'setBanner', path: 'Notes/Daily', kind: 'set', source: await pick('Sub.png') },
      nexusDeps,
    )
    const tree = await readNexus(root)
    const coll = tree.collections.find((c) => c.id === 'pt')
    expect(coll?.banner).toBe('[[Coll.png]]')
    expect(coll?.sets.find((s) => s.id === 'col')?.banner).toBe('[[Sub.png]]')
  })

  it('clearing removes the field and leaves the image', async () => {
    expect((await setBanner(await pick('Kept.png'))).ok).toBe(true)
    const r = await setBanner(null)
    expect(r.ok).toBe(true)
    expect(await bannerOf()).toBeUndefined()
    expect(await pathExists(join(root, '.nexus/assets/Kept.png'))).toBe(true)
  })

  it('sets a page banner as the `banner` frontmatter key; clearing reverts', async () => {
    const assets = await withAssetDir()
    const created = await confirmedMutate(
      root,
      { op: 'createPage', parentPath: 'Notes/Daily', name: 'Cover' },
      nexusDeps,
    )
    await refreshTree(root)
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const pagePath = created.value.created!.path
    const r = await confirmedMutate(
      root,
      { op: 'setBanner', path: pagePath, kind: 'page', source: await pick('Page.png') },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(await read(pagePath)).toMatch(/banner: ["']\[\[Page\.png\]\]["']/)
    expect(await pathExists(join(assets, 'Page.png'))).toBe(true)
    const cleared = await confirmedMutate(
      root,
      { op: 'setBanner', path: pagePath, kind: 'page', source: null },
      nexusDeps,
    )
    expect(cleared.ok).toBe(true)
    expect(await read(pagePath)).not.toMatch(/banner:/)
  })

  it('sets a homepage banner in .nexus/homepage/homepage.json', async () => {
    await withAssetDir()
    const r = await confirmedMutate(
      root,
      { op: 'setBanner', path: '', kind: 'homepage', source: await pick('Home.png') },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect((await readJson('.nexus/homepage/homepage.json')).banner).toBe('[[Home.png]]')
    expect((await readNexus(root)).config.homepage.banner).toBe('[[Home.png]]')
  })
})

describe('handleMutate — setCrop', () => {
  let outside: string
  beforeEach(async () => {
    outside = tempRoot('pom-pick-')
  })
  afterEach(async () => {
    await rm(outside, { recursive: true, force: true })
  })
  const pick = async (name: string, body = 'image-bytes'): Promise<string> => {
    const p = join(outside, name)
    await writeFile(p, body)
    return p
  }
  const setBannerPage = (source: string | null) =>
    confirmedMutate(
      root,
      { op: 'setBanner', path: 'Notes/Daily/Alpha.md', kind: 'page', source },
      nexusDeps,
    )
  const setCrop = (image: string, crop: Crop | null) =>
    confirmedMutate(root, mutateRequest.parse({ op: 'setCrop', image, crop }), nexusDeps)
  const cropsOf = async (): Promise<Record<string, Crop> | undefined> => {
    try {
      return (await readJson<{ byImage?: Record<string, Crop> }>('.nexus/assets/crops.json'))
        .byImage
    } catch {
      return undefined
    }
  }

  it('stores the crop at the resolved path with the zoom clamped', async () => {
    await setBannerPage(await pick('Cover.png'))
    const r = await setCrop('[[Cover.png]]', { x: 0.3, y: 0.4, zoom: 99 })
    expect(r.ok).toBe(true)
    expect(await cropsOf()).toEqual({
      '.nexus/assets/Cover.png': { x: 0.3, y: 0.4, zoom: 2 },
    })
  })

  it('refuses an ambiguous name, writing nothing', async () => {
    await writeFile(
      join(root, '.nexus', 'settings.json'),
      JSON.stringify({ asset_directory: 'file-assets' }),
    )
    for (const sub of ['a', 'b']) {
      await mkdir(join(root, 'file-assets', sub), { recursive: true })
      await writeFile(join(root, 'file-assets', sub, 'Twin.png'), 'bytes')
    }
    await openSession(root)
    const r = await setCrop('[[Twin.png]]', { x: 0.5, y: 0.5, zoom: 1 })
    expect(r.ok).toBe(false)
    expect(await cropsOf()).toBeUndefined()
  })

  it('a URL value keys the crop by its raw string', async () => {
    const r = await setCrop('https://example.com/a.png', { x: 0.2, y: 0.2, zoom: 1.5 })
    expect(r.ok).toBe(true)
    expect(await cropsOf()).toEqual({
      'https://example.com/a.png': { x: 0.2, y: 0.2, zoom: 1.5 },
    })
  })

  it('null deletes the key and preserves a foreign top-level key', async () => {
    await setBannerPage(await pick('Cover.png'))
    await setCrop('[[Cover.png]]', { x: 0.3, y: 0.4, zoom: 2 })
    const raw = await readJson('.nexus/assets/crops.json')
    await writeFile(
      join(root, '.nexus', 'assets', 'crops.json'),
      JSON.stringify({ ...raw, plugin_field: 'keep' }),
    )
    const r = await setCrop('[[Cover.png]]', null)
    expect(r.ok).toBe(true)
    expect(await cropsOf()).toEqual({})
    expect((await readJson('.nexus/assets/crops.json')).plugin_field).toBe('keep')
  })

  it('a replaced cover keeps its old crop, so picking that image again re-applies it', async () => {
    await setBannerPage(await pick('Cover.png'))
    await setCrop('[[Cover.png]]', { x: 0.3, y: 0.4, zoom: 2 })
    expect(await setBannerPage(await pick('Next.png'))).toMatchObject({ ok: true })
    expect((await cropsOf())?.['.nexus/assets/Cover.png']).toEqual({ x: 0.3, y: 0.4, zoom: 2 })
  })

  // Main-side half of the must-agree; the renderer-side (resolveAssetValue → cropKeyFor) is asserted in AssetImage.test — a single test can't import both across the process boundary.
  it('keys the image main-side by its resolved nexus-relative path', async () => {
    await setBannerPage(await pick('Cover.png'))
    const value = '[[Cover.png]]'
    expect(cropKeyFor(await assetFilePath(root, value), value)).toBe('.nexus/assets/Cover.png')
  })
})

describe('handleMutate — setProperty (the D-4 cross-group reassignment write)', () => {
  // A value only writes for a property the registry knows — the key carries a name, and an unknown name is inert by construction.
  beforeEach(async () => {
    await createProperty(root, { id: 'prop_s', name: 'Stage', type: 'select' })
    await createProperty(root, { id: 'prop_m', name: 'Tags', type: 'multiSelect' })
  })

  it('writes a typed property into the page frontmatter, preserving id + body', async () => {
    const r = await confirmedMutate(
      root,
      {
        op: 'setProperty',
        path: 'Notes/Daily/Beta.md',
        propertyId: 'prop_s',
        value: { kind: 'select', value: 'done' },
      },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const md = await read('Notes/Daily/Beta.md')
    expect(md).toContain('body')
    expect(splitFrontmatter(md)[ID_KEY]).toBe(B_ID)
    expect(splitFrontmatter(md).Stage).toEqual(['done'])
  })

  it('writes no modified_at on a property VALUE change — the file mtime is the edit record', async () => {
    await confirmedMutate(
      root,
      {
        op: 'setProperty',
        path: 'Notes/Daily/Beta.md',
        propertyId: 'prop_s',
        value: { kind: 'select', value: 'done' },
      },
      nexusDeps,
    )
    expect('modified_at' in splitFrontmatter(await read('Notes/Daily/Beta.md'))).toBe(false)
  })

  it('a null value clears the property key', async () => {
    await confirmedMutate(
      root,
      {
        op: 'setProperty',
        path: 'Notes/Daily/Beta.md',
        propertyId: 'prop_s',
        value: { kind: 'select', value: 'done' },
      },
      nexusDeps,
    )
    const r = await confirmedMutate(
      root,
      { op: 'setProperty', path: 'Notes/Daily/Beta.md', propertyId: 'prop_s', value: null },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(splitFrontmatter(await read('Notes/Daily/Beta.md')).Stage).toBeUndefined()
  })

  it('an emptied value clears the key on disk — the file never holds a [] placeholder', async () => {
    await confirmedMutate(
      root,
      {
        op: 'setProperty',
        path: 'Notes/Daily/Beta.md',
        propertyId: 'prop_m',
        value: { kind: 'multiSelect', value: ['a'] },
      },
      nexusDeps,
    )
    const r = await confirmedMutate(
      root,
      {
        op: 'setProperty',
        path: 'Notes/Daily/Beta.md',
        propertyId: 'prop_m',
        value: { kind: 'multiSelect', value: [] },
      },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const md = await read('Notes/Daily/Beta.md')
    expect(splitFrontmatter(md).Tags).toBeUndefined()
    expect(md).not.toContain('Tags')
  })

  it('never throws on a missing page — returns ok:false', async () => {
    const r = await confirmedMutate(
      root,
      { op: 'setProperty', path: 'Notes/Daily/Ghost.md', propertyId: 'prop_s', value: null },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
  })
})

describe('handleMutate — setIcon and setHeadingIconHidden on a container sidecar', () => {
  it('sets an icon and drops the key again when it is cleared, keeping foreign keys', async () => {
    const set = await confirmedMutate(
      root,
      { op: 'setIcon', path: 'Notes', kind: 'collection', icon: 'star' },
      nexusDeps,
    )
    expect(set.ok).toBe(true)
    let sc = await readJson('Notes/_pagecollection.json')
    expect(sc.icon).toBe('star')
    expect(sc.id).toBe('pt')

    const cleared = await confirmedMutate(
      root,
      { op: 'setIcon', path: 'Notes', kind: 'collection', icon: null },
      nexusDeps,
    )
    expect(cleared.ok).toBe(true)
    sc = await readJson('Notes/_pagecollection.json')
    expect('icon' in sc).toBe(false)
    expect(sc.id).toBe('pt')
  })

  it('a Space keeps its glyph under $icon, beside a property value named icon', async () => {
    const file = await seedSpaceSidecar(root, 'Projects', 'Pom', { id: 'sp1', icon: 'box' })
    await writeFile(
      join(root, '.nexus', 'contexts', 'contexts.json'),
      JSON.stringify({ contexts: [{ id: 'ctxP', title: 'Projects', singular: 'Project' }] }),
    )
    const path = '.nexus/contexts/Projects/Pom'
    const set = await confirmedMutate(
      root,
      { op: 'setIcon', path, kind: 'space', icon: 'star' },
      nexusDeps,
    )
    expect(set.ok).toBe(true)
    expect(await readJsonAt(file)).toEqual({ id: 'sp1', icon: 'box', $icon: 'star' })

    const cleared = await confirmedMutate(
      root,
      { op: 'setIcon', path, kind: 'space', icon: null },
      nexusDeps,
    )
    expect(cleared.ok).toBe(true)
    expect(await readJsonAt(file)).toEqual({ id: 'sp1', icon: 'box' })
  })

  it('refuses an icon on a sidecar with no id rather than reseeding one', async () => {
    await writeFile(join(root, 'Notes/_pagecollection.json'), JSON.stringify({ views: [] }))
    const r = await confirmedMutate(
      root,
      { op: 'setIcon', path: 'Notes', kind: 'collection', icon: 'star' },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
  })

  it('round-trips the heading-icon flag, and absence is the shown default', async () => {
    const hidden = await confirmedMutate(
      root,
      { op: 'setHeadingIconHidden', path: 'Notes', kind: 'collection', hidden: true },
      nexusDeps,
    )
    expect(hidden.ok).toBe(true)
    expect((await readJson('Notes/_pagecollection.json')).heading_icon_hidden).toBe(true)

    const shown = await confirmedMutate(
      root,
      { op: 'setHeadingIconHidden', path: 'Notes', kind: 'collection', hidden: false },
      nexusDeps,
    )
    expect(shown.ok).toBe(true)
    const sc = await readJson('Notes/_pagecollection.json')
    expect('heading_icon_hidden' in sc).toBe(false)
    expect(sc.id).toBe('pt')
  })
})

describe('adoptFile — the shared adoption seam', () => {
  let outside: string
  beforeEach(async () => {
    outside = tempRoot('pom-adopt-')
    await writeFile(
      join(root, '.nexus', 'settings.json'),
      JSON.stringify({ asset_directory: 'file-assets' }),
    )
    await mkdir(join(root, 'file-assets'), { recursive: true })
  })
  afterEach(async () => {
    await rm(outside, { recursive: true, force: true })
  })
  const pick = async (name: string, body = 'bytes'): Promise<string> => {
    const p = join(outside, name)
    await writeFile(p, body)
    return p
  }

  it('the extension gate is per caller: a banner takes images, a file property takes anything', async () => {
    const pdf = await pick('Report.pdf')
    expect(await adoptFile(root, pdf, { allow: 'image' })).toMatchObject({ ok: false })
    const any = await adoptFile(root, pdf, { allow: 'any' })
    expect(any).toEqual({ ok: true, value: '[[Report.pdf]]' })
    expect(await pathExists(join(root, 'file-assets', 'Report.pdf'))).toBe(true)
  })

  it('a name the link grammar cannot spell is refused whatever the caller allows', async () => {
    // `|` splits off an alias and `]` closes the link early, so either one silently retargets the reference at something that is not the file. Widening the extension gate must not reach this.
    for (const name of ['Q3|draft.pdf', 'Summary]].pdf'])
      expect(await adoptFile(root, await pick(name), { allow: 'any' })).toMatchObject({ ok: false })
    expect(await readdir(join(root, 'file-assets'))).toEqual([])
  })

  it('a typed path that isn’t absolute, or names nothing, is refused as unreadable', async () => {
    for (const typed of ['~/Report.pdf', 'Report.pdf', join(root, 'nowhere.pdf')])
      expect(await adoptFile(root, typed, { allow: 'any' })).toMatchObject({
        ok: false,
        error: { message: 'That file could not be read.' },
      })
  })

  it('lands the file in the subfolder its property names, still answering by basename', async () => {
    const r = await adoptFile(root, await pick('Spec.pdf'), {
      allow: 'any',
      subfolder: 'Attachments',
    })
    expect(r).toEqual({ ok: true, value: '[[Spec.pdf]]' })
    expect(await pathExists(join(root, 'file-assets', 'Attachments', 'Spec.pdf'))).toBe(true)
  })

  it('an absent subfolder lands in the asset root itself', async () => {
    const r = await adoptFile(root, await pick('Loose.pdf'), { allow: 'any', subfolder: '' })
    expect(r).toEqual({ ok: true, value: '[[Loose.pdf]]' })
    expect(await pathExists(join(root, 'file-assets', 'Loose.pdf'))).toBe(true)
  })

  it('a basename held in ANOTHER subfolder steps aside — one namespace, wherever the files sit', async () => {
    await adoptFile(root, await pick('Doc.pdf', 'first'), { allow: 'any', subfolder: 'A' })
    const second = await adoptFile(root, await pick('Doc.pdf', 'second'), {
      allow: 'any',
      subfolder: 'B',
    })
    expect(second).toEqual({ ok: true, value: '[[Doc (2).pdf]]' })
  })

  it('refuses a subfolder that climbs out of the asset root, writing nothing', async () => {
    // `rootSegs` drops empty segments but NOT `..`, and `join` then collapses them straight past the root — so an unrefused destination is an arbitrary-file-write primitive: `'../..'` lands in the nexus root, `'../../..'` outside the nexus entirely.
    for (const subfolder of ['..', '../..', '../../..', 'a/../..', '/etc', '.\\..'])
      expect(
        await adoptFile(root, await pick('Evil.pdf'), { allow: 'any', subfolder }),
      ).toMatchObject({
        ok: false,
      })
    expect(await readdir(join(root, 'file-assets'))).toEqual([])
    expect(await pathExists(join(root, 'Evil.pdf'))).toBe(false)
    expect(await pathExists(join(root, '.nexus', 'Evil.pdf'))).toBe(false)
  })

  it('refuses a subfolder the map could never index', async () => {
    // `.private` is contained, mkdirs, writes, and answers a valid-looking reference — while the map drops it forever, leaving an unresolved label and no error anywhere.
    const r = await adoptFile(root, await pick('Hidden.pdf'), {
      allow: 'any',
      subfolder: '.private',
    })
    expect(r.ok).toBe(false)
    expect(await readdir(join(root, 'file-assets'))).toEqual([])
  })

  it('refuses a name that cannot be written as a link and read back', async () => {
    // The reference pattern is single-line, so a name carrying a break mints one that writes and never parses — the same permanent blank the bracket and pipe refusals exist to prevent.
    for (const name of ['line\nbreak.pdf', 'Q3|draft.pdf', 'Summary]].pdf'])
      expect(await adoptFile(root, await pick(name), { allow: 'any' })).toMatchObject({ ok: false })
    expect(await readdir(join(root, 'file-assets'))).toEqual([])
  })

  it.skipIf(windows)(
    'refuses a subfolder that is a symlink INTO the nexus — the lexical check cannot see it',
    async () => {
      // A linked attachments folder is ordinary in a vault. Containment passes, and `resolveUnderRoot` bounds the NEXUS, which a link at the content tree satisfies — so the bytes would land among the user's pages, under a name `buildAssetMap` never walks into and can never resolve again.
      await mkdir(join(root, 'Projects', 'Secret'), { recursive: true })
      await symlink(join(root, 'Projects', 'Secret'), join(root, 'file-assets', 'Linked'))

      const r = await adoptFile(root, await pick('Leak.pdf'), { allow: 'any', subfolder: 'Linked' })

      expect(r.ok).toBe(false)
      expect(await readdir(join(root, 'Projects', 'Secret'))).toEqual([])
    },
  )

  it('a pick from a hidden folder UNDER the root is copied out, never referenced in place', async () => {
    // `underAssetRoot` admits the dot-prefixed segment `indexable` drops, so an in-place reference here would name a file the map can never hold — resolvable by nothing, with no error anywhere.
    await mkdir(join(root, 'file-assets', '.archive'), { recursive: true })
    await writeFile(join(root, 'file-assets', '.archive', 'Buried.pdf'), 'buried-bytes')

    const r = await adoptFile(root, join(root, 'file-assets', '.archive', 'Buried.pdf'), {
      allow: 'any',
      subfolder: 'Docs',
    })

    expect(r).toEqual({ ok: true, value: '[[Buried.pdf]]' })
    expect(await pathExists(join(root, 'file-assets', 'Docs', 'Buried.pdf'))).toBe(true)
    expect(resolveAssetName(await liveAssetMap(root), 'Buried.pdf')).toBe(
      'file-assets/Docs/Buried.pdf',
    )
  })

  it('never deletes: adopting a replacement leaves the file the old reference named', async () => {
    const first = await adoptFile(root, await pick('Old.pdf'), { allow: 'any' })
    expect(first.ok).toBe(true)
    const second = await adoptFile(root, await pick('New.pdf'), { allow: 'any' })
    expect(second.ok).toBe(true)
    expect(await pathExists(join(root, 'file-assets', 'Old.pdf'))).toBe(true)
  })
})

describe('a file value never destroys what it stops naming', () => {
  // The seam dedups, so two pages picking the same source share ONE file on disk; a Replace that ever learned to delete would destroy what another page's reference names. This asserts the FILE, not the absence of a call: a call-spy passes with zero implementation.
  beforeEach(async () => {
    await createProperty(root, { id: 'prop_f', name: 'Attachments', type: 'file' })
    await writeFile(
      join(root, '.nexus', 'settings.json'),
      JSON.stringify({ asset_directory: 'file-assets' }),
    )
    await mkdir(join(root, 'file-assets'), { recursive: true })
    for (const name of ['Old.pdf', 'New.pdf'])
      await writeFile(join(root, 'file-assets', name), `${name}-bytes`)
  })

  const setFiles = (path: string, value: string[]) =>
    confirmedMutate(
      root,
      { op: 'setProperty', path, propertyId: 'prop_f', value: { kind: 'file', value } },
      nexusDeps,
    )

  it('replacing a reference leaves the file it named on disk', async () => {
    expect((await setFiles('Notes/Daily/Beta.md', ['[[Old.pdf]]'])).ok).toBe(true)
    expect((await setFiles('Notes/Daily/Beta.md', ['[[New.pdf]]'])).ok).toBe(true)
    expect(splitFrontmatter(await read('Notes/Daily/Beta.md')).Attachments).toEqual(['[[New.pdf]]'])
    expect(await pathExists(join(root, 'file-assets', 'Old.pdf'))).toBe(true)
  })

  it('clearing the last reference leaves the file, and takes the key', async () => {
    expect((await setFiles('Notes/Daily/Beta.md', ['[[Old.pdf]]'])).ok).toBe(true)
    expect((await setFiles('Notes/Daily/Beta.md', [])).ok).toBe(true)
    expect(splitFrontmatter(await read('Notes/Daily/Beta.md')).Attachments).toBeUndefined()
    expect(await pathExists(join(root, 'file-assets', 'Old.pdf'))).toBe(true)
  })

  it('a file another page still names survives the first page dropping it', async () => {
    expect((await setFiles('Notes/Daily/Alpha.md', ['[[Old.pdf]]'])).ok).toBe(true)
    expect((await setFiles('Notes/Daily/Beta.md', ['[[Old.pdf]]'])).ok).toBe(true)
    expect((await setFiles('Notes/Daily/Alpha.md', ['[[New.pdf]]'])).ok).toBe(true)
    expect(splitFrontmatter(await read('Notes/Daily/Beta.md')).Attachments).toEqual(['[[Old.pdf]]'])
    expect(await pathExists(join(root, 'file-assets', 'Old.pdf'))).toBe(true)
  })
})

describe('the acceptance chain, read raw off the disk at every step', () => {
  // The one that crosses the per-step facts the way a session does — pick, add, add, replace, remove, clear — asserting the page's actual bytes, since the criterion is what an outside tool sees, not what the decoder answers.
  let outside: string
  beforeEach(async () => {
    outside = tempRoot('pom-chain-')
    await createProperty(root, { id: 'prop_f', name: 'Attachments', type: 'file' })
    await writeFile(
      join(root, '.nexus', 'settings.json'),
      JSON.stringify({ asset_directory: 'file-assets' }),
    )
    await mkdir(join(root, 'file-assets'), { recursive: true })
  })
  afterEach(async () => {
    await rm(outside, { recursive: true, force: true })
  })
  const pick = async (name: string, body: string): Promise<string> => {
    const p = join(outside, name)
    await writeFile(p, body)
    return p
  }
  const setFiles = (value: string[]) =>
    confirmedMutate(
      root,
      {
        op: 'setProperty',
        path: 'Notes/Daily/Beta.md',
        propertyId: 'prop_f',
        value: { kind: 'file', value },
      },
      nexusDeps,
    )

  it('pick lands under the Directory, the page spells a quoted wikilink, and every later step leaves the rest alone', async () => {
    const first = await adoptFile(root, await pick('Spec.pdf', 'spec-bytes'), {
      allow: 'any',
      subfolder: 'Reports',
    })
    expect(first).toEqual({ ok: true, value: '[[Spec.pdf]]' })
    expect(await pathExists(join(root, 'file-assets', 'Reports', 'Spec.pdf'))).toBe(true)
    expect((await setFiles(['[[Spec.pdf]]'])).ok).toBe(true)
    expect(await read('Notes/Daily/Beta.md')).toContain('Attachments:\n  - "[[Spec.pdf]]"')

    const second = await adoptFile(root, await pick('Notes.txt', 'note-bytes'), {
      allow: 'any',
      subfolder: 'Reports',
    })
    expect(second).toEqual({ ok: true, value: '[[Notes.txt]]' })
    expect((await setFiles(['[[Spec.pdf]]', '[[Notes.txt]]'])).ok).toBe(true)
    expect(await read('Notes/Daily/Beta.md')).toContain(
      'Attachments:\n  - "[[Spec.pdf]]"\n  - "[[Notes.txt]]"',
    )

    const replacement = await adoptFile(root, await pick('Final.pdf', 'final-bytes'), {
      allow: 'any',
      subfolder: 'Reports',
    })
    expect(replacement).toEqual({ ok: true, value: '[[Final.pdf]]' })
    expect((await setFiles(['[[Final.pdf]]', '[[Notes.txt]]'])).ok).toBe(true)
    expect(await read('Notes/Daily/Beta.md')).toContain(
      'Attachments:\n  - "[[Final.pdf]]"\n  - "[[Notes.txt]]"',
    )
    expect(await pathExists(join(root, 'file-assets', 'Reports', 'Spec.pdf'))).toBe(true)

    expect((await setFiles(['[[Final.pdf]]'])).ok).toBe(true)
    expect(await read('Notes/Daily/Beta.md')).toContain('Attachments:\n  - "[[Final.pdf]]"')
    expect((await setFiles([])).ok).toBe(true)
    expect(await read('Notes/Daily/Beta.md')).not.toContain('Attachments')
    for (const name of ['Spec.pdf', 'Notes.txt', 'Final.pdf'])
      expect(await pathExists(join(root, 'file-assets', 'Reports', name))).toBe(true)
  })

  it('re-picking a source already adopted answers the existing reference, not a copy', async () => {
    const source = await pick('Same.pdf', 'same-bytes')
    expect(await adoptFile(root, source, { allow: 'any', subfolder: 'Reports' })).toEqual({
      ok: true,
      value: '[[Same.pdf]]',
    })
    expect(await adoptFile(root, source, { allow: 'any', subfolder: 'Reports' })).toEqual({
      ok: true,
      value: '[[Same.pdf]]',
    })
    expect(await readdir(join(root, 'file-assets', 'Reports'))).toEqual(['Same.pdf'])
  })
})

describe('handleMutate — setActiveView', () => {
  it('writes active_view onto the container sidecar', async () => {
    const r = await confirmedMutate(
      root,
      { op: 'setActiveView', path: 'Notes/Daily', kind: 'set', viewId: 'view_x' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect((await readJson('Notes/Daily/_pageset.json')).active_view).toBe('view_x')
  })

  it('takes the sidecar lock itself — nesting it inside one is refused', async () => {
    const folder = await resolveUnderRoot(root, 'Notes/Daily')
    if (!folder.ok) throw new Error('unresolvable')
    const r = await machine().lock(sidecarPath(folder.value, 'set'), () =>
      confirmedMutate(
        root,
        { op: 'setActiveView', path: 'Notes/Daily', kind: 'set', viewId: 'view_x' },
        nexusDeps,
      ),
    )
    expect(r.ok ? '' : r.error.message).toMatch(/Re-entrant file lock/)
  })
})

const seedTwoContexts = async (): Promise<void> => {
  closeSession()
  for (const [context, space, id] of [
    ['Projects', 'Pommora', 'sp-pom'],
    ['Areas', 'Work', 'sp-work'],
  ]) {
    await mkdir(join(root, '.nexus', 'contexts', context, space), { recursive: true })
    await writeFile(
      join(root, '.nexus', 'contexts', context, space, '_space.json'),
      JSON.stringify({ id }),
    )
  }
  await writeFile(
    join(root, '.nexus', 'contexts', 'contexts.json'),
    JSON.stringify({
      contexts: [
        { id: 'ctxP', title: 'Projects', singular: 'Project' },
        { id: 'ctxA', title: 'Areas', singular: 'Area' },
      ],
    }),
  )
  await openSession(root)
}

describe('the Contexts lock', () => {
  beforeEach(seedTwoContexts)

  it('a page tag written during a Context rename lands under the new key beside its other Contexts', async () => {
    const [renamed, tagged] = await Promise.all([
      confirmedMutate(
        root,
        { op: 'renameContext', contextId: 'ctxP', newName: 'Ventures' },
        nexusDeps,
      ),
      confirmedMutate(
        root,
        { op: 'setContext', path: 'Notes/Daily/Alpha.md', contextId: 'ctxP', spaceIds: ['sp-pom'] },
        nexusDeps,
      ),
    ])
    expect(renamed.ok && tagged.ok).toBe(true)
    const fm = splitFrontmatter(await read('Notes/Daily/Alpha.md'))
    expect(fm['<Ventures>']).toEqual(['Pommora'])
    expect(fm['<Areas>']).toEqual(['Work'])
    expect('<Projects>' in fm).toBe(false)
  })

  it('a page tag written during a Space rename names the Space by its new title', async () => {
    // Unlocked, the rename waits at its collision check until the tag has loaded its world, and the tag writes only once the rename is done; locked, it waits until the tag queues on the lock.
    installStores(memoryStores().stores)
    await seedContentIndex(root)
    let worldLoaded = (): void => {}
    const loaded = new Promise<void>((resolve) => {
      worldLoaded = resolve
    })
    const lock = lockContention(contextsDir(root))
    const taken = atomicWrite.targetTaken
    const renameWaits = vi
      .spyOn(atomicWrite, 'targetTaken')
      .mockImplementation(async (from, to) => {
        await Promise.race([loaded, lock.contended])
        return taken(from, to)
      })
    const renaming = confirmedMutate(
      root,
      { op: 'renameSpace', spaceId: 'sp-pom', newName: 'Atlas' },
      nexusDeps,
    )
    const folderOf = assignment.collectionFolderOf
    const tagWaits = vi
      .spyOn(assignment, 'collectionFolderOf')
      .mockImplementation(async (r, file) => {
        worldLoaded()
        await renaming
        return folderOf(r, file)
      })
    const tagged = await confirmedMutate(
      root,
      { op: 'setContext', path: 'Notes/Daily/Alpha.md', contextId: 'ctxP', spaceIds: ['sp-pom'] },
      nexusDeps,
    )
    renameWaits.mockRestore()
    tagWaits.mockRestore()
    lock.restore()
    installStores(NO_STORES)
    expect((await renaming).ok && tagged.ok).toBe(true)
    expect(splitFrontmatter(await read('Notes/Daily/Alpha.md'))['<Projects>']).toEqual(['Atlas'])
  })

  const sweeps = {
    unlinkSpaceValue: contextCascade.unlinkSpaceValue,
    unlinkContextKey: contextCascade.unlinkContextKey,
  }
  const tagDuringDelete = async (kind: 'space' | 'context', path: string): Promise<string> => {
    installStores(memoryStores().stores)
    await seedContentIndex(root)
    let worldLoaded = (): void => {}
    const loaded = new Promise<void>((resolve) => {
      worldLoaded = resolve
    })
    const lock = lockContention(contextsDir(root))
    const sweep = kind === 'space' ? 'unlinkSpaceValue' : 'unlinkContextKey'
    const unlink = sweeps[sweep] as (...args: unknown[]) => Promise<unknown>
    const deleteWaits = vi.spyOn(contextCascade, sweep).mockImplementation((async (
      ...args: unknown[]
    ) => {
      await Promise.race([loaded, lock.contended])
      return unlink(...args)
    }) as never)
    const deleting = confirmedMutate(root, { op: 'delete', path, kind }, nexusDeps)
    const folderOf = assignment.collectionFolderOf
    const tagWaits = vi
      .spyOn(assignment, 'collectionFolderOf')
      .mockImplementation(async (r, file) => {
        worldLoaded()
        await deleting
        return folderOf(r, file)
      })
    const tagged = await confirmedMutate(
      root,
      { op: 'setContext', path: 'Notes/Daily/Beta.md', contextId: 'ctxA', spaceIds: ['sp-work'] },
      nexusDeps,
    )
    deleteWaits.mockRestore()
    tagWaits.mockRestore()
    lock.restore()
    installStores(NO_STORES)
    expect((await deleting).ok).toBe(true)
    expect('<Areas>' in splitFrontmatter(await read('Notes/Daily/Beta.md'))).toBe(false)
    return tagged.ok ? 'tagged' : `${tagged.error.code}: ${tagged.error.message}`
  }

  it('a page tag written during a Space delete is refused as an unknown Space', async () => {
    expect(await tagDuringDelete('space', '.nexus/contexts/Areas/Work')).toBe(
      'not-found: Unknown Space.',
    )
  })

  it('a page tag written during a Context delete is refused as an unknown Space', async () => {
    expect(await tagDuringDelete('context', '.nexus/contexts/Areas')).toBe(
      'not-found: Unknown Space.',
    )
  })

  it('a Space created during a Context rename lands in the renamed Context', async () => {
    const [renamed, created] = await Promise.all([
      confirmedMutate(
        root,
        { op: 'renameContext', contextId: 'ctxP', newName: 'Ventures' },
        nexusDeps,
      ),
      confirmedMutate(root, { op: 'createSpace', contextId: 'ctxP', name: 'Atlas' }, nexusDeps),
    ])
    expect(renamed.ok && created.ok).toBe(true)
    expect(await pathExists(join(root, '.nexus/contexts/Ventures/Atlas/_space.json'))).toBe(true)
    expect(await pathExists(join(root, '.nexus/contexts/Projects'))).toBe(false)
  })

  it('a page created with a Context seed during that Context’s rename carries the new key', async () => {
    const [renamed, created] = await Promise.all([
      confirmedMutate(
        root,
        { op: 'renameContext', contextId: 'ctxP', newName: 'Ventures' },
        nexusDeps,
      ),
      confirmedMutate(
        root,
        {
          op: 'createPage',
          parentPath: 'Notes/Daily',
          name: 'Gamma',
          seeds: { ctxP: { kind: 'context', value: ['sp-pom'] } },
        },
        nexusDeps,
      ),
    ])
    expect(renamed.ok && created.ok).toBe(true)
    const fm = splitFrontmatter(await read('Notes/Daily/Gamma.md'))
    expect(fm['<Ventures>']).toEqual(['Pommora'])
    expect('<Projects>' in fm).toBe(false)
  })
})

describe('setContext on a Space', () => {
  const sidecar = (context: string, space: string): Promise<Record<string, unknown>> =>
    readJsonAt(join(root, '.nexus', 'contexts', context, space, '_space.json'))

  beforeEach(seedTwoContexts)

  const link = (spaceIds: string[]) =>
    confirmedMutate(
      root,
      { op: 'setContext', path: '.nexus/contexts/Projects/Pommora', contextId: 'ctxA', spaceIds },
      nexusDeps,
    )

  it('the same add sent twice names the Space once', async () => {
    await Promise.all([link(['sp-work']), link(['sp-work'])])
    expect((await sidecar('Areas', 'Work'))['<Projects>']).toEqual(['Pommora'])
  })

  it('createSpace order substitutes NEW_SLOT with the minted id and persists the Space order', async () => {
    const r = await confirmedMutate(
      root,
      { op: 'createSpace', contextId: 'ctxP', name: 'Atlas', order: [NEW_SLOT, 'sp-pom'] },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const tree = await readNexus(root)
    const projects = tree.contexts.find((g) => g.def.id === 'ctxP')
    expect(projects?.spaces.map((sp) => sp.title)).toEqual(['Atlas', 'Pommora'])
  })
})

describe('handleMutate — setPageMeta', () => {
  const month = async (id: string): Promise<unknown> =>
    readJson(`.nexus/metadata/${shardOf(id)}.json`)

  it('writes a stamped page’s entry into its month', async () => {
    const r = await confirmedMutate(
      root,
      { op: 'setPageMeta', path: 'Notes/Daily/Alpha.md', patch: { locked: true } },
      nexusDeps,
    )
    expect(r).toEqual({ ok: true, value: {} })
    expect(await month(A_ID)).toEqual({ pages: { [A_ID]: { locked: true } } })
  })

  it('refuses a path that is not a page and leaves its bytes alone', async () => {
    const before = await read('.nexus/settings.json')
    const r = await confirmedMutate(
      root,
      { op: 'setPageMeta', path: '.nexus/settings.json', patch: { locked: true } },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
    expect(await read('.nexus/settings.json')).toBe(before)
  })

  it('refuses an ID-less page the tree doesn’t hold and leaves its bytes alone', async () => {
    await writeFile(join(root, 'Notes', 'Daily', 'Gamma.md'), 'gamma')
    const r = await confirmedMutate(
      root,
      { op: 'setPageMeta', path: 'Notes/Daily/Gamma.md', patch: { title_icon: true } },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
    expect(await read('Notes/Daily/Gamma.md')).toBe('gamma')
  })

  it('a page icon lands in its month and leaves the page file’s bytes and mtime alone', async () => {
    const page = join(root, 'Notes', 'Daily', 'Alpha.md')
    const bytes = await read('Notes/Daily/Alpha.md')
    const { mtimeMs } = await stat(page)
    const set = await confirmedMutate(
      root,
      { op: 'setIcon', path: 'Notes/Daily/Alpha.md', kind: 'page', icon: 'star' },
      nexusDeps,
    )
    expect(set).toEqual({ ok: true, value: {} })
    expect(await month(A_ID)).toEqual({ pages: { [A_ID]: { icon: 'star' } } })

    await confirmedMutate(
      root,
      { op: 'setPageMeta', path: 'Notes/Daily/Alpha.md', patch: { locked: true } },
      nexusDeps,
    )
    const cleared = await confirmedMutate(
      root,
      { op: 'setIcon', path: 'Notes/Daily/Alpha.md', kind: 'page', icon: null },
      nexusDeps,
    )
    expect(cleared).toEqual({ ok: true, value: {} })
    expect(await month(A_ID)).toEqual({ pages: { [A_ID]: { locked: true } } })
    expect(await read('Notes/Daily/Alpha.md')).toBe(bytes)
    expect((await stat(page)).mtimeMs).toBe(mtimeMs)
  })
})

describe('handleMutate — landings Settings keeps out', () => {
  beforeEach(async () => {
    await writeFile(
      join(root, '.nexus', 'settings.json'),
      JSON.stringify({ excluded_folders: ['Archive', 'Other/Daily'], asset_directory: 'Media' }),
    )
    await mkdir(join(root, 'Other'), { recursive: true })
    await writeFile(join(root, 'Other', '_pagecollection.json'), JSON.stringify({ id: 'ot' }))
    await refreshTree(root)
  })

  const refusal = (r: Awaited<ReturnType<typeof confirmedMutate>>): string =>
    r.ok ? '' : r.error.message

  it('refuses a Collection created, or a Set renamed, onto an excluded folder', async () => {
    const created = await confirmedMutate(
      root,
      { op: 'createContainer', parentPath: '', kind: 'collection', name: 'Archive' },
      nexusDeps,
    )
    expect(refusal(created)).toContain('"Archive" is currently listed as an excluded directory')
    expect(await pathExists(join(root, 'Archive'))).toBe(false)
    const renamed = await confirmedMutate(
      root,
      { op: 'rename', path: 'Notes', kind: 'collection', newName: 'archive' },
      nexusDeps,
    )
    expect(refusal(renamed)).toContain('excluded directory')
    expect(await pathExists(join(root, 'Notes'))).toBe(true)
  })

  it('leaves a name the primitive refuses to the primitive', async () => {
    const r = await confirmedMutate(
      root,
      { op: 'rename', path: 'Notes', kind: 'collection', newName: 'Archive/x' },
      nexusDeps,
    )
    expect(refusal(r)).toContain('is not a valid name')
  })

  it('refuses a Collection renamed onto the asset folder', async () => {
    const r = await confirmedMutate(
      root,
      { op: 'rename', path: 'Notes', kind: 'collection', newName: 'Media' },
      nexusDeps,
    )
    expect(refusal(r)).toContain('"Media" is currently listed as the default asset folder')
  })

  it('refuses a Set moved onto an excluded path', async () => {
    const r = await confirmedMutate(
      root,
      { op: 'moveSet', path: 'Notes/Daily', newParentPath: 'Other', order: [] },
      nexusDeps,
    )
    expect(refusal(r)).toContain('"Daily" is currently listed as an excluded directory')
    expect(await pathExists(join(root, 'Notes', 'Daily'))).toBe(true)
  })
})

describe('handleMutate — excluded entries follow their folders', () => {
  const excludedOnDisk = async (): Promise<unknown> =>
    (await readJson('.nexus/settings.json')).excluded_folders
  const exclude = async (folders: string[]): Promise<void> => {
    await writeFile(
      join(root, '.nexus', 'settings.json'),
      JSON.stringify({ excluded_folders: folders }),
    )
    await refreshTree(root)
  }

  it('rewrites an entry under a renamed Collection and rescopes the session', async () => {
    await mkdir(join(root, 'Other', 'Daily'), { recursive: true })
    await writeFile(join(root, 'Other', '_pagecollection.json'), JSON.stringify({ id: 'ot' }))
    await writeFile(join(root, 'Other', 'Daily', '_pageset.json'), JSON.stringify({ id: 'od' }))
    await exclude(['Archive', 'Other/Daily'])
    const push = vi.fn()
    const watch = vi.fn(async () => {})
    const ctx = { push, watch, trashMode: async () => 'nexus' } as unknown as HostContext
    const r = await nexusHandlers.mutate(ctx, {
      op: 'rename',
      path: 'Other',
      kind: 'collection',
      newName: 'Elsewhere',
    })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(r).toEqual({ ok: true, value: { rescope: true } })
    expect(await excludedOnDisk()).toEqual(['Archive', 'Elsewhere/Daily'])
    expect(watch).toHaveBeenCalledWith(root)
    const tree = getLiveTree()
    expect(tree?.config.excluded).toEqual(['Archive', 'Elsewhere/Daily'])
    expect(tree?.collections.find((c) => c.path === 'Elsewhere')?.sets).toEqual([])
    expect(push.mock.calls.map(([name]) => name)).toContain('nexus:changed')
  })

  it('refuses a landing that carries excluded entries while settings.json can’t be written', async () => {
    await mkdir(join(root, 'Notes', 'Private'), { recursive: true })
    await mkdir(join(root, 'Other'), { recursive: true })
    await writeFile(join(root, 'Other', '_pagecollection.json'), JSON.stringify({ id: 'ot' }))
    await exclude(['Notes/Private'])
    await writeFile(join(root, '.nexus', 'settings.json'), '{ corrupt')
    for (const req of [
      { op: 'rename', path: 'Notes', kind: 'collection', newName: 'Elsewhere' },
      { op: 'delete', path: 'Notes', kind: 'collection' },
    ] as const) {
      const r = await confirmedMutate(root, req, nexusDeps)
      expect(r.ok ? '' : r.error.message).toContain('settings.json')
      expect(await pathExists(join(root, 'Notes', 'Private'))).toBe(true)
    }
    expect(await pathExists(join(root, '.trash'))).toBe(false)
    expect(await read('.nexus/settings.json')).toBe('{ corrupt')
    const landed = await confirmedMutate(
      root,
      { op: 'rename', path: 'Other', kind: 'collection', newName: 'Moved' },
      nexusDeps,
    )
    expect(landed.ok).toBe(true)
  })

  it('refuses a Set moved, or a Collection restored, with excluded entries while settings.json can’t be written', async () => {
    await mkdir(join(root, 'Notes', 'Daily', 'Private'), { recursive: true })
    await mkdir(join(root, 'Other', 'Kept', 'Private'), { recursive: true })
    await writeFile(join(root, 'Other', '_pagecollection.json'), JSON.stringify({ id: 'ot' }))
    await writeFile(join(root, 'Other', 'Kept', '_pageset.json'), JSON.stringify({ id: 'ok' }))
    await mkdir(join(root, 'Third'))
    await writeFile(join(root, 'Third', '_pagecollection.json'), JSON.stringify({ id: 'th' }))
    await exclude(['Notes/Daily/Private', 'Other/Kept/Private'])
    const deleted = await confirmedMutate(
      root,
      { op: 'delete', path: 'Other', kind: 'collection' },
      nexusDeps,
    )
    const bundlePath = (deleted.ok && deleted.value.trashed?.bundlePath) || ''
    await refreshTree(root)
    await writeFile(join(root, '.nexus', 'settings.json'), '{ corrupt')
    const moved = await confirmedMutate(
      root,
      { op: 'moveSet', path: 'Notes/Daily', newParentPath: 'Third', order: [] },
      nexusDeps,
    )
    expect(moved.ok ? '' : moved.error.message).toContain('settings.json')
    const restored = await confirmedMutate(root, { op: 'restore', bundlePath }, nexusDeps)
    expect(restored.ok ? '' : restored.error.message).toContain('settings.json')
    expect(await pathExists(join(root, 'Notes', 'Daily', 'Private'))).toBe(true)
    expect(await pathExists(join(root, 'Other'))).toBe(false)
    const reordered = await confirmedMutate(
      root,
      { op: 'moveSet', path: 'Notes/Daily', newParentPath: 'Notes', order: [] },
      nexusDeps,
    )
    expect(reordered.ok).toBe(true)
  })

  it('takes a trashed Collection’s entries with it and lands them wherever it is restored', async () => {
    await mkdir(join(root, 'Other', 'Daily'), { recursive: true })
    await writeFile(join(root, 'Other', '_pagecollection.json'), JSON.stringify({ id: 'ot' }))
    await writeFile(join(root, 'Other', 'Daily', '_pageset.json'), JSON.stringify({ id: 'od' }))
    await exclude(['Other/Daily'])
    const deleted = await confirmedMutate(
      root,
      { op: 'delete', path: 'Other', kind: 'collection' },
      nexusDeps,
    )
    const bundlePath = deleted.ok ? deleted.value.trashed?.bundlePath : undefined
    expect(bundlePath).toBeDefined()
    expect(await excludedOnDisk()).toBeUndefined()
    await confirmedMutate(
      root,
      { op: 'createContainer', parentPath: '', kind: 'collection', name: 'Other' },
      nexusDeps,
    )
    await writeFile(
      join(root, '.nexus', 'settings.json'),
      JSON.stringify({ excluded_folders: ['Other/Drafts'] }),
    )
    await refreshTree(root)
    const r = await confirmedMutate(
      root,
      { op: 'restore', bundlePath: bundlePath ?? '' },
      nexusDeps,
    )
    expect(r).toEqual({ ok: true, value: { rescope: true, landed: 'Other (2)' } })
    expect(await excludedOnDisk()).toEqual(['Other/Drafts', 'Other (2)/Daily'])
  })

  it('reports a Collection delete and its restore to Sync as one rename each, the restore after its entries hold again', async () => {
    await mkdir(join(root, 'Other', 'Daily'), { recursive: true })
    await writeFile(join(root, 'Other', '_pagecollection.json'), JSON.stringify({ id: 'ot' }))
    await writeFile(join(root, 'Other', 'Daily', '_pageset.json'), JSON.stringify({ id: 'od' }))
    await writeFile(
      join(root, 'Other', 'Page.md'),
      '---\nID: 01KVGMT8BFP350FZZXAMG1QDRC\n---\n# Page\n',
    )
    await exclude(['Other/Daily'])
    const folder = join(root, 'Other')
    const renames: { from: string; to: string; excluded: unknown }[] = []
    const wrote: string[] = []
    setWriteTap({
      wrote: (path) => wrote.push(path),
      renamed: (from, to) =>
        renames.push({
          from,
          to,
          excluded: JSON.parse(readFileSync(join(root, '.nexus', 'settings.json'), 'utf8'))
            .excluded_folders,
        }),
    })
    try {
      const deleted = await confirmedMutate(
        root,
        { op: 'delete', path: 'Other', kind: 'collection' },
        nexusDeps,
      )
      expect(deleted.ok).toBe(true)
      expect(renames).toHaveLength(1)
      const bundled = renames[0].to
      expect(renames[0].from).toBe(folder)
      expect(bundled.endsWith('.deleted/Other')).toBe(true)
      await refreshTree(root)
      const bundlePath = deleted.ok ? (deleted.value.trashed?.bundlePath ?? '') : ''
      const restored = await confirmedMutate(root, { op: 'restore', bundlePath }, nexusDeps)
      expect(restored.ok).toBe(true)
      expect(renames.map(({ from, to }) => [from, to])).toEqual([
        [folder, bundled],
        [bundled, folder],
      ])
      expect(renames[1].excluded).toEqual(['Other/Daily'])
      const inside = (path: string): boolean =>
        path.startsWith(`${folder}/`) || path.startsWith(`${bundled}/`)
      expect(wrote.filter(inside)).toEqual([])
    } finally {
      setWriteTap(null)
    }
  })

  it('carries an entry with a moved Set', async () => {
    await mkdir(join(root, 'Other'), { recursive: true })
    await writeFile(join(root, 'Other', '_pagecollection.json'), JSON.stringify({ id: 'ot' }))
    await exclude(['Notes/Daily/Old'])
    const r = await confirmedMutate(
      root,
      { op: 'moveSet', path: 'Notes/Daily', newParentPath: 'Other', order: [] },
      nexusDeps,
    )
    expect(r).toEqual({ ok: true, value: { rescope: true, cascade: { pages: [], hosts: [] } } })
    expect(await excludedOnDisk()).toEqual(['Other/Daily/Old'])
  })

  it('writes nothing for a rename no entry sits under', async () => {
    await exclude(['Archive'])
    const before = await read('.nexus/settings.json')
    const r = await confirmedMutate(
      root,
      { op: 'rename', path: 'Notes', kind: 'collection', newName: 'Journal' },
      nexusDeps,
    )
    expect(r).toEqual({ ok: true, value: { rescope: false } })
    expect(await read('.nexus/settings.json')).toBe(before)
  })

  it('rescopes a landing beneath an entry that already names the new path', async () => {
    await exclude(['Job/Daily'])
    const before = await read('.nexus/settings.json')
    const r = await confirmedMutate(
      root,
      { op: 'rename', path: 'Notes', kind: 'collection', newName: 'Job' },
      nexusDeps,
    )
    expect(r).toEqual({ ok: true, value: { rescope: true } })
    expect(await read('.nexus/settings.json')).toBe(before)
  })
})

describe('each routine operation lands from its own events, with no walk', () => {
  beforeEach(async () => {
    await seedTwoContexts()
    await createProperty(root, { id: 'prop_s', name: 'Stage', type: 'select' })
    await mkdir(join(root, 'Other'))
    await writeFile(join(root, 'Other', '_pagecollection.json'), JSON.stringify({ id: 'ot' }))
    await refreshTree(root)
  })

  const routine: [string, MutateRequest][] = [
    ['a page create', { op: 'createPage', parentPath: 'Notes/Daily', name: 'Gamma' }],
    ['a Set create', { op: 'createContainer', parentPath: 'Notes', kind: 'set', name: 'Weekly' }],
    [
      'a Collection create',
      { op: 'createContainer', parentPath: '', kind: 'collection', name: 'Journal' },
    ],
    ['a Space create', { op: 'createSpace', contextId: 'ctxP', name: 'Atlas' }],
    ['a Context group create', { op: 'createContextGroup', name: 'Topics' }],
    ['a rename', { op: 'rename', path: 'Notes/Daily/Beta.md', kind: 'page', newName: 'Gamma' }],
    ['a page move', { op: 'movePage', path: 'Notes/Daily/Beta.md', newParentPath: 'Other' }],
    ['a Set move', { op: 'moveSet', path: 'Notes/Daily', newParentPath: 'Other', order: [] }],
    [
      'a child reorder',
      { op: 'reorderChildren', parentPath: 'Notes', key: 'set_order', order: ['col'] },
    ],
    ['a top-level reorder', { op: 'reorderTop', order: ['ot', 'pt'] }],
    ['a Context reorder', { op: 'reorderContexts', ids: ['ctxA', 'ctxP'] }],
    ['a panel Context reorder', { op: 'reorderPanelContexts', ids: ['ctxA', 'ctxP'] }],
    ['a Space reorder', { op: 'reorderSpaces', contextId: 'ctxP', ids: ['sp-pom'] }],
    [
      'a Context tag',
      { op: 'setContext', path: 'Notes/Daily/Alpha.md', contextId: 'ctxP', spaceIds: ['sp-pom'] },
    ],
    [
      'a page meta write',
      { op: 'setPageMeta', path: 'Notes/Daily/Alpha.md', patch: { aliases: ['a'] } },
    ],
    ['a Set icon', { op: 'setIcon', path: 'Notes/Daily', kind: 'set', icon: 'star' }],
    ['a page icon', { op: 'setIcon', path: 'Notes/Daily/Alpha.md', kind: 'page', icon: 'star' }],
    ['a Space color', { op: 'setSpaceColor', spaceId: 'sp-pom', color: 'blue' }],
    [
      'a cell edit',
      {
        op: 'setProperty',
        path: 'Notes/Daily/Beta.md',
        propertyId: 'prop_s',
        value: { kind: 'select', value: 'done' },
      },
    ],
  ]

  it.each(routine)('%s', async (_, req) => {
    const walk = vi.spyOn(liveTree, 'refreshAfterWrite')
    const r = await confirmedMutate(root, req, nexusDeps)
    expect(r.ok).toBe(true)
    expect(walk).not.toHaveBeenCalled()
  })
})
