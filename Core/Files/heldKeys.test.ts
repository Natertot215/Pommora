import { describe, expect, it } from 'vitest'
import {
  editHeldLists,
  heldKey,
  heldValue,
  joinValues,
  type KeyCollision,
  rekeyHeld,
  stripHeld,
} from './heldKeys'
import { assembleEnvelope, renameFrontmatterKey, splitFrontmatter } from './pageFile'
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

describe('rekeyHeld — the twin of renameFrontmatterKey', () => {
  const cases: [string, string, string, KeyCollision, boolean][] = [
    ['a: 1\nTags: [b]\ntags: [a, B]\nz: 2', 'Tags', 'Labels', 'prefer-new', true],
    ['a: 1\nTags: [b]\ntags: [a, B]', 'Tags', 'Labels', 'prefer-new', false],
    ['Tags: [b]\nlabels: [x]\ntags: [a]', 'Tags', 'Labels', 'prefer-new', true],
    ['<Projects>: [Y]\n<Ventures>: X', '<Projects>', '<Ventures>', 'merge', true],
    ['tags:\n  - a\n  - b', 'Tags', 'Labels', 'prefer-new', true],
    ['<Other>: x', 'Status', 'Stage', 'prefer-new', false],
  ]

  it.each(
    cases,
  )('answers the keys and values the page rename does for %j', (fm, from, to, collision, join) => {
    const content = assembleEnvelope(`${fm}\n`, 'Body')
    const page = renameFrontmatterKey(content, from, to, collision, join)
    const json = rekeyHeld(splitFrontmatter(content), from, to, collision, join)
    expect(json).toEqual(page === null ? null : splitFrontmatter(page))
  })
})

describe('stripHeld', () => {
  it('strips every spelling of the name, and answers null when none is held', () => {
    expect(stripHeld({ ID: 'p', Tags: ['a'], tags: ['b'], other: 1 }, 'Tags')).toEqual({
      ID: 'p',
      other: 1,
    })
    expect(stripHeld({ ID: 'p', Tag: ['a'] }, 'Tags')).toBeNull()
  })
})
