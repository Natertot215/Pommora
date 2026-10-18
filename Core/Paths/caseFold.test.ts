import { describe, expect, it } from 'vitest'
import {
  compareTitles,
  matchKey,
  matchQuery,
  matchScore,
  normalizeTitle,
  rankMatches,
} from './caseFold'

const titled = (...titles: string[]) => titles.map((title) => ({ title }))

describe('normalizeTitle', () => {
  it('trims surrounding whitespace/newlines and case-folds', () => {
    expect(normalizeTitle('  My Page \n')).toBe('my page')
    expect(normalizeTitle('PROJECT')).toBe('project')
  })

  it('collapses titles that differ only by case/whitespace to one key', () => {
    expect(normalizeTitle(' Notes')).toBe(normalizeTitle('notes '))
  })

  it('NFC-normalizes so NFD and NFC spellings collapse to one key', () => {
    expect(normalizeTitle('Café')).toBe(normalizeTitle('Café'))
  })
})

describe('matchScore', () => {
  it('scores a plain title query by the name alone, wherever the page sits', () => {
    expect(matchScore(matchKey('Notes', 'Journal'), 'notes')).toBe(
      matchScore(matchKey('Notes'), 'notes'),
    )
  })

  it('reaches through the location, a typed / reading as a word break', () => {
    const q = matchQuery('Pommora/Cl')
    expect(matchScore(matchKey('ClaudeMD', 'Studio/Pommora'), q)).not.toBeNull()
    expect(matchScore(matchKey('ClaudeMD', 'Studio/Sapphire'), q)).toBeNull()
  })

  it('folds a run of slashes and spaces to one word break, a leading one to none', () => {
    expect(matchQuery('/Studio/Pommora')).toBe('studio pommora')
    expect(matchQuery('Pommora / Cl')).toBe('pommora cl')
    expect(matchKey('x', '/a/').place).toBe('a x')
  })

  it('seats a match through the location below every name match', () => {
    const q = matchQuery('ar')
    expect(matchScore(matchKey('Articles about stuff'), q)).toBeGreaterThan(
      matchScore(matchKey('N0', 'Archive'), q) ?? Number.NaN,
    )
  })

  it('reads a / in a name as the word break the query folds to', () => {
    expect(matchScore(matchKey('Q1/Q2 Plan'), matchQuery('Q1/Q2'))).not.toBeNull()
  })
})

describe('rankMatches', () => {
  const keyed = (i: { title: string }) => matchKey(i.title)
  it('keeps the same best items a full sort would, in the same order', () => {
    const items = titled(...Array.from({ length: 200 }, (_, i) => `note ${(i * 37) % 200}`))
    const score = (i: { title: string }) => matchScore(keyed(i), 'n')
    const sorted = items
      .filter((i) => score(i) !== null)
      .sort((a, b) => (score(b) ?? 0) - (score(a) ?? 0) || compareTitles(a.title, b.title))
    expect(rankMatches(items, 'n', keyed, 10)).toEqual(sorted.slice(0, 10))
  })

  it('breaks a tied score by name', () => {
    expect(rankMatches(titled('Beta', 'Alpha'), 'a', keyed).map((i) => i.title)).toEqual([
      'Alpha',
      'Beta',
    ])
  })

  it('drops items that match nowhere', () => {
    expect(rankMatches(titled('Alpha', 'Beta'), 'alp', keyed).map((i) => i.title)).toEqual([
      'Alpha',
    ])
  })
})
