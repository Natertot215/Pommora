import { parse } from '../Parser'
import { codeMask, type CodeMask } from '@shared/markdownCode'
import type { DocLines } from '../Detect'
import { normalize, type Column, type TableModel } from './model'
import { splitRow, parseDelimiter, type CellSpan } from './codec'

export interface RowGeom {
  cells: CellSpan[]
  segments: [number, number][]
  /** The row line's own span — what a commit replaces when the cell it names has no segment,
   *  which is every cell a ragged row is short of. */
  from: number
  to: number
}

export interface TableRegion {
  from: number
  to: number
  rows: RowGeom[]
  delimiter: { columns: Column[] }
}

function isTable(block: string): boolean {
  const tree = parse(block)
  return tree.children.length === 1 && tree.children[0].type === 'table'
}

/** Every table's source geometry. Pure on the document's line table, and read per keystroke by the
 *  guard, the decoration build and `atomicRanges` — the caller holds the one derivation per doc
 *  version (`docCache.docScan`), so the micromark confirmations here are paid once. */
export function tableRegions(
  { text, lines, lineStarts }: DocLines,
  inCode: CodeMask = codeMask(text),
): TableRegion[] {
  const lineTo = (i: number): number => lineStarts[i] + lines[i].length
  const geom = (i: number): RowGeom => ({
    ...splitRow(lines[i], lineStarts[i]),
    from: lineStarts[i],
    to: lineTo(i),
  })
  const regions: TableRegion[] = []
  let i = 1
  while (i < lines.length) {
    const columns = parseDelimiter(lines[i])
    const header = lines[i - 1]
    if (
      !columns ||
      header.trim() === '' ||
      header.trimStart()[0] === '>' ||
      inCode(lineStarts[i - 1]) ||
      !isTable(text.slice(lineStarts[i - 1], lineTo(i)))
    ) {
      i++
      continue
    }
    // Grab the contiguous non-blank block lexically, then confirm with a SINGLE parse — shrinking only
    // if a non-table line is glued on without a blank separator (rare). Keeps the common case to one
    // micromark parse per table instead of a per-line re-check.
    let last = i
    while (last + 1 < lines.length && lines[last + 1].trim() !== '') last++
    while (last > i && !isTable(text.slice(lineStarts[i - 1], lineTo(last)))) last--
    const rows: RowGeom[] = [geom(i - 1)]
    for (let k = i + 1; k <= last; k++) rows.push(geom(k))
    regions.push({
      from: lineStarts[i - 1],
      to: lineTo(last),
      rows,
      delimiter: { columns },
    })
    i = last + 1
  }
  return regions
}

// Equivalent to `parseTable` on the region's source (regression-tested), without a second micromark pass.
export function modelFromRegion(region: TableRegion): TableModel {
  return normalize({
    columns: region.delimiter.columns,
    header: region.rows[0].cells.map((c) => c.text),
    rows: region.rows.slice(1).map((r) => r.cells.map((c) => c.text)),
  })
}
