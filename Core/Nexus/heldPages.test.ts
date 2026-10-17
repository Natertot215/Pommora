import { join } from '../Paths/posix'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NexusTree } from './tree'
import { frozenWorld, liveIdIndex, liveIdOf, livePathOf } from './heldPages'

const held = { tree: null as NexusTree | null }
vi.mock('./liveTree', () => ({
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
        path: 'Notes',
        pages: [{ kind: 'page', id: 'pA', title: 'A', path: 'Notes/A.md' }],
        sets: [
          {
            kind: 'set',
            path: 'Notes/Deep',
            pages: [{ kind: 'page', id: 'pD', title: 'D', path: 'Notes/Deep/D.md' }],
            sets: [],
          },
        ],
      },
      {
        kind: 'collection',
        path: 'Ideas',
        pages: [{ kind: 'page', id: 'pI', title: 'I', path: 'Ideas/I.md' }],
        sets: [],
      },
    ],
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

describe('titles answer from the one index', () => {
  const withAlpha = (...paths: string[]): NexusTree => {
    const t = tree(ROOT)
    t.collections[0].pages.push(
      ...paths.map((path, i) => ({ kind: 'page' as const, id: `alpha${i}`, title: 'Alpha', path })),
    )
    return t
  }

  it('frozenWorld holds an arriving title and a held one, and nothing else', () => {
    const world = frozenWorld(withAlpha('Notes/Alpha.md'), ['Landing'])
    expect(world.holds?.('landing')).toBe(true)
    expect(world.holds?.('alpha')).toBe(true)
    expect(world.holds?.('ghost')).toBe(false)
  })
})
