import { describe, expect, it } from 'vitest'
import type {
  CollectionNode,
  NexusTree,
  PageNode,
  SetNode,
} from '@shared/types'
import { existingNavKeys } from './treeNavKeys'

const page = (id: string): PageNode => ({ id, kind: 'page', title: id, path: `${id}.md` })
const set = (id: string, pages: PageNode[] = [], sets: SetNode[] = []): SetNode => ({
  id,
  kind: 'set',
  title: id,
  path: id,
  pages,
  sets,
})
const collection = (id: string, pages: PageNode[] = [], sets: SetNode[] = []): CollectionNode => ({
  id,
  kind: 'collection',
  title: id,
  path: id,
  pages,
  sets,
})

// Only the slices existingNavKeys reads; the rest of NexusTree is irrelevant to this unit.
const tree = (over: Partial<NexusTree>): NexusTree =>
  ({
        collections: [],
    contexts: [],
    ...over,
  }) as unknown as NexusTree

describe('existingNavKeys', () => {
  it('walks collections, nested sets, and pages at every depth', () => {
    const t = tree({
      collections: [
        collection('c1', [page('p1')], [set('s1', [page('p2')], [set('s2', [page('p3')])])]),
      ],
    })
    const keys = new Set(existingNavKeys(t))
    for (const k of ['collection:c1', 'page:p1', 'set:s1', 'page:p2', 'set:s2', 'page:p3'])
      expect(keys.has(k)).toBe(true)
  })


  it('always includes the id-less homepage singleton', () => {
    expect(existingNavKeys(tree({}))).toContain('homepage')
  })
})
