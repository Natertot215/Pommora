// What a footnote gesture writes. Both ends of every act share one definition here — the menu's
// Delete and backspace at a citation's content start are the same cascade, and a marker's menu
// Delete and its atomic backspace are the other one.
//
// Cascades are keyed to the RANGE, never to the gesture (B-11): a cascade fires only where the
// deleted range is exactly the construct. That is what stops a wide sweep from silently taking
// citations the reader never saw, and it is why backspace at a citation's start and the menu's
// Delete land the same result while a mixed body-and-section sweep lands neither.
import type { ChangeSpec } from '@codemirror/state'
import { type CitationEntry, type CitationScan, type MarkerRef, foldLabel } from '../detect'

/** Whole lines, plus the newline that ends them — or the one that precedes them at the document's
 *  end, so removing the last citation leaves no orphaned blank behind it. */
function lineSpan(
  scan: { lines: string[]; lineStarts: number[] },
  from: number,
  to: number,
  docLength: number,
): { from: number; to: number } {
  const start = scan.lineStarts[from]
  const end = scan.lineStarts[to] + scan.lines[to].length
  return end < docLength ? { from: start, to: end + 1 } : { from: Math.max(0, start - 1), to: end }
}

const boundTo = (c: CitationScan, entry: CitationEntry): MarkerRef[] => {
  const key = foldLabel(entry.label)
  return c.markers.filter((m) => foldLabel(m.label) === key)
}

/** Deleting exactly one marker. It takes its citation with it when it was the last reference — a
 *  footnote nothing points at is an orphan, and the gesture that made it one is the one that should
 *  answer for it. */
export function deleteMarkerChanges(
  scan: { lines: string[]; lineStarts: number[]; citations: CitationScan },
  marker: MarkerRef,
  docLength: number,
): ChangeSpec[] {
  const c = scan.citations
  const key = foldLabel(marker.label)
  const entry = c.entries.find((e) => foldLabel(e.label) === key)
  const others = c.markers.filter((m) => m !== marker && foldLabel(m.label) === key)
  const changes: ChangeSpec[] = [{ from: marker.from, to: marker.to, insert: '' }]
  if (entry && others.length === 0)
    changes.push({ ...lineSpan(scan, entry.line, entry.lastLine, docLength), insert: '' })
  return changes
}

/** Deleting exactly one citation. Every marker bound to it goes in the same transaction — the
 *  inverse of the body-side cascade, and the alternative is leaving raw `[^label]` scattered through
 *  prose that used to read as a number. */
export function deleteCitationChanges(
  scan: { lines: string[]; lineStarts: number[]; citations: CitationScan },
  entry: CitationEntry,
  docLength: number,
): ChangeSpec[] {
  return [
    ...boundTo(scan.citations, entry).map((m) => ({ from: m.from, to: m.to, insert: '' })),
    { ...lineSpan(scan, entry.line, entry.lastLine, docLength), insert: '' },
  ]
}
