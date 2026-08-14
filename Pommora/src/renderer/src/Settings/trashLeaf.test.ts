import { describe, expect, it } from 'vitest'
import type { TrashRow } from '@shared/types'
import { countPhrase, filterRows } from './TrashLeaf'

const row = (over: Partial<TrashRow>): TrashRow => ({
  bundlePath: `.trash/${over.title ?? 'x'}.deleted`,
  kind: 'page',
  title: 'Alpha',
  crumbs: [{ kind: 'collection', title: 'Notes' }],
  deletedAt: 0,
  homeResolves: true,
  ...over,
})

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

  it('a query nothing answers yields nothing', () => {
    expect(filterRows(rows, 'zzz')).toEqual([])
  })

  it('a row with no location is still matched on its title alone', () => {
    expect(filterRows(rows, 'gamma').map((r) => r.title)).toEqual(['Gamma'])
  })
})

describe('countPhrase', () => {
  it('names the kind when every row shares one', () => {
    expect(countPhrase([row({}), row({})])).toBe('2 pages')
    expect(countPhrase([row({ kind: 'set' }), row({ kind: 'set' })])).toBe('2 sets')
    expect(countPhrase([row({ kind: 'context' }), row({ kind: 'context' })])).toBe('2 contexts')
  })

  it('generalizes when they do not', () => {
    expect(countPhrase([row({}), row({ kind: 'space' })])).toBe('2 items')
  })

  it('stays singular for one', () => {
    expect(countPhrase([row({})])).toBe('1 page')
    expect(countPhrase([row({ kind: 'space' })])).toBe('1 space')
  })

  it('reports none honestly', () => {
    expect(countPhrase([])).toBe('0 items')
  })
})
