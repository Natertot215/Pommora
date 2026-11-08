import { describe, it, expect } from 'vitest'
import { placedBeside, resolveOrder, type Slot, spliceBeside } from './order'
import type { MutateRequest } from './mutateRequest'

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

describe('placedBeside', () => {
  const page: Extract<MutateRequest, { op: 'createPage' }> = {
    op: 'createPage',
    id: 'p9',
    parentPath: 'Notes',
    name: 'Untitled',
  }
  const orderWithSlot = (...at: [string[], string | null, Slot]): string[] | undefined =>
    placedBeside(page, ...at).order

  it('appends for a band-add and splices beside an anchor', () => {
    expect(orderWithSlot(['a', 'b'], null, 'last')).toEqual(['a', 'b', 'p9'])
    expect(orderWithSlot(['a', 'b', 'c'], 'b', 'above')).toEqual(['a', 'p9', 'b', 'c'])
    expect(orderWithSlot(['a', 'b', 'c'], 'b', 'below')).toEqual(['a', 'b', 'p9', 'c'])
  })

  it('carries the FULL sibling list — a filtered subset would re-rank hidden rows', () => {
    const full = ['visible1', 'hidden1', 'visible2', 'hidden2']
    expect(orderWithSlot(full, 'visible2', 'below')).toEqual([
      'visible1',
      'hidden1',
      'visible2',
      'p9',
      'hidden2',
    ])
  })

  it('appends when the anchor is not among the siblings', () => {
    expect(orderWithSlot(['a', 'b'], 'ghost', 'above')).toEqual(['a', 'b', 'p9'])
  })

  it('leads the siblings at the first slot', () => {
    expect(orderWithSlot(['a', 'b'], null, 'first')).toEqual(['p9', 'a', 'b'])
  })
})
