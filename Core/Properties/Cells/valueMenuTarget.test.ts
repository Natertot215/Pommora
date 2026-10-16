import { describe, expect, it } from 'vitest'
import { buildPageIndex, type ConnPage } from '../../Connections/pageIndex'
import { readLinkText, resolveLink } from '../../Connections/linkValue'

const old = { id: 'o', title: 'Old', path: 'Old.md' }
const index = buildPageIndex([
  old,
  { id: 'd1', title: 'Dup', path: 'A/Dup.md' },
  { id: 'd2', title: 'Dup', path: 'B/Dup.md' },
  { id: 'i1', title: 'dup.io', path: 'A/dup.io.md' },
  { id: 'i2', title: 'dup.io', path: 'B/dup.io.md' },
])
const holder = { id: 'h', title: 'Holder', path: 'Holder.md' }
const pointsTo = (raw: string, own?: ConnPage) => resolveLink(readLinkText(raw), index, own)

describe('what a Link value points to', () => {
  it('a connection names its page, alias and all', () => {
    expect(pointsTo('[[Old|a]]')).toEqual({ kind: 'page', page: old })
  })

  it('a bare heading names the page holding the value', () => {
    expect(pointsTo('[[#H]]', holder)).toEqual({ kind: 'page', page: holder, heading: 'H' })
  })

  it('a heading connection carries its heading', () => {
    expect(pointsTo('[[Old#Setup]]')).toEqual({ kind: 'page', page: old, heading: 'Setup' })
  })

  it('a title two pages share is ambiguous in either syntax, never an address', () => {
    expect(pointsTo('[[Dup]]')).toEqual({ kind: 'unresolved', status: 'ambiguous' })
    expect(pointsTo('[x](dup.io)')).toEqual({ kind: 'unresolved', status: 'ambiguous' })
  })

  it('an address names itself, written in a link or bare', () => {
    expect(pointsTo('[x](example.com)')).toEqual({ kind: 'url', url: 'example.com' })
    expect(pointsTo('https://a.com')).toEqual({ kind: 'url', url: 'https://a.com' })
  })

  it('text that is neither, or more than one link, names nothing', () => {
    expect(pointsTo('foo')).toEqual({ kind: 'unresolved', status: 'phantom' })
    expect(pointsTo('[a](b) [c](d)')).toEqual({ kind: 'unresolved', status: 'phantom' })
  })
})
