import { describe, it, expect } from 'vitest'
import { coerceOpenIn, coerceViewButton } from './schemas'

describe('open_in coercion', () => {
  it('passes valid values through and drops junk / absent', () => {
    expect(coerceOpenIn('full-page')).toBe('full-page')
    expect(coerceOpenIn('page-preview')).toBe('page-preview')
    expect(coerceOpenIn('nonsense')).toBeUndefined()
    expect(coerceOpenIn(undefined)).toBeUndefined()
  })
})

describe('view_button coercion', () => {
  it('accepts valid values, drops junk', () => {
    expect(coerceViewButton('labeled')).toBe('labeled')
    expect(coerceViewButton('nope')).toBeUndefined()
  })
})
