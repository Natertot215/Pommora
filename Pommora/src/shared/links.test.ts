import { describe, it, expect } from 'vitest'
import {
  decodeLinkTarget,
  encodeLinkTarget,
  linkDomain,
  markdownLinkRegex,
  MD_LINK,
  normalizeLinkUrl,
  isValidLink,
  isHttpLink,
  targetTitle,
} from './links'

// CommonMark's link destination admits balanced parentheses, and a great many real addresses use
// them. One grammar serves the editor tokenizer, `detect`, the rename scanner and the rename
// rewriter, so what this pins is what all four agree a link is.
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

  // Deliberate change: this tokenizes today and stops after. An unmatched `(` in a bare destination
  // is invalid CommonMark, so the whole thing is prose — a correction, not a regression.
  it('refuses a target holding an unmatched opening paren', () => {
    expect(target('[t](https://a.com/a_(b)')).toBeUndefined()
  })

  // The ruled depth. A third level is prose rather than a truncated address, which is the same
  // trade the unmatched-open case makes.
  it('stops at two levels of nesting', () => {
    expect(target('[t](https://a.com/a_(b_(c_(d)_e)_f))')).toBeUndefined()
  })

  // Two forms of one grammar: this scans a body, MD_LINK reads a whole stored value. A cell and the
  // editor disagreeing about where a link ends is how one renders a link the other cannot follow.
  it('agrees with MD_LINK about where a parenthesized target ends', () => {
    const s = '[x](https://a.com/a_(b))'
    expect(target(s)).toBe(MD_LINK.exec(s)?.[2])
  })

  // The label's cap exists against quadratic backtracking on a long unclosed run; the destination's
  // alternatives are disjoint on their first character, which is what keeps the nesting from adding
  // a second such run. These assert a result — a hang fails them by timeout, not by a threshold.
  it('returns immediately on the shapes that could backtrack', () => {
    expect(markdownLinkRegex().exec(`[x](${'('.repeat(2000)}`)).toBeNull()
    expect(markdownLinkRegex().exec('['.repeat(5000))).toBeNull()
    expect(markdownLinkRegex().exec(`[x](${'a_(b)'.repeat(400)}`)).toBeNull()
  })
})

describe('linkDomain', () => {
  it('returns the bare host', () => {
    expect(linkDomain('https://example.com/some/path?q=1')).toBe('example.com')
  })
  it('drops a leading www.', () => {
    expect(linkDomain('https://www.github.com/rust-lang/rust')).toBe('github.com')
  })
  it('keeps a non-www subdomain', () => {
    expect(linkDomain('https://docs.rust-lang.org/book')).toBe('docs.rust-lang.org')
  })
  it('normalizes a schemeless URL before parsing', () => {
    expect(linkDomain('www.example.com/x')).toBe('example.com')
  })
  it('lowercases nothing it need not, but strips only the www label', () => {
    expect(linkDomain('https://wwwfoo.example.com')).toBe('wwwfoo.example.com')
  })
  it('falls back to the trimmed input when unparseable', () => {
    expect(linkDomain('  not a url  ')).toBe('not a url')
  })
})

describe('normalizeLinkUrl (guard co-tested with the fetch path)', () => {
  it('adds https:// to a schemeless host', () => {
    expect(normalizeLinkUrl('example.com')).toBe('https://example.com')
  })
  it('leaves an explicit scheme alone', () => {
    expect(normalizeLinkUrl('http://example.com')).toBe('http://example.com')
    expect(normalizeLinkUrl('mailto:a@b.com')).toBe('mailto:a@b.com')
  })
})

describe('isValidLink (the open gate)', () => {
  it('accepts a well-formed http(s) URL', () => {
    expect(isValidLink('https://example.com')).toBe(true)
    expect(isValidLink('example.com/path')).toBe(true)
  })
  it('accepts a plausible mailto', () => {
    expect(isValidLink('mailto:a@b.com')).toBe(true)
  })
  it('rejects a hostless or spaced string', () => {
    expect(isValidLink('not a url')).toBe(false)
    expect(isValidLink('localhost')).toBe(false)
  })
})

describe('isHttpLink (the title-fetch gate — http(s) only)', () => {
  it('accepts what the fetcher can hit', () => {
    expect(isHttpLink('https://example.com')).toBe(true)
    expect(isHttpLink('example.com/path')).toBe(true)
  })
  it('rejects a mailto — valid to open, but no page to fetch', () => {
    expect(isHttpLink('mailto:a@b.com')).toBe(false)
  })
  it('rejects garbage the same as isValidLink', () => {
    expect(isHttpLink('not a url')).toBe(false)
  })
})

// The `( )` of a markdown link naming a page. Both halves are shared with main, which runs the same
// decode inside the rename cascade — a throw there reverts the rename rather than skipping a link.
describe('the page-target codec', () => {
  it('round-trips a title through the parens', () => {
    for (const title of ['Notes', 'Work Notes', 'Atomic Habits (Book)', 'Q3 — Plan', '100% Done']) {
      expect(decodeLinkTarget(encodeLinkTarget(title))).toBe(title)
    }
  })

  // A title's parens need not balance, and a lone one leaves the link untokenizable — so they are
  // escaped rather than trusted to the destination grammar's nesting.
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

  // isValidLink accepts any dotted host, so these two would open a browser and make the pages they
  // name unreachable if resolution didn't run first.
  it('a dotted title is still a title', () => {
    expect(targetTitle('Node.js')).toBe('Node.js')
    expect(targetTitle('Notes.md')).toBe('Notes')
  })

  // Without this a URL would reach a page by its last path segment.
  it('anything addressing the outside names no page', () => {
    expect(targetTitle('https://example.com/Notes')).toBeNull()
    expect(targetTitle('example.com/Notes')).toBeNull()
    expect(targetTitle('mailto:a@b.com')).toBeNull()
    expect(targetTitle('')).toBeNull()
  })
})

// The encoder and the reader are two halves of one contract: anything the app writes must be
// something it can read back. These pin the characters where that nearly broke.
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
    'a#b?c&d+e',
  ]

  it('round-trips, and every one still names its page', () => {
    for (const title of titles) {
      const encoded = encodeLinkTarget(title)
      expect(decodeLinkTarget(encoded)).toBe(title)
      expect(targetTitle(encoded)).toBe(title)
    }
  })

  // A colon is legal in a page name and is also how a target declares itself an address, so it is
  // spelled out — otherwise `Meeting: Notes` encodes to something targetTitle refuses, and the app
  // writes a link it cannot itself follow.
  it('spells out a colon so a title is never read as a scheme', () => {
    expect(encodeLinkTarget('Meeting: Notes')).toBe('Meeting%3A%20Notes')
    expect(targetTitle('Meeting%3A%20Notes')).toBe('Meeting: Notes')
    expect(targetTitle('https://example.com')).toBeNull()
  })

  // The cascade calls this unwrapped, where a throw becomes a reverted rename rather than a
  // skipped link.
  it('never throws, even on input encodeURI refuses', () => {
    expect(() => encodeLinkTarget('A\uD800B')).not.toThrow()
  })
})
