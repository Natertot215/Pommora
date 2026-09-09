import { describe, expect, it } from 'vitest'
import { Compartment, EditorState } from '@codemirror/state'
import { keymap } from '@codemirror/view'
import { DEFAULT_COMMANDS, toKeyBinding } from '@pommora/core/Actions/commands'
import { FORMAT_ACTIONS, formatKeymap } from './formatKeymap'

const boundKeys = (state: EditorState): (string | undefined)[] =>
  state
    .facet(keymap)
    .flat()
    .map((b) => b.key)

describe('the format keymap', () => {
  it('binds the key the table spells for every formatting id', () => {
    const state = EditorState.create({ extensions: formatKeymap(DEFAULT_COMMANDS) })
    expect(boundKeys(state)).toEqual(
      FORMAT_ACTIONS.map((action) => toKeyBinding(DEFAULT_COMMANDS[action])),
    )
  })

  it('rebinds through a compartment reconfigure', () => {
    const gate = new Compartment()
    const state = EditorState.create({ extensions: gate.of(formatKeymap(DEFAULT_COMMANDS)) })
    expect(boundKeys(state)).toContain('Mod-b')

    const rebound = state.update({
      effects: gate.reconfigure(
        formatKeymap({ ...DEFAULT_COMMANDS, 'format:bold': 'cmd+shift+b' }),
      ),
    }).state
    expect(boundKeys(rebound)).toContain('Mod-Shift-b')
    expect(boundKeys(rebound)).not.toContain('Mod-b')
  })
})
