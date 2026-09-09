import { describe, expect, it } from 'vitest'
import { DEFAULT_COMMANDS, type CommandId, toAccelerator, toKeyBinding } from './commands'

const ids = Object.keys(DEFAULT_COMMANDS) as CommandId[]

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
    const spellings = ids
      .filter((id) => id.startsWith('format:'))
      .map((id) => [id, toAccelerator(DEFAULT_COMMANDS[id]), toKeyBinding(DEFAULT_COMMANDS[id])])
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
    const chords = ids.map((id) => DEFAULT_COMMANDS[id])
    expect(new Set(chords).size).toBe(chords.length)
  })
})
