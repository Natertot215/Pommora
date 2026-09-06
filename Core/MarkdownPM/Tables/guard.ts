import { EditorState, Prec } from '@codemirror/state'
import type { DocScan } from '../Decorations/intent'
import { docScan } from '../Editor/docCache'
import { parseListMarkerPrefixed } from '../Detect'
import { parseDelimiter } from './codec'
import { decodePayload } from './clipboard'
import { tableSelfEdit } from './sync'

// A GFM table is its own block only while a blank line fences it; with the separator gone, two tables
// fuse and the second one's header + delimiter become body rows, so the region carries a second
// delimiter row. Counts the fused tables. Reads the RESULT doc only, immune to the offset shift a
// deletion causes (the bug a cross-before/after comparison hits).
export function fusedTableCount(scan: DocScan): number {
  let n = 0
  for (const r of scan.tables) {
    const delims = scan.text
      .slice(r.from, r.to)
      .split('\n')
      .filter((l) => parseDelimiter(l) !== null).length
    if (delims > 1) n++
  }
  return n
}

// A multi-line table-shaped clipboard refuses to land where a table cannot live: on a list line, or
// in the citations section — its rows would only mangle the construct they fall into. Prec.high so
// the raw paste is judged where it was aimed, ahead of the citation guard's relocation rescue.
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
      // Trimmed: a block paste often rides a newline on either side of the table it carries.
      const text = inserted.toString().trim()
      if (!text.includes('\n') || !decodePayload(text)) return
      const line = tr.startState.doc.lineAt(fromA)
      if (fromA >= tailStart || parseListMarkerPrefixed(line.text)) refused = true
    })
    return refused ? [] : tr
  }),
)

// Refuse deletions — and paste-shaped inserts — that would fuse two tables. Single-char typing passes
// through untouched (a typed row of dashes is content the user is building); a MULTI-LINE insert landing
// against a table is a paste, and letting it fuse mangles the pasted header + delimiter into body rows.
export const tableMergeGuard = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged) return tr
  // A table editing its own source cannot fuse two of them, and it is the one edit that arrives on
  // every keystroke in a cell — checking it would scan the whole document for tables each time.
  if (tr.annotation(tableSelfEdit)) return tr
  let guarded = false
  tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
    if (toA > fromA || inserted.toString().includes('\n')) guarded = true
  })
  if (
    guarded &&
    fusedTableCount(docScan(tr.startState.doc)) < fusedTableCount(docScan(tr.newDoc))
  ) {
    return [] // cancel — this edit would merge two tables into one
  }
  return tr
})
