import { EditorState, type Text, Transaction } from '@codemirror/state'
import { pageEmbedText } from '@pommora/core/Connections/connections'
import { loneEmbedTitle, loneWebpageEmbed } from '../Engine/detect'
import { embedTileRanges } from '../Embeds/embedWidget'

// Per tile, never a document-wide sum — a summed compare would let one tile's un-gluing pay for another's regression.
function gluedOf(doc: Text, from: number): number {
  let glued = 0
  const n = doc.lineAt(Math.min(from, doc.length)).number
  if (n > 1 && doc.line(n - 1).text.trim() !== '') glued++
  if (n < doc.lines && doc.line(n + 1).text.trim() !== '') glued++
  return glued
}

function boundaryRepair(
  tr: Transaction,
  r: { from: number; to: number },
): { from: number; insert: string; caret: number } | null {
  const changes: { from: number; to: number; text: string }[] = []
  tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
    changes.push({ from: fromA, to: toA, text: inserted.toString() })
  })
  if (changes.length !== 1) return null
  const [{ from, to, text }] = changes
  if (from !== to || text === '') return null
  if (from === r.from) return { from, insert: `${text}\n`, caret: from + text.length }
  if (from === r.to) return { from, insert: `\n${text}`, caret: from + 1 + text.length }
  return null
}

// A CLAIMED embed line can be removed whole but never eroded: a pure boundary insertion repairs, the rest refuse.
export const embedGuard = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged) return tr
  const ranges = embedTileRanges(tr.startState)
  if (ranges.length === 0) return tr
  let hasDeletion = false
  tr.changes.iterChangedRanges((fromA, toA) => {
    if (toA > fromA) hasDeletion = true
  })
  if (hasDeletion) {
    for (const r of ranges) {
      const mappedFrom = tr.changes.mapPos(r.from, 1)
      const line = tr.newDoc.lineAt(Math.min(mappedFrom, tr.newDoc.length))
      const stillLone =
        r.kind === 'page'
          ? loneEmbedTitle(line.text) === r.title
          : loneWebpageEmbed(line.text)?.url === r.url
      if (!stillLone) continue
      if (gluedOf(tr.newDoc, mappedFrom) > gluedOf(tr.startState.doc, r.from)) return []
    }
  }
  for (const r of ranges) {
    // A change STRICTLY INSIDE the token is in-place damage — word motion bypasses the atomic absorb.
    let interior = false
    tr.changes.iterChangedRanges((fromA, toA) => {
      const overlaps = fromA < r.to && toA > r.from
      const covers = fromA <= r.from && toA >= r.to
      if (overlaps && !covers) interior = true
    })
    if (interior) return []
    const mapped = tr.changes.mapPos(r.from, 1)
    const line = tr.newDoc.lineAt(Math.min(mapped, tr.newDoc.length))
    const present =
      r.kind === 'page'
        ? line.text.includes(pageEmbedText(r.title))
        : line.text.includes(`](${r.url})`)
    if (!present) continue
    const lone =
      r.kind === 'page' ? loneEmbedTitle(line.text) !== null : loneWebpageEmbed(line.text) !== null
    if (lone) continue
    const repair = boundaryRepair(tr, r)
    if (repair) {
      const userEvent = tr.annotation(Transaction.userEvent)
      return [
        {
          changes: { from: repair.from, insert: repair.insert },
          selection: { anchor: repair.caret },
          annotations: userEvent ? Transaction.userEvent.of(userEvent) : undefined,
        },
      ]
    }
    return []
  }
  return tr
})
