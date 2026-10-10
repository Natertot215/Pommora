// `pageLinkPattern` has four other consumers (the rewrite, the editor's tokens, its autocomplete, and paste-as), so the ReDoS and length-cap assertions below guard all of them, not just this file.

import { describe, it, expect } from 'vitest'
import { codeMask } from '../MarkdownPM/Engine/markdownCode'
import { frontmatterMentions, type LinkHit, linksIn, sectionRunsIn, valueLinks } from './scan'

// `extractMentions` and `extractHeadingMentions` were the index's two readers of `linksIn` until the relation rows took their place. They are kept here, unchanged, so the properties they pinned keep answering over the one walker that remains.
function extractMentions(body: string, ownTitle = ''): Set<string> {
  const out = new Set<string>()
  for (const hit of linksIn(body, ownTitle)) out.add(hit.target)
  return out
}

interface HeadingMention {
  title: string
  heading: string
}

/** Every link that names a heading, keyed the way the index stores it; a bare fragment or a bare `§` run names the containing page. */
function extractHeadingMentions(
  body: string,
  ownTitle: string,
  outline: readonly string[] = [],
): HeadingMention[] {
  const seen = new Set<string>()
  const out: HeadingMention[] = []
  for (const hit of linksIn(body, ownTitle, outline)) {
    // An unqualified link yields an empty qualifier.
    if (hit.qualifier === '') continue
    const key = `${hit.target}#${hit.qualifier}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ title: hit.target, heading: hit.qualifier })
  }
  return out
}

describe('a link names its title', () => {
  it('matches a page link by its normalized title', () => {
    expect(extractMentions('See [[Alpha]] and [[Beta Page]].').has('alpha')).toBe(true)
    expect(extractMentions('See [[Alpha]] and [[Beta Page]].').has('beta page')).toBe(true)
    expect(extractMentions('See [[Alpha]].').has('gamma')).toBe(false)
  })

  it('normalizes case and surrounding whitespace on both sides', () => {
    expect(extractMentions('[[ ALPHA ]]').has('alpha')).toBe(true)
  })

  it('reaches an embed as well as a link, and ignores {{ }}', () => {
    expect(extractMentions('![[Cover]]').has('cover')).toBe(true)
    expect(extractMentions('{{macro}}').has('macro')).toBe(false)
  })

  it('drops a legacy pipe segment', () => {
    expect(extractMentions('[[Real|01H9XYZ]]').has('real')).toBe(true)
  })

  it('never matches an empty or whitespace-only link', () => {
    expect(extractMentions('[[]] [[   ]]').has('')).toBe(false)
  })

  it('does not match inside code — a sample names no page', () => {
    expect(extractMentions('```\n[[Fenced]]\n```').has('fenced')).toBe(false)
    expect(extractMentions('type `[[Inline]]` here').has('inline')).toBe(false)
    expect(extractMentions('```\n[[Fenced]]\n```\nthen [[Real]]').has('real')).toBe(true)
  })

  it('tolerates internal brackets in a title (a `]` is content unless it closes the pair)', () => {
    expect(extractMentions('see [[Notes [WIP] final]]').has('notes [wip] final')).toBe(true)
    expect(extractMentions('[[A]] then [[B]]').has('b')).toBe(true)
  })

  it('caps title length and never backtracks on a pathological bracket run (ReDoS guard)', () => {
    // Under an unbounded `+` this would hang for seconds — completing at all IS the guard.
    expect(extractMentions('['.repeat(50000)).has('x')).toBe(false)
    expect(extractMentions(`[[a|${'['.repeat(50000)}`).has('a')).toBe(false)
    // The title is capped at the filesystem name limit (255): at the bound matches, past it doesn't.
    expect(extractMentions(`[[${'x'.repeat(255)}]]`).has('x'.repeat(255))).toBe(true)
    expect(extractMentions(`[[${'x'.repeat(256)}]]`).has('x'.repeat(256))).toBe(false)
  })
})

describe('extractMentions over linksIn', () => {
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

  it('a heading whose text opens with § is reached by §§ in prose and never by its own line', () => {
    const doc = '## §Intro\ntext §§Intro and §Intro'
    expect(sectionRunsIn(doc, ['§Intro'], codeMask(doc))).toEqual([
      { from: 15, to: 22, heading: '§Intro' },
    ])
  })

  it('a heading line’s own § is heading text, not a run to another heading', () => {
    const doc = '## Setup\n## §Setup'
    expect(sectionRunsIn(doc, ['Setup', '§Setup'], codeMask(doc))).toEqual([])
  })

  it('never matches a `§` inside a markdown link, its label or its URL', () => {
    expect(sectionRunsIn('[see §Setup](https://x.com/§Setup)', ['Setup'], codeMask(''))).toEqual([])
  })

  it('never matches a `§` sitting inside a wikilink', () => {
    const text = '[[Page§X]]'
    expect(sectionRunsIn(text, ['X'], codeMask(text))).toEqual([])
  })

  it('a § after a link that ends before it still runs, and one inside a later link never does', () => {
    const text = 'a [y](§Guide) §Intro [[x §Setup]] §Setup `§Intro`'
    expect(
      sectionRunsIn(text, ['Setup', 'Intro', 'Guide'], codeMask(text)).map((r) => r.heading),
    ).toEqual(['Intro', 'Setup'])
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

describe('frontmatterMentions', () => {
  it('reads a bare `[[#H]]` as naming the page that holds it', () => {
    expect(frontmatterMentions({ a: '[[#H]]' }, 'Own')).toEqual([{ target: 'own', qualifier: 'h' }])
  })

  it('reads an unquoted `[[Page]]` as the link it spells, and a one-item list as no link', () => {
    expect(frontmatterMentions({ a: [['Zeta']], b: ['Pommora'] })).toEqual([
      { target: 'zeta', qualifier: '' },
    ])
  })
})

describe('valueLinks', () => {
  it('reads a sentence’s links, and nothing from a whole-value connection or a non-string', () => {
    const hits = [
      ...valueLinks(
        { a: 'see [[Zeta]] and [[#Part]]', b: '[[Omega]]', c: 3, d: ['[[Pi]]'] },
        'Own',
      ),
    ]
    expect(hits.map(({ target, qualifier }) => ({ target, qualifier }))).toEqual([
      { target: 'zeta', qualifier: '' },
      { target: 'own', qualifier: 'part' },
    ])
  })
})

describe('linksIn', () => {
  const hits = (body: string, own = '', outline: readonly string[] = []): LinkHit[] => [
    ...linksIn(body, own, outline),
  ]

  it('names the syntax each occurrence was written in', () => {
    expect(hits('a [[Alpha]] link').map((h) => h.syntax)).toEqual(['wiki'])
    expect(hits('![[Alpha]] ').map((h) => h.syntax)).toEqual(['embed'])
    expect(hits('an ![[Alpha]] embed').map((h) => h.syntax)).toEqual(['wiki'])
    expect(hits('```\n![[Alpha]]\n```\n- ![[Alpha]]').map((h) => h.syntax)).toEqual(['wiki'])
    expect(hits('a [label](Alpha.md) link').map((h) => h.syntax)).toEqual(['markdown'])
    expect(hits('see §Setup', 'Own', ['Setup']).map((h) => h.syntax)).toEqual(['section'])
  })

  it('reads the heading half of a link into the qualifier', () => {
    expect(hits('[[Page#Heading]]')[0]).toMatchObject({ target: 'page', qualifier: 'heading' })
    expect(hits('[Text](Page.md#frag)')[0]).toMatchObject({ target: 'page', qualifier: 'frag' })
    expect(hits('[[Page]]')[0].qualifier).toBe('')
  })

  it('reads an embed’s heading as its qualifier', () => {
    expect(hits('![[Alpha#Part]]')[0]).toMatchObject({
      syntax: 'embed',
      target: 'alpha',
      qualifier: 'part',
    })
  })

  it('reports `at` as the offset the match begins at', () => {
    const body = 'lead words [[Alpha]] trail'
    expect(hits(body)[0].at).toBe(body.indexOf('[[Alpha]]'))
    const embed = '![[Alpha]]'
    expect(hits(embed)[0].at).toBe(embed.indexOf('[[Alpha]]'))
  })

  it('stops the page half at the first `#`, a trailing backslash included', () => {
    expect(hits('[[Foo\\#Bar]]')[0]).toMatchObject({ target: 'foo\\', qualifier: 'bar' })
  })

  it('yields a `§` run only under an outline, keyed to the own title, blank when none is given', () => {
    expect(hits('see §Setup', 'Own', ['Setup'])).toEqual([
      {
        syntax: 'section',
        target: 'own',
        qualifier: 'setup',
        at: 4,
        title: [4, 4],
        heading: [5, 10],
        alias: null,
      },
    ])
    expect(hits('see §Setup', 'Own', [])).toEqual([])
    expect(hits('see §Setup', '', ['Setup'])).toMatchObject([{ target: '', qualifier: 'setup' }])
  })

  it('honors a mask passed in rather than building its own', () => {
    const body = 'plain [[Alpha]] and [x](Beta.md) and ![[Gamma]]'
    expect(hits(body)).toHaveLength(3)
    expect([...linksIn(body, '', [], () => true)]).toEqual([])
  })
})
