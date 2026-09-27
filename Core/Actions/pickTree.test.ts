import { describe, expect, it } from 'vitest'
import { makeTree } from '../Testing/testTree'
import { pagePickTree } from './pickTree'

describe('the page pick tree the tile and embed menus drill', () => {
  it('lists a container’s Sets before its own pages, picking what the caller asks', () => {
    const [notes] = pagePickTree(makeTree(), undefined, (p) => p.title)
    expect(notes.submenu?.map((n) => [n.label, n.pick])).toEqual([
      ['Ideas', undefined],
      ['Alpha', 'Alpha'],
    ])
    expect(notes.submenu?.[0].submenu?.[0].pick).toBe('Nested Beta')
  })
})
