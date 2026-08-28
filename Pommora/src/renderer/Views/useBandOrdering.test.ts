import { describe, expect, it } from 'vitest'
import type { SavedView } from '@shared/views'
import type { Band } from './bandDndModel'
import { bandReorderPatch, groupingKeyOf } from './useBandOrdering'

const band = (id: string, kind: Band['kind']): Band => ({ id, kind, depth: 0, parentId: null })

const propertyGroup = {
  kind: 'property',
  property_id: 'p1',
  order_mode: 'configured',
  empty_placement: 'bottom',
  hide_empty_groups: false,
} as const

const view = (over: Partial<SavedView> = {}): SavedView =>
  ({
    id: 'v1',
    property_order: [],
    hidden_properties: [],
    ...over,
  }) as SavedView

describe('bandReorderPatch', () => {
  it('a structural band writes the view order, merged over the FULL tree so folded siblings keep their rank', () => {
    const patch = bandReorderPatch({
      dragged: band('C', 'set'),
      beforeId: 'A',
      view: view({ group_order: ['A', 'B', 'C'] }),
      structuralIds: ['A', 'A1', 'B', 'C'],
      propertyKeys: [],
    })
    expect(patch).toEqual({ group_order: ['C', 'A', 'B', 'A1'] })
  })

  it('a property band writes group.order and flips the mode to manual — the drag IS the choice', () => {
    const patch = bandReorderPatch({
      dragged: band('done', 'property'),
      beforeId: 'todo',
      view: view({ group: propertyGroup }),
      structuralIds: [],
      propertyKeys: ['todo', 'doing', 'done'],
    })
    expect(patch).toEqual({
      group: { ...propertyGroup, order_mode: 'manual', order: ['done', 'todo', 'doing'] },
    })
  })

  it('a property band under a grouping that is not property-keyed has no order to write', () => {
    expect(
      bandReorderPatch({
        dragged: band('done', 'property'),
        beforeId: null,
        view: view({ group: { kind: 'flat' } }),
        structuralIds: [],
        propertyKeys: ['todo', 'done'],
      }),
    ).toBeNull()
  })

  it('a null beforeId appends', () => {
    const patch = bandReorderPatch({
      dragged: band('A', 'set'),
      beforeId: null,
      view: view({ group_order: ['A', 'B'] }),
      structuralIds: ['A', 'B'],
      propertyKeys: [],
    })
    expect(patch).toEqual({ group_order: ['B', 'A'] })
  })
})

// The patch says how ONE grouping's bands are ordered, so it must not outlive that grouping — the
// Grouping pane writes the view independently, and a patch held past its change would mask the new
// grouping with the old one's order until the next view switch.
describe('groupingKeyOf', () => {
  const g = (over: Partial<SavedView>): SavedView => view(over)

  it('separates two property groupings, so switching between them retires the patch', () => {
    expect(groupingKeyOf(g({ group: propertyGroup }))).not.toBe(
      groupingKeyOf(g({ group: { ...propertyGroup, property_id: 'p2' } })),
    )
  })

  it('separates the grouping kinds', () => {
    expect(groupingKeyOf(g({ group: { kind: 'flat' } }))).not.toBe(
      groupingKeyOf(g({ group: { kind: 'structural' } })),
    )
  })

  it('is blind to the order within a grouping — a reorder must not retire its own patch', () => {
    expect(groupingKeyOf(g({ group: { ...propertyGroup, order: ['a', 'b'] } }))).toBe(
      groupingKeyOf(g({ group: { ...propertyGroup, order_mode: 'manual', order: ['b', 'a'] } })),
    )
    expect(groupingKeyOf(g({ group_order: ['a'] }))).toBe(groupingKeyOf(g({ group_order: ['b'] })))
  })
})
