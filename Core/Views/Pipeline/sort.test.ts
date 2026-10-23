import { describe, it, expect } from 'vitest'
import { ID_KEY } from '../../Nexus/identityMark'
import type { ViewRow } from '../viewRow'
import type { PropertyDefinition } from '../../Properties/properties'
import { makeSorter, resolvedSortCount } from './sort'
import { applyFilter } from './filter'
import { resolveFieldValue } from '../../Properties/value'
import { propsAtRoot } from '../../Testing/pageValues'

const schema: PropertyDefinition[] = [
  {
    id: 'prop_sel',
    label: 'Sel',
    key: 'Sel',
    type: 'select',
    select_options: [
      { key: 'a', label: 'a' },
      { key: 'b', label: 'b' },
      { key: 'c', label: 'c' },
    ],
  },
  {
    id: 'prop_status',
    label: 'Status',
    key: 'Status',
    type: 'status',
    status_groups: [
      {
        id: 'upcoming',
        label: 'U',
        color: 'gray',
        options: [{ key: 'not_started', label: 'not_started', group_id: 'upcoming' }],
      },
      {
        id: 'in_progress',
        label: 'IP',
        color: 'blue',
        options: [{ key: 'in_progress', label: 'in_progress', group_id: 'in_progress' }],
      },
      {
        id: 'done',
        label: 'D',
        color: 'green',
        options: [{ key: 'done', label: 'done', group_id: 'done' }],
      },
    ],
  },
  { id: 'prop_num', label: 'Num', key: 'Num', type: 'number' },
  { id: 'prop_done', label: 'Done', key: 'Done', type: 'checkbox' },
  { id: 'prop_when', label: 'When', key: 'When', type: 'dateTime' },
  {
    id: 'prop_rel',
    label: 'Rel',
    key: 'Rel',
    type: 'context',
  },
  { id: 'prop_link', label: 'Link', key: 'Link', type: 'link' },
  { id: 'prop_file', label: 'File', key: 'File', type: 'file' },
  { id: 'prop_notes', label: 'Notes', key: 'Notes', type: 'text' },
]

function makeRow(
  id: string,
  opts: {
    title?: string
    props?: Record<string, unknown>
    modifiedAt?: string
    createdAt?: string
  } = {},
): ViewRow {
  return {
    id,
    title: opts.title ?? id,
    path: `${id}.md`,
    frontmatter: { [ID_KEY]: id, ...propsAtRoot(opts.props ?? {}, schema) },
    createdAt: opts.createdAt ?? null,
    modifiedAt: opts.modifiedAt ?? null,
  }
}

const ids = (rows: ViewRow[]): string[] => rows.map((r) => r.id)

describe('makeSorter — type-aware single criterion', () => {
  it('link sorts by the SHOWN text (alias, else URL), not the raw [alias](url)', () => {
    const rows = [
      makeRow('r_zebra', { props: { prop_link: '[Zebra](https://a.co)' } }),
      makeRow('r_apple', { props: { prop_link: '[Apple](https://z.co)' } }),
      makeRow('r_bare', { props: { prop_link: 'https://m.co' } }),
    ]
    const sorter = makeSorter([{ property_id: 'prop_link', direction: 'ascending' }], schema)
    // Apple < https://m.co < Zebra by display — not clumped by the leading `[` of the two aliases.
    expect(ids(sorter?.(rows) ?? rows)).toEqual(['r_apple', 'r_bare', 'r_zebra'])
  })

  it('text sorts by what its connections show, and a Link value by its shown text, bare address normalized', () => {
    const rows = [
      makeRow('r_nice', { props: { prop_notes: '[[Alpha|nice]] notes' } }),
      makeRow('r_apple', { props: { prop_notes: 'apple' } }),
      makeRow('r_zebra', { props: { prop_notes: 'zebra' } }),
    ]
    const sorter = makeSorter([{ property_id: 'prop_notes', direction: 'ascending' }], schema)
    expect(ids(sorter?.(rows) ?? rows)).toEqual(['r_apple', 'r_nice', 'r_zebra'])
    const links = [
      makeRow('r_setup', { props: { prop_link: '[[#Setup]]' } }),
      makeRow('r_bare', { props: { prop_link: 'example.com' } }),
      makeRow('r_alpha', { props: { prop_link: '[[Alpha]]' } }),
    ]
    const byLink = makeSorter([{ property_id: 'prop_link', direction: 'ascending' }], schema)
    expect(ids(byLink?.(links) ?? links)).toEqual(['r_alpha', 'r_bare', 'r_setup'])
  })

  it('text sorts A → Z by its text, case-insensitively', () => {
    const rows = [
      makeRow('r_zebra', { props: { prop_notes: 'Zebra crossing' } }),
      makeRow('r_apple', { props: { prop_notes: 'apple pie' } }),
      makeRow('r_mango', { props: { prop_notes: 'Mango\nsecond line' } }),
    ]
    const sorter = makeSorter([{ property_id: 'prop_notes', direction: 'ascending' }], schema)
    expect(ids(sorter?.(rows) ?? rows)).toEqual(['r_apple', 'r_mango', 'r_zebra'])
  })

  it('file sorts by the filename its wikilink names, case-insensitively', () => {
    const rows = [
      makeRow('r_zebra', { props: { prop_file: ['[[Zebra.pdf]]'] } }),
      makeRow('r_apple', { props: { prop_file: ['[[apple.pdf]]'] } }),
      makeRow('r_mango', { props: { prop_file: ['[[Mango.pdf]]'] } }),
    ]
    const sorter = makeSorter([{ property_id: 'prop_file', direction: 'ascending' }], schema)
    expect(ids(sorter?.(rows) ?? rows)).toEqual(['r_apple', 'r_mango', 'r_zebra'])
  })

  it('select sorts by schema option order, unknown values last', () => {
    const rows = [
      makeRow('r1', { props: { prop_sel: 'c' } }),
      makeRow('r2', { props: { prop_sel: 'a' } }),
      makeRow('r3', { props: { prop_sel: 'zzz' } }),
      makeRow('r4', { props: { prop_sel: 'b' } }),
    ]
    const sorter = makeSorter([{ property_id: 'prop_sel', direction: 'ascending' }], schema)!
    expect(ids(sorter(rows))).toEqual(['r2', 'r4', 'r1', 'r3'])
  })

  it('a Select sorts by its own options, never by a stale status_groups array it still carries', () => {
    const stale: PropertyDefinition = {
      id: 'prop_stale',
      label: 'Stale',
      key: 'Stale',
      type: 'select',
      select_options: [
        { key: 'a', label: 'a' },
        { key: 'b', label: 'b' },
      ],
      status_groups: [
        {
          id: 'g',
          label: 'G',
          color: 'grey',
          options: [{ key: 'a', label: 'a', group_id: 'g' }],
        },
      ],
    }
    const rows = [
      {
        ...makeRow('r1'),
        frontmatter: { [ID_KEY]: 'r1', ...propsAtRoot({ prop_stale: 'b' }, [stale]) },
      },
      {
        ...makeRow('r2'),
        frontmatter: { [ID_KEY]: 'r2', ...propsAtRoot({ prop_stale: 'a' }, [stale]) },
      },
    ]
    const sorter = makeSorter([{ property_id: 'prop_stale', direction: 'ascending' }], [stale])!
    expect(ids(sorter(rows))).toEqual(['r2', 'r1'])
  })

  it('a Status sorts by its groups, never by a stale select_options array it still carries', () => {
    const stale: PropertyDefinition = {
      id: 'prop_stale',
      label: 'Stale',
      key: 'Stale',
      type: 'status',
      select_options: [{ key: 'done', label: 'done' }],
      status_groups: [
        {
          id: 'g',
          label: 'G',
          color: 'grey',
          options: [
            { key: 'todo', label: 'todo', group_id: 'g' },
            { key: 'done', label: 'done', group_id: 'g' },
          ],
        },
      ],
    }
    const rows = [
      {
        ...makeRow('r1'),
        frontmatter: { [ID_KEY]: 'r1', ...propsAtRoot({ prop_stale: 'done' }, [stale]) },
      },
      {
        ...makeRow('r2'),
        frontmatter: { [ID_KEY]: 'r2', ...propsAtRoot({ prop_stale: 'todo' }, [stale]) },
      },
    ]
    const sorter = makeSorter([{ property_id: 'prop_stale', direction: 'ascending' }], [stale])!
    expect(ids(sorter(rows))).toEqual(['r2', 'r1'])
  })

  it('a Custom order ranks options it predates after the listed ones, ahead of the no-value rows', () => {
    const rows = [
      makeRow('r1', {}),
      makeRow('r2', { props: { prop_sel: 'c' } }),
      makeRow('r3', { props: { prop_sel: 'a' } }),
    ]
    const sorter = makeSorter(
      [{ property_id: 'prop_sel', direction: 'ascending', order: ['a', 'b'] }],
      schema,
    )!
    expect(ids(sorter(rows))).toEqual(['r3', 'r2', 'r1'])
  })

  it('status sorts by flattened group-option order, and descending flips', () => {
    const rows = [
      makeRow('r1', { props: { prop_status: 'done' } }),
      makeRow('r2', { props: { prop_status: 'not_started' } }),
      makeRow('r3', { props: { prop_status: 'in_progress' } }),
    ]
    expect(
      ids(makeSorter([{ property_id: 'prop_status', direction: 'ascending' }], schema)!(rows)),
    ).toEqual(['r2', 'r3', 'r1'])
    expect(
      ids(makeSorter([{ property_id: 'prop_status', direction: 'descending' }], schema)!(rows)),
    ).toEqual(['r1', 'r3', 'r2'])
  })

  it('a date-only value is local midnight, so it sorts after the evening before it', () => {
    const rows = [
      makeRow('day', { props: { prop_when: '2026-06-15' } }),
      makeRow('eve', { props: { prop_when: '2026-06-14T22:00:00' } }),
    ]
    const sorter = makeSorter([{ property_id: 'prop_when', direction: 'ascending' }], schema)!
    expect(ids(sorter(rows))).toEqual(['eve', 'day'])
  })

  it('number sorts numerically, absent first ascending', () => {
    const rows = [
      makeRow('r1', { props: { prop_num: 5 } }),
      makeRow('r2', { props: { prop_num: 2 } }),
      makeRow('r3', { props: {} }),
    ]
    expect(
      ids(makeSorter([{ property_id: 'prop_num', direction: 'ascending' }], schema)!(rows)),
    ).toEqual(['r3', 'r2', 'r1'])
  })

  it('checkbox sorts false before true (absent = false)', () => {
    const rows = [
      makeRow('r1', { props: { prop_done: true } }),
      makeRow('r2', { props: { prop_done: false } }),
      makeRow('r3', { props: {} }),
    ]
    expect(
      ids(makeSorter([{ property_id: 'prop_done', direction: 'ascending' }], schema)!(rows)),
    ).toEqual(['r2', 'r3', 'r1'])
  })

  it('date sorts chronologically, absent earliest', () => {
    const rows = [
      makeRow('r1', { props: { prop_when: '2026-06-20T10:00:00Z' } }),
      makeRow('r2', { props: { prop_when: '2026-06-15T10:00:00Z' } }),
      makeRow('r3', { props: {} }),
    ]
    expect(
      ids(makeSorter([{ property_id: 'prop_when', direction: 'ascending' }], schema)!(rows)),
    ).toEqual(['r3', 'r2', 'r1'])
  })

  it('a Context criterion resolves to nothing, so it neither sorts nor counts', () => {
    expect(makeSorter([{ property_id: 'prop_rel', direction: 'ascending' }], schema)).toBeNull()
    expect(resolvedSortCount([{ property_id: 'prop_rel', direction: 'ascending' }], schema)).toBe(0)
  })
})

describe('makeSorter — reserved presets', () => {
  it('_title compares case-insensitively', () => {
    const rows = [
      makeRow('r1', { title: 'banana' }),
      makeRow('r2', { title: 'Apple' }),
      makeRow('r3', { title: 'cherry' }),
    ]
    expect(
      ids(makeSorter([{ property_id: '_title', direction: 'ascending' }], schema)!(rows)),
    ).toEqual(['r2', 'r1', 'r3'])
  })

  it('_id is not a sortable column', () => {
    expect(makeSorter([{ property_id: '_id', direction: 'ascending' }], schema)).toBeNull()
  })

  it("sorts _created_at by the row's createdAt", () => {
    const rows = [
      makeRow('r1', { createdAt: '2026-06-20T10:00:00Z' }),
      makeRow('r2', { createdAt: '2026-06-15T10:00:00Z' }),
      makeRow('r3', { createdAt: '2026-06-25T10:00:00Z' }),
    ]
    expect(
      ids(makeSorter([{ property_id: '_created_at', direction: 'ascending' }], schema)!(rows)),
    ).toEqual(['r2', 'r1', 'r3'])
  })

  it("sorts _modified_at by the row's modifiedAt, absent first ascending like any date", () => {
    const rows = [
      makeRow('r1', { modifiedAt: '2026-06-20T10:00:00Z' }),
      makeRow('r2'),
      makeRow('r3', { modifiedAt: '2026-06-15T10:00:00Z' }),
    ]
    expect(
      ids(makeSorter([{ property_id: '_modified_at', direction: 'ascending' }], schema)!(rows)),
    ).toEqual(['r2', 'r3', 'r1'])
  })
})

describe('the stamp readers agree', () => {
  it('one row resolves the same _modified_at through the value, the sort, and the filter', () => {
    const rows = [
      makeRow('old', { modifiedAt: '2026-06-15T10:00:00Z' }),
      makeRow('new', { modifiedAt: '2026-06-25T10:00:00Z' }),
    ]
    expect(resolveFieldValue(rows[1], '_modified_at', schema)).toEqual({
      kind: 'dateTime',
      value: '2026-06-25T10:00:00Z',
    })
    expect(
      ids(makeSorter([{ property_id: '_modified_at', direction: 'descending' }], schema)!(rows)),
    ).toEqual(['new', 'old'])
    expect(
      ids(
        applyFilter(
          rows,
          {
            match: 'all',
            rules: [{ property_id: '_modified_at', op: 'on_or_after', value: '2026-06-22' }],
          },
          schema,
          [],
          [],
        ),
      ),
    ).toEqual(['new'])
  })
})

describe('makeSorter — multi-key + null cases', () => {
  it('applies criteria in array order (primary, then secondary tiebreak)', () => {
    const rows = [
      makeRow('r1', { title: 'b', props: { prop_sel: 'a' } }),
      makeRow('r2', { title: 'a', props: { prop_sel: 'a' } }),
      makeRow('r3', { title: 'z', props: { prop_sel: 'b' } }),
    ]
    const sorter = makeSorter(
      [
        { property_id: 'prop_sel', direction: 'ascending' },
        { property_id: '_title', direction: 'ascending' },
      ],
      schema,
    )!
    expect(ids(sorter(rows))).toEqual(['r2', 'r1', 'r3'])
  })

  it('holds input order among full ties (stable)', () => {
    const rows = [
      makeRow('r1', { props: { prop_sel: 'a' } }),
      makeRow('r2', { props: { prop_sel: 'a' } }),
      makeRow('r3', { props: { prop_sel: 'a' } }),
    ]
    expect(
      ids(makeSorter([{ property_id: 'prop_sel', direction: 'descending' }], schema)!(rows)),
    ).toEqual(['r1', 'r2', 'r3'])
  })

  it('skips unsortable criteria but keeps usable ones', () => {
    const rows = [
      makeRow('r1', { props: { prop_num: 5 } }),
      makeRow('r2', { props: { prop_num: 2 } }),
    ]
    const sorter = makeSorter(
      [
        { property_id: 'prop_unknown', direction: 'ascending' },
        { property_id: 'prop_num', direction: 'ascending' },
      ],
      schema,
    )
    expect(sorter).not.toBeNull()
    expect(ids(sorter!(rows))).toEqual(['r2', 'r1'])
  })

  it('returns null when there is no usable criterion', () => {
    expect(makeSorter(undefined, schema)).toBeNull()
    expect(makeSorter([], schema)).toBeNull()
    expect(makeSorter([{ property_id: 'prop_unknown', direction: 'ascending' }], schema)).toBeNull()
    expect(makeSorter([{ property_id: 'ctx_areas', direction: 'ascending' }], schema)).toBeNull()
  })
})

describe('makeSorter — manual order tiebreaker (manual_order)', () => {
  it('orders by the manual array when there is no sort (grouped-but-unsorted)', () => {
    const rows = [makeRow('a'), makeRow('b'), makeRow('c')]
    expect(ids(makeSorter(undefined, schema, ['c', 'a', 'b'])!(rows))).toEqual(['c', 'a', 'b'])
  })

  it('appends rows absent from the manual order, in input order, after the placed ones', () => {
    const rows = [makeRow('a'), makeRow('b'), makeRow('c'), makeRow('d')]
    expect(ids(makeSorter(undefined, schema, ['c', 'a'])!(rows))).toEqual(['c', 'a', 'b', 'd'])
  })

  it('breaks ties only AFTER the sort key — within an equal-key run', () => {
    const rows = [
      makeRow('r1', { props: { prop_sel: 'a' } }),
      makeRow('r2', { props: { prop_sel: 'b' } }),
      makeRow('r3', { props: { prop_sel: 'a' } }),
    ]
    const sorter = makeSorter([{ property_id: 'prop_sel', direction: 'ascending' }], schema, [
      'r3',
      'r1',
    ])!
    expect(ids(sorter(rows))).toEqual(['r3', 'r1', 'r2'])
  })

  it('cannot reorder across the sort key even if the manual order says so', () => {
    const rows = [
      makeRow('r1', { props: { prop_sel: 'a' } }),
      makeRow('r2', { props: { prop_sel: 'b' } }),
    ]
    const sorter = makeSorter([{ property_id: 'prop_sel', direction: 'ascending' }], schema, [
      'r2',
      'r1',
    ])!
    expect(ids(sorter(rows))).toEqual(['r1', 'r2'])
  })

  it('returns null when there is neither a sort nor a manual order', () => {
    expect(makeSorter(undefined, schema, [])).toBeNull()
    expect(makeSorter(undefined, schema, undefined)).toBeNull()
  })
})

describe('custom option order', () => {
  it('a criterion order ranks rows by the sequence, unknowns last, direction moot', () => {
    const rows = [
      makeRow('r1', { props: { prop_sel: 'a' } }),
      makeRow('r2', { props: { prop_sel: 'b' } }),
      makeRow('r3', { props: { prop_sel: 'zz' } }),
      makeRow('r4', { props: { prop_sel: 'c' } }),
    ]
    const sorter = makeSorter(
      [{ property_id: 'prop_sel', direction: 'descending', order: ['c', 'a', 'b'] }],
      schema,
    )!
    expect(ids(sorter(rows))).toEqual(['r4', 'r1', 'r2', 'r3'])
  })
})

describe('resolvedSortCount', () => {
  it('counts only criteria buildCriterion resolves — dead and Context criteria cost nothing', () => {
    expect(resolvedSortCount(undefined, schema)).toBe(0)
    expect(resolvedSortCount([{ property_id: 'prop_gone', direction: 'ascending' }], schema)).toBe(
      0,
    )
    expect(resolvedSortCount([{ property_id: 'ctx_areas', direction: 'ascending' }], schema)).toBe(
      0,
    )
    expect(
      resolvedSortCount(
        [
          { property_id: 'prop_sel', direction: 'ascending' },
          { property_id: 'prop_gone', direction: 'descending' },
        ],
        schema,
      ),
    ).toBe(1)
    expect(
      resolvedSortCount(
        [
          { property_id: '_title', direction: 'ascending' },
          { property_id: '_modified_at', direction: 'descending' },
        ],
        schema,
      ),
    ).toBe(2)
  })
})
