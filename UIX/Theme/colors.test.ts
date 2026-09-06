import { describe, expect, it } from 'vitest'
import { mixAt, tintAt } from './colors'

describe('mixAt', () => {
  it('mixes toward an arbitrary color, not just transparent', () => {
    expect(mixAt('#FFF', 40, '#000')).toBe('color-mix(in srgb, #FFF 40%, #000)')
  })

  it('honors the oklch space', () => {
    expect(mixAt('#FFF', 25, '#000', 'oklch')).toBe('color-mix(in oklch, #FFF 25%, #000)')
  })

  it('returns the bare base at a full-strength amount', () => {
    expect(mixAt('#FFF', 100, '#000')).toBe('#FFF')
  })

  it('routes a named step through its var, so the ladder stays live', () => {
    expect(tintAt('#FFF', 'primary')).toBe(
      'color-mix(in srgb, #FFF var(--tint-primary), transparent)',
    )
  })
})
