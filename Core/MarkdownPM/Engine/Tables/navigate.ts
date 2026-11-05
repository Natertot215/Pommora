export type NavDir = 'next' | 'prev' | 'down' | 'out'
type CellNavTarget = { row: number; col: number } | 'before' | 'after' | 'out'

// Visual-row convention: row 0 = header, rows 1..totalRows-1 = body. 'next' = Tab, 'prev' = Shift-Tab, 'down' = Enter, 'out' = Escape, which leaves the table where the page's caret already is.
export function nextCell(
  totalRows: number,
  cols: number,
  row: number,
  col: number,
  dir: NavDir,
): CellNavTarget {
  if (dir === 'out') return 'out'
  if (dir === 'next') {
    if (col + 1 < cols) return { row, col: col + 1 }
    if (row + 1 < totalRows) return { row: row + 1, col: 0 }
    return 'after'
  }
  if (dir === 'prev') {
    if (col > 0) return { row, col: col - 1 }
    if (row > 0) return { row: row - 1, col: cols - 1 }
    return 'before'
  }
  if (row + 1 < totalRows) return { row: row + 1, col }
  return 'after'
}
