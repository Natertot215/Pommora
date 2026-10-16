import { describe, it, expect } from 'vitest'
import { tokenize } from './tokens'
import type { Paint } from './paints'

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

const spans = (kind: Paint) => (text: string) =>
  tokenize(text)
    .filter((tk) => tk.kind === kind)
    .map((tk) => ({ content: text.slice(...tk.contentRange), color: tk.color }))

const colored = spans('highlight')

describe('a colored highlight', () => {
  it('reads a color mark right after the opening == as its color, outside the content', () => {
    expect(colored('a ==🔴two words== b')).toEqual([{ content: 'two words', color: 'red' }])
  })
  it('reads every shape of one color the same, with or without a variation selector', () => {
    expect(colored('==🟥x==')).toEqual([{ content: 'x', color: 'red' }])
    expect(colored('==❤\uFE0Fx==')).toEqual([{ content: 'x', color: 'red' }])
    expect(colored('==🔷x==')).toEqual([{ content: 'x', color: 'blue' }])
    expect(colored('==⚫\uFE0Fx==')).toEqual([{ content: 'x', color: 'black' }])
  })
  it('folds the mark into the opening marker, so it hides and reveals with the ==', () => {
    const text = '==🟢go=='
    const [tk] = tokenize(text)
    expect(tk.markerRanges.map((r) => text.slice(...r))).toEqual(['==🟢', '=='])
  })
  it('reads only the leading mark, so a trailing one is words', () => {
    expect(colored('==🔴x🔴==')).toEqual([{ content: 'x🔴', color: 'red' }])
    expect(colored('==x🔴==')).toEqual([{ content: 'x🔴', color: undefined }])
    expect(colored('==🔴 Red alert==')).toEqual([{ content: ' Red alert', color: 'red' }])
  })
  it('needs words after the mark', () => {
    expect(colored('==🔴==')).toEqual([{ content: '🔴', color: undefined }])
  })
  it('leaves a mark joined into a longer emoji to that emoji', () => {
    expect(colored('==❤\uFE0F\u200D🔥 fire==')).toEqual([
      { content: '❤\uFE0F\u200D🔥 fire', color: undefined },
    ])
  })
})

const inked = spans('textColor')

describe('a text color', () => {
  it('reads a color mark right after a lone = as its color, up to the next =', () => {
    expect(inked('a =🔴two words= b')).toEqual([{ content: 'two words', color: 'red' }])
    const text = '=🟢go='
    expect(tokenize(text)[0].markerRanges.map((r) => text.slice(...r))).toEqual(['=🟢', '='])
  })
  it('reads every shape of a color text takes', () => {
    expect(inked('=🟥x= =❤\uFE0Fy= =🔷z=')).toEqual([
      { content: 'x', color: 'red' },
      { content: 'y', color: 'red' },
      { content: 'z', color: 'blue' },
    ])
  })
  it('needs a color mark and words, so a bare = pair stays prose', () => {
    for (const text of ['=words=', 'a=b=c', 'x=1 and y=2', '=🔴=', '= 🔴x='])
      expect(inked(text)).toEqual([])
  })
  it('leaves black and white to highlights', () => {
    expect(inked('=⚫x= =⬜y=')).toEqual([])
  })
  it('stays apart from == and longer runs', () => {
    expect(inked('==🔴x==')).toEqual([])
    expect(inked('===🔴x===')).toEqual([])
    expect(inked('=🔴x==')).toEqual([])
  })
  it('leaves a mark joined into a longer emoji to that emoji', () => {
    expect(inked('=❤\uFE0F\u200D🔥 x=')).toEqual([])
  })
  it('stays a highlight’s words inside a highlight', () => {
    expect(inked('==a =🔴b= c==')).toEqual([])
    expect(colored('==a =🔴b= c==')).toEqual([{ content: 'a =🔴b= c', color: undefined }])
  })
  it('is literal text inside a code span', () => {
    expect(inked('`=🔴x=`')).toEqual([])
  })
})

describe('what a paint holds', () => {
  it('holds a connection, a link, code, and math, which keep their own look inside it', () => {
    expect(colored('==see [[Page]] now==')).toEqual([
      { content: 'see [[Page]] now', color: undefined },
    ])
    expect(inked('=🔴see [[Page]] now=')).toEqual([{ content: 'see [[Page]] now', color: 'red' }])
    expect(inked('=🔴see [docs](https://x.com) now=')).toEqual([
      { content: 'see [docs](https://x.com) now', color: 'red' },
    ])
    expect(inked('=🔴run `npm i` now=')).toEqual([{ content: 'run `npm i` now', color: 'red' }])
    expect(inked('=🔴a $x$ b=')).toEqual([{ content: 'a $x$ b', color: 'red' }])
    const text = '=🔴see [[Page]] now='
    expect(tokenize(text).map((tk) => tk.kind)).toEqual(['textColor', 'wikiLink'])
  })
  it('drops when one of them crosses its edge', () => {
    expect(inked('=🔴note `a=b` here=')).toEqual([])
    expect(inked('=🔴read [docs](https://x.com/?a=1) now=')).toEqual([])
    expect(inked('=🔴E $E=mc^2$ ok=')).toEqual([])
    expect(colored('$x==a==$')).toEqual([])
  })
})
