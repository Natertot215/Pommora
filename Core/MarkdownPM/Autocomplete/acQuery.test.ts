import { describe, expect, it } from 'vitest'
import { Compartment, EditorState } from '@codemirror/state'
import { editorHost, type EditorSettings } from '../api'
import { testHost } from '../../Testing/editorHarness'
import { surfaceScope } from '../docCache'
import { acQuery, closeAcQuery } from './acQuery'

const stateOf = (
  doc: string,
  caret: number,
  settings: Partial<EditorSettings> = {},
  scope: 'page' | 'lists' = 'page',
) =>
  EditorState.create({
    doc,
    selection: { anchor: caret },
    extensions: [surfaceScope.of(scope), acQuery, editorHost.of(testHost({ settings }))],
  })

const typed = (state: EditorState, at: number, text: string) =>
  state.update({
    changes: { from: at, insert: text },
    selection: { anchor: at + text.length },
    userEvent: 'input.type',
  }).state

describe('the picker’s query as editor state', () => {
  it('answers a typed query and keeps its object across a selection that changes nothing', () => {
    const state = stateOf('[[Pr', 4)
    const next = typed(state, 4, 'o')
    const q = next.field(acQuery).query
    expect(q).toMatchObject({ query: 'Pro', syntax: 'wiki', part: 'title', closed: false })
    expect(next.update({ selection: { anchor: 5 } }).state.field(acQuery).query).toBe(q)
  })

  it('keeps its query object as the caret moves within the link', () => {
    const state = stateOf('[[Alpha]] x', 0)
    let moved = state.update({ selection: { anchor: 4 } }).state
    const q = moved.field(acQuery).query
    expect(q).toMatchObject({ query: 'Alpha' })
    for (const anchor of [5, 6, 5]) {
      moved = moved.update({ selection: { anchor } }).state
      expect(moved.field(acQuery).query).toBe(q)
    }
  })

  it('stays dismissed under the query it closed on until the query changes', () => {
    const state = stateOf('[[Pro]] x', 4)
    const opened = state.update({ selection: { anchor: 5 } }).state
    expect(opened.field(acQuery).query).not.toBeNull()
    const closed = opened.update({ effects: closeAcQuery.of('dismiss') }).state
    expect(closed.field(acQuery).query).toBeNull()
    const again = closed.update({ selection: { anchor: 4 } }).state
    expect(again.field(acQuery).query).toBeNull()
    const moved = typed(again, 5, 'j')
    expect(moved.field(acQuery).query).toMatchObject({ query: 'Proj' })
  })

  it('arms on a caret already seated when a tile flips out of read-only, and clears flipping back', () => {
    const gate = new Compartment()
    const seated = EditorState.create({
      doc: '[[Zeta]] x',
      extensions: [acQuery, editorHost.of(testHost()), gate.of(EditorState.readOnly.of(true))],
    }).update({ selection: { anchor: 6 } }).state
    expect(seated.field(acQuery).query).toBeNull()
    const live = seated.update({ effects: gate.reconfigure(EditorState.readOnly.of(false)) }).state
    expect(live.field(acQuery).query).toMatchObject({ query: 'Zeta' })
    const back = live.update({ effects: gate.reconfigure(EditorState.readOnly.of(true)) }).state
    expect(back.field(acQuery).query).toBeNull()
  })

  it('a blur closes without remembering the query', () => {
    const state = stateOf('[[Pro]] x', 4)
    const opened = state.update({ selection: { anchor: 5 } }).state
    const blurred = opened.update({ effects: closeAcQuery.of('blur') }).state
    expect(blurred.field(acQuery).query).toBeNull()
    expect(blurred.update({ selection: { anchor: 5 } }).state.field(acQuery).query).not.toBeNull()
  })
})

describe('the § arm', () => {
  const automatic = { inPageHeadingResolution: 'automatic' as const }

  it('a typed § arms at its position, maps through an insert before it, and lapses off its line', () => {
    const state = stateOf('see \nnext', 4, automatic)
    const armed = typed(state, 4, '§')
    expect(armed.field(acQuery).armed).toBe(4)
    const shifted = typed(armed, 0, 'I ')
    expect(shifted.field(acQuery).armed).toBe(6)
    expect(
      shifted.update({ selection: { anchor: shifted.doc.length } }).state.field(acQuery).armed,
    ).toBeNull()
  })

  it('a deleted § disarms, so the text typed after it opens nothing', () => {
    const state = stateOf('see ', 4, automatic)
    const armed = typed(state, 4, '§')
    const deleted = armed.update({
      changes: { from: 4, to: 5 },
      selection: { anchor: 4 },
      userEvent: 'delete.backward',
    }).state
    const after = typed(deleted, 4, 'x')
    expect(after.field(acQuery).armed).toBeNull()
    expect(after.field(acQuery).query).toBeNull()
  })

  it('a ## converted to § arms the heading list', () => {
    const state = stateOf('see #', 5, automatic)
    const converted = state.update({
      changes: { from: 4, to: 5, insert: '§' },
      selection: { anchor: 5 },
      userEvent: 'input',
    }).state
    expect(converted.field(acQuery).armed).toBe(4)
    expect(converted.field(acQuery).query).toMatchObject({
      syntax: 'prose',
      part: 'heading',
      query: '',
    })
  })
})

describe('the raw-HTML stand-down', () => {
  it('answers nothing inside a raw HTML block on a page that draws one', () => {
    const doc = '<div>\n[[Pr\n</div>'
    const typedIn = (settings: Partial<EditorSettings>) => {
      const state = stateOf(doc, 10, settings)
      return typed(state, 10, 'o').field(acQuery).query
    }
    expect(typedIn({ htmlFormatting: true })).toBeNull()
    expect(typedIn({ htmlFormatting: false })).toMatchObject({ query: 'Pro' })
  })
})
