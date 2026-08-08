import { describe, it, expect } from 'vitest'
import { headingOutline, headingSections } from './folding'

describe('headingOutline — every heading, not just the foldable ones', () => {
  it('keeps a heading with no body beneath it (headingSections drops those)', () => {
    expect(headingOutline('# One\n# Two\nbody').map((h) => h.text)).toEqual(['One', 'Two'])
    expect(headingSections('# One\n# Two\nbody').map((s) => s.key)).toEqual(['Two'])
  })
  it('keeps a trailing heading at the document end', () => {
    expect(headingOutline('# One\nbody\n# Last').map((h) => h.text)).toEqual(['One', 'Last'])
  })
  it('strips the markers and reports the line start as the jump target', () => {
    const doc = 'intro\n\n### Deep Heading\nbody'
    const [h] = headingOutline(doc)
    expect(h.text).toBe('Deep Heading')
    expect(h.level).toBe(3)
    expect(doc.slice(h.from, h.from + 3)).toBe('###')
  })
  it('a heading inside a code fence is code, not a heading', () => {
    expect(headingOutline('# Real\n```\n# Not\n```\ntail').map((h) => h.text)).toEqual(['Real'])
  })
  it('duplicate text stays tellable apart by key, sharing the sections ordinal', () => {
    expect(headingOutline('# Notes\nb\n# Notes\nb').map((h) => h.key)).toEqual(['Notes', 'Notes 2'])
  })
})

describe('headingSections', () => {
  it('a heading folds down to the next equal-or-higher heading', () => {
    const doc = '# A\nbody\nmore\n# B\nx'
    const s = headingSections(doc)
    expect(s).toHaveLength(2)
    expect(doc.slice(s[0].lineEnd, s[0].to)).toBe('\nbody\nmore') // up to the line before # B
    expect(doc.slice(s[1].lineEnd, s[1].to)).toBe('\nx')
  })

  it('a subsection (deeper heading) is contained, not closing its parent', () => {
    const doc = '# Top\nintro\n## Sub\ndeep\n# Next\nend'
    const s = headingSections(doc)
    const top = s.find((x) => x.key === 'Top')!
    const sub = s.find((x) => x.key === 'Sub')!
    expect(doc.slice(top.lineEnd, top.to)).toBe('\nintro\n## Sub\ndeep') // spans through the subsection
    expect(doc.slice(sub.lineEnd, sub.to)).toBe('\ndeep')
  })

  it('runs to document end when no later heading closes it', () => {
    const doc = '# Only\na\nb'
    const s = headingSections(doc)
    expect(s).toHaveLength(1)
    expect(s[0].to).toBe(doc.length)
  })

  it('drops a heading with no body (nothing to fold) but keeps ordinal stability', () => {
    const doc = '# Empty\n# Dupe\nx\n# Dupe\ny'
    const keys = headingSections(doc).map((s) => s.key)
    expect(keys).toEqual(['Dupe', 'Dupe 2']) // '# Empty' has no body → dropped; dupes disambiguate
  })
})
