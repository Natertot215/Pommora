import { describe, it, expect } from 'vitest'
import { rewriteConnections, rewriteHeadingConnections } from './rewrite'
import { LINK_DISPLAYS } from '../Properties/properties'
import { buildPageIndex } from './pageIndex'
import type { LinkTarget } from './linkValue'
import {
  keepsShown,
  linkDisplayText,
  linkEditText,
  linkValueFromEdit,
  linkValueFromRename,
  linkPaste,
  readLinkText,
  resolveLink,
  resolvedTarget,
  retarget,
  serializeLink,
  shownAlias,
  shownProse,
  wikiTitle,
} from './linkValue'

const notes = buildPageIndex([{ id: 'mn', title: 'Meeting Notes', path: 'Meeting Notes.md' }])

describe('readLinkText', () => {
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
  it('reads a destination written as a markdown file as the page it names, dotted or not', () => {
    expect(readLinkText('[x](Notes.md)')).toEqual({
      kind: 'page',
      syntax: 'markdown',
      title: 'Notes',
      alias: 'x',
    })
    expect(readLinkText('[x](Notes.md#Setup)')).toEqual({
      kind: 'page',
      syntax: 'markdown',
      title: 'Notes',
      heading: 'Setup',
      alias: 'x',
    })
  })
  it('reads a valid address as written, and writes it under a scheme', () => {
    expect(readLinkText('[x](example.com)')).toEqual({
      kind: 'url',
      syntax: 'markdown',
      url: 'example.com',
      alias: 'x',
      page: { title: 'example.com' },
    })
    expect(readLinkText('example.com')).toEqual({
      kind: 'url',
      syntax: 'bare',
      url: 'example.com',
    })
    expect(retarget('wiki', { kind: 'url', syntax: 'bare', url: 'example.com' }).text).toBe(
      'https://example.com',
    )
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
    expect(readLinkText('[](Page)')).toEqual({ kind: 'page', syntax: 'markdown', title: 'Page' })
  })
  it('keeps a backslash the cell escape did not put there', () => {
    expect(readLinkText('[[A\\]]')).toMatchObject({ kind: 'page', title: 'A\\' })
    expect(readLinkText('[[A#Note\\]]')).toMatchObject({ title: 'A', heading: 'Note\\' })
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

describe('resolveLink', () => {
  const holder = { id: 'h', title: 'Holder', path: 'Holder.md' }
  const index = buildPageIndex([
    { id: 'mn', title: 'Meeting Notes', path: 'Meeting Notes.md' },
    { id: 'd1', title: 'Dup', path: 'A/Dup.md' },
    { id: 'd2', title: 'Dup', path: 'B/Dup.md' },
    { id: 'i1', title: 'dup.io', path: 'A/dup.io.md' },
    { id: 'i2', title: 'dup.io', path: 'B/dup.io.md' },
  ])
  const withNotesIo = buildPageIndex([{ id: 'io', title: 'notes.io', path: 'notes.io.md' }])
  const alpha = { id: 'a', title: 'Alpha', path: 'Alpha.md' }
  const withAlpha = buildPageIndex([alpha, holder])
  const resolved = (text: string, own?: typeof holder) =>
    resolveLink(readLinkText(text), index, own)

  it('names the page that holds a title, in either syntax', () => {
    const page = { id: 'mn', title: 'Meeting Notes', path: 'Meeting Notes.md' }
    expect(resolved('[[meeting notes]]')).toEqual({ kind: 'page', page })
    expect(resolved('[x](meeting%20notes#H)')).toEqual({ kind: 'page', page, heading: 'H' })
    expect(resolved('[x](meeting%20notes#A/B)')).toEqual({ kind: 'page', page, heading: 'A/B' })
  })
  it('is unresolved and ambiguous where two pages hold the title, address-shaped or not', () => {
    expect(resolved('[[Dup]]')).toEqual({ kind: 'unresolved', status: 'ambiguous' })
    expect(resolved('[x](dup.io)')).toEqual({ kind: 'unresolved', status: 'ambiguous' })
  })
  it('is unresolved and phantom where no page holds the title', () => {
    expect(resolved('[[Nowhere]]')).toEqual({ kind: 'unresolved', status: 'phantom' })
    expect(resolved('[x](Nope.md)')).toEqual({ kind: 'unresolved', status: 'phantom' })
  })
  it('a bare heading names the page holding the value, and otherwise this document', () => {
    expect(resolved('[[#H]]', holder)).toEqual({ kind: 'page', page: holder, heading: 'H' })
    expect(resolved('[[#H]]')).toEqual({ kind: 'self', heading: 'H' })
    expect(resolved('[[ #H]]')).toEqual({ kind: 'self', heading: 'H' })
  })
  it('a titled link names its own page, not the page holding the value', () => {
    expect(resolveLink(readLinkText('[[Alpha#H]]'), withAlpha, holder)).toEqual({
      kind: 'page',
      page: alpha,
      heading: 'H',
    })
  })
  it('an address-shaped destination is the page that holds it, and the address as written otherwise', () => {
    expect(resolveLink(readLinkText('[x](notes.io)'), index)).toEqual({
      kind: 'url',
      url: 'notes.io',
    })
    expect(resolveLink(readLinkText('[x](notes.io)'), withNotesIo)).toEqual({
      kind: 'page',
      page: { id: 'io', title: 'notes.io', path: 'notes.io.md' },
    })
  })
  it('a dotted title is the page that holds it in a markdown link', () => {
    const node = { id: 'nj', title: 'Node.js', path: 'Node.js.md' }
    expect(resolveLink(readLinkText('[x](Node.js)'), buildPageIndex([node]))).toEqual({
      kind: 'page',
      page: node,
    })
  })
})

describe('wikiTitle', () => {
  it('reads the title a wikilink names, its heading and alias aside', () => {
    expect(wikiTitle('[[Page#Heading|alias]]')).toBe('Page')
    expect(wikiTitle('  [[Banner.png]]  ')).toBe('Banner.png')
  })
  it('reads a bare heading as an empty title, and an empty heading as the title', () => {
    expect(wikiTitle('[[#Heading]]')).toBe('')
    expect(wikiTitle('[[Page#]]')).toBe('Page')
  })
  it('strips the cell escape before a pipe', () => {
    expect(wikiTitle('[[T\\|a]]')).toBe('T')
    expect(wikiTitle('[[Page#Heading\\|alias]]')).toBe('Page')
  })
  it('is null with neither a title nor a heading, or for a link still being written', () => {
    expect(wikiTitle('[[#]]')).toBeNull()
    expect(wikiTitle('[[]]')).toBeNull()
    expect(wikiTitle('[[|x]]')).toBeNull()
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
  it('keeps a pasted connection’s alias', () => {
    expect(
      linkValueFromEdit('[[Meeting Notes|Today]]', undefined, notes, undefined, false),
    ).toEqual({
      kind: 'link',
      value: '[[Meeting Notes|Today]]',
    })
  })
  it('reads a markdown link naming a page as a connection, label and all', () => {
    expect(
      linkValueFromEdit('[Today](Meeting%20Notes)', undefined, notes, undefined, false),
    ).toEqual({
      kind: 'link',
      value: '[[Meeting Notes|Today]]',
    })
  })
  it('drops an alias that merely repeats the title', () => {
    expect(
      linkValueFromEdit('[[Meeting Notes|meeting notes]]', undefined, notes, undefined, false),
    ).toEqual({
      kind: 'link',
      value: '[[Meeting Notes]]',
    })
  })
  it('refuses a title no page answers to', () => {
    expect(linkValueFromEdit('[[Nowhere]]', undefined, notes, undefined, false)).toBeUndefined()
  })
  it('reads a markdown link over an address as the aliased URL', () => {
    expect(
      linkValueFromEdit('[My Site](https://example.com)', undefined, notes, undefined, false),
    ).toEqual({
      kind: 'link',
      value: '[My Site](https://example.com)',
    })
  })
  it('shows the page it names, ignoring every link format', () => {
    for (const display of LINK_DISPLAYS)
      expect(linkDisplayText('[[Meeting Notes]]', display)).toBe('Meeting Notes')
    expect(linkDisplayText('[[Meeting Notes|Today]]', 'link-short')).toBe('Today')
  })
  it('shows a heading link as the editor draws it, and a markdown link by its default label', () => {
    expect(linkDisplayText('[[#H]]')).toBe('H')
    expect(linkDisplayText('[[P#H]]')).toBe('P § H')
    expect(linkDisplayText('[](P#H)')).toBe('H')
    expect(linkDisplayText('[](P)')).toBe('P')
    expect(linkDisplayText('[[P|nice]]')).toBe('nice')
  })
  it('shownProse replaces each connection in a text with what it shows', () => {
    expect(shownProse('[[Alpha|nice]] notes')).toBe('nice notes')
    expect(shownProse('[[P#H]] and [x](https://a.com)')).toBe('P § H and x')
    expect(shownProse('plain text')).toBe('plain text')
    expect(shownProse('`[[Alpha]]` stays')).toBe('`[[Alpha]]` stays')
  })
  it('edits as itself', () => {
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
  it('renames a markdown page link as a wikilink, where one spells', () => {
    expect(linkValueFromRename('Today', '[x](Meeting%20Notes#H)')).toEqual({
      kind: 'link',
      value: '[[Meeting Notes#H|Today]]',
    })
    expect(linkValueFromRename('a]b', '[[Page]]')).toEqual({ kind: 'link', value: '[a\\]b](Page)' })
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
    expect(move('[[Meeting Notes#Decisions|D]]', 'A|B')).toBe('[D](Meeting%20Notes#A%7CB)')
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
    expect(rewriteConnections('[[Meeting Notes#Decisions]]', 'Meeting Notes', 'New Title')).toBe(
      '[[New Title#Decisions]]',
    )
    expect(linkEditText('[[Meeting Notes#Decisions]]')).toBe('[[Meeting Notes#Decisions]]')
    expect(
      linkValueFromEdit('[[meeting notes#Decisions]]', undefined, notes, undefined, false),
    ).toEqual({
      kind: 'link',
      value: '[[Meeting Notes#Decisions]]',
    })
    expect(
      linkValueFromEdit('[Label](Meeting%20Notes#Decisions)', undefined, notes, undefined, false),
    ).toEqual({
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
  const CONNECTION = '[[Meeting Notes|Today]]'

  it('Edit opens on the page alone, as an address opens on the address', () => {
    expect(linkEditText(CONNECTION)).toBe('[[Meeting Notes]]')
    expect(linkEditText('[My Site](https://example.com)')).toBe('https://example.com')
  })
  it('Edit swaps a connection for an address, and an address back for a connection', () => {
    expect(linkValueFromEdit('example.com', CONNECTION, notes, undefined, false)).toEqual({
      kind: 'link',
      value: 'https://example.com',
    })
    expect(
      linkValueFromEdit('example.org', '[My Site](https://example.com)', notes, undefined, true),
    ).toEqual({
      kind: 'link',
      value: '[My Site](https://example.org)',
    })
    expect(linkValueFromEdit(CONNECTION, 'https://example.com', notes, undefined, false)).toEqual({
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
  it('an alias the wikilink grammar cannot spell is written in the markdown form', () => {
    expect(linkValueFromRename('Notes] done', '[[Meeting Notes]]')).toEqual({
      kind: 'link',
      value: '[Notes\\] done](Meeting%20Notes)',
    })
  })
})

describe('a Link value’s Edit commit', () => {
  const holder = { id: 'h', title: 'Holder', path: 'Holder.md' }
  const index = buildPageIndex([
    { id: 'a', title: 'Alpha', path: 'Alpha.md' },
    { id: 'b', title: 'Beta', path: 'Beta.md' },
    { id: 'd1', title: 'Dup', path: 'A/Dup.md' },
    { id: 'd2', title: 'Dup', path: 'B/Dup.md' },
  ])
  const commit = (raw: string, current?: string, keepTitle = false, held = true) => {
    const next = linkValueFromEdit(raw, current, index, held ? holder : undefined, keepTitle)
    return next?.kind === 'link' ? next.value : next
  }

  it('names a resolved page by its title, and refuses a shared or missing one', () => {
    expect(commit('[[alpha]]')).toBe('[[Alpha]]')
    expect(commit('[[Dup]]')).toBeUndefined()
    expect(commit('[x](Nope)')).toBeUndefined()
  })
  it('a bare heading commits on a page, and is refused where nothing holds the value', () => {
    expect(commit('[[#Setup]]')).toBe('[[#Setup]]')
    expect(commit('[[#Setup]]', undefined, false, false)).toBeUndefined()
  })
  it('an address commits with a scheme, written in a link or bare', () => {
    expect(commit('[x](example.com)')).toBe('[x](https://example.com)')
    expect(commit('example.com')).toBe('https://example.com')
  })
  it('a new target keeps the old alias only when the setting keeps it, and the same target always', () => {
    expect(commit('[[Alpha]]', '[[Beta|Mine]]', true)).toBe('[[Alpha|Mine]]')
    expect(commit('[[Alpha]]', '[[Beta|Mine]]', false)).toBe('[[Alpha]]')
    expect(commit('https://b.com', '[x](https://a.com)', false)).toBe('https://b.com')
    expect(commit('[[beta]]', '[[Beta|Mine]]', false)).toBe('[[Beta|Mine]]')
  })
  it('a new target keeps the old alias where the old value named no page', () => {
    expect(commit('[[Alpha]]', '[[Nope|Mine]]', false)).toBe('[[Alpha|Mine]]')
  })
  it('a page is stored as a connection whatever the old value was', () => {
    expect(commit('[[Alpha]]', '[x](https://a.com)')).toBe('[[Alpha]]')
  })
})

describe('shownAlias — what a landed link remembers, against how it read before', () => {
  const index = buildPageIndex([
    { id: 'a', title: 'Alpha', path: 'Alpha.md' },
    { id: 'n', title: 'notes.io', path: 'notes.io.md' },
  ])
  it('never remembers a label that only named the old target, written as it was, resolved or not', () => {
    expect(shownAlias('[Draft](Alpha)', index, '[Draft](Draft)')).toBeNull()
    expect(shownAlias('[Draft](Alpha)', index, '[[Alpha|Draft]]')).toBeNull()
    expect(shownAlias('[Draft](Alpha)', index, '[[Alpha|Old]]')).toEqual({
      page: index.resolve('Alpha').page,
      alias: 'Draft',
    })
  })
  it('reads an address-shaped page the link named before as that page', () => {
    expect(shownAlias('[[notes.io|x]]', index, '[x](notes.io)')).toBeNull()
    expect(shownAlias('[[notes.io|y]]', index, '[x](notes.io)')).toEqual({
      page: index.resolve('notes.io').page,
      alias: 'y',
    })
  })
})

describe('resolvedTarget — a written link as the page it resolves to', () => {
  const index = buildPageIndex([
    { id: 'a', title: 'Alpha', path: 'Alpha.md' },
    { id: 'n', title: 'notes.io', path: 'notes.io.md' },
  ])
  it('writes a resolved page by its own title in the syntax it was written, and keeps a bare heading bare', () => {
    expect(resolvedTarget(readLinkText('[[alpha#H|x]]')!, index)).toEqual({
      kind: 'page',
      syntax: 'wiki',
      title: 'Alpha',
      heading: 'H',
      alias: 'x',
    })
    expect(resolvedTarget(readLinkText('[x](notes.io)')!, index)).toEqual({
      kind: 'page',
      syntax: 'markdown',
      title: 'notes.io',
      alias: 'x',
    })
    const own = { id: 'h', title: 'Holder', path: 'Holder.md' }
    expect(resolvedTarget(readLinkText('[[#H]]')!, index, own)).toMatchObject({ title: '' })
  })
  it('leaves an address no page holds, and a phantom, as written', () => {
    for (const text of ['[x](https://a.com)', '[[Nowhere]]'])
      expect(resolvedTarget(readLinkText(text)!, index)).toEqual(readLinkText(text))
  })
})

describe('keepsShown — Remove Title On Link Change over the link as it read before', () => {
  const index = buildPageIndex([
    { id: 'a', title: 'Alpha', path: 'Alpha.md' },
    { id: 'b', title: 'Beta', path: 'Beta.md' },
    { id: 'n', title: 'notes.io', path: 'notes.io.md' },
  ])
  const was = (text: string): LinkTarget | null => readLinkText(text)
  const page = (title: string): LinkTarget => ({ kind: 'page', syntax: 'wiki', title })
  const url = (u: string): LinkTarget => ({ kind: 'url', syntax: 'bare', url: u })

  it('keeps it with the setting off, and for a link that never closed', () => {
    expect(keepsShown(was('[[Alpha|x]]'), page('Beta'), false, index)).toBe(true)
    expect(keepsShown(null, page('Beta'), true, index)).toBe(true)
  })
  it('keeps it where the link pointed nowhere', () => {
    expect(keepsShown(was('[[Nope|x]]'), page('Beta'), true, index)).toBe(true)
    expect(keepsShown(was('[[Alpha|x]]'), page('Beta'), true)).toBe(true)
  })
  it('drops it where a resolved link is re-aimed, unless at the same target', () => {
    expect(keepsShown(was('[[Alpha|x]]'), page('Beta'), true, index)).toBe(false)
    expect(keepsShown(was('[[Alpha|x]]'), page('alpha'), true, index)).toBe(true)
    expect(keepsShown(was('[x](Alpha#H)'), page('Alpha'), true, index)).toBe(false)
  })
  it('counts an address as pointed', () => {
    expect(keepsShown(was('[x](https://a.com)'), url('https://b.com'), true, index)).toBe(false)
    expect(keepsShown(was('[x](https://a.com)'), url('https://a.com'), true, index)).toBe(true)
  })
  it('counts this document’s own heading as pointed', () => {
    expect(keepsShown(was('[[#Intro|x]]'), page('Beta'), true, index)).toBe(false)
    expect(keepsShown(was('[[#Intro|x]]'), was('[[#intro]]') as LinkTarget, true, index)).toBe(true)
  })
  it('reads a destination a page holds as that page', () => {
    expect(keepsShown(was('[x](notes.io)'), page('notes.io'), true, index)).toBe(true)
    expect(keepsShown(was('[x](notes.io)'), page('Beta'), true, index)).toBe(false)
  })
})

describe('retarget — the one writer for a link whose target changes', () => {
  const pageOf = (title: string, alias?: string): LinkTarget => ({
    kind: 'page',
    syntax: 'wiki',
    title,
    ...(alias ? { alias } : {}),
  })
  const urlOf = (url: string): LinkTarget => ({ kind: 'url', syntax: 'bare', url })
  const text = (...args: Parameters<typeof retarget>): string => retarget(...args).text

  it('writes a page the wikilink grammar cannot carry as a markdown link', () => {
    expect(text('wiki', pageOf('A|B'))).toBe('[A|B](A%7CB)')
    expect(text('wiki', pageOf('Draft]', 'x'))).toBe('[x](Draft%5D)')
    expect(text('wiki', { kind: 'page', syntax: 'wiki', title: 'P', heading: 'H]' })).toBe(
      '[H\\]](P#H%5D)',
    )
  })
  it('writes the next target with its alias, in the syntax asked for', () => {
    expect(text('wiki', pageOf('Page2'))).toBe('[[Page2]]')
    expect(text('wiki', pageOf('Page2', 'x'))).toBe('[[Page2|x]]')
    expect(text('markdown', pageOf('Page2'))).toBe('[Page2](Page2)')
    expect(text('markdown', pageOf('Page2', 'y'))).toBe('[y](Page2)')
  })
  it('writes an address in a connection as a weblink under the Default Link Format', () => {
    expect(retarget('wiki', urlOf('https://x.com'), { format: 'link-short' })).toEqual({
      kind: 'link',
      text: '[x.com](https://x.com)',
    })
    expect(retarget('wiki', urlOf('https://x.com'), { format: 'link-title' }).awaits).toBe(
      'https://x.com',
    )
  })
  it('writes a Link value’s address bare, with no format label', () => {
    expect(retarget('wiki', urlOf('https://x.com'))).toEqual({
      kind: 'link',
      text: 'https://x.com',
    })
  })
})

describe('linkPaste — what awaits a title', () => {
  it('awaits only an http address with no cached title under Page Title', () => {
    expect(linkPaste('https://x.com', 'link-title').awaits).toBe('https://x.com')
    expect(linkPaste('https://x.com', 'link-title', 'X').awaits).toBeUndefined()
    expect(linkPaste('https://x.com', 'link-short').awaits).toBeUndefined()
    expect(linkPaste('mailto:a@b.co', 'link-title').awaits).toBeUndefined()
  })
})
