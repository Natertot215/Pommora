import { EditorState, type Extension } from '@codemirror/state'
import { docScan, surfaceScope } from '../docCache'
import type { DocScan } from '../Engine/docScan'
import { moveHolds, renumberRuns } from '../Engine/listModel'
import { lineIndexAt, type TextEdit } from '../Engine/markdownCode'
import { isSequenced, type MarkdownScope } from '../Engine/detect'

/** The user event of an edit that writes list markers: Enter continuing a list, Tab and Shift+Tab, and every list-type pick. */
const RELIST = 'input.list'

/** The edits where a change touching any numbered line reshapes its list: list writes, and indenting or dedenting lines. */
const RESHAPING = [RELIST, 'input.indent', 'delete.dedent']
/** The edits that recount where a change takes or brings a line break, or turns a line numbered or plain. */
const RECOUNTING = ['delete', 'input.paste', 'input.copyline', 'move']

export const editEvent = (edit: { relist?: boolean }): string => (edit.relist ? RELIST : 'input')

const numbered = (s: DocScan, pos: number): boolean => {
  const lm = s.markers[lineIndexAt(s, pos)]
  return lm !== null && isSequenced(lm)
}

// An edit that reshapes a numbered list recounts that list, riding the same transaction so one undo takes both.
export const listRenumber: Extension = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged) return tr
  const reshaping = RESHAPING.some((e) => tr.isUserEvent(e))
  const { from, to } = tr.startState.selection.main
  const overLines = tr.isUserEvent('input') && tr.startState.sliceDoc(from, to).includes('\n')
  if (!reshaping && !overLines && !RECOUNTING.some((e) => tr.isUserEvent(e))) return tr
  const was = docScan(tr.startState)
  const scan = docScan.after(tr)
  const at: number[] = []
  // A line move writes the lines it passes rather than the ones it moves, so it lands where its selection now stands.
  const landings = tr.isUserEvent('move.line')
    ? tr.newSelection.ranges.map((r) => ({
        from: tr.newDoc.lineAt(r.from).from,
        to: tr.newDoc.lineAt(r.to).to + 1,
      }))
    : []
  const drop = tr.isUserEvent('move.drop')
  tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
    const left = numbered(was, fromA)
    const stands = numbered(scan, fromB)
    const reshaped = reshaping
      ? left || stands
      : left !== stands ||
        `${was.text.slice(fromA, toA)}${scan.text.slice(fromB, toB)}`.includes('\n')
    if (reshaped) at.push(fromB, toB)
    if (drop && inserted.lines > 1) landings.push({ from: fromB, to: toB })
  })
  const held = moveHolds(was, scan, landings, (p) => tr.changes.invertedDesc.mapPos(p, 1))
  const changes = renumberRuns(scan, at, held)
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
