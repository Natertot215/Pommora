import { describe, expect, it } from 'vitest'
import { RAMP_FAMILIES, RAMP_STEPS, SPECTRUM } from '@shared/theme'
import { labelColorFor } from './colorMap'
import { ANCHOR_CELLS } from './ramp'

describe('labelColorFor', () => {
  it('normalizes every legacy solid name onto its anchor cell', () => {
    for (const key of Object.keys(SPECTRUM) as (keyof typeof SPECTRUM)[]) {
      expect(labelColorFor(key)).toBe(ANCHOR_CELLS[key])
    }
  })

  it('passes every cell in the grid straight through', () => {
    for (const family of RAMP_FAMILIES) {
      for (const step of RAMP_STEPS) {
        expect(labelColorFor(`${family}-${step}`)).toBe(`${family}-${step}`)
      }
    }
  })

  // grey-4 shares `default`'s VALUE but is a cell a user can deliberately pick, so it must keep its
  // own key — collapsing it would make that square unclearable in the picker.
  it('keeps grey-4 distinct from default', () => {
    expect(labelColorFor('grey-4')).toBe('grey-4')
  })

  it('falls back to default for absent or non-grammar names', () => {
    expect(labelColorFor(undefined)).toBe('default')
    expect(labelColorFor('chartreuse')).toBe('default')
    expect(labelColorFor('gray')).toBe('default')
    expect(labelColorFor('teal')).toBe('default')
    expect(labelColorFor('red-8')).toBe('default')
    expect(labelColorFor('')).toBe('default')
  })

  // The accent sentinel is produced by the two consumers that own the accent fallback; it must not
  // round-trip in from disk.
  it('refuses the accent sentinel', () => {
    expect(labelColorFor('accent')).toBe('default')
  })
})
