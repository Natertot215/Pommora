import { describe, it, expect } from 'vitest'
import { buildResolveContext } from './resolveContext'
import { DEFAULT_LABELS, type NexusTree } from '@shared/types'

const tree = {
  contexts: [
    {
      def: { id: '_tier1', title: 'Areas', singular: 'Area' },
      spaces: [
        {
          id: 'a1',
          kind: 'space',
          title: 'Personal',
          path: 'P',
          contextId: '_tier1',
          color: 'blue',
        },
      ],
    },
    {
      def: { id: '_tier2', title: 'Topics', singular: 'Topic' },
      spaces: [{ id: 't1', kind: 'space', title: 'Reading', path: 'R', contextId: '_tier2' }],
    },
  ],
  labels: DEFAULT_LABELS,
} as unknown as NexusTree

describe('buildResolveContext', () => {
  it('bundles schema + the identity seam Space map + labels', () => {
    const ctx = buildResolveContext(tree, [])
    expect(ctx.schema).toEqual([])
    expect(ctx.labels).toBe(DEFAULT_LABELS)
    expect(ctx.contextsById.get('a1')?.title).toBe('Personal')
    expect(ctx.contextsById.get('t1')?.title).toBe('Reading')
  })

  it('returns undefined for an unknown id', () => {
    expect(buildResolveContext(tree, []).contextsById.get('nope')).toBeUndefined()
  })
})
