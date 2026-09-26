import { describe, it, expect } from 'vitest'
import { ID_KEY } from '@pommora/core/Nexus/identityMark'
import type { ViewRow } from '@pommora/core/Views/viewRow'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import { declaredType, fileName, resolveFieldValue } from './value'
import { propsAtRoot } from '../Testing/pageValues'

const schema: PropertyDefinition[] = [
  {
    id: 'prop_status',
    name: 'Status',
    type: 'status',
    status_groups: [
      {
        id: 'g',
        label: 'G',
        color: 'blue',
        options: [{ value: 'in_progress', label: 'In Progress', group_id: 'g' }],
      },
    ],
  },
  { id: 'prop_sel', name: 'Sel', type: 'select', select_options: [{ value: 'opt_a', label: 'A' }] },
  {
    id: 'prop_s',
    name: 'S',
    type: 'select',
    select_options: [
      { value: 'open', label: 'Open' },
      { value: 'done', label: 'Done' },
    ],
  },
  { id: 'prop_when', name: 'When', type: 'dateTime' },
  { id: 'prop_num', name: 'Num', type: 'number' },
]

const rfv = (r: ViewRow, p: string) => resolveFieldValue(r, p, schema)

const row: ViewRow = {
  id: '01ROW',
  title: 'My Page',
  path: 'Col/my-page.md',
  contextValues: { ctx_areas: ['01AREA'] },
  createdAt: '2026-06-01T08:00:00Z',
  modifiedAt: '2026-06-20T10:00:00Z',
  frontmatter: {
    [ID_KEY]: '01ROW',
    modified_at: '2026-06-19T10:00:00Z',
    ...propsAtRoot(
      {
        prop_status: 'in_progress',
        prop_sel: 'opt_a',
        prop_when: '2026-06-15T09:00:00Z',
        prop_num: 42,
        prop_bad: [1, 'mixed'],
      },
      schema,
    ),
  },
}

describe('declaredType', () => {
  it('maps reserved columns to the type/sentinel sort+group+filter switch on', () => {
    expect(declaredType('_title', schema)).toBe('title')
    expect(declaredType('_created_at', schema)).toBe('createdTime')
    expect(declaredType('_modified_at', schema)).toBe('lastEditedTime')
  })

  it('classifies a Context column only when its id is among the registry ids', () => {
    expect(declaredType('ctx_areas', schema, ['ctx_areas'])).toBe('context')
    expect(declaredType('ctx_areas', schema)).toBeUndefined()
  })

  it('reads user property types from the schema (snake_case PropertyType)', () => {
    expect(declaredType('prop_status', schema)).toBe('status')
    expect(declaredType('prop_sel', schema)).toBe('select')
    expect(declaredType('prop_num', schema)).toBe('number')
    expect(declaredType('prop_when', schema)).toBe('dateTime')
  })

  it('resolves an unknown id to undefined', () => {
    expect(declaredType('prop_absent', schema)).toBeUndefined()
  })
})

describe('resolveFieldValue', () => {
  it('reads reserved columns from the row, not the frontmatter', () => {
    expect(rfv(row, '_title')).toEqual({ kind: 'select', value: 'My Page' })
    expect(rfv(row, '_created_at')).toEqual({
      kind: 'dateTime',
      value: '2026-06-01T08:00:00Z',
    })
    expect(rfv(row, '_modified_at')).toEqual({
      kind: 'dateTime',
      value: '2026-06-20T10:00:00Z',
    })
    expect(rfv(row, 'ctx_areas')).toEqual({ kind: 'context', value: ['01AREA'] })
    expect(rfv(row, 'ctx_topics')).toEqual({ kind: 'null' })
  })

  it('decodes a user property against the type its definition declares', () => {
    expect(rfv(row, 'prop_status')).toEqual({ kind: 'select', value: 'in_progress' })
    expect(rfv(row, 'prop_sel')).toEqual({ kind: 'select', value: 'opt_a' })
    expect(rfv(row, 'prop_when')).toEqual({
      kind: 'dateTime',
      value: '2026-06-15T09:00:00Z',
    })
    expect(rfv(row, 'prop_num')).toEqual({ kind: 'number', value: 42 })
  })

  it('returns null for an absent property', () => {
    expect(rfv(row, 'prop_absent')).toEqual({ kind: 'null' })
  })

  it('degrades a malformed value to null rather than throwing (never poison a view)', () => {
    expect(rfv(row, 'prop_bad')).toEqual({ kind: 'null' })
  })

  it('returns null for a stamp the row does not carry', () => {
    const bare: ViewRow = {
      id: 'x',
      title: 'X',
      path: 'x.md',
      frontmatter: { [ID_KEY]: 'x' },
      createdAt: null,
      modifiedAt: null,
    }
    expect(rfv(bare, '_created_at')).toEqual({ kind: 'null' })
    expect(rfv(bare, '_modified_at')).toEqual({ kind: 'null' })
  })
})

describe('resolveFieldValue memoization', () => {
  it('returns the SAME resolved object for repeat calls on one frontmatter (parse-once)', () => {
    const row: ViewRow = {
      id: 'p1',
      title: 'One',
      path: 'C/One.md',
      frontmatter: {
        [ID_KEY]: 'p1',
        ...propsAtRoot({ prop_s: 'open' }, schema),
        '<Areas>': ['a'],
      },
      createdAt: null,
      modifiedAt: null,
    }
    // No consumer keys identity on the resolved value (Cell resolves fresh; rowById keys on row.id), so the shared cached object is contractual rather than incidental.
    expect(rfv(row, 'prop_s')).toBe(rfv(row, 'prop_s'))
  })

  it('a fresh frontmatter identity re-resolves (the optimistic-patch / reload contract)', () => {
    const fm1 = { [ID_KEY]: 'p1', ...propsAtRoot({ prop_s: 'open' }, schema) }
    const fm2 = { [ID_KEY]: 'p1', ...propsAtRoot({ prop_s: 'done' }, schema) }
    const rowAt = (frontmatter: ViewRow['frontmatter']): ViewRow => ({
      id: 'p1',
      title: 'One',
      path: 'C/One.md',
      frontmatter,
      createdAt: null,
      modifiedAt: null,
    })
    const before = rfv(rowAt(fm1), 'prop_s')
    const after = rfv(rowAt(fm2), 'prop_s')
    expect(before).toMatchObject({ kind: 'select', value: 'open' })
    expect(after).toMatchObject({ kind: 'select', value: 'done' })
  })

  it('an option added to the definition re-resolves a value pages already held', () => {
    const fm = { [ID_KEY]: 'p1', ...propsAtRoot({ prop_s: 'Final' }, schema) }
    const r: ViewRow = {
      id: 'p1',
      title: 'One',
      path: 'C/One.md',
      frontmatter: fm,
      createdAt: null,
      modifiedAt: null,
    }
    const def = schema.find((d) => d.id === 'prop_s') as PropertyDefinition
    const gained = {
      ...def,
      select_options: [...(def.select_options ?? []), { value: 'Final', label: 'Final' }],
    }
    expect(resolveFieldValue(r, 'prop_s', [def])).toEqual({ kind: 'null' })
    expect(resolveFieldValue(r, 'prop_s', [gained])).toEqual({ kind: 'select', value: 'Final' })
  })

  it('a rename or a type change re-resolves under the same frontmatter', () => {
    const fm = { [ID_KEY]: 'p1', ...propsAtRoot({ prop_s: 'open' }, schema), T: 'done' }
    const r: ViewRow = {
      id: 'p1',
      title: 'One',
      path: 'C/One.md',
      frontmatter: fm,
      createdAt: null,
      modifiedAt: null,
    }
    const def = schema.find((d) => d.id === 'prop_s') as PropertyDefinition
    expect(resolveFieldValue(r, 'prop_s', [def])).toEqual({ kind: 'select', value: 'open' })
    expect(resolveFieldValue(r, 'prop_s', [{ ...def, name: 'T' }])).toEqual({
      kind: 'select',
      value: 'done',
    })
    expect(resolveFieldValue(r, 'prop_s', [{ ...def, type: 'multiSelect' }])).toEqual({
      kind: 'multiSelect',
      value: ['open'],
    })
  })

  it('_title never caches — a rename with an unchanged frontmatter object shows the new title', () => {
    const fm = { [ID_KEY]: 'p1' }
    const stamps = { createdAt: null, modifiedAt: null }
    const a = rfv(
      { id: 'p1', title: 'Old', path: 'C/Old.md', frontmatter: fm, ...stamps },
      '_title',
    )
    const b = rfv(
      { id: 'p1', title: 'New', path: 'C/New.md', frontmatter: fm, ...stamps },
      '_title',
    )
    expect(a).toEqual({ kind: 'select', value: 'Old' })
    expect(b).toEqual({ kind: 'select', value: 'New' })
  })
})

describe('resolveFieldValue — the declared type is obeyed, never inferred from the value', () => {
  const typedSchema: PropertyDefinition[] = [
    { id: 'prop_link', name: 'Link', type: 'link' },
    {
      id: 'prop_tag',
      name: 'Tag',
      type: 'select',
      select_options: [
        { value: 'opt_a', label: 'A' },
        { value: '[URGENT](tel:911)', label: 'Urgent' },
      ],
    },
  ]
  const rowOf = (properties: Record<string, unknown>): ViewRow => ({
    id: 'r',
    title: 'R',
    path: 'C/r.md',
    frontmatter: { [ID_KEY]: 'r', ...propsAtRoot(properties, typedSchema) },
    createdAt: null,
    modifiedAt: null,
  })

  it('a link column reads an aliased [alias](url) value as link — no shape ever votes', () => {
    expect(
      resolveFieldValue(
        rowOf({ prop_link: '[Docs](https://example.com)' }),
        'prop_link',
        typedSchema,
      ),
    ).toEqual({
      kind: 'link',
      value: '[Docs](https://example.com)',
    })
  })

  it('a link column reads a bare URL as link', () => {
    expect(
      resolveFieldValue(rowOf({ prop_link: 'https://example.com' }), 'prop_link', typedSchema),
    ).toEqual({
      kind: 'link',
      value: 'https://example.com',
    })
  })

  it('a select column keeps a link-shaped value as select — never stolen to link', () => {
    expect(
      resolveFieldValue(rowOf({ prop_tag: '[URGENT](tel:911)' }), 'prop_tag', typedSchema),
    ).toEqual({
      kind: 'select',
      value: '[URGENT](tel:911)',
    })
  })

  it('a plain select option is untouched', () => {
    expect(resolveFieldValue(rowOf({ prop_tag: 'opt_a' }), 'prop_tag', typedSchema)).toEqual({
      kind: 'select',
      value: 'opt_a',
    })
  })
})

describe('fileName', () => {
  it('reads the wikilink’s title, and leaves anything else as written', () => {
    expect(fileName('[[Report.pdf]]')).toBe('Report.pdf')
    expect(fileName('Report.pdf')).toBe('Report.pdf')
  })
})
