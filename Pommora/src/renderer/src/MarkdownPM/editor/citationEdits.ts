// What a footnote gesture writes. Both ends of every act share one definition here — the menu's
// Delete and backspace at a citation's content start are the same cascade, and a marker's menu
// Delete and its atomic backspace are the other one.
//
// Cascades are keyed to the RANGE, never to the gesture (B-11): a cascade fires only where the
// deleted range is exactly the construct. That is what stops a wide sweep from silently taking
// citations the reader never saw, and it is why backspace at a citation's start and the menu's
// Delete land the same result while a mixed body-and-section sweep lands neither.
import { ChangeSet, type ChangeSpec, Text } from '@codemirror/state'
import {
  type CitationEntry,
  type CitationScan,
  type DocLines,
  type MarkerRef,
  citationFor,
  foldLabel,
  lineEndOf,
  markersFor,
} from '../detect'
import { scanDoc } from '../decorations/intent'
import { diffAsSingleReplace } from './listDragModel'

/** The line table plus the citation scan — the slice of a document scan every citation rule reads,
 *  which a caller can also answer from a bare split. The text comes with it so no rule has to be
 *  handed a document length that could disagree with the scan it arrived beside. */
export type CitationSlice = DocLines & { citations: CitationScan }

const erase = ({ from, to }: { from: number; to: number }): ChangeSpec => ({ from, to, insert: '' })

/** Whole lines, plus the newline that ends them — or the one that precedes them at the document's
 *  end, so removing the last citation leaves no orphaned blank behind it. */
function lineSpan(scan: CitationSlice, from: number, to: number): { from: number; to: number } {
  const start = scan.lineStarts[from]
  const end = lineEndOf(scan, to)
  return end < scan.text.length
    ? { from: start, to: end + 1 }
    : { from: Math.max(0, start - 1), to: end }
}

/** A consecutive run of citations, every marker bound to any of them included. One span for the
 *  whole run, not one per citation: consecutive per-entry spans overlap on the newline between them,
 *  and each would claim it. */
function cutCitations(scan: CitationSlice, run: CitationEntry[]): ChangeSpec[] {
  return [
    ...run.flatMap((e) => markersFor(scan.citations, e.label)).map(erase),
    erase(lineSpan(scan, run[0].line, run[run.length - 1].lastLine)),
  ]
}

/** Deleting exactly one marker. It takes its citation with it when it was the last reference — a
 *  footnote nothing points at is an orphan, and the gesture that made it one is the one that should
 *  answer for it. */
export function deleteMarkerChanges(scan: CitationSlice, marker: MarkerRef): ChangeSpec[] {
  const entry = citationFor(scan.citations, marker.label)
  const others = markersFor(scan.citations, marker.label).filter((m) => m !== marker)
  const changes: ChangeSpec[] = [erase(marker)]
  if (entry && others.length === 0) changes.push(erase(lineSpan(scan, entry.line, entry.lastLine)))
  return changes
}

/** Deleting exactly one citation. Every marker bound to it goes in the same transaction — the
 *  inverse of the body-side cascade, and the alternative is leaving raw `[^label]` scattered through
 *  prose that used to read as a number. */
export function deleteCitationChanges(scan: CitationSlice, entry: CitationEntry): ChangeSpec[] {
  return cutCitations(scan, [entry])
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
): ChangeSpec[] | null {
  const c = scan.citations
  if (from === to) {
    const entry = c.entries.find((e) => e.contentStart === from)
    if (entry) return deleteCitationChanges(scan, entry)
    const marker = c.markers.find((m) => m.to === from)
    return marker ? deleteMarkerChanges(scan, marker) : null
  }
  const marker = c.markers.find((m) => m.from === from && m.to === to)
  if (marker) return deleteMarkerChanges(scan, marker)
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
  return cutCitations(scan, covered)
}

const numericLabel = (label: string): boolean => /^\d+$/.test(label)

/** The whole section rewritten into canonical form: numeric labels renumbered to first-use order in
 *  the body and the section together, the rows sorted into that order, and the ones holding no
 *  position — an orphan, a duplicate that lost — collected below them.
 *
 *  Every creation and deletion gesture ends here, so the order a reader sees and the labels on disk
 *  are settled in one place rather than three. Numeric labels are the gesture's to rewrite; a word
 *  label is the user's and only ever moves. A label a renumber cannot claim, because a row that
 *  keeps its own already holds it, is left where it is rather than minted into a collision.
 *
 *  The result is diffed back rather than derived edit by edit: a reorder's edits do not commute, and
 *  the differ's trimmed prefix also keeps the replacement from ever starting on the section's first
 *  offset — every citation opens `[^`, so the change begins inside the section. */
export function normalizeCitations(scan: CitationSlice): ChangeSpec[] {
  const { text, lines, lineStarts, citations: c } = scan
  if (c.entries.length === 0) return []

  const placed = c.entries.filter((e) => e.ordinal !== null)
  const loose = c.entries.filter((e) => e.ordinal === null)
  // A number is genuinely occupied only by a row that keeps it. An orphan does; a duplicate that
  // lost travels with the winner it shares a label with, so its number is being vacated.
  const seated = new Set(placed.map((e) => foldLabel(e.label)))
  const held = new Set(
    loose
      .filter((e) => !seated.has(foldLabel(e.label)))
      .map((e) => e.label)
      .filter(numericLabel),
  )

  const renamed = new Map<string, string>()
  for (const e of placed) {
    const want = String(e.ordinal)
    if (!numericLabel(e.label) || e.label === want || held.has(want)) continue
    renamed.set(foldLabel(e.label), want)
  }

  const row = (e: CitationEntry): string => {
    const to = renamed.get(foldLabel(e.label))
    const head =
      to === undefined ? lines[e.line] : lines[e.line].replace(/\[\^[^\]\s]+\]/, `[^${to}]`)
    return [head, ...lines.slice(e.line + 1, e.lastLine + 1)].join('\n')
  }
  const sorted = [...placed].sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0))
  const from = lineStarts[c.firstLine]
  const rebuilt = [...sorted, ...loose].map(row).join('\n') + (text.endsWith('\n') ? '\n' : '')

  return [
    ...c.markers.flatMap((m) => {
      const to = renamed.get(foldLabel(m.label))
      return to === undefined ? [] : [{ from: m.from, to: m.to, insert: `[^${to}]` }]
    }),
    ...diffAsSingleReplace(text, text.slice(0, from) + rebuilt),
  ]
}

/** A footnote gesture's whole edit: what it writes or removes, composed with the renormalization
 *  that follows it. Every gesture in E-3's set ends here — the three creations and the three
 *  deletions — so "renumber and reorder afterwards" is one fact rather than six, and both halves
 *  land in one transaction that one undo takes back whole.
 *
 *  The second half is derived from the document the first half leaves behind, which is the only
 *  coordinate space its offsets are true in; composing the two is what maps them back. */
export function citationGesture(scan: CitationSlice, changes: ChangeSpec[]): ChangeSet {
  const first = ChangeSet.of(changes, scan.text.length)
  const after = first.apply(Text.of(scan.text.split('\n'))).toString()
  return first.compose(ChangeSet.of(normalizeCitations(scanDoc(after)), after.length))
}
