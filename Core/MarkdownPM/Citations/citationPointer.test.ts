import { describe, expect, it } from 'vitest'
import { loneTarget } from './citationPointer'
import { tokenTarget } from '../Links/connectionsApi'
import { buildPageIndex } from '../../Connections/pageIndex'

const page = { id: 'p1', title: 'Some Page', path: 'Some Page.md' }
const index = buildPageIndex([page])
const target = (content: string) => {
  const lone = loneTarget(content)
  return lone && tokenTarget(index, lone.text, lone.tk)
}

describe('what a citation leads to, when it leads anywhere', () => {
  it('a lone Connection is followed', () => {
    expect(target('[[Some Page]]')).toEqual({ kind: 'page', page })
  })

  it('an aliased Connection follows the page it names, not the words it wears', () => {
    expect(target('[[Some Page|the words]]')).toEqual({ kind: 'page', page })
  })

  it('a heading link carries its heading, and a bare fragment names this page', () => {
    expect(target('[[Some Page#Setup]]')).toEqual({ kind: 'page', page, heading: 'Setup' })
    expect(target('[[#Setup]]')).toEqual({ kind: 'self', heading: 'Setup' })
  })

  it('a lone markdown link is followed', () => {
    expect(target('[label](https://example.com)')).toEqual({
      kind: 'external',
      url: 'https://example.com',
    })
  })

  it('surrounding whitespace is not trailing content', () => {
    expect(target('  [[Some Page]]  ')).toEqual({ kind: 'page', page })
  })

  it('a trailing period means it is not a lone target', () => {
    expect(loneTarget('[label](https://example.com).')).toBeNull()
    expect(loneTarget('[[Some Page]].')).toBeNull()
  })

  it('leading words mean it is not a lone target either', () => {
    expect(loneTarget('see [[Some Page]]')).toBeNull()
  })

  it('two links are not one link', () => {
    expect(loneTarget('[a](https://a.com) [b](https://b.com)')).toBeNull()
  })

  it('plain prose leads nowhere', () => {
    expect(loneTarget('just the citation text')).toBeNull()
  })

  it('an empty citation leads nowhere', () => {
    expect(loneTarget('')).toBeNull()
    expect(loneTarget('   ')).toBeNull()
  })

  it('a bare url with no link syntax is not a lone link', () => {
    expect(loneTarget('https://example.com')).toBeNull()
  })
})
