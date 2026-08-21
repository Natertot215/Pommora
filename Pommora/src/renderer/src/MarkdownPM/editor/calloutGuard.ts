// Repairs deletes that touch a callout BODY line's hidden `> ` prefix, instead of cancelling them — a flat
// cancel made routine gestures (triple-click delete, Cmd+Backspace, drag-out) silently dead, since their
// changes legitimately start at the line start. Verdicts below encode which repair each case needs.
import { type Annotation, EditorState, Transaction, type Extension } from '@codemirror/state'
import { calloutLines } from '../detect'
import { tableSelfEdit } from '../Tables/sync'
import { docScan, docString } from './docCache'

/** What a guard says about one change. The first four move the change's own endpoints; `rewrite`
 *  replaces it outright, for a repair that has to put different text somewhere else. */
export type GuardVerdict =
  | { kind: 'ok' }
  | { kind: 'cancel' }
  | { kind: 'clamp'; from: number }
  | { kind: 'extend'; to: number }
  | { kind: 'rewrite'; from: number; to: number; insert: string }

export function calloutDeleteVerdict(
  doc: string,
  from: number,
  to: number,
  scan?: { lines: string[]; info: ReturnType<typeof calloutLines> },
): GuardVerdict {
  if (to <= from) return { kind: 'ok' }
  const { lines, info } =
    scan ??
    (() => {
      const ls = doc.split('\n')
      return { lines: ls, info: calloutLines(ls) }
    })()
  let off = 0
  for (let i = 0; i < lines.length; i++) {
    const lineEnd = off + lines[i].length
    const co = info[i]
    if (from >= off && from <= lineEnd) {
      // Body prefixes only — the head's whole-prefix delete (de-callout) is intentional, and the atomic
      // range already blocks partial head corruption.
      if (!co || co.first || co.prefixEnd === 0 || from >= off + co.prefixEnd) {
        // The delete starts cleanly but may JOIN a following body line up (forward-delete of the newline).
        // A join that leaves the body's `> ` intact splices a literal `>` into content — extend the join
        // to consume the whole prefix, like smartBackspace's join does.
        const ext = joinExtension(lines, info, from, to)
        return ext === null ? { kind: 'ok' } : { kind: 'extend', to: ext }
      }
      // Removing the line WITH its newline (or through EOF) keeps the remaining box contiguous.
      if (to >= lineEnd + 1 || to >= doc.length) return { kind: 'ok' }
      // A prefix-only line — the box's own blank `>` — holds no content for the clamp to protect, so
      // clamping it would only turn the delete into a zero-length no-op.
      if (co.prefixEnd >= lines[i].length) return { kind: 'ok' }
      if (to >= off + co.prefixEnd) return { kind: 'clamp', from: off + co.prefixEnd }
      return { kind: 'cancel' }
    }
    off = lineEnd + 1
  }
  return { kind: 'ok' }
}

// When [from, to) removes the newline before a callout BODY line but stops inside (or at the start of) its
// `> ` prefix, return the position the delete must extend to (prefix end) so the join is clean; else null.
function joinExtension(
  lines: string[],
  info: ReturnType<typeof calloutLines>,
  from: number,
  to: number,
): number | null {
  let off = 0
  for (let i = 0; i < lines.length; i++) {
    const lineEnd = off + lines[i].length
    const co = info[i]
    if (co && !co.first && co.prefixEnd > 0 && from < off && to >= off && to < off + co.prefixEnd) {
      return off + co.prefixEnd
    }
    if (off > to) break
    off = lineEnd + 1
  }
  return null
}

/** True when deleting [from, to) would erode a callout BODY line's `>` prefix in place — a clamped repair
 *  and a cancel both count as "strips". Pure + exported for tests. */
export function stripsCalloutPrefix(doc: string, from: number, to: number): boolean {
  return calloutDeleteVerdict(doc, from, to).kind !== 'ok'
}

/** The annotations a re-issued spec has to carry. A filter rebuilds its transaction from the start
 *  state, so anything a construct stamped on its own write is gone unless it is named here — and a
 *  dropped self-edit annotation makes a downstream guard read that construct's write as a user edit.
 *  CodeMirror exposes no way to enumerate a transaction's annotations, so this list IS the
 *  enumeration: a new annotation that rides a document change joins it. */
function carriedAnnotations(tr: Transaction): Annotation<unknown>[] {
  const out: Annotation<unknown>[] = []
  const userEvent = tr.annotation(Transaction.userEvent)
  if (userEvent !== undefined) out.push(Transaction.userEvent.of(userEvent))
  const selfEdit = tr.annotation(tableSelfEdit)
  if (selfEdit !== undefined) out.push(tableSelfEdit.of(selfEdit))
  return out
}

/** THE guard shape: read the start state's cached scan, put every change to a verdict, and re-issue
 *  only what a verdict moved. A guard that copied this body instead of calling it would be a second
 *  re-issue path, and only one of the two would ever get the next fix to it. */
export function verdictFilter(
  verdict: (
    doc: string,
    fromA: number,
    toA: number,
    inserted: string,
    state: EditorState,
  ) => GuardVerdict,
): Extension {
  return EditorState.transactionFilter.of((tr) => {
    if (!tr.docChanged) return tr
    const doc = docString(tr.startState.doc)
    let cancel = false
    let repaired = false
    const changes: { from: number; to: number; insert: string }[] = []
    tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
      const v = verdict(doc, fromA, toA, inserted.toString(), tr.startState)
      if (v.kind === 'cancel') cancel = true
      if (v.kind !== 'ok') repaired = true
      changes.push(
        v.kind === 'rewrite'
          ? { from: v.from, to: v.to, insert: v.insert }
          : {
              from: v.kind === 'clamp' ? v.from : fromA,
              to: v.kind === 'extend' ? v.to : toA,
              insert: inserted.toString(),
            },
      )
    })
    if (cancel) return [] // nothing sane to repair it into
    if (!repaired) return tr
    // The selection is left to default mapping — the caret lands where the repaired change puts it,
    // which is the repaired intent.
    return [
      {
        changes,
        effects: tr.effects,
        scrollIntoView: tr.scrollIntoView,
        annotations: carriedAnnotations(tr),
      },
    ]
  })
}

export const calloutGuard: Extension = verdictFilter((doc, fromA, toA, _inserted, state) => {
  const s = docScan(state.doc) // shared per-version — not re-split per change
  return calloutDeleteVerdict(doc, fromA, toA, { lines: s.lines, info: s.callouts })
})
