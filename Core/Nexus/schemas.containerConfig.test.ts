import { describe, it, expect } from 'vitest'
import { coerceViewButton } from './schemas'

describe('view_button coercion', () => {
  it('accepts valid values, drops junk', () => {
    expect(coerceViewButton('labeled')).toBe('labeled')
    expect(coerceViewButton('nope')).toBeUndefined()
  })
})
