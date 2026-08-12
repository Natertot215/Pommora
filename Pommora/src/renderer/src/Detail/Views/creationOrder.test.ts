import { describe, expect, it } from 'vitest'
import { NEW_PAGE_SLOT } from '@shared/mutate'
import { orderWithSlot, tieOrderWith } from './creationOrder'
import { makeSorter, resolveManualOrder } from './pipeline/sort'
import type { ViewRow } from '@shared/types'

describe('orderWithSlot', () => {
  it('appends for a band-add and splices beside an anchor', () => {
    expect(orderWithSlot(['a', 'b'], null, 'last')).toEqual(['a', 'b', NEW_PAGE_SLOT])
    expect(orderWithSlot(['a', 'b', 'c'], 'b', 'above')).toEqual(['a', NEW_PAGE_SLOT, 'b', 'c'])
    expect(orderWithSlot(['a', 'b', 'c'], 'b', 'below')).toEqual(['a', 'b', NEW_PAGE_SLOT, 'c'])
  })

  it('carries the FULL sibling list — a filtered subset would re-rank hidden rows', () => {
    // The caller hands the container's own children; rows a filter hides are still here.
    const full = ['visible1', 'hidden1', 'visible2', 'hidden2']
    expect(orderWithSlot(full, 'visible2', 'below')).toEqual([
      'visible1',
      'hidden1',
      'visible2',
      NEW_PAGE_SLOT,
      'hidden2',
    ])
  })

  it('appends when the anchor is not among the siblings', () => {
    expect(orderWithSlot(['a', 'b'], 'ghost', 'above')).toEqual(['a', 'b', NEW_PAGE_SLOT])
  })
})

describe('tieOrderWith', () => {
  it('reproduces the current ranking and places the new id beside its anchor', () => {
    // Existing manual order covers some rows; the rest rank last in source order today.
    const out = tieOrderWith(['b', 'a'], ['a', 'b', 'c', 'd'], 'new', 'c', 'below')
    expect(out).toEqual(['b', 'a', 'c', 'new', 'd'])
  })

  it('with no existing order, the array is the full source order — no sibling moves', () => {
    expect(tieOrderWith(undefined, ['a', 'b', 'c'], 'new', 'a', 'above')).toEqual([
      'new',
      'a',
      'b',
      'c',
    ])
  })

  it('includes every container row, not just the visible ones', () => {
    // Under an active filter the caller still passes ALL ids — hidden rows keep their rank.
    const out = tieOrderWith(undefined, ['vis1', 'hid1', 'vis2'], 'new', 'vis1', 'below')
    expect(out).toEqual(['vis1', 'new', 'hid1', 'vis2'])
  })

  it('appends when the anchor vanished', () => {
    expect(tieOrderWith(['a'], ['a', 'b'], 'new', 'gone', 'below')).toEqual(['a', 'b', 'new'])
  })
})

// The create-act settle: a newborn absent from a live order array ranks last (MAX_SAFE_INTEGER),
// so both live arrays are spliced in the same act the create writes — the first paint already
// places the row at its slot, under a prior drag and under the stale-array fall-through alike.
describe('the created row settles into the live order', () => {
  const rows = (ids: string[]): ViewRow[] =>
    ids.map((id) => ({ id, path: `${id}.md`, title: id }) as unknown as ViewRow)

  it('a stale manual override spliced via tieOrderWith ranks the newborn at its slot first-pass', () => {
    const stale = ['p3', 'p1', 'p2']
    const spliced = tieOrderWith(stale, ['p1', 'p2', 'p3', 'pNew'], 'pNew', 'p1', 'below')
    expect(spliced).toEqual(['p3', 'p1', 'pNew', 'p2'])
    const manual = resolveManualOrder(true, spliced, stale)
    const sorter = makeSorter(undefined, [], manual)
    expect(sorter?.(rows(['p1', 'p2', 'p3', 'pNew'])).map((r) => r.id)).toEqual(spliced)
  })

  it('unspliced, the same state ranks the newborn last — the defect the settle kills', () => {
    const stale = ['p3', 'p1', 'p2']
    const manual = resolveManualOrder(true, stale, undefined)
    const sorter = makeSorter(undefined, [], manual)
    expect(sorter?.(rows(['p1', 'p2', 'p3', 'pNew'])).map((r) => r.id)).toEqual([
      'p3',
      'p1',
      'p2',
      'pNew',
    ])
  })

  it('the fall-through path: no override, a stale persisted array — the persisted splice serves it', () => {
    const stale = ['p3', 'p1', 'p2']
    const spliced = tieOrderWith(stale, ['p1', 'p2', 'p3', 'pNew'], 'pNew', 'p1', 'below')
    const manual = resolveManualOrder(true, null, spliced)
    const sorter = makeSorter(undefined, [], manual)
    expect(sorter?.(rows(['p1', 'p2', 'p3', 'pNew'])).map((r) => r.id)).toEqual(spliced)
  })
})
