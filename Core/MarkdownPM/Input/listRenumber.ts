import { EditorState, type Extension } from '@codemirror/state'
import { docScan, surfaceScope } from '../docCache'
import type { DocScan } from '../Engine/docScan'
import { renumberRuns } from '../Engine/listModel'
import { lineIndexAt, type TextEdit } from '../Engine/markdownCode'
import { isSequenced, type MarkdownScope } from '../Engine/detect'

/** The user event of an edit that writes list markers: Enter continuing a list, Tab and Shift+Tab, and every list-type pick. */
const RELIST = 'input.list'

export const editEvent = (edit: { relist?: boolean }): string => (edit.relist ? RELIST : 'input')

const numbered = (s: DocScan, pos: number): boolean => {
  const lm = s.markers[lineIndexAt(s, pos)]
  return lm !== null && isSequenced(lm)
}

// An edit that reshapes a numbered list recounts that list, riding the same transaction so one undo takes both.
export const listRenumber: Extension = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged) return tr
  const relist = tr.isUserEvent(RELIST)
  const { from, to } = tr.startState.selection.main
  const overLines = tr.isUserEvent('input') && tr.startState.sliceDoc(from, to).includes('\n')
  if (!relist && !overLines && !tr.isUserEvent('delete') && !tr.isUserEvent('input.paste'))
    return tr
  const was = docScan(tr.startState)
  const scan = docScan.after(tr)
  const at: number[] = []
  tr.changes.iterChanges((fromA, toA, fromB, toB) => {
    const left = numbered(was, fromA)
    const stands = numbered(scan, fromB)
    const reshaped = relist
      ? left || stands
      : left !== stands ||
        `${was.text.slice(fromA, toA)}${scan.text.slice(fromB, toB)}`.includes('\n')
    if (reshaped) at.push(fromB, toB)
  })
  const changes = renumberRuns(scan, at)
  return changes.length === 0 ? tr : [tr, { changes, sequential: true }]
})

/** An edit as the editor lands it: its changes, then the list renumber that rides the same transaction. */
export function landEdit(
  doc: string,
  changes: readonly TextEdit[],
  userEvent: string,
  scope: MarkdownScope,
): string {
  return EditorState.create({ doc, extensions: [surfaceScope.of(scope), listRenumber] })
    .update({ changes: [...changes], userEvent })
    .state.doc.toString()
}
