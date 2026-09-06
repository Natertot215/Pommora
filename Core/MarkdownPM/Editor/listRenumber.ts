import { EditorState, type Extension } from '@codemirror/state'
import { docString } from './docCache'
import { renumberOrderedRun, type ChangeSpec } from './listDragModel'

// A deletion that removes a whole line from an ordered run leaves the numbers gapped — 1, 3 where
// 1, 2 should stand. The renumber rides the same transaction, so one undo takes both.
export const listRenumberOnDelete: Extension = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged || !tr.isUserEvent('delete')) return tr
  const startDoc = docString(tr.startState.doc)
  const newDoc = docString(tr.newDoc)
  const changes: ChangeSpec[] = []
  const seen = new Set<number>()
  tr.changes.iterChanges((fromA, toA, fromB) => {
    if (!startDoc.slice(fromA, toA).includes('\n')) return
    for (const c of renumberOrderedRun(newDoc, Math.min(fromB, newDoc.length))) {
      if (seen.has(c.from)) continue
      seen.add(c.from)
      changes.push(c)
    }
  })
  return changes.length === 0 ? tr : [tr, { changes, sequential: true }]
})
