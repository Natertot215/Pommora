import { describe, it, expect } from 'vitest'
import { searchEntriesOf } from '../Nexus/treeIndex'
import { filterNav } from './navSearch'
import { foldKey } from '../Paths/caseFold'
import { makeTree } from '../Testing/testTree'

const index = (): ReturnType<typeof searchEntriesOf> => searchEntriesOf(makeTree())

describe('filterNav', () => {
  it('empty query returns nothing (the surface shows recents instead)', () => {
    expect(filterNav(index(), '   ')).toEqual([])
  })

  it('matches page titles (page titles ARE searchable)', () => {
    const hits = filterNav(index(), 'alpha')
    expect(hits.map((h) => h.title)).toContain('Alpha')
  })

  it('is case-insensitive and matches a subsequence', () => {
    const hits = filterNav(index(), 'nb')
    expect(hits.map((h) => h.title)).toContain('Nested Beta')
  })

  it('ranks a contiguous/prefix match above a scattered subsequence', () => {
    // "Nested Beta" (prefix) should outrank "TestNexus" (scattered n…e…s)
    const hits = filterNav(index(), 'nes')
    expect(hits.map((h) => h.title)).toContain('TestNexus')
    expect(hits[0].title).toBe('Nested Beta')
  })

  it('drops non-matches', () => {
    expect(filterNav(index(), 'zzzzz')).toEqual([])
  })

  it('finds a title stored decomposed from a composed query', () => {
    const entry = { key: 'page:x', target: { kind: 'page', id: 'x' } as const, title: 'Cafe\u0301' }
    const hits = filterNav([{ ...entry, folded: foldKey(entry.title) }], 'Caf\u00e9')
    expect(hits.map((h) => h.key)).toEqual(['page:x'])
  })
})
