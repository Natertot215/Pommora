import { Annotation } from '@codemirror/state'
import type { DocScan } from '../decorations/intent'
import { modelFromRegion } from './regions'
import { cellToSource, serialize } from './codec'
import type { TableModel } from './model'

// Marks a transaction as the table widget editing its own source. The widget StateField remaps its
// decorations (keeping the widget + its focused cell editor mounted) instead of rebuilding from the doc;
// external edits carry no annotation, so they rebuild. This is what keeps cell focus across an edit.
export const tableSelfEdit = Annotation.define<boolean>()

export function cellCommitChange(
  scan: DocScan,
  tableIndex: number,
  row: number,
  col: number,
  newText: string,
): { from: number; to: number; insert: string } | null {
  const region = scan.tables[tableIndex]
  const geom = region?.rows[row]
  if (!region || !geom) return null
  const source = cellToSource(newText)
  const seg = geom.segments[col]
  // The common case: replace exactly the cell's own pipe-to-pipe span, so the caret and every other
  // cell's offsets survive the edit untouched.
  if (seg) return { from: seg[0], to: seg[1], insert: ` ${source} ` }
  // A RAGGED row is short of the columns the delimiter declares, and the model it is read through
  // pads it — so the cell being typed in has a position in the model and no span in the source. The
  // row is rewritten with the padding made real, rather than the edit being dropped.
  if (col >= region.delimiter.columns.length) return null
  const cells = region.delimiter.columns.map((_, i) =>
    i === col ? source : (geom.cells[i]?.text ?? ''),
  )
  return { from: geom.from, to: geom.to, insert: `| ${cells.join(' | ')} |` }
}

export function structuralEditChange(
  scan: DocScan,
  tableIndex: number,
  transform: (m: TableModel) => TableModel,
): { from: number; to: number; insert: string } | null {
  const region = scan.tables[tableIndex]
  if (!region) return null
  const insert = serialize(transform(modelFromRegion(region)))
  // A transform that serializes to the same text (reordering identical/empty columns, aligning to the
  // current alignment) is a no-op. Skip it: dispatching it would rebuild an eq-equal widget, CM would skip
  // the re-render, and a live drag — which relies on that re-render to clear — would freeze.
  if (insert === scan.text.slice(region.from, region.to)) return null
  return { from: region.from, to: region.to, insert }
}
