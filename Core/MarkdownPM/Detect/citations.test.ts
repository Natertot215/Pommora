import { describe, it, expect } from 'vitest'
import { parse } from '../Parser'
import {
  citationScan,
  fenceRangesOf,
  foldLabel,
  markerRegex,
  scanFencedCode,
  splitWithOffsets,
  type CitationScan,
} from './index'
import { tableRegions } from '../Tables/regions'

/** The house exclusion set — fences and tables — assembled the way `docLineScan` assembles it, so
 *  these cases read the document exactly as the editor's own scan does. */
function scan(text: string): CitationScan {
  const d = splitWithOffsets(text)
  const fences = scanFencedCode(d.lines, d.lineStarts)
  const tables = tableRegions(d)
  const excluded: [number, number][] = [
    ...fenceRangesOf(fences),
    ...tables.map((r): [number, number] => [r.from, r.to]),
  ]
  return citationScan(d, excluded)
}

const masked = (s: CitationScan): number[] => [...s.mask].flatMap((v, i) => (v === 1 ? [i] : []))

describe('citationScan — the boundary', () => {
  it('reads a plain trailing run', () => {
    const s = scan('body [^1] and [^2]\n\n[^1]: one\n[^2]: two')
    expect(s.firstLine).toBe(2)
    expect(s.anchorLine).toBe(1)
    expect(s.entries.map((e) => e.label)).toEqual(['1', '2'])
    expect(masked(s)).toEqual([2, 3])
  })

  it('takes an indented continuation into the citation above', () => {
    const s = scan('a[^1]\n\n[^1]: one\n    more text')
    expect(s.entries).toHaveLength(1)
    expect(s.entries[0].lastLine).toBe(3)
    expect(masked(s)).toEqual([2, 3])
  })

  it('takes a lazy (unindented) continuation into the citation above', () => {
    const s = scan('a[^1]\n\n[^1]: one\nlazy line')
    expect(s.entries).toHaveLength(1)
    expect(s.entries[0].lastLine).toBe(3)
    expect(s.firstLine).toBe(2)
  })

  it('keeps interleaved blank lines inside the section', () => {
    const s = scan('a[^1][^2]\n\n[^1]: one\n\n[^2]: two')
    expect(s.firstLine).toBe(2)
    expect(masked(s)).toEqual([2, 3, 4])
  })

  it('keeps trailing blank lines inside the section', () => {
    const s = scan('a[^1]\n\n[^1]: one\n\n\n')
    expect(s.firstLine).toBe(2)
    expect(masked(s)).toEqual([2, 3, 4, 5])
  })

  it('has no section when prose follows the run', () => {
    const s = scan('a[^1]\n\n[^1]: one\n\nafterwards')
    expect(s.firstLine).toBe(5)
    expect(s.anchorLine).toBe(-1)
    expect(s.entries).toEqual([])
    expect(masked(s)).toEqual([])
  })

  it('starts the run below prose that precedes it', () => {
    const s = scan('a[^1]\n\nprose line\n[^1]: one')
    expect(s.firstLine).toBe(3)
    expect(s.anchorLine).toBe(2)
    expect(s.entries).toHaveLength(1)
  })

  it('leaves a fenced pseudo-citation to the fence', () => {
    const s = scan('a[^1]\n\n```\n[^1]: one\n```')
    expect(s.entries).toEqual([])
    expect(s.firstLine).toBe(5)
  })

  it('reads a spaced label as a link definition, not a citation', () => {
    const s = scan('a\n\n[^my note]: one')
    expect(s.entries).toEqual([])
  })

  it('admits a head indented one to three spaces and refuses four', () => {
    expect(scan('a[^1]\n\n   [^1]: one').entries).toHaveLength(1)
    expect(scan('a[^1]\n\n    [^1]: one').entries).toEqual([])
  })

  it('admits neither a blockquoted head nor one inside a list item', () => {
    expect(scan('a[^1]\n\n> [^1]: one').entries).toEqual([])
    expect(scan('a[^1]\n\n- [^1]: one').entries).toEqual([])
  })

  it('answers a document that is nothing but citations', () => {
    const s = scan('[^1]: one\n[^2]: two')
    expect(s.firstLine).toBe(0)
    expect(s.anchorLine).toBe(-1)
    expect(masked(s)).toEqual([0, 1])
  })

  it('answers an empty document', () => {
    const s = scan('')
    expect(s.firstLine).toBe(1)
    expect(s.anchorLine).toBe(-1)
    expect(s.entries).toEqual([])
    expect(s.markers).toEqual([])
    expect(masked(s)).toEqual([])
  })

  it('reads a citation whose text is empty', () => {
    const text = 'a[^1]\n\n[^1]:'
    const s = scan(text)
    expect(s.entries).toHaveLength(1)
    expect(s.entries[0].contentStart).toBe(text.length)
    expect(s.entries[0].ordinal).toBe(1)
  })

  it('names the content start after the colon and its spaces', () => {
    const text = 'a[^1]\n\n[^1]:   one'
    const s = scan(text)
    expect(text.slice(s.entries[0].contentStart)).toBe('one')
  })
})

describe('citationScan — binding and ordinals', () => {
  it('numbers by first use, whatever the disk labels say', () => {
    const s = scan('x[^7] y[^1] z[^3]\n\n[^1]: one\n[^7]: seven\n[^3]: three')
    expect(s.markers.map((m) => m.ordinal)).toEqual([1, 2, 3])
    expect(s.entries.map((e) => [e.label, e.ordinal])).toEqual([
      ['1', 2],
      ['7', 1],
      ['3', 3],
    ])
  })

  it('binds case-folded', () => {
    const s = scan('a[^Note]\n\n[^note]: one')
    expect(s.markers[0].ordinal).toBe(1)
    expect(s.entries[0].ordinal).toBe(1)
  })

  it('shares one number between duplicate markers', () => {
    const s = scan('a[^1] b[^1]\n\n[^1]: one')
    expect(s.markers.map((m) => m.ordinal)).toEqual([1, 1])
  })

  it('leaves a duplicate-labelled citation numberless', () => {
    const s = scan('a[^1]\n\n[^1]: one\n[^1]: two')
    expect(s.entries.map((e) => e.ordinal)).toEqual([1, null])
  })

  it('leaves an orphaned citation numberless and an unmatched marker unbound', () => {
    const s = scan('a[^9]\n\n[^1]: one')
    expect(s.entries[0].ordinal).toBeNull()
    expect(s.markers[0].ordinal).toBeNull()
  })

  it('ignores an escaped marker', () => {
    const s = scan('a \\[^1] b\n\n[^1]: one')
    expect(s.markers).toEqual([])
    expect(s.entries[0].ordinal).toBeNull()
  })

  it('ignores markers inside fences and inline code', () => {
    const s = scan('```\n[^1]\n```\n\n`[^1]`\n\n[^1]: one')
    expect(s.markers).toEqual([])
  })

  it('reads markers inside a table cell', () => {
    const s = scan('| a | b |\n| - | - |\n| [^1] | x |\n\n[^1]: one')
    expect(s.markers.map((m) => m.ordinal)).toEqual([1])
  })

  it('reads no marker inside the citations section', () => {
    const s = scan('a[^1]\n\n[^1]: see [^1]')
    expect(s.markers.map((m) => m.line)).toEqual([0])
  })

  it('reports absolute marker offsets', () => {
    const text = 'a [^1] b\n\n[^1]: one'
    const s = scan(text)
    expect(text.slice(s.markers[0].from, s.markers[0].to)).toBe('[^1]')
  })
})

describe('markerRegex and foldLabel', () => {
  it('hands out a fresh regex per call', () => {
    const re = markerRegex()
    re.exec('a [^1]')
    expect(markerRegex().lastIndex).toBe(0)
  })

  it('folds case the way the parser binds', () => {
    expect(foldLabel('Note')).toBe(foldLabel('note'))
    expect(foldLabel('a')).not.toBe(foldLabel('b'))
  })
})

describe('citationScan agrees with the parser', () => {
  const corpus = [
    'body [^1] and [^2]\n\n[^1]: one\n[^2]: two',
    'a[^1]\n\n[^1]: one\n    more text',
    'a[^1]\n\n[^1]: one\nlazy line',
    'a[^1][^2]\n\n[^1]: one\n\n[^2]: two',
    'a[^1]\n\n[^1]: one\n\n\n',
    '[^1]: one\n[^2]: two',
    '# Title\n\ntext [^note]\n\n[^note]: a citation\nwith a lazy line',
  ]

  it('masks exactly the lines the parser gives the trailing run', () => {
    for (const text of corpus) {
      const s = scan(text)
      const lines = text.split('\n')
      const parsed = parse(text)
        .children.filter((n) => n.type === 'footnoteDefinition')
        .flatMap((n) => {
          const out: number[] = []
          for (let l = n.position!.start.line - 1; l <= n.position!.end.line - 1; l++) out.push(l)
          return out
        })
      const tail = parsed.filter((l) => l >= s.firstLine)
      for (const l of tail) expect(s.mask[l], `${text} line ${l}`).toBe(1)
      const maskedNonBlank = masked(s).filter((l) => lines[l].trim() !== '')
      expect(maskedNonBlank, text).toEqual(tail)
    }
  })
})
