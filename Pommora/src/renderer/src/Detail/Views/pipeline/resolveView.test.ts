import { describe, it, expect } from 'vitest'
import { PAGE_ID_KEY } from '@shared/identity'
import fixture from '@shared/__fixtures__/collection-with-status.json'
import registry from '@shared/__fixtures__/registry.json'
import type { CollectionNode, PageNode } from '@shared/types'
import {
  savedView,
  mintDefaultView,
  DEFAULT_VIEW_ID,
  LOCATION_SORT,
  type SavedView,
} from '@shared/views'
import type { SetNode } from '@shared/types'
import { propertyDefinition, type PropertyDefinition } from '@shared/properties'
import type { PageFrontmatter } from '@shared/schemas'
import { flattenContainer } from './group'
import { resolveView } from './resolveView'
import { propsAtRoot } from '@renderer/testing/propsAtRoot'

const page = (id: string): PageNode => ({ kind: 'page', id, title: id, path: `${id}.md` })
const collection = (pages: PageNode[]): CollectionNode => ({
  kind: 'collection',
  id: 'col',
  title: 'Col',
  path: 'Col',
  sets: [],
  pages,
})

describe('resolveView — Sort By: Location (cards)', () => {
  const setNode = (id: string, pages: PageNode[]): SetNode => ({
    kind: 'set',
    id,
    title: id,
    path: id,
    pages,
    sets: [],
  })
  const withSets: CollectionNode = {
    kind: 'collection',
    id: 'c',
    title: 'C',
    path: 'C',
    sets: [setNode('sA', [page('p_a')])],
    pages: [page('p_root')],
  }
  const cardsView = (patch: Partial<SavedView>): SavedView =>
    savedView.parse({
      id: 'v',
      name: 'V',
      type: 'cards',
      property_order: [],
      hidden_properties: [],
      ...patch,
    })

  it('Group: None + Sort By: Location (Location order) → one flat band in filesystem order', () => {
    const { rows, setTree } = flattenContainer(withSets, {})
    const view = cardsView({
      group: { kind: 'flat' },
      sort: [{ property_id: LOCATION_SORT, direction: 'ascending' }],
      structural_order_mode: 'location',
    })
    const { groups } = resolveView({ rows, setTree, view, schema: [], flattenStructural: true })
    expect(groups.map((g) => g.kind)).toEqual(['ungrouped'])
    expect(groups[0].items.map((r) => r.id)).toEqual(['p_a', 'p_root']) // set page, then the root tail
  })

  it('the reserved location primary contributes nothing to a table (no flattenStructural)', () => {
    const { rows, setTree } = flattenContainer(withSets, {})
    const view = cardsView({
      group: { kind: 'flat' },
      sort: [{ property_id: LOCATION_SORT, direction: 'ascending' }],
      structural_order_mode: 'location',
    })
    // Without flattenStructural the location flatten never engages — flat() yields one band, but the
    // pipeline never routes through the structural walk (the table can't be flattened by this field).
    const { groups } = resolveView({ rows, setTree, view, schema: [] })
    expect(groups.map((g) => g.kind)).toEqual(['ungrouped'])
  })
})

describe('resolveView — full pipeline over the fixture', () => {
  it('resolves columns (status-first) + grouped rows (manual order, empty band rendered, no-value tail)', () => {
    const view = savedView.parse(fixture.views[0])
    const schema = fixture.properties.map((id) =>
      propertyDefinition.parse((registry as Record<string, unknown>)[id]),
    )
    const values: Record<string, PageFrontmatter> = {
      p1: { [PAGE_ID_KEY]: 'p1', ...propsAtRoot({ prop_status: 'in_progress' }, schema) },
      p2: { [PAGE_ID_KEY]: 'p2', ...propsAtRoot({ prop_status: 'opt_open' }, schema) },
      p3: { [PAGE_ID_KEY]: 'p3', ...propsAtRoot({ prop_status: 'not_started' }, schema) },
      p4: { [PAGE_ID_KEY]: 'p4' },
    }
    const { rows, setTree } = flattenContainer(
      collection([page('p1'), page('p2'), page('p3'), page('p4')]),
      values,
    )
    const { columns, groups } = resolveView({
      rows,
      setTree,
      view,
      schema,
      contextIds: ['ctx_areas', 'ctx_topics', 'ctx_projects'],
    })

    expect(columns[0].id).toBe('prop_status')
    // prop_when is in the schema but in neither list → the allowlist keeps it off the table
    expect(columns.map((c) => c.id)).toEqual([
      'prop_status',
      '_title',
      'ctx_projects',
      'ctx_topics',
      'ctx_areas',
    ])
    // manual order ['in_progress','opt_open','not_started','done'] — done empty → an empty band; no-value tail last
    expect(groups.map((g) => g.key)).toEqual([
      'in_progress',
      'opt_open',
      'not_started',
      'done',
      '_ungrouped',
    ])
    expect(groups.find((g) => g.key === 'in_progress')?.items.map((r) => r.id)).toEqual(['p1'])
    expect(groups.find((g) => g.key === '_ungrouped')?.items.map((r) => r.id)).toEqual(['p4'])
    expect(groups.find((g) => g.key === 'done')?.items).toEqual([])
  })

  it('sorts rows within each group', () => {
    const schema: PropertyDefinition[] = [
      {
        id: 'prop_status',
        name: 'S',
        type: 'status',
        status_groups: [
          {
            id: 'in_progress',
            label: 'IP',
            color: 'blue',
            options: [{ value: 'in_progress', label: 'A', group_id: 'in_progress' }],
          },
        ],
      },
    ]
    const view: SavedView = {
      id: 'v',
      name: 'V',
      type: 'table',
      property_order: ['_title'],
      hidden_properties: [],
      group: {
        kind: 'property',
        property_id: 'prop_status',
        order_mode: 'configured',
        empty_placement: 'bottom',
        hide_empty_groups: false,
      },
      sort: [{ property_id: '_title', direction: 'descending' }],
    }
    const values: Record<string, PageFrontmatter> = {
      a: { [PAGE_ID_KEY]: 'a', ...propsAtRoot({ prop_status: 'in_progress' }, schema) },
      b: { [PAGE_ID_KEY]: 'b', ...propsAtRoot({ prop_status: 'in_progress' }, schema) },
    }
    const { rows, setTree } = flattenContainer(collection([page('a'), page('b')]), values)
    const { groups } = resolveView({ rows, setTree, view, schema })
    expect(groups.find((g) => g.key === 'in_progress')?.items.map((r) => r.id)).toEqual(['b', 'a'])
  })
})

describe('resolveView — group_order', () => {
  it('reorders structural bands from the view-level flat array (ungrouped stays last)', () => {
    const setNode = (id: string): CollectionNode['sets'][number] => ({
      kind: 'set',
      id,
      title: id,
      path: id,
      pages: [],
      sets: [],
    })
    const col: CollectionNode = {
      kind: 'collection',
      id: 'col',
      title: 'Col',
      path: 'Col',
      sets: [setNode('sA'), setNode('sB')],
      pages: [page('loose')],
    }
    const view: SavedView = {
      id: 'v',
      name: 'V',
      type: 'table',
      property_order: ['_title'],
      hidden_properties: [],
      group: { kind: 'structural' },
      group_order: ['sB', 'sA'],
    }
    const { rows, setTree } = flattenContainer(col, {})
    const { groups } = resolveView({ rows, setTree, view, schema: [] })
    expect(groups.map((g) => g.key)).toEqual(['sB', 'sA', '_ungrouped'])
  })

  it('structural_order_mode location ignores group_order (fs order wins, preserved not cleared)', () => {
    const setNode = (id: string): CollectionNode['sets'][number] => ({
      kind: 'set',
      id,
      title: id,
      path: id,
      pages: [],
      sets: [],
    })
    const col: CollectionNode = {
      kind: 'collection',
      id: 'col',
      title: 'Col',
      path: 'Col',
      sets: [setNode('sA'), setNode('sB')],
      pages: [],
    }
    const view: SavedView = {
      id: 'v',
      name: 'V',
      type: 'table',
      property_order: ['_title'],
      hidden_properties: [],
      group: { kind: 'structural' },
      structural_order_mode: 'location',
      group_order: ['sB', 'sA'],
    }
    const { rows, setTree } = flattenContainer(col, {})
    const { groups } = resolveView({ rows, setTree, view, schema: [] })
    expect(groups.map((g) => g.key)).toEqual(['sA', 'sB'])
    expect(view.group_order).toEqual(['sB', 'sA'])
  })

  it('location mode under PROPERTY grouping is inert (the mode is structural-only)', () => {
    const view = savedView.parse({
      ...fixture.views[0],
      structural_order_mode: 'location',
    })
    const schema = fixture.properties.map((id) =>
      propertyDefinition.parse((registry as Record<string, unknown>)[id]),
    )
    const { rows, setTree } = flattenContainer(collection([page('p1')]), {
      p1: { [PAGE_ID_KEY]: 'p1' },
    })
    expect(() => resolveView({ rows, setTree, view, schema })).not.toThrow()
  })

  it('a DEAD-property grouping is effectively structural: location gate honored, tail placed, sub-group threaded', () => {
    const nested: CollectionNode = {
      kind: 'collection',
      id: 'col',
      title: 'Col',
      path: 'Col',
      sets: [
        { kind: 'set', id: 's1', title: 'S1', path: 'Col/S1', sets: [], pages: [page('p1')] },
        { kind: 'set', id: 's2', title: 'S2', path: 'Col/S2', sets: [], pages: [page('p2')] },
      ],
      pages: [page('root1')],
    }
    const schema: PropertyDefinition[] = [
      {
        id: 'prop_status',
        name: 'S',
        type: 'status',
        status_groups: [
          {
            id: 'g',
            label: 'G',
            color: 'blue',
            options: [{ value: 'todo', label: 'T', group_id: 'g' }],
          },
        ],
      },
    ]
    const values: Record<string, PageFrontmatter> = {
      p1: { [PAGE_ID_KEY]: 'p1', ...propsAtRoot({ prop_status: 'todo' }, schema) },
      p2: { [PAGE_ID_KEY]: 'p2' },
      root1: { [PAGE_ID_KEY]: 'root1' },
    }
    const base: SavedView = {
      id: 'v',
      name: 'V',
      type: 'table',
      property_order: ['_title'],
      hidden_properties: [],
      group: {
        kind: 'property',
        property_id: 'prop_gone',
        order_mode: 'configured',
        empty_placement: 'bottom',
        hide_empty_groups: false,
      },
    }
    const { rows, setTree } = flattenContainer(nested, values)
    // Location ignores group_order (fs order stands) and the view-level tail placement holds top.
    const located = resolveView({
      rows,
      setTree,
      view: {
        ...base,
        structural_order_mode: 'location',
        group_order: ['s2', 's1'],
        ungrouped_placement: 'top',
      },
      schema,
    })
    expect(located.groups.map((g) => g.key)).toEqual(['_ungrouped', 's1', 's2'])
    // The sub-group buckets inside the structural fallback exactly as under real Location grouping.
    const subbed = resolveView({
      rows,
      setTree,
      view: { ...base, sub_group: { property_id: 'prop_status', order_mode: 'configured' } },
      schema,
    })
    expect(
      subbed.groups.find((g) => g.key === 's1')?.children?.map((c) => c.bucket ?? c.key),
    ).toEqual(['todo'])
  })
})

describe('resolveView — a biting filter prunes emptied structural bands', () => {
  const set = (id: string, pages: PageNode[], sets: SetNode[] = []): SetNode => ({
    kind: 'set',
    id,
    title: id,
    path: id,
    pages,
    sets,
  })
  // sOuter holds one page of its own and nests sInner (one page); sBare holds nothing at all.
  const nested: CollectionNode = {
    kind: 'collection',
    id: 'col',
    title: 'Col',
    path: 'Col',
    sets: [set('sOuter', [page('p_outer')], [set('sInner', [page('p_inner')])]), set('sBare', [])],
    pages: [],
  }
  const values: Record<string, PageFrontmatter> = {}
  const view = (patch: Partial<SavedView> = {}): SavedView => ({
    id: 'v',
    name: 'V',
    type: 'table',
    property_order: ['_title'],
    hidden_properties: [],
    group: { kind: 'structural' },
    ...patch,
  })
  const keys = (groups: { key: string }[]): string[] => groups.map((g) => g.key)

  it('keeps every empty band while no filter is applied', () => {
    const { rows, setTree } = flattenContainer(nested, values)
    const { groups } = resolveView({ rows, setTree, view: view(), schema: [] })
    expect(keys(groups)).toEqual(['sOuter', 'sBare'])
    expect(keys(groups[0].children ?? [])).toEqual(['sInner'])
  })

  it('keeps every empty band when the filter is on but excludes nothing', () => {
    const { rows, setTree } = flattenContainer(nested, values)
    const { groups } = resolveView({
      rows,
      setTree,
      view: view({
        filter: { match: 'all', rules: [{ property_id: '_title', op: 'is_not_empty' }] },
      }),
      schema: [],
    })
    expect(keys(groups)).toEqual(['sOuter', 'sBare'])
  })

  it('drops a parent whose own rows AND every descendant were filtered out', () => {
    const { rows, setTree } = flattenContainer(nested, values)
    const { groups } = resolveView({
      rows,
      setTree,
      view: view({
        filter: { match: 'all', rules: [{ property_id: '_title', op: 'is', value: 'nothing' }] },
      }),
      schema: [],
    })
    expect(groups).toEqual([])
  })

  it('keeps a parent that survives on its own row and drops the emptied child', () => {
    const { rows, setTree } = flattenContainer(nested, values)
    const { groups } = resolveView({
      rows,
      setTree,
      view: view({
        filter: { match: 'all', rules: [{ property_id: '_title', op: 'is', value: 'p_outer' }] },
      }),
      schema: [],
    })
    expect(keys(groups)).toEqual(['sOuter'])
    expect(groups[0].children).toBeUndefined()
  })

  it('keeps a parent holding no rows of its own when a descendant survives', () => {
    const { rows, setTree } = flattenContainer(nested, values)
    const { groups } = resolveView({
      rows,
      setTree,
      view: view({
        filter: { match: 'all', rules: [{ property_id: '_title', op: 'is', value: 'p_inner' }] },
      }),
      schema: [],
    })
    expect(keys(groups)).toEqual(['sOuter'])
    expect(groups[0].items).toEqual([])
    expect(keys(groups[0].children ?? [])).toEqual(['sInner'])
  })

  it('prunes the flattened cards bands too', () => {
    const { rows, setTree } = flattenContainer(nested, values)
    const { groups } = resolveView({
      rows,
      setTree,
      view: view({
        type: 'cards',
        filter: { match: 'all', rules: [{ property_id: '_title', op: 'is', value: 'p_inner' }] },
      }),
      schema: [],
      flattenStructural: true,
    })
    expect(keys(groups)).toEqual(['sOuter'])
    expect(groups[0].items.map((r) => r.id)).toEqual(['p_inner'])
  })

  it('a parked filter prunes nothing — rules and mode survive, application stops', () => {
    const { rows, setTree } = flattenContainer(nested, values)
    const { groups } = resolveView({
      rows,
      setTree,
      view: view({
        filter_enabled: false,
        filter: { match: 'all', rules: [{ property_id: '_title', op: 'is', value: 'nothing' }] },
      }),
      schema: [],
    })
    expect(keys(groups)).toEqual(['sOuter', 'sBare'])
  })
})

describe('resolveView — hidden groups + Hide Empty Groups', () => {
  const set = (id: string, pages: PageNode[], sets: SetNode[] = []): SetNode => ({
    kind: 'set',
    id,
    title: id,
    path: id,
    pages,
    sets,
  })
  const keys = (groups: { key: string }[]): string[] => groups.map((g) => g.key)
  const selectSchema: PropertyDefinition[] = [
    {
      id: 'prop_sel',
      name: 'Sel',
      type: 'select',
      select_options: [
        { value: 'Alpha', label: 'Alpha' },
        { value: 'Beta', label: 'Beta' },
        { value: 'Gamma', label: 'Gamma' },
      ],
    },
  ]
  const view = (patch: Partial<SavedView>): SavedView =>
    savedView.parse({
      id: 'v',
      name: 'V',
      type: 'table',
      property_order: [],
      hidden_properties: [],
      ...patch,
    })
  const selValues: Record<string, PageFrontmatter> = {
    p1: { [PAGE_ID_KEY]: 'p1', ...propsAtRoot({ prop_sel: 'Alpha' }, selectSchema) },
    p2: { [PAGE_ID_KEY]: 'p2', ...propsAtRoot({ prop_sel: 'Beta' }, selectSchema) },
  }
  const selInput = () => {
    const { rows, setTree } = flattenContainer(collection([page('p1'), page('p2')]), selValues)
    return { rows, setTree, schema: selectSchema }
  }
  // sOuter holds p_outer and nests sInner (p_inner); sB holds p_b.
  const nested: CollectionNode = {
    kind: 'collection',
    id: 'col',
    title: 'Col',
    path: 'Col',
    sets: [set('sOuter', [page('p_outer')], [set('sInner', [page('p_inner')])]), set('sB', [page('p_b')])],
    pages: [],
  }

  it('negative control: absent and empty hidden_groups resolve identical groups, bands present', () => {
    const base = resolveView({ ...selInput(), view: view({ group: propertyGroup() }) })
    const empty = resolveView({
      ...selInput(),
      view: view({ group: propertyGroup(), hidden_groups: [] }),
    })
    expect(base.groups).toEqual(empty.groups)
    expect(keys(base.groups)).toEqual(['Alpha', 'Beta', 'Gamma'])
  })

  const propertyGroup = () => ({
    kind: 'property' as const,
    property_id: 'prop_sel',
    order_mode: 'configured' as const,
    empty_placement: 'bottom' as const,
    hide_empty_groups: false,
  })

  it('a hidden option bucket drops with its rows; the others are untouched', () => {
    const { groups } = resolveView({
      ...selInput(),
      view: view({ group: propertyGroup(), hidden_groups: ['Alpha'] }),
    })
    expect(keys(groups)).toEqual(['Beta', 'Gamma'])
    expect(groups.flatMap((g) => g.items.map((r) => r.id))).toEqual(['p2'])
  })

  it('a hidden set leaves with its whole subtree (structural)', () => {
    const { rows, setTree } = flattenContainer(nested, {})
    const { groups } = resolveView({
      rows,
      setTree,
      view: view({ hidden_groups: ['sOuter'] }),
      schema: [],
    })
    expect(keys(groups)).toEqual(['sB'])
  })

  it('cards flatten excludes a hidden NESTED set’s pages from the parent band', () => {
    const { rows, setTree } = flattenContainer(nested, {})
    const { groups } = resolveView({
      rows,
      setTree,
      view: view({ type: 'cards', hidden_groups: ['sInner'] }),
      schema: [],
      flattenStructural: true,
    })
    expect(groups.find((g) => g.key === 'sOuter')?.items.map((r) => r.id)).toEqual(['p_outer'])
  })

  it('a flat/None view never loses pages to a stale hidden set id', () => {
    const { rows, setTree } = flattenContainer(nested, {})
    const { groups } = resolveView({
      rows,
      setTree,
      view: view({ type: 'cards', group: { kind: 'flat' }, hidden_groups: ['sOuter'] }),
      schema: [],
      flattenStructural: true,
    })
    expect(groups.flatMap((g) => g.items.map((r) => r.id)).sort()).toEqual([
      'p_b',
      'p_inner',
      'p_outer',
    ])
  })

  it('sub/<value> hides that sub-bucket under EVERY set', () => {
    const twoSets: CollectionNode = {
      kind: 'collection',
      id: 'col',
      title: 'Col',
      path: 'Col',
      sets: [set('sA', [page('p1'), page('p2')]), set('sB', [page('p3')])],
      pages: [],
    }
    const values: Record<string, PageFrontmatter> = {
      p1: { [PAGE_ID_KEY]: 'p1', ...propsAtRoot({ prop_sel: 'Alpha' }, selectSchema) },
      p2: { [PAGE_ID_KEY]: 'p2', ...propsAtRoot({ prop_sel: 'Beta' }, selectSchema) },
      p3: { [PAGE_ID_KEY]: 'p3', ...propsAtRoot({ prop_sel: 'Beta' }, selectSchema) },
    }
    const { rows, setTree } = flattenContainer(twoSets, values)
    const { groups } = resolveView({
      rows,
      setTree,
      view: view({
        sub_group: { property_id: 'prop_sel', order_mode: 'configured' },
        hidden_groups: ['sub/Beta'],
      }),
      schema: selectSchema,
    })
    const buckets = (id: string): string[] | undefined =>
      groups.find((g) => g.key === id)?.children?.map((c) => c.bucket ?? c.key)
    expect(buckets('sA')).toEqual(['Alpha'])
    expect(groups.find((g) => g.key === 'sB')?.children).toBeUndefined()
  })

  it('a hidden date bucket drops by its bucket key', () => {
    const dateSchema: PropertyDefinition[] = [{ id: 'prop_when', name: 'When', type: 'datetime' }]
    const values: Record<string, PageFrontmatter> = {
      p1: { [PAGE_ID_KEY]: 'p1', ...propsAtRoot({ prop_when: '2025-07-02' }, dateSchema) },
      p2: { [PAGE_ID_KEY]: 'p2', ...propsAtRoot({ prop_when: '2025-08-03' }, dateSchema) },
    }
    const { rows, setTree } = flattenContainer(collection([page('p1'), page('p2')]), values)
    const { groups } = resolveView({
      rows,
      setTree,
      view: view({
        group: {
          kind: 'property',
          property_id: 'prop_when',
          order_mode: 'configured',
          date_granularity: 'month',
          empty_placement: 'bottom',
          hide_empty_groups: false,
        },
        hidden_groups: ['2025-07'],
      }),
      schema: dateSchema,
    })
    expect(keys(groups)).toEqual(['2025-08'])
  })

  it('Hide Empty Groups (view-level) drops empty option bands and empty sets alike', () => {
    const prop = resolveView({
      ...selInput(),
      view: view({ group: propertyGroup(), hide_empty_groups: true }),
    })
    expect(keys(prop.groups)).toEqual(['Alpha', 'Beta']) // Gamma holds nothing
    const { rows, setTree } = flattenContainer(nested, {})
    const structural = resolveView({
      rows,
      setTree,
      view: view({ hide_empty_groups: true }),
      schema: [],
    })
    expect(keys(structural.groups)).toEqual(['sOuter', 'sB']) // sInner kept — it holds p_inner
  })

  it('the config-level flag still bites as fallback; an explicit view-level false overrides it', () => {
    const legacy = resolveView({
      ...selInput(),
      view: view({ group: { ...propertyGroup(), hide_empty_groups: true } }),
    })
    expect(keys(legacy.groups)).toEqual(['Alpha', 'Beta'])
    const overridden = resolveView({
      ...selInput(),
      view: view({
        group: { ...propertyGroup(), hide_empty_groups: true },
        hide_empty_groups: false,
      }),
    })
    expect(keys(overridden.groups)).toEqual(['Alpha', 'Beta', 'Gamma'])
  })
})

describe('mintDefaultView', () => {
  it('mints a Table view: sentinel id, title-only, structural, no sort or _modified_at', () => {
    const schema: PropertyDefinition[] = [
      { id: 'prop_x', name: 'X', type: 'select' },
      { id: 'prop_y', name: 'Y', type: 'number' },
    ]
    const v = mintDefaultView(schema)
    expect(v.id).toBe(DEFAULT_VIEW_ID)
    expect(v.id).toBe('view_default')
    expect(v.type).toBe('table')
    expect(v.property_order).toEqual(['_title'])
    expect(v.hidden_properties).toContain('prop_x')
    expect(v.group).toEqual({ kind: 'structural' })
    expect(v.sort).toBeUndefined()
    expect(v.property_order).not.toContain('_modified_at')
  })
})
