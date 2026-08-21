import { describe, expect, it } from 'vitest'
import { ChangeSet, Text } from '@codemirror/state'
import type { ChangeSpec } from '@codemirror/state'
import { scanDoc } from '../decorations/intent'
import { citationScan, splitWithOffsets } from '../detect'
import type { CitationSlice } from './citationEdits'
import {
  citationDeleteIntent,
  citationGesture,
  deleteCitationChanges,
  deleteMarkerChanges,
  normalizeCitations,
} from './citationEdits'

const scanOf = (doc: string): CitationSlice => {
  const d = splitWithOffsets(doc)
  return { ...d, citations: citationScan(d, []) }
}

const apply = (doc: string, changes: ChangeSpec[]): string =>
  ChangeSet.of(changes, doc.length)
    .apply(Text.of(doc.split('\n')))
    .toString()

const ONE = 'body[^a] here\n\n[^a]: the citation'
const TWICE = 'one[^a] and two[^a]\n\n[^a]: shared'
const PAIR = 'x[^a] y[^b]\n\n[^a]: first\n[^b]: second'

describe('deleting a marker', () => {
  // A footnote nothing points at is an orphan, and the gesture that made it one answers for it.
  it('takes its citation with it when it was the last reference', () => {
    const s = scanOf(ONE)
    const out = apply(ONE, deleteMarkerChanges(s, s.citations.markers[0]))
    expect(out).toBe('body here\n')
    expect(citationScan(splitWithOffsets(out), []).entries).toEqual([])
  })

  it('leaves the citation standing while another marker still points at it', () => {
    const s = scanOf(TWICE)
    const out = apply(TWICE, deleteMarkerChanges(s, s.citations.markers[0]))
    expect(out).toBe('one and two[^a]\n\n[^a]: shared')
    expect(citationScan(splitWithOffsets(out), []).entries).toHaveLength(1)
  })

  it('takes only its own citation, never a neighbour', () => {
    const s = scanOf(PAIR)
    const out = apply(PAIR, deleteMarkerChanges(s, s.citations.markers[0]))
    expect(out).toContain('[^b]: second')
    expect(out).not.toContain('[^a]: first')
  })
})

describe('deleting a citation', () => {
  // The inverse cascade: the alternative is leaving raw `[^a]` scattered through prose that used to
  // read as a number.
  it('takes every marker bound to it, in one transaction', () => {
    const s = scanOf(TWICE)
    const out = apply(TWICE, deleteCitationChanges(s, s.citations.entries[0]))
    expect(out).toBe('one and two\n')
  })

  it('leaves the other footnote and its marker alone', () => {
    const s = scanOf(PAIR)
    const out = apply(PAIR, deleteCitationChanges(s, s.citations.entries[0]))
    expect(out).toContain('[^b]')
    expect(out).not.toContain('[^a]')
  })

  it('takes a citation’s continuation lines with it', () => {
    const doc = 'x[^a]\n\n[^a]: first\nand its continuation'
    const s = scanOf(doc)
    const out = apply(doc, deleteCitationChanges(s, s.citations.entries[0]))
    expect(out).not.toContain('continuation')
  })
})

// B-11: a cascade fires only where the deleted range is exactly the construct. That is what stops a
// wide sweep from silently taking citations the reader never saw, and it is why backspace at a
// citation's content start and the menu's Delete land the same result.
describe('cascades are keyed to the range, never to the gesture', () => {
  const intent = (doc: string, from: number, to = from): string | null => {
    const s = scanOf(doc)
    const ch = citationDeleteIntent(s, from, to)
    return ch === null ? null : apply(doc, ch)
  }

  it('backspace at a citation’s content start removes the whole footnote', () => {
    expect(intent(ONE, ONE.indexOf('the citation'))).toBe('body here\n')
  })

  it('and does so on an empty citation too — content or not', () => {
    const doc = 'x[^a]\n\n[^a]:'
    expect(intent(doc, doc.length)).toBe('x\n')
  })

  it('backspace against a marker’s trailing edge removes the marker and cascades', () => {
    const s = scanOf(ONE)
    expect(intent(ONE, s.citations.markers[0].to)).toBe('body here\n')
  })

  it('a selection of exactly the marker cascades the same way', () => {
    const s = scanOf(ONE)
    const m = s.citations.markers[0]
    expect(intent(ONE, m.from, m.to)).toBe('body here\n')
  })

  it('a sweep covering two whole citations cascades both', () => {
    const s = scanOf(PAIR)
    const from = s.lineStarts[s.citations.entries[0].line]
    expect(intent(PAIR, from, PAIR.length)).toBe('x y\n')
  })

  // The negative control. A range that is the construct PLUS something else is not the construct.
  it('a marker swept with the words beside it takes only the swept text', () => {
    const s = scanOf(ONE)
    expect(intent(ONE, s.citations.markers[0].from - 1, ONE.indexOf(' here'))).toBeNull()
  })

  it('a sweep across body and section cascades nothing', () => {
    expect(intent(ONE, 0, ONE.length)).toBeNull()
  })

  it('half a citation line is not a citation', () => {
    const s = scanOf(ONE)
    const line = s.lineStarts[s.citations.entries[0].line]
    expect(intent(ONE, line + 3, ONE.length)).toBeNull()
  })

  it('a caret in the middle of a citation’s text means nothing to the cascade', () => {
    expect(intent(ONE, ONE.indexOf('the citation') + 4)).toBeNull()
  })

  it('a document with no footnotes at all is never the cascade’s business', () => {
    expect(intent('just prose here', 5)).toBeNull()
  })
})

describe('normalizing the section', () => {
  const normalized = (doc: string): string => apply(doc, normalizeCitations(scanOf(doc)))

  it('renumbers numeric labels to first-use order, body and section together', () => {
    const doc = 'a[^1] b[^note] c[^5]\n\n[^5]: five\n[^note]: n\n[^1]: one'
    expect(normalized(doc)).toBe('a[^1] b[^note] c[^3]\n\n[^1]: one\n[^note]: n\n[^3]: five')
  })

  it('leaves a word label alone while it still holds its position', () => {
    const doc = 'a[^b] c[^a]\n\n[^a]: A\n[^b]: B'
    expect(normalized(doc)).toBe('a[^b] c[^a]\n\n[^b]: B\n[^a]: A')
  })

  it('emits nothing at all when the section is already canonical', () => {
    expect(normalizeCitations(scanOf('a[^1] b[^2]\n\n[^1]: one\n[^2]: two'))).toEqual([])
  })

  it('collects an orphan below the resolved rows without renumbering it', () => {
    const doc = 'x[^9]\n\n[^2]: orphan\n[^9]: nine'
    expect(normalized(doc)).toBe('x[^1]\n\n[^1]: nine\n[^2]: orphan')
  })

  it('routes around an orphan squatting on the number it wanted', () => {
    const doc = 'x[^5]\n\n[^1]: orphan\n[^5]: five'
    expect(normalized(doc)).toBe('x[^5]\n\n[^5]: five\n[^1]: orphan')
  })

  // The loser is renumbered with the winner it shadows: normalization renumbers and reorders, it
  // does not quietly turn a duplicate the reader wrote into an orphan.
  it('drops a duplicate that lost below the run, still shadowing its winner', () => {
    const doc = 'x[^7] y[^b]\n\n[^b]: bee\n[^7]: won\n[^7]: lost'
    expect(normalized(doc)).toBe('x[^1] y[^b]\n\n[^1]: won\n[^b]: bee\n[^1]: lost')
  })

  it('carries a citation continuation line with its row', () => {
    const doc = 'a[^2] b[^1]\n\n[^1]: one\n    still one\n[^2]: two'
    expect(normalized(doc)).toBe('a[^1] b[^2]\n\n[^1]: two\n[^2]: one\n    still one')
  })

  it('keeps the document ending in a newline when it already did', () => {
    const doc = 'a[^2] b[^1]\n\n[^1]: one\n[^2]: two\n'
    expect(normalized(doc)).toBe('a[^1] b[^2]\n\n[^1]: two\n[^2]: one\n')
  })

  it('renumbers every marker sharing a label, not only the first', () => {
    const doc = 'a[^4] b[^4] c[^9]\n\n[^9]: nine\n[^4]: four'
    expect(normalized(doc)).toBe('a[^1] b[^1] c[^2]\n\n[^1]: four\n[^2]: nine')
  })

  it('is a no-op on a document with no section', () => {
    expect(normalizeCitations(scanOf('just prose, and a stray [^1] marker'))).toEqual([])
  })

  // The Must-agree: after normalizing, a numeric disk label IS the number the walk draws over it.
  it('leaves every numeric label equal to the ordinal the scan gives it', () => {
    const out = normalized('p[^zed] q[^8] r[^one] s[^3]\n\n[^3]: c\n[^8]: b\n[^one]: d\n[^zed]: a')
    const c = citationScan(splitWithOffsets(out), [])
    for (const e of c.entries)
      if (/^\d+$/.test(e.label) && e.ordinal !== null) expect(e.label).toBe(String(e.ordinal))
    expect(c.entries.map((e) => e.ordinal)).toEqual([1, 2, 3, 4])
  })
})

describe('a gesture carries its own renormalization', () => {
  const gesture = (doc: string, changes: ChangeSpec[]): string =>
    citationGesture(scanOf(doc), changes)
      .apply(Text.of(doc.split('\n')))
      .toString()

  it('renumbers what is left after a deletion, in the same change set', () => {
    const doc = 'x[^1] y[^2]\n\n[^1]: one\n[^2]: two'
    const s = scanOf(doc)
    expect(gesture(doc, deleteMarkerChanges(s, s.citations.markers[0]))).toBe(
      'x y[^1]\n\n[^1]: two',
    )
  })

  it('renumbers what is left after a citation-side deletion too', () => {
    const doc = 'x[^1] y[^2]\n\n[^1]: one\n[^2]: two'
    const s = scanOf(doc)
    expect(gesture(doc, deleteCitationChanges(s, s.citations.entries[0]))).toBe(
      'x y[^1]\n\n[^1]: two',
    )
  })

  it('composes to nothing when the gesture writes nothing and the section is canonical', () => {
    expect(citationGesture(scanOf('x[^1]\n\n[^1]: one'), []).empty).toBe(true)
  })

  // The normalization reads the document through the editor's own exclusion set, so a
  // citation-shaped line inside a fence is code and is neither reordered nor renumbered.
  it('never rewrites a citation-shaped line inside a code fence', () => {
    const doc = 'x[^2] y[^1]\n\n```\n[^9]: code\n```\n\n[^1]: one\n[^2]: two'
    const out = citationGesture(scanDoc(doc), [])
      .apply(Text.of(doc.split('\n')))
      .toString()
    expect(out).toBe('x[^1] y[^2]\n\n```\n[^9]: code\n```\n\n[^1]: two\n[^2]: one')
  })
})
