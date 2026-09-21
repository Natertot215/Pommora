import { describe, it, expect } from 'vitest'
import { valueEditRewrite } from './pageValue'

type Raw = Record<string, unknown>

const strip = (raw: Raw, key: string, value: string): Raw | null =>
  valueEditRewrite(key, value, { op: 'strip' })(raw, 'p.md')

const replace = (raw: Raw, key: string, oldValue: string, newValue: string): Raw | null =>
  valueEditRewrite(key, oldValue, { op: 'replace', to: newValue })(raw, 'p.md')

describe('valueEditRewrite — strip', () => {
  it('select: deletes the key iff the value matches', () => {
    const hit = strip({ id: 'p1', S: 'Urgent' }, 'S', 'Urgent')
    expect(hit).toEqual({ id: 'p1' })
    expect(strip({ id: 'p1', S: 'Other' }, 'S', 'Urgent')).toBeNull()
  })

  it('status: strips the bare label, same as select', () => {
    expect(strip({ id: 'p1', S: 'Active' }, 'S', 'Active')).toEqual({ id: 'p1' })
  })

  it('multi_select: filters the array, deletes the key only when empty', () => {
    expect(strip({ M: ['a', 'x', 'b'] }, 'M', 'x')).toEqual({ M: ['a', 'b'] })
    expect(strip({ M: ['x'] }, 'M', 'x')).toEqual({})
  })

  it('multi_select: preserves foreign (non-string) array elements it never targeted', () => {
    expect(strip({ M: ['x', 5, 'keep'] }, 'M', 'x')).toEqual({ M: [5, 'keep'] })
  })
})

describe('the option list is the one shape', () => {
  it('a list-shaped Select or Status value is renamed and stripped in place', () => {
    expect(replace({ Status: ['Active'] }, 'Status', 'Active', 'Live')).toEqual({
      Status: ['Live'],
    })
    expect(strip({ Status: ['Active'] }, 'Status', 'Active')).toEqual({})
  })

  it('a YAML number names the option it spells, and the rewrite spells it back as a string', () => {
    expect(replace({ Year: [2024] }, 'Year', '2024', 'FY2024')).toEqual({ Year: ['FY2024'] })
    expect(strip({ Year: 2024 }, 'Year', '2024')).toEqual({})
    expect(strip({ Year: 2025 }, 'Year', '2024')).toBeNull()
  })

  it('a scalar written from outside rewrites to a list of one', () => {
    expect(replace({ Status: 'Active' }, 'Status', 'Active', 'Live')).toEqual({ Status: ['Live'] })
  })
})

describe('valueEditRewrite — replace (rename cascade)', () => {
  it('select: swaps the matching value', () => {
    expect(replace({ S: 'Urgent' }, 'S', 'Urgent', 'Critical')).toEqual({ S: ['Critical'] })
  })

  it('status: swaps the bare label, same as select', () => {
    expect(replace({ S: 'Active' }, 'S', 'Active', 'Doing')).toEqual({ S: ['Doing'] })
  })

  it('multi_select: swaps one element in place', () => {
    expect(replace({ M: ['a', 'x'] }, 'M', 'x', 'y')).toEqual({ M: ['a', 'y'] })
  })

  it('multi_select: preserves foreign elements when swapping', () => {
    expect(replace({ M: ['x', 5] }, 'M', 'x', 'y')).toEqual({ M: ['y', 5] })
  })

  it('multi_select: renaming into a value already present merges, never duplicates', () => {
    expect(replace({ M: ['x', 'y'] }, 'M', 'x', 'y')).toEqual({ M: ['y'] })
  })

  it('returns null when the holder does not hold the value', () => {
    expect(replace({ S: 'Other' }, 'S', 'Urgent', 'Critical')).toBeNull()
  })
})
