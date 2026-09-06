import { describe, expect, it } from 'vitest'
import { loneTarget } from './citationPointer'

// B-6, the click-through condition, defined once: the citation's ENTIRE content is exactly one link
// or exactly one Connection. Anything trailing means it is not that, and the click jumps instead.
describe('what a citation leads to, when it leads anywhere', () => {
  it('a lone Connection is followed', () => {
    expect(loneTarget('[[Some Page]]')).toEqual({ kind: 'connection', title: 'Some Page' })
  })

  it('an aliased Connection follows the page it names, not the words it wears', () => {
    expect(loneTarget('[[Some Page|the words]]')).toEqual({
      kind: 'connection',
      title: 'Some Page',
    })
  })

  it('a lone markdown link is followed', () => {
    expect(loneTarget('[label](https://example.com)')).toEqual({
      kind: 'link',
      url: 'https://example.com',
    })
  })

  it('surrounding whitespace is not trailing content', () => {
    expect(loneTarget('  [[Some Page]]  ')).toEqual({ kind: 'connection', title: 'Some Page' })
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
