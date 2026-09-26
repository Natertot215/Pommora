import { type Annotation, EditorState, Transaction, type Extension } from '@codemirror/state'
import { tableSelfEdit } from '../Tables/sync'
import { docString } from '../docCache'
import type { TextEdit } from '../Engine/markdownCode'

/** The first four move the change's own endpoints; `rewrite` replaces it outright. */
export type GuardVerdict =
  | { kind: 'ok' }
  | { kind: 'cancel' }
  | { kind: 'clamp'; from: number }
  | { kind: 'extend'; to: number }
  /** A list, because a repair that MOVES text is two disjoint edits — the swept range removed where it was, and the text written where it can live. */
  | { kind: 'rewrite'; edits: readonly TextEdit[] }

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
    const changes: TextEdit[] = []
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
