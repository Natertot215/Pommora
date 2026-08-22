import { describe, expect, it } from 'vitest'
import { acceleratorFor, FORMAT_CHORDS, type FormatChordAction, keyBindingFor } from './editorMenu'

describe('the formatting chords', () => {
  it('spells each chord the way both sides read it', () => {
    const spellings = (Object.keys(FORMAT_CHORDS) as FormatChordAction[]).map((a) => [
      a,
      acceleratorFor(a),
      keyBindingFor(a),
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

  it('gives no two actions the same chord', () => {
    const bindings = (Object.keys(FORMAT_CHORDS) as FormatChordAction[]).map(keyBindingFor)
    expect(new Set(bindings).size).toBe(bindings.length)
  })
})
