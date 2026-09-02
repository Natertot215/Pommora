import { describe, it, expect } from 'vitest'
import { PAGE_ID_KEY } from '@shared/identity'
import type { ViewRow } from '@shared/types'
import type { FilterGroup } from '@shared/views'
import type { PropertyDefinition } from '@shared/properties'
import { applyFilter, FILTER_OPS } from './filter'
import { propsAtRoot } from '@renderer/Testing/propsAtRoot'

const schema: PropertyDefinition[] = [
  {
    id: 'prop_st',
    name: 'Stage',
    type: 'status',
    status_groups: [
      {
        id: 'g',
        label: 'G',
        color: 'blue',
        options: [
          { value: 'Done', label: 'Done', group_id: 'g' },
          { value: 'Open', label: 'Open', group_id: 'g' },
        ],
      },
    ],
  },
  {
    id: 'prop_sel',
    name: 'Sel',
    type: 'select',
    select_options: ['a', 'b', 'alpha', 'beta', 'apple', 'banana'].map((v) => ({
      value: v,
      label: v,
    })),
  },
  { id: 'prop_num', name: 'Num', type: 'number' },
  { id: 'prop_url', name: 'Link', type: 'url' },
  { id: 'prop_when', name: 'When', type: 'datetime' },
  { id: 'prop_done', name: 'Done', type: 'checkbox' },
  { id: 'prop_tags', name: 'Tags', type: 'multi_select' },
  {
    id: 'prop_rel',
    name: 'Rel',
    type: 'context',
    context_target: { kind: 'context', context_id: 'ctx_areas' },
  },
]

function row(
  id: string,
  opts: {
    props?: Record<string, unknown>
    areas?: string[]
    modifiedAt?: string
    createdAt?: string
  } = {},
): ViewRow {
  return {
    id,
    title: id,
    path: `${id}.md`,
    frontmatter: { [PAGE_ID_KEY]: id, ...propsAtRoot(opts.props ?? {}, schema) },
    ...(opts.createdAt ? { createdAt: opts.createdAt } : {}),
    ...(opts.modifiedAt ? { modifiedAt: opts.modifiedAt } : {}),
    ...(opts.areas ? { contextValues: { ctx_areas: opts.areas } } : {}),
  }
}

const ids = (rows: ViewRow[], filter: FilterGroup | undefined): string[] =>
  applyFilter(rows, filter, schema, [], ['ctx_areas']).map((r) => r.id)

describe('applyFilter — match mode + recursion', () => {
  const rows = [
    row('r1', { props: { prop_sel: 'a', prop_num: 5 } }),
    row('r2', { props: { prop_sel: 'b', prop_num: 5 } }),
    row('r3', { props: { prop_sel: 'a', prop_num: 1 } }),
  ]

  it('match all = AND', () => {
    expect(
      ids(rows, {
        match: 'all',
        rules: [
          { property_id: 'prop_sel', op: 'is', value: 'a' },
          { property_id: 'prop_num', op: 'greater_than', value: '3' },
        ],
      }),
    ).toEqual(['r1'])
  })

  it('match any = OR', () => {
    expect(
      ids(rows, {
        match: 'any',
        rules: [
          { property_id: 'prop_sel', op: 'is', value: 'a' },
          { property_id: 'prop_num', op: 'greater_than', value: '3' },
        ],
      }),
    ).toEqual(['r1', 'r2', 'r3'])
  })

  it('evaluates a nested (A AND B) OR C group', () => {
    expect(
      ids(rows, {
        match: 'any',
        rules: [
          {
            match: 'all',
            rules: [
              { property_id: 'prop_sel', op: 'is', value: 'a' },
              { property_id: 'prop_num', op: 'greater_than', value: '3' },
            ],
          },
          { property_id: 'prop_num', op: 'less_than', value: '2' },
        ],
      }),
    ).toEqual(['r1', 'r3'])
  })

  it('empty rules pass everything (identity)', () => {
    expect(ids(rows, { match: 'all', rules: [] })).toEqual(['r1', 'r2', 'r3'])
  })

  it('undefined filter passes everything', () => {
    expect(ids(rows, undefined)).toEqual(['r1', 'r2', 'r3'])
  })
})

describe('applyFilter — a blank value answers no positive comparison', () => {
  // The text ops sit one case-block from `is` and carry the identical shape. A Link column is the
  // reachable path: url is the creatable type whose operator set is the text matrix.
  const rows = [
    row('none', { props: {} }),
    row('has', { props: { prop_url: 'https://example.com' } }),
  ]

  it('contains and starts_with exclude a row holding nothing', () => {
    expect(
      ids(rows, {
        match: 'all',
        rules: [{ property_id: 'prop_url', op: 'contains', value: 'example' }],
      }),
    ).toEqual(['has'])
    expect(
      ids(rows, {
        match: 'all',
        rules: [{ property_id: 'prop_url', op: 'starts_with', value: 'https' }],
      }),
    ).toEqual(['has'])
  })

  it('a row can no longer satisfy contains AND does_not_contain at once', () => {
    expect(
      ids(rows, {
        match: 'all',
        rules: [
          { property_id: 'prop_url', op: 'contains', value: 'example' },
          { property_id: 'prop_url', op: 'does_not_contain', value: 'example' },
        ],
      }),
    ).toEqual([])
  })

  it('the negated op keeps the blank row — a row holding nothing cannot contain the value', () => {
    expect(
      ids(rows, {
        match: 'all',
        rules: [{ property_id: 'prop_url', op: 'does_not_contain', value: 'example' }],
      }),
    ).toEqual(['none'])
  })
})

describe('applyFilter — per-type matrix', () => {
  it('number: a comparison excludes a row with no value — only is_empty selects absence', () => {
    const rows = [
      row('a', { props: { prop_num: 5 } }),
      row('b', { props: { prop_num: 1 } }),
      row('c', { props: {} }),
    ]
    // c has no value: it satisfies no positive comparison. A rule the user CAN'T author (no
    // operand) still abstains — that's a different case from a row simply having nothing.
    expect(
      ids(rows, {
        match: 'all',
        rules: [{ property_id: 'prop_num', op: 'greater_than', value: '3' }],
      }),
    ).toEqual(['a'])
    expect(
      ids(rows, {
        match: 'all',
        rules: [{ property_id: 'prop_num', op: 'less_than', value: '3' }],
      }),
    ).toEqual(['b'])
    expect(
      ids(rows, { match: 'all', rules: [{ property_id: 'prop_num', op: 'is', value: '5' }] }),
    ).toEqual(['a'])
    expect(
      ids(rows, { match: 'all', rules: [{ property_id: 'prop_num', op: 'is_empty' }] }),
    ).toEqual(['c'])
  })

  it('date: a comparison excludes a row with no date — only is_empty selects absence', () => {
    const rows = [
      row('a', { props: { prop_when: '2026-06-20' } }),
      row('b', { props: { prop_when: '2026-06-10' } }),
      row('c', { props: {} }),
    ]
    expect(
      ids(rows, {
        match: 'all',
        rules: [{ property_id: 'prop_when', op: 'on_or_after', value: '2026-06-15' }],
      }),
    ).toEqual(['a'])
    expect(
      ids(rows, {
        match: 'all',
        rules: [{ property_id: 'prop_when', op: 'on_or_before', value: '2026-06-15' }],
      }),
    ).toEqual(['b'])
    expect(
      ids(rows, { match: 'all', rules: [{ property_id: 'prop_when', op: 'is_empty' }] }),
    ).toEqual(['c'])
  })

  it('select (text): is / contains / does_not_contain', () => {
    const rows = [
      row('a', { props: { prop_sel: 'alpha' } }),
      row('b', { props: { prop_sel: 'beta' } }),
    ]
    expect(
      ids(rows, { match: 'all', rules: [{ property_id: 'prop_sel', op: 'is', value: 'alpha' }] }),
    ).toEqual(['a'])
    expect(
      ids(rows, {
        match: 'all',
        rules: [{ property_id: 'prop_sel', op: 'contains', value: 'Lph' }],
      }),
    ).toEqual(['a'])
    expect(
      ids(rows, {
        match: 'all',
        rules: [{ property_id: 'prop_sel', op: 'does_not_contain', value: 'lph' }],
      }),
    ).toEqual(['b'])
  })

  it('multi_select: membership via contains / is_empty', () => {
    const rows = [
      row('a', { props: { prop_tags: ['x', 'y'] } }),
      row('b', { props: { prop_tags: ['z'] } }),
      row('c', { props: {} }),
    ]
    expect(
      ids(rows, {
        match: 'all',
        rules: [{ property_id: 'prop_tags', op: 'contains', value: 'x' }],
      }),
    ).toEqual(['a'])
    expect(
      ids(rows, { match: 'all', rules: [{ property_id: 'prop_tags', op: 'is_empty' }] }),
    ).toEqual(['c'])
  })

  it('checkbox supports is / is_empty; false on disk is empty; is_not_empty is a no-op pass', () => {
    const rows = [
      row('t', { props: { prop_done: true } }),
      row('f', { props: { prop_done: false } }),
      row('n', { props: {} }),
    ]
    expect(
      ids(rows, { match: 'all', rules: [{ property_id: 'prop_done', op: 'is', value: 'true' }] }),
    ).toEqual(['t'])
    expect(
      ids(rows, { match: 'all', rules: [{ property_id: 'prop_done', op: 'is_empty' }] }),
    ).toEqual(['f', 'n'])
    expect(
      ids(rows, { match: 'all', rules: [{ property_id: 'prop_done', op: 'is_not_empty' }] }),
    ).toEqual(['t', 'f', 'n'])
  })

  it('status filters as text — the declared type routes it, not the value kind', () => {
    const done = row('done', { props: { prop_st: 'Done' } })
    const open = row('open', { props: { prop_st: 'Open' } })
    expect(
      ids([done, open], {
        match: 'all',
        rules: [{ property_id: 'prop_st', op: 'is', value: 'Done' }],
      }),
    ).toEqual(['done'])
    expect(
      ids([done, open], {
        match: 'all',
        rules: [{ property_id: 'prop_st', op: 'contains', value: 'pe' }],
      }),
    ).toEqual(['open'])
    // The regression this pins: a dropped case sends every rule to the no-op default, which
    // matches every row rather than none.
    expect(
      ids([done, open], {
        match: 'all',
        rules: [{ property_id: 'prop_st', op: 'is', value: 'Nothing' }],
      }),
    ).toEqual([])
  })

  it('a Context filters by id-list membership', () => {
    const rA = row('rA', { areas: ['area1'] })
    const rB = row('rB', { areas: ['area2'] })
    expect(
      ids([rA, rB], {
        match: 'all',
        rules: [{ property_id: 'ctx_areas', op: 'contains', value: 'area1' }],
      }),
    ).toEqual(['rA'])
    // rC holds no areas, so is_not_empty must exclude something — otherwise the assertion
    // cannot tell a working evaluator from a no-op that passes every row.
    const rC = row('rC', {})
    expect(
      ids([rA, rB, rC], {
        match: 'all',
        rules: [{ property_id: 'ctx_areas', op: 'is_not_empty' }],
      }),
    ).toEqual(['rA', 'rB'])
  })

  it("_created_at filters as a date from the row's createdAt", () => {
    const early = row('early', { createdAt: '2026-06-20T10:00:00Z' })
    const late = row('late', { createdAt: '2026-06-25T10:00:00Z' })
    expect(
      ids([early, late], {
        match: 'all',
        rules: [{ property_id: '_created_at', op: 'on_or_after', value: '2026-06-22' }],
      }),
    ).toEqual(['late'])
  })

  it("_modified_at filters as a date from the row's modifiedAt; a row without one is empty", () => {
    const stamped = row('stamped', { modifiedAt: '2026-06-25T10:00:00Z' })
    const bare = row('bare', { createdAt: '2026-06-25T10:00:00Z' })
    expect(
      ids([stamped, bare], {
        match: 'all',
        rules: [{ property_id: '_modified_at', op: 'on_or_after', value: '2026-06-22' }],
      }),
    ).toEqual(['stamped'])
    expect(
      ids([stamped, bare], {
        match: 'all',
        rules: [{ property_id: '_modified_at', op: 'is_empty' }],
      }),
    ).toEqual(['bare'])
  })

  // A stamp always carries a time, so a bare-day operand must compare by calendar day the way
  // `is` does: a page saved the evening of the 1st is on or before the 1st, not after the 2nd.
  it('a bare-day Before/After keeps a same-day stamp, in the local form the batch mints', () => {
    const evening = row('evening', { modifiedAt: '2026-09-01T21:00:00' })
    const onOrBefore = (value: string) =>
      ids([evening], {
        match: 'all',
        rules: [{ property_id: '_modified_at', op: 'on_or_before', value }],
      })
    const onOrAfter = (value: string) =>
      ids([evening], {
        match: 'all',
        rules: [{ property_id: '_modified_at', op: 'on_or_after', value }],
      })
    expect(onOrBefore('2026-09-01')).toEqual(['evening'])
    expect(onOrBefore('2026-08-31')).toEqual([])
    expect(onOrAfter('2026-09-01')).toEqual(['evening'])
    expect(onOrAfter('2026-09-02')).toEqual([])
    expect(
      ids([evening], {
        match: 'all',
        rules: [{ property_id: '_modified_at', op: 'on_or_before', value: '2026-09-01T20:00:00' }],
      }),
    ).toEqual([])
  })
})

describe('applyFilter — no-op passes', () => {
  const rows = [row('a', { props: { prop_sel: 'a' } })]

  it('an unknown operator passes', () => {
    expect(
      ids(rows, {
        match: 'all',
        rules: [{ property_id: 'prop_sel', op: 'totally_made_up', value: 'a' }],
      }),
    ).toEqual(['a'])
  })

  it('a rule for a property absent from the schema passes', () => {
    expect(
      ids(rows, { match: 'all', rules: [{ property_id: 'prop_ghost', op: 'is', value: 'a' }] }),
    ).toEqual(['a'])
  })

  it('a _title rule filters by the row title as text', () => {
    expect(
      ids(rows, { match: 'all', rules: [{ property_id: '_title', op: 'contains', value: 'zzz' }] }),
    ).toEqual([])
    expect(
      ids(rows, { match: 'all', rules: [{ property_id: '_title', op: 'is', value: 'a' }] }),
    ).toEqual(['a'])
  })

  it('exposes snake_case op raw strings', () => {
    expect(FILTER_OPS.onOrAfter).toBe('on_or_after')
    expect(FILTER_OPS.doesNotContain).toBe('does_not_contain')
    expect(FILTER_OPS.isNotEmpty).toBe('is_not_empty')
  })
})

describe('applyFilter — negation + registry', () => {
  const rows = [row('r1', { props: { prop_sel: 'a' } }), row('r2', { props: { prop_sel: 'b' } })]

  it("per-rule negation carries what group NOR used to — Isn't keeps the non-matchers", () => {
    expect(
      ids(rows, { match: 'all', rules: [{ property_id: 'prop_sel', op: 'is_not', value: 'a' }] }),
    ).toEqual(['r2'])
  })

  it('an abstaining rule beside a real one leaves the real one deciding', () => {
    expect(
      ids(rows, {
        match: 'all',
        rules: [
          { property_id: 'prop_sel', op: 'is' },
          { property_id: 'prop_sel', op: 'is', value: 'a' },
        ],
      }),
    ).toEqual(['r1'])
  })

  it('registers every new op raw string', () => {
    expect(FILTER_OPS.startsWith).toBe('starts_with')
    expect(FILTER_OPS.containsAll).toBe('contains_all')
    expect(FILTER_OPS.containsAny).toBe('contains_any')
    expect(FILTER_OPS.isBefore).toBe('is_before')
    expect(FILTER_OPS.isAfter).toBe('is_after')
    expect(FILTER_OPS.greaterOrEqual).toBe('greater_or_equal')
    expect(FILTER_OPS.lessOrEqual).toBe('less_or_equal')
    expect(FILTER_OPS.isInside).toBe('is_inside')
    expect(FILTER_OPS.isNotInside).toBe('is_not_inside')
  })
})

describe('applyFilter — location presence', () => {
  // parentSetId isn't part of the shared row() helper — it's set by the container walk, not frontmatter.
  const rows: ViewRow[] = [row('root'), { ...row('filed'), parentSetId: 'set_a' }]
  const ids2 = (f: FilterGroup): string[] =>
    applyFilter(rows, f, [], [{ id: 'set_a', children: [] }]).map((r) => r.id)

  it('Is over several Sets keeps rows parented by ANY of them', () => {
    const many: ViewRow[] = [
      { ...row('a'), parentSetId: 'set_a' },
      { ...row('b'), parentSetId: 'set_b' },
      { ...row('c'), parentSetId: 'set_c' },
    ]
    const run = (op: string): string[] =>
      applyFilter(
        many,
        { match: 'all', rules: [{ property_id: '_location', op, values: ['set_a', 'set_b'] }] },
        [],
        [
          { id: 'set_a', children: [] },
          { id: 'set_b', children: [] },
          { id: 'set_c', children: [] },
        ],
      ).map((r) => r.id)
    expect(run('is')).toEqual(['a', 'b'])
    expect(run('is_not')).toEqual(['c'])
  })

  // Is/Isn't are the EXACT parent; Contains is any-depth. A page in a nested child matches the
  // ancestor under Contains but NOT under Is — that distinction is the whole reason both exist.
  it('Is matches only the immediate parent Set, Contains matches any depth', () => {
    const deep: ViewRow[] = [{ ...row('deep'), parentSetId: 'set_child' }]
    const tree = [{ id: 'set_a', children: [{ id: 'set_child', children: [] }] }]
    const run = (op: string): string[] =>
      applyFilter(
        deep,
        { match: 'all', rules: [{ property_id: '_location', op, value: 'set_a' }] },
        [],
        tree,
      ).map((r) => r.id)
    expect(run('is')).toEqual([])
    expect(run('is_inside')).toEqual(['deep'])
    expect(run('is_not')).toEqual(['deep'])
    expect(run('is_not_inside')).toEqual([])
  })

  it('an Is with no Set chosen abstains rather than matching root rows', () => {
    expect(ids2({ match: 'all', rules: [{ property_id: '_location', op: 'is' }] })).toEqual([
      'root',
      'filed',
    ])
  })

  it('a location rule with an empty chip set abstains, never blanks the view', () => {
    expect(
      ids2({ match: 'all', rules: [{ property_id: '_location', op: 'is', values: [] }] }),
    ).toEqual(['root', 'filed'])
  })
})

describe('applyFilter — new single-operand ops', () => {
  const rows = [
    row('n5', { props: { prop_num: 5 } }),
    row('n9', { props: { prop_num: 9 } }),
    row('d20', { props: { prop_when: '2026-06-20T14:30:00Z' } }),
    row('d25', { props: { prop_when: '2026-06-25' } }),
    row('sApple', { props: { prop_sel: 'apple' } }),
    row('sBanana', { props: { prop_sel: 'banana' } }),
  ]

  it('number greater_or_equal / less_or_equal exclude rows with no number', () => {
    expect(
      ids(rows, {
        match: 'all',
        rules: [{ property_id: 'prop_num', op: 'greater_or_equal', value: '5' }],
      }),
    ).toEqual(['n5', 'n9'])
    expect(
      ids([rows[0], rows[1]], {
        match: 'all',
        rules: [{ property_id: 'prop_num', op: 'less_or_equal', value: '5' }],
      }),
    ).toEqual(['n5'])
  })

  it('date is matches the CALENDAR DAY, ignoring the time component', () => {
    expect(
      ids([rows[2], rows[3]], {
        match: 'all',
        rules: [{ property_id: 'prop_when', op: 'is', value: '2026-06-20' }],
      }),
    ).toEqual(['d20'])
  })

  it('date is_before / is_after are strict', () => {
    expect(
      ids([rows[2], rows[3]], {
        match: 'all',
        rules: [{ property_id: 'prop_when', op: 'is_before', value: '2026-06-25' }],
      }),
    ).toEqual(['d20'])
    expect(
      ids([rows[2], rows[3]], {
        match: 'all',
        rules: [{ property_id: 'prop_when', op: 'is_after', value: '2026-06-20T14:30:00Z' }],
      }),
    ).toEqual(['d25'])
  })

  it('starts_with is case-insensitive; missing operand passes', () => {
    expect(
      ids([rows[4], rows[5]], {
        match: 'all',
        rules: [{ property_id: 'prop_sel', op: 'starts_with', value: 'APP' }],
      }),
    ).toEqual(['sApple'])
    expect(
      ids([rows[4], rows[5]], {
        match: 'all',
        rules: [{ property_id: 'prop_sel', op: 'starts_with' }],
      }),
    ).toEqual(['sApple', 'sBanana'])
  })
})

describe('applyFilter — multi-operand values[]', () => {
  const rows = [
    row('a', { props: { prop_sel: 'a' } }),
    row('b', { props: { prop_sel: 'b' } }),
    row('ab', { props: { prop_tags: ['a', 'b'] } }),
    row('ac', { props: { prop_tags: ['a', 'c'] } }),
    row('t1', { areas: ['area1', 'area2'] }),
  ]

  it('select is with values[] = any-of; is_not = none-of', () => {
    expect(
      ids([rows[0], rows[1]], {
        match: 'all',
        rules: [{ property_id: 'prop_sel', op: 'is', values: ['a', 'zzz'] }],
      }),
    ).toEqual(['a'])
    expect(
      ids([rows[0], rows[1]], {
        match: 'all',
        rules: [{ property_id: 'prop_sel', op: 'is_not', values: ['a'] }],
      }),
    ).toEqual(['b'])
  })

  it('multi_select contains_all / contains_any / does_not_contain over values[]', () => {
    expect(
      ids([rows[2], rows[3]], {
        match: 'all',
        rules: [{ property_id: 'prop_tags', op: 'contains_all', values: ['a', 'b'] }],
      }),
    ).toEqual(['ab'])
    expect(
      ids([rows[2], rows[3]], {
        match: 'all',
        rules: [{ property_id: 'prop_tags', op: 'contains_any', values: ['b', 'zzz'] }],
      }),
    ).toEqual(['ab'])
    expect(
      ids([rows[2], rows[3]], {
        match: 'all',
        rules: [{ property_id: 'prop_tags', op: 'does_not_contain', values: ['b'] }],
      }),
    ).toEqual(['ac'])
  })

  it('contains_any with an EMPTY set passes — the mid-authoring guard', () => {
    expect(
      ids([rows[2], rows[3]], {
        match: 'all',
        rules: [{ property_id: 'prop_tags', op: 'contains_any', values: [] }],
      }),
    ).toEqual(['ab', 'ac'])
  })

  it('Context contains_all / contains_any', () => {
    expect(
      ids([rows[4]], {
        match: 'all',
        rules: [{ property_id: 'ctx_areas', op: 'contains_all', values: ['area1', 'area2'] }],
      }),
    ).toEqual(['t1'])
    expect(
      ids([rows[4]], {
        match: 'all',
        rules: [{ property_id: 'ctx_areas', op: 'contains_any', values: ['zzz'] }],
      }),
    ).toEqual([])
  })
})

describe('applyFilter — title, context membership, location', () => {
  const tree = [
    { id: 'set_a', children: [{ id: 'set_a1', children: [] }] },
    { id: 'set_b', children: [] },
  ]
  const inA1 = { ...row('inA1'), parentSetId: 'set_a1' }
  const inB = { ...row('inB'), parentSetId: 'set_b' }
  const atRoot = row('atRoot')
  const loc = (rows: ViewRow[], op: string, value: string): string[] =>
    applyFilter(
      rows,
      { match: 'all', rules: [{ property_id: '_location', op, value }] },
      schema,
      tree,
    ).map((r) => r.id)

  it('title filters as text (Starts With / Contains, case-insensitive)', () => {
    const rows = [row('Apple Pie'), row('Banana')]
    expect(
      ids(rows, {
        match: 'all',
        rules: [{ property_id: '_title', op: 'starts_with', value: 'app' }],
      }),
    ).toEqual(['Apple Pie'])
    expect(
      ids(rows, { match: 'all', rules: [{ property_id: '_title', op: 'contains', value: 'NAN' }] }),
    ).toEqual(['Banana'])
  })

  it('is_inside matches any depth; is_not_inside inverts; root pages are inside nothing', () => {
    expect(loc([inA1, inB, atRoot], 'is_inside', 'set_a')).toEqual(['inA1'])
    expect(loc([inA1, inB, atRoot], 'is_not_inside', 'set_a')).toEqual(['inB', 'atRoot'])
  })

  it('a dead set id is a no-op pass', () => {
    expect(loc([inA1, inB], 'is_inside', 'set_ghost')).toEqual(['inA1', 'inB'])
  })
})
