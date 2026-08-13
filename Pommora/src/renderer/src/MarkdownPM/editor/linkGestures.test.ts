import { describe, expect, it } from 'vitest'
import { EditorState } from '@codemirror/state'
import { linkRest, linkTyping, restedOnLink } from './linkGestures'

// Finishing a link leaves the caret on its closer and the link rendered. Clicking that same spot is
// aiming at the syntax and must reveal it — so what the decoration reads is not where the caret is
// but whether the gesture that put it there was a finishing one.
const seed = (): EditorState => EditorState.create({ doc: 'a [[Alpha]] b', extensions: [linkRest] })

describe('a link rests only where a gesture left it', () => {
  it('records the position the finishing transaction reports', () => {
    const s = seed().update({ effects: restedOnLink.of(11) }).state
    expect(s.field(linkRest)).toBe(11)
  })

  it('starts at nothing, so nothing rests by default', () => {
    expect(seed().field(linkRest)).toBeNull()
  })

  it('a later selection change ends it — this is the click case', () => {
    const rested = seed().update({ effects: restedOnLink.of(11) }).state
    expect(rested.update({ selection: { anchor: 11 } }).state.field(linkRest)).toBeNull()
  })

  it('and so does an edit', () => {
    const rested = seed().update({ effects: restedOnLink.of(11) }).state
    expect(rested.update({ changes: { from: 0, insert: 'x' } }).state.field(linkRest)).toBeNull()
  })

  // The finishing transaction carries its own selection and changes; the effect has to survive them.
  it('survives the very transaction that sets it', () => {
    const s = seed().update({
      changes: { from: 2, to: 11, insert: '[[Beta]]' },
      selection: { anchor: 10 },
      effects: restedOnLink.of(10),
    }).state
    expect(s.field(linkRest)).toBe(10)
  })
})

// A connection takes the connection colour as it is written. Clicking into one that names no page is
// inspecting an unresolved link, and it should look unresolved — so the field follows the typing,
// not the caret.
describe('a connection is only "being typed" while it is being typed', () => {
  const state = (doc: string): EditorState =>
    EditorState.create({ doc, extensions: [linkTyping] })

  it('an edit landing inside a link marks that link', () => {
    const s = state('a [[Alph]] b')
    const next = s.update({ changes: { from: 8, insert: 'a' }, selection: { anchor: 9 } }).state
    expect(next.field(linkTyping)).toBe(2)
  })

  it('an edit outside one marks nothing', () => {
    const s = state('a [[Alpha]] b')
    expect(s.update({ changes: { from: 0, insert: 'x' } }).state.field(linkTyping)).toBeNull()
  })

  // The click case: moving into a link without editing it must not light it up.
  it('a bare caret move ends it, so clicking into a link marks nothing', () => {
    const s = state('a [[Alph]] b')
    const typed = s.update({ changes: { from: 8, insert: 'a' }, selection: { anchor: 9 } }).state
    expect(typed.update({ selection: { anchor: 6 } }).state.field(linkTyping)).toBeNull()
  })

  it('and typing on somewhere else moves the mark off the first link', () => {
    const s = state('[[A]] [[B]] x')
    const next = s.update({ changes: { from: 12, insert: 'y' }, selection: { anchor: 13 } }).state
    expect(next.field(linkTyping)).toBeNull()
  })
})
