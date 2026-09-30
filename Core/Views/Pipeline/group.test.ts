import { describe, it, expect } from 'vitest'
import { ID_KEY } from '../../Nexus/identityMark'
import type { CollectionNode, PageNode, SetNode } from '../../Nexus/tree'
import type { ViewRow } from '../viewRow'
import { type GroupConfig, LOCATION_SORT, type SavedView, type SubGroupConfig } from '../views'
import type { PropertyDefinition } from '../../Properties/properties'
import {
  bucketGroupingOf,
  bucketKey,
  dateBucketKey,
  flattenContainer,
  frontmatterOf,
  groupPlan,
  pageOrderOf,
  pruneEmptyBuckets,
  resolveGroups as resolveGroupsOf,
  type SetTreeNode,
  setOrderOf,
  subGroupKey,
} from './group'
import { pageValues, propsAtRoot } from '../../Testing/pageValues'

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
const resolveGroups = (
  rows: ViewRow[],
  group: GroupConfig,
  schema: PropertyDefinition[],
  setTree: SetTreeNode[],
  sorter: ((rows: ViewRow[]) => ViewRow[]) | null,
  placement: 'top' | 'bottom',
  sub?: SubGroupConfig,
  flatten = false,
  locationFlatten = false,
) => {
  const view = {
    group,
    sub_group: sub,
    ...(locationFlatten ? { sort: [{ property_id: LOCATION_SORT, direction: 'asc' }] } : {}),
  } as SavedView
  return resolveGroupsOf(
    rows,
    groupPlan(view, schema, !flatten),
    schema,
    setTree,
    sorter,
    placement,
  )
}
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
          { value: 'not_started', group_id: 'upcoming' },
          { value: 'opt_open', group_id: 'upcoming' },
        ],
      },
      {
        id: 'in_progress',
        label: 'IP',
        color: 'blue',
        options: [{ value: 'in_progress', group_id: 'in_progress' }],
      },
      {
        id: 'done',
        label: 'D',
        color: 'green',
        options: [{ value: 'done', group_id: 'done' }],
      },
    ],
  },
]

describe('flattenContainer — page icons', () => {
  it('a page row takes its icon from pageMetadata', () => {
    const { rows } = flattenContainer(
      collection([], [page('p1'), page('p2')]),
      {},
      {
        p1: { icon: 'star' },
      },
    )
    expect(rows.map((r) => r.icon)).toEqual(['star', undefined])
  })
})

describe('flattenContainer + structural grouping', () => {
  it('groups a Collection by its Sets, nests Sub-Sets, roots loose pages in a trailing band', () => {
    const sub = set('sub', [page('p_sub')])
    const setA = set('setA', [page('p_a')], [sub])
    const setB = set('setB', [page('p_b')])
    const col = collection([setA, setB], [page('p_root')])
    const { rows, setTree } = flattenContainer(col, {}, {})
    const groups = resolveGroups(rows, { kind: 'structural' }, [], setTree, null, 'bottom')

    expect(groups.map((g) => [g.key, g.kind])).toEqual([
      ['setA', 'set'],
      ['setB', 'set'],
      ['_ungrouped', 'tail'],
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
    const { rows, setTree } = flattenContainer(col, {}, {})
    const groups = resolveGroups(
      rows,
      { kind: 'structural' },
      [],
      setTree,
      null,
      'bottom',
      undefined,
      true,
    )

    expect(groups.map((g) => [g.key, g.kind])).toEqual([
      ['setA', 'set'],
      ['setB', 'set'],
      ['_ungrouped', 'tail'],
    ])
    expect(itemIds(groups[0])).toEqual(['p_a', 'p_sub'])
    expect(groups[0].children).toBeUndefined()
    expect(itemIds(groups[1])).toEqual(['p_b'])
    expect(itemIds(groups[2])).toEqual(['p_root'])
  })

  it('flattenStructural: a manual sorter spans the whole flat band (a cross-level order sticks)', () => {
    const setA = set('setA', [page('p_a')], [set('sub', [page('p_sub')])])
    const { rows, setTree } = flattenContainer(collection([setA], []), {}, {})
    const order = ['p_sub', 'p_a']
    const bySpec = (r: ViewRow[]): ViewRow[] =>
      [...r].sort((x, y) => order.indexOf(x.id) - order.indexOf(y.id))
    const groups = resolveGroups(
      rows,
      { kind: 'structural' },
      [],
      setTree,
      bySpec,
      'bottom',
      undefined,
      true,
    )
    expect(itemIds(groups[0])).toEqual(['p_sub', 'p_a'])
  })

  it('locationFlatten (Sort by Location): concatenates every band into one headerless band', () => {
    const sub = set('sub', [page('p_sub')])
    const setA = set('setA', [page('p_a')], [sub])
    const setB = set('setB', [page('p_b')])
    const col = collection([setA, setB], [page('p_root')])
    const { rows, setTree } = flattenContainer(col, {}, {})
    const groups = resolveGroups(
      rows,
      { kind: 'flat' },
      [],
      setTree,
      null,
      'bottom',
      undefined,
      true,
      true,
    )
    expect(groups.map((g) => [g.key, g.kind])).toEqual([['_ungrouped', 'tail']])
    // location order: setA's subtree (p_a, p_sub), then setB (p_b), then the root tail (bottom)
    expect(itemIds(groups[0])).toEqual(['p_a', 'p_sub', 'p_b', 'p_root'])
  })

  it('groups a Set container identically — Sub-Sets become top groups, own pages band (shared path)', () => {
    const container = set(
      'setC',
      [page('p_own')],
      [set('subX', [page('p_x')]), set('subY', [page('p_y')])],
    )
    const { rows, setTree } = flattenContainer(container, {}, {})
    const groups = resolveGroups(rows, { kind: 'structural' }, [], setTree, null, 'bottom')
    expect(keys(groups)).toEqual(['subX', 'subY', '_ungrouped'])
    expect(itemIds(groups[2])).toEqual(['p_own'])
  })

  it('still shows an empty Set as a disclosure group', () => {
    const { rows, setTree } = flattenContainer(collection([set('empty', [])], []), {}, {})
    const groups = resolveGroups(rows, { kind: 'structural' }, [], setTree, null, 'bottom')
    expect(keys(groups)).toEqual(['empty'])
    expect(groups[0].items).toEqual([])
  })

  it('with zero Sets yields a single headerless band, and nothing for an empty container', () => {
    const { rows, setTree } = flattenContainer(collection([], [page('p1'), page('p2')]), {}, {})
    const groups = resolveGroups(rows, { kind: 'structural' }, [], setTree, null, 'bottom')
    expect(keys(groups)).toEqual(['_ungrouped'])
    expect(groups[0].kind).toBe('tail')
    expect(itemIds(groups[0])).toEqual(['p1', 'p2'])
    expect(resolveGroups([], { kind: 'structural' }, [], [], null, 'bottom')).toEqual([])
  })

  it('applies the sorter within each group', () => {
    const { rows, setTree } = flattenContainer(
      collection([], [page('b'), page('a'), page('c')]),
      {},
      {},
    )
    const byId = (r: ViewRow[]): ViewRow[] => [...r].sort((x, y) => (x.id < y.id ? -1 : 1))
    const groups = resolveGroups(rows, { kind: 'flat' }, [], setTree, byId, 'bottom')
    expect(itemIds(groups[0])).toEqual(['a', 'b', 'c'])
  })
})

describe('toRow stamps', () => {
  it("carries the batch entry's stamps and nulls them when the entry lacks them", () => {
    const { rows } = flattenContainer(
      collection([], [page('p1'), page('p2'), page('p3')]),
      {
        p1: {
          frontmatter: { [ID_KEY]: 'p1' },
          createdAt: '2024-01-02T03:04:05.000Z',
          modifiedAt: '2024-06-07T08:09:10.000Z',
        },
        p2: { frontmatter: { [ID_KEY]: 'p2' }, createdAt: null, modifiedAt: null },
      },
      {},
    )
    expect(rows[0]).toMatchObject({
      createdAt: '2024-01-02T03:04:05.000Z',
      modifiedAt: '2024-06-07T08:09:10.000Z',
    })
    for (const row of rows.slice(1)) {
      expect(row.createdAt).toBeNull()
      expect(row.modifiedAt).toBeNull()
    }
  })

  it('a pending Context patch overrides the node links per Context', () => {
    const linked: PageNode = { ...page('p1'), contextValues: { g1: ['a'], g2: ['b'] } }
    const { rows } = flattenContainer(
      collection([], [linked]),
      {
        p1: {
          frontmatter: { [ID_KEY]: 'p1' },
          createdAt: null,
          modifiedAt: null,
          contextValues: { g2: [] },
        },
      },
      {},
    )
    expect(rows[0]?.contextValues).toEqual({ g1: ['a'], g2: [] })
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
      {},
    )
    const groups = resolveGroups(rows, { kind: 'flat' }, [], setTree, null, 'bottom')
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
  }

  it('orders buckets by manual order — an empty bucket renders as an empty band, no-value tail at bottom', () => {
    const { rows, setTree } = flattenContainer(col, values, {})
    const groups = resolveGroups(rows, base, statusSchema, setTree, null, 'bottom')
    expect(keys(groups)).toEqual(['in_progress', 'opt_open', 'not_started', 'done', '_ungrouped'])
    expect(groups.find((g) => g.key === 'opt_open')?.items).toEqual([])
  })

  it('a stale manual-order key (deleted option) never renders a ghost band; live empty options do', () => {
    const { rows, setTree } = flattenContainer(col, values, {})
    const groups = resolveGroups(
      rows,
      { ...base, order: ['gone_opt', ...(base.order ?? [])] },
      statusSchema,
      setTree,
      null,
      'bottom',
    )
    expect(keys(groups)).toEqual(['in_progress', 'opt_open', 'not_started', 'done', '_ungrouped'])
  })

  it('resolution keeps live empty buckets — dropping them is the orchestrator’s (pruneEmptyBuckets); the no-value tail stays', () => {
    const { rows, setTree } = flattenContainer(col, values, {})
    const groups = resolveGroups(rows, base, statusSchema, setTree, null, 'bottom')
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
    const { rows, setTree } = flattenContainer(col, values, {})
    const groups = resolveGroups(rows, structural, statusSchema, setTree, null, 'bottom', sub)
    const setA = groups.find((g) => g.key === 'setA')!
    expect(setA.kind).toBe('set')
    expect(
      setA.children!.map((c) => ({
        kind: c.kind,
        value: c.kind === 'bucket' ? c.value : undefined,
      })),
    ).toEqual([
      { kind: 'bucket', value: 'not_started' },
      { kind: 'bucket', value: 'done' },
    ])
    expect(itemIds(setA.children![1])).toEqual(['p_sub'])
    expect(groups.some((g) => g.key === 'setA1')).toBe(false)
  })

  it("composite keys keep each set's bucket distinct", () => {
    const { rows, setTree } = flattenContainer(col, values, {})
    const groups = resolveGroups(rows, structural, statusSchema, setTree, null, 'bottom', sub)
    const setA = groups.find((g) => g.key === 'setA')!
    const setB = groups.find((g) => g.key === 'setB')!
    expect(setA.children!.find((c) => c.kind === 'bucket' && c.value === 'done')!.key).toBe(
      subGroupKey('setA', 'done'),
    )
    expect(setB.children!.find((c) => c.kind === 'bucket' && c.value === 'done')!.key).toBe(
      subGroupKey('setB', 'done'),
    )
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
    const { rows, setTree } = flattenContainer(col2, values2, {})
    const groups = resolveGroups(rows, structural, statusSchema, setTree, null, 'top', manual)
    expect(groups[0]).toMatchObject({ key: '_ungrouped', kind: 'tail' })
    expect(itemIds(groups[0])).toEqual(['p_loose'])
    const setA = groups.find((g) => g.key === 'setA')!
    expect(setA.children![0]).toMatchObject({
      kind: 'tail',
      key: subGroupKey('setA', '_ungrouped'),
    })
    expect(setA.children!.flatMap((c) => (c.kind === 'bucket' ? [c.value] : []))).toEqual([
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
    const { rows, setTree } = flattenContainer(col3, values3, {})
    const groups = resolveGroups(rows, structural, statusSchema, setTree, byId, 'bottom', sub)
    expect(itemIds(groups[0].children![0])).toEqual(['p_a2', 'p_z'])
  })

  it('an unmappable sub-group property falls back to plain structural', () => {
    const { rows, setTree } = flattenContainer(col, values, {})
    const groups = resolveGroups(rows, structural, statusSchema, setTree, null, 'bottom', {
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
      {},
    )
    const groups = resolveGroups(rows, { kind: 'structural' }, [], setTree, null, 'top')
    expect(groups.map((g) => [g.key, g.kind])).toEqual([
      ['_ungrouped', 'tail'],
      ['s1', 'set'],
    ])
  })

  it('property: top placement leads with the no-value band', () => {
    const values = pageValues({
      p1: { [ID_KEY]: 'p1', ...propsAtRoot({ prop_status: 'done' }, statusSchema) },
      p2: { [ID_KEY]: 'p2' },
    })
    const { rows, setTree } = flattenContainer(collection([], [page('p1'), page('p2')]), values, {})
    const group: GroupConfig = {
      kind: 'property',
      property_id: 'prop_status',
      order_mode: 'configured',
    }
    const groups = resolveGroups(rows, group, statusSchema, setTree, null, 'top')
    expect(keys(groups)).toEqual(['_ungrouped', 'not_started', 'opt_open', 'in_progress', 'done'])
  })

  it('default stays bottom (legacy behavior)', () => {
    const { rows, setTree } = flattenContainer(
      collection([set('s1', [page('p1')])], [page('p_root')]),
      {},
      {},
    )
    const groups = resolveGroups(rows, { kind: 'structural' }, [], setTree, null, 'bottom')
    expect(groups[groups.length - 1].kind).toBe('tail')
  })
})

describe('property grouping — configured / reversed / date', () => {
  const selSchema: PropertyDefinition[] = [
    {
      id: 'prop_sel',
      name: 'Sel',
      type: 'select',
      select_options: [{ value: 'a' }, { value: 'b' }, { value: 'c' }],
    },
  ]
  const cfg = (over: Partial<Extract<GroupConfig, { kind: 'property' }>>): GroupConfig => ({
    kind: 'property',
    property_id: 'prop_sel',
    order_mode: 'configured',
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
      {},
    )
    expect(
      keys(
        resolveGroups(rows, cfg({ order_mode: 'configured' }), selSchema, setTree, null, 'bottom'),
      ),
    ).toEqual(['a', 'b', 'c'])
    expect(
      keys(
        resolveGroups(rows, cfg({ order_mode: 'reversed' }), selSchema, setTree, null, 'bottom'),
      ),
    ).toEqual(['c', 'b', 'a'])
  })

  it('a checkbox group property falls back to structural; its rows still bucket for sort-run reassign', () => {
    const cbSchema: PropertyDefinition[] = [{ id: 'prop_done', name: 'Done', type: 'checkbox' }]
    const values = pageValues({
      p1: { [ID_KEY]: 'p1', ...propsAtRoot({ prop_done: true }, cbSchema) },
      p2: { [ID_KEY]: 'p2' },
    })
    const { rows, setTree } = flattenContainer(
      collection([set('s1', [page('p1')])], [page('p2')]),
      values,
      {},
    )
    const group = { kind: 'property', property_id: 'prop_done', order_mode: 'configured' } as const
    expect(groupPlan({ group } as SavedView, cbSchema, true).kind).toBe('sets')
    const groups = resolveGroups(rows, group, cbSchema, setTree, null, 'bottom')
    expect(groups.map((g) => g.kind)).toEqual(['set', 'tail'])
    const byId = (id: string) => rows.find((r) => r.id === id) as ViewRow
    expect(bucketKey(byId('p1'), 'prop_done', cbSchema, 'day')).toBe('true')
    expect(bucketKey(byId('p2'), 'prop_done', cbSchema, 'day')).toBeNull()
  })

  it('buckets dates by granularity (same month together)', () => {
    const dateSchema: PropertyDefinition[] = [{ id: 'prop_when', name: 'When', type: 'dateTime' }]
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
      {},
    )
    const groups = resolveGroups(
      rows,
      {
        kind: 'property',
        property_id: 'prop_when',
        order_mode: 'configured',
        date_granularity: 'month',
      },
      dateSchema,
      setTree,
      null,
      'bottom',
    )
    expect(keys(groups)).toEqual(['2026-06', '2026-07'])
    expect(itemIds(groups[0]).sort()).toEqual(['p1', 'p2'])
  })

  it('buckets a date-only value by its stored date (no timezone shift)', () => {
    const dueSchema: PropertyDefinition[] = [{ id: 'prop_due', name: 'Due', type: 'dateTime' }]
    const values = pageValues({
      p1: { [ID_KEY]: 'p1', ...propsAtRoot({ prop_due: '2026-06-27' }, dueSchema) },
    })
    const { rows, setTree } = flattenContainer(collection([], [page('p1')]), values, {})
    const groups = resolveGroups(
      rows,
      {
        kind: 'property',
        property_id: 'prop_due',
        order_mode: 'configured',
        date_granularity: 'day',
      },
      dueSchema,
      setTree,
      null,
      'bottom',
    )
    expect(keys(groups)).toEqual(['2026-06-27'])
  })
})

describe('property grouping — non-groupable fallback', () => {
  it('falls back to structural for number and multiSelect group properties', () => {
    const { rows, setTree } = flattenContainer(
      collection([set('s1', [page('p1')])], [page('p2')]),
      {},
      {},
    )
    const numGroups = resolveGroups(
      rows,
      {
        kind: 'property',
        property_id: 'prop_num',
        order_mode: 'configured',
      },
      [{ id: 'prop_num', name: 'Num', type: 'number' }],
      setTree,
      null,
      'bottom',
    )
    expect(keys(numGroups)).toEqual(['s1', '_ungrouped'])

    const msGroups = resolveGroups(
      rows,
      {
        kind: 'property',
        property_id: 'prop_tags',
        order_mode: 'configured',
      },
      [{ id: 'prop_tags', name: 'Tags', type: 'multiSelect' }],
      setTree,
      null,
      'bottom',
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

  it('buckets a date-only value by its stored calendar date in any timezone', () => {
    expect(dateBucketKey('2026-06-27', 'day')).toBe('2026-06-27')
    expect(dateBucketKey('2026-06-27', 'month')).toBe('2026-06')
    expect(dateBucketKey('2026-06-27', 'year')).toBe('2026')
    // 2026-01-01 is a Thursday → ISO week 1; 2025-12-31 (Wed) shares it (its Thursday is Jan 1).
    expect(dateBucketKey('2026-01-01', 'week')).toBe('2026-W01')
    expect(dateBucketKey('2025-12-31', 'week')).toBe('2026-W01')
  })

  it('buckets a zoned value by the local day its cell shows', () => {
    const lateEvening = new Date(2026, 5, 14, 23, 30)
    expect(dateBucketKey(lateEvening.toISOString(), 'day')).toBe('2026-06-14')
  })
})

describe('bucketGroupingOf', () => {
  const schema: PropertyDefinition[] = [
    { id: 'prop_s', name: 'S', type: 'status' },
    { id: 'prop_d', name: 'D', type: 'dateTime' },
  ]
  const sub = { property_id: 'prop_s', order_mode: 'configured' } as const
  const plan = (view: Partial<SavedView>) => groupPlan(view as SavedView, schema, true)

  it('follows the property group the engine draws, else the sub-group, and nothing on a flat view', () => {
    const drawn = { kind: 'property', property_id: 'prop_s', order_mode: 'configured' } as const
    const degraded = {
      kind: 'property',
      property_id: 'prop_gone',
      order_mode: 'configured',
    } as const
    expect(bucketGroupingOf(plan({ group: drawn, sub_group: sub }))).toBe(drawn)
    expect(bucketGroupingOf(plan({ group: degraded, sub_group: sub }))).toBe(sub)
    expect(bucketGroupingOf(plan({ group: { kind: 'structural' }, sub_group: sub }))).toBe(sub)
    expect(bucketGroupingOf(plan({ group: { kind: 'flat' }, sub_group: sub }))).toBeUndefined()
    const gone = { property_id: 'prop_gone', order_mode: 'configured' } as const
    expect(
      bucketGroupingOf(plan({ group: { kind: 'structural' }, sub_group: gone })),
    ).toBeUndefined()
  })

  it('reads a Date grouping and a Date sub-grouping stored manual as configured', () => {
    const group = { kind: 'property', property_id: 'prop_d', order_mode: 'manual' } as const
    expect(bucketGroupingOf(plan({ group }))).toMatchObject({ order_mode: 'configured' })
    const dateSub = { property_id: 'prop_d', order_mode: 'manual' } as const
    expect(
      bucketGroupingOf(plan({ group: { kind: 'structural' }, sub_group: dateSub })),
    ).toMatchObject({ order_mode: 'configured' })
  })
})

describe('setOrderOf and pageOrderOf', () => {
  const schema: PropertyDefinition[] = [{ id: 'prop_s', name: 'S', type: 'status' }]
  const property = { kind: 'property', property_id: 'prop_s', order_mode: 'configured' } as const
  const locationSort = [{ property_id: LOCATION_SORT, direction: 'asc' }]
  const planOf = (view: Partial<SavedView>, nests = true) =>
    groupPlan(view as SavedView, schema, nests)

  it('Sets read structural_order_mode; no grouping reads the Location sort, else custom; a property group is custom', () => {
    const sets = { group: { kind: 'structural' }, structural_order_mode: 'location' } as const
    expect(setOrderOf(planOf(sets), sets as SavedView)).toBe('location')
    const flat = { group: { kind: 'flat' } } as SavedView
    expect(setOrderOf(planOf(flat), flat)).toBe('custom')
    const flatLocation = { group: { kind: 'flat' }, sort: locationSort } as SavedView
    expect(setOrderOf(planOf(flatLocation, false), flatLocation)).toBe('location')
    const prop = { group: property } as SavedView
    expect(setOrderOf(planOf(prop), prop)).toBe('custom')
  })

  it('pages are custom under any effective sort, else follow the plan', () => {
    const view = { group: { kind: 'flat' }, sort: locationSort } as SavedView
    const plan = planOf(view, false)
    expect(pageOrderOf(plan, view, 0)).toBe('location')
    expect(pageOrderOf(plan, view, 1)).toBe('custom')
    const prop = { group: property } as SavedView
    expect(pageOrderOf(planOf(prop), prop, 0)).toBe('custom')
  })
})
