import { describe, it, expect } from 'vitest'
import { ASSETS_DIR_REL } from '../Paths/nexusPaths'
import type { CollectionNode, NexusTree, SetNode, SpaceNode } from './tree'
import {
  containerSchema,
  containerTrailWhere,
  moveNodeInTree,
  NO_SCHEMA,
  owningCollection,
  placeNode,
  removeNodeInTree,
} from './treePatch'
import { DEFAULT_COMMANDS } from '../Actions/commands'

function tree(): NexusTree {
  const notes: CollectionNode = {
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
  }
  const work: CollectionNode = {
    kind: 'collection',
    id: 'c2',
    title: 'Work',
    path: 'Work',
    sets: [],
    pages: [],
  }
  return {
    nexus: { id: 'nx', rootPath: '/x', name: 'x' },
    contexts: [],
    collections: [notes, work],
    config: {
      profileImage: null,
      homepage: { headingIconHidden: false },
      crops: {},
      pageMetadata: {},
      order: { spaces: {} },
      personalization: {},
      commands: DEFAULT_COMMANDS,
      assetDirectory: ASSETS_DIR_REL,
      excluded: [],
      registry: [],
    },
  }
}

describe('removeNodeInTree', () => {
  it('removes a page from a nested set', () => {
    const t = removeNodeInTree(tree(), 'Notes/Sub/B.md')
    expect(t?.collections[0].sets[0].pages).toHaveLength(0)
  })

  it('removes a whole collection', () => {
    const t = removeNodeInTree(tree(), 'Work')
    expect(t?.collections.map((c) => c.id)).toEqual(['c1'])
  })
})

const HOME = '.nexus/contexts/Areas/Home'
const space = (
  id: string,
  title: string,
  contextTitle = 'Areas',
  contextId = 'ctx1',
): SpaceNode => ({
  kind: 'space',
  id,
  title,
  path: `.nexus/contexts/${contextTitle}/${title}`,
  contextId,
  headingIconHidden: false,
})
const withContexts = (): NexusTree => ({
  ...tree(),
  contexts: [
    { def: { id: 'ctx1', title: 'Areas' }, spaces: [space('sp1', 'Home')] },
    { def: { id: 'ctx2', title: 'Topics' }, spaces: [] },
  ],
})
const deepSet = (): SetNode => ({
  kind: 'set',
  id: 's9',
  title: 'Deep',
  path: 'Notes/Sub/Deep',
  sets: [],
  pages: [{ kind: 'page', id: 'p9', title: 'C', path: 'Notes/Sub/Deep/C.md' }],
})
const deepTree = (): NexusTree => {
  const t = tree()
  t.collections[0].sets[0].sets = [deepSet()]
  return t
}

describe('placeNode', () => {
  it('lands a page where its parent’s order ranks it', () => {
    const base = tree()
    base.collections[0].pageOrder = ['p3', 'p1']
    const t = placeNode(base, { kind: 'page', id: 'p3', title: 'C', path: 'Notes/C.md' })
    expect(t?.collections[0].pages.map((p) => p.id)).toEqual(['p3', 'p1'])
  })

  it('ranks an id the order doesn’t list after the listed ones, by title', () => {
    const base = tree()
    base.collections[0].pages.push({ kind: 'page', id: 'p8', title: 'Z', path: 'Notes/Z.md' })
    base.collections[0].pageOrder = ['p8']
    const t = placeNode(base, { kind: 'page', id: 'p0', title: 'B', path: 'Notes/B.md' })
    expect(t?.collections[0].pages.map((p) => p.id)).toEqual(['p8', 'p1', 'p0'])
  })

  it('replaces what the tree held at the same path', () => {
    const t = placeNode(tree(), { kind: 'page', id: 'p7', title: 'A', path: 'Notes/A.md' })
    expect(t?.collections[0].pages.map((p) => p.id)).toEqual(['p7'])
  })

  it('lands a Set with its subtree under its parent, by the parent’s set order', () => {
    const base = tree()
    base.collections[1].setOrder = ['s9']
    const moved = { ...deepSet(), path: 'Work/Deep', pages: [] }
    const t = placeNode(base, moved)
    expect(t?.collections[1].sets).toEqual([moved])
  })

  it('lands a Collection at the root, by the Collection order', () => {
    const base = tree()
    base.config.order = { ...base.config.order, collections: ['c3', 'c1', 'c2'] }
    const t = placeNode(base, {
      kind: 'collection',
      id: 'c3',
      title: 'Inbox',
      path: 'Inbox',
      sets: [],
      pages: [],
    })
    expect(t?.collections.map((c) => c.id)).toEqual(['c3', 'c1', 'c2'])
  })

  it('lands a Space in its Context, by that Context’s Space order, and refuses one whose Context isn’t held', () => {
    const base = withContexts()
    base.config.order = { ...base.config.order, spaces: { ctx1: ['sp2', 'sp1'] } }
    const t = placeNode(base, space('sp2', 'Work'))
    expect(t?.contexts[0].spaces.map((s) => s.id)).toEqual(['sp2', 'sp1'])
    expect(placeNode(base, space('sp3', 'Odd', 'Nowhere', 'ctx9'))).toBeNull()
  })
})

describe('moveNodeInTree', () => {
  it('renames a page in place, title and path', () => {
    const t = moveNodeInTree(tree(), 'Notes/A.md', 'Notes/Alpha.md')
    expect(t?.collections[0].pages).toEqual([
      { kind: 'page', id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' },
    ])
  })

  it('moves a page to another container', () => {
    const t = moveNodeInTree(tree(), 'Notes/Sub/B.md', 'Work/B.md')
    expect(t?.collections[0].sets[0].pages).toEqual([])
    expect(t?.collections[1].pages.map((p) => p.path)).toEqual(['Work/B.md'])
  })

  it('moves a Set with its subtree, reparenting every descendant path', () => {
    const t = moveNodeInTree(deepTree(), 'Notes/Sub', 'Work/Sub')
    const moved = t?.collections[1].sets.find((s) => s.id === 's1')
    expect(moved?.pages[0].path).toBe('Work/Sub/B.md')
    expect(moved?.sets?.[0].path).toBe('Work/Sub/Deep')
    expect(moved?.sets?.[0].pages[0].path).toBe('Work/Sub/Deep/C.md')
    expect(t?.collections[0].sets).toEqual([])
  })

  it('renames a Collection at the root without corrupting its descendants’ paths', () => {
    const t = moveNodeInTree(deepTree(), 'Notes', 'Diary')
    const diary = t?.collections.find((c) => c.id === 'c1')
    expect([diary?.path, diary?.title]).toEqual(['Diary', 'Diary'])
    expect(diary?.pages[0].path).toBe('Diary/A.md')
    expect(diary?.sets[0].sets?.[0].pages[0].path).toBe('Diary/Sub/Deep/C.md')
  })

  it('renames a Space within its Context', () => {
    const t = moveNodeInTree(withContexts(), HOME, '.nexus/contexts/Areas/House')
    expect(t?.contexts[0].spaces[0]).toMatchObject({
      id: 'sp1',
      title: 'House',
      path: '.nexus/contexts/Areas/House',
    })
  })

  it('renames a Context group, moving every member Space path under it', () => {
    const t = moveNodeInTree(withContexts(), '.nexus/contexts/Areas', '.nexus/contexts/Realms')
    expect(t?.contexts[0].def).toEqual({ id: 'ctx1', title: 'Realms' })
    expect(t?.contexts[0].spaces[0].path).toBe('.nexus/contexts/Realms/Home')
  })

  it('refuses a move that changes what the folder is, or names nothing held', () => {
    expect(moveNodeInTree(tree(), 'Work', 'Notes/Work')).toBeNull()
    expect(moveNodeInTree(tree(), 'Notes/Sub', 'Sub')).toBeNull()
    expect(moveNodeInTree(withContexts(), HOME, '.nexus/contexts/Topics/Home')).toBeNull()
    expect(moveNodeInTree(withContexts(), '.nexus/contexts/Areas', 'Areas')).toBeNull()
    expect(moveNodeInTree(tree(), 'Notes/Ghost.md', 'Work/Ghost.md')).toBeNull()
  })
})

describe('owningCollection', () => {
  it('names the Collection a path starts in, a Collection its own owner', () => {
    const t = tree()
    for (const path of ['Notes', 'Notes/A.md', 'Notes/Sub', 'Notes/Sub/B.md'])
      expect(owningCollection(t, path)).toBe(t.collections[0])
    expect(owningCollection(t, 'Tasks/T.md')).toBeUndefined()
    expect(owningCollection(t, '.nexus/contexts/Areas/Home')).toBeUndefined()
    expect(owningCollection(t, 'Note')).toBeUndefined()
    expect(owningCollection(t, t.collections[0].sets[0])).toBe(t.collections[0])
    const detached = { ...t.collections[1] }
    expect(owningCollection(null, detached)).toBe(detached)
  })

  it('hands an unowned path the one empty schema', () => {
    expect(containerSchema(tree(), 'Tasks/T.md')).toBe(NO_SCHEMA)
    expect(containerSchema(null, 'Notes/A.md')).toBe(NO_SCHEMA)
  })
})

describe('containerTrailWhere', () => {
  it('returns the matched container under every container above it', () => {
    const t = tree()
    const trail = containerTrailWhere(t, (n) => n.id === 's1')
    expect(trail?.map((n) => n.id)).toEqual(['c1', 's1'])
    expect(containerTrailWhere(t, (n) => n.id === 'c2')?.map((n) => n.id)).toEqual(['c2'])
    expect(containerTrailWhere(t, () => false)).toBeNull()
  })
})
