// The citations section must reach the document's end — anything left standing after it
// literalizes every citation at once. Atomicity stops CM's own motion and deletion but never a
// programmatic dispatch, so this sits at the transaction layer beside the callout guard rather
// than in a decoration.
import type { EditorState } from '@codemirror/state'
import { citationScan, lineEndOf, splitWithOffsets } from '../Detect'
import type { CitationSlice } from './citationEdits'
import { docScan } from './docCache'
import type { GuardVerdict } from './calloutGuard'
import { verdictFilter } from './calloutGuard'

/** Whether the text from `at` onward still reads as a citation run reaching the end — checked
 *  against a slice of the tail, not the full document. */
function tailHolds(after: string, at: number): boolean {
  if (at >= after.length) return false
  const s = citationScan(splitWithOffsets(after.slice(at)), [])
  return s.firstLine === 0 && s.entries.length > 0
}

/** The verdict for one change against the section. Two repairs, nothing else: an insertion seated
 *  at a citation line's first offset is clamped past its `[^label]:` (atomic skipping only relocates
 *  strictly-interior positions, so that seat stays reachable and invisible, and the next keystroke
 *  would otherwise write ahead of the head and end the run); and a change that would leave the tail
 *  no longer reading as a citation run has its text relocated to the body above the section. */
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
  const after = doc.slice(0, from) + inserted + doc.slice(to)
  if (tailHolds(after, tailStart))
    return entry ? { kind: 'rewrite', edits: [{ from, to, insert: inserted }] } : { kind: 'ok' }

  // The section can't survive this text, so its text is relocated to the end of the body instead.
  // If the anchor line is the blank the section floats on, that's above the blank, keeping the gap;
  // if the anchor holds prose, the body ends at that line's end (seating text at its start would
  // land it above the paragraph it was written below).
  const prose = c.anchorLine >= 0 && lines[c.anchorLine].trim() !== ''
  const seat =
    c.anchorLine < 0 ? 0 : prose ? lineEndOf(scan, c.anchorLine) : lineStarts[c.anchorLine]
  // Whitespace alone isn't text to rescue (e.g. the space that turns a typed `-` into a list
  // marker) — relocating it would write debris into the body, so it's refused instead.
  const body = inserted.trim() === '' ? '' : inserted.replace(/^\n+|\n+$/g, '')
  if (body === '') return { kind: 'rewrite', edits: [{ from: fromA, to: toA, insert: '' }] }
  // A sweep that already began at or above the seat owns a place in the body for its replacement,
  // so it goes through as a plain replacement — the guard stops text being stranded, not removed.
  if (fromA <= seat) return { kind: 'ok' }
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
