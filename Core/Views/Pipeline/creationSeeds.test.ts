import { describe, expect, it } from 'vitest'
import type { PropertyDefinition } from '../../Properties/properties'
import type { FilterGroup } from '../views'
import { filterSeeds } from './creationSeeds'

const schema: PropertyDefinition[] = [
  { id: 'p_status', name: 'Status', type: 'status' },
  { id: 'p_sel', name: 'Kind', type: 'select' },
  { id: 'p_check', name: 'Done', type: 'checkbox' },
  { id: 'p_num', name: 'Count', type: 'number' },
  { id: 'p_tags', name: 'Tags', type: 'multiSelect' },
  { id: 'p_notes', name: 'Notes', type: 'text' },
]

describe('filterSeeds', () => {
  it('derives positive Is rules on status/select/checkbox under All-mode', () => {
    const filter: FilterGroup = {
      match: 'all',
      rules: [
        { property_id: 'p_status', op: 'is', value: 'doing' },
        { property_id: 'p_check', op: 'is', value: 'true' },
      ],
    }
    expect(filterSeeds(filter, true, schema)).toEqual({
      p_status: { kind: 'select', value: 'doing' },
      p_check: { kind: 'checkbox', value: true },
    })
  })

  it('derives the one chip a Select or Status Is rule saves, and nothing from two', () => {
    const filter: FilterGroup = {
      match: 'all',
      rules: [
        { property_id: 'p_status', op: 'is', values: ['Done'] },
        { property_id: 'p_sel', op: 'is', values: ['a', 'b'] },
      ],
    }
    expect(filterSeeds(filter, true, schema)).toEqual({
      p_status: { kind: 'select', value: 'Done' },
    })
  })

  it('reads a chip list over a leftover single value, as the filter does', () => {
    const filter: FilterGroup = {
      match: 'all',
      rules: [{ property_id: 'p_sel', op: 'is', value: 'stale', values: ['note'] }],
    }
    expect(filterSeeds(filter, true, schema)).toEqual({ p_sel: { kind: 'select', value: 'note' } })
  })

  it("derives nothing from Isn't Checked", () => {
    const filter: FilterGroup = {
      match: 'all',
      rules: [{ property_id: 'p_check', op: 'is', value: 'false' }],
    }
    expect(filterSeeds(filter, true, schema)).toEqual({})
  })

  it('derives nothing from Any-mode groups, negatives, presence ops, or non-derivable types', () => {
    const any: FilterGroup = {
      match: 'any',
      rules: [
        { property_id: 'p_status', op: 'is', value: 'doing' },
        { property_id: 'p_sel', op: 'is', value: 'note' },
      ],
    }
    expect(filterSeeds(any, true, schema)).toEqual({})
    expect(filterSeeds({ ...any, rules: any.rules.slice(0, 1) }, true, schema)).toEqual({
      p_status: { kind: 'select', value: 'doing' },
    })
    const rest: FilterGroup = {
      match: 'all',
      rules: [
        { property_id: 'p_sel', op: 'is_not', value: 'x' },
        { property_id: 'p_sel', op: 'is_not_empty' },
        { property_id: 'p_num', op: 'is', value: '3' },
        { property_id: 'p_notes', op: 'is', value: 'a note' },
        { property_id: 'p_gone', op: 'is', value: 'x' },
      ],
    }
    expect(filterSeeds(rest, true, schema)).toEqual({})
  })

  it('an Any-group nested under All derives nothing while its All siblings still do', () => {
    const filter: FilterGroup = {
      match: 'all',
      rules: [
        { property_id: 'p_sel', op: 'is', value: 'note' },
        {
          match: 'any',
          rules: [
            { property_id: 'p_status', op: 'is', value: 'doing' },
            { property_id: 'p_check', op: 'is', value: 'true' },
          ],
        },
      ],
    }
    expect(filterSeeds(filter, true, schema)).toEqual({ p_sel: { kind: 'select', value: 'note' } })
  })

  it('derives a one-option list from a one-chip Multi-Select Is Any or Is All rule', () => {
    const one = (op: string): FilterGroup => ({
      match: 'all',
      rules: [{ property_id: 'p_tags', op, values: ['draft'] }],
    })
    expect(filterSeeds(one('contains_any'), true, schema)).toEqual({
      p_tags: { kind: 'multiSelect', value: ['draft'] },
    })
    expect(filterSeeds(one('contains_all'), true, schema)).toEqual({
      p_tags: { kind: 'multiSelect', value: ['draft'] },
    })
    expect(filterSeeds(one('does_not_contain'), true, schema)).toEqual({})
  })

  it('derives a Space from a one-chip Context Contains rule, and nothing from two', () => {
    const rule = (values: string[]): FilterGroup => ({
      match: 'all',
      rules: [{ property_id: 'ctx_areas', op: 'contains_any', values }],
    })
    expect(filterSeeds(rule(['s_work']), true, schema, ['ctx_areas'])).toEqual({
      ctx_areas: { kind: 'context', value: ['s_work'] },
    })
    expect(filterSeeds(rule(['s_work', 's_home']), true, schema, ['ctx_areas'])).toEqual({})
  })

  it('takes both values when two one-chip rules name the same list property', () => {
    const both: FilterGroup = {
      match: 'all',
      rules: [
        { property_id: 'p_tags', op: 'contains_any', values: ['draft'] },
        { property_id: 'p_tags', op: 'contains_all', values: ['urgent'] },
        { property_id: 'p_tags', op: 'contains_any', values: ['draft'] },
      ],
    }
    expect(filterSeeds(both, true, schema)).toEqual({
      p_tags: { kind: 'multiSelect', value: ['draft', 'urgent'] },
    })
  })

  it('a disabled or absent filter derives nothing', () => {
    const filter: FilterGroup = {
      match: 'all',
      rules: [{ property_id: 'p_status', op: 'is', value: 'doing' }],
    }
    expect(filterSeeds(filter, false, schema)).toEqual({})
    expect(filterSeeds(undefined, true, schema)).toEqual({})
  })

  it('a stamp Is rule seeds nothing', () => {
    expect(
      filterSeeds(
        { match: 'all', rules: [{ property_id: '_modified_at', op: 'is', value: '2026-01-01' }] },
        true,
        schema,
      ),
    ).toEqual({})
  })
})
