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
  isLastReference,
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

/** Every row a label claims — the one that binds and any duplicate that lost. A duplicate is an
 *  orphan the moment its winner goes, so the two travel together here exactly as they do through a
 *  renumber. */
const rowsFor = (c: CitationScan, label: string): CitationEntry[] => {
  const key = foldLabel(label)
  return c.entries.filter((e) => foldLabel(e.label) === key)
}

/** Whole citation rows removed. Consecutive rows are cut as ONE span, because per-row spans overlap
 *  on the newline between them and each would claim it; rows with something between them cannot
 *  overlap and are cut separately. */
function cutRows(scan: CitationSlice, rows: CitationEntry[]): ChangeSpec[] {
  const runs: CitationEntry[][] = []
  for (const e of rows) {
    const run = runs[runs.length - 1]
    if (run && run[run.length - 1].lastLine + 1 === e.line) run.push(e)
    else runs.push([e])
  }
  return runs.map((run) => erase(lineSpan(scan, run[0].line, run[run.length - 1].lastLine)))
}

/** A whole footnote: every row its label claims, and every marker bound to it. THE definition of
 *  what "the footnote" is, so the marker's cascade, the citation's cascade and a swept run of rows
 *  cannot come to disagree about how much of it goes. */
function cutFootnotes(scan: CitationSlice, entries: CitationEntry[]): ChangeSpec[] {
  const labels = [...new Set(entries.map((e) => foldLabel(e.label)))]
  return [
    ...labels.flatMap((l) => markersFor(scan.citations, l)).map(erase),
    ...cutRows(
      scan,
      labels.flatMap((l) => rowsFor(scan.citations, l)),
    ),
  ]
}

/** Deleting exactly one marker. It takes its footnote with it when it was the last reference — a
 *  footnote nothing points at is an orphan, and the gesture that made it one is the one that should
 *  answer for it. */
export function deleteMarkerChanges(scan: CitationSlice, marker: MarkerRef): ChangeSpec[] {
  const entry = citationFor(scan.citations, marker.label)
  if (!entry || !isLastReference(scan.citations, marker)) return [erase(marker)]
  return cutRows(scan, rowsFor(scan.citations, marker.label)).concat(erase(marker))
}

/** Deleting exactly one citation. Every marker bound to it goes in the same transaction — the
 *  inverse of the body-side cascade, and the alternative is leaving raw `[^label]` scattered through
 *  prose that used to read as a number. */
export function deleteCitationChanges(scan: CitationSlice, entry: CitationEntry): ChangeSpec[] {
  return cutFootnotes(scan, [entry])
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
  return cutFootnotes(scan, covered)
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
  // A number is genuinely occupied only by a row that KEEPS it. An orphan keeps its own; a duplicate
  // that lost travels with the winner it shares a label with, so its number is being vacated. And a
  // rename this pass refuses leaves that row's own number standing, which can occupy the number the
  // next row wanted — so the set is grown until it stops growing, and no two rows can be renamed
  // onto one label and silently fused.
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

/** A footnote gesture's whole edit: what it writes or removes, composed with the renormalization
 *  that follows it. The three creations and the three deletions all end here, so "renumber and
 *  reorder afterwards" is one fact rather than six, and both halves land in one transaction that
 *  one undo takes back whole.
 *
 *  The second half is derived from the document the first half leaves behind, which is the only
 *  coordinate space its offsets are true in; composing the two is what maps them back. */
export function citationGesture(scan: CitationSlice, changes: ChangeSpec[]): ChangeSet {
  const first = ChangeSet.of(changes, scan.text.length)
  const after = first.apply(Text.of(scan.lines)).toString()
  return first.compose(ChangeSet.of(normalizeCitations(scanDoc(after)), after.length))
}

/** The smallest number no label in the document already spells. A word label can never collide with
 *  one, and an orphan's number is taken like any other; the normalization that follows settles the
 *  order, so the mint only has to be free. */
export function mintLabel(c: CitationScan): string {
  const taken = new Set([...c.entries, ...c.markers].map((x) => foldLabel(x.label)))
  let n = 1
  while (taken.has(String(n))) n++
  return String(n)
}

/** Where a new citation is written: after the section's last row, or after the body where there is
 *  no section yet. Never above `at` — a caret on the empty last line of a document sits past the
 *  body's last content, and a citation seated behind it would leave the marker below the section it
 *  just created, which is the state the whole feature is built to prevent. */
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

/** A new citation row at the document's end. Its half of every creation gesture — what lands in the
 *  body is the gesture's own, a whole marker for a menu and the closing bracket alone for a label
 *  being typed, and `at` is where that lands. */
export function citationRowChanges(
  scan: CitationSlice,
  label: string,
  text: string,
  at: number,
): ChangeSpec {
  const seat = citationSeat(scan, at)
  return { from: seat.at, to: seat.at, insert: `${seat.lead}[^${label}]: ${text}` }
}

/** A clipboard shaped into one citation's text: every run of whitespace, blank lines included,
 *  becomes a single space. A citation is one paragraph — a following line continues it only while
 *  nothing on it starts a block, and a list marker parses at any indent, so a paste kept across
 *  several lines is a paste that can end the run it was written into. */
export const citationText = (clipboard: string): string => clipboard.trim().replace(/\s+/g, ' ')
