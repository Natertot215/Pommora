import { describe, it, expect } from 'vitest'
import { composeWebpageEmbedLine, linkDestinationAt, loneWebpageEmbed } from './webpageEmbed'

const URL = 'https://www.example.com/a/b'

describe('loneWebpageEmbed — what a webpage-embed line is', () => {
  it('reads the lone line, empty label included', () => {
    expect(loneWebpageEmbed(`![](${URL})`)).toEqual({ label: '', url: URL })
    expect(loneWebpageEmbed(`![Docs](${URL})`)).toEqual({ label: 'Docs', url: URL })
    expect(loneWebpageEmbed(`![Docs](${URL})   `)).toEqual({ label: 'Docs', url: URL })
  })

  it('unescapes the label it returns', () => {
    expect(loneWebpageEmbed(`![Notes \\[WIP\\]](${URL})`)).toEqual({
      label: 'Notes [WIP]',
      url: URL,
    })
  })

  it('requires an explicit http(s) scheme on a valid address', () => {
    for (const bad of [
      'file:///etc/hosts',
      'javascript:alert(1)',
      'mailto:a@b.com',
      'www.example.com',
      'example.com/path',
      'https://',
      'https://nodot',
    ])
      expect(loneWebpageEmbed(`![](${bad})`), bad).toBeNull()
  })

  it('refuses the degenerate and the non-lone shapes', () => {
    expect(loneWebpageEmbed('![]()')).toBeNull()
    expect(loneWebpageEmbed(`  ![](${URL})`)).toBeNull() // indented — list continuation
    expect(loneWebpageEmbed(`![](${URL}) tail`)).toBeNull()
    expect(loneWebpageEmbed(`lead ![](${URL})`)).toBeNull()
    expect(loneWebpageEmbed(`[](${URL})`)).toBeNull() // no bang — an ordinary link
  })

  it('refuses a label whose ] is unescaped, and an unbalanced destination', () => {
    expect(loneWebpageEmbed(`![a]b](${URL})`)).toBeNull()
    expect(loneWebpageEmbed('![](https://example.com/a(b)')).toBeNull()
  })

  it('follows a destination through balanced parens', () => {
    const wiki = 'https://en.wikipedia.org/wiki/A_(b)'
    expect(loneWebpageEmbed(`![](${wiki})`)).toEqual({ label: '', url: wiki })
  })
})

describe('composeWebpageEmbedLine — the ONE assembly path', () => {
  it('writes the line the detector reads back — brackets and backslashes included', () => {
    for (const label of ['', 'Docs', 'Notes [WIP]', 'a\\b', ']]', 'Chapter [2]']) {
      const line = composeWebpageEmbedLine(label, URL)
      expect(loneWebpageEmbed(line), JSON.stringify(label)).toEqual({ label, url: URL })
    }
  })

  it('writes the bare form for an empty label', () => {
    expect(composeWebpageEmbedLine('', URL)).toBe(`![](${URL})`)
  })
})

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
