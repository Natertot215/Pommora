import { moveItem } from '@pommora/uix/Utilities/moveItem'
import {
  type Align,
  type Column,
  type TableModel,
  UNSIZED_DASHES,
  WIDTH_DASHES,
  isSized,
} from './model'

type RowWhere = 'above' | 'below'
type ColWhere = 'left' | 'right'

function spliceAt<T>(arr: T[], pos: number, del: number, ...ins: T[]): T[] {
  const a = [...arr]
  a.splice(pos, del, ...ins)
  return a
}

export function insertRow(m: TableModel, atBodyIndex: number, where: RowWhere): TableModel {
  const pos = where === 'below' ? atBodyIndex + 1 : atBodyIndex
  const blank = m.columns.map(() => '')
  return { ...m, rows: spliceAt(m.rows, pos, 0, blank) }
}

export function deleteRow(m: TableModel, atBodyIndex: number): TableModel {
  return { ...m, rows: m.rows.filter((_, i) => i !== atBodyIndex) }
}

export function insertColumn(m: TableModel, atIndex: number, where: ColWhere): TableModel {
  const pos = where === 'right' ? atIndex + 1 : atIndex
  const col: Column = { align: null, dashes: WIDTH_DASHES / m.columns.length }
  return {
    columns: settled(m.columns, spliceAt(m.columns, pos, 0, col)),
    header: spliceAt(m.header, pos, 0, ''),
    rows: m.rows.map((r) => spliceAt(r, pos, 0, '')),
  }
}

export function deleteColumn(m: TableModel, atIndex: number): TableModel {
  const drop = <T>(arr: T[]): T[] => arr.filter((_, i) => i !== atIndex)
  return {
    columns: settled(m.columns, drop(m.columns)),
    header: drop(m.header),
    rows: m.rows.map(drop),
  }
}

export function setAlign(m: TableModel, col: number, align: Align): TableModel {
  return { ...m, columns: m.columns.map((c, i) => (i === col ? { ...c, align } : c)) }
}

// Clear empties cells; it does NOT remove structure (that's delete). A column clear keeps the header
// label (the column's identity) and blanks only the body cells; a row clear blanks every cell in the row.
export function clearColumn(m: TableModel, atIndex: number): TableModel {
  return { ...m, rows: m.rows.map((r) => r.map((c, i) => (i === atIndex ? '' : c))) }
}

export function clearRow(m: TableModel, atBodyIndex: number): TableModel {
  return { ...m, rows: m.rows.map((r, i) => (i === atBodyIndex ? r.map(() => '') : r)) }
}

export function clearHeader(m: TableModel): TableModel {
  return { ...m, header: m.header.map(() => '') }
}

export function clearTable(m: TableModel): TableModel {
  return { ...m, header: m.header.map(() => ''), rows: m.rows.map((r) => r.map(() => '')) }
}

// The rectangle gestures address visual rows, header included: row 0 IS the header.
export function clearRect(
  m: TableModel,
  r0: number,
  c0: number,
  r1: number,
  c1: number,
): TableModel {
  const inCols = (cell: string, ci: number): string => (ci >= c0 && ci <= c1 ? '' : cell)
  return {
    ...m,
    header: r0 === 0 ? m.header.map(inCols) : m.header,
    rows: m.rows.map((r, i) => (i + 1 >= r0 && i + 1 <= r1 ? r.map(inCols) : r)),
  }
}

function grown(m: TableModel, rows: number, cols: number): TableModel {
  let g = m
  while (g.columns.length < cols) g = insertColumn(g, g.columns.length - 1, 'right')
  while (g.rows.length < rows) g = insertRow(g, g.rows.length - 1, 'below')
  return g
}

/** Grows the table to fit — a paste bigger than the table appends rather than dropping overflow. */
export function fillCells(
  m: TableModel,
  atRow: number,
  atCol: number,
  grid: string[][],
): TableModel {
  const wide = Math.max(...grid.map((r) => r.length))
  const g = grown(m, atRow + grid.length - 1, atCol + wide)
  const put = (cells: string[], gr: number): string[] =>
    cells.map((cell, ci) => grid[gr]?.[ci - atCol] ?? cell)
  return {
    ...g,
    header: atRow === 0 ? put(g.header, 0) : g.header,
    rows: g.rows.map((r, i) => put(r, i + 1 - atRow)),
  }
}

// The copied header lands only where the target's is empty; the body fills from `atRow`, or from row 1 when the anchor IS the header.
export function fillColumn(
  m: TableModel,
  atRow: number,
  atCol: number,
  header: string,
  body: string[],
): TableModel {
  const start = Math.max(1, atRow)
  const filled = fillCells(
    m,
    start,
    atCol,
    body.map((c) => [c]),
  )
  return filled.header[atCol] === '' && header !== ''
    ? { ...filled, header: filled.header.map((h, i) => (i === atCol ? header : h)) }
    : filled
}

// Each column's dashes are its percent of the table; rounding's leftover lands on the widest, so the row totals exactly WIDTH_DASHES.
function asPercents(columns: Column[], weights = columns.map((c) => c.dashes)): Column[] {
  const total = weights.reduce((sum, w) => sum + w, 0)
  const dashes = weights.map((w) => Math.max(1, Math.round((w / total) * WIDTH_DASHES)))
  dashes[dashes.indexOf(Math.max(...dashes))] +=
    WIDTH_DASHES - dashes.reduce((sum, d) => sum + d, 0)
  return columns.map((c, i) => ({ ...c, dashes: dashes[i] }))
}

// Adding or dropping a column breaks a width row's total, so it reshares; any other row is written bare, so padding can't land on 100.
const settled = (before: Column[], after: Column[]): Column[] =>
  isSized(before) ? asPercents(after) : after.map((c) => ({ ...c, dashes: UNSIZED_DASHES }))

export function resizeColumns(m: TableModel, widths: number[]): TableModel {
  return {
    ...m,
    columns: asPercents(
      m.columns,
      m.columns.map((_, i) => widths[i] ?? 0),
    ),
  }
}

export function moveRow(m: TableModel, from: number, to: number): TableModel {
  return { ...m, rows: moveItem(m.rows, from, to) }
}

export function moveColumn(m: TableModel, from: number, to: number): TableModel {
  const move = <T>(arr: T[]): T[] => moveItem(arr, from, to)
  return { columns: move(m.columns), header: move(m.header), rows: m.rows.map(move) }
}
