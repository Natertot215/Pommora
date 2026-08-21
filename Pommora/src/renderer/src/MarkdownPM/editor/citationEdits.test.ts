import { describe, expect, it } from 'vitest'
import { ChangeSet, Text } from '@codemirror/state'
import type { ChangeSpec } from '@codemirror/state'
import { citationScan, splitWithOffsets } from '../detect'
import { citationDeleteIntent, deleteCitationChanges, deleteMarkerChanges } from './citationEdits'

const scanOf = (
  doc: string,
): { lines: string[]; lineStarts: number[]; citations: ReturnType<typeof citationScan> } => {
  const d = splitWithOffsets(doc)
  return { lines: d.lines, lineStarts: d.lineStarts, citations: citationScan(d, []) }
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
    const out = apply(ONE, deleteMarkerChanges(s, s.citations.markers[0], ONE.length))
    expect(out).toBe('body here\n')
    expect(citationScan(splitWithOffsets(out), []).entries).toEqual([])
  })

  it('leaves the citation standing while another marker still points at it', () => {
    const s = scanOf(TWICE)
    const out = apply(TWICE, deleteMarkerChanges(s, s.citations.markers[0], TWICE.length))
    expect(out).toBe('one and two[^a]\n\n[^a]: shared')
    expect(citationScan(splitWithOffsets(out), []).entries).toHaveLength(1)
  })

  it('takes only its own citation, never a neighbour', () => {
    const s = scanOf(PAIR)
    const out = apply(PAIR, deleteMarkerChanges(s, s.citations.markers[0], PAIR.length))
    expect(out).toContain('[^b]: second')
    expect(out).not.toContain('[^a]: first')
  })
})

describe('deleting a citation', () => {
  // The inverse cascade: the alternative is leaving raw `[^a]` scattered through prose that used to
  // read as a number.
  it('takes every marker bound to it, in one transaction', () => {
    const s = scanOf(TWICE)
    const out = apply(TWICE, deleteCitationChanges(s, s.citations.entries[0], TWICE.length))
    expect(out).toBe('one and two\n')
  })

  it('leaves the other footnote and its marker alone', () => {
    const s = scanOf(PAIR)
    const out = apply(PAIR, deleteCitationChanges(s, s.citations.entries[0], PAIR.length))
    expect(out).toContain('[^b]')
    expect(out).not.toContain('[^a]')
  })

  it('takes a citation’s continuation lines with it', () => {
    const doc = 'x[^a]\n\n[^a]: first\nand its continuation'
    const s = scanOf(doc)
    const out = apply(doc, deleteCitationChanges(s, s.citations.entries[0], doc.length))
    expect(out).not.toContain('continuation')
  })
})

// B-11: a cascade fires only where the deleted range is exactly the construct. That is what stops a
// wide sweep from silently taking citations the reader never saw, and it is why backspace at a
// citation's content start and the menu's Delete land the same result.
describe('cascades are keyed to the range, never to the gesture', () => {
  const intent = (doc: string, from: number, to = from): string | null => {
    const s = scanOf(doc)
    const ch = citationDeleteIntent(s, from, to, doc.length)
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
