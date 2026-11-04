import { EditorState, type Extension } from '@codemirror/state'
import { docScan } from '../docCache'
import { itemAt, readsFrom, renumberRuns, subBlockAt } from '../Engine/listModel'
import { applyEdits, lineIndexAt, type TextEdit } from '../Engine/markdownCode'
import { isSequenced, type MarkdownScope } from '../Engine/detect'

/** The user event of an edit that writes list markers: Enter continuing a list, Tab and Shift+Tab, and the Lists menu. */
const RELIST = 'input.list'

export const editEvent = (edit: { relist?: boolean }): string => (edit.relist ? RELIST : 'input')

// Every edit that reshapes a sequenced run counts it here, riding the same transaction so one undo takes both: a marker-writing edit recounts the runs it touched and, where a line it touched was numbered or lettered, the run just below that item's nesting, which is the one a nested or switched item left, and a numbered or lettered marker it wrote over whole restarts its run from 1 or A, while a re-pick that leaves the text as it was lands nothing; a deletion that removes a whole line closes the gap it leaves, and one that removes a whole numbered or lettered marker recounts the run below it, as a switched item does. Nothing inside a page's math or tables is counted, and a code block's own list counts only for a marker-writing edit inside it.
export const listRenumber = (scope: MarkdownScope): Extension =>
  EditorState.transactionFilter.of((tr) => {
    if (!tr.docChanged) return tr
    const relist = tr.isUserEvent(RELIST)
    if (!relist && !tr.isUserEvent('delete')) return tr
    const was = docScan(tr.startState.doc)
    const scan = docScan.after(tr)
    const at: number[] = []
    const arrived = new Set<number>()
    const repicked = new Set<number>()
    tr.changes.iterChanges((fromA, toA, fromB, toB) => {
      let below = -1
      for (let i = lineIndexAt(was, fromA); i <= lineIndexAt(was, toA); i++) {
        const lm = itemAt(was, i, relist ? i : 'outside', scope)
        if (lm === null || !isSequenced(lm)) continue
        const ls = was.lineStarts[i]
        const whole = fromA <= ls + lm.markerStart && toA >= ls + lm.contentStart
        if (!relist && !whole) continue
        below = Math.max(below, subBlockAt(was, ls, scope)!.to + 1)
        if (relist && whole) repicked.add(tr.changes.mapPos(ls))
      }
      if (relist)
        for (let i = lineIndexAt(scan, fromB); i <= lineIndexAt(scan, toB); i++) {
          const ls = scan.lineStarts[i]
          const lm = itemAt(scan, i, i, scope)
          if (lm === null) continue
          at.push(ls)
          if (fromB < ls + lm.contentStart && toB >= ls) arrived.add(ls)
        }
      else if (
        was.text.slice(fromA, toA).includes('\n') &&
        readsFrom(scan, lineIndexAt(scan, fromB), 'outside', scope)
      )
        at.push(fromB)
      if (below > 0 && below < was.text.length) at.push(tr.changes.mapPos(below))
    })
    const changes = renumberRuns(scan, scope, at, arrived, repicked)
    if (repicked.size > 0 && applyEdits(scan.text, changes) === was.text) return {}
    return changes.length === 0 ? tr : [tr, { changes, sequential: true }]
  })

/** An edit as the editor lands it: its changes, then the list renumber that rides the same transaction. */
export function landEdit(
  doc: string,
  changes: readonly TextEdit[],
  userEvent: string,
  scope: MarkdownScope,
): string {
  return EditorState.create({ doc, extensions: listRenumber(scope) })
    .update({ changes: [...changes], userEvent })
    .state.doc.toString()
}
