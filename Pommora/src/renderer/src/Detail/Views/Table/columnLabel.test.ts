import { describe, it, expect } from 'vitest'
import { columnLabel } from './columnLabel'
import { RESERVED_PROPERTY_ID, type PropertyDefinition } from '@shared/properties'

const schema: PropertyDefinition[] = [
  { id: 'prop_status', name: 'Status', type: 'status' },
  { id: 'prop_due', name: 'Due', type: 'datetime' },
]

describe('columnLabel', () => {
  it('resolves reserved built-in columns', () => {
    expect(columnLabel(RESERVED_PROPERTY_ID.title, schema)).toBe('Title')
    expect(columnLabel(RESERVED_PROPERTY_ID.createdAt, schema)).toBe('Created')
    expect(columnLabel(RESERVED_PROPERTY_ID.modifiedAt, schema)).toBe('Modified')
  })

  it('resolves context columns through the registry tree', () => {
    const tree = {
      contexts: [{ def: { id: 'ctx_areas', title: 'Areas', singular: 'Area' }, spaces: [] }],
    } as unknown as import('@shared/types').NexusTree
    expect(columnLabel('ctx_areas', schema, tree)).toBe('Areas')
    expect(columnLabel('ctx_topics', schema)).toBe('ctx_topics')
  })

  it('resolves a user property through the schema name', () => {
    expect(columnLabel('prop_status', schema)).toBe('Status')
  })

  it('falls back to the id for an unknown column (never throws)', () => {
    expect(columnLabel('prop_gone', schema)).toBe('prop_gone')
  })
})
