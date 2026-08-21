import { describe, expect, it } from 'vitest'
import { ChangeSet, Text } from '@codemirror/state'
import type { ChangeSpec } from '@codemirror/state'
import { citationScan, splitWithOffsets } from '../detect'
import { deleteCitationChanges, deleteMarkerChanges } from './citationEdits'

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
