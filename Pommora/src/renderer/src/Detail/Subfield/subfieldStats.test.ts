import { describe, expect, it } from 'vitest'
import { computeStats } from './subfieldStats'

/** Every masking substitution the counter makes must only ever REMOVE source characters. A
 *  placeholder that survives into the character count is the bug this suite pins. */
describe('computeStats — masked constructs add no characters', () => {
  it('a fenced block contributes nothing but still counts its raw lines', () => {
    expect(computeStats('```\na\nb\n```')).toEqual({
      lines: 4,
      words: 0,
      characters: 0,
      citations: 0,
    })
  })

  it('a fence holding a shorter fence drops as one block', () => {
    const s = computeStats('````\n```\ninner\n```\n````')
    expect(s.words).toBe(0)
    expect(s.characters).toBe(0)
  })

  it('inline code removes exactly its own span', () => {
    // 'x `code` y' is 10 chars; the span is 6; nothing is added back.
    expect(computeStats('x `code` y').characters).toBe(4)
  })

  it('inline code cannot span a newline', () => {
    // A stray backtick pair lines apart must not swallow the prose between them.
    expect(computeStats('one `two\nthree\nfour` five').words).toBe(5)
  })

  it('a thematic break contributes nothing', () => {
    expect(computeStats('a\n---\nb').characters).toBe(2)
  })
})

// Tables are the known exception — their pipes and delimiter row still count as source. See the
// note in subfieldStats.ts.
describe('computeStats — the counter agrees with what the editor draws', () => {
  it('a lone page embed is a tile, not prose', () => {
    expect(computeStats('![[Page]]')).toEqual({ lines: 1, words: 0, characters: 0, citations: 0 })
  })

  it('a lone webpage embed is a tile, not prose', () => {
    expect(computeStats('![Site](https://example.com)')).toEqual({
      lines: 1,
      words: 0,
      characters: 0,
      citations: 0,
    })
  })

  it('an inline page embed keeps its title, which the editor still shows', () => {
    expect(computeStats('see ![[Page]] here').words).toBe(3)
  })

  it('a connection reads as its title, an aliased one as its alias', () => {
    expect(computeStats('[[Page]]').words).toBe(1)
    expect(computeStats('[[Page|the alias]]').words).toBe(2)
  })

  it('a checkbox item counts only its content', () => {
    expect(computeStats('- [ ] task').words).toBe(1)
  })

  it('an arrow list item counts only its content', () => {
    expect(computeStats('→ item').words).toBe(1)
  })

  it('a nested quote counts only its content', () => {
    expect(computeStats('>> text').words).toBe(1)
  })

  it('an ordered item and a bullet count only their content', () => {
    expect(computeStats('1. one').words).toBe(1)
    expect(computeStats('- two').words).toBe(1)
  })
})

describe('computeStats — a line is read from the base the renderer reads it from', () => {
  it("a callout head's tag is chrome, not prose", () => {
    expect(computeStats('> [!note] Remember the deadline\n> It is on Friday.').words).toBe(7)
  })

  it('a rule inside a quote is still a rule', () => {
    expect(computeStats('> ---')).toEqual({ lines: 1, words: 0, characters: 0, citations: 0 })
  })

  it('a bare `>` with no space is prose the renderer never quotes', () => {
    expect(computeStats('>abc').characters).toBe(4)
    expect(computeStats('>>>>abc').characters).toBe(7)
  })

  it('a heading inside a quote loses its hashes, not its words', () => {
    expect(computeStats('> ## Title').words).toBe(1)
  })

  it('a list item inside a quote counts only its content', () => {
    expect(computeStats('> - [ ] task').words).toBe(1)
  })
})

describe('computeStats — the contracts the source already stated', () => {
  it('an empty body is all zeros', () => {
    expect(computeStats('')).toEqual({ lines: 0, words: 0, characters: 0, citations: 0 })
  })

  it('a single trailing newline terminates rather than adding a line', () => {
    expect(computeStats('a\n').lines).toBe(1)
    expect(computeStats('a\n\n').lines).toBe(2)
  })

  it('a decorated heading is one word', () => {
    expect(computeStats('## **Bold**').words).toBe(1)
  })

  it('a markdown link reads as its label', () => {
    expect(computeStats('[the label](https://example.com)').words).toBe(2)
  })
})

describe('computeStats — footnotes', () => {
  const doc = 'body [^1] here\n\n[^1]: the citation\ncontinued'

  it('the citations section leaves all three counts', () => {
    expect(computeStats(doc)).toEqual({ lines: 2, words: 2, characters: 14, citations: 1 })
  })

  it('a marker counts its own characters and no word', () => {
    expect(computeStats('sentence[^1].')).toMatchObject({ words: 1, characters: 13 })
    expect(computeStats('word [^1] word')).toMatchObject({ words: 2, characters: 14 })
  })

  it('the marker count is the syntax length, not a constant', () => {
    expect(computeStats('a[^10] b')).toMatchObject({ words: 2, characters: 8 })
  })

  it('a marker followed by a parenthetical is not a link', () => {
    expect(computeStats('see[^1](url) here').characters).toBe(17)
  })

  it('a fenced pseudo-citation counts as the fence it is', () => {
    expect(computeStats('```\n[^1]: one\n```')).toEqual({
      lines: 3,
      words: 0,
      characters: 0,
      citations: 0,
    })
  })

  it('a marker inside inline code stays blanked', () => {
    expect(computeStats('a `[^1]` b').characters).toBe(4)
  })

  it('a document that is only citations counts nothing', () => {
    expect(computeStats('[^1]: one\n[^2]: two')).toEqual({
      lines: 0,
      words: 0,
      characters: 0,
      citations: 2,
    })
  })

  it('subtracts exactly the citation lines, and no fence line', () => {
    const body =
      '# Head\n\n```\ncode\n```\n\n| a | b |\n| - | - |\n\ntext [^1]\n\n[^1]: one\n\n[^2]: two'
    const raw = body.split('\n').length
    const cited = ['[^1]: one', '', '[^2]: two'].length
    expect(computeStats(body).lines).toBe(raw - cited)
  })
})
