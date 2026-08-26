import { describe, it, expect } from 'vitest'
import { checkboxBoxStyle } from '@renderer/Properties/Editing/checkboxLook'

const base = (checked: boolean, color?: string): string | undefined =>
  (checkboxBoxStyle(checked, color) as Record<string, string>)['--label-base']

describe('checkboxBoxStyle', () => {
  it('unchecked → no base to tint from, just the label-control check color', () => {
    const s = checkboxBoxStyle(false, undefined)
    expect(base(false)).toBeUndefined()
    expect(s.color).toBe('var(--label-control)')
  })

  it('colorless checked → tints var(--accent) so it matches the switch and resolves any accent setting', () => {
    expect(base(true)).toBe('var(--accent)')
  })

  it('colored checked → tints the solid, check stays label-control', () => {
    expect(base(true, 'blue')).not.toContain('var(--accent)')
    expect(checkboxBoxStyle(true, 'blue').color).toBe('var(--label-control)')
  })
})
