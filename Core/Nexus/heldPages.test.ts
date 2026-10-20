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
import { indexWrittenPage } from '../Index/indexSeed'
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
    await indexWrittenPage(root, file)
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

  it('reads the Archive off disk where no index store opened', async () => {
    const indexed = await nexusPages(root, tree(root))
    installStores(NO_STORES)
    expect(await nexusPages(root, tree(root))).toEqual(indexed)
  })
})
