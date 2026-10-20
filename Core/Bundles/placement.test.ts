import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { readJsonAt, tempRoot } from '../Testing/hostFs'
import { placeRecord, resolveRecord, slotOf } from './placement'

const PAGE_A = '01KVGMT8BFP350FZZXAMG1QDVA'

const P = (over: Partial<import('../Nexus/tree').PageNode> = {}) =>
  ({
    kind: 'page',
    id: 'page-x',
    title: 'X',
    path: 'Notes/X.md',
    ...over,
  }) as import('../Nexus/tree').PageNode
const treeOf = (
  contexts: import('../Nexus/tree').ContextGroup[],
  collections: Partial<import('../Nexus/tree').CollectionNode>[],
) => ({ contexts, collections }) as unknown as import('../Nexus/tree').NexusTree

const journal = (over: Partial<import('../Nexus/tree').SetNode> = {}) =>
  ({
    kind: 'set',
    id: 'set-daily',
    title: 'Journal',
    path: 'Notes/Journal',
    pages: [],
    sets: [],
    ...over,
  }) as import('../Nexus/tree').SetNode

const notes = (
  sets: import('../Nexus/tree').SetNode[] = [journal()],
  pages: import('../Nexus/tree').PageNode[] = [],
) => ({
  kind: 'collection' as const,
  id: 'col-notes',
  title: 'Notes',
  path: 'Notes',
  sets,
  pages,
})

const pageRecord = {
  entity: 'page' as const,
  id: PAGE_A,
  parent: { kind: 'container' as const, id: 'set-daily' },
}

describe('resolveRecord — a placement with final names, or a typed refusal', () => {
  it('places a page into its parent container at the container’s CURRENT path', () => {
    const r = resolveRecord(pageRecord, 'Alpha.md', treeOf([], [notes()]))
    expect(r).toEqual({
      place: { dir: 'Notes/Journal', finalName: 'Alpha.md', finalTitle: 'Alpha' },
    })
  })

  it('disambiguates a taken title, matching the create convention', () => {
    const taken = journal({
      pages: [P({ id: 'page-o', title: 'Alpha', path: 'Notes/Journal/Alpha.md' })],
    })
    const r = resolveRecord(pageRecord, 'Alpha.md', treeOf([], [notes([taken])]))
    expect(r).toEqual({
      place: { dir: 'Notes/Journal', finalName: 'Alpha (2).md', finalTitle: 'Alpha (2)' },
    })
  })

  it('a set title also blocks a page name — one folder cannot hold both', () => {
    const inner = journal({
      sets: [journal({ id: 'set-inner', title: 'Alpha', path: 'Notes/Journal/Alpha' })],
    })
    const r = resolveRecord(pageRecord, 'Alpha.md', treeOf([], [notes([inner])]))
    expect(r).toEqual({
      place: { dir: 'Notes/Journal', finalName: 'Alpha (2).md', finalTitle: 'Alpha (2)' },
    })
  })

  it('refuses when the parent is gone — a still-trashed parent is the same answer', () => {
    expect(resolveRecord(pageRecord, 'Alpha.md', treeOf([], [notes([])]))).toEqual({
      refuse: 'parent-gone',
    })
  })

  it('refuses when the parent id resolves to a kind that cannot hold this one', () => {
    const tree = treeOf(
      [
        {
          def: { id: 'ctx_a', title: 'Areas' },
          spaces: [
            {
              kind: 'space',
              id: 'set-daily',
              title: 'S',
              path: '.nexus/contexts/Areas/S',
              contextId: 'ctx_a',
            } as import('../Nexus/tree').SpaceNode,
          ],
        },
      ],
      [notes([])],
    )
    expect(resolveRecord(pageRecord, 'Alpha.md', tree)).toEqual({ refuse: 'cannot-hold' })
  })

  it('a live id refuses, and it outranks every other answer', () => {
    const tree = treeOf(
      [],
      [notes([], [P({ id: PAGE_A, title: 'Elsewhere', path: 'Notes/Elsewhere.md' })])],
    )
    expect(resolveRecord(pageRecord, 'Alpha.md', tree)).toEqual({ refuse: 'id-live' })
  })

  it('an unaddressable parent refuses', () => {
    const record = {
      entity: 'page' as const,
      id: PAGE_A,
      parent: { kind: 'unaddressable' as const },
    }
    expect(resolveRecord(record, 'Alpha.md', treeOf([], [notes()]))).toEqual({
      refuse: 'unaddressable',
    })
  })

  it('a collection returns to the root, disambiguated against its siblings', () => {
    const record = {
      entity: 'collection' as const,
      id: 'col-back',
      parent: { kind: 'root' as const },
    }
    const r = resolveRecord(record, 'Notes', treeOf([], [notes()]))
    expect(r).toEqual({ place: { dir: '', finalName: 'Notes (2)' } })
  })

  it('a Space follows its Context to the Context’s CURRENT title, colliding titles disambiguated', () => {
    const tree = treeOf(
      [
        {
          def: { id: 'ctx_projects', title: 'Ventures' },
          spaces: [
            {
              kind: 'space',
              id: 'sp-other',
              title: 'Pommora',
              path: '.nexus/contexts/Ventures/Pommora',
              contextId: 'ctx_projects',
            } as import('../Nexus/tree').SpaceNode,
          ],
        },
      ],
      [],
    )
    const record = {
      entity: 'space' as const,
      id: 'sp-pom',
      parent: { kind: 'context' as const, id: 'ctx_projects' },
      members: [],
    }
    const r = resolveRecord(record, 'Pommora', tree)
    expect(r).toEqual({
      place: {
        dir: '.nexus/contexts/Ventures',
        finalName: 'Pommora (2)',
        finalTitle: 'Pommora (2)',
      },
    })
  })

  it('a Context re-enters the registry under a disambiguated final title', () => {
    const tree = treeOf([{ def: { id: 'ctx_new', title: 'Projects' }, spaces: [] }], [])
    const record = {
      entity: 'context' as const,
      registry: { id: 'ctx_projects', title: 'Projects' },
      membership: [],
    }
    const r = resolveRecord(record, 'Projects', tree)
    expect(r).toEqual({
      place: { dir: '.nexus/contexts', finalName: 'Projects (2)', finalTitle: 'Projects (2)' },
    })
  })

  it('a Context whose registry id is already live refuses', () => {
    const tree = treeOf([{ def: { id: 'ctx_projects', title: 'Elsewhere' }, spaces: [] }], [])
    const record = {
      entity: 'context' as const,
      registry: { id: 'ctx_projects', title: 'Projects' },
      membership: [],
    }
    expect(resolveRecord(record, 'Projects', tree)).toEqual({ refuse: 'id-live' })
  })
})

describe('slotOf', () => {
  it('lands above the sibling it sat above while that one is live', () => {
    expect(slotOf({ above: 'b', below: 'a' }, ['a', 'b'])).toEqual({ anchor: 'b', where: 'above' })
  })

  it('lands below the sibling it sat below once the one after it is gone', () => {
    expect(slotOf({ above: 'gone', below: 'a' }, ['a', 'b'])).toEqual({
      anchor: 'a',
      where: 'below',
    })
  })

  it('lands first when nothing preceded it and its follower is gone', () => {
    expect(slotOf({ above: 'gone' }, ['a', 'b'])).toEqual({ anchor: null, where: 'first' })
  })

  it('lands last when neither neighbour is live, or the record holds no place', () => {
    expect(slotOf({ above: 'gone', below: 'lost' }, ['a'])).toEqual({ anchor: null, where: 'last' })
    expect(slotOf(undefined, ['a'])).toEqual({ anchor: null, where: 'last' })
  })
})

describe('placeRecord', () => {
  let root: string
  beforeEach(async () => {
    root = tempRoot('pom-place-')
    await mkdir(join(root, 'Notes', 'Journal'), { recursive: true })
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'col-notes' }),
    )
    await writeFile(
      join(root, 'Notes', 'Journal', '_pageset.json'),
      JSON.stringify({ id: 'set-daily' }),
    )
  })
  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  const siblings = [
    P({ id: 'page-1', title: 'One', path: 'Notes/Journal/One.md' }),
    P({ id: 'page-2', title: 'Two', path: 'Notes/Journal/Two.md' }),
  ]

  it('composes the parent’s full order with the item in its slot', async () => {
    const tree = treeOf([], [notes([journal({ pages: siblings })])])
    const record = { ...pageRecord, place: { above: 'page-2', below: 'page-1' } }
    const placed = await placeRecord(root, record, undefined, 'Alpha.md', tree)
    if (!placed.ok) throw new Error('placement refused')
    expect(placed.value.placement.dir).toBe('Notes/Journal')
    await placed.value.writeOrder?.()
    expect((await readJsonAt(join(root, 'Notes', 'Journal', '_pageset.json'))).page_order).toEqual([
      'page-1',
      PAGE_A,
      'page-2',
    ])
  })

  it('a picked destination drops the place and lands last', async () => {
    const tree = treeOf([], [notes([journal()], siblings)])
    const record = { ...pageRecord, place: { above: 'page-1' } }
    const placed = await placeRecord(
      root,
      record,
      { kind: 'container', id: 'col-notes' },
      'Alpha.md',
      tree,
    )
    if (!placed.ok) throw new Error('placement refused')
    expect(placed.value.record).toMatchObject({ place: undefined })
    await placed.value.writeOrder?.()
    expect((await readJsonAt(join(root, 'Notes', '_pagecollection.json'))).page_order).toEqual([
      'page-1',
      'page-2',
      PAGE_A,
    ])
  })

  const setRecord = {
    entity: 'set' as const,
    id: 'set-back',
    parent: { kind: 'container' as const, id: 'col-notes' },
  }

  it('lands at the tree’s placement when the disk holds nothing there, answering no landedAs', async () => {
    const placed = await placeRecord(root, pageRecord, undefined, 'Alpha.md', treeOf([], [notes()]))
    if (!placed.ok) throw new Error('placement refused')
    expect(placed.value.placement).toEqual({
      dir: 'Notes/Journal',
      finalName: 'Alpha.md',
      finalTitle: 'Alpha',
    })
    expect(placed.value.landedAs).toBeUndefined()
  })

  it('steps a page past a file of its name, answering the title it took', async () => {
    await writeFile(join(root, 'Notes', 'Journal', 'Alpha.md'), 'outside')
    const placed = await placeRecord(root, pageRecord, undefined, 'Alpha.md', treeOf([], [notes()]))
    if (!placed.ok) throw new Error('placement refused')
    expect(placed.value.placement).toEqual({
      dir: 'Notes/Journal',
      finalName: 'Alpha (2).md',
      finalTitle: 'Alpha (2)',
    })
    expect(placed.value.landedAs).toBe('Alpha (2)')
  })

  it('steps a Set past an excluded entry with no folder on disk', async () => {
    await mkdir(join(root, '.nexus'), { recursive: true })
    await writeFile(
      join(root, '.nexus', 'settings.json'),
      JSON.stringify({ excluded_folders: ['Notes/Daily'] }),
    )
    const placed = await placeRecord(root, setRecord, undefined, 'Daily', treeOf([], [notes()]))
    if (!placed.ok) throw new Error('placement refused')
    expect(placed.value.placement).toEqual({ dir: 'Notes', finalName: 'Daily (2)' })
    expect(placed.value.landedAs).toBe('Daily (2)')
  })

  it('steps a page past a folder of its name, and a Set past a page file of its name, since the two share one name', async () => {
    await mkdir(join(root, 'Notes', 'Journal', 'Alpha'))
    await writeFile(join(root, 'Notes', 'Daily.md'), 'outside')
    const tree = treeOf([], [notes()])
    const page = await placeRecord(root, pageRecord, undefined, 'Alpha.md', tree)
    const set = await placeRecord(root, setRecord, undefined, 'Daily', tree)
    expect(page.ok && page.value.landedAs).toBe('Alpha (2)')
    expect(set.ok && set.value.landedAs).toBe('Daily (2)')
  })
})
