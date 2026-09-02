import { describe, it, expect } from 'vitest'
import { ID_KEY } from '@shared/identity'
import type { CollectionNode, PageNode, SetNode, ViewRow } from '@shared/types'
import type { GroupConfig } from '@shared/views'
import type { PropertyDefinition } from '@shared/properties'
import {
  dateBucketKey,
  flattenContainer,
  frontmatterOf,
  pruneEmptyBuckets,
  resolveGroups,
  subGroupKey,
} from './group'
import { propsAtRoot } from '@renderer/Testing/propsAtRoot'
import { pageValues } from '@renderer/Testing/pageValues'

const page = (id: string): PageNode => ({ kind: 'page', id, title: id, path: `${id}.md` })
const set = (id: string, pages: PageNode[] = [], sets: SetNode[] = []): SetNode => ({
  kind: 'set',
  id,
  title: id,
  path: id,
  pages,
  sets,
})
const collection = (sets: SetNode[] = [], pages: PageNode[] = []): CollectionNode => ({
  kind: 'collection',
  id: 'col',
  title: 'Col',
  path: 'Col',
  sets,
  pages,
})
const keys = (groups: { key: string }[]): string[] => groups.map((g) => g.key)
const itemIds = (g: { items: ViewRow[] }): string[] => g.items.map((r) => r.id)

const statusSchema: PropertyDefinition[] = [
  {
    id: 'prop_status',
    name: 'Status',
    type: 'status',
    status_groups: [
      {
        id: 'upcoming',
        label: 'U',
        color: 'gray',
        options: [
          { value: 'not_started', label: 'Not started', group_id: 'upcoming' },
          { value: 'opt_open', label: 'Open', group_id: 'upcoming' },
        ],
      },
      {
        id: 'in_progress',
        label: 'IP',
        color: 'blue',
        options: [{ value: 'in_progress', label: 'Active', group_id: 'in_progress' }],
      },
      {
        id: 'done',
        label: 'D',
        color: 'green',
        options: [{ value: 'done', label: 'Done', group_id: 'done' }],
      },
    ],
  },
]

describe('flattenContainer + structural grouping', () => {
  it('groups a Collection by its Sets, nests Sub-Sets, roots loose pages in a trailing band', () => {
    const sub = set('sub', [page('p_sub')])
    const setA = set('setA', [page('p_a')], [sub])
    const setB = set('setB', [page('p_b')])
    const col = collection([setA, setB], [page('p_root')])
    const { rows, setTree } = flattenContainer(col, {})
    const groups = resolveGroups(rows, { kind: 'structural' }, [], setTree, null)

    expect(groups.map((g) => [g.key, g.kind])).toEqual([
      ['setA', 'structural-set'],
      ['setB', 'structural-set'],
      ['_ungrouped', 'ungrouped'],
    ])
    expect(itemIds(groups[0])).toEqual(['p_a'])
    expect(keys(groups[0].children ?? [])).toEqual(['sub'])
    expect(itemIds(groups[0].children![0])).toEqual(['p_sub'])
    expect(itemIds(groups[2])).toEqual(['p_root'])
  })

  it('flattenStructural (cards): rolls each top set’s whole subtree into one flat band, no children', () => {
    const sub = set('sub', [page('p_sub')])
    const setA = set('setA', [page('p_a')], [sub])
    const setB = set('setB', [page('p_b')])
    const col = collection([setA, setB], [page('p_root')])
    const { rows, setTree } = flattenContainer(col, {})
    const groups = resolveGroups(
      rows,
      { kind: 'structural' },
      [],
      setTree,
      null,
      [],
      'bottom',
      undefined,
      true,
    )

    expect(groups.map((g) => [g.key, g.kind])).toEqual([
      ['setA', 'structural-set'],
      ['setB', 'structural-set'],
      ['_ungrouped', 'ungrouped'],
    ])
    expect(itemIds(groups[0])).toEqual(['p_a', 'p_sub']) // subtree flat in the band, not nested
    expect(groups[0].children).toBeUndefined()
    expect(itemIds(groups[1])).toEqual(['p_b'])
    expect(itemIds(groups[2])).toEqual(['p_root'])
  })

  it('flattenStructural: a manual sorter spans the whole flat band (a cross-level order sticks)', () => {
    const setA = set('setA', [page('p_a')], [set('sub', [page('p_sub')])])
    const { rows, setTree } = flattenContainer(collection([setA], []), {})
    const order = ['p_sub', 'p_a']
    const bySpec = (r: ViewRow[]): ViewRow[] =>
      [...r].sort((x, y) => order.indexOf(x.id) - order.indexOf(y.id))
    const groups = resolveGroups(
      rows,
      { kind: 'structural' },
      [],
      setTree,
      bySpec,
      [],
      'bottom',
      undefined,
      true,
    )
    expect(itemIds(groups[0])).toEqual(['p_sub', 'p_a']) // a sub-set page ordered before the top set's own
  })

  it('locationFlatten (Sort by Location): concatenates every band into one force-open headerless band', () => {
    const sub = set('sub', [page('p_sub')])
    const setA = set('setA', [page('p_a')], [sub])
    const setB = set('setB', [page('p_b')])
    const col = collection([setA, setB], [page('p_root')])
    const { rows, setTree } = flattenContainer(col, {})
    const groups = resolveGroups(
      rows,
      { kind: 'structural' },
      [],
      setTree,
      null,
      ['_ungrouped'], // a stale collapse from structural mode must NOT hide the flattened band
      'bottom',
      undefined,
      true, // flattenStructural
      true, // locationFlatten
    )
    expect(groups.map((g) => [g.key, g.kind])).toEqual([['_ungrouped', 'ungrouped']])
    // location order: setA's subtree (p_a, p_sub), then setB (p_b), then the root tail (bottom)
    expect(itemIds(groups[0])).toEqual(['p_a', 'p_sub', 'p_b', 'p_root'])
    expect(groups[0].isCollapsed).toBe(false) // force-open despite the stale _ungrouped collapse
  })

  it('locationFlatten wins over a property group (mutually exclusive)', () => {
    const col = collection([set('setA', [page('p_a')])], [page('p_root')])
    const { rows, setTree } = flattenContainer(col, {})
    const groups = resolveGroups(
      rows,
      {
        kind: 'property',
        property_id: 'x',
        order_mode: 'configured',
        empty_placement: 'bottom',
        hide_empty_groups: false,
      },
      statusSchema,
      setTree,
      null,
      [],
      'bottom',
      undefined,
      false,
      true, // locationFlatten forces flat regardless of the property group
    )
    expect(groups.map((g) => g.kind)).toEqual(['ungrouped'])
  })

  it('groups a Set container identically — Sub-Sets become top groups, own pages band (shared path)', () => {
    const container = set(
      'setC',
      [page('p_own')],
      [set('subX', [page('p_x')]), set('subY', [page('p_y')])],
    )
    const { rows, setTree } = flattenContainer(container, {})
    const groups = resolveGroups(rows, { kind: 'structural' }, [], setTree, null)
    expect(keys(groups)).toEqual(['subX', 'subY', '_ungrouped'])
    expect(itemIds(groups[2])).toEqual(['p_own'])
  })

  it('still shows an empty Set as a disclosure group', () => {
    const { rows, setTree } = flattenContainer(collection([set('empty', [])], []), {})
    const groups = resolveGroups(rows, { kind: 'structural' }, [], setTree, null)
    expect(keys(groups)).toEqual(['empty'])
    expect(groups[0].items).toEqual([])
  })

  it('with zero Sets yields a single headerless band, and nothing for an empty container', () => {
    const { rows, setTree } = flattenContainer(collection([], [page('p1'), page('p2')]), {})
    const groups = resolveGroups(rows, { kind: 'structural' }, [], setTree, null)
    expect(keys(groups)).toEqual(['_ungrouped'])
    expect(groups[0].kind).toBe('ungrouped')
    expect(itemIds(groups[0])).toEqual(['p1', 'p2'])
    expect(resolveGroups([], { kind: 'structural' }, [], [], null)).toEqual([])
  })

  it('applies the sorter within each group', () => {
    const { rows, setTree } = flattenContainer(
      collection([], [page('b'), page('a'), page('c')]),
      {},
    )
    const byId = (r: ViewRow[]): ViewRow[] => [...r].sort((x, y) => (x.id < y.id ? -1 : 1))
    const groups = resolveGroups(rows, { kind: 'flat' }, [], setTree, byId)
    expect(itemIds(groups[0])).toEqual(['a', 'b', 'c'])
  })

  it('marks groups collapsed from the collapsed set', () => {
    const { rows, setTree } = flattenContainer(collection([set('s1', [page('p1')])], []), {})
    const groups = resolveGroups(rows, { kind: 'structural' }, [], setTree, null, ['s1'])
    expect(groups[0].isCollapsed).toBe(true)
  })
})

describe('toRow stamps', () => {
  it("carries the batch entry's stamps and nulls them when the entry lacks them", () => {
    const { rows } = flattenContainer(collection([], [page('p1'), page('p2'), page('p3')]), {
      p1: {
        frontmatter: { [ID_KEY]: 'p1' },
        createdAt: '2024-01-02T03:04:05.000Z',
        modifiedAt: '2024-06-07T08:09:10.000Z',
      },
      p2: { frontmatter: { [ID_KEY]: 'p2' }, createdAt: null, modifiedAt: null },
    })
    expect(rows[0]).toMatchObject({
      createdAt: '2024-01-02T03:04:05.000Z',
      modifiedAt: '2024-06-07T08:09:10.000Z',
    })
    for (const row of rows.slice(1)) {
      expect(row.createdAt).toBeNull()
      expect(row.modifiedAt).toBeNull()
    }
  })

  it('a page absent from the batch stands on a ID-keyed frontmatter', () => {
    expect(frontmatterOf({}, 'p9')).toEqual({ [ID_KEY]: 'p9' })
  })
})

describe('flat grouping', () => {
  it('drops set structure into one band of all rows', () => {
    const { rows, setTree } = flattenContainer(
      collection([set('s1', [page('p1')])], [page('p2')]),
      {},
    )
    const groups = resolveGroups(rows, { kind: 'flat' }, [], setTree, null)
    expect(keys(groups)).toEqual(['_ungrouped'])
    expect(itemIds(groups[0]).sort()).toEqual(['p1', 'p2'])
  })
})

describe('property grouping — status manual order', () => {
  const values = pageValues({
    p1: { [ID_KEY]: 'p1', ...propsAtRoot({ prop_status: 'done' }, statusSchema) },
    p2: { [ID_KEY]: 'p2', ...propsAtRoot({ prop_status: 'in_progress' }, statusSchema) },
    p3: { [ID_KEY]: 'p3', ...propsAtRoot({ prop_status: 'not_started' }, statusSchema) },
    p4: { [ID_KEY]: 'p4' },
  })
  const col = collection([], [page('p1'), page('p2'), page('p3'), page('p4')])
  const base: GroupConfig = {
    kind: 'property',
    property_id: 'prop_status',
    order_mode: 'manual',
    order: ['in_progress', 'opt_open', 'not_started', 'done'],
    empty_placement: 'bottom',
    hide_empty_groups: false,
  }

  it('orders buckets by manual order — an empty bucket renders as an empty band, no-value tail at bottom', () => {
    const { rows, setTree } = flattenContainer(col, values)
    const groups = resolveGroups(rows, base, statusSchema, setTree, null)
    expect(keys(groups)).toEqual(['in_progress', 'opt_open', 'not_started', 'done', '_ungrouped'])
    expect(groups.find((g) => g.key === 'opt_open')?.items).toEqual([])
  })

  it('pins the no-value rows last even when empty_placement says top (the no-None-band ruling)', () => {
    const { rows, setTree } = flattenContainer(col, values)
    const groups = resolveGroups(
      rows,
      { ...base, empty_placement: 'top' },
      statusSchema,
      setTree,
      null,
    )
    expect(keys(groups)).toEqual(['in_progress', 'opt_open', 'not_started', 'done', '_ungrouped'])
  })

  it('a stale manual-order key (deleted option) never renders a ghost band; live empty options do', () => {
    const { rows, setTree } = flattenContainer(col, values)
    const groups = resolveGroups(
      rows,
      { ...base, order: ['gone_opt', ...(base.order ?? [])] },
      statusSchema,
      setTree,
      null,
    )
    expect(keys(groups)).toEqual(['in_progress', 'opt_open', 'not_started', 'done', '_ungrouped'])
  })

  it('resolution keeps live empty buckets — dropping them is the orchestrator’s (pruneEmptyBuckets); the no-value tail stays', () => {
    const { rows, setTree } = flattenContainer(col, values)
    const groups = resolveGroups(
      rows,
      { ...base, hide_empty_groups: true },
      statusSchema,
      setTree,
      null,
    )
    expect(keys(groups)).toEqual(['in_progress', 'opt_open', 'not_started', 'done', '_ungrouped'])
    expect(keys(pruneEmptyBuckets(groups))).toEqual([
      'in_progress',
      'not_started',
      'done',
      '_ungrouped',
    ])
  })
})

describe('sub-grouping (structural + view-level sub_group)', () => {
  const structural: GroupConfig = { kind: 'structural' }
  const sub = { property_id: 'prop_status', order_mode: 'configured' as const }
  const values = pageValues({
    p_a: { [ID_KEY]: 'p_a', ...propsAtRoot({ prop_status: 'not_started' }, statusSchema) },
    p_sub: { [ID_KEY]: 'p_sub', ...propsAtRoot({ prop_status: 'done' }, statusSchema) },
    p_b: { [ID_KEY]: 'p_b', ...propsAtRoot({ prop_status: 'done' }, statusSchema) },
  })
  const col = collection(
    [set('setA', [page('p_a')], [set('setA1', [page('p_sub')])]), set('setB', [page('p_b')])],
    [],
  )

  it('sets stay top bands; sub-set pages roll up and bucket by the property (no sub-set band)', () => {
    const { rows, setTree } = flattenContainer(col, values)
    const groups = resolveGroups(rows, structural, statusSchema, setTree, null, [], 'bottom', sub)
    const setA = groups.find((g) => g.key === 'setA')!
    expect(setA.kind).toBe('structural-set')
    expect(setA.children!.map((c) => ({ kind: c.kind, bucket: c.bucket }))).toEqual([
      { kind: 'property', bucket: 'not_started' },
      { kind: 'property', bucket: 'done' },
    ])
    expect(itemIds(setA.children![1])).toEqual(['p_sub'])
    expect(groups.some((g) => g.key === 'setA1')).toBe(false)
  })

  it('composite keys keep collapse per-set', () => {
    const { rows, setTree } = flattenContainer(col, values)
    const groups = resolveGroups(
      rows,
      structural,
      statusSchema,
      setTree,
      null,
      [subGroupKey('setA', 'done')],
      'bottom',
      sub,
    )
    const setA = groups.find((g) => g.key === 'setA')!
    const setB = groups.find((g) => g.key === 'setB')!
    expect(setA.children!.find((c) => c.bucket === 'done')!.isCollapsed).toBe(true)
    expect(setB.children!.find((c) => c.bucket === 'done')!.isCollapsed).toBe(false)
  })

  it('manual sub-order is global; no-value pages sit per-set placed by the knob; loose root pages stay one flat tail', () => {
    const manual = { ...sub, order_mode: 'manual' as const, order: ['done', 'not_started'] }
    const values2 = {
      ...values,
      ...pageValues({
        p_nv: { [ID_KEY]: 'p_nv' },
        p_loose: {
          [ID_KEY]: 'p_loose',
          ...propsAtRoot({ prop_status: 'done' }, statusSchema),
        },
      }),
    }
    const col2 = collection(
      [
        set('setA', [page('p_a'), page('p_nv')], [set('setA1', [page('p_sub')])]),
        set('setB', [page('p_b')]),
      ],
      [page('p_loose')],
    )
    const { rows, setTree } = flattenContainer(col2, values2)
    const groups = resolveGroups(rows, structural, statusSchema, setTree, null, [], 'top', manual)
    expect(groups[0]).toMatchObject({ key: '_ungrouped', kind: 'ungrouped' })
    expect(itemIds(groups[0])).toEqual(['p_loose'])
    const setA = groups.find((g) => g.key === 'setA')!
    expect(setA.children![0]).toMatchObject({
      kind: 'ungrouped',
      key: subGroupKey('setA', '_ungrouped'),
    })
    expect(setA.children!.filter((c) => c.kind === 'property').map((c) => c.bucket)).toEqual([
      'done',
      'not_started',
    ])
  })

  it('sorts within each sub-bucket', () => {
    const values3 = pageValues({
      p_z: { [ID_KEY]: 'p_z', ...propsAtRoot({ prop_status: 'done' }, statusSchema) },
      p_a2: { [ID_KEY]: 'p_a2', ...propsAtRoot({ prop_status: 'done' }, statusSchema) },
    })
    const col3 = collection([set('setA', [page('p_z'), page('p_a2')])], [])
    const byId = (r: ViewRow[]): ViewRow[] => [...r].sort((x, y) => (x.id < y.id ? -1 : 1))
    const { rows, setTree } = flattenContainer(col3, values3)
    const groups = resolveGroups(rows, structural, statusSchema, setTree, byId, [], 'bottom', sub)
    expect(itemIds(groups[0].children![0])).toEqual(['p_a2', 'p_z'])
  })

  it('an unmappable sub-group property falls back to plain structural', () => {
    const { rows, setTree } = flattenContainer(col, values)
    const groups = resolveGroups(rows, structural, statusSchema, setTree, null, [], 'bottom', {
      property_id: 'prop_gone',
      order_mode: 'configured',
    })
    expect(groups.find((g) => g.key === 'setA')!.children!.map((c) => c.key)).toEqual(['setA1'])
  })
})

describe('ungrouped placement (the view-level knob)', () => {
  it('structural: top placement leads with the loose tail', () => {
    const { rows, setTree } = flattenContainer(
      collection([set('s1', [page('p1')])], [page('p_root')]),
      {},
    )
    const groups = resolveGroups(rows, { kind: 'structural' }, [], setTree, null, [], 'top')
    expect(groups.map((g) => [g.key, g.kind])).toEqual([
      ['_ungrouped', 'ungrouped'],
      ['s1', 'structural-set'],
    ])
  })

  it('property: top placement leads with the no-value band', () => {
    const values = pageValues({
      p1: { [ID_KEY]: 'p1', ...propsAtRoot({ prop_status: 'done' }, statusSchema) },
      p2: { [ID_KEY]: 'p2' },
    })
    const { rows, setTree } = flattenContainer(collection([], [page('p1'), page('p2')]), values)
    const group: GroupConfig = {
      kind: 'property',
      property_id: 'prop_status',
      order_mode: 'configured',
      empty_placement: 'bottom',
      hide_empty_groups: false,
    }
    const groups = resolveGroups(rows, group, statusSchema, setTree, null, [], 'top')
    expect(keys(groups)).toEqual(['_ungrouped', 'not_started', 'opt_open', 'in_progress', 'done'])
  })

  it('default stays bottom (legacy behavior)', () => {
    const { rows, setTree } = flattenContainer(
      collection([set('s1', [page('p1')])], [page('p_root')]),
      {},
    )
    const groups = resolveGroups(rows, { kind: 'structural' }, [], setTree, null)
    expect(groups[groups.length - 1].kind).toBe('ungrouped')
  })
})

describe('property grouping — configured / reversed / checkbox / date', () => {
  const selSchema: PropertyDefinition[] = [
    {
      id: 'prop_sel',
      name: 'Sel',
      type: 'select',
      select_options: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
        { value: 'c', label: 'C' },
      ],
    },
  ]
  const cfg = (over: Partial<Extract<GroupConfig, { kind: 'property' }>>): GroupConfig => ({
    kind: 'property',
    property_id: 'prop_sel',
    order_mode: 'configured',
    empty_placement: 'bottom',
    hide_empty_groups: false,
    ...over,
  })

  it('configured uses schema option order; reversed flips it', () => {
    const values = pageValues({
      p1: { [ID_KEY]: 'p1', ...propsAtRoot({ prop_sel: 'c' }, selSchema) },
      p2: { [ID_KEY]: 'p2', ...propsAtRoot({ prop_sel: 'a' }, selSchema) },
      p3: { [ID_KEY]: 'p3', ...propsAtRoot({ prop_sel: 'b' }, selSchema) },
    })
    const { rows, setTree } = flattenContainer(
      collection([], [page('p1'), page('p2'), page('p3')]),
      values,
    )
    expect(
      keys(resolveGroups(rows, cfg({ order_mode: 'configured' }), selSchema, setTree, null)),
    ).toEqual(['a', 'b', 'c'])
    expect(
      keys(resolveGroups(rows, cfg({ order_mode: 'reversed' }), selSchema, setTree, null)),
    ).toEqual(['c', 'b', 'a'])
  })

  it('routes a nil checkbox to the false bucket with no no-value band', () => {
    const cbSchema: PropertyDefinition[] = [{ id: 'prop_done', name: 'Done', type: 'checkbox' }]
    const values = pageValues({
      p1: { [ID_KEY]: 'p1', ...propsAtRoot({ prop_done: true }, cbSchema) },
      p2: { [ID_KEY]: 'p2', ...propsAtRoot({ prop_done: false }, cbSchema) },
      p3: { [ID_KEY]: 'p3' },
    })
    const { rows, setTree } = flattenContainer(
      collection([], [page('p1'), page('p2'), page('p3')]),
      values,
    )
    const groups = resolveGroups(
      rows,
      {
        kind: 'property',
        property_id: 'prop_done',
        order_mode: 'configured',
        empty_placement: 'bottom',
        hide_empty_groups: false,
      },
      cbSchema,
      setTree,
      null,
    )
    expect(keys(groups)).toEqual(['false', 'true'])
    expect(itemIds(groups[0])).toEqual(['p2', 'p3'])
    expect(itemIds(groups[1])).toEqual(['p1'])
  })

  it('buckets dates by granularity (same month together)', () => {
    const dateSchema: PropertyDefinition[] = [{ id: 'prop_when', name: 'When', type: 'datetime' }]
    const values = pageValues({
      p1: {
        [ID_KEY]: 'p1',
        ...propsAtRoot({ prop_when: '2026-06-10T12:00:00Z' }, dateSchema),
      },
      p2: {
        [ID_KEY]: 'p2',
        ...propsAtRoot({ prop_when: '2026-06-25T12:00:00Z' }, dateSchema),
      },
      p3: {
        [ID_KEY]: 'p3',
        ...propsAtRoot({ prop_when: '2026-07-15T12:00:00Z' }, dateSchema),
      },
    })
    const { rows, setTree } = flattenContainer(
      collection([], [page('p1'), page('p2'), page('p3')]),
      values,
    )
    const groups = resolveGroups(
      rows,
      {
        kind: 'property',
        property_id: 'prop_when',
        order_mode: 'configured',
        date_granularity: 'month',
        empty_placement: 'bottom',
        hide_empty_groups: false,
      },
      dateSchema,
      setTree,
      null,
    )
    expect(keys(groups)).toEqual(['2026-06', '2026-07'])
    expect(itemIds(groups[0]).sort()).toEqual(['p1', 'p2'])
  })

  it('buckets a date-only value by its stored date (no timezone shift)', () => {
    const dueSchema: PropertyDefinition[] = [{ id: 'prop_due', name: 'Due', type: 'datetime' }]
    const values = pageValues({
      p1: { [ID_KEY]: 'p1', ...propsAtRoot({ prop_due: '2026-06-27' }, dueSchema) },
    })
    const { rows, setTree } = flattenContainer(collection([], [page('p1')]), values)
    const groups = resolveGroups(
      rows,
      {
        kind: 'property',
        property_id: 'prop_due',
        order_mode: 'configured',
        date_granularity: 'day',
        empty_placement: 'bottom',
        hide_empty_groups: false,
      },
      dueSchema,
      setTree,
      null,
    )
    expect(keys(groups)).toEqual(['2026-06-27'])
  })
})

describe('property grouping — non-groupable fallback', () => {
  it('falls back to structural for number and multi_select group properties', () => {
    const { rows, setTree } = flattenContainer(
      collection([set('s1', [page('p1')])], [page('p2')]),
      {},
    )
    const numGroups = resolveGroups(
      rows,
      {
        kind: 'property',
        property_id: 'prop_num',
        order_mode: 'configured',
        empty_placement: 'bottom',
        hide_empty_groups: false,
      },
      [{ id: 'prop_num', name: 'Num', type: 'number' }],
      setTree,
      null,
    )
    expect(keys(numGroups)).toEqual(['s1', '_ungrouped'])

    const msGroups = resolveGroups(
      rows,
      {
        kind: 'property',
        property_id: 'prop_tags',
        order_mode: 'configured',
        empty_placement: 'bottom',
        hide_empty_groups: false,
      },
      [{ id: 'prop_tags', name: 'Tags', type: 'multi_select' }],
      setTree,
      null,
    )
    expect(keys(msGroups)).toEqual(['s1', '_ungrouped'])
  })
})

describe('dateBucketKey', () => {
  it('formats month and year keys (zero-padded, lexicographically chronological)', () => {
    expect(dateBucketKey('2026-06-15T12:00:00Z', 'month')).toBe('2026-06')
    expect(dateBucketKey('2026-06-15T12:00:00Z', 'year')).toBe('2026')
  })

  it('formats day and week keys with the right shape', () => {
    expect(dateBucketKey('2026-06-15T12:00:00Z', 'day')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(dateBucketKey('2026-06-15T12:00:00Z', 'week')).toMatch(/^\d{4}-W\d{2}$/)
  })

  it('returns null for an unparseable date', () => {
    expect(dateBucketKey('not-a-date', 'month')).toBeNull()
  })

  it('buckets a date-only value by its stored calendar date, stable across timezones (utc)', () => {
    expect(dateBucketKey('2026-06-27', 'day', true)).toBe('2026-06-27')
    expect(dateBucketKey('2026-06-27', 'month', true)).toBe('2026-06')
    expect(dateBucketKey('2026-06-27', 'year', true)).toBe('2026')
    // 2026-01-01 is a Thursday → ISO week 1; 2025-12-31 (Wed) shares it (its Thursday is Jan 1).
    expect(dateBucketKey('2026-01-01', 'week', true)).toBe('2026-W01')
    expect(dateBucketKey('2025-12-31', 'week', true)).toBe('2026-W01')
  })
})
