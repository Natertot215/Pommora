// The pattern-level behaviour behind `mentionsTitle` — normalization, the code mask, bracket
// tolerance, and the bounds on `pageLinkPattern` itself. The pattern has five other consumers
// (the rewrite, the editor's tokens, its autocomplete), so the ReDoS and length-cap assertions
// below guard all of them, not just this file.

import { describe, it, expect } from 'vitest'
import { mentionsTitle } from './scan'

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
    expect(mentionsTitle('[[A]] then [[B]]', 'b')).toBe(true) // adjacent links still split
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
