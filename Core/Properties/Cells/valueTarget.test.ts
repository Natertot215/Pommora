import { describe, expect, it } from 'vitest'
import { buildPageIndex } from '../../Connections/pageIndex'
import type { ConnectionsApi } from '../../MarkdownPM/Links/connectionsApi'
import { valueTarget } from './valueTarget'

const old = { id: 'o', title: 'Old', path: 'Old.md' }
const api: ConnectionsApi = {
  ...buildPageIndex([
    old,
    { id: 'd1', title: 'Dup', path: 'A/Dup.md' },
    { id: 'd2', title: 'Dup', path: 'B/Dup.md' },
    { id: 'i1', title: 'dup.io', path: 'A/dup.io.md' },
    { id: 'i2', title: 'dup.io', path: 'B/dup.io.md' },
  ]),
  headingsOf: () => undefined,
  location: () => [],
  open: () => {},
}
const holder = { id: 'h', title: 'Holder', path: 'Holder.md' }

describe('what a Link value points to', () => {
  it('a connection names its page, alias and all', () => {
    expect(valueTarget(api, '[[Old|a]]')).toEqual({ kind: 'page', page: old })
  })

  it('a bare heading names the page holding the value', () => {
    expect(valueTarget(api, '[[#H]]', holder)).toEqual({ kind: 'page', page: holder, heading: 'H' })
  })

  it('a title two pages share is ambiguous in either syntax, never an address', () => {
    expect(valueTarget(api, '[[Dup]]')).toEqual({ kind: 'invalid', ambiguous: true })
    expect(valueTarget(api, '[x](dup.io)')).toEqual({ kind: 'invalid', ambiguous: true })
  })

  it('an address names itself, written in a link or bare', () => {
    expect(valueTarget(api, '[x](example.com)')).toEqual({ kind: 'url', url: 'example.com' })
    expect(valueTarget(api, 'https://a.com')).toEqual({ kind: 'url', url: 'https://a.com' })
  })

  it('text that is neither, or more than one link, names nothing', () => {
    expect(valueTarget(api, 'foo')).toEqual({ kind: 'invalid' })
    expect(valueTarget(api, '[a](b) [c](d)')).toEqual({ kind: 'invalid' })
  })
})
