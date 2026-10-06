import { describe, it, expect } from 'vitest'
import { tokenize } from './tokens'

/** `==highlight==` has no parser node behind it, so its grammar is the regex alone. */
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

const colored = (text: string) =>
  tokenize(text)
    .filter((tk) => tk.kind === 'highlight')
    .map((tk) => ({ content: text.slice(...tk.contentRange), color: tk.color }))

describe('a colored highlight', () => {
  it('reads a color mark inside each == as its color, outside the content', () => {
    expect(colored('a ==🔴two words🔴== b')).toEqual([{ content: 'two words', color: 'red' }])
  })
  it('reads every shape of one color the same, with or without a variation selector', () => {
    expect(colored('==🟥x❤️==')).toEqual([{ content: 'x', color: 'red' }])
    expect(colored('==🔷x🔹==')).toEqual([{ content: 'x', color: 'blue' }])
    expect(colored('==⚫️x🖤==')).toEqual([{ content: 'x', color: 'black' }])
  })
  it('folds the marks into the markers, so they hide and reveal with the ==', () => {
    const text = '==🟢go🟢=='
    const [tk] = tokenize(text)
    expect(tk.markerRanges.map((r) => text.slice(...r))).toEqual(['==🟢', '🟢=='])
  })
  it('stays an accent highlight holding its marks as text when a side is missing or mismatched', () => {
    expect(colored('==🔴x==')).toEqual([{ content: '🔴x', color: undefined }])
    expect(colored('==🔴x🔵==')).toEqual([{ content: '🔴x🔵', color: undefined }])
  })
  it('needs words between the marks', () => {
    expect(colored('==🔴🔴==')).toEqual([{ content: '🔴🔴', color: undefined }])
  })
})
