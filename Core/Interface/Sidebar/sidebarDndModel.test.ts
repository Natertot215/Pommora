import { describe, it, expect } from 'vitest'
import { buildIndex, setContainerOf, isSelfOrDescendant, type Entry } from './sidebarDndModel'
import type { CollectionNode, NexusTree } from '@pommora/core/Nexus/tree'

// 1 Collection → (loose page P3) + Set s1 [P1, P2] → Sub-Set s2 [P5], plus two Areas (contexts).
const collections: CollectionNode[] = [
  {
    id: 'c1',
    kind: 'collection',
    title: 'Col',
    path: 'Col',
    pages: [{ id: 'p3', kind: 'page', title: 'P3', path: 'Col/P3.md' }],
    sets: [
      {
        id: 's1',
        kind: 'set',
        title: 'Set',
        path: 'Col/Set',
        pages: [
          { id: 'p1', kind: 'page', title: 'P1', path: 'Col/Set/P1.md' },
          { id: 'p2', kind: 'page', title: 'P2', path: 'Col/Set/P2.md' },
        ],
        sets: [
          {
            id: 's2',
            kind: 'set',
            title: 'Sub',
            path: 'Col/Set/Sub',
            pages: [{ id: 'p5', kind: 'page', title: 'P5', path: 'Col/Set/Sub/P5.md' }],
          },
        ],
      },
    ],
  },
]
const tree = {
  collections,
  contexts: [
    {
      def: { id: 'g1', title: 'Realms', singular: 'Realm' },
      spaces: [
        {
          kind: 'space',
          id: 'sp1',
          title: 'Astral',
          path: '.nexus/contexts/Realms/Astral',
          contextId: 'g1',
        },
        {
          kind: 'space',
          id: 'sp2',
          title: 'Umbral',
          path: '.nexus/contexts/Realms/Umbral',
          contextId: 'g1',
        },
      ],
    },
  ],
} as unknown as NexusTree

describe('buildIndex', () => {
  const idx = buildIndex(tree)
  it('indexes containers with child page ids, child container ids + render depth', () => {
    expect(idx.byId.get('c1')).toMatchObject({
      kind: 'collection',
      depth: 0,
      pageIds: ['p3'],
      containerIds: ['s1'],
    })
    expect(idx.byId.get('s1')).toMatchObject({
      kind: 'set',
      depth: 1,
      pageIds: ['p1', 'p2'],
      containerIds: ['s2'],
    })
    expect(idx.byId.get('s2')).toMatchObject({
      kind: 'set',
      depth: 2,
      pageIds: ['p5'],
      containerIds: [],
    })
  })
  it('indexes pages with their parent container + render depth', () => {
    expect(idx.byId.get('p1')).toMatchObject({
      kind: 'page',
      depth: 2,
      parentId: 's1',
      parentPath: 'Col/Set',
    })
    expect(idx.byId.get('p3')).toMatchObject({
      kind: 'page',
      depth: 1,
      parentId: 'c1',
      parentPath: 'Col',
    })
    expect(idx.byId.get('p5')).toMatchObject({
      kind: 'page',
      depth: 3,
      parentId: 's2',
      parentPath: 'Col/Set/Sub',
    })
  })
  it('exposes the top-level collection group', () => {
    expect(idx.collectionIds).toEqual(['c1'])
  })
  it('indexes registry Spaces as depth-1 leaves under their Context group', () => {
    expect(idx.spaceIdsByContext.get('g1')).toEqual(['sp1', 'sp2'])
    expect(idx.byId.get('sp1')).toMatchObject({ kind: 'space', depth: 1, parentId: 'g1' })
    expect(setContainerOf(idx.byId.get('sp1') as Entry, idx)).toBeNull()
  })
})

describe('setContainerOf — the container a dragged Set resolves into', () => {
  const idx = buildIndex(tree)
  const get = (k: string): Entry => {
    const e = idx.byId.get(k)
    if (!e) throw new Error(`no entry ${k}`)
    return e
  }
  it('resolves a container header to itself, a hovered Set to its parent, a page to its parent container', () => {
    expect(setContainerOf(get('c1'), idx)?.path).toBe('Col') // the Collection itself
    expect(setContainerOf(get('s1'), idx)?.path).toBe('Col') // a depth-1 Set → its parent Collection
    expect(setContainerOf(get('s2'), idx)?.path).toBe('Col/Set') // a Sub-Set → its parent Set
    expect(setContainerOf(get('p3'), idx)?.path).toBe('Col') // a Collection-loose page → the Collection
    expect(setContainerOf(get('p1'), idx)?.path).toBe('Col/Set') // a page in a Set → that Set
  })
})

describe('isSelfOrDescendant — cycle guard for Set reparenting', () => {
  const idx = buildIndex(tree)
  it('flags a target that is the dragged Set itself or one of its descendants', () => {
    expect(isSelfOrDescendant('s1', 's1', idx)).toBe(true) // self
    expect(isSelfOrDescendant('s2', 's1', idx)).toBe(true) // s2 is a descendant of s1
  })
  it('allows an unrelated target', () => {
    expect(isSelfOrDescendant('c1', 's1', idx)).toBe(false) // the Collection is an ancestor, not a descendant
    expect(isSelfOrDescendant('s1', 's2', idx)).toBe(false) // s1 is not under s2
  })
})
