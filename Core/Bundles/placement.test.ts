import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from '../Paths/posix'
import { readJsonAt, tempRoot } from '../Testing/hostFs'
import { placeAmong, placeRecord, resolveRecord } from './placement'
import { nexusPages } from '../Nexus/heldPages'
import { ASSETS_DIR_REL } from '../Paths/nexusPaths'

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
) =>
  ({
    contexts,
    collections,
    config: { excluded: [], assetDirectory: ASSETS_DIR_REL, order: { spaces: {} } },
  }) as unknown as import('../Nexus/tree').NexusTree

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

let root: string
beforeEach(async () => {
  root = tempRoot('pom-place-')
  await mkdir(join(root, 'Notes', 'Journal'), { recursive: true })
  await writeFile(join(root, 'Notes', '_pagecollection.json'), JSON.stringify({ id: 'col-notes' }))
  await writeFile(
    join(root, 'Notes', 'Journal', '_pageset.json'),
    JSON.stringify({ id: 'set-daily' }),
  )
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

const byIdOf = async (tree: import('../Nexus/tree').NexusTree) =>
  (await nexusPages(root, tree)).byId

const RESTORING = '.trash/2026-10-20T12-00-00-000Z__Alpha.md.deleted'
const bundleAt = (name: string) => ({
  abs: join(root, RESTORING),
  artifact: join(root, RESTORING, name),
})

const pageRecord = {
  entity: 'page' as const,
  id: PAGE_A,
  parent: { kind: 'container' as const, id: 'set-daily' },
}

describe('resolveRecord — a placement with final names, or a typed refusal', () => {
  it('places a page into its parent container at the container’s CURRENT path', async () => {
    const tree = treeOf([], [notes()])
    const r = resolveRecord(pageRecord, 'Alpha.md', tree, await byIdOf(tree), RESTORING)
    expect('place' in r && r.place).toEqual({
      dir: 'Notes/Journal',
      finalName: 'Alpha.md',
      finalTitle: 'Alpha',
    })
  })

  it('disambiguates a taken title, matching the create convention', async () => {
    const taken = journal({
      pages: [P({ id: 'page-o', title: 'Alpha', path: 'Notes/Journal/Alpha.md' })],
    })
    const tree = treeOf([], [notes([taken])])
    const r = resolveRecord(pageRecord, 'Alpha.md', tree, await byIdOf(tree), RESTORING)
    expect('place' in r && r.place).toEqual({
      dir: 'Notes/Journal',
      finalName: 'Alpha (2).md',
      finalTitle: 'Alpha (2)',
    })
  })

  it('a set title also blocks a page name — one folder cannot hold both', async () => {
    const inner = journal({
      sets: [journal({ id: 'set-inner', title: 'Alpha', path: 'Notes/Journal/Alpha' })],
    })
    const tree = treeOf([], [notes([inner])])
    const r = resolveRecord(pageRecord, 'Alpha.md', tree, await byIdOf(tree), RESTORING)
    expect('place' in r && r.place).toEqual({
      dir: 'Notes/Journal',
      finalName: 'Alpha (2).md',
      finalTitle: 'Alpha (2)',
    })
  })

  it('refuses when the parent is gone — a still-trashed parent is the same answer', async () => {
    const tree = treeOf([], [notes([])])
    expect(resolveRecord(pageRecord, 'Alpha.md', tree, await byIdOf(tree), RESTORING)).toEqual({
      refuse: 'parent-gone',
    })
  })

  it('refuses when the parent id resolves to a kind that cannot hold this one', async () => {
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
    expect(resolveRecord(pageRecord, 'Alpha.md', tree, await byIdOf(tree), RESTORING)).toEqual({
      refuse: 'cannot-hold',
    })
  })

  it('a live id refuses, and it outranks every other answer', async () => {
    const tree = treeOf(
      [],
      [notes([], [P({ id: PAGE_A, title: 'Elsewhere', path: 'Notes/Elsewhere.md' })])],
    )
    expect(resolveRecord(pageRecord, 'Alpha.md', tree, await byIdOf(tree), RESTORING)).toEqual({
      refuse: 'id-live',
    })
  })

  it('an id the Archive holds refuses as live', async () => {
    const file = join(root, '.nexus/archive/c1/Notes/2026-10-20T12-00-00-000Z__A.md.archived/A.md')
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, `---\nID: ${PAGE_A}\n---\nb\n`)
    const tree = treeOf([], [notes()])
    expect(resolveRecord(pageRecord, 'Alpha.md', tree, await byIdOf(tree), RESTORING)).toEqual({
      refuse: 'id-live',
    })
  })

  it('an id held only inside the restoring bundle isn’t live; one held anywhere else, or twice, is', async () => {
    const bundle = (n: number): string =>
      `.nexus/archive/c1/Notes/2026-10-20T12-00-0${n}-000Z__Alpha.md.archived`
    const seed = async (n: number): Promise<void> => {
      await mkdir(join(root, bundle(n)), { recursive: true })
      await writeFile(join(root, bundle(n), 'Alpha.md'), `---\nID: ${PAGE_A}\n---\nb\n`)
    }
    const tree = treeOf([], [notes()])
    await seed(1)
    const once = await byIdOf(tree)
    expect('place' in resolveRecord(pageRecord, 'Alpha.md', tree, once, bundle(1))).toBe(true)
    expect(resolveRecord(pageRecord, 'Alpha.md', tree, once, bundle(2))).toEqual({
      refuse: 'id-live',
    })
    await seed(2)
    expect(resolveRecord(pageRecord, 'Alpha.md', tree, await byIdOf(tree), bundle(1))).toEqual({
      refuse: 'id-live',
    })
  })

  it('an unaddressable parent refuses', async () => {
    const record = {
      entity: 'page' as const,
      id: PAGE_A,
      parent: { kind: 'unaddressable' as const },
    }
    const tree = treeOf([], [notes()])
    expect(resolveRecord(record, 'Alpha.md', tree, await byIdOf(tree), RESTORING)).toEqual({
      refuse: 'unaddressable',
    })
  })

  it('a collection returns to the root, disambiguated against its siblings', async () => {
    const record = {
      entity: 'collection' as const,
      id: 'col-back',
      parent: { kind: 'root' as const },
    }
    const tree = treeOf([], [notes()])
    const r = resolveRecord(record, 'Notes', tree, await byIdOf(tree), RESTORING)
    expect('place' in r && r.place).toEqual({ dir: '', finalName: 'Notes (2)' })
  })

  it('a Space follows its Context to the Context’s CURRENT title, colliding titles disambiguated', async () => {
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
    const r = resolveRecord(record, 'Pommora', tree, await byIdOf(tree), RESTORING)
    expect('place' in r && r.place).toEqual({
      dir: '.nexus/contexts/Ventures',
      finalName: 'Pommora (2)',
      finalTitle: 'Pommora (2)',
    })
  })

  it('a Context re-enters the registry under a disambiguated final title', async () => {
    const tree = treeOf([{ def: { id: 'ctx_new', title: 'Projects' }, spaces: [] }], [])
    const record = {
      entity: 'context' as const,
      registry: { id: 'ctx_projects', title: 'Projects' },
      membership: [],
    }
    const r = resolveRecord(record, 'Projects', tree, await byIdOf(tree), RESTORING)
    expect('place' in r && r.place).toEqual({
      dir: '.nexus/contexts',
      finalName: 'Projects (2)',
      finalTitle: 'Projects (2)',
    })
  })

  it('a Context whose registry id is already live refuses', async () => {
    const tree = treeOf([{ def: { id: 'ctx_projects', title: 'Elsewhere' }, spaces: [] }], [])
    const record = {
      entity: 'context' as const,
      registry: { id: 'ctx_projects', title: 'Projects' },
      membership: [],
    }
    expect(resolveRecord(record, 'Projects', tree, await byIdOf(tree), RESTORING)).toEqual({
      refuse: 'id-live',
    })
  })
})

describe('placeAmong', () => {
  it('lands above the sibling it sat above while that one is live', () => {
    expect(placeAmong(['a', 'c', 'b'], 'x', { above: 'b', below: 'a' })).toEqual([
      'a',
      'c',
      'x',
      'b',
    ])
  })

  it('lands below the sibling it sat below once the one after it is gone', () => {
    expect(placeAmong(['a', 'b'], 'x', { above: 'gone', below: 'a' })).toEqual(['a', 'x', 'b'])
  })

  it('lands first when nothing preceded it and its follower is gone', () => {
    expect(placeAmong(['a', 'b'], 'x', { above: 'gone' })).toEqual(['x', 'a', 'b'])
  })

  it('lands last when neither neighbour is live, or the record holds no place', () => {
    expect(placeAmong(['a'], 'x', { above: 'gone', below: 'lost' })).toEqual(['a', 'x'])
    expect(placeAmong(['a'], 'x', undefined)).toEqual(['a', 'x'])
  })
})

describe('placeRecord', () => {
  const siblings = [
    P({ id: 'page-1', title: 'One', path: 'Notes/Journal/One.md' }),
    P({ id: 'page-2', title: 'Two', path: 'Notes/Journal/Two.md' }),
  ]

  it('composes the parent’s full order with the item in its slot', async () => {
    const tree = treeOf([], [notes([journal({ pages: siblings })])])
    const record = { ...pageRecord, place: { above: 'page-2', below: 'page-1' } }
    const placed = await placeRecord(
      root,
      record,
      undefined,
      bundleAt('Alpha.md'),
      tree,
      await byIdOf(tree),
    )
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
      bundleAt('Alpha.md'),
      tree,
      await byIdOf(tree),
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
    const tree = treeOf([], [notes()])
    const placed = await placeRecord(
      root,
      pageRecord,
      undefined,
      bundleAt('Alpha.md'),
      tree,
      await byIdOf(tree),
    )
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
    const tree = treeOf([], [notes()])
    const placed = await placeRecord(
      root,
      pageRecord,
      undefined,
      bundleAt('Alpha.md'),
      tree,
      await byIdOf(tree),
    )
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
    const tree = treeOf([], [notes()])
    const placed = await placeRecord(
      root,
      setRecord,
      undefined,
      bundleAt('Daily'),
      tree,
      await byIdOf(tree),
    )
    if (!placed.ok) throw new Error('placement refused')
    expect(placed.value.placement).toEqual({ dir: 'Notes', finalName: 'Daily (2)' })
    expect(placed.value.landedAs).toBe('Daily (2)')
  })

  it('steps a page past a file of its name alone, and a Set past a folder of its name alone, leaving a namesake of the other form beside it', async () => {
    await mkdir(join(root, 'Notes', 'Journal', 'Alpha'))
    await writeFile(join(root, 'Notes', 'Daily.md'), 'outside')
    const tree = treeOf([], [notes()])
    const page = await placeRecord(
      root,
      pageRecord,
      undefined,
      bundleAt('Alpha.md'),
      tree,
      await byIdOf(tree),
    )
    const set = await placeRecord(
      root,
      setRecord,
      undefined,
      bundleAt('Daily'),
      tree,
      await byIdOf(tree),
    )
    expect(page.ok && page.value.placement.finalName).toBe('Alpha.md')
    expect(page.ok && page.value.landedAs).toBeUndefined()
    expect(set.ok && set.value.placement.finalName).toBe('Daily')
    expect(set.ok && set.value.landedAs).toBeUndefined()
  })

  it('writes a Space’s order under its own Context when another Context shares its title', async () => {
    const group = (id: string) => ({ def: { id, title: 'Areas' }, spaces: [] })
    const tree = treeOf([group('ctx_a'), group('ctx_b')], [])
    const record = {
      entity: 'space' as const,
      id: 'sp-back',
      parent: { kind: 'context' as const, id: 'ctx_b' },
      members: [],
    }
    const placed = await placeRecord(
      root,
      record,
      undefined,
      bundleAt('Pommora'),
      tree,
      await byIdOf(tree),
    )
    if (!placed.ok) throw new Error('placement refused')
    await placed.value.writeOrder?.()
    expect((await readJsonAt(join(root, '.nexus', 'state.json'))).order).toEqual({
      spaces: { ctx_b: ['sp-back'] },
    })
  })

  it('answers no landedAs for a Context whose registry title differs from its folder’s name only by case', async () => {
    const record = {
      entity: 'context' as const,
      registry: { id: 'ctx_projects', title: 'Projects' },
      membership: [],
    }
    const tree = treeOf([], [])
    const placed = await placeRecord(
      root,
      record,
      undefined,
      bundleAt('projects'),
      tree,
      await byIdOf(tree),
    )
    if (!placed.ok) throw new Error('placement refused')
    expect(placed.value.placement.finalTitle).toBe('Projects')
    expect(placed.value.landedAs).toBeUndefined()
  })
})
