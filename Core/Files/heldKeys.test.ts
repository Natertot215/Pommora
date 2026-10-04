import { describe, expect, it } from 'vitest'
import { editHeldLists, heldKey, heldValue, joinValues } from './heldKeys'
import { namesValue, stripList } from '../Properties/pageValue'

describe('heldKey', () => {
  it('answers the exact spelling before anything folds, else the first that folds', () => {
    expect(heldKey({ tags: 1, Tags: 2 }, 'Tags')).toBe('Tags')
    expect(heldKey({ STATUS: 1, status: 2 }, 'Status')).toBe('STATUS')
    expect(heldKey({}, 'Status')).toBeUndefined()
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
