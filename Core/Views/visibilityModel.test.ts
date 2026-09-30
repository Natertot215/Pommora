import { describe, expect, it } from 'vitest'
import { RESERVED_PROPERTY_ID, type PropertyDefinition } from '../Properties/properties'
import type { SavedView } from './views'
import { hiddenListIds, hideShown, placeInShown, unhide } from './visibilityModel'

const { title, createdAt, modifiedAt } = RESERVED_PROPERTY_ID
const [areas, projects] = ['ctx_areas', 'ctx_projects']
const stamps = [createdAt, modifiedAt]

const def = (id: string): PropertyDefinition => ({ id, name: id, type: 'select' })

const view = (property_order: string[], hidden_properties: string[]): SavedView => ({
  id: 'view_1',
  name: 'Table',
  type: 'table',
  property_order,
  hidden_properties,
})

describe('hiddenListIds', () => {
  it('orders hidden props by the COLLECTION schema, not the hidden array', () => {
    const schema = [def('a'), def('b'), def('c')]
    expect(hiddenListIds(view(['b'], ['c', 'a']), schema)).toEqual(['a', 'c', ...stamps])
  })

  it('lists non-shown contexts first (registry order), then props, then the stamps, drops stale ids', () => {
    const schema = [def('a')]
    expect(
      hiddenListIds(view([], [areas, modifiedAt, 'stale', 'a']), schema, [areas, projects]),
    ).toEqual([areas, projects, 'a', createdAt, modifiedAt])
  })

  it('lists both stamps on a view that shows neither', () => {
    expect(hiddenListIds(view([title], []), [])).toEqual([createdAt, modifiedAt])
  })

  it('omits a stamp the view shows', () => {
    expect(hiddenListIds(view([title, modifiedAt], []), [])).toEqual([createdAt])
  })

  it('a context in neither list sits in the hidden zone (default-OFF reveal path)', () => {
    expect(hiddenListIds(view(['ctxA'], []), [], ['ctxA', 'ctxB'])).toEqual(['ctxB', ...stamps])
  })

  it('surfaces an unaccounted prop (in schema, in neither list) so it stays revealable', () => {
    const schema = [def('a'), def('b')]
    expect(hiddenListIds(view(['a'], []), schema)).toEqual(['b', ...stamps])
  })

  it('interleaves hidden and unaccounted props in collection order', () => {
    const schema = [def('a'), def('b'), def('c')]
    expect(hiddenListIds(view(['b'], ['a']), schema)).toEqual(['a', 'c', ...stamps])
  })
})

describe('placeInShown', () => {
  it('reorders a shown row, writing the full visible order verbatim with hidden ids trailing', () => {
    const v = view([title, 'a', 'b', 'h', 'c'], ['h'])
    expect(placeInShown(v, [title, 'a', 'b', 'c'], 'c', 1)).toEqual({
      property_order: [title, 'c', 'a', 'b', 'h'],
      hidden_properties: ['h'],
    })
  })

  it('unhides a dragged-in row at the slot and lifts its flag', () => {
    const v = view([title, 'a', 'b', 'h'], ['h'])
    expect(placeInShown(v, [title, 'a', 'b'], 'h', 2)).toEqual({
      property_order: [title, 'a', 'h', 'b'],
      hidden_properties: [],
    })
  })

  it('appends past the last shown row — a hidden id never in property_order lands', () => {
    const v = view(['a'], ['h'])
    expect(placeInShown(v, ['a'], 'h', 1)).toEqual({
      property_order: ['a', 'h'],
      hidden_properties: [],
    })
  })

  it('reveals an unaccounted prop — drag-in writes it into property_order (then it shows)', () => {
    const v = view([title, 'a'], [])
    expect(placeInShown(v, [title, 'a'], 'new', 2)).toEqual({
      property_order: [title, 'a', 'new'],
      hidden_properties: [],
    })
  })

  it('preserves foreign property_order ids at the tail', () => {
    const v = view(['a', 'future_key', 'b'], [])
    expect(placeInShown(v, ['a', 'b'], 'b', 0).property_order).toEqual(['b', 'a', 'future_key'])
  })
})

describe('hideShown / unhide', () => {
  it('hide appends the flag once and never touches property_order', () => {
    const v = view(['a', 'b'], [])
    expect(hideShown(v, 'a')).toEqual({ hidden_properties: ['a'] })
    expect(hideShown(view(['a'], ['a']), 'a')).toEqual({ hidden_properties: ['a'] })
  })

  it('unhide lifts the flag AND places an unplaced prop in the order (allowlist reveal)', () => {
    // No remembered slot (a title-only minted view) → appended, so the allowlist actually shows it.
    expect(unhide(view([], ['a', 'b']), 'a')).toEqual({
      property_order: ['a'],
      hidden_properties: ['b'],
    })
    expect(unhide(view(['a'], ['a']), 'a')).toEqual({
      property_order: ['a'],
      hidden_properties: [],
    })
  })
})
