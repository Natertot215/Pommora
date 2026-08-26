import { describe, expect, it } from 'vitest'
import { vars as colorVars } from '@renderer/DesignSystem/Tokens/color.css'
import { ANCHOR_CELLS, cellColor } from '@renderer/DesignSystem/Tokens/ramp'
import { solidColorCss } from './solidColor'

describe('solidColorCss', () => {
  it('falls back to the runtime accent when unset — the "Default" both editors label', () => {
    expect(solidColorCss(undefined)).toBe('var(--system-accent)')
  })

  it('resolves a legacy anchor name to its own solid', () => {
    expect(solidColorCss('red')).toBe(colorVars.color.solid.red)
    expect(solidColorCss('red')).toBe(cellColor(ANCHOR_CELLS.red))
  })

  // The regression this exists to catch: before the ramp, a stepped key indexed a table holding only
  // the ten solids and came back undefined — a link with no color, a checkbox with no fill.
  it('resolves a stepped cell key rather than coming back empty', () => {
    expect(solidColorCss('purple-6')).toBe(cellColor('purple-6'))
    expect(solidColorCss('purple-6')).toBeTruthy()
  })

  it('resolves grey-4 as the cell a user picked, not as the neutral fallback', () => {
    expect(solidColorCss('grey-4')).toBe(cellColor('grey-4'))
  })

  it('falls back to the neutral for a name outside the grammar', () => {
    expect(solidColorCss('chartreuse')).toBe(cellColor('grey-4'))
  })
})
