import { describe, it, expect } from 'vitest'
import { searchEntriesOf } from '../treeIndex'
import { filterNav } from './navSearch'
import { makeTree } from './testTree'

const index = (): ReturnType<typeof searchEntriesOf> => searchEntriesOf(makeTree())

describe('filterNav', () => {
  it('empty query returns nothing (the surface shows recents/favorites instead)', () => {
    expect(filterNav(index(), '   ')).toEqual([])
  })

  it('matches page titles (page titles ARE searchable)', () => {
    const hits = filterNav(index(), 'alpha')
    expect(hits.map((h) => h.title)).toContain('Alpha')
  })

  it('is case-insensitive and fuzzy (subsequence)', () => {
    const hits = filterNav(index(), 'nb') // subsequence of "Nested Beta"
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

  it('respects the result cap', () => {
    expect(filterNav(index(), 'e', 2).length).toBeLessThanOrEqual(2)
  })
})
