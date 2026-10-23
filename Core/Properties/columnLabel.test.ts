import { describe, it, expect } from 'vitest'
import { columnLabel } from './columnLabel'
import { contextsByIdOf } from '../Contexts/contextIdentity'
import { FILEDATA, type PropertyDefinition } from './properties'

const schema: PropertyDefinition[] = [
  { id: 'prop_status', label: 'Status', key: 'Status', type: 'status' },
  { id: 'prop_due', label: 'Due Date', key: 'due_date', type: 'dateTime' },
]

const NO_CONTEXTS = new Map()

describe('columnLabel', () => {
  it('names each Filedata column', () => {
    expect(columnLabel(FILEDATA.title.id, schema, NO_CONTEXTS)).toBe('Title')
    expect(columnLabel(FILEDATA.createdAt.id, schema, NO_CONTEXTS)).toBe('Creation Time')
    expect(columnLabel(FILEDATA.modifiedAt.id, schema, NO_CONTEXTS)).toBe('Last Modified')
  })

  it('resolves a Context column through the registry, and an unregistered one falls to its id', () => {
    const tree = {
      contexts: [{ def: { id: 'ctx_areas', title: 'Areas', singular: 'Area' }, spaces: [] }],
      config: { personalization: {} },
    } as unknown as import('../Nexus/tree').NexusTree
    const contexts = contextsByIdOf(tree)
    expect(columnLabel('ctx_areas', schema, contexts)).toBe('Areas')
    expect(columnLabel('ctx_topics', schema, contexts)).toBe('ctx_topics')
  })

  // The header bug this guards: a caller that can't resolve Contexts renders their raw ids.
  it('falls back to the raw id when handed no contexts at all', () => {
    expect(columnLabel('ctx_areas', schema, NO_CONTEXTS)).toBe('ctx_areas')
  })

  it('resolves a user property through its label', () => {
    expect(columnLabel('prop_status', schema, NO_CONTEXTS)).toBe('Status')
    expect(columnLabel('prop_due', schema, NO_CONTEXTS)).toBe('Due Date')
  })

  it('falls back to the id for an unknown column (never throws)', () => {
    expect(columnLabel('prop_gone', schema, NO_CONTEXTS)).toBe('prop_gone')
  })
})
