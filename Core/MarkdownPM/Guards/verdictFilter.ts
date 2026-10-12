import { EditorState, Transaction, type Extension } from '@codemirror/state'
import { docString } from '../docCache'
import type { TextEdit } from '../Engine/markdownCode'

/** `rewrite` replaces the change with its edits — a list, because a repair that MOVES text is two disjoint edits: the swept range removed where it was, and the text written where it can live. Typing resumes at `caret` in the repaired document; without one, the old selection maps through the repair. */
export type GuardVerdict =
  | { kind: 'ok' }
  | { kind: 'cancel' }
  | { kind: 'rewrite'; edits: readonly TextEdit[]; caret?: number }

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
    let caret: number | undefined
    const changes: TextEdit[] = []
    tr.changes.iterChanges((fromA, toA, _fromB, _toB, text) => {
      const insert = text.toString()
      const v = verdict(doc, fromA, toA, insert, tr.startState)
      if (v.kind === 'cancel') cancel = true
      if (v.kind === 'rewrite') {
        repaired = true
        caret = v.caret
        changes.push(...v.edits)
      } else changes.push({ from: fromA, to: toA, insert })
    })
    if (cancel) return []
    if (!repaired) return tr
    return [
      {
        changes,
        selection: tr.selection && caret !== undefined ? { anchor: caret } : undefined,
        effects: tr.effects,
        scrollIntoView: tr.scrollIntoView,
        userEvent: tr.annotation(Transaction.userEvent),
      },
    ]
  })
}
