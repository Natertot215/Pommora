import { describe, it, expect } from 'vitest'
import { LINK_DISPLAYS } from './properties'
import {
  isCommittableLink,
  linkDisplayText,
  linkAlias,
  linkEditText,
  linkNamesTitle,
  parseLink,
  serializeLink,
  urlClickTarget,
  urlValueFromEdit,
  urlValueFromRename,
} from './linkValue'

describe('parseLink', () => {
  it('parses a bare URL as no-alias', () => {
    expect(parseLink('https://example.com')).toEqual({ url: 'https://example.com' })
  })
  it('parses a markdown link into url + alias', () => {
    expect(parseLink('[My Site](https://example.com)')).toEqual({
      url: 'https://example.com',
      alias: 'My Site',
    })
  })
  it('collapses an empty alias to no alias', () => {
    expect(parseLink('[](https://example.com)')).toEqual({ url: 'https://example.com' })
  })
  it('keeps a URL that itself contains parens', () => {
    expect(parseLink('[Wiki](https://en.wikipedia.org/wiki/Foo_(bar))')).toEqual({
      url: 'https://en.wikipedia.org/wiki/Foo_(bar)',
      alias: 'Wiki',
    })
  })
  it('trims surrounding whitespace', () => {
    expect(parseLink('  https://example.com  ')).toEqual({ url: 'https://example.com' })
  })
})

describe('serializeLink', () => {
  it('writes a bare url when there is no alias', () => {
    expect(serializeLink({ url: 'https://example.com' })).toBe('https://example.com')
  })
  it('writes a markdown link when there is an alias', () => {
    expect(serializeLink({ url: 'https://example.com', alias: 'My Site' })).toBe(
      '[My Site](https://example.com)',
    )
  })
  it('round-trips through parse', () => {
    const raw = '[Docs](https://example.com/docs)'
    expect(serializeLink(parseLink(raw))).toBe(raw)
  })
})

describe('alias with markdown-breaking chars — escaped, never corrupts', () => {
  it('escapes `]` in the alias so the shape survives', () => {
    expect(serializeLink({ url: 'https://example.com', alias: 'Chapter [2]' })).toBe(
      '[Chapter [2\\]](https://example.com)',
    )
  })
  it('round-trips an alias containing `]`', () => {
    const v = { url: 'https://example.com', alias: 'Chapter [2]' }
    expect(parseLink(serializeLink(v))).toEqual(v)
  })
  it('round-trips an alias containing `](` and a backslash', () => {
    const v = { url: 'https://example.com', alias: 'a](b \\ c' }
    expect(parseLink(serializeLink(v))).toEqual(v)
  })
  it('the escaped form stays a url through the codec, never a select pill', () => {
    // a bare `]` in the alias would otherwise reclassify to select — the exact fixed bug
    expect(parseLink(serializeLink({ url: 'https://example.com', alias: 'TODO]' }))).toEqual({
      url: 'https://example.com',
      alias: 'TODO]',
    })
  })
})

describe('linkDisplayText — the alias always wins', () => {
  it('shows the alias regardless of the show-as look, or of a passed title', () => {
    for (const look of LINK_DISPLAYS) {
      expect(linkDisplayText('[Home](https://example.com)', look)).toBe('Home')
    }
    expect(linkDisplayText('[Home](https://example.com)', 'link-title', 'Example Domain')).toBe(
      'Home',
    )
  })
})

describe('linkDisplayText — no alias, the look decides', () => {
  it('link-full shows the whole address, never a title', () => {
    expect(linkDisplayText('https://www.example.com/x', 'link-full')).toBe(
      'https://www.example.com/x',
    )
    expect(linkDisplayText('https://www.example.com/x', 'link-full', 'Example Domain')).toBe(
      'https://www.example.com/x',
    )
  })

  it('link-short shows the bare domain, with or without a resolved title', () => {
    expect(linkDisplayText('https://www.example.com/deep/path', 'link-short')).toBe('example.com')
    expect(linkDisplayText('https://www.example.com/x', 'link-short', 'Example Domain')).toBe(
      'example.com',
    )
  })

  it('link-title shows the fetched title when one is resolved', () => {
    expect(linkDisplayText('https://example.com', 'link-title', 'Example Domain')).toBe(
      'Example Domain',
    )
  })

  it('link-title falls back to the bare domain while loading or when the fetch failed', () => {
    expect(linkDisplayText('https://www.example.com/deep/path', 'link-title')).toBe('example.com')
    expect(linkDisplayText('https://www.example.com/deep/path', 'link-title', undefined)).toBe(
      'example.com',
    )
  })

  // Sort and filter call this with no look on purpose, so ordering is the same under every URL
  // column whatever its property is configured to show. If the default branch ever became
  // link-short, every URL column would silently re-order with no other symptom.
  it('the no-look call returns the raw URL — the pin sort and filter stand on', () => {
    expect(linkDisplayText('https://www.example.com/x')).toBe('https://www.example.com/x')
    expect(linkDisplayText('https://www.example.com/x', undefined, 'Example Domain')).toBe(
      'https://www.example.com/x',
    )
  })
})

describe('internal links', () => {
  const resolve = (raw: string): string | null =>
    raw.trim().toLowerCase() === 'meeting notes' ? 'Meeting Notes' : null

  it('commits a pasted connection under the page’s canonical title', () => {
    expect(urlValueFromEdit('[[meeting notes]]', undefined, resolve)).toEqual({
      kind: 'url',
      value: '[[Meeting Notes]]',
    })
  })
  it('keeps a pasted connection’s alias', () => {
    expect(urlValueFromEdit('[[Meeting Notes|Today]]', undefined, resolve)).toEqual({
      kind: 'url',
      value: '[[Meeting Notes|Today]]',
    })
  })
  it('reads a markdown link naming a page as a connection, label and all', () => {
    expect(urlValueFromEdit('[Today](Meeting%20Notes)', undefined, resolve)).toEqual({
      kind: 'url',
      value: '[[Meeting Notes|Today]]',
    })
  })
  it('drops an alias that merely repeats the title', () => {
    expect(urlValueFromEdit('[[Meeting Notes|meeting notes]]', undefined, resolve)).toEqual({
      kind: 'url',
      value: '[[Meeting Notes]]',
    })
  })
  it('refuses a title no page answers to', () => {
    expect(urlValueFromEdit('[[Nowhere]]', undefined, resolve)).toBeUndefined()
    expect(isCommittableLink('[[Nowhere]]', resolve)).toBe(false)
  })
  it('reads a markdown link over an address as the aliased URL', () => {
    expect(urlValueFromEdit('[My Site](https://example.com)', undefined, resolve)).toEqual({
      kind: 'url',
      value: '[My Site](https://example.com)',
    })
  })
  it('shows the page it names, ignoring every link format', () => {
    for (const display of LINK_DISPLAYS)
      expect(linkDisplayText('[[Meeting Notes]]', display)).toBe('Meeting Notes')
    expect(linkDisplayText('[[Meeting Notes|Today]]', 'link-short')).toBe('Today')
  })
  it('has no address to open, and edits as itself', () => {
    expect(urlClickTarget('[[Meeting Notes]]')).toBeNull()
    expect(linkEditText('[[Meeting Notes|Today]]')).toBe('[[Meeting Notes|Today]]')
  })
  it('renames by setting the connection’s alias', () => {
    expect(urlValueFromRename('Today', '[[Meeting Notes]]')).toEqual({
      kind: 'url',
      value: '[[Meeting Notes|Today]]',
    })
    expect(urlValueFromRename('', '[[Meeting Notes|Today]]')).toEqual({
      kind: 'url',
      value: '[[Meeting Notes]]',
    })
  })
  it('names the page it points at, and nothing else', () => {
    expect(linkNamesTitle('[[Meeting Notes]]', 'meeting notes')).toBe(true)
    expect(linkNamesTitle('https://example.com/Meeting Notes', 'meeting notes')).toBe(false)
  })
})

describe('a connection under the Link cell’s three menu actions', () => {
  const resolve = (raw: string): string | null =>
    raw.trim().toLowerCase() === 'meeting notes' ? 'Meeting Notes' : null
  const CONNECTION = '[[Meeting Notes|Today]]'

  it('Edit opens on the connection and round-trips it unchanged', () => {
    const text = linkEditText(CONNECTION)
    expect(text).toBe(CONNECTION)
    expect(urlValueFromEdit(text, CONNECTION, resolve)).toEqual({
      kind: 'url',
      value: CONNECTION,
    })
  })
  it('Edit re-targets to a different page, keeping nothing of the old one', () => {
    expect(urlValueFromEdit('[[meeting notes]]', CONNECTION, resolve)).toEqual({
      kind: 'url',
      value: '[[Meeting Notes]]',
    })
  })
  it('Edit swaps a connection for an address, and an address back for a connection', () => {
    // The connection's field showed its alias, so typing over it drops the alias with the rest.
    expect(urlValueFromEdit('example.com', CONNECTION, resolve)).toEqual({
      kind: 'url',
      value: 'https://example.com',
    })
    // An ADDRESS's field shows only its URL, so its alias was never on screen to remove.
    expect(urlValueFromEdit('example.org', '[My Site](https://example.com)', resolve)).toEqual({
      kind: 'url',
      value: '[My Site](https://example.org)',
    })
    expect(urlValueFromEdit(CONNECTION, 'https://example.com', resolve)).toEqual({
      kind: 'url',
      value: CONNECTION,
    })
  })
  it('Rename opens on the alias and writes it back onto the same page', () => {
    expect(linkAlias(CONNECTION)).toBe('Today')
    expect(urlValueFromRename('Tomorrow', CONNECTION)).toEqual({
      kind: 'url',
      value: '[[Meeting Notes|Tomorrow]]',
    })
  })
  it('an alias that would break the grammar is refused rather than written', () => {
    expect(urlValueFromRename('Notes] done', '[[Meeting Notes]]')).toEqual({
      kind: 'url',
      value: '[[Meeting Notes]]',
    })
  })
})
