import { afterEach, describe, expect, it } from 'vitest'
import { setCmdModifier } from '@pommora/uix/Interactions/chords'
import {
  chordOf,
  COMMAND_IDS,
  DEFAULT_COMMANDS,
  type KeyPress,
  matchesCommand,
  toAccelerator,
  toKeyBinding,
} from './commands'

const key = (k: string, mods: Partial<KeyPress> = {}): KeyPress => ({
  key: k,
  code: '',
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...mods,
})

describe('the chord table', () => {
  it('writes an Electron accelerator for every shape', () => {
    expect(toAccelerator('cmd+n')).toBe('CmdOrCtrl+N')
    expect(toAccelerator('cmd+shift+n')).toBe('CmdOrCtrl+Shift+N')
    expect(toAccelerator('cmd+\\')).toBe('CmdOrCtrl+\\')
    expect(toAccelerator('cmd+plus')).toBe('CmdOrCtrl+Plus')
    expect(toAccelerator('cmd+=')).toBe('CmdOrCtrl+=')
    expect(toAccelerator('cmd+-')).toBe('CmdOrCtrl+-')
    expect(toAccelerator('cmd+0')).toBe('CmdOrCtrl+0')
    expect(toAccelerator('ctrl+shift+tab')).toBe('Ctrl+Shift+Tab')
    expect(toAccelerator('alt+f')).toBe('Alt+F')
  })

  it('writes a CodeMirror key binding for every shape', () => {
    expect(toKeyBinding('cmd+b')).toBe('Mod-b')
    expect(toKeyBinding('cmd+shift+x')).toBe('Mod-Shift-x')
    expect(toKeyBinding('alt+shift+k')).toBe('Alt-Shift-k')
  })

  it('spells each formatting chord the way both sides read it', () => {
    const spellings = COMMAND_IDS.filter((id) => id.startsWith('format:')).map((id) => [
      id,
      toAccelerator(DEFAULT_COMMANDS[id]),
      toKeyBinding(DEFAULT_COMMANDS[id]),
    ])
    expect(spellings).toEqual([
      ['format:bold', 'CmdOrCtrl+B', 'Mod-b'],
      ['format:italic', 'CmdOrCtrl+I', 'Mod-i'],
      ['format:strikethrough', 'CmdOrCtrl+Shift+X', 'Mod-Shift-x'],
      ['format:highlight', 'CmdOrCtrl+L', 'Mod-l'],
      ['format:inlineCode', 'CmdOrCtrl+E', 'Mod-e'],
      ['format:link', 'CmdOrCtrl+K', 'Mod-k'],
      ['format:connection', 'CmdOrCtrl+Shift+K', 'Mod-Shift-k'],
    ])
  })

  it('gives no two ids the same chord', () => {
    const chords = COMMAND_IDS.map((id) => DEFAULT_COMMANDS[id])
    expect(new Set(chords).size).toBe(chords.length)
  })
})

describe('the key vocabulary', () => {
  it('spells named keys the way each reader names them', () => {
    expect(toAccelerator('cmd+arrowup')).toBe('CmdOrCtrl+Up')
    expect(toKeyBinding('cmd+arrowup')).toBe('Mod-ArrowUp')
    expect(toAccelerator('shift+escape')).toBe('Shift+Esc')
    expect(toKeyBinding('shift+escape')).toBe('Shift-Escape')
    expect(toAccelerator('alt+space')).toBe('Alt+Space')
    expect(toKeyBinding('ctrl+tab')).toBe('Ctrl-Tab')
    expect(toKeyBinding('cmd+plus')).toBe('Mod-+')
  })

  it('reads a literal plus as the plus key, and refuses names outside the vocabulary', () => {
    expect(chordOf('cmd++')?.key).toBe('plus')
    expect(chordOf('cmd+uparrow')).toBeNull()
    expect(chordOf('cmd+shift')).toBeNull()
    expect(chordOf('cmd+')).toBeNull()
  })
})

describe('matchesCommand', () => {
  afterEach(() => setCmdModifier(false))

  it('matches cmd+e exactly', () => {
    expect(matchesCommand('cmd+e', key('e', { metaKey: true }))).toBe(true)
    expect(matchesCommand('cmd+e', key('E', { metaKey: true }))).toBe(true)
  })

  it('rejects a wrong or extra modifier', () => {
    expect(matchesCommand('cmd+e', key('e', { ctrlKey: true }))).toBe(false)
    expect(matchesCommand('cmd+e', key('e', { metaKey: true, shiftKey: true }))).toBe(false)
    expect(matchesCommand('cmd+e', key('e'))).toBe(false)
  })

  it('matches multi-modifier specs case-insensitively', () => {
    expect(matchesCommand('Cmd+Shift+K', key('k', { metaKey: true, shiftKey: true }))).toBe(true)
  })

  it('an absent, empty, or keyless spec never matches', () => {
    expect(matchesCommand(undefined, key('e', { metaKey: true }))).toBe(false)
    expect(matchesCommand('', key('e', { metaKey: true }))).toBe(false)
    expect(matchesCommand('+++', key('e', { metaKey: true }))).toBe(false)
  })

  it('answers a repeated spec the same way every time', () => {
    for (let i = 0; i < 3; i++) {
      expect(matchesCommand('cmd+shift+v', key('v', { metaKey: true, shiftKey: true }))).toBe(true)
      expect(matchesCommand('cmd+shift+v', key('v', { metaKey: true }))).toBe(false)
    }
  })

  it('matches named keys by their browser names', () => {
    expect(matchesCommand('cmd+arrowup', key('ArrowUp', { metaKey: true }))).toBe(true)
    expect(matchesCommand('alt+space', key(' ', { altKey: true }))).toBe(true)
    expect(matchesCommand('cmd+plus', key('+', { metaKey: true, shiftKey: true }))).toBe(true)
    expect(matchesCommand('cmd+1', key('!', { metaKey: true, shiftKey: true }))).toBe(false)
  })

  it('reads an Option chord from the physical key, and only then', () => {
    expect(matchesCommand('alt+f', key('ƒ', { code: 'KeyF', altKey: true }))).toBe(true)
    expect(matchesCommand('cmd+a', key('q', { code: 'KeyA', metaKey: true }))).toBe(false)
    expect(
      matchesCommand('alt+1', key('⁄', { code: 'Digit1', altKey: true, shiftKey: true })),
    ).toBe(false)
    expect(matchesCommand('alt+q', key('a', { code: 'KeyQ', altKey: true }))).toBe(false)
    expect(
      matchesCommand('cmd+alt+q', key('@', { code: 'KeyQ', ctrlKey: true, altKey: true })),
    ).toBe(false)
  })

  it('resolves a cmd+ spec to Control on Windows and stays exact', () => {
    setCmdModifier(true)
    expect(matchesCommand('cmd+k', key('k', { ctrlKey: true }))).toBe(true)
    expect(matchesCommand('cmd+k', key('k', { metaKey: true }))).toBe(false)
    expect(matchesCommand('cmd+k', key('k', { ctrlKey: true, metaKey: true }))).toBe(false)
  })

  it('keeps a ctrl+ spec on the physical Control key across platforms', () => {
    expect(matchesCommand('ctrl+tab', key('Tab', { ctrlKey: true }))).toBe(true)
    setCmdModifier(true)
    expect(matchesCommand('ctrl+tab', key('Tab', { ctrlKey: true }))).toBe(true)
    expect(matchesCommand('ctrl+tab', key('Tab', { metaKey: true }))).toBe(false)
  })
})
