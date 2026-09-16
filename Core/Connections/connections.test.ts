import { describe, it, expect } from 'vitest'
import {
  aliasSpanAt,
  connectionText,
  embeddableTitle,
  normalizeTitle,
  parseConnectionText,
} from './connections'

describe('normalizeTitle', () => {
  it('trims surrounding whitespace/newlines and case-folds', () => {
    expect(normalizeTitle('  My Page \n')).toBe('my page')
    expect(normalizeTitle('PROJECT')).toBe('project')
  })

  it('collapses titles that differ only by case/whitespace to one key', () => {
    expect(normalizeTitle(' Notes')).toBe(normalizeTitle('notes '))
  })

  it('NFC-normalizes so NFD and NFC spellings collapse to one key', () => {
    expect(normalizeTitle('Café')).toBe(normalizeTitle('Café'))
  })
})

describe('aliasSpanAt', () => {
  const line = 'see [[Q3 Plan|the plan]] end'
  it('finds the alias span from anywhere inside it', () => {
    expect(
      line.slice(...(aliasSpanAt(line, line.indexOf('the plan') + 3) as [number, number])),
    ).toBe('the plan')
  })
  it('includes both ends, so a `]` at either is still refused', () => {
    expect(aliasSpanAt(line, line.indexOf('the plan'))).not.toBeNull()
    expect(aliasSpanAt(line, line.indexOf('the plan') + 'the plan'.length)).not.toBeNull()
  })
  it('is null in the title, in the prose, and in an unaliased link', () => {
    expect(aliasSpanAt(line, line.indexOf('Q3') + 1)).toBeNull()
    expect(aliasSpanAt(line, 1)).toBeNull()
    expect(aliasSpanAt('see [[Q3 Plan]] end', 8)).toBeNull()
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
  it('reads a bare `#` as an empty page with no heading', () => {
    expect(parseConnectionText('[[#]]')).toEqual({ title: '' })
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
