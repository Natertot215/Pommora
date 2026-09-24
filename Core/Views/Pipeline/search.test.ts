import { describe, expect, it } from 'vitest'
import type { ResolvedGroup, ViewRow } from '@pommora/core/Views/viewRow'
import { searchGroups } from './search'

const row = (id: string, title: string): ViewRow => ({ id, title }) as ViewRow
const one = row('p1', 'One')
const two = row('p2', 'Two')
const tree = row('p3', 'Tree')
const titles = new Map([one, two, tree].map((r) => [r.id, r.title.toLowerCase()]))
const groups: ResolvedGroup[] = [
  { key: 'g1', kind: 'property', items: [one, two] },
  {
    key: 's1',
    kind: 'structural-set',
    items: [],
    children: [{ key: 's2', kind: 'structural-set', items: [tree] }],
  },
]

describe('searchGroups', () => {
  it('keeps the matching rows in the view order', () => {
    expect(searchGroups(groups, 'o', titles)[0].items.map((r) => r.id)).toEqual(['p1', 'p2'])
  })

  it('matches letters in order across gaps, as nav search does', () => {
    expect(searchGroups(groups, 'oe', titles)[0].items.map((r) => r.id)).toEqual(['p1'])
  })

  it('drops every group left without a match, nested ones included', () => {
    expect(searchGroups(groups, 'tw', titles).map((g) => g.key)).toEqual(['g1'])
    const nested = searchGroups(groups, 'tree', titles)
    expect(nested.map((g) => g.key)).toEqual(['s1'])
    expect(nested[0].children?.map((g) => g.key)).toEqual(['s2'])
  })
})
