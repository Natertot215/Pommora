import { describe, it, expect } from 'vitest'
import { resolveOrder, spliceBeside } from './order'

const mk = (id: string, title: string): { id: string; title: string } => ({ id, title })

describe('resolveOrder', () => {
  it('id-asc fallback when no persisted order', () => {
    const r = resolveOrder([mk('b', 'Z'), mk('a', 'Y')], undefined)
    expect(r.map((x) => x.id)).toEqual(['a', 'b'])
  })

  it('honors persisted order, then appends unreferenced by title', () => {
    const r = resolveOrder([mk('a', 'A'), mk('b', 'B'), mk('c', 'C')], ['c', 'a'])
    expect(r.map((x) => x.id)).toEqual(['c', 'a', 'b'])
  })

  it('drops tombstones (ids in order but not in items)', () => {
    const r = resolveOrder([mk('a', 'A')], ['x', 'a'])
    expect(r.map((x) => x.id)).toEqual(['a'])
  })
})

describe('spliceBeside', () => {
  it('appends for a null anchor — the drop that landed past the last visible card', () => {
    expect(spliceBeside(['a', 'b'], null, 'x', 'above')).toEqual(['a', 'b', 'x'])
  })
})
