import { describe, it, expect } from 'vitest'
import { buildIndex, sidebarSlot, sidebarSnapshot } from './sidebarDndModel'
import type { NexusTree, PageNode, SpaceNode } from '@pommora/core/Nexus/tree'
import type { Personalization } from '@pommora/core/Settings/personalization'
import { makeTree } from '../../Testing/testTree'

const page = (id: string, path: string): PageNode => ({ kind: 'page', id, title: id, path })
const space = (id: string, contextId: string): SpaceNode => ({
  kind: 'space',
  id,
  title: id,
  path: `.nexus/contexts/${contextId}/${id}`,
  contextId,
})

// c1 Col → p3, s1 Set [p1, p2] → s2 Sub [p5], s3 Empty; c2 Other → q1, q2; c3 Far → s4; g1 → sp1, sp2; g2 → sp3.
const tree: NexusTree = {
  ...makeTree(),
  collections: [
    {
      kind: 'collection',
      id: 'c1',
      title: 'Col',
      path: 'Col',
      pages: [page('p3', 'Col/P3.md')],
      sets: [
        {
          kind: 'set',
          id: 's1',
          title: 'Set',
          path: 'Col/Set',
          pages: [page('p1', 'Col/Set/P1.md'), page('p2', 'Col/Set/P2.md')],
          sets: [
            {
              kind: 'set',
              id: 's2',
              title: 'Sub',
              path: 'Col/Set/Sub',
              pages: [page('p5', 'Col/Set/Sub/P5.md')],
            },
          ],
        },
        { kind: 'set', id: 's3', title: 'Empty', path: 'Col/Empty', pages: [] },
      ],
    },
    {
      kind: 'collection',
      id: 'c2',
      title: 'Other',
      path: 'Other',
      pages: [page('q1', 'Other/Q1.md'), page('q2', 'Other/Q2.md')],
      sets: [],
    },
    {
      kind: 'collection',
      id: 'c3',
      title: 'Far',
      path: 'Far',
      pages: [],
      sets: [{ kind: 'set', id: 's4', title: 'Near', path: 'Far/Near', pages: [] }],
    },
  ],
  contexts: [
    {
      def: { id: 'g1', title: 'Realms', singular: 'Realm' },
      spaces: [space('sp1', 'g1'), space('sp2', 'g1')],
    },
    { def: { id: 'g2', title: 'Tones', singular: 'Tone' }, spaces: [space('sp3', 'g2')] },
  ],
}
const idx = buildIndex(tree)

describe('buildIndex', () => {
  it('indexes containers with child page ids, child container ids + render depth', () => {
    expect(idx.byId.get('c1')).toMatchObject({
      kind: 'collection',
      depth: 0,
      pageIds: ['p3'],
      containerIds: ['s1', 's3'],
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
    expect(idx.byId.get('p1')).toMatchObject({ kind: 'page', depth: 2, parentId: 's1' })
    expect(idx.byId.get('p3')).toMatchObject({ kind: 'page', depth: 1, parentId: 'c1' })
    expect(idx.byId.get('p5')).toMatchObject({ kind: 'page', depth: 3, parentId: 's2' })
  })
  it('exposes the top-level collection group', () => {
    expect(idx.collectionIds).toEqual(['c1', 'c2', 'c3'])
  })
  it('indexes registry Spaces as depth-1 leaves under their Context group', () => {
    expect(idx.spaceIdsByContext.get('g1')).toEqual(['sp1', 'sp2'])
    expect(idx.byId.get('sp1')).toMatchObject({ kind: 'space', depth: 1, parentId: 'g1' })
  })
})

// The dragged id is dropped and the rest stack as 20px rows from 0, in the order given.
const slotOf = (
  draggedId: string,
  shown: string[],
  y: number,
  prefs: Partial<Personalization> = {},
) => {
  const measured = shown
    .filter((id) => id !== draggedId)
    .map((id, i) => ({ id, top: i * 20, bottom: i * 20 + 20, mid: i * 20 + 10 }))
  const snapshot = sidebarSnapshot(idx, prefs as Personalization, draggedId, measured)
  return snapshot && sidebarSlot(snapshot, y)
}
const moveSet = (path: string, newParentPath: string, order: string[]) => ({
  op: 'moveSet',
  path,
  newParentPath,
  order,
})
const movePage = (path: string, newParentPath: string, order: string[]) => ({
  op: 'movePage',
  path,
  newParentPath,
  order,
})

describe('sidebarSlot — a dragged Set', () => {
  // s3 over s1 (rows 20–40): its top quarter ends at 25 and its bottom quarter starts at 35, where s3 already sits.
  const beside = { depth: 1, lineY: 20, commit: moveSet('Col/Empty', 'Col', ['s3', 's1']) }
  const into = { depth: 2, lineY: 40, commit: moveSet('Col/Empty', 'Col/Set', ['s3', 's2']) }
  it.each([
    [22, beside],
    [24.9, beside],
    [25, into],
    [34.9, into],
    [35, null],
  ])('reads a Set row at y=%s: top quarter beside it, middle half into it', (y, slot) => {
    expect(slotOf('s3', ['c1', 's1', 's3', 'p3'], y)).toEqual(slot)
  })

  it("reorders after a sibling Set from that row's bottom quarter", () => {
    expect(slotOf('s1', ['c1', 's1', 's3', 'p3'], 38)).toEqual({
      depth: 1,
      lineY: 40,
      commit: moveSet('Col/Set', 'Col', ['s3', 's1']),
    })
  })

  it('reorders beside a Set in another Collection', () => {
    expect(slotOf('s1', ['c1', 's3', 'p3', 'c3', 's4'], 82)).toEqual({
      depth: 1,
      lineY: 80,
      commit: moveSet('Col/Set', 'Far', ['s1', 's4']),
    })
  })

  it('nests into a Set with no rows of its own, under its header at either placement', () => {
    const slot = { depth: 2, lineY: 40, commit: moveSet('Col/Set', 'Col/Empty', ['s1']) }
    expect(slotOf('s1', ['c1', 's1', 's3', 'p3'], 30)).toEqual(slot)
    expect(slotOf('s1', ['c1', 's1', 's3', 'p3'], 30, { subSetPlacement: 'bottom' })).toEqual(slot)
  })

  it('nests into another Collection from its header or its page, under the header or after its last page', () => {
    const shown = ['c1', 's3', 'p3', 'c2', 'q1', 'q2']
    const commit = moveSet('Col/Set', 'Other', ['s1'])
    for (const y of [62, 70, 78, 90])
      expect(slotOf('s1', shown, y)).toEqual({ depth: 1, lineY: 80, commit })
    expect(slotOf('s1', shown, 70, { setPlacement: 'bottom' })).toEqual({
      depth: 1,
      lineY: 120,
      commit,
    })
  })

  it('refuses a drop anywhere inside its own subtree', () => {
    const shown = ['c1', 's1', 's2', 'p5', 'p1', 'p2', 's3', 'p3']
    expect(slotOf('s1', shown, 30)).toBeNull()
    expect(slotOf('s1', shown, 50)).toBeNull()
    expect(slotOf('s1', shown, 70)).toBeNull()
  })

  it('declines nesting into the Set that already holds it', () => {
    expect(slotOf('s2', ['c1', 's1', 's2', 'p1'], 30)).toBeNull()
  })
})

describe('sidebarSlot — a dragged page', () => {
  it("joins the end of its group from a sibling Set's edge when Sets sit below the pages", () => {
    expect(slotOf('p1', ['c1', 's1', 'p1', 'p2', 's2'], 62, { subSetPlacement: 'bottom' })).toEqual(
      {
        depth: 2,
        lineY: 60,
        commit: movePage('Col/Set/P1.md', 'Col/Set', ['p2', 'p1']),
      },
    )
  })

  it("joins the start of its group from a sibling Set's edge when Sets sit above the pages", () => {
    const slot = { depth: 2, lineY: 60, commit: movePage('Col/Set/P2.md', 'Col/Set', ['p2', 'p1']) }
    expect(slotOf('p2', ['c1', 's1', 's2', 'p1', 'p2'], 42)).toEqual(slot)
    expect(slotOf('p2', ['c1', 's1', 's2', 'p1', 'p2'], 58)).toEqual(slot)
  })

  it("nests into a sibling Set from that row's middle half, empty or not", () => {
    expect(slotOf('p3', ['c1', 's1', 's3', 'p3'], 50)).toEqual({
      depth: 2,
      lineY: 60,
      commit: movePage('Col/P3.md', 'Col/Empty', ['p3']),
    })
    expect(slotOf('p1', ['c1', 's1', 'p1', 'p2', 's2'], 70)).toEqual({
      depth: 3,
      lineY: 80,
      commit: movePage('Col/Set/P1.md', 'Col/Set/Sub', ['p1', 'p5']),
    })
  })

  it('reparents into a Set that is not its sibling', () => {
    expect(slotOf('p3', ['c1', 's1', 's2', 'p3'], 50)).toEqual({
      depth: 3,
      lineY: 60,
      commit: movePage('Col/P3.md', 'Col/Set/Sub', ['p3', 'p5']),
    })
  })

  it("draws at the target's first page, not under the header the pointer is over", () => {
    expect(slotOf('q1', ['c1', 's1', 's3', 'p3', 'c2'], 10)).toEqual({
      depth: 1,
      lineY: 60,
      commit: movePage('Other/Q1.md', 'Col', ['q1', 'p3']),
    })
  })

  it('declines a slot that leaves it where it sits', () => {
    expect(slotOf('p1', ['c1', 's1', 'p1', 'p2'], 42)).toBeNull()
    expect(slotOf('p1', ['c1', 's1', 'p1', 'p2'], 30)).toBeNull()
    expect(slotOf('p1', ['c1', 's1', 's2', 'p1', 'p2'], 42)).toBeNull()
    expect(slotOf('p3', ['c1', 's1', 's3', 'p3'], 42)).toBeNull()
  })
})

describe('sidebarSlot — a sibling reorder', () => {
  it.each([
    {
      group: 'Collections at the top level',
      dragged: 'c2',
      shown: ['c1', 'c2'],
      y: 2,
      slot: { depth: 0, lineY: 0, commit: { op: 'reorderTop', order: ['c2', 'c1', 'c3'] } },
      noopY: 18,
    },
    {
      group: 'Spaces within their own Context group',
      dragged: 'sp2',
      shown: ['g1', 'sp1', 'sp2', 'g2', 'sp3'],
      y: 22,
      slot: {
        depth: 1,
        lineY: 20,
        commit: { op: 'reorderSpaces', contextId: 'g1', ids: ['sp2', 'sp1'] },
      },
      noopY: 78,
    },
    {
      group: 'Context groups',
      dragged: 'g2',
      shown: ['g1', 'sp1', 'sp2', 'g2', 'sp3'],
      y: 2,
      slot: { depth: 0, lineY: 0, commit: { op: 'reorderContexts', ids: ['g2', 'g1'] } },
      noopY: 18,
    },
  ])('reorders $group, declining the slot it already holds', ({
    dragged,
    shown,
    y,
    slot,
    noopY,
  }) => {
    expect(slotOf(dragged, shown, y)).toEqual(slot)
    expect(slotOf(dragged, shown, noopY)).toBeNull()
  })

  it('declines when no sibling is on screen', () => {
    expect(slotOf('c1', ['c1', 'p3'], 10)).toBeNull()
  })
})

describe('sidebarSlot — the dragged row itself', () => {
  it('resolves nothing while the pointer is still over the row it lifted', () => {
    const measured = ['c1', 's1', 'p3'].map((id, i) => ({
      id,
      top: i * 20,
      bottom: i * 20 + 20,
      mid: i * 20 + 10,
    }))
    const own = { id: 's3', top: 60, bottom: 80, mid: 70 }
    const snapshot = sidebarSnapshot(idx, {} as Personalization, 's3', measured, own)
    expect(snapshot && sidebarSlot(snapshot, 70)).toBeNull()
    expect(snapshot && sidebarSlot(snapshot, 22)?.commit).toEqual(
      moveSet('Col/Empty', 'Col', ['s3', 's1']),
    )
  })
})
