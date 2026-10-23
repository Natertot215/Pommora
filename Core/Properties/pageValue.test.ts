import { describe, it, expect } from 'vitest'
import { editList, namesValue, stripList, valueEditRewrite } from './pageValue'
import type { Json } from '../Files/stableJson'

const defOf = (key: string) => ({ key, type: key === 'M' ? 'multiSelect' : 'select' }) as const

const strip = (raw: Json, key: string, value: string): Json | null =>
  valueEditRewrite(defOf(key), new Map([[value, null]]))(raw, 'p.md')

const replace = (raw: Json, key: string, oldValue: string, newValue: string): Json | null =>
  valueEditRewrite(defOf(key), new Map([[oldValue, newValue]]))(raw, 'p.md')

describe('valueEditRewrite — strip', () => {
  it('select: deletes the key iff the value matches', () => {
    const hit = strip({ id: 'p1', S: 'Urgent' }, 'S', 'Urgent')
    expect(hit).toEqual({ id: 'p1' })
    expect(strip({ id: 'p1', S: 'Other' }, 'S', 'Urgent')).toBeNull()
  })

  it('multiSelect: filters the array, deletes the key only when empty', () => {
    expect(strip({ M: ['a', 'x', 'b'] }, 'M', 'x')).toEqual({ M: ['a', 'b'] })
    expect(strip({ M: ['x'] }, 'M', 'x')).toEqual({})
  })

  it('multiSelect: preserves foreign (non-string) array elements it never targeted', () => {
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

  it('multiSelect: swaps one element in place', () => {
    expect(replace({ M: ['a', 'x'] }, 'M', 'x', 'y')).toEqual({ M: ['a', 'y'] })
  })

  it('multiSelect: preserves foreign elements when swapping', () => {
    expect(replace({ M: ['x', 5] }, 'M', 'x', 'y')).toEqual({ M: ['y', 5] })
  })

  it('multiSelect: renaming into a value already present merges, never duplicates', () => {
    expect(replace({ M: ['x', 'y'] }, 'M', 'x', 'y')).toEqual({ M: ['y'] })
  })

  it('returns null when the holder does not hold the value', () => {
    expect(replace({ S: 'Other' }, 'S', 'Urgent', 'Critical')).toBeNull()
  })
})

describe('editList', () => {
  it('edits a list of one', () => {
    expect(editList(['a'], new Map([['a', 'b']]))).toEqual(['b'])
  })

  it('answers null when nothing matches', () => {
    expect(editList(['a', 1, null], new Map([['z', null]]))).toBeNull()
  })

  it('a replace into a value the list holds keeps one copy at the renamed element', () => {
    expect(editList(['x', 'a', 'y', 'b'], new Map([['a', 'b']]))).toEqual(['x', 'b', 'y'])
  })

  it('leaves an option written in another casing alone', () => {
    const finished = new Map([['Done', 'Finished']])
    expect(editList(['done', 'Active'], finished)).toBeNull()
    expect(editList(['done', 'finished'], finished)).toBeNull()
  })

  it('a strip that empties the list answers an empty list', () => {
    expect(editList(['a', 'a'], new Map([['a', null]]))).toEqual([])
  })

  it('renames and strips several members in one pass', () => {
    expect(
      editList(
        ['a', 'x', 'b'],
        new Map([
          ['a', null],
          ['b', 'c'],
        ]),
      ),
    ).toEqual(['x', 'c'])
    expect(
      editList(
        ['a', 'b', 'c'],
        new Map([
          ['a', 'A'],
          ['b', 'B'],
        ]),
      ),
    ).toEqual(['A', 'B', 'c'])
  })

  it('answers null when the map names no member, leaving an unrelated duplicate', () => {
    expect(editList(['b', 'b'], new Map([['a', 'b']]))).toBeNull()
  })

  it('a member renamed onto one the list holds is kept once', () => {
    expect(editList(['a', 'b'], new Map([['a', 'b']]))).toEqual(['b'])
  })

  it('keeps a foreign null, which no strip names', () => {
    expect(editList(['a', null, 5], new Map([['a', 'b']]))).toEqual(['b', null, 5])
  })
})

describe('namesValue', () => {
  it('names a value by its exact trimmed title', () => {
    const done = namesValue('Done')
    expect(done('Done')).toBe(true)
    expect(done(' Done ')).toBe(true)
    expect(done('done')).toBe(false)
    expect(done('DONE')).toBe(false)
    expect(done('Open')).toBe(false)
  })
})

describe('stripList', () => {
  it('drops the elements the matcher names, and answers null when it names none', () => {
    const isA = (el: unknown): boolean => el === 'a'
    expect(stripList(['a', 1, 'b', null], isA)).toEqual([1, 'b', null])
    expect(stripList(['b'], isA)).toBeNull()
    expect(stripList(['a'], isA)).toEqual([])
  })
})
