import { describe, expect, it } from 'vitest'
import type { PropertyDefinition } from '../Properties/properties'
import type { NexusTree } from '../Nexus/tree'
import { filterTargets } from './paneTargets'

describe('filterTargets', () => {
  const schema: PropertyDefinition[] = [
    { id: 'prop_sel', label: 'Sel', key: 'Sel', type: 'select' },
    { id: 'prop_done', label: 'Done', key: 'Done', type: 'checkbox' },
    { id: 'prop_tags', label: 'Tags', key: 'Tags', type: 'multiSelect' },
  ]
  it('targets lead Title · Location · the stamps, then registry Contexts, then schema', () => {
    const tree = {
      contexts: [
        { def: { id: 'ctx_areas', title: 'Areas', singular: 'Area' }, spaces: [] },
        { def: { id: 'ctx-crew', title: 'Crew', singular: 'Member' }, spaces: [] },
      ],
      config: { personalization: {} },
    } as unknown as NexusTree
    expect(filterTargets(schema, tree).map((t) => t.label)).toEqual([
      'Title',
      'Location',
      'Creation Time',
      'Last Modified',
      'Areas',
      'Crew',
      'Sel',
      'Done',
      'Tags',
    ])
  })

  it('a user-defined Context is a target on the same footing as a seeded one', () => {
    const tree = {
      contexts: [{ def: { id: 'ctx-crew', title: 'Crew', singular: 'Member' }, spaces: [] }],
      config: { personalization: {} },
    } as unknown as NexusTree
    const crew = filterTargets(schema, tree).find((t) => t.value === 'ctx-crew')
    expect(crew?.label).toBe('Crew')
  })

  it('offers no Context targets when there is no tree', () => {
    expect(filterTargets(schema, null).map((t) => t.label)).toEqual([
      'Title',
      'Location',
      'Creation Time',
      'Last Modified',
      'Sel',
      'Done',
      'Tags',
    ])
  })
})
