import { describe, it, expect } from 'vitest'
import {
  decodeLinkTarget,
  encodeLinkTarget,
  linkDomain,
  normalizeLinkUrl,
  isValidLink,
  isHttpLink,
  targetTitle,
} from './links'

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

  // The grammar's target group ends at the first `)`, so an unescaped paren truncates the link and
  // leaves the rest of the title sitting raw in the line.
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
