import { perText } from '../perText'
import { parse } from '../parser'
import type { CodeMask } from '../markdownCode'
import { isBlank, isThematicBreakLine, LINE_CAP, type BlockSpan, type DocLines } from '../detect'
import { normalize, type Column, type TableModel } from './model'
import { splitRow, parseDelimiter } from './codec'

interface RowGeom {
  cells: string[]
  segments: [number, number][]
  /** The row line's own span — what a commit replaces when the cell it names has no segment, which is every cell a ragged row is short of. */
  from: number
  to: number
}

export interface TableRegion extends BlockSpan {
  rows: RowGeom[]
  columns: Column[]
}

// KNOB — distinct header and delimiter pairs remembered.
const isTable = perText((block) => {
  const tree = parse(block)
  return tree.children.length === 1 && tree.children[0].type === 'table'
}, 256)

// A code-deep indent, or a heading, quote, fence, HTML, reference, or list marker after its indent; a match may still be a row.
const MAY_OPEN = /^(?: {0,3}\t| {4}|[ \t]*(?:[#>`~<[]|\d{1,9}[.)]|[-*+](?:[ \t]|$)))/
const opensBlock = perText((line) => parse(`| a |\n| - |\n${line}`).children.length > 1, LINE_CAP)
const endsBody = (line: string): boolean =>
  isBlank(line) || isThematicBreakLine(line) || (MAY_OPEN.test(line) && opensBlock(line))

/** Read per keystroke by the guard, the decoration build and `atomicRanges` — the caller holds the one derivation per doc version (`docCache.docScan`). */
export function tableRegions(
  { text, lines, lineStarts }: DocLines,
  inCode: CodeMask,
): TableRegion[] {
  const lineTo = (i: number): number => lineStarts[i] + lines[i].length
  const geom = (i: number): RowGeom => ({
    ...splitRow(lines[i], lineStarts[i]),
    from: lineStarts[i],
    to: lineTo(i),
  })
  const regions: TableRegion[] = []
  for (let i = 1; i < lines.length; i++) {
    const columns = parseDelimiter(lines[i])
    if (!columns || inCode(lineStarts[i - 1]) || !isTable(text.slice(lineStarts[i - 1], lineTo(i))))
      continue
    let last = i
    while (last + 1 < lines.length && !endsBody(lines[last + 1])) last++
    const rows: RowGeom[] = [geom(i - 1)]
    for (let k = i + 1; k <= last; k++) rows.push(geom(k))
    regions.push({ from: lineStarts[i - 1], to: lineTo(last), rows, columns })
    i = last
  }
  return regions
}

// Equivalent to `parseTable` on the region's source (regression-tested), without a second micromark pass.
export function modelFromRegion(region: TableRegion): TableModel {
  return normalize({
    columns: region.columns,
    header: region.rows[0].cells,
    rows: region.rows.slice(1).map((r) => r.cells),
  })
}
