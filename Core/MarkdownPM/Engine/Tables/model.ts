export type Align = 'left' | 'center' | 'right' | null

export interface Column {
  align: Align
  dashes: number
}

export interface TableModel {
  columns: Column[]
  header: string[]
  rows: string[][]
}

// A delimiter row whose dashes total exactly this is a width row — each column's dashes are its percent of the table. Any other total is a formatter's padding or a bare `---`, and the columns share the width equally.
export const WIDTH_DASHES = 100
// No multiple of three totals 100, so a row written at this width stays unsized.
export const UNSIZED_DASHES = 3

export const isSized = (columns: Column[]): boolean =>
  columns.reduce((sum, c) => sum + c.dashes, 0) === WIDTH_DASHES

export const columnShares = (columns: Column[]): number[] =>
  isSized(columns) ? columns.map((c) => c.dashes) : columns.map(() => WIDTH_DASHES / columns.length)

export function emptyTable(cols: number, rows: number): TableModel {
  return {
    columns: Array.from({ length: cols }, () => ({ align: null, dashes: UNSIZED_DASHES })),
    header: Array.from({ length: cols }, () => ''),
    rows: Array.from({ length: Math.max(0, rows - 1) }, () =>
      Array.from({ length: cols }, () => ''),
    ),
  }
}

export function normalize(m: TableModel): TableModel {
  const n = m.columns.length
  const fitRow = (r: string[]): string[] => Array.from({ length: n }, (_, i) => r[i] ?? '')
  return { columns: m.columns, header: fitRow(m.header), rows: m.rows.map(fitRow) }
}
