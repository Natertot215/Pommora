import { describe, expect, it } from 'vitest'
import {
  editHeldList,
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
  it('reads the held key, or joins every spelling in the root’s order', () => {
    expect(heldValue({ status: 'Open' }, 'Status', false)).toBe('Open')
    expect(heldValue({ Tags: ['b'], tags: ['a'] }, 'Tags', true)).toEqual(['b', 'a'])
    expect(heldValue({ tags: ['a'], Tags: ['b'] }, 'Tags', true)).toEqual(['a', 'b'])
    expect(heldValue({ tags: 'a' }, 'Tags', true)).toBe('a')
  })
})

describe('editHeldList', () => {
  const strip = (value: string) => (held: unknown[]) => stripList(held, namesValue(value))

  it('without join, edits each spelling where it sits', () => {
    expect(
      editHeldList({ status: ['a'], Status: ['a', 'b'] }, 'Status', false, strip('a')),
    ).toEqual({ Status: ['b'] })
  })

  it('edits a lone spelling where it sits', () => {
    expect(editHeldList({ ID: 'p', tags: ['a', 'b'] }, 'Tags', true, strip('a'))).toEqual({
      ID: 'p',
      tags: ['b'],
    })
  })

  it('edits every spelling as one list, collapsed under the name', () => {
    expect(
      editHeldList(
        { ID: 'p', Tags: ['a', 'b'], tags: ['a', 'c'], other: ['a'] },
        'Tags',
        true,
        strip('a'),
      ),
    ).toEqual({ ID: 'p', Tags: ['b', 'c'], other: ['a'] })
  })

  it('drops every spelling when the edit empties the list', () => {
    expect(editHeldList({ Tags: ['a'], tags: 'a' }, 'Tags', true, strip('a'))).toEqual({})
  })

  it('answers null when nothing changed', () => {
    expect(editHeldList({ Tags: ['b'], tags: ['c'] }, 'Tags', true, strip('a'))).toBeNull()
    expect(editHeldList({ other: ['a'] }, 'Tags', true, strip('a'))).toBeNull()
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
    expect(stripHeld('Tags')({ ID: 'p', Tags: ['a'], tags: ['b'], other: 1 })).toEqual({
      ID: 'p',
      other: 1,
    })
    expect(stripHeld('Tags')({ ID: 'p', Tag: ['a'] })).toBeNull()
  })
})
