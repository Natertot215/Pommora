import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdir, readFile, rename, rm, unlink, writeFile } from 'node:fs/promises'
import { join, relative } from '../Paths/posix'
import { tempRoot } from '../Testing/hostFs'
import { stabilize } from './treeStabilize'
import * as liveTree from './liveTree'
import { dropLiveTree, heldTreeOf, refreshTree } from './liveTree'
import { ASSETS_DIR_REL } from '../Paths/nexusPaths'
import { contentIdAt } from './ids'
import * as readNexusModule from './readNexus'
import { readNexus } from './readNexus'
import { getHeldAssetMap, liveAssetMap } from '../Assets/assetMap'
import { applyEvents, classifyEvent, owedFor } from './fileEvents'
import { settleBatch, settleNow } from './settle'
import { handleMutate } from './mutate'
import type { TrashDeps } from '../Trash/bundle'
import type { Changed, FileEvent } from '../Files/writeEcho'
import type { CollectionNode, NexusTree, SetNode } from './tree'
import { findContainerWhere } from './treePatch'
import { noteExternalEdit } from '../Pages/fileHistory'
import { closeSession, openSession } from './session'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import * as indexSeed from '../Index/indexSeed'
import { seedContentIndex } from '../Index/indexSeed'
import { createMarkdownTile, writeMarkdownTile } from '../Tiles/tilesFile'
import { landedId } from '../Testing/tileLayouts'
import { contextsDir, contextsRegistryFile, tileFilePath } from '../Paths/paths'
import { machine } from '../Platform/machine'
import { splitFrontmatter } from '../Files/pageFile'
import { ID_KEY } from './identityMark'

vi.mock('../Pages/fileHistory', () => ({ noteExternalEdit: vi.fn() }))

const ULID_A = '01ARZ3NDEKPSV4RRFFQ69G5FAV'
const ULID_B = '01BX5ZZKBKPCTAV9WEVGEMMVRZ'
const ULID_C = '01CX5ZZKBKPCTAV9WEVGEMMVRC'
const QUIET = { push: () => {}, watch: async () => {} }

let root: string

const abs = (...segs: string[]): string => join(root, ...segs)
const ev = (event: Changed['event'], ...segs: string[]): Changed => ({
  event,
  absPath: abs(...segs),
  origin: 'watched',
})
const held = (): NexusTree => {
  const tree = heldTreeOf(root)
  if (tree === null) throw new Error('no tree')
  return tree
}
const scoped = (
  tree: NexusTree,
  excluded: string[] = [],
  assetDir = ASSETS_DIR_REL,
): NexusTree => ({
  ...tree,
  config: { ...tree.config, excluded, assetDirectory: assetDir },
})
const walked = (): boolean => owedFor(root).walk
const agrees = async (): Promise<void> => {
  const live = held()
  expect(stabilize(await readNexus(root), live)).toBe(live)
}
// Every file below `dir`, deepest first, as chokidar names what left or arrived.
const filesUnder = async (dir: string): Promise<string[]> => {
  const out: string[] = []
  for (const e of await machine().readDir(dir)) {
    const p = join(dir, e.name)
    if (e.kind === 'dir') out.push(...(await filesUnder(p)))
    else out.push(p)
  }
  return out
}
const dirsUnder = async (dir: string): Promise<string[]> => {
  const out: string[] = []
  for (const e of await machine().readDir(dir))
    if (e.kind === 'dir') out.push(...(await dirsUnder(join(dir, e.name))), join(dir, e.name))
  return out
}

// A sidecar-mode nexus with one Collection (one page), one Context group with one Space, an empty folder, and a loose note at the Nexus root — the live tree's whole vocabulary in miniature.
beforeEach(async () => {
  root = tempRoot('pom-events-')
  await openSession(root)
  await mkdir(abs('.nexus', 'contexts', 'Areas', 'Home'), { recursive: true })
  await mkdir(abs('.nexus', 'assets'), { recursive: true })
  await mkdir(abs('.nexus', 'homepage'), { recursive: true })
  await writeFile(abs('.nexus', 'nexus.json'), JSON.stringify({ id: 'nx1' }))
  await writeFile(
    abs('.nexus', 'contexts', 'contexts.json'),
    JSON.stringify({ contexts: [{ id: 'ctx1', title: 'Areas' }] }),
  )
  await writeFile(
    abs('.nexus', 'contexts', 'Areas', 'Home', '_space.json'),
    JSON.stringify({ id: 'sp1' }),
  )
  await mkdir(abs('Notes'), { recursive: true })
  await writeFile(abs('Notes', '_pagecollection.json'), JSON.stringify({ id: 'c1' }))
  await writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_A}\n---\n\nalpha\n`)
  await mkdir(abs('Loose'), { recursive: true })
  await writeFile(abs('note.md'), 'links [[A]]\n')
})
afterEach(async () => {
  dropLiveTree()
  closeSession()
  vi.restoreAllMocks()
  await rm(root, { recursive: true, force: true })
})

describe('applyEvents — must agree with the walk', () => {
  it('a batch of external edits patches to exactly the tree a fresh walk produces', async () => {
    await refreshTree(root)
    await writeFile(
      abs('Notes', 'B.md'),
      `---\nID: ${ULID_B}\nicon: book\n<Areas>:\n  - Home\n---\n\nbeta\n`,
    )
    await writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_A}\nicon: star\n---\n\nalpha\n`)
    await writeFile(abs('second.md'), 'more\n')
    await writeFile(
      abs('Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'c1', icon: 'folder', page_order: [ULID_B, ULID_A] }),
    )
    await writeFile(
      abs('.nexus', 'contexts', 'Areas', 'Home', '_space.json'),
      JSON.stringify({ id: 'sp1', $color: 'mint', Status: ['Active'] }),
    )
    await writeFile(abs('.nexus', 'settings.json'), JSON.stringify({ profile_icon: 'star' }))
    await writeFile(
      abs('.nexus', 'homepage', 'homepage.json'),
      JSON.stringify({ banner: 'Loose/b.png' }),
    )

    await applyEvents(root, [
      ev('add', 'Notes', 'B.md'),
      ev('change', 'Notes', 'A.md'),
      ev('add', 'second.md'),
      ev('change', 'Notes', '_pagecollection.json'),
      ev('change', '.nexus', 'contexts', 'Areas', 'Home', '_space.json'),
      ev('change', '.nexus', 'settings.json'),
      ev('change', '.nexus', 'homepage', 'homepage.json'),
    ])
    expect(walked()).toBe(false)

    const live = held()
    const notes = live.collections[0]
    expect(notes?.icon).toBe('folder')
    expect(notes?.pages.map((p) => p.id)).toEqual([ULID_B, ULID_A])
    expect(notes?.pages[0]?.contextValues).toEqual({ ctx1: ['sp1'] })
    expect(live.contexts[0]?.spaces[0]?.color).toBe('mint')
    expect(live.contexts[0]?.spaces[0]?.values).toEqual({ Status: ['Active'] })
    expect(live.config.profileIcon).toBe('star')
    expect(live.config.homepage.banner).toBe('Loose/b.png')
    await agrees()
  })

  it('a Set whose sidecar broke mid-session is listed unparsed, then held again by its own event once the file is fixed, with no walk either time', async () => {
    const sidecar = abs('Notes', 'Daily', '_pageset.json')
    await mkdir(abs('Notes', 'Daily'))
    await writeFile(sidecar, JSON.stringify({ id: 's1' }))
    await writeFile(abs('Notes', 'Daily', 'D.md'), `---\nID: ${ULID_B}\n---\n\ndaily\n`)
    await refreshTree(root)
    const walk = vi.spyOn(liveTree, 'refreshAfterWrite')

    await writeFile(sidecar, '{corrupt')
    await applyEvents(root, [ev('change', 'Notes', 'Daily', '_pageset.json')])
    await settleNow(QUIET, root)
    expect(held().collections[0]?.sets).toEqual([])
    expect(held().unreadable).toEqual([{ path: 'Notes/Daily', kind: 'set', reason: 'unparsed' }])
    await agrees()

    await writeFile(sidecar, JSON.stringify({ id: 's1' }))
    await applyEvents(root, [ev('change', 'Notes', 'Daily', '_pageset.json')])
    await settleNow(QUIET, root)
    const daily = held().collections[0]?.sets[0]
    expect(daily?.id).toBe('s1')
    expect(daily?.pages.map((p) => p.id)).toEqual([ULID_B])
    expect(held().unreadable).toBeUndefined()
    await agrees()
    expect(walk).not.toHaveBeenCalled()
  })

  it('patches the panel Context order off state.json, and holds the tree when it did not move', async () => {
    await refreshTree(root)
    await writeFile(abs('.nexus', 'state.json'), JSON.stringify({ order: { contexts: ['ctx1'] } }))
    await applyEvents(root, [ev('change', '.nexus', 'state.json')])
    expect(walked()).toBe(false)
    const live = held()
    expect(live.config.order.contexts).toEqual(['ctx1'])
    await agrees()
    await applyEvents(root, [ev('change', '.nexus', 'state.json')])
    expect(heldTreeOf(root)).toBe(live)
  })

  it('holds the order and the homepage through a damaged state.json and homepage.json, and the walk agrees', async () => {
    await writeFile(abs('.nexus', 'state.json'), JSON.stringify({ order: { contexts: ['ctx1'] } }))
    await writeFile(
      abs('.nexus', 'homepage', 'homepage.json'),
      JSON.stringify({ banner: 'Loose/b.png' }),
    )
    const before = await refreshTree(root)
    await writeFile(abs('.nexus', 'state.json'), '{ corrupt')
    await writeFile(abs('.nexus', 'homepage', 'homepage.json'), '[1, 2]')
    await applyEvents(root, [
      ev('change', '.nexus', 'state.json'),
      ev('change', '.nexus', 'homepage', 'homepage.json'),
    ])
    expect(walked()).toBe(false)
    const live = held()
    expect(live.config.order.contexts).toEqual(['ctx1'])
    expect(live.config.homepage.banner).toBe('Loose/b.png')
    expect(stabilize(await readNexus(root), before)).toBe(before)
  })

  it('patches crops.json as a leaf, dropping a malformed entry, walk-identically', async () => {
    await refreshTree(root)
    await writeFile(
      abs('.nexus', 'assets', 'crops.json'),
      JSON.stringify({
        byImage: {
          'Loose/b.png': { x: 0.3, y: 0.4, zoom: 2 },
          'Loose/bad.png': { x: 'nope', y: 0.5, zoom: 1 },
        },
      }),
    )
    await applyEvents(root, [ev('change', '.nexus', 'assets', 'crops.json')])
    expect(walked()).toBe(false)
    expect(held().config.crops).toEqual({ 'Loose/b.png': { x: 0.3, y: 0.4, zoom: 2 } })
    await agrees()
  })

  it('a page deleted between event and read applies as a remove, walk-identically', async () => {
    await refreshTree(root)
    await unlink(abs('Notes', 'A.md'))
    await applyEvents(root, [ev('change', 'Notes', 'A.md')])
    expect(walked()).toBe(false)
    expect(held().collections[0]?.pages).toHaveLength(0)
    await agrees()
  })

  it('a file with Unknown admission is listed with its reason and held nowhere, with no walk', async () => {
    await refreshTree(root)
    await writeFile(abs('Notes', 'bad.md'), `---\nID: 01BX5ZZKBKTCTAV9WEVGEMMVRZ\n---\n\nnope\n`)
    await applyEvents(root, [ev('add', 'Notes', 'bad.md')])
    expect(walked()).toBe(false)
    expect(held().collections[0]?.pages.map((p) => p.title)).toEqual(['A'])
    expect(held().unreadable?.map((u) => u.path)).toEqual(['Notes/bad.md'])
    await agrees()
  })

  it('a page whose id moved re-derives its position instead of swapping in place', async () => {
    await writeFile(abs('Notes', 'B.md'), `---\nID: ${ULID_B}\n---\n\nbeta\n`)
    await refreshTree(root)
    expect(held().collections[0]?.pages.map((p) => p.id)).toEqual([ULID_A, ULID_B])
    await writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_C}\n---\n\nalpha\n`)
    await applyEvents(root, [ev('change', 'Notes', 'A.md')])
    expect(walked()).toBe(false)
    expect(held().collections[0]?.pages.map((p) => p.id)).toEqual([ULID_B, ULID_C])
    await agrees()
  })

  it('an empty batch is a no-op that preserves tree identity', async () => {
    await refreshTree(root)
    const before = heldTreeOf(root)
    await applyEvents(root, [])
    expect(walked()).toBe(false)
    expect(heldTreeOf(root)).toBe(before)
  })

  it('an exclusion change in settings lands the scope at once and owes the walk and the rescope', async () => {
    await refreshTree(root)
    await writeFile(abs('.nexus', 'settings.json'), JSON.stringify({ excluded_folders: ['Loose'] }))
    await applyEvents(root, [ev('change', '.nexus', 'settings.json')])
    expect(walked()).toBe(true)
    expect(owedFor(root).rescope).toBe(true)
    expect(held().config.excluded).toEqual(['Loose'])
  })

  it('a folder landing over an excluded entry beneath it owes the walk and the reseed, and no new watch', async () => {
    await writeFile(
      abs('.nexus', 'settings.json'),
      JSON.stringify({ excluded_folders: ['Moved/Private'] }),
    )
    await refreshTree(root)
    await rename(abs('Loose'), abs('Moved'))
    await applyEvents(root, [{ event: 'move', from: abs('Loose'), absPath: abs('Moved') }])
    expect(walked()).toBe(true)
    expect(owedFor(root).corpus).toBe(true)
    expect(owedFor(root).rescope).toBe(false)
    const seed = vi.spyOn(indexSeed, 'seedContentIndex')
    const watch = vi.fn(async () => {})
    await settleNow({ push: () => {}, watch }, root)
    expect(seed).toHaveBeenCalledTimes(1)
    expect(watch).not.toHaveBeenCalled()
  })

  it('a folder of several hundred notes with no sidecar is read by its batch and by its stamp alone, and every note is held and stamped', async () => {
    await refreshTree(root)
    await mkdir(abs('Notes', 'Import'))
    const names = Array.from({ length: 400 }, (_, i) => `n${i}.md`)
    for (const name of names) await writeFile(abs('Notes', 'Import', name), `${name}\n`)
    const readFolder = vi.spyOn(readNexusModule, 'readFolder')
    await settleBatch(QUIET, root, [
      ev('addDir', 'Notes', 'Import'),
      ...names.map((name) => ev('add', 'Notes', 'Import', name)),
    ])
    expect(readFolder).toHaveBeenCalledTimes(2)
    const pages = held().collections[0]?.sets[0]?.pages
    expect(pages).toHaveLength(400)
    for (const p of pages ?? [])
      expect(p.id).toBe(splitFrontmatter(await readFile(abs(...p.path.split('/')), 'utf8'))[ID_KEY])
    expect(held().unreadable).toBeUndefined()
    await agrees()
  })
})

describe('the parity cases', () => {
  let walk: ReturnType<typeof vi.spyOn>
  beforeEach(async () => {
    await refreshTree(root)
    walk = vi.spyOn(liveTree, 'refreshAfterWrite')
  })
  const settled = (events: FileEvent[]): Promise<void> => settleBatch(QUIET, root, events)

  it('a folder of notes added outside the app lands without a walk', async () => {
    await mkdir(abs('Notes', 'Batch'))
    await writeFile(abs('Notes', 'Batch', '_pageset.json'), JSON.stringify({ id: 's-batch' }))
    await writeFile(abs('Notes', 'Batch', 'B.md'), `---\nID: ${ULID_B}\n---\n\nbeta\n`)
    await writeFile(abs('Notes', 'Batch', 'C.md'), `---\nID: ${ULID_C}\n---\n\ngamma\n`)
    await settled([
      ev('addDir', 'Notes', 'Batch'),
      ev('add', 'Notes', 'Batch', '_pageset.json'),
      ev('add', 'Notes', 'Batch', 'B.md'),
      ev('add', 'Notes', 'Batch', 'C.md'),
    ])
    expect(held().collections[0]?.sets[0]?.pages.map((p) => p.id)).toEqual([ULID_B, ULID_C])
    await agrees()
    expect(walk).not.toHaveBeenCalled()
  })

  const withDaily = async (): Promise<void> => {
    await mkdir(abs('Notes', 'Daily'))
    await writeFile(abs('Notes', 'Daily', '_pageset.json'), JSON.stringify({ id: 's1' }))
    await writeFile(abs('Notes', 'Daily', 'D.md'), `---\nID: ${ULID_B}\n---\n\ndaily\n`)
    await refreshTree(root)
  }
  const removed = async (dir: string): Promise<FileEvent[]> => {
    const files = await filesUnder(dir)
    const dirs = await dirsUnder(dir)
    await rm(dir, { recursive: true })
    return [
      ...files.map((absPath): FileEvent => ({ event: 'unlink', absPath, origin: 'watched' })),
      ...[...dirs, dir].map(
        (absPath): FileEvent => ({ event: 'unlinkDir', absPath, origin: 'watched' }),
      ),
    ]
  }
  const renamed = async (from: string, to: string): Promise<FileEvent[]> => {
    const files = await filesUnder(from)
    const dirs = await dirsUnder(from)
    await rename(from, to)
    const moved = (p: string): string => join(to, relative(from, p))
    return [
      ...files.map((absPath): FileEvent => ({ event: 'unlink', absPath, origin: 'watched' })),
      ...files.map((p): FileEvent => ({ event: 'add', absPath: moved(p), origin: 'watched' })),
      ...[...dirs, from].map(
        (absPath): FileEvent => ({ event: 'unlinkDir', absPath, origin: 'watched' }),
      ),
      ...[to, ...dirs.map(moved)].map(
        (absPath): FileEvent => ({ event: 'addDir', absPath, origin: 'watched' }),
      ),
    ]
  }

  it('a Collection removed outside the app leaves with no walk', async () => {
    await withDaily()
    await settled(await removed(abs('Notes')))
    expect(held().collections).toEqual([])
    await agrees()
    expect(walk).not.toHaveBeenCalled()
  })

  it('a Set removed outside the app leaves with no walk', async () => {
    await withDaily()
    await settled(await removed(abs('Notes', 'Daily')))
    expect(held().collections[0]?.sets).toEqual([])
    await agrees()
    expect(walk).not.toHaveBeenCalled()
  })

  it('a Collection renamed outside the app lands under its new name with no walk', async () => {
    await withDaily()
    await settled(await renamed(abs('Notes'), abs('Journal')))
    expect(held().collections.map((c) => c.path)).toEqual(['Journal'])
    expect(held().collections[0]?.sets[0]?.pages.map((p) => p.path)).toEqual(['Journal/Daily/D.md'])
    await agrees()
    expect(walk).not.toHaveBeenCalled()
  })

  it('a Set renamed outside the app lands under its new name with no walk', async () => {
    await withDaily()
    await settled(await renamed(abs('Notes', 'Daily'), abs('Notes', 'Weekly')))
    expect(held().collections[0]?.sets.map((s) => s.title)).toEqual(['Weekly'])
    await agrees()
    expect(walk).not.toHaveBeenCalled()
  })

  const DEPS: TrashDeps = { trashMode: 'nexus', trashToSystem: async () => {} }
  for (const [label, req] of [
    ['renames', { op: 'rename', path: 'Notes/Daily', kind: 'set', newName: 'Weekly' }],
    ['deletes', { op: 'delete', path: 'Notes/Daily', kind: 'set' }],
  ] as const) {
    it(`a page event that settles after the app ${label} its Set lists nothing unreadable`, async () => {
      await withDaily()
      expect((await handleMutate(root, req, DEPS)).ok).toBe(true)
      await settleNow(QUIET, root)
      await settled([ev('change', 'Notes', 'Daily', 'D.md')])
      expect(held().unreadable).toBeUndefined()
      await agrees()
    })
  }

  it('a root folder gaining its first note becomes a Collection, stamped by the settle', async () => {
    await mkdir(abs('Ideas'))
    await writeFile(abs('Ideas', 'First.md'), 'first\n')
    await settled([ev('addDir', 'Ideas'), ev('add', 'Ideas', 'First.md')])
    const ideas = held().collections.find((c) => c.path === 'Ideas')
    expect(ideas?.pages.map((p) => p.title)).toEqual(['First'])
    expect(held().unreadable).toBeUndefined()
    expect(splitFrontmatter(await readFile(abs('Ideas', 'First.md'), 'utf8'))[ID_KEY]).toBe(
      ideas?.pages[0]?.id,
    )
    await agrees()
    expect(walk).not.toHaveBeenCalled()
  })

  it('a root folder whose first note lands in a subfolder becomes a Collection', async () => {
    await mkdir(abs('Ideas'))
    await settled([ev('addDir', 'Ideas')])
    await mkdir(abs('Ideas', 'Sub'))
    await settled([ev('addDir', 'Ideas', 'Sub')])
    await writeFile(abs('Ideas', 'Sub', 'First.md'), 'first\n')
    await settled([ev('add', 'Ideas', 'Sub', 'First.md')])
    const ideas = held().collections.find((c) => c.path === 'Ideas')
    expect(ideas?.sets[0]?.pages.map((p) => p.title)).toEqual(['First'])
    expect(held().unreadable).toBeUndefined()
    await agrees()
    expect(walk).not.toHaveBeenCalled()
  })

  const registry = (defs: Record<string, object>): Promise<void> =>
    writeFile(abs('.nexus', 'properties.json'), JSON.stringify({ order: Object.keys(defs), defs }))

  it('a properties.json edit that changes a definition re-points it with no walk', async () => {
    await registry({ prop_status: { id: 'prop_status', name: 'Status', type: 'number' } })
    await writeFile(
      abs('Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'c1', properties: ['prop_status'] }),
    )
    await refreshTree(root)
    await registry({ prop_status: { id: 'prop_status', name: 'State', type: 'number' } })
    await settled([ev('change', '.nexus', 'properties.json')])
    expect(held().collections[0]?.properties?.map((d) => d.name)).toEqual(['State'])
    await agrees()
    expect(walk).not.toHaveBeenCalled()
  })

  it('a properties.json edit that adds a definition walks', async () => {
    await registry({ prop_status: { id: 'prop_status', name: 'Status', type: 'number' } })
    await refreshTree(root)
    await registry({
      prop_status: { id: 'prop_status', name: 'Status', type: 'number' },
      prop_due: { id: 'prop_due', name: 'Due', type: 'dateTime' },
    })
    await settled([ev('change', '.nexus', 'properties.json')])
    expect(walk).toHaveBeenCalledTimes(1)
    expect(held().config.registry.map((d) => d.id)).toEqual(['prop_status', 'prop_due'])
    await agrees()
  })

  it('a registry reorder regroups the held Contexts with no walk', async () => {
    await writeFile(
      contextsRegistryFile(root),
      JSON.stringify({
        contexts: [
          { id: 'ctx1', title: 'Areas' },
          { id: 'ctx2', title: 'Topics' },
        ],
      }),
    )
    await mkdir(join(contextsDir(root), 'Topics'))
    await refreshTree(root)
    await writeFile(
      contextsRegistryFile(root),
      JSON.stringify({
        contexts: [
          { id: 'ctx2', title: 'Topics' },
          { id: 'ctx1', title: 'Areas' },
        ],
      }),
    )
    await settled([ev('change', '.nexus', 'contexts', 'contexts.json')])
    expect(held().contexts.map((g) => g.def.id)).toEqual(['ctx2', 'ctx1'])
    await agrees()
    expect(walk).not.toHaveBeenCalled()
  })

  it('a stray file beside pages changes nothing and walks nothing', async () => {
    const before = held()
    await writeFile(abs('Notes', 'photo.png'), 'bytes')
    await settled([ev('add', 'Notes', 'photo.png')])
    expect(heldTreeOf(root)).toBe(before)
    await agrees()
    expect(walk).not.toHaveBeenCalled()
  })

  it('a batch of three whose middle event can’t be placed applies the other two and owes the walk', async () => {
    await writeFile(abs('Notes', 'B.md'), `---\nID: ${ULID_B}\n---\n\nbeta\n`)
    await writeFile(abs('Notes', 'C.md'), `---\nID: ${ULID_C}\n---\n\ngamma\n`)
    await applyEvents(root, [
      ev('add', 'Notes', 'B.md'),
      ev('change', '.nexus', 'nexus.json'),
      ev('add', 'Notes', 'C.md'),
    ])
    expect(held().collections[0]?.pages.map((p) => p.id)).toEqual([ULID_A, ULID_B, ULID_C])
    expect(walked()).toBe(true)
    await settleNow(QUIET, root)
    expect(walk).toHaveBeenCalledTimes(1)
    await agrees()
  })

  it('an ID: 42 page saved twice is read once per save and costs no walk', async () => {
    const reads = vi.spyOn(readNexusModule, 'readPageRecord')
    for (const body of ['one', 'two']) {
      await writeFile(abs('Notes', 'Foreign.md'), `---\nID: 42\n---\n\n${body}\n`)
      await settled([ev('change', 'Notes', 'Foreign.md')])
    }
    expect(reads.mock.calls.filter(([p]) => p === abs('Notes', 'Foreign.md'))).toHaveLength(2)
    expect(held().unreadable).toEqual([
      { path: 'Notes/Foreign.md', kind: 'page', reason: 'malformed' },
    ])
    await agrees()
    expect(walk).not.toHaveBeenCalled()
  })
})

describe('classifyEvent', () => {
  it('routes each path to its arm, with walk as the fallback', async () => {
    const tree = await refreshTree(root)
    const kind = (e: Changed, excluded: string[] = []): string =>
      classifyEvent(scoped(tree, excluded), root, e).kind

    expect(kind(ev('add', 'Notes', 'B.md'))).toBe('page')
    expect(classifyEvent(tree, root, ev('unlink', 'Notes', 'A.md'))).toEqual({
      kind: 'gone',
      rel: 'Notes/A.md',
    })
    expect(kind(ev('change', 'Notes', '_pagecollection.json'))).toBe('container-meta')
    expect(kind(ev('change', '.nexus', 'contexts', 'Areas', 'Home', '_space.json'))).toBe('space')
    expect(kind(ev('change', '.nexus', 'settings.json'))).toBe('settings-leaf')
    expect(kind(ev('change', '.nexus', 'homepage', 'homepage.json'))).toBe('homepage-leaf')
    expect(classifyEvent(tree, root, ev('change', '.nexus', 'homepage', '_tiles.json'))).toEqual({
      kind: 'tiles-leaf',
      host: { kind: 'homepage' },
      rel: '.nexus/homepage/_tiles.json',
    })
    expect(
      classifyEvent(tree, root, ev('change', '.nexus', 'contexts', 'Areas', 'Home', '_tiles.json')),
    ).toEqual({
      kind: 'tiles-leaf',
      host: { kind: 'space', id: tree.contexts[0].spaces[0].id },
      rel: '.nexus/contexts/Areas/Home/_tiles.json',
    })
    expect(kind(ev('change', '.nexus', 'contexts', 'Areas', 'Nowhere', '_tiles.json'))).toBe(
      'ignored',
    )
    expect(
      kind(
        ev(
          'add',
          '.nexus',
          'contexts',
          'Areas',
          'Home',
          '_tiles.json.bad-01ARZ3NDEKPSV4RRFFQ69G5FAV',
        ),
      ),
    ).toBe('ignored')
    expect(kind(ev('addDir', '.nexus', 'homepage'))).toBe('ignored')
    expect(kind(ev('change', '.nexus', 'assets', 'crops.json'))).toBe('crops-leaf')
    expect(kind(ev('add', 'Loose', 'second.md'))).toBe('page')
    expect(kind(ev('add', 'root-note.md'))).toBe('ignored')
    expect(kind(ev('change', 'Hidden', 'x.md'), ['Hidden'])).toBe('ignored')

    expect(kind(ev('change', '.nexus', 'contexts', 'contexts.json'))).toBe('contexts-leaf')
    expect(kind(ev('change', '.nexus', 'properties.json'))).toBe('registry-leaf')
    expect(kind(ev('change', '.nexus', 'state.json'))).toBe('order-leaf')
    expect(classifyEvent(tree, root, ev('addDir', 'Notes', 'Sub'))).toEqual({
      kind: 'folder',
      rel: 'Notes/Sub',
    })
    expect(classifyEvent(tree, root, ev('unlinkDir', 'Notes'))).toEqual({
      kind: 'gone',
      rel: 'Notes',
    })
    expect(classifyEvent(tree, root, ev('unlink', 'Notes', '_pagecollection.json'))).toEqual({
      kind: 'gone',
      rel: 'Notes',
      sidecar: true,
    })
    expect(classifyEvent(tree, root, ev('add', 'Loose', '_pageset.json'))).toEqual({
      kind: 'folder',
      rel: 'Loose',
    })
    expect(kind(ev('change', 'Notes', 'photo.png'))).toBe('ignored')
    // A stray wrong-kind sidecar is not this container's meta — the walk ignores it.
    expect(kind(ev('change', 'Notes', '_pageset.json'))).toBe('walk')
  })

  it('under .nexus a Space or Context that left, and identity, walk — every other unnamed path is inert', async () => {
    const tree = await refreshTree(root)
    const kind = (e: Changed): string => classifyEvent(tree, root, e).kind

    for (const e of [
      ev('add', '.nexus', 'interface', 'sidepane.json'),
      ev('change', '.nexus', 'interface', 'sidepane.json'),
      ev('addDir', '.nexus', 'interface'),
      ev('unlinkDir', '.nexus', 'interface'),
      ev('change', '.nexus', 'property-cascade.json'),
      ev('change', '.nexus', 'context-rename.json'),
      ev('add', '.nexus', 'unknown.json'),
      ev('add', '.nexus', 'metadata', '09-2026.json.bad-x'),
      ev('add', '.nexus', 'metadata', '13-2026.json'),
      ev('addDir', '.nexus', 'contexts', 'Areas', 'Fresh'),
    ])
      expect(kind(e)).toBe('ignored')

    for (const e of [
      ev('change', '.nexus', 'nexus.json'),
      ev('unlinkDir', '.nexus', 'contexts', 'Areas', 'Home'),
      ev('unlink', '.nexus', 'contexts', 'Areas', 'Home', '_space.json'),
    ])
      expect(kind(e)).toBe('walk')
  })

  it('a raw nexus reads a sidecar landing in a folder it doesn’t hold as that folder', async () => {
    const raw = tempRoot('pom-raw-')
    try {
      await mkdir(join(raw, 'Things'), { recursive: true })
      await writeFile(join(raw, 'Things', 'note.md'), 'text\n')
      dropLiveTree()
      const tree = await refreshTree(raw)
      const cls = classifyEvent(tree, raw, {
        event: 'change',
        absPath: join(raw, 'Things', '_pagecollection.json'),
        origin: 'watched',
      })
      expect(cls).toEqual({ kind: 'folder', rel: 'Things' })
    } finally {
      dropLiveTree()
      await rm(raw, { recursive: true, force: true })
    }
  })

  it('an event under an unreadable-listed owner reads that folder', async () => {
    await writeFile(abs('Notes', '_pagecollection.json'), '{corrupt')
    const tree = await refreshTree(root)
    expect(tree.unreadable?.map((u) => u.path)).toContain('Notes')
    const cls = classifyEvent(tree, root, ev('change', 'Notes', '_pagecollection.json'))
    expect(cls).toEqual({ kind: 'folder', rel: 'Notes' })
  })
})

describe('the metadata leaf re-reads only its month', () => {
  const SEP = contentIdAt(Date.UTC(2026, 8, 5), 'page')
  const AUG = contentIdAt(Date.UTC(2026, 7, 10), 'page')
  const month = (shard: string): string => abs('.nexus', 'metadata', `${shard}.json`)
  const seed = (shard: string, pages: object): Promise<void> =>
    writeFile(month(shard), JSON.stringify({ pages }))
  const land = (event: Changed['event'], shard: string) =>
    applyEvents(root, [ev(event, '.nexus', 'metadata', `${shard}.json`)])

  beforeEach(async () => {
    await mkdir(abs('.nexus', 'metadata'), { recursive: true })
    await seed('09-2026', { [SEP]: { icon: 'star' } })
    await seed('08-2026', { [AUG]: { locked: true } })
    await refreshTree(root)
  })

  it('classifies a month file by its shard', () => {
    expect(classifyEvent(held(), root, ev('change', '.nexus', 'metadata', '09-2026.json'))).toEqual(
      { kind: 'metadata-leaf', shard: '09-2026' },
    )
  })

  it('a change replaces only its own month, walk-identically', async () => {
    const august = held().config.pageMetadata[AUG]
    await seed('09-2026', { [SEP]: { icon: 'moon', aliases: ['m'] } })
    await land('change', '09-2026')
    expect(walked()).toBe(false)
    const live = held()
    expect(live.config.pageMetadata).toEqual({
      [SEP]: { icon: 'moon', aliases: ['m'] },
      [AUG]: { locked: true },
    })
    expect(live.config.pageMetadata[AUG]).toBe(august)
    await agrees()
  })

  it('an unlink clears its month, walk-identically', async () => {
    await unlink(month('09-2026'))
    await land('unlink', '09-2026')
    expect(walked()).toBe(false)
    expect(held().config.pageMetadata).toEqual({ [AUG]: { locked: true } })
    await agrees()
  })

  it('a corrupt rewrite leaves its month as held', async () => {
    const before = held().config.pageMetadata
    await writeFile(month('09-2026'), '{ bad json')
    await land('change', '09-2026')
    expect(walked()).toBe(false)
    expect(held().config.pageMetadata).toBe(before)
  })

  it('an identical re-read leaves the live tree untouched', async () => {
    const live = held()
    await land('change', '09-2026')
    expect(walked()).toBe(false)
    expect(heldTreeOf(root)).toBe(live)
  })
})

describe('the asset root outranks every other skip', () => {
  const ASSET_ROOTS = [ASSETS_DIR_REL, 'file-assets', '.attachments']

  it('every path under the asset root classifies asset, whatever the root is named', async () => {
    const tree = await refreshTree(root)
    for (const dir of ASSET_ROOTS) {
      const t = scoped(tree, [], dir)
      const at = (...segs: string[]): string =>
        classifyEvent(t, root, ev('change', ...dir.split('/'), ...segs)).kind
      expect(at('x.png')).toBe('asset')
      expect(at('nested', 'deep', 'x.heic')).toBe('asset')
      // A dropped-in Markdown file is an asset too, or it rides into the mentions rows as a page.
      expect(at('notes.md')).toBe('asset')
      expect(classifyEvent(t, root, ev('addDir', ...dir.split('/'), 'sub')).kind).toBe('asset')
      expect(classifyEvent(t, root, ev('unlink', ...dir.split('/'), 'x.png')).kind).toBe('asset')
    }
  })

  it('outranks the exclusion match — an asset root named in excluded_folders still delivers', async () => {
    const tree = await refreshTree(root)
    expect(
      classifyEvent(
        scoped(tree, ['file-assets'], 'file-assets'),
        root,
        ev('change', 'file-assets', 'x.png'),
      ).kind,
    ).toBe('asset')
  })

  it('the negative control: the same event elsewhere is not an asset', async () => {
    const tree = await refreshTree(root)
    expect(
      classifyEvent(scoped(tree, [], 'Media'), root, ev('change', 'file-assets', 'x.png')).kind,
    ).toBe('ignored')
  })

  it('fifty files landing in the asset root patch the map once and never walk', async () => {
    await writeFile(
      abs('.nexus', 'settings.json'),
      JSON.stringify({ asset_directory: 'file-assets' }),
    )
    await refreshTree(root)
    await mkdir(abs('file-assets'), { recursive: true })
    const names = Array.from({ length: 50 }, (_, i) => `img-${i}.png`)
    for (const n of names) await writeFile(abs('file-assets', n), 'bytes')
    await liveAssetMap(root)
    const before = getHeldAssetMap(root)
    await applyEvents(
      root,
      names.map((n) => ev('add', 'file-assets', n)),
    )
    expect(walked()).toBe(false)
    expect(owedFor(root).assets).toBe(true)
    const after = getHeldAssetMap(root)
    expect(after).not.toBe(before)
    expect(Object.keys(after?.files ?? {})).toHaveLength(50)
  })

  it('the unreadable list cannot claim an asset path — the arm sits above every other', async () => {
    await writeFile(abs('Notes', '_pagecollection.json'), '{corrupt')
    const tree = await refreshTree(root)
    expect(tree.unreadable?.map((u) => u.path)).toContain('Notes')
    expect(
      classifyEvent(scoped(tree, [], 'Notes'), root, ev('change', 'Notes', 'x.png')).kind,
    ).toBe('asset')
  })
})

describe('directory events', () => {
  it('a folder named the way the walk hides one never costs a walk', async () => {
    const tree = await refreshTree(root)
    expect(classifyEvent(tree, root, ev('addDir', '_drafts')).kind).toBe('ignored')
    expect(classifyEvent(tree, root, ev('addDir', 'Notes', '_scratch')).kind).toBe('ignored')
    expect(classifyEvent(tree, root, ev('addDir', 'Ideas')).kind).toBe('folder')
    expect(classifyEvent(tree, root, ev('unlinkDir', '_drafts')).kind).toBe('ignored')
  })
})

describe('tile bodies', () => {
  it('names what the tree drops among the events the watcher reports', async () => {
    const tree = await refreshTree(root)
    const kind = (...segs: string[]): string =>
      classifyEvent(tree, root, ev('change', ...segs)).kind
    for (const name of ['_tiles.json', 't1.md']) {
      expect(kind('.nexus', 'homepage', name)).toBe('tiles-leaf')
      expect(kind('.nexus', 'contexts', 'Areas', 'Home', name)).toBe('tiles-leaf')
    }
    expect(kind('.nexus', 'homepage', 'homepage.json')).toBe('homepage-leaf')
    expect(kind('Notes', 'Page.md')).toBe('page')
    expect(kind()).toBe('walk')
  })
})

describe('an outside heading rename', () => {
  const page = (a: string, b: string): Promise<void> =>
    writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_A}\n---\n\n## ${a}\n\n## ${b}\n`)
  const hosts = () => [...owedFor(root).tiles.values()]
  const renamed = async (a: string, b: string, ...more: Changed[]) => {
    owedFor(root).tiles.clear()
    await page(a, b)
    await applyEvents(root, [...more, ev('change', 'Notes', 'A.md')])
  }

  it('cascades into a markdown tile that alone links the heading, reading tile links written in the app or outside it', async () => {
    installStores(memoryStores().stores)
    try {
      await page('Setup', 'Keep')
      await refreshTree(root)
      await seedContentIndex(root)
      const home = abs('.nexus', 'homepage')
      const tile = await landedId(createMarkdownTile(home))
      await renamed('Intro', 'Keep')
      expect(hosts()).toEqual([])
      await writeMarkdownTile(root, home, tile, 'see [[A#Keep]]', machine().sha256Hex(''))
      await renamed('Intro', 'Kept')
      expect(hosts()).toEqual([{ kind: 'homepage' }])
      expect(await readFile(tileFilePath(home, tile), 'utf8')).toBe('see [[A#Kept]]')
      await renamed('Intro', 'Held')
      expect(hosts()).toEqual([{ kind: 'homepage' }])
      await renamed('Other', 'Held')
      expect(hosts()).toEqual([])
      await writeFile(tileFilePath(home, tile), 'see [[A#Other]]')
      await renamed('Start', 'Held', ev('change', '.nexus', 'homepage', `${tile}.md`))
      expect(await readFile(tileFilePath(home, tile), 'utf8')).toBe('see [[A#Start]]')
    } finally {
      installStores(NO_STORES)
    }
  })
})

describe('an outside heading rename a Space alone links', () => {
  it('cascades into the Space', async () => {
    await writeFile(
      abs('.nexus', 'properties.json'),
      JSON.stringify({
        order: ['prop_related'],
        defs: { prop_related: { id: 'prop_related', name: 'Related', type: 'link' } },
      }),
    )
    await writeFile(
      contextsRegistryFile(root),
      JSON.stringify({ contexts: [{ id: 'ctx_projects', title: 'Projects' }] }),
    )
    const sidecar = join(contextsDir(root), 'Projects', 'Pommora', '_space.json')
    await mkdir(join(contextsDir(root), 'Projects', 'Pommora'), { recursive: true })
    await writeFile(sidecar, JSON.stringify({ id: 'sp-pom', Related: '[[A#Keep]]' }))
    await writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_A}\n---\n\n## Keep\n`)
    installStores(memoryStores().stores)
    try {
      await refreshTree(root)
      await seedContentIndex(root)
      await writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_A}\n---\n\n## Kept\n`)
      await applyEvents(root, [ev('change', 'Notes', 'A.md')])
      expect(JSON.parse(await readFile(sidecar, 'utf8')).Related).toBe('[[A#Kept]]')
    } finally {
      installStores(NO_STORES)
    }
  })
})

describe('the file-history timer', () => {
  beforeEach(async () => {
    await refreshTree(root)
    vi.mocked(noteExternalEdit).mockClear()
  })

  it('arms once on a change event for a page', async () => {
    await applyEvents(root, [ev('change', 'Notes', 'A.md')])
    expect(noteExternalEdit).toHaveBeenCalledTimes(1)
    expect(noteExternalEdit).toHaveBeenCalledWith(root, abs('Notes', 'A.md'))
  })

  it('does not arm on a page removed', async () => {
    await unlink(abs('Notes', 'A.md'))
    await applyEvents(root, [ev('unlink', 'Notes', 'A.md')])
    expect(noteExternalEdit).not.toHaveBeenCalled()
  })

  it('does not arm on the app’s own write', async () => {
    const text = `---\nID: ${ULID_A}\n---\n\nmine\n`
    await writeFile(abs('Notes', 'A.md'), text)
    await applyEvents(root, [
      { event: 'change', absPath: abs('Notes', 'A.md'), origin: 'own', text },
    ])
    expect(noteExternalEdit).not.toHaveBeenCalled()
  })
})

describe('the app’s own events', () => {
  // Disk holds what an arm would read if it read; the event carries what the write landed. The tree following the event's text, with the file's lock held around the apply, shows no arm read the file or took its lock.
  const ownUnderLock = async (rel: string, text: string): Promise<void> => {
    const absPath = abs(...rel.split('/'))
    await machine().lock(absPath, () =>
      applyEvents(root, [{ event: 'change', absPath, origin: 'own', text }]),
    )
    expect(walked()).toBe(false)
  }

  beforeEach(async () => {
    await refreshTree(root)
  })

  it('a page lands from its text', async () => {
    await ownUnderLock('Notes/A.md', `---\nID: ${ULID_A}\nicon: moon\n---\n\nmine\n`)
    expect(held().collections[0]?.pages[0]?.id).toBe(ULID_A)
  })

  it('a new page lands from its text', async () => {
    await writeFile(abs('Notes', 'B.md'), 'stale\n')
    await ownUnderLock('Notes/B.md', `---\nID: ${ULID_B}\n---\n\nbeta\n`)
    expect(held().collections[0]?.pages.map((p) => p.id)).toEqual([ULID_A, ULID_B])
  })

  it('a container sidecar lands from its text', async () => {
    await ownUnderLock('Notes/_pagecollection.json', JSON.stringify({ id: 'c1', icon: 'folder' }))
    expect(held().collections[0]?.icon).toBe('folder')
  })

  it('a Space sidecar lands from its text', async () => {
    await ownUnderLock(
      '.nexus/contexts/Areas/Home/_space.json',
      JSON.stringify({ id: 'sp1', $color: 'mint' }),
    )
    expect(held().contexts[0]?.spaces[0]?.color).toBe('mint')
  })

  it('a new Space lands from the app’s own write', async () => {
    await mkdir(abs('.nexus', 'contexts', 'Areas', 'Work'))
    await ownUnderLock('.nexus/contexts/Areas/Work/_space.json', JSON.stringify({ id: 'sp2' }))
    expect(held().contexts[0]?.spaces.map((s) => s.id)).toEqual(['sp1', 'sp2'])
  })

  it('the Context registry lands from its text', async () => {
    await ownUnderLock(
      '.nexus/contexts/contexts.json',
      JSON.stringify({ contexts: [{ id: 'ctx1', title: 'Areas', icon: 'star' }] }),
    )
    expect(held().contexts.map((g) => [g.def.id, g.def.icon])).toEqual([['ctx1', 'star']])
  })

  it('properties.json lands from its text, a new definition among it', async () => {
    await ownUnderLock(
      '.nexus/properties.json',
      JSON.stringify({
        order: ['prop_due'],
        defs: { prop_due: { id: 'prop_due', name: 'Due', type: 'dateTime' } },
      }),
    )
    expect(held().config.registry.map((d) => d.id)).toEqual(['prop_due'])
  })

  it('settings.json lands from its text', async () => {
    await ownUnderLock('.nexus/settings.json', JSON.stringify({ profile_icon: 'star' }))
    expect(held().config.profileIcon).toBe('star')
  })

  it('state.json, homepage.json, crops.json, and a metadata month land from their text', async () => {
    const SEP = contentIdAt(Date.UTC(2026, 8, 5), 'page')
    await mkdir(abs('.nexus', 'metadata'))
    await ownUnderLock('.nexus/state.json', JSON.stringify({ order: { contexts: ['ctx1'] } }))
    await ownUnderLock('.nexus/homepage/homepage.json', JSON.stringify({ banner: 'Loose/b.png' }))
    await ownUnderLock(
      '.nexus/assets/crops.json',
      JSON.stringify({ byImage: { 'Loose/b.png': { x: 0.3, y: 0.4, zoom: 2 } } }),
    )
    await ownUnderLock(
      '.nexus/metadata/09-2026.json',
      JSON.stringify({ pages: { [SEP]: { icon: 'star' } } }),
    )
    const { config } = held()
    expect(config.order.contexts).toEqual(['ctx1'])
    expect(config.homepage.banner).toBe('Loose/b.png')
    expect(config.crops).toEqual({ 'Loose/b.png': { x: 0.3, y: 0.4, zoom: 2 } })
    expect(config.pageMetadata).toEqual({ [SEP]: { icon: 'star' } })
  })

  it('a file listed missing is stamped by the next settle, never inside the event', async () => {
    await writeFile(abs('Notes', 'Bare.md'), 'bare\n')
    await ownUnderLock('Notes/Bare.md', 'bare\n')
    expect(owedFor(root).stamp).toEqual([
      { path: 'Notes/Bare.md', kind: 'page', reason: 'missing' },
    ])
    expect(await readFile(abs('Notes', 'Bare.md'), 'utf8')).toBe('bare\n')
    await settleNow(QUIET, root)
    const id = splitFrontmatter(await readFile(abs('Notes', 'Bare.md'), 'utf8'))[ID_KEY]
    expect(held().collections[0]?.pages.find((p) => p.path === 'Notes/Bare.md')?.id).toBe(id)
    await agrees()
  })
})

// The walk and the container sidecar's event decode its meta through one mapper, each handing it the children it holds.
describe('the walk and the sidecar event agree on a container', () => {
  const SET_A = '01ARZ3NDEKPSV4RRFFQ69G5S0A'
  const SET_B = '01ARZ3NDEKPSV4RRFFQ69G5S0B'
  const view = (id: string): Record<string, unknown> => ({
    id,
    name: id,
    type: 'table',
    property_order: ['_title'],
    hidden_properties: [],
  })
  const nine = (node: CollectionNode | SetNode | null): Record<string, unknown> | null =>
    node && {
      icon: node.icon,
      banner: node.banner,
      headingIconHidden: node.headingIconHidden,
      sets: node.sets,
      pages: node.pages,
      views: node.views,
      viewButton: node.viewButton,
      disclosureLocked: node.disclosureLocked,
      activeView: node.activeView,
    }
  const notes = (): CollectionNode | SetNode | null => {
    const tree = heldTreeOf(root)
    return tree ? findContainerWhere(tree, (n) => n.path === 'Notes') : null
  }

  beforeEach(async () => {
    await mkdir(abs('Notes', 'One'), { recursive: true })
    await mkdir(abs('Notes', 'Two'), { recursive: true })
    await writeFile(abs('Notes', 'One', '_pageset.json'), JSON.stringify({ id: SET_A }))
    await writeFile(abs('Notes', 'Two', '_pageset.json'), JSON.stringify({ id: SET_B }))
    await writeFile(abs('Notes', 'B.md'), `---\nID: ${ULID_B}\n---\n\nbeta\n`)
    await writeFile(
      abs('Notes', '_pagecollection.json'),
      JSON.stringify({
        id: 'c1',
        icon: 'folder',
        banner: 'Loose/b.png',
        heading_icon_hidden: true,
        set_order: [SET_B, SET_A],
        page_order: [ULID_B, ULID_A],
        views: [view('view_x'), view('view_y')],
        view_button: 'labeled',
        disclosure_locked: true,
        active_view: 'view_y',
        property_cache: { prop_related: { values: { [ULID_B]: '[[Alpha]]' } } },
      }),
    )
  })

  it('the walk decodes every field the sidecar carries', async () => {
    await refreshTree(root)
    expect(nine(notes())).toEqual({
      icon: 'folder',
      banner: 'Loose/b.png',
      headingIconHidden: true,
      sets: [expect.objectContaining({ id: SET_B }), expect.objectContaining({ id: SET_A })],
      pages: [expect.objectContaining({ id: ULID_B }), expect.objectContaining({ id: ULID_A })],
      views: [expect.objectContaining({ id: 'view_x' }), expect.objectContaining({ id: 'view_y' })],
      viewButton: 'labeled',
      disclosureLocked: true,
      activeView: 'view_y',
    })
  })

  // Whole nodes rather than a projection, so a field the event's arguments lose is caught wherever the node carries it.
  it('the sidecar event decodes to exactly what the walk produced, field for field', async () => {
    await refreshTree(root)
    const walked = structuredClone(notes())
    await applyEvents(root, [ev('change', 'Notes', '_pagecollection.json')])
    expect(owedFor(root).walk).toBe(false)
    const patched = notes()
    expect(patched?.activeView).toBe('view_y')
    expect(patched).toMatchObject({ cached: ['prop_related'] })
    expect(patched).toEqual(walked)
  })
})
