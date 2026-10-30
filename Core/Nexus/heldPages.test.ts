import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from '../Paths/posix'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NexusTree } from './tree'
import { liveIdIndex, liveIdOf, livePathOf, nexusPages } from './heldPages'
import { pagesOf } from './record'
import { buildPageIndex } from '../Connections/pageIndex'
import { tempRoot } from '../Testing/hostFs'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import { indexWrittenPages, seedContentIndex } from '../Index/indexSeed'
import { ASSETS_DIR_REL } from '../Paths/nexusPaths'

const held = { tree: null as NexusTree | null }
vi.mock('./liveTree', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./liveTree')>()),
  heldTreeOf: (root: string) => (held.tree?.nexus.rootPath === root ? held.tree : null),
}))

const ROOT = '/nexus'
const tree = (rootPath: string): NexusTree =>
  ({
    nexus: { rootPath },
    contexts: [],
    collections: [
      {
        kind: 'collection',
        id: 'cN',
        path: 'Notes',
        pages: [{ kind: 'page', id: 'pA', title: 'A', path: 'Notes/A.md' }],
        sets: [
          {
            kind: 'set',
            id: 'sD',
            path: 'Notes/Deep',
            pages: [{ kind: 'page', id: 'pD', title: 'D', path: 'Notes/Deep/D.md' }],
            sets: [],
          },
        ],
      },
      {
        kind: 'collection',
        id: 'cI',
        path: 'Ideas',
        pages: [{ kind: 'page', id: 'pI', title: 'I', path: 'Ideas/I.md' }],
        sets: [],
      },
    ],
    config: { excluded: [], assetDirectory: ASSETS_DIR_REL },
  }) as unknown as NexusTree

beforeEach(() => {
  held.tree = tree(ROOT)
})

describe('the held tree’s pages', () => {
  it('resolves ids through nested sets', () => {
    expect([...liveIdIndex(ROOT)]).toEqual([
      ['Notes/A.md', 'pA'],
      ['Notes/Deep/D.md', 'pD'],
      ['Ideas/I.md', 'pI'],
    ])
    expect(liveIdOf(ROOT, join(ROOT, 'Notes/Deep/D.md'))).toBe('pD')
    expect(livePathOf(ROOT, 'pI')).toBe('Ideas/I.md')
  })

  it('an id two files claim answers no path to a writer', () => {
    const t = tree(ROOT)
    t.collections[0].pages.push({
      kind: 'page',
      id: 'pA',
      title: 'A copy',
      path: 'Notes/A copy.md',
    })
    held.tree = t
    expect(livePathOf(ROOT, 'pA')).toBeNull()
    expect(livePathOf(ROOT, 'pD')).toBe('Notes/Deep/D.md')
  })

  it('a tree held for another root resolves nothing', () => {
    held.tree = tree('/elsewhere')
    expect(liveIdOf(ROOT, join(ROOT, 'Notes/A.md'))).toBeUndefined()
    expect(livePathOf(ROOT, 'pA')).toBeNull()
  })
})

describe('nexusPages — the tree and the Archive by id', () => {
  let root: string
  const PO = '01KVGMT8BFP350FZZXAMG1QARC'
  const TWIN = '01KVGMT8BFP350FZZXAMG1QTWN'
  const OLD = '.nexus/archive/cN/Notes/2026-10-20T12-00-00-000Z__Old.md.archived/Old.md'
  const archive = async (rel: string, id: string): Promise<void> => {
    const file = join(root, rel)
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, `---\nID: ${id}\n---\nb\n`)
    await indexWrittenPages(root, [{ absPath: file }])
  }
  const copyOfA = (t: NexusTree): NexusTree => {
    t.collections[0].pages.push({
      kind: 'page',
      id: 'pA',
      title: 'A copy',
      path: 'Notes/A copy.md',
    })
    return t
  }

  beforeEach(async () => {
    root = tempRoot('pom-nexuspages-')
    await mkdir(join(root, '.nexus'), { recursive: true })
    installStores(memoryStores().stores)
    await archive(OLD, PO)
  })
  afterEach(async () => {
    installStores(NO_STORES)
    await rm(root, { recursive: true, force: true })
  })

  it('holds every entity the tree holds and every archived page, the archived one at the path a writer opens', async () => {
    const { byId } = await nexusPages(root, tree(root))
    expect(byId.get(PO)).toEqual({ id: PO, kind: 'page', title: 'Old', path: OLD })
    expect(byId.get('cN')).toEqual({ id: 'cN', kind: 'collection', path: 'Notes' })
    expect(byId.get('sD')).toEqual({ id: 'sD', kind: 'set', path: 'Notes/Deep' })
    expect(byId.get('pD')).toEqual({ id: 'pD', kind: 'page', title: 'D', path: 'Notes/Deep/D.md' })
  })

  it('answers each archived page at the path it left, where a path key naming its chain resolves', async () => {
    const t = tree(root)
    const { archived } = await nexusPages(root, t)
    expect(archived).toEqual([{ id: PO, title: 'Old', path: 'Notes/Old.md' }])
    expect(buildPageIndex([...pagesOf(t), ...archived]).resolve('Notes/Old').page?.id).toBe(PO)
  })

  it('marks an id two files claim null, within the tree, within the Archive, or across them', async () => {
    await archive('.nexus/archive/cN/Notes/2026-10-20T12-00-00-000Z__Twin.md.archived/Twin.md', PO)
    await archive('.nexus/archive/cI/2026-10-20T12-00-00-000Z__T.md.archived/T.md', TWIN)
    const t = copyOfA(tree(root))
    t.collections[1].pages.push({ kind: 'page', id: TWIN, title: 'T', path: 'Ideas/T.md' })
    const { byId } = await nexusPages(root, t)
    expect(byId.get('pA')).toBeNull()
    expect(byId.get(PO)).toBeNull()
    expect(byId.get(TWIN)).toBeNull()
    expect(byId.get('pD')?.path).toBe('Notes/Deep/D.md')
  })

  it('reads the Archive off disk while the open store’s index was never marked ready', async () => {
    const LATE = '.nexus/archive/cN/2026-10-20T12-00-00-000Z__Late.md.archived/Late.md'
    await mkdir(dirname(join(root, LATE)), { recursive: true })
    await writeFile(join(root, LATE), `---\nID: ${TWIN}\n---\nb\n`)
    expect((await nexusPages(root, tree(root))).byId.get(TWIN)?.path).toBe(LATE)
  })

  it('reads the Archive off disk where no index store opened', async () => {
    const indexed = await nexusPages(root, tree(root))
    installStores(NO_STORES)
    expect(await nexusPages(root, tree(root))).toEqual(indexed)
  })
})

describe('nexusPages — the Trash by id', () => {
  let root: string
  const PT = '01KVGMT8BFP350FZZXAMG1QTRS'
  const GONE = '.trash/Notes/2026-10-20T12-00-00-000Z__Gone.md.deleted/Gone.md'
  const AGAIN = '.trash/Notes/2026-10-20T12-00-01-000Z__Gone.md.deleted/Gone.md'
  const OLD = '.nexus/archive/cN/Notes/2026-10-20T12-00-00-000Z__Old.md.archived/Old.md'
  const store = async (rel: string, id: string): Promise<void> => {
    const file = join(root, rel)
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, `---\nID: ${id}\n---\nb\n`)
    await indexWrittenPages(root, [{ absPath: file }])
  }

  beforeEach(async () => {
    root = tempRoot('pom-nexuspages-trashed-')
    await mkdir(join(root, '.nexus'), { recursive: true })
    installStores(memoryStores().stores)
  })
  afterEach(async () => {
    installStores(NO_STORES)
    await rm(root, { recursive: true, force: true })
  })

  it('holds a trashed page at its store path and leaves it out of `archived`', async () => {
    await store(GONE, PT)
    const { byId, archived } = await nexusPages(root, tree(root))
    expect(byId.get(PT)).toEqual({ id: PT, kind: 'page', title: 'Gone', path: GONE })
    expect(archived).toEqual([])
  })

  it('a live page sharing a trashed page’s id keeps its entry', async () => {
    await store(GONE, 'pA')
    expect((await nexusPages(root, tree(root))).byId.get('pA')?.path).toBe('Notes/A.md')
  })

  it('an archived page sharing it keeps its entry', async () => {
    await store(GONE, PT)
    await store(OLD, PT)
    expect((await nexusPages(root, tree(root))).byId.get(PT)?.path).toBe(OLD)
  })

  it('of two trashed copies of one id the first listed claims it and neither nulls it', async () => {
    await store(GONE, PT)
    await store(AGAIN, PT)
    expect((await nexusPages(root, tree(root))).byId.get(PT)?.path).toBe(GONE)
  })

  it('reads the Trash off disk where no index store opened', async () => {
    await store(GONE, PT)
    await seedContentIndex(root)
    const indexed = await nexusPages(root, tree(root))
    installStores(NO_STORES)
    expect(await nexusPages(root, tree(root))).toEqual(indexed)
  })
})

describe('nexusPages — the Trash’s Spaces', () => {
  let root: string
  const AREAS = '.trash/.nexus/contexts/Areas/2026-10-20T12-00-00-000Z__Work.deleted'
  const PROJECTS = '.trash/.nexus/contexts/2026-10-20T12-00-00-000Z__Projects.deleted'
  const put = async (rel: string, json: unknown): Promise<void> => {
    await mkdir(dirname(join(root, rel)), { recursive: true })
    await writeFile(join(root, rel), JSON.stringify(json))
  }
  const trashSpace = async (id: string): Promise<void> => {
    await put(`${AREAS}/_record.json`, {
      entity: 'space',
      id,
      parent: { kind: 'context', id: 'ctx_areas' },
      members: [],
    })
    await put(`${AREAS}/Work/_space.json`, { id })
  }

  beforeEach(async () => {
    root = tempRoot('pom-nexuspages-trash-')
    await mkdir(join(root, '.nexus'), { recursive: true })
  })
  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('holds a trashed Space at its bundle path, and a trashed Context’s Spaces under it', async () => {
    await trashSpace('sp_work')
    await put(`${PROJECTS}/_record.json`, {
      entity: 'context',
      registry: { id: 'ctx_projects', title: 'Projects' },
      membership: [],
    })
    await put(`${PROJECTS}/Projects/Pom/_space.json`, { id: 'sp_pom' })
    const { byId, stored } = await nexusPages(root, tree(root))
    expect(byId.get('sp_work')).toEqual({
      id: 'sp_work',
      kind: 'space',
      title: 'Work',
      path: `${AREAS}/Work`,
    })
    expect(byId.get('sp_pom')).toEqual({
      id: 'sp_pom',
      kind: 'space',
      title: 'Pom',
      path: `${PROJECTS}/Projects/Pom`,
    })
    expect(stored.spaces.map((s) => [s.id, s.contextId]).sort()).toEqual([
      ['sp_pom', 'ctx_projects'],
      ['sp_work', 'ctx_areas'],
    ])
  })

  it('a live Space sharing a trashed Space’s id keeps its entry, and the trashed one fills no null', async () => {
    const t = tree(root)
    const live = {
      kind: 'space',
      id: 'sp_work',
      title: 'Work',
      path: '.nexus/contexts/Areas/Work',
      contextId: 'ctx_areas',
    }
    t.contexts.push({ def: { id: 'ctx_areas', title: 'Areas' }, spaces: [live] } as never)
    t.collections[0].pages.push({
      kind: 'page',
      id: 'pA',
      title: 'A copy',
      path: 'Notes/A copy.md',
    })
    await trashSpace('sp_work')
    await put('.trash/.nexus/contexts/Areas/2026-10-20T12-00-01-000Z__Home.deleted/_record.json', {
      entity: 'space',
      id: 'pA',
      parent: { kind: 'context', id: 'ctx_areas' },
      members: [],
    })
    await put(
      '.trash/.nexus/contexts/Areas/2026-10-20T12-00-01-000Z__Home.deleted/Home/_space.json',
      {
        id: 'pA',
      },
    )
    const { byId, stored } = await nexusPages(root, t)
    expect(byId.get('sp_work')?.path).toBe('.nexus/contexts/Areas/Work')
    expect(byId.get('pA')).toBeNull()
    expect(stored.spaces.map((s) => s.id).sort()).toEqual(['pA', 'sp_work'])
  })
})
