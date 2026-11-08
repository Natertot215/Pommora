// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, createElement } from 'react'
import type { Root } from 'react-dom/client'
import { mountEachTest } from '../../Testing/viewHarness'
import { mutateAhead, usePainted } from './paintAhead'
import { useSession } from '../../Session/store'
import type { CollectionNode, NexusTree, SetNode } from '../../Nexus/tree'
import type { MutateOutcome, OrderRequest } from '../../Nexus/mutateRequest'

let root: Root
mountEachTest((_h, r) => {
  root = r
})

// The reorder transforms the window paints a drag with, ahead of the drag's write.
describe('a drag painted ahead of its write', () => {
  const notes = (): CollectionNode => ({
    kind: 'collection',
    propertyIds: [],
    id: 'c1',
    title: 'Notes',
    path: 'Notes',
    sets: [
      {
        kind: 'set',
        id: 's1',
        title: 'Sub',
        path: 'Notes/Sub',
        sets: [],
        pages: [{ kind: 'page', id: 'p2', title: 'B', path: 'Notes/Sub/B.md' }],
      },
    ],
    pages: [{ kind: 'page', id: 'p1', title: 'A', path: 'Notes/A.md' }],
  })
  const work = (): CollectionNode => ({
    kind: 'collection',
    propertyIds: [],
    id: 'c2',
    title: 'Work',
    path: 'Work',
    sets: [],
    pages: [],
  })
  const treeOf = (...collections: CollectionNode[]): NexusTree =>
    ({
      nexus: { id: 'nx', rootPath: '/x', name: 'x' },
      contexts: [],
      collections,
    }) as unknown as NexusTree

  let painted: CollectionNode | SetNode
  const landings: (() => void)[] = []
  function Painted({ source }: { source: CollectionNode | SetNode }): null {
    painted = usePainted(source)
    return null
  }
  const paint = async (tree: NexusTree, source: string, req: OrderRequest): Promise<void> => {
    const held = tree.collections.find((c) => c.path === source)
    if (!held) throw new Error('no source')
    useSession.setState({
      tree,
      mutate: () => new Promise<MutateOutcome | null>((land) => landings.push(() => land({}))),
    })
    await act(async () => root.render(createElement(Painted, { source: held })))
    await act(async () => void mutateAhead(req, 'Row'))
  }
  afterEach(async () => {
    await act(async () => {
      for (const land of landings.splice(0)) land()
    })
  })

  it("reorderChildren reorders a collection's sets", async () => {
    const base = notes()
    base.sets.push({ kind: 'set', id: 's2', title: 'Z', path: 'Notes/Z', sets: [], pages: [] })
    await paint(treeOf(base, work()), 'Notes', {
      op: 'reorderChildren',
      parentPath: 'Notes',
      key: 'set_order',
      order: ['s2', 's1'],
    })
    expect(painted.sets?.map((s) => s.id)).toEqual(['s2', 's1'])
  })

  it('a moved page lands at the slot its order names, not appended', async () => {
    const dest = work()
    dest.pages.push({ kind: 'page', id: 'p9', title: 'Z', path: 'Work/Z.md' })
    await paint(treeOf(notes(), dest), 'Work', {
      op: 'movePage',
      path: 'Notes/A.md',
      newParentPath: 'Work',
      order: ['p1', 'p9'],
    })
    expect(painted.pages.map((p) => p.id)).toEqual(['p1', 'p9'])
  })

  it('a moved page with no order is appended', async () => {
    await paint(treeOf(notes(), work()), 'Work', {
      op: 'movePage',
      path: 'Notes/A.md',
      newParentPath: 'Work',
    })
    expect(painted.pages.map((p) => p.id)).toEqual(['p1'])
  })

  it('a same-parent move is its order alone, and a move of nothing paints nothing', async () => {
    const base = notes()
    base.sets.push({ kind: 'set', id: 's2', title: 'Z', path: 'Notes/Z', sets: [], pages: [] })
    await paint(treeOf(base, work()), 'Notes', {
      op: 'moveSet',
      path: 'Notes/Z',
      newParentPath: 'Notes',
      order: ['s2', 's1'],
    })
    expect(painted.sets?.map((s) => s.id)).toEqual(['s2', 's1'])
    const held = work()
    await paint(treeOf(notes(), held), 'Work', {
      op: 'moveSet',
      path: 'Notes/Ghost',
      newParentPath: 'Work',
      order: [],
    })
    expect(painted).toBe(held)
  })
})
