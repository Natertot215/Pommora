import { describe, expect, it } from 'vitest'
import { EditorState } from '@codemirror/state'
import { scanDoc } from '../Engine/docScan'
import { blockQuery, blockQueryAt, closeBlockQuery } from './blockQuery'

const at = (text: string, caret = text.length) => blockQueryAt(scanDoc(text), caret)

describe('the block menu opens on a line holding nothing but the slash', () => {
  it('takes a bare slash with the caret behind it', () => {
    expect(at('/')).toEqual({ query: '', from: 0, to: 1 })
  })

  it('carries what follows the slash as the query', () => {
    expect(at('/hea')).toEqual({ query: 'hea', from: 0, to: 4 })
  })

  it('reads the caret line, not the document, when more lines follow', () => {
    expect(at('/\nsecond', 1)).toEqual({ query: '', from: 0, to: 1 })
  })
})

describe('the block menu refuses a line the slash does not own', () => {
  it('refuses a query holding a space', () => {
    expect(at('/he a')).toBeNull()
  })

  it('refuses a slash with text before it', () => {
    expect(at('a/')).toBeNull()
  })

  it('refuses an indented slash', () => {
    expect(at(' /')).toBeNull()
  })

  it('refuses a slash behind a quote marker', () => {
    expect(at('> /')).toBeNull()
  })

  it('refuses a slash behind a list marker', () => {
    expect(at('- /')).toBeNull()
  })

  it('refuses a caret resting short of the line end', () => {
    expect(at('/hea', 2)).toBeNull()
  })
})

describe('the block menu refuses the constructs a lone-line insert refuses', () => {
  it('refuses a line inside a closed fence', () => {
    expect(at('```\n/\n```', 5)).toBeNull()
  })

  it('refuses a line inside a code block', () => {
    expect(at('```\n/\n```', 5)).toBeNull()
  })

  it('refuses a line inside a math block', () => {
    expect(at('$$\n/\n$$', 4)).toBeNull()
  })

  it('refuses a line inside the citations run', () => {
    expect(at('body\n\n[^1]: note\n/')).toBeNull()
  })
})

describe('the open query follows typing, not the caret', () => {
  const state = EditorState.create({ doc: 'a\n', extensions: blockQuery })
  const typed = state.update({
    changes: { from: 2, insert: '/he' },
    selection: { anchor: 5 },
    userEvent: 'input.type',
  }).state

  it('opens on the keystroke that writes the slash line', () => {
    expect(typed.field(blockQuery)).toMatchObject({ query: 'he', from: 2, to: 5 })
  })

  it('stays closed while nothing matches, and reopens when the query matches again', () => {
    const none = typed.update({
      changes: { from: 5, insert: 'zz' },
      selection: { anchor: 7 },
      userEvent: 'input.type',
    }).state
    expect(none.field(blockQuery)).toBeNull()
    const back = none.update({
      changes: { from: 5, to: 7 },
      selection: { anchor: 5 },
      userEvent: 'delete.backward',
    }).state
    expect(back.field(blockQuery)).toMatchObject({ query: 'he' })
  })

  it('closes when the caret moves, and a caret landing back at the end reopens nothing', () => {
    const away = typed.update({ selection: { anchor: 0 } }).state
    expect(away.field(blockQuery)).toBeNull()
    expect(away.update({ selection: { anchor: 5 } }).state.field(blockQuery)).toBeNull()
  })

  it('opens on nothing the person did not type, like a mirrored edit', () => {
    const mirrored = state.update({ changes: { from: 2, insert: '/he' }, selection: { anchor: 5 } })
    expect(mirrored.state.field(blockQuery)).toBeNull()
  })

  it('closes on the close effect with the caret still in place', () => {
    expect(typed.update({ effects: closeBlockQuery.of(null) }).state.field(blockQuery)).toBeNull()
  })
})
