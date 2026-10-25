import { describe, expect, it } from 'vitest'
import { localDayKey, localIso } from '@pommora/uix/Utilities/pad'
import { ID_KEY } from '../../Nexus/identityMark'
import type { PropertyDefinition } from '../../Properties/properties'
import type { FilterGroup } from '../filterRules'
import type { ViewRow } from '../viewRow'
import { filterSeeds } from './creationSeeds'
import { identityFor } from '../../Testing/testTree'

const listed = (...keys: string[]) => keys.map((key) => ({ id: `opt_${key}`, key, label: key }))

const schema: PropertyDefinition[] = [
  {
    id: 'p_status',
    label: 'Status',
    key: 'Status',
    type: 'status',
    status_groups: [{ id: 'g', label: 'All', color: '', options: listed('doing', 'Done') }],
  },
  {
    id: 'p_sel',
    label: 'Kind',
    key: 'Kind',
    type: 'select',
    select_options: listed('note', 'a', 'b', 'x'),
  },
  {
    id: 'p_pri',
    label: 'Priority',
    key: 'Priority',
    type: 'select',
    select_options: listed('High'),
  },
  { id: 'p_check', label: 'Done', key: 'Done', type: 'checkbox' },
  { id: 'p_num', label: 'Count', key: 'Count', type: 'number' },
  {
    id: 'p_tags',
    label: 'Tags',
    key: 'Tags',
    type: 'multiSelect',
    select_options: listed('draft', 'urgent'),
  },
  { id: 'p_notes', label: 'Notes', key: 'Notes', type: 'text' },
]

const blank: ViewRow = {
  id: 'new',
  title: 'Untitled',
  path: 'Untitled.md',
  frontmatter: { [ID_KEY]: 'new' },
  createdAt: localIso(Date.now()),
  modifiedAt: null,
}

const seedsOf = (filter: FilterGroup | undefined, identity = identityFor({})) =>
  filterSeeds({ filter, blank, schema, setTree: [], identity })

describe('filterSeeds', () => {
  it('derives positive Is rules on status/select/checkbox under All-mode', () => {
    const filter: FilterGroup = {
      match: 'all',
      rules: [
        { property_id: 'p_status', op: 'is', value: 'opt_doing' },
        { property_id: 'p_check', op: 'is', value: 'true' },
      ],
    }
    expect(seedsOf(filter)).toEqual({
      p_status: { kind: 'select', value: 'opt_doing' },
      p_check: { kind: 'checkbox', value: true },
    })
  })

  it('reads a checkbox word as its value', () => {
    const word: FilterGroup = {
      match: 'all',
      rules: [{ property_id: 'p_check', op: 'is', value: 'Yes' }],
    }
    expect(seedsOf(word)).toEqual({ p_check: { kind: 'checkbox', value: true } })
  })

  it('derives the one chip a Select or Status Is rule saves, and nothing from two', () => {
    const filter: FilterGroup = {
      match: 'all',
      rules: [
        { property_id: 'p_status', op: 'is', values: ['opt_Done'] },
        { property_id: 'p_sel', op: 'is', values: ['opt_a', 'opt_b'] },
      ],
    }
    expect(seedsOf(filter)).toEqual({ p_status: { kind: 'select', value: 'opt_Done' } })
  })

  it('reads a chip list over a leftover single value, as the filter does', () => {
    const filter: FilterGroup = {
      match: 'all',
      rules: [{ property_id: 'p_sel', op: 'is', value: 'opt_stale', values: ['opt_note'] }],
    }
    expect(seedsOf(filter)).toEqual({ p_sel: { kind: 'select', value: 'opt_note' } })
  })

  it("derives nothing from Isn't Checked", () => {
    const filter: FilterGroup = {
      match: 'all',
      rules: [{ property_id: 'p_check', op: 'is', value: 'false' }],
    }
    expect(seedsOf(filter)).toEqual({})
  })

  it('derives nothing from negatives, presence ops, or non-derivable types', () => {
    const rest: FilterGroup = {
      match: 'all',
      rules: [
        { property_id: 'p_sel', op: 'is_not', value: 'opt_x' },
        { property_id: 'p_sel', op: 'is_not_empty' },
        { property_id: 'p_num', op: 'is', value: '3' },
        { property_id: 'p_notes', op: 'is', value: 'a note' },
        { property_id: 'p_gone', op: 'is', value: 'x' },
      ],
    }
    expect(seedsOf(rest)).toEqual({})
  })

  it('an Any group seeds from its first seedable rule alone', () => {
    const any: FilterGroup = {
      match: 'any',
      rules: [
        { property_id: 'p_status', op: 'is', value: 'opt_doing' },
        { property_id: 'p_sel', op: 'is', value: 'opt_note' },
      ],
    }
    expect(seedsOf(any)).toEqual({ p_status: { kind: 'select', value: 'opt_doing' } })
  })

  it('an Any group nested under All seeds its first rule beside its All siblings', () => {
    const filter: FilterGroup = {
      match: 'all',
      rules: [
        { property_id: 'p_sel', op: 'is', value: 'opt_note' },
        {
          match: 'any',
          rules: [
            { property_id: 'p_status', op: 'is', value: 'opt_doing' },
            { property_id: 'p_check', op: 'is', value: 'true' },
          ],
        },
      ],
    }
    expect(seedsOf(filter)).toEqual({
      p_sel: { kind: 'select', value: 'opt_note' },
      p_status: { kind: 'select', value: 'opt_doing' },
    })
  })

  it('an Any group whose first rule cannot seed seeds from the next one that can', () => {
    const filter: FilterGroup = {
      match: 'any',
      rules: [
        { property_id: '_title', op: 'contains', value: 'x' },
        { property_id: 'p_sel', op: 'is', value: 'opt_note' },
        { property_id: 'p_status', op: 'is', value: 'opt_doing' },
      ],
    }
    expect(seedsOf(filter)).toEqual({ p_sel: { kind: 'select', value: 'opt_note' } })
  })

  it('an Any group with no seedable rule seeds nothing', () => {
    const filter: FilterGroup = {
      match: 'any',
      rules: [
        { property_id: '_title', op: 'contains', value: 'x' },
        { property_id: 'p_num', op: 'is', value: '3' },
      ],
    }
    expect(seedsOf(filter)).toEqual({})
  })

  it("an Any group a blank page meets through an Isn't rule seeds nothing", () => {
    const filter: FilterGroup = {
      match: 'any',
      rules: [
        { property_id: 'p_status', op: 'is_not', value: 'opt_Done' },
        { property_id: 'p_pri', op: 'is', value: 'opt_High' },
      ],
    }
    expect(seedsOf(filter)).toEqual({})
  })

  it('an Any group a blank page meets through its creation date seeds nothing', () => {
    const yesterday = localDayKey(new Date(Date.now() - 86_400_000))
    const filter: FilterGroup = {
      match: 'any',
      rules: [
        { property_id: '_created_at', op: 'on_or_after', value: yesterday },
        { property_id: 'p_status', op: 'is', value: 'opt_Done' },
      ],
    }
    expect(seedsOf(filter)).toEqual({})
  })

  it('an Any group a blank page meets through an Is Empty rule seeds nothing', () => {
    const filter: FilterGroup = {
      match: 'any',
      rules: [
        { property_id: 'p_status', op: 'is_empty' },
        { property_id: 'p_pri', op: 'is', value: 'opt_High' },
      ],
    }
    expect(seedsOf(filter)).toEqual({})
  })

  it('an Any group skips a nested All that seeding leaves unmet, discarding its seeds', () => {
    const filter: FilterGroup = {
      match: 'any',
      rules: [
        {
          match: 'all',
          rules: [
            { property_id: 'p_status', op: 'is', value: 'opt_Done' },
            { property_id: '_title', op: 'contains', value: 'x' },
          ],
        },
        { property_id: 'p_pri', op: 'is', value: 'opt_High' },
      ],
    }
    expect(seedsOf(filter)).toEqual({ p_pri: { kind: 'select', value: 'opt_High' } })
  })

  it('an Any group a blank page meets through a later rule seeds nothing from an earlier one', () => {
    const filter: FilterGroup = {
      match: 'any',
      rules: [
        { property_id: 'p_status', op: 'is', value: 'opt_Done' },
        { property_id: 'p_status', op: 'is_not', value: 'opt_Done' },
      ],
    }
    expect(seedsOf(filter)).toEqual({})
  })

  it('an Any group a blank page meets through its Location seeds nothing, and seeds Status where it misses', () => {
    const filter: FilterGroup = {
      match: 'any',
      rules: [
        { property_id: '_location', op: 'is', values: ['S'] },
        { property_id: 'p_status', op: 'is', value: 'opt_Done' },
      ],
    }
    expect(
      filterSeeds({
        filter,
        blank: { ...blank, parentSetId: 'S' },
        schema,
        setTree: [],
        identity: identityFor({}),
      }),
    ).toEqual({})
    expect(seedsOf(filter)).toEqual({ p_status: { kind: 'select', value: 'opt_Done' } })
  })

  it('a nested All that seeding meets seeds through an Any, its unseeded rule already met', () => {
    const filter: FilterGroup = {
      match: 'any',
      rules: [
        {
          match: 'all',
          rules: [
            { property_id: 'p_status', op: 'is_not', value: 'opt_Done' },
            { property_id: 'p_pri', op: 'is', value: 'opt_High' },
          ],
        },
      ],
    }
    expect(seedsOf(filter)).toEqual({ p_pri: { kind: 'select', value: 'opt_High' } })
  })

  it('an Any group passes over a rule the filter ignores', () => {
    const filter: FilterGroup = {
      match: 'any',
      rules: [
        { property_id: 'p_sel', op: 'is' },
        { property_id: 'p_pri', op: 'is', value: 'opt_High' },
      ],
    }
    expect(seedsOf(filter)).toEqual({ p_pri: { kind: 'select', value: 'opt_High' } })
  })

  it("an Any group passes over a rule whose operand doesn't read", () => {
    const filter: FilterGroup = {
      match: 'any',
      rules: [
        { property_id: 'p_num', op: 'is', value: 'abc' },
        { property_id: 'p_pri', op: 'is', value: 'opt_High' },
      ],
    }
    expect(seedsOf(filter)).toEqual({ p_pri: { kind: 'select', value: 'opt_High' } })
  })

  it('a rule naming an option no longer listed seeds nothing', () => {
    const filter: FilterGroup = {
      match: 'all',
      rules: [
        { property_id: 'p_pri', op: 'is', value: 'opt_gone' },
        { property_id: 'p_tags', op: 'contains_any', values: ['opt_gone'] },
      ],
    }
    expect(seedsOf(filter)).toEqual({})
  })

  it('derives a one-option list from a one-chip Multi-Select Is Any or Is All rule', () => {
    const one = (op: string): FilterGroup => ({
      match: 'all',
      rules: [{ property_id: 'p_tags', op, values: ['opt_draft'] }],
    })
    expect(seedsOf(one('contains_any'))).toEqual({
      p_tags: { kind: 'multiSelect', value: ['opt_draft'] },
    })
    expect(seedsOf(one('contains_all'))).toEqual({
      p_tags: { kind: 'multiSelect', value: ['opt_draft'] },
    })
    expect(seedsOf(one('does_not_contain'))).toEqual({})
  })

  it('derives a Space from a one-chip Context Is Any rule, and nothing from two', () => {
    const rule = (values: string[]): FilterGroup => ({
      match: 'all',
      rules: [{ property_id: 'ctx_areas', op: 'contains_any', values }],
    })
    const areas = identityFor({ ctx_areas: ['s_work', 's_home'] })
    expect(seedsOf(rule(['s_work']), areas)).toEqual({
      ctx_areas: { kind: 'context', value: ['s_work'] },
    })
    expect(seedsOf(rule(['s_work', 's_home']), areas)).toEqual({})
  })

  it('takes both values when two one-chip rules name the same list property', () => {
    const both: FilterGroup = {
      match: 'all',
      rules: [
        { property_id: 'p_tags', op: 'contains_any', values: ['opt_draft'] },
        { property_id: 'p_tags', op: 'contains_all', values: ['opt_urgent'] },
        { property_id: 'p_tags', op: 'contains_any', values: ['opt_draft'] },
      ],
    }
    expect(seedsOf(both)).toEqual({
      p_tags: { kind: 'multiSelect', value: ['opt_draft', 'opt_urgent'] },
    })
  })

  it('an absent filter derives nothing', () => {
    expect(seedsOf(undefined)).toEqual({})
  })

  it('a stamp Is rule seeds nothing', () => {
    expect(
      seedsOf({
        match: 'all',
        rules: [{ property_id: '_modified_at', op: 'is', value: '2026-01-01' }],
      }),
    ).toEqual({})
  })
})
