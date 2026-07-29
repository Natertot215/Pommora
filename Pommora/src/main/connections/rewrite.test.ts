import { describe, it, expect } from 'vitest'
import { rewriteConnections } from './rewrite'
import { scanConnections } from './scan'

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

  it('leaves non-matching links and image embeds untouched', () => {
    expect(rewriteConnections('[[Other]] and ![[Old.png]]', 'Old.png', 'X')).toBe(
      '[[Other]] and ![[Old.png]]',
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
