import { afterEach, describe, it, expect } from 'vitest'
import { isCmd, isSecondaryClick, matchesCommand, setCmdModifier } from './chords'

const key = (k: string, mods: Partial<KeyboardEvent> = {}): KeyboardEvent =>
  ({
    key: k,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    ...mods,
  }) as KeyboardEvent

describe('matchesCommand', () => {
  it('matches cmd+e exactly', () => {
    expect(matchesCommand('cmd+e', key('e', { metaKey: true }))).toBe(true)
    expect(matchesCommand('cmd+e', key('E', { metaKey: true }))).toBe(true)
  })
  it('rejects a wrong or extra modifier (no double-fire across overlapping bindings)', () => {
    expect(matchesCommand('cmd+e', key('e', { ctrlKey: true }))).toBe(false)
    expect(matchesCommand('cmd+e', key('e', { metaKey: true, shiftKey: true }))).toBe(false)
    expect(matchesCommand('cmd+e', key('e'))).toBe(false)
  })
  it('matches multi-modifier specs case-insensitively', () => {
    expect(matchesCommand('Cmd+Shift+K', key('k', { metaKey: true, shiftKey: true }))).toBe(true)
  })
  it('an absent or empty spec never matches', () => {
    expect(matchesCommand(undefined, key('e', { metaKey: true }))).toBe(false)
    expect(matchesCommand('', key('e', { metaKey: true }))).toBe(false)
    expect(matchesCommand('+++', key('e', { metaKey: true }))).toBe(false)
  })
  // Asked repeatedly on a keydown path, so the answer must not drift once a spec has been parsed and kept.
  it('answers a repeated spec the same way every time', () => {
    for (let i = 0; i < 3; i++) {
      expect(matchesCommand('cmd+shift+v', key('v', { metaKey: true, shiftKey: true }))).toBe(true)
      expect(matchesCommand('cmd+shift+v', key('v', { metaKey: true }))).toBe(false)
    }
  })
})

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

  it('resolves a cmd+ spec to Control on Windows and stays exact', () => {
    setCmdModifier(true)
    expect(matchesCommand('cmd+k', key('k', { ctrlKey: true }))).toBe(true)
    expect(matchesCommand('cmd+k', key('k', { metaKey: true }))).toBe(false)
    expect(matchesCommand('cmd+k', key('k', { ctrlKey: true, metaKey: true }))).toBe(false)
  })

  it('keeps a ctrl+ spec on the physical Control key across platforms', () => {
    setCmdModifier(false)
    expect(matchesCommand('ctrl+tab', key('Tab', { ctrlKey: true }))).toBe(true)
    setCmdModifier(true)
    expect(matchesCommand('ctrl+tab', key('Tab', { ctrlKey: true }))).toBe(true)
    expect(matchesCommand('ctrl+tab', key('Tab', { metaKey: true }))).toBe(false)
  })
})
