// Repairs deletes that touch a callout body line's hidden `> ` prefix instead of cancelling them — a flat cancel
// made routine gestures silently dead, since their changes legitimately start at the line start.
import { type Annotation, EditorState, Transaction, type Extension } from '@codemirror/state'
import type { calloutLines } from '../Detect'
import { tableSelfEdit } from '../Tables/sync'
import { docScan, docString } from './docCache'

/** The first four move the change's own endpoints; `rewrite` replaces it outright. */
export type GuardVerdict =
  | { kind: 'ok' }
  | { kind: 'cancel' }
  | { kind: 'clamp'; from: number }
  | { kind: 'extend'; to: number }
  /** The change replaced by these edits outright. A list, because a repair that MOVES text is two
   *  disjoint edits — the swept range removed where it was, and the text written where it can live. */
  | { kind: 'rewrite'; edits: readonly { from: number; to: number; insert: string }[] }

export function calloutDeleteVerdict(
  doc: string,
  from: number,
  to: number,
  { lines, info }: { lines: string[]; info: ReturnType<typeof calloutLines> },
): GuardVerdict {
  if (to <= from) return { kind: 'ok' }
  let off = 0
  for (let i = 0; i < lines.length; i++) {
    const lineEnd = off + lines[i].length
    const co = info[i]
    if (from >= off && from <= lineEnd) {
      // Body prefixes only — the head's whole-prefix delete is intentional, and the atomic range blocks partial head corruption.
      if (!co || co.first || co.prefixEnd === 0 || from >= off + co.prefixEnd) {
        // A join that leaves the body's `> ` intact splices a literal `>` into content, so extend it to consume the prefix.
        const ext = joinExtension(lines, info, from, to)
        return ext === null ? { kind: 'ok' } : { kind: 'extend', to: ext }
      }
      if (to >= lineEnd + 1 || to >= doc.length) return { kind: 'ok' }
      if (co.prefixEnd >= lines[i].length) return { kind: 'ok' }
      if (to >= off + co.prefixEnd) return { kind: 'clamp', from: off + co.prefixEnd }
      return { kind: 'cancel' }
    }
    off = lineEnd + 1
  }
  return { kind: 'ok' }
}

// Where the delete must extend to for a clean join, when it removes the newline before a body line but stops inside its `> ` prefix.
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

/** A filter rebuilds its transaction from the start state, so a construct's own annotation is gone unless named
 *  here — and a downstream guard would read that write as a user edit. CM exposes no way to enumerate them. */
function carriedAnnotations(tr: Transaction): Annotation<unknown>[] {
  const out: Annotation<unknown>[] = []
  const userEvent = tr.annotation(Transaction.userEvent)
  if (userEvent !== undefined) out.push(Transaction.userEvent.of(userEvent))
  const selfEdit = tr.annotation(tableSelfEdit)
  if (selfEdit !== undefined) out.push(tableSelfEdit.of(selfEdit))
  return out
}

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
      if (v.kind === 'rewrite') changes.push(...v.edits)
      else
        changes.push({
          from: v.kind === 'clamp' ? v.from : fromA,
          to: v.kind === 'extend' ? v.to : toA,
          insert: inserted.toString(),
        })
    })
    if (cancel) return []
    if (!repaired) return tr
    // The selection is left to default mapping — the caret lands where the repaired change puts it.
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
  const s = docScan(state.doc)
  return calloutDeleteVerdict(doc, fromA, toA, { lines: s.lines, info: s.callouts })
})
