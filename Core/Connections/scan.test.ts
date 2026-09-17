// `pageLinkPattern` has four other consumers (the rewrite, the editor's tokens, its autocomplete, and paste-as), so the ReDoS and length-cap assertions below guard all of them, not just this file.

import { describe, it, expect } from 'vitest'
import { codeMask } from '../MarkdownPM/Engine/markdownCode'
import {
  extractHeadingMentions,
  extractMentions,
  frontmatterMentions,
  mentionsTitle,
  sectionRunsIn,
} from './scan'

describe('mentionsTitle', () => {
  it('matches a page link by its normalized title', () => {
    expect(mentionsTitle('See [[Alpha]] and [[Beta Page]].', 'alpha')).toBe(true)
    expect(mentionsTitle('See [[Alpha]] and [[Beta Page]].', 'beta page')).toBe(true)
    expect(mentionsTitle('See [[Alpha]].', 'gamma')).toBe(false)
  })

  it('normalizes case and surrounding whitespace on both sides', () => {
    expect(mentionsTitle('[[ ALPHA ]]', 'alpha')).toBe(true)
  })

  it('reaches an embed as well as a link, and ignores {{ }}', () => {
    expect(mentionsTitle('![[Cover]]', 'cover')).toBe(true)
    expect(mentionsTitle('{{macro}}', 'macro')).toBe(false)
  })

  it('drops a legacy pipe segment', () => {
    expect(mentionsTitle('[[Real|01H9XYZ]]', 'real')).toBe(true)
  })

  it('never matches an empty or whitespace-only link', () => {
    expect(mentionsTitle('[[]] [[   ]]', '')).toBe(false)
  })

  it('does not match inside code — a sample names no page', () => {
    expect(mentionsTitle('```\n[[Fenced]]\n```', 'fenced')).toBe(false)
    expect(mentionsTitle('type `[[Inline]]` here', 'inline')).toBe(false)
    expect(mentionsTitle('```\n[[Fenced]]\n```\nthen [[Real]]', 'real')).toBe(true)
  })

  it('tolerates internal brackets in a title (a `]` is content unless it closes the pair)', () => {
    expect(mentionsTitle('see [[Notes [WIP] final]]', 'notes [wip] final')).toBe(true)
    expect(mentionsTitle('[[A]] then [[B]]', 'b')).toBe(true)
  })

  it('caps title length and never backtracks on a pathological bracket run (ReDoS guard)', () => {
    // Under an unbounded `+` this would hang for seconds — completing at all IS the guard.
    expect(mentionsTitle('['.repeat(50000), 'x')).toBe(false)
    expect(mentionsTitle(`[[a|${'['.repeat(50000)}`, 'a')).toBe(false)
    // The title is capped at the filesystem name limit (255): at the bound matches, past it doesn't.
    expect(mentionsTitle(`[[${'x'.repeat(255)}]]`, 'x'.repeat(255))).toBe(true)
    expect(mentionsTitle(`[[${'x'.repeat(256)}]]`, 'x'.repeat(256))).toBe(false)
  })
})

describe('extractMentions MUST AGREE with mentionsTitle', () => {
  // The index's extractor and the cascade's per-file confirmation answer over the same bodies, and a disagreement is a silently skipped rewrite.
  const bodies = [
    'plain [[Alpha]] link',
    'aliased [[Alpha|shown words]] link',
    'an embed ![[Alpha]] is swept too',
    'markdown [label](Alpha) link',
    'markdown [label](Alpha.md) with extension',
    'a URL [site](https://example.com/Alpha) names no page',
    '```\n[[Alpha]]\n```\ncode is a sample',
    'inline `[[Alpha]]` sample',
    'NFD Álpha as [[Álpha]]',
    'two [[Alpha]] and [[Beta]]',
    'none at all',
  ]
  const titles = ['alpha', 'beta', 'álpha']

  it('yields exactly the titles mentionsTitle affirms, body by body', () => {
    for (const body of bodies) {
      const extracted = extractMentions(body)
      for (const key of titles) {
        expect(extracted.has(key), `"${body}" × "${key}"`).toBe(mentionsTitle(body, key))
      }
    }
  })

  it('extraction reads the concrete set the syntax names', () => {
    expect(extractMentions('see [[Alpha]] and [x](Beta) and ![[Gamma]]')).toEqual(
      new Set(['alpha', 'beta', 'gamma']),
    )
    expect(extractMentions('nothing here')).toEqual(new Set())
  })
})

describe('sectionRunsIn', () => {
  it('matches a bare `§Heading` run against the outline', () => {
    const text = 'see §Setup here'
    const runs = sectionRunsIn(text, ['Setup'], codeMask(text))
    expect(runs).toEqual([{ from: text.indexOf('§'), to: text.indexOf('§') + 6, heading: 'Setup' }])
  })

  it('never matches past the run into a longer word', () => {
    const text = 'see §Overviewing here'
    expect(sectionRunsIn(text, ['Overview'], codeMask(text))).toEqual([])
  })

  it('ends the run at punctuation, not just at a word boundary', () => {
    const text = '§Setup.'
    const runs = sectionRunsIn(text, ['Setup'], codeMask(text))
    expect(runs).toEqual([{ from: 0, to: 6, heading: 'Setup' }])
  })

  it('never matches a `§` inside a code span', () => {
    const text = 'a `§Setup` sample'
    expect(sectionRunsIn(text, ['Setup'], codeMask(text))).toEqual([])
  })

  it('picks the longer heading when one prefixes another', () => {
    const text = '§Setup Guide'
    const runs = sectionRunsIn(text, ['Setup', 'Setup Guide'], codeMask(text))
    expect(runs).toEqual([{ from: 0, to: text.length, heading: 'Setup Guide' }])
  })

  it('never matches a `§` sitting inside a wikilink', () => {
    const text = '[[Page§X]]'
    expect(sectionRunsIn(text, ['X'], codeMask(text))).toEqual([])
  })
})

describe('extractHeadingMentions', () => {
  it('reads a page-and-heading link into both extractors', () => {
    expect(extractMentions('[[Page#H]]')).toEqual(new Set(['page']))
    expect(extractHeadingMentions('[[Page#H]]', '')).toEqual([{ title: 'page', heading: 'h' }])
  })

  it('reads a bare fragment as the containing page, in both extractors', () => {
    expect(extractHeadingMentions('[[#H]]', 'Own')).toEqual([{ title: 'own', heading: 'h' }])
    expect(extractMentions('[[#H]]', 'Own')).toEqual(new Set(['own']))
  })

  it('reads a markdown link’s fragment the same way', () => {
    expect(extractHeadingMentions('[Alias](Page#H)', '')).toEqual([{ title: 'page', heading: 'h' }])
  })

  it('reads a bare `§` run against the outline as a self-mention', () => {
    expect(extractHeadingMentions('§Setup', 'Own', ['Setup'])).toEqual([
      { title: 'own', heading: 'setup' },
    ])
  })

  it('reads an empty heading as no heading mention', () => {
    expect(extractHeadingMentions('[[Page#]]', '')).toEqual([])
  })

  it('reads an empty link as no mention at all', () => {
    expect(extractHeadingMentions('[[]]', 'Own')).toEqual([])
    expect(extractMentions('[[]]', 'Own')).toEqual(new Set())
  })
})

describe('an empty fragment', () => {
  it('[[#]] indexes nothing, and a property holding a bare fragment writes no empty key', () => {
    expect([...extractMentions('[[#]]', 'Own')]).toEqual([])
    expect([...frontmatterMentions({ a: '[[#H]]' })]).toEqual([])
  })
})
