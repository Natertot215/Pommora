import { describe, expect, it } from 'vitest'
import { countPhrase, unsweptLine } from './entities'
import { bundleRow as row } from '../Testing/bundles'

describe('countPhrase', () => {
  it('names the kind when every row shares one', () => {
    expect(countPhrase([row({}), row({})])).toBe('2 Pages')
    expect(countPhrase([row({ kind: 'set' }), row({ kind: 'set' })])).toBe('2 Sets')
    expect(countPhrase([row({ kind: 'context' }), row({ kind: 'context' })])).toBe('2 Contexts')
  })

  it('generalizes when they do not', () => {
    expect(countPhrase([row({}), row({ kind: 'space' })])).toBe('2 Items')
  })

  it('stays singular for one', () => {
    expect(countPhrase([row({})])).toBe('1 Page')
    expect(countPhrase([row({ kind: 'space' })])).toBe('1 Space')
  })

  it('reports none honestly', () => {
    expect(countPhrase([])).toBe('0 Items')
  })
})

describe('unsweptLine', () => {
  it('names a sweep’s misses in Items, singular for one', () => {
    expect(unsweptLine(1)).toBe('Couldn’t update 1 Item.')
    expect(unsweptLine(2, 'links in ')).toBe('Couldn’t update links in 2 Items.')
  })
})
