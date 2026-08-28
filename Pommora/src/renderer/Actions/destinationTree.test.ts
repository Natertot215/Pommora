import { describe, expect, it } from 'vitest'
import type { CollectionNode, NexusTree } from '@shared/types'
import { containerTargets, contextTargets } from '@renderer/Actions/destinationTree'

const collections = [
  {
    kind: 'collection',
    id: 'col-notes',
    title: 'Notes',
    path: 'Notes',
    pages: [],
    sets: [
      {
        kind: 'set',
        id: 'set-daily',
        title: 'Daily',
        path: 'Notes/Daily',
        pages: [],
        sets: [
          { kind: 'set', id: 'set-am', title: 'Morning', path: 'Notes/Daily/Morning', pages: [] },
        ],
      },
      { kind: 'set', id: 'set-week', title: 'Weekly', path: 'Notes/Weekly', pages: [] },
    ],
  },
  { kind: 'collection', id: 'col-plain', title: 'Plain', path: 'Plain', pages: [], sets: [] },
] as unknown as CollectionNode[]

describe('containerTargets', () => {
  it('walks Collections and their Sets to any depth, in tree order', () => {
    expect(containerTargets(collections)).toEqual([
      {
        id: 'col-notes',
        label: 'Notes',
        path: 'Notes',
        children: [
          {
            id: 'set-daily',
            label: 'Daily',
            path: 'Notes/Daily',
            children: [
              { id: 'set-am', label: 'Morning', path: 'Notes/Daily/Morning', children: [] },
            ],
          },
          { id: 'set-week', label: 'Weekly', path: 'Notes/Weekly', children: [] },
        ],
      },
      { id: 'col-plain', label: 'Plain', path: 'Plain', children: [] },
    ])
  })

  it('carries both addresses, because its two consumers address differently', () => {
    const [notes] = containerTargets(collections)
    expect(notes.id).toBe('col-notes')
    expect(notes.path).toBe('Notes')
  })

  it('an empty nexus offers nowhere', () => {
    expect(containerTargets([])).toEqual([])
  })
})

describe('contextTargets', () => {
  const tree = {
    contexts: [
      { def: { id: 'ctx_areas', title: 'Areas' }, spaces: [] },
      { def: { id: 'ctx_projects', title: 'Projects' }, spaces: [] },
    ],
  } as unknown as NexusTree

  it('is flat and in registry order — no Context parents another', () => {
    expect(contextTargets(tree)).toEqual([
      { id: 'ctx_areas', label: 'Areas', path: '.nexus/contexts/Areas' },
      { id: 'ctx_projects', label: 'Projects', path: '.nexus/contexts/Projects' },
    ])
    expect(contextTargets(tree).every((t) => t.children === undefined)).toBe(true)
  })

  it('an unmigrated or absent tree offers nowhere', () => {
    expect(contextTargets(null)).toEqual([])
    expect(contextTargets({} as NexusTree)).toEqual([])
  })
})
