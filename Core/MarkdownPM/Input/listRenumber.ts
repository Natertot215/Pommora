import { EditorState, type Extension } from '@codemirror/state'
import { docScan, docString } from '../docCache'
import { dedupeChanges, renumberSequencedRun } from '../Engine/listDragModel'
import { inFenceAt } from '../Engine/docScan'
import type { TextEdit } from '../Engine/markdownCode'
import type { MarkdownScope } from '../Engine/detect'

// A deletion that removes a whole line from a sequenced run leaves the ordinals gapped. The renumber rides the same transaction, so one undo takes both; a deletion landing in a page's code renumbers nothing.
export const listRenumberOnDelete = (scope: MarkdownScope): Extension =>
  EditorState.transactionFilter.of((tr) => {
    if (!tr.docChanged || !tr.isUserEvent('delete')) return tr
    const startDoc = docString(tr.startState.doc)
    const scan = docScan.after(tr)
    const runs: TextEdit[] = []
    tr.changes.iterChanges((fromA, toA, fromB) => {
      if (!startDoc.slice(fromA, toA).includes('\n')) return
      const at = Math.min(fromB, scan.text.length)
      if (scope === 'page' && inFenceAt(scan, at)) return
      runs.push(...renumberSequencedRun(scan.text, at))
    })
    const changes = dedupeChanges(runs)
    return changes.length === 0 ? tr : [tr, { changes, sequential: true }]
  })
