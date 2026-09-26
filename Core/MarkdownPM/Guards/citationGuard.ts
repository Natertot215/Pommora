// The citations section must reach the document's end — anything left standing after it literalizes every citation at once. Atomicity stops CM's own motion but never a programmatic dispatch, so this sits at the transaction layer.
import type { EditorState } from '@codemirror/state'
import { citationEntries, splitWithOffsets } from '../Engine/detect'
import { lineEndOf } from '../Engine/markdownCode'
import type { CitationSlice } from '../Citations/citationEdits'
import { docScan } from '../docCache'
import { type GuardVerdict, verdictFilter } from './verdictFilter'

function tailHolds(after: string, at: number): boolean {
  if (at >= after.length || (at > 0 && after[at - 1] !== '\n')) return false
  return citationEntries(splitWithOffsets(after.slice(at)), () => false)[0]?.line === 0
}

/** Three repairs, nothing else: an insertion at a citation line's first offset is clamped past its `[^label]:` (atomic skipping relocates only strictly-interior positions, so that seat stays reachable and invisible), a change from the body that joins the section's first standing head onto its line ends with a newline, and any other change leaving the tail no longer reading as a run has its text relocated to the body above the section. */
export function citationTailVerdict(
  doc: string,
  fromA: number,
  toA: number,
  inserted: string,
  scan: CitationSlice,
): GuardVerdict {
  const { citations: c, lines, lineStarts } = scan
  if (c.firstLine >= lines.length) return { kind: 'ok' }
  const tailStart = lineStarts[c.firstLine]

  const head = fromA === toA && inserted.length > 0
  const entry = head ? c.entries.find((e) => lineStarts[e.line] === fromA) : undefined
  const from = entry ? entry.contentStart : fromA
  const to = entry ? entry.contentStart : toA

  if (to < tailStart) return { kind: 'ok' }
  // The section now starts at the first head the change left standing; with none left standing, it was removed rather than stranded.
  const kept = c.entries.find((e) => lineStarts[e.line] < from || lineStarts[e.line] >= to)
  if (!kept) return { kind: 'ok' }
  const keptAt = lineStarts[kept.line]
  const start = keptAt < from ? keptAt : keptAt + inserted.length - (to - from)
  const after = doc.slice(0, from) + inserted + doc.slice(to)
  if (tailHolds(after, start))
    return entry ? { kind: 'rewrite', edits: [{ from, to, insert: inserted }] } : { kind: 'ok' }

  // Where the anchor holds prose, the body ends at that line's END — seating text at its start would land it above the paragraph it was written below.
  const prose = c.anchorLine >= 0 && lines[c.anchorLine].trim() !== ''
  const seat =
    c.anchorLine < 0 ? 0 : prose ? lineEndOf(scan, c.anchorLine) : lineStarts[c.anchorLine]
  // A sweep that began at or above the seat keeps its replacement where it was aimed; what broke the run is the head it joined, so the head gets its line back.
  if (fromA <= seat)
    return { kind: 'rewrite', edits: [{ from: fromA, to: toA, insert: `${inserted}\n` }] }
  // Whitespace alone isn't text to rescue (the space that turns a typed `-` into a list marker), so it is refused.
  const body = inserted.trim() === '' ? '' : inserted.replace(/^\n+|\n+$/g, '')
  if (body === '') return { kind: 'rewrite', edits: [{ from: fromA, to: toA, insert: '' }] }
  return {
    kind: 'rewrite',
    edits: [
      ...(fromA < toA ? [{ from: fromA, to: toA, insert: '' }] : []),
      { from: seat, to: seat, insert: prose ? `\n${body}` : `${body}\n` },
    ],
  }
}

export const citationGuard = verdictFilter((doc, fromA, toA, inserted, state: EditorState) => {
  const s = docScan(state.doc)
  return citationTailVerdict(doc, fromA, toA, inserted, s)
})
