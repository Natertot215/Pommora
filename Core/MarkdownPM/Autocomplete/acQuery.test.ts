import { describe, expect, it } from 'vitest'
import { EditorState } from '@codemirror/state'
import { editorHost, type EditorSettings } from '../api'
import { testHost } from '../../Testing/editorHarness'
import { acQuery, closeAcQuery } from './acQuery'

const stateOf = (
  doc: string,
  caret: number,
  settings: Partial<EditorSettings> = {},
  scope: 'page' | 'cell' = 'page',
) => {
  const field = acQuery(scope)
  const state = EditorState.create({
    doc,
    selection: { anchor: caret },
    extensions: [field, editorHost.of(testHost({ settings }))],
  })
  return { field, state }
}

const typed = (state: EditorState, at: number, text: string) =>
  state.update({
    changes: { from: at, insert: text },
    selection: { anchor: at + text.length },
    userEvent: 'input.type',
  }).state

describe('the picker’s query as editor state', () => {
  it('answers a typed query and keeps its object across a selection that changes nothing', () => {
    const { field, state } = stateOf('[[Pr', 4)
    const next = typed(state, 4, 'o')
    const q = next.field(field).query
    expect(q).toMatchObject({ query: 'Pro', syntax: 'wiki', part: 'title', closed: false })
    expect(next.update({ selection: { anchor: 5 } }).state.field(field).query).toBe(q)
  })

  it('keeps its query object as the caret moves within the link', () => {
    const { field, state } = stateOf('[[Alpha]] x', 0)
    let moved = state.update({ selection: { anchor: 4 } }).state
    const q = moved.field(field).query
    expect(q).toMatchObject({ query: 'Alpha' })
    for (const anchor of [5, 6, 5]) {
      moved = moved.update({ selection: { anchor } }).state
      expect(moved.field(field).query).toBe(q)
    }
  })

  it('stays dismissed under the query it closed on until the query changes', () => {
    const { field, state } = stateOf('[[Pro]] x', 4)
    const opened = state.update({ selection: { anchor: 5 } }).state
    expect(opened.field(field).query).not.toBeNull()
    const closed = opened.update({ effects: closeAcQuery.of('dismiss') }).state
    expect(closed.field(field).query).toBeNull()
    const again = closed.update({ selection: { anchor: 4 } }).state
    expect(again.field(field).query).toBeNull()
    const moved = typed(again, 5, 'j')
    expect(moved.field(field).query).toMatchObject({ query: 'Proj' })
  })

  it('a blur closes without remembering the query', () => {
    const { field, state } = stateOf('[[Pro]] x', 4)
    const opened = state.update({ selection: { anchor: 5 } }).state
    const blurred = opened.update({ effects: closeAcQuery.of('blur') }).state
    expect(blurred.field(field).query).toBeNull()
    expect(blurred.update({ selection: { anchor: 5 } }).state.field(field).query).not.toBeNull()
  })
})

describe('the § arm', () => {
  const automatic = { inPageHeadingResolution: 'automatic' as const }

  it('a typed § arms at its position, maps through an insert before it, and lapses off its line', () => {
    const { field, state } = stateOf('see \nnext', 4, automatic)
    const armed = typed(state, 4, '§')
    expect(armed.field(field).armed).toBe(4)
    const shifted = typed(armed, 0, 'I ')
    expect(shifted.field(field).armed).toBe(6)
    expect(
      shifted.update({ selection: { anchor: shifted.doc.length } }).state.field(field).armed,
    ).toBeNull()
  })

  it('a deleted § disarms, so the text typed after it opens nothing', () => {
    const { field, state } = stateOf('see ', 4, automatic)
    const armed = typed(state, 4, '§')
    const deleted = armed.update({
      changes: { from: 4, to: 5 },
      selection: { anchor: 4 },
      userEvent: 'delete.backward',
    }).state
    const after = typed(deleted, 4, 'x')
    expect(after.field(field).armed).toBeNull()
    expect(after.field(field).query).toBeNull()
  })

  it('a ## converted to § arms the heading list', () => {
    const { field, state } = stateOf('see #', 5, automatic)
    const converted = state.update({
      changes: { from: 4, to: 5, insert: '§' },
      selection: { anchor: 5 },
      userEvent: 'input',
    }).state
    expect(converted.field(field).armed).toBe(4)
    expect(converted.field(field).query).toMatchObject({
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
      const { field, state } = stateOf(doc, 10, settings)
      return typed(state, 10, 'o').field(field).query
    }
    expect(typedIn({ htmlFormatting: true })).toBeNull()
    expect(typedIn({ htmlFormatting: false })).toMatchObject({ query: 'Pro' })
  })
})
