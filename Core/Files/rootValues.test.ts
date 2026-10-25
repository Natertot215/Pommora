import { describe, expect, it } from 'vitest'
import {
  editHeldList,
  editList,
  joinValues,
  type KeyCollision,
  namesValue,
  rekeyHeld,
  stripList,
} from './rootValues'
import { assembleEnvelope, renameFrontmatterKey, splitFrontmatter } from './pageFile'

describe('joinValues', () => {
  it('keeps the first value and adds each member of the second that matches none of it: a scalar by its exact title, any other member only by itself', () => {
    expect(joinValues(['b'], ['a', 'B'])).toEqual(['b', 'a', 'B'])
    expect(joinValues(['Pommora'], [[['Pommora']]])).toEqual(['Pommora', [['Pommora']]])
    expect(joinValues('Pommora', ['X'])).toEqual(['Pommora', 'X'])
    expect(joinValues(undefined, ['X'])).toEqual(['X'])
  })
})

describe('editHeldList', () => {
  const strip = (value: string) => (held: unknown[]) => stripList(held, namesValue(value))

  it('edits the key’s list where it sits', () => {
    expect(editHeldList({ ID: 'p', Tags: ['a', 'b'] }, 'Tags', strip('a'))).toEqual({
      ID: 'p',
      Tags: ['b'],
    })
  })

  it('drops the key when the edit empties the list', () => {
    expect(editHeldList({ Tags: ['a'] }, 'Tags', strip('a'))).toEqual({})
  })

  it('answers null when nothing changed, and another casing holds nothing', () => {
    expect(editHeldList({ Tags: ['b'] }, 'Tags', strip('a'))).toBeNull()
    expect(editHeldList({ tags: ['a'] }, 'Tags', strip('a'))).toBeNull()
  })
})

describe('rekeyHeld — the twin of renameFrontmatterKey', () => {
  const cases: [string, string, string, KeyCollision][] = [
    ['a: 1\nTags: [b]\nz: 2', 'Tags', 'tags', 'prefer-new'],
    ['a: 1\nTags: [b]\nz: 2', 'Tags', 'tags', 'merge'],
    ['Tags: [b]\nLabels: [x]', 'Tags', 'Labels', 'prefer-new'],
    ['<Projects>: [Y]\n<Ventures>: X', '<Projects>', '<Ventures>', 'merge'],
    ['Tags: [b]\nlabels: [x]', 'Tags', 'Labels', 'prefer-new'],
    ['<Other>: x', 'Status', 'Stage', 'prefer-new'],
    ['Tags: [b]', 'Tags', 'Tags', 'merge'],
  ]

  it.each(
    cases,
  )('answers the keys and values the page rename does for %j', (fm, from, to, collision) => {
    const content = assembleEnvelope(`${fm}\n`, 'Body')
    const page = renameFrontmatterKey(content, from, to, collision)
    const json = rekeyHeld(splitFrontmatter(content), from, to, collision)
    expect(json).toEqual(page === null ? null : splitFrontmatter(page))
  })
})

describe('rekeyHeld', () => {
  it('prefer-new drops a blank rival with the old key', () => {
    expect(
      rekeyHeld({ Status: 'Stale', keep: 1, Stage: '' }, 'Status', 'Stage', 'prefer-new'),
    ).toEqual({ keep: 1 })
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
