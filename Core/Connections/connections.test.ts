import { describe, it, expect } from 'vitest'
import {
  aliasSpells,
  expressibleInLink,
  keepsAlias,
  linkOccurrences,
  namesTarget,
  pageLinkText,
  repeatsTarget,
  spellsAsWiki,
} from './connections'
import { codeMask } from '../MarkdownPM/Engine/markdownCode'
import { targetTitle } from './links'
import { readLinkText } from './linkValue'

const walk = (text: string) => linkOccurrences(text, codeMask(text))

describe('linkOccurrences', () => {
  it('reads a connection’s slots, empty ones kept, and the cell escape off the half before the pipe', () => {
    expect(walk('a [[P#H|al]]')).toEqual([
      { syntax: 'wiki', full: [2, 12], title: [4, 5], heading: [6, 7], shown: [8, 10] },
    ])
    expect(walk('[[P|]] [[Q#]]').map((o) => [o.shown, o.heading])).toEqual([
      [[4, 4], null],
      [null, [11, 11]],
    ])
    expect(walk('[[P\\|al]]')[0]).toMatchObject({ title: [2, 3], shown: [5, 7] })
    expect(walk('[[]] [[|x]]')).toEqual([])
  })

  it('reads a markdown link’s title, heading, and shown label', () => {
    expect(walk('[x](Page#H)')).toEqual([
      { syntax: 'markdown', full: [0, 11], title: [4, 8], heading: [9, 10], shown: [1, 2] },
    ])
  })

  it('keeps an empty label and refuses an empty destination', () => {
    expect(walk('[](Page)')).toEqual([
      { syntax: 'markdown', full: [0, 8], title: [3, 7], heading: null, shown: [1, 1] },
    ])
    expect(walk('[x]()')).toEqual([])
  })

  it('yields both syntaxes in start order', () => {
    expect(walk('[b](B) [[A]]').map((o) => o.syntax)).toEqual(['markdown', 'wiki'])
    expect(walk('[[A]] [b](B)').map((o) => o.syntax)).toEqual(['wiki', 'markdown'])
  })

  it('a `!` before a connection is text', () => {
    expect(walk('see ![[P]]').map((o) => o.full)).toEqual([[5, 10]])
  })

  it('a markdown link overlapping a connection yields to it', () => {
    expect(walk('[x]([[T]])').map((o) => o.syntax)).toEqual(['wiki'])
    expect(walk('[[T]](x)').map((o) => o.syntax)).toEqual(['wiki'])
  })

  it('a link code touches is text: in a fence, starting in code, or holding code', () => {
    expect(walk('```\n[[A]]\n```')).toEqual([])
    expect(walk('x `[[A`]] y')).toEqual([])
    expect(walk('[[A `b` C]] [x](`y`)')).toEqual([])
    expect(walk('[[A]] `b`').map((o) => o.syntax)).toEqual(['wiki'])
  })

  it('an unclosed backtick inside a link is not code', () => {
    expect(walk('[[A `b]]').map((o) => o.syntax)).toEqual(['wiki'])
  })
})

describe('pageLinkText and the slot rules', () => {
  it('writes a bare-fragment target with an empty title', () => {
    expect(pageLinkText({ title: '', heading: 'H' }, 'wiki')).toBe('[[#H]]')
  })
  it('writes the heading before the alias, and spells a present-but-empty slot', () => {
    expect(pageLinkText({ title: 'A', heading: 'H', shown: 'x' }, 'wiki')).toBe('[[A#H|x]]')
    expect(pageLinkText({ title: 'A', heading: '', shown: '' }, 'wiki')).toBe('[[A#|]]')
  })
  it('writes the markdown form where asked, or where a wikilink cannot spell a slot', () => {
    expect(pageLinkText({ title: 'A', heading: 'H', shown: 'x' }, 'markdown')).toBe('[x](A#H)')
    expect(pageLinkText({ title: 'A', shown: 'a]b' }, 'wiki')).toBe('[a\\]b](A)')
    expect(pageLinkText({ title: 'A|B' }, 'wiki')).toBe('[A|B](A%7CB)')
    expect(pageLinkText({ title: 'P', heading: 'x'.repeat(256) }, 'wiki')).toBe(
      `[](P#${'x'.repeat(256)})`,
    )
  })
  it('empties a markdown label the grammar refuses, overlong or opening as a footnote, so the link still reads', () => {
    expect(pageLinkText({ title: '^foo' }, 'markdown')).toBe('[](%5Efoo)')
    expect(
      readLinkText(pageLinkText({ title: 'A', shown: 'x'.repeat(256) }, 'wiki')),
    ).toMatchObject({ kind: 'page', syntax: 'markdown', title: 'A' })
  })
  it('labels a markdown link by its heading, else its title, where none is given', () => {
    expect(pageLinkText({ title: 'P' }, 'markdown')).toBe('[P](P)')
    expect(pageLinkText({ title: 'P', heading: 'H' }, 'markdown')).toBe('[H](P#H)')
    expect(pageLinkText({ title: '', heading: 'H' }, 'markdown')).toBe('[H](#H)')
  })
  it('a markdown title holding `#` reads back as itself', () => {
    const text = pageLinkText({ title: 'C# Notes', heading: 'Intro' }, 'markdown')
    const [o] = linkOccurrences(text, () => false)
    expect(targetTitle(text.slice(...o.title), o.heading !== null)).toBe('C# Notes')
  })
  it('drops shown text that only repeats the target, asked of the title and heading together', () => {
    expect(pageLinkText({ title: 'Alpha', shown: 'alpha' }, 'wiki')).toBe('[[Alpha]]')
    expect(pageLinkText({ title: 'Page', heading: 'Intro', shown: 'Intro' }, 'wiki')).toBe(
      '[[Page#Intro|Intro]]',
    )
    expect(pageLinkText({ title: 'Page', heading: 'Intro', shown: 'page#intro' }, 'wiki')).toBe(
      '[[Page#Intro]]',
    )
  })
  it('refuses text that would end a link early or split it, or overflow the slot', () => {
    expect(expressibleInLink('a|b')).toBe(false)
    expect(expressibleInLink('C#')).toBe(false)
    expect(expressibleInLink('x]')).toBe(false)
    expect(expressibleInLink('A]]B')).toBe(false)
    expect(expressibleInLink('A]B')).toBe(true)
    expect(expressibleInLink('x'.repeat(256))).toBe(false)
    expect(aliasSpells('a]b')).toBe(false)
    expect(aliasSpells('a#b|c')).toBe(true)
    expect(spellsAsWiki({ title: 'A', heading: 'H', shown: 'x' })).toBe(true)
    expect(spellsAsWiki({ title: 'A', shown: 'x]' })).toBe(false)
    expect(spellsAsWiki({ title: 'A', heading: 'H|I' })).toBe(false)
  })
})

describe('repeatsTarget and namesTarget', () => {
  it('repeats the target as `title` or `title#heading`, case folded', () => {
    expect(repeatsTarget('alpha', 'Alpha')).toBe(true)
    expect(repeatsTarget('alpha', 'Alpha', 'H')).toBe(false)
    expect(repeatsTarget('alpha#h', 'Alpha', 'H')).toBe(true)
  })
  it('names the target by its title, its heading, or both', () => {
    expect(namesTarget('Alpha', { title: 'Alpha', heading: 'H' })).toBe('title')
    expect(namesTarget('h', { title: 'Alpha', heading: 'H' })).toBe('heading')
    expect(namesTarget('Alpha#H', { title: 'Alpha', heading: 'H' })).toBe('both')
    expect(namesTarget('H', { title: 'Alpha' })).toBeNull()
    expect(namesTarget('Mine', { title: 'Alpha', heading: 'H' })).toBeNull()
  })
})

describe('keepsAlias', () => {
  it('refuses a blank name, one past the slot’s 255 characters, one holding `]`, and the title', () => {
    expect(keepsAlias('', 'Alpha')).toBe(false)
    expect(keepsAlias('  ', 'Alpha')).toBe(false)
    expect(keepsAlias('x'.repeat(256), 'Alpha')).toBe(false)
    expect(keepsAlias('x'.repeat(255), 'Alpha')).toBe(true)
    expect(keepsAlias('a]b', 'Alpha')).toBe(false)
    expect(keepsAlias('alpha', 'Alpha')).toBe(false)
  })
})
