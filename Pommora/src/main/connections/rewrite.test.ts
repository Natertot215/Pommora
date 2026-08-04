import { describe, it, expect } from 'vitest'
import { rewriteConnections } from './rewrite'
import { mentionsTitle, scanConnections } from './scan'
import { pageEmbedPattern } from '@shared/connections'

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

  it('leaves non-matching links untouched; a matching embed follows the rename', () => {
    // An embed names a page the same way a connection does — the sweep reaches both, so a page
    // renamed away from a file-looking title carries its embeds with it.
    expect(rewriteConnections('[[Other]] and ![[Old.png]]', 'Old.png', 'X')).toBe(
      '[[Other]] and ![[X]]',
    )
  })

  it('rewrites TO a title with internal brackets and it round-trips', () => {
    // The healed link parses back to the same normalized title (no corruption of the surrounding text).
    const body = rewriteConnections('go to [[Old]] now', 'Old', 'New [v2] final')
    expect(body).toBe('go to [[New [v2] final]] now')
    expect(scanConnections(body).map((c) => c.normalizedTitle)).toEqual(['new [v2] final'])
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

  it('honours a ~~~ fence and treats a ``` line inside it as content', () => {
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

  it('a fenced sample of either syntax stays a sample', () => {
    const body = '```\n[[Old]]\n![[Old]]\n```\n![[Old]]'
    expect(rewriteConnections(body, 'Old', 'New')).toBe('```\n[[Old]]\n![[Old]]\n```\n![[New]]')
  })

  it('mentionsTitle reaches embed-only bodies; scanConnections still never counts them', () => {
    const body = 'no links here\n\n![[Old]]'
    expect(mentionsTitle(body, 'old')).toBe(true)
    expect(scanConnections(body)).toEqual([])
  })
})

describe('one title grammar across the layers', () => {
  // The embed pattern, the renderer's embed regex, and the autocomplete's embed branch must accept
  // the same titles — one corpus feeds all three shapes.
  const corpus = ['Plain', 'With Space', 'Dotted 3.5', 'ümlaut', 'a|pipe', 'brack]et', '']
  it('the shared pattern and the lone-line regex agree on every title', () => {
    for (const t of corpus) {
      const line = `![[${t}]]`
      const viaPattern = [...line.matchAll(pageEmbedPattern())].map((m) => m[1])
      const lone = /^!\[\[([^\]\r\n]*)\]\][ \t]*$/.exec(line)?.[1] ?? null
      // `]` breaks both the same way; `|` rides through both (an embed has no alias split).
      if (t.includes(']')) {
        expect(lone).not.toBe(t)
        expect(viaPattern).not.toContain(t)
      } else {
        expect(lone).toBe(t)
        expect(viaPattern).toEqual([t])
      }
    }
  })
})
