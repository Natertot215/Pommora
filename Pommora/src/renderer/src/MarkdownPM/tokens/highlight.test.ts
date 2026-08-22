import { describe, it, expect } from 'vitest'
import { tokenize } from './index'

/** `==highlight==` has no parser node behind it, so its grammar is the regex alone — these pin what
 *  it agrees to call a mark. */
const marks = (text: string): string[] =>
  tokenize(text)
    .filter((tk) => tk.kind === 'highlight')
    .map((tk) => text.slice(...tk.contentRange))

describe('the highlight mark', () => {
  it('wraps the words between a pair', () => {
    expect(marks('a ==two words== b')).toEqual(['two words'])
  })
  it('finds each of several on a line', () => {
    expect(marks('==one== and ==two==')).toEqual(['one', 'two'])
  })
  it('keeps a lone = inside its content', () => {
    expect(marks('==a=b==')).toEqual(['a=b'])
  })
  // A run of three or more is a setext rule or a divider somebody drew, never a mark.
  it('refuses a longer run of =', () => {
    expect(marks('===x===')).toEqual([])
    expect(marks('a ====== b')).toEqual([])
  })
  it('refuses a lone pair and an unclosed one', () => {
    expect(marks('a == b')).toEqual([])
    expect(marks('x ==unclosed')).toEqual([])
  })
  // Code is tokenized first for exactly this reason: what is inside a span is literal text.
  it('is literal text inside a code span', () => {
    expect(marks('`==not a mark==`')).toEqual([])
  })
})
