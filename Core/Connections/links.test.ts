import { describe, it, expect } from 'vitest'
import {
  decodeLinkTarget,
  encodeLinkTarget,
  markdownLinkRegex,
  MD_LINK,
  targetFragment,
  targetTitle,
} from './links'

// CommonMark's link destination admits balanced parentheses. One grammar serves the editor tokenizer, `detect`, the rename scanner and the rename rewriter, so what this pins is what all four agree a link is.
describe('markdownLinkRegex — the balanced-parens destination', () => {
  const target = (s: string): string | undefined => markdownLinkRegex().exec(s)?.[2]

  it('reads a target carrying one balanced pair', () => {
    expect(target('[t](https://en.wikipedia.org/wiki/Foo_(bar))')).toBe(
      'https://en.wikipedia.org/wiki/Foo_(bar)',
    )
  })

  it('reads two sequential pairs', () => {
    expect(target('[t](https://a.com/(x)_(y))')).toBe('https://a.com/(x)_(y)')
  })

  it('reads a pair nested two deep', () => {
    expect(target('[t](https://a.com/a_(b_(c)_d))')).toBe('https://a.com/a_(b_(c)_d)')
  })

  it('reads a link surrounded by prose without swallowing it', () => {
    expect(target('see [t](https://a.com/Foo_(bar)) here')).toBe('https://a.com/Foo_(bar)')
  })

  it('leaves every paren-free shape exactly as it was', () => {
    expect(target('[t](https://a.com/x)')).toBe('https://a.com/x')
    expect(target('[t](my page)')).toBe('my page')
    expect(target('[Notes \\[WIP\\]](https://a.com)')).toBe('https://a.com')
    expect(target('[t]()')).toBeUndefined()
  })

  it('ends the destination before an unbalanced trailing paren, as it always has', () => {
    expect(target('[t](https://a.com/x))')).toBe('https://a.com/x')
  })

  it('refuses a target holding an unmatched opening paren', () => {
    expect(target('[t](https://a.com/a_(b)')).toBeUndefined()
  })

  it('stops at two levels of nesting', () => {
    expect(target('[t](https://a.com/a_(b_(c_(d)_e)_f))')).toBeUndefined()
  })

  // Two forms of one grammar: this scans a body, MD_LINK reads a whole stored value. Disagreeing about where a link ends is how one surface renders a link the other cannot follow.
  it('agrees with MD_LINK about where a parenthesized target ends', () => {
    const s = '[x](https://a.com/a_(b))'
    expect(target(s)).toBe(MD_LINK.exec(s)?.[2])
  })

  // These assert a result — a backtracking hang fails them by timeout, not by a threshold.
  it('returns immediately on the shapes that could backtrack', () => {
    expect(markdownLinkRegex().exec(`[x](${'('.repeat(2000)}`)).toBeNull()
    expect(markdownLinkRegex().exec('['.repeat(5000))).toBeNull()
    expect(markdownLinkRegex().exec(`[x](${'a_(b)'.repeat(400)}`)).toBeNull()
  })
})

// Both halves are shared with main, which runs the same decode inside the rename cascade — a throw there skips that file, and the rename's warning counts it.
describe('the page-target codec', () => {
  it('round-trips a title through the parens', () => {
    for (const title of ['Notes', 'Work Notes', 'Atomic Habits (Book)', 'Q3 — Plan', '100% Done']) {
      expect(decodeLinkTarget(encodeLinkTarget(title))).toBe(title)
    }
  })

  // A title's parens need not balance, and a lone one leaves the link untokenizable — so they are escaped rather than trusted to the destination grammar's nesting.
  it('escapes parens, which neither built-in encoder touches', () => {
    expect(encodeLinkTarget('Atomic Habits (Book)')).toBe('Atomic%20Habits%20%28Book%29')
    expect(encodeLinkTarget('Atomic Habits (Book)')).not.toContain('(')
  })

  it('a lone % decodes to itself rather than throwing', () => {
    expect(decodeLinkTarget('Revenue 50% plan')).toBe('Revenue 50% plan')
    expect(() => decodeLinkTarget('%')).not.toThrow()
  })
})

describe('targetTitle — what a markdown link names', () => {
  it('reads a bare title, with or without its extension', () => {
    expect(targetTitle('Notes')).toBe('Notes')
    expect(targetTitle('Notes.md')).toBe('Notes')
    expect(targetTitle('Work%20Notes')).toBe('Work Notes')
  })

  // isValidLink accepts any dotted host, so these two would open a browser and make the pages they name unreachable if resolution didn't run first.
  it('a dotted title is still a title', () => {
    expect(targetTitle('Node.js')).toBe('Node.js')
    expect(targetTitle('Notes.md')).toBe('Notes')
  })

  it('anything addressing the outside names no page', () => {
    expect(targetTitle('https://example.com/Notes')).toBeNull()
    expect(targetTitle('example.com/Notes')).toBeNull()
    expect(targetTitle('mailto:a@b.com')).toBeNull()
    expect(targetTitle('')).toBeNull()
  })

  it('splits the page from a heading fragment', () => {
    expect(targetTitle('Page#Setup')).toBe('Page')
  })

  it('decodes the fragment half independently of the page', () => {
    expect(targetFragment('Page#My%20Heading')).toBe('My Heading')
  })

  it('reads a bare fragment as the containing page', () => {
    expect(targetTitle('#Setup')).toBe('')
    expect(targetFragment('#Setup')).toBe('Setup')
  })

  it('splits at the first literal `#`, not an encoded one', () => {
    expect(targetTitle('A%23B')).toBe('A#B')
    expect(targetFragment('A%23B')).toBe('')
  })
})

describe('the codec reads back everything it writes', () => {
  const titles = [
    'Notes',
    'Work Notes',
    'Atomic Habits (Book)',
    'Meeting: Notes',
    'Notes [WIP]',
    'Revenue 50% plan',
    'Q3 — Plan',
    'Node.js',
    'Already%20Encoded',
    'a?b&c+d',
  ]

  it('round-trips, and every one still names its page', () => {
    for (const title of titles) {
      const encoded = encodeLinkTarget(title)
      expect(decodeLinkTarget(encoded)).toBe(title)
      expect(targetTitle(encoded)).toBe(title)
    }
  })

  // A colon is legal in a page name and is also how a target declares itself an address, so it is spelled out — otherwise `Meeting: Notes` encodes to something targetTitle refuses.
  it('spells out a colon so a title is never read as a scheme', () => {
    expect(encodeLinkTarget('Meeting: Notes')).toBe('Meeting%3A%20Notes')
    expect(targetTitle('Meeting%3A%20Notes')).toBe('Meeting: Notes')
    expect(targetTitle('https://example.com')).toBeNull()
  })

  it('never throws, even on input encodeURI refuses', () => {
    expect(() => encodeLinkTarget('A\uD800B')).not.toThrow()
  })
})
