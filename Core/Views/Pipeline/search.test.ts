import { describe, expect, it } from 'vitest'
import type { ResolvedGroup, ViewRow } from '../viewRow'
import { matchKey, matchQuery } from '../../Paths/caseFold'
import { searchGroups } from './search'

const row = (id: string, title: string): ViewRow => ({ id, title }) as ViewRow
const one = row('p1', 'One')
const two = row('p2', 'Two')
const tree = row('p3', 'Tree')
const keys = new Map([
  [one.id, matchKey(one.title)],
  [two.id, matchKey(two.title)],
  [tree.id, matchKey(tree.title, 'Garden/Orchard')],
])
const groups: ResolvedGroup[] = [
  { key: 'g1', kind: 'bucket', value: 'g1', items: [one, two] },
  {
    key: 's1',
    kind: 'set',
    items: [],
    children: [{ key: 's2', kind: 'set', items: [tree] }],
  },
]

describe('searchGroups', () => {
  it('keeps the matching rows in the view order', () => {
    expect(searchGroups(groups, 'o', keys)[0].items.map((r) => r.id)).toEqual(['p1', 'p2'])
  })

  it('matches letters in order across gaps, as nav search does', () => {
    expect(searchGroups(groups, 'oe', keys)[0].items.map((r) => r.id)).toEqual(['p1'])
  })

  it('drops every group left without a match, nested ones included', () => {
    expect(searchGroups(groups, 'tw', keys).map((g) => g.key)).toEqual(['g1'])
    const nested = searchGroups(groups, 'tree', keys)
    expect(nested.map((g) => g.key)).toEqual(['s1'])
    expect(nested[0].children?.map((g) => g.key)).toEqual(['s2'])
  })

  it('finds a row through the Sets it sits in', () => {
    const found = searchGroups(groups, matchQuery('Orchard/Tr'), keys)
    expect(found.map((g) => g.key)).toEqual(['s1'])
    expect(found[0].children?.[0].items.map((r) => r.id)).toEqual(['p3'])
  })
})
