import { describe, it, expect } from 'vitest'
import fixture from '@shared/__fixtures__/collection-with-status.json'
import registry from '@shared/__fixtures__/registry.json'
import { savedView, type SavedView } from '@shared/views'
import { propertyDefinition, type PropertyDefinition } from '@shared/properties'
import { resolveColumns } from './columns'

const schema: PropertyDefinition[] = [
  { id: 'prop_a', name: 'A', type: 'select' },
  { id: 'prop_b', name: 'B', type: 'number' },
]

const CONTEXT_IDS = ['ctx_areas', 'ctx_topics', 'ctx_projects', 'ctxC']

function view(over: Partial<SavedView>): SavedView {
  return { id: 'v', name: 'V', type: 'table', property_order: [], hidden_properties: [], ...over }
}

const ids = (cols: { id: string }[]): string[] => cols.map((c) => c.id)

describe('resolveColumns — fixture', () => {
  it('emits propertyOrder verbatim, never auto-shows an unaccounted prop, no _modified_at default-on', () => {
    const v = savedView.parse(fixture.views[0])
    const fixtureSchema = fixture.properties.map((id) =>
      propertyDefinition.parse((registry as Record<string, unknown>)[id]),
    )
    const cols = resolveColumns(v, fixtureSchema, CONTEXT_IDS)
    expect(ids(cols)).toEqual(['prop_status', '_title', 'ctx_projects', 'ctx_topics', 'ctx_areas'])
    expect(cols.map((c) => c.kind)).toEqual(['property', 'title', 'context', 'context', 'context'])
    // prop_when is in the schema but in neither list → the allowlist keeps it off the table
    expect(cols.some((c) => c.id === 'prop_when')).toBe(false)
    // fixture hides _modified_at and it is not default-on → never a column
    expect(cols.some((c) => c.id === '_modified_at')).toBe(false)
  })
})

describe('resolveColumns — rules', () => {
  it('context columns are default-OFF — absent from propertyOrder means absent, period', () => {
    const cols = resolveColumns(view({ property_order: ['_title'] }), schema, CONTEXT_IDS)
    expect(ids(cols)).toEqual(['_title'])
  })

  it('a context column renders when propertyOrder explicitly reveals it', () => {
    const cols = resolveColumns(
      view({ property_order: ['_title', 'ctxC', 'ctx_areas'] }),
      schema,
      CONTEXT_IDS,
    )
    expect(ids(cols)).toEqual(['_title', 'ctxC', 'ctx_areas'])
    expect(cols.map((c) => c.kind)).toEqual(['title', 'context', 'context'])
  })

  it('never auto-shows a schema prop absent from propertyOrder (added-after-view stays hidden)', () => {
    const cols = resolveColumns(view({ property_order: ['_title', 'prop_a'] }), schema, CONTEXT_IDS)
    expect(ids(cols)).toEqual(['_title', 'prop_a'])
    expect(cols.some((c) => c.id === 'prop_b')).toBe(false)
  })

  it('renders _modified_at only when explicitly placed (def-less, kind modified)', () => {
    const cols = resolveColumns(
      view({ property_order: ['_title', '_modified_at'] }),
      schema,
      CONTEXT_IDS,
    )
    expect(ids(cols)).toEqual(['_title', '_modified_at'])
    expect(cols.find((c) => c.id === '_modified_at')?.kind).toBe('modified')
  })

  it('excludes a hidden property, but never hides _title (front-inserted)', () => {
    const cols = resolveColumns(
      view({
        property_order: ['_title', 'prop_a', 'ctxC'],
        hidden_properties: ['prop_a', 'ctxC', '_title'],
      }),
      schema,
      CONTEXT_IDS,
    )
    expect(ids(cols)).toEqual(['_title'])
  })

  it('front-inserts Title when propertyOrder omits it', () => {
    const cols = resolveColumns(view({ property_order: ['prop_a'] }), schema, CONTEXT_IDS)
    expect(cols[0]).toEqual({ id: '_title', kind: 'title' })
  })

  it('skips a stale propertyOrder id absent from schema AND registry', () => {
    const cols = resolveColumns(
      view({ property_order: ['_title', 'prop_ghost', 'ctx_gone'] }),
      schema,
      CONTEXT_IDS,
    )
    expect(cols.some((c) => c.id === 'prop_ghost')).toBe(false)
    expect(cols.some((c) => c.id === 'ctx_gone')).toBe(false)
  })

  it('maps each column id to its kind', () => {
    const cols = resolveColumns(
      view({ property_order: ['_title', 'ctx_areas', 'ctxC', 'prop_a', '_modified_at'] }),
      schema,
      CONTEXT_IDS,
    )
    const kindOf = (id: string): string | undefined => cols.find((c) => c.id === id)?.kind
    expect(kindOf('_title')).toBe('title')
    expect(kindOf('ctx_areas')).toBe('context')
    expect(kindOf('ctxC')).toBe('context')
    expect(kindOf('prop_a')).toBe('property')
    expect(kindOf('_modified_at')).toBe('modified')
  })
})
