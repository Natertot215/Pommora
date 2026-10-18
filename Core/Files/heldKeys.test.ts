import { describe, expect, it } from 'vitest'
import { editHeldList, joinValues, type KeyCollision, rekeyHeld } from './heldKeys'
import { assembleEnvelope, renameFrontmatterKey, splitFrontmatter } from './pageFile'
import { namesValue, stripList } from '../Properties/pageValue'

describe('joinValues', () => {
  it('keeps the first value and adds each member of the second that matches none of it: a scalar by its folded title, any other member only by itself', () => {
    expect(joinValues(['b'], ['a', 'B'])).toEqual(['b', 'a'])
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
