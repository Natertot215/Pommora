import { describe, expect, it } from 'vitest'
import type { NexusTree, SetNode } from '@pommora/core/Nexus/tree'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import { NO_SCHEMA, pickView, resolveContainerSchema } from './pickView'

const set = { kind: 'set', id: 's1', sets: [] } as unknown as SetNode

describe('pickView', () => {
  it('hands a view-less container the same minted default for the same schema', () => {
    const schema: PropertyDefinition[] = []
    expect(pickView(set, schema)).toBe(pickView({ ...set }, schema))
    expect(pickView(set, [])).not.toBe(pickView(set, schema))
  })

  it('gives an orphaned Set the one empty schema', () => {
    const tree = { collections: [] } as unknown as NexusTree
    expect(resolveContainerSchema(tree, set)).toBe(NO_SCHEMA)
  })
})
