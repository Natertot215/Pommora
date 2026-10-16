import { join } from '../Paths/posix'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NexusTree } from './tree'
import { frozenWorld, liveIdIndex, liveIdOf, livePathOf, titleHeldOutside } from './heldPages'

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

  it('titleHeldOutside is false when only the leaving file holds the title, true when a second page does', () => {
    held.tree = withAlpha('Notes/Alpha.md')
    expect(titleHeldOutside(ROOT, 'Alpha', 'Notes/Alpha.md')).toBe(false)
    held.tree = withAlpha('Notes/Alpha.md', 'Notes/Deep/Alpha.md')
    expect(titleHeldOutside(ROOT, 'Alpha', 'Notes/Alpha.md')).toBe(true)
  })

  it('frozenWorld holds an arriving title and a held one, and nothing else', () => {
    const world = frozenWorld(withAlpha('Notes/Alpha.md'), ['Landing'])
    expect(world.holds?.('landing')).toBe(true)
    expect(world.holds?.('alpha')).toBe(true)
    expect(world.holds?.('ghost')).toBe(false)
  })
})
