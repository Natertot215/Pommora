import { afterEach, describe, it, expect } from 'vitest'
import { isCmd, isSecondaryClick, setCmdModifier } from './chords'

describe('the command modifier follows the platform', () => {
  afterEach(() => setCmdModifier(false))

  it('reads Command when the command key is not Ctrl, and Control when it is', () => {
    setCmdModifier(false)
    expect(isCmd({ metaKey: true, ctrlKey: false })).toBe(true)
    expect(isCmd({ metaKey: false, ctrlKey: true })).toBe(false)
    expect(isSecondaryClick({ ctrlKey: true })).toBe(true)
    setCmdModifier(true)
    expect(isCmd({ metaKey: false, ctrlKey: true })).toBe(true)
    expect(isCmd({ metaKey: true, ctrlKey: false })).toBe(false)
    expect(isSecondaryClick({ ctrlKey: true })).toBe(false)
  })
})
