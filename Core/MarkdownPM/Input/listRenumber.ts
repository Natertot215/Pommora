import { EditorState, type Extension } from '@codemirror/state'
import { docString } from '../docCache'
import { renumberSequencedRun, type ChangeSpec } from '../Engine/listDragModel'

// A deletion that removes a whole line from a sequenced run leaves the ordinals gapped. The renumber rides the same transaction, so one undo takes both.
export const listRenumberOnDelete: Extension = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged || !tr.isUserEvent('delete')) return tr
  const startDoc = docString(tr.startState.doc)
  const newDoc = docString(tr.newDoc)
  const changes: ChangeSpec[] = []
  const seen = new Set<number>()
  tr.changes.iterChanges((fromA, toA, fromB) => {
    if (!startDoc.slice(fromA, toA).includes('\n')) return
    for (const c of renumberSequencedRun(newDoc, Math.min(fromB, newDoc.length))) {
      if (seen.has(c.from)) continue
      seen.add(c.from)
      changes.push(c)
    }
  })
  return changes.length === 0 ? tr : [tr, { changes, sequential: true }]
})
