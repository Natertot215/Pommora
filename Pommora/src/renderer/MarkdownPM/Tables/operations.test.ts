import { describe, it, expect } from 'vitest'
import {
  insertColumn,
  deleteColumn,
  insertRow,
  deleteRow,
  setAlign,
  resizeColumns,
  moveRow,
  moveColumn,
  clearColumn,
  clearRow,
  clearHeader,
  clearTable,
  clearRect,
  fillCells,
  fillColumn,
} from './operations'
import type { TableModel } from './model'

const base: TableModel = {
  columns: [
    { align: null, dashes: 10 },
    { align: null, dashes: 10 },
    { align: null, dashes: 10 },
  ],
  header: ['a', 'b', 'c'],
  rows: [['1', '2', '3']],
}

describe('operations', () => {
  it('insertColumn adds avg-dash column, keeps existing dashes, widens every row', () => {
    const m = insertColumn(base, 1, 'right')
    expect(m.columns.map((c) => c.dashes)).toEqual([10, 10, 10, 10])
    expect(m.header).toEqual(['a', 'b', '', 'c'])
    expect(m.rows[0]).toEqual(['1', '2', '', '3'])
  })

  it('resizeColumns re-expresses every column as its share of the dash scale', () => {
    // The dropped boundary moved a quarter of the row into the first column.
    const m = resizeColumns(base, [500, 300, 200])
    expect(m.columns.map((c) => c.dashes)).toEqual([50, 30, 20])
  })

  it('resizeColumns spends the same scale however narrow the source was written', () => {
    const narrow: TableModel = { ...base, columns: base.columns.map((c) => ({ ...c, dashes: 3 })) }
    expect(resizeColumns(narrow, [500, 300, 200]).columns.map((c) => c.dashes)).toEqual([
      50, 30, 20,
    ])
  })

  it('resizeColumns floors a vanishing column at one dash', () => {
    const m = resizeColumns(base, [1000, 1, 1])
    expect(m.columns[1].dashes).toBe(1)
    expect(m.columns[2].dashes).toBe(1)
  })

  it('deleteColumn removes the cell from every row', () => {
    const m = deleteColumn(base, 1)
    expect(m.columns.length).toBe(2)
    expect(m.rows[0]).toEqual(['1', '3'])
  })

  it('insertRow inserts an empty body row above/below', () => {
    expect(insertRow(base, 0, 'below').rows).toEqual([
      ['1', '2', '3'],
      ['', '', ''],
    ])
    expect(insertRow(base, 0, 'above').rows).toEqual([
      ['', '', ''],
      ['1', '2', '3'],
    ])
  })

  it('deleteRow removes the body row at index', () => {
    const two: TableModel = {
      ...base,
      rows: [
        ['1', '2', '3'],
        ['4', '5', '6'],
      ],
    }
    expect(deleteRow(two, 0).rows).toEqual([['4', '5', '6']])
  })

  it('setAlign sets exactly one column alignment', () => {
    const m = setAlign(base, 1, 'center')
    expect(m.columns[1].align).toBe('center')
    expect(m.columns[0].align).toBeNull()
  })

  it('clearColumn blanks the body cells of one column, keeps the header label', () => {
    const m = clearColumn(base, 1)
    expect(m.header).toEqual(['a', 'b', 'c']) // header untouched
    expect(m.rows[0]).toEqual(['1', '', '3'])
  })

  it('clearRow blanks every cell in one body row', () => {
    const two: TableModel = {
      ...base,
      rows: [
        ['1', '2', '3'],
        ['4', '5', '6'],
      ],
    }
    expect(clearRow(two, 0).rows).toEqual([
      ['', '', ''],
      ['4', '5', '6'],
    ])
  })

  it('moveColumn reorders the column across header + every row', () => {
    const m = moveColumn(base, 0, 2)
    expect(m.header).toEqual(['b', 'c', 'a'])
    expect(m.rows[0]).toEqual(['2', '3', '1'])
  })

  it('clearHeader blanks the heading row alone', () => {
    const m = clearHeader(base)
    expect(m.header).toEqual(['', '', ''])
    expect(m.rows[0]).toEqual(['1', '2', '3'])
  })

  it('clearTable blanks every cell, heading row included', () => {
    const m = clearTable(base)
    expect(m.header).toEqual(['', '', ''])
    expect(m.rows[0]).toEqual(['', '', ''])
  })

  it('clearRect blanks the covered cells only, header row addressable as row 0', () => {
    const two: TableModel = {
      ...base,
      rows: [
        ['1', '2', '3'],
        ['4', '5', '6'],
      ],
    }
    const m = clearRect(two, 0, 1, 1, 2)
    expect(m.header).toEqual(['a', '', ''])
    expect(m.rows).toEqual([
      ['1', '', ''],
      ['4', '5', '6'],
    ])
  })

  it('fillCells writes a grid from its anchor, leaving the rest', () => {
    const m = fillCells(base, 1, 1, [['x', 'y']])
    expect(m.header).toEqual(['a', 'b', 'c'])
    expect(m.rows[0]).toEqual(['1', 'x', 'y'])
  })

  it('fillCells grows the table when the grid runs past its edge', () => {
    const m = fillCells(base, 1, 2, [
      ['x', 'y'],
      ['z', 'w'],
    ])
    expect(m.columns.length).toBe(4)
    expect(m.rows).toEqual([
      ['1', '2', 'x', 'y'],
      ['', '', 'z', 'w'],
    ])
  })

  it('fillCells anchored on the header row writes into it', () => {
    const m = fillCells(base, 0, 0, [['H'], ['B']])
    expect(m.header).toEqual(['H', 'b', 'c'])
    expect(m.rows[0]).toEqual(['B', '2', '3'])
  })

  it('fillColumn fills the body from the anchor and takes an empty header only', () => {
    const kept = fillColumn(base, 1, 1, 'New', ['x', 'y'])
    expect(kept.header).toEqual(['a', 'b', 'c'])
    expect(kept.rows).toEqual([
      ['1', 'x', '3'],
      ['', 'y', ''],
    ])
    const blank: TableModel = { ...base, header: ['a', '', 'c'] }
    expect(fillColumn(blank, 1, 1, 'New', ['x']).header).toEqual(['a', 'New', 'c'])
  })

  it('fillColumn anchored on the header row starts its body at row one', () => {
    const m = fillColumn(base, 0, 0, '', ['x'])
    expect(m.header).toEqual(['a', 'b', 'c'])
    expect(m.rows[0]).toEqual(['x', '2', '3'])
  })

  it('moveRow reorders body rows', () => {
    const two: TableModel = {
      ...base,
      rows: [
        ['1', '2', '3'],
        ['4', '5', '6'],
      ],
    }
    expect(moveRow(two, 1, 0).rows).toEqual([
      ['4', '5', '6'],
      ['1', '2', '3'],
    ])
  })
})
