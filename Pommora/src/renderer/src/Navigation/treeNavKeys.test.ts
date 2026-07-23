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
    contexts: { areas: [], topics: [], projects: [] },
    collections: [],
    userSections: [],
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

  it('includes collections nested under user sections', () => {
    const t = tree({
      userSections: [{ id: 'u1', label: 'U', collections: [collection('c2', [page('p4')])] }],
    })
    const keys = new Set(existingNavKeys(t))
    expect(keys.has('collection:c2')).toBe(true)
    expect(keys.has('page:p4')).toBe(true)
  })

  it('always includes the id-less homepage singleton', () => {
    expect(existingNavKeys(tree({}))).toContain('homepage')
  })
})
