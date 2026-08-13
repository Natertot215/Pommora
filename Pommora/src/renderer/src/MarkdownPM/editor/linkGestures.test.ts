import { describe, expect, it } from 'vitest'
import { EditorState } from '@codemirror/state'
import { aliasInvite, invitedAlias, linkRest, linkTyping, restedOnLink } from './linkGestures'

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

// An empty alias offers everything its page has worn, because that is the one moment with nothing
// typed to filter by. The offer belongs to having just been HANDED the slot: reaching for Add Title
// yourself, or emptying an alias, are not that.
describe('an empty alias slot only invites the picker when it was handed over', () => {
  const state = (doc: string): EditorState =>
    EditorState.create({ doc, extensions: [aliasInvite] })

  it('records the slot the commit opened', () => {
    const s = state('a [[Alpha|]] b').update({ effects: invitedAlias.of(10) }).state
    expect(s.field(aliasInvite)).toBe(10)
  })

  it('nothing is invited by default — Add Title opens a slot without one', () => {
    expect(state('a [[Alpha|]] b').field(aliasInvite)).toBeNull()
  })

  it('survives while the caret stays in the slot', () => {
    const invited = state('a [[Alpha|]] b').update({ effects: invitedAlias.of(10) }).state
    expect(invited.update({ selection: { anchor: 10 } }).state.field(aliasInvite)).toBe(10)
  })

  it('ends the moment the caret leaves it', () => {
    const invited = state('a [[Alpha|]] b').update({ effects: invitedAlias.of(10) }).state
    expect(invited.update({ selection: { anchor: 4 } }).state.field(aliasInvite)).toBeNull()
  })

  // Typing then backspacing back to empty is not a fresh invitation: you already know what you came
  // to write, so a panel over the caret is in the way.
  it('does not come back after typing and deleting to nothing', () => {
    const invited = state('a [[Alpha|]] b').update({ effects: invitedAlias.of(10) }).state
    const typed = invited.update({ changes: { from: 10, insert: 'x' }, selection: { anchor: 11 } })
      .state
    expect(typed.field(aliasInvite)).toBeNull()
    const cleared = typed.update({ changes: { from: 10, to: 11 }, selection: { anchor: 10 } }).state
    expect(cleared.field(aliasInvite)).toBeNull()
  })
})
