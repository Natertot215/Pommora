import { describe, it, expect } from 'vitest'
import { buildContextsById, buildResolveContext } from './resolveContext'
import { DEFAULT_LABELS, type NexusTree } from '@shared/types'

const tree = {
  contextGroups: [
    {
      def: { id: '_tier1', title: 'Areas', singular: 'Area' },
      spaces: [
        { id: 'a1', kind: 'space', title: 'Personal', path: 'P', contextId: '_tier1', color: 'blue' },
      ],
    },
    {
      def: { id: '_tier2', title: 'Topics', singular: 'Topic' },
      spaces: [{ id: 't1', kind: 'space', title: 'Reading', path: 'R', contextId: '_tier2' }],
    },
    {
      def: { id: '_tier3', title: 'Projects', singular: 'Project' },
      spaces: [{ id: 'p1', kind: 'space', title: 'Pommora', path: 'Po', contextId: '_tier3' }],
    },
  ],
  labels: DEFAULT_LABELS,
} as unknown as NexusTree

describe('buildContextsById', () => {
  it('maps each context ULID to its title, icon, and color (Areas only)', () => {
    const m = buildContextsById(tree)
    expect(m.get('a1')).toEqual({ title: 'Personal', color: 'blue', icon: 'layout-grid' })
    expect(m.get('t1')).toEqual({ title: 'Reading', color: undefined, icon: 'layout-grid' })
    expect(m.get('p1')).toEqual({ title: 'Pommora', color: undefined, icon: 'layout-grid' })
  })

  it('returns undefined for an unknown id', () => {
    expect(buildContextsById(tree).get('nope')).toBeUndefined()
  })
})

describe('buildResolveContext', () => {
  it('bundles schema + contextsById + labels', () => {
    const ctx = buildResolveContext(tree, [])
    expect(ctx.schema).toEqual([])
    expect(ctx.labels).toBe(DEFAULT_LABELS)
    expect(ctx.contextsById.get('a1')?.title).toBe('Personal')
  })
})
