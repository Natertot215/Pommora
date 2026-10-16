import { describe, it, expect } from 'vitest'
import {
  connectionText,
  expressibleInLink,
  keepsAlias,
  linkOccurrences,
  parseConnectionText,
} from './connections'
import { codeMask } from '../MarkdownPM/Engine/markdownCode'

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

describe('parseConnectionText', () => {
  it('splits a page and heading', () => {
    expect(parseConnectionText('[[Page#Heading]]')).toEqual({ title: 'Page', heading: 'Heading' })
  })
  it('names the containing page with an empty title', () => {
    expect(parseConnectionText('[[#Heading]]')).toEqual({ title: '', heading: 'Heading' })
  })
  it('carries an alias alongside a heading', () => {
    expect(parseConnectionText('[[Page#Heading|alias]]')).toEqual({
      title: 'Page',
      heading: 'Heading',
      alias: 'alias',
    })
  })
  it('reads an empty heading as absent', () => {
    expect(parseConnectionText('[[Page#]]')).toEqual({ title: 'Page' })
  })
  it('reads a bare `#` as nothing, a link still being written', () => {
    expect(parseConnectionText('[[#]]')).toBeNull()
  })
  it('is null with neither a title nor a heading', () => {
    expect(parseConnectionText('[[]]')).toBeNull()
    expect(parseConnectionText('[[|x]]')).toBeNull()
  })
  it('strips the cell escape from the heading, not the title, when both precede a pipe', () => {
    expect(parseConnectionText('[[Page#Heading\\|alias]]')).toEqual({
      title: 'Page',
      heading: 'Heading',
      alias: 'alias',
    })
  })
})

describe('connectionText and expressibleInLink', () => {
  it('writes a bare-fragment target with an empty title', () => {
    expect(connectionText('', 'H')).toBe('[[#H]]')
  })
  it('writes the heading before the alias, and spells a present-but-empty slot', () => {
    expect(connectionText('A', 'H', 'x')).toBe('[[A#H|x]]')
    expect(connectionText('A', '', '')).toBe('[[A#|]]')
  })
  it('refuses text that would end a link early or split it', () => {
    expect(expressibleInLink('a|b')).toBe(false)
    expect(expressibleInLink('C#')).toBe(false)
    expect(expressibleInLink('x]')).toBe(false)
    expect(expressibleInLink('A]]B')).toBe(false)
    expect(expressibleInLink('A]B')).toBe(true)
  })
})

describe('keepsAlias', () => {
  it('refuses a blank name, one past the slot’s 255 characters, and the target', () => {
    expect(keepsAlias('', 'Alpha')).toBe(false)
    expect(keepsAlias('  ', 'Alpha')).toBe(false)
    expect(keepsAlias('x'.repeat(256), 'Alpha')).toBe(false)
    expect(keepsAlias('x'.repeat(255), 'Alpha')).toBe(true)
    expect(keepsAlias('alpha', 'Alpha')).toBe(false)
  })

  it('connectionText drops an alias it refuses', () => {
    expect(connectionText('Alpha', undefined, '   ')).toBe('[[Alpha]]')
    expect(connectionText('Alpha', undefined, 'x'.repeat(256))).toBe('[[Alpha]]')
  })
})
