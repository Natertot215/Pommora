import { describe, it, expect } from 'vitest'
import { rewriteConnections, rewriteHeadingConnections } from './rewrite'
import { LINK_DISPLAYS } from '../Properties/properties'
import { parseConnectionText } from './connections'
import type { ConnResolution, PageIndex } from './pageIndex'
import { normalizeTitle } from '../Paths/caseFold'
import {
  linkDisplayText,
  linkEditText,
  linkValueFromEdit,
  linkValueFromRename,
  readLinkText,
  serializeLink,
  urlClickTarget,
} from './linkValue'

const page = (title: string): ConnResolution => ({
  status: 'resolved',
  page: { id: title, title, path: `${title}.md` },
})
const only =
  (title: string): PageIndex['resolve'] =>
  (raw) =>
    normalizeTitle(raw) === normalizeTitle(title) ? page(title) : { status: 'phantom' }
const ambiguous: PageIndex['resolve'] = () => ({ status: 'ambiguous' })

describe('readLinkText without a resolver', () => {
  it('reads a connection with its heading and alias', () => {
    expect(readLinkText('[[T#H|a]]')).toEqual({
      kind: 'page',
      syntax: 'wiki',
      title: 'T',
      heading: 'H',
      alias: 'a',
    })
  })
  it('reads a markdown link to a title-shaped target as a page', () => {
    expect(readLinkText('[x](Old)')).toEqual({
      kind: 'page',
      syntax: 'markdown',
      title: 'Old',
      alias: 'x',
    })
  })
  it('reads a valid address as a weblink under a scheme', () => {
    expect(readLinkText('[x](example.com)')).toEqual({
      kind: 'url',
      syntax: 'markdown',
      url: 'https://example.com',
      alias: 'x',
    })
    expect(readLinkText('example.com')).toEqual({
      kind: 'url',
      syntax: 'bare',
      url: 'https://example.com',
    })
  })
  it('reads a bare heading as a page with an empty title', () => {
    expect(readLinkText('[x](#H)')).toEqual({
      kind: 'page',
      syntax: 'markdown',
      title: '',
      heading: 'H',
      alias: 'x',
    })
  })
  it('reads nothing the editor would not draw as one whole link', () => {
    expect(readLinkText('[^1](https://a.com)')).toBeNull()
    expect(readLinkText('[a](b) [c](d)')).toBeNull()
    expect(readLinkText('foo bar')).toBeNull()
    expect(readLinkText('[](Page)')).toBeNull()
  })
  it('keeps a backslash the cell escape did not put there', () => {
    expect(readLinkText('[[A\\]]')).toMatchObject({ kind: 'page', title: 'A\\' })
    expect(readLinkText('[[A#Note\\]]')).toMatchObject({ title: 'A', heading: 'Note\\' })
    expect(parseConnectionText('[[T\\|a]]')).toEqual({ title: 'T', alias: 'a' })
  })
  it('keeps a URL that itself contains parens, and an escaped label', () => {
    expect(readLinkText('[Wiki](https://en.wikipedia.org/wiki/Foo_(bar))')).toMatchObject({
      url: 'https://en.wikipedia.org/wiki/Foo_(bar)',
      alias: 'Wiki',
    })
    expect(readLinkText(serializeLink('https://example.com', 'a](b \\ c'))).toMatchObject({
      url: 'https://example.com',
      alias: 'a](b \\ c',
    })
  })
})

describe('readLinkText with a resolver', () => {
  const r = only('Meeting Notes')
  it('names a resolved page under its own capitalization', () => {
    expect(readLinkText('[[meeting notes]]', r)).toMatchObject({ title: 'Meeting Notes' })
    expect(readLinkText('[x](meeting notes)', r)).toMatchObject({ title: 'Meeting Notes' })
  })
  it('falls to the address arm when no page holds the title', () => {
    expect(readLinkText('[x](example.com)', r)).toEqual({
      kind: 'url',
      syntax: 'markdown',
      url: 'https://example.com',
      alias: 'x',
    })
    expect(readLinkText('[x](Nope)', r)).toBeNull()
  })
  it('refuses an ambiguous title, address-shaped or not', () => {
    expect(readLinkText('[[Dup]]', ambiguous)).toBeNull()
    expect(readLinkText('[x](dup.io)', ambiguous)).toBeNull()
  })
  it('reads a bare heading only where the resolver answers the holder', () => {
    expect(readLinkText('[[#H]]', r)).toBeNull()
    expect(
      readLinkText('[[#H]]', (t) => (t === '' ? page('Holder') : { status: 'phantom' })),
    ).toEqual({
      kind: 'page',
      syntax: 'wiki',
      title: '',
      heading: 'H',
    })
  })
})

describe('serializeLink', () => {
  it('writes a bare url when there is no label', () => {
    expect(serializeLink('https://example.com')).toBe('https://example.com')
  })
  it('writes a markdown link when there is a label, escaping a bracket', () => {
    expect(serializeLink('https://example.com', 'My Site')).toBe('[My Site](https://example.com)')
    expect(serializeLink('https://example.com', 'Chapter [2]')).toBe(
      '[Chapter [2\\]](https://example.com)',
    )
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

  // Sort and filter call this with no look on purpose; a link-short default would silently re-order every Link column.
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
    expect(linkValueFromEdit('[[meeting notes]]', undefined, resolve)).toEqual({
      kind: 'link',
      value: '[[Meeting Notes]]',
    })
  })
  it('keeps a pasted connection’s alias', () => {
    expect(linkValueFromEdit('[[Meeting Notes|Today]]', undefined, resolve)).toEqual({
      kind: 'link',
      value: '[[Meeting Notes|Today]]',
    })
  })
  it('reads a markdown link naming a page as a connection, label and all', () => {
    expect(linkValueFromEdit('[Today](Meeting%20Notes)', undefined, resolve)).toEqual({
      kind: 'link',
      value: '[[Meeting Notes|Today]]',
    })
  })
  it('drops an alias that merely repeats the title', () => {
    expect(linkValueFromEdit('[[Meeting Notes|meeting notes]]', undefined, resolve)).toEqual({
      kind: 'link',
      value: '[[Meeting Notes]]',
    })
  })
  it('refuses a title no page answers to', () => {
    expect(linkValueFromEdit('[[Nowhere]]', undefined, resolve)).toBeUndefined()
  })
  it('reads a markdown link over an address as the aliased URL', () => {
    expect(linkValueFromEdit('[My Site](https://example.com)', undefined, resolve)).toEqual({
      kind: 'link',
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
    expect(linkEditText('[[Meeting Notes|Today]]')).toBe('[[Meeting Notes]]')
  })
  it('renames by setting the connection’s alias', () => {
    expect(linkValueFromRename('Today', '[[Meeting Notes]]')).toEqual({
      kind: 'link',
      value: '[[Meeting Notes|Today]]',
    })
    expect(linkValueFromRename('', '[[Meeting Notes|Today]]')).toEqual({
      kind: 'link',
      value: '[[Meeting Notes]]',
    })
  })
  it('renames a markdown page link in its own syntax', () => {
    expect(linkValueFromRename('Today', '[x](Meeting%20Notes#H)')).toEqual({
      kind: 'link',
      value: '[Today](Meeting%20Notes#H)',
    })
  })
  it('a page rename rewrites a Link value naming the page in either syntax, and nothing else', () => {
    const rename = (value: string) => rewriteConnections(value, 'Meeting Notes', 'New Title')
    expect(rename('[[Meeting Notes]]')).toBe('[[New Title]]')
    expect(rename('[x](Meeting%20Notes#H)')).toBe('[x](New%20Title#H)')
    expect(rename('https://example.com/Meeting Notes')).toBe('https://example.com/Meeting Notes')
  })
  it('a heading rename moves a Link value aimed at that heading, alias kept, and nothing else', () => {
    const move = (value: string, to = 'Outcomes') =>
      rewriteHeadingConnections(value, 'Meeting Notes', 'Decisions', to)
    expect(move('[[Meeting Notes#Decisions|D]]')).toBe('[[Meeting Notes#Outcomes|D]]')
    expect(move('[[Meeting Notes#Other]]')).toBe('[[Meeting Notes#Other]]')
    expect(move('[[Meeting Notes]]')).toBe('[[Meeting Notes]]')
    expect(move('[[Meeting Notes#Decisions|D]]', 'A|B')).toBe('[[Meeting Notes#Decisions|D]]')
  })
  it('reads a heading link with its heading', () => {
    expect(readLinkText('[[Page#H]]')).toEqual({
      kind: 'page',
      syntax: 'wiki',
      title: 'Page',
      heading: 'H',
    })
  })
  it('keeps the heading through a page rename, an edit, a typed commit, and an alias rename', () => {
    const resolve = (raw: string): string | null =>
      raw.trim().toLowerCase() === 'meeting notes' ? 'Meeting Notes' : null
    expect(rewriteConnections('[[Meeting Notes#Decisions]]', 'Meeting Notes', 'New Title')).toBe(
      '[[New Title#Decisions]]',
    )
    expect(linkEditText('[[Meeting Notes#Decisions]]')).toBe('[[Meeting Notes#Decisions]]')
    expect(linkValueFromEdit('[[meeting notes#Decisions]]', undefined, resolve)).toEqual({
      kind: 'link',
      value: '[[Meeting Notes#Decisions]]',
    })
    expect(linkValueFromEdit('[Label](Meeting%20Notes#Decisions)', undefined, resolve)).toEqual({
      kind: 'link',
      value: '[[Meeting Notes#Decisions|Label]]',
    })
    expect(linkValueFromRename('Today', '[[Meeting Notes#Decisions]]')).toEqual({
      kind: 'link',
      value: '[[Meeting Notes#Decisions|Today]]',
    })
  })
})

describe('a connection under the Link cell’s three menu actions', () => {
  const resolve = (raw: string): string | null =>
    raw.trim().toLowerCase() === 'meeting notes' ? 'Meeting Notes' : null
  const CONNECTION = '[[Meeting Notes|Today]]'

  it('Edit opens on the page alone, as an address opens on the address', () => {
    expect(linkEditText(CONNECTION)).toBe('[[Meeting Notes]]')
    expect(linkEditText('[My Site](https://example.com)')).toBe('https://example.com')
  })
  it('Edit re-targets to a different page, keeping nothing of the old one', () => {
    expect(linkValueFromEdit('[[meeting notes]]', CONNECTION, resolve)).toEqual({
      kind: 'link',
      value: '[[Meeting Notes]]',
    })
  })
  it('Edit swaps a connection for an address, and an address back for a connection', () => {
    expect(linkValueFromEdit('example.com', CONNECTION, resolve)).toEqual({
      kind: 'link',
      value: 'https://example.com',
    })
    expect(linkValueFromEdit('example.org', '[My Site](https://example.com)', resolve)).toEqual({
      kind: 'link',
      value: '[My Site](https://example.org)',
    })
    expect(linkValueFromEdit(CONNECTION, 'https://example.com', resolve)).toEqual({
      kind: 'link',
      value: CONNECTION,
    })
  })
  it('Rename opens on the alias and writes it back onto the same page', () => {
    expect(readLinkText(CONNECTION)?.alias).toBe('Today')
    expect(linkValueFromRename('Tomorrow', CONNECTION)).toEqual({
      kind: 'link',
      value: '[[Meeting Notes|Tomorrow]]',
    })
  })
  it('an alias that would break the grammar is refused rather than written', () => {
    expect(linkValueFromRename('Notes] done', '[[Meeting Notes]]')).toEqual({
      kind: 'link',
      value: '[[Meeting Notes]]',
    })
  })
})
