import { describe, it, expect } from 'vitest'
import { columnLabel, displayPropertyName } from '@renderer/Properties/Assignment/columnLabel'
import { contextsByIdOf } from '@renderer/Properties/contextIdentity'
import { RESERVED_PROPERTY_ID, type PropertyDefinition } from '@shared/properties'

const schema: PropertyDefinition[] = [
  { id: 'prop_status', name: 'Status', type: 'status' },
  { id: 'prop_due', name: 'Due', type: 'datetime' },
]

const NO_CONTEXTS = new Map()

describe('columnLabel', () => {
  it('resolves reserved built-in columns', () => {
    expect(columnLabel(RESERVED_PROPERTY_ID.title, schema, NO_CONTEXTS)).toBe('Title')
    expect(columnLabel(RESERVED_PROPERTY_ID.createdAt, schema, NO_CONTEXTS)).toBe('Created')
    expect(columnLabel(RESERVED_PROPERTY_ID.modifiedAt, schema, NO_CONTEXTS)).toBe('Modified')
  })

  it('resolves a Context column through the registry, and an unregistered one falls to its id', () => {
    const tree = {
      contexts: [{ def: { id: 'ctx_areas', title: 'Areas', singular: 'Area' }, spaces: [] }],
      personalization: {},
    } as unknown as import('@shared/types').NexusTree
    const contexts = contextsByIdOf(tree)
    expect(columnLabel('ctx_areas', schema, contexts)).toBe('Areas')
    expect(columnLabel('ctx_topics', schema, contexts)).toBe('ctx_topics')
  })

  // The header bug this guards: a caller that can't resolve Contexts renders their raw ids.
  it('falls back to the raw id when handed no contexts at all', () => {
    expect(columnLabel('ctx_areas', schema, NO_CONTEXTS)).toBe('ctx_areas')
  })

  it('resolves a user property through the schema name', () => {
    expect(columnLabel('prop_status', schema, NO_CONTEXTS)).toBe('Status')
  })

  it('falls back to the id for an unknown column (never throws)', () => {
    expect(columnLabel('prop_gone', schema, NO_CONTEXTS)).toBe('prop_gone')
  })
})

describe('displayPropertyName', () => {
  it('Title Cases each word only when the toggle is on, and leaves a cased name alone', () => {
    expect(displayPropertyName('due date', true)).toBe('Due Date')
    expect(displayPropertyName('tags', false)).toBe('tags')
    expect(displayPropertyName('PageID', true)).toBe('PageID')
  })

  it('columnLabel capitalizes the property branch only', () => {
    const lower: PropertyDefinition[] = [{ id: 'prop_tags', name: 'tags', type: 'multi_select' }]
    expect(columnLabel('prop_tags', lower, NO_CONTEXTS, true)).toBe('Tags')
    expect(columnLabel('prop_tags', lower, NO_CONTEXTS)).toBe('tags')
    expect(columnLabel('prop_gone', lower, NO_CONTEXTS, true)).toBe('prop_gone')
  })
})
