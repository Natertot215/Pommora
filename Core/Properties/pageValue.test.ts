import { describe, it, expect } from 'vitest'
import {
  editHeldLists,
  editList,
  heldValue,
  joinValues,
  namesValue,
  stripList,
  valueEditRewrite,
} from './pageValue'
import { namesSpace } from '../Contexts/contextResolve'
import type { Json } from '../Files/stableJson'

const strip = (raw: Json, key: string, value: string): Json | null =>
  valueEditRewrite(key, value, { op: 'strip' })(raw, 'p.md')

const replace = (raw: Json, key: string, oldValue: string, newValue: string): Json | null =>
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

  it('status: swaps the bare label, same as select', () => {
    expect(replace({ S: 'Active' }, 'S', 'Active', 'Doing')).toEqual({ S: ['Doing'] })
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
    expect(editList(['a'], namesValue, 'a', { op: 'replace', to: 'b' })).toEqual(['b'])
  })

  it('answers null when nothing matches', () => {
    expect(editList(['a', 1, null], namesValue, 'z', { op: 'strip' })).toBeNull()
  })

  it('a replace into a value the list holds keeps one copy at the renamed element', () => {
    expect(editList(['x', 'a', 'y', 'b'], namesValue, 'a', { op: 'replace', to: 'b' })).toEqual([
      'x',
      'b',
      'y',
    ])
  })

  it('a replace of two spellings of one Space yields one title', () => {
    expect(
      editList(['Pommora', 'x', 'pommora'], namesSpace, 'Pommora', { op: 'replace', to: 'Pom' }),
    ).toEqual(['Pom', 'x'])
  })

  it('a Space renamed onto a title the list already spells differently holds one copy, spelled as the new title', () => {
    expect(editList(['b', 'x', 'A'], namesSpace, 'A', { op: 'replace', to: 'B' })).toEqual([
      'B',
      'x',
    ])
  })

  it('a strip that empties the list answers an empty list', () => {
    expect(editList(['a', 'a'], namesValue, 'a', { op: 'strip' })).toEqual([])
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

describe('joinValues', () => {
  it('keeps the first value and adds each member of the second whose title folds to none of it', () => {
    expect(joinValues(['b'], ['a', 'B'])).toEqual(['b', 'a'])
    expect(joinValues('Pommora', ['X'])).toEqual(['Pommora', 'X'])
    expect(joinValues(undefined, ['X'])).toEqual(['X'])
  })
})

describe('heldValue', () => {
  it('reads the held key, or joins every spelling', () => {
    expect(heldValue({ status: 'Open' }, 'Status', false)).toBe('Open')
    expect(heldValue({ Tags: ['b'], tags: ['a'] }, 'Tags', true)).toEqual(['b', 'a'])
    expect(heldValue({ tags: 'a' }, 'Tags', true)).toBe('a')
  })
})

describe('editHeldLists', () => {
  const strip = (value: string) => (held: unknown[]) => stripList(held, namesValue(value))

  it('edits the list under every spelling, dropping a key its edit empties', () => {
    expect(
      editHeldLists({ ID: 'p', Tags: ['a', 'b'], tags: 'a', other: ['a'] }, 'Tags', strip('a')),
    ).toEqual({ ID: 'p', Tags: ['b'], other: ['a'] })
  })

  it('answers null when no spelling changed', () => {
    expect(editHeldLists({ Tags: ['b'], tags: ['c'] }, 'Tags', strip('a'))).toBeNull()
    expect(editHeldLists({ other: ['a'] }, 'Tags', strip('a'))).toBeNull()
  })
})
