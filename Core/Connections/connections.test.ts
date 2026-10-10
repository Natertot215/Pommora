import { describe, it, expect } from 'vitest'
import {
  connectionText,
  embeddableTitle,
  linkOccurrences,
  parseConnectionText,
} from './connections'
import { codeMask } from '../MarkdownPM/Engine/markdownCode'

const walk = (text: string) => linkOccurrences(text, codeMask(text))

describe('linkOccurrences', () => {
  it('reads a connection’s slots, empty ones kept, and the cell escape off the half before the pipe', () => {
    expect(walk('a [[P#H|al]]')).toEqual([
      { syntax: 'wiki', full: [2, 12], title: [4, 5], heading: [6, 7], alias: [8, 10] },
    ])
    expect(walk('[[P|]] [[Q#]]').map((o) => o.syntax === 'wiki' && [o.alias, o.heading])).toEqual([
      [[4, 4], null],
      [null, [11, 11]],
    ])
    expect(walk('[[P\\|al]]')[0]).toMatchObject({ title: [2, 3], alias: [5, 7] })
    expect(walk('[[]] [[|x]]')).toEqual([])
  })

  it('reads a markdown link’s label and destination', () => {
    expect(walk('[x](Page#H)')).toEqual([
      { syntax: 'markdown', full: [0, 11], label: [1, 2], destination: [4, 10] },
    ])
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

describe('connectionText and embeddableTitle', () => {
  it('writes a bare-fragment target with an empty title, and refuses `#` in an embed title', () => {
    expect(connectionText('', undefined, 'H')).toBe('[[#H]]')
    expect(embeddableTitle('C#')).toBe(false)
  })
})
