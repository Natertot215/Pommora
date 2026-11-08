import { describe, it, expect } from 'vitest'
import fixture from '../../Testing/fixtures/collection-with-status.json'
import { FIXTURE_DEFS } from '../../Testing/definitions'
import { savedView, type SavedView } from '../views'
import { FILEDATA, type PropertyDefinition } from '../../Properties/properties'
import { linkedSpacesTree } from '../../Testing/testTree'
import {
  hiddenListIds,
  hideShown,
  itemColumns,
  placeInShown,
  resolveColumn,
  resolveColumns,
  unhide,
} from './columns'

const schema: PropertyDefinition[] = [
  { id: 'prop_a', label: 'A', key: 'A', type: 'select' },
  { id: 'prop_b', label: 'B', key: 'B', type: 'number' },
]

const CONTEXT_IDS = ['ctx_areas', 'ctx_topics', 'ctx_projects', 'ctxC']

function view(over: Partial<SavedView>): SavedView {
  return { id: 'v', name: 'V', type: 'table', property_order: [], hidden_properties: [], ...over }
}

const ids = (cols: { id: string }[]): string[] => cols.map((c) => c.id)

describe('resolveColumns — fixture', () => {
  it('emits propertyOrder verbatim, never auto-shows an unaccounted prop, no _modified_at default-on', () => {
    const v = savedView.parse(fixture.views[0])
    const fixtureSchema = fixture.properties.map((id) => FIXTURE_DEFS[id])
    const cols = resolveColumns(v, fixtureSchema, CONTEXT_IDS)
    expect(ids(cols)).toEqual(['prop_status', '_title', 'ctx_projects', 'ctx_topics', 'ctx_areas'])
    expect(cols.map((c) => c.kind)).toEqual(['property', 'title', 'context', 'context', 'context'])
    expect(cols.some((c) => c.id === 'prop_when')).toBe(false)
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

  it('renders _modified_at only when explicitly placed (def-less, kind stamp)', () => {
    const cols = resolveColumns(
      view({ property_order: ['_title', '_modified_at'] }),
      schema,
      CONTEXT_IDS,
    )
    expect(ids(cols)).toEqual(['_title', '_modified_at'])
    expect(cols.find((c) => c.id === '_modified_at')?.kind).toBe('stamp')
  })

  it('_created_at in property_order emits a stamp column', () => {
    const cols = resolveColumns(
      view({ property_order: ['_title', '_created_at'] }),
      schema,
      CONTEXT_IDS,
    )
    expect(ids(cols)).toEqual(['_title', '_created_at'])
    expect(cols.find((c) => c.id === '_created_at')?.kind).toBe('stamp')
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
    expect(cols[0]).toEqual({ id: '_title', kind: 'title', type: 'title' })
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

  it("carries each column's kind, type, and definition", () => {
    const cols = resolveColumns(
      view({ property_order: ['_title', 'ctx_areas', 'ctxC', 'prop_a', '_modified_at'] }),
      schema,
      CONTEXT_IDS,
    )
    const kindOf = (id: string): string | undefined => cols.find((c) => c.id === id)?.kind
    const typeOf = (id: string): string | undefined => cols.find((c) => c.id === id)?.type
    expect(kindOf('_title')).toBe('title')
    expect(kindOf('ctx_areas')).toBe('context')
    expect(kindOf('ctxC')).toBe('context')
    expect(kindOf('prop_a')).toBe('property')
    expect(kindOf('_modified_at')).toBe('stamp')
    expect(cols.find((c) => c.id === 'prop_a')?.def).toBe(schema[0])
    expect(typeOf('_modified_at')).toBe('lastEditedTime')
  })
})

describe('resolveColumn', () => {
  it('classifies an id once: Title and the stamps by their Filedata type, a Context by the registry ids, a property by its definition', () => {
    expect(resolveColumn(FILEDATA.title.id, schema, CONTEXT_IDS)).toEqual({
      id: '_title',
      kind: 'title',
      type: 'title',
    })
    expect(resolveColumn('_modified_at', schema, CONTEXT_IDS)).toEqual({
      id: '_modified_at',
      kind: 'stamp',
      type: 'lastEditedTime',
    })
    expect(resolveColumn('ctx_areas', schema, CONTEXT_IDS)).toEqual({
      id: 'ctx_areas',
      kind: 'context',
      type: 'context',
    })
    expect(resolveColumn('prop_b', schema, CONTEXT_IDS)).toEqual({
      id: 'prop_b',
      kind: 'property',
      type: 'number',
      def: schema[1],
    })
  })

  it('answers nothing for Location, an id the schema no longer holds, or a Context id outside the registry ids', () => {
    expect(resolveColumn(FILEDATA.location.id, schema, CONTEXT_IDS)).toBeUndefined()
    expect(resolveColumn('prop_ghost', schema, CONTEXT_IDS)).toBeUndefined()
    expect(resolveColumn('ctx_areas', schema, [])).toBeUndefined()
  })
})

describe('itemColumns', () => {
  const tree = (rowOrder?: string[]) => {
    const base = linkedSpacesTree()
    const [first, ...rest] = base.contexts
    return {
      ...base,
      contexts: [{ ...first, spaces: [{ ...first.spaces[0], rowOrder }] }, ...rest],
      config: { ...base.config, order: { ...base.config.order, contexts: ['g2', 'g1'] } },
    }
  }

  it("a page lists the Nexus's Context order and its schema's order, with no stamps", () => {
    const item = itemColumns(tree(), schema, 'p1')
    expect(ids(item.contexts)).toEqual(['g2', 'g1'])
    expect(ids(item.properties)).toEqual(['prop_a', 'prop_b'])
  })

  it("a Space's own row order leads both groups", () => {
    const item = itemColumns(tree(['prop_b', 'g1']), schema, 'a1')
    expect(ids(item.contexts)).toEqual(['g1', 'g2'])
    expect(ids(item.properties)).toEqual(['prop_b', 'prop_a'])
  })
})

const [title, createdAt, modifiedAt] = [
  FILEDATA.title.id,
  FILEDATA.createdAt.id,
  FILEDATA.modifiedAt.id,
]
const [areas, projects] = ['ctx_areas', 'ctx_projects']
const stamps = [createdAt, modifiedAt]

const def = (id: string): PropertyDefinition => ({ id, label: id, key: id, type: 'select' })

const listed = (property_order: string[], hidden_properties: string[]): SavedView =>
  view({ property_order, hidden_properties })

describe('hiddenListIds', () => {
  it('orders hidden props by the COLLECTION schema, not the hidden array', () => {
    const schema = [def('a'), def('b'), def('c')]
    expect(hiddenListIds(listed(['b'], ['c', 'a']), schema, [])).toEqual(['a', 'c', ...stamps])
  })

  it('lists non-shown contexts first (registry order), then props, then the stamps, drops stale ids', () => {
    const schema = [def('a')]
    expect(
      hiddenListIds(listed([], [areas, modifiedAt, 'stale', 'a']), schema, [areas, projects]),
    ).toEqual([areas, projects, 'a', createdAt, modifiedAt])
  })

  it('lists both stamps on a view that shows neither', () => {
    expect(hiddenListIds(listed([title], []), [], [])).toEqual([createdAt, modifiedAt])
  })

  it('omits a stamp the view shows', () => {
    expect(hiddenListIds(listed([title, modifiedAt], []), [], [])).toEqual([createdAt])
  })

  it('a context in neither list sits in the hidden zone (default-OFF reveal path)', () => {
    expect(hiddenListIds(listed(['ctxA'], []), [], ['ctxA', 'ctxB'])).toEqual(['ctxB', ...stamps])
  })

  it('surfaces an unaccounted prop (in schema, in neither list) so it stays revealable', () => {
    const schema = [def('a'), def('b')]
    expect(hiddenListIds(listed(['a'], []), schema, [])).toEqual(['b', ...stamps])
  })

  it('interleaves hidden and unaccounted props in collection order', () => {
    const schema = [def('a'), def('b'), def('c')]
    expect(hiddenListIds(listed(['b'], ['a']), schema, [])).toEqual(['a', 'c', ...stamps])
  })
})

describe('placeInShown', () => {
  it('reorders a shown row, writing the full visible order verbatim with hidden ids trailing', () => {
    const v = listed([title, 'a', 'b', 'h', 'c'], ['h'])
    expect(placeInShown(v, [title, 'a', 'b', 'c'], 'c', 1)).toEqual({
      property_order: [title, 'c', 'a', 'b', 'h'],
      hidden_properties: ['h'],
    })
  })

  it('unhides a dragged-in row at the slot and lifts its flag', () => {
    const v = listed([title, 'a', 'b', 'h'], ['h'])
    expect(placeInShown(v, [title, 'a', 'b'], 'h', 2)).toEqual({
      property_order: [title, 'a', 'h', 'b'],
      hidden_properties: [],
    })
  })

  it('appends past the last shown row — a hidden id never in property_order lands', () => {
    const v = listed(['a'], ['h'])
    expect(placeInShown(v, ['a'], 'h', 1)).toEqual({
      property_order: ['a', 'h'],
      hidden_properties: [],
    })
  })

  it('reveals an unaccounted prop — drag-in writes it into property_order (then it shows)', () => {
    const v = listed([title, 'a'], [])
    expect(placeInShown(v, [title, 'a'], 'new', 2)).toEqual({
      property_order: [title, 'a', 'new'],
      hidden_properties: [],
    })
  })

  it('preserves foreign property_order ids at the tail', () => {
    const v = listed(['a', 'future_key', 'b'], [])
    expect(placeInShown(v, ['a', 'b'], 'b', 0).property_order).toEqual(['b', 'a', 'future_key'])
  })

  it('writes default-on Context/title columns explicitly even when absent from property_order', () => {
    expect(placeInShown(listed([], []), [title, areas], areas, 0).property_order).toEqual([
      areas,
      title,
    ])
  })
})

describe('hideShown / unhide', () => {
  it('hide appends the flag once and never touches property_order', () => {
    const v = listed(['a', 'b'], [])
    expect(hideShown(v, 'a')).toEqual({ hidden_properties: ['a'] })
    expect(hideShown(listed(['a'], ['a']), 'a')).toEqual({ hidden_properties: ['a'] })
  })

  it('unhide lifts the flag AND places an unplaced prop in the order (allowlist reveal)', () => {
    // No remembered slot (a title-only minted view) → appended, so the allowlist actually shows it.
    expect(unhide(listed([], ['a', 'b']), 'a')).toEqual({
      property_order: ['a'],
      hidden_properties: ['b'],
    })
    expect(unhide(listed(['a'], ['a']), 'a')).toEqual({
      property_order: ['a'],
      hidden_properties: [],
    })
  })
})
