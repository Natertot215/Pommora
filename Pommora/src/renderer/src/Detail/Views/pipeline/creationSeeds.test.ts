import { describe, expect, it } from 'vitest'
import type { PropertyDefinition } from '@shared/properties'
import type { FilterGroup } from '@shared/views'
import { filterSeeds } from './creationSeeds'

const schema: PropertyDefinition[] = [
  { id: 'p_status', name: 'Status', type: 'status' },
  { id: 'p_sel', name: 'Kind', type: 'select' },
  { id: 'p_check', name: 'Done', type: 'checkbox' },
  { id: 'p_num', name: 'Count', type: 'number' },
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

  it('derives nothing from Any-mode groups, negatives, presence ops, or non-derivable types', () => {
    const any: FilterGroup = {
      match: 'any',
      rules: [{ property_id: 'p_status', op: 'is', value: 'doing' }],
    }
    expect(filterSeeds(any, true, schema)).toEqual({})
    const rest: FilterGroup = {
      match: 'all',
      rules: [
        { property_id: 'p_sel', op: 'is_not', value: 'x' },
        { property_id: 'p_sel', op: 'is_not_empty' },
        { property_id: 'p_num', op: 'is', value: '3' },
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
        { match: 'any', rules: [{ property_id: 'p_status', op: 'is', value: 'doing' }] },
      ],
    }
    expect(filterSeeds(filter, true, schema)).toEqual({ p_sel: { kind: 'select', value: 'note' } })
  })

  it('a disabled or absent filter derives nothing', () => {
    const filter: FilterGroup = {
      match: 'all',
      rules: [{ property_id: 'p_status', op: 'is', value: 'doing' }],
    }
    expect(filterSeeds(filter, false, schema)).toEqual({})
    expect(filterSeeds(undefined, true, schema)).toEqual({})
  })
})
