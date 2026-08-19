import { describe, it, expect } from 'vitest'
import { linkDestinationAt } from './webpageEmbed'

describe('linkDestinationAt — is the caret inside a destination', () => {
  it('sees the empty embed pair the door seats the caret in', () => {
    // `![]()` — the caret lands at col 4, between the parens.
    expect(linkDestinationAt('![]()', 4)).toBe(true)
  })

  it('sees an empty destination behind a written label', () => {
    // `[label]()` — col 8 is between the parens.
    expect(linkDestinationAt('[label]()', 8)).toBe(true)
  })

  it('sees the inside of a full link, edges included', () => {
    const line = '[docs](https://example.com) tail'
    const open = line.indexOf('(')
    const close = line.indexOf(')')
    expect(linkDestinationAt(line, open + 1)).toBe(true)
    expect(linkDestinationAt(line, close)).toBe(true)
    expect(linkDestinationAt(line, open + 5)).toBe(true)
  })

  it('says no everywhere else on the same line', () => {
    const line = '[docs](https://example.com) tail'
    expect(linkDestinationAt(line, 0)).toBe(false)
    expect(linkDestinationAt(line, 2)).toBe(false) // inside the label
    expect(linkDestinationAt(line, line.indexOf('('))).toBe(false) // before the paren
    expect(linkDestinationAt(line, line.length)).toBe(false) // in the tail
  })

  it('says no on a line with no link at all', () => {
    expect(linkDestinationAt('plain prose with (parens)', 20)).toBe(false)
  })

  it('reads each link on a many-link line separately', () => {
    const line = '[a](https://a.com) and [b](https://b.com)'
    expect(linkDestinationAt(line, 5)).toBe(true)
    expect(linkDestinationAt(line, 20)).toBe(false)
    expect(linkDestinationAt(line, 30)).toBe(true)
  })

  it('sees a destination still open before the caret', () => {
    // Mid-typing: `](` with no `)` yet — the shape the smart-dash guard also reads.
    const line = '[docs](https://ex'
    expect(linkDestinationAt(line, line.length)).toBe(true)
    expect(linkDestinationAt('[docs](https://ex) after', 20)).toBe(false)
  })

  it('follows a destination through balanced parens', () => {
    const line = '[w](https://en.wikipedia.org/wiki/A_(b)_c) tail'
    expect(linkDestinationAt(line, line.indexOf('_c)'))).toBe(true)
    expect(linkDestinationAt(line, line.length)).toBe(false)
  })

  it('reads the embed form through its bang', () => {
    const line = '![label](https://example.com)'
    expect(linkDestinationAt(line, 12)).toBe(true)
    expect(linkDestinationAt(line, 4)).toBe(false)
  })
})
