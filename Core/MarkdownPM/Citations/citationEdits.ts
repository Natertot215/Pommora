// Cascades are keyed to the RANGE, never to the gesture (B-11): one fires only where the deleted range is exactly the construct, so a wide sweep never silently takes citations the reader never saw.
import { ChangeSet, type ChangeSpec, Text } from '@codemirror/state'
import {
  type CitationEntry,
  type CitationScan,
  type DocLines,
  type MarkerRef,
  citationFor,
  citationsFor,
  foldLabel,
  isLastReference,
  lineEndOf,
  markersFor,
} from '../Engine/detect'
import { scanDoc } from '../Engine/docScan'
import { diffAsSingleReplace } from '../Engine/listDragModel'

export type CitationSlice = DocLines & { citations: CitationScan }

const erase = ({ from, to }: { from: number; to: number }): ChangeSpec => ({ from, to, insert: '' })

/** Or the newline that precedes them at the document's end, so removing the last citation leaves no orphaned blank. */
function lineSpan(scan: CitationSlice, from: number, to: number): { from: number; to: number } {
  const start = scan.lineStarts[from]
  const end = lineEndOf(scan, to)
  return end < scan.text.length
    ? { from: start, to: end + 1 }
    : { from: Math.max(0, start - 1), to: end }
}

function cutRows(scan: CitationSlice, rows: CitationEntry[]): ChangeSpec[] {
  const runs: CitationEntry[][] = []
  for (const e of rows) {
    const run = runs[runs.length - 1]
    if (run && run[run.length - 1].lastLine + 1 === e.line) run.push(e)
    else runs.push([e])
  }
  return runs.map((run) => erase(lineSpan(scan, run[0].line, run[run.length - 1].lastLine)))
}

/** The definition of what "the footnote" is, so the two cascades and a swept run of rows can't disagree about how much goes. */
function cutFootnotes(scan: CitationSlice, entries: CitationEntry[]): ChangeSpec[] {
  const labels = [...new Set(entries.map((e) => foldLabel(e.label)))]
  const rows = labels
    .flatMap((l) => citationsFor(scan.citations, l))
    .sort((a, b) => a.line - b.line)
  const markers = labels.flatMap((l) => markersFor(scan.citations, l))
  return [...markers.map(erase), ...cutRows(scan, rows)]
}

/** A footnote nothing points at is an orphan, and the gesture that made it one answers for it. */
export function deleteMarkerChanges(scan: CitationSlice, marker: MarkerRef): ChangeSpec[] {
  const entry = citationFor(scan.citations, marker.label)
  if (!entry || !isLastReference(scan.citations, marker)) return [erase(marker)]
  return cutFootnotes(scan, [entry])
}

export function deleteCitationChanges(scan: CitationSlice, entry: CitationEntry): ChangeSpec[] {
  return cutFootnotes(scan, [entry])
}

/** Null where the range is not exactly one construct, and the deletion goes through as a plain removal. A caret counts: a marker is atomic and has no interior to land in. */
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
  const covered = c.entries.filter(
    (e) => scan.lineStarts[e.line] >= from && lineEndOf(scan, e.lastLine) <= to,
  )
  if (covered.length === 0) return null
  const first = covered[0]
  const last = covered[covered.length - 1]
  if (scan.lineStarts[first.line] !== from) return null
  if (lineEndOf(scan, last.lastLine) !== to) return null
  return cutFootnotes(scan, covered)
}

const numericLabel = (label: string): boolean => /^\d+$/.test(label)

/** Numeric labels are the gesture's to rewrite; a word label is the user's and only ever moves. The result is diffed back rather than derived edit by edit, since a reorder's edits do not commute. */
export function normalizeCitations(scan: CitationSlice): ChangeSpec[] {
  const { text, lines, lineStarts, citations: c } = scan
  if (c.entries.length === 0) return []

  const placed = c.entries.filter((e) => e.ordinal !== null)
  const loose = c.entries.filter((e) => e.ordinal === null)
  // A rename this pass refuses leaves that row's number standing, which can occupy the number the next row wanted.
  const shadowed = new Set(placed.map((e) => foldLabel(e.label)))
  const held = new Set(
    loose
      .filter((e) => !shadowed.has(foldLabel(e.label)))
      .map((e) => e.label)
      .filter(numericLabel),
  )
  const renamed = new Map<string, string>()
  for (let settled = false; !settled; ) {
    settled = true
    renamed.clear()
    for (const e of placed) {
      const want = String(e.ordinal)
      if (!numericLabel(e.label) || e.label === want) continue
      if (!held.has(want)) {
        renamed.set(foldLabel(e.label), want)
      } else if (!held.has(e.label)) {
        held.add(e.label)
        settled = false
      }
    }
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

/** Never above `at`: a caret on the empty last line sits past the body's last content, and a citation behind it strands the marker. */
export function citationGesture(scan: CitationSlice, changes: ChangeSpec[]): ChangeSet {
  const first = ChangeSet.of(changes, scan.text.length)
  const after = first.apply(Text.of(scan.lines)).toString()
  return first.compose(ChangeSet.of(normalizeCitations(scanDoc(after)), after.length))
}

export function mintLabel(c: CitationScan): string {
  const taken = new Set([...c.entries, ...c.markers].map((x) => foldLabel(x.label)))
  let n = 1
  while (taken.has(String(n))) n++
  return String(n)
}

/** A citation is one paragraph, and a list marker parses at any indent, so a multi-line paste could end the run it was written into. */
function citationSeat(scan: CitationSlice, at: number): { at: number; lead: string } {
  const { lines, citations: c } = scan
  const last = c.entries[c.entries.length - 1]
  if (last) return { at: lineEndOf(scan, last.lastLine), lead: '\n' }
  let body = 0
  for (let i = lines.length - 1; i >= 0; i--)
    if (lines[i].trim() !== '') {
      body = lineEndOf(scan, i)
      break
    }
  return { at: Math.max(body, at), lead: '\n\n' }
}

export function citationRowChanges(
  scan: CitationSlice,
  label: string,
  text: string,
  at: number,
): ChangeSpec {
  const seat = citationSeat(scan, at)
  return { from: seat.at, to: seat.at, insert: `${seat.lead}[^${label}]: ${text}` }
}

export const citationText = (clipboard: string): string => clipboard.trim().replace(/\s+/g, ' ')
