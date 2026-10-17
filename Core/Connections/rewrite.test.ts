import { describe, it, expect } from 'vitest'
import { rewriteConnections, rewriteHeadingConnections } from './rewrite'
import { linksIn } from './scan'
import { pageKey } from './pageIndex'

describe('rewriteConnections', () => {
  it('rewrites a normalized-matching link to the new title', () => {
    expect(rewriteConnections('go to [[Old Page]] now', 'Old Page', 'New Page')).toBe(
      'go to [[New Page]] now',
    )
  })

  it('matches case-insensitively and carries an alias through', () => {
    expect(rewriteConnections('[[old page]] and [[Old Page|the old one]]', 'Old Page', 'New')).toBe(
      '[[New]] and [[New|the old one]]',
    )
  })

  it('drops an empty alias segment rather than preserving a bare pipe', () => {
    expect(rewriteConnections('[[Old|]]', 'Old', 'New')).toBe('[[New]]')
  })

  it('drops an alias the new target repeats, cell escape included, as a written connection does', () => {
    expect(rewriteConnections('[[Old|New]] [[Old#H|new#h]] [[Old|Other]]', 'Old', 'New')).toBe(
      '[[New]] [[New#H]] [[New|Other]]',
    )
    expect(rewriteConnections('| [[Old\\|New]] |', 'Old', 'New')).toBe('| [[New]] |')
  })

  it('renames an alias that only showed the old title, dropping it where it would repeat the new target', () => {
    expect(rewriteConnections('[[Old|old]] [[Old#H|Old]]', 'Old', 'New')).toBe(
      '[[New]] [[New#H|New]]',
    )
    expect(rewriteConnections('[[Old#Intro|Old#Intro]]', 'Old', 'New')).toBe('[[New#Intro]]')
  })

  it('never gives a bare fragment a title: `[[#H]]` on the renamed page stays as written', () => {
    const body = '[[#H]] [x](#H) [[Old#H]] [[#H|Old]]'
    expect(rewriteConnections(body, 'Old', 'New')).toBe('[[#H]] [x](#H) [[New#H]] [[#H|Old]]')
  })

  it('edits only the page name, so unusual spacing and escapes survive byte for byte', () => {
    expect(rewriteConnections('[[ Old ]] [x]( Old#Part ) [[Old\\|a]]', 'Old', 'New')).toBe(
      '[[New]] [x]( New#Part ) [[New\\|a]]',
    )
  })

  it('leaves non-matching links untouched; a matching embed follows the rename', () => {
    // An embed names a page the same way a connection does — the sweep reaches both.
    expect(rewriteConnections('[[Other]] and ![[Old.png]]', 'Old.png', 'X')).toBe(
      '[[Other]] and ![[X]]',
    )
  })

  it('rewrites TO a title with internal brackets and it round-trips', () => {
    const body = rewriteConnections('go to [[Old]] now', 'Old', 'New [v2] final')
    expect(body).toBe('go to [[New [v2] final]] now')
    expect(rewriteConnections(body, 'New [v2] final', 'Again')).toBe('go to [[Again]] now')
  })

  it('rewrites FROM a title that itself contains brackets', () => {
    expect(rewriteConnections('[[Notes [WIP] final]] here', 'Notes [WIP] final', 'Done')).toBe(
      '[[Done]] here',
    )
  })
})

describe('rewriteConnections — code is a sample, never a connection', () => {
  it('leaves a link inside a fenced block alone while rewriting the prose around it', () => {
    const body = [
      'see [[Old]]',
      '',
      '```md',
      'write [[Old]] to link it',
      '```',
      '',
      'and [[Old]]',
    ].join('\n')
    expect(rewriteConnections(body, 'Old', 'New')).toBe(
      ['see [[New]]', '', '```md', 'write [[Old]] to link it', '```', '', 'and [[New]]'].join('\n'),
    )
  })

  it('leaves a link inside an inline span alone', () => {
    expect(rewriteConnections('type `[[Old]]` to get [[Old]]', 'Old', 'New')).toBe(
      'type `[[Old]]` to get [[New]]',
    )
  })

  it('leaves a link inside a fence under a quoted list item alone', () => {
    const body =
      '> [!note] Setup\n> - Install:\n>   ```\n>   npm i -[[Old]]\n>   ```\n> See [[Old]].'
    expect(rewriteConnections(body, 'Old', 'New')).toBe(
      '> [!note] Setup\n> - Install:\n>   ```\n>   npm i -[[Old]]\n>   ```\n> See [[New]].',
    )
  })

  it('honors a ~~~ fence and treats a ``` line inside it as content', () => {
    const body = ['~~~', '[[Old]]', '```', '[[Old]]', '~~~', '[[Old]]'].join('\n')
    expect(rewriteConnections(body, 'Old', 'New')).toBe(
      ['~~~', '[[Old]]', '```', '[[Old]]', '~~~', '[[New]]'].join('\n'),
    )
  })
})

describe('the embed sweep', () => {
  it('rewrites ![[Old]] alongside [[Old]], one sweep', () => {
    const body = 'see [[Old]] and\n\n![[Old]]\n\nand [[Old|alias]]'
    expect(rewriteConnections(body, 'Old', 'New')).toBe(
      'see [[New]] and\n\n![[New]]\n\nand [[New|alias]]',
    )
  })

  it('a fenced sample of either syntax stays a sample — under a LENGTH-CHANGING rename', () => {
    // Same-length fixtures can't see a mask misread; the offsets must survive real drift.
    const body = '[[Old]]\n![[Old]]\n```\n[[Old]]\n![[Old]]\n```\n![[Old]]'
    expect(rewriteConnections(body, 'Old', 'A Much Longer Title')).toBe(
      '[[A Much Longer Title]]\n![[A Much Longer Title]]\n```\n[[Old]]\n![[Old]]\n```\n![[A Much Longer Title]]',
    )
  })
})

describe('the markdown-link sweep', () => {
  it('rewrites a target that names the renamed page, keeping the label', () => {
    expect(rewriteConnections('see [the notes](Old%20Title) end', 'Old Title', 'New Title')).toBe(
      'see [the notes](New%20Title) end',
    )
  })

  it('renames a label that only showed the old title, and keeps one giving a name', () => {
    expect(
      rewriteConnections('[Old Title](Old%20Title) [mine](Old%20Title)', 'Old Title', 'New'),
    ).toBe('[New](New) [mine](New)')
  })

  it('a label naming the page through its `.md` destination follows the rename', () => {
    expect(rewriteConnections('[Notes](Notes.md)', 'Notes', 'Alpha')).toBe('[Alpha](Alpha)')
  })

  it('a path link keeps showing the title it names through a rename, in either syntax', () => {
    expect(rewriteConnections('[[A/Notes|Notes]]', 'A/Notes', 'A/Plan')).toBe('[[A/Plan|Plan]]')
    expect(rewriteConnections('[Notes](A/Notes)', 'A/Notes', 'A/Plan')).toBe('[Plan](A/Plan)')
  })

  it('re-encodes a new title that needs it', () => {
    expect(rewriteConnections('[x](Old)', 'Old', 'Atomic Habits (Book)')).toBe(
      '[x](Atomic%20Habits%20%28Book%29)',
    )
  })

  it('leaves a URL alone even when its last segment collides', () => {
    const body = 'see [site](https://example.com/Old%20Title) end'
    expect(rewriteConnections(body, 'Old Title', 'New Title')).toBe(body)
  })

  it('a link inside code stays a sample', () => {
    const body = '```\n[x](Old)\n```\n'
    expect(rewriteConnections(body, 'Old', 'New')).toBe(body)
  })

  // rewritePageSerialized calls this unwrapped, so one `%`-bearing body would leave that page’s links unmoved on every rename.
  it('a %-bearing body does not throw the rename into a revert', () => {
    const body = 'see [x](Revenue 50% plan) and [[Old]] end'
    expect(() => rewriteConnections(body, 'Old', 'New')).not.toThrow()
    expect(rewriteConnections(body, 'Old', 'New')).toContain('[[New]]')
  })

  it('all three syntaxes move in one sweep', () => {
    expect(rewriteConnections('[[Old]] ![[Old]] [x](Old)', 'Old', 'New')).toBe(
      '[[New]] ![[New]] [x](New)',
    )
  })
})

describe('a page rename keeps every fragment', () => {
  it('re-emits `#heading` across all three syntaxes and a pipe-escape', () => {
    expect(rewriteConnections('[[Old#H]]', 'Old', 'New')).toBe('[[New#H]]')
    expect(rewriteConnections('[[Old#H|a]]', 'Old', 'New')).toBe('[[New#H|a]]')
    expect(rewriteConnections('![[Old#H]]', 'Old', 'New')).toBe('![[New#H]]')
    expect(rewriteConnections('[a](Old#H)', 'Old', 'New')).toBe('[a](New#H)')
  })
})

describe('a page rename inside a table cell', () => {
  it('re-emits the cell pipe-escape once on a heading link', () => {
    expect(rewriteConnections('| [[Old#H\\|a]] |', 'Old', 'New')).toBe('| [[New#H\\|a]] |')
  })
})

describe('rewriteHeadingConnections', () => {
  it('renames an alias or label that only showed the old heading, and keeps one giving a name', () => {
    expect(
      rewriteHeadingConnections(
        '[Old](P#Old) [x](P#Old) [[P#Old|old]] [[P#Old|y]]',
        new Set(['p']),
        'Old',
        'New',
        false,
      ),
    ).toBe('[New](P#New) [x](P#New) [[P#New|New]] [[P#New|y]]')
  })

  it('a label following a heading past the slot empties rather than leaving a link the grammar refuses', () => {
    const long = 'h'.repeat(256)
    const out = rewriteHeadingConnections('[Old](A#Old)', new Set(['a']), 'Old', long, false)
    expect(out).toBe(`[](A#${long})`)
    expect([...linksIn(out)]).toHaveLength(1)
  })

  it('rewrites a wikilink, an aliased wikilink, and a markdown link naming the heading', () => {
    expect(rewriteHeadingConnections('[[P#Old]]', new Set(['p']), 'Old', 'New', false)).toBe(
      '[[P#New]]',
    )
    expect(rewriteHeadingConnections('[[P#Old|a]]', new Set(['p']), 'Old', 'New', false)).toBe(
      '[[P#New|a]]',
    )
    expect(rewriteHeadingConnections('[a](P#Old)', new Set(['p']), 'Old', 'New', false)).toBe(
      '[a](P#New)',
    )
  })

  it('rewrites a bare fragment only in the page’s own body', () => {
    expect(rewriteHeadingConnections('[[#Old]]', new Set(['p']), 'Old', 'New', true)).toBe(
      '[[#New]]',
    )
    expect(rewriteHeadingConnections('[[#Old]]', new Set(['p']), 'Old', 'New', false)).toBe(
      '[[#Old]]',
    )
  })

  it('rewrites a bare `§` run only when the outline is given', () => {
    expect(rewriteHeadingConnections('§Old', new Set(['p']), 'Old', 'New', true)).toBe('§Old')
    expect(rewriteHeadingConnections('§Old', new Set(['p']), 'Old', 'New', true, ['Old'])).toBe(
      '§New',
    )
  })

  it('a run naming a longer heading keeps it when the shorter one renames', () => {
    expect(
      rewriteHeadingConnections('§Note Taking §Note', new Set(['p']), 'Note', 'Note!', true, [
        'Note',
        'Note Taking',
      ]),
    ).toBe('§Note Taking §Note!')
  })

  it('a § inside a heading’s text rides through links and runs', () => {
    expect(
      rewriteHeadingConnections(
        '[[#§Intro]] [[P#§Intro]] §§Intro',
        new Set(['p']),
        '§Intro',
        '§Start',
        true,
        ['§Intro'],
      ),
    ).toBe('[[#§Start]] [[P#§Start]] §§Start')
  })

  it('writes a heading the wikilink grammar cannot spell in the markdown form', () => {
    expect(
      rewriteHeadingConnections('[[#Old]] [x](#Old)', new Set(['p']), 'Old', 'A | B', true),
    ).toBe('[A | B](#A%20%7C%20B) [x](#A%20%7C%20B)')
    expect(rewriteHeadingConnections('[[P#Old|Mine]]', new Set(['p']), 'Old', 'A|B', false)).toBe(
      '[Mine](P#A%7CB)',
    )
  })

  it('a lone embed falling back stays an embed line in markdown form', () => {
    expect(rewriteHeadingConnections('![[A#Old]]', new Set(['a']), 'Old', 'A|B', false)).toBe(
      '![A|B](A#A%7CB)',
    )
    const hits = [...linksIn('![A|B](A#A%7CB)')]
    expect(hits.map((h) => [h.syntax, h.embed, h.qualifier])).toEqual([['markdown', true, 'a|b']])
  })

  it('drops an alias that comes to repeat the renamed heading’s target', () => {
    expect(rewriteHeadingConnections('[[P#Old|P#Old]]', new Set(['p']), 'Old', 'New', false)).toBe(
      '[[P#New]]',
    )
    expect(rewriteHeadingConnections('[[P#Old|P#New]]', new Set(['p']), 'Old', 'New', false)).toBe(
      '[[P#New]]',
    )
  })

  it('carries a markdown label that named the heading, compared decoded', () => {
    expect(
      rewriteHeadingConnections(
        '[Setup Notes](P#Setup%20Notes)',
        new Set(['p']),
        'Setup Notes',
        'Usage',
        false,
      ),
    ).toBe('[Usage](P#Usage)')
    expect(
      rewriteHeadingConnections(
        '[Intro](Notes.md#Intro)',
        new Set(['notes']),
        'Intro',
        'Setup',
        false,
      ),
    ).toBe('[Setup](Notes.md#Setup)')
  })

  it('inside a table row, escapes a pipe the new heading carries and keeps the columns', () => {
    const table = (row: string) => `| A | B | C |\n| --- | --- | --- |\n${row}`
    expect(
      rewriteHeadingConnections(
        table('| [[P#Old]] | [x](P#Old) | §Old |'),
        new Set(['p']),
        'Old',
        'A|B',
        true,
        ['Old'],
      ),
    ).toBe(table('| [A\\|B](P#A%7CB) | [x](P#A%7CB) | §A\\|B |'))
    expect(
      rewriteHeadingConnections(table('| [[P#Old|Old]] |'), new Set(['p']), 'Old', 'New', false),
    ).toBe(table('| [[P#New|New]] |'))
  })

  it('leaves a link naming a different page untouched', () => {
    expect(
      rewriteHeadingConnections('[[Q#Old]]', new Set(['p']), 'Old', 'New', true, ['Old']),
    ).toBe('[[Q#Old]]')
  })

  it('leaves a run that merely starts with the heading untouched', () => {
    expect(rewriteHeadingConnections('§Older', new Set(['p']), 'Old', 'New', true, ['Old'])).toBe(
      '§Older',
    )
  })

  it('leaves a fenced sample untouched', () => {
    const body = '```\n[[P#Old]]\n```'
    expect(rewriteHeadingConnections(body, new Set(['p']), 'Old', 'New', false)).toBe(body)
  })

  it('moves an embed of the renamed heading and leaves another heading’s embed and a fenced sample', () => {
    expect(
      rewriteHeadingConnections(
        '![[A#Setup]] ![[A#Other]]\n```\n![[A#Setup]]\n```',
        new Set(['a']),
        'Setup',
        'Intro',
        false,
      ),
    ).toBe('![[A#Intro]] ![[A#Other]]\n```\n![[A#Setup]]\n```')
  })
})

describe('the heading gate lets every heading reference through', () => {
  it('rewrites each form it admits', () => {
    const rewrites: [string, string, string][] = [
      ['P', 'see [[P#Old]] here', 'see [[P#New]] here'],
      ['P', '[[P#Old|alias]]', '[[P#New|alias]]'],
      ['a]b', '[[a]b#Old]]', '[[a]b#New]]'],
      ['P', '[x](P#Old)', '[x](P#New)'],
      ['P(1)', '[x](P(1)#Old)', '[x](P(1)#New)'],
      ['a\u2028b', '[[a\u2028b#Old]]', '[[a\u2028b#New]]'],
    ]
    for (const [page, body, want] of rewrites)
      expect([
        body,
        rewriteHeadingConnections(body, new Set([pageKey(page)]), 'Old', 'New', false),
      ]).toEqual([body, want])
  })

  it('rewrites a bare fragment and a section run on the page itself', () => {
    expect(rewriteHeadingConnections('[[#Old]]', new Set(['p']), 'Old', 'New', true)).toBe(
      '[[#New]]',
    )
    expect(
      rewriteHeadingConnections('see §Old here', new Set(['p']), 'Old', 'New', true, ['Old']),
    ).toBe('see §New here')
  })
})
