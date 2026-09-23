import { EditorState, Prec } from '@codemirror/state'
import { carriedFrom, type DocScan } from '../Engine/docScan'
import { docScan } from '../docCache'
import { parseListMarkerPrefixed } from '../Engine/detect'
import { parseDelimiter } from '../Engine/Tables/codec'
import { decodePayload } from '../Engine/Tables/clipboard'
import { tableSelfEdit } from './sync'

// With the fencing blank line gone, two tables fuse and the second one's header + delimiter become body rows, so the region carries a second delimiter row.
export function fusedTableCount(scan: DocScan, fromLine: number, toLine: number): number {
  const from = scan.lineStarts[fromLine]
  const to = scan.lineStarts[toLine]
  let n = 0
  for (const r of scan.tables) {
    if (r.from < from || r.from >= to) continue
    const delims = scan.text
      .slice(r.from, r.to)
      .split('\n')
      .filter((l) => parseDelimiter(l) !== null).length
    if (delims > 1) n++
  }
  return n
}

// A multi-line table-shaped clipboard refuses to land where a table cannot live: its rows would only mangle the construct they fall into. Prec.high so the raw paste is judged where it was aimed, ahead of the citation guard's relocation rescue.
export const tablePasteGuard = Prec.high(
  EditorState.transactionFilter.of((tr) => {
    if (!tr.docChanged || !tr.isUserEvent('input.paste')) return tr
    const scan = docScan(tr.startState.doc)
    const tailStart =
      scan.citations.firstLine < scan.lines.length
        ? scan.lineStarts[scan.citations.firstLine]
        : Infinity
    let refused = false
    tr.changes.iterChanges((fromA, _toA, _fromB, _toB, inserted) => {
      if (refused) return
      const text = inserted.toString().trim()
      if (!text.includes('\n') || !decodePayload(text)) return
      const line = tr.startState.doc.lineAt(fromA)
      if (fromA >= tailStart || parseListMarkerPrefixed(line.text)) refused = true
    })
    return refused ? [] : tr
  }),
)

// Single-char typing passes through untouched (a typed row of dashes is content the user is building); a MULTI-LINE insert landing against a table is a paste, and letting it fuse mangles the pasted header + delimiter into body rows.
export const tableMergeGuard = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged) return tr
  // A table editing its own source cannot fuse two of them, and it is the one edit that arrives on every keystroke in a cell, so it skips the count.
  if (tr.annotation(tableSelfEdit)) return tr
  let guarded = false
  tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
    if (toA > fromA || inserted.toString().includes('\n')) guarded = true
  })
  if (!guarded) return tr
  const before = docScan(tr.startState.doc)
  const after = docScan.after(tr)
  const [a, e] = after.fresh
  return fusedTableCount(before, a, carriedFrom(before, after)) < fusedTableCount(after, a, e)
    ? []
    : tr
})
