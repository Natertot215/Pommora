import { describe, it, expect } from 'vitest'
import { rewriteConnections, rewriteHeadingConnections } from './rewrite'
import { loneEmbedTitle } from '../MarkdownPM/Engine/detect'

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

describe('one title grammar across the layers', () => {
  const corpus = ['Plain', 'With Space', 'Dotted 3.5', 'ümlaut', 'a|pipe', 'brack]et', 'P#H', '']
  it('a lone embed holds whatever the connection after its `!` holds', () => {
    for (const t of corpus) expect(loneEmbedTitle(`![[${t}]] `)).toBe(t)
    expect(loneEmbedTitle(' ![[Plain]]')).toBeNull()
    expect(loneEmbedTitle('![[Plain]] x')).toBeNull()
  })
})

describe('the markdown-link sweep', () => {
  it('rewrites a target that names the renamed page, keeping the label', () => {
    expect(rewriteConnections('see [the notes](Old%20Title) end', 'Old Title', 'New Title')).toBe(
      'see [the notes](New%20Title) end',
    )
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
  it('rewrites a wikilink, an aliased wikilink, and a markdown link naming the heading', () => {
    expect(rewriteHeadingConnections('[[P#Old]]', 'P', 'Old', 'New')).toBe('[[P#New]]')
    expect(rewriteHeadingConnections('[[P#Old|a]]', 'P', 'Old', 'New')).toBe('[[P#New|a]]')
    expect(rewriteHeadingConnections('[a](P#Old)', 'P', 'Old', 'New')).toBe('[a](P#New)')
  })

  it('rewrites a bare fragment naming the same page when ownTitle is given', () => {
    expect(rewriteHeadingConnections('[[#Old]]', 'P', 'Old', 'New', 'P')).toBe('[[#New]]')
  })

  it('rewrites a bare `§` run only when the outline is given', () => {
    expect(rewriteHeadingConnections('§Old', 'P', 'Old', 'New', 'P')).toBe('§Old')
    expect(rewriteHeadingConnections('§Old', 'P', 'Old', 'New', 'P', ['Old'])).toBe('§New')
  })

  it('a run naming a longer heading keeps it when the shorter one renames', () => {
    expect(
      rewriteHeadingConnections('§Note Taking §Note', 'P', 'Note', 'Note!', 'P', [
        'Note',
        'Note Taking',
      ]),
    ).toBe('§Note Taking §Note!')
  })

  it('a § inside a heading’s text rides through links and runs', () => {
    expect(
      rewriteHeadingConnections('[[#§Intro]] [[P#§Intro]] §§Intro', 'P', '§Intro', '§Start', 'P', [
        '§Intro',
      ]),
    ).toBe('[[#§Start]] [[P#§Start]] §§Start')
  })

  it('never writes a heading the link grammar cannot express', () => {
    expect(rewriteHeadingConnections('[[#Old]] [x](#Old)', 'P', 'Old', 'A | B', 'P')).toBe(
      '[[#Old]] [x](#A%20%7C%20B)',
    )
  })

  it('leaves a link naming a different page untouched', () => {
    expect(rewriteHeadingConnections('[[Q#Old]]', 'P', 'Old', 'New', 'P', ['Old'])).toBe(
      '[[Q#Old]]',
    )
  })

  it('leaves a run that merely starts with the heading untouched', () => {
    expect(rewriteHeadingConnections('§Older', 'P', 'Old', 'New', 'P', ['Old'])).toBe('§Older')
  })

  it('leaves a fenced sample untouched', () => {
    const body = '```\n[[P#Old]]\n```'
    expect(rewriteHeadingConnections(body, 'P', 'Old', 'New')).toBe(body)
  })

  it('moves an embed of the renamed heading and leaves another heading’s embed and a fenced sample', () => {
    expect(
      rewriteHeadingConnections(
        '![[A#Setup]] ![[A#Other]]\n```\n![[A#Setup]]\n```',
        'A',
        'Setup',
        'Intro',
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
      expect([body, rewriteHeadingConnections(body, page, 'Old', 'New')]).toEqual([body, want])
  })

  it('rewrites a bare fragment and a section run on the page itself', () => {
    expect(rewriteHeadingConnections('[[#Old]]', 'P', 'Old', 'New', 'P')).toBe('[[#New]]')
    expect(rewriteHeadingConnections('see §Old here', 'P', 'Old', 'New', 'P', ['Old'])).toBe(
      'see §New here',
    )
  })
})
