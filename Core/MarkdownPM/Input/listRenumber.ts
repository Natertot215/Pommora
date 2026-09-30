import { EditorState, type Extension } from '@codemirror/state'
import { docScan, docString } from '../docCache'
import { renumberRuns } from '../Engine/listDragModel'
import { inSealedLine } from '../Engine/docScan'
import { lineIndexAt } from '../Engine/markdownCode'
import { isSequenced, parseListMarkerPrefixed, type MarkdownScope } from '../Engine/detect'

/** The user event of an edit that writes list markers: Enter continuing a list, Tab and Shift+Tab, and the Lists menu. */
export const RELIST = 'input.list'

// Every edit that reshapes a sequenced run counts it here, riding the same transaction so one undo takes both: a marker-writing edit recounts the runs it touched and, where it touched a numbered or lettered item, the run just below, which is the one a nested item left; a deletion that removes a whole line closes the gap it leaves. Nothing inside a page's code, math or tables is counted.
export const listRenumber = (scope: MarkdownScope): Extension =>
  EditorState.transactionFilter.of((tr) => {
    if (!tr.docChanged) return tr
    const relist = tr.isUserEvent(RELIST)
    if (!relist && !tr.isUserEvent('delete')) return tr
    const startDoc = docString(tr.startState.doc)
    const scan = docScan.after(tr)
    const at: number[] = []
    const arrived = new Set<number>()
    tr.changes.iterChanges((fromA, toA, fromB, toB) => {
      if (!relist) {
        if (startDoc.slice(fromA, toA).includes('\n')) at.push(fromB)
        return
      }
      const last = lineIndexAt(scan, toB)
      let sequenced = false
      for (let i = lineIndexAt(scan, fromB); i <= last; i++) {
        const ls = scan.lineStarts[i]
        const lm = parseListMarkerPrefixed(scan.lines[i])
        if (lm === null) continue
        at.push(ls)
        sequenced ||= isSequenced(lm.kind)
        if (fromB < ls + lm.contentStart && toB >= ls) arrived.add(ls)
      }
      if (sequenced && last + 1 < scan.lines.length) at.push(scan.lineStarts[last + 1])
    })
    const counted =
      scope === 'page' ? at.filter((p) => !inSealedLine(scan, lineIndexAt(scan, p))) : at
    const changes = renumberRuns(scan.text, counted, arrived)
    return changes.length === 0 ? tr : [tr, { changes, sequential: true }]
  })
