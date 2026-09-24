import { describe, expect, it } from 'vitest'
import { merge3 } from './merge3'

const BASE = 'alpha\nbeta\ngamma\n'

describe('merge3', () => {
  it('keeps disjoint edits from both sides', () => {
    const local = 'alpha EDITED\nbeta\ngamma\n'
    const remote = 'alpha\nbeta\ngamma REMOTE\n'
    expect(merge3(BASE, local, remote)).toEqual({
      text: 'alpha EDITED\nbeta\ngamma REMOTE\n',
      conflicted: false,
    })
  })

  it('applies the same edit once', () => {
    const both = 'alpha\nbeta TWICE\ngamma\n'
    expect(merge3(BASE, both, both)).toEqual({ text: both, conflicted: false })
  })

  it('takes remote on an overlap and reports the conflict', () => {
    const local = 'alpha\nbeta MINE\ngamma\n'
    const remote = 'alpha\nbeta THEIRS\ngamma\n'
    expect(merge3(BASE, local, remote)).toEqual({ text: remote, conflicted: true })
  })

  it('yields remote when local equals base', () => {
    const remote = 'alpha\nbeta\ngamma\ndelta\n'
    expect(merge3(BASE, BASE, remote)).toEqual({ text: remote, conflicted: false })
  })

  // Replacements share no characters with what they replace, so each side diffs to exactly the ranges named.
  const HEX = '0123456789abcdef'

  it.each([
    {
      name: 'chains an overlap alternating sides across three runs into one region',
      local: '01LL56MMabcdef',
      remote: '0123RR89abcdef',
      text: '0123RR89abcdef',
      conflicted: true,
    },
    {
      name: 'extends a region by a remote edit whose end runs past the next local edit’s start',
      local: '0LL34M6789abcdef',
      remote: '01RRRR6789abcdef',
      text: '01RRRR6789abcdef',
      conflicted: true,
    },
    {
      name: 'joins edits that touch at one offset',
      local: 'WXYZ456789abcdef',
      remote: '0123STUV89abcdef',
      text: '0123STUV89abcdef',
      conflicted: true,
    },
    {
      name: 'takes remote for two insertions at one offset',
      local: '01X23456789abcdef',
      remote: '01Y23456789abcdef',
      text: '01Y23456789abcdef',
      conflicted: true,
    },
    {
      name: 'keeps a clean run beside a conflicted one',
      local: 'L123456789abcdeM',
      remote: 'R123456789abRdef',
      text: 'R123456789abRdeM',
      conflicted: true,
    },
  ])('$name', ({ local, remote, text, conflicted }) => {
    expect(merge3(HEX, local, remote)).toEqual({ text, conflicted })
  })
})
