import { describe, expect, it } from 'vitest'
import { EditorState } from '@codemirror/state'
import { linkRest, linkSettled, linkWriting, restedOnLink } from './linkReveal'

// Finishing a link leaves the caret on its closer and the link rendered; clicking that same spot is aiming at the syntax and must reveal it — so what the decoration reads is the gesture, not the offset.
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

// Clicking into a connection that names no page is inspecting an unresolved link, and it should look unresolved — so the field follows the typing, not the caret.
describe('the link being written is the one an edit landed in', () => {
  const state = (doc: string): EditorState => EditorState.create({ doc, extensions: [linkWriting] })
  const edit = (
    s: EditorState,
    from: number,
    to: number,
    insert: string,
    userEvent = 'input.type',
  ): EditorState =>
    s.update({
      changes: { from, to, insert },
      selection: { anchor: from + insert.length },
      userEvent,
    }).state

  it('an edit landing inside a link arms it with how it read before', () => {
    expect(edit(state('a [[Alph]] b'), 8, 8, 'a').field(linkWriting)).toEqual({
      start: 2,
      was: '[[Alph]]',
    })
  })

  it('an edit landing in a markdown label arms it', () => {
    expect(edit(state('a [x](Alpha) b'), 4, 4, 'y').field(linkWriting)).toEqual({
      start: 2,
      was: '[x](Alpha)',
    })
  })

  it('a drop landing in a link arms it, since a drop reads as input', () => {
    expect(edit(state('a [[Alph]] b'), 8, 8, 'a', 'input.drop').field(linkWriting)?.start).toBe(2)
  })

  it('an edit outside every link, or just past a closer, arms nothing', () => {
    expect(edit(state('a [[Alpha]] b'), 0, 0, 'x').field(linkWriting)).toBeNull()
    expect(edit(state('a [[Alpha]] b'), 11, 11, 'x').field(linkWriting)).toBeNull()
  })

  it('a change no one typed arms nothing', () => {
    const s = state('a [[Alph]] b').update({ changes: { from: 8, insert: 'a' } }).state
    expect(s.field(linkWriting)).toBeNull()
  })

  it('a bare caret move keeps it, since only leaving the whole link settles it', () => {
    const typed = edit(state('a [[Alph]] b'), 8, 8, 'a')
    expect(typed.update({ selection: { anchor: 0 } }).state.field(linkWriting)?.start).toBe(2)
  })

  it('a settle clears it', () => {
    const typed = edit(state('a [[Alph]] b'), 8, 8, 'a')
    expect(typed.update({ effects: linkSettled.of(null) }).state.field(linkWriting)).toBeNull()
  })

  it('maps through an insertion before the link, baseline kept', () => {
    const typed = edit(state('a [[Alph]] b'), 8, 8, 'a')
    expect(edit(typed, 0, 0, 'xy').field(linkWriting)).toEqual({ start: 4, was: '[[Alph]]' })
  })

  it('keeps the baseline it first read while the edit continues', () => {
    const opened = edit(state('[x]()'), 4, 4, 'A')
    expect(opened.field(linkWriting)).toEqual({ start: 0, was: '' })
    expect(edit(opened, 5, 5, 'l').field(linkWriting)).toEqual({ start: 0, was: '' })
  })

  it('reads a closed link retyped over a selection, and keeps it through a second retype', () => {
    const retyped = edit(state('[Mine](Old) x'), 7, 10, 'Gam')
    expect(retyped.field(linkWriting)).toEqual({ start: 0, was: '[Mine](Old)' })
    expect(edit(retyped, 7, 10, 'Gr').field(linkWriting)?.was).toBe('[Mine](Old)')
  })

  it('an edit in another link re-arms on that link', () => {
    const first = edit(state('[[Old|Mine]] [[New]]'), 4, 4, 'x')
    expect(edit(first, 17, 17, 'y').field(linkWriting)).toEqual({ start: 14, was: '[[New]]' })
  })

  it('a heading slot opened and backed out of is the same link, its baseline what never closed', () => {
    const sliding = edit(state('[x]()'), 4, 4, 'Alpha#')
    expect(sliding.field(linkWriting)).toEqual({ start: 0, was: '' })
    const back = sliding.update({
      changes: { from: 9, to: 10 },
      selection: { anchor: 9 },
      userEvent: 'delete',
    }).state
    expect(back.field(linkWriting)).toEqual({ start: 0, was: '' })
  })
})
