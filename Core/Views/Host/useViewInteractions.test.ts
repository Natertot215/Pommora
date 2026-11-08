import { describe, it, expect } from 'vitest'
import { UNGROUPED } from '../viewRow'
import { reassignTarget } from './useViewInteractions'

describe('reassignTarget - the sorted-run drop', () => {
  const keys: Record<string, string> = {
    a: 'opt_todo',
    b: 'opt_todo',
    c: 'opt_doing',
    d: 'opt_doing',
    e: 'opt_doing',
    lone: 'opt_blocked',
    f: UNGROUPED,
    g: UNGROUPED,
  }
  const run = (order: string[], dragged: string): string | undefined =>
    reassignTarget(order, dragged, (id) => keys[id])

  it('a slot strictly inside a foreign run takes that run value', () => {
    expect(run(['a', 'c', 'b', 'd', 'e'], 'b')).toBe('opt_doing')
  })

  it('the seam between two runs changes nothing', () => {
    expect(run(['a', 'b', 'c', 'd', 'e'], 'b')).toBeUndefined()
  })

  it('either end of the list changes nothing', () => {
    expect(run(['b', 'c', 'd', 'e'], 'b')).toBeUndefined()
    expect(run(['c', 'd', 'e', 'b'], 'b')).toBeUndefined()
  })

  it('a slot inside the row own run is a pure reorder', () => {
    expect(run(['c', 'e', 'd'], 'e')).toBeUndefined()
  })

  it('the no-value tail is a run like any other - entering it clears', () => {
    expect(run(['c', 'd', 'f', 'a', 'g'], 'a')).toBe(UNGROUPED)
  })

  it('a run of one can never be entered - it has no interior slot', () => {
    expect(run(['a', 'b', 'lone', 'f', 'g'], 'b')).toBeUndefined()
    expect(run(['a', 'lone', 'b', 'f', 'g'], 'b')).toBeUndefined()
  })
})
