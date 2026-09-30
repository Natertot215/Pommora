import { describe, expect, it } from 'vitest'
import type { NexusTree } from '../Nexus/tree'
import { contextOptionsFor } from './contextOptions'

const tree = {
  contexts: [
    {
      def: { id: 'ctx_areas', title: 'Areas', singular: 'Area' },
      spaces: [
        { id: 'a1', kind: 'space', title: 'Personal', path: 'P', contextId: 'ctx_areas' },
        { id: 'a2', kind: 'space', title: 'Work', path: 'W', contextId: 'ctx_areas' },
      ],
    },
    {
      def: { id: 'ctx_topics', title: 'Topics', singular: 'Topic' },
      spaces: [{ id: 't1', kind: 'space', title: 'Reading', path: 'R', contextId: 'ctx_topics' }],
    },
  ],
  personalization: {},
} as unknown as NexusTree

describe('contextOptionsFor', () => {
  it('drops the excluded Space and leaves the cached array identical for every other caller', () => {
    const all = contextOptionsFor('ctx_areas', tree)
    expect(all.map((o) => o.value)).toEqual(['a1', 'a2'])
    expect(contextOptionsFor('ctx_areas', tree, 'a1').map((o) => o.value)).toEqual(['a2'])
    expect(contextOptionsFor('ctx_areas', tree)).toBe(all)
    expect(all.map((o) => o.value)).toEqual(['a1', 'a2'])
  })

  it('offers only the Spaces of the Context asked for', () => {
    expect(contextOptionsFor('ctx_topics', tree).map((o) => o.value)).toEqual(['t1'])
  })
})
