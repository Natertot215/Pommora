// The citations section is the document's TAIL — the run has to reach the end, so anything left
// standing after it does not corrupt one line, it literalizes every citation at once. Atomicity
// stops CM's own motion and deletion but never a programmatic dispatch, which is why this sits at
// the transaction layer beside the callout guard rather than in a decoration.
import type { EditorState } from '@codemirror/state'
import { citationScan, splitWithOffsets } from '../detect'
import type { CitationSlice } from './citationEdits'
import { docScan } from './docCache'
import type { GuardVerdict } from './calloutGuard'
import { verdictFilter } from './calloutGuard'

/** Whether the text from `at` onward still reads as a citation run reaching the end. The question is
 *  local to the tail, so it is asked of the tail: a slice, not the document, and only for a change
 *  that reaches the section at all. */
function tailHolds(after: string, at: number): boolean {
  if (at >= after.length) return false
  const s = citationScan(splitWithOffsets(after.slice(at)), [])
  return s.firstLine === 0 && s.entries.length > 0
}

/** The verdict for one change against the section.
 *
 *  Two repairs, and nothing else. An insertion seated at a citation line's very first offset is
 *  clamped past its `[^label]:` — atomic skipping relocates only strictly-interior positions, so
 *  that one seat stays reachable, is invisible (the prefix is zero-width there), and the next
 *  keystroke would otherwise write ahead of the head and end the run. And a change that would leave
 *  the tail no longer reading as a citation run has its text relocated to the body above the
 *  section, where a stray paste at the foot of a page was always going to belong. */
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

  // The head's own first offset. Atomic skipping relocates only strictly-interior positions, so that
  // one seat stays reachable and is invisible — the prefix is zero-width there — and what lands on
  // it would otherwise write ahead of `[^label]:` and end the run. The seat moves past the head; the
  // check below then answers for the text itself, since a paste arrives in exactly this shape.
  const head = fromA === toA && inserted.length > 0
  const entry = head ? c.entries.find((e) => lineStarts[e.line] === fromA) : undefined
  const from = entry ? entry.contentStart : fromA
  const to = entry ? entry.contentStart : toA

  if (to < tailStart) return { kind: 'ok' }
  const after = doc.slice(0, from) + inserted + doc.slice(to)
  if (tailHolds(after, tailStart))
    return entry ? { kind: 'rewrite', from, to, insert: inserted } : { kind: 'ok' }

  // The section could not survive this text where it landed, and moving it past the head does not
  // save it either. Its text goes to the end of the body instead — the line the divider draws on,
  // which keeps the blank the section anchors to.
  const seat = c.anchorLine >= 0 ? lineStarts[c.anchorLine] : 0
  const body = inserted.replace(/^\n+|\n+$/g, '')
  return body === ''
    ? { kind: 'rewrite', from: fromA, to: toA, insert: '' }
    : { kind: 'rewrite', from: seat, to: seat, insert: `${body}\n` }
}

export const citationGuard = verdictFilter((doc, fromA, toA, inserted, state: EditorState) => {
  const s = docScan(state.doc)
  return citationTailVerdict(doc, fromA, toA, inserted, s)
})
