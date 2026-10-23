import { describe, expect, it } from 'vitest'
import { massPickCommits, massSelected } from './massAssign'

const OPTIONS = ['opt_a', 'opt_b', 'opt_c']

describe('massSelected', () => {
  it('checks only unanimous values', () => {
    expect(massSelected(OPTIONS, [['opt_a', 'opt_b'], ['opt_a'], ['opt_a', 'opt_c']])).toEqual([
      'opt_a',
    ])
  })
  it('mixed single-value rows check nothing', () => {
    expect(massSelected(OPTIONS, [['opt_a'], ['opt_b']])).toEqual([])
  })
})

describe('massPickCommits', () => {
  it('multi: completes the set on every row missing the value, preserving other values', () => {
    const rows = [['opt_a'], ['opt_b', 'opt_x'], []]
    expect(massPickCommits(rows, 'opt_b', 'multiSelect')).toEqual([
      { index: 0, next: { kind: 'multiSelect', value: ['opt_a', 'opt_b'] } },
      { index: 2, next: { kind: 'multiSelect', value: ['opt_b'] } },
    ])
  })
  it('multi: a unanimous value strips from every holder', () => {
    const rows = [
      ['a', 'b'],
      ['b', 'c'],
    ]
    expect(massPickCommits(rows, 'b', 'context')).toEqual([
      { index: 0, next: { kind: 'context', value: ['a'] } },
      { index: 1, next: { kind: 'context', value: ['c'] } },
    ])
  })
  it('single: overwrites every row not already holding the value', () => {
    const rows = [['opt_a'], ['opt_b'], []]
    expect(massPickCommits(rows, 'opt_a', 'select')).toEqual([
      { index: 1, next: { kind: 'select', value: 'opt_a' } },
      { index: 2, next: { kind: 'select', value: 'opt_a' } },
    ])
  })
  it('single: a unanimous re-pick clears the value everywhere', () => {
    expect(massPickCommits([['opt_a'], ['opt_a']], 'opt_a', 'select')).toEqual([
      { index: 0, next: null },
      { index: 1, next: null },
    ])
  })
})
