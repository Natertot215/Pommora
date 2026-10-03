import { join } from '../Paths/posix'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NexusTree } from './tree'
import { liveIdIndex, liveIdOf, livePathOf } from './heldPages'

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
        pages: [{ kind: 'page', id: 'pA', path: 'Notes/A.md' }],
        sets: [
          {
            kind: 'set',
            path: 'Notes/Deep',
            pages: [{ kind: 'page', id: 'pD', path: 'Notes/Deep/D.md' }],
            sets: [],
          },
        ],
      },
      {
        kind: 'collection',
        path: 'Ideas',
        pages: [{ kind: 'page', id: 'pI', path: 'Ideas/I.md' }],
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
