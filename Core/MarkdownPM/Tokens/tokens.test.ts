import { describe, it, expect } from 'vitest'
import { tokenize, activeTokenIndices, shiftToken, type Token } from './index'

const byKind = (tokens: Token[], kind: string): Token[] => tokens.filter((t) => t.kind === kind)
const slice = (text: string, r: [number, number]): string => text.slice(r[0], r[1])

describe('emphasis tokens (marker geometry)', () => {
  it('*a* → italic with correct markers + content', () => {
    const t = '*a*'
    const em = byKind(tokenize(t), 'italic')[0]
    expect(slice(t, em.contentRange)).toBe('a')
    expect(em.markerRanges.map((m) => slice(t, m))).toEqual(['*', '*'])
  })

  it('**a** → bold with ** markers', () => {
    const t = '**a**'
    const b = byKind(tokenize(t), 'bold')[0]
    expect(slice(t, b.contentRange)).toBe('a')
    expect(b.markerRanges.map((m) => slice(t, m))).toEqual(['**', '**'])
  })

  it('***a*** → content "a" is covered by both bold and italic', () => {
    const t = '***a***'
    const tokens = tokenize(t)
    expect(slice(t, byKind(tokens, 'bold')[0].contentRange)).toBe('a')
    expect(slice(t, byKind(tokens, 'italic')[0].contentRange)).toContain('a')
  })

  it('**a *b* c** → one bold span + nested italic on "b"', () => {
    const t = '**a *b* c**'
    const tokens = tokenize(t)
    expect(byKind(tokens, 'bold')).toHaveLength(1)
    expect(slice(t, byKind(tokens, 'italic')[0].contentRange)).toBe('b')
  })

  it('no emphasis inside inline code', () => {
    const tokens = tokenize('`*a*`')
    expect(byKind(tokens, 'italic')).toHaveLength(0)
    expect(byKind(tokens, 'inlineCode')).toHaveLength(1)
  })
})

describe('inline regex tokens + overlap rules', () => {
  it('wikilink [[Page]] (title-only content)', () => {
    const t = '[[Page]]'
    const w = byKind(tokenize(t), 'wikiLink')[0]
    expect(slice(t, w.contentRange)).toBe('Page')
    expect(w.markerRanges.map((m) => slice(t, m))).toEqual(['[[', ']]'])
  })

  it('image ![[pic]] wins over wikilink (no wikiLink emitted)', () => {
    const tokens = tokenize('![[pic]]')
    expect(byKind(tokens, 'embed')).toHaveLength(1)
    expect(byKind(tokens, 'wikiLink')).toHaveLength(0)
  })

  it('inline latex $x+1$ tokenizes; prose $word here$ does not', () => {
    expect(byKind(tokenize('$x+1$'), 'inlineLatex')).toHaveLength(1)
    expect(byKind(tokenize('$word here$'), 'inlineLatex')).toHaveLength(0)
  })

  it('markdown link [t](u)', () => {
    const t = '[t](http://u)'
    const l = byKind(tokenize(t), 'link')[0]
    expect(slice(t, l.contentRange)).toBe('t')
  })
})

describe('an aliased wikilink separates what it shows from what it resolves', () => {
  it('[[Title|Alias]] shows the alias and keeps the title as its key', () => {
    const t = '[[Q3 Plan|the plan]]'
    const w = byKind(tokenize(t), 'wikiLink')[0]
    expect(slice(t, w.contentRange)).toBe('the plan')
    expect(slice(t, w.resolveRange as [number, number])).toBe('Q3 Plan')
    expect(w.markerRanges.map((m) => slice(t, m))).toEqual(['[[Q3 Plan|', ']]'])
  })

  it('a bare [[Title]] has no resolve span — contentRange is the key', () => {
    const t = '[[Page]]'
    const w = byKind(tokenize(t), 'wikiLink')[0]
    expect(w.resolveRange).toBeUndefined()
    expect(slice(t, w.contentRange)).toBe('Page')
    expect(w.markerRanges.map((m) => slice(t, m))).toEqual(['[[', ']]'])
  })

  it('an empty alias [[Title|]] reads as no alias at all', () => {
    const t = '[[Page|]]'
    const w = byKind(tokenize(t), 'wikiLink')[0]
    expect(w.resolveRange).toBeUndefined()
    expect(slice(t, w.contentRange)).toBe('Page')
  })

  // The viewport projection rebuilds every token into a fresh literal, where a new span field is
  // dropped with no type error and the editor silently resolves aliases. Field-set parity is what
  // goes red for that, now and for whatever field is added next.
  it('shifting a token carries every field the raw one has, offset alike', () => {
    const raw = byKind(tokenize('[[Q3 Plan|the plan]]'), 'wikiLink')[0]
    const moved = shiftToken(raw, 10)
    expect(Object.keys(moved).sort()).toEqual(Object.keys(raw).sort())
    expect(moved.range).toEqual([raw.range[0] + 10, raw.range[1] + 10])
    expect(moved.contentRange).toEqual([raw.contentRange[0] + 10, raw.contentRange[1] + 10])
    expect(moved.resolveRange).toEqual([
      (raw.resolveRange as [number, number])[0] + 10,
      (raw.resolveRange as [number, number])[1] + 10,
    ])
    expect(moved.markerRanges).toEqual(raw.markerRanges.map(([s, e]) => [s + 10, e + 10]))
  })
})

describe('activeTokenIndices', () => {
  it('caret inside a token marks it active; before it does not', () => {
    const t = 'a *b* c'
    const tokens = tokenize(t)
    const idx = tokens.findIndex((tk) => tk.kind === 'italic')
    expect(activeTokenIndices(tokens, 3, 3).has(idx)).toBe(true)
    expect(activeTokenIndices(tokens, 0, 0).has(idx)).toBe(false)
  })

  // Finishing a link leaves the caret on its closer and the link rendered. Merely CLICKING there is
  // aiming at the syntax, and reveals it like any other construct — the distinction is the gesture,
  // which the caller reports, not the offset.
  it('a caret rested on the closer by finishing leaves it rendered', () => {
    const tokens = tokenize('[[P]]')
    const idx = tokens.findIndex((tk) => tk.kind === 'wikiLink')
    expect(activeTokenIndices(tokens, 5, 5, 5).has(idx)).toBe(false)
  })

  it('but a caret merely sitting there reveals, as it does for bold', () => {
    const tokens = tokenize('[[P]]')
    const idx = tokens.findIndex((tk) => tk.kind === 'wikiLink')
    expect(activeTokenIndices(tokens, 5, 5).has(idx)).toBe(true)
  })

  it('and a rest recorded elsewhere does not spill onto this link', () => {
    const tokens = tokenize('[[P]] [[Q]]')
    const idx = tokens.findIndex((tk) => tk.kind === 'wikiLink')
    expect(activeTokenIndices(tokens, 5, 5, 11).has(idx)).toBe(true)
  })

  it('but every position inside it still reveals', () => {
    const tokens = tokenize('[[P]]')
    const idx = tokens.findIndex((tk) => tk.kind === 'wikiLink')
    for (const caret of [0, 1, 2, 3, 4]) {
      expect(activeTokenIndices(tokens, caret, caret).has(idx)).toBe(true)
    }
  })

  it('and the exception is a link’s alone — bold reveals even when rested on', () => {
    const tokens = tokenize('**b**')
    const idx = tokens.findIndex((tk) => tk.kind === 'bold')
    expect(activeTokenIndices(tokens, 5, 5, 5).has(idx)).toBe(true)
  })
})
