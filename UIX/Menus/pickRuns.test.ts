import { describe, expect, it } from 'vitest'
import { pickRuns } from './pickRuns'

describe('pickRuns', () => {
  it('leaves an unpicked row without a run and a lone pick solo', () => {
    expect(pickRuns([false, true, false])).toEqual([undefined, 'solo', undefined])
  })

  it('joins adjacent picks into first, middle, and last', () => {
    expect(pickRuns([true, true, true, false, true, true])).toEqual([
      'first',
      'middle',
      'last',
      undefined,
      'first',
      'last',
    ])
  })

  it('ends a run at a row marked to end it', () => {
    expect(pickRuns([true, true, true, true], [true, false, false, false])).toEqual([
      'solo',
      'first',
      'middle',
      'last',
    ])
  })
})
