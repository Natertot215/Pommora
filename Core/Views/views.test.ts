import { describe, it, expect } from 'vitest'
import fixture from '../Testing/fixtures/collection-with-status.json'
import {
  granularityOf,
  mergeViewEdit,
  savedView,
  viewOption,
  DEFAULT_VIEW_TYPE,
  decodeGroupConfig,
  decodeSubGroup,
  mintDefaultView,
  mintNewView,
  pickViewState,
  mapRules,
  mapTiles,
  mapViews,
  editHiddenBucket,
  clearHiddenBuckets,
  type GroupedView,
  type FilterGroup,
  type FilterRule,
  type SavedView,
} from './views'
import { pageCollectionSidecar } from '../Nexus/schemas'
import { RESERVED_PROPERTY_ID } from '../Properties/properties'

describe('SavedView decode', () => {
  it('parses the fixture Table view (type, property_order, group, sort)', () => {
    const v = savedView.parse(fixture.views[0])
    expect(v.type).toBe('table')
    expect(v.property_order[0]).toBe('prop_status')
    expect(v.group).toEqual({
      kind: 'property',
      property_id: 'prop_status',
      order_mode: 'manual',
      order: ['in_progress', 'opt_open', 'not_started', 'done'],
    })
    expect(v.sort).toEqual([{ property_id: 'prop_status', direction: 'descending' }])
  })

  it('preserves a foreign key on the view object (looseObject)', () => {
    const v = savedView.parse(fixture.views[0]) as Record<string, unknown>
    expect(v._foreign_view_key).toBe('preserved')
  })

  it('round-trips the hide_page_icons / hide_borders display toggles', () => {
    const v = savedView.parse({
      id: 'view_z',
      name: 'Z',
      type: 'table',
      property_order: [],
      hidden_properties: [],
      hide_page_icons: true,
      hide_borders: true,
    })
    expect(v.hide_page_icons).toBe(true)
    expect(v.hide_borders).toBe(true)
  })

  it('falls an unknown group.kind back to structural', () => {
    const v = savedView.parse({
      id: 'view_x',
      name: 'X',
      type: 'table',
      property_order: [],
      hidden_properties: [],
      group: { kind: 'galaxy', property_id: 'p' },
    })
    expect(v.group).toEqual({ kind: 'structural' })
  })

  it('a kind-less group object degrades to structural like any other malformed shape', () => {
    const v = savedView.parse({
      id: 'view_y',
      name: 'Y',
      type: 'table',
      property_order: [],
      hidden_properties: [],
      group: { property_id: 'p' },
    })
    expect(v.group).toEqual({ kind: 'structural' })
  })

  it('round-trips group_order and drops non-string entries alone (element-filtering, not whole-array catch)', () => {
    const base = {
      id: 'view_g',
      name: 'G',
      type: 'table',
      property_order: [],
      hidden_properties: [],
    }
    expect(savedView.parse({ ...base, group_order: ['s1', 's2'] }).group_order).toEqual([
      's1',
      's2',
    ])
    expect(savedView.parse({ ...base, group_order: ['s1', 42, 's2'] }).group_order).toEqual([
      's1',
      's2',
    ])
    expect(savedView.parse(base).group_order).toBeUndefined()
  })

  it('coerces a non-array group_order to empty instead of crashing', () => {
    const v = savedView.parse({
      id: 'view_g',
      name: 'G',
      type: 'table',
      property_order: [],
      hidden_properties: [],
      group_order: 'nonsense',
    })
    expect(v.group_order).toEqual([])
  })

  it('round-trips manual_order and drops non-string entries alone', () => {
    const base = {
      id: 'view_m',
      name: 'M',
      type: 'table',
      property_order: [],
      hidden_properties: [],
    }
    expect(savedView.parse({ ...base, manual_order: ['p1', 'p2'] }).manual_order).toEqual([
      'p1',
      'p2',
    ])
    expect(savedView.parse({ ...base, manual_order: ['p1', 42, 'p2'] }).manual_order).toEqual([
      'p1',
      'p2',
    ])
    expect(savedView.parse({ ...base, manual_order: 'nonsense' }).manual_order).toEqual([])
    expect(savedView.parse(base).manual_order).toBeUndefined()
  })

  it('pickViewState carries manual_order beside collapsed_groups', () => {
    const view: SavedView = {
      id: 'view_m',
      name: 'M',
      type: 'table',
      property_order: [],
      hidden_properties: [],
      collapsed_groups: ['g1'],
      manual_order: ['p2', 'p1'],
    }
    expect(pickViewState(view)).toEqual({
      collapsed_groups: ['g1'],
      manual_order: ['p2', 'p1'],
    })
  })

  it('wires a typed views[] into the collection sidecar schema', () => {
    const parsed = pageCollectionSidecar.parse(fixture)
    expect(parsed.views?.[0].type).toBe('table')
    expect(parsed.views?.[0].group).toMatchObject({ kind: 'property', order_mode: 'manual' })
  })
})

describe('column styles on write', () => {
  const view = (column_styles: Record<string, unknown>) =>
    savedView.parse({
      id: 'view_c',
      name: 'C',
      type: 'table',
      property_order: [],
      hidden_properties: [],
      column_styles,
    })

  it('keeps no entry for a column following every default, old residue included', () => {
    const raw = { ...view({}), column_styles: { a: {}, c: { look: 'compact' } } }
    const out = mergeViewEdit(raw, view({ b: { date_format: undefined }, c: { look: 'compact' } }))
    expect(out.column_styles).toEqual({ c: { look: 'compact' } })
  })

  it('reads a column style with the keys this build does not know', () => {
    expect(view({ a: { look: 'compact', tint: 'warm' } }).column_styles).toEqual({
      a: { look: 'compact', tint: 'warm' },
    })
  })

  it('drops the map once no column holds a style', () => {
    expect(mergeViewEdit(null, view({ a: {} }))).not.toHaveProperty('column_styles')
  })
})

describe('a view holding values this build does not read', () => {
  const stored = {
    id: 'view_b',
    name: 'My Board',
    type: 'cards',
    property_order: ['p1', 7, 'p2'],
    hidden_properties: [],
    sort: [
      { property_id: 'p1', direction: 'custom' },
      { property_id: 'p2', direction: 'descending' },
    ],
    filter: { match: 'all', rules: [{ property_id: 'p1', op: 'is', value: 'x' }] },
    column_widths: { p1: 'wide', p2: 180 },
    column_alignments: { p1: 'justify', p2: 'right' },
    collapsed_groups: 'g1',
    hidden_groups: [3, 'g2'],
    icon: 42,
    hide_borders: 'yes',
    plugin_key: { keep: 1 },
  }

  it('reads every field it can and drops only the values it cannot', () => {
    const v = savedView.parse(stored)
    expect(v.name).toBe('My Board')
    expect(v.type).toBe('cards')
    expect(v.property_order).toEqual(['p1', 'p2'])
    expect(v.sort).toEqual([{ property_id: 'p2', direction: 'descending' }])
    expect(v.column_widths).toEqual({ p2: 180 })
    expect(v.column_alignments).toEqual({ p2: 'right' })
    expect(v.collapsed_groups).toEqual([])
    expect(v.hidden_groups).toEqual(['g2'])
    expect(v.icon).toBeUndefined()
    expect(v.hide_borders).toBeUndefined()
  })

  it('fails to read only when it is not an object, a view already read included', () => {
    expect(savedView.safeParse('view').success).toBe(false)
    expect(savedView.safeParse({}).success).toBe(true)
    expect(savedView.safeParse(savedView.parse({ ...stored, card_banner: 'poster' })).success).toBe(
      true,
    )
  })

  it('keeps every stored value a width edit did not change', () => {
    const read = savedView.parse(stored)
    const out = mergeViewEdit(stored, {
      ...read,
      column_widths: { ...read.column_widths, p2: 240 },
    })
    expect(out).toEqual({ ...stored, column_widths: { p1: 'wide', p2: 240 } })
  })

  it('keeps a stored alignment beside one an edit adds', () => {
    const read = savedView.parse(stored)
    const out = mergeViewEdit(stored, {
      ...read,
      column_alignments: { ...read.column_alignments, p3: 'left' },
    })
    expect(out.column_alignments).toEqual({ p1: 'justify', p2: 'right', p3: 'left' })
  })
})

describe('sort criterion custom order', () => {
  const base = { id: 'view_s', name: 'S', type: 'table', property_order: [], hidden_properties: [] }
  it('round-trips a criterion order array and leaves it absent otherwise', () => {
    const v = savedView.parse({
      ...base,
      sort: [
        { property_id: 'p1', direction: 'ascending', order: ['a', 'b'] },
        { property_id: 'p2', direction: 'descending' },
      ],
    })
    expect(v.sort?.[0].order).toEqual(['a', 'b'])
    expect(v.sort?.[1].order).toBeUndefined()
  })
})

describe('view-level grouping fields', () => {
  const base = { id: 'view_x', name: 'T', type: 'table', property_order: [], hidden_properties: [] }
  it('savedView round-trips all four fields', () => {
    const v = savedView.parse({
      ...base,
      structural_order_mode: 'location',
      ungrouped_placement: 'top',
      date_separator: 'slash',
      sub_group: {
        property_id: 'p1',
        order_mode: 'manual',
        order: ['a', 'b'],
        date_granularity: 'week',
      },
    })
    expect(v.structural_order_mode).toBe('location')
    expect(v.ungrouped_placement).toBe('top')
    expect(v.date_separator).toBe('slash')
    expect(v.sub_group).toEqual({
      property_id: 'p1',
      order_mode: 'manual',
      order: ['a', 'b'],
      date_granularity: 'week',
    })
  })
  it('a minimal view decodes with all four absent', () => {
    const v = savedView.parse(base)
    expect(v.structural_order_mode).toBeUndefined()
    expect(v.sub_group).toBeUndefined()
    expect(v.ungrouped_placement).toBeUndefined()
    expect(v.date_separator).toBeUndefined()
  })
  it('malformed fields drop without poisoning the view', () => {
    const v = savedView.parse({
      ...base,
      structural_order_mode: 'nope',
      sub_group: { order_mode: 'manual' },
    })
    expect(v.structural_order_mode).toBeUndefined()
    expect(v.sub_group).toBeUndefined()
  })
  it('decodeSubGroup fills order_mode and filters non-string order entries', () => {
    expect(decodeSubGroup({ property_id: 'p1', order: ['a', 7, 'b'] })).toEqual({
      property_id: 'p1',
      order_mode: 'configured',
      order: ['a', 'b'],
    })
  })
})

describe('decodeGroupConfig (lenient, never throws)', () => {
  it('passes structural and flat through', () => {
    expect(decodeGroupConfig({ kind: 'structural' })).toEqual({ kind: 'structural' })
    expect(decodeGroupConfig({ kind: 'flat' })).toEqual({ kind: 'flat' })
  })

  it('degrades garbage / null / non-object to structural', () => {
    expect(decodeGroupConfig(null)).toEqual({ kind: 'structural' })
    expect(decodeGroupConfig('nope')).toEqual({ kind: 'structural' })
    expect(decodeGroupConfig([])).toEqual({ kind: 'structural' })
    expect(decodeGroupConfig({})).toEqual({ kind: 'structural' })
  })
})

describe('SavedView format (the cards density field)', () => {
  const base = { id: 'view_x', name: 'B', property_order: [], hidden_properties: [] }
  it('coerces an unknown type to table and round-trips a valid format', () => {
    const v = savedView.parse({ ...base, type: 'board', format: 'compact' })
    expect(v.type).toBe(DEFAULT_VIEW_TYPE)
    expect(v.format).toBe('compact')
  })
  it('drops an unknown format value', () => {
    const v = savedView.parse({ ...base, type: 'cards', format: 'huge' })
    expect(v.format).toBeUndefined()
  })
})

describe('card_size codec', () => {
  const base = { id: 'view_c', name: 'C', type: 'table', property_order: [], hidden_properties: [] }
  it('round-trips a finite scale factor', () => {
    expect(savedView.parse({ ...base, card_size: 0.75 }).card_size).toBe(0.75)
  })
  it('drops a non-numeric card_size', () => {
    expect(savedView.parse({ ...base, card_size: 'large' }).card_size).toBeUndefined()
  })
  it('drops a non-finite card_size instead of persisting Infinity/NaN', () => {
    expect(
      savedView.parse({ ...base, card_size: Number.POSITIVE_INFINITY }).card_size,
    ).toBeUndefined()
    expect(savedView.parse({ ...base, card_size: Number.NaN }).card_size).toBeUndefined()
  })
  it('clamps card_size and view_scale into their ranges', () => {
    expect(savedView.parse({ ...base, card_size: 125 }).card_size).toBe(1.5)
    expect(savedView.parse({ ...base, card_size: 0.1 }).card_size).toBe(0.5)
    expect(savedView.parse({ ...base, view_scale: 9 }).view_scale).toBe(1.5)
    expect(savedView.parse({ ...base, view_scale: 0.2 }).view_scale).toBe(0.5)
  })
})

describe('card_banner codec', () => {
  const base = { id: 'view_d', name: 'D', type: 'cards', property_order: [], hidden_properties: [] }
  it('round-trips each mode', () => {
    for (const mode of ['preview', 'banner', 'none'])
      expect(savedView.parse({ ...base, card_banner: mode }).card_banner).toBe(mode)
  })
  it('drops a mode it does not know', () => {
    expect(savedView.parse({ ...base, card_banner: 'cover' }).card_banner).toBeUndefined()
  })
})

describe('mint seam', () => {
  const schema = [{ id: 'prop_a' }, { id: 'prop_b' }] as never[]
  it('mintNewView is title-only: schema ids and all three Contexts hidden', () => {
    const v = mintNewView('Untitled', schema)
    expect(v.name).toBe('Untitled')
    expect(v.type).toBe('table')
    expect(v.icon).toBe('view-table')
    expect(v.property_order).toEqual([RESERVED_PROPERTY_ID.title])
    // Context columns take no entry — absence from property_order is what hides them.
    expect(v.hidden_properties).toEqual(['prop_a', 'prop_b'])
  })
  it('mintDefaultView mints title-only (every prop + Context columns hidden) with the table glyph', () => {
    const v = mintDefaultView(schema)
    expect(v.hidden_properties).toEqual(['prop_a', 'prop_b'])
    expect(v.property_order).toEqual([RESERVED_PROPERTY_ID.title])
    expect(v.icon).toBe('view-table')
  })
})

describe('filter codec', () => {
  it('round-trips a filter with values[] and nesting', () => {
    const view = savedView.parse({
      id: 'view_x',
      name: 'T',
      type: 'table',
      property_order: [],
      hidden_properties: [],
      filter: {
        match: 'any',
        rules: [
          { property_id: 'prop_tags', op: 'contains_any', values: ['a', 'b'] },
          { match: 'all', rules: [{ property_id: 'prop_sel', op: 'is', value: 'x' }] },
        ],
      },
    })
    const group = view.filter as FilterGroup
    expect(group.match).toBe('any')
    expect((group.rules[0] as FilterRule).values).toEqual(['a', 'b'])
    expect((group.rules[1] as FilterGroup).match).toBe('all')
  })

  it('a rule it cannot read drops alone, and the rest still filter', () => {
    const view = savedView.parse({
      id: 'view_x',
      name: 'T',
      filter: {
        match: 'all',
        rules: [
          { property_id: 'prop_sel', op: 'is', value: 5 },
          { property_id: 'prop_tags', op: 'contains_any', values: ['a'] },
          { match: 'none', rules: [] },
          {
            match: 'any',
            rules: [{ op: 'is' }, { property_id: 'prop_sel', op: 'is', value: 'x' }],
          },
        ],
      },
    })
    expect(view.filter).toEqual({
      match: 'all',
      rules: [
        { property_id: 'prop_tags', op: 'contains_any', values: ['a'] },
        { match: 'any', rules: [{ property_id: 'prop_sel', op: 'is', value: 'x' }] },
      ],
    })
  })

  it('a filter the schema no longer admits drops alone — the view survives unfiltered', () => {
    const view = savedView.parse({
      id: 'view_x',
      name: 'T',
      type: 'table',
      property_order: [],
      hidden_properties: [],
      filter: { match: 'nonsense', rules: [] },
    })
    expect(view.filter).toBeUndefined()
    expect(view.id).toBe('view_x')
  })
})

// Compiled by the typecheck and never run: a field the decoder doesn't declare is no field of the type.
const _mistypedViewField = (v: SavedView): unknown =>
  // @ts-expect-error
  v.hide_boarders

describe('viewOption', () => {
  it('reads an absent flag at its default and a stored one as stored', () => {
    const view = savedView.parse({ id: 'v', type: 'table' })
    expect(viewOption(view, 'set_cards')).toBe(true)
    expect(viewOption(view, 'hide_column_icons')).toBe(true)
    expect(viewOption(view, 'filter_enabled')).toBe(true)
    expect(viewOption(view, 'hide_borders')).toBe(false)
    expect(viewOption({ ...view, set_cards: false }, 'set_cards')).toBe(false)
  })
  it('reads an absent value option at its default', () => {
    const view = savedView.parse({ id: 'v', type: 'table' })
    expect(viewOption(view, 'date_separator')).toBe('dash')
    expect(viewOption(view, 'card_banner')).toBe('banner')
    expect(viewOption({ ...view, card_banner: 'none' }, 'card_banner')).toBe('none')
  })
  it('buckets a date group by month unless it names a granularity', () => {
    expect(granularityOf({})).toBe('month')
    expect(granularityOf(undefined)).toBe('month')
    expect(granularityOf({ date_granularity: 'week' })).toBe('week')
  })
})

describe('the saved-view traversal', () => {
  const stamp = (v: Record<string, unknown>) => ({ ...v, seen: true })

  it('mapViews keeps each view at its index across a non-object element', () => {
    const seen: number[] = []
    const out = mapViews({ views: [{ id: 'a' }, 7, { id: 'b' }] }, (v, i) => {
      seen.push(i)
      return v.id === 'b' ? stamp(v) : null
    })
    expect(seen).toEqual([0, 2])
    expect(out).toEqual({ views: [{ id: 'a' }, 7, { id: 'b', seen: true }] })
  })

  it('mapViews answers null for an unchanged list', () => {
    expect(mapViews({ views: [{ id: 'a' }] }, () => null)).toBeNull()
    expect(mapViews({ other: 1 }, stamp)).toBeNull()
  })

  it('mapViews re-wraps a View Tile config and keeps the entry’s other keys', () => {
    const tile = { id: 't', type: 'view', views: [{ config: { id: 'v' }, source_id: 's' }] }
    expect(mapViews(tile, stamp)).toEqual({
      ...tile,
      views: [{ config: { id: 'v', seen: true }, source_id: 's' }],
    })
  })

  it('mapViews rides a view’s foreign keys through', () => {
    const out = mapViews({ views: [{ id: 'a', future_key: { x: 1 } }] }, (v) => ({ ...v, id: 'b' }))
    expect(out).toEqual({ views: [{ id: 'b', future_key: { x: 1 } }] })
  })

  it('mapTiles skips a non-object entry and answers null when no entry changed', () => {
    const doc = { layout: [], tiles: [null, { id: 't' }] }
    expect(mapTiles(doc, () => null)).toBeNull()
    expect(mapTiles(doc, stamp)).toEqual({ layout: [], tiles: [null, { id: 't', seen: true }] })
  })

  it('mapRules drops a nested rule, keeps the group’s other keys, and rides a null entry through', () => {
    const group = {
      match: 'all',
      note: 'kept',
      rules: [
        { property_id: 'a', op: 'is', value: 'x' },
        null,
        { match: 'any', rules: [{ property_id: 'b', op: 'is', value: 'y' }] },
      ],
    } as unknown as FilterGroup
    expect(mapRules(group, (rule) => (rule.property_id === 'b' ? null : rule))).toEqual({
      match: 'all',
      note: 'kept',
      rules: [{ property_id: 'a', op: 'is', value: 'x' }, null, { match: 'any', rules: [] }],
    })
  })
})

describe('the stored hidden-group keys', () => {
  const onA = {
    kind: 'property' as const,
    property_id: 'prop_A',
    order_mode: 'configured' as const,
  }
  const subA = { property_id: 'prop_A', order_mode: 'configured' as const }
  const held = (
    hidden_groups: string[],
    v: Omit<GroupedView, 'hidden_groups'> = {},
  ): GroupedView => ({
    ...v,
    hidden_groups,
  })

  it('a rename moves the encoded key at both levels', () => {
    expect(
      editHiddenBucket(
        held(['prop_A/Done', 'sub/prop_A/Done', 'prop_B/Done']),
        'prop_A',
        'Done',
        'Closed',
      ),
    ).toEqual(['prop_A/Closed', 'sub/prop_A/Closed', 'prop_B/Done'])
  })

  it('a legacy spelling under the current grouping is renamed into the encoded one', () => {
    expect(editHiddenBucket(held(['Done'], { group: onA }), 'prop_A', 'Done', 'Closed')).toEqual([
      'prop_A/Closed',
    ])
    expect(
      editHiddenBucket(held(['sub/Done'], { sub_group: subA }), 'prop_A', 'Done', 'Closed'),
    ).toEqual(['sub/prop_A/Closed'])
  })

  it('a legacy spelling under another grouping is left', () => {
    const onB = { ...onA, property_id: 'prop_B' }
    expect(
      editHiddenBucket(held(['Done', 'sub/Done'], { group: onB }), 'prop_A', 'Done', 'Closed'),
    ).toBeNull()
  })

  it('a removal drops every spelling it names', () => {
    expect(
      editHiddenBucket(
        held(['prop_A/Done', 'Done', 'sub/prop_A/Done', 'x'], { group: onA }),
        'prop_A',
        'Done',
        null,
      ),
    ).toEqual(['x'])
  })

  it('a rename onto a key the list already holds keeps one copy', () => {
    expect(
      editHiddenBucket(held(['prop_A/Done', 'prop_A/Closed']), 'prop_A', 'Done', 'Closed'),
    ).toEqual(['prop_A/Closed'])
  })

  it('answers null when nothing matches', () => {
    expect(editHiddenBucket(held(['prop_B/Done', 'Done']), 'prop_A', 'Done', 'Closed')).toBeNull()
    expect(editHiddenBucket({}, 'prop_A', 'Done', null)).toBeNull()
  })

  it('a clear drops the property’s encoded keys at both levels and keeps another property’s', () => {
    expect(
      clearHiddenBuckets(
        held(['prop_A/Done', 'sub/prop_A/Todo', 'prop_B/Done', 'sub/prop_B/Todo']),
        'prop_A',
      ),
    ).toEqual(['prop_B/Done', 'sub/prop_B/Todo'])
  })

  it('a clear keeps a bare legacy key and a hidden Set id under a grouping on the property', () => {
    expect(clearHiddenBuckets(held(['Done', 'set_01'], { group: onA }), 'prop_A')).toBeNull()
  })

  it('a clear drops a legacy sub key only under a sub-grouping on the property', () => {
    expect(clearHiddenBuckets(held(['sub/Done', 'set_01'], { sub_group: subA }), 'prop_A')).toEqual(
      ['set_01'],
    )
    expect(
      clearHiddenBuckets(
        held(['sub/Done'], { sub_group: { ...subA, property_id: 'prop_B' } }),
        'prop_A',
      ),
    ).toBeNull()
  })

  it('a clear answers null when no key is the property’s own', () => {
    expect(clearHiddenBuckets(held(['prop_B/Done']), 'prop_A')).toBeNull()
  })
})
