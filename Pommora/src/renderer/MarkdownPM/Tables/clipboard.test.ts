import { describe, it, expect } from 'vitest'
import { decodePayload, encodeColumn, encodeRect, rectGrid, serializeOutline } from './clipboard'
import type { TableModel } from './model'

const base: TableModel = {
  columns: [
    { align: null, dashes: 3 },
    { align: 'center', dashes: 5 },
  ],
  header: ['a', 'b'],
  rows: [
    ['1', '2'],
    ['3', '4'],
  ],
}

describe('table clipboard', () => {
  it('a rectangle round-trips through its pipe rows', () => {
    const grid = rectGrid(base, 0, 0, 1, 1)
    expect(grid).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
    expect(decodePayload(encodeRect(grid))).toEqual({ kind: 'rect', grid })
  })

  it('a single pipe row decodes as a one-row rectangle', () => {
    expect(decodePayload('| 1 | 2 |')).toEqual({ kind: 'rect', grid: [['1', '2']] })
  })

  it('a lone pipe cell is a text paste, not a structural one', () => {
    expect(decodePayload('| x |')).toBeNull()
    expect(decodePayload('plain prose')).toBeNull()
  })

  it('a column carries its header, alignment and width, and round-trips', () => {
    const text = encodeColumn('b', base.columns[1], ['2', '4'])
    expect(decodePayload(text)).toEqual({
      kind: 'column',
      header: 'b',
      column: { align: 'center', dashes: 5 },
      body: ['2', '4'],
    })
  })

  it('a payload wider than one column with a delimiter is a whole table — inert', () => {
    expect(decodePayload(serializeOutline(base))).toEqual({ kind: 'table' })
    expect(decodePayload('| a | b |\n| --- | --- |\n| 1 | 2 |')).toEqual({ kind: 'table' })
  })

  it('an all-empty one-column payload is an outline, not a column fill', () => {
    expect(decodePayload('|  |\n| --- |\n|  |')).toEqual({ kind: 'table' })
  })

  it('serializeOutline keeps shape and heading, blanks every body cell', () => {
    expect(serializeOutline(base)).toBe('| a | b |\n| --- | :-----: |\n|  |  |\n|  |  |')
  })

  it('a misplaced delimiter line still reads as table-shaped, never as cells', () => {
    expect(decodePayload('| --- | --- |')).toEqual({ kind: 'table' })
  })
})
