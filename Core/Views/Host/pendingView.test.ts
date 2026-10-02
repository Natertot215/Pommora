// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, createElement } from 'react'
import type { Root } from 'react-dom/client'
import { type SavedView, foldView, slotsOf, type ViewPatch } from '../views'
import { mountEachTest } from '../../Testing/viewHarness'
import { mutateAhead, stageView, useLiveView, usePainted } from './pendingView'
import { useSession } from '../../Session/store'
import type { CollectionNode, NexusTree, SetNode } from '../../Nexus/tree'
import type { MutateOutcome, OrderRequest } from '../../Nexus/mutateRequest'

const base = (over: Partial<SavedView> = {}): SavedView =>
  ({
    id: 'view_1',
    name: 'Table',
    type: 'table',
    property_order: ['_title'],
    hidden_properties: [],
    ...over,
  }) as SavedView

let root: Root
mountEachTest((_h, r) => {
  root = r
})

let live: SavedView
let stage: (patch: ViewPatch) => void
let renders = 0

function Probe({ view, sourceId }: { view: SavedView; sourceId: string }): null {
  live = useLiveView(sourceId, view)
  stage = (patch) => stageView(sourceId, view, patch)
  renders++
  return null
}

const show = (view: SavedView, sourceId = 'k'): Promise<void> =>
  act(async () => root.render(createElement(Probe, { view, sourceId })))
const put = (patch: ViewPatch): Promise<void> => act(async () => stage(patch))

beforeEach(() => {
  renders = 0
})

describe('a whole field', () => {
  it('drops when the stored value becomes the staged one', async () => {
    await show(base())
    await put({ collapsed_groups: ['a'] })
    await show(base({ collapsed_groups: ['a'] }))
    await show(base({ collapsed_groups: ['b'] }))
    expect(live.collapsed_groups).toEqual(['b'])
  })

  it('a stage captured before the view changed stages over the view as it is now', async () => {
    await show(base())
    const captured = stage
    await show(base({ collapsed_groups: ['x'] }))
    await act(async () => captured({ collapsed_groups: ['a'] }))
    await show(base({ collapsed_groups: ['x'] }))
    expect(live.collapsed_groups).toEqual(['a'])
  })

  it('stays while the stored value is its base', async () => {
    await show(base({ collapsed_groups: ['x'] }))
    await put({ collapsed_groups: ['a'] })
    await show(base({ collapsed_groups: ['x'] }))
    expect(live.collapsed_groups).toEqual(['a'])
  })

  it('drops when the stored value becomes a third value', async () => {
    await show(base())
    await put({ collapsed_groups: ['a'] })
    await show(base({ collapsed_groups: ['walker'] }))
    expect(live.collapsed_groups).toEqual(['walker'])
  })

  it('a second stage before the first lands survives the first landing and drops on its own', async () => {
    await show(base())
    await put({ collapsed_groups: ['a'] })
    await put({ collapsed_groups: ['a', 'b'] })
    await show(base({ collapsed_groups: ['a'] }))
    expect(live.collapsed_groups).toEqual(['a', 'b'])
    await show(base({ collapsed_groups: ['a', 'b'] }))
    await show(base({ collapsed_groups: ['c'] }))
    expect(live.collapsed_groups).toEqual(['c'])
  })

  it('a staged clear paints the field cleared, entries included, until the clear lands', async () => {
    await show(base({ column_widths: { a: 100 }, hide_borders: true }))
    await put({ column_widths: { a: 150 } })
    await put({ column_widths: undefined, hide_borders: undefined })
    expect(live.column_widths).toBeUndefined()
    expect(live.hide_borders).toBeUndefined()
    await show(base())
    await show(base({ hide_borders: true }))
    expect(live.hide_borders).toBe(true)
  })

  it('a run back to its start settles when the start lands and never masks a later write', async () => {
    await show(base({ collapsed_groups: [] }))
    await put({ collapsed_groups: ['a'] })
    await put({ collapsed_groups: [] })
    await show(base({ collapsed_groups: ['a'] }))
    expect(live.collapsed_groups).toEqual([])
    await show(base({ collapsed_groups: [] }))
    await show(base({ collapsed_groups: ['a'] }))
    expect(live.collapsed_groups).toEqual(['a'])
  })

  it('three toggles paint the last through every landing, in order', async () => {
    await show(base({ collapsed_groups: [] }))
    await put({ collapsed_groups: ['a'] })
    await put({ collapsed_groups: [] })
    await put({ collapsed_groups: ['a'] })
    for (const landed of [['a'], [], ['a']]) {
      await show(base({ collapsed_groups: landed }))
      expect(live.collapsed_groups).toEqual(['a'])
    }
    await show(base({ collapsed_groups: ['z'] }))
    expect(live.collapsed_groups).toEqual(['z'])
  })
})

describe('the column records', () => {
  it('settle per entry: one column landing leaves the other staged', async () => {
    await show(base())
    await put({ column_widths: { a: 100 } })
    await put({ column_widths: { b: 200 } })
    await show(base({ column_widths: { b: 200 } }))
    expect(live.column_widths).toEqual({ a: 100, b: 200 })
    await show(base({ column_widths: { a: 100, b: 200 } }))
    await show(base({ column_widths: { a: 90, b: 180 } }))
    expect(live.column_widths).toEqual({ a: 90, b: 180 })
  })

  it('a column_styles entry folds as a whole entry', async () => {
    await show(base({ column_styles: { a: { look: 'compact', date_format: 'short' }, b: {} } }))
    await put({ column_styles: { a: { look: 'compact', date_format: 'full' } } })
    expect(live.column_styles).toEqual({ a: { look: 'compact', date_format: 'full' }, b: {} })
  })

  it("a persist of one column's width carries every other column's stored width", () => {
    const view = base({ column_widths: { a: 100, b: 200 } })
    const saved = foldView(view, slotsOf({ column_widths: { a: 150 } }))
    expect(saved.column_widths).toEqual({ a: 150, b: 200 })
  })
})

describe('the hook', () => {
  it('a change of source drops every slot', async () => {
    await show(base())
    await put({ collapsed_groups: ['a'], column_widths: { a: 100 } })
    await show(base(), 'other')
    expect(live.collapsed_groups).toBeUndefined()
    expect(live.column_widths).toBeUndefined()
  })

  it('an unchanged settle keeps the record, so it schedules no second render', async () => {
    await show(base())
    await put({ collapsed_groups: ['a'] })
    renders = 0
    await show(base())
    expect(renders).toBe(1)
    expect(live.collapsed_groups).toEqual(['a'])
  })
})

// The reorder transforms the window paints a drag with, ahead of the drag's write.
describe('a drag painted ahead of its write', () => {
  const notes = (): CollectionNode => ({
    kind: 'collection',
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
