// What a footnote gesture writes. Both ends of every act share one definition here — the menu's
// Delete and backspace at a citation's content start are the same cascade, and a marker's menu
// Delete and its atomic backspace are the other one.
//
// Cascades are keyed to the RANGE, never to the gesture (B-11): a cascade fires only where the
// deleted range is exactly the construct. That is what stops a wide sweep from silently taking
// citations the reader never saw, and it is why backspace at a citation's start and the menu's
// Delete land the same result while a mixed body-and-section sweep lands neither.
import type { ChangeSpec } from '@codemirror/state'
import {
  type CitationEntry,
  type CitationScan,
  type MarkerRef,
  citationFor,
  lineEndOf,
  markersFor,
} from '../detect'

/** The line table plus the citation scan — the slice of a document scan every citation rule reads,
 *  which a caller can also answer from a bare split. */
export type CitationSlice = { lines: string[]; lineStarts: number[]; citations: CitationScan }

const erase = ({ from, to }: { from: number; to: number }): ChangeSpec => ({ from, to, insert: '' })

/** Whole lines, plus the newline that ends them — or the one that precedes them at the document's
 *  end, so removing the last citation leaves no orphaned blank behind it. */
function lineSpan(
  scan: CitationSlice,
  from: number,
  to: number,
  docLength: number,
): { from: number; to: number } {
  const start = scan.lineStarts[from]
  const end = lineEndOf(scan, to)
  return end < docLength ? { from: start, to: end + 1 } : { from: Math.max(0, start - 1), to: end }
}

/** A consecutive run of citations, every marker bound to any of them included. One span for the
 *  whole run, not one per citation: consecutive per-entry spans overlap on the newline between them,
 *  and each would claim it. */
function cutCitations(scan: CitationSlice, run: CitationEntry[], docLength: number): ChangeSpec[] {
  return [
    ...run.flatMap((e) => markersFor(scan.citations, e.label)).map(erase),
    erase(lineSpan(scan, run[0].line, run[run.length - 1].lastLine, docLength)),
  ]
}

/** Deleting exactly one marker. It takes its citation with it when it was the last reference — a
 *  footnote nothing points at is an orphan, and the gesture that made it one is the one that should
 *  answer for it. */
export function deleteMarkerChanges(
  scan: CitationSlice,
  marker: MarkerRef,
  docLength: number,
): ChangeSpec[] {
  const entry = citationFor(scan.citations, marker.label)
  const others = markersFor(scan.citations, marker.label).filter((m) => m !== marker)
  const changes: ChangeSpec[] = [erase(marker)]
  if (entry && others.length === 0)
    changes.push(erase(lineSpan(scan, entry.line, entry.lastLine, docLength)))
  return changes
}

/** Deleting exactly one citation. Every marker bound to it goes in the same transaction — the
 *  inverse of the body-side cascade, and the alternative is leaving raw `[^label]` scattered through
 *  prose that used to read as a number. */
export function deleteCitationChanges(
  scan: CitationSlice,
  entry: CitationEntry,
  docLength: number,
): ChangeSpec[] {
  return cutCitations(scan, [entry], docLength)
}

/** What deleting exactly `[from, to)` means for the footnotes, or null where that range is not
 *  exactly one construct — which is the whole of the range-keyed rule. A caret counts: backspace at
 *  a citation's content start IS that citation, and backspace against a marker's trailing edge IS
 *  that marker, because the marker is atomic and has no interior to land in.
 *
 *  Anything wider — a marker plus the words beside it, a sweep across body and section — returns
 *  null and the deletion goes through as the plain removal of what was swept. */
export function citationDeleteIntent(
  scan: CitationSlice,
  from: number,
  to: number,
  docLength: number,
): ChangeSpec[] | null {
  const c = scan.citations
  if (from === to) {
    const entry = c.entries.find((e) => e.contentStart === from)
    if (entry) return deleteCitationChanges(scan, entry, docLength)
    const marker = c.markers.find((m) => m.to === from)
    return marker ? deleteMarkerChanges(scan, marker, docLength) : null
  }
  const marker = c.markers.find((m) => m.from === from && m.to === to)
  if (marker) return deleteMarkerChanges(scan, marker, docLength)
  // Whole citation lines, and nothing else: every line the range covers has to be one this section
  // owns, and the range has to start and end on those lines' own edges.
  const covered = c.entries.filter(
    (e) => scan.lineStarts[e.line] >= from && lineEndOf(scan, e.lastLine) <= to,
  )
  if (covered.length === 0) return null
  const first = covered[0]
  const last = covered[covered.length - 1]
  if (scan.lineStarts[first.line] !== from) return null
  if (lineEndOf(scan, last.lastLine) !== to) return null
  return cutCitations(scan, covered, docLength)
}
