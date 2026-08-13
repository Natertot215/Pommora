import { describe, expect, it } from 'vitest'
import { EditorState } from '@codemirror/state'
import { linkRest, restedOnLink } from './linkRest'

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
