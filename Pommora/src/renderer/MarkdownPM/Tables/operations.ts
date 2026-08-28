import type { Align, Column, TableModel } from './model'

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
  const avg = Math.round(m.columns.reduce((s, c) => s + c.dashes, 0) / m.columns.length)
  const col: Column = { align: null, dashes: Math.max(1, avg) }
  return {
    columns: spliceAt(m.columns, pos, 0, col),
    header: spliceAt(m.header, pos, 0, ''),
    rows: m.rows.map((r) => spliceAt(r, pos, 0, '')),
  }
}

export function deleteColumn(m: TableModel, atIndex: number): TableModel {
  const drop = <T>(arr: T[]): T[] => arr.filter((_, i) => i !== atIndex)
  return { columns: drop(m.columns), header: drop(m.header), rows: m.rows.map(drop) }
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

// A column's width IS its dash count, so the dashes a resized row is written at ARE the resolution a
// drop can land on — the three `| --- | --- |` carries leave six positions across the whole table.
const DASH_SCALE = 100

export function resizeColumns(m: TableModel, widths: number[]): TableModel {
  const total = widths.reduce((sum, w) => sum + w, 0)
  if (total <= 0) return m
  return {
    ...m,
    columns: m.columns.map((c, i) => ({
      ...c,
      dashes: Math.max(1, Math.round(((widths[i] ?? 0) / total) * DASH_SCALE)),
    })),
  }
}

export function moveRow(m: TableModel, from: number, to: number): TableModel {
  return { ...m, rows: spliceAt(spliceAt(m.rows, from, 1), to, 0, m.rows[from]) }
}

export function moveColumn(m: TableModel, from: number, to: number): TableModel {
  const move = <T>(arr: T[]): T[] => spliceAt(spliceAt(arr, from, 1), to, 0, arr[from])
  return { columns: move(m.columns), header: move(m.header), rows: m.rows.map(move) }
}
