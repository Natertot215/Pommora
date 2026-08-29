import { describe, expect, it } from 'vitest'
import { blockEmbedLines, splitWithOffsets } from '../Detect'
import { scanDoc } from '../Decorations/intent'
import { claimedEmbeds } from './embedRanges'

const lines = splitWithOffsets
const docEmbedLines = (doc: string): ReturnType<typeof blockEmbedLines> => scanDoc(doc).embeds
import type { LinkStatus } from '@shared/connections'

const status =
  (map: Record<string, LinkStatus>) =>
  (title: string): LinkStatus =>
    map[title] ?? 'phantom'

describe('blockEmbedLines', () => {
  it('claims a lone-line embed, trailing whitespace tolerated', () => {
    expect(blockEmbedLines(lines('a\n![[Foo]]  \nb'), [])).toEqual([
      { from: 2, to: 12, title: 'Foo' },
    ])
  })

  it('a leading indent is continuation context, never an embed', () => {
    expect(blockEmbedLines(lines('- item\n  ![[Foo]]'), [])).toEqual([])
    expect(blockEmbedLines(lines('  ![[Foo]]'), [])).toEqual([])
  })

  it('rejects any line carrying more than the embed', () => {
    expect(blockEmbedLines(lines('x ![[Foo]]\n![[Foo]] y\n![[A]] ![[B]]'), [])).toEqual([])
  })

  it('captures an empty title without claiming resolution', () => {
    expect(blockEmbedLines(lines('![[]]'), [])).toEqual([{ from: 0, to: 5, title: '' }])
  })

  it('excluded regions own their lines', () => {
    const doc = '![[A]]\n![[B]]'
    expect(blockEmbedLines(lines(doc), [[0, 6]])).toEqual([{ from: 7, to: 13, title: 'B' }])
  })
})

describe('docEmbedLines exclusions', () => {
  it('a fenced ![[…]] is code, not an embed', () => {
    expect(docEmbedLines('```\n![[Foo]]\n```')).toEqual([])
  })

  it('an ![[…]] inside display math is formula source, and cannot steal a later claim', () => {
    expect(docEmbedLines('$$\n![[Foo]]\n$$\n\n![[Foo]]')).toEqual([
      { from: 16, to: 24, title: 'Foo' },
    ])
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
