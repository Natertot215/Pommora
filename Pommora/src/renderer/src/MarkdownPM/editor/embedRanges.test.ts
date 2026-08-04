import { describe, expect, it } from 'vitest'
import { blockEmbedLines } from '../detect'
import { claimedEmbeds, docEmbedLines } from './embedRanges'

const status =
  (map: Record<string, 'resolved' | 'phantom' | 'ambiguous'>) =>
  (title: string): 'resolved' | 'phantom' | 'ambiguous' =>
    map[title] ?? 'phantom'

describe('blockEmbedLines', () => {
  it('claims a lone-line embed, whole line, trimmed', () => {
    expect(blockEmbedLines('a\n  ![[Foo]]  \nb', [])).toEqual([{ from: 2, to: 14, title: 'Foo' }])
  })

  it('rejects any line carrying more than the embed', () => {
    expect(blockEmbedLines('x ![[Foo]]\n![[Foo]] y\n![[A]] ![[B]]', [])).toEqual([])
  })

  it('captures an empty title without claiming resolution', () => {
    expect(blockEmbedLines('![[]]', [])).toEqual([{ from: 0, to: 5, title: '' }])
  })

  it('excluded regions own their lines', () => {
    const doc = '![[A]]\n![[B]]'
    expect(blockEmbedLines(doc, [[0, 6]])).toEqual([{ from: 7, to: 13, title: 'B' }])
  })
})

describe('docEmbedLines exclusions', () => {
  it('a fenced ![[…]] is code, not an embed', () => {
    expect(docEmbedLines('```\n![[Foo]]\n```')).toEqual([])
  })

  it('a lone-line embed between blocks still claims', () => {
    expect(docEmbedLines('para\n\n![[Foo]]\n\n- item')).toEqual([{ from: 6, to: 14, title: 'Foo' }])
  })
})

describe('claimedEmbeds — the one ownership predicate', () => {
  const embeds = [
    { from: 0, to: 8, title: 'Alpha' },
    { from: 10, to: 18, title: 'alpha' },
    { from: 20, to: 28, title: 'Beta' },
    { from: 30, to: 38, title: 'Ghost' },
    { from: 40, to: 48, title: 'Twin' },
  ]
  const st = status({ Alpha: 'resolved', alpha: 'resolved', Beta: 'resolved', Twin: 'ambiguous' })

  it('first occurrence per normalized title wins; later duplicates stay unclaimed', () => {
    const claimed = claimedEmbeds(embeds, st)
    expect(claimed.map((e) => e.from)).toEqual([0, 20])
  })

  it('phantom and ambiguous titles claim nothing', () => {
    const claimed = claimedEmbeds(embeds, st)
    expect(claimed.some((e) => e.title === 'Ghost' || e.title === 'Twin')).toBe(false)
  })

  it('an empty embed list claims nothing', () => {
    expect(claimedEmbeds([], st)).toEqual([])
  })
})
