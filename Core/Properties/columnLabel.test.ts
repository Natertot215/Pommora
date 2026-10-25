import { describe, it, expect } from 'vitest'
import { columnLabel } from './columnLabel'
import { contextsByIdOf } from '../Contexts/contextIdentity'
import { FILEDATA, type PropertyDefinition } from './properties'
import { contextColumn, propertyColumn, resolveColumn } from '../Views/Pipeline/columns'

const schema: PropertyDefinition[] = [
  { id: 'prop_status', label: 'Status', key: 'Status', type: 'status' },
  { id: 'prop_due', label: 'Due Date', key: 'due_date', type: 'dateTime' },
]

const NO_CONTEXTS = new Map()
const filedata = (id: string) => resolveColumn(id, schema, [])!

describe('columnLabel', () => {
  it('names each Filedata column', () => {
    expect(columnLabel(filedata(FILEDATA.title.id), NO_CONTEXTS)).toBe('Title')
    expect(columnLabel(filedata(FILEDATA.createdAt.id), NO_CONTEXTS)).toBe('Creation Time')
    expect(columnLabel(filedata(FILEDATA.modifiedAt.id), NO_CONTEXTS)).toBe('Last Modified')
  })

  it('resolves a Context column through the registry, and an unregistered one falls to its id', () => {
    const tree = {
      contexts: [{ def: { id: 'ctx_areas', title: 'Areas', singular: 'Area' }, spaces: [] }],
      config: { personalization: {} },
    } as unknown as import('../Nexus/tree').NexusTree
    const contexts = contextsByIdOf(tree)
    expect(columnLabel(contextColumn('ctx_areas'), contexts)).toBe('Areas')
    expect(columnLabel(contextColumn('ctx_topics'), contexts)).toBe('ctx_topics')
  })

  // The header bug this guards: a caller that can't resolve Contexts renders their raw ids.
  it('falls back to the raw id when handed no contexts at all', () => {
    expect(columnLabel(contextColumn('ctx_areas'), NO_CONTEXTS)).toBe('ctx_areas')
  })

  it('resolves a user property through its label', () => {
    expect(columnLabel(propertyColumn(schema[0]), NO_CONTEXTS)).toBe('Status')
    expect(columnLabel(propertyColumn(schema[1]), NO_CONTEXTS)).toBe('Due Date')
  })
})
