import { describe, expect, it } from 'vitest'
import { EditorState, type TransactionSpec } from '@codemirror/state'
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

describe('the picker’s query as editor state', () => {
  it('answers a typed query and keeps its object across a selection that changes nothing', () => {
    const { field, state } = stateOf('[[Pr', 4)
    const typed = state.update({
      changes: { from: 4, insert: 'o' },
      selection: { anchor: 5 },
      userEvent: 'input.type',
    }).state
    const q = typed.field(field).query
    expect(q).toMatchObject({ query: 'Pro', form: 'link', closed: false })
    expect(typed.update({ selection: { anchor: 5 } }).state.field(field).query).toBe(q)
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
    const moved = again.update({
      changes: { from: 5, insert: 'j' },
      selection: { anchor: 6 },
      userEvent: 'input.type',
    }).state
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

describe('the link the picker opened on', () => {
  const typed = (state: EditorState, at: number, text: string) =>
    state.update({
      changes: { from: at, insert: text },
      selection: { anchor: at + text.length },
      userEvent: 'input.type',
    }).state

  it('keeps the text it first read while the query continues', () => {
    const { field, state } = stateOf('[x](', 4)
    const opened = typed(state, 4, 'A')
    expect(opened.field(field).origin?.text).toBe('[x](A)')
    expect(typed(opened, 5, 'l').field(field).origin?.text).toBe('[x](A)')
  })

  it('reads a closed link the caret is placed in, and keeps it through a retype', () => {
    const { field, state } = stateOf('[Mine](Old) x', 0)
    const placed = state.update({ selection: { anchor: 10 } }).state
    expect(placed.field(field).origin?.text).toBe('[Mine](Old)')
    const retyped = placed.update({
      changes: { from: 7, to: 10, insert: 'Gam' },
      selection: { anchor: 10 },
      userEvent: 'input.type',
    }).state
    expect(retyped.field(field).query).toMatchObject({ query: 'Gam' })
    expect(retyped.field(field).origin?.text).toBe('[Mine](Old)')
  })

  it('a query at another link replaces it', () => {
    const { field, state } = stateOf('[[Old|Mine]] [[New]]', 4)
    const first = state.update({ selection: { anchor: 3 } }).state
    expect(first.field(field).origin?.text).toBe('[[Old|Mine]]')
    expect(first.update({ selection: { anchor: 16 } }).state.field(field).origin?.text).toBe(
      '[[New]]',
    )
  })

  it('a heading slot opened and backed out of is the same link', () => {
    const { field, state } = stateOf('[x]()', 0)
    const placed = state.update({ selection: { anchor: 4 } }).state
    expect(placed.field(field).origin?.text).toBe('[x]()')
    const sliding = placed.update({
      changes: { from: 4, insert: 'Alpha#' },
      selection: { anchor: 10 },
      userEvent: 'input',
    }).state
    expect(sliding.field(field).query).toMatchObject({ form: 'fragment' })
    const back = sliding.update({
      changes: { from: 9, to: 10 },
      selection: { anchor: 9 },
      userEvent: 'delete',
    }).state
    expect(back.field(field).query).toMatchObject({ form: 'target', query: 'Alpha' })
    expect(back.field(field).origin?.text).toBe('[x]()')
  })

  it('keeps the link through a selection inside it and the text typed over that, until the caret leaves', () => {
    const { field, state } = stateOf('[[Old|Mine]] x', 0)
    const placed = state.update({ selection: { anchor: 4 } }).state
    const selected = placed.update({ selection: { anchor: 2, head: 5 } }).state
    expect(selected.field(field).query).toBeNull()
    const retyped = selected.update({
      changes: { from: 2, to: 5, insert: 'G' },
      selection: { anchor: 3 },
      userEvent: 'input.type',
    }).state
    expect(retyped.field(field).query).toMatchObject({ query: 'G' })
    expect(retyped.field(field).origin?.text).toBe('[[Old|Mine]]')
    const left = retyped.update({ selection: { anchor: retyped.doc.length } }).state
    expect(left.field(field).origin).toBeNull()
  })
})

describe('the § arm', () => {
  const automatic = { inPageHeadingResolution: 'automatic' as const }
  const type = (state: EditorState, spec: TransactionSpec) =>
    state.update({ userEvent: 'input.type', ...spec }).state

  it('a typed § arms at its position, maps through an insert before it, and lapses off its line', () => {
    const { field, state } = stateOf('see \nnext', 4, automatic)
    const armed = type(state, { changes: { from: 4, insert: '§' }, selection: { anchor: 5 } })
    expect(armed.field(field).armed).toBe(4)
    const shifted = type(armed, { changes: { from: 0, insert: 'I ' }, selection: { anchor: 7 } })
    expect(shifted.field(field).armed).toBe(6)
    expect(
      shifted.update({ selection: { anchor: shifted.doc.length } }).state.field(field).armed,
    ).toBeNull()
  })

  it('a deleted § disarms, so the text typed after it opens nothing', () => {
    const { field, state } = stateOf('see ', 4, automatic)
    const armed = type(state, { changes: { from: 4, insert: '§' }, selection: { anchor: 5 } })
    const deleted = armed.update({
      changes: { from: 4, to: 5 },
      selection: { anchor: 4 },
      userEvent: 'delete.backward',
    }).state
    const after = type(deleted, { changes: { from: 4, insert: 'x' }, selection: { anchor: 5 } })
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
    expect(converted.field(field).query).toMatchObject({ form: 'section', query: '' })
  })
})

describe('the raw-HTML stand-down', () => {
  it('answers nothing inside a raw HTML block on a page that draws one', () => {
    const doc = '<div>\n[[Pr\n</div>'
    const typedIn = (settings: Partial<EditorSettings>) => {
      const { field, state } = stateOf(doc, 10, settings)
      return state
        .update({
          changes: { from: 10, insert: 'o' },
          selection: { anchor: 11 },
          userEvent: 'input.type',
        })
        .state.field(field).query
    }
    expect(typedIn({ htmlFormatting: true })).toBeNull()
    expect(typedIn({ htmlFormatting: false })).toMatchObject({ query: 'Pro' })
  })
})
