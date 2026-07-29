import { describe, it, expect } from 'vitest'
import {
  contextIdentityOf,
  contextIdsOf,
  isContextColumnId,
  spaceIdentityOf,
  spacesByIdOf,
} from './contextIdentity'
import type { NexusTree } from '@shared/types'

const mkTree = (): NexusTree =>
  ({
    contexts: [
      {
        def: { id: 'ctx_areas', title: 'Areas', singular: 'Area', icon: 'briefcase' },
        spaces: [
          {
            id: 'a1',
            kind: 'space',
            title: 'Personal',
            path: 'P',
            contextId: 'ctx_areas',
            color: 'blue',
          },
          {
            id: 'a2',
            kind: 'space',
            title: 'Work',
            path: 'W',
            contextId: 'ctx_areas',
            icon: 'anchor',
          },
        ],
      },
      {
        def: { id: 'ctx_topics', title: 'Topics', singular: 'Topic' },
        spaces: [{ id: 't1', kind: 'space', title: 'Reading', path: 'R', contextId: 'ctx_topics' }],
      },
    ],
    personalization: {},
  }) as unknown as NexusTree

const tree = mkTree()

describe('spacesByIdOf', () => {
  it('maps every Space id to its title, color, owning Context, and a renderable icon', () => {
    const m = spacesByIdOf(tree)
    expect(m.get('a1')).toEqual({
      title: 'Personal',
      color: 'blue',
      icon: 'layout-grid',
      contextId: 'ctx_areas',
    })
    expect(m.get('a2')?.icon).toBe('anchor')
    expect(m.get('t1')).toEqual({
      title: 'Reading',
      color: undefined,
      icon: 'layout-grid',
      contextId: 'ctx_topics',
    })
  })

  it('returns undefined for an unknown id', () => {
    expect(spacesByIdOf(tree).get('nope')).toBeUndefined()
  })

  it('hands back the same map instance for a tree, and a fresh one per tree', () => {
    expect(spacesByIdOf(tree)).toBe(spacesByIdOf(tree))
    expect(spacesByIdOf(mkTree())).not.toBe(spacesByIdOf(tree))
  })

  it('is empty on an unmigrated tree', () => {
    expect(spacesByIdOf({ contexts: [], personalization: {} } as unknown as NexusTree).size).toBe(0)
  })
})

describe('context accessors', () => {
  it('lists Context ids in registry order', () => {
    expect(contextIdsOf(tree)).toEqual(['ctx_areas', 'ctx_topics'])
    expect(contextIdsOf(null)).toEqual([])
  })

  it('resolves a Context to its titles and a renderable icon', () => {
    expect(contextIdentityOf(tree, 'ctx_areas')).toEqual({
      title: 'Areas',
      singular: 'Area',
      icon: 'briefcase',
    })
    expect(contextIdentityOf(tree, 'ctx_topics')?.icon).toBe('layout-grid')
    expect(contextIdentityOf(tree, 'a1')).toBeUndefined()
  })

  it('resolves a Space id and tells Context columns from Space ids', () => {
    expect(spaceIdentityOf(tree, 'a1')?.title).toBe('Personal')
    expect(spaceIdentityOf(null, 'a1')).toBeUndefined()
    expect(isContextColumnId(tree, 'ctx_areas')).toBe(true)
    expect(isContextColumnId(tree, 'a1')).toBe(false)
    expect(isContextColumnId(null, 'ctx_areas')).toBe(false)
  })
})

// A personalized Space glyph must reach every surface that resolves through the seam, not just the
// sidebar — a nexus that sets its own default otherwise wears two different icons for one Space.
// The override must name a CURATED glyph; `entityIcon` rejects anything else and keeps the seed.
it('an icon-less Space takes the USER default glyph, not the curated seed', () => {
  const personalized = {
    ...mkTree(),
    personalization: { defaultIcons: { space: 'folder-open' } },
  } as NexusTree
  expect(spaceIdentityOf(personalized, 'a1')?.icon).toBe('folder-open')
  expect(contextIdentityOf(personalized, 'ctx_topics')?.icon).toBe('folder-open')
  // A Space carrying its OWN icon still wins over the default.
  expect(spaceIdentityOf(mkTree(), 'a1')?.icon).toBe('layout-grid')
})
