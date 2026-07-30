import { describe, it, expect } from 'vitest'
import { chipColorFor } from './colorMap'

describe('chipColorFor', () => {
  it('passes every solid key straight through', () => {
    for (const key of [
      'red',
      'orange',
      'yellow',
      'green',
      'lightBlue',
      'cyan',
      'blue',
      'purple',
      'lavender',
      'grey',
    ] as const) {
      expect(chipColorFor(key)).toBe(key)
    }
  })

  it('falls back to default for absent or non-palette names', () => {
    expect(chipColorFor(undefined)).toBe('default')
    expect(chipColorFor('chartreuse')).toBe('default')
    expect(chipColorFor('gray')).toBe('default')
    expect(chipColorFor('teal')).toBe('default')
    expect(chipColorFor('accent')).toBe('default')
  })
})
