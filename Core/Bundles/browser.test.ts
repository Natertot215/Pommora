import { describe, expect, it } from 'vitest'
import { countPhrase, deleteQuestion, filterRows } from './browser'
import { bundleRow as row } from '../Testing/fixtures'

describe('filterRows', () => {
  const rows = [
    row({ title: 'Alpha', crumbs: [{ kind: 'collection', title: 'Notes' }] }),
    row({ title: 'Beta', crumbs: [{ kind: 'collection', title: 'Journals' }] }),
    row({ title: 'Gamma', crumbs: [] }),
  ]

  it('an empty query keeps the list whole and in the order it arrived', () => {
    expect(filterRows(rows, '').map((r) => r.title)).toEqual(['Alpha', 'Beta', 'Gamma'])
    expect(filterRows(rows, '   ')).toBe(rows)
  })

  it('matches a title', () => {
    expect(filterRows(rows, 'bet').map((r) => r.title)).toEqual(['Beta'])
  })

  it('matches a location, so a row is findable by where it lived', () => {
    expect(filterRows(rows, 'journ').map((r) => r.title)).toEqual(['Beta'])
  })

  it('matches a location and a title together, a / reading as a word break', () => {
    expect(filterRows(rows, 'notes/alpha').map((r) => r.title)).toEqual(['Alpha'])
  })

  it('a query nothing answers yields nothing', () => {
    expect(filterRows(rows, 'zzz')).toEqual([])
  })

  it('a row with no location is still matched on its title alone', () => {
    expect(filterRows(rows, 'gamma').map((r) => r.title)).toEqual(['Gamma'])
  })

  it('narrows in place, keeping the order it arrived in rather than ranking the best match first', () => {
    const listed = [
      row({ title: 'Notes Archive', crumbs: [] }),
      row({ title: 'Notes', crumbs: [] }),
    ]
    expect(filterRows(listed, 'notes').map((r) => r.title)).toEqual(['Notes Archive', 'Notes'])
  })
})

describe('deleteQuestion', () => {
  it('asks of one row by its title, of more by their count, Items where the kinds mix', () => {
    expect(deleteQuestion([row({ title: 'Ideas' })])).toBe('Delete “Ideas”?')
    expect(deleteQuestion([row({}), row({})])).toBe('Delete these 2 Pages?')
    expect(deleteQuestion([row({}), row({ kind: 'set' })])).toBe('Delete these 2 Items?')
  })
})

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
