import { describe, expect, it } from 'vitest'
import { massPickCommits, massSelected } from './massAssign'

const OPTIONS = ['a', 'b', 'c']

describe('massSelected', () => {
  it('checks only unanimous values', () => {
    expect(massSelected(OPTIONS, [['a', 'b'], ['a'], ['a', 'c']])).toEqual(['a'])
  })
  it('mixed single-value rows check nothing', () => {
    expect(massSelected(OPTIONS, [['a'], ['b']])).toEqual([])
  })
})

describe('massPickCommits', () => {
  it('multi: completes the set on every row missing the value, preserving other values', () => {
    const rows = [['a'], ['b', 'x'], []]
    expect(massPickCommits(rows, 'b', 'multiSelect')).toEqual([
      { index: 0, next: { kind: 'multiSelect', value: ['a', 'b'] } },
      { index: 2, next: { kind: 'multiSelect', value: ['b'] } },
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
    const rows = [['a'], ['b'], []]
    expect(massPickCommits(rows, 'a', 'select')).toEqual([
      { index: 1, next: { kind: 'select', value: 'a' } },
      { index: 2, next: { kind: 'select', value: 'a' } },
    ])
  })
  it('single: a unanimous re-pick clears the value everywhere', () => {
    expect(massPickCommits([['a'], ['a']], 'a', 'select')).toEqual([
      { index: 0, next: null },
      { index: 1, next: null },
    ])
  })
})
