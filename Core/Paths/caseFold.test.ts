import { describe, expect, it } from 'vitest'
import { compareTitles, matchScore, rankMatches } from './caseFold'

const titled = (...titles: string[]) => titles.map((title) => ({ title }))
const scoreBy = (q: string) => (item: { title: string }) => matchScore(item.title.toLowerCase(), q)

describe('rankMatches', () => {
  it('keeps the same best items a full sort would, in the same order', () => {
    const items = titled(...Array.from({ length: 200 }, (_, i) => `note ${(i * 37) % 200}`))
    const score = scoreBy('n')
    const sorted = items
      .filter((i) => score(i) !== null)
      .sort((a, b) => (score(b) ?? 0) - (score(a) ?? 0) || compareTitles(a.title, b.title))
    expect(rankMatches(items, score, 10)).toEqual(sorted.slice(0, 10))
  })

  it('breaks a tied score by title', () => {
    expect(rankMatches(titled('Beta', 'Alpha'), () => 1).map((i) => i.title)).toEqual([
      'Alpha',
      'Beta',
    ])
  })

  it('drops items with no score', () => {
    expect(rankMatches(titled('Alpha', 'Beta'), scoreBy('alp')).map((i) => i.title)).toEqual([
      'Alpha',
    ])
  })
})
