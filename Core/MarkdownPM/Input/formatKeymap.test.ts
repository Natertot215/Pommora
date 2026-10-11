// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { Compartment, EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { DEFAULT_COMMANDS, toKeyBinding } from '../../Actions/commands'
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

  it('claims its chord on a fenced line, where the edit stands down, so the default binding underneath never runs', () => {
    const doc = '```\nsite\n```'
    const view = new EditorView({
      state: EditorState.create({
        doc,
        selection: { anchor: 5 },
        extensions: formatKeymap(DEFAULT_COMMANDS),
      }),
    })
    const key = toKeyBinding(DEFAULT_COMMANDS['format:connection'])
    const run = view.state
      .facet(keymap)
      .flat()
      .find((b) => b.key === key)?.run
    expect(run?.(view)).toBe(true)
    expect(view.state.doc.toString()).toBe(doc)
    view.destroy()
  })
})
